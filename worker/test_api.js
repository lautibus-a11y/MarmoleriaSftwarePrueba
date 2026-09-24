import worker from './src/index.js';

async function runTests() {
  console.log('🧪 Iniciando pruebas del Cloudflare Worker API...');

  const mockEnv = {}; // Local fallback memory store

  // 1. Health
  const reqHealth = new Request('http://localhost:3000/api/health');
  const resHealth = await worker.fetch(reqHealth, mockEnv, {});
  const dataHealth = await resHealth.json();
  console.assert(dataHealth.status === 'ok', 'Health status failed');
  console.log('✅ Health check:', dataHealth);

  // 2. Sync
  const reqSync = new Request('http://localhost:3000/api/sync');
  const resSync = await worker.fetch(reqSync, mockEnv, {});
  const dataSync = await resSync.json();
  console.assert(Array.isArray(dataSync.clientes), 'Clientes array missing in sync');
  console.assert(Array.isArray(dataSync.materiales), 'Materiales array missing in sync');
  console.assert(Array.isArray(dataSync.eventos), 'Eventos array missing in sync');
  console.assert(dataSync.materiales.some(m => m.nombre === 'Negro Brasil' && m.precioM2 === 50000), 'Negro Brasil material missing or incorrect');
  console.log(`✅ Sync data OK: ${dataSync.clientes.length} clientes, ${dataSync.materiales.length} materiales, ${dataSync.eventos.length} eventos.`);

  // 3. Create Cliente
  const reqPostCli = new Request('http://localhost:3000/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Pedro',
      apellido: 'Alonso',
      telefono: '11-9999-8888',
      direccion: 'Rivadavia 1234'
    })
  });
  const resPostCli = await worker.fetch(reqPostCli, mockEnv, {});
  const createdCli = await resPostCli.json();
  console.assert(createdCli.id && createdCli.nombre === 'Pedro', 'Create cliente failed');
  console.log('✅ Create Cliente OK:', createdCli.id, createdCli.nombre);

  // 4. Create Evento Calendario
  const reqPostEvt = new Request('http://localhost:3000/api/eventos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: 'medicion',
      fecha: '2026-09-22',
      hora: '11:00',
      clienteNombre: 'Pedro Alonso',
      direccion: 'Rivadavia 1234',
      estado: 'pendiente'
    })
  });
  const resPostEvt = await worker.fetch(reqPostEvt, mockEnv, {});
  const createdEvt = await resPostEvt.json();
  console.assert(createdEvt.id && createdEvt.tipo === 'medicion', 'Create evento failed');
  console.log('✅ Create Evento OK:', createdEvt.id, createdEvt.tipo);

  // 5. Backups
  const reqBackup = new Request('http://localhost:3000/api/backups');
  const resBackup = await worker.fetch(reqBackup, mockEnv, {});
  const dataBackup = await resBackup.json();
  console.assert(dataBackup.version && dataBackup.data, 'Backup failed');
  console.log('✅ Backup endpoint OK, versión:', dataBackup.version);

  // 6. Presupuesto con Adicionales y normalización Entrega y Colocación
  const reqPostPres = new Request('http://localhost:3000/api/presupuestos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clienteId: createdCli.id,
      items: [{ descripcion: 'Mesada Purastone', subtotal: 100000 }],
      adicionales: {
        entregaColocacion: 30000,
        mensulas: 10000,
        acarreo: 5000,
        porEscalera: 4000,
        traforoBachaAnafe: 8000,
        traforoCajasLuzGas: 2000,
        traforoDesague: 1500
      }
    })
  });
  const resPostPres = await worker.fetch(reqPostPres, mockEnv, {});
  const createdPres = await resPostPres.json();
  console.assert(createdPres.id && createdPres.adicionales.entregaColocacion === 30000, 'Create presupuesto failed');
  console.assert(createdPres.adicionales.mensulas === 10000, 'Mensulas missing in worker');
  console.assert(createdPres.adicionales.colocacion === undefined, 'Legacy colocacion should not exist');
  console.log('✅ Worker Presupuesto con nuevos adicionales y entrega y colocación OK:', createdPres.id);

  // 7. Configuración Purastone
  const reqConfig = new Request('http://localhost:3000/api/config');
  const resConfig = await worker.fetch(reqConfig, mockEnv, {});
  const dataConfig = await resConfig.json();
  console.assert(!dataConfig.empresa_subtitulo || dataConfig.empresa_subtitulo.includes('Purastone'), 'Config subtitulo should include Purastone');
  console.log('✅ Worker Configuración normalizada con Purastone OK');

  console.log('🎉 ¡Todas las pruebas unitarias del Worker pasaron exitosamente!');
}

runTests().catch(err => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
