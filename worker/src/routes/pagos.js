/* ========================================
   MARMOLERÍA BENJAMIN — Pagos Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

async function updateFacturaEstadoOnServer(env, facturaId) {
  if (!facturaId) return;
  try {
    const fac = await StorageService.getById(env, 'facturas', facturaId);
    if (!fac || fac.tipo !== 'factura') return;

    const pagos = await StorageService.getAll(env, 'pagos');
    const facPagos = pagos.filter(p => p && String(p.facturaId) === String(facturaId) && p.estado === 'pagado');
    const totalPagado = facPagos.reduce((sum, p) => sum + (parseFloat(p.importe) || 0), 0);
    const importeFac = parseFloat(fac.importe) || 0;

    let nuevoEstado = fac.estado;
    if (importeFac > 0 && totalPagado >= (importeFac - 0.01)) {
      nuevoEstado = 'pagada';
    } else if (totalPagado > 0) {
      nuevoEstado = 'parcial';
    } else if (fac.estado === 'pagada' || fac.estado === 'parcial' || fac.estado === 'pagado') {
      const isVencida = fac.vencimiento && (new Date(fac.vencimiento) < new Date());
      nuevoEstado = isVencida ? 'vencida' : 'pendiente';
    }

    if (fac.estado !== nuevoEstado) {
      await StorageService.update(env, 'facturas', fac.id, { estado: nuevoEstado });
    }
  } catch (err) {
    console.warn('Error recalculating factura status on server:', err);
  }
}

export async function handlePagos(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/pagos/:id

  if (method === 'GET') {
    if (id) {
      const pago = await StorageService.getById(env, 'pagos', id);
      if (!pago) return errorResponse('Pago no encontrado', 404, origin);
      return jsonResponse(pago, 200, origin);
    }
    const list = await StorageService.getAll(env, 'pagos');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || data.importe === undefined) {
      return errorResponse('El importe es requerido', 400, origin);
    }
    const created = await StorageService.create(env, 'pagos', data);
    if (created && created.facturaId) {
      await updateFacturaEstadoOnServer(env, created.facturaId);
    }
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de pago requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    const oldPago = await StorageService.getById(env, 'pagos', id);
    const updated = await StorageService.update(env, 'pagos', id, data);
    if (!updated) return errorResponse('Pago no encontrado', 404, origin);

    if (updated.facturaId) await updateFacturaEstadoOnServer(env, updated.facturaId);
    if (oldPago?.facturaId && oldPago.facturaId !== updated.facturaId) {
      await updateFacturaEstadoOnServer(env, oldPago.facturaId);
    }
    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de pago requerido', 400, origin);
    const oldPago = await StorageService.getById(env, 'pagos', id);
    const removed = await StorageService.remove(env, 'pagos', id);
    if (!removed) return errorResponse('Pago no encontrado', 404, origin);

    if (oldPago?.facturaId) {
      await updateFacturaEstadoOnServer(env, oldPago.facturaId);
    }
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
