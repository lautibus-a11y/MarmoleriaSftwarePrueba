/* ========================================
   MARMOLERÍA BENJAMIN — Backups Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleBackups(request, env, pathParts, origin) {
  const method = request.method;
  const subAction = pathParts[2]; // /api/backups/restore

  if (method === 'GET') {
    const syncData = await StorageService.getSyncData(env);
    const backup = {
      empresa: 'Marmolería Benjamin',
      fecha: new Date().toISOString(),
      version: '2.0-cloud',
      data: syncData
    };
    return jsonResponse(backup, 200, origin);
  }

  if (method === 'POST' && subAction === 'restore') {
    try {
      const payload = await request.json().catch(() => null);
      if (!payload || !payload.data) {
        return errorResponse('Formato de backup inválido: falta la propiedad "data"', 400, origin);
      }

      const backupData = payload.data;
      const collections = [
        'clientes',
        'presupuestos',
        'obras',
        'materiales',
        'stockMovimientos',
        'proveedores',
        'facturas',
        'pagos',
        'cobros',
        'eventos',
        'config'
      ];

      const restored = {};
      for (const col of collections) {
        if (backupData[col] !== undefined) {
          await StorageService.writeJSON(env, col, backupData[col]);
          restored[col] = Array.isArray(backupData[col]) ? backupData[col].length : 1;
        }
      }

      return jsonResponse({
        success: true,
        message: 'Copia de seguridad restaurada correctamente',
        timestamp: new Date().toISOString(),
        restored
      }, 200, origin);
    } catch (err) {
      console.error('Error restaurando backup en R2:', err);
      return errorResponse('Error restaurando backup: ' + err.message, 500, origin);
    }
  }

  if (method === 'POST' && (subAction === 'clear' || subAction === 'reset')) {
    try {
      const collections = [
        'clientes',
        'presupuestos',
        'obras',
        'materiales',
        'stockMovimientos',
        'proveedores',
        'facturas',
        'pagos',
        'cobros',
        'eventos'
      ];
      for (const col of collections) {
        await StorageService.writeJSON(env, col, []);
      }
      return jsonResponse({
        success: true,
        message: 'Todos los datos del sistema han sido eliminados correctamente'
      }, 200, origin);
    } catch (err) {
      console.error('Error al vaciar datos en R2:', err);
      return errorResponse('Error al vaciar datos: ' + err.message, 500, origin);
    }
  }

  return errorResponse('Método no permitido', 405, origin);
}
