/* ========================================
   MARMOLERÍA BENJAMIN — Helpers
   ======================================== */

/**
 * Generate a unique ID (UUID v4 simplified)
 */
export function generateId() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  }) + '-' + Date.now().toString(36);
}

/**
 * Format currency value
 * @param {number} amount
 * @param {string} currency - 'ARS' or 'USD'
 */
export function formatCurrency(amount, currency = 'ARS') {
  if (amount == null || isNaN(amount)) return '-';
  
  const config = currency === 'USD' 
    ? { symbol: 'US$', locale: 'en-US' }
    : { symbol: '$', locale: 'es-AR' };
  
  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
  
  const sign = amount < 0 ? '-' : '';
  return `${sign}${config.symbol} ${formatted}`;
}

/**
 * Format number with locale
 */
export function formatNumber(num, decimals = 2) {
  if (num == null || isNaN(num)) return '-';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Format date to DD/MM/YYYY
 */
export function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format date to short format
 */
export function formatDateShort(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Format relative date
 */
export function formatRelativeDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date is past
 */
export function isPastDate(date) {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/**
 * Check if date is within N days from now
 */
export function isWithinDays(date, days) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  return d >= now && d <= future;
}

/**
 * Calculate m² from largo and ancho (in cm, returns m²)
 */
export function calculateM2(largo, ancho) {
  if (!largo || !ancho) return 0;
  return (parseFloat(largo) * parseFloat(ancho)) / 10000;
}

/**
 * Debounce function
 */
export function debounce(fn, ms = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Throttle function
 */
export function throttle(fn, ms = 100) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sanitize string for display
 */
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Generate auto-increment number with prefix
 * @param {string} prefix - e.g. 'PRES'
 * @param {Array} existingItems - items with 'numero' field
 */
export function generateAutoNumber(prefix, existingItems = []) {
  const year = new Date().getFullYear();
  const existing = existingItems
    .map(item => {
      const match = item.numero?.match(new RegExp(`${prefix}-${year}-(\\d+)`));
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);
  
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}

/**
 * Sort array by field
 */
export function sortBy(arr, field, direction = 'asc') {
  return [...arr].sort((a, b) => {
    let valA = a[field];
    let valB = b[field];
    
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filter array by search term across multiple fields
 */
export function searchFilter(arr, term, fields) {
  if (!term || !term.trim()) return arr;
  const lower = term.toLowerCase().trim();
  return arr.filter(item => 
    fields.some(field => {
      const val = item[field];
      return val && String(val).toLowerCase().includes(lower);
    })
  );
}

/**
 * Group array by a field
 */
export function groupBy(arr, field) {
  return arr.reduce((groups, item) => {
    const key = item[field] || 'sin_asignar';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

/**
 * Sum values of a field in an array
 */
export function sumBy(arr, field) {
  return arr.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str, maxLength = 50) {
  if (!str || str.length <= maxLength) return str || '';
  return str.substring(0, maxLength) + '...';
}

/**
 * Escape HTML for safe rendering
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create WhatsApp link
 */
export function createWhatsAppLink(phone, message = '') {
  const cleanPhone = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

/**
 * Parse a number from locale string
 */
export function parseLocaleNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Resolve relative or storage file key to accessible URL
 */
export function resolveFileUrl(urlOrKey) {
  if (!urlOrKey) return '';
  if (urlOrKey.startsWith('data:') || urlOrKey.startsWith('blob:') || urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    return urlOrKey;
  }
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const workerBase = isLocal ? '' : 'https://marmoleria-benjamin-api.davidlaid1998.workers.dev';
  
  if (urlOrKey.startsWith('/api/')) {
    return `${workerBase}${urlOrKey}`;
  }
  if (urlOrKey.startsWith('uploads/')) {
    return `${workerBase}/api/${urlOrKey}`;
  }
  return `${workerBase}/api/uploads/${urlOrKey}`;
}

