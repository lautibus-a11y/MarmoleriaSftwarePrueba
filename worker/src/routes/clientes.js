/* ========================================
   MARMOLERÍA BENJAMIN — Clientes Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

async function cascadeUpdateCliente(env, clienteId, updatedCliente) {
  const cliName = `${updatedCliente.nombre || ''} ${updatedCliente.apellido || ''}`.trim();
  const cliPhone = updatedCliente.telefono || updatedCliente.whatsapp || '';

  // 1. Presupuestos
  try {
    const presupuestos = await StorageService.readJSON(env, 'presupuestos');
    let presModified = false;
    (presupuestos || []).forEach(p => {
      if (p && String(p.clienteId) === String(clienteId)) {
        p.clienteNombre = cliName;
        p.telefono = cliPhone;
        if (updatedCliente.direccion) p.direccion = updatedCliente.direccion;
        presModified = true;
      }
    });
    if (presModified) await StorageService.writeJSON(env, 'presupuestos', presupuestos);
  } catch (e) {
    console.warn('Error in cascade presupuestos:', e.message);
  }

  // 2. Obras
  try {
    const obras = await StorageService.readJSON(env, 'obras');
    let obrasModified = false;
    (obras || []).forEach(o => {
      if (o && String(o.clienteId) === String(clienteId)) {
        o.clienteNombre = cliName;
        o.contacto = cliPhone;
        o.telefono = cliPhone;
        if (updatedCliente.direccion) o.direccion = updatedCliente.direccion;
        obrasModified = true;
      }
    });
    if (obrasModified) await StorageService.writeJSON(env, 'obras', obras);
  } catch (e) {
    console.warn('Error in cascade obras:', e.message);
  }

  // 3. Cobros
  try {
    const cobros = await StorageService.readJSON(env, 'cobros');
    let cobrosModified = false;
    (cobros || []).forEach(c => {
      if (c && String(c.clienteId) === String(clienteId)) {
        c.clienteNombre = cliName;
        cobrosModified = true;
      }
    });
    if (cobrosModified) await StorageService.writeJSON(env, 'cobros', cobros);
  } catch (e) {
    console.warn('Error in cascade cobros:', e.message);
  }

  // 4. Eventos
  try {
    const eventos = await StorageService.readJSON(env, 'eventos');
    let eventosModified = false;
    (eventos || []).forEach(ev => {
      if (ev && String(ev.clienteId) === String(clienteId)) {
        ev.clienteNombre = cliName;
        if (updatedCliente.direccion) ev.direccion = updatedCliente.direccion;
        eventosModified = true;
      }
    });
    if (eventosModified) await StorageService.writeJSON(env, 'eventos', eventos);
  } catch (e) {
    console.warn('Error in cascade eventos:', e.message);
  }
}

export async function handleClientes(request, env, pathParts, origin) {
  const method = request.method;
  const id = pathParts[2]; // /api/clientes/:id

  if (method === 'GET') {
    if (id) {
      const cliente = await StorageService.getById(env, 'clientes', id);
      if (!cliente) return errorResponse('Cliente no encontrado', 404, origin);
      return jsonResponse(cliente, 200, origin);
    }
    const list = await StorageService.getAll(env, 'clientes');
    return jsonResponse(list, 200, origin);
  }

  if (method === 'POST') {
    const data = await request.json().catch(() => null);
    if (!data || !data.nombre) return errorResponse('El nombre es requerido', 400, origin);
    const created = await StorageService.create(env, 'clientes', data);
    return jsonResponse(created, 201, origin);
  }

  if (method === 'PUT') {
    if (!id) return errorResponse('ID de cliente requerido', 400, origin);
    const data = await request.json().catch(() => null);
    if (!data) return errorResponse('Datos inválidos', 400, origin);
    const updated = await StorageService.update(env, 'clientes', id, data);
    if (!updated) return errorResponse('Cliente no encontrado', 404, origin);

    // Cascada de sincronización en R2
    await cascadeUpdateCliente(env, id, updated);

    return jsonResponse(updated, 200, origin);
  }

  if (method === 'DELETE') {
    if (!id) return errorResponse('ID de cliente requerido', 400, origin);
    const removed = await StorageService.remove(env, 'clientes', id);
    if (!removed) return errorResponse('Cliente no encontrado', 404, origin);
    return jsonResponse({ success: true }, 200, origin);
  }

  return errorResponse('Método no permitido', 405, origin);
}
