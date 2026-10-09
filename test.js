import { generateAutoNumber } from './frontend/js/utils/helpers.js';

const existing = [
  { numero: '00125' }
];
console.log('Result 1:', generateAutoNumber('PRES', existing));

const existing2 = [
  { numero: 'PRES-2026-0125' }
];
console.log('Result 2:', generateAutoNumber('PRES', existing2));

