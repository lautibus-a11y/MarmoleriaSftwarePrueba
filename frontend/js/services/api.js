/* ========================================
   MARMOLERÍA BENJAMIN — API Service
   ======================================== */

const API_BASE_URL = '/api'; // Will be configured for Cloudflare Worker in Phase 2

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request(method, path, data = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add auth token if available
    const authData = localStorage.getItem('mb_auth');
    if (authData) {
      config.headers['Authorization'] = `Bearer ${JSON.parse(authData).token || ''}`;
    }

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Session expired
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
      console.error(`API ${method} ${path}:`, err);
      throw err;
    }
  }

  get(path) { return this.request('GET', path); }
  post(path, data) { return this.request('POST', path, data); }
  put(path, data) { return this.request('PUT', path, data); }
  delete(path) { return this.request('DELETE', path); }

  async upload(path, file) {
    const url = `${this.baseUrl}${path}`;
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      method: 'POST',
      body: formData
    };

    const authData = localStorage.getItem('mb_auth');
    if (authData) {
      config.headers = {
        'Authorization': `Bearer ${JSON.parse(authData).token || ''}`
      };
    }

    const response = await fetch(url, config);
    if (!response.ok) throw new Error('Error al subir archivo');
    return await response.json();
  }
}

export const Api = new ApiService();
