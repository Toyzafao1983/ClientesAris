# DOCUMENTACIÓN TÉCNICA — PORTAL DE CLIENTES
Versión: 1.0 — Borrador para revisión técnica
Fecha de revisión: 29/10/2026. Código documental: PORTALES-XXX-XXX, pendiente de asignación.
Alcance: seis aplicaciones locales: control de stock, seguimiento, estado de cuenta y registro de pedidos de cerámicos, químicos y textiles. Se documenta lo observable en los archivos y las verificaciones locales. La operación en ambientes externos y la aceptación del negocio requieren evidencia adicional.
## 1. Arquitectura de la Solución
El portal contiene aplicaciones SAPUI5/Fiori con vistas XML, controladores JavaScript y modelos de interfaz. Los descriptores MTA declaran publicación en HTML5 Application Repository y recursos de Destination y XSUAA. No se identifican servicios CAP implementados dentro de los seis proyectos; los servicios SAP y el backend Java referenciados son dependencias externas cuyo código y operación no se certifican aquí.
Diagrama lógico de interacción, reconstruido desde mta.yaml y xs-app.json:
Usuario → Launchpad / runtime HTML5 → aplicaciones SAPUI5
Aplicaciones → rutas xs-app.json → Destination Service
Destination IdentityProviderDestination → proveedor de identidad IAS
Destination S4H_DEV_110_CLIENTE → servicios SAP / OData
Destination SharePointAris → archivos de materiales y adjuntos
Destination BACKEND-ARI-JAVA-21 → backend externo en seguimiento y estado de cuenta
XSUAA → autenticación de las rutas declaradas con xsuaa
HTML5 Application Repository ← contenido generado por los módulos MTA
El diagrama representa dependencias declaradas; no acredita conectividad ni configuración efectiva del tenant. Las rutas hacia SAP, SharePoint y backend Java contienen authenticationType: none; la autenticación de cada destination y la autorización del servicio remoto deben verificarse en BTP y en el backend.
## 2. Componentes y Artefactos
Control de stock: aris.com.clientes.controlstock.pe. Controladores View, Detail y BaseController; consultas de disponibilidad, selección de atributos y acceso a archivos de materiales. Servicio auxiliar StockQueryCache.js.
Seguimiento: aris.com.clientes.seguimiento.pe. View, Detail, ModPedTextil, ModPedCeramicos y AddManualProduct; consulta de documentos y funciones de modificación según el flujo implementado. Servicio auxiliar TrackingQueryCache.js.
Estado de cuenta: com.aris.consultaestadocuenta.pe. Main, Detail y BaseController; consulta de documentos financieros, detalle y funciones de descarga observadas en el código.
Pedidos cerámicos: creacionpedido/ceramico/com.aris.registropedido.ceramicos.pe. Main, FormClient, Detail, BaseController y AddManualProduct; captura de datos comerciales, selección de productos y registro.
Pedidos químicos: creacionpedido/quimico/com.aris.registropedido.quimico.pe. Main, FormClient, Detail y BaseController; flujo comercial específico de químicos.
Pedidos textiles: creacionpedido/textil/com.aris.registropedido.textiles.pe. Main, FormClient, Detail y BaseController; flujo comercial específico de textiles.
Artefactos comunes: webapp/Component.js, manifest.json, view/, controller/, services/, util/, model/, estructuras/, i18n/, constantes.js; package.json, mta.yaml, xs-app.json, xs-security.json y archivos de construcción UI5. Los tres registros incorporan CustomerQueryCache.js.
No se acreditan jobs programados ni servicios CAP propios. Los seis xs-security.json revisados contienen scopes y role-templates vacíos; no equivalen a una matriz de permisos del negocio.
## 3. Lógica de Proceso
Flujo común: iniciar la aplicación, obtener contexto de usuario e identidad, resolver ámbito comercial, cargar catálogos y mostrar filtros; consultar SAP mediante los wrappers de servicios y transporte HTTP; presentar datos o errores en los modelos de UI5. La secuencia efectiva debe verificarse por módulo antes de dar por aprobado el aislamiento de datos.
Stock: seleccionar unidad de negocio y criterios del material, consultar disponibilidad y visualizar detalle. Las operaciones de archivos utilizan la carpeta parametrizada de materiales en SharePoint.
Pedidos: buscar o seleccionar cliente y contexto comercial, completar cabecera y condiciones de entrega, seleccionar posiciones, validar y ejecutar las operaciones SAP previstas por cada controlador. Los adjuntos se envían a la carpeta de la línea de negocio. Simulación, creación y modificaciones deben probarse con documentos reales de prueba y casos de error.
Seguimiento: aplicar filtros de documentos y ámbito comercial, consultar resultados y abrir detalles. Los controladores específicos contienen acciones de modificación cuya autorización y restricciones de estado requieren aceptación integrada.
Estado de cuenta: elegir ámbito y cliente, consultar documentos y saldos, revisar detalle y descargar la salida prevista. La conciliación con SAP debe validarse con casos conocidos, incluyendo monedas y documentos vencidos.
Fragmento real de Services.js de stock que muestra la delegación de consulta y uso opcional de caché:
    const owner = context.getOwnerComponent();
    const load = done => utilHttp.ERPGetAsync(url, done);
    if (owner.getStockQuery) return owner.getStockQuery(url, context.sSalesOrg, load, callback);
    return load(callback);
La existencia de caché exige comprobar claves por ámbito, invalidación y respuesta a errores. Los scripts locales validan escenarios puntuales; no prueban concurrencia ni aislamiento en el servidor.
## 4. Parámetros y Constantes
Destinations declarados: IdentityProviderDestination, S4H_DEV_110_CLIENTE, SharePointAris, BACKEND-ARI-JAVA-21 y ui5. Su uso varía por aplicación; revisar el xs-app.json de cada módulo antes de transportar.
Carpetas SharePoint en webapp/config/sharepoint.properties: stock usa materialsFolder=Pruebas BTP/Clientes/materiales; químicos usa documentsFolder=Pruebas BTP/Clientes/documentos/quimicos; cerámicos usa documentsFolder=Pruebas BTP/Clientes/documentos/ceramicos; textiles usa documentsFolder=Pruebas BTP/Clientes/documentos/textil.
Las carpetas se leen mediante _getSharePointFolder y ResourceBundle. Cambiar el archivo requiere incluirlo en la construcción y recargar la aplicación; no crea ni mueve carpetas. Las rutas deben ser relativas a la biblioteca, sin segmentos vacíos, punto ni doble punto. No introducir credenciales en estos archivos.
constantes.js y las funciones de BaseController contienen referencias utilizadas por cada módulo. No se certifican valores de variables de entorno, credenciales, URLs privadas ni bindings efectivos de BTP; deben ser suministrados o verificados por el responsable del ambiente.
## 5. Código Fuente y Repositorio
Ubicación revisada: carpeta Clientes del proyecto ARIS. El inventario del apartado 2 identifica las raíces de los seis proyectos. La URL remota, rama de entrega, commit aprobado y estrategia de versionado quedan pendientes de confirmación; no se establece un origen remoto a partir del nombre de la carpeta.
Convenciones observadas: módulos sap.ui.define, controladores terminados en .controller.js, vistas .view.xml, fragmentos XML, recursos properties y descriptores JSON/YAML. Services.js concentra parte de las llamadas; utilHttp.js implementa transporte y BaseController concentra utilidades compartidas por aplicación.
Fuentes complementarias: docs/revision-odata.md, docs/revision-filtros-sin-resultados.md, docs/configuracion-sharepoint.md y Cuestionario_levantamiento_portal_clientes.md. Las revisiones anteriores son antecedentes fechados; sus hallazgos no se presentan automáticamente como defectos vigentes. El cuestionario reconstruye preguntas de levantamiento y no representa acuerdos aprobados por el negocio.
## 6. Configuraciones Clave
mta.yaml declara módulos HTML5 y de contenido, recursos destination, xsuaa y html5-apps-repo, con despliegue html5-repo. En stock se observa HTML5Runtime_enabled y una destination ui5 dirigida a https://ui5.sap.com; verificar los valores por proyecto al desplegar.
xs-app.json define las rutas hacia identidad, SAP, archivos, backend Java y contenido HTML5. manifest.json define namespace, navegación, modelos, bibliotecas y requisitos UI5. En stock la versión mínima declarada de SAPUI5 es 1.139.0; no extrapolar ese requisito a todos los módulos sin revisar sus manifests.
Las definiciones del repositorio no prueban bindings activos ni permisos del tenant. Pendiente: inventario DEV/QAS/PRD con subaccount, organización, espacio, destinations, autenticación, certificados y responsables, evitando incluir secretos en este reporte.
## 7. Pruebas y Evidencias
Se ejecutan los validadores locales existentes en scripts/validate-*.cjs y docs/tests/sharepoint-config.cjs. El archivo adjunto validacion-local.json registra comando identificado por ruta, código de salida y salida completa de cada ejecución. La tabla siguiente corresponde a esta revisión y no a ejecuciones históricas.
docs/tests/sharepoint-config.cjs: CORRECTO (salida 0).
scripts/validate-authenticated-user.cjs: CORRECTO (salida 0).
scripts/validate-ceramic-search-quantities.cjs: CORRECTO (salida 0).
scripts/validate-chemical-freight.cjs: FALLÓ (salida 1).
scripts/validate-customer-odata.cjs: CORRECTO (salida 0).
scripts/validate-ias-priority.cjs: CORRECTO (salida 0).
scripts/validate-order-access.cjs: CORRECTO (salida 0).
scripts/validate-order-pagination.cjs: CORRECTO (salida 0).
scripts/validate-pagination-top.cjs: CORRECTO (salida 0).
scripts/validate-restrictive-filters.cjs: CORRECTO (salida 0).
scripts/validate-single-entity-queries.cjs: CORRECTO (salida 0).
scripts/validate-textile-customer-search.cjs: CORRECTO (salida 0).
Resultado global: 11 validadores correctos de 12 ejecutados. validate-chemical-freight.cjs falla en la línea 14 al localizar un bloque mediante coincidencia literal de texto (requestBegin/requestEnd). La prueba se interrumpe antes de evaluar los escenarios de flete; esto no demuestra por sí solo un defecto de cálculo. Pendiente revisar la correspondencia del validador con el controlador y volver a comprobar el comportamiento del flete.
Las verificaciones utilizan código local y transportes o dependencias simulados según cada script. Un resultado correcto no acredita acceso real a SAP, IAS, SharePoint o BTP, ni reemplaza pruebas de aceptación.
Pendiente de evidencia integrada: inicio de sesión por perfil; aislamiento por cliente, vendedor y unidad de negocio; búsqueda sin coincidencias; paginación y volúmenes grandes; registro y consulta de pedidos; crédito y validaciones comerciales; recuperación ante errores; adjuntos; conciliación del estado de cuenta; modificación según estado; descarga de documentos. Registrar datos de prueba, resultado esperado y obtenido, fecha, ambiente y responsable, con capturas y logs anonimizados.
No se adjuntan capturas de producción, logs de SAP ni resultados de pruebas integradas porque no fueron obtenidos en esta revisión.
## 8. Despliegue y Transporte
Procedimiento propuesto para el operador, basado en scripts y descriptores del proyecto: confirmar ambiente y dependencias; instalar las dependencias declaradas desde la raíz de cada aplicación; ejecutar npm run build:mta; revisar el archivo generado en mta_archives y desplegar el MTAR aprobado mediante la herramienta de transporte definida por el equipo. El script de stock build:mta ejecuta rimraf resources mta_archives && mbt build; el descriptor invoca npm install y npm run build:cf.
En stock existe npm run deploy que invoca fiori cfDeploy. Confirmar el procedimiento soportado por cada aplicación y las versiones de herramientas antes de usarlo en otro ambiente. No se ejecutaron instalación, compilación, transporte ni despliegue en esta revisión.
Verificar inclusión de config/sharepoint.properties en las cuatro aplicaciones que lo usan, destinations de destino, servicios vinculados, publicación en Launchpad y acceso por perfil. Conservar el artefacto anterior aprobado y el procedimiento de reversión del ambiente. No ejecutar undeploy como parte de un transporte normal: el script disponible en stock incluye eliminación de servicios.
Pendiente: ruta de transporte aprobada, herramientas y versiones, identificadores de paquetes, responsables, ventana y evidencia de prueba posterior al despliegue.
## 9. Seguridad y Autenticación
Los seis xs-security.json declaran tenant-mode: dedicated, scopes: [] y role-templates: []. Las rutas de identidad y contenido HTML5 usan xsuaa; varias integraciones tienen authenticationType: none y csrfProtection: false. Estas declaraciones exigen revisar la protección efectiva de cada ruta y destination, sin concluir que el backend es accesible anónimamente desde Internet solo por ese valor.
La lógica de perfiles y filtros del frontend no sustituye la autorización del backend. Validar que SAP y el backend Java rechacen consultas y modificaciones fuera del ámbito del usuario, incluyendo solicitudes manipuladas. Confirmar protección CSRF y propagación de identidad en operaciones de escritura con el equipo de integración.
Pendiente: matriz de roles aprobada, asignaciones IAS/XSUAA, políticas de sesión, baja de usuarios, autorización por objeto SAP y acceso a archivos. No se incluyen secretos ni se certifica cumplimiento de políticas sin evidencia del entorno.
## 10. Monitoreo y Logs
No se acredita una instalación de Kibana, un tablero central ni un esquema de retención de logs con el material revisado. Definir responsables, herramientas y alertas con Operaciones. BTP Cockpit y las herramientas del navegador pueden servir para revisar los recursos y las peticiones, sujetos al entorno y permisos disponibles.
Guía propuesta de diagnóstico: identificar aplicación, usuario de prueba, fecha y operación; revisar ruta y respuesta en Network; separar error de autenticación/autorización, conectividad, validación funcional o datos; correlacionar con registros del servicio SAP, proveedor de identidad o backend Java mediante el identificador disponible. Evitar registrar tokens, credenciales y datos personales completos.
Pendiente: ubicación efectiva de logs, correlación, códigos funcionales del backend, responsables de atención, tiempos de respuesta, conservación y alertas. validacion-local.json es evidencia de verificaciones locales, no un registro operativo del portal.
## 11. Comentarios Adicionales
Conclusión: existe material suficiente para elaborar este borrador técnico del portal de clientes, conservando las once secciones del formato recibido. No existe evidencia suficiente para firmar una validación integral de producción.
Para cerrar la versión final: asignar código documental, autor, revisor y aprobador; confirmar alcance y reglas con negocio; identificar remoto, rama y commit de entrega; completar arquitectura efectiva y matriz de ambientes; ejecutar pruebas integradas y adjuntar capturas/logs; aprobar seguridad, transporte, monitoreo y soporte.
Las instrucciones orientativas de la plantilla se trataron como estructura del documento, no como prueba de que existan CAP, jobs o Kibana. La plantilla original se conserva sin modificaciones. Este reporte documenta la revisión; no modifica el código funcional ni despliega servicios.
