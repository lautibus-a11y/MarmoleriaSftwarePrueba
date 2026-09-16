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

  console.log('🎉 ¡Todas las pruebas unitarias del Worker pasaron exitosamente!');
}

runTests().catch(err => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
