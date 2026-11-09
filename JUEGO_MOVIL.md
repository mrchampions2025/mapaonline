# Primera versión jugable para móvil

Entrada: **Ver mapa / Jugar**, antes del registro y en la cabecera. Tras reservar una parcela se abre el juego enfocado en el nuevo vecino. Enlace directo: `/#jugar`. Salida mediante Volver, Escape o el historial del navegador. La vista ocupa la pantalla disponible con áreas seguras y paneles desplazables en pantallas pequeñas.

Controles: arrastre, pellizco con dos punteros, zoom, centrado, cruceta, búsqueda y acceso a zonas A/B. Los controles de cámara no trasladan habitantes. Tocar bosque, obra o barco abre su actividad.

## Actividades

- **Madera:** una sesión de invitado sin email puede iniciar una jornada, recoger tres troncos y entregar. El servidor exige al menos ocho segundos, un token de jornada de esa sesión y un máximo de una entrega cada 24 horas. La respuesta perdida se puede reintentar sin duplicar el contador. La jornada caduca a los 30 minutos.
- **Muelle:** objetivo inicial de 50 entregas. Progreso persistente y compartido, consultado cada 30 segundos y actualizado inmediatamente al entregar. Su dibujo cambia por etapas y se completa en 50. La última plaza se protege con bloqueo de fila. Idea de @kender.villanueva2, relacionada con las propuestas de pesca de la comunidad.
- **Barco:** barco naval de @.cyberfile, con velas animadas y travesías locales de 12 segundos; controles de babor y estribor limitados a una franja de mar. No es un sistema de combate ni un desplazamiento compartido en tiempo real. No genera recursos ni cambia parcelas.

## Datos y límites

Migración nueva: `supabase/migrations/202611090001_harbor_game.sql`. Crea tres tablas privadas y tres RPC. No modifica las tablas ni los RPC de habitantes existentes. No repetir migraciones antiguas. No publicar service-role keys. La clave publicable sigue usando los permisos públicos y de sesión.

`harbor_status` devuelve únicamente total, objetivo y resumen de la sesión propia; no expone identidades de acceso. Escribir un nick importado no concede propiedad. Un visitante puede contribuir sin registrar un habitante; no se le atribuye el nick de otra persona.

El límite es **por sesión de Supabase**, no por persona ni por cuenta de TikTok verificada. Crear otra sesión permite otra identidad de invitado. El tiempo de jornada no prueba que se hayan realizado los tres toques; protege el mínimo de duración, el token y los reintentos. Para una economía con premios o valor habría que añadir controles de identidad y abuso antes de ampliarla.

Pruebas: `npm test` cubre privacidad y propiedad anteriores, RPC de obra, espera, tokens ajenos, caducidad, reintentos, enfriamiento y finalización. `npm run build` comprueba TypeScript y la entrega de producción. El mapa y el panel de actividad se cargan por separado para reducir la descarga inicial.
