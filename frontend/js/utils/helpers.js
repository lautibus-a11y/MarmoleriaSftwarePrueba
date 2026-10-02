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
 * Calculate m² from largo and ancho
 * @param {number|string} largo
 * @param {number|string} ancho
 * @param {'cm'|'m'} unidad - Default is 'cm'
 * @returns {number} m²
 */
export function calculateM2(largo, ancho, unidad = 'cm') {
  if (!largo || !ancho) return 0;
  const l = parseFloat(String(largo).replace(',', '.')) || 0;
  const a = parseFloat(String(ancho).replace(',', '.')) || 0;
  if (l <= 0 || a <= 0) return 0;

  const m2 = (unidad === 'm') ? (l * a) : ((l * a) / 10000);
  return Math.round((m2 + Number.EPSILON) * 10000) / 10000;
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
 * Comparator to sort items newest-first (most recent on top, older below).
 * Prioritizes creation timestamp (createdAt), operational date (fecha / fechaInicio),
 * then falls back to descending ID.
 */
export function compareNewestFirst(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. Check createdAt ISO timestamps
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (timeA && timeB && timeA !== timeB) {
    return timeB - timeA;
  }

  // 2. Check operational date fields (fecha or fechaInicio)
  const dateStrA = a.fecha || a.fechaInicio || '';
  const dateStrB = b.fecha || b.fechaInicio || '';
  if (dateStrA && dateStrB && dateStrA !== dateStrB) {
    return new Date(dateStrB).getTime() - new Date(dateStrA).getTime();
  }

  // 3. If one has createdAt and the other doesn't
  if (timeA !== timeB) {
    return (timeB || 0) - (timeA || 0);
  }

  // 4. If one has fecha and the other doesn't
  const dateNumA = dateStrA ? new Date(dateStrA).getTime() : 0;
  const dateNumB = dateStrB ? new Date(dateStrB).getTime() : 0;
  if (dateNumA !== dateNumB) {
    return (dateNumB || 0) - (dateNumA || 0);
  }

  // 5. Fallback: descending ID (higher / later ID first)
  return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
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
 * Format phone number to international WhatsApp format (especially Argentina 549)
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (!clean) return '';
  // Eliminar 0 inicial si existe
  if (clean.startsWith('0')) clean = clean.slice(1);
  // Eliminar prefijo celular local "15" después del código de área
  if (clean.startsWith('1115') && clean.length === 12) {
    clean = '11' + clean.slice(4);
  } else if (/^\d{3}15\d{7}$/.test(clean)) {
    clean = clean.slice(0, 3) + clean.slice(5);
  } else if (/^\d{4}15\d{6}$/.test(clean)) {
    clean = clean.slice(0, 4) + clean.slice(6);
  }

  if (clean.length === 10) {
    clean = '549' + clean;
  } else if (clean.startsWith('54') && !clean.startsWith('549') && clean.length === 12) {
    clean = '549' + clean.slice(2);
  }
  return clean;
}

/**
 * Resolve unified and up-to-date contact information for any client or provider entity
 */
export function resolveEntityContact(entity, fallbackObj = {}) {
  const target = entity || fallbackObj || {};

  const rawPhone = (target.telefono || target.contacto || fallbackObj?.telefono || fallbackObj?.contacto || '').trim();
  const rawWa = (target.whatsapp || fallbackObj?.whatsapp || rawPhone).trim();

  const cleanPhone = formatWhatsAppPhone(rawPhone);
  const cleanWa = formatWhatsAppPhone(rawWa) || cleanPhone;

  const name = target.nombre 
    ? `${target.nombre} ${target.apellido || ''}`.trim()
    : (target.clienteNombre || target.proveedorNombre || fallbackObj?.clienteNombre || fallbackObj?.proveedorNombre || 'Cliente');

  return {
    name,
    phone: rawPhone || rawWa,
    whatsapp: cleanWa,
    rawWhatsapp: rawWa,
    email: target.email || fallbackObj?.email || '',
    direccion: target.direccion || fallbackObj?.direccion || '',
    cuit: target.cuit || fallbackObj?.cuit || ''
  };
}

/**
 * Create WhatsApp link
 */
export function createWhatsAppLink(phone, message = '') {
  const cleanPhone = formatWhatsAppPhone(phone);
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

/**
 * Reemplaza el innerHTML de un elemento preservando el scroll global y de contenedores, 
 * y restaurando el foco del elemento activo (inputs, selects, etc).
 * Ideal para solucionar saltos de scroll al re-renderizar listas.
 */
export function replaceHTMLPreservingScroll(element, newHTML) {
  if (!element) return;
  
  // 1. Guardar estado de scroll global
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  
  // 2. Guardar estado de scroll de contenedores
  const scrollingContainers = [];
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
      scrollingContainers.push({
        element: parent,
        scrollTop: parent.scrollTop,
        scrollLeft: parent.scrollLeft
      });
    }
    parent = parent.parentElement;
  }

  // 3. Guardar estado de foco
  const activeEl = document.activeElement;
  let focusInfo = null;
  if (activeEl && element.contains(activeEl)) {
    focusInfo = {
      id: activeEl.id,
      name: activeEl.name,
      className: activeEl.className,
      tagName: activeEl.tagName.toLowerCase(),
      dataset: { ...activeEl.dataset },
      selectionStart: activeEl.selectionStart,
      selectionEnd: activeEl.selectionEnd,
      value: activeEl.value
    };
    
    // Si el elemento está dentro de una tarjeta con data-idx, guardamos ese índice
    const parentRow = activeEl.closest('[data-idx]');
    if (parentRow && parentRow.dataset.idx) {
      focusInfo.parentRowIdx = parentRow.dataset.idx;
    }
  }

  // 4. Reemplazar DOM
  element.innerHTML = newHTML;

  // 5. Restaurar scroll de contenedores
  scrollingContainers.forEach(c => {
    c.element.scrollTop = c.scrollTop;
    c.element.scrollLeft = c.scrollLeft;
  });

  // 6. Restaurar scroll global
  window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });

  // 7. Restaurar foco sin causar saltos (preventScroll: true)
  if (focusInfo) {
    let target = null;
    
    // Buscar por ID
    if (focusInfo.id) {
      target = element.querySelector(`#${focusInfo.id}`);
    } 
    
    // Buscar por dataset de campo (ej: data-field y data-idx)
    if (!target && focusInfo.dataset && focusInfo.dataset.field) {
      let selector = `${focusInfo.tagName}[data-field="${focusInfo.dataset.field}"]`;
      let candidates = [];
      
      // Si estaba dentro de una fila indexada
      if (focusInfo.parentRowIdx !== undefined) {
        const rowSelector = `[data-idx="${focusInfo.parentRowIdx}"] ${selector}`;
        candidates = element.querySelectorAll(rowSelector);
      }
      
      if (!candidates.length) {
        candidates = element.querySelectorAll(selector);
      }
      
      if (candidates.length === 1) target = candidates[0];
      else if (candidates.length > 1) {
        // Desempate por valor
        target = Array.from(candidates).find(el => el.value === focusInfo.value) || candidates[0];
      }
    }
    
    // Búsqueda genérica por nombre
    if (!target && focusInfo.name) {
       target = element.querySelector(`[name="${focusInfo.name}"]`);
    }
    
    // Fallback por tag y clase
    if (!target && focusInfo.className) {
      target = element.querySelector(`${focusInfo.tagName}[class="${focusInfo.className}"]`);
    }
    
    if (target && typeof target.focus === 'function') {
      target.focus({ preventScroll: true }); 
      try {
        if (typeof target.setSelectionRange === 'function' && focusInfo.selectionStart !== null && focusInfo.selectionStart !== undefined) {
          target.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
        }
      } catch(e) {
        // Silenciar error (ej. input type="number" no soporta setSelectionRange)
      }
    }
  }
}
