/* ========================================
   MARMOLERÍA BENJAMIN — Cloudflare R2 Storage Service
   Central data access layer persisting JSON files in R2
   ======================================== */

import { INITIAL_SEED } from './seedData.js';
import { generateId } from '../utils/helpers.js';

// In-memory fallback for local dev when R2 binding is not available
const localFallbackStore = { ...INITIAL_SEED };

export class StorageService {
  static getCollectionKey(collection) {
    return `data/${collection}.json`;
  }

  static async readJSON(env, collection) {
    const key = this.getCollectionKey(collection);

    // Fallback if R2 STORAGE binding is not configured
    if (!env || !env.STORAGE) {
      if (!localFallbackStore[collection]) {
        localFallbackStore[collection] = collection === 'config' ? {} : [];
      }
      return localFallbackStore[collection];
    }

    try {
      const obj = await env.STORAGE.get(key);
      if (!obj) {
        // First run: populate with seed data if available
        const seed = INITIAL_SEED[collection] || (collection === 'config' ? {} : []);
        await this.writeJSON(env, collection, seed, { skipBackup: true });
        return seed;
      }

      const text = await obj.text();
      return JSON.parse(text);
    } catch (err) {
      console.error(`Error reading ${key} from R2:`, err);
      return INITIAL_SEED[collection] || (collection === 'config' ? {} : []);
    }
  }

  static async writeJSON(env, collection, data, options = {}) {
    const key = this.getCollectionKey(collection);

    if (!env || !env.STORAGE) {
      localFallbackStore[collection] = data;
      return true;
    }

    try {
      // Create backup before modification (unless skipped)
      if (!options.skipBackup) {
        try {
          const current = await env.STORAGE.get(key);
          if (current) {
            const backupKey = `backups/auto/${collection}-${Date.now()}.json`;
            await env.STORAGE.put(backupKey, await current.text(), {
              httpMetadata: { contentType: 'application/json' }
            });
          }
        } catch (bErr) {
          console.warn(`Could not create backup for ${collection}:`, bErr);
        }
      }

      await env.STORAGE.put(key, JSON.stringify(data, null, 2), {
        httpMetadata: { contentType: 'application/json' }
      });
      return true;
    } catch (err) {
      console.error(`Error writing ${key} to R2:`, err);
      throw err;
    }
  }

  static async getAll(env, collection, filterFn = null) {
    const list = await this.readJSON(env, collection);
    if (!Array.isArray(list)) return list;
    return filterFn ? list.filter(filterFn) : list;
  }

  static async getById(env, collection, id) {
    const list = await this.readJSON(env, collection);
    if (!Array.isArray(list)) return null;
    return list.find(item => item.id === id) || null;
  }

  static async create(env, collection, payload) {
    const list = await this.readJSON(env, collection);
    const item = {
      ...payload,
      id: payload.id || (collection.substring(0, 3) + '-' + generateId().substring(3)),
      createdAt: payload.createdAt || new Date().toISOString()
    };
    list.unshift(item);
    await this.writeJSON(env, collection, list);
    return item;
  }

  static async update(env, collection, id, updates) {
    const list = await this.readJSON(env, collection);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.writeJSON(env, collection, list);
    return list[index];
  }

  static async remove(env, collection, id) {
    const list = await this.readJSON(env, collection);
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return false;

    list.splice(index, 1);
    await this.writeJSON(env, collection, list);
    return true;
  }

  // Batch sync for fast frontend boot
  static async getSyncData(env) {
    const collections = [
      'clientes',
      'presupuestos',
      'obras',
      'materiales',
      'stockMovimientos',
      'proveedores',
      'facturas',
      'pagos',
      'cobros',
      'eventos',
      'config'
    ];

    const results = {};
    for (const col of collections) {
      results[col] = await this.readJSON(env, col);
    }
    return results;
  }
}
