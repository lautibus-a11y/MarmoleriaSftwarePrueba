/* ========================================
   MARMOLERÍA BENJAMIN — Configuración Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleConfig(request, env, pathParts, origin) {
  const method = request.method;

  if (method === 'GET') {
    const config = await StorageService.readJSON(env, 'config');
    if (config && config.empresa_subtitulo) {
      config.empresa_subtitulo = config.empresa_subtitulo.replace(/Quarzo|Cuarzo/gi, 'Purastone');
    }
    return jsonResponse(config || {}, 200, origin);
  }

  if (method === 'POST' || method === 'PUT') {
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);

    const currentConfig = (await StorageService.readJSON(env, 'config')) || {};
    const updatedConfig = { ...currentConfig, ...data, updatedAt: new Date().toISOString() };
    await StorageService.writeJSON(env, 'config', updatedConfig);
    return jsonResponse(updatedConfig, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
