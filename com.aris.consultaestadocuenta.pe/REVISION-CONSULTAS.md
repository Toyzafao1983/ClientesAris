# Consultas de Estado de Cuenta — 11-10-2026

## Cambios

Customer y DataCustomer dejan de solicitar top=3000. ERPGetSync y ERPGetAsync completan las páginas anunciadas por __next antes de entregar una lista. Las continuaciones preservan la ruta local/S4HANA y la normalización sin __metadata. Sin continuación solo hay una petición. Errores intermedios y ciclos devuelven error sin entregar filas parciales.

AccountQueryCache guarda únicamente Customer, DataCustomer y UsOrve en memoria por instancia de Component. Cada URL normalizada conserva filtros, idioma y proyección. Los clientes puntuales pueden obtenerse del catálogo completo únicamente si la consulta base coincide y existe el cliente. Los consumidores reciben copias; solicitudes simultáneas se comparten y los errores permiten reintentar. Users se comparte por URL de correo autenticado y las validaciones de acceso siguen ejecutándose. Cambiar unidad limpia la caché; recargar crea una instancia nueva.

Los saldos eEstadoCuentaSet, direcciones, productos prestados y PDF no se guardan en la caché general. Cada apertura desde Main inicia consultas financieras nuevas mediante los métodos existentes de BaseController. Se utiliza el filtro de fecha local a medianoche que ya determinaba el resultado final en Detail. Se elimina la lectura previa con hora convertida a UTC, evitando dos filtros de fecha para un mismo recorrido.

Main entrega sus respuestas a Detail mediante una transferencia en memoria de un solo uso, identificada por cliente, unidad y fecha. Detail consume respuestas exitosas y consulta lo que falte; si se entra directamente o cambia la fecha, consulta SAP. El regreso limpia la transferencia. La proyección PDF sigue siendo una consulta independiente bajo demanda.

Se conservan transformaciones de filas, permisos, presentación y cálculos. El 404 observado en ZC_CLIENTES y su respaldo existente no fueron modificados. Los helpers anteriores de ODataModel para dirección/productos permanecen en el archivo, pero el recorrido Main->Detail usa los métodos de BaseController con paginación.

## Archivos para BAS

Nuevo: webapp/services/AccountQueryCache.js.

Modificados: webapp/Component.js, webapp/controller/BaseController.js, webapp/controller/Main.controller.js, webapp/controller/Detail.controller.js, webapp/services/Services.js y webapp/util/utilHttp.js.

No necesarios para despliegue: este documento y webapp/test/account-queries.cjs.

## Validación

node webapp/test/account-queries.cjs comprueba transporte síncrono/asíncrono, páginas, ciclos, errores, catálogos, copias, identidad, las tres unidades, Main->Detail sin duplicación, renovación al reabrir, entrada directa y separación por fecha/cliente. Comprueba también el método real de estado de cuenta, filtro a medianoche y proyecciones de listado/PDF en rutas local/S4HANA. Los validadores de identidad, autorización y consultas de clientes pasan.

Pendiente BAS/SAP: clientes internos/externos, las tres unidades, páginas reales si SAP las anuncia, apertura repetida para verificar saldos renovados, entrada directa, regreso, dirección/productos prestados y descarga PDF. Revisar que fecha, importes, vencimientos y totales coincidan con SAP. No se realizó despliegue ni escritura real en SAP.
