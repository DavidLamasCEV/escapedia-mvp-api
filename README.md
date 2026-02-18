# 🎭 Escapedia MVP -- Backend API

> Proyecto académico desarrollado para el ejercicio **Full-Stack Product MVP (DAM 2º)**

Este repositorio contiene la **API REST** del proyecto Escapedia, una plataforma orientada a la exploración, reserva y valoración de Escape Rooms.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/cloud/atlas)
[![JWT](https://img.shields.io/badge/JWT-Auth-red.svg)](https://jwt.io/)

---

## 📋 Tabla de contenidos

- [Objetivo académico](#1-objetivo-académico)
- [Stack tecnológico](#2-stack-tecnológico)
- [Modelos implementados](#3-modelos-implementados)
- [Relaciones de BD](#4-relaciones-de-base-de-datos)
- [Autenticación y roles](#5-autenticación-y-roles)
- [Workflow de reservas](#6-workflow-de-reservas)
- [Reglas de negocio](#7-reglas-de-negocio-implementadas)
- [Filtros y paginación](#8-filtros-paginación-y-ordenación)
- [Cloudinary](#9-cloudinary)
- [Emails](#10-emails-nodemailer)
- [Soft Delete](#11-soft-delete)
- [Variables de entorno](#12-variables-de-entorno)
- [Instalación](#13-instalación)
- [Testing](#14-testing)
- [Conclusión](#15-conclusión-académica)

---

## 1. Objetivo académico

Este backend ha sido diseñado para cumplir **todos los requisitos** del ejercicio:

- ✅ API REST con Express + MongoDB
- ✅ Autenticación JWT con roles
- ✅ Mínimo 6 modelos con relaciones reales
- ✅ Relación 1-N y relación N-N
- ✅ Workflow con estados
- ✅ 3+ reglas de negocio comprobables
- ✅ Emails transaccionales con token
- ✅ Subida de imágenes con Cloudinary
- ✅ CRUD completo con paginación, filtros y ordenación
- ✅ Validación de inputs y middleware global de errores

---

## 2. Stack tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Runtime | Node.js |
| Framework | Express |
| BD NoSQL | MongoDB Atlas |
| ODM | Mongoose |
| Autenticación | JWT (jsonwebtoken) |
| Hashing | Bcrypt |
| Email | Nodemailer |
| Almacenamiento | Cloudinary |
| Validación | express-validator |

---

## 3. Modelos implementados

### 👤 User
- `name` - Nombre del usuario
- `email` (unique) - Correo electrónico único
- `password` (hash) - Contraseña hasheada
- `role` - `user` | `owner` | `admin`
- `isEmailVerified` - Bandera de verificación
- `avatarUrl` - URL del avatar

### 🏢 Local
- `name` - Nombre del local
- `city` - Ciudad
- `address` - Dirección
- `ownerId` → User - Propietario del local

### 🎭 EscapeRoom (recurso principal)
- `localId` → Local - Local donde está ubicada
- `title` - Título de la sala
- `description` - Descripción detallada
- `city` - Ciudad
- `themes[]` - Temas disponibles
- `difficulty` - Nivel de dificultad
- `playersMin / playersMax` - Rango de jugadores
- `priceFrom` - Precio base
- `weekSlots[]` - Horarios entre semana
- `weekendSlots[]` - Horarios fin de semana
- `slotDurationMin` - Duración en minutos
- `ratingAvg` - Puntuación promedio
- `ratingCount` - Total de valoraciones
- `isActive` - Estado activo/inactivo

### 📅 Booking
- `userId` → User - Usuario que reserva
- `roomId` → EscapeRoom - Sala reservada
- `scheduledAt` (UTC) - Fecha y hora de la reserva
- `players` - Número de jugadores
- `status` - `pending` | `confirmed` | `completed` | `cancelled`
- `customerNote` - Nota del cliente
- `internalNote` - Nota interna
- `createdByUserId` - Quién creó la reserva
- `createdByRole` - Rol de quien la creó
- `isDeleted` - Soft delete

### ⭐ Review
- `userId` → User - Usuario que valora
- `roomId` → EscapeRoom - Sala valorada
- `bookingId` → Booking - Reserva relacionada
- `rating` (1-5) - Puntuación
- `comment` - Comentario
- `isDeleted` - Soft delete

### 🏆 Trophy
- `title` - Nombre del logro
- `description` - Descripción
- `criteriaType` - Tipo de criterio
- `threshold` - Umbral a alcanzar

### 🎖️ UserTrophy (relación N-N)
- `userId` → User - Usuario
- `trophyId` → Trophy - Logro
- Índice compuesto único

---

## 4. Relaciones de base de datos

```
User (1)
 ├── 1-N → Local
 ├── 1-N → Booking
 ├── 1-N → Review
 └── N-N → Trophy (a través de UserTrophy)

Local (1)
 └── 1-N → EscapeRoom

EscapeRoom (1)
 ├── 1-N → Booking
 └── 1-N → Review

Booking (1)
 └── 1-0..1 → Review
```

**Relaciones implementadas:**
- `User` 1-N `Local` - Un propietario gestiona varios locales
- `Local` 1-N `EscapeRoom` - Un local contiene varias salas
- `EscapeRoom` 1-N `Booking` - Una sala recibe múltiples reservas
- `User` 1-N `Booking` - Un usuario puede hacer múltiples reservas
- `Booking` 1-0..1 `Review` - Una reserva genera como máximo una review
- `User` N-N `Trophy` (UserTrophy) - Usuarios pueden tener múltiples logros

**Cumple requisitos obligatorios de relaciones 1-N y N-N.**

---

## 5. Autenticación y roles

### 👥 Roles definidos

| Rol | Descripción |
|-----|-----------|
| `user` | Usuario estándar, puede hacer reservas y reviews |
| `owner` | Propietario de locales, gestiona salas y reservas |
| `admin` | Acceso completo al sistema |

### 🔗 Endpoints de autenticación

| Método | Endpoint | Descripción |
|--------|----------|-----------|
| `POST` | `/auth/register` | Registrar nuevo usuario |
| `POST` | `/auth/login` | Iniciar sesión |
| `GET` | `/auth/me` | Obtener datos del usuario autenticado |
| `POST` | `/auth/forgot-password` | Solicitar reset de contraseña |
| `POST` | `/auth/reset-password` | Resetear contraseña con token |

### 🔐 Características de seguridad

- ✅ Password hasheado con bcrypt
- ✅ JWT en login con token de acceso
- ✅ Middleware de protección de rutas
- ✅ Recuperación de contraseña con token de expiración limitada
- ✅ Validación de ownership en recursos

---

## 6. Workflow de reservas

El flujo de estados de una reserva sigue esta secuencia:

```
1. Usuario crea reserva
   ↓ (estado: pending)
2. Owner confirma
   ↓ (estado: confirmed)
3. Owner completa
   ↓ (estado: completed)

O en cualquier momento:
   → Cancelación según reglas (estado: cancelled)
```

**Transiciones controladas en backend** - El sistema valida cada cambio de estado según las reglas de negocio y roles.

---

## 7. Reglas de negocio implementadas

| # | Regla | Descripción |
|---|-------|-----------|
| 1️⃣ | No reservas solapadas | Imposible reservar la misma sala en la misma fecha/hora |
| 2️⃣ | Validación de jugadores | Número de jugadores debe estar entre `playersMin` y `playersMax` |
| 3️⃣ | Validación de slot | La hora debe ser un slot permitido según el día |
| 4️⃣ | Regla de 12 horas | Los usuarios solo pueden cancelar con 12+ horas de anticipación |
| 5️⃣ | Review solo en completadas | Solo se puede crear review si booking está en estado `completed` |
| 6️⃣ | Una review por booking | No se puede crear más de una review por reserva |
| 7️⃣ | Recalculo de ratings | `ratingAvg` y `ratingCount` se actualizan automáticamente |

---

## 8. Filtros, paginación y ordenación

### 📊 GET /rooms

Soporta los siguientes parámetros query:

**Paginación:**
- `page` - Número de página (default: 1)
- `limit` - Resultados por página (default: 10)

**Filtros:**
- `city` - Filtrar por ciudad
- `difficulty` - Filtrar por dificultad (1-5)
- `theme` - Filtrar por tema
- `minPrice` - Precio mínimo
- `maxPrice` - Precio máximo

**Ordenación:**
- `sort=new` - Más recientes primero
- `sort=old` - Más antiguas primero
- `sort=priceAsc` - Precio ascendente
- `sort=priceDesc` - Precio descendente
- `sort=popular` - Más valoradas primero

**Ejemplo de request:**
```
GET /rooms?page=1&limit=10&city=Madrid&difficulty=3&sort=popular
```

Todos los parámetros están **validados con express-validator**.

---

## 9. Cloudinary

Implementación de gestión de imágenes:

- ✅ Subida de imágenes desde el cliente
- ✅ Eliminación de imágenes en Cloudinary
- ✅ Persistencia solo de URLs en MongoDB
- ✅ No almacenamiento de binarios en la base de datos
- ✅ Validación de tipos de archivo

**Configuración:** Las credenciales se gestionan a través de variables de entorno (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

---

## 10. Emails (Nodemailer)

Funcionalidades implementadas:

- ✅ Email de **recuperación de contraseña** con token seguro
- ✅ Email de **validación de expiración** de tokens
- ✅ Emails transaccionales estructurados
- ✅ Gestión segura de credenciales

**Proveedores soportados:** Gmail, Outlook, y cualquier servidor SMTP personalizado.

---

## 11. Soft Delete

Implementado en recursos sensibles:

| Modelo | Campo | Comportamiento |
|--------|-------|-----------|
| `Booking` | `isDeleted` | Las reservas marcadas como eliminadas no aparecen en listados |
| `Review` | `isDeleted` | Las reviews eliminadas se excluyen de cálculos de rating |
| `EscapeRoom` | `isActive` | Las salas inactivas no aparecen en búsquedas |

**Los listados excluyen automáticamente registros eliminados.**

---

## 12. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```env
# Base de datos
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/escapedia

# Servidor
PORT=3000
NODE_ENV=development

# Autenticación
JWT_SECRET=tu_jwt_secret_super_secreto_minimo_32_caracteres

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Email
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
```

**Archivo de referencia:** `.env.example` (incluido en el repo)

---

## 13. Instalación

### Paso 1: Clonar repositorio

```bash
git clone https://github.com/DavidLamasCEV/escapedia-mvp-api.git
cd escapedia-mvp-api
```

### Paso 2: Instalar dependencias

```bash
npm install
```

### Paso 3: Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus credenciales
```

### Paso 4: Ejecutar servidor

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm run start
```

**Servidor disponible en:** `http://localhost:3000`

---

## 14. Testing

Se ha realizado testing exhaustivo con **Postman**:

- ✅ CRUD completo por rol
- ✅ Validación de ownership
- ✅ Validación de reglas de negocio
- ✅ Solapamientos de reservas
- ✅ Reviews verificadas
- ✅ Filtros y ordenación
- ✅ Middleware global de errores
- ✅ Transiciones de estado

**Resultados verificados:**
- Operaciones CRUD en cada rol funcionan correctamente
- Las validaciones de ownership previenen accesos no autorizados
- Las reglas de negocio se aplican correctamente
- Los filtros y ordenación funcionan como se espera

---

## 15. Conclusión académica

Este backend **cumple íntegramente con todos los requisitos** del ejercicio Full-Stack Product MVP:

| Requisito | Estado | Detalles |
|-----------|--------|---------|
| API REST con Express + MongoDB | ✅ | Implementado y funcional |
| Autenticación JWT con roles | ✅ | 3 roles: user, owner, admin |
| 6+ modelos con relaciones reales | ✅ | 7 modelos implementados |
| Relación 1-N | ✅ | Múltiples relaciones implementadas |
| Relación N-N | ✅ | User ↔ Trophy a través de UserTrophy |
| Workflow con estados | ✅ | Booking: pending → confirmed → completed |
| 3+ reglas de negocio | ✅ | 7 reglas implementadas y verificadas |
| Emails transaccionales | ✅ | Reset de contraseña con token |
| Cloudinary integrado | ✅ | Subida y gestión de imágenes |
| CRUD completo | ✅ | Crear, leer, actualizar, eliminar en todos los modelos |
| Paginación, filtros, ordenación | ✅ | Implementados en GET /rooms |
| Validación de inputs | ✅ | express-validator en todos los endpoints |
| Middleware global de errores | ✅ | Manejo centralizado de excepciones |

Proyecto preparado para integración con frontend React.

---

## 📄 Licencia

Este es un proyecto académico desarrollado para fines educativos.

---

## 🤝 Autor

Desarrollado por **DavidLamasCEV** como proyecto del ejercicio Full-Stack Product MVP (DAM 2º)

---

**Última actualización:** Febrero 2026