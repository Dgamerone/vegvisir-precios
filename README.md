# ⚡ Vegvisir — App de Precios

App móvil para actualizar precios de insumos en Google Sheets desde el celular.

---

## Stack
- **Next.js 14** (App Router)
- **Google Sheets API** (fuente de datos)
- **Vercel** (hosting gratuito)

---

## GUÍA DE DEPLOY COMPLETA

### PASO 1 — Convertir el Excel a Google Sheets

1. Abrí Google Drive
2. Clic derecho en `Vegvisir_Costos_2026_v5.xlsx` → **Abrir con → Google Sheets**
3. Se abre en modo compatibilidad. Ir a **Archivo → Guardar como Google Sheets**
4. Copiá el ID de la URL: `https://docs.google.com/spreadsheets/d/**ESTE_ES_EL_ID**/edit`

---

### PASO 2 — Crear Service Account en Google Cloud

1. Ir a https://console.cloud.google.com
2. Crear un proyecto nuevo (ej: `vegvisir-app`) o usar uno existente
3. En el buscador, buscar **"Google Sheets API"** → Activarla
4. Ir a **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**
   - Nombre: `vegvisir-sheets`
   - Rol: no hace falta asignar rol aquí
   - Click en **Listo**
5. Click en la cuenta de servicio creada → pestaña **Claves** → **Agregar clave → Crear nueva clave → JSON**
6. Se descarga un archivo `.json`. Lo vas a necesitar en el siguiente paso.

El JSON tiene este formato:
```json
{
  "client_email": "vegvisir-sheets@mi-proyecto.iam.gserviceaccount.com",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
}
```

---

### PASO 3 — Darle acceso al Google Sheet

1. Abrí tu Google Sheet
2. Click en **Compartir** (arriba a la derecha)
3. En el campo de email, pegá el `client_email` del JSON (ej: `vegvisir-sheets@mi-proyecto.iam.gserviceaccount.com`)
4. Rol: **Editor**
5. Click en **Enviar** (sin mandarle notificación)

---

### PASO 4 — Subir el código a GitHub

```bash
# En tu terminal, desde la carpeta del proyecto:
cd vegvisir-app
git init
git add .
git commit -m "Initial commit"

# Crear repo en GitHub (sin README) y luego:
git remote add origin https://github.com/TU_USUARIO/vegvisir-precios.git
git branch -M main
git push -u origin main
```

---

### PASO 5 — Deploy en Vercel

1. Ir a https://vercel.com → New Project
2. Importar el repo `vegvisir-precios` desde GitHub
3. Framework: **Next.js** (se detecta solo)
4. Antes de hacer Deploy, ir a **Environment Variables** y agregar:

| Variable | Valor |
|----------|-------|
| `SPREADSHEET_ID` | El ID de tu Google Sheet (Paso 1) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | El `client_email` del JSON (Paso 2) |
| `GOOGLE_PRIVATE_KEY` | El `private_key` del JSON (todo, incluyendo `-----BEGIN...END-----`) |
| `APP_PASSWORD` | La contraseña que quieras usar (ej: `vegvisir2026`) |

5. Click en **Deploy**

En 2-3 minutos tu app está en `https://vegvisir-precios.vercel.app` (o similar).

---

### PASO 6 — Instalar como app en el celular (PWA)

**En iPhone (Safari):**
1. Abrí la URL de Vercel en Safari
2. Click en el botón compartir (cuadrado con flecha)
3. **Agregar a pantalla de inicio**
4. Ya tenés el ícono de Vegvisir en tu home

**En Android (Chrome):**
1. Abrí la URL en Chrome
2. Menú (tres puntos) → **Instalar app** o **Agregar a pantalla principal**

---

### PASO 7 — Desarrollo local (opcional)

```bash
npm install
# Editá .env.local con tus credenciales reales
npm run dev
# Abrí http://localhost:3000
```

---

## Flujo de datos

```
Celular (app) ──→ Vercel API ──→ Google Sheets API ──→ BD_Insumos (hoja)
                                                              ↓
                                              Excel lee precios con VLOOKUP
```

Cada vez que actualizás un precio en la app:
- Se escribe en columna F (Precio) de BD_Insumos
- Se actualiza columna G (Fecha) con la fecha de hoy
- Todas las hojas de productos recalculan automáticamente sus costos

---

## Seguridad

La app usa una contraseña simple (`APP_PASSWORD`). 
El servidor valida la contraseña en cada request de escritura.
Los datos de Google se protegen con Service Account (nunca se expone la clave al cliente).

---

## Estructura del proyecto

```
vegvisir-app/
├── src/
│   ├── app/
│   │   ├── page.tsx          ← App completa (UI)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── insumos/      ← GET: lista todos los insumos
│   │       │   └── route.ts
│   │       └── actualizar/   ← POST: actualiza precio en Sheet
│   │           └── route.ts
│   └── lib/
│       └── sheets.ts         ← Conexión con Google Sheets API
├── public/
│   └── manifest.json         ← PWA config
├── .env.local                ← Credenciales (NO subir a GitHub)
├── .gitignore
├── package.json
└── next.config.js
```
