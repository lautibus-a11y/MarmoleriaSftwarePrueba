/* =========================================================
   MARMOLERÍA BENJAMIN — Document Exporter Service
   Generates PDF, Word (.doc) and Printable documents for:
   - Presupuestos (Cotizaciones)
   - Obras (Fichas Técnicas / Órdenes de Trabajo)
   - Cobros (Recibos Oficiales)
   - Facturas y Comprobantes
   ========================================================= */

import { formatCurrency, formatDate, escapeHtml } from '../utils/helpers.js';
import { PRESUPUESTO_ESTADO_LABELS, OBRA_ESTADO_LABELS, COBRO_ESTADO_LABELS, FACTURA_TIPO_LABELS, METODOS_PAGO } from '../utils/constants.js';

// Retrieve company information from configuration
export function getCompanyInfo() {
  try {
    const cfg = JSON.parse(localStorage.getItem('mb_config')) || {};
    return {
      nombre: cfg.empresa_nombre || 'Marmolería Benjamin',
      subtitulo: 'Mármoles • Granitos • Silestone • Neolith • Cuarzo',
      cuit: cfg.empresa_cuit || '30-71548923-4',
      direccion: cfg.empresa_direccion || 'Av. Los Canteros 1420, Córdoba',
      telefono: cfg.empresa_telefono || '+54 9 351 555-0192',
      email: cfg.empresa_email || 'contacto@marmoleriabenjamin.com.ar',
      logoText: 'MB'
    };
  } catch (e) {
    return {
      nombre: 'Marmolería Benjamin',
      subtitulo: 'Mármoles • Granitos • Silestone • Neolith • Cuarzo',
      cuit: '30-71548923-4',
      direccion: 'Av. Los Canteros 1420, Córdoba',
      telefono: '+54 9 351 555-0192',
      email: 'contacto@marmoleriabenjamin.com.ar',
      logoText: 'MB'
    };
  }
}

// ── 1. Presupuesto HTML Generator ──
export function generatePresupuestoHtml(pres, cliente = null, totalCalc = 0) {
  const company = getCompanyInfo();
  const total = totalCalc || (pres.items || []).reduce((s, i) => s + (i.subtotal || 0), 0);
  const items = pres.items || [];
  const adic = pres.adicionales || {};

  const adicRows = [
    { label: 'Colocación en obra', val: adic.colocacion },
    { label: 'Mano de obra especializada', val: adic.manoDeObra },
    { label: 'Inglete – Mano de obra', val: adic.inglete },
    { label: 'Flete / Transporte', val: adic.transporte },
    { label: 'Provisión e instalación de bacha', val: adic.bacha },
    { label: 'Zócalos perimetrales', val: adic.zocalos },
    { label: 'Trabajos extras / Cortes especiales', val: adic.extras }
  ].filter(r => Number(r.val) > 0);

  const subtotalItems = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  const subtotalAdic = adicRows.reduce((s, r) => s + Number(r.val), 0);
  const baseImponible = subtotalItems + subtotalAdic;
  const descuentoMonto = pres.descuento > 0 ? (baseImponible * (pres.descuento / 100)) : 0;
  const subtotalConDesc = baseImponible - descuentoMonto;
  const impuestosMonto = pres.impuestos > 0 ? (subtotalConDesc * (pres.impuestos / 100)) : 0;

  // Items table rows
  const itemsRowsHtml = items.map((it, idx) => `
    <tr>
      <td style="text-align:center;width:28px">${idx + 1}</td>
      <td><strong>${escapeHtml(it.descripcion || 'Sin descripción')}</strong></td>
      <td>${escapeHtml(it.material || '-')}</td>
      <td class="num">${it.cantidad || 1}</td>
      <td class="num">${it.largo ? it.largo + ' cm' : '-'}</td>
      <td class="num">${it.ancho ? it.ancho + ' cm' : '-'}</td>
      <td class="num">${(Number(it.m2) || 0).toFixed(2)} m²</td>
      <td class="num">${formatCurrency(it.precioUnitario || 0, pres.moneda)}</td>
      <td class="num" style="font-weight:700">${formatCurrency(it.subtotal || 0, pres.moneda)}</td>
    </tr>
  `).join('');

  return `
    <div class="doc-sheet">
      <!-- Encabezado Oficial -->
      <table class="doc-header-table">
        <tr>
          <td style="width:60%">
            <div style="display:flex;align-items:center">
              <div class="doc-brand-badge">${company.logoText}</div>
              <div>
                <h1 class="doc-brand-title">${escapeHtml(company.nombre)}</h1>
                <p class="doc-brand-subtitle">${escapeHtml(company.subtitulo)}</p>
              </div>
            </div>
          </td>
          <td style="width:40%;text-align:right" class="doc-header-meta">
            <div><strong>CUIT:</strong> ${escapeHtml(company.cuit)}</div>
            <div>${escapeHtml(company.direccion)}</div>
            <div><strong>Tel:</strong> ${escapeHtml(company.telefono)}</div>
            <div>${escapeHtml(company.email)}</div>
          </td>
        </tr>
      </table>

      <!-- Barra de Identificación del Presupuesto -->
      <div class="doc-title-bar">
        <div>
          <div class="doc-title-main" style="font-size:16pt;font-weight:700;letter-spacing:-0.5px">Presupuesto</div>
          <div style="font-size:9.5pt;color:#78716C;margin-top:2px;font-weight:500">${formatDate(pres.fecha)}</div>
        </div>
        <div>
          <span class="doc-title-number">${escapeHtml(pres.numero)}</span>
        </div>
      </div>

      <!-- Datos del Cliente y Obra -->
      <div class="doc-info-grid">
        <div class="doc-info-card">
          <div class="doc-info-card-title">Datos del Cliente</div>
          <div class="doc-info-row">
            <span class="doc-info-label">Nombre:</span>
            <span class="doc-info-val">${cliente ? escapeHtml(`${cliente.nombre} ${cliente.apellido || ''}`.trim()) : escapeHtml(pres.clienteNombre || 'Consumidor Final')}</span>
          </div>
          ${cliente?.cuit || cliente?.dni ? `
            <div class="doc-info-row">
              <span class="doc-info-label">DNI / CUIT:</span>
              <span class="doc-info-val">${escapeHtml(cliente.cuit || cliente.dni)}</span>
            </div>
          ` : ''}
          ${cliente?.telefono || cliente?.whatsapp ? `
            <div class="doc-info-row">
              <span class="doc-info-label">Teléfono:</span>
              <span class="doc-info-val">${escapeHtml(cliente.telefono || cliente.whatsapp)}</span>
            </div>
          ` : ''}
          ${cliente?.email ? `
            <div class="doc-info-row">
              <span class="doc-info-label">Email:</span>
              <span class="doc-info-val">${escapeHtml(cliente.email)}</span>
            </div>
          ` : ''}
        </div>

        <div class="doc-info-card">
          <div class="doc-info-card-title">Datos del Proyecto</div>
          <div class="doc-info-row">
            <span class="doc-info-label">Dirección:</span>
            <span class="doc-info-val">${escapeHtml(pres.direccion || cliente?.direccion || 'A coordinar')}</span>
          </div>
        </div>
      </div>

      <!-- Tabla de Ítems -->
      <div class="doc-table-scroll">
        <table class="doc-table">
          <thead>
            <tr>
              <th style="text-align:center;width:28px">#</th>
              <th>Descripción del ítem</th>
              <th>Material especificado</th>
              <th class="num">Cant.</th>
              <th class="num">Largo</th>
              <th class="num">Ancho</th>
              <th class="num">Superficie (m²)</th>
              <th class="num">Precio / m²</th>
              <th class="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml || '<tr><td colspan="9" style="text-align:center;color:#78716C">Sin ítems detallados</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Resumen Económico -->
      <div class="doc-financials">
        <div class="doc-totals-box">
          <div class="doc-total-row">
            <span>Subtotal materiales:</span>
            <span class="num">${formatCurrency(subtotalItems, pres.moneda)}</span>
          </div>

          ${adicRows.map(r => `
            <div class="doc-total-row">
              <span>${escapeHtml(r.label)}:</span>
              <span class="num">${formatCurrency(r.val, pres.moneda)}</span>
            </div>
          `).join('')}

          ${pres.descuento > 0 ? `
            <div class="doc-total-row" style="color:#DC2626">
              <span>Descuento aplicado (${pres.descuento}%):</span>
              <span class="num">-${formatCurrency(descuentoMonto, pres.moneda)}</span>
            </div>
          ` : ''}

          ${pres.impuestos > 0 ? `
            <div class="doc-total-row">
              <span>Impuestos / IVA (${pres.impuestos}%):</span>
              <span class="num">${formatCurrency(impuestosMonto, pres.moneda)}</span>
            </div>
          ` : ''}

          <div class="doc-grand-total">
            <span class="doc-grand-total-label">TOTAL PRESUPUESTO</span>
            <span class="doc-grand-total-amount">${formatCurrency(total, pres.moneda)}</span>
          </div>
        </div>
      </div>

      <!-- Condiciones Comerciales -->
      <div class="doc-conditions-block">
        <div class="doc-conditions-title">Condiciones Comerciales y de Garantía</div>
        <pre class="doc-conditions-content">${escapeHtml(pres.condiciones || '• Anticipo del 50% para inicio de obra y congelamiento de precio.\n• Saldo restante contra entrega o colocación final.\n• Materiales naturales sujetos a tonalidades y vetas propias de la piedra.\n• Presupuesto válido por 15 días corridos a partir de la fecha de emisión.')}</pre>
      </div>

      ${pres.observaciones ? `
        <div class="doc-conditions-block" style="margin-top:-10px">
          <div class="doc-conditions-title">Observaciones Técnicas Adicionales</div>
          <div style="font-size:8pt;color:#57534E">${escapeHtml(pres.observaciones)}</div>
        </div>
      ` : ''}

      <!-- Firmas -->
      <div class="doc-signatures-row">
        <div class="doc-signature-line">
          <span class="doc-signature-name">${escapeHtml(company.nombre)}</span>
          <span>Firma y Sello Autorizado</span>
        </div>
        <div class="doc-signature-line">
          <span class="doc-signature-name">${cliente ? escapeHtml(`${cliente.nombre} ${cliente.apellido || ''}`) : 'Aceptación del Cliente'}</span>
          <span>Firma, Aclaración y DNI</span>
        </div>
      </div>

      <!-- Pie de página -->
      <div class="doc-footer">
        Documento generado por Sistema Marmolería Benjamin • ${formatDate(new Date())} • No válido como factura fiscal
      </div>
    </div>
  `;
}

// ── 2. Obra / Orden de Trabajo HTML Generator ──
export function generateObraHtml(obra, cliente = null, pres = null, cobros = []) {
  const company = getCompanyInfo();
  const total = pres ? (pres.items || []).reduce((s, i) => s + (i.subtotal || 0), 0) : 0;
  const cobrado = cobros.reduce((s, c) => s + (Number(c.importe) || 0), 0);
  const saldo = total - cobrado;

  const itemsHtml = pres?.items?.map((it, idx) => `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td><strong>${escapeHtml(it.descripcion)}</strong></td>
      <td>${escapeHtml(it.material || obra.material || '-')}</td>
      <td class="num">${it.cantidad}</td>
      <td class="num">${it.largo ? it.largo + ' cm' : '-'}</td>
      <td class="num">${it.ancho ? it.ancho + ' cm' : '-'}</td>
      <td class="num">${(Number(it.m2) || 0).toFixed(2)} m²</td>
    </tr>
  `).join('') || '';

  return `
    <div class="doc-sheet">
      <table class="doc-header-table">
        <tr>
          <td style="width:60%">
            <div style="display:flex;align-items:center">
              <div class="doc-brand-badge">${company.logoText}</div>
              <div>
                <h1 class="doc-brand-title">${escapeHtml(company.nombre)}</h1>
                <p class="doc-brand-subtitle">ORDEN DE TRABAJO & FICHA TÉCNICA DE TALLER</p>
              </div>
            </div>
          </td>
          <td style="width:40%;text-align:right" class="doc-header-meta">
            <div><strong>Taller / Obra</strong></div>
            <div>${escapeHtml(company.direccion)}</div>
            <div><strong>Teléfono:</strong> ${escapeHtml(company.telefono)}</div>
          </td>
        </tr>
      </table>

      <div class="doc-title-bar">
        <div>
          <span class="doc-title-main">ORDEN DE PRODUCCIÓN E INSTALACIÓN</span>
        </div>
        <div>
          <span class="doc-title-number">OBRA #${obra.id}</span>
        </div>
      </div>

      <div class="doc-info-grid">
        <div class="doc-info-card">
          <div class="doc-info-card-title">Datos del Cliente</div>
          <div class="doc-info-row"><span class="doc-info-label">Cliente:</span><span class="doc-info-val">${cliente ? escapeHtml(`${cliente.nombre} ${cliente.apellido || ''}`) : '-'}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Teléfono:</span><span class="doc-info-val">${escapeHtml(cliente?.telefono || cliente?.whatsapp || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Dirección Obra:</span><span class="doc-info-val">${escapeHtml(obra.direccion || '-')}</span></div>
        </div>

        <div class="doc-info-card">
          <div class="doc-info-card-title">Planificación Técnica</div>
          <div class="doc-info-row"><span class="doc-info-label">Fecha Inicio:</span><span class="doc-info-val">${formatDate(obra.fechaInicio)}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Fecha Estimada:</span><span class="doc-info-val">${formatDate(obra.fechaEstimada) || 'A coordinar'}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Responsable:</span><span class="doc-info-val">${escapeHtml(obra.responsable || 'Taller Principal')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Estado:</span><span class="doc-info-val">${OBRA_ESTADO_LABELS[obra.estado] || obra.estado}</span></div>
        </div>
      </div>

      <div class="doc-info-card" style="margin-bottom:16px">
        <div class="doc-info-card-title">Descripción del Trabajo</div>
        <div style="font-size:9.5pt;font-weight:600;color:#1C1917;margin-bottom:4px">${escapeHtml(obra.descripcion)}</div>
        <div style="font-size:8.5pt;color:#57534E"><strong>Material principal:</strong> ${escapeHtml(obra.material || '-')}</div>
      </div>

      ${itemsHtml ? `
        <div class="doc-table-scroll">
          <table class="doc-table">
            <thead>
              <tr>
                <th style="text-align:center;width:28px">#</th>
                <th>Pieza / Ítem a fabricar</th>
                <th>Material especificado</th>
                <th class="num">Cant.</th>
                <th class="num">Largo</th>
                <th class="num">Ancho</th>
                <th class="num">Superficie</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Estado Financiero -->
      <div class="doc-info-grid" style="margin-top:14px">
        <div class="doc-info-card">
          <div class="doc-info-card-title">Estado Contable</div>
          <div class="doc-info-row"><span class="doc-info-label">Presupuesto:</span><span class="doc-info-val">${pres ? pres.numero : '-'}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Total pactado:</span><span class="doc-info-val">${formatCurrency(total)}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Cobrado:</span><span class="doc-info-val" style="color:#059669">${formatCurrency(cobrado)}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Saldo a cobrar:</span><span class="doc-info-val" style="color:#D97706">${formatCurrency(saldo)}</span></div>
        </div>

        <div class="doc-info-card">
          <div class="doc-info-card-title">Instrucciones de Taller e Instalación</div>
          <div style="font-size:8pt;color:#57534E;line-height:1.4">
            ${escapeHtml(obra.observaciones || 'Verificar medidas finales en obra antes de cortes finales. Rechequear escuadras y calados de bachas/griferías in situ.')}
          </div>
        </div>
      </div>

      <div class="doc-signatures-row" style="margin-top:40px">
        <div class="doc-signature-line">
          <span class="doc-signature-name">Responsable de Taller / Colocador</span>
          <span>Firma y Fecha de Terminación</span>
        </div>
        <div class="doc-signature-line">
          <span class="doc-signature-name">Conformidad del Cliente</span>
          <span>Firma de Recepción e Instalación Conforme</span>
        </div>
      </div>

      <div class="doc-footer">
        Ficha técnica interna Marmolería Benjamin • Emitido el ${formatDate(new Date())}
      </div>
    </div>
  `;
}

// ── 3. Recibo de Cobro HTML Generator ──
export function generateCobroHtml(cobro, cliente = null, obra = null) {
  const company = getCompanyInfo();
  const metodoLabel = METODOS_PAGO.find(m => m.value === cobro.metodoPago)?.label || cobro.metodoPago || 'Efectivo';

  return `
    <div class="doc-sheet">
      <table class="doc-header-table">
        <tr>
          <td style="width:60%">
            <div style="display:flex;align-items:center">
              <div class="doc-brand-badge">${company.logoText}</div>
              <div>
                <h1 class="doc-brand-title">${escapeHtml(company.nombre)}</h1>
                <p class="doc-brand-subtitle">COMPROBANTE OFICIAL DE COBRO</p>
              </div>
            </div>
          </td>
          <td style="width:40%;text-align:right" class="doc-header-meta">
            <div><strong>CUIT:</strong> ${escapeHtml(company.cuit)}</div>
            <div>${escapeHtml(company.direccion)}</div>
            <div><strong>Teléfono:</strong> ${escapeHtml(company.telefono)}</div>
          </td>
        </tr>
      </table>

      <div class="doc-title-bar">
        <div>
          <span class="doc-title-main">RECIBO DE PAGO</span>
        </div>
        <div>
          <span class="doc-title-number">REC-${String(cobro.id).padStart(5, '0')}</span>
        </div>
      </div>

      <div class="doc-info-grid">
        <div class="doc-info-card">
          <div class="doc-info-card-title">Recibimos de</div>
          <div class="doc-info-row"><span class="doc-info-label">Cliente:</span><span class="doc-info-val">${cliente ? escapeHtml(`${cliente.nombre} ${cliente.apellido || ''}`) : 'Consumidor Final'}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">DNI / CUIT:</span><span class="doc-info-val">${escapeHtml(cliente?.cuit || cliente?.dni || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Domicilio:</span><span class="doc-info-val">${escapeHtml(cliente?.direccion || '-')}</span></div>
        </div>

        <div class="doc-info-card">
          <div class="doc-info-card-title">Datos del Comprobante</div>
          <div class="doc-info-row"><span class="doc-info-label">Fecha:</span><span class="doc-info-val">${formatDate(cobro.fecha)}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Método:</span><span class="doc-info-val">${escapeHtml(metodoLabel)}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Obra vinculada:</span><span class="doc-info-val">${obra ? escapeHtml(obra.descripcion || obra.direccion) : 'Sin obra específica'}</span></div>
        </div>
      </div>

      <div class="doc-grand-total" style="margin:24px 0">
        <span class="doc-grand-total-label">IMPORTE RECIBIDO</span>
        <span class="doc-grand-total-amount">${formatCurrency(cobro.importe)}</span>
      </div>

      <div class="doc-conditions-block">
        <div class="doc-conditions-title">Concepto / Imputación</div>
        <p style="margin:0;font-size:9pt;color:#1C1917">
          ${escapeHtml(cobro.observaciones || `Pago a cuenta en concepto de trabajos de marmolería según obra convenida.`)}
        </p>
      </div>

      <div class="doc-signatures-row" style="margin-top:60px">
        <div class="doc-signature-line">
          <span class="doc-signature-name">${escapeHtml(company.nombre)}</span>
          <span>Firma y Sello Receptor</span>
        </div>
        <div class="doc-signature-line">
          <span class="doc-signature-name">${cliente ? escapeHtml(`${cliente.nombre} ${cliente.apellido || ''}`) : 'Firma Pagador'}</span>
          <span>Aclaración</span>
        </div>
      </div>

      <div class="doc-footer">
        Comprobante no válido como factura • Marmolería Benjamin • ${formatDate(new Date())}
      </div>
    </div>
  `;
}

// ── 4. Factura / Comprobante de Proveedor HTML Generator ──
export function generateFacturaHtml(fac, prov = null) {
  const company = getCompanyInfo();
  const tipoLabel = FACTURA_TIPO_LABELS[fac.tipo] || 'Factura';

  return `
    <div class="doc-sheet">
      <table class="doc-header-table">
        <tr>
          <td style="width:60%">
            <div style="display:flex;align-items:center">
              <div class="doc-brand-badge">${company.logoText}</div>
              <div>
                <h1 class="doc-brand-title">${escapeHtml(company.nombre)}</h1>
                <p class="doc-brand-subtitle">REGISTRO DE COMPROBANTE COMERCIAL</p>
              </div>
            </div>
          </td>
          <td style="width:40%;text-align:right" class="doc-header-meta">
            <div><strong>CUIT:</strong> ${escapeHtml(company.cuit)}</div>
            <div>${escapeHtml(company.direccion)}</div>
            <div><strong>Tel:</strong> ${escapeHtml(company.telefono)}</div>
          </td>
        </tr>
      </table>

      <div class="doc-title-bar">
        <div>
          <span class="doc-title-main">${escapeHtml(tipoLabel.toUpperCase())}</span>
        </div>
        <div>
          <span class="doc-title-number">${escapeHtml(fac.numero || 'S/N')}</span>
        </div>
      </div>

      <div class="doc-info-grid">
        <div class="doc-info-card">
          <div class="doc-info-card-title">Datos del Proveedor</div>
          <div class="doc-info-row"><span class="doc-info-label">Razón Social:</span><span class="doc-info-val">${prov ? escapeHtml(prov.nombre) : '-'}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">CUIT:</span><span class="doc-info-val">${escapeHtml(prov?.cuit || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Contacto:</span><span class="doc-info-val">${escapeHtml(prov?.contacto || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Teléfono:</span><span class="doc-info-val">${escapeHtml(prov?.telefono || '-')}</span></div>
        </div>

        <div class="doc-info-card">
          <div class="doc-info-card-title">Detalle de Emisión</div>
          <div class="doc-info-row"><span class="doc-info-label">Fecha:</span><span class="doc-info-val">${formatDate(fac.fecha)}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Vencimiento:</span><span class="doc-info-val">${formatDate(fac.vencimiento) || '-'}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Categoría:</span><span class="doc-info-val">${escapeHtml(fac.categoria || 'Material')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Estado:</span><span class="doc-info-val">${fac.estado || 'Pendiente'}</span></div>
        </div>
      </div>

      <div class="doc-grand-total" style="margin:24px 0">
        <span class="doc-grand-total-label">IMPORTE TOTAL</span>
        <span class="doc-grand-total-amount">${formatCurrency(fac.importe, fac.moneda)}</span>
      </div>

      ${fac.observaciones ? `
        <div class="doc-conditions-block">
          <div class="doc-conditions-title">Detalle / Observaciones</div>
          <p style="margin:0;font-size:9pt;color:#1C1917">${escapeHtml(fac.observaciones)}</p>
        </div>
      ` : ''}

      <div class="doc-signatures-row" style="margin-top:60px">
        <div class="doc-signature-line">
          <span class="doc-signature-name">Marmolería Benjamin</span>
          <span>Recepción y Control de Facturación</span>
        </div>
        <div class="doc-signature-line">
          <span class="doc-signature-name">${prov ? escapeHtml(prov.nombre) : 'Proveedor'}</span>
          <span>Emisor</span>
        </div>
      </div>

      <div class="doc-footer">
        Registro contable interno • Marmolería Benjamin • ${formatDate(new Date())}
      </div>
    </div>
  `;
}

// ── 5. Export to Word (.doc) ──
export function exportToWord(htmlContent, filename = 'documento') {
  const company = getCompanyInfo();

  // Clean and wrap HTML in standard Microsoft Word XML/HTML schema
  const wordTemplate = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${escapeHtml(filename)}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 36.0pt 40.0pt 36.0pt 40.0pt;
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.Section1 {
          page: Section1;
        }
        body {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
          font-size: 10.5pt;
          color: #1C1917;
          line-height: 1.4;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12pt;
        }
        th {
          background-color: #1C1917;
          color: #FFFFFF;
          font-weight: bold;
          padding: 6pt 8pt;
          border: 1pt solid #1C1917;
          font-size: 9pt;
        }
        td {
          padding: 5pt 7pt;
          border: 1pt solid #E7E5E4;
          font-size: 9pt;
        }
        td.num, th.num {
          text-align: right;
        }
        .doc-brand-title {
          font-size: 16pt;
          font-weight: bold;
          color: #1C1917;
          margin: 0;
        }
        .doc-brand-subtitle {
          font-size: 8pt;
          color: #78716C;
          text-transform: uppercase;
          margin: 0;
        }
        .doc-title-bar {
          background-color: #F5F5F4;
          border-left: 4pt solid #B8A088;
          padding: 8pt 10pt;
          margin-bottom: 12pt;
        }
        .doc-title-main {
          font-size: 12pt;
          font-weight: bold;
          color: #1C1917;
        }
        .doc-title-number {
          font-size: 12pt;
          font-weight: bold;
          color: #8C7A66;
        }
        .doc-info-card {
          background-color: #FAFAF9;
          border: 1pt solid #E7E5E4;
          padding: 8pt;
          margin-bottom: 8pt;
        }
        .doc-grand-total {
          background-color: #1C1917;
          color: #FFFFFF;
          padding: 8pt 12pt;
          font-size: 12pt;
          font-weight: bold;
          margin-top: 8pt;
        }
        .doc-conditions-block {
          background-color: #FAFAF9;
          border: 1pt solid #E7E5E4;
          padding: 8pt;
          font-size: 8.5pt;
          margin-top: 10pt;
        }
        .doc-signatures-row {
          margin-top: 30pt;
        }
        .doc-signature-line {
          border-top: 1pt solid #A8A29E;
          text-align: center;
          padding-top: 6pt;
          font-size: 8pt;
          color: #78716C;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${htmlContent}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordTemplate], {
    type: 'application/msword;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ── 5. Export to PDF ──
export async function exportToPdf(elementOrHtml, filename = 'documento') {
  const cleanFilename = `${filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.pdf`;

  // Check if html2pdf is available
  if (typeof window.html2pdf === 'function') {
    let targetEl;
    let removeTarget = false;

    if (typeof elementOrHtml === 'string') {
      targetEl = document.createElement('div');
      targetEl.innerHTML = elementOrHtml;
      targetEl.style.position = 'absolute';
      targetEl.style.left = '-9999px';
      targetEl.style.top = '0';
      targetEl.style.width = '210mm';
      targetEl.style.backgroundColor = '#ffffff';
      document.body.appendChild(targetEl);
      removeTarget = true;
    } else {
      targetEl = elementOrHtml;
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: cleanFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await window.html2pdf().set(opt).from(targetEl).save();
      if (removeTarget && targetEl.parentNode) {
        targetEl.parentNode.removeChild(targetEl);
      }
      return true;
    } catch (err) {
      console.error('Error generating PDF with html2pdf:', err);
      if (removeTarget && targetEl.parentNode) {
        targetEl.parentNode.removeChild(targetEl);
      }
      // Fall back to print dialog
      printDocument(typeof elementOrHtml === 'string' ? elementOrHtml : elementOrHtml.innerHTML);
      return false;
    }
  } else {
    // If html2pdf not loaded, trigger print dialog
    printDocument(typeof elementOrHtml === 'string' ? elementOrHtml : elementOrHtml.innerHTML);
    return true;
  }
}

// ── 6. Print Document (Native Browser Print to PDF/Printer) ──
export function printDocument(htmlContent) {
  let printContainer = document.getElementById('print-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    document.body.appendChild(printContainer);
  }

  printContainer.innerHTML = htmlContent;

  window.focus();
  setTimeout(() => {
    window.print();
    // Clean up after print dialog closes
    setTimeout(() => {
      if (printContainer) printContainer.innerHTML = '';
    }, 1000);
  }, 250);
}
