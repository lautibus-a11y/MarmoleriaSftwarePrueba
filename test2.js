import { generateAutoNumber } from './frontend/js/utils/helpers.js';

let count = 5;
const mockStore = [
  { id: '1', numero: 'PRES-2026-0005' }
];

function test() {
  const isSaveAsNew = true;
  const editId = '1';
  
  // mock formData
  const data = { numero: 'PRES-2026-0005', clienteId: 'c1' };
  
  const record = { ...data };
  
  if (editId && !isSaveAsNew) {
     console.log("UPDATE");
  } else {
     if (isSaveAsNew) {
        record.numero = generateAutoNumber('PRES', mockStore);
        record.fecha = '2026-10-03';
     }
     console.log("CREATE with", record.numero);
     mockStore.unshift(record);
  }
}

test();
console.log("mockStore:", mockStore.map(m => m.numero));
test();
console.log("mockStore:", mockStore.map(m => m.numero));

