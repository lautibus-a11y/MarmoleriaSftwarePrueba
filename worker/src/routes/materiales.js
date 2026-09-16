/* ========================================
   MARMOLERÍA BENJAMIN — Materiales Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleMateriales(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/materiales/:id

  if (method === 'GET') {
    if (id) {
      const mat = await StorageService.getById(env, 'materiales', id);
      if (!mat) return errorResponse('Material no encontrado', 404, origin);
      return jsonResponse(mat, 200, origin);
    }
    const list = await StorageService.getAll(env, 'materiales');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.nombre) return errorResponse('El nombre del material es requerido', 400, origin);
    
    // Ensure unit and price attributes are present
    if (data.precioM2 !== undefined && data.precioVenta === undefined) {
      data.precioVenta = data.precioM2;
    }
    if (!data.unidad) data.unidad = 'm2';

    const created = await StorageService.create(env, 'materiales', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de material requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);

    if (data.precioM2 !== undefined && data.precioVenta === undefined) {
      data.precioVenta = data.precioM2;
    }

    const updated = await StorageService.update(env, 'materiales', id, data);
    if (!updated) return errorResponse('Material no encontrado', 404, origin);
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de material requerido', 400, origin);
    const removed = await StorageService.remove(env, 'materiales', id);
    if (!removed) return errorResponse('Material no encontrado', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
