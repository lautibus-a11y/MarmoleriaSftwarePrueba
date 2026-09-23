/* ========================================
   MARMOLERÍA BENJAMIN — Proveedores Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

export async function handleProveedores(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/proveedores/:id

  if (method === 'GET') {
    if (id) {
      const prov = await StorageService.getById(env, 'proveedores', id);
      if (!prov) return errorResponse('Proveedor no encontrado', 404, origin);
      return jsonResponse(prov, 200, origin);
    }
    const list = await StorageService.getAll(env, 'proveedores');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.nombre) return errorResponse('El nombre del proveedor es requerido', 400, origin);
    if (data.deudaInicial !== undefined && data.deudaInicial !== null && String(data.deudaInicial).trim() !== '') {
      data.deudaInicial = Math.max(0, parseFloat(data.deudaInicial) || 0);
    } else {
      data.deudaInicial = 0;
    }
    const created = await StorageService.create(env, 'proveedores', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de proveedor requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    if (data.deudaInicial !== undefined && data.deudaInicial !== null) {
      data.deudaInicial = String(data.deudaInicial).trim() === '' ? 0 : Math.max(0, parseFloat(data.deudaInicial) || 0);
    }
    const updated = await StorageService.update(env, 'proveedores', id, data);
    if (!updated) return errorResponse('Proveedor no encontrado', 404, origin);
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de proveedor requerido', 400, origin);
    const removed = await StorageService.remove(env, 'proveedores', id);
    if (!removed) return errorResponse('Proveedor no encontrado', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
