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

## Pendiente antes de admitir participantes

`VITE_REGISTRATION_OPEN=false`: el registro está cerrado de forma editorial mientras se configura la entrega de códigos.

El proyecto usa el correo predeterminado de Supabase. El panel actual exige SMTP propio o un plan compatible para personalizar las plantillas. El proveedor predeterminado restringe destinatarios y frecuencia; no se ha probado el envío ni el registro completo con personas reales.

Configurar SMTP/remitente y la plantilla `supabase/templates/magic-link.html`, probar dos correos externos y después activar `VITE_REGISTRATION_OPEN=true` en Vercel con un nuevo despliegue. La URL de Vercel sirve para la web, no para verificar un dominio remitente de correo.

El panel del creador está implementado, pero no hay todavía un usuario real con permiso de administrador. Añadir su identidad en `private.atlas_admins` tras el primer acceso verificado, como explica README.
