// ===============================================================
// 🕵️‍♂️ EXHAUSTIVE QA TESTER AUDIT SUITE — MARMOLERÍA BENJAMÍN
// Tests Worker API, Backend Sync, All Modules, UI Logic & Edge Cases
// ===============================================================

import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head></head>
<body>
  <div id="app"></div>
  <div id="page-content"></div>
  <div id="page-header-actions"></div>
  <div id="drawer-container"></div>
  <div id="modal-container"></div>
</body>
</html>`, {
  url: 'http://localhost:3000/#/dashboard'
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.HTMLInputElement = window.HTMLInputElement;
global.HTMLSelectElement = window.HTMLSelectElement;
global.HTMLTextAreaElement = window.HTMLTextAreaElement;
global.FormData = window.FormData;
global.Event = window.Event;
global.CustomEvent = window.CustomEvent;
global.localStorage = window.localStorage;

let passed = 0;
let failed = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} ${detail ? '— ' + detail : ''}`);
  }
}

console.log('\n===============================================================');
console.log('🕵️‍♂️ INICIANDO AUDITORÍA EXHAUSTIVA DE QA TESTER (100% COBERTURA)');
console.log('===============================================================\n');

// ── SECCIÓN 1: AUDITORÍA DEL WORKER REMOTO (API CLOUDFLARE R2) ──
console.log('--- 1. AUDITORÍA DEL WORKER REMOTO EN CLOUDFLARE ---');
const WORKER_URL = 'https://marmoleria-benjamin-api.davidlaid1998.workers.dev';

try {
  // 1.1 Health check
  const healthRes = await fetch(`${WORKER_URL}/api/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200, 'Worker responde HTTP 200 en /api/health');
  assert(healthData.status === 'ok', 'Worker health reporta status: ok');

  // 1.2 Sync endpoint
  const syncRes = await fetch(`${WORKER_URL}/api/sync`);
  const syncData = await syncRes.json();
  assert(syncRes.status === 200, 'Worker responde HTTP 200 en /api/sync');
  assert(Array.isArray(syncData.clientes), 'Sync contiene array clientes');
  assert(Array.isArray(syncData.presupuestos), 'Sync contiene array presupuestos');
  assert(Array.isArray(syncData.obras), 'Sync contiene array obras');
  assert(Array.isArray(syncData.materiales), 'Sync contiene array materiales');
  assert(Array.isArray(syncData.stockMovimientos), 'Sync contiene array stockMovimientos');
  assert(Array.isArray(syncData.proveedores), 'Sync contiene array proveedores');
  assert(Array.isArray(syncData.facturas), 'Sync contiene array facturas');
  assert(Array.isArray(syncData.pagos), 'Sync contiene array pagos');
  assert(Array.isArray(syncData.cobros), 'Sync contiene array cobros');
  assert(Array.isArray(syncData.eventos), 'Sync contiene array eventos');
  assert(typeof syncData.config === 'object', 'Sync contiene config de empresa');
  assert(syncData.config.empresa_nombre === 'Marmolería Benjamin', 'Config contiene nombre correcto de empresa');
  assert(syncData.config.cotizacionDolar > 0, 'Config contiene cotización de dólar válida');

  // 1.3 Aliases de conveniencia
  const stockRes = await fetch(`${WORKER_URL}/api/stock`);
  const stockData = await stockRes.json();
  assert(stockRes.status === 200 && Array.isArray(stockData), 'Alias /api/stock responde HTTP 200 con array');

  const configRes = await fetch(`${WORKER_URL}/api/configuracion`);
  const configData = await configRes.json();
  assert(configRes.status === 200 && typeof configData === 'object', 'Alias /api/configuracion responde HTTP 200');

  // 1.4 Estado de datos limpio en R2 (cero datos ficticios)
  assert(syncData.clientes.length === 0, 'R2 bucket tiene clientes limpios (0)');
  assert(syncData.presupuestos.length === 0, 'R2 bucket tiene presupuestos limpios (0)');
  assert(syncData.obras.length === 0, 'R2 bucket tiene obras limpias (0)');
  assert(syncData.cobros.length === 0, 'R2 bucket tiene cobros limpios (0)');
  assert(syncData.stockMovimientos.length === 0, 'R2 bucket tiene movimientos de stock limpios (0)');
} catch (err) {
  assert(false, 'Conexión con Cloudflare Worker falló', err.message);
}

// ── SECCIÓN 2: IMPORTACIÓN DE MÓDULOS DE APLICACIÓN ──
console.log('\n--- 2. CARGA DE MÓDULOS FRONTEND Y SERVICIOS ---');
const { DataService } = await import('../frontend/js/services/mockData.js');
const { calculateProcessState, getAllProcesses } = await import('../frontend/js/pages/pasoAPaso.js');
const { aprobarPresupuesto } = await import('../frontend/js/pages/presupuestos.js');
const { resolveEntityContact, formatWhatsAppPhone } = await import('../frontend/js/utils/helpers.js');
const { generatePresupuestoHtml, generateObraHtml, generateCobroHtml } = await import('../frontend/js/services/documentExporter.js');

assert(!!DataService, 'DataService cargado correctamente');
assert(typeof calculateProcessState === 'function', 'calculateProcessState es función');
assert(typeof getAllProcesses === 'function', 'getAllProcesses es función');
assert(typeof aprobarPresupuesto === 'function', 'aprobarPresupuesto es función');

// ── SECCIÓN 3: QA CLIENTES Y CONDICIONES COMERCIALES ──
console.log('\n--- 3. QA CLIENTES Y NORMALIZACIÓN DE TELÉFONOS ---');
{
  const cli = DataService.create('clientes', {
    nombre: 'Valeria',
    apellido: 'López',
    telefono: '11 4455-6677',
    direccion: 'Juramento 1500',
    condicionComercial: 'descuento',
    descuentoHabitual: 15,
    motivoCondicion: 'Arquitecta asociada'
  });

  assert(!!cli.id, 'Cliente creado con ID asignado');
  assert(cli.whatsapp === '11 4455-6677', 'WhatsApp sincronizado automáticamente con teléfono');
  
  const formattedPhone = formatWhatsAppPhone(cli.telefono);
  assert(formattedPhone.includes('5491144556677'), 'formatWhatsAppPhone normaliza con código de país 549');

  const contact = resolveEntityContact(cli);
  assert(contact.name === 'Valeria López', 'resolveEntityContact resuelve nombre completo');
  assert(contact.whatsapp.includes('549'), 'resolveEntityContact devuelve WhatsApp internacional');
}

// ── SECCIÓN 4: QA COTIZADOR, CÁLCULOS MATEMÁTICOS E IVA ──
console.log('\n--- 4. QA CÁLCULOS EXACTOS DE COTIZACIÓN (M2, ADICIONALES, IVA) ---');
{
  const testPres = {
    items: [
      { descripcion: 'Mesada cocina', m2: 2.5, precioUnitario: 100000, subtotal: 250000 },
      { descripcion: 'Isla desayunador', m2: 1.5, precioUnitario: 200000, subtotal: 300000 }
    ],
    adicionales: {
      bacha: 25000,
      colocacion: 75000
    },
    descuento: 10,
    impuestos: 21,
    moneda: 'ARS'
  };

  // Subtotal items: 250k + 300k = 550k
  // Adicionales: 25k + 75k = 100k
  // Subtotal base: 650k
  // Descuento 10%: -65k => Base neta: 585k
  // IVA 21%: 585k * 0.21 = 122.850
  // Total esperado: 585.000 + 122.850 = 707.850
  const totalCalculado = DataService.getPresupuestoTotal(testPres);
  assert(totalCalculado === 707850, `Cálculo total matemático exacto (esperado $707.850, obtenido ${totalCalculado})`);

  // Caso en Dólares USD
  const testPresUSD = {
    ...testPres,
    moneda: 'USD',
    cotizacionDolar: 1350
  };
  const totalUSD = DataService.getPresupuestoTotal(testPresUSD);
  assert(totalUSD === 707850, 'Presupuesto en USD calcula total base idéntico');
}

// ── SECCIÓN 5: QA PASO A PASO — FLUJO COMPLETO DE LOS 8 PASOS Y VALIDACIÓN DE AGENDA ──
console.log('\n--- 5. QA MÁQUINA DE ESTADOS PASO A PASO (8 PASOS Y CASO DE AGENDA) ---');
{
  // 5.1 Paso 1: Cliente
  const clienteQA = DataService.create('clientes', {
    nombre: 'Santiago',
    apellido: 'Mármol',
    telefono: '11-6677-8899',
    direccion: 'Av. Libertador 5000'
  });

  // 5.2 Paso 2 & 3: Presupuesto en Borrador -> Enviado
  const presQA = DataService.create('presupuestos', {
    clienteId: clienteQA.id,
    clienteNombre: 'Santiago Mármol',
    telefono: clienteQA.telefono,
    direccion: clienteQA.direccion,
    descripcion: 'Mesada cocina y alzada',
    material: 'Silestone Blanco Zeus',
    estado: 'enviado',
    items: [{ id: '1', descripcion: 'Mesada', m2: 2.0, precioUnitario: 200000, subtotal: 400000 }]
  });

  let proc = getAllProcesses().find(p => p.presupuestoId === presQA.id);
  assert(proc.stateInfo.currentStep === 3, 'Paso 3: Presupuesto enviado esperando confirmación');
  assert(proc.stateInfo.statusKey === 'esperando_confirmacion', 'Estado esperando_confirmacion');

  // 5.3 Paso 4: Aprobación del presupuesto en Paso a Paso
  DataService.update('presupuestos', presQA.id, { estado: 'aprobado' });
  proc = getAllProcesses().find(p => p.presupuestoId === presQA.id);
  assert(proc.stateInfo.currentStep === 4, 'Paso 4: Presupuesto aprobado listo para crear Obra técnica');
  assert(proc.stateInfo.statusKey === 'crear_obra', 'Estado en Paso 4 es crear_obra');

  // 5.4 Crear Obra técnica con fechaEstimada cargada
  const obraQA = DataService.create('obras', {
    presupuestoId: presQA.id,
    presupuestoNumero: presQA.numero || `PRES-${presQA.id}`,
    clienteId: clienteQA.id,
    clienteNombre: 'Santiago Mármol',
    direccion: clienteQA.direccion,
    descripcion: 'Mesada cocina y alzada',
    material: 'Silestone Blanco Zeus',
    importe: 400000,
    fechaInicio: '2026-09-22',
    fechaEstimada: '2026-10-15', // Fecha contractual de entrega
    estado: 'pendiente'
  });
  DataService.update('presupuestos', presQA.id, { obraId: obraQA.id });

  // 5.5 CRÍTICO: Verificar que NO salta al Paso 6 (Seña) y SE MANTIENE EN PASO 5 (Agenda)
  proc = getAllProcesses().find(p => p.presupuestoId === presQA.id);
  assert(proc.stateInfo.currentStep === 5, 'Con fechaEstimada asignada PERMANECE en Paso 5 (Agenda / Falta agendar)');
  assert(proc.stateInfo.statusKey === 'falta_agendar', 'Estado detectado: "falta_agendar"');

  // 5.6 Agendar en Calendario
  const eventoQA = DataService.create('eventos', {
    obraId: obraQA.id,
    presupuestoId: presQA.id,
    clienteId: clienteQA.id,
    tipo: 'instalacion',
    fecha: '2026-10-10',
    hora: '09:30',
    direccion: obraQA.direccion
  });
  assert(!!eventoQA.id, 'Evento de colocación creado en Calendario');

  // 5.7 Paso 6: Con evento agendado y sin cobro avanza a Seña
  proc = getAllProcesses().find(p => p.presupuestoId === presQA.id);
  assert(proc.stateInfo.currentStep === 6, 'Avanza a Paso 6 (Seña / Anticipo) tras agendar');
  assert(proc.stateInfo.statusKey === 'pendiente_sena', 'Estado: "pendiente_sena"');

  // 5.8 Cobro de seña (50% = 200.000)
  const cobroQA = DataService.create('cobros', {
    clienteId: clienteQA.id,
    obraId: obraQA.id,
    presupuestoId: presQA.id,
    importe: 200000,
    fecha: '2026-09-22',
    metodoPago: 'transferencia',
    estado: 'cobrado'
  });
  assert(!!cobroQA.id, 'Cobro de seña registrado');

  // 5.9 Paso 7: Taller y salida de stock
  proc = getAllProcesses().find(p => p.presupuestoId === presQA.id);
  assert(proc.stateInfo.currentStep === 7, 'Con seña cobrada avanza a Paso 7 (Taller)');
  assert(proc.stateInfo.statusKey === 'pendiente_taller', 'Estado: "pendiente_taller"');

  // Iniciar producción y salida de stock
  DataService.update('obras', obraQA.id, {
    estado: 'en_proceso',
    stockDescontado: true
  });

  // 5.10 Paso 8: Colocación y saldo
  proc = getAllProcesses().find(p => p.presupuestoId === presQA.id);
  assert(proc.stateInfo.currentStep === 8, 'Avanza a Paso 8 (Colocación y Cierre)');

  // Cobro final de saldo restante ($200.000)
  DataService.create('cobros', {
    clienteId: clienteQA.id,
    obraId: obraQA.id,
    presupuestoId: presQA.id,
    importe: 200000,
    fecha: '2026-09-23',
    metodoPago: 'efectivo',
    estado: 'cobrado'
  });

  // Finalizar obra
  DataService.update('obras', obraQA.id, {
    estado: 'finalizada',
    fechaFin: '2026-09-23'
  });

  proc = getAllProcesses().find(p => p.presupuestoId === presQA.id);
  assert(proc.stateInfo.currentStep === 8, 'Permanece en Paso 8 como proceso finalizado');
  assert(proc.stateInfo.statusKey === 'finalizada', 'Estado final: "finalizada"');
  assert(proc.stateInfo.progressPercent === 100, 'Progreso 100%');
  assert(proc.stateInfo.isCompleted === true, 'isCompleted = true');
}

// ── SECCIÓN 6: QA STOCK Y ALERTAS DE INVENTARIO ──
console.log('\n--- 6. QA STOCK, ENTRADAS, SALIDAS Y ALERTAS ---');
{
  const mat = DataService.create('materiales', {
    nombre: 'Mármol Blanco Carrara',
    categoria: 'Mármol',
    acabado: 'Pulido',
    espesor: 2,
    precioVentaM2: 180000,
    stockMinimo: 2
  });

  // Entrada de 5 placas
  DataService.create('stockMovimientos', {
    materialId: mat.id,
    tipo: 'entrada',
    cantidad: 5,
    referencia: 'Compra proveedor Carrara S.A.'
  });

  // Salida de 4 placas
  DataService.create('stockMovimientos', {
    materialId: mat.id,
    tipo: 'salida',
    cantidad: 4,
    referencia: 'Consumo obra'
  });

  const stockActual = DataService.getStockActual(mat.id);
  assert(stockActual === 1, `Stock calculado correctamente (5 - 4 = 1 placa). Obtenido: ${stockActual}`);

  // Verificar alerta de stock bajo (stockActual 1 < stockMinimo 2)
  const bajoStock = DataService.getDashboardStats().stockBajo;
  const alertado = bajoStock.find(m => m.id === mat.id);
  assert(!!alertado, 'Material correctamente detectado en lista de Alertas de Stock Bajo');
}

// ── SECCIÓN 7: QA PROVEEDORES, FACTURAS Y PAGOS ──
console.log('\n--- 7. QA PROVEEDORES, CUENTAS CORRIENTES Y PAGOS PARCIALES ---');
{
  const prov = DataService.create('proveedores', {
    nombre: 'Canteras del Sur',
    telefono: '11-3333-5555',
    contacto: 'Jorge Canteras'
  });

  // Factura de compra por $1.000.000
  const fac = DataService.create('facturas', {
    proveedorId: prov.id,
    tipo: 'factura',
    numeroFactura: 'A-0001-00009999',
    importe: 1000000,
    estado: 'pendiente'
  });

  // Pago parcial de $400.000
  const pago = DataService.create('pagos', {
    proveedorId: prov.id,
    facturaId: fac.id,
    importe: 400000,
    estado: 'pagado',
    metodoPago: 'transferencia'
  });

  const facActualizada = DataService.getById('facturas', fac.id);
  assert(facActualizada.estado === 'parcial', 'Factura con pago parcial pasa automáticamente a estado "parcial"');

  const saldoFac = DataService.getFacturaSaldoPendiente(fac.id);
  assert(saldoFac === 600000, `Saldo restante de factura exacto ($600.000). Obtenido: ${saldoFac}`);

  const saldoProv = DataService.getProveedorSaldo(prov.id);
  assert(saldoProv.saldo === 600000, `Saldo en cuenta corriente del proveedor exacto ($600.000). Obtenido: ${saldoProv.saldo}`);
}

// ── SECCIÓN 8: QA DOCUMENT EXPORTER (PDF Y WHATSAPP) ──
console.log('\n--- 8. QA EXPORTADOR DE DOCUMENTOS Y WHATSAPP ---');
{
  const presDoc = {
    id: 'pre-test-doc',
    numero: 'PRES-9999',
    clienteNombre: 'Cliente Documento',
    items: [{ descripcion: 'Mesada cocina', subtotal: 150000, m2: 1.5 }],
    condicionComercial: 'descuento',
    motivoCondicion: 'CLIENTE_SECRETO_CONFIDENCIAL'
  };

  const htmlDoc = generatePresupuestoHtml(presDoc, null, 150000);
  assert(htmlDoc.includes('PRES-9999'), 'HTML de presupuesto contiene el número oficial');
  assert(!htmlDoc.includes('CLIENTE_SECRETO_CONFIDENCIAL'), 'HTML NO exhibe notas internas confidenciales del cliente');

  const obraDocHtml = generateObraHtml({ id: 'obr-doc-1', descripcion: 'Mesada técnica', motivoCondicion: 'CLIENTE_SECRETO_CONFIDENCIAL' });
  assert(obraDocHtml.includes('Mesada técnica'), 'HTML de orden de obra contiene la descripción del trabajo');
  assert(!obraDocHtml.includes('CLIENTE_SECRETO_CONFIDENCIAL'), 'Ficha de Obra NO filtra notas internas confidenciales');
}

// ── SECCIÓN 9: SINCRONIZACIÓN Y RESISTENCIA DE LOCALSTORAGE ──
console.log('\n--- 9. QA PERSISTENCIA LOCALSTORAGE ---');
{
  const allProcs = getAllProcesses();
  assert(allProcs.length > 0, `Procesos recuperados correctamente (${allProcs.length} en total)`);

  const rawClientes = localStorage.getItem('mb_clientes');
  assert(!!rawClientes && rawClientes.length > 5, 'localStorage mb_clientes contiene datos serializados válidos');
}

console.log('\n===============================================================');
console.log(`🏁 FIN DE AUDITORÍA QA EXHAUSTIVA: ${passed} PASADAS, ${failed} FALLADAS`);
console.log('===============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
