/* =========================================================
   MARMOLERÍA BENJAMIN — Stock Automation Service
   Automatizaciones para salida y ajuste de stock por obras
   ========================================================= */

import { Modal } from '../components/modal.js';
import { DataService } from './mockData.js';
import { Toast } from '../components/toast.js';
import { Icons } from '../components/ui.js';
import { escapeHtml } from '../utils/helpers.js';

export function openDescontarStockObraModal({ obra, presupuesto, onDone = null }) {
  const items = presupuesto?.items || [];
  const grouped = {};

  items.forEach(it => {
    const matName = (it.material || '').trim();
    if (!matName) return;
    if (!grouped[matName]) {
      grouped[matName] = {
        materialNombre: matName,
        m2Total: 0,
        piezasTotal: 0,
        descripciones: []
      };
    }
    grouped[matName].m2Total += Number(it.m2) || 0;
    grouped[matName].piezasTotal += Number(it.cantidad) || 1;
    if (it.descripcion) grouped[matName].descripciones.push(it.descripcion);
  });

  const materiales = DataService.getAll('materiales');
  const rows = Object.values(grouped).map(g => {
    const matched = materiales.find(m => m.nombre.toLowerCase().trim() === g.materialNombre.toLowerCase().trim())
                 || materiales.find(m => m.nombre.toLowerCase().includes(g.materialNombre.toLowerCase()))
                 || materiales.find(m => g.materialNombre.toLowerCase().includes(m.nombre.toLowerCase()));
    const stockActual = matched ? DataService.getStockActual(matched.id) : 0;
    const unidad = matched ? (matched.unidad === 'm2' ? 'm²' : (matched.unidad === 'metros' ? 'ml' : (matched.unidad === 'unidades' ? 'un' : matched.unidad))) : 'm²';
    const sugerido = g.m2Total > 0 ? Number(g.m2Total.toFixed(2)) : g.piezasTotal;

    return {
      ...g,
      matchedMaterial: matched,
      stockActual,
      unidad,
      sugerido
    };
  });

  if (rows.length === 0) {
    Modal.open({
      title: 'Descuento de stock por obra',
      size: 'md',
      content: `
        <div style="padding:var(--space-3);text-align:center">
          <p class="text-muted" style="margin-bottom:var(--space-4)">
            El presupuesto de esta obra no tiene materiales individuales especificados en sus ítems.
          </p>
          <p style="font-size:var(--text-sm);color:var(--color-stone-600);margin-bottom:var(--space-4)">
            Podés registrar la salida de stock manualmente en cualquier momento desde la pestaña <strong>Stock e Inventario</strong>.
          </p>
          <button class="btn btn-primary" id="btn-close-no-items">Entendido</button>
        </div>
      `
    });
    document.getElementById('btn-close-no-items')?.addEventListener('click', () => {
      Modal.close();
      if (onDone) onDone();
    });
    return;
  }

  const contentHtml = `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="padding:10px 14px;background:var(--color-stone-100);border-radius:var(--radius-md);font-size:var(--text-xs);color:var(--color-stone-700)">
        <strong>Obra #${obra.id}:</strong> ${escapeHtml(obra.descripcion || 'Sin descripción')}
        <div style="margin-top:2px;color:var(--color-stone-500)">Seleccioná los materiales y cantidades exactas a descontar del stock actual del taller.</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        ${rows.map((r, idx) => {
          const isInsuficiente = r.matchedMaterial && r.stockActual < r.sugerido;
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid ${isInsuficiente ? '#FCA5A5' : 'var(--color-stone-200)'};border-radius:var(--radius-md);background:${isInsuficiente ? '#FEF2F2' : 'var(--color-stone-50)'};gap:12px;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:10px;min-width:180px;flex:1">
                <input type="checkbox" id="chk-mat-${idx}" class="form-checkbox item-stock-chk" data-idx="${idx}" checked ${!r.matchedMaterial ? 'disabled' : ''}>
                <div>
                  <label for="chk-mat-${idx}" style="font-weight:var(--font-bold);font-size:var(--text-sm);color:var(--color-stone-900);cursor:pointer;display:block">
                    ${escapeHtml(r.materialNombre)}
                  </label>
                  ${r.matchedMaterial ? `
                    <div style="font-size:var(--text-xs);color:${isInsuficiente ? '#DC2626' : 'var(--color-stone-500)'}">
                      Stock disponible: <strong>${r.stockActual} ${r.unidad}</strong>
                      ${isInsuficiente ? ' · ⚠️ Stock bajo o insuficiente' : ''}
                    </div>
                  ` : `
                    <div style="font-size:var(--text-xs);color:#DC2626">
                      ⚠️ Material no encontrado en catálogo. Podés crearlo en Stock.
                    </div>
                  `}
                </div>
              </div>

              ${r.matchedMaterial ? `
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:var(--text-xs);color:var(--color-stone-500)">Descontar:</span>
                  <input type="number" class="form-input item-stock-qty" data-idx="${idx}" value="${r.sugerido}" step="0.01" min="0.01" style="width:90px;text-align:right;padding:4px 8px;font-weight:var(--font-bold)">
                  <span style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--color-stone-700)">${r.unidad}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div style="display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-2)">
        <button type="button" class="btn btn-secondary" id="btn-cancel-stock-modal">Omitir por ahora</button>
        <button type="button" class="btn btn-primary" id="btn-confirm-stock-modal">${Icons.check} Confirmar salida de stock</button>
      </div>
    </div>
  `;

  Modal.open({
    title: `${Icons.box} Salida de stock por obra`,
    size: 'lg',
    content: contentHtml
  });

  document.getElementById('btn-cancel-stock-modal')?.addEventListener('click', () => {
    Modal.close();
    if (onDone) onDone();
  });

  document.getElementById('btn-confirm-stock-modal')?.addEventListener('click', () => {
    let descontadosCount = 0;

    rows.forEach((r, idx) => {
      const chk = document.querySelector(`.item-stock-chk[data-idx="${idx}"]`);
      const qtyInput = document.querySelector(`.item-stock-qty[data-idx="${idx}"]`);

      if (chk && chk.checked && r.matchedMaterial && qtyInput) {
        const qty = parseFloat(qtyInput.value) || 0;
        if (qty > 0) {
          DataService.create('stockMovimientos', {
            materialId: r.matchedMaterial.id,
            tipo: 'salida',
            cantidad: qty,
            fecha: new Date().toISOString().split('T')[0],
            referencia: `Obra #${obra.id} — ${obra.descripcion || 'Sin descripción'}`,
            obraId: obra.id
          });
          descontadosCount++;
        }
      }
    });

    if (descontadosCount > 0) {
      DataService.update('obras', obra.id, { stockDescontado: true });
      Toast.success(`Se registró la salida de ${descontadosCount} material${descontadosCount > 1 ? 'es' : ''} de stock para la obra #${obra.id}`);
    } else {
      Toast.info('Aviso', 'No se descontaron materiales de stock');
    }

    Modal.close();
    if (onDone) onDone();
  });
}
