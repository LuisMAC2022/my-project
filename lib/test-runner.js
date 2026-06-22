/* test-runner.js
// Runner de tests mínimo, sin dependencias. ES modules.
// Provee assert() y assertEqual(); al final imprime resumen y sale con
// código 1 si algo falló (para que hooks/CI puedan detectar el fallo).
*/
let pasados = 0;
let fallados = 0;
const fallos = [];

// Compara con tolerancia, porque trabajamos con decimales (0.1 + 0.2 !== 0.3
// en punto flotante). EPSILON evita falsos negativos por error de redondeo.
const EPSILON = 1e-9;

export function assertEqual(actual, esperado, nombre) {
  if (Math.abs(actual - esperado) < EPSILON) {
    pasados++;
    console.log(`  ✓ ${nombre}`);
  } else {
    fallados++;
    fallos.push(nombre);
    console.log(`  ✗ ${nombre}`);
    console.log(`      esperado: ${esperado}`);
    console.log(`      recibido: ${actual}`);
  }
}

export function assert(condicion, nombre) {
  if (condicion) {
    pasados++;
    console.log(`  ✓ ${nombre}`);
  } else {
    fallados++;
    fallos.push(nombre);
    console.log(`  ✗ ${nombre}`);
  }
}

export function resumen() {
  console.log("");
  console.log(`  ${pasados} pasados, ${fallados} fallados`);
  if (fallados > 0) {
    console.log("");
    console.log("  FALLARON:");
    fallos.forEach((f) => console.log(`    - ${f}`));
    process.exit(1); // señal de fallo para hooks/CI
  } else {
    console.log("  Todo en verde.");
  }
}
