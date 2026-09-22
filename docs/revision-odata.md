# Revisión de volumen OData — 22/09/2026

Alcance: revisión estática de los seis proyectos. No se ha conectado a SAP ni medido respuestas reales; los tamaños indicados son límites solicitados por el código, no conteos observados.

## Causa confirmada y corregida

En los tres proyectos de `creacionpedido`, los formularios y detalles llaman a `_getClientPet(sCustomer)`, pero su implementación no declaraba ni utilizaba el argumento. `_getDatClient(sCustomer)` sí lo declaraba, pero tampoco lo incorporaba en la URL. Las consultas solicitaban hasta 10000 registros por organización y después los consumidores seleccionaban el cliente con `find` o `filter`.

Se agregó `and Customer eq '…'` a ambas funciones en textiles, químicos y cerámicos, conservando los criterios comerciales existentes. Se escapan apóstrofos y se codifica el filtro. Aplica tanto a la ruta local como a `/S4HANA`.

Se corrigieron también las llamadas de `FilterSelling` de cerámicos: pasaban `tUniNeg` como argumento antes ignorado; ese selector requiere el catálogo, no interpretar la unidad de negocio como un Customer.

Las llamadas sin cliente conservan el catálogo. Esta corrección resuelve las consultas puntuales; no elimina todas las descargas amplias descritas a continuación.

## Hallazgos pendientes por proyecto

| Proyecto | Evidencia | Motivo de la descarga amplia y cambio requerido |
| --- | --- | --- |
| Registro textil | `Main.controller.js`, `handleRouteMatched` y ayudas de filtros; `BaseController.js`, `_getClientPet`, `_getDatClient` | La carga inicial y las ayudas llaman sin cliente. Se cargan catálogos antes de resolver el perfil IAS. Resolver identidad/ámbito primero y consultar por cliente o cartera; las ayudas requieren búsqueda remota paginada. |
| Registro químico | `Main.controller.js`, carga inicial, búsqueda y ayudas | Mismo patrón: se repiten consultas de catálogos sin cliente y se filtran modelos locales. Corregidas las llamadas que ya envían un cliente; la búsqueda global requiere trasladar criterios a OData. |
| Registro cerámico | `Main.controller.js`, carga inicial, `FilterSelling` y filtros de cartera | Se descargan Customer/DataCustomer para combinar clientes y vendedores en memoria. Consultar cartera por vendedor y trasladar las búsquedas al servidor, manteniendo los permisos y combinaciones de filtros existentes. |
| Seguimiento | `View.controller.js:74`; `BaseController.js`, `_getDatClient`, `_getCliente`, `_getClientPet`, `_getMaterialStock` | La entrada descarga catálogos por organización. `_getMaterialStock` solicita hasta 900000000 registros y construye listas únicas en memoria. Las firmas de clientes reciben organización, no Customer: no aplicarles el cambio de registro sin adaptar consumidores. |
| Control de stock | `View.controller.js`, `_loadAllMateriales`, `_loadAllDescMaterial`, `_loadAllOrillo`, `_loadAllFormat`, `_loadAllQuality` | Las lupas cargan conjuntos completos por organización; materiales solicita `$top=900000000`. Ya existen consultas de sugerencias con `startswith`: las lupas deben usar búsqueda remota y paginación coherentes con ellas. |
| Estado de cuenta | `Main.controller.js`, `_getClient(tUniNeg, sCustomer)`, `_getDatClient(tUniNeg, sCustomer, sKunn2)` y sus llamadas iniciales | Las funciones ya permiten Customer y vendedor, pero las cargas iniciales y de ayudas solo envían unidad de negocio. El filtro existe, pero esos consumidores no lo utilizan. Resolver el ámbito antes de cargar y pasar los argumentos correspondientes. |

Caso particular: en `FormClient.controller.js` de textiles, `values[14]` usa DataCustomer completo para construir todas las opciones de vendedor (`kunn2`, `Seller`). Filtrarlo por el cliente actual eliminaría opciones del selector. Conviene sustituir esa carga por un catálogo específico de vendedores o una consulta acotada con los campos requeridos, tras validar el contrato del servicio.

## Validación

- `node scripts/validate-customer-odata.cjs`: 48 casos sobre las seis funciones reales con transporte simulado. Comprueba filtro por Customer, conservación de consultas sin Customer, ceros iniciales, apóstrofos/caracteres especiales, rutas local/desplegada y propagación de resultados.
- `node --check` en los cuatro controladores modificados: correcto.
- `git diff --check`: correcto.
- Pendiente de validación integrada: comprobar en Network que SAP recibe y aplica `$filter`, que devuelve exclusivamente el cliente solicitado y que se conservan formularios, detalles y selectores. No se ha verificado metadata ni soporte efectivo del backend en este entorno.

No reducir arbitrariamente `$top`: sin paginación puede dejar listas incompletas. Prioridad siguiente: resolver ámbito de usuario antes de consultar, enviar criterios de búsqueda al servidor y seguir la paginación del servicio. Los filtros del frontend tampoco sustituyen autorización en SAP.
