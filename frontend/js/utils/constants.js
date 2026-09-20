/* ========================================
   MARMOLERÍA BENJAMIN — Constants
   ======================================== */

export const APP_NAME = 'Marmolería Benjamin';

// ── Presupuesto States ──
export const PRESUPUESTO_ESTADOS = {
  BORRADOR: 'borrador',
  ENVIADO: 'enviado',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
  VENCIDO: 'vencido'
};

export const PRESUPUESTO_ESTADO_LABELS = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  vencido: 'Vencido'
};

export const PRESUPUESTO_ESTADO_COLORS = {
  borrador: 'neutral',
  enviado: 'info',
  aprobado: 'success',
  rechazado: 'error',
  vencido: 'warning'
};

// ── Obra States ──
export const OBRA_ESTADOS = {
  PENDIENTE: 'pendiente',
  EN_PREPARACION: 'en_preparacion',
  EN_PROCESO: 'en_proceso',
  COLOCACION: 'colocacion',
  FINALIZADA: 'finalizada',
  CANCELADA: 'cancelada'
};

export const OBRA_ESTADO_LABELS = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  en_proceso: 'En proceso',
  colocacion: 'Colocación',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada'
};

export const OBRA_ESTADO_COLORS = {
  pendiente: 'neutral',
  en_preparacion: 'info',
  en_proceso: 'warning',
  colocacion: 'accent',
  finalizada: 'success',
  cancelada: 'error'
};

// ── Factura States ──
export const FACTURA_ESTADOS = {
  PENDIENTE: 'pendiente',
  PAGADA: 'pagada',
  VENCIDA: 'vencida',
  PARCIAL: 'parcial'
};

export const FACTURA_ESTADO_LABELS = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  pagado: 'Pagada',
  vencida: 'Vencida',
  parcial: 'Parcial'
};

export const FACTURA_ESTADO_COLORS = {
  pendiente: 'warning',
  pagada: 'success',
  pagado: 'success',
  vencida: 'error',
  parcial: 'info'
};

// ── Factura Types ──
export const FACTURA_TIPOS = {
  FACTURA: 'factura',
  NOTA_CREDITO: 'nota_credito',
  NOTA_DEBITO: 'nota_debito'
};

export const FACTURA_TIPO_LABELS = {
  factura: 'Factura',
  nota_credito: 'Nota de Crédito',
  nota_debito: 'Nota de Débito'
};

// ── Pago States ──
export const PAGO_ESTADOS = {
  PENDIENTE: 'pendiente',
  PAGADO: 'pagado',
  VENCIDO: 'vencido',
  PARCIAL: 'parcial'
};

export const PAGO_ESTADO_LABELS = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  vencido: 'Vencido',
  parcial: 'Parcial'
};

export const PAGO_ESTADO_COLORS = {
  pendiente: 'warning',
  pagado: 'success',
  vencido: 'error',
  parcial: 'info'
};

// ── Cobro States ──
export const COBRO_ESTADOS = {
  PENDIENTE: 'pendiente',
  PARCIAL: 'parcial',
  COBRADO: 'cobrado'
};

export const COBRO_ESTADO_LABELS = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  cobrado: 'Cobrado'
};

export const COBRO_ESTADO_COLORS = {
  pendiente: 'warning',
  parcial: 'info',
  cobrado: 'success'
};

// ── Payment Methods ──
export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'home_banking', label: 'Home Banking' },
  { value: 'office', label: 'Office' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'otro', label: 'Otro' }
];

// ── Currencies ──
export const MONEDAS = [
  { value: 'ARS', label: 'Pesos (ARS)', symbol: '$' },
  { value: 'USD', label: 'Dólares (USD)', symbol: 'US$' }
];

export const MONEDA_DEFAULT = 'ARS';

// ── Stock Units (m² is default for marble and stone work) ──
export const UNIDADES = [
  { value: 'm2', label: 'Metro cuadrado (m²)' },
  { value: 'metros', label: 'Metro lineal (ml)' },
  { value: 'unidades', label: 'Unidad (un)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'placas', label: 'Placas enteras' }
];

// ── Stock Movement Types ──
export const MOVIMIENTO_TIPOS = {
  ENTRADA: 'entrada',
  SALIDA: 'salida',
  AJUSTE: 'ajuste',
  DEVOLUCION: 'devolucion'
};

export const MOVIMIENTO_TIPO_LABELS = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  devolucion: 'Devolución'
};

export const MOVIMIENTO_TIPO_COLORS = {
  entrada: 'success',
  salida: 'error',
  ajuste: 'warning',
  devolucion: 'info'
};

// ── Material Categories ──
export const MATERIAL_CATEGORIAS = [
  { value: 'marmol', label: 'Mármol' },
  { value: 'granito', label: 'Granito' },
  { value: 'cuarzo', label: 'Cuarzo' },
  { value: 'silestone', label: 'Silestone' },
  { value: 'porcelanato', label: 'Porcelanato' },
  { value: 'travertino', label: 'Travertino' },
  { value: 'onix', label: 'Ónix' },
  { value: 'otro', label: 'Otro' }
];

// ── Factura Categories ──
export const FACTURA_CATEGORIAS = [
  { value: 'materiales', label: 'Materiales' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' }
];

// ── Default Commercial Conditions ──
export const CONDICIONES_COMERCIALES_DEFAULT = [
  'Presupuesto válido por 15 días.',
  'Forma de pago: 50% al aprobar, 50% al finalizar.',
  'Plazo de entrega a coordinar según disponibilidad de material.',
  'Precios en pesos argentinos. Sujetos a variación sin previo aviso.',
  'No incluye trabajos de albañilería ni plomería salvo que se especifique.',
  'Garantía de colocación: 6 meses.'
];

// ── File Upload ──
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ── Pagination ──
export const DEFAULT_PAGE_SIZE = 20;

// ── Event Types (Calendario Operativo) ──
export const EVENTO_TIPOS = {
  MEDICION: 'medicion',
  VISITA: 'visita',
  INICIO_TRABAJO: 'inicio_trabajo',
  FABRICACION: 'fabricacion',
  INSTALACION: 'instalacion',
  ENTREGA: 'entrega',
  COBRO: 'cobro',
  RECORDATORIO: 'recordatorio',
  OTRO: 'otro'
};

export const EVENTO_TIPO_LABELS = {
  medicion: 'Medición',
  visita: 'Visita',
  inicio_trabajo: 'Inicio de trabajo',
  fabricacion: 'Fabricación / Preparación',
  instalacion: 'Instalación / Colocación',
  entrega: 'Entrega',
  cobro: 'Cobro',
  recordatorio: 'Recordatorio',
  otro: 'Otro'
};

export const EVENTO_TIPO_COLORS = {
  medicion: 'info',
  visita: 'accent',
  inicio_trabajo: 'warning',
  fabricacion: 'neutral',
  instalacion: 'accent',
  entrega: 'success',
  cobro: 'success',
  recordatorio: 'warning',
  otro: 'neutral'
};

// ── Event States ──
export const EVENTO_ESTADOS = {
  PENDIENTE: 'pendiente',
  REALIZADO: 'realizado',
  CANCELADO: 'cancelado'
};

export const EVENTO_ESTADO_LABELS = {
  pendiente: 'Pendiente',
  realizado: 'Realizado',
  cancelado: 'Cancelado'
};

export const EVENTO_ESTADO_COLORS = {
  pendiente: 'warning',
  realizado: 'success',
  cancelado: 'error'
};

// ── Navigation Items ──
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Inicio', icon: 'home', path: '/dashboard' },
  { id: 'paso-a-paso', label: 'Paso a Paso', icon: 'workflow', path: '/paso-a-paso' },
  { id: 'calendario', label: 'Calendario', icon: 'calendar', path: '/calendario' },
  { id: 'presupuestos', label: 'Presupuestos', icon: 'file-text', path: '/presupuestos' },
  { id: 'clientes', label: 'Clientes', icon: 'users', path: '/clientes' },
  { id: 'obras', label: 'Obras', icon: 'hard-hat', path: '/obras' },
  { id: 'stock', label: 'Stock e Inventario', icon: 'package', path: '/stock' },
  { id: 'proveedores', label: 'Proveedores', icon: 'truck', path: '/proveedores' },
  { id: 'facturas', label: 'Facturas / Cuentas', icon: 'receipt', path: '/facturas' },
  { id: 'pagos', label: 'Pagos', icon: 'credit-card', path: '/pagos' },
  { id: 'cobros', label: 'Cobros', icon: 'hand-coins', path: '/cobros' },
  { id: 'configuracion', label: 'Configuración', icon: 'settings', path: '/configuracion' }
];
