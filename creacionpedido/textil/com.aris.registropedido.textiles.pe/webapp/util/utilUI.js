sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	'sap/m/Button',
	'sap/m/Dialog',
	'sap/m/Text',
	"sap/ui/layout/VerticalLayout",
	"sap/ui/core/routing/History",
	'sap/ui/model/Filter',
	"./utilController"
], function (JSONModel, MessageBox, MessageToast, Button, Dialog, Text, VerticalLayout, History, Filter, utilController) {
	"use strict";
	var imgSaasa = ''
	var imagenes = [];
	var cCodigoUA = 0;
	var imgX = 22;
	var imgY = 108;
	var cLoad = 0;
	var cImgPage = 1;	
	return {  
		loadingPage: function (self, valor) {
			self.getView().getModel("ui").setProperty("/loadingPage", valor);
			self.getView().getModel("ui").refresh();
		},
		validarEmail: function (email) {
			var rexMail = /^\w+[\w-+\.]*\@\w+([-\.]\w+)*\.[a-zA-Z]{2,}$/; ///^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
			var indicador = "";
			if (!email.match(rexMail)) {
				indicador = false;
			} else {
				indicador = true;
			}
			return indicador;
		},
		onFiltrarTablaLive: function (self, idInput, idTabla, fields) {
			var oView = self.getView();
			var Input = oView.byId(idInput);
			var oTable = oView.byId(idTabla);
			var valor = Input.getValue();
			this.filterSearchBoxList(oTable, valor, fields);
		},
		filterSearchBoxList: function (tablaLista, valor, params) {
			var oBinding = tablaLista.mBindingInfos.items.binding; //tablaLista.getBinding();
			// apply filters to binding
			var aFilters = [];
			params.forEach(function (item) {
				aFilters.push(new Filter(item.key, item.query, valor));
			});
			var filter = new Filter({
				filters: aFilters,
				and: false
			});
			oBinding.filter(filter);
		},
		filterSearchBoxList2: function (tablaLista, valor, params) {
			var oBinding = tablaLista.getBinding();
			// apply filters to binding
			var aFilters = [];
			params.forEach(function (item) {
				aFilters.push(new Filter(item.key, item.query, valor));
			});
			var filter = new Filter({
				filters: aFilters,
				and: false
			});
			oBinding.filter(filter);
		},
		FiltrarCampos2: function (self, modelo, tabla, arrayFiltros, nuevoModel, resolve, reject) {
			var oDataModel = self.getView().getModel(modelo);
			//new Filter("CodigoTabla", "EQ", "tipo_usuario");
			var onSuccess = function (oDataModel) {
				var results = oDataModel.results;
				var filtrado = new JSONModel(results);
				self.getView().setModel(filtrado, nuevoModel);
				self.getView().getModel(nuevoModel);
				self.getView().getModel(nuevoModel).refresh();
				resolve(results);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();

			};
			//Handler en caso de error
			var onError = function (error) {
				jQuery.sap.log.info("--cargaTablaClasePedido error--", error);
				reject();
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
			};
			var reqHeaders = {
				filters: arrayFiltros,
				context: this, // mention the context you want
				success: onSuccess, // success call back method
				error: onError, // error call back method
				async: false // flage for async true
			};

			oDataModel.read("/" + tabla, reqHeaders);
		},
		FiltrarCampos: function (self, modelo, tabla, arrayFiltros, nuevoModel, nuevoTabla) {
			var oDataModel = self.getView().getModel(modelo);
			//new Filter("CodigoTabla", "EQ", "tipo_usuario");
			var onSuccess = function (oDataModel) {
				var results = oDataModel.results;
				self.getView().getModel(nuevoModel).setProperty("/" + nuevoTabla, results);
				self.getView().getModel(nuevoModel).refresh();
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
			};
			//Handler en caso de error
			var onError = function (error) {
				jQuery.sap.log.info("--cargaTablaClasePedido error--", error);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
			};
			var reqHeaders = {
				filters: arrayFiltros,
				context: this, // mention the context you want
				success: onSuccess, // success call back method
				error: onError, // error call back method
				async: false // flage for async true
			};
			oDataModel.read("/" + tabla, reqHeaders);
		},
		onMensajeGeneral: function (self, mensaje) {
			var dialog = new sap.m.Dialog({
				title: 'Mensaje',
				type: 'Message',
				content: new sap.m.Text({
					text: mensaje
				}),
				beginButton: new sap.m.Button({
					text: 'OK',
					press: function () {
						dialog.close();
					}.bind(self)
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.open();
		},
		onMessageErrorDialogPress: function (idTransaccion, message) {
			var mensaje = message ? message : 'Ocurrió un error en el servicio';
			var that = this;
			var dialog = new sap.m.Dialog({
				//id: 'dglExitoso',
				title: 'Error',
				type: 'Message',
				state: 'Error',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							textAlign: 'Center'
								//id: 'txtMensaje'
						}),
						new sap.m.Input({
							value: idTransaccion,
							enabled: false,
							//id: 'inputTranscaccion',
							class: 'tamaniotexto'
						})
					]
				}),
				beginButton: new sap.m.Button({
					icon: 'sap-icon://copy',
					//id: 'btnidTransaccion',
					tooltip: 'Copiar código de transaccion al portapapeles',
					press: function () {
						that.copyToClipboard(idTransaccion);
					}
				}),
				endButton: new sap.m.Button({
					text: 'OK',
					press: function () {
						dialog.destroy();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},
		
		onMessageErrorDialogPress2: function ( message) {
			var mensaje = message ? message : 'Ocurrió un error en el servicio';
			var that = this;
			var dialog = new sap.m.Dialog({
				//id: 'dglExitoso',
				title: 'Error',
				type: 'Message',
				state: 'Error',
				contentWidth: 'auto',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							// textAlign: 'Center'
								//id: 'txtMensaje'
						}),
					]
				}),
				endButton: new sap.m.Button({
					text: 'OK',
					press: function () {
						dialog.destroy();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},

		onMessageWarningDialogPress: function (idTransaccion, mensaje) {
			var that = this;
			var dialog = new Dialog({
				//id: 'dglExitoso',
				title: 'Advertencia',
				type: 'Message',
				state: 'Warning',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							textAlign: 'Center'
								//id: 'txtMensaje'
						}),
						new sap.m.Input({
							value: idTransaccion,
							enabled: false,
							//id: 'inputTranscaccion',
							class: 'tamaniotexto'
						})
					]
				}),
				beginButton: new sap.m.Button({
					visible: false,
					icon: 'sap-icon://copy',
					//id: 'btnidTransaccion',
					tooltip: 'Copiar código de transaccion al portapapeles',
					press: function () {
						that.copyToClipboard(idTransaccion);
					}
				}),
				endButton: new sap.m.Button({
					text: 'OK',
					press: function () {
						dialog.destroy();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.open();
		},
		
		onMessageWarningDialogPress2: function (mensaje) {
			var that = this;
			var dialog = new Dialog({
				//id: 'dglExitoso',
				title: 'Advertencia',
				type: 'Message',
				state: 'Warning',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							textAlign: 'Center'
								//id: 'txtMensaje'
						})
					]
				}),
				endButton: new sap.m.Button({
					text: 'OK',
					press: function () {
						dialog.destroy();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.open();
		},
		
		onMessageWarningDialogPressExit: function (idTransaccion, mensaje) {
			var that = this;
			var dialog = new sap.m.Dialog({
				//id: 'dglExitoso',
				title: 'Advertencia',
				type: 'Message',
				state: 'Warning',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							textAlign: 'Center'
								//id: 'txtMensaje'
						}),
						new sap.m.Input({
							value: idTransaccion,
							enabled: false,
							//id: 'inputTranscaccion',
							class: 'tamaniotexto'
						})
					]
				}),
				beginButton: new sap.m.Button({
					visible: false,
					icon: 'sap-icon://copy',
					//id: 'btnidTransaccion',
					tooltip: 'Copiar código de transaccion al portapapeles',
					press: function () {
						that.copyToClipboard(idTransaccion);
					}
				}),
				endButton: new sap.m.Button({
					text: 'Salir',
					press: function () {
						var aplicacion = "#";
						var accion = "";
						that.regresarAlLaunchpad(aplicacion, accion);
						dialog.destroy();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.open();
		},
		onMessageWarningDialogPress2: function (idTransaccion, mensaje) {
			var that = this;
			var dialog = new sap.m.Dialog({
				//id: 'dglExitoso',
				title: 'Advertencia',
				type: 'Message',
				state: 'Warning',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new Text({
						text: mensaje + '\n' + '\n',
						textAlign: 'Center'
							//id: 'txtMensaje'
					})]
				}),
				beginButton: new sap.m.Button({
					visible: false,
					icon: 'sap-icon://copy',
					//id: 'btnidTransaccion',
					tooltip: 'Copiar código de transaccion al portapapeles',
					press: function () {
						that.copyToClipboard(idTransaccion);
					}
				}),
				endButton: new sap.m.Button({
					text: 'OK',
					press: function () {
						dialog.destroy();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.open();
		},
		onMessageSuccessDialogPress: function (idTransaccion, mensaje) {
			var that = this;
			var dialog = new sap.m.Dialog({
				//id: 'dglExitoso',
				title: 'Éxito',
				type: 'Message',
				state: 'Success',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							textAlign: 'Center'
								//id: 'txtMensaje'
						}),
						new sap.m.Input({
							value: idTransaccion,
							enabled: false,
							//id: 'inputTranscaccion',
							class: 'tamaniotexto'
						})
					]
				}),
				beginButton: new sap.m.Button({
					icon: 'sap-icon://copy',
					//id: 'btnidTransaccion',
					tooltip: 'Copiar código de transaccion al portapapeles',
					press: function () {
						that.copyToClipboard(idTransaccion);
					}
				}),
				endButton: new sap.m.Button({
					text: 'Cerrar',
					press: function () {
						dialog.destroy();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.open();
		},
		onMessageSuccessDialogPress2: function (idTransaccion, mensaje) {
			var that = this;
			var dialog = new sap.m.Dialog({
				//id: 'dglExitoso',
				title: 'Éxito',
				type: 'Message',
				state: 'Success',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							textAlign: 'Center'
								//id: 'txtMensaje'
						})
					]
				}),
				
				endButton: new sap.m.Button({
					text: 'Cerrar',
					press: function () {
						dialog.destroy();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.open();
		},
		onMessageSuccessDialogPressSuccesFunctionEnd: function (idTransaccion, mensaje, events,result) {
			var that = this;
			var dialog = new sap.m.Dialog({
				//id: 'dglExitoso',
				title: 'Éxito',
				type: 'Message',
				state: 'Success',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							textAlign: 'Center'
								//id: 'txtMensaje'
						})
					]
				}),
				
				endButton: new sap.m.Button({
					text: 'Cerrar',
					press: function () {
						dialog.destroy();
						events.success(result.oResults,result.oAuditResponse.sMessage);
					}
				}),
				afterClose: function () {
					dialog.destroy();
					events.success(result.oResults,result.oAuditResponse.sMessage);
				}
			});

			dialog.open();
		},
		
		onMessageSuccessDialogPressInformationFunctionEnd: function (idTransaccion, mensaje, events,result) {
			var that = this;
			var dialog = new sap.m.Dialog({
				//id: 'dglExitoso',
				title: 'Mensaje',
				type: 'Message',
				state: 'Information',
				contentWidth: '25rem',
				content: new sap.ui.layout.VerticalLayout({
					//id: 'idVertical',
					content: [new sap.m.Text({
							text: mensaje + '\n' + '\n',
							textAlign: 'Center'
								//id: 'txtMensaje'
						})
					]
				}),
				
				endButton: new sap.m.Button({
					text: 'Cerrar',
					press: function () {
						dialog.destroy();
						events.success(result.oResults,result.oAuditResponse.sMessage);
					}
				}),
				afterClose: function () {
					dialog.destroy();
					events.success(result.oResults,result.oAuditResponse.sMessage);
				}
			});

			dialog.open();
		},

		messageStrip: function (controller, id, message, tipo) {

			var control = controller.getView().byId(id);
			control.setText(message);
			control.setShowIcon(true);
			control.setShowCloseButton(false);

			if (!tipo) {
				control.setType("Information");
			}

			if (tipo.toUpperCase() === "E") {
				control.setType("Error");
			}

			if (tipo.toUpperCase() === "S") {
				control.setType("Success");
			}

			if (tipo.toUpperCase() === "W") {
				control.setType("Warning");
			}

			if (tipo.toUpperCase() === "I") {
				control.setType("Information");
			}
		},
		objectListItemSelectedItem: function (event, model) {
			return event.getSource().getBindingContext(model) == undefined ? false : event.getSource().getBindingContext(model).getObject();
		},
		messageBox: function (mensaje, tipo, callback) {
			if (tipo.toUpperCase() === "C") {
				MessageBox.show(mensaje, {
					icon: MessageBox.Icon.QUESTION,
					title: "Confirmación",
					actions: [MessageBox.Action.OK, MessageBox.Action.NO],
					onClose: function (sAnswer) {
						return callback(sAnswer === MessageBox.Action.YES);
					}
				});
			}

			if (tipo.toUpperCase() === "I") {
				MessageBox.information(mensaje, {
					title: "Información",
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function (sAnswer) {
						return callback(sAnswer === MessageBox.Action.YES);
					}
				});
			}

			if (tipo.toUpperCase() === "E") {
				MessageBox.error(mensaje, {
					onClose: function (sAnswer) {
						return callback(sAnswer === MessageBox.Action.YES);
					}
				});
			}

			if (tipo.toUpperCase() === "S") {
				MessageBox.success(mensaje, {
					onClose: function (sAnswer) {
						return callback(sAnswer === MessageBox.Action.YES);
					}
				});
			}

		},
		messageToast: function (data) {
			return MessageToast.show(data, {
				duration: 3000
			});
		},
		imageResize: function (srcData, width, height) {
			var imageObj = new Image(),
				canvas = document.createElement("canvas"),
				ctx = canvas.getContext('2d'),
				xStart = 0,
				yStart = 0,
				aspectRadio,
				newWidth,
				newHeight;

			imageObj.src = srcData;
			canvas.width = width;
			canvas.height = height;

			aspectRadio = imageObj.height / imageObj.width;

			if (imageObj.height < imageObj.width) {
				//horizontal
				aspectRadio = imageObj.width / imageObj.height;
				newHeight = height,
					newWidth = aspectRadio * height;
				xStart = -(newWidth - width) / 2;
			} else {
				//vertical
				newWidth = width,
					newHeight = aspectRadio * width;
				yStart = -(newHeight - height) / 2;
			}

			ctx.drawImage(imageObj, xStart, yStart, newWidth, newHeight);

			return canvas.toDataURL("image/jpeg", 0.75);
		},
		resizeImg: function (img, maxWidth, maxHeight, degrees) {
			var imgWidth = img.width,
				imgHeight = img.height;

			var ratio = 1,
				ratio1 = 1,
				ratio2 = 1;
			ratio1 = maxWidth / imgWidth;
			ratio2 = maxHeight / imgHeight;

			// Use the smallest ratio that the image best fit into the maxWidth x maxHeight box.
			if (ratio1 < ratio2) {
				ratio = ratio1;
			} else {
				ratio = ratio2;
			}
			var canvas = document.createElement("canvas");
			var canvasContext = canvas.getContext("2d");
			var canvasCopy = document.createElement("canvas");
			var copyContext = canvasCopy.getContext("2d");
			var canvasCopy2 = document.createElement("canvas");
			var copyContext2 = canvasCopy2.getContext("2d");
			canvasCopy.width = imgWidth;
			canvasCopy.height = imgHeight;
			copyContext.drawImage(img, 0, 0);

			// init
			canvasCopy2.width = imgWidth;
			canvasCopy2.height = imgHeight;
			copyContext2.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvasCopy2.width, canvasCopy2.height);

			var rounds = 1;
			var roundRatio = ratio * rounds;
			for (var i = 1; i <= rounds; i++) {

				// tmp
				canvasCopy.width = imgWidth * roundRatio / i;
				canvasCopy.height = imgHeight * roundRatio / i;

				copyContext.drawImage(canvasCopy2, 0, 0, canvasCopy2.width, canvasCopy2.height, 0, 0, canvasCopy.width, canvasCopy.height);

				// copy back
				canvasCopy2.width = imgWidth * roundRatio / i;
				canvasCopy2.height = imgHeight * roundRatio / i;
				copyContext2.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvasCopy2.width, canvasCopy2.height);

			} // end for

			canvas.width = imgWidth * roundRatio / rounds;
			canvas.height = imgHeight * roundRatio / rounds;
			canvasContext.drawImage(canvasCopy2, 0, 0, canvasCopy2.width, canvasCopy2.height, 0, 0, canvas.width, canvas.height);

			if (degrees == 90 || degrees == 270) {
				canvas.width = canvasCopy2.height;
				canvas.height = canvasCopy2.width;
			} else {
				canvas.width = canvasCopy2.width;
				canvas.height = canvasCopy2.height;
			}

			canvasContext.clearRect(0, 0, canvas.width, canvas.height);
			if (degrees == 90 || degrees == 270) {
				canvasContext.translate(canvasCopy2.height / 2, canvasCopy2.width / 2);
			} else {
				canvasContext.translate(canvasCopy2.width / 2, canvasCopy2.height / 2);
			}
			canvasContext.rotate(degrees * Math.PI / 180);
			canvasContext.drawImage(canvasCopy2, -canvasCopy2.width / 2, -canvasCopy2.height / 2);

			var dataURL = canvas.toDataURL();
			return dataURL;
		},
		loading: function (bShow) {
			if (bShow === true) {
				sap.ui.core.BusyIndicator.show(10);
			} else {
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
			}
		},
		getValueIN18: function (context, nameField) {
			return context.getView().getModel("i18n").getResourceBundle().getText(nameField);
			//{i18n>Description_TEXT}
		},
		crearExcel1: function (self, model, tabla, arrayFiltros, newModel, newTabla, arrayColumTabla, tituloExcel, nameFile) {
			var results = self.getView().getModel(model).getProperty("/" + tabla);
			this.onCreateExcel(self, results, newModel, arrayColumTabla, tituloExcel, nameFile);
		},
		crearExcelOdata1: function (self, model, tabla, arrayFiltros, newModel, newTabla, arrayColumTabla, tituloExcel, nameFile) {
			var that = this;
			var odata = "/" + tabla;
			var oDataModel = self.getView().getModel(model);
			//new Filter("CodigoTabla", "EQ", "tipo_usuario");
			var onSuccess = function (oDataModel) {
				var results = oDataModel.results;
				self.getView().getModel(newModel).setProperty("/" + newTabla, results);
				that.onCreateExcel(self, results, newModel, arrayColumTabla, tituloExcel, nameFile);
			};
			//Handler en caso de error
			var onError = function (error) {
				jQuery.sap.log.info("--cargaTablaClasePedido error--", error);
			};
			var reqHeaders = {
				filters: arrayFiltros,
				context: self, // mention the context you want
				success: onSuccess, // success call back method
				error: onError, // error call back method
				async: false // flage for async true
			};
			oDataModel.read(odata, reqHeaders);
		},
		onCreateExcelPasado: function (self, resultados, newModel, arrayColumTabla, tituloExcel, nameFile) {
			/*for (var i = 0; i < resultados.length; i++) {
				resultados[i].FechaCreacion = resultados[i].FechaCreacion.getDate() + "/" + (resultados[i].FechaCreacion.getMonth() + 1) + "/" +
					resultados[i].FechaCreacion.getFullYear();
			}*/
			var rows = resultados;
			//////Inicio Fecha Actual/////////////////////////////////////////////////////////////////////////
			var date = new Date();
			var yyyy = date.getFullYear().toString();
			var mm = (date.getMonth() + 1).toString(); // getMonth() is zero-based
			var dd = date.getDate().toString();
			var fechaActual = (dd[1] ? dd : "0" + dd[0]) + "/" + (mm[1] ? mm : "0" + mm[0]) + "/" + yyyy; // padding 
			//var fechaAct = (dd[1] ? dd : "0" + dd[0]) + (mm[1] ? mm : "0" + mm[0]) + yyyy; // padding 
			///////Fin Fecha Actual///////////////////////////////////////////////////////////////////////////
			var datefull = fechaActual; //this.formatter.date_full(new Date());
			var html = "";
			var tr = "";
			var th = "";
			var td = "";
			html = '<h2> ' + tituloExcel + ' </h2>';
			html = html + '<label>Fecha Reporte: ' + datefull + '</label>';
			var columnas = [];
			columnas = arrayColumTabla;
			/*[{
			        						name: "Id",
			        						model: "Id"
			        					   }];*/
			tr += '<tr>';
			for (var l = 0; l < columnas.length; l++) {
				var text = columnas[l].name;
				th += '<th style="background-color: #404040; color: #fff">' + text + '</th>';
			}
			tr += th + '</tr>';

			for (var j = 0; j < rows.length; j++) {
				tr += '<tr>';
				td = "";
				for (var k = 0; k < columnas.length; k++) {
					var item = rows[j][columnas[k].model];
					td += '<td style="background-color: #e6e6e6">' + item + '</td>';
				}
				tr += td + '</tr>';
			}
			html = html + '<table style="width:100%">' + tr + '</table>';
			var fileName = nameFile + fechaActual + ".xls";
			//var data_type = 'data:application/vnd.ms-excel';
			var ua = window.navigator.userAgent;
			var msie = ua.indexOf("MSIE");
			if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
				if (window.navigator.msSaveBlob) {
					var blob = new Blob([html], {
						type: "application/csv;charset=utf-8;"
					});
					navigator.msSaveBlob(blob, fileName);
				}
			} else {
				var blob2 = new Blob([html], {
					type: "application/csv;charset=utf-8;"
				});
				var filename = fileName;
				var elem = window.document.createElement('a');
				elem.href = window.URL.createObjectURL(blob2);
				elem.download = filename;
				document.body.appendChild(elem);
				elem.click();
				document.body.removeChild(elem);
			}
			self.getView().getModel(newModel).refresh(true);
		},
		///Inicio Export Excel///
		onExportExcel: function (self, model, tabla, arrayFiltros, newModel, newTabla, nameFile, nameHoja, mapEstructura) {
			var results = self.getView().getModel(model).getProperty("/" + tabla);
			this.onCreateExcel(self, results, newModel, nameFile, nameHoja, mapEstructura);
		},
		onExportExcelOdata: function (self, model, tabla, arrayFiltros, newModel, newTabla, nameFile, nameHoja) {
			var that = this;
			var odata = "/" + tabla;
			var oDataModel = self.getView().getModel(model);
			//new Filter("CodigoTabla", "EQ", "tipo_usuario");
			var onSuccess = function (oDataModel) {
				var results = oDataModel.results;
				self.getView().getModel(newModel).setProperty("/" + newTabla, results);
				that.onCreateExcel(self, results, newModel, nameFile, nameHoja);
			};
			//Handler en caso de error
			var onError = function (error) {
				jQuery.sap.log.info("--cargaTablaClasePedido error--", error);
			};
			var reqHeaders = {
				filters: arrayFiltros,
				context: self, // mention the context you want
				success: onSuccess, // success call back method
				error: onError, // error call back method
				async: false // flage for async true
			};
			oDataModel.read(odata, reqHeaders);
		},
		onCreateExcel: function (self, results, newModel, nameFile, nameHoja, mapEstructura) {
			var data = mapEstructura(results);
			/* this line is only needed if you are not adding a script tag reference */
			if (typeof XLSX == 'undefined') XLSX = require('xlsx');
			/* make the worksheet */
			var ws = XLSX.utils.json_to_sheet(data);
			//Inicio Filtrar//
			var AutoFilter = {
				ref: "A1:E1"
			};
			ws['!autofilter'] = AutoFilter;
			//End Filtrar//
			//Inicio Tamaño de la Columna//
			/*var wscols = [{wpx: '100'},{wpx: '100'}];
			ws['!cols'] = wscols ;*/
			//End Tamaño de la Columna//
			//Inicio Agregar Comentario//
			/*ws.A2.c.hidden = true;
			ws.A2.c.push({a:"SheetJS", t:"This comment will be hidden"});*/
			//End Agregar Comentario//
			/* add to workbook */
			var wb = XLSX.utils.book_new();
			//Inicio Agregar Otra Hoja//
			/*wb.SheetNames.push("Test Sheet");
			var ws1 = XLSX.utils.aoa_to_sheet(data);
			wb.Sheets["Test Sheet"] = ws1;*/
			//End Agregar Otra Hoja//
			XLSX.utils.book_append_sheet(wb, ws, nameHoja);
			/* generate an XLSX file */
			//////Inicio Fecha Actual/////////////////////////////////////////////////////////////////////////
			var date = new Date();
			var yyyy = date.getFullYear().toString();
			var mm = (date.getMonth() + 1).toString(); // getMonth() is zero-based
			var dd = date.getDate().toString();
			var fechaActual = (dd[1] ? dd : "0" + dd[0]) + "/" + (mm[1] ? mm : "0" + mm[0]) + "/" + yyyy;
			//////End Fecha Actual////////////////////////////////////////////////////////////////////////////
			XLSX.writeFile(wb, nameFile + fechaActual + ".xlsx");
		},
		///End Export Excel///
		///Inicio Import Excel///
		onImportExcel: function (self, oEvent, libro1, libro2, idFileUploader, mapEstructura, callback) {
			var file = oEvent.getParameter("files")[0];
			if (file && window.FileReader) {
				var reader = new FileReader();
				reader.onload = this.onReadFile.bind(self, self, libro1, libro2, idFileUploader, mapEstructura, callback);
				reader.readAsArrayBuffer(file);
			}
		},
		onReadFile: function (self, libro1, libro2, idFileUploader, mapEstructura, callback, evt) {
			var result = {};
			var data;
			var arr;
			var xlsx;
			data = evt.target.result;
			//var xlsx = XLSX.read(data, {type: 'binary'});
			arr = String.fromCharCode.apply(null, new Uint8Array(data));
			xlsx = XLSX.read(btoa(arr), {
				type: 'base64'
			});
			result = xlsx.Strings;
			result = {};
			xlsx.SheetNames.forEach(function (sheetName) {
				var rObjArr = XLSX.utils.sheet_to_row_object_array(xlsx.Sheets[sheetName]);
				if (rObjArr.length > 0) {
					result[sheetName] = rObjArr;
				}
			});
			var oResponse = {};
			oResponse.success = true;
			var contenido1 = result[libro1];
			var formatContenido1 = mapEstructura(contenido1);

			var contenido2 = result[libro2];
			var formatContenido2 = mapEstructura(contenido2);
			//self.getView().getModel(model).getProperty(tabla1)

			if ((!contenido1 || !contenido2) || (formatContenido1.length == 0 && formatContenido2.length == 0)) {
				oResponse.success = false;
			}
			self.getView().byId(idFileUploader).setValue("");
			oResponse.DocumentoTransporteMadre = formatContenido1;
			oResponse.DocumentoTransporteHija = formatContenido2;

			callback(oResponse);
		},
		///Inicio Import con MockData
		onImportExcel1: function (self, oEvent, model, tabla, idFileUploader, mapEstructura) {
			var file = oEvent.getParameter("files")[0];
			if (file && window.FileReader) {
				var reader = new FileReader();
				reader.onload = this.onReadFile.bind(self, self, model, tabla, idFileUploader, mapEstructura);
				reader.readAsArrayBuffer(file);
			}
		},
		onReadFile1: function (self, model, tabla, idFileUploader, mapEstructura, evt) {
			var result = {};
			var data;
			var arr;
			var xlsx;
			data = evt.target.result;
			//var xlsx = XLSX.read(data, {type: 'binary'});
			arr = String.fromCharCode.apply(null, new Uint8Array(data));
			xlsx = XLSX.read(btoa(arr), {
				type: 'base64'
			});
			result = xlsx.Strings;
			result = {};
			xlsx.SheetNames.forEach(function (sheetName) {
				var rObjArr = XLSX.utils.sheet_to_row_object_array(xlsx.Sheets[sheetName]);
				if (rObjArr.length > 0) {
					result[sheetName] = rObjArr;
				}
			});
			var contenido = result["SAP Document Export"]; //this.onRemoverHeader(data);
			//var localModel = this.getView().getModel("modelProductos");
			var formatContenido = mapEstructura(contenido);
			var modelTb = self.getView().getModel(model).getProperty(tabla) === undefined ? [] : self.getView().getModel(model).getProperty(tabla);
			var modelConcat = modelTb.concat(formatContenido);
			self.getView().getModel(model).setProperty(tabla, modelConcat);
			self.getView().byId(idFileUploader).setValue("");
		},
		onRemoverHeader1: function (data) {
			var excelKeys;
			var primerLibro = {};
			excelKeys = Object.keys(data);
			primerLibro.nombre = excelKeys[0];
			primerLibro.contenido = data[primerLibro.nombre];
			var shiftedInfo = primerLibro.contenido.shift();
			return primerLibro.contenido;
		},
		///End Import Mock Data
		///End Import Excel///

		///Inicio Descargar PDF///
		onGenerarPDFActaInventarioDirecta: function (value) {
			imagenes = [];
			cCodigoUA = 0;
			cLoad = 0;
			cImgPage = 1;
			var t = this;
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('p', 'mm', 'a4');
				var setCabecera = function (value) {
					var cord_X = 165;
					var cord_y = 5;
					doc.setFontSize(10);
					doc.setFont('arial', 'bold');
					doc.text(8, 5.5, value.RazonSocialTransportista);
					doc.setFontSize(8);
					doc.setFont('arial', 'normal');
					doc.text(8, 9.5, 'R.U.C.: '+value.RucTransportista);
					doc.text(8, 13, 'Dirección: '+value.DireccionTransportista);
					/////////////////////////////
					var date = new Date();
					var yyyy = date.getFullYear().toString();
					var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
					var dd = utilController.pad(date.getDate().toString(),"0",2);
					var h = utilController.pad(date.getHours(),"0", 2);
					var m = utilController.pad(date.getMinutes(),"0", 2);
					var s = utilController.pad(date.getSeconds(),"0", 2);
					var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
					/////////////////////////////
					// doc.text(cord_X, cord_y, "Callao, "+fechaActual+" "+h+":"+m+":"+s);
				};
				var setSubCabecera = function (value) {
					doc.setFont('arial', 'bold');
					doc.setFontSize(13);
					doc.text(62, 30, 'ACTA DE INVENTARIO N° '+value.NumeroActaInventario);
				};

				var cordYLVertical = 75;
				var profundidadLVertical = 88.8;
				var setHeaderDetalle = function (value) {
					var cordX= 6;
					var cordY= 40;
					// doc.setFontSize(10);
					// doc.rect(cordX, cordY, 35, 6);//Horizontal
					// doc.text(cordX+9, cordY+4, 'Manifiesto');
					// doc.text(cordX+3, cordY+12, value.NumeroManifiesto);

					// doc.rect(cordX+37, cordY, 35, 6);//Horizontal
					// doc.text(cordX+40, cordY+4, 'Fecha Recepción');
					// doc.text(cordX+45, cordY+12, value.FechaRecepcion);

					// doc.rect(cordX+74, cordY, 35, 6);//Horizontal
					// doc.text(cordX+85, cordY+4, 'Vuelo');
					// doc.text(cordX+82, cordY+12, value.NumeroVuelo);

					// doc.rect(cordX+111, cordY, 37, 6);//Horizontal
					// doc.text(cordX+112.5, cordY+4, 'Doc. Transp. Directo');
					// doc.text(cordX+120, cordY+12, value.DocTransporteDirecta);

					// doc.rect(cordX+150, cordY, 37, 6);//Horizontal
					// doc.text(cordX+152, cordY+4, 'Doc. Transp. Máster');
					// doc.text(cordX+158, cordY+12, value.DocTransporteMaster);
					
				}
				var setCuerpoDetalle = function (value) {
					
					var coordX = 6;
					var coordY = 40;
					//doc.rect(8, 17, 130, 47);//Contorno de una linea
					
					/*
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**nroManifiestoCarga**", value.NumeroManifiesto);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**nroVuelo**", value.NumeroVuelo);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**nroDocumentoTransporte**", value.DocTransporteMaster);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**codPuntoLlegada**", value.NumeroInventario.PuntoLlegada);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**nomPuntoLlegada**", value.NumeroInventario.PuntoLlegadaDescripcion);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**fechaVuelo**", value.NumeroInventario.ManifiestoFechaLlegadaATAString);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**horaVuelo**", value.NumeroInventario.ManifiestoFechaHoraLlegadaATAString.slice(11));
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**fechaTarja**", value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**horaTarja**", value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					*/
					
					var sPuntoLlegada = value.NumeroInventario.PuntoLlegadaDescripcion.split('-');
					var sDesPuntoLlegada = sPuntoLlegada.length > 1 ? sPuntoLlegada[1] : sPuntoLlegada[0];
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY, "Siendo las               horas del                  en las  instalaciones  de  nuestro  Terminal  de  Carga   Aéreo  –  Punto   de   Llegada");
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+17, coordY, value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+47, coordY, value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					var textoSegundaLinea = "                                                                         identificado con código de aduanas N°        , se llevó a cabo la verificación física"
					doc.text(coordX, coordY+3.5, textoSegundaLinea);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX, coordY+3.5, sDesPuntoLlegada);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+132.5, coordY+3.5, value.NumeroInventario.PuntoLlegada);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+7, "de los bultos arribados en mala condición exterior, los mismos que arribaron en el vuelo              a las              , de conformidad");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+10.5, "del día                  al amparo del documento de transporte N°                      y manifiesto de carga de ingreso N°");
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+138, coordY+7, value.NumeroVuelo);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 159.5, coordY+7, value.NumeroInventario.ManifiestoFechaHoraLlegadaATAString.slice(11));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 11.5, coordY+10.5, value.NumeroInventario.ManifiestoFechaLlegadaATAString);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 96, coordY+10.5, value.DocTransporteMaster);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 173, coordY+10.5, value.NumeroManifiesto);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+14.3, "con lo establecido en los artículos 102° y 106° de la Ley General de Aduanas aprobada por  Decreto Legislativo  N° 1053  y el");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+18, "artículo 138° e inciso d) del artículo 146° de su Reglamento aprobado por Decreto Supremo N° 010-2009-EF en concordancia");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+22, "con lo establecido en el numeral 3 de la sección IV del Procedimiento General “Manifiesto de Carga” DESPA-PG.09 versión 7,");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+25.7, "aprobado por Resolución de Superintendencia N° 016-2020/SUNAT, el cual señala que:");
					
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+47.6, '“');
					
					doc.setFont('arial', 'bold');
					doc.text(coordX + 1.5, coordY+47.6, "IV. DEFINICIONES Y ABREVIATURAS ");
					
					doc.setFontSize(9);
					doc.setFont("arial");
					doc.setFont('arial', 'normal');
					//utilController.alignTextJsPDF(doc,value.BaseLegalMaster,coordX,coordY,180,"normal");    
					
					//doc.text(coordX, coordY, value.BaseLegalMaster);
					
					// Contorno de linea del marco en la cita
					coordY = coordY + 23;
					doc.setDrawColor(0, 0, 0);
					doc.roundedRect(coordX - 2, coordY + 20, 200, 33, 3, 3);
							
					doc.setFontSize(10);
					doc.setFont('arial', 'italic');
					utilController.alignTextJsPDF(doc,value.BaseLegalMasterCita,coordX,coordY+22,180,"justify");    
					//doc.text(coordX, coordY+22, value.BaseLegalMasterCita);
					
					
					coordY = coordY + 3;
					doc.setFont('arial', 'normal');
					// doc.text(coordX, coordY+56, 'TRANSPORTISTA');
					// doc.text(coordX+45, coordY + 56, ": "+ (value.Transportista.length > 57 ? value.Transportista.substring(0,56) : value.Transportista));
					// doc.rect(coordX+47, coordY + 56.5, 130, 0);//Horizontal
					
					var contenedor;
					if (value.Contenedor){
						contenedor=value.Contenedor;
					} else {
						contenedor='(S/C)';
					}
					
					doc.text(coordX, coordY+61, 'CONSIGNATARIO');
					doc.text(coordX+45, coordY +61, ": "+(value.Consignatario.length > 57 ? value.Consignatario.substring(0,56) : value.Consignatario));
					doc.rect(coordX+47, coordY + 61.5, 130, 0);//Horizontal

					doc.text(coordX, coordY+66, 'CONTENEDOR');
					doc.text(coordX+45, coordY + 66, ": "+ (contenedor.length > 57 ? contenedor.substring(0,56) : contenedor));
					doc.rect(coordX+47, coordY + 66.5, 130, 0);//Horizontal

					doc.text(coordX, coordY+71, 'DESCRIPCIÓN');
					doc.text(coordX+45, coordY + 71, ": "+ (value.Descripcion.length > 57 ? value.Descripcion.substring(0,56) : value.Descripcion));
					doc.rect(coordX+47, coordY + 71.5, 130, 0);//Horizontal
					
					
					////////////////////////////////////////////////

					var cordXSub = 30;
					var cordYSub = 145;
					doc.setFont('arial', 'bold');
					doc.rect(cordXSub, cordYSub, 35, 6);//Horizontal
					doc.text(cordXSub+8, cordYSub+4, 'Total Bultos');
					doc.text(cordXSub+16, cordYSub+11, value.aDetalle.BultosRecibidos);

					doc.rect(cordXSub+37, cordYSub, 35, 6);//Horizontal
					doc.text(cordXSub+39, cordYSub+4, 'Bultos mal estado');
					doc.text(cordXSub+51, cordYSub+11, value.aDetalle.BultosMalos);

					doc.rect(cordXSub+74, cordYSub, 35, 6);//Horizontal
					doc.text(cordXSub+82, cordYSub+4, 'Peso Total');
					doc.text(cordXSub+90, cordYSub+11, value.aDetalle.PesoRecibidos);

					doc.rect(cordXSub+111, cordYSub, 35, 6);//Horizontal
					doc.text(cordXSub+114, cordYSub+4, 'Peso mal estado');
					doc.text(cordXSub+125, cordYSub+11, value.aDetalle.PesoMalos);

					var cordXComent = 14;
					var cordYComent = 165;
					doc.text(cordXComent, cordYComent, 'DESCRIPCION DE LA INCIDENCIA:');
					doc.rect(cordXComent, cordYComent+0.5, 59, 0);//Horizontal
					doc.setFont('arial', 'normal');
					utilController.alignTextJsPDF2(doc,value.Observacion,cordXComent,cordYComent+9,180,"justify");
					//doc.text(cordXComent, cordYComent+9, value.Observacion);
					//doc.rect(cordXComent, cordYComent+10, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+16, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+22, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+28, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+34, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+40, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+46, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+52, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+58, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+64, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+70, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+76, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+82, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+60, 180, 0);//Horizontal

					cordYComent = cordYComent + 8;
					doc.rect(cordXComent+25, cordYComent+100, 55, 0);//Horizontal
					doc.text(cordXComent+35, cordYComent+104, 'Nombres y Apellidos');
					doc.text(cordXComent+39, cordYComent+108, 'Transportista');

					doc.rect(cordXComent+98, cordYComent+100, 55, 0);//Horizontal
					doc.text(cordXComent+108, cordYComent+104, 'Nombres y Apellidos');
					doc.text(cordXComent+109, cordYComent+108, 'Depósito Temporal');
					
				};
				
				var setDetalleSegundaPagina = function (value) {
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(10);
					doc.text(13, 30, 'FOTOS DE BULTOS ARRIBADOS EN MALA CONDICION EXTERIOR – ACTA DE INVENTARIO N° '+ value.NumeroActaInventario);
					
					var coordX = 9;
					var coordY = 40;
					
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{nroManifiestoCarga}}", value.NumeroManifiesto);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{actaInventario}}", value.NumeroActaInventario);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{nroDocumentoTransporte}}", value.DocTransporteDirecta);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{codPuntoLlegada}}", value.NumeroInventario.PuntoLlegada);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{nomPuntoLlegada}}", value.NumeroInventario.PuntoLlegadaDescripcion);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{fechaTarja}}", value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{horaTarja}}", value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					
					var sPuntoLlegada = value.NumeroInventario.PuntoLlegadaDescripcion.split('-');
					var sDesPuntoLlegada = sPuntoLlegada.length > 1 ? sPuntoLlegada[1] : sPuntoLlegada[0];
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY, "Conforme a lo descrito en la sección  “DESCRIPCIÓN DE LA INCIDENCIA” del  ACTA  DE  INVENTARIO  N°");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 173, coordY, value.NumeroActaInventario);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+4, "formulada a las                horas del                   en las instalaciones del Depósito Temporal");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+25, coordY+4, value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+56, coordY+4, value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+142, coordY+4, sDesPuntoLlegada.substring(0, 24));
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX + 15, coordY+7.8, "              identificado con código de aduanas N°        , a   través   del  presente   documento  se deja  constancia");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX, coordY+7.8, sDesPuntoLlegada.substring(24, sDesPuntoLlegada.length));

					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+89.3, coordY+7.8, value.NumeroInventario.PuntoLlegada);

					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+11.6, "de  la  recepción  de  los bultos arribados   en   mala  condición   exterior   correspondiente   al  documento  de  transporte");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+15.6, "N°                       y manifiesto de carga de ingreso N°");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+5, coordY+15.6, value.DocTransporteDirecta);

					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+83, coordY+15.6, value.NumeroManifiesto + ":");
					
					doc.setFontSize(10.5);
					doc.setFont('arial', 'normal');
					//utilController.alignTextJsPDF(doc,value.BaseLegalMasterMalaCond,coordX,coordY,180,"normal");
					
					doc.setDrawColor(0, 0, 0);
					doc.roundedRect(coordX-2, coordY + 25, 195, 33, 3, 3);
							
					doc.setFont('arial', 'italic');
					utilController.alignTextJsPDF(doc,value.BaseLegalMasterMalaCondCita,coordX,coordY+30,180,"normal");   
					
					if (value.Fotos.length > 0){
						doc.setFont('arial', 'bold');
						doc.text(coordX + 5, coordY + 64.5, "UA N°: " + value.Fotos[0]);	
					
						cCodigoUA += 2;
					}
					
					coordX = coordX + 4;
					coordY = coordY + 68;
					doc.rect(coordX, coordY, 80, 87);
					doc.rect(coordX + 100, coordY, 80, 87);
					doc.rect(coordX, coordY + 90, 80, 87);
					doc.rect(coordX + 100, coordY + 90, 80, 87);
				};

				var setFooter = function (value, cord_x) {
				};
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					setCuerpoDetalle(value);
					setFooter(value);
				};
				var setSegundaPagina = function (Detalle) {
					doc.addPage();
					setCabecera(value);
					setDetalleSegundaPagina(value);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				setSegundaPagina(Detalle);
				
				var cX = 16;
				var cY = 40;
				var cSinImg = 1;
				if (value.Fotos.length > 0){
					$.each(value.Fotos, function(i, e){
						var img1 = new Image();
						if (e.indexOf("SaasaService") > -1){
							imagenes.push(e);
							img1.src = e	
						}else{
							cSinImg++;
						}
					});
					if ((imagenes.length-1) == (value.Fotos.length - cSinImg)){
						t.loadImage(doc, value, cSinImg, {cX: cX-3, cY: cY}, {y1: 109, y2: 199}, 1);	
					}
				}else{
					sap.ui.core.BusyIndicator.hide()
					Busy.close();
					doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
				}
				//terminosCondiciones(value);
				
			};
			
			$.generarOrdenCompraPDF(value);
		},
		loadImage: function(doc, value, cSinImg, dim, pos, formato) {
		    if (!imagenes.length) {
		        return;
		    }
		
		    var image = imagenes.shift();
			var t = this;
			var img = new Image();
			img.src = image;
		    img.onload = function() {
		    	if (img.src != ""){
					if (cLoad > 0){
						if (cLoad%4==0){
							doc.addPage();
							
							
							var idxCodigoHouse = cCodigoUA + cLoad + 1;
							if (formato==2){
								doc.setFont('arial', 'bold');
								cCodigoUA++;
								doc.text(dim.cX + 2, dim.cY - 7.5, "HOUSE N°: " + value.Fotos[idxCodigoHouse]);	
							}
							
							idxCodigoHouse--;
							doc.setFont('arial', 'bold');
							cCodigoUA++;
							doc.text(dim.cX + 2, dim.cY - 3, "UA  N°: " + value.Fotos[idxCodigoHouse]);
			
			
							doc.rect(dim.cX, dim.cY, 80, 87);
							doc.rect(dim.cX + 100, dim.cY, 80, 87);
							doc.rect(dim.cX, dim.cY + 90, 80, 87);
							doc.rect(dim.cX + 100, dim.cY + 90, 80, 87);
						
							cImgPage = 1;
						}	
					}
					
					switch(cImgPage){
						case 1:
							imgX = formato!=3? 14.7 : 17;
							imgY = cLoad<4?pos.y1:42;
							break;
						case 2:
							imgX = formato!=3? 114.7 : 117;
							imgY = cLoad<4?pos.y1:42;
							break;
						case 3:
							imgX = formato!=3? 14.7 : 17;
							imgY = cLoad<4?pos.y2:132;
							break;
						case 4:
							imgX = formato!=3? 114.7 : 117;
							imgY = cLoad<4?pos.y2:132;
							break;
					}
					
					doc.addImage(img, 'JPEG', imgX, imgY, 76, 84);	
					
					if (cLoad==(value.Fotos.length-cSinImg)){
						sap.ui.core.BusyIndicator.hide()
						Busy.close();
						var pageCount = doc.internal.getNumberOfPages();	
						//doc.deletePage(pageCount);
						doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');	
					}
					
					
					cLoad++;
					cImgPage++;	
				}
				
		        t.loadImage(doc, value, cSinImg, {cX: dim.cX, cY: dim.cY}, pos, formato);
		    };
		},
		onGenerarPDFActaTrasladoDirecta: function (value) {
			$.generarPDF = function (value) {
				var doc = new jsPDF('p', 'mm', 'a4');
				
				var construirFormato = function (value) {
					var coord_x, coord_y;
					
					coord_x = 15;
					coord_y = 15;
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(10);
					doc.text(95, coord_y, 'ANEXO X');
					doc.text(60, coord_y+5, 'ACTA DE TRASLADO ENTRE DEPÓSITOS TEMPORALES');
					
					
					doc.setFont('arial', 'normal');
					doc.setFontSize(7);
					doc.text(coord_x, coord_y+15, 'Participantes:');
					
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+20, 175, 39);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+20.4, 40, 38.2,'F');
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(7);
					doc.text(coord_x+2, coord_y+26, 'Depósito temporal de origen:');
					doc.text(coord_x+42, coord_y+26, value.DepositoTemporal);
					doc.text(coord_x+2, coord_y+35, 'Representante legal:');
					doc.text(coord_x+42, coord_y+35, value.RepresentanteLegalOrigen);
					doc.text(coord_x+2, coord_y+44, 'Depósito temporal de destino:');
					doc.text(coord_x+42, coord_y+44, value.DescripcionSaasa);
					doc.text(coord_x+2, coord_y+53, 'Representante legal:');
					doc.text(coord_x+42, coord_y+53, value.RepresentanteLegalOrigen)
					
					doc.setFont('arial', 'normal');
					doc.text(coord_x, coord_y+70, 'Información de carga trasladada:');
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+75, 175, 30);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+75.4, 174.2, 8,'F');
					
					doc.setFont('arial', 'bold');
					doc.text(coord_x+6, coord_y+80, 'Manifiesto de carga');
					doc.text(coord_x+8, coord_y+88, value.NumeroManifiesto);
					doc.text(coord_x+43, coord_y+80, 'Documento de transporte');
					doc.text(coord_x+52, coord_y+88, "Master");
					doc.text(coord_x+83, coord_y+80, 'Cantidad de bultos');
					doc.text(coord_x+90, coord_y+88, value.aDetalle == null ? "" : value.aDetalle.BultosManifestados);
					doc.text(coord_x+117, coord_y+80, 'Peso total');
					doc.text(coord_x+119, coord_y+88, value.aDetalle == null ? "" : value.aDetalle.PesoManifestados);
					doc.text(coord_x+140, coord_y+80, 'Precinto aduanero N°');
					
					
					doc.setFont('arial', 'normal');
					doc.text(coord_x, coord_y+118, 'Información del medio de transporte:');
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+123, 175, 30);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+123.4, 174.2, 8,'F');
					
					doc.setFont('arial', 'bold');
					doc.text(coord_x+10, coord_y+128, 'Tipo de vehículo / marca');
					doc.text(coord_x+70, coord_y+128, 'Placa del vehículo');
					doc.text(coord_x+74, coord_y+136, value.Matricula);
					doc.text(coord_x+130, coord_y+128, 'Observaciones');
					
					doc.setLineWidth(0.1);
					doc.rect(coord_x, coord_y+165, 70, 10);
					doc.text(coord_x+5, coord_y+173, 'Lugar: .......................................');
					
					doc.rect(coord_x+105, coord_y+165, 70, 10);
					doc.text(coord_x+110, coord_y+173, 'Fecha de traslado: ........./........./...............');
					
					doc.rect(coord_x+5, coord_y+210, 50, 0);
					doc.setFont('arial', 'normal');
					doc.text(coord_x+10, coord_y+213, 'FIRMA DEL CONDUCTOR:');
					doc.text(coord_x+10, coord_y+217, 'NOMBRE:');
					doc.text(coord_x+10, coord_y+221, 'LICENCIA DE CONDUCIR:');
					
				};
				
				construirFormato(value);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				
				doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
			};
			$.generarPDF(value);
		},
		onGenerarPDFActaInventarioMaster: function (value) {
			imagenes = [];
			cCodigoUA = 0;
			cLoad = 0;
			cImgPage = 1;
			var t = this;
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('p', 'mm', 'a4');
				var setCabecera = function (value) {
					var cord_X = 165;
					var cord_y = 5;
					doc.setFontSize(10);
					doc.setFont('arial', 'bold');
					doc.text(8, 5.5, value.RazonSocialTransportista);
					doc.setFontSize(9);
					doc.setFont('arial', 'normal');
					doc.text(8, 9.5, 'R.U.C.: '+value.RucTransportista);
					doc.text(8, 13, 'Dirección: '+value.DireccionTransportista);
					/////////////////////////////
					var date = new Date();
					var yyyy = date.getFullYear().toString();
					var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
					var dd = utilController.pad(date.getDate().toString(),"0",2);
					var h = utilController.pad(date.getHours(),"0", 2);
					var m = utilController.pad(date.getMinutes(),"0", 2);
					var s = utilController.pad(date.getSeconds(),"0", 2);
					var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
					/////////////////////////////
					// doc.text(cord_X, cord_y, "Callao, "+fechaActual+" "+h+":"+m+":"+s);
				};
				var setSubCabecera = function (value) {
					doc.setFont('arial', 'bold');
					doc.setFontSize(13);
					doc.text(62, 30, 'ACTA DE INVENTARIO N° '+value.NumeroActaInventario);
				};

				var cordYLVertical = 75;
				var profundidadLVertical = 88.8;
				var setHeaderDetalle = function (value) {
					var cordX= 12;
					var cordY= 40;
					// doc.setFontSize(10);
					// doc.rect(cordX, cordY, 35, 6);//Horizontal
					// doc.text(cordX+9, cordY+4, 'Manifiesto');
					// doc.text(cordX+3, cordY+12, value.NumeroManifiesto);

					// doc.rect(cordX+37, cordY, 35, 6);//Horizontal
					// doc.text(cordX+40, cordY+4, 'Fecha Recepción');
					// doc.text(cordX+45, cordY+12, value.FechaRecepcion);

					// doc.rect(cordX+74, cordY, 35, 6);//Horizontal
					// doc.text(cordX+85, cordY+4, 'Vuelo');
					// doc.text(cordX+82, cordY+12, value.NumeroVuelo);

					// doc.rect(cordX+111, cordY, 37, 6);//Horizontal
					// doc.text(cordX+112.5, cordY+4, 'Doc. Transp. Directo');
					// doc.text(cordX+120, cordY+12, value.DocTransporteDirecta);

					// doc.rect(cordX+150, cordY, 37, 6);//Horizontal
					// doc.text(cordX+152, cordY+4, 'Doc. Transp. Máster');
					// doc.text(cordX+158, cordY+12, value.DocTransporteMaster);
					
				}
				var setCuerpoDetalle = function (value) {
					var coordX = 6;
					var coordY = 40;
					//doc.rect(8, 17, 130, 47);//Contorno de una linea
					
					/*
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**nroManifiestoCarga**", value.NumeroManifiesto);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**nroVuelo**", value.NumeroVuelo);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**nroDocumentoTransporte**", value.DocTransporteMaster);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**codPuntoLlegada**", value.NumeroInventario.PuntoLlegada);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**nomPuntoLlegada**", value.NumeroInventario.PuntoLlegadaDescripcion);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**fechaVuelo**", value.NumeroInventario.ManifiestoFechaLlegadaATAString);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**horaVuelo**", value.NumeroInventario.ManifiestoFechaHoraLlegadaATAString.slice(11));
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**fechaTarja**", value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					value.BaseLegalMaster = value.BaseLegalMaster.replace("**horaTarja**", value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					*/
					
					var sPuntoLlegada = value.NumeroInventario.PuntoLlegadaDescripcion.split('-');
					var sDesPuntoLlegada = sPuntoLlegada.length > 1 ? sPuntoLlegada[1] : sPuntoLlegada[0];
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY, "Siendo las               horas del                  en las  instalaciones  de  nuestro  Terminal  de  Carga   Aéreo  –  Punto   de   Llegada");
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+17, coordY, value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+47, coordY, value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					var textoSegundaLinea = "                                                                         identificado con código de aduanas N°        , se llevó a cabo la verificación física"
					doc.text(coordX, coordY+3.5, textoSegundaLinea);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX, coordY+3.5, sDesPuntoLlegada);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+132.5, coordY+3.5, value.NumeroInventario.PuntoLlegada);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+7, "de los bultos arribados en mala condición exterior, los mismos que arribaron en el vuelo               a las              , de conformidad");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+10.5, "del día                  al amparo del documento de transporte N°                      y manifiesto de carga de ingreso N°");
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+138, coordY+7, value.NumeroVuelo);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 160.5, coordY+7, value.NumeroInventario.ManifiestoFechaHoraLlegadaATAString.slice(11));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 11.7, coordY+10.5, value.NumeroInventario.ManifiestoFechaLlegadaATAString);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 96, coordY+10.5, value.DocTransporteMaster);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 173, coordY+10.5, value.NumeroManifiesto);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+14.3, "con lo establecido en los artículos 102° y 106° de la Ley General de Aduanas aprobada por  Decreto Legislativo  N° 1053  y el");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+18, "artículo 138° e inciso d) del artículo 146° de su Reglamento aprobado por Decreto Supremo N° 010-2009-EF en concordancia");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+22, "con lo establecido en el numeral 3 de la sección IV del Procedimiento General “Manifiesto de Carga” DESPA-PG.09 versión 7,");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+25.7, "aprobado por Resolución de Superintendencia N° 016-2020/SUNAT, el cual señala que:");
					
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+47.6, '“');
					
					doc.setFont('arial', 'bold');
					doc.text(coordX + 1.5, coordY+47.6, "IV. DEFINICIONES Y ABREVIATURAS ");
					
					
					doc.setFontSize(10.5);
					doc.setFont('arial', 'normal');
					//utilController.alignTextJsPDF(doc,value.BaseLegalMaster,coordX,coordY,180,"justify");    
					//doc.text(coordX, coordY, value.BaseLegalMaster);
					
					coordY = coordY + 23;
					doc.setDrawColor(0, 0, 0);
					doc.roundedRect(coordX - 2, coordY + 18, 200, 33, 3, 3);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'italic');
					utilController.alignTextJsPDF(doc,value.BaseLegalMasterCita,coordX,coordY+22,180,"justify");    
					//doc.text(coordX, coordY+22, value.BaseLegalMasterCita);
					
					coordY = coordY + 3;
					doc.setFont('arial', 'normal');
					// doc.text(coordX, coordY+56, 'TRANSPORTISTA');
					// doc.text(coordX+45, coordY + 56, ": "+(value.Transportista.length > 57 ? value.Transportista.substring(0,56) : value.Transportista));
					// doc.rect(coordX+47, coordY + 56.5, 130, 0);//Horizontal

					doc.text(coordX, coordY+61, 'CONSIGNATARIO');
					doc.text(coordX+45, coordY +61, ": "+(value.Consignatario.length > 57 ? value.Consignatario.substring(0,56) : value.Consignatario));
					doc.rect(coordX+47, coordY + 61.5, 130, 0);//Horizontal

					var contenedor;
					if (value.Contenedor){
						contenedor=value.Contenedor;
					} else {
						contenedor='(S/C)';
					}
					
					doc.text(coordX, coordY+66, 'CONTENEDOR');
					doc.text(coordX+45, coordY + 66, ": "+(contenedor.length > 57 ? contenedor.substring(0,56) : contenedor));
					doc.rect(coordX+47, coordY + 66.5, 130, 0);//Horizontal

					doc.text(coordX, coordY+71, 'DESCRIPCIÓN');
					doc.text(coordX+45, coordY + 71, ": "+(value.Descripcion.length > 50 ? value.Descripcion.substring(0,49) : value.Descripcion));
					doc.rect(coordX+47, coordY + 71.5, 130, 0);//Horizontal
					
					
					////////////////////////////////////////////////

					var cordXSub = 30;
					var cordYSub = 145;
					doc.setFont('arial', 'bold');
					doc.rect(cordXSub, cordYSub, 35, 6);//Horizontal
					doc.text(cordXSub+8, cordYSub+4, 'Total Bultos');
					doc.text(cordXSub+16, cordYSub+11, value.aDetalle.BultosRecibidos);

					doc.rect(cordXSub+37, cordYSub, 35, 6);//Horizontal
					doc.text(cordXSub+39, cordYSub+4, 'Bultos mal estado');
					doc.text(cordXSub+51, cordYSub+11, value.aDetalle.BultosMalos);

					doc.rect(cordXSub+74, cordYSub, 35, 6);//Horizontal
					doc.text(cordXSub+82, cordYSub+4, 'Peso Total');
					doc.text(cordXSub+90, cordYSub+11, value.aDetalle.PesoRecibidos);

					doc.rect(cordXSub+111, cordYSub, 35, 6);//Horizontal
					doc.text(cordXSub+114, cordYSub+4, 'Peso mal estado');
					doc.text(cordXSub+125, cordYSub+11, value.aDetalle.PesoMalos);

					var cordXComent = 14;
					var cordYComent = 165;
					doc.text(cordXComent, cordYComent, 'DESCRIPCIÓN DE LA INCIDENCIA:');
					doc.rect(cordXComent, cordYComent+0.5, 59, 0);//Horizontal

					doc.setFont('arial', 'normal');
					utilController.alignTextJsPDF2(doc,value.Observacion,cordXComent,cordYComent+9,180,"justify");
					//doc.text(cordXComent, cordYComent+9, value.Observacion);
					//doc.rect(cordXComent, cordYComent+10, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+16, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+22, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+28, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+34, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+40, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+46, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+52, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+58, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+64, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+70, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+76, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+82, 180, 0);//Horizontal
					//doc.rect(cordXComent, cordYComent+60, 180, 0);//Horizontal
	
					cordYComent = cordYComent + 8;
					doc.rect(cordXComent+25, cordYComent+100, 55, 0);//Horizontal
					doc.text(cordXComent+35, cordYComent+104, 'Nombres y Apellidos');
					doc.text(cordXComent+39, cordYComent+108, 'Transportista');

					doc.rect(cordXComent+98, cordYComent+100, 55, 0);//Horizontal
					doc.text(cordXComent+108, cordYComent+104, 'Nombres y Apellidos');
					doc.text(cordXComent+109, cordYComent+108, 'Depósito Temporal');
					
				};
				
				var setDetalleSegundaPagina = function (value) {
					
					var sPuntoLlegada = value.NumeroInventario.PuntoLlegadaDescripcion.split('-');
					var sDesPuntoLlegada = sPuntoLlegada.length > 1 ? sPuntoLlegada[1] : sPuntoLlegada[0];
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(10);
					doc.text(13, 30, 'FOTOS DE BULTOS ARRIBADOS EN MALA CONDICION EXTERIOR – ACTA DE INVENTARIO N° '+ value.NumeroActaInventario);
					
					var coordX = 9;
					var coordY = 40;
					
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{nroManifiestoCarga}}", value.NumeroManifiesto);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{actaInventario}}", value.NumeroActaInventario);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{nroDocumentoTransporte}}", value.DocTransporteDirecta);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{codPuntoLlegada}}", value.NumeroInventario.PuntoLlegada);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{nomPuntoLlegada}}", value.NumeroInventario.PuntoLlegadaDescripcion);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{fechaTarja}}", value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					value.BaseLegalMasterMalaCond = value.BaseLegalMasterMalaCond.replace("{{horaTarja}}", value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					
					var sPuntoLlegada = value.NumeroInventario.PuntoLlegadaDescripcion.split('-');
					var sDesPuntoLlegada = sPuntoLlegada.length > 1 ? sPuntoLlegada[1] : sPuntoLlegada[0];
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY, "Conforme a lo descrito en la sección  “DESCRIPCIÓN DE LA INCIDENCIA” del  ACTA  DE  INVENTARIO  N°");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 173, coordY, value.NumeroActaInventario);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+4, "formulada a las                horas del                   en las instalaciones del Depósito Temporal");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+25, coordY+4, value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+56, coordY+4, value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+142, coordY+4, sDesPuntoLlegada.substring(0, 24));
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX + 15, coordY+7.8, "              identificado con código de aduanas N°        , a   través   del  presente   documento  se deja  constancia");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX, coordY+7.8, sDesPuntoLlegada.substring(24, sDesPuntoLlegada.length));

					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+89.5, coordY+7.8, value.NumeroInventario.PuntoLlegada);

					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+11.6, "de  la  recepción  de  los bultos arribados   en   mala  condición   exterior   correspondiente   al  documento  de  transporte");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+15.6, "N°                          y manifiesto de carga de ingreso N°");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+5, coordY+15.6, value.DocTransporteDirecta);

					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+87, coordY+15.6, value.NumeroManifiesto + ":");
					
					doc.setDrawColor(0, 0, 0);
					doc.roundedRect(coordX-2, coordY + 25, 195, 33, 3, 3);
							
					doc.setFont('arial', 'italic');
					utilController.alignTextJsPDF(doc,value.BaseLegalMasterMalaCondCita,coordX,coordY+30,180,"normal");   
					
					if (value.Fotos.length > 0){
						doc.setFont('arial', 'bold');
						cCodigoUA++;
						doc.text(coordX + 5, coordY + 64.5, "HOUSE N°: " + value.Fotos[1]);
						doc.setFont('arial', 'bold');
						cCodigoUA++;
						doc.text(coordX + 5, coordY + 70, "UA N°: " + value.Fotos[0]);	
					}
					
					coordX = coordX + 4;
					coordY = coordY + 73;
					doc.rect(coordX, coordY, 80, 87);
					doc.rect(coordX + 100, coordY, 80, 87);
					doc.rect(coordX, coordY + 90, 80, 87);
					doc.rect(coordX + 100, coordY + 90, 80, 87);
				};

				var setFooter = function (value, cord_x) {
				};
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					setCuerpoDetalle(value);
					setFooter(value);
				};
				
				var setSegundaPagina = function (Detalle) {
					doc.addPage();
					setCabecera(value);
					setDetalleSegundaPagina(value);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				setSegundaPagina(Detalle);

				var cX = 16;
				var cY = 40;
				var cPaginasFoto = 0;			
				if (value.Fotos.length > 0){
					var imgX = 22;
					var imgY = 108;
					var cLoad = 0;
					var cImgPage = 1;
					var cSinImg = 1;
					
					/*$.each(value.Fotos, function(i, e){
						
						var img1 = new Image();
						if (e.indexOf("SaasaService") > -1){
							img1.src = e	
						}else{
							cSinImg++;
						}
						img1.onload = function(){
							if (img1.src != ""){
								if (cLoad > 0){
									if (cLoad%4==0){
										doc.addPage();
										
										
										var idxCodigoHouse = cCodigoUA + cLoad + 1;
										doc.setFont('arial', 'bold');
										cCodigoUA++;
										doc.text(cX + 2, cY - 7.5, "HOUSE N°: " + value.Fotos[idxCodigoHouse]);
										idxCodigoHouse--;
										doc.setFont('arial', 'bold');
										cCodigoUA++;
										doc.text(cX + 2, cY - 3, "UA  N°: " + value.Fotos[idxCodigoHouse]);
						
						
										doc.rect(cX, cY, 80, 87);
										doc.rect(cX + 100, cY, 80, 87);
										doc.rect(cX, cY + 90, 80, 87);
										doc.rect(cX + 100, cY + 90, 80, 87);
									
										cImgPage = 1;
									}	
								}
								
								switch(cImgPage){
									case 1:
										imgX = 18;
										imgY = cLoad<4?114:42;
										break;
									case 2:
										imgX = 118;
										imgY = cLoad<4?114:42;
										break;
									case 3:
										imgX = 18;
										imgY = cLoad<4?204:132;
										break;
									case 4:
										imgX = 118;
										imgY = cLoad<4?204:132;
										break;
								}
								
								doc.addImage(img1, 'JPEG', imgX, imgY, 76, 84);	
								
								if (cLoad==(value.Fotos.length-cSinImg)){
									Busy.close();
									var pageCount = doc.internal.getNumberOfPages();	
									//doc.deletePage(pageCount);
									doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');	
								}
								
								cLoad++;
								cImgPage++;	
							}
						};
					});*/
					
					$.each(value.Fotos, function(i, e){
						var img1 = new Image();
						if (e.indexOf("SaasaService") > -1){
							imagenes.push(e);
							img1.src = e	
						}else{
							cSinImg++;
						}
					});
					
					if ((imagenes.length-1) == (value.Fotos.length - cSinImg)){
						t.loadImage(doc, value, cSinImg, {cX: cX-3.7, cY: cY}, {y1: 114, y2: 204}, 2);	
					}
				}else{
					sap.ui.core.BusyIndicator.hide()
					Busy.close();
					
					doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
				}
				//terminosCondiciones(value);
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFActaTrasladoMaster: function (value) {
			$.generarPDF = function (value) {
				var doc = new jsPDF('p', 'mm', 'a4');
				
				var construirFormato = function (value) {
					var coord_x, coord_y;
					
					coord_x = 15;
					coord_y = 15;
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(10);
					doc.text(95, coord_y, 'ANEXO X');
					doc.text(60, coord_y+5, 'ACTA DE TRASLADO ENTRE DEPÓSITOS TEMPORALES');
					
					
					doc.setFont('arial', 'normal');
					doc.setFontSize(7);
					doc.text(coord_x, coord_y+15, 'Participantes:');
					
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+20, 175, 39);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+20.4, 40, 38.2,'F');
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(7);
					doc.text(coord_x+2, coord_y+26, 'Depósito temporal de origen:');
					doc.text(coord_x+42, coord_y+26, value.DepositoTemporal);
					doc.text(coord_x+2, coord_y+35, 'Representante legal:');
					doc.text(coord_x+42, coord_y+35, value.RepresentanteLegalOrigen);
					doc.text(coord_x+2, coord_y+44, 'Depósito temporal de destino:');
					doc.text(coord_x+42, coord_y+44, value.DescripcionSaasa);
					doc.text(coord_x+2, coord_y+53, 'Representante legal:');
					doc.text(coord_x+42, coord_y+53, value.RepresentanteLegalOrigen)
					
					doc.setFont('arial', 'normal');
					doc.text(coord_x, coord_y+70, 'Información de carga trasladada:');
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+75, 175, 30);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+75.4, 174.2, 8,'F');
					
					doc.setFont('arial', 'bold');
					doc.text(coord_x+6, coord_y+80, 'Manifiesto de carga');
					doc.text(coord_x+43, coord_y+80, 'Documento de transporte');
					doc.text(coord_x+83, coord_y+80, 'Cantidad de bultos');
					doc.text(coord_x+90, coord_y+88, value.aDetalle == null ? "" : value.aDetalle.BultosManifestados);
					doc.text(coord_x+117, coord_y+80, 'Peso total');
					doc.text(coord_x+119, coord_y+88, value.aDetalle == null ? "" : value.aDetalle.PesoManifestados);
					doc.text(coord_x+140, coord_y+80, 'Precinto aduanero N°');
					
					
					doc.setFont('arial', 'normal');
					doc.text(coord_x, coord_y+118, 'Información del medio de transporte:');
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+123, 175, 30);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+123.4, 174.2, 8,'F');
					
					doc.setFont('arial', 'bold');
					doc.text(coord_x+10, coord_y+128, 'Tipo de vehículo / marca');
					doc.text(coord_x+70, coord_y+128, 'Placa del vehículo');
					doc.text(coord_x+74, coord_y+136, value.Matricula);
					doc.text(coord_x+130, coord_y+128, 'Observaciones');
					
					doc.setLineWidth(0.1);
					doc.rect(coord_x, coord_y+165, 70, 10);
					doc.text(coord_x+5, coord_y+173, 'Lugar: .......................................');
					
					doc.rect(coord_x+105, coord_y+165, 70, 10);
					doc.text(coord_x+110, coord_y+173, 'Fecha de traslado: ........./........./...............');
					
					doc.rect(coord_x+5, coord_y+210, 50, 0);
					doc.setFont('arial', 'normal');
					doc.text(coord_x+10, coord_y+213, 'FIRMA DEL CONDUCTOR:');
					doc.text(coord_x+10, coord_y+217, 'NOMBRE:');
					doc.text(coord_x+10, coord_y+221, 'LICENCIA DE CONDUCIR:');
					
				};
				
				construirFormato(value);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				
				doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
			};
			$.generarPDF(value);
		},
		onGenerarPDFAnexo6ManifiestoCargaDC: function (value) {
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('l', 'mm', 'a4');
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (value) {
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (value) {
					var arrayLinea	=	[];
					var arrayCampo	=	[];
					var arrayFooter	=	[];
					var arrayFooterTotal	=	[];
					var DocumentosTransporte	=	value.aDetalle;
					
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);
							arrayCampo.push(obj.DocumentoTransporteHouse);
							arrayCampo.push(obj.Consignatario);
							arrayCampo.push(obj.ConsignatarioDescripcionTipoIdentificacion);
							arrayCampo.push(obj.ConsignatarioIdentificacion);
							arrayCampo.push(obj.NumeroContenedor);
							// arrayCampo.push(obj.Destino);
							arrayCampo.push(obj.Marcas);
							arrayCampo.push(obj.Bultos);
							arrayCampo.push(obj.Peso);
							arrayCampo.push(obj.Descripcion);
						}
						arrayLinea.push(arrayCampo);
					}
					
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					// arrayFooter.push("");
					arrayFooter.push("TOTALES: ");
					arrayFooter.push(value.totalBultosManif);
					arrayFooter.push(value.totalPesoManif);
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 70;
					const headerTable = [
						{ title: "", dataKey: 1 },
						{ title: "", dataKey: 2 },
						{ title: "", dataKey: 3 },
						{ title: "", dataKey: 4 },
						{ title: "", dataKey: 5 },
						{ title: "", dataKey: 6 },
						{ title: "", dataKey: 7 },
						{ title: "", dataKey: 8 },
						{ title: "", dataKey: 9 },
						{ title: "", dataKey: 10 }
						// { title: "", dataKey: 11 }
					];
//
					doc.autoTable(headerTable,arrayLinea,{
						startY: finalY,
						body: arrayLinea,
						theme: 'plain',
						foot: arrayFooterTotal,
						showFoot: 'lastPage',
						showHead: 'never',
						bodyStyles: {valign: 'top'},
						footStyles: {halign: 'center', cellPadding: {top: 3.5, bottom: 1.5, left: 0.2, right: 0.2}, cellWidth: 0},
						margin: {top: 70, right: 15, bottom: 22, left: 14},
						styles: {
									rowPageBreak: 'auto',
									fontSize:6.5,
									textColor:[0, 0, 0],
									valign: 'top',
									minCellWidth: 1.2,
									minCellHeight: 12,
									cellPadding: {top: 1.5}
						},
						didDrawCell: data => {
							if (data.section === 'foot' && data.column.index === 0) {
								// Footer
								var coordX = data.settings.margin.left;
								var coordY = doc.internal.pageSize.height-15;
								
								doc.text(coordX + 53, coordY - 14, 'Cantidad Total de Documentos de Transporte House:', 'right');
								doc.text(coordX + 60, coordY - 14, value.CantidadDocumentos, 'right');
								// doc.text(coordX + 53, coordY - 44, 'Capitán de la Nave:', 'right')
								// doc.text(coordX + 53, coordY - 48, 'N° Doc. Identidad:', 'right');
								
								doc.setDrawColor(0, 0, 0);
								//doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);
								doc.setFontSize(9.5);
								doc.setFont('sans-serif', 'normal');
								doc.setTextColor(0, 0, 0)
								var widthPageMargin	=	doc.internal.pageSize.width - (data.settings.margin.left + data.settings.margin.right)
								var baseLegal 		= 	doc.splitTextToSize(value.BaseLegalAnexo6MasterDirecta);
								var coordYBaseLegal	=	coordY+3.5;
	
								var coordX2	=	doc.internal.pageSize.width;
								var coordY2	=	doc.internal.pageSize.height;
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
	
								// Obtiene el ancho de cada texto para luego pintar la linea 
								var sign1Width	=	doc.getTextWidth(value.RazonSocialAerolinea);
								var textoFijo	=	'FIRMA DE AGENTE DE CARGA INTERNACIONAL';
	
								doc.line((coordX2/2)-70, coordY2-18, (coordX2/2)+50+30, coordY2-18)
								doc.text((coordX2/2)+40, coordY2-10, textoFijo, 'right');
							}
						},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							// Membrete
							var cord_X = 240;
							var cord_y = 6;

						/////////////////////////////
						var date = new Date();
						var yyyy = date.getFullYear().toString();
						var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
						var dd = utilController.pad(date.getDate().toString(),"0",2);
						var h = utilController.pad(date.getHours(),"0", 2);
						var m = utilController.pad(date.getMinutes(),"0", 2);
						var s = utilController.pad(date.getSeconds(),"0", 2);
						var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding
						/////////////////////////////

							doc.setFontSize(10);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X-230, cord_y+7, value.AgenteCargaInternacional);
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-230, cord_y+11, "Dirección: " + value.ConsignatarioDireccion);
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-230, cord_y+15, "RUC: " + value.AgenteCargaIdentificacion);
							
							doc.setFontSize(7);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X+42, cord_y+7,"Fecha: " + fechaActual,'right');
							// doc.setFontSize(7);
							// doc.setFont('arial', 'normal');
							// doc.text(cord_X+42, cord_y+11, "",'right');
							// doc.setFontSize(7);
							// doc.setFont('arial', 'normal');
							// doc.text(cord_X+42, cord_y+15, fechaActual,'right');
							
							// Títutlo 
							doc.setFont('arial', 'bold');
							doc.setFontSize(9);
							doc.text(140, 22, 'ANEXO VI');

							doc.setFont('arial', 'bold');
							doc.setFontSize(11);
							doc.text(90, 27, 'MANIFIESTO DE CARGA DESCONSOLIDADO / CONSOLIDADO');

							// Formulario de transporte
							//Primera columna del formulario
							var coordX = 95;
							var coordY = 25;
							doc.setFontSize(7.5);
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'Manifiesto de carga general','right');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+1, coordY + 11, ': ' + value.Manifiesto);
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'N° Ticket','right');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+1, coordY + 15, ': ' + value.TicketNumeracion);
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 19, 'Manifiesto de carga desconsolidado / consolidado','right');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+1, coordY + 19, ': ' + "");
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 23, 'Documento de transporte máster','right');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+1, coordY + 23, ': ' + value.DocumentoTransporteMaster);

							//Segunda columna del formulario
							var coordX = 205;
							var coordY = 25;
							doc.setFontSize(7.5);
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'Fecha Estimada de Llegada','right');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+1, coordY + 11, ': ' + value.TransporteFechaEstimadaLlegada);
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'Transportista','right');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+1, coordY + 15, ': ' + value.TransportistaNombre);
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 19, 'Número de Vuelo','right');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+1, coordY + 19, ': ' + value.NumeroVuelo);
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 23, 'Origen','right');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+1, coordY + 23, ': ' + value.OrigenDescripcion);

							// Header de la tabla (no va en autotable porque tiene varios niveles)			
							var coordX = 14;
							var coordY = 54;
							doc.setFontSize(6.5);

							// Contorno de linea de la cabecera
							doc.setDrawColor(0, 0, 0);
							doc.rect(coordX, coordY, 269, 12);

							// Cabecera
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX + 5, coordY + 6, 'N°');
							
							doc.text(coordX + 23, coordY + 5, 'Documento de');
							doc.text(coordX + 22, coordY + 7, 'transporte house');

							doc.text(coordX + 58, coordY + 6, 'Consignatario');

							doc.text(coordX + 92, coordY + 5, 'Tipo de');
							doc.text(coordX + 91, coordY + 7, 'Documento');
							
							doc.text(coordX + 117, coordY + 6, 'N° Documento');
							
							doc.text(coordX + 150, coordY + 6, 'Contenedor');
							// doc.text(coordX + 150, coordY + 7, 'Origen');
							
							// doc.text(coordX + 159, coordY + 5, 'Puerto');
							// doc.text(coordX + 159, coordY + 7, 'Destino');
							
							doc.text(coordX + 173, coordY + 5, 'Marcas-');
							doc.text(coordX + 173, coordY + 7, 'precintos');
							
							doc.text(coordX + 188, coordY + 5, 'Cantidad de');
							doc.text(coordX + 191, coordY + 7, 'bultos');
							
							doc.text(coordX + 205, coordY + 6, 'Peso bruto');
							
							doc.text(coordX + 225, coordY + 6, 'Descripción de mercancías');
							//Inicio Línea Foot para el total Dinámico
							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 282, footY);
							//End Línea Foot para el total Dinámico
							
							// Contador
							var str = "Pág. " + doc.internal.getNumberOfPages();

							if (typeof doc.putTotalPages === 'function') {
								str = str + "/" + totalPagesExp;
							}
							// Ubica donde se va a pintar el contador de paginas
							doc.setFontSize(6);
							var pageSize = doc.internal.pageSize;
							var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
							doc.text(str, data.settings.margin.left+282, pageHeight - 193, 'right');
							
							
						},
        				columnStyles:	{
    										1: {cellWidth: 3.5, halign: 'center'},
    										2: {cellWidth: 8, halign: 'center'},
        									3: {cellWidth: 10.5, halign: 'center'},
        									4: {cellWidth: 5, halign: 'center'},
        									5: {cellWidth: 9, halign: 'center'},
        									6: {cellWidth: 7, halign: 'center'},//Bulto bueno
        									// 7: {cellWidth: 4, halign: 'center'},//Bulto malo
        									7: {cellWidth: 4, halign: 'center'},//Peso bueno
        									8: {cellWidth: 4, halign: 'center'},//Peso malo
        									9: {cellWidth: 4, halign: 'center'},//N° Acta Inventario
        									10: {cellWidth: 13, halign: 'center'},//Descripcion Incidencia
        								}
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp);
					}
				};

				var setFooter = function (value, cord_x) {
					var coordX	=	doc.internal.pageSize.width;
					var coordY	=	doc.internal.pageSize.height;
					doc.setFontSize(7.5);
					doc.setFont('sans-serif', 'bold');
					
				};
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					//setCuerpoDetalle(value);
					for(var i in value){
						var valueMaster = value[i];
						setCuerpoDetalle(valueMaster);
						if(i!=value.length-1){
							doc.addPage();
						}
					}
					setFooter(value);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				doc.save("DOCUMENTO-" + value[0].Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFActaInventarioHouse: function (value) {
			imagenes = [];
			cCodigoUA = 0;
			cLoad = 0;
			cImgPage = 1;
			var t = this;
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('p', 'mm', 'a4');
				var setCabecera = function (value) {
					var cord_X = 165;
					var cord_y = 5;
					var pic = imgSaasa;
					doc.addImage(pic, 'JPG',cord_X , cord_y-1, 27*1.4142, 9*1.4142);	
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(12, 10, value.DescripcionSaasa);
					doc.setFontSize(9);
					doc.setFont('arial', 'normal');
					doc.text(12, 14.5, 'R.U.C.: '+value.RucSaasa);
					doc.text(12, 18, 'Dirección: '+value.DireccionFiscal);
					/////////////////////////////
					var date = new Date();
					var yyyy = date.getFullYear().toString();
					var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
					var dd = utilController.pad(date.getDate().toString(),"0",2);
					var h = utilController.pad(date.getHours(),"0", 2);
					var m = utilController.pad(date.getMinutes(),"0", 2);
					var s = utilController.pad(date.getSeconds(),"0", 2);
					var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
					/////////////////////////////
					// doc.text(cord_X, cord_y, "Callao, "+fechaActual+" "+h+":"+m+":"+s);
				};
				var setSubCabecera = function (value) {
					doc.setFont('arial', 'bold');
					doc.setFontSize(10*1.4142);
					doc.text(62, 30, 'ACTA DE INVENTARIO N° '+value.NumeroActaInventario);
				};

				var cordYLVertical = 120;
				var profundidadLVertical = 88.8;
				var setHeaderDetalle = function (value) {
					// Celdas 1
					var cord_X = 115*1.4142;
					var cord_y = 18*1.4142;
					// doc.setFontSize(7*1.4142);
					// doc.rect(8*1.4142, 30*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					// doc.setFont('arial', 'bold');
					// doc.text(15*1.4142, 33*1.4142, 'Manifiesto');
					// doc.setFont('arial', 'normal');
					// doc.text(10.2*1.4142, 40*1.4142, value.NumeroManifiesto);

					// doc.rect(35*1.4142, 30*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					// doc.setFont('arial', 'bold');
					// doc.text(38.4*1.4142, 33*1.4142, 'Fecha ingreso');
					// doc.setFont('arial', 'normal');
					// doc.text(42*1.4142, 40*1.4142, value.FechaLlegada);

					// doc.rect(62*1.4142, 30*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					// doc.setFont('arial', 'bold');
					// doc.text(72*1.4142, 33*1.4142, 'Vuelo');
					// doc.setFont('arial', 'normal');
					// doc.text(68*1.4142, 40*1.4142, value.NumeroVuelo);

					// doc.rect(89*1.4142, 30*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					// doc.setFont('arial', 'bold');
					// doc.text(90.5*1.4142, 33*1.4142, 'Doc. trans. máster');
					// doc.setFont('arial', 'normal');
					// doc.text(94.5*1.4142, 40*1.4142, value.MAWB);

					// doc.rect(116*1.4142, 30*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					// doc.setFont('arial', 'bold');
					// doc.text(117.2*1.4142, 33*1.4142, 'Doc. transp. House');
					// doc.setFont('arial', 'normal');
					// doc.text(122*1.4142, 40*1.4142, value.HAWB);
					
				}
				var setCuerpoDetalle = function (value) {
					// Texto informativo del manifiesto  
					var coordX = 12;
					var coordY = 40;
					//doc.setFontSize(7*1.4142);
					
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{nroManifiestoCarga}}", value.NumeroManifiesto);
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{nroVuelo}}", value.NumeroVuelo);
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{nroDocumentoTransporte}}", value.DTCodigo);
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{codDepositoTemporal}}", value.DTDepositoTemporal);
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{nomDepositoTemporal}}", value.DTDepositoTemporalDescripcion);
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{fechaVuelo}}", value.NumeroInventario.ManifiestoFechaLlegadaATAString);
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{horaVuelo}}", value.NumeroInventario.ManifiestoFechaHoraLlegadaATAString.slice(11));
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{fechaTarja}}", value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					value.BaseLegalHouse = value.BaseLegalHouse.replace("{{horaTarja}}", value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					
					var sPuntoLlegada = value.NumeroInventario.PuntoLlegadaDescripcion.split('-');
					var sDesPuntoLlegada = sPuntoLlegada.length > 1 ? sPuntoLlegada[1] : sPuntoLlegada[0];
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY, "Siendo las               horas del                  en   las  instalaciones   del   Depósito   Temporal ");
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+17, coordY, value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+46.5, coordY, value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+141, coordY, sDesPuntoLlegada.substring(0, 24));
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+3.5, "                        identificado  con  código  de  aduanas  N°        , se   llevó   a   cabo  la   verificación   física  de   los  bultos");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX, coordY+3.5, sDesPuntoLlegada.substring(24, sDesPuntoLlegada.length));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+89.5, coordY+3.5, value.DTDepositoTemporal);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+7.3, "arribados en mala condición exterior, los  mismos  que  arribaron en el  vuelo               a  las                 del  día               ");
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+122, coordY+7.3, value.NumeroVuelo);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 145, coordY+7.3, value.NumeroInventario.ManifiestoFechaHoraLlegadaATAString.slice(11));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 174, coordY+7.3, value.NumeroInventario.ManifiestoFechaLlegadaATAString);

					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+10.8, "al  amparo  del documento de transporte  N°                          y  manifiesto de  carga  de  ingreso  N°                          ,  de");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 70, coordY+10.8, value.DTCodigo);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX + 156, coordY+10.8, value.NumeroManifiesto);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+14.3, "conformidad  con  lo establecido  en  los  artículos 102°  y  106°  de  la  Ley  General  de  Aduanas aprobada por Decreto");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+17.8, "Legislativo  N° 1053 y el artículo 138° e inciso d)  del  artículo 146° de su Reglamento aprobado por Decreto Supremo N°");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+21.3, "010-2009-EF en concordancia con lo establecido en el numeral 3 de la sección IV del Procedimiento General “Manifiesto");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+24.8, "de Carga” DESPA-PG.09 versión 7, aprobado por Resolución de Superintendencia N° 016-2020/SUNAT, el  cual señala");
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+28.3, "que:");
					
					
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+47.6, '“');
					
					doc.setFont('arial', 'bold');
					doc.text(coordX + 1.5, coordY+47.6, "IV. DEFINICIONES Y ABREVIATURAS ");
					
					doc.setFontSize(10.5);
					doc.setFont('arial', 'normal');
					doc.setFontType('normal');
					//utilController.alignTextJsPDF(doc,value.BaseLegalHouse,coordX,coordY,180,"normal");    
					//doc.text(10*1.4142, 47.5*1.4142, value.BaseLegalHouse);
					
					coordY = coordY + 23;
					doc.setDrawColor(0, 0, 0);
					doc.roundedRect(coordX - 2, coordY + 17, 185, 33, 3, 3);
					
					doc.setFontSize(10);
					doc.setFontType('italic');
					utilController.alignTextJsPDF(doc,value.BaseLegalHouseCita,coordX,coordY+22,180,"normal");    
					//doc.text(10*1.4142, 59*1.4142, value.BaseLegalHouseCita);
					doc.setFontType('normal');
					
					// Formulario
					var contenedor;
					if (value.DiceContener){
						contenedor=value.DiceContener;
					} else {
						contenedor='(S/C)';
					}
					doc.setFontType('normal');
					doc.setFont('arial', 'normal');
					var coordX = 10*1.4142;
					var coordY = 65*1.4142;
					
					coordY = coordY + 18;
					doc.setFontSize(8*1.4142);
					doc.setFont('helvetica');
					doc.text(coordX, coordY + 8*1.4142, 'TRANSPORTISTA');
					doc.text(coordX+28*1.4142, coordY + 8*1.4142, ': ' + (value.EmpresaTransportista.length > 57 ? value.EmpresaTransportista.substring(0,56) : value.EmpresaTransportista));
					doc.text(coordX, coordY + 11.5*1.4142, 'CONSIGNATARIO');
					doc.text(coordX+28*1.4142, coordY + 11.5*1.4142, ': ' + (value.Consignatario.length > 57 ? value.Consignatario.substring(0,56) : value.Consignatario));
					//utilController.alignTextCutPhraseJsPDF(doc,value.Consignatario,coordX,coordY + 11.5*1.4142,180,"justify");
					doc.text(coordX, coordY + 15*1.4142, 'CONTENEDOR');
					doc.text(coordX+28*1.4142, coordY + 15*1.4142, ': ' + (contenedor.length > 57 ? contenedor.substring(0,56) : contenedor));
					doc.text(coordX, coordY + 18.5*1.4142, 'DESCRIPCIÓN');
					doc.text(coordX+28*1.4142, coordY + 18.5*1.4142, ': ' + (value.Descripcion.length > 50 ? value.Descripcion.substring(0,49) : value.Descripcion));
					
					// Celdas 2
					var cord_X = 15*1.4142;
					var cord_y = 95*1.4142;
					cord_y = cord_y + 13;
					doc.setFontSize(7*1.4142);
					doc.rect(cord_X, cord_y-3*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					doc.setFont('arial', 'bold');
					doc.text(cord_X+6*1.4142, cord_y, 'Total bultos');
					doc.setFont('arial', 'normal');
					doc.text(cord_X+12*1.4142, cord_y+7*1.4142, value.aDetalle.BultosRecibidos);
					
					var cord_X = 45*1.4142;
					var cord_y = 95*1.4142;
					cord_y = cord_y + 13;
					doc.setFontSize(7*1.4142);
					doc.rect(cord_X, cord_y-3*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					doc.setFont('arial', 'bold');
					doc.text(cord_X+2.5*1.4142, cord_y, 'Bultos mal estado');
					doc.setFont('arial', 'normal');
					doc.text(cord_X+12*1.4142, cord_y+7*1.4142, value.aDetalle.BultosMalos);
					
					var cord_X = 75*1.4142;
					var cord_y = 95*1.4142;
					cord_y = cord_y + 13;
					doc.setFontSize(7*1.4142);
					doc.rect(cord_X, cord_y-3*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					doc.setFont('arial', 'bold');
					doc.text(cord_X+7, cord_y, 'Peso total');
					doc.setFont('arial', 'normal');
					doc.text(cord_X+12*1.4142, cord_y+7*1.4142, value.aDetalle.PesoRecibidos);
					
					var cord_X = 105*1.4142;
					var cord_y = 95*1.4142;
					cord_y = cord_y + 13;
					doc.setFontSize(7*1.4142);
					doc.rect(cord_X, cord_y-3*1.4142, 26*1.4142, 5*1.4142);//Horizontal
					doc.setFont('arial', 'bold');
					doc.text(cord_X+3*1.4142, cord_y, 'Peso mal estado');
					doc.setFont('arial', 'normal');
					doc.text(cord_X+12*1.4142, cord_y+7*1.4142, value.aDetalle.PesoMalos);
					
					// Declaración de mercancia en mal estado 
					var coordX = 10*1.4142;
					var coordY = 120*1.4142;
					doc.setFontSize(8*1.4142);
					doc.line(coordX, coordY+0.3*1.4142, 81, coordY+0.3*1.4142);
					doc.setFont('arial', 'bold');
					doc.text(coordX, coordY, 'DESCRIPCIÓN DE LA INCIDENCIA:');
					doc.setFontSize(7*1.4142);
					doc.setFont('arial', 'normal');
					utilController.alignTextJsPDF2(doc,value.Observacion,coordX,coordY+9,180,"justify");
					//doc.text(coordX, coordY+7*1.4142, value.Observacion /*'1 CAJA DE CARTÓN CON EMBALAJE ABOLLADO SIN EXPOSICIÓN DE CONTENIDO.'*/);	// TODO pregutnar a Franz de donde sacar esta info
					
				};
				
				var setDetalleSegundaPagina = function (value) {
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(10);
					doc.text(13, 30, 'FOTOS DE BULTOS ARRIBADOS EN MALA CONDICION EXTERIOR – ACTA DE INVENTARIO N° '+ value.NumeroActaInventario);
					
					var coordX = 11;
					var coordY = 40;
					
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{nroManifiestoCarga}}", value.NumeroManifiesto);
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{actaInventario}}", value.NumeroActaInventario);
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{nroDocumentoTransporte}}", value.DTCodigo);
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{codDepositoTemporal}}", value.DTDepositoTemporal);
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{nomDepositoTemporal}}", value.DTDepositoTemporalDescripcion);
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{fechaTarja}}", value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{horaTarja}}", value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{codPuntoLlegada}}", value.NumeroInventario.PuntoLlegada);
					value.BaseLegalHouseMalaCond = value.BaseLegalHouseMalaCond.replace("{{nomPuntoLlegada}}", value.NumeroInventario.PuntoLlegadaDescripcion);
					
					var sPuntoLlegada = value.NumeroInventario.PuntoLlegadaDescripcion.split('-');
					var sDesPuntoLlegada = sPuntoLlegada.length > 1 ? sPuntoLlegada[1] : sPuntoLlegada[0];
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY, "Conforme a lo descrito en la sección “DESCRIPCIÓN DE LA INCIDENCIA” del  ACTA DE INVENTARIO  N°");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+169, coordY, value.NumeroActaInventario);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+3.6, "formulada a las               horas del                  en las instalaciones del Depósito Temporal");
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+24.5, coordY+3.6, value.NumeroInventario.ManifiestoFechaHoraInicioTarjaString.slice(11));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+54, coordY+3.6, value.NumeroInventario.ManifiestoFechaInicioTarjaString);
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+139, coordY+3.6, sDesPuntoLlegada.substring(0, 24));
					
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX+23, coordY+7.2, "identificado con código de aduanas N°        , a   través  del  presente   documento   se  deja  constancia");
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX, coordY+7.2, sDesPuntoLlegada.substring(24, sDesPuntoLlegada.length));
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+84, coordY+7.2, value.DTDepositoTemporal);

					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX, coordY+10.8, "de la  recepción  de  los  bultos  arribados en mala condición exterior correspondiente al  documento   de  transporte  N°");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX, coordY+14.4, value.DTCodigo);
					
					doc.setFontSize(10);
					doc.setFont('arial', 'normal');
					doc.text(coordX+25, coordY+14.4, "y manifiesto de carga de ingreso N°");
					
					doc.setFontSize(9);
					doc.setFont('arial', 'bold');
					doc.text(coordX+83, coordY+14.4, value.NumeroManifiesto + ":");
					
					
					
					doc.setFontSize(10.5);
					doc.setFont('arial', 'normal');
					//utilController.alignTextJsPDF(doc,value.BaseLegalHouseMalaCond,coordX,coordY,180,"justify");
					
					doc.setDrawColor(0, 0, 0);
					doc.roundedRect(coordX-2, coordY + 25, 195, 33, 3, 3);
							
					doc.setFont('arial', 'italic');
					utilController.alignTextJsPDF(doc,value.BaseLegalHouseMalaCondCita,coordX,coordY+30,180,"justify");   
					
					if (value.Fotos.length > 0){
						doc.setFont('arial', 'bold');
						doc.text(coordX + 5, coordY + 64.5, "UA  N°: " + value.Fotos[0]);	
						cCodigoUA+=2;	
					}
					
					coordX = coordX + 4;
					coordY = coordY + 68;
					doc.rect(coordX, coordY, 80, 87);
					doc.rect(coordX + 100, coordY, 80, 87);
					doc.rect(coordX, coordY + 90, 80, 87);
					doc.rect(coordX + 100, coordY + 90, 80, 87);
				};

				var setFooter = function (value, cord_x) {
					// Primera firma
					doc.setFont('arial', 'bold');
					doc.setFontSize(8*1.4142);
					doc.line(13*1.4142, 186*1.4142, 64*1.4142, 186*1.4142)
					doc.text(25*1.4142, 190*1.4142, 'Nombres y apellidos');
					doc.text(18*1.4142, 194*1.4142, 'Agente de carga internacional');
					
					// Segunda firma
					doc.setFont('arial', 'bold');
					doc.setFontSize(8*1.4142);
					doc.line(83*1.4142, 186*1.4142, 134*1.4142, 186*1.4142)
					doc.text(95*1.4142, 190*1.4142, 'Nombres y apellidos');
					doc.text(97*1.4142, 194*1.4142, 'Depósito temporal');
				};
				var cordXTabla = 36*1.4142;
				var cordYTabla = 80*1.4142;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					setCuerpoDetalle(value);
					setFooter(value);
				};
				var setSegundaPagina = function (Detalle) {
					doc.addPage();
					setCabecera(value);
					setDetalleSegundaPagina(value);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				setSegundaPagina(Detalle);
				
				var cX = 16;
				var cY = 40;
				var cPaginasFoto = 0;			
				if (value.Fotos.length > 0){
					var imgX = 22;
					var imgY = 108;
					var cLoad = 0;
					var cImgPage = 1;
					var cSinImg = 1;
					/*$.each(value.Fotos, function(i, e){
						var img1 = new Image();
						if (e.indexOf("SaasaService") > -1){
							img1.src = e	
						}else{
							cSinImg++;
						}
						img1.onload = function(){
							if (cLoad > 0){
								if (cLoad%4==0){
									doc.addPage();
									
									var idxCodigoHouse = cCodigoUA + cLoad;
									doc.setFont('arial', 'bold');
									cCodigoUA++;
									doc.setFont('arial', 'bold');
									cCodigoUA++;
									doc.text(cX + 2, cY - 4.3, "UA  N°: " + value.Fotos[idxCodigoHouse]);
									
									doc.rect(cX, cY, 80, 87);
									doc.rect(cX + 100, cY, 80, 87);
									doc.rect(cX, cY + 90, 80, 87);
									doc.rect(cX + 100, cY + 90, 80, 87);
								
									cImgPage = 1;
								}	
							}
							
							switch(cImgPage){
								case 1:
									imgX = 18;
									imgY = cLoad<4?109:42;
									break;
								case 2:
									imgX = 118;
									imgY = cLoad<4?109:42;
									break;
								case 3:
									imgX = 18;
									imgY = cLoad<4?199:132;
									break;
								case 4:
									imgX = 118;
									imgY = cLoad<4?199:132;
									break;
							}
							
							doc.addImage(img1, 'JPEG', imgX, imgY, 76, 84);	
							
							if (cLoad==(value.Fotos.length-cSinImg)){
								Busy.close();
								var pageCount = doc.internal.getNumberOfPages();	
								//doc.deletePage(pageCount);
								doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');	
							}
							
							cLoad++;
							cImgPage++;
						};
					});*/
					
					$.each(value.Fotos, function(i, e){
						var img1 = new Image();
						if (e.indexOf("SaasaService") > -1){
							imagenes.push(e);
							img1.src = e	
						}else{
							cSinImg++;
						}
					});
					if ((imagenes.length-1) == (value.Fotos.length - cSinImg)){
						t.loadImage(doc, value, cSinImg, {cX: cX, cY: cY}, {y1: 109, y2: 199.6}, 3);	
					}
				}else{
					sap.ui.core.BusyIndicator.hide()
					Busy.close();
					doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
				}
				//terminosCondiciones(value);
				//doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFActaTrasladoHouse: function (value) {
			$.generarPDF = function (value) {
				var doc = new jsPDF('p', 'mm', 'a4');
				
				var construirFormato = function (value) {
					var coord_x, coord_y;
					
					coord_x = 15;
					coord_y = 15;
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(10);
					doc.text(95, coord_y, 'ANEXO X');
					doc.text(60, coord_y+5, 'ACTA DE TRASLADO ENTRE DEPÓSITOS TEMPORALES');
					
					
					doc.setFont('arial', 'normal');
					doc.setFontSize(7);
					doc.text(coord_x, coord_y+15, 'Participantes:');
					
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+20, 175, 39);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+20.4, 40, 38.2,'F');
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(7);
					doc.text(coord_x+2, coord_y+26, 'Depósito temporal de origen:');
					doc.text(coord_x+42, coord_y+26, value.DepositoTemporal);
					doc.text(coord_x+2, coord_y+35, 'Representante legal:');
					doc.text(coord_x+42, coord_y+35, value.RepresentanteLegalOrigen);
					doc.text(coord_x+2, coord_y+44, 'Depósito temporal de destino:');
					doc.text(coord_x+42, coord_y+44, value.DescripcionSaasa);
					doc.text(coord_x+2, coord_y+53, 'Representante legal:');
					doc.text(coord_x+42, coord_y+53, value.RepresentanteLegalOrigen)
					
					doc.setFont('arial', 'normal');
					doc.text(coord_x, coord_y+70, 'Información de carga trasladada:');
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+75, 175, 30);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+75.4, 174.2, 8,'F');
					
					doc.setFont('arial', 'bold');
					doc.text(coord_x+6, coord_y+80, 'Manifiesto de carga');
					doc.text(coord_x+8, coord_y+88, value.NumeroManifiesto);
					doc.text(coord_x+43, coord_y+80, 'Documento de transporte');
					doc.text(coord_x+52, coord_y+88, "Master");
					doc.text(coord_x+83, coord_y+80, 'Cantidad de bultos');
					doc.text(coord_x+90, coord_y+88, value.aDetalle == null ? "" : value.aDetalle.BultosManifestados);
					doc.text(coord_x+117, coord_y+80, 'Peso total');
					doc.text(coord_x+119, coord_y+88, value.aDetalle == null ? "" : value.aDetalle.PesoManifestados);
					doc.text(coord_x+140, coord_y+80, 'Precinto aduanero N°');
					
					
					doc.setFont('arial', 'normal');
					doc.text(coord_x, coord_y+118, 'Información del medio de transporte:');
					doc.setLineWidth(0.4);
					doc.rect(coord_x, coord_y+123, 175, 30);
					doc.setFillColor(220,220,220);
					doc.rect(coord_x+0.4, coord_y+123.4, 174.2, 8,'F');
					
					doc.setFont('arial', 'bold');
					doc.text(coord_x+10, coord_y+128, 'Tipo de vehículo / marca');
					doc.text(coord_x+70, coord_y+128, 'Placa del vehículo');
					doc.text(coord_x+130, coord_y+128, 'Observaciones');
					
					doc.setLineWidth(0.1);
					doc.rect(coord_x, coord_y+165, 70, 10);
					doc.text(coord_x+5, coord_y+173, 'Lugar: .......................................');
					
					doc.rect(coord_x+105, coord_y+165, 70, 10);
					doc.text(coord_x+110, coord_y+173, 'Fecha de traslado: ........./........./...............');
					
					doc.rect(coord_x+5, coord_y+210, 50, 0);
					doc.setFont('arial', 'normal');
					doc.text(coord_x+10, coord_y+213, 'FIRMA DEL CONDUCTOR:');
					doc.text(coord_x+10, coord_y+217, 'NOMBRE:');
					doc.text(coord_x+10, coord_y+221, 'LICENCIA DE CONDUCIR:');
					
				};
				
				construirFormato(value);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
			};
			$.generarPDF(value);
		},
		onGenerarPDFNotaContenido: function (value) {
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('p', 'mm', 'a4');
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (value) {
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (value) {
					var arrayLinea	=	[];
					var arrayCampo	=	[];
					var arrayFooter	=	[];
					var arrayFooterTotal	=	[];
					var DocumentosTransporte	=	value.aDetalle;
					
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);//Tipo Manifiesto
							arrayCampo.push(obj.DTCodigo);//cod pto
							arrayCampo.push(obj.DTDescripcion);//Doc Transp Master
							arrayCampo.push(obj.BultosManifestados);
							arrayCampo.push(obj.BultosRecibidos);
							arrayCampo.push(obj.PesoManifestados);
							arrayCampo.push(obj.PesoRecibidos);
							arrayCampo.push(obj.DiferenciaPeso);
							arrayCampo.push(obj.VolumenManifestado);
							arrayCampo.push(obj.Estado);
						}
						arrayLinea.push(arrayCampo);
					}
					
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("Totales: ");
					arrayFooter.push(value.totalBultosManif);
					arrayFooter.push(value.totalBultosRec);
					arrayFooter.push(value.totalPesoManif);
					arrayFooter.push(value.totalPesoRec);
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 70;
					const headerTable = [
						{ title: "", dataKey: 1 },
						{ title: "", dataKey: 2 },
						{ title: "", dataKey: 3 },
						{ title: "", dataKey: 4 },
						{ title: "", dataKey: 5 },
						{ title: "", dataKey: 6 },
						{ title: "", dataKey: 7 },
						{ title: "", dataKey: 8 },
						{ title: "", dataKey: 9 },
						{ title: "", dataKey: 10 }
					];

					doc.autoTable(headerTable,arrayLinea,{
						startY: finalY,
						body: arrayLinea,
						theme: 'plain',
						foot: arrayFooterTotal,
						showFoot: 'lastPage',
						showHead: 'never',
						bodyStyles: {valign: 'top'},
						footStyles: {halign: 'center', cellPadding: {top: 3.5, bottom: 1.5, left: 0.2, right: 0.2}, cellWidth: 0},
						margin: {top: 70, right: 15, bottom: 22, left: 16},
						styles: {
									rowPageBreak: 'auto',
									fontSize:5.8,
									textColor:[0, 0, 0],
									valign: 'top',
									minCellWidth: 1,
									minCellHeight: 12,
									cellPadding: {top: 1.5}
						},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							// Membrete
							var cord_X = 240;
							var cord_y = 6;

						/////////////////////////////
						var date = new Date();
						var yyyy = date.getFullYear().toString();
						var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
						var dd = utilController.pad(date.getDate().toString(),"0",2);
						var h = utilController.pad(date.getHours(),"0", 2);
						var m = utilController.pad(date.getMinutes(),"0", 2);
						var s = utilController.pad(date.getSeconds(),"0", 2);
						var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
						/////////////////////////////
							var cord_X = 115*1.4142;
							var cord_y = 7*1.4142;
							var pic = imgSaasa;
							doc.addImage(pic, 'JPG', cord_X, cord_y, 27*1.4142, 9*1.4142);	
							doc.setFontSize(7*1.4142);
							doc.setFont('arial', 'bold');
							doc.text(cord_X-107*1.4142, cord_y+5*1.4142, "SERVICIOS AEROPORTUARIOS ANDINOS S.A.");
							doc.setFontSize(5*1.4142);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-107*1.4142, cord_y+8*1.4142, 'Dirección: '+value.DireccionFiscal);
							doc.text(cord_X-107*1.4142, cord_y+11*1.4142, 'R.U.C.: '+value.RucSaasa);
							
							doc.setFont('arial', 'bold');
							doc.setFontSize(10*1.4142);
							doc.text(55*1.4142, 26*1.4142, 'NOTA DE CONTENIDO');

							// Formulario de transporte
					var coordX = 10*1.4142;
					var coordY = 25*1.4142;

					doc.setFontSize(6*1.4142);
					doc.setFont('sans-serif', 'bold');
					doc.text(coordX, coordY + 4*1.4142, 'TRANSPORTISTA');
					doc.setFont('sans-serif', 'normal');
					doc.text(coordX+28*1.4142, coordY + 4*1.4142, ': ' + value.Transportista);
					doc.setFont('sans-serif', 'bold');
					doc.text(coordX, coordY + 7*1.4142, 'VUELO / VIAJE');
					doc.setFont('sans-serif', 'normal');
					doc.text(coordX+28*1.4142, coordY + 7*1.4142, ': ' + value.NroVueloViaje);
					doc.setFont('sans-serif', 'bold');
					doc.text(coordX, coordY + 10*1.4142, 'MANIFIESTO DE CARGA');
					doc.setFont('sans-serif', 'normal');
					doc.text(coordX+28*1.4142, coordY + 10*1.4142, ': ' + value.ManifiestoCarga);
					doc.setFont('sans-serif', 'bold');
					doc.text(coordX, coordY + 18.5, 'INICIO DE RECEPCIÓN');
					doc.setFont('sans-serif', 'normal');
					doc.text(coordX+28*1.4142, coordY + 18.5, ': ' + value.FechaHoraInicioRecepcion);
					
					//Segunda columna del formulario, alineado a la derecha
					var coordX = 91*1.4142;
					var coordY = 25*1.4142;
					doc.setFontSize(6*1.4142);
					
					doc.setFont('sans-serif', 'bold');
					doc.text(coordX-5*1.4142, coordY + 10, 'LLEGADA M. TRANSPORTE');
					doc.setFont('sans-serif', 'normal');
					doc.text(coordX+28*1.4142, coordY + 10, ': ' + value.FechaHoraLlegadaATA);
					doc.setFont('sans-serif', 'bold');
					doc.text(coordX-5*1.4142, coordY + 13.5, 'TÉRMINO DE LA DESCARGA');
					doc.setFont('sans-serif', 'normal');
					doc.text(coordX+28*1.4142, coordY + 13.5, ': ' + value.FechaHoraTerminoDescarga);
					doc.setFont('sans-serif', 'bold');
					doc.text(coordX+4*1.4142, coordY + 17.4, 'FIN DE RECEPCIÓN');
					doc.setFont('sans-serif', 'normal');
					doc.text(coordX+28*1.4142, coordY + 17.4, ': ' + value.FechaHoraFinRecepcion);

							var coordX = 10*1.4142;
					var coordY = 43*1.4142;
					
					// Contorno de linea de la cabecera
					doc.rect(coordX, coordY, 130*1.4142, 6.5*1.4142);
					
					// Cabecera
					doc.setFont('sans-serif', 'bold');
					doc.setDrawColor(0, 0, 0);
					doc.rect(coordX, coordY, 184, 9);
					doc.text(coordX + 3.5*1.4142, coordY + 1.9*1.4142, 'N°');
					doc.text(coordX + 1*1.4142, coordY + 3.8*1.4142, 'Detalle');
					doc.text(coordX + 1*1.4142, coordY + 5.7*1.4142, 'SUNAT');
					doc.text(coordX + 10*1.4142, coordY + 2.5*1.4142, 'Documento de');
					doc.text(coordX + 12*1.4142, coordY + 5*1.4142, 'Transporte');
					doc.text(coordX + 33*1.4142, coordY + 4*1.4142, 'Descripción');
					doc.text(coordX + 58*1.4142, coordY + 2.5*1.4142, 'Bultos');
					doc.text(coordX + 54*1.4142, coordY + 5*1.4142, 'Man.');
					doc.text(coordX + 63*1.4142, coordY + 5*1.4142, 'Rec.');
					doc.text(coordX + 76*1.4142, coordY + 2.5*1.4142, 'Peso');
					doc.text(coordX + 71*1.4142, coordY + 5*1.4142, 'Man.');
					doc.text(coordX + 81*1.4142, coordY + 5*1.4142, 'Rec.');
					doc.text(coordX + 89*1.4142, coordY + 2.5*1.4142, 'Diferencia de');
					doc.text(coordX + 91.5*1.4142, coordY + 5*1.4142, 'Peso %');
					doc.text(coordX + 104.5*1.4142, coordY + 4.1*1.4142, 'Volumen');
					doc.text(coordX + 118*1.4142, coordY + 4*1.4142, 'Estado');

							// Contador
							var str = "Pág     " + doc.internal.getNumberOfPages()

							if (typeof doc.putTotalPages === 'function') {
								str = str + " de " + totalPagesExp;
							}
							
							//Inicio Línea Foot para el total Dinámico
							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 197, footY);
							//End Línea Foot para el total Dinámico
							
							// Ubica donde se va a pintar el contador de paginas
							doc.setFontSize(6);
							var pageSize = doc.internal.pageSize;
							var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
							doc.text(str, data.settings.margin.left+282, pageHeight - 188, 'right');

							// Footer
							/*var coordX = data.settings.margin.left;
							var coordY = doc.internal.pageSize.height-15;

							doc.setDrawColor(0, 0, 0);
							doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);
							doc.setFontSize(9.5);
							doc.setFont('sans-serif', 'normal');
							doc.setTextColor(0, 0, 0)
							var widthPageMargin	=	doc.internal.pageSize.width - (data.settings.margin.left + data.settings.margin.right)
							var baseLegal 		= 	doc.splitTextToSize(value.BaseLegalAnexo6MasterDirecta);
							var coordYBaseLegal	=	coordY+3.5;
							for (var i in baseLegal) {
								doc.text(doc.internal.pageSize.width/2, coordYBaseLegal, baseLegal[i], 'center');
								coordYBaseLegal	=	coordYBaseLegal+4;
							}*/
							
						},
        				columnStyles:	{
    										1: {cellWidth: 5, halign: 'center'},
        									2: {cellWidth: 13, halign: 'center'},
        									3: {cellWidth: 21, halign: 'center'},
        									
        									4: {cellWidth: 6, halign: 'center'},
        									5: {cellWidth: 6, halign: 'center'},
        									
        									6: {cellWidth: 8, halign: 'center'},//Bultos Mnif
        									7: {cellWidth: 8, halign: 'center'},//Bultos Rec
        									8: {cellWidth: 10, halign: 'center'},//Peso Mnif
        									9: {cellWidth: 10, halign: 'center'},//Peso Rec
        									10: {cellWidth: 10, halign: 'center'},
        									11: {cellWidth: 10, halign: 'center'},
        									12: {cellWidth: 10, halign: 'center'}
        									
        									
        								}
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp);
					}
				};

				var setFooter = function (value, cord_x) {
					var coordX	=	doc.internal.pageSize.width;
					var coordY	=	doc.internal.pageSize.height;
					doc.setFontSize(7.5);
					doc.setFont('sans-serif', 'bold');
					
					// Obtiene el ancho de cada texto para luego pintar la linea 
					var sign1Width	=	doc.getTextWidth(value.RazonSocialAerolinea);
					var textoFijo	=	'DUEÑO O CONSIGNATARIO / REPRESENTANTE DEL ALMACÉN ADUANERO';
					
					doc.text(18, coordY-18, value.RazonSocialAerolinea);
					doc.line(18+(sign1Width+3), coordY-18, 18+(sign1Width+3)+60, coordY-18)
						
					doc.text((coordX/2)+60, coordY-18, textoFijo, 'right');
					doc.line((coordX/2)+60+3, coordY-18, (coordX/2)+50+60, coordY-18)
				};
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					setCuerpoDetalle(value);
					//setFooter(value);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				
				doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFReporteTerminoDescarga: function (value) {
			$.generarPDF = function (value) {
				var doc = new jsPDF('p', 'mm', 'a4');
				
				var construirFormato = function (value) {
					var coord_x, coord_y;
					
					coord_x = 20;
					coord_y = 15;
					
					var sFecha = "";
					var sHora = "";
					if (value.FechaHoraTerminoDescarga){
						var sFechaHora = value.FechaHoraTerminoDescarga.split(" ");
						sFecha = sFechaHora[0];
						sHora = sFechaHora[1];
					}
					
					doc.setFont('arial', 'bold');
					doc.setFontSize(10);
					doc.text(95, coord_y, 'ANEXO VII');
					doc.text(45, coord_y+10, 'REPORTE TÉRMINO DE LA DESCARGA / TÉRMINO DEL EMBARQUE');
					
					doc.rect(120, coord_y+30, 70, 40);
					doc.setFont('arial', 'bold');
					doc.setFontSize(7);
					doc.text(121, coord_y+33, '5. Recepción');
					doc.text(121, coord_y+38, 'Nombre:');
					doc.text(121, coord_y+43, 'Fecha:');
					doc.text(121, coord_y+48, 'Hora:');
					
					doc.line(140, coord_y+58, 172, coord_y+58);
					doc.text(147, coord_y+61, 'FIRMA / SELLO');
					doc.text(140, coord_y+64, 'FUNCIONARIO ADUANERO');
					
					doc.rect(coord_x, coord_y+80, 170, 20);
					doc.text(coord_x+1, coord_y+83, '1. EMPRESA TRANSPORTISTA / ALMACÉN ADUANERO');
					doc.text(coord_x+10, coord_y+90, value.RazonSocialAerolinea + " / " + value.RazonSocialSaasa);
					doc.text(155, coord_y+83, 'RUC / CÓDIGO');
					doc.rect(140, coord_y+90, 0, 10);
					doc.rect(140, coord_y+90, 50, 0);
					doc.text(155, coord_y+95, value.RucAerolinea + (value.ItinerarioCodigoAerolinea != "" ? " / " + value.ItinerarioCodigoAerolinea : ""));
					
					doc.rect(coord_x, coord_y+115, 170, 20);
					doc.text(coord_x+1, coord_y+118, '2. NOMBRE NAVE / MATRÍCULA VEHÍCULO / N° DE VUELO');
					doc.text(coord_x+10, coord_y+125, value.Nave + ' / ' + value.Matricula + " / " +  value.NumeroVuelo);
					
					doc.rect(coord_x, coord_y+150, 170, 20);
					doc.text(coord_x+1, coord_y+153, '3. MANIFIESTO (ADUANA-VÍA-AÑO-NÚMERO)');
					doc.rect(120, coord_y+150, 0, 20);
					doc.text(coord_x+32, coord_y+163, value.ManifiestoCarga);
					doc.text(121, coord_y+153, '4. TÉRMINO DESCARGA / TÉRMINO DEL EMBARQUE');
					doc.text(129, coord_y+160, 'FECHA: ' + sFecha);
					doc.text(157, coord_y+160, 'HORA: ' + sHora);
					
					doc.line(coord_x+20, coord_y+205, coord_x+67, coord_y+205);
					doc.text(coord_x+20, coord_y+210, 'EMPRESA TRANSPORTISTA /ALMACÉN');
					doc.text(coord_x+35, coord_y+215, 'ADUANERO');
				};
				
				construirFormato(value);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
			};
			$.generarPDF(value);
		},
		onGenerarPDFAnexo6MasterDirecta: function (value) {
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('l', 'mm', 'a4');
				var pageNumber = 0;
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (value) {
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (value) {
					var arrayLinea	=	[];
					var arrayCampo	=	[];
					var arrayFooter	=	[];
					var arrayFooterTotal	=	[];
					var DocumentosTransporte	=	value.aDetalle;
					
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);//N° Detalle SUNAT
							arrayCampo.push(obj.DocumentoTransporteMaster);//Doc Transp Master
							arrayCampo.push(obj.Consignatario);//Consignatario
							arrayCampo.push(obj.Descripcion);//Descripcion
							arrayCampo.push(obj.BultosBuenos);//Bultos Buenos
							arrayCampo.push(obj.BultosMalos);//Bultos Malos
							arrayCampo.push(obj.PesoBuenos);//Pesos Buenos
							arrayCampo.push(obj.PesoMalos);//Pesos Malos
							arrayCampo.push(obj.ActaInventario);//N° Acta Inventario
							arrayCampo.push(obj.Incidencia);//Incidencia
							arrayCampo.push(obj.DescripcionIncidencia);//Descripción Incidencia
						}
						arrayLinea.push(arrayCampo);
					}
					
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("Totales: ");
					arrayFooter.push(value.totalBultosBueno);
					arrayFooter.push(value.totalBultosMalo);
					arrayFooter.push(value.totalPesoBueno);
					arrayFooter.push(value.totalPesoMalo);
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 70;
					const headerTable = [
						{ title: "", dataKey: 1 },
						{ title: "", dataKey: 2 },
						{ title: "", dataKey: 3 },
						{ title: "", dataKey: 4 },
						{ title: "", dataKey: 5 },
						{ title: "", dataKey: 6 },
						{ title: "", dataKey: 7 },
						{ title: "", dataKey: 8 },
						{ title: "", dataKey: 9 },
						{ title: "", dataKey: 10 },
						{ title: "", dataKey: 11 }
					];

					doc.autoTable(headerTable,arrayLinea,{
						startY: finalY,
						body: arrayLinea,
						theme: 'plain',
						foot: arrayFooterTotal,
						showFoot: 'lastPage',
						didDrawCell: data => {
							if (data.section === 'foot' && data.column.index === 0) {
								var coordX = doc.internal.pageSize.width;
								var coordY = doc.internal.pageSize.height;
								
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
								
								//Fecha Inicio Recepción
								doc.text(21, coordY-40, "Inicio Recepción: ");
								doc.setFont('sans-serif', 'normal');
								doc.text(50, coordY-40, value.FechaInicioTarja);
								
								//Fecha Fin Recepción
								doc.setFont('sans-serif', 'bold');
								doc.text(21, coordY-37, "Fin de Recepción: ");
								doc.setFont('sans-serif', 'normal');
								doc.text(50, coordY-37, value.FechaFinTarja);
								
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
	
								var sign1Width = doc.getTextWidth(value.RazonSocialAerolinea)
								var pos1 = (150-sign1Width)/2;
								var pos_aux = (160-sign1Width)/2;
								var pos2 = ((pos_aux-pos1)*2)+pos1+sign1Width;
								doc.line(pos1, coordY-14, pos2, coordY-14)
								doc.text(((160-sign1Width)/2), coordY-11, value.RazonSocialAerolinea);
								
								var textoFijo = 'DUEÑO O CONSIGNATARIO / REPRESENTANTE DEL ALMACÉN ADUANERO';
								doc.line(160, coordY-14, 265, coordY-14)
								doc.text(260, coordY-11, textoFijo, 'right');
							
								pageNumber++;
							}
						},
						showHead: 'never',
						bodyStyles: {valign: 'top'},
						footStyles: {halign: 'center', cellPadding: {top: 3.5, bottom: 1.5, left: 0.2, right: 0.2}, cellWidth: 0},
						margin: {top: 70, right: 15, bottom: 22, left: 14},
						styles: {
									rowPageBreak: 'auto',
									fontSize:5.8,
									textColor:[0, 0, 0],
									valign: 'top',
									minCellWidth: 1,
									minCellHeight: 10,
									cellPadding: {top: 0.8}
						},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							var paginaActual = doc.internal.getNumberOfPages();
							// Membrete
							var cord_X = 240;
							var cord_y = 1;

						/////////////////////////////
						var date = new Date();
						var yyyy = date.getFullYear().toString();
						var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
						var dd = utilController.pad(date.getDate().toString(),"0",2);
						var h = utilController.pad(date.getHours(),"0", 2);
						var m = utilController.pad(date.getMinutes(),"0", 2);
						var s = utilController.pad(date.getSeconds(),"0", 2);
						var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
						/////////////////////////////
							doc.setFont('arial', 'normal');
							doc.setFontSize(6);
							doc.text(cord_X+22, cord_y+3, "Fecha: " + fechaActual);


							doc.setFontSize(10);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X-230, cord_y+7,value.RazonSocialAerolinea);
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-230, cord_y+11,"Dirección: ");
							doc.text(cord_X-218, cord_y+11, value.DireccionFiscalAerolinea);
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-230, cord_y+15,"RUC: ");
							doc.text(cord_X-223, cord_y+15, value.RucAerolinea);
							
							// Títutlo 
							doc.setFont('arial', 'bold');
							doc.setFontSize(9);
							doc.text(140, 22, 'ANEXO IX');

							doc.setFont('arial', 'bold');
							doc.setFontSize(11);
							doc.text(30, 27, 'ACTA DE INVENTARIO DE LA CARGA ARRIBADA EN MALA CONDICIÓN EXTERIOR O CON MEDIDAS DE SEGURIDAD VIOLENTADAS');

							// Formulario de transporte
							var coordX = 14;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 7, 'Compañía Transportista');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 7, ': ' + value.CompaniaTransportista);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'FyH de Llegada');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 11, ': ' + value.FechaHoraLlegada);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'FyH de Térm. Descarga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 15, ': ' + value.FechaHoraTerminoDescarga);

							//Segunda columna del formulario, alineado a la derecha
							var coordX = 105;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 11, 'Nro. de Vuelo');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + value.NumeroVuelo);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Cantidad de Documentos');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + value.CantidadDocumentos);

							//Tercera columna del formulario
							var coordX = 205;
							var coordY = 29.5;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 11, 'Manifiesto de Carga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + value.Manifiesto);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Almacén Aduanero');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + value.DepositoTemporal);

							// Header de la tabla (no va en autotable porque tiene varios niveles)			
							var coordX = 14;
							var coordY = 54;
							doc.setFontSize(6.5);

							// Contorno de linea de la cabecera
							doc.setDrawColor(0, 0, 0);
							doc.rect(coordX, coordY, 269, 12);

							// Cabecera
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX + 5, coordY + 3.4, 'N°');
							doc.text(coordX + 2.8, coordY + 6.3, 'Detalle');
							doc.text(coordX + 2.5, coordY + 9.6, 'SUNAT');

							doc.text(coordX + 22, coordY + 5, 'Documento de');
							doc.text(coordX + 23, coordY + 9, 'Transporte');

							doc.text(coordX + 58, coordY + 7, 'Consignatario');

							doc.text(coordX + 103, coordY + 7, 'Descripción');

							doc.text(coordX + 143, coordY + 5, 'BULTOS');
							doc.text(coordX + 137.5, coordY + 9, 'Buenos');
							doc.text(coordX + 149.3, coordY + 9, 'Malos');

							doc.text(coordX + 165.5, coordY + 5, 'PESO');
							doc.text(coordX + 159, coordY + 9, 'Buenos');
							doc.text(coordX + 170, coordY + 9, 'Malos');

							doc.text(coordX + 184, coordY + 5, 'N° Acta');
							doc.text(coordX + 183, coordY + 9, 'Inventario');
							
							doc.text(coordX + 201, coordY + 7, 'Incidencia');
							doc.text(coordX + 227, coordY + 7, 'Descripción Incidencia');
							
							// Contador
							var str = "Pág     " + doc.internal.getNumberOfPages()

							if (typeof doc.putTotalPages === 'function') {
								str = str + " de " + totalPagesExp;
							}
							
							// Ubica donde se va a pintar el contador de paginas
							doc.setFontSize(6);
							var pageSize = doc.internal.pageSize;
							var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
							doc.text(str, data.settings.margin.left+282, pageHeight - 188, 'right');

							//Inicio Línea Foot para el total Dinámico
							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 282, footY);
							//End Línea Foot para el total Dinámico
							
							// Footer
							var coordX = data.settings.margin.left;
							var coordY = doc.internal.pageSize.height-15;

							doc.setDrawColor(0, 0, 0);
							doc.line(coordX, coordY+5, doc.internal.pageSize.width-data.settings.margin.right, coordY+5);
							doc.setFontSize(9.5);
							doc.setFont('sans-serif', 'normal');
							doc.setTextColor(0, 0, 0)
							var widthPageMargin	=	doc.internal.pageSize.width - (data.settings.margin.left + data.settings.margin.right)
							var baseLegal 		= 	doc.splitTextToSize(value.BaseLegalAnexo6MasterDirecta);
							var coordYBaseLegal	=	coordY+9.5;
							for (var i in baseLegal) {
								doc.text(doc.internal.pageSize.width/2, coordYBaseLegal, baseLegal[i], 'center');
								coordYBaseLegal	=	coordYBaseLegal+4;
							}

						},
        				columnStyles:	{
    										1: {cellWidth: 5, halign: 'center'},
    										2: {cellWidth: 12, halign: 'center'},
        									3: {cellWidth: 15, halign: 'center'},
        									4: {cellWidth: 19, halign: 'center'},
        									5: {cellWidth: 4, halign: 'center'},//Bulto bueno
        									6: {cellWidth: 4, halign: 'center'},//Bulto malo
        									7: {cellWidth: 4, halign: 'center'},//Peso bueno
        									8: {cellWidth: 4, halign: 'center'},//Peso malo
        									9: {cellWidth: 7, halign: 'center'},//N° Acta Inventario
        									10: {cellWidth: 7, halign: 'center'},//Incidencia
        									11: {cellWidth: 20, halign: 'center'},//Descripcion Incidencia
        								}
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp);
					}
				};

				var setFooter = function (value, cord_x) {
					var coordX	=	doc.internal.pageSize.width;
					var coordY	=	doc.internal.pageSize.height;
					
					/*doc.setFontSize(7.5);
					doc.setFont('sans-serif', 'bold');
					
					
					//Fecha Inicio Recepción
					doc.text(21, coordY-33, "Inicio Recepción");
					doc.text(50, coordY-33, ": " + value.FechaInicioTarja);
					
					//Fecha Fin Recepción
					doc.text(21, coordY-30, "Fin de Recepción");
					doc.text(50, coordY-30, ": " + value.FechaFinTarja);*/
				};
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					//setCuerpoDetalle(value);
					for(var i in value){
						var valueMaster = value[i];
						setCuerpoDetalle(valueMaster);
						
						if(i!=value.length-1){
							doc.addPage();
						}
					}
					//setFooter(value[0])
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				doc.save("DOCUMENTO-" + value[0].Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFAnexo6House: function (value) {
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('l', 'mm', 'a4');
				var pageNumber = 0;
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (value) {
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (valueMaster) {
					var arrayLinea	=	[];
					var arrayCampo	=	[];
					var arrayFooter	=	[];
					var arrayFooterTotal	=	[];
					var DocumentosTransporte	=	valueMaster.aDetalle;
					
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);//N° Detalle Sunat
							arrayCampo.push(obj.DocumentoTransporteMaster);//Doc Transp Master
							arrayCampo.push(obj.DocumentoTransporteHouse);//Doc Transporte House
							arrayCampo.push(obj.Consignatario);//Consignatario
							arrayCampo.push(obj.Descripcion);//Descripcion
							arrayCampo.push(obj.BultosBuenos);//Bultos Buenos
							arrayCampo.push(obj.BultosMalos);//Bultos Malos
							arrayCampo.push(obj.PesoBuenos);//Peso Buenos
							arrayCampo.push(obj.PesoMalos);//Peso Malos
							arrayCampo.push(obj.ActaInventario);//Acta Inventario
							arrayCampo.push(obj.Incidencia);//Incidencia
							arrayCampo.push(obj.DescripcionIncidencia);//Descripción Incidencia
						}
						arrayLinea.push(arrayCampo);
					}
					
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("Totales: ");
					arrayFooter.push(valueMaster.totalBultosBueno);
					arrayFooter.push(valueMaster.totalBultosMalo);
					arrayFooter.push(valueMaster.totalPesoBueno);
					arrayFooter.push(valueMaster.totalPesoMalo);
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 70;
					doc.autoTable({
						startY: finalY,
						body: arrayLinea,
						theme: 'plain',
						foot: arrayFooterTotal,
						showFoot: 'lastPage',
						showHead: 'never',
						bodyStyles: {valign: 'top'},
						footStyles: {halign: 'center', cellPadding: {top: 3.5, bottom: 1.5, left: 0.2, right: 0.2}, cellWidth: 0},
						margin: {top: 70, right: 15, bottom: 22, left: 14},
						styles: {
									rowPageBreak: 'auto',
									fontSize:5.8,
									textColor:[0, 0, 0],
									valign: 'top',
									minCellWidth: 1,
									minCellHeight: 12,
									cellPadding: {top: 1.5}
						},
						didDrawCell: data => {
							if (data.section === 'foot' && data.column.index === 0) {
								var coordX = doc.internal.pageSize.width;
								var coordY = doc.internal.pageSize.height;
								
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
								
								//Fecha Inicio Recepción
								doc.text(21, coordY-40, "Inicio Recepción: ");
								doc.setFont('sans-serif', 'normal');
								doc.text(50, coordY-40, value[pageNumber].FechaInicioTarja);
								
								//Fecha Fin Recepción
								doc.setFont('sans-serif', 'bold');
								doc.text(21, coordY-37, "Fin de Recepción: ");
								doc.setFont('sans-serif', 'normal');
								doc.text(50, coordY-37, value[pageNumber].FechaFinTarja);
								
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
	
								doc.setDrawColor(0, 0, 0);
								doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);
	
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
	
								var sign1Width = doc.getTextWidth(valueMaster.DescripcionSaasa)
								var pos1 = (150-sign1Width)/2;
								var pos_aux = (160-sign1Width)/2;
								var pos2 = ((pos_aux-pos1)*2)+pos1+sign1Width;
								doc.line(pos1, coordY-21, pos2, coordY-21)
								doc.text(((160-sign1Width)/2), coordY-18, valueMaster.DescripcionSaasa);
								
								doc.line(160, coordY-21, 265, coordY-21)
								
								// Obtiene el ancho de cada texto para luego pintar la linea 
								var agInternacional = valueMaster.AgenteCargaInternacional == "" ? "." : valueMaster.AgenteCargaInternacional;
								var sign1Width	=	doc.getTextWidth(agInternacional);
								var textoFijo	=	agInternacional;
	
								//doc.text(55, coordYi-18, valueMaster.DescripcionSaasa);
								//doc.line(18+(sign1Width+17), coordYi-22, 18+(sign1Width+3)+70, coordYi-22)
	
								doc.text((coordX/2)+75																																																																																																									, coordY-18, textoFijo, 'right');
							
								pageNumber++;
							}
						},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							// Membrete
							var cord_X = 240;
							var cord_y = 6;
							var pic = imgSaasa;
							doc.addImage(pic, 'JPG', cord_X, cord_y, 40.5, 12.7,'logoSAASA');
							doc.setFontSize(10);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X-225, cord_y+7, "SERVICIOS AEROPORTUARIOS ANDINOS S.A.");
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-225, cord_y+11, 'Dirección: '+valueMaster.DireccionFiscal);
							doc.text(cord_X-225, cord_y+15, 'RUC: '+valueMaster.RucSaasa);
							
							// Títutlo 
							doc.setFont('arial', 'bold');
							doc.setFontSize(9);
							doc.text(140, 22, 'ANEXO IX');

							doc.setFont('arial', 'bold');
							doc.setFontSize(11);
							doc.text(30, 27, 'ACTA DE INVENTARIO DE LA CARGA ARRIBADA EN MALA CONDICIÓN EXTERIOR O CON MEDIDAS DE SEGURIDAD VIOLENTADAS');

							// Formulario de transporte
							var coordX = 14;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 7, 'Compañía Transportista');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 7, ': ' + valueMaster.CompaniaTransportista);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'Agente de Carga Internacional');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 11, ': ' + valueMaster.AgenteCargaInternacional);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'FyH de Llegada');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 15, ': ' + valueMaster.FechaHoraLlegada);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 19, 'FyH de Térm. Descarga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 19, ': ' + valueMaster.FechaHoraTerminoDescarga);

							//Segunda columna del formulario, alineado a la derecha
							var coordX = 105;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Nro. de vuelo');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + valueMaster.NumeroVuelo);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 19, 'Cantidad de Documentos');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 19, ': ' + valueMaster.CantidadDocumentos);

							//Tercera columna del formulario
							var coordX = 205;
							var coordY = 29.5;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 13, 'Manifiesto de Carga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 13, ': ' + valueMaster.Manifiesto);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 17, 'Almacén Aduanero');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 17, ': ' + valueMaster.DepositoTemporal);

							// Header de la tabla (no va en autotable porque tiene varios niveles)			
							var coordX = 14;
							var coordY = 54;
							doc.setFontSize(6.5);

							// Contorno de linea de la cabecera
							doc.setDrawColor(0, 0, 0);
							doc.rect(coordX, coordY, 269, 12);

							// Cabecera
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX + 5, coordY + 3.4, 'N°');
							doc.text(coordX + 2.8, coordY + 6.3, 'Detalle');
							doc.text(coordX + 2.5, coordY + 9.6, 'SUNAT');

							doc.text(coordX + 19, coordY + 5, 'Documento de');
							doc.text(coordX + 17, coordY + 9, 'Transporte Máster');

							doc.text(coordX + 44.9, coordY + 5, 'Documento de');
							doc.text(coordX + 43.9, coordY + 9, 'Transporte House');

							doc.text(coordX + 74.5, coordY + 7, 'Consignatario');

							doc.text(coordX + 111, coordY + 7, 'Descripción');

							doc.text(coordX + 147.1, coordY + 5, 'BULTOS');
							doc.text(coordX + 141, coordY + 9, 'Buenos');
							doc.text(coordX + 153.9, coordY + 9, 'Malos');

							doc.text(coordX + 172.5, coordY + 5, 'PESO');
							doc.text(coordX + 165.5, coordY + 9, 'Buenos');
							doc.text(coordX + 179, coordY + 9, 'Malos');

							doc.text(coordX + 193, coordY + 5, 'N° Acta');
							doc.text(coordX + 192, coordY + 9, 'Inventario');
							
							doc.text(coordX + 210, coordY + 7, 'Incidencia');
							doc.text(coordX + 233, coordY + 7, 'Descripción Incidencia');

							// Contador
							var str = "Pág     " + doc.internal.getNumberOfPages()

							if (typeof doc.putTotalPages === 'function') {
								str = str + " de " + value.length.toString();
							}
																																																																																																																																																						
							// Ubica donde se va a pintar el contador de paginas
							doc.setFontSize(6);
							var pageSize = doc.internal.pageSize;
							var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
							doc.text(str, data.settings.margin.left+252, pageHeight - 188, 'right');
							
							//Inicio Línea Foot para el total Dinámico
							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 282, footY);
							//End Línea Foot para el total Dinámico
							
							// Footer
							var coordX = data.settings.margin.left;
							var coordY = doc.internal.pageSize.height-15;
							
							//doc.line((coordXi/2)+40+3, coordYi-22, (coordXi/2)+50+60, coordYi-22);

							///////////////////////////
							doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);
							doc.setFontSize(9.5);
							doc.setFont('sans-serif', 'normal');
							doc.setTextColor(0, 0, 0)
							var widthPageMargin	=	doc.internal.pageSize.width - (data.settings.margin.left + data.settings.margin.right)
							var baseLegal 		= 	doc.splitTextToSize(valueMaster.BaseLegalAnexo6House);
							var coordYBaseLegal	=	coordY+3.5;
							for (var i in baseLegal) {
								doc.text(doc.internal.pageSize.width/2, coordYBaseLegal, baseLegal[i], 'center');
								coordYBaseLegal	=	coordYBaseLegal+4;
							}
							
						},

        				columns:  [
        					{header: '1', dataKey: '1'}, 
        					{header: '2', dataKey: '2'},
        					{header: '3', dataKey: '3'},
        					{header: '4', dataKey: '4'},
        					{header: '5', dataKey: '5'},
        					{header: '6', dataKey: '6'},
        					{header: '7', dataKey: '7'},
        					{header: '8', dataKey: '8'},
        					{header: '9', dataKey: '9'},
        					{header: '10', dataKey: '10'},
        					{header: '11', dataKey: '11'},
        					{header: '12', dataKey: '12'}
        				],
        				columnStyles:	{
    										1: {cellWidth: 5, halign: 'center'},
    										2: {cellWidth: 10, halign: 'center'},
        									3: {cellWidth: 10, halign: 'center'},
        									4: {cellWidth: 12, halign: 'center'},
        									5: {cellWidth: 15, halign: 'center'},
        									6: {cellWidth: 5, halign: 'center'},//Bulto bueno
        									7: {cellWidth: 4, halign: 'center'},//Bulto malo
        									8: {cellWidth: 4, halign: 'center'},//Peso bueno
        									9: {cellWidth: 5, halign: 'center'},//Peso malo
        									10: {cellWidth: 7, halign: 'center'},//N° Acta Inventario
        									11: {cellWidth: 7, halign: 'center'},//Incidencia
        									12: {cellWidth: 16, halign: 'center'},//Descripcion Incidencia
        								}//2 4 5 3
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp);
					}
				};

				var setFooter = function (value, cord_x) {
					var coordX	=	doc.internal.pageSize.width;
					var coordY	=	doc.internal.pageSize.height;

				};
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					for(var i in value){
						var valueMaster = value[i];
						setCuerpoDetalle(valueMaster);
						//setFooter(valueMaster);
						if(i!=value.length-1){
							doc.addPage();
						}
						
						
					}
					
				};
				// DETALLE
				setDetalle(value);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				doc.save("DOCUMENTO-" + value[0].Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFDescargaMercancia: function (value) {
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('l', 'mm', 'a4');
				var pageNumber = 0;
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (value) {
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (valueMaster) {
					var arrayLinea				=	[];
					var arrayCampo				=	[];
					var arrayFooter				=	[];
					var arrayFooterTotal		=	[];
					var contadorCampo			=	1;
					var DocumentosTransporte	=	valueMaster.aDetalle;
					
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);
							arrayCampo.push(obj.DocumentoTransporteMaster);
							arrayCampo.push(obj.DTDepositoTemporalRuc);
							arrayCampo.push(obj.Consignatario);
							arrayCampo.push(obj.DAM);
							arrayCampo.push(obj.ContenedorTipoCarga);
							arrayCampo.push(obj.Descripcion);
							arrayCampo.push(obj.NumeroPrecinto);
							arrayCampo.push(obj.BultosManifestados);
							arrayCampo.push(obj.BultosRecibidos);
							arrayCampo.push(obj.PesoManifestados);
							arrayCampo.push(obj.PesoRecibidos);
							arrayCampo.push(obj.BultosMalos);
							arrayCampo.push(obj.PesoMalos);
							arrayCampo.push(obj.Estado)
						}
						arrayLinea.push(arrayCampo);
						contadorCampo++;
					}
					
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("Totales: ");
					arrayFooter.push(valueMaster.totalBultosManif);
					arrayFooter.push(valueMaster.totalBultosRec);
					arrayFooter.push(valueMaster.totalPesoManif);
					arrayFooter.push(valueMaster.totalPesoRec);
					arrayFooter.push(valueMaster.totalBultosMalo);
					arrayFooter.push(valueMaster.totalPesoMalo);
					arrayFooter.push("");
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 70;
					
					doc.autoTable({
						startY: finalY,
						body: arrayLinea,
						theme: 'plain',
						foot: arrayFooterTotal,
						showFoot: 'lastPage',
						showHead: 'never',
						didDrawCell: data => {
							if (data.section === 'foot' && data.column.index === 0) {
								var coordX = doc.internal.pageSize.width;
								var coordY = doc.internal.pageSize.height;
								
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
								
								//Fecha Inicio/Fin
								doc.setFontSize(6);
								doc.setFont('sans-serif', 'bold');
								doc.text(25, coordY-40, 'FECHA Y HORA DE INICIO');
								doc.text(60, coordY-40, ':');
								doc.setFont('sans-serif', 'normal');
								doc.text(70, coordY-40, value[pageNumber].ManifiestoFechaInicioTarja);
								doc.setFont('sans-serif', 'bold');
								doc.text(25, coordY-37, 'FECHA Y HORA DE FIN');
								doc.text(60, coordY-37, ':');
								doc.setFont('sans-serif', 'normal');
								doc.text(70, coordY-37, value[pageNumber].ManifiestoFechaFinTarja);
								
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
								
								var sign1Width = doc.getTextWidth(value[0].RazonSocialAerolinea)
								var pos1 = (150-sign1Width)/2;
								var pos_aux = (160-sign1Width)/2;
								var pos2 = ((pos_aux-pos1)*2)+pos1+sign1Width;
								doc.line(pos1, coordY-21, pos2, coordY-21)
								doc.text(((160-sign1Width)/2), coordY-18, value[0].RazonSocialAerolinea);
								
								var textoFijo = 'DUEÑO O CONSIGNATARIO / REPRESENTANTE DEL ALMACÉN ADUANERO';
								doc.line(160, coordY-21, 265, coordY-21)
								doc.text(260, coordY-18, textoFijo, 'right');
							
								pageNumber++;
							}
						},
						bodyStyles: {valign: 'top'},
						footStyles: {halign: 'center', cellPadding: {top: 3.5, bottom: 1.5, left: 0.2, right: 0.2}, cellWidth: 0},
						margin: {top: 70, right: 15, bottom: 29, left: 14},
						styles: {
									rowPageBreak: 'auto',
									fontSize:5.8,
									textColor:[0, 0, 0],
									valign: 'top',
									minCellWidth: 1,
									minCellHeight: 12,
									cellPadding: {top: 1.5}
						},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							// Membrete
							var cord_X = 240;
							var cord_y = 6;
							/////////////////////////////
							var date = new Date();
							var yyyy = date.getFullYear().toString();
							var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
							var dd = utilController.pad(date.getDate().toString(),"0",2);
							var h = utilController.pad(date.getHours(),"0", 2);
							var m = utilController.pad(date.getMinutes(),"0", 2);
							var s = utilController.pad(date.getSeconds(),"0", 2);
							var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
							/////////////////////////////
							doc.setFont('arial', 'normal');
							doc.setFontSize(6);
							doc.text(cord_X+22, cord_y+3, "Fecha: " + fechaActual);
							
							doc.setFontSize(10);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X-225, cord_y+7, valueMaster.RazonSocialAerolinea);
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-225, cord_y+11, 'Dirección: '+valueMaster.DireccionFiscalAerolinea);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-225, cord_y+15, 'RUC: '+valueMaster.RucAerolinea);
							
							// Títutlo 
							doc.setFont('arial', 'bold');
							doc.setFontSize(9);
							doc.text(doc.internal.pageSize.width/2, 22, 'ANEXO VIII', 'center');

							doc.setFont('arial', 'bold');
							doc.setFontSize(11);
							doc.text(doc.internal.pageSize.width/2, 27, 'DESCARGA DE LA MERCANCÍA', 'center');

							// Formulario de transporte
							var coordX = 14;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 7, 'Compañía transportista');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 7, ': ' + valueMaster.CompaniaTransportista);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'Nro. vuelo');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + valueMaster.NumeroVuelo);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'Cantidad de documentos');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + valueMaster.CantidadDocumentos);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 19, 'Último origen de emb.');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 19, ': ' + valueMaster.UltimoOrigenEmb);
							

							//Segunda columna del formulario, alineado a la derecha
							var coordX = 95;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Fecha y hora llegada');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+50, coordY + 15, ': ' + valueMaster.FechaHoraLlegada);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 19, 'Fecha y hora de término descarga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+50, coordY + 19, ': ' + valueMaster.FechaHoraTerminoDescarga);
							
							//Tercera columna del formulario
							var coordX = 205;
							var coordY = 29.5;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Manifiesto');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + valueMaster.Manifiesto);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 19, 'Almacén Aduanero');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 19, ': ' + valueMaster.Almacen);
							

							// Header de la tabla (no va en autotable porque tiene varios niveles)			
							var coordX 		= 14;
							var coordY 		= 54;
							var coordMid	=	5.5
							var coordTop	=	4;
							var coordBot	=	7.4;
							doc.setFontSize(6.5);

							// Contorno de linea de la cabecera
							doc.setDrawColor(0, 0, 0);
							doc.rect(coordX, coordY, 269, 10);

							// Cabecera
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX + 6, coordY + 3.9, 'N°', 'center');
							doc.text(coordX + 6, coordY + coordMid, 'Detalle', 'center');
							doc.text(coordX + 6, coordY + 7.6, 'SUNAT', 'center');

							doc.text(coordX + 22,	coordY + coordTop,	'Documento', 'center');
							doc.text(coordX + 22,	coordY + coordBot,	'Transporte', 'center');

							doc.text(coordX + 43,	coordY + coordMid, 	'RUC Receptor', 'center');
							//doc.text(coordX + 42,	coordY + coordBot, 	'bulto', 'center');

							//doc.text(coordX + 61,	coordY + coordTop, 	'N°', 'center');
							//doc.text(coordX + 61,	coordY + coordBot, 	'precinto', 'center');

							doc.text(coordX + 65,	coordY + coordMid, 	'Consignatario', 'center');
							
							doc.text(coordX + 90,	coordY + coordMid, 	'DAM', 'center');
							
							doc.text(coordX + 115,	coordY + coordTop, 	'Contenedor o tipo', 'center');
							doc.text(coordX + 115,	coordY + coordBot, 	'de carga', 'center');

							doc.text(coordX + 140,	coordY + coordMid, 	'Descripción', 'center');
							
							doc.text(coordX + 164,	coordY + coordTop, 	'Precintos o', 'center');
							doc.text(coordX + 164,	coordY + coordBot, 	'Marcas', 'center');

							doc.text(coordX + 184,	coordY + coordTop,	'BULTOS', 'center');
							doc.text(coordX + 178,	coordY + coordBot,	'Man.', 'center');
							doc.text(coordX + 191,	coordY + coordBot,	'Rec.', 'center');

							doc.text(coordX + 208,	coordY + coordTop,	'PESO', 'center');
							doc.text(coordX + 203,	coordY + coordBot,	'Man.', 'center');
							doc.text(coordX + 216,	coordY + coordBot,	'Rec.', 'center');

							doc.text(coordX + 233,	coordY + coordTop,	'Mal estado', 'center');
							doc.text(coordX + 227,	coordY + coordBot,	'Bultos', 'center');
							doc.text(coordX + 241,	coordY + coordBot,	'Peso', 'center');
							
							doc.text(coordX + 255,	coordY + coordMid, 	'Estado', 'center');
							// Contador
							var str = "Pág     " + doc.internal.getNumberOfPages()

							if (typeof doc.putTotalPages === 'function') {
								str = str + " de " + totalPagesExp;
							}
							
							// Ubica donde se va a pintar el contador de paginas
							doc.setFontSize(6);
							var pageSize = doc.internal.pageSize;
							var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
							doc.text(str, data.settings.margin.left+282, pageHeight - 188, 'right');

							//Inicio Línea Foot para el total Dinámico
							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 282, footY);
							//End Línea Foot para el total Dinámico
							
							
							doc.setFont('sans-serif', 'bold');

							// Footer
							var coordX = data.settings.margin.left;
							var coordY = doc.internal.pageSize.height-15;

							doc.setDrawColor(0, 0, 0);
							doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);

							doc.setFontSize(9.5);
							doc.setFont('sans-serif', 'normal');
							doc.setTextColor(0, 0, 0)
							var widthPageMargin	=	doc.internal.pageSize.width - (data.settings.margin.left + data.settings.margin.right)
							var baseLegal 		= 	doc.splitTextToSize(valueMaster.BaseLegalDescargaMercancia);
							var coordYBaseLegal	=	coordY+3.5;
							for (var i in baseLegal) {
								doc.text(doc.internal.pageSize.width/2, coordYBaseLegal, baseLegal[i], 'center');
								coordYBaseLegal	=	coordYBaseLegal+4;
							}
							
						},

        				columns:  [
        					{header: '1', dataKey: '1'}, 
        					{header: '2', dataKey: '2'},
        					{header: '3', dataKey: '3'},
        					{header: '4', dataKey: '4'},
        					{header: '5', dataKey: '5'},
        					{header: '6', dataKey: '6'},
        					{header: '7', dataKey: '7'},
        					{header: '8', dataKey: '8'},
        					{header: '9', dataKey: '9'},
        					{header: '10', dataKey: '10'},
        					{header: '11', dataKey: '11'},
        					{header: '12', dataKey: '12'},
        					{header: '13', dataKey: '13'},
        					{header: '14', dataKey: '14'},
        					{header: '15', dataKey: '15'}
        				],
        				columnStyles:	{
    										1: {cellWidth: 4, halign: 'right', cellPadding: {top: 1,  left: 1, right: 5}},
        									2: {cellWidth: 10, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									3: {cellWidth: 10, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									4: {cellWidth: 13, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									5: {cellWidth: 9, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									6: {cellWidth: 13, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									7: {cellWidth: 15, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									8: {cellWidth: 7, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									9: {cellWidth: 0.8, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									10: {cellWidth: 0.8, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									11: {cellWidth: 1, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									12: {cellWidth: 1, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									13: {cellWidth: 0.8, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									14: {cellWidth: 1, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}},
        									15: {cellWidth: 11, halign: 'center', cellPadding: {top: 1, left: 1, right: 1}}
        								}
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp); 
					}
				};

				var setFooter = function (value, cord_x) {
							
				}; 
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					//setCuerpoDetalle(value);
					for(var i in value){
						var valueMaster = value[i];
						setCuerpoDetalle(valueMaster);
						setFooter(valueMaster);
						if(i!=value.length-1){
							doc.addPage();
						}
					}
					
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				doc.save("DOCUMENTO-" + value[0].Titulo.trim() + '.pdf');
				
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFAnexo7General: function (value) {//Plantilla
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('l', 'mm', 'a4');
				var pageNumber = 0;
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (value) {
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (value) {
					var arrayLinea				=	[];
					var arrayCampo				=	[];
					var arrayFooter				=	[];
					var arrayFooterTotal		=	[];
					
					var DocumentosTransporte	=	value.aDetalle;
					
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);
							arrayCampo.push(obj.DocumentoTransporteMaster);
							arrayCampo.push(obj.DocumentoTransporteHouse);
							arrayCampo.push(obj.Consignatario);
							arrayCampo.push(obj.Descripcion);
							
							arrayCampo.push(obj.BultosManifestados);
							arrayCampo.push(obj.BultosRecibidos);
							arrayCampo.push(obj.BultosBuenos);
							arrayCampo.push(obj.BultosMalos);
							
							arrayCampo.push(obj.PesoManifestados);
							arrayCampo.push(obj.PesoRecibidos);
							arrayCampo.push(obj.PesoBuenos);
							arrayCampo.push(obj.PesoMalos);
							arrayCampo.push(obj.ActaInventario);
							arrayCampo.push(obj.Estado)
							arrayCampo.push(obj.Observaciones)
						}
						
						arrayLinea.push(arrayCampo);
					}
					
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					arrayFooter.push("");						// 1
					arrayFooter.push("");						// 2
					arrayFooter.push("");						// 3
					arrayFooter.push("");						// 4
					arrayFooter.push("Totales: ");				// 5
					// BULTOS
					arrayFooter.push(value.totalBultosManif);				// 6
					arrayFooter.push(value.totalBultosRec);					// 7
					arrayFooter.push(value.totalBultosBueno);				// 8
					arrayFooter.push(value.totalBultosMalo);				// 9
					// PESO
					arrayFooter.push(value.totalPesoManif);		// 10
					arrayFooter.push(value.totalPesoRec);		// 11
					arrayFooter.push(value.totalPesoBueno);	// 12
					arrayFooter.push(value.totalPesoMalo);		// 13
					arrayFooter.push("");						// 14
					arrayFooter.push("");						// 15
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 70;
					
					doc.autoTable({
						startY: finalY,
						body: arrayLinea,
						theme: 'plain',
						foot: arrayFooterTotal,
						showFoot: 'lastPage',
						showHead: 'never',
						bodyStyles: {valign: 'top'},
						footStyles: {halign: 'center', cellPadding: {top: 3.5, bottom: 1.5, left: 0.2, right: 0.2}, cellWidth: 0},
						margin: {top: 70, right: 15, bottom: 22, left: 14},
						styles: {
									rowPageBreak: 'auto',
									fontSize:5.8,
									textColor:[0, 0, 0],
									valign: 'top',
									minCellWidth: 1,
									minCellHeight: 10,
									cellPadding: {top: 1.5}
						},
						didDrawCell: data => {
							if (data.section === 'foot' && data.column.index === 0) {
								var coordX	=	doc.internal.pageSize.width;
								var coordY	=	doc.internal.pageSize.height;
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
								
								//Fecha Inicio Recepción
								doc.text(21, coordY-40, "Inicio Recepción: ");
								doc.setFont('sans-serif', 'normal');
								doc.text(50, coordY-40, value.FechaHoraInicioRecepcion);
								
								//Fecha Fin Recepción
								doc.setFont('sans-serif', 'bold');
								doc.text(21, coordY-37, "Fin de Recepción: ");
								doc.setFont('sans-serif', 'normal');
								doc.text(50, coordY-37, value.FechaHoraFinRecepcion);
								
								// Obtiene el ancho de cada texto para luego pintar la linea 
								var texto1	=	value.DescripcionSaasa;
								var texto2	=	'FECHA DE EMISIÓN:';
								var sign1Width	=	doc.getTextWidth(texto1);
								
								// Firma 
								doc.text(18, coordY-18, texto1);
								doc.line(18+(sign1Width+3), coordY-18, 18+(sign1Width+3)+60, coordY-18);
							
								pageNumber++;
							}
						},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							// Membrete
							var pageSize = doc.internal.pageSize;
							var cord_X = 240;
							var cord_y = 6;
							var pic = imgSaasa;
							doc.addImage(pic, 'JPG', cord_X, cord_y, 40.5, 12.7,'logoSAASA');
							doc.setFontSize(10);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X-225, cord_y+7, value.DescripcionSaasa);
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-225, cord_y+11, 'Dirección: '+value.DireccionFiscal);
							doc.text(cord_X-225, cord_y+15, 'RUC: '+ value.RucSaasa);
							
							// Títutlo 
							doc.setFont('arial', 'bold');
							doc.setFontSize(9);
							doc.text(pageSize.width/2, 22, 'ANEXO V', 'center');

							doc.setFont('arial', 'bold');
							doc.setFontSize(11);
							doc.text(pageSize.width/2, 27, 'INGRESO Y RECEPCIÓN DE LAS MERCANCÍAS', 'center');

							// Formulario de transporte
							var coordX = 14;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 7, 'Compañía Transportista');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 7, ': ' + value.CompaniaTransportista);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'Fecha y hora de Llegada');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 11, ': ' + value.FechaHoraLlegada);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'Fecha y hora Término Descarga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 15, ': ' + value.FechaHoraTerminoDescarga);

							//Segunda columna del formulario, alineado a la derecha
							var coordX = 105;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 11, 'Nro. de vuelo');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + value.NumeroVuelo);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Cantidad de Documentos');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + value.CantidadDocumentos);
							doc.setFont('sans-serif', 'bold');
							
							//Tercera columna del formulario
							var coordX = 205;
							var coordY = 29.5;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 11, 'Manifiesto de Carga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + value.Manifiesto);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Almacén Aduanero');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + value.Almacen);
							doc.setFont('sans-serif', 'bold');
							
							var coordX 		=	14;
							var coordY 		=	54;
							var coordMid	=	5.5
							var coordTop	=	4;
							var coordBot	=	7.4;
							doc.setFontSize(6.5);

							// Contorno de linea de la cabecera
							doc.setDrawColor(0, 0, 0);
							doc.rect(coordX, coordY, 269, 10);

							// Cabecera
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX + 8, coordY + coordTop, 'N° Detalle', 'center');
							doc.text(coordX + 8, coordY + coordBot, 'SUNAT', 'center');
							
							doc.text(coordX + 29, coordY + coordBot, 'Transporte Máster', 'center');
							doc.text(coordX + 29, coordY + coordTop, 'Documento', 'center');

							doc.text(coordX + 53, coordY + coordTop, 'Documento', 'center');
							doc.text(coordX + 53, coordY + coordBot, 'Transporte House', 'center');

							doc.text(coordX + 80, coordY + coordMid, 'Consignatario', 'center');

							doc.text(coordX + 112, coordY + coordMid, 'Descripción', 'center');

							doc.text(coordX + 144, coordY + coordTop, 'BULTOS', 'center');
							doc.text(coordX + 132, coordY + coordBot, 'Man.', 'center');
							doc.text(coordX + 140, coordY + coordBot, 'Rec.', 'center');
							doc.text(coordX + 148, coordY + coordBot, 'B/E', 'center');
							doc.text(coordX + 155, coordY + coordBot, 'M/E', 'center');
							
							doc.text(coordX + 179, coordY + coordTop, 'PESO', 'center');
							doc.text(coordX + 166, coordY + coordBot, 'Man.', 'center');
							doc.text(coordX + 176, coordY + coordBot, 'Rec.', 'center');
							doc.text(coordX + 185, coordY + coordBot, 'B/E', 'center');
							doc.text(coordX + 194, coordY + coordBot, 'M/E', 'center');
							
							doc.text(coordX + 211, coordY + coordMid, 'Acta de inv.', 'center');
							doc.text(coordX + 225, coordY + coordMid, 'Estado', 'center');
							doc.text(coordX + 245, coordY + coordMid, 'Observaciones', 'center');

							// Contador
							var str = "Pág     " + doc.internal.getNumberOfPages()

							if (typeof doc.putTotalPages === 'function') {
								str = str + " de " + totalPagesExp;
							}
							
							// Ubica donde se va a pintar el contador de paginas
							doc.setFontSize(6);
							var pageSize = doc.internal.pageSize;
							var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
							doc.text(str, data.settings.margin.left+272, pageHeight - 188, 'right');


							//Inicio Línea Foot para el total Dinámico
							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 282, footY);
							//End Línea Foot para el total Dinámico
							
							// Footer
							var coordX = data.settings.margin.left;
							var coordY = doc.internal.pageSize.height-15;

							doc.setDrawColor(0, 0, 0);
							doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);

							doc.setFontSize(6.5);
							doc.setFont('sans-serif', 'normal');
							doc.setTextColor(0, 0, 0);
							var widthPageMargin	=	doc.internal.pageSize.width - (data.settings.margin.left + data.settings.margin.right)
							var baseLegal 		= 	doc.splitTextToSize(value.BaseLegalAnexo7General);
							var coordYBaseLegal	=	coordY+3.5;
							for (var i in baseLegal) {
								doc.text(doc.internal.pageSize.width/2, coordYBaseLegal, baseLegal[i], 'center');
								coordYBaseLegal	=	coordYBaseLegal+4;
							}
						},

        				columns:  [
        					{header: '1', dataKey: '1'}, 
        					{header: '2', dataKey: '2'},
        					{header: '3', dataKey: '3'},
        					{header: '4', dataKey: '4'},
        					{header: '5', dataKey: '5'},
        					{header: '6', dataKey: '6'},
        					{header: '7', dataKey: '7'},
        					{header: '8', dataKey: '8'},
        					{header: '9', dataKey: '9'},
        					{header: '10', dataKey: '10'},
        					{header: '11', dataKey: '11'},
        					{header: '12', dataKey: '12'},
        					{header: '13', dataKey: '13'},
        					{header: '14', dataKey: '14'},
        					{header: '15', dataKey: '15'},
        					{header: '16', dataKey: '16'}
        				],
        				columnStyles:	{
    										1: {cellWidth: 13, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 2}},
        									2: {cellWidth: 17, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									3: {cellWidth: 17, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									4: {cellWidth: 21, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
    										5: {cellWidth: 26, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									6: {cellWidth: 6, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									7: {cellWidth: 6, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									8: {cellWidth: 6, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									9: {cellWidth: 6, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									10: {cellWidth: 7.5, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									11: {cellWidth: 7.5, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									12: {cellWidth: 7.5, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									13: {cellWidth: 7.5, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									14: {cellWidth: 15, halign: 'center', cellPadding: {top: 1.5, bottom: 1.5, left: 0.1, right: 0.1}},
        									15: {cellWidth: 12, halign: 'left', cellPadding: {top: 1.5, bottom: 1.5, left: 0.1, right: 0.1}},
        									16: {cellWidth: 23, halign: 'left', cellPadding: {top: 1.5, bottom: 1.5, left: 0.1, right: 0.1}}
        								}
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp); 
					}
				};

				var setFooter = function (value, cord_x) {
					
				}; 
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					setCuerpoDetalle(value);
					setFooter(value);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				
				doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		}, 
		onGenerarPDFAnexo7Master: function (value) {
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('l', 'mm', 'a4');
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (value) {
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (value) {
					var arrayLinea			=	[];
					var arrayCampo			=	[];
					var arrayFooter			=	[];
					var arrayFooterTotal	=	[];
					
					var contadorCampo	=	1;
					var DocumentosTransporte	=	value.aDetalle;
					
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);
							arrayCampo.push(obj.DocumentoTransporte);
							arrayCampo.push(obj.TipoBulto);
							arrayCampo.push(obj.NumeroPrecinto);
							arrayCampo.push(obj.Consignatario);
							arrayCampo.push(obj.Descripcion);
							arrayCampo.push(obj.BultosManifestados);
							arrayCampo.push(obj.BultosRecibidos);
							arrayCampo.push(obj.BultosBuenos);
							arrayCampo.push(obj.BultosMalos);
							arrayCampo.push(obj.BultosSobrantes);
							arrayCampo.push(obj.BultosFaltantes);
							arrayCampo.push(obj.PesoManifestados);
							arrayCampo.push(obj.PesoRecibidos);
							arrayCampo.push(obj.PesoBuenos);
							arrayCampo.push(obj.PesoMalos);
							arrayCampo.push(obj.PesoSobrantes);
							arrayCampo.push(obj.PesoFaltantes);
							arrayCampo.push(obj.ActaInventario);
							arrayCampo.push(obj.Observaciones)
						}
						
						arrayLinea.push(arrayCampo);
						contadorCampo++;
					}
					
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					// Espacios vacios
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("Totales: ");
					// BULTOS
					arrayFooter.push(value.totalBultosManif);				// 8
					arrayFooter.push(value.totalBultosRec);					// 9
					arrayFooter.push(value.totalBultosBueno);				// 10
					arrayFooter.push(value.totalBultosMalo);				// 11
					arrayFooter.push(value.totalBultosSobr);				// 12
					arrayFooter.push(value.totalBultosFalt);				// 13
					// PESO
					arrayFooter.push(value.totalPesoManif);		// 14
					arrayFooter.push(value.totalPesoRec);		// 15
					arrayFooter.push(value.totalPesoBueno);	// 16
					arrayFooter.push(value.totalPesoMalo);		// 17
					arrayFooter.push(value.totalPesoSobr);		// 18
					arrayFooter.push(value.totalPesoFalt);
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 65;
					
					doc.autoTable({
						startY		: 	finalY,
						body		: 	arrayLinea,
						theme		: 	'plain',
						foot		: 	arrayFooterTotal,
						showFoot	: 	'lastPage',
						showHead	: 	'never',
						bodyStyles	: 	{	valign	: 	'top'},
						footStyles	: 	{
											halign	: 	'center', 
											cellPadding: {
															top		: 	1.5, 
															bottom	: 	1.5, 
															left	: 	0.1, 
															right	: 	0.1}, 
											cellWidth	: 	0
										},
						margin		: 	{	top		: 	70, 
											right	: 	15, 
											bottom	: 	20, 
											left	: 	14},
						styles		: 	{
											rowPageBreak	: 	'auto',
											fontSize		:	6,
											textColor		:	[0, 0, 0],
											valign			: 	'top',
											minCellWidth	: 	1.2,
											minCellHeight	: 	12,
											cellPadding		: 	{
																	top	: 	1.5}
																},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							// Membrete
							var cord_X = 240;
							var cord_y = 6;
							var pic = imgSaasa;
							doc.addImage(pic, 'JPG', cord_X, cord_y, 40.5, 12.7,'logoSAASA');
							doc.setFontSize(10);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X-225, cord_y+7, "SERVICIOS AEROPORTUARIOS ANDINOS S.A.");
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-225, cord_y+11, 'Dirección: '+value.DireccionFiscal);
							doc.text(cord_X-225, cord_y+15, 'RUC: '+ value.RucSaasa);

							// Títutlo 
							doc.setFont('arial', 'bold');
							doc.setFontSize(9);
							doc.text(140, 22, 'ANEXO 7');

							doc.setFont('arial', 'bold');
							doc.setFontSize(11);
							doc.text(doc.internal.pageSize.width/2, 27, 'INGRESO Y RECEPCIÓN DE LAS MERCANCÍAS', 'center');

							// Formulario de transporte
							var coordX = 14;
							var coordY = 26;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'Compañía Transportista');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 11, ': ' + value.CompaniaTransportista);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'Fecha y hora de llegada');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 15, ': ' + value.FechaHoraLlegada);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 19, 'Fecha y hora de término descarga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 19, ': ' + value.FechaHoraTerminoDescarga);

							//Segunda columna del formulario, alineado a la derecha
							var coordX = 105;
							var coordY = 26;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 11, 'Nro de vuelo');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + value.NumeroVuelo);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Cantidad de documentos');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + value.CantidadDocumentos);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 19, 'Inicio de recepción');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 19, ': ' + value.FechaHoraInicioRecepcion);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 23, 'Fin de recepción');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 23, ': ' + value.FechaHoraFinRecepcion);

							//Tercera columna del formulario
							var coordX = 205;
							var coordY = 26;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+5.5, coordY + 11, 'Manifiesto');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + value.Manifiesto);
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+5.5, coordY + 15, 'Almacén');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + value.Almacen);
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+5.5, coordY + 19, 'Último origen de emb');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 19, ': ' + value.UltimoOrigenEmb);

							// Header de la tabla (no va en autotable porque tiene varios niveles)			
							var coordX 		= 14;
							var coordY 		= 54;
							var coordMid	=	5.5
							var coordTop	=	4;
							var coordBot	=	7.4;
							doc.setFontSize(6.5);

							// Contorno de linea de la cabecera
							doc.setDrawColor(0, 0, 0);
							doc.rect(coordX, coordY, 269, 10);
							
							// Altura de los Niveles de cabecera: 1°: 4, 2°: 7.4 y Medio: 5.5
							// Cabecera
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX + 3.4, coordY + coordMid, 'N°', 'center');

							doc.text(coordX + 17, coordY + coordTop, 'N° Documento', 'center');
							doc.text(coordX + 17, coordY + coordBot, 'transporte', 'center');

							doc.text(coordX + 34, coordY + coordTop, 'Tipo de', 'center');
							doc.text(coordX + 34, coordY + coordBot, 'bulto', 'center');

							doc.text(coordX + 48, coordY + coordTop, 'N°', 'center');
							doc.text(coordX + 48, coordY + coordBot, 'Precinto', 'center');

							doc.text(coordX + 66, coordY + coordMid, 'Consignatario', 'center');

							doc.text(coordX + 92, coordY + coordMid, 'Descripción', 'center');

							doc.text(coordX + 129, coordY + coordTop, 'BULTOS', 'center');
							doc.text(coordX + 109, coordY + coordBot, 'Man.', 'center');
							doc.text(coordX + 118, coordY + coordBot, 'Rec.', 'center');
							doc.text(coordX + 125, coordY + coordBot, 'B/E', 'center');
							doc.text(coordX + 134, coordY + coordBot, 'M/E', 'center');
							doc.text(coordX + 144, coordY + coordBot, 'Sob.', 'center');
							doc.text(coordX + 154, coordY + coordBot, 'Falt.', 'center');

							doc.text(coordX + 189, coordY + coordTop, 'PESO', 'center');
							doc.text(coordX + 165, coordY + coordBot, 'Man.', 'center');
							doc.text(coordX + 175, coordY + coordBot, 'Rec.', 'center');
							doc.text(coordX + 185, coordY + coordBot, 'B/E', 'center');
							doc.text(coordX + 196, coordY + coordBot, 'M/E', 'center');
							doc.text(coordX + 206, coordY + coordBot, 'Sob.', 'center');
							doc.text(coordX + 216, coordY + coordBot, 'Falt.', 'center');

							doc.text(coordX + 231, coordY + coordMid, 'Acta de inv.', 'center');

							doc.text(coordX + 252, coordY + coordMid, 'Observaciones', 'center');

							// Contador
							var str = "Pág     " + doc.internal.getNumberOfPages()

							if (typeof doc.putTotalPages === 'function') {
								str = str + " de " + totalPagesExp;
							}
							
							// Ubica donde se va a pintar el contador de paginas
							doc.setFontSize(6);
							var pageSize = doc.internal.pageSize;
							var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
							doc.text(str, data.settings.margin.left+282, pageHeight - 188, 'right');

							//Inicio Línea Foot para el total Dinámico
							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 282, footY);
							//End Línea Foot para el total Dinámico
							
							// Footer
							var coordX = data.settings.margin.left;
							var coordY = doc.internal.pageSize.height-15;

							doc.setDrawColor(0, 0, 0);
							doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);

							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'normal');
							doc.setTextColor(0, 0, 0)
							var widthPageMargin	=	doc.internal.pageSize.width - (data.settings.margin.left + data.settings.margin.right)
							var baseLegal 		= 	doc.splitTextToSize(value.BaseLegalAnexo7Master);
							var coordYBaseLegal	=	coordY+3.5;
							for (var i in baseLegal) {
								doc.text(doc.internal.pageSize.width/2, coordYBaseLegal, baseLegal[i], 'center');
								coordYBaseLegal	=	coordYBaseLegal+4;
							}
						},
						// Define un ID para cada columna
        				columns:  [
        					{header: '1', 	dataKey: '1'}, 
        					{header: '2', 	dataKey: '2'},
        					{header: '3', 	dataKey: '3'},
        					{header: '4', 	dataKey: '4'},
        					{header: '5', 	dataKey: '5'},
        					{header: '6', 	dataKey: '6'},
        					{header: '7', 	dataKey: '7'},
        					{header: '8', 	dataKey: '8'},
        					{header: '9',	dataKey: '9'},
        					{header: '10', 	dataKey: '10'},
        					{header: '11', 	dataKey: '11'},
        					{header: '12', 	dataKey: '12'},
        					{header: '13', 	dataKey: '13'},
        					{header: '14', 	dataKey: '14'},
        					{header: '15', 	dataKey: '15'},
        					{header: '16', 	dataKey: '16'},
        					{header: '17', 	dataKey: '17'},
        					{header: '18', 	dataKey: '18'},
        					{header: '19', 	dataKey: '19'},
        					{header: '20', 	dataKey: '20'}
        				],
        				columnStyles:	{	// Aplica un estilo para cada ID de columna
    										1: {cellWidth:	1,			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									2: {cellWidth: 	10, 		halign: 'center',	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									3: {cellWidth: 	9, 			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									4: {cellWidth: 	7, 			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									5: {cellWidth: 	14.2, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									6: {cellWidth: 	15, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									7: {cellWidth: 	1, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									8: {cellWidth: 	1, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									9: {cellWidth: 	1, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									10: {cellWidth:	1, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									11: {cellWidth:	1, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									12: {cellWidth:	1, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									13: {cellWidth:	2.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 0.1, right: 0.1}},
        									14: {cellWidth:	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									15: {cellWidth:	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									16: {cellWidth:	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									17: {cellWidth:	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									18: {cellWidth:	2.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 0.1, right: 0.1}},
        									19: {cellWidth:	11,			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									20: {cellWidth:	16,			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}}
        								}
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp); 
					}
				};

				var setFooter = function (value, cord_x) {
					var coordX	=	doc.internal.pageSize.width;
					var coordY	=	doc.internal.pageSize.height;
					doc.setFontSize(7.5);
					doc.setFont('sans-serif', 'bold');
					doc.line(coordX/4+3, coordY-18, (coordX/4)+60, coordY-18)
					doc.text(coordX/4, coordY-18, 'SERVICIOS AEROPORTUARIOS ANDINOS S.A.', 'right');	
					
					/////////////////////////////
					var date = new Date();
					var yyyy = date.getFullYear().toString();
					var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
					var dd = utilController.pad(date.getDate().toString(),"0",2);
					var h = utilController.pad(date.getHours(),"0", 2);
					var m = utilController.pad(date.getMinutes(),"0", 2);
					var s = utilController.pad(date.getSeconds(),"0", 2);
					var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
					/////////////////////////////
					doc.text(coordX-(coordX/3), coordY-18,  'FECHA DE EMISIÓN:', 'right');	// Esto debe salir de Agente de carga internacional
					doc.setFont('sans-serif', 'normal');
					doc.text((coordX-(coordX/3))+3, coordY-18,  fechaActual);
				}; 
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					setCuerpoDetalle(value);
					setFooter(value);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				
				doc.save("DOCUMENTO-" + value.Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFAnexo7House: function (value) {
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('l', 'mm', 'a4');
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (value) {
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (valueMaster) {
					var arrayLinea			=	[];
					var arrayCampo			=	[];
					var arrayFooter			=	[];
					var arrayFooterTotal	=	[];
					
					var contadorCampo	=	1;
					var DocumentosTransporte	=	valueMaster.aDetalle;
					
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);
							arrayCampo.push(obj.DocumentoTransporte);
							//arrayCampo.push(obj.TipoBulto);
							//arrayCampo.push(obj.NumeroPrecinto);
							arrayCampo.push(obj.Consignatario);
							arrayCampo.push(obj.Descripcion);
							arrayCampo.push(obj.BultosManifestados);
							arrayCampo.push(obj.BultosRecibidos);
							arrayCampo.push(obj.BultosBuenos);
							arrayCampo.push(obj.BultosMalos);
							//arrayCampo.push(obj.BultosSobrantes);
							//arrayCampo.push(obj.BultosFaltantes);
							arrayCampo.push(obj.PesoManifestados);
							arrayCampo.push(obj.PesoRecibidos);
							arrayCampo.push(obj.PesoBuenos);
							arrayCampo.push(obj.PesoMalos);
							//arrayCampo.push(obj.PesoSobrantes);
							//arrayCampo.push(obj.PesoFaltantes);
							arrayCampo.push(obj.ActaInventario);
							arrayCampo.push(obj.Estado);
							arrayCampo.push(obj.Observaciones)
						}
						arrayLinea.push(arrayCampo);
						contadorCampo++;
					}
					
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					// Espacios vacios
					//arrayFooter.push("");
					//arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("Totales: ");
					
					// BULTOS
					arrayFooter.push(valueMaster.totalBultosManif);				// 8
					arrayFooter.push(valueMaster.totalBultosRec);					// 9
					arrayFooter.push(valueMaster.totalBultosBueno);				// 10
					arrayFooter.push(valueMaster.totalBultosMalo);				// 11
					//arrayFooter.push(valueMaster.totalBultosSobr);				// 12
					//arrayFooter.push(valueMaster.totalBultosFalt);				// 13
					// PESO
					arrayFooter.push(valueMaster.totalPesoManif);		// 14
					arrayFooter.push(valueMaster.totalPesoRec);		// 15
					arrayFooter.push(valueMaster.totalPesoBueno);	// 16
					arrayFooter.push(valueMaster.totalPesoMalo);		// 17
					//arrayFooter.push(valueMaster.totalPesoSobr);		// 18
					//arrayFooter.push(valueMaster.totalPesoFalt);
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 65;
					
					doc.autoTable({
						startY		: 	finalY,
						body		: 	arrayLinea,
						theme		: 	'plain',
						foot		: 	arrayFooterTotal,
						showFoot	: 	'lastPage',
						showHead	: 	'never',
						bodyStyles	: 	{	valign	: 	'top'},
						footStyles	: 	{
											halign	: 	'center', 
											cellPadding: {
															top		: 	1.5, 
															bottom	: 	1.5, 
															left	: 	0.3, 
															right	: 	0.3}, 
											cellWidth	: 	0
										},
						margin		: 	{	top		: 	70, 
											right	: 	15, 
											bottom	: 	20, 
											left	: 	14},
						styles		: 	{
											rowPageBreak	: 	'auto',
											fontSize		:	6,
											textColor		:	[0, 0, 0],
											valign			: 	'top',
											minCellWidth	: 	1.2,
											minCellHeight	: 	10,
											cellPadding		: 	{
																	top	: 	1.5}
																},
						didDrawCell: data => {
							if (data.section === 'foot' && data.column.index === 0) {
								var coordXi	=	doc.internal.pageSize.width;
								var coordYi	=	doc.internal.pageSize.height;
								doc.setFontSize(7.5);
								doc.setFont('sans-serif', 'bold');
	
								// Obtiene el ancho de cada texto para luego pintar la linea 
								var agInternacional = valueMaster.AgenteCargaInternacional == "" ? "." : valueMaster.AgenteCargaInternacional;
								var sign1Width	=	doc.getTextWidth(agInternacional);
								var textoFijo	=	agInternacional;
	
								doc.line(78, coordYi-18, 120, coordYi-18)
								doc.text(18, coordYi-18, 'SERVICIOS AEROPORTUARIOS ANDINOS S.A.');
								//doc.line(18+(sign1Width+40), coordYi-18, 140, coordYi-18);
	
								doc.text((coordXi/2)+60, coordYi-18, "FECHA DE EMISIÓN", 'right');
								var date = new Date();
								var yyyy = date.getFullYear().toString();
								var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
								var dd = utilController.pad(date.getDate().toString(),"0",2);
								var h = utilController.pad(date.getHours(),"0", 2);
								var m = utilController.pad(date.getMinutes(),"0", 2);
								var s = utilController.pad(date.getSeconds(),"0", 2);
								var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
								doc.setFont('sans-serif', 'normal');
								doc.text((coordXi/2)+60+3, coordYi-18, fechaActual);
							
								//Fecha Inicio/Fin
								doc.setFont('sans-serif', 'bold');
								doc.setFontSize(7.5);
								doc.text(25, coordYi-40, 'Inicio de Recepción');
								doc.text(60, coordYi-40, ':');
								doc.setFont('sans-serif', 'normal');
								doc.text(70, coordYi-40, valueMaster.FechaHoraInicioRecepcion);
								doc.setFont('sans-serif', 'bold');
								doc.text(25, coordYi-37, 'Fin de Recepción');
								doc.text(60, coordYi-37, ':');
								doc.setFont('sans-serif', 'normal');
								doc.text(70, coordYi-37, valueMaster.FechaHoraFinRecepcion);
								
							}
						},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							// Membrete
							var cord_X = 240;
							var cord_y = 6;
							var pic = imgSaasa;
							doc.addImage(pic, 'JPG', cord_X, cord_y, 40.5, 12.7,'logoSAASA');
							doc.setFontSize(10);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X-225, cord_y+7, "SERVICIOS AEROPORTUARIOS ANDINOS S.A.");
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-225, cord_y+11, 'Dirección: '+valueMaster.DireccionFiscal);
							doc.text(cord_X-225, cord_y+15, 'RUC: '+ valueMaster.RucSaasa);
							
							// Títutlo 
							doc.setFont('arial', 'bold');
							doc.setFontSize(9);
							doc.text(140, 22, 'ANEXO V');

							doc.setFont('arial', 'bold');
							doc.setFontSize(11);
							doc.text(doc.internal.pageSize.width/2, 27, 'INGRESO Y RECEPCIÓN DE LAS MERCANCÍAS', 'center');

							// Formulario de transporte
							var coordX = 14;
							var coordY = 26;
							doc.setFontSize(7.5);
							
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 7, 'Compañía Transportista');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 7, ': ' + valueMaster.CompaniaTransportista);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'Agente de carga internacional');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 11, ': ' + valueMaster.AgenteCargaInternacional);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'Documento de transporte máster');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 15, ': ' + valueMaster.DocumentosTransporteMaster);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 19, 'FyH de Llegada');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 19, ': ' + valueMaster.FechaHoraLlegada);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 23, 'Cantidad de documentos');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+44, coordY + 23, ': ' + valueMaster.CantidadDocumentos);
							
							
							
							//Segunda columna del formulario, alineado a la derecha
							var coordX = 105;
							var coordY = 26;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Nro de vuelo');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + valueMaster.NumeroVuelo);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 19, 'FyH de Térm. descarga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 19, ': ' + valueMaster.FechaHoraTerminoDescarga);
							
							
							//doc.setFont('sans-serif', 'normal');
							//doc.text(coordX+5.5, coordY + 19, 'Inicio de recepción');
							//doc.setFont('sans-serif', 'normal');
							//doc.text(coordX+40, coordY + 19, ': ' + valueMaster.FechaHoraInicioRecepcion);
							//doc.setFont('sans-serif', 'normal');
							//doc.text(coordX+5.5, coordY + 23, 'Fin de recepción');
							//doc.setFont('sans-serif', 'normal');
							//doc.text(coordX+40, coordY + 23, ': ' + valueMaster.FechaHoraFinRecepcion);

							//Tercera columna del formulario
							var coordX = 205;
							var coordY = 26;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Manifiesto de Carga');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' + valueMaster.Manifiesto);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 19, 'Almacén Aduanero');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 19, ': ' + valueMaster.Almacen);
							//doc.setFont('sans-serif', 'normal');
							//doc.text(coordX+5.5, coordY + 19, 'Último origen de emb');
							//doc.setFont('sans-serif', 'normal');
							//doc.text(coordX+40, coordY + 19, ': ' + valueMaster.UltimoOrigenEmb);

							// Header de la tabla (no va en autotable porque tiene varios niveles)			
							var coordX 		= 14;
							var coordY 		= 54;
							var coordMid	=	5.5
							var coordTop	=	4;
							var coordBot	=	7.4;
							doc.setFontSize(6.5);

							// Contorno de linea de la cabecera
							doc.setDrawColor(0, 0, 0);
							doc.rect(coordX, coordY, 269, 10);
							
							// Altura de los Niveles de cabecera: 1°: 4, 2°: 7.4 y Medio: 5.5
							// Cabecera
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX + 4.7, coordY + 3.9, 'N°', 'center');
							doc.text(coordX + 4.7, coordY + coordMid, 'Detalle', 'center');
							doc.text(coordX + 4.7, coordY + 7.6, 'SUNAT', 'center');

							doc.text(coordX + 22, coordY + coordTop, 'Documento', 'center');
							doc.text(coordX + 22, coordY + coordBot, 'Transporte House', 'center');

							//doc.text(coordX + 31, coordY + coordTop, 'Tipo de', 'center');
							//doc.text(coordX + 31, coordY + coordBot, 'bulto', 'center');

							//doc.text(coordX + 43, coordY + coordTop, 'N°', 'center');
							//doc.text(coordX + 43, coordY + coordBot, 'Precinto', 'center');

							doc.text(coordX + 50, coordY + coordMid, 'Consignatario', 'center');

							doc.text(coordX + 83, coordY + coordMid, 'Descripción', 'center');

							doc.text(coordX + 124, coordY + coordTop, 'BULTOS', 'center');
							doc.text(coordX + 103, coordY + coordBot, 'Man.', 'center');
							doc.text(coordX + 114, coordY + coordBot, 'Rec.', 'center');
							doc.text(coordX + 126, coordY + coordBot, 'B/E', 'center');
							doc.text(coordX + 137, coordY + coordBot, 'M/E', 'center');
							//doc.text(coordX + 124, coordY + coordBot, 'Sob.', 'center');
							//doc.text(coordX + 134, coordY + coordBot, 'Falt.', 'center');

							doc.text(coordX + 169, coordY + coordTop, 'PESO', 'center');
							doc.text(coordX + 149, coordY + coordBot, 'Man.', 'center');
							doc.text(coordX + 161, coordY + coordBot, 'Rec.', 'center');
							doc.text(coordX + 176, coordY + coordBot, 'B/E', 'center');
							doc.text(coordX + 189, coordY + coordBot, 'M/E', 'center');
							//doc.text(coordX + 194, coordY + coordBot, 'Sob.', 'center');
							//doc.text(coordX + 205, coordY + coordBot, 'Falt.', 'center');

							doc.text(coordX + 210, coordY + coordMid, 'Acta de inv.', 'center');
							
							doc.text(coordX + 232, coordY + coordMid, 'Estado', 'center');

							doc.text(coordX + 255, coordY + coordMid, 'Observaciones', 'center');

							// Contador
							var str = "Pág     " + doc.internal.getNumberOfPages()

							if (typeof doc.putTotalPages === 'function') {
								str = str + " de " + value.length.toString();
							}
							//Inicio Línea Foot para el total Dinámico
							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 282, footY);
							//End Línea Foot para el total Dinámico
							
							doc.setFont('sans-serif', 'bold');
							
							
							// Ubica donde se va a pintar el contador de paginas
							doc.setFontSize(6);
							var pageSize = doc.internal.pageSize;
							var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
							doc.text(str, data.settings.margin.left+252, pageHeight - 188, 'right');

							// Footer
							var coordX = data.settings.margin.left;
							var coordY = doc.internal.pageSize.height-15;

							doc.setDrawColor(0, 0, 0);
							doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);

							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'normal');
							doc.setTextColor(0, 0, 0)
							var widthPageMargin	=	doc.internal.pageSize.width - (data.settings.margin.left + data.settings.margin.right)
							var baseLegal 		= 	doc.splitTextToSize(valueMaster.BaseLegalAnexo7House);
							var coordYBaseLegal	=	coordY+3.5;
							for (var i in baseLegal) {
								doc.text(doc.internal.pageSize.width/2, coordYBaseLegal, baseLegal[i], 'center');
								coordYBaseLegal	=	coordYBaseLegal+4;
							}
							//
							
							//setFooter(value);
						},
						// Define un ID para cada columna
        				columns:  [
        					{header: '1', 	dataKey: '1'}, 
        					{header: '2', 	dataKey: '2'},
        					{header: '3', 	dataKey: '3'},
        					{header: '4', 	dataKey: '4'},
        					{header: '5', 	dataKey: '5'},
        					{header: '6', 	dataKey: '6'},
        					{header: '7', 	dataKey: '7'},
        					{header: '8', 	dataKey: '8'},
        					{header: '9',	dataKey: '9'},
        					{header: '10', 	dataKey: '10'},
        					{header: '11', 	dataKey: '11'},
        					{header: '12', 	dataKey: '12'},
        					{header: '13', 	dataKey: '13'},
        					{header: '14', 	dataKey: '14'},
        					{header: '15', 	dataKey: '15'}
        					//{header: '16', 	dataKey: '16'},
        					//{header: '17', 	dataKey: '17'},
        					//{header: '18', 	dataKey: '18'},
        					//{header: '19', 	dataKey: '19'}
        				],
        				columnStyles:	{	// Aplica un estilo para cada ID de columna
    										1: {cellWidth:	4,			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 0, right: 1}},
        									2: {cellWidth: 	8.5, 		halign: 'center',	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									//3: {cellWidth: 	7, 			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									//4: {cellWidth: 	5, 			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									3: {cellWidth: 	14, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									4: {cellWidth: 	12, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									5: {cellWidth: 	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									6: {cellWidth: 	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									7: {cellWidth: 	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									8: {cellWidth:	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									//9: {cellWidth:	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									//10: {cellWidth:	1.7, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									9: {cellWidth:	4, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									10: {cellWidth:	5,  		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									11: {cellWidth:	5, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									12: {cellWidth:	5, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									//15: {cellWidth:	4, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									//16: {cellWidth:	3.2, 		halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									13: {cellWidth:	9,			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									14: {cellWidth:	11,			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}},
        									15: {cellWidth:	9,			halign: 'center', 	cellPadding: {top: 1.5, bottom: 1.5, left: 1, right: 1}}
        								}
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp); 
					}
				};

				var setFooter = function (value, cord_x) {
					var coordX	=	doc.internal.pageSize.width;
					var coordY	=	doc.internal.pageSize.height;
					
					/*doc.setFontSize(7.5);
					doc.setFont('sans-serif', 'bold');
					doc.line(coordX/4+3, coordY-18, (coordX/4)+60, coordY-18)
					doc.text(coordX/4, coordY-18, 'SERVICIOS AEROPORTUARIOS ANDINOS S.A.', 'right');	
					
					/////////////////////////////
					var date = new Date();
					var yyyy = date.getFullYear().toString();
					var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
					var dd = utilController.pad(date.getDate().toString(),"0",2);
					var h = utilController.pad(date.getHours(),"0", 2);
					var m = utilController.pad(date.getMinutes(),"0", 2);
					var s = utilController.pad(date.getSeconds(),"0", 2);
					var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding 
					/////////////////////////////
					doc.text(coordX-(coordX/3), coordY-18,  'FECHA DE EMISIÓN:', 'right');	// Esto debe salir de Agente de carga internacional
					doc.setFont('sans-serif', 'normal');
					doc.text((coordX-(coordX/3))+3, coordY-18,  fechaActual);*/
				}; 
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					for(var i in value){
						var valueMaster = value[i];
						setCuerpoDetalle(valueMaster);
						if(i!=value.length-1){
							doc.addPage();
						}
					}
					setFooter(value);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				
				doc.save("DOCUMENTO-" + value[0].Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		},
		onGenerarPDFAnexo2ManifiestoCarga: function (value) {
			$.generarOrdenCompraPDF = function (value) {
				var doc = new jsPDF('l', 'mm', 'a4');
				
				// Contador para el número de páginas
				var totalPagesExp = "{total_pages_count_string}";
				
				var setCabecera = function (values) {
						
				};
				
				var setSubCabecera = function (value) {
				};

				var setHeaderDetalle = function (value) {
				};
				
				var setCuerpoDetalle = function (values) {
					var arrayLinea	=	[];
					var arrayCampo	=	[];
					var arrayFooter	=	[];
					var arrayFooterTotal	=	[];
					var DocumentosTransporte = [];
					var value = values[0];
					
					$.each(values, function (i, element){
						$.each(element.aDetalle, function (i, e){
							DocumentosTransporte.push(e);	
						});
					});
					
					var totalBultos = 0.00;
					var totalPesos = 0.00;
					// Selecciona solo los campos que se van a mostrar. Autotable pinta todos los campos del arreglo				
					for (var i in DocumentosTransporte) {
						for (var t in DocumentosTransporte[i]) {
							var obj = DocumentosTransporte[i];
							arrayCampo	=	[];
							arrayCampo.push(obj.Numero);//N° Detalle SUNAT
							arrayCampo.push(obj.DocumentoTransporteMaster);//Doc Transp Master
							arrayCampo.push(obj.Consignatario);//Consignatario
							arrayCampo.push(obj.ConsignatarioDescripcionTipoIdentificacion);//Descripcion
							arrayCampo.push(obj.ConsignatarioIdentificacion);//Bultos Buenos
							arrayCampo.push(obj.Origen);//Bultos Malos
							arrayCampo.push(obj.Destino);//Pesos Buenos
							arrayCampo.push(obj.Marcas);//Pesos Malos
							arrayCampo.push(obj.Bultos);//N° Acta Inventario
							arrayCampo.push(obj.Peso);//Incidencia
							arrayCampo.push(obj.Descripcion);//Descripción Incidencia
						
							totalBultos += parseInt(obj.Bultos);
							totalPesos += parseFloat(obj.Peso);
						}
						arrayLinea.push(arrayCampo);
						
						//continue;
					}
					
					
					var totalBultosManif = totalBultos;
					var totalPesoManif = totalPesos.toFixed(2);
					// Arma el footer con las sumatorias. Van en "" para que no muestre nada. El autotable requiere la misma cantidad de campos
					
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("");
					arrayFooter.push("TOTALES: ");
					arrayFooter.push(value.totalBultosManif.toString());
					arrayFooter.push(value.totalPesoManif.toString());
					arrayFooterTotal.push(arrayFooter);
					
					var finalY = 70;
					const headerTable = [
						{ title: "", dataKey: 1 },
						{ title: "", dataKey: 2 },
						{ title: "", dataKey: 3 },
						{ title: "", dataKey: 4 },
						{ title: "", dataKey: 5 },
						{ title: "", dataKey: 6 },
						{ title: "", dataKey: 7 },
						{ title: "", dataKey: 8 },
						{ title: "", dataKey: 9 },
						{ title: "", dataKey: 10 },
						{ title: "", dataKey: 11 }
					];

					doc.autoTable(headerTable,arrayLinea,{
						startY: finalY,
						body: arrayLinea,
						theme: 'plain',
						foot: arrayFooterTotal,
						showFoot: 'lastPage',
						showHead: 'never',
						bodyStyles: {valign: 'top'},
						footStyles: {halign: 'center', cellPadding: {top: 3.5, bottom: 1.5, left: 0.2, right: 0.2}, cellWidth: 0},
						margin: {top: 70, right: 15, bottom: 22, left: 14},
						styles: {
									rowPageBreak: 'auto',
									fontSize:5.8,
									textColor:[0, 0, 0],
									valign: 'top',
									minCellWidth: 1,
									minCellHeight: 12,
									cellPadding: {top: 1.5}
						},
						didDrawPage: function (data) {	// Dibuja la estructura en todas las páginas
							var value = values[0];
							// Membrete
							var cord_X = 240;
							var cord_y = 6;
	
							/////////////////////////////
							var date = new Date();
							var yyyy = date.getFullYear().toString();
							var mm = utilController.pad((date.getMonth() + 1).toString(),"0",2); // getMonth() is zero-based
							var dd = utilController.pad(date.getDate().toString(),"0",2);
							var h = utilController.pad(date.getHours(),"0", 2);
							var m = utilController.pad(date.getMinutes(),"0", 2);
							var s = utilController.pad(date.getSeconds(),"0", 2);
							var fechaActual =   dd + "/" + mm + "/" + yyyy; // padding
							/////////////////////////////
	
							doc.setFontSize(10);
							doc.setFont('arial', 'bold'); 
							doc.text(cord_X-230, cord_y+7,value.RazonSocialAerolinea);
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-230, cord_y+11, value.DireccionFiscalAerolinea);
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X-230, cord_y+15, "RUC: " + value.RucAerolinea);
							
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X+42, cord_y+11, "",'right');
							doc.setFontSize(7);
							doc.setFont('arial', 'normal');
							doc.text(cord_X+42, cord_y+7, fechaActual,'right');
							
							// Títutlo 
							doc.setFont('arial', 'bold');
							doc.setFontSize(9);
							doc.text(140, 22, 'ANEXO II');
	
							doc.setFont('arial', 'bold');
							doc.setFontSize(11);
							doc.text(125, 27, 'MANIFIESTO DE CARGA');
	
							// Formulario de transporte
							var coordX = 14;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 11, 'Id. de Vehículo');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+26, coordY + 11, ': ' + "");
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 15, 'Matricula');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+26, coordY + 15, ': ' + value.Matricula);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX, coordY + 19, 'Número de Vuelo');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+26, coordY + 19, ': ' + value.NumeroVuelo);
	
							//Segunda columna del formulario, alineado a la derecha
							var coordX = 105;
							var coordY = 28;
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 11, 'Fecha de Zarpe');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + value.FechaZarpeString);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'País y Lugar de Embarque');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ');
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 19, 'País y Lugar de Destino');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 19, ': ' + value.DTPuertoFinal);
	
							//Tercera columna del formulario
							var coordX = 205;
							var coordY = 29.5;
							
							utilController.alignTextJsPDF(doc,value.DescripcionSaasa,coordX+42,coordY + 15,50,"normal");    
							
							doc.setFontSize(7.5);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 11, 'Fecha Estimada de Llegada');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 11, ': ' + value.TransporteFechaEstimadaLlegada);
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 15, 'Almacén de Destino');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 15, ': ' );
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX+5.5, coordY + 21, 'Almacén Aduanero');
							doc.setFont('sans-serif', 'normal');
							doc.text(coordX+40, coordY + 21, ': ' + value.CodigoSaasa);
	
							// Header de la tabla (no va en autotable porque tiene varios niveles)			
							var coordX = 14;
							var coordY = 54;
							doc.setFontSize(6.5);
	
							// Contorno de linea de la cabecera
							doc.setDrawColor(0, 0, 0);
							doc.rect(coordX, coordY, 269, 12);
	
							// Cabecera
							doc.setFont('sans-serif', 'bold');
							doc.text(coordX + 5, coordY + 6, 'N°');
							
							doc.text(coordX + 23, coordY + 5, 'Documento de');
							doc.text(coordX + 25, coordY + 7, 'transporte');
	
							doc.text(coordX + 58, coordY + 6, 'Consignatario');
	
							doc.text(coordX + 90, coordY + 5, 'Tipo de');
							doc.text(coordX + 89, coordY + 7, 'Documento');
							
							doc.text(coordX + 115, coordY + 6, 'N° Documento');
							
							doc.text(coordX + 144, coordY + 5, 'Puerto');
							doc.text(coordX + 144, coordY + 7, 'Origen');
							
							doc.text(coordX + 159, coordY + 5, 'Puerto');
							doc.text(coordX + 159, coordY + 7, 'Destino');
							
							doc.text(coordX + 173, coordY + 5, 'Marcas-');
							doc.text(coordX + 173, coordY + 7, 'precintos');
							
							doc.text(coordX + 188, coordY + 5, 'Cantidad de');
							doc.text(coordX + 191, coordY + 7, 'bultos');
							
							doc.text(coordX + 205, coordY + 6, 'Peso bruto');
							
							doc.text(coordX + 225, coordY + 6, 'Descripción de mercancías');
							//Inicio Línea Foot para el total Dinámico
							
							// Membrete
							var cord_X = 240;
							var cord_y = 6;

							var footX = data.table.foot[0].x+2;
							var footY = data.table.foot[0].y;
							doc.line(footX, footY, 282, footY);
							//End Línea Foot para el total Dinámico
							
						},
        				columnStyles:	{
    										1: {cellWidth: 3.5, halign: 'center'},
    										2: {cellWidth: 8, halign: 'center'},
        									3: {cellWidth: 10.5, halign: 'center'},
        									4: {cellWidth: 5, halign: 'center'},
        									5: {cellWidth: 9, halign: 'center'},
        									6: {cellWidth: 4, halign: 'center'},//Bulto bueno
        									7: {cellWidth: 4, halign: 'center'},//Bulto malo
        									8: {cellWidth: 4, halign: 'center'},//Peso bueno
        									9: {cellWidth: 4, halign: 'center'},//Peso malo
        									10: {cellWidth: 4, halign: 'center'},//N° Acta Inventario
        									11: {cellWidth: 13, halign: 'center'},//Descripcion Incidencia
        								}
					});

					// Imprime el numero total de paginas del PDF
					if (typeof doc.putTotalPages === 'function') {
						doc.putTotalPages(totalPagesExp);
					}
				};

				var setFooter = function (values, coordX, coordY) {
					// Footer
					var coordX	=	doc.internal.pageSize.width;
					var coordY	=	doc.internal.pageSize.height;
					
					var value = values[0];
					doc.setFontSize(6.5);
					doc.text(53, coordY - 22, 'Cantidad Total de Documentos de Transporte: ', 'right');
					doc.text(58, coordY - 22, value.CantidadDocumentos);
					doc.text(53, coordY - 25, 'Capitán de la Nave:', 'right')
					doc.text(58, coordY - 25, value.CapitanTransporte);
					doc.text(53, coordY - 28, 'N° Doc. Identidad:', 'right');
					
					doc.setDrawColor(0, 0, 0);
					//doc.line(coordX, coordY, doc.internal.pageSize.width-data.settings.margin.right, coordY);
					doc.setFontSize(9.5);
					doc.setFont('sans-serif', 'normal');
					doc.setTextColor(0, 0, 0)
					var baseLegal 		= 	doc.splitTextToSize(value.BaseLegalAnexo6MasterDirecta);
					var coordYBaseLegal	=	coordY+3.5;

					var coordX2	=	doc.internal.pageSize.width;
					var coordY2	=	doc.internal.pageSize.height;
					doc.setFontSize(7.5);
					doc.setFont('sans-serif', 'bold');

					// Obtiene el ancho de cada texto para luego pintar la linea 
					var sign1Width	=	doc.getTextWidth(value.RazonSocialAerolinea);
					var textoFijo	=	'FIRMA Y SELLO DEL TRANSPORTISTA O SU REPRESENTANTE EN EL PAÍS';

					doc.line((coordX/2)-70, coordY-18, (coordX/2)+50+30, coordY-18)
					doc.text((coordX/2)+50, coordY-10, textoFijo, 'right');
				};
				
				var cordXTabla = 36;
				var cordYTabla = 80;
				var setDetalle = function (Detalle) {
					setCabecera(value);
					setSubCabecera(value);
					setHeaderDetalle(value);
					//setCuerpoDetalle(value);
					//var valueMaster = value[0];
					setCuerpoDetalle(value);
					
					setFooter(value, 280, 50);
				};
				// DETALLE
				var Detalle = value.aDetalle;
				setDetalle(Detalle);
				sap.ui.core.BusyIndicator.hide()
				Busy.close();
				
				doc.save("DOCUMENTO-" + value[0].Titulo.trim() + '.pdf');
			};
			$.generarOrdenCompraPDF(value);
		},
		///End Descargar PDF///
	};
});