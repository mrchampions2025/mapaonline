# Nación Cero · Atlas fundador

Mapa persistente para **@naciondeseguidores**. React + TypeScript + Canvas + Supabase, listo para Vercel. Arte original del proyecto. Entrada con nick y muñeco sin correo, mediante una sesión de invitado de Supabase. Correo opcional para recuperar la misma parcela desde otro dispositivo.

## Qué incluye

- Isla navegable con desplazamiento, zoom, búsqueda y enlaces `?vecino=nick`.
- 4 barrios y 4.096 parcelas. Vista agregada al alejarse, vecinos de la zona al acercarse; máximo 750 registros por consulta visible. No se crea un elemento HTML por habitante.
- Reserva transaccional en Postgres: bloqueos de fila, bloqueo por identidad, restricciones únicas e idempotencia.
- Nick normalizado y personaje; correo e ID de autenticación excluidos de las respuestas públicas.
- Panel del creador: casas, árboles, puerto, cultivos, caminos y bandera. Acceso mediante lista privada de administradores y RLS. Historial de cambios privado en Supabase.
- Retirada voluntaria del personaje y cierre de sesión.
- Sin integración de seguimiento de TikTok: el nick es declarado y no verificado. Registrados y seguidores son cifras distintas.

## Desarrollo local

Node 22.12 o superior. Este proyecto se ha preparado con Node 24.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

En Windows PowerShell: `Copy-Item .env.example .env.local`. Completa el archivo con la URL de Supabase y su clave **publishable**. La clave pública se incorpora a la aplicación de navegador; las autorizaciones las aplican RLS y las funciones SQL. **Nunca** uses `service_role`, una clave secreta ni una contraseña de base de datos en variables `VITE_`.

Sin configuración se puede explorar el mapa, pero no crear reservas. Si Supabase está configurado sin la migración, el atlas muestra un estado de preparación.

## Supabase: orden de instalación

Proyecto previsto: `https://pgslxybrshoissckccuj.supabase.co`.

1. En un proyecto nuevo, abre **SQL Editor** y ejecuta `supabase/migrations/202611050001_atlas.sql` completo. La migración es transaccional y se aplica una sola vez; no borra tablas previas para poder reejecutarse. Para un entorno ya instalado, usa migraciones nuevas.
2. En **Authentication**, habilita Email. Activa **Anonymous Sign-Ins** para permitir la entrada con nick sin correo. Activa el enlace manual de identidades para convertir el invitado en cuenta con correo. Configura el método por código: en **Email Templates → Magic Link**, utiliza `{{ .Token }}` en el cuerpo en lugar de un enlace. Plantilla de acceso preparada en `supabase/templates/magic-link.html`; para proteger la parcela del invitado, configura también **Change email address** con `supabase/templates/change-email.html`.
3. Configura SMTP propio para admitir participantes ajenos al equipo. El remitente predeterminado de Supabase tiene restricciones de destinatarios y frecuencia; no es adecuado para lanzar la serie a miles de usuarios. Puedes usar un proveedor SMTP y un dominio remitente verificado.
4. En **URL Configuration**, establece Site URL al dominio definitivo y permite `http://localhost:5173` para desarrollo si lo necesitas. Aunque el flujo principal introduce el código en pantalla, configura correctamente el proyecto.
5. Revisa límites de envío, expiración de códigos y protección de Auth antes de abrir el registro a una audiencia amplia. El botón limita reenvíos en la interfaz; el control real de frecuencia corresponde a Supabase Auth.
6. Regístrate con tu correo desde la web. Para habilitar tu panel, ejecuta como propietario del proyecto, sustituyendo el correo:

```sql
insert into private.atlas_admins(user_id)
select id from auth.users where email = 'TU_CORREO_DE_CREADOR'
on conflict do nothing;
```

Cierra sesión y vuelve a entrar para cargar el panel. La clave pública no permite concederse este permiso. No se incluye ninguna cuenta administradora predeterminada.

## GitHub

Repositorio de destino: https://github.com/mrchampions2025/mapaonline

Subir el contenido de esta carpeta como raíz del repositorio. No subir `node_modules`, `dist`, `.env.local`, archivos de vídeo ni claves privadas. El lockfile sí se versiona.

## Vercel

1. Importa el repositorio de GitHub. Framework: **Vite**. Root Directory: `.` si subiste el contenido de esta carpeta a la raíz; `nacion-cero-web` si el repositorio contiene la carpeta completa.
2. Instala con `npm ci`, construye con `npm run build` y publica `dist`. `vercel.json` contiene la configuración y cabeceras básicas.
3. Añade estas variables a Production y a Preview cuando corresponda:

```text
VITE_SUPABASE_URL=https://pgslxybrshoissckccuj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=LA_CLAVE_PUBLICA_DEL_PROYECTO
VITE_TIKTOK_PROFILE_URL=https://www.tiktok.com/@naciondeseguidores
VITE_REGISTRATION_OPEN=false
```

Vite fija estas variables durante el build. Si las cambias, vuelve a desplegar. No se necesita un servidor Node persistente: Vercel sirve la web y Supabase resuelve identidad, datos y reservas.

La entrada de invitados está abierta por defecto con `VITE_GUEST_REGISTRATION_OPEN=true` y requiere activar el proveedor anónimo en Supabase. El correo opcional permanece cerrado: cambia `VITE_REGISTRATION_OPEN=true` solo después de configurar SMTP y comprobar las dos plantillas de código. Este interruptor es editorial, no una barrera de seguridad del servidor; los permisos de datos siempre los aplican Supabase Auth, RLS y los RPC.

## Comprobaciones

```sh
npm test
npm run build
```

Las pruebas ejecutan la migración en Postgres embebido (PGlite) con identidades y roles simulados: reservas repetidas, colisiones de nick, validación, aislamiento, permisos de administración e historial. No equivalen a una prueba de carga o concurrencia real ni al envío de correo del proyecto remoto.

Antes de anunciar el enlace, prueba con dos correos reales: ambos deben recibir código, crear personajes con parcelas diferentes y conservarlos tras cerrar sesión. Un visitante debe poder encontrarlos sin ver datos de acceso. Confirma que los correos llegan también a destinatarios ajenos al equipo.

## Operación y crecimiento

- La numeración de parcela es estable. Nick y terreno no se deducen de un contador de seguidores.
- Los barrios están abiertos desde el principio. Puedes cerrar nuevas asignaciones con `update public.districts set is_open=false where id=...`; eso no elimina habitantes. La vista agregada solo muestra barrios abiertos en esta base; para archivar un barrio con residentes, añade primero un estado separado para visibilidad.
- Para ampliar capacidad, añade barrios y parcelas con una migración y actualiza la geometría compartida `src/lib/world.ts`. La versión inicial tiene una isla y 4.096 posiciones; la expansión a otras islas requiere ese trabajo posterior.
- Las construcciones admiten coordenadas dentro del mapa; el editor no valida todavía tierra frente a mar. Usa el panel con criterio. El historial privado conserva el antes y el después; esta versión no tiene botón de restauración automática.
- No hay elección manual de terreno, verificación de TikTok, economía, pagos, votaciones web ni cambios de nick. La cuenta se identifica por correo; varias direcciones podrían pertenecer a una misma persona.
- No se garantiza rendimiento para cientos de miles de registros. La representación es por zona y se consulta cada 30 s mientras la página está visible. Evaluar índices, costes y carga antes de crecer.
- Para una apertura pública definitiva, sustituye el texto informativo por una política de privacidad adaptada al responsable real. La aplicación informa de qué muestra, permite retirar el personaje y no publica correos.

## Referencias oficiales

- [OTP por correo de Supabase](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Funciones SQL](https://supabase.com/docs/guides/database/functions)
- [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)

## Entrada sin correo y protección posterior

El primer formulario solo pide nick y personaje. `signInAnonymously()` crea una identidad de invitado cuando la persona pulsa «Crear mi lugar», nunca al visitar el mapa. La reserva permanece vinculada a ese ID y a la sesión guardada por Supabase en el navegador. No se permite recuperar una parcela escribiendo su nick.

Debajo de la parcela aparece «¿Quieres asegurar tu lugar?». Añadir correo utiliza `updateUser({email})` sobre esa misma identidad; la confirmación usa `verifyOtp` con tipo `email_change`. Nunca se cambia `owner_id` por coincidencia de nick. Un correo que ya pertenece a otra cuenta se rechaza sin transferir la reserva.

El nick es único en este atlas, pero no se verifica en TikTok. La confirmación de correo acredita control del correo, no propiedad de la cuenta de TikTok. Los invitados que borren datos del navegador o cambien de dispositivo no pueden recuperar su acceso sin haber protegido la parcela.

Una identidad de invitado solo puede reservar una parcela. Eso no equivale a una persona real: otro navegador u otra sesión puede crear otro invitado. Supabase aplica límites por IP; antes de una campaña masiva conviene configurar CAPTCHA invisible/Turnstile sin eliminar la entrada rápida. No se borran automáticamente invitados ni parcelas de la comunidad.

No pruebes un cambio de correo iniciando una sesión de email diferente: eso puede abandonar el invitado. Usa siempre el bloque de protección de su propia parcela. Prueba recuperación con un segundo navegador solo después de confirmar el email.
