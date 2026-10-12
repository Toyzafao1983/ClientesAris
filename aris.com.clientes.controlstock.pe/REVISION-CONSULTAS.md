# Consultas de Stock — 11-10-2026

## Comportamiento

ERPGetSync y ERPGetAsync completan todas las páginas anunciadas por __next antes de entregar resultados. No dependen de un tamaño de página de 5000: sin continuación se hace una única petición. Se retiran top altos usados como carga completa y se conservan top hasta 200 de sugerencias/consultas puntuales. La validación de materiales pegados por código solicita todas las filas coincidentes sin limitar por cantidad de códigos.

Se conserva la normalización sin __metadata y la ruta local/S4HANA original al seguir una URL absoluta interna de SAP. Un error intermedio o ciclo devuelve error sin presentar las páginas parciales. Las búsquedas de materiales y lotes de stock propagan errores para evitar mostrar listas incompletas como exitosas.

StockQueryCache pertenece a Component, en memoria, sin persistencia. Solo guarda MaterialsConsultation, MarMat y MatGroup, por URL completa normalizada (incluidos filtros, idioma, proyección y límites pequeños). Consumidores simultáneos comparten la petición y reciben copias independientes. Solo se guardan respuestas exitosas y completas; errores permiten reintentar. Cambiar de organización limpia la caché. Recargar la aplicación renueva los catálogos.

Las cantidades de I_StockDisponibleSet, los perfiles/permisos y crédito no se cachean. Cada búsqueda vuelve a solicitar stock. Se conservan lotes de 50/30/10 para textiles/químicos/cerámicos y las reglas de transformación, filtros y cálculos. Completar el catálogo genera más lotes cuando existen más materiales; la primera carga puede tardar más.

## Archivos para BAS

Nuevo: webapp/services/StockQueryCache.js.

Modificados: webapp/Component.js, webapp/services/Services.js, webapp/util/utilHttp.js, webapp/controller/BaseController.js y webapp/controller/View.controller.js.

No necesarios para despliegue: este documento y webapp/test/stock-queries.cjs.

## Validación

node webapp/test/stock-queries.cjs verifica transporte síncrono/asíncrono con más de 5000 filas, proxy, ciclos, errores, sugerencias, reutilización de peticiones pendientes/completas, separación de organizaciones, stock y permisos sin caché, y lotes reales con 5001 materiales en las tres unidades.

Pendiente BAS/SAP: comprobar continuaciones reales de MaterialsConsultation, cantidad total y material del último bloque, búsqueda repetida reutilizando materiales pero renovando stock, distintas combinaciones de filtros, permisos y organizaciones. No se realizó despliegue ni consulta real a SAP durante esta implementación.


## Corrección de tamaño de página y continuaciones (11-10-2026)

Sustituye la retirada de top altos descrita arriba: quitar top provocaba que SAP usara su tamaño predeterminado de 100 en vez de los bloques de 5000 observados. Se conserva el top alto solicitado; si la consulta no tiene top se añade 2147483647 como presupuesto amplio de resultados. SAP sigue determinando el tamaño de cada página. Se conserva el top restante de __next; si SAP lo omite se mantiene un presupuesto alto para evitar volver al predeterminado de 100.

Se rechazan continuaciones con el mismo cursor aunque cambie top o el orden de parámetros, cursores numéricos que retroceden/no avanzan, páginas con contenido repetido aunque cambie el cursor y continuaciones vacías. No se entregan resultados parciales como una búsqueda completa. No hay un límite artificial de cantidad de páginas.

Las pruebas síncronas/asíncronas reproducen el predeterminado de 100 al omitir top, carga de 5000+1, páginas repetidas con distintos cursores y top decreciente con cursor repetido. Pendiente confirmar con una nueva captura del ambiente conectado por qué la ejecución reportada no terminaba.

Para esta corrección adicional solo actualizar webapp/util/utilHttp.js en BAS. También cambian webapp/test/stock-queries.cjs y este documento, sin necesidad de desplegarlos.
