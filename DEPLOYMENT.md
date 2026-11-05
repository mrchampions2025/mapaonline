# Estado del despliegue · 5 de noviembre de 2026

- Web publicada: https://mapaonline.vercel.app/
- Repositorio: https://github.com/mrchampions2025/mapaonline
- Rama de producción inicial: `codex/base-atlas`.
- Proyecto Supabase: `pgslxybrshoissckccuj`.
- Migración aplicada mediante el SQL Editor: cuatro barrios, 4096 parcelas, funciones de reserva, RLS e historial privado de construcciones.
- Site URL de Supabase configurada a la dirección publicada.
- Variables públicas configuradas en Vercel para Production y Preview. Ninguna clave privada está en el repositorio.
- La web publicada confirma «Atlas conectado». Verificados zoom, consulta de zona, búsqueda sin resultados y disposición móvil sin desbordamiento horizontal.
- Pruebas locales: siete comprobaciones de Postgres embebido superadas y compilación de producción correcta.

## Revisión: entrada con nick, sin correo obligatorio

Se activaron Anonymous Sign-Ins y manual linking en Supabase. El primer formulario pide nick y personaje; la reserva se vincula a una identidad de invitado persistente en el navegador. `VITE_GUEST_REGISTRATION_OPEN=true` permite abrir esta entrada sin depender del correo.

El TikTok canónico de la web es @naciondeseguidores, configurado con `VITE_TIKTOK_PROFILE_URL`. La variable anterior `VITE_TIKTOK_URL` queda sin uso en el código.

Debajo de la parcela aparece la opción de protección por email. `VITE_REGISTRATION_OPEN=false` mantiene solo esta parte como próximamente hasta configurar remitente, plantilla de cambio de correo y entrega de códigos. No es necesario el email para crear una parcela.

La vinculación usa la misma identidad; confirmar un correo no acredita la propiedad del nick de TikTok. Sin vinculación, perder la sesión impide recuperar el control de la parcela solo mediante el nick.

El panel del creador está implementado, pero no hay todavía un usuario real con permiso de administrador. Añadir su identidad en `private.atlas_admins` como explica README. No se han desactivado la confirmación de email ni los permisos de acceso existentes.
