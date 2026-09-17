# Cuestionario de levantamiento de información — Portal de clientes

Documento para entrevistar a una nueva empresa e identificar qué debe conservarse, configurarse o adaptarse de la solución de referencia.

**Origen:** reconstrucción a partir del código del portal disponible en este repositorio. No corresponde a un registro histórico de entrevistas. La existencia de una pantalla o función en el código no acredita su uso en producción. Las preguntas de alcance, operación y puesta en marcha complementan lo observado y deben validarse con la nueva empresa.

**Empresa:** ____________________  **Fecha:** ____________________

**Entrevistados y cargos:** ________________________________________

**Responsable del levantamiento:** ________________________________

**Cómo aplicarlo:** comenzar por los bloques 1 y 2; profundizar después con Comercial, Logística, Créditos y Cobranzas y TI. Aplicar el bloque de particularidades solo a las líneas de negocio pertinentes. Pedir ejemplos reales, preferiblemente anonimizados, de cada regla y excepción. Las opciones mencionadas son ejemplos de la solución de referencia, no requisitos predeterminados para la nueva empresa.

Para cada pregunta registrar: respuesta, ejemplo o evidencia, responsable de validación, prioridad —indispensable, deseable o futura— y pendientes. Un «sí» debe acompañarse de la regla concreta que se implementará.

**1. Objetivo, proceso actual y alcance**

1. ¿Cómo realiza hoy un cliente una compra, desde que consulta disponibilidad hasta que recibe el producto y consulta su deuda? Describan los pasos, responsables y sistemas utilizados.
2. ¿Qué dificultades quieren resolver con el portal? Indiquen frecuencia e impacto: consultas repetitivas, errores al registrar pedidos, demora en cotizar, falta de visibilidad del despacho u otras.
3. ¿Qué operaciones debe poder realizar el cliente por sí mismo en la primera entrega: consultar stock, cotizar, registrar pedidos, hacer seguimiento o consultar su estado de cuenta?
4. ¿Qué empresas, unidades de negocio, países, canales de venta y tipos de cliente estarán incluidos? ¿Cuáles quedarán fuera de la primera etapa?
5. ¿Qué pasos seguirán a cargo del personal interno y qué actividades actuales dejarán de hacerse por correo, teléfono o mensajería?
6. ¿Cómo medirán el resultado? Definan indicadores y metas, por ejemplo tiempo de registro, porcentaje de pedidos por portal o reducción de consultas manuales.

**2. Usuarios, acceso y visibilidad**

7. ¿Quiénes utilizarán el portal y para qué: compradores del cliente, vendedores, coordinadores, supervisores u otros perfiles?
8. ¿Qué módulos, datos y acciones debe tener habilitados cada perfil? Completen una matriz de consulta, creación, modificación y descarga.
9. ¿Un usuario externo representará a una sola razón social o a varias? ¿Una misma empresa cliente tendrá varios usuarios o sucursales con permisos distintos?
10. ¿Cómo se asignan los clientes a los vendedores y supervisores? ¿La asignación cambia por unidad de negocio, territorio o canal?
11. ¿Qué información comercial o financiera debe ocultarse al cliente o restringirse entre usuarios internos? Consideren stock, precios, descuentos, crédito y cartera de clientes.
12. ¿Quién autoriza el alta, cambio y baja de usuarios? ¿Cómo se vinculará cada usuario con su código de cliente o vendedor y qué ocurrirá si esa vinculación falta o es incorrecta?

**3. Datos de clientes y organización comercial**

13. ¿En qué sistema se mantienen la razón social, identificación fiscal, dirección, contactos y condiciones comerciales? ¿Quién es responsable de su calidad?
14. ¿Qué datos del cliente deben mostrarse y cuáles podrán modificarse desde el portal? ¿Los cambios requieren revisión antes de actualizar el sistema principal?
15. ¿Cómo se relacionan el comprador, destinatario de mercancía, receptor de factura y pagador? ¿Pueden ser entidades distintas?
16. ¿Qué organizaciones de ventas, canales y grupos de clientes determinan los productos y condiciones disponibles para cada usuario?
17. ¿Existen vendedor principal y vendedor de apoyo? ¿Se asignan automáticamente o se pueden seleccionar al registrar el documento?

**4. Catálogo y consulta de stock**

18. ¿Qué productos podrá consultar cada cliente? ¿Hay restricciones por línea de negocio, contrato, canal, región o condición comercial?
19. ¿Cómo necesita buscar los productos: código, descripción, marca, grupo, formato, calidad u otros atributos? ¿Cuáles son indispensables?
20. ¿Qué significa para ustedes stock físico, disponible, reservado, contratado y pendiente de despacho? Definan la fórmula de disponibilidad y un ejemplo numérico.
21. ¿El stock se consultará por empresa, centro, almacén, lote o pieza? ¿Qué ubicaciones y existencias deben excluirse?
22. ¿Qué cantidad debe ver el cliente: el valor exacto, un rango o solo una indicación de disponibilidad? ¿Debe ver el mismo detalle que un vendedor?
23. ¿Qué unidades de medida se usan para consultar, vender y despachar? ¿Qué conversiones, mínimos, múltiplos y redondeos se aplican?
24. ¿En qué momento se reserva el stock y cuándo se libera? ¿Qué debe pasar si dos usuarios solicitan simultáneamente la última cantidad disponible?
25. ¿Se permite pedir más de lo disponible? Si se permite, ¿se registra un pendiente, una fecha futura o una solicitud sujeta a aprobación?
26. ¿Con qué frecuencia debe actualizarse la disponibilidad? ¿Se requieren imágenes, consulta del detalle de reservas o exportación a Excel, y para qué perfiles?

**5. Creación de pedidos y documentos comerciales**

27. ¿Qué documentos necesitan gestionar: cotización, pedido nacional, exportación, separación, contrato o transferencia gratuita? ¿Quién puede crear cada uno?
28. ¿Qué campos son obligatorios para cada tipo de documento? Entreguen un ejemplo completo de cada caso y sus valores predeterminados.
29. ¿Se deben crear pedidos a partir de una cotización, separación, contrato u otro documento? ¿Qué información se copia y cómo se controla el saldo ya utilizado?
30. ¿Se exige número de orden de compra, fecha de vencimiento o archivo adjunto? ¿Cómo se controlan los duplicados y qué formatos y tamaños se admiten?
31. ¿Cómo se incorporarán productos al pedido: búsqueda y selección, ingreso de códigos o carga de un archivo? Para carga masiva, faciliten una plantilla y las reglas de rechazo por fila.
32. ¿Se permite mezclar grupos de materiales, almacenes, monedas o condiciones de entrega en un mismo pedido? ¿Cuándo debe dividirse en varios documentos?
33. ¿Qué datos se deben indicar por producto: cantidad, unidad, lote, pieza, precio, descuento, embalaje o fecha requerida? ¿Cuáles se calculan y cuáles puede editar cada perfil?
34. ¿Qué validaciones deben ejecutarse antes de enviar el pedido? Para cada error, indiquen si debe bloquear, advertir o permitir continuar con aprobación.
35. ¿El usuario debe revisar un cálculo preliminar de importes y disponibilidad antes de confirmar? ¿Qué cambios obligan a recalcularlo?
36. ¿Cuándo se considera registrado el pedido y qué confirmación debe recibir el usuario? ¿Qué debe ocurrir si el sistema tarda, falla o el usuario vuelve a presionar «Guardar»?

**6. Precios, impuestos, crédito y aprobaciones**

37. ¿Cómo se determina el precio: por cliente, lista, segmento, contrato, cantidad o fecha? ¿Cuál es la fuente oficial y qué regla tiene prioridad?
38. ¿Qué monedas se utilizarán? ¿De dónde procede el tipo de cambio y qué fecha determina el valor aplicado?
39. ¿Los precios incluyen impuestos? ¿Qué impuestos, exoneraciones y reglas de redondeo corresponden según producto, operación y destino?
40. ¿Qué descuentos, bonificaciones o promociones necesitan? ¿Cuáles se pueden combinar y quién puede modificarlos o autorizar excepciones?
41. ¿Cómo se calculan flete, embalaje y otros cargos? ¿Se aplican al documento o a sus posiciones y cómo afectan el total e impuestos?
42. ¿Qué condiciones de pago están disponibles para cada cliente? ¿Puede seleccionarlas el comprador o vienen determinadas por el sistema?
43. ¿Cómo se calculan crédito asignado, consumo y saldo disponible? ¿Se consideran pedidos abiertos, deuda vencida, anticipos y notas de crédito?
44. ¿Qué debe ocurrir ante crédito insuficiente, deuda vencida o bloqueo comercial: impedir el pedido, advertir o enviarlo a aprobación?
45. ¿Qué operaciones requieren aprobación y por quién? Definan montos, descuentos, excepciones, reemplazos y plazos, indicando si se resuelven en el portal o en otro sistema.

**7. Entrega y logística**

46. ¿Qué modalidades de entrega manejan: recojo del cliente, despacho directo, agencia, courier u otras? ¿Qué datos exige cada modalidad?
47. ¿De dónde se obtienen las direcciones de entrega? ¿Se permiten direcciones nuevas, una agencia intermedia y un destino final diferente?
48. ¿Cómo se seleccionan transportista y agencia? ¿Qué datos deben registrarse y quién mantiene esa información?
49. ¿Cómo se propone y confirma la fecha de entrega? ¿Existen horarios de corte, días no laborables, restricciones por zona o fechas por producto?
50. ¿Se admiten despachos parciales? ¿Cómo deben mostrarse cantidades pedidas, despachadas y pendientes, así como pesos, bultos, cajas o pallets?
51. ¿Qué instrucciones de entrega y documentos deben acompañar el despacho? Si realizan exportaciones, ¿qué datos adicionales exigen sobre embarque, puertos y destinos?

**8. Seguimiento y cambios del pedido**

52. ¿Qué estados debe ver el usuario desde el registro hasta el cierre? Para cada estado, indiquen su significado, evento de cambio y sistema que lo determina.
53. ¿El estado debe mostrarse por pedido, por producto o por ambos? ¿Cómo se resume un documento con posiciones en estados diferentes?
54. ¿Cómo necesitan buscar pedidos: fechas, cliente, vendedor, tipo de documento, número o estado? ¿Cuánto histórico estará disponible?
55. ¿Qué relación debe verse entre pedido, documento de referencia, despachos, guías y facturas? ¿Qué datos y archivos podrá descargar cada perfil?
56. ¿Qué se puede modificar, cancelar o rechazar y hasta qué estado? ¿Cómo afecta a reservas, precios, crédito y aprobaciones previas?
57. ¿Necesitan avisos por registro, aprobación, rechazo, despacho o facturación? Definan destinatarios, canal y contenido; confirmar esta necesidad como alcance adicional cuando corresponda.

**9. Estado de cuenta y cobranzas**

58. ¿Qué documentos y saldos integran el estado de cuenta? Definan si muestra solo pendientes o también documentos cancelados e históricos.
59. ¿Qué información debe presentar cada documento: número, estado, emisión, vencimiento, moneda, importe, condición de pago, banco, número único o renovación?
60. ¿Cómo se representarán los pagos parciales, anticipos, notas de crédito y documentos vencidos? ¿Cómo se separarán los totales por moneda?
61. ¿Qué clientes puede consultar cada usuario y qué filtros necesita? ¿Se requiere consolidar varias razones sociales o mantenerlas separadas?
62. ¿Existen pallets, envases u otros productos en préstamo o sujetos a devolución? ¿Cómo deben mostrarse cantidades, importes y saldos?
63. ¿Se requiere descargar el estado de cuenta en PDF u otro formato? ¿Qué contenido, fecha de corte e identificación de la empresa debe incluir?

**10. Particularidades de las líneas de negocio — aplicar solo si corresponde**

64. Para productos cerámicos o equivalentes, ¿qué atributos distinguen la disponibilidad: formato, estilo, calidad, tono y calibre? ¿Cuáles deben mantenerse iguales en una entrega?
65. Para cerámicos, ¿cómo se convierten metros cuadrados, cajas y pallets? ¿Se venden cajas o pallets incompletos y cómo se distinguen completos y saldos?
66. Para textiles o productos vendidos por longitud, ¿se debe seleccionar una pieza o rollo concreto? ¿Qué reglas existen para corte, metraje mínimo, remanentes y calidad?
67. Para textiles, ¿cómo se gestionan artículo, orillo, contratos y separaciones? ¿Se requiere consultar su vigencia, cantidades pendientes y antigüedad?
68. Para químicos o productos por lote, ¿debe seleccionarse el lote al pedir o se asigna al despachar? ¿Qué presentaciones y conversiones entre peso, volumen y envases se utilizan?
69. ¿Qué requisitos propios de sus productos faltan en los ejemplos anteriores, como vencimientos, certificados, fichas técnicas o restricciones de transporte? Identifiquen los que exigirían ampliar la solución de referencia.

**11. Integraciones, seguridad y operación — sesión con TI y responsables del proceso**

70. ¿Qué ERP y otros sistemas participan, en qué versiones y modalidades de despliegue? Si utilizan SAP, ¿qué componentes y servicios de integración tienen disponibles?
71. Para clientes, productos, stock, precios, crédito, pedidos, despachos y facturas, ¿cuál es el sistema maestro, qué interfaces existen y quién las mantiene?
72. ¿Qué operaciones necesitan respuesta inmediata y cuáles admiten demora? ¿Qué información se mostrará cuando una integración esté caída o desactualizada?
73. ¿Dónde se almacenan los adjuntos y documentos descargables? ¿Cómo se recuperan y se comprueba que el usuario tiene permiso para verlos?
74. ¿Qué servicio de identidad utilizarán? ¿Qué reglas requieren para inicio de sesión, recuperación de acceso, segundo factor y vencimiento de sesión?
75. ¿Qué acciones deben quedar registradas para auditoría, con qué datos y por cuánto tiempo? ¿Qué políticas internas de acceso y conservación debe cumplir el portal?
76. ¿Cuántos clientes, usuarios simultáneos, productos y pedidos diarios se esperan, incluyendo campañas? ¿Qué tiempos máximos de respuesta y horarios de disponibilidad necesitan?
77. ¿Desde qué dispositivos, navegadores e idiomas se utilizará el portal? ¿Qué requisitos de accesibilidad, identidad visual y asistencia al usuario deben contemplarse?

**12. Validación, despliegue y cierre del alcance**

78. ¿Quién validará cada proceso y qué escenarios demostrarán su aceptación? Incluyan pedido normal, falta de stock, crédito insuficiente, despacho parcial y error de integración.
79. ¿Qué datos, usuarios y ambientes se necesitan para las pruebas y el piloto? ¿Qué historia o documentos anteriores deben estar disponibles al iniciar?
80. ¿Qué fecha y dependencias condicionan la salida, quién aprueba el alcance y quién asumirá capacitación, soporte y mantenimiento? Acuerden qué es indispensable para iniciar y qué pasa a una fase posterior.

**Material que debe solicitarse durante el levantamiento**

- Flujo actual de venta y atención, con responsables y excepciones.
- Matriz de perfiles, permisos y relación entre usuarios, clientes y vendedores.
- Ejemplos anonimizados de cotización, pedido, orden de compra, guía, factura y estado de cuenta.
- Catálogo de productos, atributos, unidades y tablas de conversión.
- Definiciones de stock y casos numéricos de disponibilidad y reserva.
- Casos de cálculo de precios, impuestos, descuentos, flete y crédito.
- Catálogos de estados, condiciones de pago, entrega y motivos de rechazo.
- Inventario de interfaces, responsables técnicos y disponibilidad de ambientes de prueba.

**Registro de respuestas y acuerdos — repetir por pregunta o decisión**

| Campo | Registro |
| --- | --- |
| Pregunta / identificador | |
| Respuesta y proceso actual | |
| Comportamiento esperado | |
| Regla, excepción y ejemplo | |
| Documento o evidencia | |
| Perfil y unidad de negocio afectados | |
| Prioridad / fase | |
| Responsable de validar | |
| Pendiente y fecha de resolución | |
| Clasificación tras análisis: reutilizar / configurar / adaptar / nuevo / fuera de alcance | |
| Criterio de aceptación | |

**Cierre de cada entrevista:** leer los acuerdos al entrevistado, confirmar excepciones y asignar responsable y fecha a cada pendiente. Una respuesta aún no validada debe mantenerse como pendiente, sin convertirla en requisito aprobado.

**Trazabilidad para el equipo implementador**

Esta sección explica la base del cuestionario; puede omitirse al compartirlo con el cliente. Las referencias corresponden al código revisado y no certifican la operación de los servicios externos.

| Evidencia de la solución de referencia | Preguntas relacionadas | Fuentes del repositorio |
| --- | --- | --- |
| Perfiles de cliente, vendedor y coordinador; asignaciones comerciales | 7–17 | `creacionpedido/ceramico/com.aris.registropedido.ceramicos.pe/webapp/controller/Detail.controller.js`, `aris.com.clientes.seguimiento.pe/webapp/controller/View.controller.js` |
| Consulta diferenciada de stock para cerámicos, textiles y químicos | 18–26, 64–69 | `aris.com.clientes.controlstock.pe/webapp/view/fragments/`, `aris.com.clientes.controlstock.pe/webapp/i18n/i18n_esp.properties` |
| Datos comerciales, referencia, orden de compra, adjuntos y modalidades de entrega | 27–36, 46–51 | `creacionpedido/textil/com.aris.registropedido.textiles.pe/webapp/view/FormClient.view.xml` |
| Simulación de importes mediante SAP, impuestos, descuentos, anticipos y notas de crédito | 35–44 | `creacionpedido/ceramico/com.aris.registropedido.ceramicos.pe/webapp/controller/Detail.controller.js` |
| Seguimiento, estados, detalle de posiciones, despachos, guías y facturas | 52–56 | `aris.com.clientes.seguimiento.pe/webapp/controller/View.controller.js`, `aris.com.clientes.seguimiento.pe/webapp/i18n/i18n_esp.properties` |
| Estado de cuenta, descarga PDF y sección de productos en préstamo | 58–63 | `com.aris.consultaestadocuenta.pe/webapp/view/Detail.view.xml`, `com.aris.consultaestadocuenta.pe/webapp/i18n/i18n_esp.properties` |
| Consumo de servicios ERP y referencias a identidad IAS | 70–74 | `aris.com.clientes.controlstock.pe/webapp/services/Services.js`, `com.aris.consultaestadocuenta.pe/webapp/services/Services.js`, `aris.com.clientes.seguimiento.pe/webapp/constantes.js` |

Los bloques de objetivos, aprobaciones, notificaciones, seguridad, capacidad y puesta en marcha incluyen preguntas necesarias para definir la nueva implementación. No implican que todas esas capacidades estén implementadas en el portal actual. La carga masiva y otras formas de ingreso deben confirmarse por módulo; no se consideran disponibles únicamente por aparecer en textos de interfaz.
