# PROCESS.md — Cómo se construyó StockFlow

---

## Punto de partida

Al recibir el challenge lo primero que hice fue leer el enunciado completo antes de escribir una sola línea de código. El objetivo fue entender qué se pedía exactamente, qué era obligatorio y qué era opcional, y estimar si 48 horas eran suficientes para hacer todo bien o si había que priorizar.

La conclusión fue clara: el reto no es difícil técnicamente, pero tiene muchas piezas que se tienen que conectar correctamente (frontend, backend, base de datos, worker asíncrono, deploy). El riesgo real era perder tiempo en detalles de diseño o en tecnologías nuevas en lugar de avanzar en lo funcional.

---

## Etapa 1 — Análisis y planeación (Día 1, primeras horas)

### Lectura de documentación

Antes de implementar cualquier cosa estudié la documentación de las tecnologías que no uso habitualmente:
- **Next.js App Router** — cómo funcionan las API Routes, el sistema de archivos como enrutador, el ciclo de vida de los Server Components.
- **TypeScript** — tipos básicos, interfaces, cómo tipar las respuestas de Mongoose.
- **MongoDB + Mongoose** — diferencias con MySQL (base de datos que sí uso): documentos en lugar de filas, schemas flexibles, aggregation pipelines en lugar de JOINs.
- **Tailwind CSS** — clases de utilidad, cómo funciona el sistema de diseño.

### Comparación con tecnologías conocidas

Para acelerar el aprendizaje comparé cada concepto nuevo con su equivalente en tecnologías que ya uso (PHP, Dart, MySQL):

| Concepto nuevo | Equivalente conocido |
|---|---|
| Next.js API Route | Controlador en Laravel / endpoint PHP |
| Mongoose Schema | Modelo Eloquent / clase de entidad |
| MongoDB `$lookup` | SQL `JOIN` |
| `async/await` en TS | `async/await` en Dart |
| Mongoose `session.withTransaction()` | `DB::transaction()` en Laravel |

### Bocetos y diagramas

Se diseñaron los modelos de datos antes de tocar código:
- **Product**: SKU, nombre, precio, categoría
- **Branch**: nombre, ubicación
- **Stock**: relación producto–sucursal con cantidad (colección separada, no embebida en producto)
- **Movement**: tipo, producto, sucursal origen, sucursal destino, cantidad, estado, reintentos, motivo de fallo

La decisión de tener `Stock` como colección separada (en lugar de embeber el stock en `Product`) fue clave: permite consultar cuánto hay de un producto en una sucursal específica con un query directo, sin tener que recorrer arrays anidados.

### Definición del orden de commits

Se planificó la secuencia de implementación de mayor a menor dependencia:

```
Infraestructura → Modelos → CRUD → Lógica de negocio → UI → Reportes
```

Esto asegura que cada commit construye sobre algo que ya funciona y es testeable.

---

## Etapa 2 — Implementación (Día 2)

### Commit 1 — Setup del proyecto

Inicialización con `create-next-app` usando TypeScript y Tailwind. Se eligió Next.js como stack único para simplificar el deploy en Vercel (frontend + backend en un solo proyecto, sin gestionar CORS ni servicios separados).

### Commit 2 — Conexión a MongoDB

Función `dbConnect()` con caché en la variable global del proceso. Esto evita abrir una nueva conexión en cada invocación de una API Route (que en Vercel puede ser una Lambda nueva), reutilizando la conexión existente si ya está abierta. Se agregó el endpoint `/api/health` para verificar que la conexión funciona.

### Commit 3 — Modelos de Mongoose

Se definieron los cuatro schemas: `Product`, `Branch`, `Stock`, `Movement`. Cada modelo usa el patrón `mongoose.models.X ?? mongoose.model(...)` para evitar que Mongoose lance error al intentar registrar el mismo modelo dos veces en hot-reload.

### Commits 4 y 5 — CRUD de productos y sucursales

Endpoints REST en `/api/products` y `/api/branches` con los cuatro verbos (GET, POST, PUT, DELETE). Páginas de frontend con formulario de creación/edición y tabla con acciones.

### Commit 6 — Endpoint de movimientos

`POST /api/movements` valida los campos requeridos según el tipo de movimiento (entrada, salida, transferencia) y crea el documento con estado `pending`. La respuesta es inmediata — el procesamiento real ocurre después.

### Commit 7 — Worker asíncrono

`lib/worker.ts` implementa la lógica de procesamiento. El worker usa `findOneAndUpdate` con `status: 'pending' → 'processing'` para "reclamar" un movimiento de forma atómica — si dos requests llegan al mismo tiempo, solo uno puede reclamarlo. El botón en el frontend invoca `POST /api/worker` manualmente.

### Commit 8 — Lógica de stock

Dentro del worker: validación de stock disponible, actualización de cantidades con `$inc`, creación automática de documentos de Stock si no existen para esa combinación producto–sucursal.

### Commit 9 — Reintentos

Se agregó el campo `retries` al schema de Movement. Si el procesamiento falla, el worker incrementa el contador, devuelve el movimiento a `pending` y deja el motivo en `failReason`. Tras `MAX_RETRIES = 2` intentos lo marca `failed`.

### Commit 10 — Dashboard

Panel principal con tarjetas de métricas (productos, sucursales, stock total, movimientos por estado) y tabla de stock por producto y sucursal. Los datos vienen de `/api/dashboard` que ejecuta queries paralelas con `Promise.all`.

### Commit 11 — Lista de movimientos en dashboard

Se agregó la tabla de movimientos recientes con filtros por estado y por sucursal.

### Commit 12 — Reporte por rango de fechas

Endpoint `/api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` con aggregation pipeline. Agrupa movimientos por tipo y por sucursal usando `$group` y `$lookup`. Se detectó y corrigió un bug de zona horaria: `new Date("YYYY-MM-DD")` parsea como UTC midnight, lo que desplazaba el rango de fechas en servidores con offset negativo. La solución fue usar el constructor numérico `new Date(año, mes-1, día)` que siempre crea la fecha en hora local.

### Ajuste final — Traducción a español

Todos los textos visibles en la UI se tradujeron al español latinoamericano. Los valores almacenados en la base de datos (`entry`, `exit`, `transfer`, `pending`, `processed`, `failed`) permanecen en inglés; la traducción ocurre solo en la capa de presentación mediante mapas de constantes.

---

## Herramientas utilizadas

| Herramienta | Uso |
|---|---|
| VS Code | Editor principal |
| GitHub Copilot | Asistencia para boilerplate, patterns de Mongoose y TypeScript |
| MongoDB Atlas | Base de datos en la nube (free tier) |
| MongoDB Compass | Inspección visual de documentos durante desarrollo |
| Git | Control de versiones con commits atómicos por funcionalidad |
| Postman / Thunder Client | Pruebas manuales de los endpoints de la API |
| Next.js Dev Server | Recarga automática durante desarrollo |

---

## Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel                           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Next.js (monorepo)                  │   │
│  │                                                  │   │
│  │  Frontend (React)          Backend (API Routes)  │   │
│  │  ┌──────────────┐         ┌───────────────────┐  │   │
│  │  │  /            │ fetch  │ /api/products      │  │   │
│  │  │  /products    │──────► │ /api/branches      │  │   │
│  │  │  /branches    │        │ /api/movements     │  │   │
│  │  │  /movements   │        │ /api/worker        │  │   │
│  │  │  /reports     │        │ /api/dashboard     │  │   │
│  │  └──────────────┘         │ /api/reports       │  │   │
│  │                           └────────┬──────────┘  │   │
│  └─────────────────────────────────────┼─────────────┘   │
│                                        │                  │
└────────────────────────────────────────┼──────────────────┘
                                         │ Mongoose
                                         ▼
                              ┌─────────────────────┐
                              │    MongoDB Atlas     │
                              │                     │
                              │  products           │
                              │  branches           │
                              │  stocks             │
                              │  movements          │
                              └─────────────────────┘
```

**Flujo de un movimiento:**

```
Usuario crea movimiento
        │
        ▼
POST /api/movements
  → valida campos
  → guarda con status: "pending"
  → responde inmediatamente (rápido)
        │
        ▼
Usuario presiona "Procesar siguiente"
        │
        ▼
POST /api/worker
  → findOneAndUpdate: pending → processing  (atómico)
  → valida stock disponible
  → actualiza cantidades en Stock
  → marca movement: "processed"
  → si falla: retries++ → pending (hasta MAX_RETRIES)
  → si agota reintentos: status: "failed" + failReason
```

---

## Las 3 decisiones técnicas más importantes

### 1. Monorepo Next.js en lugar de backend separado

Elegir Next.js como stack unificado eliminó la necesidad de gestionar CORS, dos URLs distintas, dos deploys independientes y variables de entorno en múltiples servicios. Todo vive en el mismo repositorio y se despliega con un solo `git push`.

### 2. Colección Stock separada

El stock de cada producto por sucursal vive en su propia colección (`{ product, branch, quantity }`), no embebido en `Product`. Esto permite:
- Queries directas sin desanidar arrays: `Stock.findOne({ product, branch })`
- Updates atómicos con `$inc` sin cargar el documento de producto completo
- Agregar sucursales sin modificar el schema de producto

### 3. Procesamiento atómico con `findOneAndUpdate`

Para evitar que dos workers concurrentes procesen el mismo movimiento, el "reclamo" se hace en un solo query atómico:
```typescript
Movement.findOneAndUpdate(
  { status: 'pending' },
  { $set: { status: 'processing' } },
  { new: true }
)
```
MongoDB garantiza que solo un proceso puede obtener el documento — el segundo encontrará `null` porque el primero ya cambió el estado. Esto simula el comportamiento de una cola de mensajes sin necesitar infraestructura adicional.
