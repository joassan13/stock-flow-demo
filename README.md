# StockFlow

Sistema de control de inventario multi-sucursal con procesamiento asíncrono de movimientos.

**Demo en producción:** [https://stock-flow-demo-r6ze.vercel.app](https://stock-flow-demo-r6ze.vercel.app)

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + Backend | Next.js 15 (App Router, API Routes) |
| Base de datos | MongoDB Atlas |
| ODM | Mongoose 9 |
| Estilos | Tailwind CSS v4 |
| Deploy | Vercel |

Todo en un monorepo: el frontend y el backend (API Routes) conviven en el mismo proyecto y se despliegan juntos en Vercel.

---

## Setup local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/stock-flow-demo.git
cd stock-flow-demo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp env.example .env.local
```

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | URI de conexión a MongoDB Atlas (o local) |

Ejemplo de `.env.local`:
```
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/stockflow
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## Estructura del proyecto

```
app/
  page.tsx              # Dashboard principal
  layout.tsx            # Navegación global
  products/page.tsx     # CRUD productos
  branches/page.tsx     # CRUD sucursales
  movements/page.tsx    # Registro y listado de movimientos
  reports/page.tsx      # Reporte por rango de fechas
  api/
    products/           # GET, POST, PUT, DELETE /api/products
    branches/           # GET, POST, PUT, DELETE /api/branches
    movements/          # POST /api/movements
    worker/             # POST /api/worker
    dashboard/          # GET /api/dashboard
    reports/            # GET /api/reports?from=&to=
    health/             # GET /api/health
lib/
  mongodb.ts            # Conexión con caché global
  worker.ts             # Lógica de procesamiento de movimientos
  models/               # Schemas de Mongoose (Product, Branch, Stock, Movement)
```

---

## Decisiones de arquitectura

### Monorepo Next.js (frontend + backend juntos)

El challenge recomienda esta opción. Elegirla simplifica el deploy a cero configuración en Vercel y evita gestionar CORS, dominios separados o servicios adicionales. La contrapartida es que si el backend crece mucho sería difícil escalarlo de forma independiente.

### Worker basado en polling (sin cola de mensajes)

En lugar de RabbitMQ o BullMQ (que requerirían un servicio externo), el worker es una función que se invoca desde el frontend. Cada invocación toma un movimiento pendiente, lo procesa de forma atómica y retorna. Esto es suficiente para demostrar el patrón async y funciona sin infraestructura extra en Vercel.

**Trade-off:** en producción real se necesitaría una cola real (BullMQ + Redis, SQS, etc.) para garantizar que los movimientos se procesan en segundo plano de forma continua.

### Atomicidad con findOneAndUpdate + transacciones MongoDB

El worker usa `findOneAndUpdate` para reclamar un movimiento de forma exclusiva antes de procesarlo. El update de stocks se ejecuta dentro de una sesión con `session.withTransaction()`. Esto evita que dos invocaciones concurrentes procesen el mismo movimiento.

### Reintentos con contador en el documento

Cada movimiento tiene un campo `retries`. Si el procesamiento falla, el worker incrementa el contador y devuelve el movimiento a `pending`. Tras `MAX_RETRIES = 2` intentos lo marca `failed` con el motivo legible.

---

## ¿Qué haría diferente con una semana?

- **Cola de mensajes real** (BullMQ + Redis o SQS) para procesamiento asíncrono continuo en segundo plano.
- **Tests** — unit tests del worker y del endpoint de movimientos, donde está la lógica más crítica.
- **Autenticación** — JWT o sesiones con NextAuth para proteger las rutas de escritura.
- **Paginación** en listas de movimientos y productos.
- **Actualización en tiempo real** con Server-Sent Events o WebSockets para mostrar cambios de estado sin refresco manual.
- **Docker Compose** para levantar MongoDB localmente sin depender de Atlas.
- **Índices compuestos** en MongoDB para las queries frecuentes (`{ product, branch }` en Stock).

---

## Archivos adicionales

- [PROCESS.md](PROCESS.md) — cómo se abordó el problema, herramientas usadas, diagrama de arquitectura y decisiones clave.
- [DEPLOY.md](DEPLOY.md) — guía paso a paso para desplegar en Vercel.