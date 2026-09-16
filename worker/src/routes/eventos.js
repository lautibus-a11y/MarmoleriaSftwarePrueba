/* ========================================
   MARMOLERÍA BENJAMIN — Eventos (Calendario) Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleEventos(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/eventos/:id

  if (method === 'GET') {
    if (id) {
      const evt = await StorageService.getById(env, 'eventos', id);
      if (!evt) return errorResponse('Evento no encontrado', 404, origin);
      return jsonResponse(evt, 200, origin);
    }
    const list = await StorageService.getAll(env, 'eventos');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.tipo || !data.fecha) {
      return errorResponse('Tipo y fecha del evento son requeridos', 400, origin);
    }
    const created = await StorageService.create(env, 'eventos', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de evento requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    const updated = await StorageService.update(env, 'eventos', id, data);
    if (!updated) return errorResponse('Evento no encontrado', 404, origin);
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de evento requerido', 400, origin);
    const removed = await StorageService.remove(env, 'eventos', id);
    if (!removed) return errorResponse('Evento no encontrado', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
