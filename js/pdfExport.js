/**
 * Modulo de Exportación e Impresión de Reportes Tributarios y Paz y Salvo
 */

export function printTaxDeclarationSummary(client, taxResult) {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes (popups) para imprimir o descargar el reporte.');
    return;
  }

  const currentDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const content = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Borrador Formulario 210 - ${client.name}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b;
          padding: 2.5rem;
          margin: 0;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .brand-logo {
          font-size: 2rem;
        }
        .brand-text h1 {
          margin: 0;
          font-size: 1.35rem;
          color: #0f172a;
        }
        .brand-text span {
          font-size: 0.85rem;
          color: #64748b;
        }
        .badge {
          display: inline-block;
          padding: 0.35rem 0.75rem;
          background: #eff6ff;
          color: #1d4ed8;
          font-weight: 700;
          font-size: 0.8rem;
          border-radius: 4px;
          border: 1px solid #bfdbfe;
        }
        .section {
          margin-bottom: 1.5rem;
        }
        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.35rem;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .info-box {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .info-box label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          display: block;
        }
        .info-box span {
          font-size: 0.95rem;
          font-weight: 600;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
        }
        th, td {
          padding: 0.65rem 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.9rem;
        }
        th {
          background: #f1f5f9;
          font-weight: 700;
          color: #334155;
        }
        .amount {
          text-align: right;
          font-family: monospace;
          font-size: 0.95rem;
        }
        .total-row {
          font-weight: 700;
          background: #f8fafc;
        }
        .balance-card {
          margin-top: 1.5rem;
          padding: 1.25rem;
          border-radius: 8px;
          text-align: center;
        }
        .balance-card.afavor {
          background: #ecfdf5;
          border: 2px solid #10b981;
          color: #065f46;
        }
        .balance-card.apagar {
          background: #fef2f2;
          border: 2px solid #ef4444;
          color: #991b1b;
        }
        .balance-card.neutral {
          background: #f1f5f9;
          border: 2px solid #64748b;
          color: #334155;
        }
        .footer {
          margin-top: 3rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 1.5rem; text-align: right;">
        <button onclick="window.print()" style="padding: 0.6rem 1.2rem; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          🖨️ Imprimir / Guardar en PDF
        </button>
      </div>

      <div class="header">
        <div class="brand">
          <div class="brand-logo">🏛️</div>
          <div class="brand-text">
            <h1>TaxPortal DIAN</h1>
            <span>Resumen de Liquidación Tributaria - Formulario 210</span>
          </div>
        </div>
        <div class="badge">Año Gravable ${taxResult ? taxResult.year : (client.year || '2025')}</div>
      </div>

      <div class="section">
        <div class="section-title">Datos del Contribuyente</div>
        <div class="grid-2">
          <div class="info-box">
            <label>Nombre Completo / Razón Social</label>
            <span>${client.name}</span>
          </div>
          <div class="info-box">
            <label>Documento de Identidad / NIT</label>
            <span>${client.nit || 'Sin Registrar'}</span>
          </div>
          <div class="info-box">
            <label>Correo Electrónico</label>
            <span>${client.email}</span>
          </div>
          <div class="info-box">
            <label>Teléfono de Contacto</label>
            <span>${client.phone || 'N/A'}</span>
          </div>
        </div>
      </div>

      ${taxResult ? `
      <div class="section">
        <div class="section-title">Desglose Cedula General (Formulario 210)</div>
        <table>
          <thead>
            <tr>
              <th>Concepto Tributario</th>
              <th style="text-align: right;">Valor (COP)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Ingresos Brutos (Trabajo + Capital + No Laboral)</td>
              <td class="amount">${taxResult.formattedIngresos}</td>
            </tr>
            <tr>
              <td>Ingresos No Constitutivos de Renta (INCR)</td>
              <td class="amount">$ ${taxResult.totalINOR.toLocaleString('es-CO')}</td>
            </tr>
            <tr>
              <td>Deducciones Imputables (Vivienda, Salud, Dependientes)</td>
              <td class="amount">$ ${taxResult.totalDeducciones.toLocaleString('es-CO')}</td>
            </tr>
            <tr>
              <td>Renta Exenta Laboral (25%)</td>
              <td class="amount">$ ${Math.round(taxResult.exencion25Calculada).toLocaleString('es-CO')}</td>
            </tr>
            <tr class="total-row">
              <td>Renta Líquida Gravable Cédula General</td>
              <td class="amount">$ ${Math.round(taxResult.rentaLiquidaCedulaGeneral).toLocaleString('es-CO')} (${taxResult.rentaLiquidaUVT.toFixed(1)} UVT)</td>
            </tr>
            <tr class="total-row" style="background: #e2e8f0;">
              <td>Impuesto Determinado sobre la Renta</td>
              <td class="amount" style="color: #0f172a;">${taxResult.formattedImpuesto}</td>
            </tr>
            <tr>
              <td>(-) Retenciones en la Fuente Practicadas</td>
              <td class="amount" style="color: #059669;">- ${taxResult.formattedRetenciones}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="balance-card ${taxResult.balanceType}">
        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase;">
          ${taxResult.balanceType === 'afavor' ? '🎉 SALDO A FAVOR DEL CONTRIBUYENTE' : (taxResult.balanceType === 'apagar' ? '⚠️ SALDO A PAGAR A LA DIAN' : 'BALANCE NEUTRO')}
        </div>
        <div style="font-size: 1.8rem; font-weight: 800; margin-top: 0.25rem;">
          ${taxResult.formattedBalance}
        </div>
      </div>
      ` : ''}

      <div class="footer">
        Documento generado automáticamente por TaxPortal DIAN el ${currentDate}.<br>
        Soporte elaborado por Contador Público Certificado.
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
}
