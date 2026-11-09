# Juego de Hispania

La web abre directamente el mapa jugable a pantalla completa en `/` y `/#jugar`. La flecha de salida muestra la web informativa en `/#inicio`; los enlaces a bandera, reglas y formulario siguen disponibles por sus anclas. **Ver mapa / Jugar** permite volver desde la web. Se puede explorar como Anónimo. Un nick solo identifica al personaje cuando pertenece a la sesión de la web: buscar o escribir un nick importado no concede propiedad. Los habitantes y sus parcelas permanecen en sus posiciones.

## Mapa protagonista y personaje a escala

El canvas ocupa todo el viewport. No hay barras permanentes de búsqueda, vecinos ni zonas A/B encima del terreno. El menú ☰ agrupa la búsqueda de nicks, las zonas y el registro; se abre solo al pulsarlo. Las actividades están en una barra flotante inferior. Sus paneles se pueden cerrar y se apartan automáticamente al iniciar una acción. Los botones rápidos permiten continuar cortando, entregar madera o embarcar sin volver a abrir un panel. Los controles táctiles de movimiento tienen 44 píxeles.

El personaje se dibuja al 36 % de su escala anterior dentro del mundo, incluido cuando está a bordo. El zoom de seguimiento inicial es 8 en móvil y 3 en escritorio, para ver su recorrido con una proporción coherente respecto a los árboles y edificios. Se puede modificar el zoom sin que el movimiento lo restablezca. En una vista muy lejana se oculta su etiqueta para no cubrir el mapa.

## Navegación y fluidez

Se mantiene una simulación mutable compartida entre el mapa y los controles. Un solo requestAnimationFrame actualiza posición, cámara y dibujo a la frecuencia de la pantalla. No hay temporizador de 80 ms para la cámara ni límite artificial de 24 fps. La cámara usa amortiguación exponencial según tiempo transcurrido; sigue al jugador sin forzar un nuevo zoom. El estado de React no se actualiza en cada fotograma. Las 4096 posiciones de parcelas se calculan una vez. La consulta de habitantes se limita por distancia y tiempo.

Controles móviles: mantener las cuatro flechas para moverse, tocar suelo para caminar por una ruta válida, arrastrar para mirar y pellizcar para acercar. En ordenador: flechas o WASD. El botón ◎ retoma el seguimiento. Mirar una zona o arrastrar la cámara no mueve al personaje. Los botones +/− funcionan durante el movimiento. Al perder foco se libera la dirección para evitar desplazamientos involuntarios. La velocidad depende del tiempo, no del número de fotogramas. En segundo plano Chrome puede reducir la frecuencia de animación; las mediciones visuales se hacen con la pestaña visible.

`terrain.ts` contiene muestras de tierra cada ocho unidades obtenidas del mapa original. `navigation.ts` resuelve rutas A* sin atravesar agua ni las esquinas de obstáculos. El puesto de Patatas de @maravaf tiene una zona sólida que incluye el tejado, el mostrador y sus bordes; las casas del atlas también bloquean el paso. No se han cambiado edificios ni parcelas para trazar estos caminos.

## Madera y obra del muelle

Cada jornada permite cortar tres troncos. El personaje camina por una ruta válida, mueve el hacha y recibe la carga al terminar cada corte. El transporte al muelle usa esa misma navegación; la duración depende de la distancia real del camino. La madera se descarga solo al confirmar `finish_harbor_work`. Un fallo conserva la carga para reintentar. Las pulsaciones repetidas quedan bloqueadas durante el trabajo.

La meta original de 50 aportaciones se conserva. Ahora se muestran **150 troncos** como unidad principal y **50 aportaciones de tres troncos** como explicación secundaria. Dos aportaciones equivalen a seis troncos; una entrega no se confunde con un tronco. Los RPC y la contabilidad existentes no se han reescrito ni multiplicado en la base de datos. La primera aportación ya cambia la opacidad del primer tablón.

La espera de 24 horas es solo para aportar madera, no para jugar. Durante la espera, los botones del muelle y el bosque ofrecen la misión de buscar fauna. También siguen disponibles el barco y la exploración. La jornada expira a los 30 minutos y puede reiniciarse. Las recogidas completadas se conservan en sessionStorage de la pestaña; no son aún un inventario de recursos del servidor.

## Barco manual

No hay paseo automático ni reloj de travesía en el juego. El barco se mueve mientras se mantiene una dirección y se detiene al soltarla. No puede entrar en tierra. Si está lejos, el botón de embarque ordena caminar hasta su costa por una ruta válida. Solo se puede embarcar cerca del barco. Se puede desembarcar junto a cualquier costa con suelo accesible en un radio de 85 unidades; en mar abierto se explica por qué no se puede bajar. El barco se queda en el lugar del desembarque.

La posición del jugador, el barco y el modo a bordo se recuerdan en localStorage de ese navegador. Recargar a bordo conserva el modo de navegación. Es movimiento individual, no sincronización multijugador de posiciones.

## Misión de fauna e inventario

Hay seis especies ocultas, dos en islotes. Se revelan al acercarse y se registran al entrar en un radio de 29 unidades. Mirar el mapa o acercar la cámara no descubre animales. El inventario se acredita después de la respuesta del servidor y se puede consultar en la pestaña Fauna. Los fallos de conexión se muestran y se reintentan sin duplicar la especie.

Migración adicional **ya aplicada**: `202611090002_animal_inventory.sql`. Crea una tabla privada con RLS y dos RPC: `adventure_inventory` y `discover_animal`. Cada sesión solo recibe sus propias especies; las cuentas anónimas sin sesión reciben una lista vacía. La clave (sesión, especie) impide duplicados. La lista de códigos válidos se comprueba en servidor. Cambiar de sesión invalida las respuestas pendientes y recarga su inventario. No se exponen identificadores de acceso ni correos.

Todavía no hay uso económico de esos descubrimientos. El servidor guarda especies y valida sus códigos, pero no simula la posición del jugador: antes de asignar recompensas de una economía futura se necesita validación de movimiento y acciones en servidor. La madera mantiene sus garantías anteriores de token, duración mínima, jornada diaria, caducidad y reintentos; no prueba cada golpe del hacha. El límite diario es por sesión de Supabase, no por persona o cuenta de TikTok verificada.

## Verificación

`npm test` cubre rutas alrededor del puesto, paso por suelo válido, colisiones, parada, velocidades a 60 y 120 Hz, embarque, costas distintas, recuperación a bordo, inventarios separados, permisos, reintentos y los casos anteriores de propiedad y aportaciones. `npm run build` comprueba TypeScript y producción. Evidencias y lectura de preservación de residentes: `../proyecto/juego_manual/`. No repetir las migraciones ya aplicadas.
