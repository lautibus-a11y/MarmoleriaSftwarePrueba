/* ============================================
   Item Measure — Estrategias de medición de piezas
   ============================================
   Único lugar que sabe CÓMO se obtiene la superficie (m²) de un ítem
   de presupuesto y CÓMO se describe su medida en pantallas y documentos.

   Modos:
   - 'auto'   (default): largo × ancho × cantidad, en cm o m.
   - 'manual': la usuaria escribe los m² totales y un detalle libre
               (útil para bachas o piezas con muchos recortes).

   Los ítems sin `modoMedida` (presupuestos existentes) se tratan como 'auto',
   por lo que su cálculo no cambia.
   ============================================ */

export const MODO_MEDIDA = Object.freeze({ AUTO: 'auto', MANUAL: 'manual' });

/** Convierte "2,35" / "2.35" / 2.35 a número (0 si no es válido). */
export function parseDecimal(val) {
  const n = parseFloat(String(val ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function roundM2(v) {
  return Math.round((v + Number.EPSILON) * 10000) / 10000;
}

const strategies = {
  [MODO_MEDIDA.AUTO]: {
    // Cálculo original de presupuestos.js, sin cambios de comportamiento
    computeM2(it) {
      const cant = Math.max(1, parseFloat(it.cantidad) || 1);
      const factor = it.unidadMedida === 'm' ? 1 : 100;
      const largoM = parseDecimal(it.largo) / factor;
      const anchoM = parseDecimal(it.ancho) / factor;

      let m2 = 0;
      if (largoM > 0 && anchoM > 0) m2 = (largoM * anchoM) * cant;
      else if (largoM > 0 && anchoM === 0) m2 = largoM * cant;
      return roundM2(m2);
    },
    describe(it) {
      const u = it.unidadMedida || ((it.largo > 10 || it.ancho > 10) ? 'cm' : 'm');
      const fmt = (val) => {
        const s = String(val ?? '').trim();
        return (!s || s === '0') ? '-' : `${s} ${u}`;
      };
      return `${fmt(it.largo)} × ${fmt(it.ancho)}`;
    }
  },

  [MODO_MEDIDA.MANUAL]: {
    // m² totales ingresados a mano: no se multiplican por cantidad
    computeM2(it) {
      return roundM2(Math.max(0, parseDecimal(it.m2Manual)));
    },
    describe(it) {
      const d = String(it.detalleMedida ?? '').trim();
      return d || 'Medida manual';
    }
  }
};

function strategyFor(it) {
  return strategies[it?.modoMedida] || strategies[MODO_MEDIDA.AUTO];
}

/** ¿El ítem usa m² cargados manualmente? */
export function isManualMeasure(it) {
  return it?.modoMedida === MODO_MEDIDA.MANUAL;
}

/** Superficie en m² del ítem según su modo. */
export function computeItemM2(it) {
  return strategyFor(it).computeM2(it);
}

/** Texto legible de la medida (texto plano, escapar antes de insertar en HTML). */
export function describeItemMeasure(it) {
  return strategyFor(it).describe(it);
}
