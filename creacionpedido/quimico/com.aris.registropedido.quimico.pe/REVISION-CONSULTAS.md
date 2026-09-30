# Reutilización de consultas — pedidos químicos

Punto de partida: repositorio Clientes, commit `8219b9f`, árbol limpio antes de editar.

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
