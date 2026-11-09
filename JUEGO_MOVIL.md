# Primera versión jugable para móvil

Entrada: **Ver mapa / Jugar**, antes del registro y en la cabecera. Tras reservar una parcela se abre el juego enfocado en el nuevo vecino. Enlace directo: `/#jugar`. Salida mediante Volver, Escape o el historial del navegador. La vista ocupa la pantalla disponible con áreas seguras y paneles desplazables en pantallas pequeñas.

Controles: arrastre, pellizco con dos punteros, zoom, centrado, cruceta, búsqueda y acceso a zonas A/B. Los controles de cámara no trasladan habitantes. Tocar bosque, obra o barco abre su actividad.

## Actividades

- **Madera:** una sesión de invitado sin email puede iniciar una jornada, recoger tres troncos y entregar. El servidor exige al menos ocho segundos, un token de jornada de esa sesión y un máximo de una entrega cada 24 horas. La respuesta perdida se puede reintentar sin duplicar el contador. La jornada caduca a los 30 minutos.
- **Muelle:** objetivo inicial de 50 entregas. Progreso persistente y compartido, consultado cada 30 segundos y actualizado inmediatamente al entregar. Su dibujo cambia por etapas y se completa en 50. La última plaza se protege con bloqueo de fila. Idea de @kender.villanueva2, relacionada con las propuestas de pesca de la comunidad.
- **Barco:** barco naval de @.cyberfile, con velas animadas y travesías locales de 60 segundos alrededor de toda la isla; cámara que sigue el recorrido y controles de babor/estribor limitados a 60 unidades de separación lateral. No es un sistema de combate ni un desplazamiento compartido en tiempo real. No genera recursos ni cambia parcelas.

## Datos y límites

Migración nueva: `supabase/migrations/202611090001_harbor_game.sql`. Crea tres tablas privadas y tres RPC. No modifica las tablas ni los RPC de habitantes existentes. No repetir migraciones antiguas. No publicar service-role keys. La clave publicable sigue usando los permisos públicos y de sesión.

`harbor_status` devuelve únicamente total, objetivo y resumen de la sesión propia; no expone identidades de acceso. Escribir un nick importado no concede propiedad. Un visitante puede contribuir sin registrar un habitante; no se le atribuye el nick de otra persona.

El límite es **por sesión de Supabase**, no por persona ni por cuenta de TikTok verificada. Crear otra sesión permite otra identidad de invitado. El tiempo de jornada no prueba que se hayan realizado los tres toques; protege el mínimo de duración, el token y los reintentos. Para una economía con premios o valor habría que añadir controles de identidad y abuso antes de ampliarla.

Pruebas: `npm test` cubre privacidad y propiedad anteriores, RPC de obra, espera, tokens ajenos, caducidad, reintentos, enfriamiento y finalización. `npm run build` comprueba TypeScript y la entrega de producción. El mapa y el panel de actividad se cargan por separado para reducir la descarga inicial.

## Personaje y acciones visibles · segunda versión

El jugador local aparece con su nick y color de la sesión propietaria; sin un habitante vinculado, se llama Anónimo. No se mueve la parcela de ningún vecino. Cada recogida dura 5,5 s: camina al árbol, mueve el hacha y produce astillas. El tronco se añade al terminar, con bloqueo de pulsaciones repetidas. La carga visible viaja al muelle durante 9 s; se vacía únicamente después de la confirmación de finish_harbor_work. Los fallos conservan la carga para reintentar. La cámara acompaña al personaje. El estado de jornada y los troncos terminados se recuerdan en sessionStorage de esta pestaña; si se corta una animación, esa recogida no se acredita. La carga no es todavía un inventario persistente del servidor. La confirmación de entrega mantiene las garantías descritas arriba.

La vuelta del barco recorre un polígono exterior al archipiélago en un minuto. Los animales se muestran al 65–70 % de su tamaño anterior. El detalle de hierba es vectorial al acercar: no se afirma haber aumentado la resolución de la imagen de terreno. No hay sincronización multijugador de posiciones: cada visitante ve su propio personaje en acción, mientras que el progreso del muelle sí es compartido.

Siguiente fase propuesta, aún sin implementar: inventario de recursos y oro persistente con operaciones atómicas en servidor, puesto de venta, recetas de casas y misiones. Oro ficticio sin valor económico. Evitar una economía basada en contadores del navegador.
