# Revisión de filtros sin resultados — 14/10/2026

Se revisaron los controladores de seguimiento, control de stock, estado de cuenta y creación de pedidos Textil, Químico y Cerámico, buscando eliminación de criterios, sustitución por listas completas y respuestas de prueba ante errores.

| Flujo | Hallazgo y comportamiento corregido |
|---|---|
| Seguimiento, las tres unidades | Cliente/documento ausente de la respuesta descartaba el criterio. Se conserva la selección y se devuelve vacío dentro del intervalo. |
| Seguimiento y pedidos Cerámicos | Al cambiar el vendedor se eliminan los clientes que ya no pertenecen a su ámbito y se vacían los resultados anteriores. Esta limpieza explícita es independiente de una búsqueda sin coincidencias, que conserva sus criterios. |
| Listas de clientes de pedidos y estado de cuenta | Texto sin convertir en selección podía ignorarse. Se bloquea la consulta y se vacía la tabla; también se bloquean selecciones sin clave. |
| Seguimiento | Texto pendiente podía descartarse si coexistía con una selección válida. Ahora se bloquea la consulta completa. |
| Agencias de pedidos Químicos, creación y detalle | Por indicación del usuario se conserva el comportamiento original: cuando no hay coincidencias y faltan metadatos Carrier, se muestran todas las agencias. Los cambios de estos dos controladores fueron revertidos. |
| Consultas de clientes de pedidos y estado de cuenta | Se eliminó la sustitución por `JsonReporte()` cuando SAP devuelve error. Se mantiene el estado de error y una lista vacía. |
| Stock, las tres unidades | La búsqueda de materiales sin coincidencias ya devolvía vacío. Se vacían además los resultados anteriores y la cola al iniciar otra búsqueda, incluso si se bloquea o falla. |

Las búsquedas normales de cliente, razón social, vendedor y documento en pedidos y estado de cuenta conservaron sus predicados: las pruebas verifican que un valor inexistente devuelve cero filas y que combinar criterios no amplía resultados. El filtro de estado de seguimiento también conserva una selección sin coincidencias.

Validación ejecutable:

- `node scripts/validate-restrictive-filters.cjs`
- `node aris.com.clientes.seguimiento.pe/webapp/test/tracking-search-filters.cjs`
- Pruebas existentes de seguimiento, stock, estado de cuenta, catálogos de clientes de los tres pedidos y búsqueda de clientes Textil.

La validación se realizó sobre el código local con respuestas simuladas. No se desplegó ni se verificaron las autorizaciones ABAP; esta revisión confirma el comportamiento de los filtros del frontend, no la autorización del servicio SAP.
