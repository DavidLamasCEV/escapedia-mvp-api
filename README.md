# Escapedia MVP -- Backend API

Proyecto académico desarrollado para el ejercicio **Full-Stack Product
MVP (DAM 2º)**.

Este repositorio contiene la **API REST** del proyecto Escapedia, una
plataforma orientada a la exploración, reserva y valoración de Escape
Rooms.

------------------------------------------------------------------------

# 1. Objetivo académico

Este backend ha sido diseñado para cumplir todos los requisitos del
ejercicio:

-   API REST con Express + MongoDB
-   Autenticación JWT con roles
-   Mínimo 6 modelos con relaciones reales
-   Relación 1-N y relación N-N
-   Workflow con estados
-   3+ reglas de negocio comprobables
-   Emails transaccionales con token
-   Subida de imágenes con Cloudinary
-   CRUD completo con paginación, filtros y ordenación
-   Validación de inputs y middleware global de errores

------------------------------------------------------------------------

# 2. Stack tecnológico

-   Node.js
-   Express
-   MongoDB Atlas
-   Mongoose
-   JWT (jsonwebtoken)
-   Bcrypt
-   Nodemailer
-   Cloudinary
-   express-validator

------------------------------------------------------------------------

# 3. Modelos implementados

## User

-   name
-   email (unique)
-   password (hash)
-   role (user \| owner \| admin)
-   isEmailVerified
-   avatarUrl

## Local

-   name
-   city
-   address
-   ownerId -\> User

## EscapeRoom (recurso principal)

-   localId -\> Local
-   title
-   description
-   city
-   themes\[\]
-   difficulty
-   playersMin / playersMax
-   priceFrom
-   weekSlots\[\]
-   weekendSlots\[\]
-   slotDurationMin
-   ratingAvg
-   ratingCount
-   isActive

## Booking

-   userId -\> User
-   roomId -\> EscapeRoom
-   scheduledAt (UTC)
-   players
-   status (pending \| confirmed \| completed \| cancelled)
-   customerNote
-   internalNote
-   createdByUserId
-   createdByRole
-   isDeleted

## Review

-   userId -\> User
-   roomId -\> EscapeRoom
-   bookingId -\> Booking
-   rating (1--5)
-   comment
-   isDeleted

## Trophy

-   title
-   description
-   criteriaType
-   threshold

## UserTrophy (relación N-N)

-   userId -\> User
-   trophyId -\> Trophy
-   índice compuesto único

------------------------------------------------------------------------

# 4. Relaciones de base de datos

-   User 1-N Local
-   Local 1-N EscapeRoom
-   EscapeRoom 1-N Booking
-   User 1-N Booking
-   Booking 1-0..1 Review
-   User N-N Trophy (UserTrophy)

Cumple requisitos obligatorios de relaciones 1-N y N-N.

------------------------------------------------------------------------

# 5. Autenticación y roles

## Roles

-   user
-   owner
-   admin

## Endpoints Auth

-   POST /auth/register
-   POST /auth/login
-   GET /auth/me
-   POST /auth/forgot-password
-   POST /auth/reset-password

Características: 
- Password hasheado con bcrypt
- JWT en login
- Middleware de protección de rutas
- Recuperación de contraseña con token y expiración

------------------------------------------------------------------------

# 6. Workflow de reservas

1.  Usuario crea reserva → pending
2.  Owner confirma → confirmed
3.  Owner completa → completed
4.  Cancelación según reglas

Transiciones controladas en backend.

------------------------------------------------------------------------

# 7. Reglas de negocio implementadas

1.  No reservas solapadas en una misma sala.
2.  Validación de jugadores según playersMin/playersMax.
3.  Validación de slot permitido según día.
4.  Regla de las 12 horas para usuarios.
5.  Solo se puede crear review si booking está completed.
6.  Solo una review por booking.
7.  Recalculo automático de ratingAvg y ratingCount.

------------------------------------------------------------------------

# 8. Filtros, paginación y ordenación

GET /rooms soporta:

-   page
-   limit
-   city
-   difficulty
-   theme
-   minPrice
-   maxPrice
-   sort:
    -   new
    -   old
    -   priceAsc
    -   priceDesc
    -   popular

Validado con express-validator.

------------------------------------------------------------------------

# 9. Cloudinary

-   Subida de imágenes
-   Eliminación
-   Persistencia solo de URLs
-   No almacenamiento de binarios en MongoDB

------------------------------------------------------------------------

# 10. Emails (Nodemailer)

Implementado:

-   Recuperación de contraseña con token
-   Validación de expiración

------------------------------------------------------------------------

# 11. Soft Delete

Aplicado en:

-   Booking
-   Review
-   EscapeRoom

Los listados excluyen registros eliminados.

------------------------------------------------------------------------

# 12. Variables de entorno

Archivo .env.example:

MONGO_URI= PORT=3000 JWT_SECRET= CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY= CLOUDINARY_API_SECRET= EMAIL_USER= EMAIL_PASS=

------------------------------------------------------------------------

# 13. Instalación

1.  Clonar repositorio git clone
    https://github.com/DavidLamasCEV/escapedia-mvp-api.git

2.  Instalar dependencias npm install

3.  Configurar .env

4.  Ejecutar npm run dev

Servidor por defecto: http://localhost:3000

------------------------------------------------------------------------

# 14. Testing

Probado con Postman:

-   CRUD completo por rol
-   Validación de ownership
-   Validación de reglas de negocio
-   Solapamientos
-   Reviews verificadas
-   Filtros y ordenación

------------------------------------------------------------------------

# 15. Conclusión académica

Este backend cumple íntegramente con los requisitos del ejercicio
Full-Stack Product MVP:

✔ 6+ modelos reales\
✔ Relaciones 1-N y N-N\
✔ JWT + roles\
✔ Emails con token\
✔ Cloudinary integrado\
✔ Workflow con estados\
✔ 3+ reglas de negocio\
✔ CRUD + paginación + filtros + ordenación\
✔ Validación y middleware de errores

Proyecto preparado para integración con frontend React.
