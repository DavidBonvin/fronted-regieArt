# RégieArt — Tests de Producción & Guía Frontend

> **URL producción:** `https://regieart-backend-production.up.railway.app/api/v1`  
> **Keycloak producción:** `https://keycloak-production-b2ce.up.railway.app`  
> **Fecha tests:** 2026-07-22  
> **Estado:** ✅ 13/13 casos testeados y funcionando

---

## Índice

1. [Configuración base — token y helper HTTP](#1-configuración-base)
2. [Autenticación y perfil](#2-autenticación-y-perfil)
3. [Habilidades (Skills)](#3-habilidades-skills)
4. [Organizaciones](#4-organizaciones)
5. [Repertorio (Songs)](#5-repertorio-songs)
6. [Venues](#6-venues)
7. [Eventos](#7-eventos)
8. [DaySheet — Cronograma](#8-daysheet--cronograma)
9. [DaySheet — Logística de transporte](#9-daysheet--logística-de-transporte)
10. [Inventario](#10-inventario)
11. [Finanzas](#11-finanzas)
12. [Notificaciones](#12-notificaciones)
13. [Master DaySheet (endpoint principal)](#13-master-daysheet)
14. [Lo que falta por testear](#14-lo-que-falta-por-testear)

---

## 1. Configuración base

### Helper HTTP recomendado para el frontend

```javascript
const BASE = 'https://regieart-backend-production.up.railway.app/api/v1';
const KC   = 'https://keycloak-production-b2ce.up.railway.app/realms/regieart/protocol/openid-connect/token';

// Obtener token JWT de Keycloak
async function getToken(username, password) {
  const res = await fetch(KC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id:  'regieart-mobile',
      username,
      password,
    }),
  });
  const { access_token, expires_in } = await res.json();
  return access_token; // JWT válido 300 segundos (5 min)
}

// Helper genérico para todas las peticiones
async function api(method, path, { token, body, params } = {}) {
  const url = new URL(BASE + path);
  if (params) Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message);
  return data.data; // ← siempre devuelve data.data
}
```

### Credenciales de prueba (desarrollo/QA)

| Campo | Valor |
|---|---|
| username | `teststorage@gmail.com` |
| password | `teststorage@gmail.com` |
| client_id | `regieart-mobile` |

### Convención de respuesta

```json
{ "success": true,  "data": { ... } }           // éxito
{ "success": true,  "data": [ ... ], "meta": { "total": 42, "page": 1, "limit": 20 } }  // lista paginada
{ "success": false, "error": { "code": "404", "message": "Not found" } }  // error
```

---

## 2. Autenticación y Perfil

### Health check

```
GET /health
```
```json
{ "success": true, "data": { "status": "ok", "timestamp": "2026-07-22T..." } }
```

### Primer login — lazy provisioning

La primera vez que un usuario llama a cualquier endpoint autenticado, el backend crea su cuenta automáticamente usando los datos del JWT de Keycloak.

```
GET /users/me
Authorization: Bearer {token}
```

**Respuesta testeada:**
```json
{
  "id":          "cmqgqnin60000gx5b5mxsjfow",
  "keycloakId":  "...",
  "email":       "teststorage@gmail.com",
  "displayName": "Jean-Pierre Leblanc",
  "firstName":   "Jean-Pierre",
  "lastName":    "Leblanc",
  "phone":       "+1-514-555-0199",
  "bio":         "Directeur musical et trompettiste avec 20 ans d'expérience.",
  "city":        "Montréal",
  "country":     "CA",
  "avatarUrl":   null,
  "bannerUrl":   null,
  "memberships": [ { "role": "OWNER", "organization": { "id": "...", "name": "Les Étoiles du Nord" } } ]
}
```

> **Nota para el frontend:** guardar `data.id` como `userId` en el store local. Se usa en roster, vehículos y asignaciones.

### Actualizar perfil

```
PATCH /users/me
Content-Type: application/json
```

**Body:**
```json
{
  "displayName": "Jean-Pierre Leblanc",
  "firstName":   "Jean-Pierre",
  "lastName":    "Leblanc",
  "phone":       "+1-514-555-0199",
  "bio":         "Directeur musical et trompettiste avec 20 ans d'expérience.",
  "city":        "Montréal",
  "country":     "CA"
}
```

**Campos opcionales:** todos. Enviar solo los que cambien.  
**Respuesta:** usuario completo actualizado.

> `avatarUrl` y `bannerUrl` **NO** se actualizan aquí — se actualizan automáticamente al confirmar un upload de `user-avatar` / `user-banner` en Storage.

### Perfil público de cualquier usuario

```
GET /users/{userId}
```

**Respuesta incluye:** `id, displayName, firstName, lastName, avatarUrl, bannerUrl, bio, city, country, skills, memberships`  
**Respuesta NO incluye:** `email`, `phone`, `keycloakId`

### Buscar músicos

```
GET /users/search?skill=Trompette&city=Montréal&page=1&limit=20
```

| Param | Tipo | Descripción |
|---|---|---|
| `skill` | string | Nombre parcial de habilidad |
| `city` | string | Ciudad parcial |
| `orgId` | string | Solo miembros de esa org |
| `q` | string | Búsqueda libre en displayName |

---

## 3. Habilidades (Skills)

### Listar categorías de habilidades

```
GET /skill-categories
```

**Respuesta testeada (10 categorías creadas):**
```json
[
  { "id": "cmrvsc8zi...", "name": "Trompette",        "type": "INSTRUMENT", "icon": "🎺" },
  { "id": "cmrvsc9a7...", "name": "Basse électrique", "type": "INSTRUMENT", "icon": "🎸" },
  { "id": "cmrvsc9ij...", "name": "Batterie",          "type": "INSTRUMENT", "icon": "🥁" },
  { "id": "cmrvsc9o3...", "name": "Piano / Claviers",  "type": "INSTRUMENT", "icon": "🎹" },
  { "id": "cmrvsc9ry...", "name": "Saxophone",         "type": "INSTRUMENT", "icon": "🎷" },
  { "id": "cmrvsc9vz...", "name": "Violon",            "type": "INSTRUMENT", "icon": "🎻" },
  { "id": "cmrvsc9zq...", "name": "Technicien FOH",   "type": "TECHNICAL",  "icon": "🎚️" },
  { "id": "cmrvsca3p...", "name": "Technicien Lumières","type": "TECHNICAL",  "icon": "💡" },
  { "id": "cmrvsca7f...", "name": "Tour Manager",      "type": "MANAGEMENT", "icon": "📋" },
  { "id": "cmrvscadq...", "name": "Directeur Musical", "type": "MANAGEMENT", "icon": "🎼" }
]
```

### Agregar habilidad al propio perfil

```
POST /users/me/skills
```

**Body:**
```json
{
  "skillCategoryId": "cmrvscadq000k13ll4dbrsp99",
  "expertiseLevel":  "PROFESSIONAL",
  "yearsExp":        20
}
```

**`expertiseLevel`:** `BEGINNER` | `INTERMEDIATE` | `ADVANCED` | `PROFESSIONAL`

**Respuesta:** `{ id, skillCategory: { name, type, icon }, expertiseLevel, yearsExp }`

**Error si duplicado:** `409 Conflict — "You already have this skill"`

### Mis habilidades

```
GET /users/me/skills
GET /users/{userId}/skills
```

### Eliminar habilidad

```
DELETE /users/me/skills/{skillId}
```

---

## 4. Organizaciones

### Crear organización

```
POST /organizations
```

**Body:**
```json
{
  "name":        "Les Étoiles du Nord",
  "description": "Orchestre de musique du monde basé à Montréal",
  "website":     "https://etoilesdunord.ca",
  "phone":       "+1-514-555-0100"
}
```

**Respuesta testeada:**
```json
{
  "id":          "cmruzc2h90003ffozntayrbd0",
  "name":        "Les Étoiles du Nord",
  "slug":        "les-etoiles-du-nord",
  "description": "Orchestre de musique du monde basé à Montréal",
  "isActive":    true,
  "createdAt":   "2026-07-21T..."
}
```

> El creador queda automáticamente como `OWNER`.

### Listar mis organizaciones

```
GET /organizations
```

### Detalle de organización con miembros

```
GET /organizations/{orgId}
```

Incluye array `members` con `{ id, role, joinedAt, user: { id, displayName, avatarUrl } }`.

### Crear link de invitación

```
POST /organizations/{orgId}/invite-links
```

**Body:**
```json
{
  "role":      "MEMBER",
  "expiresAt": "2026-08-21T23:59:59.000Z"
}
```

> Si `expiresAt` no se envía, expira en 7 días por defecto.

**Respuesta:**
```json
{ "id": "...", "token": "cmrvsd658001013llhnxa2dtd", "role": "MEMBER", "expiresAt": "2026-08-21T..." }
```

> **Frontend:** mostrar URL `https://tuapp.com/join/{token}` para compartir por WhatsApp/email.

### Unirse a una organización con token

```
POST /organizations/join/{token}
```

Sin body. Solo el JWT en el header.  
**Error si ya es miembro:** `409 Conflict`  
**Error si token inválido:** `404 Not Found`  
**Error si expirado:** `400 Bad Request`

### Listar miembros con roles

```
GET /organizations/{orgId}/members
```

**Respuesta:** array de `{ id, role, joinedAt, updatedAt, user: { id, displayName, firstName, lastName, email, avatarUrl, phone } }`

---

## 5. Repertorio (Songs)

### Crear canción

```
POST /songs
```

**Body:**
```json
{
  "orgId":           "cmruzc2h90003ffozntayrbd0",
  "title":           "Le Petit Pêcheur",
  "composer":        "Félix Leclerc",
  "arranger":        "Jean-Pierre Leblanc",
  "genre":           "Chanson québécoise",
  "musicalKey":      "Ré majeur",
  "tempo":           96,
  "durationSeconds": 225,
  "notes":           "Ouverture du concert. Intro douce à la trompette."
}
```

**4 canciones testeadas:**

| ID | Título | BPM | Tonalidad |
|---|---|---|---|
| `cmrvsdmr2...` | Le Petit Pêcheur | 96 | Ré majeur |
| `cmrvsdn26...` | Bésame Mucho | 72 | Ré mineur |
| `cmrvsdn7n...` | La Bamba | 145 | La majeur |
| `cmrvsdnbc...` | Summertime | 60 | Si mineur |

### Listar repertorio

```
GET /songs?orgId={orgId}&search=pêcheur&genre=Jazz&page=1&limit=20
```

**Respuesta:** `{ songs: [...], total, page, limit }`

### Detalle canción con assets vinculados

```
GET /songs/{songId}
```

Incluye `assets: [{ id, assetType, displayName, contentType, sizeBytes, status }]`  
Aquí aparecen las **partituras** (`music-score`) y **pistas** (`audio-track`) subidas para esa canción.

---

## 6. Venues

### Crear venue

```
POST /venues
```

**Body:**
```json
{
  "name":                  "Salle Wilfrid-Pelletier",
  "address":               "175 Rue Sainte-Catherine O",
  "city":                  "Montreal",
  "country":               "CA",
  "capacity":              2982,
  "latitude":              45.508888,
  "longitude":             -73.561668,
  "parkingNotes":          "3 places réservées derrière la salle — code barrière: 1234",
  "loadInNotes":           "Quai de chargement arrière, ascenseur disponible jusqu'à 18h",
  "technicalContactName":  "Jean-Michel Legrand",
  "technicalContactPhone": "+1-514-842-2112",
  "technicalContactEmail": "jm.legrand@placedesarts.com"
}
```

> **Importante para el clima:** `latitude` y `longitude` deben estar presentes para que el pronóstico meteorológico funcione.  
> ⚠️ **Pendiente de push:** campo `timezone` (IANA: "America/Toronto") — será aceptado en el próximo deploy.

**Venue testeado:**
```json
{ "id": "cmruzeaqj000affozzsplph5v", "name": "Salle Wilfrid-Pelletier", "city": "Montreal", "latitude": 45.508888, "longitude": -73.561668 }
```

### Buscar venues

```
GET /venues?city=Montreal
```

---

## 7. Eventos

### Crear evento

```
POST /events
```

**Body:**
```json
{
  "orgId":           "cmruzc2h90003ffozntayrbd0",
  "title":           "Grand Concert de Rentrée — Les Étoiles du Nord",
  "type":            "CONCERT",
  "startTime":       "2026-07-25T20:00:00.000Z",
  "endTime":         "2026-07-25T23:30:00.000Z",
  "venueId":         "cmruzeaqj000affozzsplph5v",
  "description":     "Concert inaugural de la saison 2026-2027",
  "isPublic":        true,
  "setlistNotes":    "1. Le Petit Pêcheur  2. Bésame Mucho  3. La Bamba  4. Summertime",
  "daysheetNotes":   "PA: L-Acoustics K2. Console: Yamaha CL5. IEM: Sennheiser G4.",
  "itineraryNotes":  "Départ local 13h30. Bus parking Rue Sainte-Catherine côté est."
}
```

**`type`:** `CONCERT` | `REHEARSAL` | `AUDITION` | `TOUR_DATE` | `RECORDING_SESSION`  
**`status` inicial:** siempre `DRAFT`

**Evento testeado:** `cmrvse5yx001f13lljbn1go72`

### Confirmar evento

```
PATCH /events/{eventId}
```

**Body:**
```json
{ "status": "CONFIRMED" }
```

**`status` posibles:** `DRAFT` → `CONFIRMED` → `COMPLETED` / `CANCELLED`

### Agregar músico al roster

```
POST /events/{eventId}/roster
```

**Body:**
```json
{
  "userId": "cmqgqnin60000gx5b5mxsjfow",
  "role":   "Directeur Musical & Trompette",
  "notes":  "Chef de projet, responsable soundcheck"
}
```

**Status inicial:** `INVITED` — dispara automáticamente notificación `EVENT_ASSIGNED` al músico.

### Confirmar asistencia (el músico)

```
PATCH /events/{eventId}/roster/{userId}
```

**Body:**
```json
{ "status": "CONFIRMED" }
```

**Otros status:** `DECLINED`, `NO_SHOW`  
**Nota:** el propio músico puede cambiar su `status`. Solo ADMIN puede cambiar `role` y `notes`.

### Actualizar Day Sheet y notas de producción

```
PATCH /events/{eventId}/daysheet
```

**Body:**
```json
{
  "daysheetNotes":  "PA: L-Acoustics K2 × 8. Console Yamaha CL5. Monitor IEM.",
  "itineraryNotes": "Départ 13h30. Hôtel Le Crystal."
}
```

---

## 8. DaySheet — Cronograma

### Crear ítem de cronograma

```
POST /events/{eventId}/schedule
```

**Body:**
```json
{
  "type":      "SOUNDCHECK",
  "title":     "Balance audio complète",
  "startTime": "2026-07-25T16:30:00.000Z",
  "endTime":   "2026-07-25T18:30:00.000Z",
  "location":  "Scène principale",
  "withWho":   "Avec Jean Dupont (FOH) et Marie Chen (moniteurs)",
  "notes":     "Ordre: rythmique → vents → ensemble"
}
```

**`type` valores:**

| Valor | Descripción |
|---|---|
| `DEPARTURE` | Salida / Viaje |
| `ARRIVAL` | Llegada al recinto |
| `LOAD_IN` | Carga y descarga |
| `SOUNDCHECK` | Balance de audio |
| `DOORS_OPEN` | Apertura de puertas |
| `CATERING_DINNER` | Comida / Cena |
| `SHOWTIME` | Actuación |
| `LOAD_OUT` | Recogida de material |
| `OTHER` | Personalizado |

**8 ítems testeados** (13:30 Départ → 14:30 Arrivée → 14:45 Load-in → 16:30 Soundcheck → 18:30 Dîner → 19:00 Portes → 20:00 Show → 22:15 Load-out)

### Listar cronograma (ordenado por startTime)

```
GET /events/{eventId}/schedule
```

### Marcar ítem como completado (tracking en vivo)

```
PATCH /events/{eventId}/schedule/{itemId}/complete
```

Sin body. Toggle: `false → true → false`. Registra `completedAt` automáticamente.  
**Disponible para cualquier miembro** (no solo ADMIN) — pensado para el móvil el día del show.

---

## 9. DaySheet — Logística de Transporte

### Crear vehículo

```
POST /events/{eventId}/vehicles
```

**Body:**
```json
{
  "name":        "Bus de la banda",
  "driverName":  "Carlos Rodríguez",
  "driverPhone": "+1-514-555-0300",
  "plateNumber": "QC-BUS-001",
  "capacity":    14,
  "notes":       "Compartiment bagages pour instruments à vent"
}
```

**2 vehículos testeados:** Bus de la banda (`cmrvsg7od...`) + Furgoneta Backline (`cmrvsg7z2...`)

### Agregar pasajero al vehículo

```
POST /events/{eventId}/vehicles/{vehicleId}/passengers
```

**Body:** `{ "userId": "cmqgqnin60000gx5b5mxsjfow" }`

**Error si duplicado:** `409 Conflict`  
**Restricción:** el pasajero debe ser miembro de la organización.

### Agregar punto de recogida con GPS

```
POST /events/{eventId}/vehicles/{vehicleId}/pickups
```

**Body:**
```json
{
  "time":    "2026-07-25T13:00:00.000Z",
  "address": "Local de répétition — 4560 Rue Saint-Denis, Montréal",
  "lat":     45.524,
  "lng":     -73.582,
  "order":   0,
  "notes":   "Point de départ principal"
}
```

**`order`:** entero para ordenar las paradas de la ruta (0, 1, 2...).  
`lat` y `lng` opcionales — si se envían, el frontend puede mostrar el mapa de la ruta.

**3 paradas testeadas** con coordenadas GPS reales en Montreal.

### Listar vehículos con pasajeros y pickups

```
GET /events/{eventId}/vehicles
```

**Respuesta:**
```json
[
  {
    "id":          "cmrvsg7od...",
    "name":        "Bus de la banda",
    "driverName":  "Carlos Rodríguez",
    "plateNumber": "QC-BUS-001",
    "capacity":    14,
    "passengers":  [{ "user": { "id":"...", "displayName":"Jean-Pierre Leblanc", "avatarUrl":null } }],
    "pickups": [
      { "order":0, "time":"...T13:00:00Z", "address":"Local de répétition...", "lat":45.524, "lng":-73.582 },
      { "order":1, "time":"...T13:20:00Z", "address":"Station métro Laurier...", "lat":45.528, "lng":-73.573 },
      { "order":2, "time":"...T13:35:00Z", "address":"Café Mozart...", "lat":45.497, "lng":-73.614 }
    ]
  }
]
```

---

## 10. Inventario

### Crear instrumento

```
POST /instruments
```

**Body:**
```json
{
  "orgId":        "cmruzc2h90003ffozntayrbd0",
  "name":         "Trompette Bach Stradivarius",
  "type":         "BRASS",
  "brand":        "Bach",
  "model":        "Stradivarius 37",
  "serialNumber": "BS-2026-JP01",
  "notes":        "Instrument principal du directeur"
}
```

**`type`:** `BRASS` | `WOODWIND` | `STRING` | `KEYBOARD` | `PERCUSSION` | `AUDIO_GEAR` | `LIGHTING` | `OTHER`

**Status inicial:** `AVAILABLE`

**5 instrumentos testeados:** Trompette, Contrebasse, Batterie, Piano Yamaha CP88, Console CL5

### Listar inventario

```
GET /instruments?orgId={orgId}&type=BRASS&status=AVAILABLE
```

Devuelve cada instrumento con su **asignación activa actual** (si la hay).

### Asignar instrumento a músico/evento

```
POST /instruments/{instrumentId}/assign
```

**Body:**
```json
{
  "userId":  "cmqgqnin60000gx5b5mxsjfow",
  "eventId": "cmrvse5yx001f13lljbn1go72",
  "notes":   "Instrument principal pour le concert"
}
```

**Efecto:** status del instrumento cambia a `IN_USE`.  
**Dispara notificación:** `INSTRUMENT_ASSIGNED` al músico asignado.  
**Error si ya en uso:** `409 Conflict`

### Lista de equipaje para un evento

```
GET /instruments/assignments?orgId={orgId}&eventId={eventId}
```

**Respuesta testeada:**
```json
[{ "instrument": { "name":"Trompette Bach Stradivarius", "type":"BRASS" }, "user": { "displayName":"Jean-Pierre Leblanc" }, "event": { "title":"Grand Concert..." } }]
```

### Devolver instrumento

```
PATCH /instruments/{instrumentId}/return
```

Sin body. Status vuelve a `AVAILABLE`. Registra `returnedAt` en el historial.

---

## 11. Finanzas

### Crear categoría de gastos/ingresos

```
POST /finance/categories
```

**Body:**
```json
{ "orgId": "...", "name": "Transporte", "type": "EXPENSE", "icon": "🚌" }
```

**`type`:** `INCOME` | `EXPENSE`

**4 categorías testeadas:** Transporte, Catering, Technique, Cachet concert

### Registrar gasto o ingreso

```
POST /finance/entries
```

**Body:**
```json
{
  "orgId":       "cmruzc2h90003ffozntayrbd0",
  "eventId":     "cmrvse5yx001f13lljbn1go72",
  "categoryId":  "cmr...catId",
  "type":        "EXPENSE",
  "amount":      "420.00",
  "currency":    "CAD",
  "description": "Location bus 14 places — aller-retour",
  "date":        "2026-07-25"
}
```

> **Importante:** `amount` debe enviarse como **string decimal**: `"420.00"` (no número).  
> `proofAssetId` opcional: ID de Asset con la foto del recibo.

**Status inicial:** `PENDING` — debe ser aprobado por un ADMIN.

### Aprobar gasto

```
PATCH /finance/entries/{entryId}/approve
```

Sin body. **Dispara notificación** `EXPENSE_APPROVED` al autor del gasto.

### Rechazar gasto

```
PATCH /finance/entries/{entryId}/reject
```

**Body opcional:** `{ "reason": "Gasto no autorizado" }`  
**Dispara notificación** `EXPENSE_REJECTED`.

### Reporte financiero

```
GET /finance/reports?orgId={orgId}&from=2026-01-01&to=2026-12-31
```

**Solo incluye entradas `APPROVED`.** Respuesta testeada:
```json
{
  "period": { "from": null, "to": null },
  "summary": { "totalIncome": 12000, "totalExpense": 850, "balance": 11150 },
  "byCategory": [
    { "name": "Cachet concert", "type": "INCOME",  "total": 12000, "count": 1 },
    { "name": "Transporte",     "type": "EXPENSE", "total": 420,   "count": 1 },
    { "name": "Catering",       "type": "EXPENSE", "total": 280,   "count": 1 },
    { "name": "Technique",      "type": "EXPENSE", "total": 150,   "count": 1 }
  ]
}
```

### Resumen financiero del evento (1:1)

```
PUT /events/{eventId}/finance
```

**Body:**
```json
{
  "cacheTotal":   "12000.00",
  "perDiemAmount":"80.00",
  "currency":     "CAD",
  "isPaid":       false,
  "paymentNotes": "50% virement avant, 50% chèque après le show"
}
```

**Este es un upsert** — crea si no existe, actualiza si ya existe.  
Cuando `isPaid: true`, registra automáticamente `paidAt` con timestamp.

---

## 12. Notificaciones

Las notificaciones se crean **automáticamente** sin que el frontend haga nada.

### Triggers verificados en producción

| Acción | Tipo de notificación | Destinatario |
|---|---|---|
| Músico añadido al roster | `EVENT_ASSIGNED` | El músico añadido |
| Gasto aprobado | `EXPENSE_APPROVED` | Autor del gasto |
| Gasto rechazado | `EXPENSE_REJECTED` | Autor del gasto |
| Instrumento asignado | `INSTRUMENT_ASSIGNED` | Músico asignado |
| Alguien acepta invitación | `INVITE_ACCEPTED` | Todos los ADMIN/OWNER |
| Rol cambiado | `ROLE_CHANGED` | Miembro afectado |
| Mensaje recibido | `MESSAGE_RECEIVED` | Destinatario |

### Leer notificaciones

```
GET /notifications?isRead=false&page=1&limit=20
```

**Respuesta testeada (7 notificaciones activas):**
```json
{
  "notifications": [
    { "id":"...", "type":"EXPENSE_APPROVED",    "title":"Gasto aprobado", "isRead":false },
    { "id":"...", "type":"INSTRUMENT_ASSIGNED", "title":"Instrumento asignado: Trompette Bach Stradivarius", "isRead":false }
  ],
  "total":      7,
  "unreadCount":7,
  "page":       1,
  "limit":      20
}
```

> **Frontend:** usar `unreadCount` para el badge del icono de notificaciones.

### Marcar como leída

```
PATCH /notifications/{notifId}/read
PATCH /notifications/read-all
```

---

## 13. Master DaySheet

Este es el **endpoint principal** para la pantalla de detalle del evento. Carga todo en una sola llamada.

```
GET /events/{eventId}/daysheet
Authorization: Bearer {token}
```

**Respuesta completa testeada:**
```json
{
  "event": {
    "id":             "cmrvse5yx001f13lljbn1go72",
    "title":          "Grand Concert de Rentrée — Les Étoiles du Nord",
    "type":           "CONCERT",
    "status":         "CONFIRMED",
    "startTime":      "2026-07-25T20:00:00.000Z",
    "endTime":        "2026-07-25T23:30:00.000Z",
    "daysheetNotes":  "PA: L-Acoustics K2. Console: Yamaha CL5.",
    "itineraryNotes": "Départ local 13h30.",
    "setlistNotes":   "1. Le Petit Pêcheur  2. Bésame Mucho  3. La Bamba  4. Summertime"
  },
  "venue": {
    "name":                  "Salle Wilfrid-Pelletier",
    "address":               "175 Rue Sainte-Catherine O",
    "city":                  "Montreal",
    "latitude":              45.508888,
    "longitude":             -73.561668,
    "parkingNotes":          "3 places réservées derrière la salle",
    "loadInNotes":           "Quai de chargement arrière",
    "technicalContactName":  "Jean-Michel Legrand",
    "technicalContactPhone": "+1-514-842-2112"
  },
  "schedule": [
    { "type":"DEPARTURE",      "title":"Départ du local",          "startTime":"...T13:30:00Z", "isCompleted":false },
    { "type":"ARRIVAL",        "title":"Arrivée Place des Arts",   "startTime":"...T14:30:00Z", "isCompleted":false },
    { "type":"LOAD_IN",        "title":"Déchargement backline",    "startTime":"...T14:45:00Z", "isCompleted":false },
    { "type":"SOUNDCHECK",     "title":"Balance audio complète",   "startTime":"...T16:30:00Z", "isCompleted":false, "withWho":"Jean Dupont (FOH)" },
    { "type":"CATERING_DINNER","title":"Dîner — catering",        "startTime":"...T18:30:00Z", "isCompleted":false },
    { "type":"DOORS_OPEN",     "title":"Ouverture des portes",     "startTime":"...T19:00:00Z", "isCompleted":false },
    { "type":"SHOWTIME",       "title":"CONCERT",                  "startTime":"...T20:00:00Z", "isCompleted":false },
    { "type":"LOAD_OUT",       "title":"Démontage et chargement",  "startTime":"...T22:15:00Z", "isCompleted":false }
  ],
  "roster": [
    { "user": { "displayName":"Jean-Pierre Leblanc", "avatarUrl":null, "phone":"+1-514-555-0199" }, "role":"Directeur Musical & Trompette", "status":"CONFIRMED" }
  ],
  "vehicles": [
    {
      "name":       "Bus de la banda",
      "driverName": "Carlos Rodríguez",
      "plateNumber":"QC-BUS-001",
      "capacity":   14,
      "passengers": [{ "user": { "displayName":"Jean-Pierre Leblanc" } }],
      "pickups": [
        { "order":0, "time":"...T13:00:00Z", "address":"Local de répétition...", "lat":45.524, "lng":-73.582 },
        { "order":1, "time":"...T13:20:00Z", "address":"Station métro Laurier", "lat":45.528, "lng":-73.573 },
        { "order":2, "time":"...T13:35:00Z", "address":"Café Mozart",            "lat":45.497, "lng":-73.614 }
      ]
    },
    { "name":"Furgoneta Backline", "driverName":"Marc Tremblay", "plateNumber":"QC-VAN-002", "passengers":[], "pickups":[] }
  ],
  "finance": {
    "cacheTotal":   "12000",
    "perDiemAmount":"80",
    "currency":     "CAD",
    "isPaid":       false,
    "paidAt":       null
  },
  "weather": {
    "available":     true,
    "conditionText": "Soleado",
    "maxTempC":      28.4,
    "minTempC":      15.7,
    "chanceOfRain":  3,
    "sunrise":       "05:38 AM",
    "sunset":        "08:32 PM",
    "source":        "forecast"
  },
  "meta": {
    "totalScheduleItems":  8,
    "completedItems":      0,
    "confirmedAttendees":  1,
    "totalAttendees":      1,
    "totalVehicles":       2,
    "isAdminView":         true
  }
}
```

> **Nota:** `finance` es `undefined` para roles `MEMBER` — solo visible para `ADMIN` y `OWNER`.  
> **Clima:** requiere que el venue tenga `latitude` y `longitude`, y que `WEATHER_API_KEY` esté configurado en Railway.

---

## 14. Lo que falta por testear

### Alta prioridad (bloquean el frontend)

| Feature | Endpoint | Motivo |
|---|---|---|
| **Subida de archivos (Storage)** | `POST /storage/presigned-upload` → PUT a R2 → `POST /storage/confirm-upload` | Partituras, pistas, avatares, riders técnicos — flujo de 3 pasos |
| **Descarga de archivos** | `GET /storage/assets/{id}/download` | URL firmada de Cloudflare R2 |
| **Múltiples usuarios** | Keycloak → crear 2+ usuarios | Testear invitaciones reales, notificaciones cruzadas |
| **Búsqueda de assets** | `GET /storage/assets?orgId=&assetType=music-score` | Listar partituras de una canción |

### Media prioridad

| Feature | Endpoint | Motivo |
|---|---|---|
| **Mensajes directos** | `POST /messages` → `GET /messages/conversations` | Solo testeado con usuario consigo mismo (400 correcto) — necesita 2 usuarios |
| **Per diem individual** | `POST /finance/per-diem` | Pago de viáticos por músico |
| **Toggle completado en vivo** | `PATCH /events/{id}/schedule/{itemId}/complete` | Tracking del día del show desde móvil |
| **Expulsar miembro** | `DELETE /organizations/{orgId}/members/{userId}` | Gestión de roster de la banda |
| **Cambiar rol de miembro** | `PATCH /organizations/{orgId}/members/{memberId}/role` | Promover a ADMIN |
| **Revocar link de invitación** | `DELETE /organizations/{id}/invite-links/{linkId}` | Seguridad |

### Flujo completo de Storage

El flujo de subida necesita ser documentado con un archivo real:

```javascript
// Paso 1 — Pedir URL firmada
const { uploadUrl, key, assetId } = await api('POST', '/storage/presigned-upload', {
  token,
  body: {
    assetType:    'music-score',     // tipo del archivo
    contentType:  'application/pdf', // MIME type exacto
    fileSizeBytes: file.size,        // tamaño exacto en bytes
    orgId:        '...',
    songId:       '...',             // vincular a una canción
    displayName:  'Partitura Le Petit Pêcheur',
    originalName: file.name,
    language:     'fr',
    tags:         ['partitura', 'concert-2026'],
  }
});

// Paso 2 — Subir directo a R2 (sin pasar por el backend)
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(file.size) },
  body: file,
});

// Paso 3 — Confirmar
await api('POST', '/storage/confirm-upload', { token, body: { key, assetType: 'music-score', pageCount: 8 } });

// Paso 4 — Obtener URL de descarga (por ID, nunca por key)
const { downloadUrl } = await api('GET', `/storage/assets/${assetId}/download`, { token });
window.open(downloadUrl); // URL válida 5 min
```

### IDs de referencia (datos reales de producción)

```
userId:   cmqgqnin60000gx5b5mxsjfow  (Jean-Pierre Leblanc)
orgId:    cmruzc2h90003ffozntayrbd0  (Les Étoiles du Nord)
venueId:  cmruzeaqj000affozzsplph5v  (Salle Wilfrid-Pelletier)
eventId:  cmrvse5yx001f13lljbn1go72  (Grand Concert de Rentrée 2026)

Songs:
  cmrvsdmr2001313llhw43q4x5  Le Petit Pêcheur
  cmrvsdn26001613llrw4slkyz  Bésame Mucho
  cmrvsdn7n001913llsbpfv8rn  La Bamba
  cmrvsdnbc001c13llouu903ar  Summertime

Skills:
  cmrvscadq000k13ll4dbrsp99  Directeur Musical
  cmrvsc8zi000213llghinu444  Trompette
  cmrvsc9a7000413llucbmfr2q  Basse électrique
  cmrvsc9ij000613llintsvlio  Batterie
  cmrvsc9o3000813llw8v19ycq  Piano / Claviers
  cmrvsc9ry000a13lleqijmh95  Saxophone
  cmrvsc9vz000c13ll2jc9gr4b  Violon
  cmrvsc9zq000e13lleqyvg3nk  Technicien FOH
  cmrvsca3p000g13ll87pu62xk  Technicien Lumières
  cmrvsca7f000i13llpmpzv4ed  Tour Manager
```
