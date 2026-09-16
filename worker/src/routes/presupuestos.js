/* ========================================
   MARMOLERÍA BENJAMIN — Presupuestos Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handlePresupuestos(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/presupuestos/:id

  if (method === 'GET') {
    if (id) {
      const pres = await StorageService.getById(env, 'presupuestos', id);
      if (!pres) return errorResponse('Presupuesto no encontrado', 404, origin);
      return jsonResponse(pres, 200, origin);
    }
    const list = await StorageService.getAll(env, 'presupuestos');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.clienteId) return errorResponse('El cliente es requerido', 400, origin);

    // Auto-generate consecutive number if not provided
    if (!data.numero) {
      const all = await StorageService.getAll(env, 'presupuestos');
      const year = new Date().getFullYear();
      const currentYearCount = all.filter(p => p.numero && p.numero.includes(year.toString())).length + 1;
      data.numero = `PRES-${year}-${String(currentYearCount).padStart(4, '0')}`;
    }

    const created = await StorageService.create(env, 'presupuestos', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de presupuesto requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    const updated = await StorageService.update(env, 'presupuestos', id, data);
    if (!updated) return errorResponse('Presupuesto no encontrado', 404, origin);
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de presupuesto requerido', 400, origin);
    const removed = await StorageService.remove(env, 'presupuestos', id);
    if (!removed) return errorResponse('Presupuesto no encontrado', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
