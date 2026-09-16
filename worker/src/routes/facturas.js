/* ========================================
   MARMOLERÍA BENJAMIN — Facturas Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleFacturas(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/facturas/:id

  if (method === 'GET') {
    if (id) {
      const fac = await StorageService.getById(env, 'facturas', id);
      if (!fac) return errorResponse('Factura no encontrada', 404, origin);
      return jsonResponse(fac, 200, origin);
    }
    const list = await StorageService.getAll(env, 'facturas');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.proveedorId || data.importe === undefined) {
      return errorResponse('Proveedor e importe son requeridos', 400, origin);
    }
    const created = await StorageService.create(env, 'facturas', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de factura requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    const updated = await StorageService.update(env, 'facturas', id, data);
    if (!updated) return errorResponse('Factura no encontrada', 404, origin);
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de factura requerido', 400, origin);
    const removed = await StorageService.remove(env, 'facturas', id);
    if (!removed) return errorResponse('Factura no encontrada', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
