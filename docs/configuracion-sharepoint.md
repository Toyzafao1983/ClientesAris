# Configuración de carpetas SharePoint del portal de clientes

Implementado el 05-10-2026. Las carpetas que antes estaban escritas en los BaseController se leen ahora de `webapp/config/sharepoint.properties` en cada aplicación. Se conservan las rutas actuales; cambiar el archivo no crea ni mueve carpetas en SharePoint.

## Archivos y propiedades

| Aplicación | Archivo relativo a la raíz del repositorio | Propiedad | Valor actual |
|---|---|---|---|
| Stock | `aris.com.clientes.controlstock.pe/webapp/config/sharepoint.properties` | `materialsFolder` | `Pruebas BTP/Clientes/materiales` |
| Químicos | `creacionpedido/quimico/com.aris.registropedido.quimico.pe/webapp/config/sharepoint.properties` | `documentsFolder` | `Pruebas BTP/Clientes/documentos/quimicos` |
| Cerámicos | `creacionpedido/ceramico/com.aris.registropedido.ceramicos.pe/webapp/config/sharepoint.properties` | `documentsFolder` | `Pruebas BTP/Clientes/documentos/ceramicos` |
| Textiles | `creacionpedido/textil/com.aris.registropedido.textiles.pe/webapp/config/sharepoint.properties` | `documentsFolder` | `Pruebas BTP/Clientes/documentos/textil` |

Usar una ruta relativa a la raíz de la biblioteca, sin barra inicial/final y sin segmentos vacíos, `.` o `..`. Escribir espacios como espacios normales; el controlador codifica cada segmento al construir la URL. No escribir `%20` manualmente. El nombre actual es `Pruebas BTP`, no `BTP Pruebas`.

## Carga y uso

Cada BaseController incorpora `_getSharePointFolder`, que utiliza `sap/base/i18n/ResourceBundle` para leer el formato properties de forma asíncrona. El archivo es configuración técnica independiente de i18n: se fuerza locale vacío y no se solicitan variantes por idioma. `sap.ui.require.toUrl` resuelve la ruta dentro del namespace de la aplicación.

Las llamadas simultáneas comparten la carga del archivo; la respuesta se conserva en memoria durante la sesión de la aplicación. Una carga fallida o una propiedad ausente/vacía/inválida permite reintentar y rechaza la operación antes de llamar a SharePoint. No existe una ruta alternativa escrita en el controlador que pueda llevar archivos a una carpeta equivocada. El llamador recibe el error por su Promise.

Químicos, cerámicos y textiles leen `documentsFolder` antes de `_uploadSharepoint`, preservando nombre de archivo, codificación, progreso, resultado y construcción local/launchpad de la URL. Stock usa `materialsFolder` tanto en `_listarArchivos` como en `_getSharepoint`; ambas consultas codifican los segmentos de la misma ruta. En `_getSharepoint` se captura el controlador localmente para conservarlo mientras carga la configuración.

La conexión sigue utilizando los destinations actuales. No se modificó `xs-app.json`, las credenciales ni la configuración de proveedores. El archivo contiene únicamente una carpeta; no debe contener secretos.

## Cambio de ambiente y despliegue

1. Editar la propiedad correspondiente en cada proyecto que cambie de carpeta.
2. Confirmar que esa carpeta existe y que la conexión actual tiene acceso a ella.
3. Construir y desplegar la aplicación incluyendo **BaseController.js y config/sharepoint.properties**. La configuración vive dentro de webapp y no está excluida en el ui5-deploy.yaml revisado de químicos; verificar que el artefacto final incluya config/sharepoint.properties en las cuatro aplicaciones.
4. Recargar la aplicación para leer el valor nuevo. Esta opción no ofrece cambio central inmediato sin despliegue, como lo haría una configuración externa.
5. En Network, comprobar carga de config/sharepoint.properties y las llamadas de listado/subida con la ruta esperada; probar archivo con espacios y paréntesis y el nombre generado para la OC.

## Validación

Desde la raíz: `node docs/tests/sharepoint-config.cjs`.

La prueba ejecuta los cuatro BaseController reales con transporte y ResourceBundle simulados: una carga compartida, resolución por namespace, listado de stock por ambas rutas, subida local y launchpad, codificación de nombres, propiedad ausente, ausencia de peticiones con configuración inválida y reintentos tras fallo de carga. Los cuatro escenarios pasan. También pasan `node --check` en los cuatro controladores y `git diff --check`.

No se ejecutó una carga real de ResourceBundle en navegador ni una operación real contra SharePoint. No se hizo compilación o despliegue en esta entrega. La prueba utiliza un stub del lector properties; confirmar la carga real del archivo y su inclusión en el paquete en BAS. El test y este documento no son necesarios para desplegar. Sin commit realizado por esta sesión.
