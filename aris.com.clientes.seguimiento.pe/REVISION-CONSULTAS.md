# Consultas de Seguimiento — 11-10-2026

Customer, DataCustomer, DocumentFlow2 y las demás listas transportadas por ERPGetSync siguen __next hasta completar las páginas. Sin continuación solo se realiza una petición. Se retiran top altos; se conservan límites hasta 200 usados para sugerencias y lecturas puntuales. Las continuaciones conservan la ruta de destino de la petición original y la normalización existente sin __metadata. No se entrega un catálogo parcial ante fallo o ciclo.

TrackingQueryCache pertenece a una instancia de Component, en memoria y sin persistencia. Reutiliza respuestas exitosas y solicitudes pendientes por URL normalizada. Cada consumidor recibe una copia. Los errores se pueden reintentar. Los catálogos completos de OrderTracking y DocumentFlow2 se filtran para un documento únicamente si coinciden entidad, organización e idioma, no hay proyección ni expansión y el documento está presente. En otro caso se consulta SAP.

Las validaciones de acceso y transformaciones de estado siguen ejecutándose en los controladores. Users comparte la respuesta por URL, incluido el correo autenticado. El regreso de Detail a View conserva los datos. Ejecutar una búsqueda manual renueva datos operativos; la búsqueda automática inicial reutiliza la carga. Cambiar organización limpia la caché. Entrar en rutas de modificación/alta limpia la caché y omite la reutilización mientras se edita; salir vuelve a limpiarla para recuperar datos vigentes. Recargar la aplicación crea una nueva instancia.

Las lecturas de MaterialsConsultation con ODataModel de ModPedCeramicos y AddManualProduct también completan páginas mediante Services.readAllOData. La carga de materiales de ModPedTextil ya seguía __next y se conserva. Las simulaciones, escrituras y cálculos no se cachean ni se modifican.

## Archivos para BAS

Nuevo: webapp/services/TrackingQueryCache.js.

Modificados: webapp/Component.js, webapp/controller/BaseController.js, webapp/controller/View.controller.js, webapp/controller/ModPedCeramicos.controller.js, webapp/controller/AddManualProduct.controller.js, webapp/services/Services.js y webapp/util/utilHttp.js.

No desplegar como funcionales: este documento y webapp/test/tracking-queries.cjs.

## Validación

node webapp/test/tracking-queries.cjs comprueba paginación, proxy, errores intermedios, ciclos, copias, solicitudes pendientes, reutilización por documento, separación de organizaciones, identidad y renovación al buscar o editar. Los validadores de identidad, autorización, consultas de clientes y búsqueda textil también pasan.

Reproducción local del HAR aportado: las cinco lecturas de DocumentFlow2/OrderTracking requieren dos transportes, con datos idénticos para los cinco consumidores. Esto no sustituye la validación conectada a SAP.

Pendiente en BAS/SAP: comprobar todas las páginas de DataCustomer, ausencia de duplicación de DocumentFlow2, detalle y regreso, búsqueda manual para renovar estados, entrada directa a detalle, modificación/guardado y posterior regreso al listado, usuarios y organizaciones 1110/1120/1130. No se realizó despliegue ni escritura real en SAP.
