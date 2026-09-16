/* ========================================
   MARMOLERÍA BENJAMIN — Configuración Page
   ======================================== */

import { Icons } from '../components/ui.js';
import { Toast } from '../components/toast.js';
import { CONDICIONES_COMERCIALES_DEFAULT } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';
import { LOGO_URL } from '../utils/logo.js';
import { Api } from '../services/api.js';

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
      <div class="config-section-header"><h3 class="config-section-title">${Icons.download} Backups</h3></div>
      <div class="config-section-body">
        <p style="color:var(--color-stone-600);margin-bottom:var(--space-4)">Descargá una copia de seguridad de todos los datos del sistema.</p>
        <button class="btn btn-secondary" id="btn-download-backup">${Icons.download} Descargar backup completo</button>
        <p class="form-hint mt-2">La descarga incluye todos los datos (clientes, presupuestos, obras, materiales, stock, proveedores, facturas, pagos, cobros, eventos de calendario y configuración) en formato JSON.</p>
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
}
