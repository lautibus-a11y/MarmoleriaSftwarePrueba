/* ========================================
   MARMOLERÍA BENJAMIN — Backups Route
   ======================================== */

import { StorageService } from '../services/storageService.js';
import { jsonResponse } from '../utils/helpers.js';

export async function handleBackups(request, env, pathParts, origin) {
  const syncData = await StorageService.getSyncData(env);
  const backup = {
    empresa: 'Marmolería Benjamin',
    fecha: new Date().toISOString(),
    version: '2.0-cloud',
    data: syncData
  };

  return jsonResponse(backup, 200, origin);
}
