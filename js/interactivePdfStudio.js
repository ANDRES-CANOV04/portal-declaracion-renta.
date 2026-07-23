/**
 * Studio de PDF Interactivo & Creador de Documentos Tributarios
 * Permite la visualización, edición en vivo, firma digital en canvas, sellos y exportación a PDF.
 */

import { getStore } from './store.js';

export function renderInteractivePdfStudio(container) {
  const store = getStore();
  const clients = store.clients || [];
  
  container.innerHTML = `
    <div class="interactive-pdf-studio">
      <!-- Studio Header & Action Bar -->
      <div class="card mb-6" style="padding: 1.25rem 1.75rem;">
        <div class="flex justify-between items-center flex-wrap gap-4">
          <div class="flex items-center gap-3">
            <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
              📄
            </div>
            <div>
              <h2 style="font-size: 1.35rem; font-weight: 800; line-height: 1.2;">Studio de PDF Interactivo</h2>
              <p class="text-xs" style="color: var(--text-muted);">Edita campos en vivo, dibuja firma digital, calcula totales automáticamente e imprime tu PDF oficial.</p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button id="pdf-btn-load-demo" class="btn btn-secondary text-xs">
              ⚡ Cargar Ejemplo
            </button>
            <button id="pdf-btn-clear" class="btn btn-secondary text-xs">
              🗑️ Limpiar
            </button>
            <button id="pdf-btn-export-json" class="btn btn-secondary text-xs">
              💾 Exportar JSON
            </button>
            <button id="pdf-btn-print" class="btn btn-emerald text-xs font-bold">
              🖨️ Imprimir / Descargar PDF
            </button>
          </div>
        </div>
      </div>

      <!-- Main Interactive Studio Grid Layout -->
      <div class="studio-grid-layout">
        <!-- Sidebar Controls & Form Fillers -->
        <div class="studio-sidebar-controls card">
          <div class="card-header" style="margin-bottom: 1rem;">
            <div class="card-title text-sm">
              <span>⚙️ Configuración del Documento</span>
            </div>
          </div>

          <!-- Template Selector -->
          <div class="form-group">
            <label class="form-label">Plantilla de Documento PDF</label>
            <select id="studio-template-select" class="form-select text-sm">
              <option value="formulario210">📜 Formulario 210 - Declaración de Renta Persona Natural</option>
              <option value="formulario220">📄 Formulario 220 - Certificado de Ingresos y Retenciones</option>
              <option value="pazysalvo">🛡️ Certificado de Paz y Salvo Tributario</option>
            </select>
          </div>

          <!-- Pre-fill client data if available -->
          ${clients.length > 0 ? `
          <div class="form-group">
            <label class="form-label">Importar Datos de Cliente Registrado</label>
            <select id="studio-client-import-select" class="form-select text-sm">
              <option value="">-- Seleccionar Contribuyente --</option>
              ${clients.map(c => `<option value="${c.id}">${c.name} (${c.nit || 'Sin NIT'})</option>`).join('')}
            </select>
          </div>
          ` : ''}

          <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1.25rem 0;" />

          <!-- Dynamic Form Sections -->
          <div id="studio-form-fields-container">
            <!-- Rendered dynamically by JS depending on template -->
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1.25rem 0;" />

          <!-- Signature Pad Section -->
          <div class="form-group">
            <div class="flex justify-between items-center mb-1">
              <label class="form-label mb-0">🖊️ Firma Digital Táctil / Ratón</label>
              <button id="pdf-signature-clear" class="btn-icon" style="width: 28px; height: 28px; font-size: 0.75rem;" title="Borrar Firma">✕</button>
            </div>
            <div style="background: #ffffff; border: 2px dashed #cbd5e1; border-radius: var(--radius-md); overflow: hidden; position: relative;">
              <canvas id="pdf-signature-canvas" width="320" height="110" style="width: 100%; height: 110px; cursor: crosshair; touch-action: none;"></canvas>
              <div id="signature-placeholder-hint" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #94a3b8; font-size: 0.75rem; pointer-events: none;">
                Dibuja tu firma aquí con el dedo o ratón
              </div>
            </div>
          </div>

          <!-- Stamp & Watermark Controls -->
          <div class="form-group">
            <label class="form-label">Sello de Verificación</label>
            <select id="studio-stamp-select" class="form-select text-sm">
              <option value="BORRADOR">⚠️ Sello: BORRADOR NO OFICIAL</option>
              <option value="APROBADO" selected>✅ Sello: APROBADO Y VERIFICADO</option>
              <option value="PAZ Y SALVO">🛡️ Sello: PAZ Y SALVO AL DÍA</option>
              <option value="NINGUNO">Sin Sello</option>
            </select>
          </div>
        </div>

        <!-- Right PDF Preview Live Canvas -->
        <div class="studio-pdf-preview-container card" style="padding: 1.5rem; background: #0f172a;">
          <div class="pdf-toolbar flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                LIVE PREVIEW
              </span>
              <span class="text-xs" style="color: var(--text-muted);">Vista de Hoja de Papel A4 Vectorial</span>
            </div>

            <div class="flex items-center gap-2">
              <button id="btn-zoom-out" class="btn-icon" style="width: 32px; height: 32px;" title="Reducir Zoom">🔍-</button>
              <span id="zoom-level-text" class="text-xs font-bold" style="min-width: 45px; text-align: center;">100%</span>
              <button id="btn-zoom-in" class="btn-icon" style="width: 32px; height: 32px;" title="Aumentar Zoom">🔍+</button>
            </div>
          </div>

          <!-- PDF Sheet Preview Paper Box -->
          <div class="pdf-paper-viewport" style="overflow: auto; max-height: 800px; border-radius: var(--radius-md); padding: 1rem; background: #1e293b;">
            <div id="interactive-pdf-paper" class="interactive-pdf-sheet">
              <!-- Live Sheet rendered here -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize State & Event Listeners
  setupStudioLogic(container);
}

function setupStudioLogic(container) {
  let currentZoom = 1.0;
  let signatureDataUrl = null;
  let isDrawing = false;

  const pdfPaper = container.querySelector('#interactive-pdf-paper');
  const templateSelect = container.querySelector('#studio-template-select');
  const stampSelect = container.querySelector('#studio-stamp-select');
  const clientImportSelect = container.querySelector('#studio-client-import-select');
  const fieldsContainer = container.querySelector('#studio-form-fields-container');
  const canvas = container.querySelector('#pdf-signature-canvas');
  const ctx = canvas.getContext('2d');
  const sigPlaceholder = container.querySelector('#signature-placeholder-hint');

  // Interactive Form Data Models
  const studioData = {
    formulario210: {
      name: 'María Camila Rodríguez',
      nit: '1.020.304.050',
      year: '2025',
      email: 'maria.rodriguez@ejemplo.com',
      ingresosTrabajo: 95000000,
      ingresosCapital: 12000000,
      ingresosNoLaboral: 5000000,
      inor: 11200000, // Ingresos No Constitutivos de Renta (Salud/Pensión)
      deduccionInteresesVivienda: 8500000,
      deduccionDependientes: 4800000,
      retenciones: 7200000,
      observaciones: 'Borrador preliminar de declaración de renta cedula general 2025.'
    },
    formulario220: {
      employerName: 'SERVICIOS TRIBUTARIOS & TECNOLÓGICOS S.A.S.',
      employerNit: '901.458.963-1',
      employeeName: 'María Camila Rodríguez',
      employeeNit: '1.020.304.050',
      year: '2025',
      totalSalario: 84000000,
      totalPrestaciones: 14000000,
      totalAportesSalud: 3360000,
      totalAportesPension: 3360000,
      retencionPracticada: 5200000,
      city: 'Bogotá D.C.'
    },
    pazysalvo: {
      name: 'María Camila Rodríguez',
      nit: '1.020.304.050',
      concept: 'Declaración de Renta y Complementarios Año Gravable 2025',
      accountantName: 'Dr. Alejandro Morales',
      accountantCard: 'TP-198420-T',
      issueDate: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
      statusText: 'CUMPLIMIENTO TOTAL AL DÍA CON LA DIAN'
    }
  };

  // Render Form Fields according to template
  function updateFormFieldsUI() {
    const templateKey = templateSelect.value;
    const data = studioData[templateKey];

    if (templateKey === 'formulario210') {
      fieldsContainer.innerHTML = `
        <div class="form-group">
          <label class="form-label">Nombre del Contribuyente</label>
          <input type="text" id="field-name" class="form-input text-sm" value="${data.name}">
        </div>
        <div class="grid-2 mb-2">
          <div>
            <label class="form-label">NIT / Cédula</label>
            <input type="text" id="field-nit" class="form-input text-sm" value="${data.nit}">
          </div>
          <div>
            <label class="form-label">Año Gravable</label>
            <input type="text" id="field-year" class="form-input text-sm" value="${data.year}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Ingresos Brutos de Trabajo (COP)</label>
          <input type="number" id="field-ingresosTrabajo" class="form-input text-sm" value="${data.ingresosTrabajo}">
        </div>
        <div class="grid-2 mb-2">
          <div>
            <label class="form-label">Ingresos Capital (COP)</label>
            <input type="number" id="field-ingresosCapital" class="form-input text-sm" value="${data.ingresosCapital}">
          </div>
          <div>
            <label class="form-label">Ingresos No Laborales</label>
            <input type="number" id="field-ingresosNoLaboral" class="form-input text-sm" value="${data.ingresosNoLaboral}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Aportes Obligatorios Salud / Pensión (INOR)</label>
          <input type="number" id="field-inor" class="form-input text-sm" value="${data.inor}">
        </div>
        <div class="grid-2 mb-2">
          <div>
            <label class="form-label">Ded. Intereses Vivienda</label>
            <input type="number" id="field-dedVivienda" class="form-input text-sm" value="${data.deduccionInteresesVivienda}">
          </div>
          <div>
            <label class="form-label">Ded. Dependientes</label>
            <input type="number" id="field-dedDependientes" class="form-input text-sm" value="${data.deduccionDependientes}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Retenciones en la Fuente Practicadas (COP)</label>
          <input type="number" id="field-retenciones" class="form-input text-sm" value="${data.retenciones}">
        </div>
      `;
    } else if (templateKey === 'formulario220') {
      fieldsContainer.innerHTML = `
        <div class="form-group">
          <label class="form-label">Razón Social Empleador</label>
          <input type="text" id="field-employerName" class="form-input text-sm" value="${data.employerName}">
        </div>
        <div class="form-group">
          <label class="form-label">NIT Empleador</label>
          <input type="text" id="field-employerNit" class="form-input text-sm" value="${data.employerNit}">
        </div>
        <div class="form-group">
          <label class="form-label">Nombre Empleado</label>
          <input type="text" id="field-employeeName" class="form-input text-sm" value="${data.employeeName}">
        </div>
        <div class="grid-2 mb-2">
          <div>
            <label class="form-label">Cédula Empleado</label>
            <input type="text" id="field-employeeNit" class="form-input text-sm" value="${data.employeeNit}">
          </div>
          <div>
            <label class="form-label">Año Gravable</label>
            <input type="text" id="field-year" class="form-input text-sm" value="${data.year}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Total Pagos por Salarios (COP)</label>
          <input type="number" id="field-totalSalario" class="form-input text-sm" value="${data.totalSalario}">
        </div>
        <div class="grid-2 mb-2">
          <div>
            <label class="form-label">Aportes Salud</label>
            <input type="number" id="field-aportesSalud" class="form-input text-sm" value="${data.totalAportesSalud}">
          </div>
          <div>
            <label class="form-label">Aportes Pensión</label>
            <input type="number" id="field-aportesPension" class="form-input text-sm" value="${data.totalAportesPension}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Retención Practicada en el Año</label>
          <input type="number" id="field-retencionPracticada" class="form-input text-sm" value="${data.retencionPracticada}">
        </div>
      `;
    } else {
      // Paz y Salvo
      fieldsContainer.innerHTML = `
        <div class="form-group">
          <label class="form-label">Nombre del Contribuyente</label>
          <input type="text" id="field-name" class="form-input text-sm" value="${data.name}">
        </div>
        <div class="form-group">
          <label class="form-label">NIT o Cédula</label>
          <input type="text" id="field-nit" class="form-input text-sm" value="${data.nit}">
        </div>
        <div class="form-group">
          <label class="form-label">Concepto de Certificación</label>
          <input type="text" id="field-concept" class="form-input text-sm" value="${data.concept}">
        </div>
        <div class="grid-2 mb-2">
          <div>
            <label class="form-label">Contador Público</label>
            <input type="text" id="field-accountantName" class="form-input text-sm" value="${data.accountantName}">
          </div>
          <div>
            <label class="form-label">Tarjeta Profesional</label>
            <input type="text" id="field-accountantCard" class="form-input text-sm" value="${data.accountantCard}">
          </div>
        </div>
      `;
    }

    // Attach real-time input change listeners
    fieldsContainer.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        syncInputToModel();
        renderPdfSheet();
      });
    });
  }

  function syncInputToModel() {
    const templateKey = templateSelect.value;
    const data = studioData[templateKey];

    fieldsContainer.querySelectorAll('input').forEach(input => {
      const fieldId = input.id.replace('field-', '');
      if (input.type === 'number') {
        data[fieldId] = parseFloat(input.value) || 0;
      } else {
        data[fieldId] = input.value;
      }
    });
  }

  // Render PDF Paper Sheet
  function renderPdfSheet() {
    const templateKey = templateSelect.value;
    const stampVal = stampSelect.value;
    const data = studioData[templateKey];

    let stampHtml = '';
    if (stampVal === 'BORRADOR') {
      stampHtml = `<div class="pdf-stamp-watermark stamp-borrador">⚠️ BORRADOR DIAN</div>`;
    } else if (stampVal === 'APROBADO') {
      stampHtml = `<div class="pdf-stamp-watermark stamp-aprobado">✅ DIAN APROBADO 2026</div>`;
    } else if (stampVal === 'PAZ Y SALVO') {
      stampHtml = `<div class="pdf-stamp-watermark stamp-paz">🛡️ PAZ Y SALVO DIGITAL</div>`;
    }

    let signatureHtml = signatureDataUrl ? `<img src="${signatureDataUrl}" style="max-height: 50px; display: block; margin: 0 auto;" />` : `<div style="color: #94a3b8; font-size: 0.75rem; font-style: italic;">[Firma Digital Pendiente]</div>`;

    let contentHtml = '';

    if (templateKey === 'formulario210') {
      // Form 210 Tax Calculations
      const totalIngresos = (data.ingresosTrabajo || 0) + (data.ingresosCapital || 0) + (data.ingresosNoLaboral || 0);
      const inor = data.inor || 0;
      const deducciones = (data.deduccionInteresesVivienda || 0) + (data.deduccionDependientes || 0);
      const subtotalNeto = Math.max(0, totalIngresos - inor);
      const exencion25 = Math.min(subtotalNeto * 0.25, 36000000);
      const rentaLiquida = Math.max(0, subtotalNeto - deducciones - exencion25);

      // Tax calculation simulation (19% threshold approx)
      const impuestoDeterminado = Math.round(rentaLiquida * 0.15);
      const retenciones = data.retenciones || 0;
      const saldoFinal = impuestoDeterminado - retenciones;

      const isFavor = saldoFinal < 0;

      contentHtml = `
        <div class="pdf-sheet-header">
          <div class="pdf-col-logo">
            <div style="font-size: 2.2rem;">🏛️</div>
            <div>
              <div style="font-weight: 800; font-size: 1.1rem; color: #0f172a;">REPUBLICA DE COLOMBIA</div>
              <div style="font-weight: 700; font-size: 0.85rem; color: #475569;">DIAN - UNIDAD ADMINISTRATIVA ESPECIAL</div>
            </div>
          </div>
          <div class="pdf-col-title">
            <div style="font-size: 1.25rem; font-weight: 900; color: #0f172a;">FORMULARIO 210</div>
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">Declaración de Renta y Complementarios Personas Naturales</div>
            <div style="background: #0f172a; color: #fff; padding: 0.2rem 0.75rem; border-radius: 4px; font-weight: 800; font-size: 0.85rem; display: inline-block; margin-top: 0.3rem;">
              Año Gravable ${data.year}
            </div>
          </div>
        </div>

        ${stampHtml}

        <!-- Contribuyente Info Box -->
        <div class="pdf-section-box">
          <div class="pdf-section-title">1. DATOS DEL CONTRIBUYENTE</div>
          <div class="pdf-grid-2">
            <div><strong style="color: #64748b; font-size: 0.75rem;">NOMBRES Y APELLIDOS:</strong> <br><span style="font-size: 0.95rem; font-weight: 700;">${data.name}</span></div>
            <div><strong style="color: #64748b; font-size: 0.75rem;">NIT / CÉDULA DE CIUDADANÍA:</strong> <br><span style="font-size: 0.95rem; font-weight: 700;">${data.nit}</span></div>
          </div>
        </div>

        <!-- Table Liquidation Cedula General -->
        <div class="pdf-section-box">
          <div class="pdf-section-title">2. LIQUIDACIÓN PRIVADA CÉDULA GENERAL</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>Concepto Renta Líquida (Art. 330 E.T.)</th>
                <th style="text-align: right;">Renglón</th>
                <th style="text-align: right;">Valor (COP)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ingresos Brutos de Trabajo, Capital y No Laborales</td>
                <td style="text-align: right; font-weight: 700; color: #64748b;">32</td>
                <td class="num">$ ${totalIngresos.toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td>(-) Ingresos No Constitutivos de Renta (Salud / Pensión Obligatoria)</td>
                <td style="text-align: right; font-weight: 700; color: #64748b;">33</td>
                <td class="num">$ ${inor.toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td>(-) Deducciones Imputables (Intereses Vivienda + Dependientes)</td>
                <td style="text-align: right; font-weight: 700; color: #64748b;">36</td>
                <td class="num">$ ${deducciones.toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td>(-) Renta Exenta Laboral 25% (Art. 206 Num. 10 E.T.)</td>
                <td style="text-align: right; font-weight: 700; color: #64748b;">39</td>
                <td class="num">$ ${Math.round(exencion25).toLocaleString('es-CO')}</td>
              </tr>
              <tr style="background: #f1f5f9; font-weight: 800;">
                <td>= RENTA LÍQUIDA GRAVABLE CÉDULA GENERAL</td>
                <td style="text-align: right;">95</td>
                <td class="num" style="color: #0f172a;">$ ${Math.round(rentaLiquida).toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td>Impuesto Determinado sobre la Renta Líquida</td>
                <td style="text-align: right; font-weight: 700; color: #64748b;">115</td>
                <td class="num" style="font-weight: 700;">$ ${impuestoDeterminado.toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td>(-) Total Retenciones en la Fuente Practicadas en el Año</td>
                <td style="text-align: right; font-weight: 700; color: #64748b;">130</td>
                <td class="num" style="color: #059669;">- $ ${retenciones.toLocaleString('es-CO')}</td>
              </tr>
              <tr style="background: ${isFavor ? '#ecfdf5' : '#fef2f2'}; font-weight: 900; font-size: 1.05rem;">
                <td style="color: ${isFavor ? '#065f46' : '#991b1b'};">
                  ${isFavor ? '🎉 SALDO A FAVOR DEL CONTRIBUYENTE' : '⚠️ SALDO A PAGAR A LA DIAN'}
                </td>
                <td style="text-align: right; color: ${isFavor ? '#065f46' : '#991b1b'};">136</td>
                <td class="num" style="color: ${isFavor ? '#059669' : '#dc2626'};">
                  $ ${Math.abs(saldoFinal).toLocaleString('es-CO')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer Signatures & QR -->
        <div class="pdf-footer-box">
          <div class="pdf-sig-col">
            <div class="pdf-sig-line">
              ${signatureHtml}
            </div>
            <div style="font-size: 0.75rem; font-weight: 700; margin-top: 0.3rem;">Firma del Contribuyente</div>
            <div style="font-size: 0.7rem; color: #64748b;">C.C. ${data.nit}</div>
          </div>

          <div class="pdf-qr-col">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=DIAN-FORM210-${encodeURIComponent(data.nit)}-${data.year}" style="width: 80px; height: 80px; border: 1px solid #cbd5e1; padding: 4px; border-radius: 4px;" alt="QR Code DIAN" />
            <div style="font-size: 0.65rem; color: #64748b; margin-top: 0.25rem;">Firma Digital Verificada<br>Hash: DIAN-2026-F210-OK</div>
          </div>
        </div>
      `;
    } else if (templateKey === 'formulario220') {
      contentHtml = `
        <div class="pdf-sheet-header">
          <div class="pdf-col-logo">
            <div style="font-size: 2.2rem;">🏢</div>
            <div>
              <div style="font-weight: 800; font-size: 1.1rem; color: #0f172a;">FORMULARIO 220</div>
              <div style="font-weight: 700; font-size: 0.85rem; color: #475569;">CERTIFICADO DE INGRESOS Y RETENCIONES</div>
            </div>
          </div>
          <div class="pdf-col-title">
            <div style="font-size: 0.85rem; color: #64748b;">Año Gravable</div>
            <div style="font-size: 1.5rem; font-weight: 900; color: #0f172a;">${data.year}</div>
          </div>
        </div>

        ${stampHtml}

        <div class="pdf-section-box">
          <div class="pdf-section-title">DATOS DEL AGENTE RETENEDOR (EMPLEADOR)</div>
          <div class="pdf-grid-2">
            <div><strong style="color: #64748b; font-size: 0.75rem;">RAZÓN SOCIAL:</strong> <br><span>${data.employerName}</span></div>
            <div><strong style="color: #64748b; font-size: 0.75rem;">NIT:</strong> <br><span>${data.employerNit}</span></div>
          </div>
        </div>

        <div class="pdf-section-box">
          <div class="pdf-section-title">DATOS DEL TRABAJADOR / EMPLEADO</div>
          <div class="pdf-grid-2">
            <div><strong style="color: #64748b; font-size: 0.75rem;">NOMBRES Y APELLIDOS:</strong> <br><span>${data.employeeName}</span></div>
            <div><strong style="color: #64748b; font-size: 0.75rem;">CÉDULA:</strong> <br><span>${data.employeeNit}</span></div>
          </div>
        </div>

        <div class="pdf-section-box">
          <div class="pdf-section-title">CONCEPTO DE LOS PAGOS Y RETENCIONES</div>
          <table class="pdf-table">
            <thead>
              <tr><th>Concepto del Pago</th><th style="text-align: right;">Valor Acumulado (COP)</th></tr>
            </thead>
            <tbody>
              <tr><td>Pagos por Salarios y Emolumentos Eclesiásticos</td><td class="num">$ ${(data.totalSalario || 0).toLocaleString('es-CO')}</td></tr>
              <tr><td>Aportes Obligatorios por Salud</td><td class="num">$ ${(data.totalAportesSalud || 0).toLocaleString('es-CO')}</td></tr>
              <tr><td>Aportes Obligatorios por Pensión</td><td class="num">$ ${(data.totalAportesPension || 0).toLocaleString('es-CO')}</td></tr>
              <tr style="background: #f1f5f9; font-weight: 800;"><td>RETENCIÓN EN LA FUENTE PRACTICADA EN EL AÑO</td><td class="num" style="color: #059669;">$ ${(data.retencionPracticada || 0).toLocaleString('es-CO')}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="pdf-footer-box">
          <div class="pdf-sig-col">
            <div class="pdf-sig-line">${signatureHtml}</div>
            <div style="font-size: 0.75rem; font-weight: 700; margin-top: 0.3rem;">Firma del Pagador / Representante Legal</div>
          </div>
          <div class="pdf-qr-col">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=DIAN-FORM220-${encodeURIComponent(data.employeeNit)}" style="width: 70px; height: 70px; border: 1px solid #cbd5e1; padding: 3px;" alt="QR Code" />
          </div>
        </div>
      `;
    } else {
      // Paz y Salvo
      contentHtml = `
        <div class="pdf-sheet-header">
          <div class="pdf-col-logo">
            <div style="font-size: 2.2rem;">🛡️</div>
            <div>
              <div style="font-weight: 900; font-size: 1.2rem; color: #0f172a;">CERTIFICADO DE PAZ Y SALVO TRIBUTARIO</div>
              <div style="font-weight: 600; font-size: 0.85rem; color: #059669;">ESTADO AL DÍA DE OBLIGACIONES</div>
            </div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748b;">Fecha de Expedición</div>
            <div style="font-weight: 800; font-size: 0.9rem;">${data.issueDate}</div>
          </div>
        </div>

        ${stampHtml}

        <div style="margin: 2.5rem 0; font-size: 0.95rem; line-height: 1.8; color: #334155;">
          El suscrito Contador Público Titulado certifica que el contribuyente <strong>${data.name}</strong>, identificado con C.C. / NIT <strong>${data.nit}</strong>, ha presentado satisfactoriamente su <strong>${data.concept}</strong> y se encuentra a la fecha en <strong>PAZ Y SALVO Y CUMPLIMIENTO TOTAL</strong> con las obligaciones tributarias gestionadas.
        </div>

        <div class="pdf-section-box" style="background: #ecfdf5; border-color: #a7f3d0; padding: 1.25rem;">
          <div style="font-weight: 800; color: #065f46; font-size: 1.1rem; text-align: center;">
            STATUS: ${data.statusText}
          </div>
        </div>

        <div class="pdf-footer-box" style="margin-top: 4rem;">
          <div class="pdf-sig-col">
            <div class="pdf-sig-line">${signatureHtml}</div>
            <div style="font-size: 0.85rem; font-weight: 800; margin-top: 0.4rem;">${data.accountantName}</div>
            <div style="font-size: 0.75rem; color: #64748b;">Contador Público TP-198420-T</div>
          </div>
          <div class="pdf-qr-col">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=CERTIFICADO-PAZYSALVO-${encodeURIComponent(data.nit)}" style="width: 80px; height: 80px; border: 1px solid #cbd5e1; padding: 4px;" alt="QR Code" />
          </div>
        </div>
      `;
    }

    pdfPaper.innerHTML = contentHtml;
    pdfPaper.style.transform = `scale(${currentZoom})`;
    pdfPaper.style.transformOrigin = `top center`;
  }

  // Signature Canvas Drawing Handlers
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDrawing(e) {
    isDrawing = true;
    if (sigPlaceholder) sigPlaceholder.style.display = 'none';
    const coords = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    signatureDataUrl = canvas.toDataURL('image/png');
    renderPdfSheet();
  }

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing);
  canvas.addEventListener('touchmove', draw);
  canvas.addEventListener('touchend', stopDrawing);

  container.querySelector('#pdf-signature-clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sigPlaceholder) sigPlaceholder.style.display = 'block';
    signatureDataUrl = null;
    renderPdfSheet();
  });

  // Zoom Controls
  const zoomText = container.querySelector('#zoom-level-text');
  container.querySelector('#btn-zoom-in').addEventListener('click', () => {
    if (currentZoom < 1.4) {
      currentZoom += 0.1;
      zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
      renderPdfSheet();
    }
  });

  container.querySelector('#btn-zoom-out').addEventListener('click', () => {
    if (currentZoom > 0.6) {
      currentZoom -= 0.1;
      zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
      renderPdfSheet();
    }
  });

  // Client Select Import Handler
  if (clientImportSelect) {
    clientImportSelect.addEventListener('change', () => {
      const clientId = clientImportSelect.value;
      if (!clientId) return;

      const store = getStore();
      const client = store.clients.find(c => c.id === clientId);
      if (client) {
        const templateKey = templateSelect.value;
        if (templateKey === 'formulario210' || templateKey === 'pazysalvo') {
          studioData[templateKey].name = client.name;
          studioData[templateKey].nit = client.nit || '1.020.304.050';
          if (client.email) studioData[templateKey].email = client.email;
        } else if (templateKey === 'formulario220') {
          studioData.formulario220.employeeName = client.name;
          studioData.formulario220.employeeNit = client.nit || '1.020.304.050';
        }
        updateFormFieldsUI();
        renderPdfSheet();
        if (window.showToast) window.showToast(`Datos de ${client.name} cargados en el PDF`, 'success');
      }
    });
  }

  // Action Buttons
  container.querySelector('#pdf-btn-load-demo').addEventListener('click', () => {
    updateFormFieldsUI();
    renderPdfSheet();
    if (window.showToast) window.showToast('Valores de prueba restaurados.', 'info');
  });

  container.querySelector('#pdf-btn-clear').addEventListener('click', () => {
    const templateKey = templateSelect.value;
    Object.keys(studioData[templateKey]).forEach(k => {
      if (typeof studioData[templateKey][k] === 'number') studioData[templateKey][k] = 0;
      else studioData[templateKey][k] = '';
    });
    updateFormFieldsUI();
    renderPdfSheet();
    if (window.showToast) window.showToast('Formulario limpiado.', 'info');
  });

  container.querySelector('#pdf-btn-export-json').addEventListener('click', () => {
    const templateKey = templateSelect.value;
    const jsonStr = JSON.stringify(studioData[templateKey], null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_datos_${templateKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (window.showToast) window.showToast('JSON descargado correctamente.', 'success');
  });

  container.querySelector('#pdf-btn-print').addEventListener('click', () => {
    printPdfSheet(pdfPaper.innerHTML);
  });

  // Template / Stamp change events
  templateSelect.addEventListener('change', () => {
    updateFormFieldsUI();
    renderPdfSheet();
  });

  stampSelect.addEventListener('change', () => {
    renderPdfSheet();
  });

  // Initial load
  updateFormFieldsUI();
  renderPdfSheet();
}

function printPdfSheet(sheetInnerHtml) {
  const printWindow = window.open('', '_blank', 'width=850,height=1000');
  if (!printWindow) {
    alert('Permite ventanas emergentes (popups) para abrir e imprimir el documento PDF.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Documento_PDF_Interactivo.pdf</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #ffffff;
          color: #0f172a;
          margin: 0;
          padding: 2rem;
        }
        .pdf-sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #0f172a;
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        .pdf-col-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .pdf-col-title {
          text-align: right;
        }
        .pdf-section-box {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1.25rem;
          background: #f8fafc;
        }
        .pdf-section-title {
          font-size: 0.75rem;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.25rem;
        }
        .pdf-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .pdf-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
        }
        .pdf-table th, .pdf-table td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.85rem;
        }
        .pdf-table th {
          background: #e2e8f0;
          text-align: left;
          font-weight: 700;
          color: #1e293b;
        }
        .num {
          text-align: right;
          font-family: monospace;
          font-size: 0.9rem;
        }
        .pdf-footer-box {
          margin-top: 3rem;
          padding-top: 1rem;
          border-top: 2px solid #0f172a;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pdf-sig-col {
          text-align: center;
          width: 250px;
        }
        .pdf-sig-line {
          border-bottom: 1px solid #0f172a;
          min-height: 45px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .pdf-qr-col {
          text-align: center;
        }
        .pdf-stamp-watermark {
          border: 3px dashed #10b981;
          color: #10b981;
          padding: 0.5rem 1rem;
          font-weight: 900;
          font-size: 1rem;
          display: inline-block;
          margin: 1rem 0;
          transform: rotate(-3deg);
          border-radius: 6px;
        }
        .stamp-borrador { border-color: #f59e0b; color: #d97706; }
        .stamp-aprobado { border-color: #10b981; color: #059669; }
        .stamp-paz { border-color: #2563eb; color: #1d4ed8; }

        @media print {
          .no-print { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 1.5rem; text-align: right;">
        <button onclick="window.print()" style="padding: 0.75rem 1.5rem; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 800; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
          🖨️ Confirmar Impresión / Guardar en PDF
        </button>
      </div>

      ${sheetInnerHtml}
    </body>
    </html>
  `);
  printWindow.document.close();
}
