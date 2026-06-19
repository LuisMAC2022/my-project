# DESIGN.md — Simulador de la cadena de valor del reciclaje de PET

## Visión rectora

**No es un simulador de limpiar botellas. Es un simulador de logística de un
proceso de reciclado que comienza a escala hormiga y termina a escala elefante.**

El MVP es la hormiga: un inventario, una botella a la vez, procesar a mano. Todo
lo que crece hacia el elefante —logística entre espacios, maquinaria que
automatiza, volumen industrial— es fase 2 y posterior. Cuando dudes si algo entra
al MVP, pregúntate si la hormiga lo necesita para existir.

El arco completo conecta el reciclaje de PET de FES Acatlán con el proyecto
Superman de HUMAN stem (prótesis 3D impresas): el desecho se transforma en
filamento. Eso es endgame, no MVP, pero orienta todo el diseño.

---

## Propósito de este documento

Es la memoria del equipo. Contiene las decisiones de diseño congeladas. Se entrega
a cada agente como contexto y es la fuente de verdad de las interfaces. Si una
decisión no está aquí, no está decidida. Si un agente necesita asumir algo que no
está aquí, debe preguntar, no improvisar.

Modelo de trabajo (equipo quirúrgico, Brooks): el desarrollador humano es el
cirujano (autoridad sobre el diseño). El copiloto discute y verifica. Los agentes
ejecutan módulos ya especificados con interfaces congeladas. La división del
trabajo es por AUTORIDAD sobre el diseño, no por volumen: las interfaces se
congelan aquí antes de delegar.

### Dos documentos, dos funciones (no duplicar)
- **DESIGN.md (este):** QUÉ es cada módulo y cuál es su CONTRATO — interfaz
  congelada, reglas, invariantes. Lo necesario para usar o implementar el módulo.
- **DECISIONES.md (uno por módulo, junto al código):** POR QUÉ se tomaron las
  decisiones, qué alternativas se descartaron, cómo fue la iteración con el
  agente. Razonamiento histórico, no contrato.
Si borraras un DECISIONES.md, el módulo seguiría siendo implementable (el contrato
está aquí) pero perderías el porqué. Si borraras la sección de DESIGN.md, no
sabrías qué construir.

---

## ESTRUCTURA DEL PROYECTO (congelada)

```
reciclaje-pet/
├── DESIGN.md                    # este documento (raíz, visible)
├── package.json                 # {"type":"module"}
├── README.md                    # cómo correr los tests (pocas líneas)
├── lib/
│   └── test-runner.js           # infraestructura de test COMPARTIDA
├── src/
│   ├── calcularPrecio/
│   │   ├── calcularPrecio.js
│   │   └── DECISIONES.md
│   └── acciones/                # (próximo módulo)
│       ├── acciones.js
│       └── DECISIONES.md
└── test/                        # ESPEJA la forma de src/
    ├── calcularPrecio/
    │   ├── calcularPrecio.test.js
    │   └── calcularPrecio.exhaustivo.test.js
    └── acciones/
        ├── acciones.test.js
        └── acciones.exhaustivo.test.js
```

### Por qué test/ está SEPARADO de src/ (decisión deliberada)
Cuando se delega un módulo a un agente, se le entrega SOLO su carpeta de `src/`
para escribir, y el humano corre `test/` para verificar. Así el agente
físicamente NO recibe los tests: la frontera "no modifiques los tests" se hace
cumplir por separación física, no por obediencia del agente. Los imports cruzan
ramas: un test en `test/calcularPrecio/` importa el código desde
`../../src/calcularPrecio/calcularPrecio.js` y el runner desde
`../../lib/test-runner.js`.

### Convención de nombres
`MÓDULO.test.js` (tests de valor puntuales) y `MÓDULO.exhaustivo.test.js`
(propiedades sobre todo el espacio de estados). El nombre dice módulo y tipo de
un vistazo.

### Git
Inicializado. Sirve para historial, rollback y ramas. Las decisiones de DISEÑO
NO viven en los mensajes de commit (quedan enterradas); viven en DESIGN.md
(contrato) y DECISIONES.md por módulo (razonamiento).

---

## FRONTERA DEL MVP

### Lo que SÍ entra
- Una pantalla, un contenedor, un comprador. Cero arte (funcional-feo: botones y
  texto).
- Ciclo de tres pasos: RECOLECTAR → PROCESAR → VENDER.
- Botella con cinco booleanos + volumen.
- Seis acciones puras que modifican la botella.
- `calcularPrecio(botella)` que premia la botella limpia y castiga la sucia hasta
  precio negativo. (YA IMPLEMENTADO Y VERIFICADO.)
- UN límite de volumen activo como mecánica: el inventario.

### Lo que NO entra (fase 2 y posterior — ver sección final)
Basura/clasificación, tipos de líquido (agua vs azucarada), maquinaria,
reinversión, árbol de habilidades, publicidad in-game, endgame de prótesis 3D, el
mapa vectorial como mundo navegable, los tres espacios de volumen con flujo entre
ellos, mercados múltiples, peso variable, precio fluctuante, multijugador.

Principio: todo lo de fase 2 se cuelga del núcleo SIN modificarlo.

---

## ESTRUCTURA DE DATOS: la botella

```js
{
  tiene_tapa: true,      // defecto cuando true
  tiene_etiqueta: true,  // defecto cuando true
  tiene_liquido: true,   // defecto cuando true
  comprimida: false,     // BUENO cuando true
  seca: false,           // BUENO cuando true
  volumen: 1.0           // 1.0 sin comprimir, 0.3 comprimida
}
```

**Estado inicial (recién aparecida):** sucia. tapa/etiqueta/liquido en true,
comprimida/seca en false, volumen 1.0.

**Estado perfecto (objetivo):** tapa/etiqueta/liquido en false, comprimida/seca
en true, volumen 0.3.

### NOTA CRÍTICA SOBRE ASIMETRÍA
Tres propiedades son DEFECTOS cuando están en `true` (tiene_tapa, tiene_etiqueta,
tiene_liquido). Dos son BUENAS cuando están en `true` (comprimida, seca). Ningún
agente debe invertir esto.

---

## ACCIONES (seis funciones puras)

Regla general: cada acción toma una botella y DEVUELVE UNA BOTELLA NUEVA. No muta
la original (el test runner depende de esto). Cuando una precondición no se
cumple, la acción devuelve la botella SIN CAMBIOS y dispara un mensaje que se
desvanece (función genérica `mostrarMensaje(texto)`, reutilizable).

### Orden de procesamiento óptimo
**destapar → quitarEtiqueta → vaciar → secar → comprimir**
El secado va ANTES de comprimir (fundamento físico en DECISIONES.md de acciones:
una botella comprimida atrapa líquido en pliegues que el secado superficial no
alcanza; hay que secar abierta y desplegada). Comprimir es el último paso, puramente
logístico.

### Especificación de cada acción

`destapar(botella)` → copia con `tiene_tapa: false`. Sin precondición.

`quitarEtiqueta(botella)` → copia con `tiene_etiqueta: false`. Sin precondición.

`vaciar(botella)` → copia con `tiene_liquido: false`.
PRECONDICIÓN: `tiene_liquido === true && comprimida === false` (debe haber líquido
que sacar Y estar desplegada). Si está comprimida con líquido, el líquido está
sellado: vaciar NO funciona, hay que descomprimir primero.

`secar(botella)` → copia con `seca: true`.
PRECONDICIÓN: `tiene_liquido === false && comprimida === false` (vacía Y
descomprimida). No se seca una botella con líquido ni una comprimida.

`comprimir(botella)` → copia con `comprimida: true`, `volumen: 0.3`.
PRECONDICIÓN: `tiene_tapa === false` (sin tapa; con tapa el aire no sale).
SÍ se permite comprimir CON líquido — el jugador puede cometer ese error, y eso
sella el líquido. El precio lo penaliza (ver calcularPrecio).

`descomprimir(botella)` → copia con `comprimida: false`, `volumen: 1.0`.
SIN precondición (siempre funciona). Es la acción de REPARACIÓN: libera el líquido
sellado para poder vaciar y luego secar.

### Por qué existe descomprimir (no es opcional)
Sin `descomprimir`, una botella comprimida-con-líquido sería un estado
IRRECUPERABLE (no se puede vaciar ni secar). La reversión la vuelve recuperable
pero costosa en pasos: descomprimir → vaciar → secar → comprimir de nuevo. El
costo del error es la INEFICIENCIA (más acciones), no pérdida permanente.

### Comprimir/descomprimir sin penalización material (MVP)
El ciclo comprimir/descomprimir no daña la botella en el MVP; el único costo es el
tiempo/pasos. (Fase 2: posible desgaste por ciclado repetido — ver fase 2.)

---

## ECONOMÍA: calcularPrecio (IMPLEMENTADO Y VERIFICADO)

`calcularPrecio(botella) → number` (pesos MXN). Función PURA: entra una botella,
sale un número (puede ser negativo). Cero dependencias, cero estado.

ESTADO: implementado en `src/calcularPrecio/calcularPrecio.js`, verificado con
9 tests de valor + 4 propiedades exhaustivas, todo en verde.

### Modelo: precio por kg (no "puntos mágicos")
- Mercado MVP: acopio postconsumo (el que aceptaría ECOCE). Un solo comprador.
  Base 7 $/kg.
- Peso por botella (constante MVP): 0.04 kg.
- Botella perfecta: 7 × 0.04 = 0.28.
- Implementación en CENTAVOS ENTEROS (BASE = 28 centavos), dividiendo por 100 al
  final, para que el error de punto flotante sea IMPOSIBLE, no parcheado.

### Principio rector: SEPARACIÓN ≠ CONTAMINACIÓN
- Separación (tapa, etiqueta, sin comprimir): trabajo que se hará en planta.
  Penalización LEVE. Nunca lleva el precio a negativo por sí sola.
- Contaminación (líquido; en fase 2: tierra/aceite/orgánicos): merma real y costo
  de lavado. Penalización FUERTE. Es lo ÚNICO que puede llevar el precio a
  negativo.

### Tabla de penalizaciones (balance INICIAL — ajustable; centavos)
Constantes nombradas, NO incrustadas. Reglas como DATOS (array de
{condicion, penalizacion}), extensibles sin tocar la lógica.

| Estado malo | Naturaleza | Penalización (centavos) |
|---|---|---|
| BASE perfecta | — | +28 |
| tiene_tapa | separación | −3 |
| tiene_etiqueta | separación | −2 |
| !comprimida | logística | −4 |
| !seca | humedad (media) | −6 |
| tiene_liquido | CONTAMINACIÓN | −18 |
| comprimida && tiene_liquido | orden incorrecto (extra) | −10 |

Secado es penalización MEDIA a propósito: la humedad residual es crítica para
producir filamento (endgame Superman).

### INVARIANTES (diseño, no balance — no cambian aunque se ajusten números)
1. Solo contaminación da negativo. Cualquier botella con `tiene_liquido:false`
   tiene precio ≥ 0. Peor caso separación = +0.19 (positivo).
2. Separación pesa menos que contaminación. Suma separación (0.09) < líquido
   solo (0.18).
3. Crudo total da negativo pequeño: −0.05. Vender crudo cuesta dinero, pero una
   mala venta no quiebra.
4. Comprimir con líquido agrava (VERIFICAR POR COMPARACIÓN, no valor absoluto):
   la misma botella con líquido vale menos comprimida (−0.08) que sin comprimir
   (−0.02). ADVERTENCIA: NO existe "crudo total comprimido" con tapa — con tapa
   no se comprime, así que tapa y comprimida nunca coexisten. Un número como
   −0.15 que sume tapa + compresión describe un estado IMPOSIBLE.

---

## LÍMITE DE VOLUMEN

Valores congelados: **inventario = 10**, **contenedor = 100**.

En el MVP solo el límite de INVENTARIO está activo como mecánica:
- El jugador no puede recoger más allá de 10 unidades de volumen.
- Comprimir libera espacio (1.0 → 0.3 por botella).
- Vender vacía/reduce el inventario.
- Tensión: ¿sigo recogiendo/procesando o voy a vender porque ya no cabe?

El contenedor tiene capacidad 100 (se llena con botellas que caen). Su papel
pleno —desbordamiento cuando se llena— es parte de cómo evoluciona el juego; el
valor queda fijado desde ya. La proporción 100:10 significa que el contenedor
acumula diez veces lo que cargas, creando presión de recolección.

---

## CICLO DE JUEGO (MVP)

1. Recolectar: botellas aparecen en el contenedor cada cierto intervalo. Click
   para recoger al inventario (sujeto al límite de 10).
2. Procesar: aplicar las seis acciones para llevar botellas de sucias a perfectas.
3. Vender: `calcularPrecio` por botella; el dinero se acumula en un contador
   visible. Vender material sucio genera pérdidas.

Feedback mínimo: contador de dinero, inventario con estado de cada botella,
indicador de volumen usado vs. capacidad (10).

---

## ARNÉS DE VERIFICACIÓN — el estándar de DOS NIVELES

Regla: ninguna tarea se delega sin criterios verificables. Cada módulo se verifica
en DOS niveles complementarios. Esto NO es opcional; es el estándar del proyecto.

### Nivel 1 — Tests de VALOR (`MÓDULO.test.js`)
Casos puntuales: esta entrada da esta salida. Precisos. Detectan desplazamientos
de valor (ej. el bug real BASE=128 en vez de 28: todos los precios salían +1.00;
los tests de valor lo cazaron al instante).

### Nivel 2 — Tests de PROPIEDAD / EXHAUSTIVOS (`MÓDULO.exhaustivo.test.js`)
Afirmaciones universales verificadas sobre TODO el espacio de estados. Para la
botella, son 5 booleanos = 32 estados, enumerables con bucles `for` anidados.
Verifican PROPIEDADES, no casos: "toda botella sin líquido vale ≥ 0", "agregar un
defecto nunca sube el precio" (monotonía — caza booleanos invertidos), "ninguna
botella supera a la perfecta". Cierran la ceguera de los casos puntuales y hacen
inútil el "if-por-caso" tramposo (acertar 32 casos es más trabajo que implementar
el modelo).

### Por qué ambos niveles
Los tests de valor cazan errores de magnitud; los de propiedad cazan errores de
relación/signo sobre todo el espacio. Un bug que desplaza todos los precios en
bloque pasa los invariantes relacionales (las relaciones no cambian) pero falla
los de valor. La combinación cubre las dos clases de error.

### Límites de la verificación (aprendizaje clave)
- Los tests verifican que el CÓDIGO implementa fielmente el MODELO. NO verifican
  que el modelo refleje la REALIDAD. Un modelo equivocado, implementado fielmente,
  pasa todos sus tests.
- ¿Quién verifica el test? El humano, por derivación independiente (recalcular el
  valor por otro camino) y porque test y código fallan de forma independiente: si
  uno está mal y el otro bien, NO coinciden y el test avisa. La cadena termina en
  juicio humano + realidad (playtesting, dominio), no en una máquina.
- Por eso los números de balance son "iniciales, ajustables con playtesting": la
  corrección del MODELO se valida jugando y con juicio de dominio, no con tests.

### Empaquetado
`package.json` con `{"type":"module"}` en la raíz (Node trata los .js como ES
modules). Correr un test: `node test/MÓDULO/MÓDULO.test.js`.

---

## FASE 2 Y POSTERIOR — refinamientos previstos (NO implementar en MVP)

Documentados para proteger las ideas y dejar claro que las simplificaciones del
MVP fueron deliberadas.

1. Tres espacios con límite de volumen propio (contenedor, inventario, zona de
   trabajo) y flujo entre ellos. Logística de movimiento, desbordamiento del
   contenedor, casos borde de transición. Convierte el juego en logística pura.

2. Tipos de líquido (agua vs azucarada). `tiene_liquido` booleano es
   simplificación deliberada. El secado remueve HUMEDAD, no RESIDUO QUÍMICO
   (azúcares, ácidos, grasas, tintes): por eso el tipo de líquido importará.
   Comprimir líquido azucarado aumenta la suciedad. Requiere suciedad acumulable
   (no booleana) — sistema nuevo, no propiedad nueva.

3. Basura / clasificación PET vs no-PET. Y tierra como contaminación (castiga
   como líquido, no como separación).

4. Maquinaria y reinversión. Automatiza acciones que ya existen.

5. Publicidad in-game. Carteles que suben recolección y bajan basura. Espejo: el
   jugador hace dentro del juego la campaña que el proyecto hace fuera.

6. Árbol de habilidades.

7. Endgame: prótesis 3D. El material desemboca en filamento → prótesis. Conexión
   con Superman/HUMAN stem.

8. Mapa vectorial del campus como mundo navegable.

9. Mercados múltiples de venta. El MVP tiene UN comprador. Fase 2: acopio local
   (~6-8/kg), seleccionado/compactado (intermedio), molido/lavado/seco
   (~10-12/kg). Requiere selección de comprador.

10. MOTOR DE PROGRESIÓN "ECOCE no paga". En la realidad ECOCE acepta pero NO
    paga. Esa es la motivación para buscar otros compradores: el acopio base
    apenas sostiene → para crecer NECESITAS mejores compradores → exigen material
    más procesado → exige maquinaria → escala elefante. Respuesta a "¿por qué el
    jugador querría mejorar?". En el MVP el comprador único paga poco para sembrar
    esta necesidad.

11. Peso variable por botella. MVP usa 0.04 kg constante. El modelo precio-por-kg
    ya lo soporta (cambiar constante por propiedad).

12. Precio de mercado fluctuante. MVP usa precio fijo. Fase final: fluctúa según
    eventos simulados (NO ruido): escasez → ~15/kg; desregulación → ~3/kg.
    Transforma el juego de puzzle de optimización a juego con TIMING.

13. Desgaste por ciclado comprimir/descomprimir repetido.

14. Multijugador. Distinguir ASÍNCRONO (jugadores aislados, sin concurrencia,
    cuelga del núcleo) de TIEMPO REAL con estado compartido (requiere servidor
    autoritativo — SALTO arquitectónico, no escalón). Si tiempo real: primero
    intentar SERIALIZAR operaciones sobre estado compartido para eliminar
    concurrencia por diseño; evaluar verificación formal (TLA+) solo si el
    protocolo de resolución resulta inherentemente concurrente Y el costo de fallo
    lo justifica. Para un juego educativo, probablemente nunca cruza ese umbral.

---

## DECISIONES PENDIENTES (de balance, mejor con algo jugable)
- Valor de capacidad: inventario=10 y contenedor=100 ya fijados. Pendiente:
  intervalo de aparición de botellas (se siente, no se calcula en frío).
- Ningún pendiente de DISEÑO bloquea los próximos módulos. Las seis acciones y
  calcularPrecio están completamente especificados.

---

## PRÓXIMO PASO CONCRETO (para el reinicio)
1. (Agente, tarea mecánica) Mover los archivos existentes a la estructura de
   carpetas de arriba e inicializar package.json/README. Criterio de éxito:
   `node test/calcularPrecio/calcularPrecio.test.js` corre en verde desde la
   nueva ubicación (ajustar rutas de import a ../../).
2. (Sesión cirujano+copiloto) Diseñar los tests del módulo ACCIONES — nivel valor
   y nivel exhaustivo/propiedades — derivados de las precondiciones de las seis
   acciones. Propiedades candidatas: "ninguna acción muta la botella original",
   "comprimir con tapa no cambia nada", "secar requiere vacía y descomprimida",
   "descomprimir siempre funciona", "la cadena óptima lleva de cruda a perfecta".
3. (Agente) Implementar `src/acciones/acciones.js` con criterio de terminación
   objetivo: ambos archivos de test en verde.
4. Escribir `src/acciones/DECISIONES.md` con el fundamento físico (líquido
   atrapado vs residuo químico, efectos en extrusión de filamento) y la iteración.
