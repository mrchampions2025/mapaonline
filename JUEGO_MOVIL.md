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

## Corrección de cámara y mina · 09 noviembre

Se ha eliminado la desactivación del seguimiento al apoyar el dedo. El destino de un toque se calcula con la cámara que se veía al iniciarlo; solo un arrastre real o una pinza entra en cámara libre. Los gestos actualizan la cámara mostrada y su objetivo de forma simultánea; el arrastre usa su escala inicial y el zoom mantiene el punto bajo el cursor o los dedos. Una pinza no produce un toque al levantar los dedos. Abrir paneles conserva el centro del mapa y no reinicia el bucle de dibujo. Los toques en vista general del juego ya no saltan a otro barrio. En cámara libre, caminar no obliga a volver al personaje: el botón de seguimiento lo recupera expresamente. Los botones de zoom conservan el seguimiento cuando estaba activo. Las rutas visibles muestran el destino. Un destino inválido cancela la ruta anterior; un obstáculo nuevo detiene al actor en vez de dejarlo caminar indefinidamente o atravesar su último tramo.

La Mina de la colina está en (700,940), con entrada accesible en (700,982), fuera de las parcelas. Tiene arco de roca, vagoneta, farol y dos cadenas metálicas en X con candado. El botón ⛏ permite verla y caminar hasta su entrada. Las rocas tienen colisión. La condición de apertura es **500 seguidores de TikTok verificados**, separada del contador de residentes. La lectura oficial del 09/11 a las 15:39 de España es **398**. `community.ts` conserva la lectura y su fecha: es una comprobación manual, no una API de seguidores en directo. Al verificar y publicar una lectura de al menos 500, se retiran las cadenas y se libera el portal, conservando sólidas las paredes. Todavía no hay extracción, minerales acreditados ni economía minera: el panel lo indica. No se ha añadido una migración ni modificado residentes o aportaciones.

Las pruebas de regresión comprueban geometría del zoom, arrastre, cambio de destino, cancelación ante agua y obstáculos, acceso a la entrada y umbral de apertura. Total: 34 pruebas. QA de Chrome a 390×844: toque mantenido llega a (575.21,1079.03); después de arrastrar, un toque llega a (624.59,1083.81) manteniendo la cámara en (603.67,1070.90); la entrada se alcanza en (700,982). Sin errores o avisos capturados en la consola de la prueba local. El pellizco se valida mediante pruebas de geometría; no se ha simulado multitáctil físico en un teléfono.

La comprobación final detectó que tocar el río en (590.56,1094.13) se corregía silenciosamente a una orilla en (598.31,1096.11). Se eliminó ese ajuste en `walkTo`: un destino que no es transitable se rechaza y cancela la ruta anterior. Las rutas de trabajo siguen usando sus destinos previstos. Caso añadido a las regresiones.
