/**
 * Client Portal Renderer & Event Handlers con Soporte de Fotos de Cámara Móvil y PWA
 */
import { printTaxDeclarationSummary } from './pdfExport.js';
import { TAX_STAGES, addDocumentToClient, addMessageToClient, getStore, saveStore } from './store.js';

export function renderClientPortal(container, user) {
  // Always fetch latest data for user from store
  const store = getStore();
  const freshUser = store.users.find(u => u.id === user.id) || user;

  const currentStageObj = TAX_STAGES.find(s => s.id === freshUser.currentStage) || TAX_STAGES[0];
  const stageProgressPct = ((freshUser.currentStage - 1) / (TAX_STAGES.length - 1)) * 100;

  const balanceBadgeClass = freshUser.financials.balanceType === 'favor' || freshUser.financials.balanceType === 'afavor'
    ? 'badge-emerald' 
    : (freshUser.financials.balanceType === 'pagar' || freshUser.financials.balanceType === 'apagar'
    ? 'badge-rose' 
    : 'badge-amber');

  const pendingDocsCount = (freshUser.checklist || []).filter(item => !item.completed).length;

  container.innerHTML = `
    <!-- Client Hero / Timeline Card -->
    <div class="hero-status-card">
      <div class="flex justify-between items-center" style="margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="badge badge-blue" style="margin-bottom: 0.5rem;">
            📌 Declaración de Renta Persona Natural — Año Gravable ${freshUser.year || '2025'}
          </span>
          <h2 style="font-size: 1.6rem; font-weight: 800; margin-top: 0.2rem;">
            Hola, ${freshUser.name}
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            NIT/Cédula: <strong>${freshUser.nit || 'Sin Registrar'}</strong> | Vencimiento DIAN: <strong>${freshUser.financials.dueDate || 'Pendiente'}</strong>
          </p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <button id="btn-install-pwa-hero" class="btn btn-emerald text-sm" title="Instalar Aplicación Móvil en este dispositivo">
            📲 Instalar App Móvil
          </button>
          <button id="btn-print-summary" class="btn btn-secondary text-sm">
            🖨️ Imprimir / PDF Resumen
          </button>
          <div style="text-align: right;">
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Estado Actual:</span>
            <span class="badge ${freshUser.currentStage === 4 ? 'badge-emerald' : 'badge-blue'}" style="font-size: 0.9rem; padding: 0.4rem 1rem;">
              ● ${currentStageObj.name}
            </span>
          </div>
        </div>
      </div>

      <!-- Timeline Component -->
      <div class="timeline-container">
        <div class="timeline-progress-bar" style="width: ${stageProgressPct}%;"></div>
        ${TAX_STAGES.map(stage => {
          let stateClass = '';
          let iconText = stage.id;
          if (stage.id < freshUser.currentStage) {
            stateClass = 'completed';
            iconText = '✓';
          } else if (stage.id === freshUser.currentStage) {
            stateClass = 'active';
          }
          return `
            <div class="timeline-step ${stateClass}">
              <div class="step-bubble">${iconText}</div>
              <div class="step-title">${stage.name}</div>
              <div class="step-desc">${stage.desc}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Main Grid: Checklist, Financial Summary & Documents -->
    <div class="main-content-layout">
      <!-- Left Column: Checklist & Documents & Financial Summary -->
      <div class="flex-col gap-6">
        
        <!-- Financial Resumen Cards -->
        <div class="grid-3">
          <div class="stat-card">
            <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">💼</div>
            <div>
              <div class="stat-lbl">Ingresos Brutos</div>
              <div class="stat-val">${freshUser.financials.totalIncome || '$ 0'}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa;">📊</div>
            <div>
              <div class="stat-lbl">Retenciones Aplicadas</div>
              <div class="stat-val">${freshUser.financials.withholdings || '$ 0'}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: ${freshUser.financials.balanceType === 'favor' || freshUser.financials.balanceType === 'afavor' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)'}; color: ${freshUser.financials.balanceType === 'favor' || freshUser.financials.balanceType === 'afavor' ? '#10b981' : '#f43f5e'};">💰</div>
            <div>
              <div class="stat-lbl">Resultado Fiscal</div>
              <div class="stat-val" style="color: ${freshUser.financials.balanceType === 'favor' || freshUser.financials.balanceType === 'afavor' ? '#10b981' : (freshUser.financials.balanceType === 'pagar' || freshUser.financials.balanceType === 'apagar' ? '#f43f5e' : 'white')};">
                ${freshUser.financials.netBalance || '$ 0'}
              </div>
              <span class="badge ${balanceBadgeClass}" style="margin-top: 0.2rem; font-size: 0.7rem;">
                ${freshUser.financials.balanceType === 'favor' || freshUser.financials.balanceType === 'afavor' ? 'Saldo a Favor' : (freshUser.financials.balanceType === 'pagar' || freshUser.financials.balanceType === 'apagar' ? 'Impuesto a Pagar' : 'En proceso')}
              </span>
            </div>
          </div>
        </div>

        <!-- Checklist Tributario Requerido -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span>📋</span> Lista de Requisitos Tributarios DIAN
            </div>
            <span class="badge ${pendingDocsCount === 0 ? 'badge-emerald' : 'badge-amber'} text-xs">
              ${pendingDocsCount === 0 ? '🎉 Todo Completo' : `${pendingDocsCount} Requisitos Pendientes`}
            </span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            Marca los soportes que ya tienes preparados o adjúntalos directamente abajo para acelerar el análisis de tu declaración.
          </p>

          <div class="flex-col gap-2" id="client-checklist-container">
            ${(freshUser.checklist || []).map(item => `
              <label class="flex items-center justify-between" style="padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); cursor: pointer; border: 1px solid var(--border-color);">
                <div class="flex items-center gap-3">
                  <input type="checkbox" class="chk-item-toggle" data-chk-id="${item.id}" ${item.completed ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                  <div>
                    <span style="font-size: 0.88rem; font-weight: 600; text-decoration: ${item.completed ? 'line-through' : 'none'}; opacity: ${item.completed ? '0.7' : '1'};">
                      ${item.title}
                    </span>
                    <span class="text-xs" style="color: var(--text-muted); display: block;">
                      Categoría: ${item.category} ${item.required ? '• <strong style="color:#f43f5e;">Obligatorio</strong>' : '• Opcional'}
                    </span>
                  </div>
                </div>
                <span class="badge ${item.completed ? 'badge-emerald' : 'badge-blue'}" style="font-size: 0.7rem;">
                  ${item.completed ? 'Listo' : 'Pendiente'}
                </span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Documents Section with Real File & Camera Upload -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span>📄</span> Tus Certificados & Soportes Subidos
            </div>
            <button id="btn-client-upload-doc" class="btn btn-primary text-sm">
              <span>📷</span> Subir Archivo o Foto de Cámara
            </button>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Toma fotos directas desde tu celular o selecciona tus PDF/Imágenes. Todos los archivos se guardan de forma optimizada.
          </p>

          <div class="flex-col gap-3">
            ${freshUser.documents && freshUser.documents.length > 0 ? freshUser.documents.map(doc => `
              <div class="doc-card">
                <div class="doc-icon ${doc.type === 'pdf' ? 'doc-icon-pdf' : 'doc-icon-img'}">${doc.type ? doc.type.toUpperCase() : 'DOC'}</div>
                <div class="doc-meta">
                  <div class="doc-name">${doc.name}</div>
                  <div class="doc-sub">
                    <span>Categoría: <strong>${doc.category || 'General'}</strong></span>
                    <span>•</span>
                    <span>Subido por: <strong>${doc.uploadedBy || 'Contribuyente'}</strong></span>
                    <span>•</span>
                    <span>Fecha: ${doc.uploadDate || doc.uploadedAt || 'Hoy'}</span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button class="btn btn-secondary text-xs btn-preview-doc" data-doc-id="${doc.id}">
                    👁️ Ver Previa
                  </button>
                  <button class="btn btn-primary text-xs btn-download-doc" data-doc-id="${doc.id}">
                    ⬇️ Descargar
                  </button>
                </div>
              </div>
            `).join('') : `
              <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: rgba(0,0,0,0.15); border-radius: var(--radius-md);">
                No hay documentos cargados aún. Haz clic en "Subir Archivo o Foto" para comenzar.
              </div>
            `}
          </div>
        </div>

      </div>

      <!-- Right Column: Accountant Notes & Direct Message -->
      <div class="flex-col gap-6">
        
        <!-- Contador Advisor Card -->
        ${(() => {
          const assignedAdmin = store.users.find(u => u.id === freshUser.assignedAdminId && u.role === 'admin') || store.users.find(u => u.role === 'admin') || { name: 'Carlos Mendoza, CPA', specialty: 'Contador Público' };
          const initials = assignedAdmin.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
          return `
            <div class="card">
              <div class="card-title" style="margin-bottom: 1rem;">
                <span>👨‍💼</span> Tu Contador Asignado
              </div>
              <div class="flex items-center gap-3" style="padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                <div class="avatar" style="width: 46px; height: 46px; font-size: 1.1rem; background: linear-gradient(135deg, #059669 0%, #2563eb 100%);">${initials}</div>
                <div>
                  <div style="font-weight: 700; font-size: 0.95rem;">${assignedAdmin.name}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">${assignedAdmin.specialty || 'Contador Público'}</div>
                  <div style="font-size: 0.78rem; color: var(--accent-emerald);">● Asignado a tu declaración</div>
                </div>
              </div>
              <div style="margin-top: 1rem;">
                <span class="text-xs font-semibold" style="color: var(--text-muted);">NOTAS Y OBSERVACIONES TRIBUTARIAS:</span>
                <div style="background: rgba(255,255,255,0.03); border-left: 3px solid var(--primary); padding: 0.75rem; border-radius: var(--radius-sm); margin-top: 0.4rem; font-size: 0.85rem;">
                  "${freshUser.notes || 'En proceso de verificación de certificados de retención y patrimonio.'}"
                </div>
              </div>
            </div>
          `;
        })()}

        <!-- Chat / Message Box -->
        <div class="card flex-col justify-between" style="min-height: 340px;">
          <div>
            <div class="card-title" style="margin-bottom: 1rem;">
              <span>💬</span> Mensajes Directos con tu Contador
            </div>
            <div id="client-chat-history" style="max-height: 220px; overflow-y: auto; padding-right: 0.5rem;" class="flex-col gap-2">
              ${freshUser.messages && freshUser.messages.length > 0 ? freshUser.messages.map(m => `
                <div style="background: ${m.sender === 'Contador' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.06)'}; padding: 0.65rem 0.85rem; border-radius: var(--radius-md); font-size: 0.83rem;">
                  <div class="flex justify-between font-semibold" style="margin-bottom: 0.2rem; color: ${m.sender === 'Contador' ? '#60a5fa' : 'var(--text-main)'}">
                    <span>${m.sender}</span>
                    <span class="text-xs" style="color: var(--text-muted); font-weight: normal;">${m.date || m.timestamp}</span>
                  </div>
                  <div>${m.text}</div>
                </div>
              `).join('') : `
                <p class="text-xs" style="color: var(--text-muted); text-align: center; margin-top: 1rem;">
                  No hay mensajes guardados. Escribe tu primera consulta abajo.
                </p>
              `}
            </div>
          </div>

          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);" class="flex gap-2">
            <input type="text" id="client-chat-input" class="form-input text-sm" placeholder="Escribe un mensaje a tu contador..." />
            <button id="client-chat-send" class="btn btn-primary text-sm" style="padding: 0.65rem 1rem;">
              Enviar
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Attach event handlers
  setupClientEvents(container, freshUser);
}

function setupClientEvents(container, user) {
  // PWA Install Button in Hero
  const pwaBtn = container.querySelector('#btn-install-pwa-hero');
  if (pwaBtn) {
    pwaBtn.addEventListener('click', () => {
      showPwaInstructionsModal();
    });
  }

  // Print summary button
  const printBtn = container.querySelector('#btn-print-summary');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      printTaxDeclarationSummary(user, null);
    });
  }

  // Checklist checkbox toggles
  container.querySelectorAll('.chk-item-toggle').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const chkId = e.target.dataset.chkId;
      const isChecked = e.target.checked;

      const store = getStore();
      const client = store.users.find(u => u.id === user.id);
      if (client && client.checklist) {
        const item = client.checklist.find(i => i.id === chkId);
        if (item) item.completed = isChecked;
        saveStore(store);
        renderClientPortal(container, client);
        if (window.showToast) window.showToast(`Estado de requisito actualizado.`, 'success');
      }
    });
  });

  // Preview doc handler
  container.querySelectorAll('.btn-preview-doc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.docId;
      const doc = user.documents.find(d => d.id === docId);
      if (doc) {
        showDocumentPreviewModal(doc);
      }
    });
  });

  // Download doc handler
  container.querySelectorAll('.btn-download-doc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.docId;
      const doc = user.documents.find(d => d.id === docId);
      if (!doc) return;

      if (doc.fileData) {
        const a = document.createElement('a');
        a.href = doc.fileData;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const content = doc.previewContent || 'Documento Tributario de Declaración de Renta';
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      if (window.showToast) window.showToast(`Descargando ${doc.name}...`, 'success');
    });
  });

  // Chat message send
  const chatInput = container.querySelector('#client-chat-input');
  const chatSendBtn = container.querySelector('#client-chat-send');

  const sendMessage = () => {
    const text = chatInput.value.trim();
    if (!text) return;
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    addMessageToClient(user.id, {
      sender: user.name,
      text: text,
      date: formattedDate
    });

    chatInput.value = '';
    renderClientPortal(container, user);
    if (window.showToast) window.showToast('Mensaje enviado al contador', 'success');
  };

  if (chatSendBtn) chatSendBtn.addEventListener('click', sendMessage);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Upload document modal trigger for client
  const uploadBtn = container.querySelector('#btn-client-upload-doc');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      showUploadModalForUser(user, () => {
        renderClientPortal(container, user);
      });
    });
  }
}

export function showPwaInstructionsModal() {
  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">📲 Instalar Aplicación en Celular</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    
    <div style="padding: 0.5rem 0;">
      ${isIOS ? `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <h4 style="font-weight: 700; color: #60a5fa; margin-bottom: 0.5rem;">Instrucciones para iPhone / iPad (Safari):</h4>
          <ol style="font-size: 0.88rem; line-height: 1.6; padding-left: 1.2rem; color: var(--text-main);">
            <li>Toca el botón <strong>Compartir</strong> 📤 en la barra inferior de Safari.</li>
            <li>Desliza hacia abajo en las opciones y selecciona <strong>"Agregar al inicio"</strong>.</li>
            <li>Toca <strong>"Agregar"</strong> en la esquina superior derecha.</li>
          </ol>
        </div>
      ` : `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <h4 style="font-weight: 700; color: #34d399; margin-bottom: 0.5rem;">Instrucciones para Android / Chrome / Edge:</h4>
          <ol style="font-size: 0.88rem; line-height: 1.6; padding-left: 1.2rem; color: var(--text-main);">
            <li>Toca los <strong>tres puntos</strong> (⋮) en la esquina superior derecha de tu navegador.</li>
            <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
            <li>Confirma presionando <strong>"Instalar"</strong>.</li>
          </ol>
        </div>
      `}

      <p class="text-xs" style="color: var(--text-muted); text-align: center;">
        Una vez instalada, la app aparecerá en la pantalla de inicio de tu celular como una aplicación nativa.
      </p>
    </div>

    <div style="margin-top: 1.25rem; text-align: right;">
      <button class="btn btn-primary text-sm" id="btn-modal-close-down">Entendido</button>
    </div>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-modal-close-down').addEventListener('click', close);
}

export function showDocumentPreviewModal(doc) {
  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  const isImage = doc.fileData && (doc.fileData.startsWith('data:image/') || doc.type === 'png' || doc.type === 'jpg' || doc.type === 'jpeg');
  const isPdf = doc.fileData && (doc.fileData.startsWith('data:application/pdf') || doc.type === 'pdf');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">👁️ Soporte: ${doc.name}</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    
    <div class="pdf-preview-box" style="background: #ffffff; color: #0f172a; padding: 1.5rem; border-radius: 8px; max-height: 450px; overflow-y: auto;">
      ${isImage ? `
        <img src="${doc.fileData}" alt="${doc.name}" style="max-width: 100%; height: auto; border-radius: 6px; border: 1px solid #cbd5e1; display: block; margin: 0 auto;" />
      ` : (isPdf ? `
        <iframe src="${doc.fileData}" style="width: 100%; height: 350px; border: none; border-radius: 6px;"></iframe>
      ` : `
        <div class="pdf-header">
          <div>
            <div style="font-weight: 800; font-size: 1.1rem; color: #0f172a;">DECLARACIÓN DE RENTA DIAN</div>
            <div style="font-size: 0.75rem; color: #475569;">Documento Registrado en el Portal</div>
          </div>
          <div class="pdf-stamp">SOPORTE</div>
        </div>
        <div style="margin: 1.5rem 0; white-space: pre-wrap; font-size: 0.88rem; line-height: 1.6; color: #1e293b;">
${doc.previewContent || 'Contenido del documento tributario no disponible.'}
        </div>
      `)}
    </div>

    <div style="margin-top: 1.25rem;" class="flex justify-between items-center">
      <span class="text-xs" style="color: var(--text-muted);">Categoría: ${doc.category || 'General'} | Fecha: ${doc.uploadDate || doc.uploadedAt || 'Reciente'}</span>
      <button class="btn btn-secondary text-sm" id="btn-modal-close-down">Cerrar</button>
    </div>
  `;

  modalOverlay.classList.add('active');

  const closeBtn = modalBox.querySelector('#btn-close-modal');
  const closeBtn2 = modalBox.querySelector('#btn-modal-close-down');
  const close = () => modalOverlay.classList.remove('active');
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (closeBtn2) closeBtn2.addEventListener('click', close);
}

/**
 * Optimizador y Compresor de Imágenes de Cámara Móvil
 */
function processMobileFile(file) {
  return new Promise((resolve) => {
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|heic|webp)$/i.test(file.name);
    
    if (!isImage) {
      // PDF or non-image
      const reader = new FileReader();
      reader.onload = (e) => resolve({
        fileData: e.target.result,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: 'pdf'
      });
      reader.readAsDataURL(file);
      return;
    }

    // Process & compress mobile camera image
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const approxKB = Math.round((compressedDataUrl.length * 0.75) / 1024);

        resolve({
          fileData: compressedDataUrl,
          size: `${approxKB} KB`,
          type: 'jpg'
        });
      };
      img.onerror = () => {
        resolve({
          fileData: e.target.result,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          type: 'jpg'
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function showUploadModalForUser(targetUser, onSuccess) {
  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  let processedResult = null;
  let isProcessingFile = false;

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">📤 Subir Certificado o Foto de Cámara</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    <form id="form-upload-doc">
      <div class="form-group">
        <label class="form-label">Categoría del Soporte</label>
        <select id="upload-doc-category" class="form-select">
          <option value="Ingresos y Retención">Certificado de Ingresos y Retenciones 220</option>
          <option value="Extractos Bancarios">Extractos Bancarios / Financieros a 31 dic</option>
          <option value="Patrimonio">Impuesto Predial / Vehículos</option>
          <option value="Deducciones">Medicina Prepagada / Salud Complementaria</option>
          <option value="Legal & RUT">Cédula / RUT / Otros Soportes</option>
          <option value="Borrador Formulario 210">Borrador Formulario 210 DIAN</option>
          <option value="Soporte de Pago">Acuse de Recibo / Formulario 490 Pago DIAN</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Toma una Foto o Selecciona un Archivo (PDF, PNG, JPG)</label>
        <input type="file" id="real-file-input" accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg" class="form-input" style="padding: 0.5rem;" required />
        <div id="file-processing-status" class="text-xs" style="margin-top: 0.35rem; color: var(--text-muted);">
          📷 Puedes tomar fotos con la cámara de tu celular o elegir un archivo.
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Nombre del Documento</label>
        <input type="text" id="upload-doc-name" class="form-input" placeholder="ej. Certificado_Retencion_2025.jpg" required />
      </div>

      <div class="form-group">
        <label class="form-label">Notas Adicionales (Opcional)</label>
        <textarea id="upload-doc-preview" class="form-textarea" rows="2" placeholder="Notas sobre este soporte para el contador..."></textarea>
      </div>

      <div class="flex justify-between items-center" style="margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-upload">Cancelar</button>
        <button type="submit" class="btn btn-primary text-sm" id="btn-submit-doc">Guardar y Enviar Soporte</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-upload').addEventListener('click', close);

  const realFileInput = modalBox.querySelector('#real-file-input');
  const docNameInput = modalBox.querySelector('#upload-doc-name');
  const statusMsg = modalBox.querySelector('#file-processing-status');

  realFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      isProcessingFile = true;
      statusMsg.innerHTML = '<span style="color: #60a5fa;">⏳ Optimizando foto / archivo... Por favor espera.</span>';
      
      docNameInput.value = file.name || ('Foto_Soporte_' + Date.now() + '.jpg');

      try {
        processedResult = await processMobileFile(file);
        isProcessingFile = false;
        statusMsg.innerHTML = `<span style="color: #10b981;">✅ Archivo optimizado (${processedResult.size}). Listo para enviar.</span>`;
      } catch (err) {
        isProcessingFile = false;
        statusMsg.innerHTML = '<span style="color: #f43f5e;">❌ Error procesando el archivo. Intenta de nuevo.</span>';
      }
    }
  });

  const form = modalBox.querySelector('#form-upload-doc');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isProcessingFile) {
      if (window.showToast) window.showToast('Un momento, optimizando foto...', 'info');
      return;
    }

    const docName = docNameInput.value.trim() || 'Foto_Soporte.jpg';
    const category = modalBox.querySelector('#upload-doc-category').value;
    const previewContent = modalBox.querySelector('#upload-doc-preview').value.trim() || `Certificado ${docName} cargado.`;

    const newDoc = {
      id: 'doc_' + Date.now(),
      name: docName,
      type: processedResult ? processedResult.type : 'jpg',
      category: category,
      uploadDate: new Date().toLocaleDateString('es-CO'),
      size: processedResult ? processedResult.size : '150 KB',
      uploadedBy: targetUser.role === 'admin' ? 'Contador' : targetUser.name,
      fileData: processedResult ? processedResult.fileData : null,
      previewContent: previewContent
    };

    addDocumentToClient(targetUser.id, newDoc);
    close();

    if (window.showToast) window.showToast(`Documento ${newDoc.name} cargado con éxito.`, 'success');
    if (onSuccess) onSuccess();
  });
}
