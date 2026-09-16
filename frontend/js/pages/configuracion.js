/* ========================================
   MARMOLERÍA BENJAMIN — Configuración Page
   ======================================== */

import { Icons } from '../components/ui.js';
import { Toast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { CONDICIONES_COMERCIALES_DEFAULT } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';
import { LOGO_URL } from '../utils/logo.js';
import { Api } from '../services/api.js';
import { DataService } from '../services/mockData.js';

const CONFIG_KEY = 'mb_config';

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
  } catch { return {}; }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  // Async update in Cloudflare Worker R2
  Api.post('/config', cfg).catch(err => {
    console.warn('Could not sync config to API:', err.message);
  });
}

export function renderConfiguracion(container, actionsEl) {
  const config = loadConfig();
  const currentApiUrl = Api.getBaseUrl();

  container.innerHTML = `
    <div class="config-section">
      <div class="config-section-header"><h3 class="config-section-title">${Icons.settings} Datos de la empresa</h3></div>
      <div class="config-section-body">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:var(--space-4);padding:14px;background:var(--color-stone-100);border-radius:var(--radius-md);border:1px solid var(--color-stone-200)">
          <img src="${LOGO_URL}" alt="Logo oficial" style="height:64px;width:64px;object-fit:contain;background:#ffffff;padding:4px;border-radius:var(--radius-md);border:1px solid var(--color-stone-200);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
          <div>
            <strong style="display:block;font-size:14px;color:var(--color-stone-900)">Logo oficial del sistema</strong>
            <span style="font-size:12px;color:var(--color-stone-500)">Se aplica automáticamente en la barra lateral, favicons y en los membretes oficiales de Presupuestos, Fichas de Obra y Recibos (PDF y Word).</span>
          </div>
        </div>
        <form id="config-empresa">
          <div class="form-row-2">
            <div class="form-group"><label class="form-label">Nombre</label><input type="text" class="form-input" name="empresa_nombre" value="${escapeHtml(config.empresa_nombre||'Marmolería Benjamin')}"></div>
            <div class="form-group"><label class="form-label">CUIT</label><input type="text" class="form-input" name="empresa_cuit" value="${escapeHtml(config.empresa_cuit||'')}"></div>
          </div>
          <div class="form-group"><label class="form-label">Dirección</label><input type="text" class="form-input" name="empresa_direccion" value="${escapeHtml(config.empresa_direccion||'')}"></div>
          <div class="form-row-2">
            <div class="form-group"><label class="form-label">Teléfono</label><input type="text" class="form-input" name="empresa_telefono" value="${escapeHtml(config.empresa_telefono||'')}"></div>
            <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="empresa_email" value="${escapeHtml(config.empresa_email||'')}"></div>
          </div>
          <button type="submit" class="btn btn-primary mt-4">Guardar datos</button>
        </form>
      </div>
    </div>

    <div class="config-section">
      <div class="config-section-header"><h3 class="config-section-title">${Icons['file-text']} Condiciones comerciales por defecto</h3></div>
      <div class="config-section-body">
        <form id="config-condiciones">
          <div class="form-group">
            <label class="form-label">Condiciones para presupuestos</label>
            <textarea class="form-textarea" name="condiciones" rows="6">${escapeHtml(config.condiciones || CONDICIONES_COMERCIALES_DEFAULT.join('\n'))}</textarea>
            <p class="form-hint">Estas condiciones se incluirán automáticamente en cada nuevo presupuesto.</p>
          </div>
          <button type="submit" class="btn btn-primary">Guardar condiciones</button>
        </form>
      </div>
    </div>

    <div class="config-section">
      <div class="config-section-header"><h3 class="config-section-title">${Icons['dollar-sign']} Cotización del dólar</h3></div>
      <div class="config-section-body">
        <form id="config-dolar">
          <div class="form-group" style="max-width:300px">
            <label class="form-label">Cotización actual (ARS por USD)</label>
            <input type="number" class="form-input" name="cotizacionDolar" value="${config.cotizacionDolar||''}" placeholder="1350" min="0" step="0.01">
            <p class="form-hint">Se usará como referencia en presupuestos en dólares.</p>
          </div>
          <button type="submit" class="btn btn-primary">Guardar cotización</button>
        </form>
      </div>
    </div>

    <div class="config-section">
      <div class="config-section-header"><h3 class="config-section-title">${Icons.settings} Servidor Cloudflare Worker & R2</h3></div>
      <div class="config-section-body">
        <form id="config-api">
          <div class="form-group">
            <label class="form-label">URL del Backend / API</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <input type="text" class="form-input" name="apiUrl" id="input-api-url" value="${escapeHtml(currentApiUrl)}" style="flex:1;min-width:260px" placeholder="/api o https://marmoleria-benjamin-api.workers.dev">
              <button type="button" class="btn btn-secondary" id="btn-test-api">Probar conexión</button>
              <button type="submit" class="btn btn-primary">Guardar URL</button>
            </div>
            <p class="form-hint">Por defecto <code>/api</code>. Si tu Cloudflare Worker tiene un subdominio propio en <code>workers.dev</code>, ingresalo aquí.</p>
            <div id="api-test-result" style="margin-top:8px;font-size:13px"></div>
          </div>
        </form>
      </div>
    </div>

    <div class="config-section">
      <div class="config-section-header"><h3 class="config-section-title">${Icons.download} Copias de seguridad y Restauración</h3></div>
      <div class="config-section-body">
        <p style="color:var(--color-stone-600);margin-bottom:var(--space-4)">
          Descargá un resguardo completo de todos los datos en formato JSON o restaurá una copia previa con 1 clic.
        </p>

        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-3)">
          <button class="btn btn-secondary" id="btn-download-backup">${Icons.download} Descargar backup completo</button>
          <label class="btn btn-secondary" for="input-restore-backup" style="cursor:pointer;margin:0;display:inline-flex;align-items:center;gap:6px">
            ${Icons.upload} Restaurar desde archivo JSON
          </label>
          <input type="file" id="input-restore-backup" accept=".json" style="display:none">
        </div>

        <p class="form-hint">
          La copia de seguridad incluye todos los registros (clientes, presupuestos, obras, materiales, stock, proveedores, facturas, pagos, cobros, eventos y configuración) generados directamente desde Cloudflare R2.
        </p>
      </div>
    </div>
  `;

  // Save empresa
  document.getElementById('config-empresa').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const cfg = loadConfig();
    saveConfig({ ...cfg, ...data });
    Toast.success('Datos de empresa guardados');
  });

  // Save condiciones
  document.getElementById('config-condiciones').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const cfg = loadConfig();
    saveConfig({ ...cfg, condiciones: data.condiciones });
    Toast.success('Condiciones guardadas');
  });

  // Save dolar
  document.getElementById('config-dolar').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const cfg = loadConfig();
    saveConfig({ ...cfg, cotizacionDolar: parseFloat(data.cotizacionDolar) || null });
    Toast.success('Cotización guardada');
  });

  // Save API URL
  document.getElementById('config-api').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('input-api-url').value.trim();
    Api.setBaseUrl(url || '/api');
    Toast.success('Configuración de API guardada');
  });

  // Test API
  document.getElementById('btn-test-api').addEventListener('click', async () => {
    const resultEl = document.getElementById('api-test-result');
    resultEl.innerHTML = '<span style="color:var(--color-stone-500)">Probando conexión...</span>';
    const originalUrl = Api.getBaseUrl();
    const testUrl = document.getElementById('input-api-url').value.trim() || '/api';
    Api.setBaseUrl(testUrl);

    try {
      const res = await Api.get('/health');
      resultEl.innerHTML = `<span style="color:#15803d;font-weight:bold">✅ Conexión exitosa: ${escapeHtml(res.app || 'API Activa')} (${res.status})</span>`;
      Toast.success('Conexión con Cloudflare Worker exitosa');
    } catch (err) {
      Api.setBaseUrl(originalUrl);
      resultEl.innerHTML = `<span style="color:#b91c1c;font-weight:bold">⚠️ No se pudo conectar: ${escapeHtml(err.message)}</span>`;
      Toast.error('Error al conectar con la API');
    }
  });

  // Download backup
  document.getElementById('btn-download-backup').addEventListener('click', async () => {
    try {
      let backupData = null;

      // Try downloading from worker first
      try {
        backupData = await Api.get('/backups');
      } catch (e) {
        console.warn('API backup failed, generating from client DataService');
      }

      if (!backupData) {
        const { DataService } = await import('../services/mockData.js');
        backupData = {
          empresa: 'Marmolería Benjamin',
          fecha: new Date().toISOString(),
          version: '2.0',
          data: {
            clientes: DataService.getAll('clientes'),
            presupuestos: DataService.getAll('presupuestos'),
            obras: DataService.getAll('obras'),
            materiales: DataService.getAll('materiales'),
            stockMovimientos: DataService.getAll('stockMovimientos'),
            proveedores: DataService.getAll('proveedores'),
            facturas: DataService.getAll('facturas'),
            pagos: DataService.getAll('pagos'),
            cobros: DataService.getAll('cobros'),
            eventos: DataService.getAll('eventos'),
            config: loadConfig()
          }
        };
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-marmoleria-benjamin-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success('Backup descargado correctamente');
    } catch (err) {
      Toast.error('Error al generar backup: ' + err.message);
    }
  });

  // Restore backup from JSON file
  document.getElementById('input-restore-backup')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const backupData = parsed.data || parsed;
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('El archivo no contiene un formato de backup válido');
      }

      const summary = [
        { label: 'Clientes', count: backupData.clientes?.length || 0 },
        { label: 'Presupuestos', count: backupData.presupuestos?.length || 0 },
        { label: 'Obras', count: backupData.obras?.length || 0 },
        { label: 'Materiales', count: backupData.materiales?.length || 0 },
        { label: 'Movimientos de Stock', count: backupData.stockMovimientos?.length || 0 },
        { label: 'Proveedores', count: backupData.proveedores?.length || 0 },
        { label: 'Facturas', count: backupData.facturas?.length || 0 },
        { label: 'Pagos', count: backupData.pagos?.length || 0 },
        { label: 'Cobros', count: backupData.cobros?.length || 0 },
        { label: 'Eventos de Calendario', count: backupData.eventos?.length || 0 }
      ];

      const totalItems = summary.reduce((sum, s) => sum + s.count, 0);

      Modal.open({
        title: '⚠️ Confirmar Restauración de Datos',
        size: 'md',
        content: `
          <div style="display:flex;flex-direction:column;gap:var(--space-3)">
            <div style="padding:12px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:var(--radius-md);color:#991B1B;font-size:var(--text-xs)">
              <strong>Atención:</strong> Esta acción reemplazará los datos actuales por los contenidos en este archivo de respaldo (total: <strong>${totalItems} registros</strong>).
            </div>

            <div style="font-size:var(--text-xs);color:var(--color-stone-700)">
              <strong>Registros detectados en el archivo:</strong>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:var(--text-xs);background:var(--color-stone-100);padding:10px;border-radius:var(--radius-md)">
              ${summary.map(s => `
                <div>${s.label}: <strong>${s.count}</strong></div>
              `).join('')}
            </div>

            <div style="display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-3)">
              <button type="button" class="btn btn-secondary" id="btn-cancel-restore">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btn-confirm-restore" style="background:#DC2626;border-color:#DC2626">
                ${Icons.check} Sí, restaurar todo
              </button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-restore')?.addEventListener('click', () => {
        Modal.close();
        e.target.value = '';
      });

      document.getElementById('btn-confirm-restore')?.addEventListener('click', async () => {
        Modal.close();
        Toast.info('Restaurando copia', 'Guardando datos en Cloudflare R2...');

        try {
          // Send to Worker restore API
          await Api.post('/backups/restore', { data: backupData });

          // Synchronize local memory with new R2 data
          await DataService.syncAll();

          // If backup had config, restore it locally as well
          if (backupData.config) {
            saveConfig(backupData.config);
          }

          Toast.success('¡Copia de seguridad restaurada con éxito!');
          setTimeout(() => {
            window.location.reload();
          }, 800);
        } catch (err) {
          console.error('Restore failed:', err);
          Toast.error('Error al restaurar: ' + err.message);
        } finally {
          e.target.value = '';
        }
      });
    } catch (err) {
      Toast.error('Error al leer archivo JSON: ' + err.message);
      e.target.value = '';
    }
  });
}
