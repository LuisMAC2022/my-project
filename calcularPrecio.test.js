// calcularPrecio.test.js
// Especificación ejecutable de calcularPrecio.
// Los 4 invariantes del DESIGN.md, como tests. Estos NO cambian aunque se
// ajusten los números de balance: verifican RELACIONES, no solo valores.
//
// Correr con:  node calcularPrecio.test.js
//
// NOTA: importa desde ./calcularPrecio.js, que el agente debe implementar.
// Mientras no exista, este archivo falla al importar — eso es correcto:
// el test es la especificación que se escribe ANTES que la implementación.

import { calcularPrecio } from "./calcularPrecio.js";
import { assertEqual, assert, resumen } from "./test_runner.js";

// --- Helpers para construir botellas legibles ---
// Botella base: todos los campos. Se sobreescribe lo que cada test necesite.
function botella(overrides = {}) {
  return {
    tiene_tapa: false,
    tiene_etiqueta: false,
    tiene_liquido: false,
    comprimida: true,
    seca: true,
    volumen: 0.3,
    ...overrides,
  };
}

console.log("\ncalcularPrecio:");

// --- Caso 1: botella perfecta paga el máximo ---
// 7 $/kg * 0.04 kg = 0.28
const perfecta = botella();
assertEqual(calcularPrecio(perfecta), 0.28, "botella perfecta = 0.28");

// --- Caso 2: peor caso de SOLO separación sigue siendo POSITIVO ---
// vacía y seca, pero con tapa + etiqueta + sin comprimir.
// 0.28 - 0.03 - 0.02 - 0.04 = 0.19. Invariante: separación nunca da negativo.
const soloSeparacion = botella({
  tiene_tapa: true,
  tiene_etiqueta: true,
  comprimida: false,
  volumen: 1.0,
});
assertEqual(calcularPrecio(soloSeparacion), 0.19, "solo separación = 0.19");
assert(calcularPrecio(soloSeparacion) > 0, "solo separación es POSITIVO (invariante 1)");

// --- Caso 3: crudo total da negativo PEQUEÑO ---
// todos los defectos + líquido, sin comprimir, sin secar.
// 0.28 - 0.03 - 0.02 - 0.04 - 0.06 - 0.18 = -0.05
const crudo = botella({
  tiene_tapa: true,
  tiene_etiqueta: true,
  tiene_liquido: true,
  comprimida: false,
  seca: false,
  volumen: 1.0,
});
assertEqual(calcularPrecio(crudo), -0.05, "crudo total = -0.05");
assert(calcularPrecio(crudo) < 0, "crudo total es NEGATIVO (lección central)");

// --- Caso 4: comprimir con líquido AGRAVA (invariante por COMPARACIÓN) ---
// No se verifica con un número absoluto sino comparando la MISMA botella con
// líquido antes y después de comprimir. Comprimir con el líquido dentro debe
// dejarla PEOR. Esto es más robusto: la relación se mantiene aunque se ajuste
// el balance.
// NOTA DE DISEÑO: un estado "crudo total comprimido" con tapa es IMPOSIBLE,
// porque con tapa no se comprime. Por eso ambas botellas van destapadas.
const conLiquidoSinComprimir = botella({
  tiene_etiqueta: true,
  tiene_liquido: true,
  comprimida: false,
  seca: false,
  volumen: 1.0,
});
const conLiquidoComprimida = botella({
  tiene_etiqueta: true,
  tiene_liquido: true,
  comprimida: true,
  seca: false,
  volumen: 0.3,
});
// Valores verificados: -0.02 antes, -0.08 después.
assertEqual(calcularPrecio(conLiquidoSinComprimir), -0.02, "con líquido sin comprimir = -0.02");
assertEqual(calcularPrecio(conLiquidoComprimida), -0.08, "con líquido comprimida = -0.08");
assert(
  calcularPrecio(conLiquidoComprimida) < calcularPrecio(conLiquidoSinComprimir),
  "comprimir CON líquido la deja PEOR (invariante 4)"
);

// --- Invariante relacional: separación pesa menos que contaminación ---
// Suma de penalizaciones de separación (0.03+0.02+0.04=0.09) < líquido sola (0.18).
// Lo verificamos por diferencia de precios contra la perfecta.
const soloLiquido = botella({ tiene_liquido: true });
const penalizacionLiquido = 0.28 - calcularPrecio(soloLiquido);
const penalizacionSeparacionTotal = 0.28 - calcularPrecio(soloSeparacion);
assert(
  penalizacionSeparacionTotal < penalizacionLiquido,
  "separación total pesa MENOS que líquido solo (invariante 2)"
);

resumen();
