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
import { LOGO_BASE64 } from '../utils/logo.js';
import { Toast } from '../components/toast.js';

// Retrieve company information from configuration
export function getCompanyInfo() {
  const defaultSub = 'Mármoles • Granitos • Silestone • Neolith • Purastone';
  try {
    const cfg = JSON.parse(localStorage.getItem('mb_config')) || {};
    const rawSub = cfg.empresa_subtitulo || defaultSub;
    const subtitulo = rawSub.replace(/Quarzo|Cuarzo/gi, 'Purastone');
    return {
      nombre: cfg.empresa_nombre || 'Marmolería Benjamin',
      subtitulo: subtitulo,
      cuit: cfg.empresa_cuit || '30-71548923-4',
      direccion: cfg.empresa_direccion || 'Av. Los Canteros 1420, Córdoba',
      telefono: cfg.empresa_telefono || '+54 9 351 555-0192',
      email: cfg.empresa_email || 'contacto@marmoleriabenjamin.com.ar',
      logoSrc: cfg.empresa_logo || LOGO_BASE64,
      logoText: 'MB'
    };
  } catch (e) {
    return {
      nombre: 'Marmolería Benjamin',
      subtitulo: defaultSub,
      cuit: '30-71548923-4',
      direccion: 'Av. Los Canteros 1420, Córdoba',
      telefono: '+54 9 351 555-0192',
      email: 'contacto@marmoleriabenjamin.com.ar',
      logoSrc: LOGO_BASE64,
      logoText: 'MB'
    };
  }
}

// ── 1. Presupuesto HTML Generator ──
export function generatePresupuestoHtml(pres, cliente = null, totalCalc = 0) {
  const company = getCompanyInfo();
  const total = totalCalc || (pres.items || []).reduce((s, i) => s + (i.subtotal || 0), 0);
  const items = pres.items || [];
  const adic = (pres.adicionales && typeof pres.adicionales === 'object') ? pres.adicionales : {};

  // Entrega y colocación unificado (compatible con entregaColocacion o legacy colocacion / transporte / entrega)
  const valEntregaColocacion = (adic.entregaColocacion !== undefined && adic.entregaColocacion !== null)
    ? Number(adic.entregaColocacion)
    : ((Number(adic.colocacion) || 0) + (Number(adic.transporte) || 0) + (Number(adic.entrega) || 0));

  const adicRows = [
    { label: 'Entrega y colocación', val: valEntregaColocacion },
    { label: 'Mano de obra especializada', val: adic.manoDeObra },
    { label: 'Inglete – Mano de obra', val: adic.inglete },
    { label: 'Provisión e instalación de bacha', val: adic.bacha },
    { label: 'Zócalos perimetrales', val: adic.zocalos },
    { label: 'Ménsulas', val: adic.mensulas },
    { label: 'Acarreo', val: adic.acarreo },
    { label: 'Por escalera', val: adic.porEscalera },
    { label: 'Trafóro bacha y/o anafe', val: adic.traforoBachaAnafe },
    { label: 'Trafóro cajas de luz y/o gas', val: adic.traforoCajasLuzGas },
    { label: 'Trafóro de desagüe', val: adic.traforoDesague },
    { label: 'Trabajos extras / Cortes especiales', val: adic.extras }
  ].filter(r => Number(r.val) > 0);

  const subtotalItems = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  const subtotalAdic = adicRows.reduce((s, r) => s + Number(r.val), 0);
  const baseImponible = subtotalItems + subtotalAdic;
  const descuentoMonto = pres.descuento > 0 ? (baseImponible * (pres.descuento / 100)) : 0;
  const subtotalConDesc = baseImponible - descuentoMonto;
  const impuestosMonto = pres.impuestos > 0 ? (subtotalConDesc * (pres.impuestos / 100)) : 0;

  // Helper to format measure with unit
  const formatDocMeasure = (val, unidad) => {
    if (!val && val !== 0) return '-';
    const s = String(val).trim();
    if (!s || s === '0') return '-';
    const u = unidad || (parseFloat(s.replace(',', '.')) > 10 ? 'cm' : 'm');
    return `${s} ${u}`;
  };

  // Items table rows
  const itemsRowsHtml = items.map((it, idx) => `
    <tr>
      <td style="text-align:center;width:28px">${idx + 1}</td>
      <td><strong>${escapeHtml(it.descripcion || 'Sin descripción')}</strong></td>
      <td><span style="font-weight:600;color:#1C1917">${escapeHtml(it.material || '-')}</span></td>
      <td class="num">${it.cantidad || 1}</td>
      <td class="num">${formatDocMeasure(it.largo, it.unidadMedida)}</td>
      <td class="num">${formatDocMeasure(it.ancho, it.unidadMedida)}</td>
      <td class="num" style="font-weight:600">${(Number(it.m2) || 0).toFixed(2).replace('.', ',')} m²</td>
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
              <img src="${company.logoSrc}" alt="${escapeHtml(company.nombre)}" class="doc-brand-img">
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
          ${(pres.moneda === 'USD' && pres.cotizacionDolar) ? `
            <div style="font-size:8.5pt;color:#78716C;text-align:right;margin-top:5px;font-weight:600">
              Tipo de cambio de referencia: 1 USD = $${formatCurrency(pres.cotizacionDolar, 'ARS')} · Equivalente en pesos: ${formatCurrency(total * pres.cotizacionDolar, 'ARS')}
            </div>
          ` : ''}
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
  const total = pres ? (pres.items || []).reduce((s, i) => s + (i.subtotal || 0), 0) : (Number(obra.importe) || 0);
  const cobrado = cobros.reduce((s, c) => s + (Number(c.importe) || 0), 0);
  const saldo = total - cobrado;

  const itemsList = (pres && pres.items && pres.items.length > 0) ? pres.items : (obra.items || []);
  const itemsHtml = itemsList.map((it, idx) => {
    const u = it.unidadMedida || (it.largo > 10 ? 'cm' : 'm');
    const m2Formatted = (it.m2 !== undefined && it.m2 !== null) ? Number(it.m2).toFixed(2).replace('.', ',') : '0,00';
    return `
    <tr>
      <td style="text-align:center">${idx + 1}</td>
      <td><strong>${escapeHtml(it.descripcion || 'Pieza #' + (idx + 1))}</strong></td>
      <td>${escapeHtml(it.material || obra.material || '-')}</td>
      <td class="num">${it.cantidad || 1}</td>
      <td class="num">${it.largo ? it.largo + ' ' + u : '-'}</td>
      <td class="num">${it.ancho ? it.ancho + ' ' + u : '-'}</td>
      <td class="num" style="font-weight:600">${m2Formatted} m²</td>
    </tr>
  `;
  }).join('') || '';

  return `
    <div class="doc-sheet">
      <table class="doc-header-table">
        <tr>
          <td style="width:60%">
            <div style="display:flex;align-items:center">
              <img src="${company.logoSrc}" alt="${escapeHtml(company.nombre)}" class="doc-brand-img">
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
          <div class="doc-info-row"><span class="doc-info-label">Cliente:</span><span class="doc-info-val">${cliente ? escapeHtml(`${cliente.nombre} ${cliente.apellido || ''}`) : escapeHtml(obra.clienteNombre || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Teléfono:</span><span class="doc-info-val">${escapeHtml(cliente?.telefono || cliente?.whatsapp || obra.contacto || obra.telefono || '-')}</span></div>
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
              <img src="${company.logoSrc}" alt="${escapeHtml(company.nombre)}" class="doc-brand-img">
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
          <div class="doc-info-row"><span class="doc-info-label">Cliente:</span><span class="doc-info-val">${cliente ? escapeHtml(`${cliente.nombre} ${cliente.apellido || ''}`.trim()) : escapeHtml(cobro.clienteNombre || 'Consumidor Final')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">DNI / CUIT:</span><span class="doc-info-val">${escapeHtml(cliente?.cuit || cliente?.dni || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Teléfono:</span><span class="doc-info-val">${escapeHtml(cliente?.whatsapp || cliente?.telefono || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Domicilio:</span><span class="doc-info-val">${escapeHtml(cliente?.direccion || obra?.direccion || '-')}</span></div>
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
              <img src="${company.logoSrc}" alt="${escapeHtml(company.nombre)}" class="doc-brand-img">
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
          <div class="doc-info-row"><span class="doc-info-label">Razón Social:</span><span class="doc-info-val">${prov ? escapeHtml(prov.razonSocial || prov.nombre) : escapeHtml(fac.proveedorNombre || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">CUIT:</span><span class="doc-info-val">${escapeHtml(prov?.cuit || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Contacto:</span><span class="doc-info-val">${escapeHtml(prov?.contacto || '-')}</span></div>
          <div class="doc-info-row"><span class="doc-info-label">Teléfono:</span><span class="doc-info-val">${escapeHtml(prov?.whatsapp || prov?.telefono || '-')}</span></div>
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
        .doc-brand-img {
          height: 48pt;
          max-width: 80pt;
          margin-right: 10pt;
          vertical-align: middle;
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
    let stagingWrapper = null;

    if (typeof elementOrHtml === 'string') {
      stagingWrapper = document.createElement('div');
      stagingWrapper.id = 'export-pdf-staging-wrapper';
      stagingWrapper.className = 'doc-sheet-wrapper';
      stagingWrapper.style.position = 'fixed';
      stagingWrapper.style.top = '0';
      stagingWrapper.style.left = '0';
      stagingWrapper.style.width = '210mm';
      stagingWrapper.style.zIndex = '-99999';
      stagingWrapper.style.opacity = '1';
      stagingWrapper.style.pointerEvents = 'none';
      stagingWrapper.style.backgroundColor = '#ffffff';
      stagingWrapper.style.margin = '0';
      stagingWrapper.style.padding = '0';
      stagingWrapper.innerHTML = `<div id="doc-sheet-content">${elementOrHtml}</div>`;
      document.body.appendChild(stagingWrapper);
      targetEl = stagingWrapper.querySelector('#doc-sheet-content');
    } else {
      targetEl = elementOrHtml;
    }

    // Wait for all images inside targetEl to load
    const images = targetEl.querySelectorAll('img');
    if (images.length > 0) {
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }));
    }

    // Allow browser layout and font rendering tick
    await new Promise(resolve => setTimeout(resolve, 150));

    const opt = {
      margin: [8, 8, 8, 8],
      filename: cleanFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0
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
      if (stagingWrapper && stagingWrapper.parentNode) {
        stagingWrapper.parentNode.removeChild(stagingWrapper);
      }
      return true;
    } catch (err) {
      console.error('Error generating PDF with html2pdf:', err);
      if (stagingWrapper && stagingWrapper.parentNode) {
        stagingWrapper.parentNode.removeChild(stagingWrapper);
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

// ── 7. Generador de Blob PDF ──
export async function generatePdfBlob(elementOrHtml, filename = 'documento') {
  const cleanFilename = `${filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.pdf`;

  if (typeof window.html2pdf === 'function') {
    let targetEl;
    let stagingWrapper = null;

    if (typeof elementOrHtml === 'string') {
      stagingWrapper = document.createElement('div');
      stagingWrapper.id = 'export-pdf-staging-wrapper';
      stagingWrapper.className = 'doc-sheet-wrapper';
      stagingWrapper.style.position = 'fixed';
      stagingWrapper.style.top = '0';
      stagingWrapper.style.left = '0';
      stagingWrapper.style.width = '210mm';
      stagingWrapper.style.zIndex = '-99999';
      stagingWrapper.style.opacity = '1';
      stagingWrapper.style.pointerEvents = 'none';
      stagingWrapper.style.backgroundColor = '#ffffff';
      stagingWrapper.style.margin = '0';
      stagingWrapper.style.padding = '0';
      stagingWrapper.innerHTML = `<div id="doc-sheet-content">${elementOrHtml}</div>`;
      document.body.appendChild(stagingWrapper);
      targetEl = stagingWrapper.querySelector('#doc-sheet-content');
    } else {
      targetEl = elementOrHtml;
    }

    // Wait for all images inside targetEl to load with safety timeout
    const images = targetEl.querySelectorAll('img');
    if (images.length > 0) {
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          const timer = setTimeout(resolve, 250);
          img.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
          img.addEventListener('error', () => { clearTimeout(timer); resolve(); }, { once: true });
        });
      }));
    }

    await new Promise(resolve => setTimeout(resolve, 60));

    const opt = {
      margin: [8, 8, 8, 8],
      filename: cleanFilename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 1.8,
        useCORS: true,
        logging: false,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      const pdfBlob = await window.html2pdf().set(opt).from(targetEl).outputPdf('blob');
      if (stagingWrapper && stagingWrapper.parentNode) {
        stagingWrapper.parentNode.removeChild(stagingWrapper);
      }
      return pdfBlob;
    } catch (err) {
      console.error('Error al generar Blob PDF:', err);
      if (stagingWrapper && stagingWrapper.parentNode) {
        stagingWrapper.parentNode.removeChild(stagingWrapper);
      }
      return null;
    }
  }
  return null;
}

// Helper para formatear números de teléfono a formato internacional de WhatsApp (especialmente para Argentina)
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (!clean) return '';
  // Eliminar 0 inicial si existiera
  if (clean.startsWith('0')) clean = clean.slice(1);
  // Si tiene 10 dígitos (ej. 11 4567 8901 o 351 555 0192) agregar prefijo internacional 549 (Argentina)
  if (clean.length === 10) clean = '549' + clean;
  // Si tiene prefijo país 54 pero le falta el 9 móvil (ej. 54 11 4567 8901)
  else if (clean.startsWith('54') && !clean.startsWith('549') && clean.length === 12) {
    clean = '549' + clean.slice(2);
  }
  return clean;
}

// ── 8. Compartir por WhatsApp con PDF en todos los dispositivos ──
export async function shareViaWhatsAppAndPdf({
  phone = '',
  text = '',
  htmlContent = '',
  filename = 'documento',
  title = 'Documento'
}) {
  const cleanPhone = formatWhatsAppPhone(phone);
  const cleanFilename = `${filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.pdf`;

  // Detectar si es un dispositivo móvil real (celular o tablet Android / iOS / iPadOS)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator?.userAgent || '') ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/i.test(navigator.userAgent));

  // Copiar el texto al portapapeles de inmediato por conveniencia si está disponible
  if (typeof navigator !== 'undefined' && navigator.clipboard && text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // =========================================================================
  // 1. EN CELULARES / TABLETS (Android / iOS):
  // Flujo idéntico a Hoja de Ruta:
  // 1. Mostrar 'Generando PDF...'
  // 2. Disparar el modal nativo de compartir del celular (AirDrop, WhatsApp, Mail, etc.)
  // =========================================================================
  if (isMobile) {
    // Indicador visual 'Generando PDF...'
    let loader = null;
    if (typeof document !== 'undefined' && document.body) {
      loader = document.createElement('div');
      loader.id = 'generating-pdf-overlay';
      loader.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
        z-index: 9999999; display: flex; flex-direction: column;
        align-items: center; justify-content: center; color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      loader.innerHTML = `
        <div style="background: #1C1917; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 26px 32px; text-align: center; box-shadow: 0 12px 30px rgba(0,0,0,0.5); max-width: 270px">
          <div class="spinner" style="width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #25D366; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 14px auto"></div>
          <div style="font-weight: 700; font-size: 16px; color: #fff; margin-bottom: 4px">Generando PDF...</div>
          <div style="font-size: 12px; color: #A8A29E">Preparando documento para compartir</div>
        </div>
      `;
      document.body.appendChild(loader);
    }

    let pdfFile = null;
    try {
      if (htmlContent && typeof window !== 'undefined' && typeof window.html2pdf === 'function') {
        const pdfBlob = await generatePdfBlob(htmlContent, filename);
        if (pdfBlob) {
          pdfFile = new File([pdfBlob], cleanFilename, { type: 'application/pdf' });
        }
      }
    } catch (err) {
      console.warn('Error al generar PDF en memoria:', err);
    } finally {
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }

    // Si se generó el archivo PDF y el dispositivo soporta navigator.share
    if (pdfFile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      // IMPORTANTE: En iOS Safari no se debe mezclar un cuerpo de texto largo con files porque la API de iOS rechaza el share.
      const shareData = {
        title: title || filename,
        files: [pdfFile]
      };

      let shareSuccess = false;
      try {
        if (typeof navigator.canShare !== 'function' || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          Toast.success('Compartido', 'Documento en PDF adjuntado con éxito');
          return true;
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // El usuario canceló la hoja de compartir en su teléfono
          return false;
        }
        console.warn('Intento directo de share falló o expiró activación táctil:', err);
      }

      // Si la activación táctil expiró durante la generación del PDF (frecuente en iOS):
      // Mostramos un modal de toque directo para abrir la hoja nativa inmediatamente al clic
      if (!shareSuccess && typeof document !== 'undefined' && document.body) {
        const promptModal = document.createElement('div');
        promptModal.id = 'touch-share-prompt';
        promptModal.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);
          z-index: 9999999; display: flex; align-items: center; justify-content: center;
          padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        promptModal.innerHTML = `
          <div style="background: #1C1917; border: 1px solid rgba(255,255,255,0.15); border-radius: 18px; padding: 24px; text-align: center; max-width: 320px; width: 100%; box-shadow: 0 15px 35px rgba(0,0,0,0.6)">
            <div style="font-size: 38px; margin-bottom: 8px">📄</div>
            <div style="font-weight: 700; font-size: 17px; color: #fff; margin-bottom: 6px">PDF listo para compartir</div>
            <div style="font-size: 13px; color: #A8A29E; margin-bottom: 20px; word-break: break-all">${escapeHtml(cleanFilename)}</div>
            <button id="btn-do-native-share" class="btn btn-primary" style="width: 100%; height: 48px; background: #25D366; border-color: #25D366; font-size: 15px; font-weight: 700; justify-content: center; margin-bottom: 10px">
              Compartir por WhatsApp
            </button>
            <button id="btn-cancel-native-share" class="btn btn-ghost" style="width: 100%; height: 38px; color: #A8A29E; justify-content: center; font-size: 14px">
              Cancelar
            </button>
          </div>
        `;
        document.body.appendChild(promptModal);

        return new Promise((resolve) => {
          promptModal.querySelector('#btn-do-native-share')?.addEventListener('click', async () => {
            promptModal.remove();
            try {
              await navigator.share(shareData);
              Toast.success('Compartido', 'Documento en PDF adjuntado');
              resolve(true);
            } catch (e) {
              resolve(false);
            }
          });
          promptModal.querySelector('#btn-cancel-native-share')?.addEventListener('click', () => {
            promptModal.remove();
            resolve(false);
          });
        });
      }
    }

    // Fallback únicamente si el navegador no cuenta con Web Share de archivos
    Toast.info('Abriendo WhatsApp', 'Iniciando chat en la aplicación...');
    const mobileWaUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.location.href = mobileWaUrl;
    return true;
  }

  // =========================================================================
  // 2. EN PC / MAC (ESCRITORIO):
  // Mantiene el comportamiento actual:
  // - Abre WhatsApp Web en nueva pestaña
  // - Descarga el PDF para arrastrarlo al chat
  // =========================================================================
  const desktopWaUrl = cleanPhone 
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
    : `https://web.whatsapp.com/`;

  let waWindow = null;
  try {
    waWindow = window.open(desktopWaUrl, '_blank');
  } catch (e) {
    console.warn('Bloqueador de ventanas emergentes activo:', e);
  }

  Toast.info('Abriendo WhatsApp Web', 'Preparando y descargando PDF...');

  // Descargar el archivo PDF en paralelo en la máquina del usuario (solo en PC)
  try {
    if (htmlContent) {
      await exportToPdf(htmlContent, filename);
    }
  } catch (err) {
    console.error('Error al generar PDF para descargar en PC:', err);
  }

  // Si por alguna configuración estricta de Safari o Chrome no abrió la ventana inicialmente, reintentar
  if (!waWindow || waWindow.closed) {
    try {
      window.open(desktopWaUrl, '_blank');
    } catch (e) {}
  }

  Toast.success(
    'WhatsApp Web y PDF listos',
    'Se abrió WhatsApp Web con el chat y se descargó el PDF en tu computadora para adjuntarlo.'
  );
  return true;
}

// ── 9. Abrir chat directo con el cliente / proveedor con mensaje predefinido ──
export function openDirectWhatsAppChat({ phone = '', text = '' }) {
  const cleanPhone = formatWhatsAppPhone(phone);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator?.userAgent || '') ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/i.test(navigator.userAgent));

  const url = isMobile
    ? (cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`)
    : (cleanPhone ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}` : `https://web.whatsapp.com/`);

  window.open(url, '_blank');
}


