import { JSDOM } from 'jsdom';
import assert from 'assert';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000/'
});
const { window } = dom;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.FormData = window.FormData;
global.Event = window.Event;
global.CustomEvent = window.CustomEvent;
global.localStorage = window.localStorage;
window.open = () => ({});
window.print = () => {};

// Configurar cotización por defecto
localStorage.setItem('mb_config', JSON.stringify({ cotizacionDolar: 1535 }));

const { DataService } = await import('../frontend/js/services/mockData.js');
const { formatCurrency } = await import('../frontend/js/utils/helpers.js');

console.log('\n===============================================================');
console.log('🧪 TEST: CÁLCULO DE SALDO DE OBRA USD CON COBRO EN PESOS');
console.log('===============================================================\n');

// 1. Crear Cliente de Prueba
const cliente = DataService.create('clientes', {
  nombre: 'Cliente',
  apellido: 'Prueba USD',
  telefono: '1122334455'
});

// 2. Crear Presupuesto en USD (como el caso real)
const presUSD = DataService.create('presupuestos', {
  clienteId: cliente.id,
  moneda: 'USD',
  cotizacionDolar: 1535,
  items: [
    { descripcion: 'Mesada Marmol', m2: 2, precioM2: 695.5, subtotal: 1391 }
  ],
  total: 1391,
  estado: 'aprobado'
});

// 3. Crear Obra asociada en USD (como la de producción)
const obraUSD = DataService.create('obras', {
  clienteId: cliente.id,
  presupuestoId: presUSD.id,
  moneda: 'USD',
  cotizacionDolar: 1535,
  importe: 1391,
  estado: 'pendiente'
});

console.log('--- TEST A: Total de Obra en USD ---');
const totalObra = DataService.getObraTotal(obraUSD.id);
assert.strictEqual(totalObra, 1391, 'El total de la obra debe ser 1391 USD');
console.log('  ✅ PASS: Total de obra USD = 1391');

console.log('\n--- TEST B: Registro de Cobro en ARS ($ 1.281.000) ---');
const cobroARS = DataService.create('cobros', {
  clienteId: cliente.id,
  obraId: obraUSD.id,
  presupuestoId: presUSD.id,
  moneda: 'ARS',
  importe: 1281000,
  estado: 'cobrado',
  fecha: '2026-10-10'
});

// 1.281.000 ARS / 1535 = 834.52768... redondeado a 2 decimales = 834.53
const cobradoCalculado = DataService.getObraCobrado(obraUSD.id);
console.log(`  Cobrado convertido a USD: ${cobradoCalculado}`);
assert.strictEqual(cobradoCalculado, 834.53, 'El cobrado convertido a USD debe ser exactamente 834.53 USD');
console.log('  ✅ PASS: Cobrado equivalente en USD = 834.53');

console.log('\n--- TEST C: Saldo Pendiente en USD ---');
const saldoPendiente = totalObra - cobradoCalculado;
console.log(`  Saldo pendiente: ${saldoPendiente}`);
assert.strictEqual(Math.round(saldoPendiente * 100) / 100, 556.47, 'El saldo pendiente debe ser 556.47 USD');
console.log('  ✅ PASS: Saldo pendiente = 556.47 USD');

const formattedSaldo = formatCurrency(saldoPendiente, obraUSD.moneda);
console.log(`  Formateo visual: ${formattedSaldo}`);
assert(formattedSaldo.includes('US$'), 'El formateo debe usar símbolo US$');
assert(formattedSaldo.includes('556.47') || formattedSaldo.includes('556,47'), 'El formateo debe mostrar 556.47');
console.log('  ✅ PASS: Formateo visual correcto con US$');

console.log('\n--- TEST D: Saldo de Cliente con Obra en USD ---');
const saldoCliente = DataService.getClienteSaldo(cliente.id);
assert.strictEqual(saldoCliente.moneda, 'USD', 'La moneda del cliente debe ser USD');
assert.strictEqual(Math.round(saldoCliente.saldo * 100) / 100, 556.47, 'El saldo del cliente debe ser 556.47 USD');
console.log('  ✅ PASS: Saldo de cliente reporta 556.47 USD');

console.log('\n--- TEST E: Obra en ARS con Cobro en ARS no sufre alteraciones ---');
const obraARS = DataService.create('obras', {
  moneda: 'ARS',
  importe: 500000,
  estado: 'pendiente'
});
DataService.create('cobros', {
  obraId: obraARS.id,
  moneda: 'ARS',
  importe: 200000,
  estado: 'cobrado'
});
const cobradoARS = DataService.getObraCobrado(obraARS.id);
assert.strictEqual(cobradoARS, 200000, 'Obra ARS debe cobrar exactamente $200.000');
assert.strictEqual(DataService.getObraTotal(obraARS.id) - cobradoARS, 300000, 'Saldo ARS debe ser exactamente $300.000');
console.log('  ✅ PASS: Obra puramente en ARS intacta (saldo $300.000)');

console.log('\n--- TEST F: Obra en USD con Cobro en USD no sufre alteraciones ---');
const obraUSD2 = DataService.create('obras', {
  moneda: 'USD',
  importe: 1000,
  estado: 'pendiente'
});
DataService.create('cobros', {
  obraId: obraUSD2.id,
  moneda: 'USD',
  importe: 400,
  estado: 'cobrado'
});
const cobradoUSD2 = DataService.getObraCobrado(obraUSD2.id);
assert.strictEqual(cobradoUSD2, 400, 'Obra USD debe cobrar exactamente USD 400');
assert.strictEqual(DataService.getObraTotal(obraUSD2.id) - cobradoUSD2, 600, 'Saldo USD debe ser exactamente USD 600');
console.log('  ✅ PASS: Obra puramente en USD intacta (saldo USD 600)');

console.log('\n===============================================================');
console.log('🏁 RESULTADO: TODOS LOS TESTS PASARON EXITOSAMENTE (100% OK)');
console.log('===============================================================\n');
