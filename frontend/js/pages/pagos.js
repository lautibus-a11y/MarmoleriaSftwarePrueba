/* ========================================
   MARMOLERÍA BENJAMIN — Pagos Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { Api } from '../services/api.js';
import { formatCurrency, formatDate, escapeHtml, debounce, resolveFileUrl, compareNewestFirst, resolveEntityContact } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderFileUpload, renderStatsCard } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Modal, previewAttachment } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { METODOS_PAGO, PAGO_ESTADO_LABELS, PAGO_ESTADO_COLORS } from '../utils/constants.js';

export function renderPagos(container, actionsEl) {
  actionsEl.innerHTML = `<button class="btn btn-primary" id="btn-new-pago">${Icons.plus} Nuevo pago</button>`;

  let pagos = DataService.getAll('pagos');
  let searchTerm = '', filterEstado = '', filterMetodo = '';

  function render() {
    pagos = DataService.getAll('pagos');
    let filtered = pagos;
    if (filterEstado) filtered = filtered.filter(p => p.estado === filterEstado);
    if (filterMetodo) filtered = filtered.filter(p => p.metodoPago === filterMetodo);
    if (searchTerm) {
      const provs = DataService.getAll('proveedores');
      filtered = filtered.filter(p => {
        const prov = p.proveedorId ? provs.find(pr => pr.id === p.proveedorId) : null;
        const contact = resolveEntityContact(prov, { proveedorNombre: p.destinatarioConcepto || p.concepto });
        const combined = `${contact.name || ''} ${p.destinatarioConcepto || ''} ${p.concepto || ''}`.toLowerCase();
        return combined.includes(searchTerm.toLowerCase());
      });
    }

    const proveedores = DataService.getAll('proveedores');
    const facturas = DataService.getAll('facturas');
    const columns = [
      {
        label: 'Destinatario / Concepto',
        render: (p) => {
          let pr = p.proveedorId ? proveedores.find(x => x.id === p.proveedorId) : null;
          if (!pr && p.facturaId) {
            const fac = facturas.find(f => f.id === p.facturaId);
            if (fac?.proveedorId) pr = proveedores.find(x => x.id === fac.proveedorId);
          }
          const contact = resolveEntityContact(pr, { proveedorNombre: p.destinatarioConcepto || p.concepto });
          const text = contact.name || p.destinatarioConcepto || p.concepto || '-';
          return `<span class="cell-primary">${escapeHtml(text)}</span>`;
        }
      },
      { label: 'Fecha', render: (p) => formatDate(p.fecha), className: 'cell-secondary' },
      { label: 'Método', render: (p) => { const m = METODOS_PAGO.find(x => x.value === p.metodoPago); return escapeHtml(m?.label || p.metodoPago); }},
      { label: 'Importe', align: 'right', render: (p) => `<span class="cell-currency">${formatCurrency(p.importe)}</span>` },
      { label: 'Estado', render: (p) => renderBadge(PAGO_ESTADO_LABELS[p.estado] || p.estado, PAGO_ESTADO_COLORS[p.estado] || 'neutral') },
      {
        label: 'Comprobante',
        align: 'center',
        render: (p) => {
          if (p.comprobanteUrl || p.comprobanteKey) {
            return `<button class="btn btn-ghost btn-icon btn-sm" data-action="view-file" data-id="${p.id}" title="Ver comprobante adjunto" style="color:#2563eb">${Icons.image}</button>`;
          }
          return '<span class="text-muted" style="font-size:12px">-</span>';
        }
      },
      { label: '', align: 'right', className: 'cell-actions', render: (p) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${p.id}" title="Editar">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${p.id}" title="Eliminar">${Icons.trash}</button>
      `}
    ];

    // Summary
    const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.importe, 0);
    const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + p.importe, 0);

    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:var(--space-4)">
        ${renderStatsCard({ icon: 'credit-card', iconColor: 'error', value: formatCurrency(totalPagado), label: 'Total pagado' })}
        ${renderStatsCard({ icon: 'file-clock', iconColor: 'warning', value: formatCurrency(totalPendiente), label: 'Pendiente de pago' })}
      </div>
      <div class="table-container">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          ${renderSearchInput('Buscar por destinatario o concepto...')}
          <select class="filter-select" id="filter-estado"><option value="">Todos los estados</option>${Object.entries(PAGO_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${filterEstado===k?'selected':''}>${v}</option>`).join('')}</select>
          <select class="filter-select" id="filter-metodo"><option value="">Todos los métodos</option>${METODOS_PAGO.map(m=>`<option value="${m.value}" ${filterMetodo===m.value?'selected':''}>${m.label}</option>`).join('')}</select>
        </div>
        <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} pagos</span></div>
      </div>
      ${renderDataTable({ columns, data: filtered.sort(compareNewestFirst), emptyMessage: 'No hay pagos registrados' })}
    </div>`;

    const si = container.querySelector('#search-input');
    if (si) { si.value = searchTerm; si.oninput = debounce(e => { searchTerm = e.target.value; render(); }, 300); }
    const fe = container.querySelector('#filter-estado');
    if (fe) fe.onchange = e => { filterEstado = e.target.value; render(); };
    const fm = container.querySelector('#filter-metodo');
    if (fm) fm.onchange = e => { filterMetodo = e.target.value; render(); };
  }

  // Escuchar eventos de cambios de datos en tiempo real
  const handleDataChanged = () => {
    if (container.isConnected) {
      render();
    } else {
      window.removeEventListener('mb-data-changed', handleDataChanged);
    }
  };
  window.addEventListener('mb-data-changed', handleDataChanged);

  container.onclick = e => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    e.stopPropagation();
    const { action, id } = btn.dataset;
    if (action === 'view-file') {
      const p = DataService.getById('pagos', id);
      if (p && (p.comprobanteUrl || p.comprobanteKey)) {
        previewAttachment({ url: p.comprobanteUrl, key: p.comprobanteKey, filename: `Comprobante_Pago_${p.destinatarioConcepto || p.id}` });
      }
      return;
    }
    if (action === 'edit') { openForm(id); return; }
    if (action === 'delete') { handleDelete(id); return; }
  };

  function openForm(editId = null) {
    const pago = (editId ? DataService.getById('pagos', editId) : null) || {};
    const isEdit = !!editId && !!pago.id;
    const proveedores = DataService.getAll('proveedores');
    const facturasDisp = DataService.getAll('facturas').filter(f => f.tipo === 'factura' && (f.estado === 'pendiente' || f.estado === 'parcial' || (pago && f.id === pago.facturaId)));

    const existingDest = (pago && (pago.destinatarioConcepto || pago.concepto)) || (pago.proveedorId ? proveedores.find(p => p.id === pago.proveedorId)?.nombre : '') || '';

    let selectedFile = null;
    let removeExistingFile = false;

    Drawer.open({
      title: isEdit ? 'Editar pago' : 'Nuevo pago',
      content: `<form id="pago-form">
        <div class="form-group">
          <label class="form-label">Destinatario / Concepto <span class="required">*</span></label>
          <input type="text" class="form-input" name="destinatarioConcepto" id="pago-destinatario-concepto" list="destinatarios-sugeridos" value="${escapeHtml(existingDest)}" placeholder="Ej: Cantera San Luis, Flete, Servicios, Sueldos..." required>
          <datalist id="destinatarios-sugeridos">
            ${proveedores.map(p => `<option value="${escapeHtml(p.nombre)}">${escapeHtml(p.razonSocial || p.nombre)}</option>`).join('')}
          </datalist>
          <span class="text-muted" style="font-size:11px;display:block;margin-top:4px">Podés escribir cualquier destinatario/concepto o seleccionar un proveedor habitual.</span>
        </div>
        <div class="form-group">
          <label class="form-label">Factura asociada (opcional)</label>
          <select class="form-select" name="facturaId" id="pago-factura-select">
            <option value="">Sin asociar</option>
            ${facturasDisp.map(f => {
              const prov = proveedores.find(p => p.id === f.proveedorId);
              const saldo = DataService.getFacturaSaldoPendiente(f.id, isEdit ? editId : null);
              const saldoInfo = (saldo < f.importe && saldo > 0) ? ` (Saldo: ${formatCurrency(saldo)})` : ` (${formatCurrency(f.importe)})`;
              return `<option value="${f.id}" ${pago.facturaId === f.id ? 'selected' : ''}>${f.numero} - ${prov?.nombre || ''}${saldoInfo}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Importe <span class="required">*</span></label><input type="number" class="form-input" name="importe" id="pago-importe-input" value="${pago.importe||''}" min="0" step="0.01" required></div>
          <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" name="fecha" value="${pago.fecha||new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Método de pago</label><select class="form-select" name="metodoPago">${METODOS_PAGO.map(m=>`<option value="${m.value}" ${(pago.metodoPago||'transferencia')===m.value?'selected':''}>${m.label}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Estado</label><select class="form-select" name="estado">${Object.entries(PAGO_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${(pago.estado||'pagado')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-textarea" name="observaciones" rows="2">${escapeHtml(pago.observaciones||'')}</textarea></div>
        <div class="form-group">
          <label class="form-label">Comprobante adjunto (Foto o PDF)</label>
          ${renderFileUpload('pago-file')}
        </div>
      </form>`,
      footer: `<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit ? 'Guardar' : 'Registrar pago'}</button>`
    });

    const zone = document.getElementById('pago-file-zone');
    const fileInput = document.getElementById('pago-file');
    const prev = document.getElementById('pago-file-preview');

    function updatePreviewUI(name, size, url = null) {
      if (!prev) return;
      prev.style.display = 'block';
      prev.innerHTML = `
        <div class="file-upload-preview" style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--color-stone-100);border:1px solid var(--color-stone-200);border-radius:var(--radius-md);margin-top:8px">
          <div style="display:flex;align-items:center;gap:10px;overflow:hidden">
            <span style="color:#2563eb">${Icons.image}</span>
            <div>
              <strong style="display:block;font-size:13px;color:var(--color-stone-900);text-overflow:ellipsis;white-space:nowrap;overflow:hidden;max-width:220px">${escapeHtml(name)}</strong>
              ${size ? `<span style="font-size:11px;color:var(--color-stone-500)">${size}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            ${url ? `<button type="button" class="btn btn-ghost btn-sm" id="btn-view-preview-file" style="color:#2563eb">${Icons.eye} Ver</button>` : ''}
            <button type="button" class="btn btn-ghost btn-sm" id="remove-pago-file" style="color:var(--color-error)">${Icons.x}</button>
          </div>
        </div>
      `;

      document.getElementById('btn-view-preview-file')?.addEventListener('click', () => {
        previewAttachment({ url, filename: name });
      });

      document.getElementById('remove-pago-file')?.addEventListener('click', () => {
        prev.style.display = 'none';
        prev.innerHTML = '';
        fileInput.value = '';
        selectedFile = null;
        removeExistingFile = true;
      });
    }

    // Show existing attached file if editing
    if (pago.comprobanteUrl || pago.comprobanteKey) {
      const existingUrl = resolveFileUrl(pago.comprobanteUrl || pago.comprobanteKey);
      updatePreviewUI('Comprobante actual', '', existingUrl);
    }

    if (zone && fileInput) {
      zone.addEventListener('click', () => fileInput.click());
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFileChosen(e.dataTransfer.files[0]);
      });
      fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFileChosen(fileInput.files[0]);
      });
    }

    // Auto-completar proveedor e importe al seleccionar una factura
    const facSelect = document.getElementById('pago-factura-select');
    if (facSelect) {
      facSelect.addEventListener('change', (e) => {
        const selectedFacId = e.target.value;
        if (!selectedFacId) return;
        const fac = DataService.getById('facturas', selectedFacId);
        if (!fac) return;

        const destInput = document.getElementById('pago-destinatario-concepto');
        const impInput = document.getElementById('pago-importe-input');
        const prov = proveedores.find(p => p.id === fac.proveedorId);

        if (destInput && (!destInput.value.trim() || destInput.value.trim() === '')) {
          destInput.value = prov ? prov.nombre : `Factura ${fac.numero}`;
        }

        if (impInput && (!impInput.value || parseFloat(impInput.value) === 0 || !isEdit)) {
          const saldo = DataService.getFacturaSaldoPendiente(fac.id, isEdit ? editId : null);
          impInput.value = saldo > 0 ? saldo : fac.importe;
        }
      });
    }

    function handleFileChosen(file) {
      selectedFile = file;
      removeExistingFile = false;
      const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
      const reader = new FileReader();
      reader.onload = (e) => {
        updatePreviewUI(file.name, sizeStr, e.target.result);
      };
      reader.readAsDataURL(file);
    }

    document.getElementById('drawer-cancel').addEventListener('click', () => Drawer.close());
    document.getElementById('drawer-save').addEventListener('click', async () => {
      const data = Object.fromEntries(new FormData(document.getElementById('pago-form')));
      const dest = (data.destinatarioConcepto || '').trim();
      if (!dest || !data.importe) { Toast.warning('Completá el destinatario/concepto y el importe'); return; }

      const saveBtn = document.getElementById('drawer-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      data.destinatarioConcepto = dest;
      data.concepto = dest;
      data.facturaId = (data.facturaId && data.facturaId.trim()) ? data.facturaId.trim() : null;
      const matched = proveedores.find(p => p.nombre.toLowerCase() === dest.toLowerCase() || (p.razonSocial && p.razonSocial.toLowerCase() === dest.toLowerCase()));
      data.proveedorId = matched ? matched.id : (pago.proveedorId || null);

      if (data.facturaId && !data.proveedorId) {
        const linkedFac = DataService.getById('facturas', data.facturaId);
        if (linkedFac?.proveedorId) data.proveedorId = linkedFac.proveedorId;
      }

      data.importe = parseFloat(data.importe);

      // Handle file attachment
      if (selectedFile) {
        saveBtn.textContent = 'Subiendo comprobante a Cloudflare R2...';
        try {
          const uploadRes = await Api.upload(selectedFile, 'comprobantes');
          data.comprobanteKey = uploadRes.key;
          data.comprobanteUrl = uploadRes.url;
        } catch (uErr) {
          console.warn('Could not upload to worker R2, using local fallback:', uErr);
          // Fallback to dataUrl so file is not lost
          const reader = new FileReader();
          data.comprobanteUrl = await new Promise(resolve => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(selectedFile);
          });
        }
      } else if (removeExistingFile) {
        data.comprobanteKey = null;
        data.comprobanteUrl = null;
      } else {
        data.comprobanteKey = pago.comprobanteKey || null;
        data.comprobanteUrl = pago.comprobanteUrl || null;
      }

      if (isEdit) {
        DataService.update('pagos', editId, data);
        Toast.success('Pago actualizado');
      } else {
        DataService.create('pagos', data);
        Toast.success('Pago registrado');
      }
      Drawer.close();
      pagos = DataService.getAll('pagos');
      render();
    });
  }

  async function handleDelete(id) {
    const p = DataService.getById('pagos', id);
    const facId = p?.facturaId;
    const confirmed = await confirmDialog({ title: 'Eliminar pago', message: '¿Estás seguro?', confirmText: 'Eliminar', type: 'danger' });
    if (confirmed) {
      DataService.remove('pagos', id);
      if (facId) {
        DataService.recalcularEstadoFactura(facId);
      }
      Toast.success('Pago eliminado');
      pagos = DataService.getAll('pagos');
      render();
    }
  }

  actionsEl.querySelector('#btn-new-pago')?.addEventListener('click', () => openForm());
  render();
}
