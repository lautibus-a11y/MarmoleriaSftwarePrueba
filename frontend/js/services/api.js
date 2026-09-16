/* ========================================
   MARMOLERÍA BENJAMIN — API Service
   Client for Cloudflare Worker API & R2 Storage
   ======================================== */

class ApiService {
  constructor() {
    // If running in production (e.g. on Cloudflare Pages), use the deployed Worker URL
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    this.defaultBaseUrl = isLocal ? '/api' : 'https://marmoleria-benjamin-api.davidlaid1998.workers.dev/api';
  }

  getBaseUrl() {
    return localStorage.getItem('mb_api_url') || this.defaultBaseUrl;
  }

  setBaseUrl(url) {
    if (!url) {
      localStorage.removeItem('mb_api_url');
    } else {
      localStorage.setItem('mb_api_url', url.replace(/\/+$/, ''));
    }
  }

  async request(method, path, data = null, options = {}) {
    const base = this.getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${cleanPath}`;

    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const authData = localStorage.getItem('mb_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.token) {
          config.headers['Authorization'] = `Bearer ${parsed.token}`;
        }
      } catch (e) {}
    }

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        localStorage.removeItem('mb_auth');
        window.location.hash = '#/login';
        throw new Error('Sesión expirada');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Error ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn(`API ${method} ${path}:`, err.message);
      throw err;
    }
  }

  get(path) { return this.request('GET', path); }
  post(path, data) { return this.request('POST', path, data); }
  put(path, data) { return this.request('PUT', path, data); }
  delete(path) { return this.request('DELETE', path); }

  async upload(file, folder = 'comprobantes') {
    const base = this.getBaseUrl();
    const url = `${base}/uploads`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const config = {
      method: 'POST',
      body: formData,
      headers: {}
    };

    const authData = localStorage.getItem('mb_auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.token) {
          config.headers['Authorization'] = `Bearer ${parsed.token}`;
        }
      } catch (e) {}
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al subir archivo');
    }
    return await response.json();
  }
}

export const Api = new ApiService();
