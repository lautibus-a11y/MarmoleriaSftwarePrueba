/* ========================================
   MARMOLERÍA BENJAMIN — Seed Data for Cloudflare R2
   Clean empty dataset for production
   ======================================== */

export const INITIAL_SEED = {
  clientes: [],
  materiales: [],
  stockMovimientos: [],
  proveedores: [],
  presupuestos: [],
  obras: [],
  facturas: [],
  pagos: [],
  cobros: [],
  eventos: [],
  config: {
    empresa_nombre: 'Marmolería Benjamin',
    empresa_subtitulo: 'Mármoles • Granitos • Silestone • Neolith • Purastone',
    empresa_cuit: '',
    empresa_direccion: '',
    empresa_telefono: '',
    empresa_email: '',
    cotizacionDolar: 1350,
    condiciones: 'Presupuesto válido por 15 días corridos a partir de la fecha de emisión.\nForma de pago: 50% de anticipo al confirmar y saldo contra entrega y colocación.\nLos precios no incluyen IVA salvo indicación expresa.\nPlazo de entrega estimado: 10 a 15 días hábiles a partir de la toma de medidas definitiva y acreditación del anticipo.\nLas modificaciones sobre medidas o planos posteriores a la aprobación podrán generar costos adicionales y reprogramación de entrega.\nEl cliente debe garantizar el libre acceso a la obra y suministro eléctrico para la colocación.'
  }
};
