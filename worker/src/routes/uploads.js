/* ========================================
   MARMOLERÍA BENJAMIN — Uploads & Files Route
   Serves and uploads binary files to R2
   ======================================== */

import { jsonResponse, errorResponse, corsHeaders } from '../utils/helpers.js';

export async function handleUploads(request, env, pathParts, origin) {
  const method = request.method;

  // GET /api/uploads/:folder/:filename (or /api/uploads/...)
  if (method === 'GET') {
    // The key in R2 is whatever follows /api/
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/api\//, ''); // e.g., uploads/facturas/xxx.jpg

    if (!env || !env.STORAGE) {
      return errorResponse('Almacenamiento no configurado', 503, origin);
    }

    try {
      const fileObj = await env.STORAGE.get(key);
      if (!fileObj) {
        return errorResponse('Archivo no encontrado', 404, origin);
      }

      const headers = new Headers();
      headers.set('Content-Type', fileObj.httpMetadata?.contentType || 'application/octet-stream');
      headers.set('ETag', fileObj.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v));

      return new Response(fileObj.body, { headers });
    } catch (err) {
      console.error('Error fetching file from R2:', err);
      return errorResponse('Error al obtener archivo', 500, origin);
    }
  }

  // POST /api/uploads
  if (method === 'POST') {
    if (!env || !env.STORAGE) {
      return errorResponse('Almacenamiento R2 no disponible', 503, origin);
    }

    try {
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return errorResponse('Content-Type debe ser multipart/form-data', 400, origin);
      }

      const formData = await request.formData();
      const file = formData.get('file');
      const folder = formData.get('folder') || 'comprobantes';

      if (!file || typeof file === 'string') {
        return errorResponse('Archivo no proporcionado', 400, origin);
      }

      const cleanFileName = (file.name || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `uploads/${folder}/${Date.now()}-${cleanFileName}`;
      const fileBuffer = await file.arrayBuffer();

      await env.STORAGE.put(key, fileBuffer, {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream'
        }
      });

      return jsonResponse({
        success: true,
        key,
        url: `/api/${key}`,
        filename: cleanFileName,
        size: file.size,
        type: file.type
      }, 201, origin);
    } catch (err) {
      console.error('Error uploading file to R2:', err);
      return errorResponse('Error al procesar subida de archivo: ' + err.message, 500, origin);
    }
  }

  return errorResponse('Método no permitido', 405, origin);
}
