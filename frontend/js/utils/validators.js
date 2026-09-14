/* ========================================
   MARMOLERÍA BENJAMIN — Validators
   ======================================== */

/**
 * Validate a non-empty string
 */
export function isRequired(value, fieldName = 'Campo') {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} es obligatorio`;
  }
  return null;
}

/**
 * Validate email format
 */
export function isValidEmail(value) {
  if (!value) return null; // optional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value)) return 'Email inválido';
  return null;
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(value) {
  if (!value) return null;
  const clean = value.replace(/[\s\-\(\)]/g, '');
  if (clean.length < 8 || clean.length > 15) return 'Teléfono inválido';
  if (!/^[\d\+]+$/.test(clean)) return 'Teléfono inválido';
  return null;
}

/**
 * Validate CUIT format (XX-XXXXXXXX-X)
 */
export function isValidCUIT(value) {
  if (!value) return null;
  const clean = value.replace(/\-/g, '');
  if (!/^\d{11}$/.test(clean)) return 'CUIT inválido (11 dígitos)';
  return null;
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value, fieldName = 'Valor') {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return `${fieldName} debe ser un número positivo`;
  return null;
}

/**
 * Validate number greater than zero
 */
export function isGreaterThanZero(value, fieldName = 'Valor') {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return `${fieldName} debe ser mayor a cero`;
  return null;
}

/**
 * Validate date is not in the past (optional)
 */
export function isNotPastDate(value, fieldName = 'Fecha') {
  if (!value) return null;
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return `${fieldName} no puede ser anterior a hoy`;
  return null;
}

/**
 * Validate a date string
 */
export function isValidDate(value, fieldName = 'Fecha') {
  if (!value) return `${fieldName} es obligatorio`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return `${fieldName} inválida`;
  return null;
}

/**
 * Validate max length
 */
export function maxLength(value, max, fieldName = 'Campo') {
  if (!value) return null;
  if (value.length > max) return `${fieldName} no puede tener más de ${max} caracteres`;
  return null;
}

/**
 * Validate file type
 */
export function isAllowedFileType(file, allowedTypes) {
  if (!file) return null;
  if (!allowedTypes.includes(file.type)) {
    return 'Tipo de archivo no permitido';
  }
  return null;
}

/**
 * Validate file size
 */
export function isValidFileSize(file, maxBytes) {
  if (!file) return null;
  if (file.size > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
    return `El archivo no puede superar ${maxMB}MB`;
  }
  return null;
}

/**
 * Run multiple validations on a value
 * Returns the first error or null
 */
export function validate(value, ...validators) {
  for (const validator of validators) {
    const error = validator(value);
    if (error) return error;
  }
  return null;
}

/**
 * Validate an entire form data object
 * @param {Object} data - form data
 * @param {Object} rules - { fieldName: [validator1, validator2, ...] }
 * @returns {Object} - { isValid, errors: { fieldName: errorMessage } }
 */
export function validateForm(data, rules) {
  const errors = {};
  let isValid = true;

  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const error = validator(data[field]);
      if (error) {
        errors[field] = error;
        isValid = false;
        break;
      }
    }
  }

  return { isValid, errors };
}
