const BASE_CENTAVOS = 28;

const REGLAS_PENALIZACION = [
  {
    condicion: botella => botella.tiene_tapa,
    penalizacion: 3,
  },
  {
    condicion: botella => botella.tiene_etiqueta,
    penalizacion: 2,
  },
  {
    condicion: botella => !botella.comprimida,
    penalizacion: 4,
  },
  {
    condicion: botella => !botella.seca,
    penalizacion: 6,
  },
  {
    condicion: botella => botella.tiene_liquido,
    penalizacion: 18,
  },
  {
    condicion: botella => botella.comprimida && botella.tiene_liquido,
    penalizacion: 10,
  },
];


function calcularPenalizacionTotal(botella) {
  return REGLAS_PENALIZACION.reduce((total, regla) => {
    return regla.condicion(botella)
      ? total + regla.penalizacion
      : total;
  }, 0);
}

export function calcularPrecio(botella) {
  const penalizacion = calcularPenalizacionTotal(botella);
  return (BASE_CENTAVOS - penalizacion) / 100;
}
