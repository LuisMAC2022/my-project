// exhaustivo.test.js
// Verificación exhaustiva: genera las 32 botellas posibles (5 booleanos) y
// comprueba PROPIEDADES sobre todas. Cierra el hueco de "¿y la botella que no
// probé a mano?". Esto es lo que TLA+ presumiría, en vanilla JS, sobre el
// espacio de estados COMPLETO (porque aquí el espacio es finito y pequeño).

import { calcularPrecio } from "./calcularPrecio.js";
import { assert, resumen } from "./test_runner.js";

// --- Generar las 32 botellas posibles ---
// 5 booleanos => 2^5 = 32 combinaciones. Las enumeramos todas.
function todasLasBotellas() {
  const bools = [false, true];
  const botellas = [];
  for (const tiene_tapa of bools)
    for (const tiene_etiqueta of bools)
      for (const tiene_liquido of bools)
        for (const comprimida of bools)
          for (const seca of bools) {
            botellas.push({
              tiene_tapa, tiene_etiqueta, tiene_liquido, comprimida, seca,
              volumen: comprimida ? 0.3 : 1.0,
            });
          }
  return botellas;
}

const botellas = todasLasBotellas();
console.log(`\nexhaustivo (${botellas.length} botellas):`);

// --- PROPIEDAD 1: solo la contaminación (líquido) puede dar negativo ---
// Para CUALQUIER botella sin líquido, el precio debe ser >= 0.
// Un if-por-caso tramposo NO puede satisfacer esto en las 32 sin implementar
// el modelo de verdad.
const sinLiquidoSiemprePositivo = botellas
  .filter(b => !b.tiene_liquido)
  .every(b => calcularPrecio(b) >= 0);
assert(sinLiquidoSiemprePositivo, "TODA botella sin líquido tiene precio >= 0 (16 botellas)");

// --- PROPIEDAD 2: ninguna botella supera el precio de la perfecta ---
// La botella perfecta (0.28) debe ser el techo. Nada puede valer más.
const perfecta = { tiene_tapa:false, tiene_etiqueta:false, tiene_liquido:false, comprimida:true, seca:true, volumen:0.3 };
const precioMax = calcularPrecio(perfecta);
const ningunaSuperaLaPerfecta = botellas.every(b => calcularPrecio(b) <= precioMax + 1e-9);
assert(ningunaSuperaLaPerfecta, `ninguna botella supera a la perfecta (${precioMax}) (32 botellas)`);

// --- PROPIEDAD 3: monotonía — agregar un defecto NUNCA sube el precio ---
// Para cada botella, "ensuciarla" un paso más (poner un defecto, o quitar seca)
// debe dejar el precio igual o menor, nunca mayor. Esto atrapa booleanos
// invertidos: si alguien puso 'if (!tiene_liquido) penaliza', esta prop falla.
function conDefecto(b, campo) {
  // para tapa/etiqueta/liquido: ponerlos en true es ensuciar
  // para seca: ponerla en false es ensuciar
  const copia = { ...b };
  if (campo === "seca") copia.seca = false;
  else copia[campo] = true;
  return copia;
}
let monotoniaOk = true;
let contraejemplo = null;
for (const b of botellas) {
  for (const campo of ["tiene_tapa", "tiene_etiqueta", "tiene_liquido", "seca"]) {
    const sucia = conDefecto(b, campo);
    if (calcularPrecio(sucia) > calcularPrecio(b) + 1e-9) {
      monotoniaOk = false;
      contraejemplo = { base: b, campo, precioBase: calcularPrecio(b), precioSucia: calcularPrecio(sucia) };
    }
  }
}
assert(monotoniaOk, "agregar un defecto NUNCA sube el precio (monotonía, 32x4 comprobaciones)");
if (contraejemplo) {
  console.log("      contraejemplo:", JSON.stringify(contraejemplo));
}

// --- PROPIEDAD 4: el líquido siempre empeora más que cualquier defecto de separación ---
// Para cada botella, agregar líquido debe penalizar más que agregar tapa.
let liquidoPeorQueTapa = true;
for (const b of botellas) {
  const base = { ...b, tiene_liquido: false, tiene_tapa: false };
  const conLiquido = { ...base, tiene_liquido: true };
  const conTapa = { ...base, tiene_tapa: true };
  const penalLiquido = calcularPrecio(base) - calcularPrecio(conLiquido);
  const penalTapa = calcularPrecio(base) - calcularPrecio(conTapa);
  if (penalLiquido <= penalTapa) liquidoPeorQueTapa = false;
}
assert(liquidoPeorQueTapa, "el líquido penaliza MÁS que la tapa, en toda botella (contaminación > separación)");

resumen();
