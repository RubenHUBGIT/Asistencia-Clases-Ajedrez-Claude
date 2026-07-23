# Asistencia Ajedrez

Aplicación web para gestionar la asistencia semanal y los pagos mensuales de alumnos
que reciben clases de ajedrez en distintos colegios.

Estado: en construcción por fases (ver [Roadmap](#roadmap)).

## Stack técnico

- **Next.js 14** (App Router) + TypeScript — frontend y backend (API Routes) en un único proyecto (monolito modular).
- **PostgreSQL** + **Prisma ORM**.
- **NextAuth (Auth.js) v4** con proveedor de credenciales y sesiones persistidas en base de datos.
- **Tailwind CSS** para estilos.
- **Zod** para validación de datos, en cliente y servidor.
- **Vitest** + Testing Library para pruebas unitarias e integración.
- **Docker Compose** para desarrollo/despliegue local (app + PostgreSQL).

## Decisiones de diseño no especificadas en los requisitos

Estas decisiones se han tomado por ser razonables, seguras y sencillas para una primera versión:

- **Sesiones en base de datos (NextAuth) en lugar de JWT propio**: evita implementar
  manualmente rotación/expiración de tokens y permite revocar sesiones cerrando sesión
  o desactivando el usuario.
- **Restablecimiento de contraseña sin proveedor de email obligatorio**: se genera un
  token de un solo uso con expiración (`PasswordResetToken`). Si no hay `SMTP_*`
  configurado, el enlace se muestra en la respuesta/consola solo en `NODE_ENV=development`;
  en producción es obligatorio configurar SMTP para el envío real.
- **Rate limiting de login sin infraestructura adicional**: se implementa contando
  intentos fallidos en base de datos (tabla `LoginAttempt`) por combinación de
  usuario/IP, válido para una única instancia. Si en el futuro se despliega en varias
  instancias, debería sustituirse por un almacén compartido (p. ej. Redis).
- **Borrado lógico (archivado)** en colegios y alumnos en lugar de borrado físico,
  para no perder histórico de asistencia/pagos asociado.
- **Grupo/clase por defecto**: si un alumno no se asigna a un grupo concreto, se usa
  un grupo "General" por colegio, para poder garantizar la unicidad de la asistencia
  por alumno y fecha sin depender de que el grupo sea obligatorio en el alta rápida.
- **Imagen Docker sin `output: standalone`**: se prioriza simplicidad y fiabilidad
  (la imagen final incluye `node_modules` completo) frente a optimizar el tamaño de imagen,
  ya que las migraciones y el seed necesitan las CLIs de Prisma/tsx en tiempo de ejecución.

## Estructura del proyecto

```
src/
  app/            Rutas (App Router) y API routes
  components/     Componentes de UI reutilizables
  lib/            Lógica de dominio, acceso a datos, auth, permisos
prisma/
  schema.prisma   Modelo de datos
  seed.ts         Datos iniciales (admin, colegios, alumnos, asistencia, pagos demo)
tests/            Pruebas unitarias y de integración
```

## Requisitos previos

- Node.js 20+
- npm 10+
- Docker y Docker Compose (opcional, para levantar todo con un comando)
- PostgreSQL 16 (si no usas Docker)

## Instalación y ejecución local (sin Docker)

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia el archivo de variables de entorno y ajústalo:

   ```bash
   cp .env.example .env
   ```

   Genera un secreto para `NEXTAUTH_SECRET`, por ejemplo con:

   ```bash
   openssl rand -base64 32
   ```

3. Levanta una base de datos PostgreSQL local (puedes usar solo el servicio `db` de Docker Compose):

   ```bash
   docker compose up -d db
   ```

4. Aplica las migraciones y genera el cliente de Prisma:

   ```bash
   npm run prisma:migrate
   ```

5. Carga los datos iniciales (usuario administrador, colegios, alumnos, asistencia y pagos de demostración):

   ```bash
   npm run db:seed
   ```

6. Arranca la aplicación en modo desarrollo:

   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`.

### Usuario administrador inicial

El seed crea un usuario administrador con las credenciales definidas en `.env`
(`ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`). **Nunca uses estos valores por
defecto en producción**: define credenciales propias antes de ejecutar el seed. El
usuario administrador queda marcado para cambiar la contraseña en el primer inicio de sesión.

## Ejecución con Docker Compose

1. Copia `.env.example` a `.env` y ajusta los valores (como mínimo `NEXTAUTH_SECRET`,
   `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`).
2. Levanta los servicios:

   ```bash
   docker compose up --build
   ```

   El contenedor `app` aplica automáticamente las migraciones (`prisma migrate deploy`)
   al arrancar. Para cargar también los datos de demostración en el primer arranque,
   define `RUN_SEED_ON_START=true` en `.env` antes de levantar los servicios.

3. La aplicación estará disponible en `http://localhost:3000`.

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run start` | Servidor de producción (tras `build`) |
| `npm run lint` | Linter |
| `npm run typecheck` | Comprobación de tipos sin generar salida |
| `npm run test` | Ejecuta las pruebas una vez |
| `npm run test:watch` | Pruebas en modo observador |
| `npm run prisma:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run prisma:migrate:deploy` | Aplica migraciones existentes (producción) |
| `npm run prisma:studio` | Explorador visual de la base de datos |
| `npm run db:seed` | Carga los datos iniciales/demo |

## Roadmap

- [x] Fase 1 — Scaffolding del proyecto
- [ ] Fase 2 — Esquema de base de datos, migraciones y seed
- [ ] Fase 3 — Autenticación
- [ ] Fase 4 — Roles y permisos, gestión de usuarios
- [ ] Fase 5 — Colegios
- [ ] Fase 6 — Alumnos
- [ ] Fase 7 — Asistencia semanal e histórico
- [ ] Fase 8 — Pagos mensuales y resumen
- [ ] Fase 9 — Panel principal y auditoría
- [ ] Fase 10 — Pruebas automatizadas
- [ ] Fase 11 — QA final y documentación de despliegue
