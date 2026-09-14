/* ========================================
   MARMOLERÍA BENJAMIN — Configuración Page
   ======================================== */

import { Icons } from '../components/ui.js';
import { Toast } from '../components/toast.js';
import { Auth } from '../services/auth.js';
import { CONDICIONES_COMERCIALES_DEFAULT } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

// Simple local storage for config
const CONFIG_KEY = 'mb_config';

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
  } catch { return {}; }
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function renderConfiguracion(container, actionsEl) {
  const config = loadConfig();

  container.innerHTML = `
    <div class="config-section">
      <div class="config-section-header"><h3 class="config-section-title">${Icons.settings} Datos de la empresa</h3></div>
      <div class="config-section-body">
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
      <div class="config-section-header"><h3 class="config-section-title">${Icons.download} Backups</h3></div>
      <div class="config-section-body">
        <p style="color:var(--color-stone-600);margin-bottom:var(--space-4)">Descargá una copia de seguridad de todos los datos del sistema.</p>
        <button class="btn btn-secondary" id="btn-download-backup">${Icons.download} Descargar backup</button>
        <p class="form-hint mt-2">La descarga incluye todos los datos en formato JSON. Los archivos adjuntos no se incluyen.</p>
      </div>
    </div>

    <div class="config-section">
      <div class="config-section-header"><h3 class="config-section-title" style="color:var(--color-error)">${Icons['log-out']} Sesión</h3></div>
      <div class="config-section-body">
        <p style="color:var(--color-stone-600);margin-bottom:var(--space-4)">Usuario actual: <strong>${escapeHtml(Auth.getUser()?.name || 'Admin')}</strong></p>
        <button class="btn btn-danger" id="btn-logout-config">${Icons['log-out']} Cerrar sesión</button>
      </div>
    </div>
  `;

  // Save empresa
  document.getElementById('config-empresa').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const cfg = loadConfig();
    saveConfig({ ...cfg, ...data });
    Toast.success('Datos guardados');
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

  // Download backup
  document.getElementById('btn-download-backup').addEventListener('click', () => {
    try {
      // Import mock data
      import('../services/mockData.js').then(({ DataService }) => {
        const backup = {
          fecha: new Date().toISOString(),
          version: '1.0',
          data: {
            clientes: DataService.getAll('clientes'),
            presupuestos: DataService.getAll('presupuestos'),
            obras: DataService.getAll('obras'),
            materiales: DataService.getAll('materiales'),
            stockMovimientos: DataService.getAll('stockMovimientos'),
            proveedores: DataService.getAll('proveedores'),
            facturas: DataService.getAll('facturas'),
            pagos: DataService.getAll('pagos'),
            cobros: DataService.getAll('cobros')
          }
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-marmoleria-benjamin-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('Backup descargado');
      });
    } catch (err) {
      Toast.error('Error al generar backup');
    }
  });

  // Logout
  document.getElementById('btn-logout-config').addEventListener('click', () => {
    Auth.logout();
    window.location.hash = '';
    window.location.reload();
  });
}
