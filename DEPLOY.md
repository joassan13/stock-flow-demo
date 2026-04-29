# DEPLOY.md — Cómo desplegar StockFlow en Vercel

Esta guía asume que nunca has usado Vercel antes. Cubre todos los pasos desde crear la cuenta hasta tener la aplicación funcionando en producción.

---

## Requisitos previos

Antes de empezar necesitas tener:

- [ ] El código del proyecto subido a un repositorio **público** en GitHub
- [ ] Una cuenta en **MongoDB Atlas** con el cluster creado y la URI de conexión a mano
- [ ] Una cuenta en **GitHub** (si no tienes una, créala en [github.com](https://github.com))

---

## Paso 1 — Crear cuenta en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **Sign Up**
3. Selecciona **Continue with GitHub** — esto vincula tu cuenta de Vercel con GitHub directamente, que es lo más conveniente
4. Autoriza a Vercel a acceder a tus repositorios cuando te lo pida

---

## Paso 2 — Importar el repositorio

1. Una vez dentro del dashboard de Vercel, haz clic en el botón **Add New… → Project**
2. En la sección **Import Git Repository** aparecerá la lista de tus repos de GitHub
3. Busca `stock-flow-demo` y haz clic en **Import**

> Si no ves el repositorio, haz clic en **Adjust GitHub App Permissions** para darle acceso a Vercel al repo específico.

---

## Paso 3 — Configurar el proyecto

Vercel detecta automáticamente que es un proyecto Next.js y pre-configura todo. Verás una pantalla con tres secciones:

### Framework Preset
Vercel lo detecta solo: **Next.js**. No cambies nada.

### Root Directory
Déjalo en `.` (la raíz del repositorio).

### Build and Output Settings
No modifiques nada. Los valores por defecto son correctos:
- Build Command: `next build`
- Output Directory: `.next`
- Install Command: `npm install`

---

## Paso 4 — Variables de entorno (importante)

Esta es la parte más importante. Sin esto la aplicación no puede conectarse a MongoDB.

1. En la misma pantalla de configuración, busca la sección **Environment Variables**
2. Agrega la siguiente variable:

| Name | Value |
|---|---|
| `MONGODB_URI` | Tu URI completa de MongoDB Atlas |

La URI de MongoDB Atlas tiene este formato:
```
mongodb+srv://nombreUsuario:contraseña@cluster0.xxxxx.mongodb.net/stockflow?retryWrites=true&w=majority
```

Para obtener tu URI:
- Entra a [cloud.mongodb.com](https://cloud.mongodb.com)
- Selecciona tu cluster → haz clic en **Connect**
- Elige **Drivers**
- Copia la URI que aparece y reemplaza `<password>` con tu contraseña real

3. Haz clic en **Add** para guardar la variable

> **Importante:** La base de datos en el URI (`/stockflow` al final) puede ser el nombre que quieras. MongoDB Atlas la crea automáticamente la primera vez que se inserta un documento.

---

## Paso 5 — Configurar acceso de red en MongoDB Atlas

Por defecto MongoDB Atlas solo acepta conexiones desde IPs específicas. Vercel usa IPs dinámicas, así que hay que permitir acceso desde cualquier IP:

1. Ve a [cloud.mongodb.com](https://cloud.mongodb.com)
2. En el menú lateral selecciona **Network Access**
3. Haz clic en **Add IP Address**
4. Selecciona **Allow Access from Anywhere** (agrega `0.0.0.0/0`)
5. Haz clic en **Confirm**

> En un proyecto real con datos sensibles se usarían las IPs fijas de Vercel en lugar de `0.0.0.0/0`. Para este demo está bien.

---

## Paso 6 — Desplegar

1. De vuelta en Vercel, haz clic en el botón **Deploy**
2. Vercel clona el repositorio, instala dependencias, compila Next.js y despliega. Esto tarda entre 1 y 3 minutos
3. Cuando termine verás una pantalla con confeti y la URL de tu proyecto

La URL tiene el formato: `https://stock-flow-demo-xxxxx.vercel.app`

---

## Paso 7 — Verificar que funciona

1. Abre la URL del deploy
2. Ve a `/api/health` — debe responder `{ "status": "ok" }`
3. Navega por el dashboard, crea un producto, una sucursal y un movimiento
4. Presiona **Procesar siguiente** y verifica que el estado cambia a `processed`

Si algo no funciona, el siguiente paso es revisar los logs.

---

## Cómo ver los logs en Vercel

Si hay un error en producción:

1. Ve al dashboard de Vercel → selecciona tu proyecto
2. Haz clic en el tab **Functions**
3. Busca la función que falló (el nombre corresponde a la ruta de la API)
4. Haz clic en ella para ver los logs con el error completo

Los errores más comunes en el primer deploy son:
- **`MongoServerError: bad auth`** — la contraseña en `MONGODB_URI` tiene caracteres especiales sin encodear. Reemplaza `@` por `%40`, `#` por `%23`, etc.
- **`Could not connect to MongoDB`** — la IP de Vercel no está en la whitelist de Atlas. Revisa el Paso 5.
- **`ReferenceError: process is not defined`** — alguna variable de entorno no está configurada. Verifica que `MONGODB_URI` aparezca en la sección Environment Variables del proyecto.

---

## Deploys automáticos

A partir de ahora, cada vez que hagas `git push` a la rama `main`, Vercel detecta el cambio y despliega la nueva versión automáticamente. No necesitas hacer nada más.

Los pull requests también generan una URL de preview temporal para revisar cambios antes de mergearlos a `main`.

---

## Actualizar la URL en el README

Una vez que tengas la URL definitiva, actualiza el README:

```md
**Demo en producción:** [https://stock-flow-demo-xxxxx.vercel.app](https://stock-flow-demo-xxxxx.vercel.app)
```

---

## Resumen rápido

```
1. vercel.com → Sign Up with GitHub
2. Add New → Project → Importar repo
3. Environment Variables: MONGODB_URI = tu URI de Atlas
4. MongoDB Atlas → Network Access → Allow 0.0.0.0/0
5. Deploy
6. Verificar /api/health
```
