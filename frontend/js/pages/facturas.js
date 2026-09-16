/* ========================================
   MARMOLERÍA BENJAMIN — Facturas Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { Api } from '../services/api.js';
import { formatCurrency, formatDate, escapeHtml, debounce, resolveFileUrl } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderFileUpload } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Modal, previewAttachment } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { DocumentModal } from '../components/documentModal.js';
import { generateFacturaHtml } from '../services/documentExporter.js';
import { FACTURA_TIPO_LABELS, FACTURA_ESTADOS, FACTURA_ESTADO_LABELS, FACTURA_ESTADO_COLORS, FACTURA_CATEGORIAS, MONEDAS } from '../utils/constants.js';

export function renderFacturas(container, actionsEl) {
  actionsEl.innerHTML = `
    <button class="btn btn-secondary" id="btn-new-nc">${Icons.plus} Nota Crédito</button>
    <button class="btn btn-secondary" id="btn-new-nd">${Icons.plus} Nota Débito</button>
    <button class="btn btn-primary" id="btn-new-fac">${Icons.plus} Nueva factura</button>
  `;

  let facturas = DataService.getAll('facturas');
  let searchTerm = '', filterEstado = '', filterTipo = '';

  function render() {
    let filtered = facturas;
    if (filterEstado) filtered = filtered.filter(f => f.estado === filterEstado);
    if (filterTipo) filtered = filtered.filter(f => f.tipo === filterTipo);
    if (searchTerm) {
      const provs = DataService.getAll('proveedores');
      filtered = filtered.filter(f => {
        const prov = provs.find(p => p.id === f.proveedorId);
        return `${f.numero} ${prov?.nombre||''} ${f.observaciones||''}`.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    const proveedores = DataService.getAll('proveedores');
    const columns = [
      { label: 'Tipo', render: (f) => renderBadge(FACTURA_TIPO_LABELS[f.tipo], f.tipo==='nota_credito'?'success':f.tipo==='nota_debito'?'warning':'neutral') },
      { label: 'Número', render: (f) => `<span class="cell-mono">${escapeHtml(f.numero)}</span>` },
      { label: 'Proveedor', render: (f) => { const p = proveedores.find(p=>p.id===f.proveedorId); return escapeHtml(p?.nombre||'-'); }},
      { label: 'Fecha', render: (f) => formatDate(f.fecha), className: 'cell-secondary' },
      { label: 'Vencimiento', render: (f) => {
        if (!f.vencimiento) return '-';
        const isVencido = new Date(f.vencimiento) < new Date() && f.estado === 'pendiente';
        return `<span style="color:${isVencido?'var(--color-error)':''}">${formatDate(f.vencimiento)}</span>`;
      }},
      { label: 'Importe', align: 'right', render: (f) => `<span class="cell-currency">${formatCurrency(f.importe)}</span>` },
      { label: 'Estado', render: (f) => renderBadge(FACTURA_ESTADO_LABELS[f.estado]||f.estado, FACTURA_ESTADO_COLORS[f.estado]||'neutral') },
      {
        label: 'Adjunto',
        align: 'center',
        render: (f) => {
          if (f.archivoUrl || f.archivoKey) {
            return `<button class="btn btn-ghost btn-icon btn-sm" data-action="view-file" data-id="${f.id}" title="Ver factura adjunta" style="color:#2563eb">${Icons.image}</button>`;
          }
          return '<span class="text-muted" style="font-size:12px">-</span>';
        }
      },
      { label: '', align: 'right', className: 'cell-actions', render: (f) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="export" data-id="${f.id}" title="Comprobante PDF / Word">${Icons.download}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${f.id}" title="Editar">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${f.id}" title="Eliminar">${Icons.trash}</button>
      `}
    ];

    container.innerHTML = `<div class="table-container">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          ${renderSearchInput('Buscar factura...')}
          <select class="filter-select" id="filter-tipo"><option value="">Todos los tipos</option>${Object.entries(FACTURA_TIPO_LABELS).map(([k,v])=>`<option value="${k}" ${filterTipo===k?'selected':''}>${v}</option>`).join('')}</select>
          <select class="filter-select" id="filter-estado"><option value="">Todos los estados</option>${Object.entries(FACTURA_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${filterEstado===k?'selected':''}>${v}</option>`).join('')}</select>
        </div>
        <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} registros</span></div>
      </div>
      ${renderDataTable({ columns, data: filtered.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)), emptyMessage: 'No hay facturas registradas' })}
    </div>`;

    const si = container.querySelector('#search-input');
    if (si) { si.value = searchTerm; si.addEventListener('input', debounce(e => { searchTerm = e.target.value; render(); }, 300)); }
    container.querySelector('#filter-tipo')?.addEventListener('change', e => { filterTipo = e.target.value; render(); });
    container.querySelector('#filter-estado')?.addEventListener('change', e => { filterEstado = e.target.value; render(); });
    container.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]'); if (!btn) return;
      if (btn.dataset.action === 'view-file') {
        const f = DataService.getById('facturas', btn.dataset.id);
        if (f && (f.archivoUrl || f.archivoKey)) {
          previewAttachment({ url: f.archivoUrl, key: f.archivoKey, filename: `Factura_${f.numero || f.id}` });
        }
      }
      if (btn.dataset.action === 'export') {
        const f = DataService.getById('facturas', btn.dataset.id);
        if (!f) return;
        const prov = f.proveedorId ? DataService.getById('proveedores', f.proveedorId) : null;
        DocumentModal.open({
          title: `Comprobante ${f.numero || f.id}`,
          filename: `Comprobante_${f.numero || f.id}`,
          htmlContent: generateFacturaHtml(f, prov)
        });
      }
      if (btn.dataset.action === 'edit') openForm(btn.dataset.id);
      if (btn.dataset.action === 'delete') handleDelete(btn.dataset.id);
    });
  }

  function openForm(editId = null, defaultTipo = 'factura') {
    const fac = (editId ? DataService.getById('facturas', editId) : null) || { tipo: defaultTipo };
    const isEdit = !!editId && !!fac.id;
    const proveedores = DataService.getAll('proveedores');

    let selectedFile = null;
    let removeExistingFile = false;

    Drawer.open({
      title: isEdit ? `Editar ${FACTURA_TIPO_LABELS[fac.tipo] || 'factura'}` : `Nueva ${FACTURA_TIPO_LABELS[defaultTipo] || 'factura'}`,
      size: 'lg',
      content: `<form id="fac-form">
        <div class="form-group"><label class="form-label">Proveedor <span class="required">*</span></label><select class="form-select" name="proveedorId"><option value="">Seleccionar...</option>${proveedores.map(p=>`<option value="${p.id}" ${fac.proveedorId===p.id?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}</select></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" name="tipo">${Object.entries(FACTURA_TIPO_LABELS).map(([k,v])=>`<option value="${k}" ${(fac.tipo||defaultTipo)===k?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Número <span class="required">*</span></label><input type="text" class="form-input" name="numero" value="${escapeHtml(fac.numero||'')}" placeholder="A-0001-00000001"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" name="fecha" value="${fac.fecha||new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label class="form-label">Vencimiento</label><input type="date" class="form-input" name="vencimiento" value="${fac.vencimiento||''}"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Importe <span class="required">*</span></label><input type="number" class="form-input" name="importe" value="${fac.importe||''}" min="0" step="0.01"></div>
          <div class="form-group"><label class="form-label">Moneda</label><select class="form-select" name="moneda">${MONEDAS.map(m=>`<option value="${m.value}" ${fac.moneda===m.value?'selected':''}>${m.label}</option>`).join('')}</select></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Categoría</label><select class="form-select" name="categoria"><option value="">-</option>${FACTURA_CATEGORIAS.map(c=>`<option value="${c.value}" ${fac.categoria===c.value?'selected':''}>${c.label}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Estado</label><select class="form-select" name="estado">${Object.entries(FACTURA_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${(fac.estado||'pendiente')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-textarea" name="observaciones" rows="2">${escapeHtml(fac.observaciones||'')}</textarea></div>
        <div class="form-group">
          <label class="form-label">Archivo adjunto (Factura / Comprobante)</label>
          ${renderFileUpload('fac-file')}
        </div>
      </form>`,
      footer: `<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit ? 'Guardar' : 'Crear'}</button>`
    });

    const zone = document.getElementById('fac-file-zone');
    const fileInput = document.getElementById('fac-file');
    const prev = document.getElementById('fac-file-preview');

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
            <button type="button" class="btn btn-ghost btn-sm" id="remove-fac-file" style="color:var(--color-error)">${Icons.x}</button>
          </div>
        </div>
      `;

      document.getElementById('btn-view-preview-file')?.addEventListener('click', () => {
        previewAttachment({ url, filename: name });
      });

      document.getElementById('remove-fac-file')?.addEventListener('click', () => {
        prev.style.display = 'none';
        prev.innerHTML = '';
        fileInput.value = '';
        selectedFile = null;
        removeExistingFile = true;
      });
    }

    // Show existing file if editing
    if (fac.archivoUrl || fac.archivoKey) {
      const existingUrl = resolveFileUrl(fac.archivoUrl || fac.archivoKey);
      updatePreviewUI('Factura adjunta actual', '', existingUrl);
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
      const data = Object.fromEntries(new FormData(document.getElementById('fac-form')));
      if (!data.proveedorId || !data.numero || !data.importe) {
        Toast.warning('Completá los campos obligatorios');
        return;
      }

      const saveBtn = document.getElementById('drawer-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      data.importe = parseFloat(data.importe);

      // Handle file attachment upload to Cloudflare R2
      if (selectedFile) {
        saveBtn.textContent = 'Subiendo factura a Cloudflare R2...';
        try {
          const uploadRes = await Api.upload(selectedFile, 'facturas');
          data.archivoKey = uploadRes.key;
          data.archivoUrl = uploadRes.url;
        } catch (uErr) {
          console.warn('Could not upload file to R2, saving local fallback:', uErr);
          const reader = new FileReader();
          data.archivoUrl = await new Promise(resolve => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(selectedFile);
          });
        }
      } else if (removeExistingFile) {
        data.archivoKey = null;
        data.archivoUrl = null;
      } else {
        data.archivoKey = fac.archivoKey || null;
        data.archivoUrl = fac.archivoUrl || null;
      }

      if (isEdit) {
        DataService.update('facturas', editId, data);
        Toast.success('Factura actualizada');
      } else {
        DataService.create('facturas', data);
        Toast.success('Factura registrada');
      }
      Drawer.close();
      facturas = DataService.getAll('facturas');
      render();
    });
  }

  async function handleDelete(id) {
    const confirmed = await confirmDialog({ title: 'Eliminar registro', message: '¿Estás seguro?', confirmText: 'Eliminar', type: 'danger' });
    if (confirmed) {
      DataService.remove('facturas', id);
      Toast.success('Registro eliminado');
      facturas = DataService.getAll('facturas');
      render();
    }
  }

  setTimeout(() => {
    document.getElementById('btn-new-fac')?.addEventListener('click', () => openForm(null, 'factura'));
    document.getElementById('btn-new-nc')?.addEventListener('click', () => openForm(null, 'nota_credito'));
    document.getElementById('btn-new-nd')?.addEventListener('click', () => openForm(null, 'nota_debito'));
  }, 100);

  render();
}
