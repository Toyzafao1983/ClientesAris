# Registro de cambios — pedidos químicos

Este documento reúne los cambios de consultas, renderizado y condiciones manuales del portal de químicos. Las rutas indicadas son relativas a `creacionpedido/quimico/com.aris.registropedido.quimico.pe`. Para continuar desde BAS, revisar primero la sección de condiciones manuales y sus pendientes de validación SAP.

Punto de partida de la revisión de consultas: repositorio Clientes, commit `8219b9f`, árbol limpio antes de editar.

## Comportamiento vigente: caché por flujo, sin vencimiento

Las respuestas exitosas se conservan en memoria durante todo el ingreso del pedido. No hay temporizador ni vencimiento por minutos. Cada consulta se identifica por su URL completa, incluidos sus filtros. Consultas simultáneas comparten una petición y cada consumidor recibe su propia copia. Los errores no se guardan y permiten reintentar.

Entrar a Main inicia un flujo nuevo y limpia la caché antes de cargar datos. Es también el destino de cancelar un pedido o volver desde FormClient, acción que ya descarta el formulario. Volver de Detail a FormClient conserva la caché. Una recarga completa o una nueva instancia de la aplicación empieza sin datos. Si se entra directamente a FormClient o Detail, se consulta lo que no esté guardado.

El tipo de cambio conserva la fecha de su primera consulta durante el flujo, incluso si cambia el día. Al iniciar otro flujo, la fecha se restablece y se consulta el tipo de cambio vigente. Esta regla reemplaza el vencimiento de cinco minutos usado en la primera versión.

## Consultas incluidas

- Customer y DataCustomer: `_getClientPet` y `_getDatClient`. Main solicita cada catálogo en un solo bloque con `$top=100000`, sin seguir enlaces de paginación. FormClient y Detail filtran una copia del catálogo completo por Customer, conservando todas las filas comerciales del cliente. Esperan la carga si todavía está pendiente. Si no hay catálogo completo (entrada directa o error), consultan únicamente al cliente solicitado. No se publica una carga parcial como exitosa.
- Tipo de cambio: `_getTipChangeData`. Main no lo solicita. FormClient lo carga y Detail lo reutiliza.
- UsOrve: `_getBPVendedor`. Reutilización entre Main, FormClient y Detail, incluida la segunda llamada de validación de Main. Las reglas de acceso se siguen ejecutando; cambios de asignaciones en SAP se reflejan al comenzar otro flujo.
- FullAddressSet: `_getAddresTravel`. La clave incluye Customer, SalesOrganization y SalesPartner cuando corresponde. Las listas de agencias y destinos se preparan por separado para cada consumidor. Los cambios locales no modifican la caché ni los manejadores existentes de edición del pedido.

MarMat solicita `$filter=org_ventas eq '1120'` en rutas local y S4HANA. Mantiene la depuración local de marcas vacías y duplicadas. Esta consulta no se almacena en caché.

Stock, precios, crédito, simulación y envío mantienen sus consultas actuales. La caché no es persistente ni se comparte con otros módulos.

## Archivos de producción para SAP

Dentro de este proyecto:

- `webapp/Component.js`: administra la caché y la fecha de consulta del flujo.
- `webapp/controller/Main.controller.js`: inicia el flujo y elimina la carga inicial del tipo de cambio.
- `webapp/controller/BaseController.js`: integra las consultas compartidas y el filtro de MarMat.
- `webapp/services/CustomerQueryCache.js`: archivo nuevo, caché sin vencimiento, carga en un bloque y filtrado local de catálogos completos.
- `webapp/util/utilHttp.js`: conserva `__next` en la respuesta de ERPGetSync para detectar respuestas incompletas, sin cambiar el campo data existente.

## Validación

`node webapp/test/customer-query-cache.cjs` verifica peticiones compartidas, copias independientes, conservación tras avanzar el reloj, reinicio desde Main, cambio de fecha durante el flujo, reintentos, invalidación con peticiones pendientes, filtros y listas de direcciones, vendedores y marcas en rutas local/S4HANA. Usa transporte simulado.

Desde la raíz se ejecutan también los validadores customer-odata, order-access, ias-priority y chemical-freight. Los mocks de customer-odata y order-access se adaptaron al contrato del Component. Los archivos de pruebas y este documento no son necesarios para desplegar.

La compilación UI5 falló por `Temporal is not supported in this environment` con Node 26.8.1; el mismo fallo se reprodujo con el HEAD original exportado, sin cambios.

## Pendiente en el portal conectado a SAP

1. Entrar a Main y comenzar un pedido. Revisar clientes y permisos con usuarios internos y externos.
2. Pasar de FormClient a Detail y volver, incluso tras más de cinco minutos: no deben repetirse URLs ya consultadas de los servicios incluidos en caché.
3. Editar agencia y destinos; comprobar que se mantienen opciones y selecciones. Cambiar cliente o vendedor debe usar una consulta con sus filtros propios.
4. Cancelar o volver a Main: deben renovarse los datos al iniciar el nuevo flujo.
5. Confirmar que SAP acepta y aplica el filtro de MarMat por 1120.
6. En pruebas, verificar cantidades, flete, simulación, totales y creación del pedido.

Las verificaciones locales no certifican navegación real ni creación de pedidos en SAP.

## Carga inicial en un solo bloque (ajuste vigente)

Se restaura `$top=100000` en Customer y DataCustomer. Se hace una petición inicial por entidad; no se siguen enlaces `__next`. Si no hay continuación y la respuesta contiene menos de 100000 filas, el catálogo se reutiliza filtrando por cliente. Si SAP anuncia continuación o se alcanza el límite, se conserva la consulta puntual por cliente como respaldo, también cacheada por flujo. No se considera completo un catálogo potencialmente truncado.

El frontend solicita un bloque; el backend determina cuántos registros entrega realmente. Este cambio no garantiza que SAP devuelva todos los registros si limita las respuestas. Se conserva el comportamiento original de mostrar el bloque inicial, con esa limitación.

Archivos funcionales modificados en este ajuste: `webapp/controller/BaseController.js` y `webapp/services/CustomerQueryCache.js`. Se requieren las versiones ya desplegadas de Component.js y utilHttp.js, pero no cambiaron en este ajuste.

`node webapp/test/customer-catalog.cjs`: valida el transporte, Component y métodos reales, una sola petición inicial con top=100000, ausencia de paginación automática, filtrado local, copias independientes, respaldo si hay continuación o se alcanza el límite, entrada directa, reinicio y reintentos en ambas rutas.

Pendiente en Network conectado a SAP: una llamada inicial por entidad; sin llamadas con skiptoken; reutilización en formulario y detalle cuando el bloque está completo. Confirmar el volumen real y verificar las ayudas de clientes y la creación del pedido.

## Reutilización de Users

`_getUsers` comparte la respuesta de IAS por URL (incluido el correo) durante el flujo entre Main, FormClient y Detail. Mantiene el formato Resources y copias independientes; las validaciones de acceso se siguen ejecutando. Entrar a Main renueva la consulta. La entrada directa carga los datos si no están guardados y los errores permiten reintentar. Validación simulada: `node webapp/test/users-query-cache.cjs`. Pendiente confirmar una sola solicitud Users en Network durante el flujo conectado a SAP.

## Renderizado de transportista y dirección de agencia (04-10-2026)

La traza QAS `Trace-20261004T085251.json.gz`, con SAPUI5 1.152.0, muestra aproximadamente 2,42 s de renderizado, con recorridos repetidos en `getVisibleItems`, `getSize` y `getAccessbilityPosition`. Se conserva el ComboBox y su renderer original. Las funciones compartidas `_optimizeCatalogCombo` y `_optimizeComboListRendering` residen en BaseController. FormClient y Detail las activan al configurar sus filtros de búsqueda. Durante un renderizado completo de la lista, se reutilizan las filas visibles y un mapa de posiciones. Fuera del renderizado se ejecutan los métodos originales; cada nuevo renderizado reconstruye los cálculos. Las listas agrupadas mantienen el cálculo original de posiciones.

No se limita, pagina ni recorta el catálogo. Los bindings, IDs, eventos, búsqueda, claves, textos secundarios, validaciones y filtro por transportista permanecen en los controladores existentes. Se aplica únicamente a transportista y agencia de FormClient y Detail. No se modifican prototipos globales ni se desactiva accesibilidad.

Archivos para desplegar: `webapp/controller/BaseController.js`, `webapp/controller/FormClient.controller.js` y `webapp/controller/Detail.controller.js`. Las vistas conservan sus ComboBox originales; no se requieren nuevos módulos de aplicación.

Validación: `node webapp/test/combo-list-render-cache.cjs` compara posiciones y cantidades con 10000 entradas, filtrado, reemplazo de catálogo, catálogo vacío, agrupación, limpieza e instalación repetida. Además se compararon las 10000 posiciones con los métodos reales descargados de SAPUI5 1.152.0: mismos resultados, un recorrido del catálogo por renderizado. XML y `git diff --check` correctos. La compilación sigue fallando con `Temporal is not supported in this environment`, tanto con Node 26 como con Node 22.

Pendiente en QAS: repetir la grabación con igual volumen; comprobar selección por clic y teclado, búsqueda por nombre/código/dirección, limpiar selección, cambiar transportista, resultados al final de la lista y edición al volver de Detail. La mejora de tiempo real aún no está medida. El ajuste usa métodos internos de la lista de UI5; al actualizar SAPUI5 hay que repetir la validación de compatibilidad. Si faltan los métodos esperados, la lista conserva su comportamiento original.


## Precios y descuentos manuales heredados de referencia (05-10-2026)

### Requerimiento y alcance autorizado

Las posiciones de cotizaciones y contratos pueden traer condiciones manuales en `DoRePeItem`. El usuario aclaró que los nuevos campos sustituyen los valores de los mismos conceptos enviados habitualmente, que en estos casos vienen vacíos. No deben añadirse condiciones independientes por el hecho de tener una nueva fuente de datos. Se autorizó modificar el frontend para validación; no se realizó despliegue ni creación real de pedidos en SAP durante esta implementación.

El requisito inicial solicitaba solo análisis; posteriormente el usuario autorizó los cambios al confirmar que contaba con respaldo Git. La modificación funcional de esta entrega está únicamente en `webapp/controller/Detail.controller.js`.

### Contrato OData confirmado

El JSON suministrado por el usuario para el documento `2590000224` en `ds4` confirma los nombres exactos en minúsculas. Los importes, bases y porcentajes llegan como cadenas, con punto decimal. La captura anterior de `qs4`, documento `2570000057`, no incluía estos campos. No se ha confirmado que ambos ambientes tengan la misma versión del servicio.

| Propiedad OData | Significado SAP | Destino del envío actual |
|---|---|---|
| `zzimporte` | `KBETR`: importe del precio `ZPMA` | `CondValue` |
| `zzmoneda` | `WAERS`: moneda de la condición | `Currency` |
| `zzbase` | `KPEIN`: base del precio | `CondPUnt` |
| `zzunidad` | `KMEIN`: unidad del precio | `CondDUnt` |
| `zzdescporc` | `KBETR`: porcentaje de descuento | `CondValue` de la condición de descuento |

La explicación SAP adjunta indica que el backend obtiene `VBAK-KNUMV` por `VBAK-VBELN = SalesDocument`, y consulta `PRCD_ELEMENTS` con ese `KNUMV` y `KINAK` vacío. Esta lógica es contexto del backend; no se implementó una consulta a esas tablas desde el frontend.

**Código de descuento pendiente de confirmar:** la documentación SAP identifica el origen como `ZDCP`. El portal ya enviaba `ZDMP`. Esta implementación conserva `ZDMP` en simulación y creación, siguiendo la aclaración del usuario de sustituir los valores del envío existente. No se debe dar por certificada la equivalencia de ambos códigos; ABAP debe confirmar si el servicio espera `ZDMP` o `ZDCP` para el descuento heredado.

### Implementación vigente

1. FormClient ya consulta `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DoRePeItem` y conserva cada registro original en `pos._raw`. No se modificó ese controlador para este ajuste.
2. Al cargar las posiciones seleccionadas en Detail, se copian los cinco campos de `pos._raw` a cada posición de `/oMaterial`. Se mantienen `RefDoc`, `RefDocIt`, `RefDocCa` y la numeración de posición del pedido. El enlace se conserva por posición, no por material: un material puede repetirse con condiciones diferentes.
3. `_getReferenceManualPrice(item)` construye `ZPMA` únicamente si los cuatro campos de precio están informados, el importe y la base son numéricos finitos y la base es mayor que cero. Conserva la cadena del importe y envía la base multiplicada por 10 (corrección posterior autorizada el 05-10-2026). No divide el importe entre 10 ni reemplaza la unidad de la condición por la unidad de pedido. Un importe cero con los otros campos completos se admite; los ejemplos sin precio tienen moneda y unidad vacías y base cero, por lo que no activan la condición.
4. Una marca de precio o descuento manual del portal, o un porcentaje manual numérico distinto de cero, impide usar el precio heredado. `_getManualDiscountValue(item)` prioriza el porcentaje positivo ingresado en el portal; si hay precio manual del portal devuelve cero, y si se marca descuento manual sin porcentaje positivo no recupera el descuento heredado. En los demás casos usa `zzdescporc` cuando sea numérico finito y distinto de cero, incluidos porcentajes negativos según la regla original de distinto de cero.
5. `onSimulateOrder` coloca el precio heredado en el ítem de simulación (`aHeaderToItem`) y el descuento en `toConditions`, utilizando las ubicaciones habituales del flujo existente.
6. `_createOrder` coloca el precio heredado en el ítem y en `toConditions`, como ya hacía el flujo de precio manual existente. En ambas ubicaciones conserva importe, moneda y unidad recibidos; aplica el factor 10 a la base. El descuento se coloca en `toConditions`. No se añadió una segunda condición `ZPMA` dentro de esa colección para una misma posición. Falta verificar con ABAP si se requieren ambas ubicaciones del precio y que no produzcan aplicación doble en SAP.
7. Cuando no hay valores heredados aplicables, se conserva el flujo normal. El precio ingresado en el portal sigue usando sus transformaciones anteriores, incluida la división entre 10 en la condición de creación; esa lógica no se cambió en esta entrega.

Los bloqueos existentes para precio/descuento ingresados manualmente en pedidos con referencia permanecen: revisan `usarPrecioManual` y `descuentoManualPct`. Los nuevos campos heredados no activan esas marcas y pueden enviarse con referencia. La prioridad descrita en los helpers no implica que se haya habilitado editar manualmente condiciones en pedidos con referencia; ese comportamiento sigue sujeto a dichos bloqueos.

### Datos de prueba confirmados

| Documento | Posición de referencia | Material | Condición esperada |
|---|---|---|---|
| `2590000224` | 10 | `300051` | Sin precio ni descuento manual heredado |
| `2590000224` | 20 | `300052` | Descuento 8,5 % |
| `2590000224` | 30 | `300399` | `ZPMA`: 11 USD por 1 FCO |
| `2590000224` | 40 | `300419` | `ZPMA`: 25 USD por 3 FCO |
| `2590000224` | 50 | `300051` | `ZPMA`: 6 USD por 1 KG |

Ejemplo de campos del precio de la posición 40: `CondType: "ZPMA"`, `CondValue: "25.000000000"`, `Currency: "USD"`, `CondPUnt: "30"`, `CondDUnt: "FCO"`. Para la posición 20, el envío actual usa `CondType: "ZDMP"` y `CondValue: "8.5"`.

### Validación local realizada y límites

- `node --check webapp/controller/Detail.controller.js`: correcto.
- `git diff --check`: correcto en la implementación funcional.
- Un script temporal de Node cargó el controlador real con un stub de `sap.ui.define` y comprobó los helpers usando las cinco posiciones del JSON. También ejecutó los bloques de construcción de condiciones de simulación y creación. Verificó campos incompletos, base cero, prioridad de condiciones editadas y porcentaje heredado negativo. Los resultados fueron correctos: una condición de descuento en simulación y cuatro condiciones heredadas en la colección de creación de este ejemplo, conservando 25 USD y base 3.

El script se creó en `/tmp/validate_quimicos.cjs` en el equipo de esta sesión; no está versionado ni se debe asumir que exista en BAS. Tampoco se debe depender de la ruta local del adjunto JSON. La tabla anterior permite reconstruir las entradas de prueba. Estas comprobaciones no ejecutaron el flujo completo de UI5, la BAPI ni una creación real. No se ejecutó una compilación UI5 nueva para esta entrega; las limitaciones de compilación descritas antes corresponden a ajustes anteriores.

### Continuación y validación en BAS/SAP

1. Confirmar que el checkout en BAS incluye este documento y la versión modificada de Detail; tener un respaldo Git local no transfiere por sí solo los cambios entre equipos.
2. En Network, comprobar que el ambiente de validación devuelve los cinco campos en `DoRePeItem`. Si faltan, solicitar la publicación de la ampliación al equipo ABAP antes de evaluar el frontend.
3. Cargar el documento de prueba, seleccionar sus cinco posiciones y revisar el payload de simulación: posiciones de referencia correctas, precio con base y unidad originales y descuento de 8,5 %. Verificar que cantidades, flete, impuestos y totales calculados por SAP sean correctos.
4. Revisar el payload de creación y confirmar con ABAP los campos admitidos, la escala de importe/porcentaje, la presencia de `Currency` en el ítem y si `ZPMA` debe ir en ítem, colección o ambas. La implementación actual reproduce las ubicaciones existentes, pero el contrato real aún no está certificado.
5. Confirmar específicamente `ZDMP` frente a `ZDCP`. No cambiar el código solo por inferencia; contrastarlo con el servicio de simulación/creación y el resultado de SAP.
6. Verificar la respuesta de simulación con precio heredado. La validación para clientes IAS ahora acepta una condición activa `ZPRE` o `ZPMA`; verificar ambas variantes.
7. Repetir simulación y cambiar cantidades; confirmar que las condiciones heredadas siguen vinculadas a su posición y que el material repetido `300051` no comparte por error las condiciones de las posiciones 10 y 50.
8. Validar un pedido sin referencia y posiciones sin campos nuevos para comprobar el flujo habitual. Probar cotización y contrato, y el regreso de Detail a FormClient.
9. En el ambiente de pruebas acordado, crear el pedido y verificar en SAP las condiciones efectivas, bases, unidades y descuento, comprobando que no haya aplicación duplicada. La creación real sigue pendiente.

Estado de esta entrega: cambios funcionales locales preparados para validación, documentación actualizada, sin commit ni despliegue realizado por esta sesión. Confirmar el estado Git del checkout antes de continuar, ya que puede cambiar después de este registro.


## Corrección de base y lectura de simulación (05-10-2026)

Esta sección actualiza el comportamiento descrito en la primera entrega de condiciones manuales. El usuario confirmó que, para precios manuales heredados, `zzbase` se debe multiplicar por 10 al enviarlo: 1 → 10 y 3 → 30. `_getReferenceManualPrice` centraliza la conversión, por lo que aplica a los ítems de simulación y a las dos ubicaciones del precio de creación. El importe permanece 11, 25 o 6; la base original de `/oMaterial` no se modifica y las simulaciones repetidas no acumulan el factor. La base del precio manual ingresado desde el portal mantiene su lógica anterior.

La evidencia real suministrada mostró que SAP devolvía `ZPMA` con importes 110, 250 y 60 cuando se enviaban 11, 25 y 6 con bases 1, 3 y 1. También devolvió un `ZPRE` inactivo (`Condisacti: "A"`) después del `ZPMA` activo de la posición 50. La interfaz sobrescribía el precio manual con ese precio de lista y mostraba 49,50, mientras SAP calculaba el impuesto sobre 660.

Correcciones en `Detail.controller.js`:

- `_isConditionActive` identifica condiciones sin marca de inactividad. El recorrido que carga precios, descuentos e impuestos en las filas omite las condiciones inactivas.
- Un `ZPRE` no sobrescribe el precio si hay un `ZPMA` activo de la misma posición, independientemente del orden de respuesta. No se activa `usarPrecioManual` para los precios heredados, evitando interferir con los bloqueos de edición con referencia.
- La validación de precio para clientes IAS admite `ZPRE` o `ZPMA` activos.
- La presentación del descuento consulta el mismo helper que el envío, incluyendo `zzdescporc`. Cuando SAP devuelve `ZDMP` activo con importe distinto de cero, usa su importe retornado y evita descontarlo dos veces; si el catálogo no lo clasifica, lo resta una vez. Se conserva el respaldo de cálculo local anterior para descuentos ingresados en el portal.
- Si se envía descuento heredado y SAP no devuelve `ZDMP` activo con importe aplicado, se muestra una advertencia con las posiciones afectadas. No se simula localmente su aplicación ni se alteran impuestos para aparentar un descuento que SAP no aplicó. La advertencia no bloquea la creación.

**Descuento todavía pendiente en SAP:** el payload real incluía `ZDMP` de 8,5 % para `000020`, pero la respuesta contenía solo precio `ZPRE` por 75 e impuesto por 13,50; no había ninguna condición de descuento. La corrección de lectura no soluciona la recepción de `toConditions` por ABAP. La última imagen del usuario identifica el descuento como `ZDMP`; se conserva ese código. Revisar su mapeo en operación `CS` antes de cambiar código o escala.

Validación local: sintaxis Node y `git diff --check` correctos. Script temporal `/tmp/test_manual_fix.cjs` verificó bases 10/30, exclusión de condiciones inactivas, prioridad de `ZPMA` con ambos órdenes de respuesta y descuento retornado sin duplicación, tanto clasificado como ausente del catálogo. Con la respuesta real, la posición 50 conserva el total activo 660; con importes de respuesta ajustados para comprobar la lógica de presentación, los totales manuales son 165, 100 y 66. Esto último es una prueba local con datos ajustados, no una respuesta nueva de SAP. Los scripts temporales no forman parte del checkout BAS.

Pendiente conectado a SAP: repetir simulación y comprobar bases enviadas 10/30/10, precios unitarios 11, 8,33 y 6, y totales de posiciones manuales 165, 100 y 66. Verificar IGV y creación con los mismos valores. Confirmar que el descuento de 8,5 % se aplica realmente en SAP (sobre 75, neto esperado 68,625 antes de redondeo). No se realizó despliegue, commit ni creación real en esta corrección.


## Descuento por posición en simulación (05-10-2026, ajuste vigente)

Corrección posterior: el usuario confirmó que la simulación no utiliza `toConditions` para descuentos; esa colección corresponde al guardado. La comparación local de textiles y cerámicos confirmó simulaciones con `HeaderToItem` y sin `toConditions`, aunque esas versiones no contienen un ejemplo explícito de descuento manual.

En `Detail.controller.js`, `onSimulateOrder` ahora coloca `CondType: "ZDMP"` y `CondValue: "8.5"` directamente en el ítem `000020` de `HeaderToItem`, conservando material, unidad y referencia. Se retiró la inserción del descuento en `aCondSim`. La colección de simulación conserva su tratamiento previo de flete cuando corresponde; no se modificó el flete. `_createOrder` mantiene el descuento en `toConditions`. El envío de precio manual y sus bases 10/30/10 permanece vigente.

El ítem dispone de un par `CondType`/`CondValue`; si ya tiene condición de precio manual, no se sobrescribe con descuento. El ejemplo suministrado tiene precio y descuento manual en posiciones distintas. El envío simultáneo de ambos conceptos en una misma posición requeriría confirmar un contrato adicional.

Este ajuste sustituye el diagnóstico previo que atribuía la ausencia del descuento a ABAP sin comprobar primero su ubicación: el 8,5 sí estaba en el payload, pero en una colección que el usuario indicó que la simulación no procesa. Los campos por posición se implementan con el mismo par usado para condiciones manuales; su aceptación para `ZDMP` queda pendiente de prueba SAP.

Validación local: se ejecutó el bloque real de construcción de `HeaderToItem` con descuento heredado 8,5, precio heredado con base 3, posición sin condición y descuento ingresado en el portal. Se comprobó el descuento por posición, conservación de referencias, base de precio 30 y ausencia del descuento en `aCondSim`. Se confirmó que el guardado mantiene `ZDMP` en `toConditions`. Sintaxis Node y `git diff --check` correctos.

Pendiente: revisar en Network que `HeaderToItem` de `000020` incluya `CondType: "ZDMP"`, `CondValue: "8.5"`, y confirmar que SAP devuelva descuento activo con importe aplicado e impuestos sobre el neto. La advertencia existente permanece si SAP no devuelve el descuento. Sin commit ni despliegue realizado en esta sesión.


## Contrato de condiciones de guardado: CondDUnt (05-10-2026)

La simulación de descuento por posición fue confirmada como funcional por el usuario. En el guardado del documento de referencia `2590000225`, SAP Gateway devolvió HTTP 400: `Property 'CondDUnt' is invalid`. El frontend había copiado todo el objeto de precio heredado en `toConditions`, incluyendo la unidad admitida en `HeaderToItem` pero incompatible con la colección de condiciones. Es un rechazo de propiedades del payload, anterior al cálculo del pedido.

Corrección en `_createOrder`: construir explícitamente la condición heredada con `ItmNumber`, `CondType`, `CondValue`, `Currency` y `CondPUnt`. No incluir `CondDUnt` en `toConditions`; conservarlo en `HeaderToItem`. Se mantienen bases multiplicadas por 10, importe y moneda, y el descuento `ZDMP` en la colección de guardado. No se cambió la simulación.

Validación local: ejecutar el bloque real de construcción de condiciones con los precios 12,2/base 2 y 12,6/base 1, y descuento 3 %. Confirmar bases 20/10, moneda USD, ausencia de `CondDUnt` en la colección y conservación del descuento. Sintaxis y `git diff --check` correctos. Pendiente repetir el guardado en SAP, verificar el pedido resultante y confirmar las condiciones efectivas. No se realizó creación real, commit ni despliegue desde esta sesión.


## Base por operación y origen (05-10-2026, regla vigente)

El usuario precisó que el factor 10 corresponde únicamente a la simulación de un pedido nacido de cotización. Esta regla sustituye las afirmaciones anteriores de este documento que aplicaban el factor también al guardado o a cualquier referencia.

`_getReferenceManualPrice` ahora devuelve siempre la base original de `zzbase`. `onSimulateOrder` multiplica esa base por 10 únicamente al construir el ítem cuando `bPedidoConReferencia` es verdadero y `tipoReferencia === "ZCNA"` (cotización). Para contratos (`ZACN`), otras referencias y ausencia de referencia se conserva la base original. `_createOrder` utiliza directamente la base original tanto en `HeaderToItem` como en `toConditions`. El importe y la unidad no cambian; las bases de precio manual ingresado directamente en el portal conservan su lógica previa.

Ejemplos: precio heredado con base 2 → simulación de cotización 20, simulación de contrato 2, guardado 2. Base 1 → 10, 1 y 1 respectivamente. El descuento sigue por posición en simulación y en `toConditions` al guardar. La unidad continúa en el ítem y no en la colección de condiciones del guardado.

Validación local: bloque real de construcción de ítems ejecutado con cotización, contrato y ausencia de referencia; construcción real de condiciones de guardado con bases 2/1; base original conservada al repetir simulación. Sintaxis Node y `git diff --check` correctos. Pendiente validar ambas operaciones y los importes finales en SAP. Sin commit ni despliegue desde esta sesión.


## Carpetas SharePoint en archivo de configuración (05-10-2026)

La ruta de documentos de químicos se trasladó de BaseController a `webapp/config/sharepoint.properties`, propiedad `documentsFolder`. El valor inicial sigue siendo `Pruebas BTP/Clientes/documentos/quimicos`. BaseController la carga asíncronamente y la reutiliza durante la sesión. Para llevar el cambio a BAS/desplegar, incluir el controlador y el archivo properties. Configuración, pruebas y alcance de las cuatro aplicaciones documentados en [configuracion-sharepoint.md](../../../docs/configuracion-sharepoint.md). No se modificaron destinations.
