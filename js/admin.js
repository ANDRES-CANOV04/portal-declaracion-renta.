/**
 * Admin Portal Renderer & Management Handlers con Importación/Exportación de Base de Datos
 */
import { showDocumentPreviewModal, showUploadModalForUser } from './client.js';
import { printTaxDeclarationSummary } from './pdfExport.js';
import { TAX_STAGES, addDocumentToClient, addMessageToClient, assignClientToAdmin, createNewAdmin, createNewClient, deleteUser, exportBackupJSON, getAllAdmins, getAssignedClientsForAdmin, getStore, importBackupStore, saveStore, toggleCentralAdminStatus, updateClientFinancials, updateClientStage, updateDocumentStatus, updateUserProfile, updateUserStatus } from './store.js';
import { computeFormulario210, formatCOP } from './taxCalculator.js';

let activeFilterStage = 'all';
let activeSearchQuery = '';
let activeAdminTab = 'clients'; // 'clients' | 'conversations' | 'files' | 'assignments'
let selectedChatClientId = null;
let activeFileCategoryFilter = 'all';
let activeAdminAssignmentFilter = 'all';

export function renderAdminPortal(container, adminUser) {
  const store = getStore();
  const allClients = store.users.filter(u => u.role === 'client');
  const allAdmins = getAllAdmins();
  const isCentralAdmin = !!adminUser.isCentralAdmin;

  // Filter clients based on assignment and central admin filters
  let assignedClients = getAssignedClientsForAdmin(adminUser);
  if (isCentralAdmin) {
    if (activeAdminAssignmentFilter === 'unassigned') {
      assignedClients = allClients.filter(c => !c.assignedAdminId);
    } else if (activeAdminAssignmentFilter !== 'all') {
      assignedClients = allClients.filter(c => c.assignedAdminId === activeAdminAssignmentFilter);
    } else {
      assignedClients = allClients;
    }
  }

  // Compute stats
  const totalClients = assignedClients.length;
  const completedCount = assignedClients.filter(c => c.currentStage === 4).length;
  const inProgressCount = assignedClients.filter(c => c.currentStage > 1 && c.currentStage < 4).length;
  const pendingDocsCount = assignedClients.filter(c => c.currentStage === 1).length;

  // Compute total files & total messages across assigned clients
  let totalFilesCount = 0;
  let totalMessagesCount = 0;
  assignedClients.forEach(c => {
    totalFilesCount += (c.documents || []).length;
    totalMessagesCount += (c.messages || []).length;
  });

  // Filter clients list for tab 1
  const filteredClients = assignedClients.filter(c => {
    const matchesStage = activeFilterStage === 'all' || (c.currentStage || 1).toString() === activeFilterStage.toString();
    const nameStr = (c.name || '').toLowerCase();
    const nitStr = (c.nit || '').toLowerCase();
    const emailStr = (c.email || '').toLowerCase();
    const q = (activeSearchQuery || '').toLowerCase();
    return matchesStage && (nameStr.includes(q) || nitStr.includes(q) || emailStr.includes(q));
  });

  // Set default selected chat client if not set or invalid
  if (!selectedChatClientId && assignedClients.length > 0) {
    selectedChatClientId = assignedClients[0].id;
  } else if (selectedChatClientId && !store.users.find(u => u.id === selectedChatClientId)) {
    selectedChatClientId = assignedClients.length > 0 ? assignedClients[0].id : null;
  }

  container.innerHTML = `
    <!-- Admin Dashboard Header Banner -->
    <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);">
      <div class="flex justify-between items-center flex-wrap gap-4">
        <div>
          <span class="badge ${isCentralAdmin ? 'badge-rose' : 'badge-emerald'}" style="margin-bottom: 0.5rem;">
            ${isCentralAdmin ? '👑 Administrador Central (SuperAdmin)' : '👨‍💼 Contador Administrador'}
          </span>
          <h2 style="font-size: 1.6rem; font-weight: 800; margin-top: 0.2rem;">
            ${adminUser.name} — Panel de Gestión DIAN
          </h2>
          <p style="color: var(--text-muted); font-size: 0.88rem;">
            ${isCentralAdmin 
              ? 'Tienes acceso total para clasificar contribuyentes, asignar contadores y auditar expedientes.' 
              : 'Visualizando tus contribuyentes asignados. Revisa soportes, conversaciones y borradores de renta.'}
          </p>
        </div>
        <div class="flex gap-2 flex-wrap items-center">
          <label class="btn btn-secondary text-sm" title="Cargar base de datos desde un archivo JSON" style="cursor: pointer; margin: 0;">
            📥 Cargar Respaldo
            <input type="file" id="btn-import-backup-file" accept=".json" style="display: none;" />
          </label>
          <button type="button" id="btn-export-backup" class="btn btn-secondary text-sm" title="Descargar copia de seguridad en JSON">
            💾 Exportar Respaldo
          </button>
          <button type="button" id="btn-admin-settings" class="btn btn-secondary text-sm" title="Configurar mis datos personales">
            ⚙️ Mi Configuración
          </button>
          <button type="button" id="btn-manage-admins" class="btn btn-secondary text-sm" title="Gestionar contadores">
            👥 Administradores
          </button>
          <button type="button" id="btn-create-client" class="btn btn-emerald text-sm">
            <span>➕</span> Nuevo Contribuyente
          </button>
        </div>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="admin-nav-tabs">
      <button class="admin-tab-btn ${activeAdminTab === 'clients' ? 'active' : ''}" data-tab="clients">
        <span>📋</span> Listado & Expedientes <span class="tab-badge">${assignedClients.length}</span>
      </button>
      <button class="admin-tab-btn ${activeAdminTab === 'conversations' ? 'active' : ''}" data-tab="conversations">
        <span>💬</span> Conversaciones Completeras <span class="tab-badge">${totalMessagesCount}</span>
      </button>
      <button class="admin-tab-btn ${activeAdminTab === 'files' ? 'active' : ''}" data-tab="files">
        <span>📂</span> Soportes & Archivos Subidos <span class="tab-badge">${totalFilesCount}</span>
      </button>
      ${isCentralAdmin ? `
        <button class="admin-tab-btn ${activeAdminTab === 'assignments' ? 'active' : ''}" data-tab="assignments" style="border-color: #ef4444;">
          <span>👑</span> Admin Central: Asignación de Contadores
        </button>
      ` : ''}
    </div>

    ${renderAdminTabContent(adminUser, store, assignedClients, filteredClients, allAdmins, isCentralAdmin)}
  `;

  setupAdminEvents(container, adminUser);
}

function renderAdminTabContent(adminUser, store, assignedClients, filteredClients, allAdmins, isCentralAdmin) {
  if (activeAdminTab === 'conversations') {
    return renderConversationsTab(adminUser, store, assignedClients);
  } else if (activeAdminTab === 'files') {
    return renderFilesGalleryTab(adminUser, store, assignedClients);
  } else if (activeAdminTab === 'assignments' && isCentralAdmin) {
    return renderAssignmentsTab(adminUser, store, store.users.filter(u => u.role === 'client'), allAdmins);
  }

  // Default: Clients List Tab
  const totalClients = assignedClients.length;
  const completedCount = assignedClients.filter(c => c.currentStage === 4).length;
  const inProgressCount = assignedClients.filter(c => c.currentStage > 1 && c.currentStage < 4).length;
  const pendingDocsCount = assignedClients.filter(c => c.currentStage === 1).length;

  return `
    <!-- Admin Quick Stats -->
    <div class="grid-4" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa;">👥</div>
        <div>
          <div class="stat-lbl">${isCentralAdmin ? 'Contribuyentes Visibles' : 'Mis Contribuyentes'}</div>
          <div class="stat-val">${totalClients}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        <div>
          <div class="stat-lbl">En Elaboración / Borrador</div>
          <div class="stat-val">${inProgressCount}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;">📋</div>
        <div>
          <div class="stat-lbl">Pendientes Soportes</div>
          <div class="stat-val">${pendingDocsCount}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
        <div>
          <div class="stat-lbl">Finalizadas / Presentadas</div>
          <div class="stat-val">${completedCount}</div>
        </div>
      </div>
    </div>

    <!-- Clients Management Section -->
    <div class="card">
      <div class="card-header flex-col md:flex-row gap-4">
        <div>
          <div class="card-title" style="display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span> Listado de Contribuyentes (${filteredClients.length})
            <button id="btn-refresh-clients" class="btn btn-secondary text-xs" style="padding: 0.25rem 0.5rem; min-height: auto;" title="Refrescar lista de clientes">
              🔄 Refrescar
            </button>
          </div>
          <p class="text-xs" style="color: var(--text-muted); margin-top: 0.2rem;">
            Selecciona a cualquier contribuyente para ingresar a su expediente individual.
          </p>
        </div>

        <!-- Filters & Search -->
        <div class="flex gap-2 items-center w-full md:w-auto flex-wrap">
          ${isCentralAdmin ? `
            <select id="admin-assigned-filter" class="form-select text-sm" style="width: 190px;">
              <option value="all" ${activeAdminAssignmentFilter === 'all' ? 'selected' : ''}>Todos los Contadores</option>
              <option value="unassigned" ${activeAdminAssignmentFilter === 'unassigned' ? 'selected' : ''}>⚠️ Sin Asignar</option>
              ${allAdmins.map(a => `
                <option value="${a.id}" ${activeAdminAssignmentFilter === a.id ? 'selected' : ''}>
                  👨‍💼 ${a.name}
                </option>
              `).join('')}
            </select>
          ` : ''}

          <input type="text" id="admin-search-input" class="form-input text-sm" placeholder="Buscar por Nombre, NIT o Email..." value="${activeSearchQuery}" style="width: 200px;" />
          
          <select id="admin-stage-filter" class="form-select text-sm" style="width: 180px;">
            <option value="all" ${activeFilterStage === 'all' ? 'selected' : ''}>Todos los Estados</option>
            ${TAX_STAGES.map(s => `
              <option value="${s.id}" ${activeFilterStage.toString() === s.id.toString() ? 'selected' : ''}>
                Etapa ${s.id}: ${s.name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Clients Table -->
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente / Contribuyente</th>
              <th>NIT / Cédula</th>
              <th>Contador Asignado</th>
              <th>Estado Cuenta</th>
              <th>Estado Trámite</th>
              <th>Resultado Fiscal</th>
              <th>Vencimiento</th>
              <th>Archivos</th>
              <th>Acciones de Gestión</th>
            </tr>
          </thead>
          <tbody>
            ${filteredClients.length > 0 ? filteredClients.map(c => {
              const stageObj = TAX_STAGES.find(s => s.id === (c.currentStage || 1)) || TAX_STAGES[0];
              const badgeClass = c.currentStage === 4 ? 'badge-emerald' : (c.currentStage === 3 ? 'badge-blue' : 'badge-amber');
              const isSuspended = c.status === 'suspended';
              const docsCount = c.documents ? c.documents.length : 0;
              const fin = c.financials || {};
              const isFavor = fin.balanceType === 'favor' || fin.balanceType === 'afavor';
              const isPagar = fin.balanceType === 'pagar' || fin.balanceType === 'apagar';
              const assignedAdmin = allAdmins.find(a => a.id === c.assignedAdminId);

              return `
                <tr style="${isSuspended ? 'opacity: 0.65; background: rgba(244, 63, 94, 0.04);' : ''}">
                  <td>
                    <button class="btn-admin-dossier text-left" data-client-id="${c.id}" style="background: none; border: none; padding: 0; cursor: pointer; color: inherit; text-align: left;">
                      <div style="font-weight: 700; color: #60a5fa; text-decoration: underline;">${c.name || 'Contribuyente'}</div>
                      <div class="text-xs" style="color: var(--text-muted);">${c.email}</div>
                    </button>
                  </td>
                  <td><code>${c.nit || 'Sin NIT'}</code></td>
                  <td>
                    <span class="badge ${assignedAdmin ? 'badge-blue' : 'badge-amber'}" style="font-size: 0.75rem;">
                      ${assignedAdmin ? `👨‍💼 ${assignedAdmin.name.split(',')[0]}` : '⚠️ Sin Asignar'}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${isSuspended ? 'badge-rose' : 'badge-emerald'}">
                      ${isSuspended ? '🚫 Suspendido' : '● Activo'}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${badgeClass}">
                      Etapa ${c.currentStage || 1}: ${stageObj.name}
                    </span>
                  </td>
                  <td>
                    <span style="font-weight: 700; color: ${isFavor ? '#10b981' : (isPagar ? '#f43f5e' : 'white')};">
                      ${fin.netBalance || '$ 0'}
                    </span>
                  </td>
                  <td><span class="text-xs">${fin.dueDate || 'Pendiente'}</span></td>
                  <td>
                    <button class="btn btn-secondary text-xs btn-open-client-files" data-client-id="${c.id}" title="Ver soportes de este cliente">
                      📁 ${docsCount} archivos
                    </button>
                  </td>
                  <td>
                    <div class="flex gap-1 flex-wrap">
                      <button class="btn btn-primary text-xs btn-admin-dossier" data-client-id="${c.id}" title="Abrir expediente completo del contribuyente">
                        👁️ Expediente
                      </button>
                      <button class="btn btn-secondary text-xs btn-open-client-chat" data-client-id="${c.id}" title="Ver conversación completa">
                        💬 Chat
                      </button>
                      <button class="btn btn-emerald text-xs btn-admin-tax-calc" data-client-id="${c.id}" title="Liquidación / Formulario 210">
                        🧮 Form 210
                      </button>
                      <button class="btn btn-secondary text-xs btn-admin-stage" data-client-id="${c.id}" title="Cambiar etapa del trámite">
                        ⚙️
                      </button>
                      <button class="btn btn-secondary text-xs btn-admin-edit" data-client-id="${c.id}" title="Editar perfil">
                        ✏️
                      </button>
                      <button class="btn ${isSuspended ? 'btn-emerald' : 'btn-secondary'} text-xs btn-admin-suspend" data-client-id="${c.id}" data-current-status="${c.status || 'active'}" title="${isSuspended ? 'Activar cliente' : 'Suspender cliente'}">
                        ${isSuspended ? '✅' : '🚫'}
                      </button>
                      <button class="btn btn-secondary text-xs btn-admin-delete" data-client-id="${c.id}" data-client-name="${c.name}" title="Eliminar cliente" style="color: var(--accent-rose);">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                  No se encontraron contribuyentes asignados que coincidan con la búsqueda.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderConversationsTab(adminUser, store, assignedClients) {
  const selectedClient = store.users.find(u => u.id === selectedChatClientId) || assignedClients[0];
  const messages = selectedClient ? (selectedClient.messages || []) : [];

  return `
    <div class="chat-conversations-layout">
      <!-- Left Sidebar: Taxpayers List -->
      <div class="chat-sidebar">
        <div class="chat-sidebar-header">
          <h3 style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.4rem;">💬 Conversaciones con Contribuyentes</h3>
          <input type="text" id="chat-search-input" class="form-input text-xs" placeholder="Buscar cliente por nombre..." />
        </div>
        <div style="overflow-y: auto; flex-grow: 1;" id="chat-sidebar-list">
          ${assignedClients.length > 0 ? assignedClients.map(c => {
            const isSelected = selectedClient && c.id === selectedClient.id;
            const msgs = c.messages || [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const initials = c.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
            return `
              <div class="chat-user-item ${isSelected ? 'active' : ''}" data-chat-client-id="${c.id}">
                <div class="avatar" style="width: 36px; height: 36px; font-size: 0.85rem; flex-shrink: 0;">${initials}</div>
                <div style="overflow: hidden; width: 100%;">
                  <div class="flex justify-between items-center">
                    <div style="font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isSelected ? '#60a5fa' : 'var(--text-main)'};">
                      ${c.name}
                    </div>
                    <span class="text-xs" style="color: var(--text-muted); font-size: 0.7rem;">${msgs.length} msg</span>
                  </div>
                  <div class="text-xs" style="color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${lastMsg ? `${lastMsg.sender === 'Contador' ? 'Tú: ' : ''}${lastMsg.text}` : 'Sin conversaciones previas'}
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
              No tienes contribuyentes asignados para chatear.
            </div>
          `}
        </div>
      </div>

      <!-- Right Window: Active Chat Timeline -->
      <div class="chat-main-window">
        ${selectedClient ? `
          <!-- Header Bar -->
          <div class="chat-header-bar">
            <div class="flex items-center gap-3">
              <div class="avatar" style="width: 40px; height: 40px; font-size: 1rem; background: linear-gradient(135deg, #2563eb 0%, #059669 100%);">
                ${selectedClient.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <div>
                <div style="font-weight: 800; font-size: 1.05rem;">${selectedClient.name}</div>
                <div class="text-xs" style="color: var(--text-muted);">
                  NIT/Cédula: <strong>${selectedClient.nit || 'N/A'}</strong> | Email: <strong>${selectedClient.email}</strong>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-secondary text-xs btn-admin-dossier" data-client-id="${selectedClient.id}">
                👁️ Ver Expediente
              </button>
              <button class="btn btn-emerald text-xs btn-admin-upload" data-client-id="${selectedClient.id}">
                📤 Enviar Archivo/Foto
              </button>
            </div>
          </div>

          <!-- Messages Container -->
          <div class="chat-messages-container" id="admin-chat-messages-timeline">
            ${messages.length > 0 ? messages.map(m => {
              const isAdmin = m.sender === 'Contador' || m.sender === adminUser.name;
              return `
                <div class="chat-bubble ${isAdmin ? 'sent-by-admin' : 'sent-by-client'}">
                  <div class="flex justify-between font-semibold" style="margin-bottom: 0.2rem; font-size: 0.75rem; opacity: 0.9;">
                    <span>${m.sender}</span>
                    <span style="font-weight: normal; margin-left: 1rem;">${m.date || m.timestamp || ''}</span>
                  </div>
                  <div>${m.text}</div>
                </div>
              `;
            }).join('') : `
              <div style="text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.9rem;">
                💬 No hay mensajes en esta conversación. Escribe un mensaje abajo para comunicarte con el contribuyente.
              </div>
            `}
          </div>

          <!-- Input Bar -->
          <div class="chat-input-bar">
            <input type="text" id="admin-chat-input-field" class="form-input text-sm" placeholder="Escribe un mensaje para ${selectedClient.name.split(' ')[0]}..." />
            <button id="admin-chat-submit-btn" class="btn btn-primary text-sm" style="padding: 0.65rem 1.25rem;">
              Enviar
            </button>
          </div>
        ` : `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">
            Selecciona un contribuyente de la lista izquierda para ver su conversación.
          </div>
        `}
      </div>
    </div>
  `;
}

function renderFilesGalleryTab(adminUser, store, assignedClients) {
  let allFiles = [];
  assignedClients.forEach(c => {
    (c.documents || []).forEach(doc => {
      allFiles.push({
        ...doc,
        clientId: c.id,
        clientName: c.name,
        clientNit: c.nit
      });
    });
  });

  const categories = ['all', 'Ingresos y Retención', 'Extractos Bancarios', 'Patrimonio', 'Deducciones', 'Legal & RUT', 'Borrador Formulario 210', 'Soporte de Pago'];

  const filteredFiles = activeFileCategoryFilter === 'all' 
    ? allFiles 
    : allFiles.filter(f => f.category === activeFileCategoryFilter);

  return `
    <div class="card">
      <div class="card-header flex-col md:flex-row gap-4" style="margin-bottom: 1.25rem;">
        <div>
          <div class="card-title">
            <span>📂</span> Galería de Archivos & Fotos de Contribuyentes (${filteredFiles.length})
          </div>
          <p class="text-xs" style="color: var(--text-muted); margin-top: 0.2rem;">
            Examina y aprueba todas las fotos de cámaras móviles, certificados e imágenes enviadas por tus contribuyentes.
          </p>
        </div>

        <div class="flex gap-2 items-center">
          <span class="text-xs" style="color: var(--text-muted);">Categoría:</span>
          <select id="gallery-category-filter" class="form-select text-sm" style="width: 220px;">
            ${categories.map(cat => `
              <option value="${cat}" ${activeFileCategoryFilter === cat ? 'selected' : ''}>
                ${cat === 'all' ? 'Todas las Categorías' : cat}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- File Cards Grid -->
      <div class="file-gallery-grid">
        ${filteredFiles.length > 0 ? filteredFiles.map(f => {
          const isImage = f.fileData && (f.fileData.startsWith('data:image/') || f.type === 'png' || f.type === 'jpg' || f.type === 'jpeg');
          const statusBadge = f.status === 'approved' ? '<span class="badge badge-emerald">✅ Aprobado</span>' : (f.status === 'rejected' ? '<span class="badge badge-rose">❌ Rechazado</span>' : '<span class="badge badge-amber">⏳ En Revisión</span>');

          return `
            <div class="file-card-item">
              <div>
                <div class="file-thumb-container">
                  ${isImage ? `
                    <img src="${f.fileData}" alt="${f.name}" />
                  ` : `
                    <div style="text-align: center; color: #60a5fa;">
                      <div style="font-size: 2.2rem;">📄</div>
                      <div class="text-xs font-bold">${(f.type || 'PDF').toUpperCase()}</div>
                    </div>
                  `}
                </div>
                <div style="font-weight: 700; font-size: 0.88rem; margin-bottom: 0.2rem; word-break: break-word;">${f.name}</div>
                <div class="text-xs" style="color: var(--text-muted); margin-bottom: 0.4rem;">
                  Contribuyente: <strong style="color: #60a5fa;">${f.clientName}</strong> (${f.clientNit})
                </div>
                <div class="flex justify-between items-center" style="margin-bottom: 0.6rem;">
                  <span class="badge badge-blue text-xs">${f.category || 'General'}</span>
                  ${statusBadge}
                </div>
              </div>

              <div style="border-top: 1px solid var(--border-color); padding-top: 0.65rem;" class="flex gap-1 justify-between flex-wrap">
                <button class="btn btn-secondary text-xs btn-gallery-preview" data-doc-id="${f.id}" data-client-id="${f.clientId}">
                  👁️ Previa
                </button>
                <button class="btn btn-secondary text-xs btn-gallery-download" data-doc-id="${f.id}" data-client-id="${f.clientId}">
                  ⬇️ Descargar
                </button>
                <button class="btn btn-emerald text-xs btn-gallery-approve" data-doc-id="${f.id}" data-client-id="${f.clientId}">
                  ✅
                </button>
                <button class="btn btn-secondary text-xs btn-gallery-reject" data-doc-id="${f.id}" data-client-id="${f.clientId}" style="color: #f43f5e;">
                  ❌
                </button>
              </div>
            </div>
          `;
        }).join('') : `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted); background: rgba(0,0,0,0.1); border-radius: 8px;">
            No se encontraron soportes ni archivos en esta categoría.
          </div>
        `}
      </div>
    </div>
  `;
}

function renderAssignmentsTab(adminUser, store, allClients, allAdmins) {
  return `
    <div class="card">
      <div class="card-header flex-col md:flex-row gap-4" style="margin-bottom: 1.25rem;">
        <div>
          <div class="card-title" style="color: #ef4444;">
            <span>👑</span> Clasificación y Asignación de Contadores (Panel Admin Central)
          </div>
          <p class="text-xs" style="color: var(--text-muted); margin-top: 0.2rem;">
            Asigna o modifica en tiempo real qué contador atiende a cada contribuyente registrado en el portal.
          </p>
        </div>

        <div class="flex gap-2 items-center">
          <span class="text-xs" style="color: var(--text-muted);">Filtrar Asignación:</span>
          <select id="assignment-admin-filter" class="form-select text-sm" style="width: 210px;">
            <option value="all">Todos los Contribuyentes (${allClients.length})</option>
            <option value="unassigned">⚠️ Sin Asignar (${allClients.filter(c => !c.assignedAdminId).length})</option>
            ${allAdmins.map(a => `
              <option value="${a.id}">👨‍💼 ${a.name} (${allClients.filter(c => c.assignedAdminId === a.id).length})</option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Assignments Table -->
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Contribuyente</th>
              <th>NIT / Cédula</th>
              <th>Etapa Trámite</th>
              <th>Contador Asignado Activo</th>
              <th>Seleccionar Nuevo Contador</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${allClients.length > 0 ? allClients.map(c => {
              const currentAdmin = allAdmins.find(a => a.id === c.assignedAdminId);
              const stageObj = TAX_STAGES.find(s => s.id === (c.currentStage || 1)) || TAX_STAGES[0];

              return `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: var(--text-main);">${c.name}</div>
                    <div class="text-xs" style="color: var(--text-muted);">${c.email}</div>
                  </td>
                  <td><code>${c.nit || 'Sin NIT'}</code></td>
                  <td>
                    <span class="badge badge-blue">Etapa ${c.currentStage || 1}: ${stageObj.name}</span>
                  </td>
                  <td>
                    <span class="badge ${currentAdmin ? 'badge-emerald' : 'badge-amber'}">
                      ${currentAdmin ? `👨‍💼 ${currentAdmin.name}` : '⚠️ Sin Asignar'}
                    </span>
                  </td>
                  <td>
                    <select class="form-select text-xs select-change-accountant" data-client-id="${c.id}" style="width: 220px;">
                      ${allAdmins.map(a => `
                        <option value="${a.id}" ${c.assignedAdminId === a.id ? 'selected' : ''}>
                          👨‍💼 ${a.name} (${a.specialty ? a.specialty.substring(0, 20) : 'Contador'})
                        </option>
                      `).join('')}
                    </select>
                  </td>
                  <td>
                    <button class="btn btn-primary text-xs btn-admin-dossier" data-client-id="${c.id}">
                      👁️ Ver Expediente
                    </button>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                  No hay contribuyentes para asignar.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setupAdminEvents(container, adminUser) {
  // Admin Tabs listener
  container.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeAdminTab = e.currentTarget.dataset.tab;
      renderAdminPortal(container, adminUser);
    });
  });

  // Assigned accountant filter (Central Admin)
  const assignedFilter = container.querySelector('#admin-assigned-filter');
  if (assignedFilter) {
    assignedFilter.addEventListener('change', (e) => {
      activeAdminAssignmentFilter = e.target.value;
      renderAdminPortal(container, adminUser);
    });
  }

  // Import backup listener
  const importFileInput = container.querySelector('#btn-import-backup-file');
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (importBackupStore(data)) {
              if (window.showToast) window.showToast('Base de datos restaurada con éxito.', 'success');
              renderAdminPortal(container, adminUser);
            }
          } catch (err) {
            if (window.showToast) window.showToast('Archivo de respaldo no válido.', 'error');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // Open Dossier button or name click
  container.querySelectorAll('.btn-admin-dossier').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      showClientDossierModal(clientId, () => renderAdminPortal(container, adminUser));
    });
  });

  // Open Chat tab from client table button
  container.querySelectorAll('.btn-open-client-chat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      selectedChatClientId = e.currentTarget.dataset.clientId;
      activeAdminTab = 'conversations';
      renderAdminPortal(container, adminUser);
    });
  });

  // Open Files tab from client table button
  container.querySelectorAll('.btn-open-client-files').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeAdminTab = 'files';
      renderAdminPortal(container, adminUser);
    });
  });

  // Chat Tab: Select Client Handler
  container.querySelectorAll('.chat-user-item').forEach(item => {
    item.addEventListener('click', (e) => {
      selectedChatClientId = e.currentTarget.dataset.chatClientId;
      renderAdminPortal(container, adminUser);
    });
  });

  // Chat Tab: Search Filter Handler
  const chatSearch = container.querySelector('#chat-search-input');
  if (chatSearch) {
    chatSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.chat-user-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Chat Tab: Send Message Handler
  const chatInput = container.querySelector('#admin-chat-input-field');
  const chatSendBtn = container.querySelector('#admin-chat-submit-btn');
  const sendAdminMsg = () => {
    if (!selectedChatClientId || !chatInput) return;
    const txt = chatInput.value.trim();
    if (!txt) return;

    addMessageToClient(selectedChatClientId, {
      sender: 'Contador',
      text: txt,
      date: new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    chatInput.value = '';
    renderAdminPortal(container, adminUser);
  };

  if (chatSendBtn) chatSendBtn.addEventListener('click', sendAdminMsg);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendAdminMsg();
    });
  }

  // Files Gallery: Category Filter
  const galleryCatSelect = container.querySelector('#gallery-category-filter');
  if (galleryCatSelect) {
    galleryCatSelect.addEventListener('change', (e) => {
      activeFileCategoryFilter = e.target.value;
      renderAdminPortal(container, adminUser);
    });
  }

  // Files Gallery: Preview Handler
  container.querySelectorAll('.btn-gallery-preview').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      const docId = e.currentTarget.dataset.docId;
      const store = getStore();
      const client = store.users.find(u => u.id === clientId);
      const doc = client?.documents?.find(d => d.id === docId);
      if (doc) showDocumentPreviewModal(doc);
    });
  });

  // Files Gallery: Download Handler
  container.querySelectorAll('.btn-gallery-download').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      const docId = e.currentTarget.dataset.docId;
      const store = getStore();
      const client = store.users.find(u => u.id === clientId);
      const doc = client?.documents?.find(d => d.id === docId);
      if (doc && doc.fileData) {
        const a = document.createElement('a');
        a.href = doc.fileData;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  });

  // Files Gallery: Approve Handler
  container.querySelectorAll('.btn-gallery-approve').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      const docId = e.currentTarget.dataset.docId;
      updateDocumentStatus(clientId, docId, 'approved');
      if (window.showToast) window.showToast('Soporte APROBADO con éxito.', 'success');
      renderAdminPortal(container, adminUser);
    });
  });

  // Files Gallery: Reject Handler
  container.querySelectorAll('.btn-gallery-reject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      const docId = e.currentTarget.dataset.docId;
      const fb = prompt('Ingresa la observación o razón del rechazo para el contribuyente:');
      if (fb !== null) {
        updateDocumentStatus(clientId, docId, 'rejected', fb);
        if (window.showToast) window.showToast('Soporte marcado como RECHAZADO.', 'info');
        renderAdminPortal(container, adminUser);
      }
    });
  });

  // Central Admin Assignments: Change Accountant Select Handler
  container.querySelectorAll('.select-change-accountant').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const clientId = e.target.dataset.clientId;
      const newAdminId = e.target.value;
      if (assignClientToAdmin(clientId, newAdminId)) {
        const store = getStore();
        const newAdmin = store.users.find(u => u.id === newAdminId);
        if (window.showToast) window.showToast(`Contribuyente reasignado a: ${newAdmin ? newAdmin.name : 'Contador'}`, 'success');
        renderAdminPortal(container, adminUser);
      }
    });
  });

  // Refresh button
  const refreshBtn = container.querySelector('#btn-refresh-clients');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      renderAdminPortal(container, adminUser);
      if (window.showToast) window.showToast('Lista de contribuyentes actualizada.', 'info');
    });
  }

  // Backup export
  const backupBtn = container.querySelector('#btn-export-backup');
  if (backupBtn) {
    backupBtn.addEventListener('click', () => {
      exportBackupJSON();
      if (window.showToast) window.showToast('Respaldo descargado con éxito.', 'success');
    });
  }

  // Tax 210 Calc button
  container.querySelectorAll('.btn-admin-tax-calc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      showFormulario210Modal(clientId, () => renderAdminPortal(container, adminUser));
    });
  });

  // Search input handler
  const searchInput = container.querySelector('#admin-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeSearchQuery = e.target.value;
      renderAdminPortal(container, adminUser);
    });
  }

  // Filter select handler
  const filterSelect = container.querySelector('#admin-stage-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      activeFilterStage = e.target.value;
      renderAdminPortal(container, adminUser);
    });
  }

  // Settings button
  const settingsBtn = container.querySelector('#btn-admin-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      showAdminSettingsModal(adminUser, () => {
        if (window.renderApp) window.renderApp();
      });
    });
  }

  // Manage Admins button
  const manageAdminsBtn = container.querySelector('#btn-manage-admins');
  if (manageAdminsBtn) {
    manageAdminsBtn.addEventListener('click', () => {
      showManageAdminsModal(() => renderAdminPortal(container, adminUser));
    });
  }

  // Suspend/Activate client handlers
  container.querySelectorAll('.btn-admin-suspend').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      const currentStatus = e.currentTarget.dataset.currentStatus;
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      
      updateUserStatus(clientId, newStatus);
      if (window.showToast) {
        window.showToast(newStatus === 'suspended' ? 'Cliente suspendido.' : 'Cliente activado.', 'info');
      }
      renderAdminPortal(container, adminUser);
    });
  });

  // Delete client handlers
  container.querySelectorAll('.btn-admin-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      const clientName = e.currentTarget.dataset.clientName;
      if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al cliente "${clientName}"? Esta acción no se puede deshacer.`)) {
        deleteUser(clientId);
        if (window.showToast) window.showToast(`Cliente ${clientName} eliminado.`, 'success');
        renderAdminPortal(container, adminUser);
      }
    });
  });

  // Create client button
  const createBtn = container.querySelector('#btn-create-client');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      showCreateClientModal(() => renderAdminPortal(container, adminUser));
    });
  }

  // Change stage buttons
  container.querySelectorAll('.btn-admin-stage').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      showChangeStageModal(clientId, () => renderAdminPortal(container, adminUser));
    });
  });

  // Upload/Manage docs buttons
  container.querySelectorAll('.btn-admin-upload').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      const store = getStore();
      const client = store.users.find(u => u.id === clientId);
      if (client && window.showUploadModalForUser) {
        window.showUploadModalForUser(client, () => renderAdminPortal(container, adminUser));
      }
    });
  });

  // Edit client values button
  container.querySelectorAll('.btn-admin-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      showEditClientModal(clientId, () => renderAdminPortal(container, adminUser));
    });
  });
}

/**
 * Modal de Expediente Completo e Inspección Individual del Contribuyente
 */
export function showClientDossierModal(clientId, onUpdate) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (!client) return;

  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  const stageObj = TAX_STAGES.find(s => s.id === (client.currentStage || 1)) || TAX_STAGES[0];
  const docs = client.documents || [];
  const msgs = client.messages || [];
  const checklist = client.checklist || [];
  const history = client.history || [];
  const fin = client.financials || {};

  modalBox.style.maxWidth = '920px';

  modalBox.innerHTML = `
    <div class="modal-header flex justify-between items-center" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
      <div class="flex items-center gap-3">
        <div class="avatar" style="width: 44px; height: 44px; font-size: 1.1rem; background: linear-gradient(135deg, #2563eb 0%, #059669 100%);">
          ${client.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 style="font-size: 1.3rem; font-weight: 800; margin: 0;">${client.name}</h3>
          <div class="text-xs" style="color: var(--text-muted);">
            NIT/Cédula: <strong>${client.nit || 'Sin Registrar'}</strong> | Email: <strong>${client.email}</strong> | Tel: <strong>${client.phone || 'N/A'}</strong>
          </div>
        </div>
      </div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>

    <!-- Dossier Quick Control Bar -->
    <div style="background: rgba(255, 255, 255, 0.03); padding: 0.85rem 1rem; border-radius: 8px; margin: 1rem 0; border: 1px solid var(--border-color);" class="flex justify-between items-center flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <span class="text-xs" style="color: var(--text-muted);">Estado del Trámite:</span>
        <span class="badge ${client.currentStage === 4 ? 'badge-emerald' : 'badge-blue'}">
          ● Etapa ${client.currentStage || 1}: ${stageObj.name}
        </span>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button id="dossier-btn-stage" class="btn btn-secondary text-xs">⚙️ Cambiar Etapa</button>
        <button id="dossier-btn-calc" class="btn btn-emerald text-xs">🧮 Liquidador Form 210</button>
        <button id="dossier-btn-upload" class="btn btn-primary text-xs">📤 Subir Documento</button>
        <button id="dossier-btn-print" class="btn btn-secondary text-xs">🖨️ Imprimir Resumen</button>
      </div>
    </div>

    <!-- Dossier Content Grid -->
    <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 1.25rem; max-height: 520px; overflow-y: auto; padding-right: 0.25rem;">
      
      <!-- Left Column: Soportes Subidos & Checklist DIAN -->
      <div class="flex-col gap-4">
        
        <!-- Soportes y Certificados -->
        <div class="card" style="padding: 1.1rem;">
          <div class="flex justify-between items-center" style="margin-bottom: 0.75rem;">
            <div style="font-weight: 700; font-size: 0.95rem;">📄 Certificados y Soportes Adjuntos (${docs.length})</div>
          </div>
          
          <div class="flex-col gap-2">
            ${docs.length > 0 ? docs.map(d => {
              const statusBadge = d.status === 'approved' ? '<span class="badge badge-emerald">✅ Aprobado</span>' : (d.status === 'rejected' ? '<span class="badge badge-rose">❌ Rechazado</span>' : '<span class="badge badge-amber">⏳ En Revisión</span>');
              return `
                <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: 6px;" class="flex justify-between items-center">
                  <div>
                    <div style="font-weight: 600; font-size: 0.88rem;">${d.name} ${statusBadge}</div>
                    <div class="text-xs" style="color: var(--text-muted);">
                      Categoría: ${d.category || 'General'} | Fecha: ${d.uploadDate || 'Hoy'} | Peso: ${d.size || 'N/A'}
                    </div>
                    ${d.feedback ? `<div class="text-xs" style="color: #f43f5e; margin-top: 0.2rem;">Observación: "${d.feedback}"</div>` : ''}
                  </div>
                  <div class="flex gap-1">
                    <button class="btn btn-secondary text-xs btn-dossier-prev-doc" data-doc-id="${d.id}">👁️</button>
                    <button class="btn btn-secondary text-xs btn-dossier-down-doc" data-doc-id="${d.id}">⬇️</button>
                    <button class="btn btn-emerald text-xs btn-dossier-approve-doc" data-doc-id="${d.id}" title="Aprobar soporte">✅</button>
                    <button class="btn btn-secondary text-xs btn-dossier-reject-doc" data-doc-id="${d.id}" title="Rechazar o solicitar corrección" style="color: #f43f5e;">❌</button>
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="text-xs" style="color: var(--text-muted); text-align: center; padding: 1.5rem; background: rgba(0,0,0,0.1); border-radius: 6px;">
                El contribuyente aún no ha subido certificados o soportes.
              </div>
            `}
          </div>
        </div>

        <!-- Checklist Tributario DIAN -->
        <div class="card" style="padding: 1.1rem;">
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.6rem;">📋 Verificación de Requisitos Tributarios DIAN</div>
          <div class="flex-col gap-1.5">
            ${checklist.map(item => `
              <label class="flex items-center justify-between" style="padding: 0.45rem 0.65rem; background: rgba(255,255,255,0.02); border-radius: 4px; font-size: 0.82rem; border: 1px solid var(--border-color);">
                <div class="flex items-center gap-2">
                  <input type="checkbox" class="dossier-chk-toggle" data-chk-id="${item.id}" ${item.completed ? 'checked' : ''} style="cursor: pointer;">
                  <span style="text-decoration: ${item.completed ? 'line-through' : 'none'}; opacity: ${item.completed ? '0.7' : '1'};">
                    ${item.title}
                  </span>
                </div>
                <span class="badge ${item.completed ? 'badge-emerald' : 'badge-blue'}" style="font-size: 0.65rem;">
                  ${item.completed ? 'Verificado' : 'Pendiente'}
                </span>
              </label>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Right Column: Resumen Financiero, Chat Directo y Bitácora -->
      <div class="flex-col gap-4">
        
        <!-- Cifras Tributarias -->
        <div class="card" style="padding: 1.1rem;">
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.6rem;">💰 Resumen de Liquidación Formulario 210</div>
          <div class="text-xs flex-col gap-1">
            <div class="flex justify-between"><span>Ingresos Brutos:</span> <strong>${fin.totalIncome || '$ 0'}</strong></div>
            <div class="flex justify-between"><span>Retenciones:</span> <strong>${fin.withholdings || '$ 0'}</strong></div>
            <div class="flex justify-between" style="border-top: 1px solid var(--border-color); padding-top: 0.3rem; margin-top: 0.2rem;">
              <span>Resultado Fiscal:</span>
              <strong style="color: ${fin.balanceType === 'favor' || fin.balanceType === 'afavor' ? '#10b981' : (fin.balanceType === 'pagar' || fin.balanceType === 'apagar' ? '#f43f5e' : '#ffffff')};">
                ${fin.netBalance || '$ 0'} (${fin.balanceType === 'favor' || fin.balanceType === 'afavor' ? 'A Favor' : 'A Pagar'})
              </strong>
            </div>
          </div>
        </div>

        <!-- Chat Directo con el Cliente -->
        <div class="card" style="padding: 1.1rem; min-height: 220px;" class="flex-col justify-between">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.6rem;">💬 Mensajes Directos con ${client.name.split(' ')[0]}</div>
            <div id="dossier-chat-box" style="max-height: 140px; overflow-y: auto;" class="flex-col gap-1.5">
              ${msgs.length > 0 ? msgs.map(m => `
                <div style="background: ${m.sender === 'Contador' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.06)'}; padding: 0.45rem 0.65rem; border-radius: 6px; font-size: 0.78rem;">
                  <div class="flex justify-between font-semibold" style="margin-bottom: 0.1rem; color: ${m.sender === 'Contador' ? '#60a5fa' : 'var(--text-main)'}">
                    <span>${m.sender}</span>
                    <span class="text-xs" style="color: var(--text-muted); font-weight: normal;">${m.date || m.timestamp || ''}</span>
                  </div>
                  <div>${m.text}</div>
                </div>
              `).join('') : '<p class="text-xs" style="color: var(--text-muted); text-align: center;">No hay mensajes con el cliente.</p>'}
            </div>
          </div>

          <div class="flex gap-1.5" style="margin-top: 0.6rem; padding-top: 0.4rem; border-top: 1px solid var(--border-color);">
            <input type="text" id="dossier-chat-input" class="form-input text-xs" placeholder="Escribir mensaje al cliente..." />
            <button id="dossier-chat-send" class="btn btn-primary text-xs" style="padding: 0.4rem 0.75rem;">Enviar</button>
          </div>
        </div>

        <!-- Bitácora de Historial -->
        <div class="card" style="padding: 1.1rem;">
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.4rem;">📜 Bitácora de Actividades</div>
          <div style="max-height: 100px; overflow-y: auto;" class="flex-col gap-1 text-xs">
            ${history.length > 0 ? history.map(h => `
              <div style="color: var(--text-muted); border-left: 2px solid var(--primary); padding-left: 0.4rem;">
                <span style="color: var(--text-main);">${h.action}</span> — <em>${h.date}</em>
              </div>
            `).join('') : '<div class="text-xs" style="color: var(--text-muted);">Sin historial.</div>'}
          </div>
        </div>

      </div>

    </div>

    <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;" class="flex justify-between items-center">
      <span class="text-xs" style="color: var(--text-muted);">Expediente ID: ${client.id}</span>
      <button class="btn btn-secondary text-sm" id="btn-modal-close-down">Cerrar Expediente</button>
    </div>
  `;

  modalOverlay.classList.add('active');

  const close = () => {
    modalOverlay.classList.remove('active');
    modalBox.style.maxWidth = '580px';
    if (onUpdate) onUpdate();
  };

  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-modal-close-down').addEventListener('click', close);

  // Quick Action Handlers inside Dossier
  modalBox.querySelector('#dossier-btn-stage').addEventListener('click', () => {
    showChangeStageModal(client.id, () => showClientDossierModal(client.id, onUpdate));
  });

  modalBox.querySelector('#dossier-btn-calc').addEventListener('click', () => {
    showFormulario210Modal(client.id, () => showClientDossierModal(client.id, onUpdate));
  });

  modalBox.querySelector('#dossier-btn-upload').addEventListener('click', () => {
    showUploadModalForUser(client, () => showClientDossierModal(client.id, onUpdate));
  });

  modalBox.querySelector('#dossier-btn-print').addEventListener('click', () => {
    printTaxDeclarationSummary(client, null);
  });

  // Checklist toggles inside Dossier
  modalBox.querySelectorAll('.dossier-chk-toggle').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const chkId = e.target.dataset.chkId;
      const isChecked = e.target.checked;
      const currentStore = getStore();
      const targetClient = currentStore.users.find(u => u.id === client.id);
      if (targetClient && targetClient.checklist) {
        const item = targetClient.checklist.find(i => i.id === chkId);
        if (item) item.completed = isChecked;
        saveStore(currentStore);
        showClientDossierModal(client.id, onUpdate);
      }
    });
  });

  // Preview doc inside Dossier
  modalBox.querySelectorAll('.btn-dossier-prev-doc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.docId;
      const doc = docs.find(d => d.id === docId);
      if (doc) showDocumentPreviewModal(doc);
    });
  });

  // Download doc inside Dossier
  modalBox.querySelectorAll('.btn-dossier-down-doc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.docId;
      const doc = docs.find(d => d.id === docId);
      if (doc && doc.fileData) {
        const a = document.createElement('a');
        a.href = doc.fileData;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  });

  // Approve doc inside Dossier
  modalBox.querySelectorAll('.btn-dossier-approve-doc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.docId;
      updateDocumentStatus(client.id, docId, 'approved');
      if (window.showToast) window.showToast('Documento marcado como APROBADO', 'success');
      showClientDossierModal(client.id, onUpdate);
    });
  });

  // Reject doc inside Dossier
  modalBox.querySelectorAll('.btn-dossier-reject-doc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.docId;
      const feedback = prompt('Ingresa la observación o razón del rechazo para el cliente:');
      if (feedback !== null) {
        updateDocumentStatus(client.id, docId, 'rejected', feedback);
        if (window.showToast) window.showToast('Documento marcado como RECHAZADO', 'info');
        showClientDossierModal(client.id, onUpdate);
      }
    });
  });

  // Send Chat message from Dossier
  const chatInput = modalBox.querySelector('#dossier-chat-input');
  const chatSendBtn = modalBox.querySelector('#dossier-chat-send');
  const sendDossierMsg = () => {
    const txt = chatInput.value.trim();
    if (!txt) return;
    addMessageToClient(client.id, {
      sender: 'Contador',
      text: txt,
      date: new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    chatInput.value = '';
    showClientDossierModal(client.id, onUpdate);
  };
  if (chatSendBtn) chatSendBtn.addEventListener('click', sendDossierMsg);
  if (chatInput) {
    chatInput.addEventListener('keypress', (ev) => {
      if (ev.key === 'Enter') sendDossierMsg();
    });
  }
}

// Modal Formulario 210 Calculator & Liquidator
function showFormulario210Modal(clientId, onSuccess) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (!client) return;

  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">🧮 Borrador Formulario 210 DIAN — ${client.name}</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    
    <form id="form-210-calc">
      <p class="text-xs" style="color: var(--text-muted); margin-bottom: 1rem;">
        Ingresa los valores brutos y deducciones para calcular la Renta Cédula General y tarifa marginal del impuesto.
      </p>

      <div class="grid-3" style="margin-bottom: 1rem;">
        <div class="form-group">
          <label class="form-label">Ingresos Laborales ($)</label>
          <input type="number" id="f210-ing-trabajo" class="form-input text-sm" value="0" step="1000" />
        </div>
        <div class="form-group">
          <label class="form-label">Ingresos de Capital ($)</label>
          <input type="number" id="f210-ing-capital" class="form-input text-sm" value="0" step="1000" />
        </div>
        <div class="form-group">
          <label class="form-label">Ingresos No Laborales ($)</label>
          <input type="number" id="f210-ing-nolaboral" class="form-input text-sm" value="0" step="1000" />
        </div>
      </div>

      <div class="grid-3" style="margin-bottom: 1rem;">
        <div class="form-group">
          <label class="form-label">Intereses Vivienda ($)</label>
          <input type="number" id="f210-deduc-vivienda" class="form-input text-sm" value="0" step="1000" />
        </div>
        <div class="form-group">
          <label class="form-label">Medicina Prepagada ($)</label>
          <input type="number" id="f210-deduc-salud" class="form-input text-sm" value="0" step="1000" />
        </div>
        <div class="form-group">
          <label class="form-label">Dependientes ($)</label>
          <input type="number" id="f210-deduc-dependientes" class="form-input text-sm" value="0" step="1000" />
        </div>
      </div>

      <div class="grid-2" style="margin-bottom: 1rem;">
        <div class="form-group">
          <label class="form-label">Retenciones Practicadas ($)</label>
          <input type="number" id="f210-retenciones" class="form-input text-sm" value="0" step="1000" />
        </div>
        <div class="form-group">
          <label class="form-label">Anticipo Año Anterior ($)</label>
          <input type="number" id="f210-anticipo" class="form-input text-sm" value="0" step="1000" />
        </div>
      </div>

      <!-- Live Calculation Box -->
      <div id="f210-live-result" style="background: rgba(15, 23, 42, 0.6); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1rem;">
        <div class="text-xs font-semibold" style="color: var(--text-muted); margin-bottom: 0.5rem;">RESULTADO ESTIMADO EN TIEMPO REAL:</div>
        <div class="grid-2">
          <div>
            <div class="text-xs">Impuesto Calculado: <strong id="res-impuesto">$ 0</strong></div>
            <div class="text-xs">Renta Gravable (UVT): <strong id="res-uvt">0.0 UVT</strong></div>
          </div>
          <div style="text-align: right;">
            <div class="text-xs">Resultado Fiscal:</div>
            <div id="res-balance-val" style="font-size: 1.3rem; font-weight: 800; color: #10b981;">$ 0</div>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center" style="margin-top: 1.25rem;">
        <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-210">Cancelar</button>
        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary text-sm" id="btn-print-210">🖨️ Imprimir Formulario</button>
          <button type="submit" class="btn btn-emerald text-sm">Aplicar y Guardar Cifras</button>
        </div>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-210').addEventListener('click', close);

  let currentCalculatedResult = null;

  const runCalculation = () => {
    const inputs = {
      ingTrabajo: modalBox.querySelector('#f210-ing-trabajo').value,
      ingCapital: modalBox.querySelector('#f210-ing-capital').value,
      ingNoLaboral: modalBox.querySelector('#f210-ing-nolaboral').value,
      deducVivienda: modalBox.querySelector('#f210-deduc-vivienda').value,
      deducSalud: modalBox.querySelector('#f210-deduc-salud').value,
      deducDependientes: modalBox.querySelector('#f210-deduc-dependientes').value,
      retencionesFuente: modalBox.querySelector('#f210-retenciones').value,
      anticipoAnterior: modalBox.querySelector('#f210-anticipo').value
    };

    currentCalculatedResult = computeFormulario210(inputs, parseInt(client.year || 2025));

    modalBox.querySelector('#res-impuesto').textContent = currentCalculatedResult.formattedImpuesto;
    modalBox.querySelector('#res-uvt').textContent = currentCalculatedResult.rentaLiquidaUVT.toFixed(1) + ' UVT';

    const balElem = modalBox.querySelector('#res-balance-val');
    balElem.textContent = currentCalculatedResult.formattedBalance;
    balElem.style.color = currentCalculatedResult.balanceType === 'afavor' ? '#10b981' : (currentCalculatedResult.balanceType === 'apagar' ? '#f43f5e' : '#ffffff');
  };

  ['change', 'input'].forEach(evt => {
    modalBox.querySelectorAll('input').forEach(inp => inp.addEventListener(evt, runCalculation));
  });

  runCalculation();

  modalBox.querySelector('#btn-print-210').addEventListener('click', () => {
    printTaxDeclarationSummary(client, currentCalculatedResult);
  });

  const form = modalBox.querySelector('#form-210-calc');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentCalculatedResult) runCalculation();

    updateClientFinancials(clientId, {
      totalIncome: currentCalculatedResult.formattedIngresos,
      taxCalculated: currentCalculatedResult.formattedImpuesto,
      withholdings: currentCalculatedResult.formattedRetenciones,
      netBalance: currentCalculatedResult.formattedBalance,
      balanceType: currentCalculatedResult.balanceType
    });

    close();
    if (window.showToast) window.showToast('Liquidación del Formulario 210 guardada correctamente.', 'success');
    if (onSuccess) onSuccess();
  });
}

// Modal: Create New Client
function showCreateClientModal(onSuccess) {
  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">➕ Registrar Nuevo Contribuyente</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    <form id="form-create-client">
      <div class="form-group">
        <label class="form-label">Nombre Completo del Contribuyente</label>
        <input type="text" id="new-client-name" class="form-input" placeholder="ej. Andrés Felipe Gómez" required />
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">NIT o Cédula</label>
          <input type="text" id="new-client-nit" class="form-input" placeholder="ej. 1.032.456.789" required />
        </div>
        <div class="form-group">
          <label class="form-label">Año Gravable</label>
          <input type="text" id="new-client-year" class="form-input" value="2025" required />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Correo Electrónico (Para Login)</label>
          <input type="email" id="new-client-email" class="form-input" placeholder="correo@ejemplo.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña Temporal</label>
          <input type="password" id="new-client-password" class="form-input" placeholder="Escribe la contraseña..." autocomplete="new-password" value="" required />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Teléfono de Contacto</label>
          <input type="text" id="new-client-phone" class="form-input" placeholder="+57 300 000 0000" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha Límite DIAN</label>
          <input type="text" id="new-client-due" class="form-input" placeholder="ej. 28 de Agosto, 2026" />
        </div>
      </div>

      <div class="flex justify-between items-center" style="margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-create">Cancelar</button>
        <button type="submit" class="btn btn-emerald text-sm">Crear Contribuyente</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-create').addEventListener('click', close);

  const form = modalBox.querySelector('#form-create-client');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = modalBox.querySelector('#new-client-name').value.trim();
    const nit = modalBox.querySelector('#new-client-nit').value.trim();
    const year = modalBox.querySelector('#new-client-year').value.trim();
    const email = modalBox.querySelector('#new-client-email').value.trim();
    const password = modalBox.querySelector('#new-client-password').value.trim();
    const phone = modalBox.querySelector('#new-client-phone').value.trim();
    const dueDate = modalBox.querySelector('#new-client-due').value.trim() || 'Por definir';

    createNewClient({
      name, nit, year, email, password, phone, dueDate
    });

    close();
    if (window.showToast) window.showToast(`Cliente ${name} creado con éxito.`, 'success');
    if (onSuccess) onSuccess();
  });
}

// Modal: Change Stage
function showChangeStageModal(clientId, onSuccess) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (!client) return;

  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">⚙️ Actualizar Etapa de ${client.name}</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    <form id="form-change-stage">
      <p class="text-sm" style="color: var(--text-muted); margin-bottom: 1.25rem;">
        Selecciona el nuevo avance en la línea de tiempo del trámite ante la DIAN para este contribuyente.
      </p>

      <div class="form-group">
        <label class="form-label">Etapa del Trámite</label>
        <select id="stage-select-input" class="form-select">
          ${TAX_STAGES.map(s => `
            <option value="${s.id}" ${client.currentStage === s.id ? 'selected' : ''}>
              Etapa ${s.id}: ${s.name} — ${s.desc}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Nota o Instrucción para el Cliente (Opcional)</label>
        <textarea id="stage-note-input" class="form-textarea" rows="3" placeholder="ej. Se ha subido el borrador final, por favor ingresar y revisar antes de la firma digital.">${client.notes || ''}</textarea>
      </div>

      <div class="flex justify-between items-center" style="margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-stage">Cancelar</button>
        <button type="submit" class="btn btn-primary text-sm">Actualizar Estado</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-stage').addEventListener('click', close);

  const form = modalBox.querySelector('#form-change-stage');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newStage = modalBox.querySelector('#stage-select-input').value;
    const newNote = modalBox.querySelector('#stage-note-input').value.trim();

    updateClientStage(clientId, newStage);

    // Update note if changed
    const freshStore = getStore();
    const freshClient = freshStore.users.find(u => u.id === clientId);
    if (freshClient) {
      freshClient.notes = newNote;
      saveStore(freshStore);
    }

    close();
    if (window.showToast) window.showToast('Etapa del trámite actualizada correctamente.', 'success');
    if (onSuccess) onSuccess();
  });
}

// Modal: Edit Client Values & Profile
function showEditClientModal(clientId, onSuccess) {
  const store = getStore();
  const client = store.users.find(u => u.id === clientId);
  if (!client) return;

  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">✏️ Modificar Contribuyente: ${client.name}</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    <form id="form-edit-client">
      <div class="form-group">
        <label class="form-label">Nombre Completo</label>
        <input type="text" id="edit-name" class="form-input" value="${client.name || ''}" required />
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Correo Electrónico (Login)</label>
          <input type="email" id="edit-email" class="form-input" value="${client.email || ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña (Obligatorio escribir para actualizar)</label>
          <input type="password" id="edit-pass" class="form-input" placeholder="Escribe la contraseña..." value="" autocomplete="new-password" required />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">NIT / Cédula</label>
          <input type="text" id="edit-nit" class="form-input" value="${client.nit || ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Estado del Acceso</label>
          <select id="edit-status" class="form-select">
            <option value="active" ${client.status !== 'suspended' ? 'selected' : ''}>● Activo (Acceso Permitido)</option>
            <option value="suspended" ${client.status === 'suspended' ? 'selected' : ''}>🚫 Suspendido (Acceso Bloqueado)</option>
          </select>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;" />

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Total Ingresos Brutos</label>
          <input type="text" id="edit-income" class="form-input" value="${client.financials ? client.financials.totalIncome || '' : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Retenciones Totales</label>
          <input type="text" id="edit-withholdings" class="form-input" value="${client.financials ? client.financials.withholdings || '' : ''}" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Resultado / Saldo Neto ($)</label>
          <input type="text" id="edit-balance" class="form-input" value="${client.financials ? client.financials.netBalance || '' : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de Saldo</label>
          <select id="edit-balance-type" class="form-select">
            <option value="afavor" ${client.financials && (client.financials.balanceType === 'favor' || client.financials.balanceType === 'afavor') ? 'selected' : ''}>Saldo a Favor</option>
            <option value="apagar" ${client.financials && (client.financials.balanceType === 'pagar' || client.financials.balanceType === 'apagar') ? 'selected' : ''}>Impuesto a Pagar</option>
            <option value="neutral" ${client.financials && client.financials.balanceType === 'neutral' ? 'selected' : ''}>Pendiente / Cero</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Fecha Límite DIAN</label>
        <input type="text" id="edit-duedate" class="form-input" value="${client.financials ? client.financials.dueDate || '' : ''}" />
      </div>

      <div class="flex justify-between items-center" style="margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-edit">Cancelar</button>
        <button type="submit" class="btn btn-primary text-sm">Guardar Todos los Cambios</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-edit').addEventListener('click', close);

  const form = modalBox.querySelector('#form-edit-client');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    client.name = modalBox.querySelector('#edit-name').value.trim();
    client.email = modalBox.querySelector('#edit-email').value.trim();
    client.password = modalBox.querySelector('#edit-pass').value.trim();
    client.nit = modalBox.querySelector('#edit-nit').value.trim();
    client.status = modalBox.querySelector('#edit-status').value;

    if (!client.financials) client.financials = {};
    client.financials.totalIncome = modalBox.querySelector('#edit-income').value.trim();
    client.financials.withholdings = modalBox.querySelector('#edit-withholdings').value.trim();
    client.financials.netBalance = modalBox.querySelector('#edit-balance').value.trim();
    client.financials.balanceType = modalBox.querySelector('#edit-balance-type').value;
    client.financials.dueDate = modalBox.querySelector('#edit-duedate').value.trim();

    saveStore(store);
    close();
    if (window.showToast) window.showToast('Datos del contribuyente modificados con éxito.', 'success');
    if (onSuccess) onSuccess();
  });
}

// Modal: Admin Account Settings
function showAdminSettingsModal(adminUser, onSuccess) {
  const store = getStore();
  const freshAdmin = store.users.find(u => u.id === adminUser.id) || adminUser;

  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">⚙️ Mi Configuración (${freshAdmin.name})</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    <form id="form-admin-settings">
      <div class="form-group">
        <label class="form-label">Nombre del Contador / Firma</label>
        <input type="text" id="admin-name-input" class="form-input" value="${freshAdmin.name || ''}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Correo Electrónico (Para Iniciar Sesión)</label>
        <input type="email" id="admin-email-input" class="form-input" value="${freshAdmin.email || ''}" required />
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Nueva Contraseña</label>
          <input type="password" id="admin-pass-input" class="form-input" value="${freshAdmin.password || ''}" placeholder="Ingresa nueva contraseña" required />
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono de Contacto</label>
          <input type="text" id="admin-phone-input" class="form-input" value="${freshAdmin.phone || ''}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Registro / Tarjeta Profesional</label>
        <input type="text" id="admin-specialty-input" class="form-input" value="${freshAdmin.specialty || ''}" placeholder="ej. Contador Público - Registro TP 184592-T" />
      </div>

      <div class="flex justify-between items-center" style="margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-settings">Cancelar</button>
        <button type="submit" class="btn btn-primary text-sm">Guardar Mis Datos</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-settings').addEventListener('click', close);

  const form = modalBox.querySelector('#form-admin-settings');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const updatedName = modalBox.querySelector('#admin-name-input').value.trim();
    const updatedEmail = modalBox.querySelector('#admin-email-input').value.trim();
    const updatedPass = modalBox.querySelector('#admin-pass-input').value.trim();
    const updatedPhone = modalBox.querySelector('#admin-phone-input').value.trim();
    const updatedSpecialty = modalBox.querySelector('#admin-specialty-input').value.trim();

    updateUserProfile(freshAdmin.id, {
      name: updatedName,
      email: updatedEmail,
      password: updatedPass,
      phone: updatedPhone,
      specialty: updatedSpecialty
    });

    close();
    if (window.showToast) window.showToast('Tus datos de configuración fueron actualizados correctamente.', 'success');
    if (onSuccess) onSuccess();
  });
}

// Modal: Manage & Add Admins
function showManageAdminsModal(onSuccess) {
  const store = getStore();
  const admins = store.users.filter(u => u.role === 'admin');

  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">👥 Equipo de Administradores (${admins.length})</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    <div>
      <p class="text-sm" style="color: var(--text-muted); margin-bottom: 1.25rem;">
        Listado de contadores y administradores con acceso completo a la gestión de clientes.
      </p>

      <div class="flex-col gap-2" style="max-height: 200px; overflow-y: auto; margin-bottom: 1.5rem;">
        ${admins.map(a => `
          <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: var(--radius-md);" class="flex justify-between items-center">
            <div>
              <div style="font-weight: 700; font-size: 0.92rem;">${a.name}</div>
              <div class="text-xs" style="color: var(--text-muted);">${a.email} | ${a.specialty || 'Contador Público'}</div>
            </div>
            <span class="badge badge-emerald">Administrador</span>
          </div>
        `).join('')}
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem;">➕ Registrar Nuevo Contador / Administrador</h4>
        <form id="form-create-admin">
          <div class="form-group">
            <label class="form-label">Nombre del Nuevo Administrador</label>
            <input type="text" id="new-admin-name" class="form-input" placeholder="ej. Dra. Laura Restrepo, CPA" required />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Correo Electrónico (Login)</label>
              <input type="email" id="new-admin-email" class="form-input" placeholder="correo@ejemplo.com" required />
            </div>
            <div class="form-group">
              <label class="form-label">Contraseña</label>
              <input type="password" id="new-admin-pass" class="form-input" placeholder="Escribe la contraseña..." autocomplete="new-password" value="" required />
            </div>
          </div>

          <div class="flex justify-between items-center" style="margin-top: 1.25rem;">
            <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-admin">Cerrar</button>
            <button type="submit" class="btn btn-emerald text-sm">Crear Administrador</button>
          </div>
        </form>
      </div>
    </div>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-admin').addEventListener('click', close);

  const form = modalBox.querySelector('#form-create-admin');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = modalBox.querySelector('#new-admin-name').value;
    const email = modalBox.querySelector('#new-admin-email').value;
    const password = modalBox.querySelector('#new-admin-pass').value;

    createNewAdmin({ name, email, password });
    close();
    if (window.showToast) window.showToast(`Nuevo administrador ${name} creado exitosamente.`, 'success');
    if (onSuccess) onSuccess();
  });
}
