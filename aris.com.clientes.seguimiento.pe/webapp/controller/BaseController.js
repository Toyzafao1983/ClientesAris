sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/UIComponent",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment",
	"sap/ui/core/BusyIndicator",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	'sap/ui/model/FilterOperator',
	"sap/ui/export/Spreadsheet",
	'sap/m/Token',
	"aris/com/clientes/seguimiento/pe/services/ServiceOdata",
	"aris/com/clientes/seguimiento/pe/model/models",
	"aris/com/clientes/seguimiento/pe/model/formatter",
	"aris/com/clientes/seguimiento/pe/services/Services",
	"aris/com/clientes/seguimiento/pe/util/util",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/model/resource/ResourceModel"
], function (Controller, History, UIComponent, MessageBox, MessageToast, Fragment, BusyIndicator, JSONModel,
	Filter, FilterOperator, Spreadsheet, Token, ServiceOdata, models, Formatter, Services, util, NumberFormat, ResourceModel) {
	"use strict";
	var that;
	var sMessage = "";
	var that;

	return Controller.extend("aris.com.clientes.seguimiento.pe.controller.BaseController", {
		formatter: Formatter,
		local: window.location.href.indexOf('launchpad') == -1 ? true : false,
		localModel: true,
		AdminUser: true,
		userSet: "kestefo@ravaconsulting.com.pe",
		route: "aris.com.clientes.seguimiento.pe",
		//tUniNeg: "",
		//tRol: "",
		_getUsers: function () {
			that = this;
			try {
				var model = new sap.ui.model.json.JSONModel();
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					const sMail = that.getUserLoged();
					if (that.local) {
						const sPath = '/service/scim/Users?filter=emails eq "' + sMail + '"';
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/API-USER-IAS/service/scim/Users?filter=emails eq "' + sMail + '"';
						sUrl = sPath;
					}
					if (that.local) {
						setTimeout(() => {
							if (that.AdminUser) {
								resolve(models.oModelUserExt());
							} else {
								resolve(models.oModelUser());
							}
						}, "1000");
					} else {
						model.loadData(sUrl, null, true, "GET", null, null, {
							"Content-Type": "application/scim+json"
						}).then(() => {
							var oDataTemp = model.getData();
							resolve(oDataTemp);
						}).catch(err => {
							void 0;
							reject(err);
						});
					}
				});
			} catch (oError) {
				this.getMessageBox("error", this.getI18nText("sErrorTry"));
			}
		},
		getUserLoged: function () {
			var user = "";
			if (this.local || this.isEmpty(sap.ushell)) {
				user = this.userSet;
			} else {
				if (this.isEmpty(sap.ushell.Container.getService("UserInfo").getUser().getEmail())) {
					user = this.userSet;
				} else {
					user = sap.ushell.Container.getService("UserInfo").getUser().getEmail();
				}
			}
			return user;
		},
		validateUser: function () {
			that = this;
			var oModel = new sap.ui.model.json.JSONModel();
			this.getView().setModel(oModel);

			oModel.loadData("/services/userapi/attributes");
			return new Promise(function (resolve, reject) {
				oModel.attachRequestCompleted(function onCompleted(oEvent) {
					void 0;
					void 0;
					void 0;
					if (oEvent.getParameter("success")) {
						resolve(oModel.getData());
					} else {
						var msg = oEvent.getParameter("errorObject").textStatus;
						if (msg) {
							reject(msg);
							this.setData("status", msg);
						} else {
							reject("Unknown error retrieving user info");
							this.setData("status", "Unknown error retrieving user info");
						}

					}
				});
			});

		},
		_onbtnHome: function () {
			that = this;
			MessageBox.warning(this.getI18nText("textbtnHome"), {
				actions: [this.getI18nText("acceptText"), this.getI18nText("cancelText")],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sAction) {
					if (sAction === that.getI18nText("acceptText")) {
						var aplicacion = "#";
						var accion = "";
						if (!that.isEmpty(sap.ushell)) {
							var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
							oCrossAppNavigator.toExternal({
								target: {
									semanticObject: aplicacion,
									action: accion
								}
							});
						}
					}
				}
			});
		},
		showMessageBoxAndBack: function (msg, Method) {
			var that = this;
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			if (Method === "warning") {
				sap.m.MessageBox.warning(msg, {
					title: "Alerta",
					actions: ["Aceptar"],
					onClose: function (sActionClicked) {
						oCrossAppNavigator.toExternal({
							target: {
								semanticObject: "#"
							}
						});
					}
				});
			}
			if (Method === "error") {
				sap.m.MessageBox.error(msg, {
					title: "Error",
					actions: ["Aceptar"],
					onClose: function (sActionClicked) {
						this.onBackHome();
					}
				});
			}
			if (Method === "show") {
				sap.m.MessageBox.show(msg, {
					title: "Mensaje",
					actions: ["Aceptar"],
					onClose: function (sActionClicked) {
						oCrossAppNavigator.toExternal({
							target: {
								semanticObject: "#"
							}
						});
					}
				});
			}
			if (Method === "success") {
				sap.m.MessageBox.success(msg, {
					title: "Éxito",
					actions: ["Aceptar"],
					onClose: function (sActionClicked) {
						oCrossAppNavigator.toExternal({
							target: {
								semanticObject: "#"
							}
						});
					}
				});
			}
		},
		onBackHome: function () {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			var oQueryParams = this.getQueryParameters(window.location);
			if (sPreviousHash !== undefined || oQueryParams.navBackToLaunchpad) {
				window.history.go(-1);
			} else {
				this.oRouter.navTo("default", true);
			}
		},
		isEmpty: function (inputStr) {
			var flag = false;
			if (inputStr === '') { flag = true; }
			if (inputStr === null) { flag = true; }
			if (inputStr === undefined) { flag = true; }
			if (inputStr == null) { flag = true; }
			return flag;
		},
		validateInternet: function () {
			var bValidate = false;
			if (!window.navigator.onLine) {
				bValidate = true;
				MessageToast.show(this.getI18nText("warningInternet"));
			}
			return bValidate;
		},
		getComponentData: function () {
			return this.getOwnerComponent().getComponentData();
		},
		showErrorMessage: function (sError, sDetail) {
			var sDetail2 = String(sDetail);
			return MessageBox.error(sError, {
				title: "Error",
				details: sDetail2,
				styleClass: "sapUiSizeCompact",
				contentWidth: "100px"
			});
		},
		downloadFileCordova2: function (fileToSave, fileName) {
			saveFile(dirEntry, blob, fileName);
		},
		downloadFileCordova: function (fileToSave, fileName) {
			writeFile(fileToSave);

			function writeFile() {
				void 0;
				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFileSystemRetrieved, onFileSystemFail);
			}

			function onFileSystemRetrieved(fileSystem) {
				void 0;
				fileSystem.root.getFile(fileName, {
					create: true
				}, onFileEntryRetrieved, onFileSystemFail);
			}

			function onFileEntryRetrieved(fileEntry) {
				void 0;
				fileEntry.createWriter(gotFileWriter, onFileSystemFail);
			}

			function gotFileWriter(writer) {
				void 0;

				writer.onwrite = function (evt) {
					alert('done');
				}
				writer.write(fileToSave);

				window.open(fileName, '_blank');
			}

			function onFileSystemFail(error) {
				void 0;
				alert(error.code)
			}
		},
		getBlobFromFile: function (sFile) {
			var contentType = sFile.substring(5, sFile.indexOf(";base64,"));

			var base64_marker = "data:" + contentType + ";base64,";
			var base64Index = base64_marker.length;
			contentType = contentType || "";
			var sliceSize = 512;
			var byteCharacters = window.atob(sFile.substring(base64Index)); //method which converts base64 to binary
			var byteArrays = [];
			for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
				var slice = byteCharacters.slice(offset, offset + sliceSize);
				var byteNumbers = new Array(slice.length);
				for (var i = 0; i < slice.length; i++) {
					byteNumbers[i] = slice.charCodeAt(i);
				}
				var byteArray = new Uint8Array(byteNumbers);
				byteArrays.push(byteArray);
			}
			var blob = new Blob(byteArrays, {
				type: contentType
			});

			return blob;
		},
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},
		onNavBack: function () {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("RouteBusqueda");
			}
		},
		getI18n: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},
		getI18nText: function (sText) {
			return this.oView.getModel("i18n") === undefined ? false : this.oView.getModel("i18n").getResourceBundle().getText(sText);
		},
		getResourceBundle: function () {
			return this.oView.getModel("i18n").getResourceBundle();
		},
		getModel: function (sModel) {
			return this.oView.getModel(sModel);
		},
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},
		_byId: function (sName) {
			var cmp = this.byId(sName);
			if (!cmp) {
				cmp = sap.ui.getCore().byId(sName);
			}
			return cmp;
		},
		getMessageBox: function (sType, sMessage) {
			return MessageBox[sType](sMessage);
		},
		getMessageBox1: function (sType, sMessage, sParameter) {
			return MessageBox[sType](sMessage, sParameter);
		},
		getMessageBoxFlex: function (sType, sMessage, _this, aMessage, sAction, sRoute, sAction2) {
			that = _this;
			return MessageBox[sType](sMessage, {
				actions: sAction === "" ? [sAction2] : [sAction, sAction2],
				onClose: function (oAction) {
					if (oAction === sAction && sRoute === "ErrorUpdate") {
						this.createMessageLog(aMessage, that);
					}
					if (oAction === sAction && sRoute === "InformationTreat") {
						var oJson = {
							NoticeNumber: this._notification,
							Flag: "",
							SystemStatus: "",
							UserStatus: ""
						};
						this.updateStateNotific("Treat", oJson, that);
					}
					if (oAction === sAction && sRoute === "InformationPostpone") {
						var oJson = {
							NoticeNumber: this._notification,
							Flag: "",
							SystemStatus: "",
							UserStatus: ""
						};
						this.updateStateNotific("Postpone", oJson, that);
					}
					if (oAction === sAction && sRoute === "InformationClose") {
						var oJson = {
							NoticeNumber: this._notification,
							RefDate: aMessage.RefDate,
							RefTime: aMessage.RefTime,
							Flag: "",
							SystemStatus: "",
							UserStatus: ""
						};
					}
					if (oAction === sAction && sRoute === "ErrorTakePhoto") {
						this._onTakePhoto();
					}
					if (oAction === sAction2 && sRoute === "SuccessUpdate") {
						var sIdNotification = this._notification;
						this.getNotificationDetail(sIdNotification);
					}
					if (oAction === sAction && sRoute === "WarningCancel") {
						var oData = this.getModel("backup").getData();
						this.getModel("createAd").setData(JSON.parse(JSON.stringify(oData)));
					}
					if (oAction === sAction2 && sRoute === "SuccesRegister") {
						var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
						oCrossAppNavigator.toExternal({
							target: {
								semanticObject: "#"
							}
						});
					}
					if (oAction === sAction && sRoute === "ErrorUpload") {
						BusyIndicator.show();
						ServiceOdata.oFTP("create", "/HeaderFileSet", this.aCreateFile, "", "1", that).then(function (resolve) {
							BusyIndicator.hide();
						}, function (error) {
							BusyIndicator.hide();
							this.getMessageBoxFlex("error", this.getI18nText("errorFTP"), that, "", this.getI18nText("yes"),
								"ErrorUpload", this.getI18nText("no"));
						});
					}
					if (oAction === sAction && sRoute === "ErrorUploadSharepoint") {
						this._saveDocuments(this.aCreateFile);
					}
				}
			});
		},
		createMessageLog: function (aMessage, _this) {
			that = _this;
			aMessage.forEach(function (oItem) {
				switch (oItem.MessageType) {
					case "E":
						oItem.MessageType = "Error";
						break;
					case "W":
						oItem.MessageType = "Warning";
						break;
					case "I":
						oItem.MessageType = "Information";
						break;
					case "C":
						oItem.MessageType = "Confirm";
						break;
					default:
				}
			});
			var oMessageTemplate = new sap.m.MessageItem({
				type: '{MessageType}',
				title: '{MessageText}',
			});

			var oModel = new JSONModel();
			oModel.setData(aMessage);

			var oBackButton = new sap.m.Button({
				icon: sap.ui.core.IconPool.getIconURI("nav-back"),
				visible: false,
				press: function () {
					this.oMessageView.navigateBack();
					this.setVisible(false);
				}
			});

			this.oMessageView = new sap.m.MessageView({
				showDetailsPageHeader: false,
				itemSelect: function () {
					oBackButton.setVisible(true);
				},
				items: {
					path: "/",
					template: oMessageTemplate
				}
			});

			this.oMessageView.setModel(oModel);

			this.oDialog = new sap.m.Dialog({
				resizable: true,
				content: this.oMessageView,
				state: 'Error',
				beginButton: new sap.m.Button({
					press: function () {
						this.getParent().close();
					},
					text: "Cerrar"
				}),
				customHeader: new sap.m.Bar({
					contentMiddle: [
						new sap.m.Text({
							text: "Error"
						})
					],
					contentLeft: [oBackButton]
				}),
				contentHeight: "300px",
				contentWidth: "500px",
				verticalScrolling: false
			});
			this.oMessageView.navigateBack();
			this.oDialog.open();
		},
		getScanner: function (oEvent, controller, oBarcode) {
			that = controller;
			var sPath;
			if (!this._oScanDialog) {
				this._oScanDialog = new sap.m.Dialog({
					title: "Scan barcode",
					contentWidth: "640px",
					contentHeight: "480px",
					horizontalScrolling: false,
					verticalScrolling: false,
					stretchOnPhone: true,
					content: [
						new sap.ui.core.HTML({
							content: "<div id='barcode'> <video id='barcodevideo'   autoplay></video>	<canvas id='barcodecanvasg' ></canvas></div><canvas id='barcodecanvas' ></canvas><div id='result'></div>"
						})
					],
					endButton: new sap.m.Button({
						text: "Cancelar",
						press: function (oEvent) {
							this._oScanDialog.close();
						}.bind(that)
					}),
					afterOpen: function () {

						oBarcode.config.start = 0.0;
						oBarcode.config.end = 1.0;
						oBarcode.config.video = '#barcodevideo';
						oBarcode.config.canvas = '#barcodecanvas';
						oBarcode.config.canvasg = '#barcodecanvasg';

						oBarcode.setHandler(function (oBarcode) {
							this.getView().byId("equipment").setValue(oBarcode);
							this._oScanDialog.close();
							return new Promise(function (resolve, reject) {
								sPath = this.oModel.createKey("/Equipment", {
									Equipment: oData.EquipOrTechLocat
								});
								this.oModel.read(sPath, {
									success: function (result) {
										resolve(result);
									},
									error: function (error) {
										reject();
										this.getMessageBox("error", this.getI18nText("error"));
										$.oLog.push({
											error: error,
											date: new Date()
										});
									}
								});
							});
						});
						oBarcode.init();
					}.bind(that)
				});

				this.getView().addDependent(this._oScanDialog);
			}
			this._oScanDialog.open();
		},
		getDaysBefore: function (date, days) {
			var _24HoursInMilliseconds = 86400000;
			var daysAgo = new Date(date.getTime() + days * _24HoursInMilliseconds);
			daysAgo.setHours(0);
			daysAgo.setMinutes(0);
			daysAgo.setSeconds(0);
			return daysAgo;
		},
		handleMessageToast: function (message) {
			MessageToast.show(message);
		},
		setTextField: function (ofield, valueItem) {
			this._byId(ofield).setText(valueItem);
		},
		setFragment: function (sDialogName, sFragmentId, sNameFragment, that) {
			try {
				if (!that[sDialogName]) {
					that[sDialogName] = sap.ui.xmlfragment(sFragmentId, this.route + ".view.dialogs." + sNameFragment,
						that);
					this.getView().addDependent(that[sDialogName]);
				}
				that[sDialogName].open();
			} catch (error) {
				this.getMessageBox("error", this.getI18nText("error"));
				$.oLog.push({
					error: error,
					date: new Date()
				});
			}
		},
		Destroy: function (that) {
			if (that["_dialogCreate"]) {
				that["_dialogCreate"].destroy();
			}
		},
		_treefy: function (arr, sPropertyPrincipal, sPropertyPatern, sType) {
			var _cleanTree = function (tree) {
				for (var i = 0, len = tree.length; i < len; i++) {
					delete tree[i]["__metadata"];
					if (tree[i].nodes.length === 0) {
						delete tree[i].nodes;
					} else {
						_cleanTree(tree[i]["nodes"]);
					}
				}
			};

			var tree = [],
				mappedArr = {},
				arrElem,
				mappedElem;

			for (var i = 0, len = arr.length; i < len; i++) {
				arrElem = arr[i];
				mappedArr[arrElem[sPropertyPrincipal]] = arrElem;
				mappedArr[arrElem[sPropertyPrincipal]]["nodes"] = [];
			}

			for (var id in mappedArr) {
				if (mappedArr.hasOwnProperty(id)) {
					mappedElem = mappedArr[id];
					if (!mappedElem.Flag) {
						mappedElem.ref = "sap-icon://functional-location";
					} else {
						mappedElem.ref = "sap-icon://machine";
					}
					if (mappedElem[sPropertyPrincipal] && mappedElem[sPropertyPatern] !== "") {
						mappedArr[mappedElem[sPropertyPatern]]["nodes"].push(mappedElem);
					}
					else {
						tree.push(mappedElem);
					}
				}
			}
			_cleanTree(tree);
			return tree;
		},
		_onCloseDialog: function (oEvent) {
			oEvent.destroy();
		},
		reverseStringForParameter: function (str, variable) {
			var splitString = str.split(variable);
			var reverseArray = splitString.reverse();
			var joinArray = reverseArray.join(variable);
			return joinArray;
		},
		onValidateChange: function (oEvent) {
			var kSelected = oEvent.getSource().getSelectedKey();
			var sSelected = oEvent.getSource().getValue();
			if (kSelected !== '') {
				oEvent.getSource().setValue(sSelected);
			} else {
				if (oEvent.getSource().getValue()) {
					this.getMessageBox("error", this.getI18nText("sErrorSelect"));
				}
				oEvent.getSource().setValue("");
			}
		},
		liveChangeFormatInteger: function (oEvent) {
			var oSource = oEvent.getSource();
			var values = oSource.getValue();
			var regex = /[^\d]/g;
			var x = values.replace(/[^\d]/g, '');

			if (values.match(regex)) { var x = values; }
			else { var x = values.substring(0, values.length - 1); }
			var x = parseInt(values);
			var sValueUsed = isNaN(x) ? '0' : x;

			oSource.setValue(sValueUsed);
		},
		liveChangeFormatFloat: function (oEvent) {
			var oSource = oEvent.getSource();
			var values = oSource.getValue();
			var regex = /[^\d]/g;
			var x = values.replace(/[^\d]/g, '');

			if (values.match(regex)) { var x = values; }
			else { var x = ''; }
			var x = parseFloat(values);
			var sValueUsed = isNaN(x) ? '0.00' : values;

			oSource.setValue(sValueUsed);
		},
		liveChangeDialogFromTo: function (oEvent) {
			var oSource = oEvent.getSource(),
				sValue = oSource.getValue(),
				sIdfragment = oSource.getId().split("--")[0],
				sCustom = oSource.data("custom");

			if (this.isEmpty(sValue)) {
				this._byId(sIdfragment + "--" + sCustom).setValue("");
				this._byId(sIdfragment + "--" + sCustom).setEnabled(false);
			} else { this._byId(sIdfragment + "--" + sCustom).setEnabled(true); }

			oSource.setValue(sValue);
		},
		ChangeSelectedDialogFrom: function (oEvent) {
			var oSource = oEvent.getSource(),
				sValue = oSource.getValue(),
				sIdfragment = oSource.getId().split("--")[0],
				sCustom = oSource.data("custom"),
				sCustomParameter = sCustom.split("/")[0],
				sTextParameter = sCustom.split("/")[1],
				sObject = oSource.getSelectedItem() ? oSource.getSelectedItem().getBindingContext("oModelData").getObject() : "";

			if (this.isEmpty(oSource.getSelectedKey())) {
				this._byId(sIdfragment + "--" + sCustomParameter.slice(0, -4) + "To").setValue("");
				this._byId(sIdfragment + "--" + sCustomParameter.slice(0, -4) + "To").setEnabled(false);
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter, "");
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter + "Text", "");
			} else {
				this._byId(sIdfragment + "--" + sCustomParameter.slice(0, -4) + "To").setEnabled(true);
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter, oSource.getSelectedKey());
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter + "Text", sObject[sTextParameter]);
			}

			oSource.setValue(sValue);
		},
		ChangeSelectedDialogTo: function (oEvent) {
			var oSource = oEvent.getSource(),
				sValue = oSource.getValue(),
				sCustom = oSource.data("custom"),
				sCustomParameter = sCustom.split("/")[0],
				sTextParameter = sCustom.split("/")[1],
				sObject = oSource.getSelectedItem().getBindingContext("oModelData").getObject();

			if (this.isEmpty(oSource.getSelectedKey())) {
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter, "");
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter + "Text", "");
				if (sCustomParameter === "cbPlanningCenter") {
					that.getModel("oModelData").setProperty("/oTechnicalLocation", []);
				}
			} else {
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter, oSource.getSelectedKey());
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter + "Text", sObject[sTextParameter]);
				if (sCustomParameter === "cbPlanningCenter") {
					this._byId(this.frgIdFilterInit + "--" + "cbPlanningGroupFrom").setSelectedKey("");
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/cbPlanningGroupFrom", "");
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/cbPlanningGroupFromText", "");

					this._byId(this.frgIdFilterInit + "--" + "cbPlanningGroupTo").setSelectedKey("");
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/cbPlanningGroupTo", "");
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/cbPlanningGroupToText", "");

					this._byId(this.frgIdFilterInit + "--" + "miTechnicalLocationFrom").removeAllTokens(true);
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/miTechnicalLocationFrom", "");
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/miTechnicalLocationFromText", "");

					this._byId(this.frgIdFilterInit + "--" + "miTechnicalLocationTo").removeAllTokens(true);
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/miTechnicalLocationTo", "");
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/miTechnicalLocationToText", "");

					this._byId(this.frgIdFilterInit + "--" + "cbState").setSelectedKey("");
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/cbState", "");
					this.getView().getModel("oModelProyect").setProperty("/Main/filter/cbStateText", "");


					let oTechnicalLocationFilter = that.getModel("oModelData").getProperty("/oTechnicalLocationTotal").filter((sValue) => sValue.Iwerk === oSource.getSelectedItem().getKey());
					let oGroupPlanningFilter = that.getModel("oModelData").getProperty("/oGroupPlanningTotal").filter((sValue) => sValue.Iwerk === oSource.getSelectedItem().getKey());

					that.getModel("oModelData").setProperty("/oTechnicalLocation", oTechnicalLocationFilter);
					that.getModel("oModelData").setProperty("/oGroupPlanning", oGroupPlanningFilter);
				}
			}
			oSource.setValue(sValue);
		},
		TokenUpdateDialogFrom: function (oEvent) {
			var oSource = oEvent.getSource(),
				sIdfragment = oSource.getId().split("--")[0],
				sCustom = oSource.data("custom"),
				sCustomParameter = sCustom.split("/")[2],
				sObject = oSource.getSelectedKey();

			if (oEvent.mParameters.type === "removed") {
				this._byId(sIdfragment + "--" + sCustomParameter.slice(0, -4) + "To").setValue("");
				this._byId(sIdfragment + "--" + sCustomParameter.slice(0, -4) + "To").setEnabled(false);
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter, "");
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter + "Text", "");
			} else {
				let oTechnicalLocationFilter = that.getModel("oModelData").getProperty("/oTechnicalLocationTotal").filter((sValue) => sValue.Tplnr === oSource.getSelectedKey());

				this._byId(sIdfragment + "--" + sCustomParameter.slice(0, -4) + "To").setEnabled(true);
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter, oSource.getSelectedKey());
				this.getView().getModel("oModelProyect").setProperty("/Main/filter/" + sCustomParameter + "Text", oTechnicalLocationFilter[0].Pltxt);
			}
		},
		_onPressClose: function (oEvent) {
			var oSource = oEvent.getSource();
			var sCustom = oSource.data("custom");
			switch (sCustom) {
				case "FilterInit":
					oSource.getParent().close();
					break;
				default:
					oSource.getParent().close();
			}
		},
		_onClearComponentClient: function () {
			this._byId("frgIdSelectClient--slUsuario").setSelectedKey("");
		},
		_onClearDataCliente: function () {
		},
		_onClearComponentDialogPromotions: function () {

		},
		_onClearDataDialogPromotions: function () {
			this._byId("frgIdAddPromotions--idAddPromotions").setText("");
		},
		_onClearComponentSelectClient: function () {
			this.oModelPedidoVenta.setProperty("/DataGeneral/oPromotions/oPromotionDetail", []);
			this.oModelPedidoVenta.setProperty("/DataGeneral/oPromotions/oPromotionPadre", []);
		},
		_onClearComponentDetailClient: function () {
			this._byId("frgIdDetailCliente--slDirecciones").setSelectedKey("");
			this._byId("frgIdDetailCliente--rbgComprobante").setSelectedIndex(0);
			this._byId("frgIdDetailCliente--inOrdenCompra").setValue("");
			this._byId("frgIdDetailCliente--tardenCompra").setValue("");
		},
		_onClearDataDetailClient: function () {
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/sNumPedido", "");
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/sStatus", "");
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/oFlete", []);
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/oSelectedCliente", {});
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/oMaterialSelectEan", {});
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/oMaterialSelectMasive", {
				titulo: "",
				oDataCargadaPrev: [],
				oDataCargadaMost: []
			});
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/Spots", {
				items: [{}]
			});
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/oPromotions", {
				oComponent: {},
				sCantBoni: "",
				sCantProm: "",
				oPromotion: [],
				oTablaPrimerMoment: [],
				oPromotionDetail: [],
				oPromotionPadre: [],
				oPromotionSelect: [],
				sPromotionSelect: ""
			});
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/oSelectedLineaCredito", {});
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/oMaterial", []);
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/objects", {});
		},
		_onClearComponentAddManualProduct: function () {
			this._byId("frgIdAddManualProduct--slFamilia").setSelectedKey("");
			this._byId("frgIdAddManualProduct--tbMaterialesManual").removeSelections(true);
			this._byId("frgIdAddManualProduct--tbMaterialesManual").setVisible(false);
			this._byId("frgIdAddManualProduct--btnNextAddManualProduct").setVisible(true);
			this._byId("frgIdAddManualProduct--btnAcceptAddManualProduct").setVisible(false);
		},
		_onClearDataAddManualProduct: function () {
			this.oModelGetPedidoVenta.setProperty("/oMaterialFamiliaSelected", []);
		},
		_onClearComponentTableProduct: function () {
			this._byId("tbProductos").removeSelections(true);
		},
		_onClearDatatTableProduct: function () {
		},
		_onClearComponentDialogEan: function () {
			this._byId("frgIdAddEan--inCodeEan").setValue("");
		},
		_onClearDataDialogEan: function () {
			this.oModelGetPedidoVenta.setProperty("/oMaterialEanSelected", []);
		},
		_onClearComponentDialogMasive: function () {
		},
		_onClearDataDialogMasive: function () {
			this.getModel("oModelPedidoVenta").setProperty("/DataGeneral/oMaterialSelectMasive", {
				titulo: "",
				oDataCargadaPrev: [],
				oDataCargadaMost: []
			});
		},
		goNavConTo: function (sFragmentId, sNavId, sPageId) {
			var oNavCon = Fragment.byId(sFragmentId, sNavId);
			var oDetailPage = Fragment.byId(sFragmentId, sPageId);
			oNavCon.to(oDetailPage);
		},
		_groupByKey: function (array, groups, valueKey) {
			var map = new Map;
			groups = [].concat(groups);
			return array.reduce((r, o) => {
				groups.reduce((m, k, i, {
					length
				}) => {
					var child;
					if (m.has(o[k])) return m.get(o[k]);
					if (i + 1 === length) {
						child = Object.assign(...groups.map(k => ({
							[k]: o[k]
						})), {
							[valueKey]: 0
						});
						r.push(child);
					} else {
						child = new Map;
					}
					m.set(o[k], child);
					return child;
				}, map)[valueKey] += +o[valueKey];
				return r;
			}, [])
		},
		_groupBy: function (array, param) {
			return array.reduce(function (groups, item) {
				const val = item[param]
				groups[val] = groups[val] || []
				groups[val].push(item)
				return groups
			}, {});
		},
		zfill: function (number, width) {
			var numberOutput = Math.abs(number);
			var length = number.toString().length;
			var zero = "0";

			if (width <= length) {
				if (number < 0) {
					return ("-" + numberOutput.toString());
				} else {
					return numberOutput.toString();
				}
			} else {
				if (number < 0) {
					return ("-" + (zero.repeat(width - length)) + numberOutput.toString());
				} else {
					return ((zero.repeat(width - length)) + numberOutput.toString());
				}
			}
		},
		validateTwoDigit: function (value) {
			if (!this.isEmpty(value))
				if (value < 10) { value = "0" + value; }

			return value;
		},

		onGetFormatEstateNumber: function (value) {
			if (value && value !== "" && value !== "-") {
				if (0 <= value) {
					return "Success";
				} else if (0 > value) {
					return "Error";
				}
			} else {
				return "None";
			}
		},
		onGetFormatMonthAnt: function (date) {
			if (date && date !== "") {
				var y = date.getUTCFullYear(),
					m = date.getUTCMonth(),
					d = date.getUTCDate();
				if (m < 1) {
					y = y - 1;
					m = 12;
				}
				m = m < 10 ? "0" + m : m;
				d = d < 10 ? "0" + d : d;

				return y.toString() + '-' + m.toString() + '-' + d.toString();
			} else {
				return "";
			}
		},
		onGetFormatYearAnt: function (date) {
			if (date && date !== "") {
				var y = date.getUTCFullYear(),
					m = date.getUTCMonth() + 1,
					d = date.getUTCDate();

				y = y - 1;
				m = m < 10 ? "0" + m : m;
				d = d < 10 ? "0" + d : d;

				return y.toString() + "-" + m.toString() + "-" + d.toString();
			} else {
				return "";
			}
		},

		onInvoiceDateChange: function (oEvent) {
			var oSource = oEvent.getSource();
			var sValue = oSource.getValue();
			var booleanFormatDate = this.formatValidateDate(sValue);
			if (!booleanFormatDate) {
				this.getMessageBox('error', this.getI18nText("sErrorChangeDatePicker") + sValue);
				oSource.setValue("");
				return;
			}

			var booleanDate = this.ValidateDate(sValue);
			if (!booleanDate) {
				this.getMessageBox('error', this.getI18nText("sErrorChangeDatePicker") + sValue);
				oSource.setValue("");
				return;
			}

			var dateReverseToString = this.reverseStringForParameter(sValue, "/");
			var booleanValidateDate = Date.parse(dateReverseToString);

			if (isNaN(booleanValidateDate)) {
				this.getMessageBox('error', this.getI18nText("sErrorChangeDatePicker") + sValue);
				oSource.setValue("");
				return;
			}

			oSource.setValue(sValue);
		},
		ValidateFormatDate: function (sValue) {
			var booleanFormatDate = this.formatValidateDate(sValue);
			if (!booleanFormatDate) {
				return false;
			}

			var booleanDate = this.ValidateDate(sValue);
			if (!booleanDate) {
				return false;
			}

			var dateReverseToString = this.reverseStringForParameter(sValue, "/");
			var booleanValidateDate = Date.parse(dateReverseToString);

			if (isNaN(booleanValidateDate)) {
				return false;
			}

			return true;
		},
		formatValidateDate: function (campo) {
			var RegExPattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
			if ((campo.match(RegExPattern)) && (campo != '')) {
				return true;
			} else {
				return false;
			}
		},
		ValidateDate: function (fecha) {
			var fechaf = fecha.split("/");
			var day = fechaf[0];
			var month = fechaf[1];
			var year = fechaf[2];
			var date = new Date(year, month, '0');
			if ((day - 0) > (date.getDate() - 0)) {
				return false;
			}
			return true;
		},
		xmlToJson: function (xml) {
			function parse(node, j) {
				var nodeName = node.nodeName.replace(/^.+:/, '').toLowerCase();
				var cur = null;
				var text = $(node).contents().filter(function (x) {
					return this.nodeType === 3;
				});
				if (text[0] && text[0].nodeValue.trim()) {
					cur = text[0].nodeValue;
				} else {
					cur = {};
					$.each(node.attributes, function () {
						if (this.name.indexOf('xmlns:') !== 0) {
							cur[this.name.replace(/^.+:/, '')] = this.value;
						}
					});
					$.each(node.children, function () {
						parse(this, cur);
					});
				}

				j[nodeName] = cur;
			}

			var roots = $(xml);
			var root = roots[roots.length - 1];
			var json = {};
			parse(root, json);
			void 0;
		},
		onColorForState: function (value) {
			var sReturn;
			if (this.isEmpty(value)) {
				sReturn = "None";
			} else {
				switch (value) {
					case "N":
						sReturn = "None";
						break;
					case "S":
						sReturn = "Success";
						break;
					case "E":
						sReturn = "Error";
						break;
					case "W":
						sReturn = "Warning";
						break;
					case "I":
						sReturn = "Information";
						break;
					case "C":
						sReturn = "Confirm";
						break;
					default:
						sReturn = "None";
						break;
				}
			}
			return sReturn;
		},
		fnExportarExcel: function (oData1, oData2, oData3, sAuthor) {
			var that = this;
			var jsonDataTotal = oData1;
			var jsonDataMaster = oData2;
			var jsonDataHija = oData3;


			var jsonDataTableExcel = [];
			if (jsonDataTotal.length != 0) {
				for (var i = 0; i < jsonDataTotal.length; i++) {
					jsonDataTableExcel.push(jsonDataTotal[i]);
				}
			}
			if (jsonDataMaster.length != 0) {
				for (var i = 0; i < jsonDataMaster.length; i++) {
					jsonDataTableExcel.push(jsonDataMaster[i]);
				}
			} else if (jsonDataHija.length != 0) {
				for (var j = 0; j < jsonDataHija.length; j++) {
					jsonDataTableExcel.push(jsonDataHija[j]);
				}
			}

			if (jsonDataTableExcel.length < 1) {
				this.getMessageBox("error", this.getI18nText("errorNoDataExport"));
				return;
			}

			var aCols, oSettings;

			aCols = this.createColumnConfig();
			var dDate = new Date();
			var sGetTime = dDate.getTime().toString();
			var sTitleExcel = this.getI18nText("sTitleExport") + '-' + sGetTime + '.xlsx';
			var sTitleDocument = ""
			if (this.isEmpty(sAuthor)) {
				sTitleDocument = this.getI18nText("Token");
			} else {
				sTitleDocument = this.getI18nText("Token") + "-" + sAuthor;
			}

			oSettings = {
				workbook: {
					context: {
						title: sTitleDocument,
						modifiedBy: this.getI18nText("author")
					},
					columns: aCols
				},
				dataSource: jsonDataTableExcel,
				fileName: sTitleExcel
			};

			var oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function () {
				oSheet.destroy();
			});
		},
		createColumnConfig: function () {
			return [
				{
					label: this.getI18nText("titleExportColMat"),
					property: 'Matnr',
					width: '20',
					type: 'String'
				},
				{
					label: this.getI18nText("titleExportColCantidad"),
					property: 'cantidad',
					width: '15'
				}
			];
		},
		ColumnDetalle: function () {
			var oModel = [
				{
					sEtiqueta: this.getI18nText("txtColTab1IdPadre"),
					sAgrupador: 'IdCab',
					Type: EdmType.Number
				},
				{
					sEtiqueta: this.getI18nText("txtColTab1Fecha"),
					sAgrupador: 'Fecha',
					sType: EdmType.Date,
					sFormat: 'dd/mm/yyyy'
				},
				{
					sEtiqueta: this.getI18nText("txtColTab1CodHomologacion"),
					sAgrupador: 'IdHom',
					sType: EdmType.Number
				},
				{
					sEtiqueta: this.getI18nText("txtColTab1Homologacion"),
					sAgrupador: 'Detalle',
					sType: EdmType.String
				},
				{
					sEtiqueta: this.getI18nText("txtColTab1VentasUSD"),
					sAgrupador: 'iValorUs',
					sType: EdmType.Number
				},
				{
					sEtiqueta: this.getI18nText("txtColTab1VentasPEN"),
					sAgrupador: 'iValor',
					sType: EdmType.Number
				},
				{
					sEtiqueta: this.getI18nText("txtColTab1Transacciones"),
					sAgrupador: 'Trans',
					sType: EdmType.Number
				},
				{
					sEtiqueta: this.getI18nText("txtColTab1ValorizacionUSD"),
					sAgrupador: 'iValorizacionUSD',
					sType: EdmType.Number
				},
				{
					sEtiqueta: this.getI18nText("txtColTab1ValorizacionPEN"),
					sAgrupador: 'iValorizacionPEN',
					sType: EdmType.Number
				}
			];
			return oModel;
		},
		decimalAdjust: function (type, value, exp) {
			// Si el exp no está definido o es cero...
			if (typeof exp === 'undefined' || +exp === 0) {
				return Math[type](value);
			}
			value = +value;
			exp = +exp;
			// Si el valor no es un número o el exp no es un entero...
			if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
				return NaN;
			}
			// Shift
			value = value.toString().split('e');
			value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
			// Shift back
			value = value.toString().split('e');
			return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
		},


		_onChangeDateDesde: function (oEvent) {
			var oSource = oEvent.getSource();
			var sValue = oSource.getValue()
			if (!this.isEmpty(sValue)) {
				var sFechaInicio = "";
				sFechaInicio = sValue.trim();
				var booleanValidateFirst = this.ValidateFormatDate(sFechaInicio);
				if (!booleanValidateFirst) {
					this.getMessageBox('error', this.getI18nText("sErrorChangeDatePicker") + sValue);
					oSource.setValue("");
					this._byId("dpDateFilterHasta").setValue("");
					this._byId("dpDateFilterHasta").setEnabled(true);

					this._byId("dpDateFilterHasta").setEnabled(true);
					return;
				}

				oSource.setValue(sValue);
				this._byId("dpDateFilterHasta").setValue("");
				this._byId("dpDateFilterHasta").setEnabled(true);
			} else {
				oSource.setValue("");
				this._byId("dpDateFilterHasta").setValue("");
				this._byId("dpDateFilterHasta").setEnabled(true);
			}
		},
		_onChangeDateHasta: function (oEvent) {
			var oSource = oEvent.getSource();
			var sValue = oSource.getValue()
			if (!this.isEmpty(sValue)) {
				var sFechaInicio = "";
				sFechaInicio = sValue.trim();
				var booleanValidateFirst = this.ValidateFormatDate(sFechaInicio);
				if (!booleanValidateFirst) {
					this.getMessageBox('error', this.getI18nText("sErrorChangeDatePicker") + sValue);
					oSource.setValue("");
					return;
				}

				oSource.setValue(sValue);
				this._byId("dpDateFilterHasta").setEnabled(true);
			} else {
				oSource.setValue("");
			}
		},
		_onNavigateDateHasta: function (oEvent) {
			var oSource = oEvent.getSource();
			var sValueDesde = oSource.getValue();
			var sValueDesdeSplit = sValueDesde.split("/");
			var year = parseInt(sValueDesdeSplit[2]);
			var mount = parseInt(sValueDesdeSplit[1]);
			var day = parseInt(sValueDesdeSplit[0]);
			oSource.setMinDate(new Date(year, mount - 1, day));
		},
		_onChangeDateRange: function (oEvent) {
			let oSource = oEvent.getSource();
			let sValue = oSource.getValue()
			if (!this.isEmpty(sValue)) {
				let oSplitValue = sValue.split("-");
				//Inicio
				let sDateInit = oSplitValue[0].trim();
				let booleanValidateFirst = this.ValidateFormatDate(sDateInit);
				if (!booleanValidateFirst) {
					this.getMessageBox('error', this.getI18nText("sErrorChangeDatePicker") + sDateInit);
					oSource.setValue("");
					return;
				}

				//Fin
				let sDateEnd = oSplitValue[1].trim();
				let booleanValidateEnd = this.ValidateFormatDate(sDateEnd);
				if (!booleanValidateEnd) {
					this.getMessageBox('error', this.getI18nText("sErrorChangeDatePicker") + sDateEnd);
					oSource.setValue("");
					return;
				}

				oSource.setValue(sValue);
			} else {
				oSource.setValue("");
			}
		},
		onGetFormatDate: function (date) {
			if (date && date !== "") {
				var y = date.getUTCFullYear(),
					m = date.getUTCMonth() + 1,
					d = date.getUTCDate();

				m = m < 10 ? "0" + m : m;
				d = d < 10 ? "0" + d : d;

				return d.toString() + "/" + m.toString() + "/" + y.toString();
			} else { return ""; }
		},
		onGetFormatDateAbap: function (date) {
			if (date && date !== "") {
				var y = date.getUTCFullYear(),
					m = date.getUTCMonth() + 1,
					d = date.getUTCDate();

				m = m < 10 ? "0" + m : m;
				d = d < 10 ? "0" + d : d;

				return y.toString() + "-" + m.toString() + "-" + d.toString() + "T00:00:00";
			} else { return ""; }
		},
		getYYYYMMDDSlash: function (e) {
			var t = e.getDate();
			var n = e.getMonth() + 1;
			var r = e.getFullYear();
			if (t < 10) { t = "0" + t; }
			if (n < 10) { n = "0" + n; }
			var o = r + "/" + n + "/" + t;
			return o
		},
		getYYYYMMDDLine: function (e) {
			var t = e.getDate();
			var n = e.getMonth() + 1;
			var r = e.getFullYear();
			if (t < 10) { t = "0" + t; }
			if (n < 10) { n = "0" + n; }
			var o = r + "-" + n + "-" + t;
			return o
		},
		getYYYYMMDDHHMMSSLine: function (e) {
			var t = e.getDate();
			var n = e.getMonth() + 1;
			var r = e.getFullYear();
			if (t < 10) { t = "0" + t; }
			if (n < 10) { n = "0" + n; }
			var o = r + "-" + n + "-" + t;
			var i = e.getHours();
			var u = e.getMinutes();
			var a = e.getSeconds();
			o = o + " " + this.zfill(i, 2) + ":" + this.zfill(u, 2) + ":" + this.zfill(a, 2);
			return o
		},
		getYYYYMMDDHHMMSSSlash: function (e) {
			var t = e.getDate();
			var n = e.getMonth() + 1;
			var r = e.getFullYear();
			if (t < 10) { t = "0" + t; }
			if (n < 10) { n = "0" + n; }
			var o = r + "/" + n + "/" + t;
			var i = e.getHours();
			var u = e.getMinutes();
			var a = e.getSeconds();
			o = o + " " + this.zfill(i, 2) + ":" + this.zfill(u, 2) + ":" + this.zfill(a, 2);
			return o
		},
		handleValueHelpFrom: function (oEvent) {
			var sInputValue = oEvent.getSource().getValue(),
				sCustom = oEvent.getSource().data("custom"),
				oView = this.getView();
			this.oTokens = oEvent.getSource().getTokens();

			if (!this[sCustom.split("/")[1]]) {
				this[sCustom.split("/")[1]] = Fragment.load({
					id: oView.getId(),
					name: this.route + ".view.dialogs." + sCustom.split("/")[0],
					controller: this
				}).then(function (oValueHelpDialog) {
					oView.addDependent(oValueHelpDialog);
					return oValueHelpDialog;
				});
			}

			this[sCustom.split("/")[1]].then(function (oValueHelpDialog) {
				oValueHelpDialog.open(sInputValue);
				that.oTokens.forEach(function (value) {
					oValueHelpDialog._oList.getItems().forEach(function (value2) {
						let oData = value2.getBindingContext("oModelData").getObject();
						if (value.getKey() === oData.code) {
							oValueHelpDialog._oList.setSelectedItem(value2);
						}
					})
				});
			});
		},
		handleValueHelp: function (oEvent) {
			var sInputValue = oEvent.getSource().getValue(),
				sCustom = oEvent.getSource().data("custom"),
				oView = this.getView();
			this.oTokens = oEvent.getSource().getTokens();

			if (!this[sCustom.split("/")[1]]) {
				this[sCustom.split("/")[1]] = Fragment.load({
					id: oView.getId(),
					name: this.route + ".view.dialogs." + sCustom.split("/")[0],
					controller: this
				}).then(function (oValueHelpDialog) {
					oView.addDependent(oValueHelpDialog);
					return oValueHelpDialog;
				});
			}

			this[sCustom.split("/")[1]].then(function (oValueHelpDialog) {
				oValueHelpDialog.open(sInputValue);
				that.oTokens.forEach(function (value) {
					oValueHelpDialog._oList.getItems().forEach(function (value2) {
						let oData = value2.getBindingContext("oModelData").getObject();
						if (value.getKey() === oData.code) {
							oValueHelpDialog._oList.setSelectedItem(value2);
						}
					})
				});
			});
		},
		_handleValueHelpSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value"),
				sCustom = oEvent.getSource().data("custom").split("/")[2];
			var oFilter = new Filter(
				sCustom,
				FilterOperator.Contains,
				sValue
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},
		_handleValueHelpSearchResponsible: function (oEvent) {
			var sValue = oEvent.getParameter("value"),
				sCustom = oEvent.getSource().data("custom").split("/")[2];
			var oFilter = new Filter({
				filters: [
					new Filter({
						path: sCustom,
						operator: FilterOperator.Contains,
						value1: sValue
					}),
					new Filter({
						path: "Code",
						operator: FilterOperator.Contains,
						value1: sValue
					}),
				],
				and: false
			});
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},
		_handleValueHelpClose: function (oEvent) {
			var aSelectedItems = oEvent.getParameter("selectedItems"),
				sCustom = oEvent.getSource().data("custom").split("/")[1],
				oMultiInput;

			oMultiInput = this._byId(this.frgIdFilterInit + "--" + sCustom);
			if (aSelectedItems && aSelectedItems.length > 0) {
				oMultiInput.removeAllTokens(true);
				aSelectedItems.forEach(function (oItem) {
					oMultiInput.addToken(new Token({
						key: oItem.getDescription(),
						text: oItem.getTitle()
					}));
					that.getModel("oModelProyect").setProperty("/Main/filter/" + sCustom, oItem.getDescription());
					that.getModel("oModelProyect").setProperty("/Main/filter/" + sCustom + "Text", oItem.getTitle());
				});
			}

			switch (sCustom) {
				case "miTechnicalLocationFrom":
					var oMultiInput = this._byId(this.frgIdFilterInit + "--" + sCustom.slice(0, -4) + "To");

					if (aSelectedItems && aSelectedItems.length > 0) {
						oMultiInput.setEnabled(true);
					} else {
						oMultiInput.removeAllTokens(true);
						oMultiInput.setEnabled(false);
						that.getModel("oModelProyect").setProperty("/Main/filter/" + sCustom, "");
						that.getModel("oModelProyect").setProperty("/Main/filter/" + sCustom + "Text", "");
					}
				default:
				// oMultiInput = this._byId( sCustom );
			}


		},
		_clearComponent: function (oCell) {
			let sResponse = "";
			if (oCell instanceof sap.m.Input) sResponse = oCell.setValue("");
			if (oCell instanceof sap.m.DatePicker) sResponse = oCell.setValue("");
			if (oCell instanceof sap.m.Switch) oCell.setState("F");
			if (oCell instanceof sap.m.Link) oCell.setText("");
			if (oCell instanceof sap.m.CheckBox) oCell.setSelected("");
			if (oCell instanceof sap.m.ComboBox) oCell.setSelectedKey("");
			if (oCell instanceof sap.m.MultiComboBox) oCell.setSelectedKeys("");
			if (oCell instanceof sap.m.MultiInput) oCell.removeAllTokens(true);
			if (oCell instanceof sap.m.TextArea) oCell.setValue("");
			if (oCell instanceof sap.ui.unified.FileUploader) {
				var oFile = oCell.data("oFile");
				var oContext = oCell.data("oContext");
				if (oFile) {
					self.uploadFileLegal(oFile, function (res) {
						if (res) {
							if (res.ok) {
								res.result.forEach(function (oItem) {
									if (oItem.response) {
										oContext.NewIdAdjunto = oItem.response.idAdjunto;
									}
								})
							}
							oCell.data("oContext", oContext);
						}
					});
				}
				sResponse = oCell.getValue() ? oCell.getValue() : "";
			}
		},
		_validatorComponent: function (oCell) {
			let oModel = { bValidate: false, sCode: "" };
			if (oCell instanceof sap.m.HBox) oModel = { bValidate: true, sCode: "HVBox" };
			if (oCell instanceof sap.m.VBox) oModel = { bValidate: true, sCode: "HVBox" };
			if (oCell instanceof sap.ui.comp.filterbar.FilterBar) oModel = { bValidate: true, sCode: "FilterBar" };
			return oModel;
		},
		_getDataControl: function (oCell) {
			var sResponse = "";
			if (oCell instanceof sap.m.Input) sResponse = oCell.getValue() ? oCell.getValue() : "";
			if (oCell instanceof sap.m.DatePicker) sResponse = oCell.getDateValue() ? oCell.getDateValue() + "" : "";
			if (oCell instanceof sap.m.Switch) sResponse = oCell.getState() ? "V" : "F";
			if (oCell instanceof sap.m.Link) sResponse = oCell.getText() ? oCell.getText() : "";
			if (oCell instanceof sap.m.CheckBox) sResponse = oCell.getSelected() ? "X" : "";
			if (oCell instanceof sap.m.ComboBox) sResponse = oCell.getSelectedKey() ? oCell.getSelectedKey() : "";
			if (oCell instanceof sap.m.MultiComboBox) sResponse = oCell.getSelectedKeys() ? oCell.getSelectedKeys().join(",") : "";
			if (oCell instanceof sap.m.TextArea) sResponse = oCell.getValue() ? oCell.getValue() : "";
			if (oCell instanceof sap.ui.unified.FileUploader) {
				var oFile = oCell.data("oFile");
				var oContext = oCell.data("oContext");
				if (oFile) {
					self.uploadFileLegal(oFile, function (res) {
						if (res) {
							if (oContext.IdSolicitudContratoFormatoRespAdjunto) {
								self.onDeleteEntity("LegSolicitudContratoFormatoRespAdjuntos", oContext.IdSolicitudContratoFormatoRespAdjunto, {
									IdSolicitudContratoFormatoRespAdjunto: oContext.IdSolicitudContratoFormatoRespAdjunto,
									UpdateTime: new Date(),
									UserloginDelete: oUser.id
								}, function (res) { });
							}
							if (res.ok) {
								res.result.forEach(function (oItem) {
									if (oItem.response) {
										oContext.NewIdAdjunto = oItem.response.idAdjunto;
									}
								})
							}
							oCell.data("oContext", oContext);
						}
					});
				}
				sResponse = oCell.getValue() ? oCell.getValue() : "";
			}
			return sResponse;
		},
		_onClearComponentGlobal: function (sState, oComponent, bOtherComponent) {
			if (!this.isEmpty(oComponent)) {
				if (sState === that.getI18nText("sStateInit")) {
					let oValidaterContent = that._validatorComponent(oComponent);
					if (oValidaterContent.bValidate) {
						if (oValidaterContent.sCode === "HVBox") {
							oComponent.getItems().forEach(function (value) {
								if (that._validatorComponent(value).bValidate) { that._onClearComponentGlobal(that.getI18nText("sStateMiddle"), value.getItems(), false); }
								else { that._clearComponent(value); }
							});
						} else if (oValidaterContent.sCode === "FilterBar") {
							oComponent.getAllFilterItems().forEach(function (value) {
								if (that._validatorComponent(value.getControl()).bValidate) { that._onClearComponentGlobal(that.getI18nText("sStateMiddle"), value.getControl(), false); }
								else { that._clearComponent(value.getControl()); }
							});
						}
					} else { that._clearComponent(value); }
				} else if (sState === that.getI18nText("sStateMiddle")) {
					oComponent.forEach(function (value) {
						if (that._validatorComponent(value).bValidate) { that._onClearComponentGlobal(that.getI18nText("sStateMiddle"), value.getItems(), false); }
						else { that._clearComponent(value); }
					});
				}
			}
		},

		//Llamadas reutilizables
		_getEstado: function (context) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "",
						sNumPedido = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonEstado(context)); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getClientepet: function (context) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "",
						sNumPedido = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonCustomer(context)); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getVendedor: function (context) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "",
						sNumPedido = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonVendedor(context)); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getClasePedido: function (context) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "",
						sNumPedido = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonClase(context)); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getPedidoDetalle: function (sNumPedido) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonDetalle()); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getListDespacho: function (sNumPedido) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonListDespacho()); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									//temporal
									oResp.sEstado = "S";
									oResp.oResults = models.JsonReporte().d.results;
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getListFacturas: function (sNumPedido) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonListFacturas()); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getListCotiSegui: function (sNumPedido) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonDetSeguimiento()); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getEstadoPedido: function (sNumPedido) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES' + sNumPedido;
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.JsonEstadoPedido()); }
					else {
						Services.getoDataERPSync(that, sUrl, function (result) {
							util.response.validateAjaxGetERPNotMessage(result, {
								success: function (oData, message) {
									oResp.sEstado = "S";
									oResp.oResults = oData.data;
									resolve(oResp);
								},
								error: function (message) {
									oResp.oResults = [];
									resolve(oResp);
								}
							});
						});
					}
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_setLanguageModel: function (langKey) {
			var bundleName;
			if (langKey === "esp") {
				bundleName = "aris.com.clientes.seguimiento.pe.i18n.i18n_esp";
			} else if (langKey === "ing") {
				bundleName = "aris.com.clientes.seguimiento.pe.i18n.i18n_ing";
			} else {
				void 0;
				return;
			}

			var i18nModel = new ResourceModel({
				bundleName: bundleName
			});
			this.getView().setModel(i18nModel, "i18n");
			this.getModel("oModelProyect").setProperty("/sIdioma", langKey);

		},
		formatDate: function (vDate) {
			if (!vDate) return "";

			let oDate = null;

			// Si viene como string tipo ABAP /Date(…)/ → conviértelo
			if (typeof vDate === "string") {
				let ms = parseInt(vDate.replace(/[^0-9]/g, ""), 10);
				if (!isNaN(ms)) {
					// En vez de usar new Date(ms), calculamos con UTC directo
					let oUTC = new Date(ms);
					let year = oUTC.getUTCFullYear();
					let month = oUTC.getUTCMonth(); // 0-based
					let day = oUTC.getUTCDate();

					// Creamos fecha local con esos valores (sin desfase)
					oDate = new Date(year, month, day);
				}
			}

			// Si ya es un Date válido
			if (vDate instanceof Date) {
				oDate = vDate;
			}

			if (!oDate) return "";

			let oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "dd-MM-yyyy"
			});

			return oDateFormat.format(oDate);
		},

		formatODataDate: function (oDate) {
			if (!oDate) return null;

			let year, month, day;

			// Si viene como string tipo ABAP /Date(…)/ → conviértelo
			if (typeof oDate === "string") {
				let ms = parseInt(oDate.replace(/[^0-9]/g, ""), 10);
				if (!isNaN(ms)) {
					let oUTC = new Date(ms);
					year = oUTC.getUTCFullYear();
					month = oUTC.getUTCMonth();
					day = oUTC.getUTCDate();
				}
			} else if (oDate instanceof Date) {
				year = oDate.getFullYear();
				month = oDate.getMonth();
				day = oDate.getDate();
			} else {
				return null;
			}

			// Reconstruimos fecha sin horas
			let fixedDate = new Date(year, month, day);

			// Formateamos sin que se mueva de día
			let oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-dd'T'HH:mm:ss"
			});

			return "datetime'" + oDateFormat.format(fixedDate) + "'";
		},
		_getPrueba: function () {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "",
						sNumPedido = "";
					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/CotNacSet(SalesDocument='4090000066',ClassCondition='Z001')?$format=json&sap-language=es-ES";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/CotNacSet(SalesDocument='4090000066',ClassCondition='Z001')?$format=json&sap-language=es-ES";
						sUrl = sPath;
					}

					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = oData.data;
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});

				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		parseODataDate: function (vDate) {
			if (!vDate) return null;
			let ms = parseInt(vDate.replace(/[^0-9]/g, ""), 10);
			if (isNaN(ms)) return null;

			let oUTC = new Date(ms);
			return new Date(
				oUTC.getUTCFullYear(),
				oUTC.getUTCMonth(),
				oUTC.getUTCDate()
			);
		},
		toUTCDateMs: function (d, endOfDay = false) {
			if (!(d instanceof Date)) return null;
			let base = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
			return endOfDay ? base + (24 * 60 * 60 * 1000 - 1) : base;
		},

		_parseSapNumber: function (value) {
			if (value === null || value === undefined || value === "") {
				return 0;
			}

			if (typeof value === "number") {
				return Number.isFinite(value) ? value : 0;
			}

			let sValue = String(value).trim().replace(/\s/g, "");

			if (!sValue) {
				return 0;
			}

			let bNegative = false;

			// Caso SAP: 197910.180-
			if (sValue.endsWith("-")) {
				bNegative = true;
				sValue = sValue.slice(0, -1);
			}

			// Caso normal: -197910.180
			if (sValue.startsWith("-")) {
				bNegative = true;
				sValue = sValue.slice(1);
			}

			// Caso: 197,910.18
			if (sValue.includes(",") && sValue.includes(".")) {
				if (sValue.lastIndexOf(".") > sValue.lastIndexOf(",")) {
					sValue = sValue.replace(/,/g, "");
				} else {
					// Caso europeo: 197.910,18
					sValue = sValue.replace(/\./g, "").replace(",", ".");
				}
			} else if (sValue.includes(",")) {
				const aParts = sValue.split(",");
				const bLooksLikeThousands =
					aParts.length > 1 &&
					aParts.slice(1).every(function (sPart) {
						return /^\d{3}$/.test(sPart);
					});

				if (bLooksLikeThousands) {
					sValue = sValue.replace(/,/g, "");
				} else {
					sValue = sValue.replace(",", ".");
				}
			}

			const nValue = parseFloat(sValue);

			if (!Number.isFinite(nValue)) {
				return 0;
			}

			return bNegative ? -nValue : nValue;
		},

		formatNumber: function (value) {
			if (value === null || value === undefined || value === "") {
				return "";
			}

			const nValue = this._parseSapNumber(value);

			const oNumberFormat = NumberFormat.getFloatInstance({
				maxFractionDigits: 2,
				minFractionDigits: 2,
				groupingEnabled: true,
				groupingSeparator: ",",
				decimalSeparator: "."
			});

			return oNumberFormat.format(nValue);
		},
		_getSharepoint: function () {
			that = this;

			try {
				return new Promise(function (resolve, reject) {
					let sUrl = "";

					const path =
						"/sites/arisindustrial.sharepoint.com,e5faea81-7554-4754-ab0a-7a1615a9006f,f96740cf-8f3f-4805-b1fc-1a0a87bf4ae3" +
						"/drives/b!ger65VR1VEerCnoWFakAb89AZ_k_jwVIsfwaCoe_SuOrBelpHdYGQKelpn4cbbDm" +
						"/root:/materiales:/children";

					if (that.local) {
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(path);
					} else {
						sUrl =
							jQuery.sap.getModulePath(that.route) +
							"/SharePointAris" +
							path;
					}

					Services.getSharepointSync(sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData) {
								resolve({
									sEstado: "S",
									oResults: oData.data.value
								});
							},
							error: function () {
								resolve({
									sEstado: "E",
									oResults: []
								});
							}
						});
					});
				});

			} catch (oError) {
				that.getMessageBox("error", "Error cargando SharePoint");
			}
		},

		_downloadFromEcomprobantes: function (payload, nombreSugerido) {
			that = this;
			return that._postDigiFlow(payload).then(function (oResp) {
				if (!oResp || oResp.sEstado !== "S") {
					throw new Error(oResp && oResp.sMessage ? oResp.sMessage : "Error al obtener el comprobante.");
				}

				var oData = oResp.oResults || {};
				if (oData.passed === false) {
					throw new Error(oData.message || "La operación de DigiFlow fue rechazada.");
				}

				var sBase64 = oData.data;
				if (!sBase64) {
					throw new Error("El servicio de DigiFlow no devolvió contenido de archivo.");
				}

				// Construir un data URL para reutilizar el helper existente
				var sFile = "data:application/pdf;base64," + sBase64;
				var oBlob = that.getBlobFromFile(sFile);

				var oLink = document.createElement("a");
				oLink.href = URL.createObjectURL(oBlob);
				oLink.download = nombreSugerido || (oData.message || "comprobante.pdf");
				document.body.appendChild(oLink);
				oLink.click();
				URL.revokeObjectURL(oLink.href);
				oLink.remove();
			}).catch(function (oError) {
				that.getMessageBox("error", oError && oError.message ? oError.message : that.getI18nText("errorUserData"));
				sap.ui.core.BusyIndicator.hide(0);
				throw oError; // por si el que llama quiere manejarlo con try/catch
			});
		},

		_toNumber: function (v) {
			if (v === null || v === undefined || v === "") {
				return 0;
			}

			if (typeof v === "number") {
				return v;
			}

			if (typeof v === "string") {
				// quitar separadores de miles "1,000.00" -> "1000.00"
				const sClean = v.replace(/,/g, "");
				return parseFloat(sClean) || 0;
			}

			// fallback genérico
			return Number(v) || 0;
		},
		_postDigiFlow: function (payload) {
			that = this;
			try {
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					const path = "/api/rest/GetDigiFlow";

					if (that.local) {
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(path);
					} else {
						sUrl = jQuery.sap.getModulePath(that.route) + "/BACKEND-ARI-JAVA-21" + path;
					}

					Services.postDigiFlowSync(sUrl, payload, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData) {
								// oData viene de utilHttp.DigiFlowGetSync:
								// { iCode, m, data: { statusCode, message, data, passed } }
								resolve({
									sEstado: "S",
									oResults: oData.data,
									sMessage: oData.m
								});
							},
							error: function (oError) {
								resolve({
									sEstado: "E",
									oResults: null,
									sMessage: oError && oError.m ? oError.m : "Error llamando a DigiFlow"
								});
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", "Error cargando DigiFlow");
				return Promise.resolve({ sEstado: "E", oResults: null, sMessage: oError.message });
			}
		},
		_getBPVendedor: function () {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/UsOrve?$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/UsOrve?$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = sPath;
					}
					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = oData.data;
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getAllowedVendorCodesVD: function () {
			var that = this;

			return that._getBPVendedor().then((oResp) => {
				const a = (oResp && oResp.sEstado === "S" && Array.isArray(oResp.oResults)) ? oResp.oResults : [];

				const sSalesOrg = (that.sSalesOrg || "").trim();

				// Solo perfil VD y orgventas de la app
				const allowed = a
					.filter(x => (x.orgventas || "").trim() === sSalesOrg)
					.filter(x => (x.perfil || "").trim().toUpperCase() === "VD")
					.map(x => (x.usuario || "").toString().trim())
					.filter(Boolean);

				return new Set(allowed);
			});
		},
		_initFlpBackNavigation: async function () {
			try {
				if (!sap.ushell?.Container) return;

				const oShellUI = await this.getOwnerComponent().getService("ShellUIService");
				if (!oShellUI) return;

				this._oShellUI = oShellUI;

				oShellUI.setBackNavigation(() => {
					const oRouter = this.getOwnerComponent().getRouter();
					const oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
					const sHash = (oHashChanger && oHashChanger.getHash()) || "";

					if (sHash.startsWith("Detail/")) {
						if (typeof this._cleanupDetailState === "function") {
							this._cleanupDetailState();
						}
						oRouter.navTo("View", {}, true);
						return;
					}

					sap.ushell.Container.getServiceAsync("CrossApplicationNavigation")
						.then(oCrossAppNav => {
							oCrossAppNav.toExternal({
								target: { shellHash: "#" }
							});
						});
				});
			} catch (e) {
				void 0;
			}
		},
		_getDatClient: function (sSalesOrg) {
			const that = this;

			try {
				var oResp = {
					sEstado: "E",
					oResults: []
				};

				return new Promise(function (resolve, reject) {
					let sUrl = "";
					const sOrg = String(sSalesOrg || "").trim();

					if (!sOrg) {
						oResp.oResults = [];
						resolve(oResp);
						return;
					}

					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DataCustomer?$filter=SalesOrganization eq '" + sOrg + "' and DistributionChannel eq 'C1' and Division eq 'S1' and (CustomerDni ne '' or CustomerRuc ne '')&$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DataCustomer?$filter=SalesOrganization eq '" + sOrg + "' and DistributionChannel eq 'C1' and Division eq 'S1' and (CustomerDni ne '' or CustomerRuc ne '')&$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = sPath;
					}

					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = oData.data || [];
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_mapClientesForFilter: function (aClientes) {
			const aMapped = (aClientes || []).map(item => {
				const code = (item.Customer || "").toString().trim();
				const name = (item.CustomerFullName || item.Name1 || "").toString().trim();

				return {
					key: code,
					Customer: code,
					CustomerFullName: name,
					Display: `${code} - ${name}`
				};
			});

			const seen = new Set();
			return aMapped.filter(c => {
				if (!c.Customer) return false;
				if (seen.has(c.Customer)) return false;
				seen.add(c.Customer);
				return true;
			});
		},
		_getCliente: function (sSalesOrg) {
			const that = this;

			try {
				var oResp = {
					sEstado: "E",
					oResults: []
				};

				return new Promise(function (resolve, reject) {
					let sUrl = "";
					const sOrg = String(sSalesOrg || "").trim();

					if (!sOrg) {
						oResp.oResults = [];
						resolve(oResp);
						return;
					}

					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$filter=SalesOrganization eq '" + sOrg + "' and DistributionChannel eq 'C1' and Division eq 'S1'&$top=3000&$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$filter=SalesOrganization eq '" + sOrg + "' and DistributionChannel eq 'C1' and Division eq 'S1'&$top=3000&$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = sPath;
					}

					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = oData.data || [];
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		//migrados de otro proyecto
		_getDatClientView: function (sCustomer, sSalesOrg) {
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};

				return new Promise(function (resolve, reject) {
					let sUrl = "";
					const sCustomerSafe = (sCustomer || "").toString().replace(/'/g, "''");
					const sCustomerFilter = sCustomerSafe ? ` and Customer eq '${sCustomerSafe}'` : "";
					const oCfg = that._getPedidoUnitConfig(sSalesOrg);
					const sOrg = oCfg.SalesOrg;

					if (that.local) {
						const sPath =
							"/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DataCustomer?$filter=" +
							"SalesOrganization eq '" + sOrg + "' and DistributionChannel eq 'C1' and Division eq 'S1'" +
							sCustomerFilter +
							" and (CustomerDni ne '' or CustomerRuc ne '')&$format=json&sap-language=es-ES&sap-language=es-ES";

						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath =
							jQuery.sap.getModulePath(that.route) +
							"/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DataCustomer?$filter=" +
							"SalesOrganization eq '" + sOrg + "' and DistributionChannel eq 'C1' and Division eq 'S1'" +
							sCustomerFilter +
							" and (CustomerDni ne '' or CustomerRuc ne '')&$format=json&sap-language=es-ES&sap-language=es-ES";

						sUrl = sPath;
					}

					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = oData.data;
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getMaterialStock: function (sSalesOrg) {
			try {
				var oResp = {
					sEstado: "E",
					oResults: [],
					aBrands: [],
					aMaterialGroups: [],
					ListMaterial: [],
					ListDescription: [],
					ListBrand: [],
					ListArtTextil: [],
					ListOrillo: []
				};

				return new Promise((resolve, reject) => {
					let sUrl = "";
					const oCfg = that._getPedidoUnitConfig(sSalesOrg);
					const sOrg = oCfg.SalesOrg;
					if (that.local) {
						const sPath =
							"/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation" +
							"?$filter=SalesOrganization eq '" + sOrg + "'" +
							"&$top=900000000&$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath =
							jQuery.sap.getModulePath(that.route) +
							"/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation" +
							"?$filter=SalesOrganization eq '" + sOrg + "'" +
							"&$top=900000000&$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = sPath;
					}

					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData) {
								let aResults =
									(oData && Array.isArray(oData.data) && oData.data) ||
									(oData && oData.d && Array.isArray(oData.d.results) && oData.d.results) ||
									[];
								const aValid = aResults.filter(item =>
									item.Material && item.Material.trim() !== "" &&
									item.Description && item.Description.trim() !== ""
								);
								const mapUnique = new Map();
								aValid.forEach(item => mapUnique.set(item.Material, item));
								const aUniqueResults = Array.from(mapUnique.values());
								const aMaterialList = Array.from(new Set(
									aUniqueResults
										.map(i => i.Material)
										.filter(v => v && v.trim() !== "")
								)).sort();
								const aDescriptionList = Array.from(new Set(
									aUniqueResults
										.map(i => i.Description)
										.filter(v => v && v.trim() !== "")
								)).sort();
								const aBrandList = Array.from(new Set(
									aUniqueResults
										.map(i => i.Brand)
										.filter(v => v && v.trim() !== "")
								)).sort();
								const aOrilloList = Array.from(new Set(
									aUniqueResults
										.map(i => i.OrilloStyle)
										.filter(v => v && v.trim() !== "")
								)).sort();
								const aBrands = Array.from(new Set(
									aUniqueResults
										.map(i => i.Brand)
										.filter(v => v && v.trim() !== "")
								)).sort();
								const aMaterialGroups = Array.from(new Set(
									aUniqueResults
										.map(i => i.MaterialGroup)
										.filter(v => v && v.trim() !== "")
								)).sort();
								const aArtTextilList = Array.from(
									new Map(
										aUniqueResults
											.filter(i =>
												i.TextileArticleQuality && i.TextileArticleQuality.trim() !== "" &&
												i.TextArtQuaDescription && i.TextArtQuaDescription.trim() !== ""
											)
											.map(i => {
												const key = i.TextileArticleQuality.trim();     // código
												const desc = i.TextArtQuaDescription.trim();     // descripción
												return [key, { key: key, text: `${key} - ${desc}`, desc: desc }];
											})
									).values()
								).sort((a, b) => (a.text || "").localeCompare(b.text || ""));
								oResp.sEstado = "S";
								oResp.oResults = aUniqueResults;
								oResp.aBrands = aBrands;
								oResp.aMaterialGroups = aMaterialGroups;
								oResp.ListMaterial = aMaterialList;
								oResp.ListDescription = aDescriptionList;
								oResp.ListBrand = aBrandList;
								oResp.ListArtTextil = aArtTextilList;
								oResp.ListOrillo = aOrilloList;
								const oModelData = that.getView().getModel("oModelData");
								oModelData.setSizeLimit(900000000);

								oModelData.setProperty("/oFilterMaterialFull", aUniqueResults);
								oModelData.setProperty("/oFilterMaterial", []);

								oModelData.setProperty("/ListMaterial", aMaterialList);
								oModelData.setProperty("/ListDescription", aDescriptionList);
								oModelData.setProperty("/ListBrand", aBrandList);
								oModelData.setProperty("/ListArtTextil", aArtTextilList);
								oModelData.setProperty("/ListOrillo", aOrilloList);
								oModelData.setProperty("/ListaBrands", aBrands);
								oModelData.setProperty("/ListaMaterialGroups", aMaterialGroups);
								oModelData.setProperty("/ListDescriptionSug", aDescriptionList);
								oModelData.setProperty("/ListBrandSug", aBrandList);
								oModelData.setProperty("/ListArtTextilSug", aArtTextilList);
								oModelData.setProperty("/ListOrilloSug", aOrilloList);
								resolve(oResp);
							},

							error: function () {
								oResp.sEstado = "E";
								oResp.oResults = [];
								oResp.aBrands = [];
								oResp.aMaterialGroups = [];
								oResp.ListMaterial = [];
								oResp.ListDescription = [];
								oResp.ListBrand = [];
								oResp.ListArtTextil = [];
								oResp.ListOrillo = [];

								const oModelData = that.getView().getModel("oModelData");
								oModelData.setProperty("/oFilterMaterialFull", []);
								oModelData.setProperty("/oFilterMaterial", []);

								oModelData.setProperty("/ListMaterial", []);
								oModelData.setProperty("/ListDescription", []);
								oModelData.setProperty("/ListBrand", []);
								oModelData.setProperty("/ListArtTextil", []);
								oModelData.setProperty("/ListOrillo", []);

								oModelData.setProperty("/ListDescriptionSug", []);
								oModelData.setProperty("/ListBrandSug", []);
								oModelData.setProperty("/ListArtTextilSug", []);
								oModelData.setProperty("/ListOrilloSug", []);

								resolve(oResp);
							}
						});
					});
				});

			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getClientPet: function (sSalesOrg) {
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					const oCfg = that._getPedidoUnitConfig(sSalesOrg);
					const sOrg = oCfg.SalesOrg;
					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$filter=SalesOrganization eq '" + sOrg + "'&$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$filter=SalesOrganization eq '" + sOrg + "'&$format=json&sap-language=es-ES&sap-language=es-ES";
						sUrl = sPath;
					}
					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = oData.data;
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getTipChangeData: function () {
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					const oToday = new Date();
					const sYear = oToday.getFullYear();
					const sMonth = String(oToday.getMonth() + 1).padStart(2, "0");
					const sDay = String(oToday.getDate()).padStart(2, "0");
					const sFechaHoy = `${sYear}-${sMonth}-${sDay}T00:00:00`;
					if (that.local) {
						const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iTipoCambioSet(RateType='M',FromCurr='USD',ToCurrncy='PEN',Date=datetime'${sFechaHoy}')`;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) +
							`/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iTipoCambioSet(RateType='M',FromCurr='USD',ToCurrncy='PEN',Date=datetime'${sFechaHoy}')`;
						sUrl = sPath;
					}
					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = oData.data;
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getDescriptionMaterial: function () {
			try {
				var oResp = {
					sEstado: "E",
					oResults: []
				};
				const that = this;
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MarMat?$format=json&sap-language=es-ES";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) +
							"/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MarMat?$format=json&sap-language=es-ES";
						sUrl = sPath;
					}
					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								let aRaw = [];
								try {
									if (Array.isArray(oData.data)) {
										aRaw = oData.data;
									} else if (oData.data && Array.isArray(oData.data.results)) {
										aRaw = oData.data.results;
									} else if (oData.data && oData.data.d && Array.isArray(oData.data.d.results)) {
										aRaw = oData.data.d.results;
									} else if (oData.d && Array.isArray(oData.d.results)) {
										// 👉 Esta es la forma que mostraste en el log { d: { results: [...] } }
										aRaw = oData.d.results;
									}
								} catch (e) {
									void 0;
									aRaw = [];
								}
								const aFiltered = (aRaw || []).filter(function (row) {
									return row.org_ventas === "1110" &&
										row.Brand && row.Brand.trim() !== "" &&
										row.DscBrand && row.DscBrand.trim() !== "";
								});
								const mUnique = {};
								const aUnique = [];
								aFiltered.forEach(function (row) {
									if (!mUnique[row.Brand]) {
										mUnique[row.Brand] = true;
										aUnique.push({
											Brand: row.Brand,
											DscBrand: row.DscBrand,
											org_ventas: row.org_ventas
										});
									}
								});

								// 🔗 Cargar en oModelData
								const oModelData = that.getView().getModel("oModelData");
								if (oModelData) {
									// ⬅️ Usa estos NOMBRES para que cuadre con tu onSuggestBrand / MultiInput
									oModelData.setProperty("/ListBrand", aUnique);     // full
									oModelData.setProperty("/ListBrandSug", aUnique);  // inicio de sugerencias
								}

								oResp.sEstado = "S";
								oResp.oResults = aUnique;
								resolve(oResp);
							},
							error: function (message) {
								void 0;
								oResp.oResults = [];

								const oModelData = that.getView().getModel("oModelData");
								if (oModelData) {
									oModelData.setProperty("/ListBrand", []);
									oModelData.setProperty("/ListBrandSug", []);
								}
								resolve(oResp);
							}
						});
					});
				});

			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getAddresTravel: function (sCustomer, sSalesOrg) {
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (!sCustomer) {
						void 0;
						resolve(oResp);
						return;
					}
					const oCfg = that._getPedidoUnitConfig(sSalesOrg);
					const sOrg = oCfg.SalesOrg;
					if (that.local) {
						const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/FullAddressSet?$filter=Customer eq '${sCustomer}' and SalesOrganization eq '${sOrg}'&$format=json&sap-language=es-ES`;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) +
							`/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/FullAddressSet?$filter=Customer eq '${sCustomer}' and SalesOrganization eq '${sOrg}'&$format=json&sap-language=es-ES`;
						sUrl = sPath;
					}

					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								const aResults = oData.data || [];
								oResp.oResults = aResults;
								const aAgencias = aResults
									.filter(r => r.Customer && r.Agencyaddress)
									.map(r => ({
										Customer: r.Customer,
										Agencyaddress: r.Agencyaddress || "",
										Agencyname: r.Agencyname || ""
									}));
								const aDestinos = aResults
									.filter(r => r.Destinationid || r.Finaldestinationid)
									.map(r => ({
										Destinationid: r.Destinationid || r.Finaldestinationid,
										Destination: r.Destination || r.Finaldestination,
										Destinationname: r.Destinationname || r.Finaldestinationname || ""
									}));
								const oModel = that.getView().getModel("oModelProyect");
								oModel.setProperty("/oAgenciasCliente", aAgencias);
								oModel.setProperty("/oDestinosCliente", aDestinos);
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getCOnditionPay: function (sSalesOrg) {
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					const oCfg = that._getPedidoUnitConfig(sSalesOrg);
					const sOrg = oCfg.SalesOrg;
					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Conditions?$format=json&sap-language=es-ES&$filter=SalesOrganization eq '" + sOrg + "'";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Conditions?$format=json&sap-language=es-ES&$filter=SalesOrganization eq '" + sOrg + "'";
						sUrl = sPath;
					}
					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = oData.data;
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getReason: function (sSalesDocumentClass) {
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					let sQuery = "";
					if (sSalesDocumentClass) {
						sQuery = "?$filter=SalesDocumentClass eq '" + sSalesDocumentClass + "'&$format=json&sap-language=es-ES";
					} else {
						sQuery = "?$top=1000&$format=json&sap-language=es-ES";
					}
					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Reason" + sQuery;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) +
							"/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Reason" + sQuery;
						sUrl = sPath;
					}
					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = (oData.data || []).filter(function (item) {
									return String(item.ReasonRequest || "").trim().toUpperCase() !== "ZT4";
								});
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getAnticipo: function (sCustomer, sCurrency, sSalesOrg) {
			that = this;
			try {
				var oResp = {
					sEstado: "E",
					oResults: []
				};
				return new Promise(function (resolve) {
					sCustomer = (sCustomer || "").trim();
					sCurrency = (sCurrency || "").trim();
					const oCfg = that._getPedidoUnitConfig(sSalesOrg);
					const sOrg = oCfg.SalesOrg;
					const sFilter = "$filter=Customer eq '" + sCustomer + "' and Currency eq '" + sCurrency + "' and SalesOrganization eq '" + sOrg + "'";
					const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Anticipos?" + sFilter + "&$format=json&sap-language=es-ES";

					let sUrl = "";
					if (that.local) {
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						sUrl = jQuery.sap.getModulePath(that.route) + "/S4HANA" + sPath;
					}

					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = (oData && oData.data) ? oData.data : [];

								resolve(oResp);
							},
							error: function (oError) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getNotaCredito: function (sCustomer, sCurrency, sSalesOrg) {
			that = this;
			try {
				var oResp = {
					sEstado: "E",
					oResults: []
				};
				return new Promise(function (resolve) {
					sCustomer = (sCustomer || "").trim();
					sCurrency = (sCurrency || "").trim();
					const oCfg = that._getPedidoUnitConfig(sSalesOrg);
					const sOrg = oCfg.SalesOrg;
					const sFilter = "$filter=Customer eq '" + sCustomer + "' and Currency eq '" + sCurrency + "' and SalesOrganization eq '" + sOrg + "'";
					const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/SalNC?" + sFilter + "&$format=json&sap-language=es-ES";

					let sUrl = "";
					if (that.local) {
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						sUrl = jQuery.sap.getModulePath(that.route) + "/S4HANA" + sPath;
					}
					Services.getoDataERPSync(that, sUrl, function (result) {
						util.response.validateAjaxGetERPNotMessage(result, {
							success: function (oData, message) {
								oResp.sEstado = "S";
								oResp.oResults = (oData && oData.data) ? oData.data : [];
								resolve(oResp);
							},
							error: function (message) {
								oResp.oResults = [];
								resolve(oResp);
							}
						});
					});
				});
			} catch (oError) {
				that.getMessageBox("error", that.getI18nText("sErrorTry"));
			}
		},
		_getSalesOrgByBP: function (sBP) {
			const that = this;
			return new Promise((resolve) => {
				if (!sBP) {
					void 0;
					resolve([]);
					return;
				}

				// 🔹 Mantiene la estructura CDS original, con $expand y formato json
				const sFilter = `$filter=BP eq '${sBP}'&$expand=toBpSalesOrganization&$format=json&sap-language=es-ES`;
				let sUrl = "";

				if (that.local) {
					const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iBpSalesOrganizationSet?${sFilter}`;
					sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
				} else {
					const sPath = jQuery.sap.getModulePath(that.route) +
						`/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iBpSalesOrganizationSet?${sFilter}`;
					sUrl = sPath;
				}

				void 0;

				Services.getoDataERPSync(that, sUrl, function (result) {
					util.response.validateAjaxGetERPNotMessage(result, {
						success: function (oData) {
							const aSalesOrgs = [];
							const results = oData?.data || oData?.d?.results || [];

							results.forEach(item => {
								// 🔹 Los valores reales están en toBpSalesOrganization.results
								if (item.toBpSalesOrganization && Array.isArray(item.toBpSalesOrganization.results)) {
									item.toBpSalesOrganization.results.forEach(sub => {
										if (sub.SALES_ORG) {
											aSalesOrgs.push(sub.SALES_ORG);
										}
									});
								}
							});

							const aUnique = [...new Set(aSalesOrgs)];
							void 0;
							resolve(aUnique);
						},
						error: function (err) {
							void 0;
							resolve([]);
						}
					});
				});
			});
		},
		_GetFiltroMaterial: function (sValue, sTargetPath) {
			sValue = (sValue || "").trim();

			if (!sValue || sValue.length < 2) {
				this.getView().getModel("oModelData").setProperty(sTargetPath, []);
				return;
			}

			const that = this;
			const sSalesOrg = "1110";
			const sSafe = String(sValue).replace(/'/g, "''");

			const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and startswith(Material,'${sSafe}')`;

			let sUrl = "";
			if (that.local) {
				const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=es-ES`;
				sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
			} else {
				sUrl = jQuery.sap.getModulePath(that.route) +
					`/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=es-ES`;
			}

			Services.getoDataERPSync(that, sUrl, function (result) {
				util.response.validateAjaxGetERPNotMessage(result, {
					success: function (oData) {
						const arr = Array.isArray(oData.data) ? oData.data : [];
						const unique = [];
						const seen = {};

						arr.forEach(item => {
							const sMat = String(item.Material || "").trim();
							if (sMat && !seen[sMat]) {
								seen[sMat] = true;
								unique.push({
									key: sMat,
									Material: sMat,
									Description: item.Description || "",
									Display: `${sMat} - ${item.Description || ""}`
								});
							}
						});

						that.getView().getModel("oModelData").setProperty(sTargetPath, unique);
					},
					error: function () {
						that.getView().getModel("oModelData").setProperty(sTargetPath, []);
					}
				});
			});
		},
		_GetFiltroArtTextil: function (sValue, sTargetPath) {
			const oModelData = this.getView().getModel("oModelData");
			const that = this;
			if (!sValue || sValue.trim().length < 2) {
				oModelData.setProperty(sTargetPath, []);
				return;
			}
			const sSalesOrg = "1110";
			const sVal = sValue.trim().replace(/'/g, "''");
			let sUrl = "";
			const sFilter =
				`$filter=SalesOrganization eq '${sSalesOrg}' ` +
				//`and DistributionChannel eq 'C1' ` +
				`and startswith(TextileArticleQuality,'${sVal}')`;

			if (that.local) {
				const sPath =
					`/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?` +
					`${sFilter}&$top=200&$format=json&sap-language=es-ES`;
				sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
			} else {
				sUrl =
					jQuery.sap.getModulePath(that.route) +
					`/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?` +
					`${sFilter}&$top=200&$format=json&sap-language=es-ES`;
			}

			Services.getoDataERPSync(that, sUrl, function (result) {
				util.response.validateAjaxGetERPNotMessage(result, {
					success: function (oData) {
						const aData = Array.isArray(oData.data) ? oData.data : [];
						const mUnique = {};
						const aResult = [];

						aData.forEach(function (item) {
							const sCode = (item.TextileArticleQuality || "").trim();
							if (!sCode || mUnique[sCode]) { return; }
							mUnique[sCode] = true;
							const sDesc =
								(item.TextArtQuaDescription || item.TextileArticleQualityDesc || "").trim();
							aResult.push({
								key: sCode,
								text: sDesc || sCode
							});
						});

						oModelData.setProperty(sTargetPath, aResult);
					},
					error: function () {
						oModelData.setProperty(sTargetPath, []);
					}
				});
			});
		},
		_validateRequiredFields: function () {
			let oModel = this.getView().getModel("oModelProyect");
			let oData = oModel.getProperty("/inputForm") || {};
			let aErrors = [];
			if (!oData.tipDocument) {
				aErrors.push("Debe seleccionar el tipo de documento");
			}
			let sCondPago = oData.cbCondPago;
			const bEsSeparacion = oData.tipDocument === "ZPSE";

			if (!bEsSeparacion) {
				if (!sCondPago || sCondPago.trim() === "") {
					sCondPago = oModel.getProperty("/oClientData/vtext");
					oData.cbCondPago = sCondPago;
				}
				if (!sCondPago || sCondPago.trim() === "") {
					aErrors.push("Debe ingresar la condición de pago");
				}
			} else {
				oData.cbCondPago = "";
				oData.txtCondPago = "";
			}
			if (!oData.tipoEntrega) {
				aErrors.push("Debe seleccionar una condición de entrega");
			}
			if (!oData.reasonOrd) {
				aErrors.push("Debe seleccionar el motivo");
			}
			if (!oData.destinoTextil) {
				aErrors.push("Debe ingresar el destino");
			}
			if (oData.showSeparationDates) {
				if (!oData.fechInicio) {
					aErrors.push("Debe ingresar la fecha de inicio");
				}
				if (!oData.fechFin) {
					aErrors.push("Debe ingresar la fecha de fin");
				}
			}
			if (aErrors.length > 0) {
				var sFormattedText = aErrors.map(msg => "• " + msg).join("\n");
				sap.m.MessageBox.error(sFormattedText, {
					title: "Campos requeridos incompletos",
					icon: sap.m.MessageBox.Icon.ERROR
				});
				return false;
			}
			oModel.setProperty("/inputForm", oData);
			return true;
		},

		_getDocRefPendientePorPedido: function (sSalesDocument, mOptions) {
			return this._getPedidoModificarHeader(sSalesDocument, mOptions);
		},

		_getPedConRefItem: function (sSalesDocument, mOptions) {
			return this._getPedidoModificarItems(sSalesDocument, mOptions);
		},

		_loadObsFromPedidoReferencia: function (sSalesDocument) {
			that = this;

			const oModel = this.getView().getModel("oModelProyect");

			var oResp = {
				sEstado: "E",
				oResults: []
			};

			return new Promise(function (resolve) {
				if (!oModel || !sSalesDocument) {
					resolve(oResp);
					return;
				}

				const sBasePath = "/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/ObserPedSet";
				const sQuery = "?$filter=SalesDocument eq '" + sSalesDocument + "'&$format=json&sap-language=es-ES";
				const sPath = sBasePath + sQuery;

				let sUrl = "";
				if (that.local) {
					sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
				} else {
					sUrl = jQuery.sap.getModulePath(that.route) + "/S4HANA" + sPath;
				}

				Services.getoDataERPSync(that, sUrl, function (result) {
					util.response.validateAjaxGetERPNotMessage(result, {
						success: function (oData) {
							let aRaw = [];

							if (oData && oData.data) {
								if (oData.data.d && Array.isArray(oData.data.d.results)) {
									aRaw = oData.data.d.results;
								} else if (Array.isArray(oData.data.results)) {
									aRaw = oData.data.results;
								} else if (Array.isArray(oData.data)) {
									aRaw = oData.data;
								} else {
									aRaw = [oData.data];
								}
							}

							let sObsPedido = "";
							let sObsDelivery = "";

							aRaw.forEach(function (row) {
								const sTextId = row.TextId || row.TdId || row.Tipobs || "";
								const sItm = row.ItmNumber || row.Itmnumber || row.Posnr || "000000";
								const sLine = row.TextLine || row.Tdline || row.Nota || row.Texto || "";

								if (sItm !== "000000" || !sLine) {
									return;
								}

								if (sTextId === "Z001" || sTextId === "OBPE") {
									sObsPedido += (sObsPedido ? "\n" : "") + sLine;
								} else if (sTextId === "Z003" || sTextId === "OBEN") {
									sObsDelivery += (sObsDelivery ? "\n" : "") + sLine;
								}
							});

							oModel.setProperty("/inputForm/obsPedido", sObsPedido);
							oModel.setProperty("/inputForm/obsDelivery", sObsDelivery);

							oResp.sEstado = "S";
							oResp.oResults = aRaw;

							resolve(oResp);
						},
						error: function () {
							oResp.oResults = [];
							resolve(oResp);
						}
					});
				});
			});
		},
		_getPedidoUnitConfig: function (sSalesOrg) {
			const oModel = this.getView().getModel("oModelProyect");

			const sOrg = String(
				sSalesOrg ||
				oModel?.getProperty("/docModificarCabecera/SalesOrganization") ||
				oModel?.getProperty("/oDatClient/SalesOrganization") ||
				oModel?.getProperty("/SalesOrgModificacion") ||
				"1110"
			).trim();

			const mConfig = {
				"1110": {
					SalesOrg: "1110",
					Plant: "1000",
					Unidad: "TEXTILES",
					RouteModificar: "ModPedTextil",
					IsTextil: true,
					IsCeramicos: false
				},
				"1130": {
					SalesOrg: "1130",
					Plant: "1001",
					Unidad: "CERAMICOS",
					RouteModificar: "ModPedCeramicos",
					IsTextil: false,
					IsCeramicos: true
				}
			};

			return mConfig[sOrg] || mConfig["1110"];
		},

		_toNumberPedido: function (v) {
			let s = String(v ?? "0").trim();

			if (!s) {
				return 0;
			}

			s = s.replace(/\s/g, "");

			if (s.includes(",") && s.includes(".")) {
				s = s.replace(/,/g, "");
			} else if (s.includes(",") && !s.includes(".")) {
				s = s.replace(",", ".");
			}

			const n = parseFloat(s);
			return Number.isFinite(n) ? n : 0;
		},

		_formatQty3: function (v) {
			const n = this._toNumberPedido(v);
			return n.toFixed(3);
		},

		_getItemQtyForSimulation: function (oItem) {
			const sCategory = String(oItem.SDDocumentCategory || oItem.SalesDocumentCategory || "").trim();

			if (sCategory === "G") {
				return this._toNumberPedido(
					oItem.TargetQuantity ||
					oItem.CtdPedido ||
					oItem.Quantity ||
					0
				);
			}

			return this._toNumberPedido(
				oItem.OrderQuantity ||
				oItem.CtdPedido ||
				oItem.TargetQuantity ||
				oItem.Quantity ||
				0
			);
		},
		_buildERPUrl: function (sPath) {
			if (this.local) {
				return this.getOwnerComponent().getManifestObject().resolveUri(sPath);
			}

			return jQuery.sap.getModulePath(this.route) + "/S4HANA" + sPath;
		},
		_getPedidoModificarHeader: function (sSalesDocument, mOptions) {
			const that = this;

			mOptions = mOptions || {};

			const sService = mOptions.service || "ZSDB_PORTALCLIENTES";
			const sEntity = mOptions.entity || "DoRePe";

			const oResp = {
				sEstado: "E",
				oResults: []
			};

			return new Promise(function (resolve) {
				if (!sSalesDocument) {
					resolve(oResp);
					return;
				}

				const sBasePath = "/sap/opu/odata/sap/" + sService + "/" + sEntity;
				const sPath =
					sBasePath +
					"?$filter=SalesDocument eq '" + encodeURIComponent(sSalesDocument) + "'" +
					"&$format=json&sap-language=es-ES";

				const sUrl = that._buildERPUrl(sPath);

				Services.getoDataERPSync(that, sUrl, function (result) {
					util.response.validateAjaxGetERPNotMessage(result, {
						success: function (oData) {
							oResp.sEstado = "S";

							if (oData && oData.data && oData.data.d && Array.isArray(oData.data.d.results)) {
								oResp.oResults = oData.data.d.results;
							} else if (oData && oData.data && Array.isArray(oData.data.results)) {
								oResp.oResults = oData.data.results;
							} else if (oData && Array.isArray(oData.data)) {
								oResp.oResults = oData.data;
							} else if (oData && oData.data) {
								oResp.oResults = [oData.data];
							}

							resolve(oResp);
						},
						error: function () {
							resolve(oResp);
						}
					});
				});
			});
		},
		_getPedidoModificarItems: function (sSalesDocument, mOptions) {
			const that = this;

			mOptions = mOptions || {};

			const sService = mOptions.service || "ZSDB_PORTALCLIENTES";
			const sEntity = mOptions.entity || "DoRePeItem";

			const oResp = {
				sEstado: "E",
				oResults: []
			};

			return new Promise(function (resolve) {
				if (!sSalesDocument) {
					resolve(oResp);
					return;
				}

				const sBasePath = "/sap/opu/odata/sap/" + sService + "/" + sEntity;
				const sPath =
					sBasePath +
					"?$filter=SalesDocument eq '" + encodeURIComponent(sSalesDocument) + "'" +
					"&$format=json&sap-language=es-ES";

				const sUrl = that._buildERPUrl(sPath);

				Services.getoDataERPSync(that, sUrl, function (result) {
					util.response.validateAjaxGetERPNotMessage(result, {
						success: function (oData) {
							oResp.sEstado = "S";

							if (oData && oData.data && oData.data.d && Array.isArray(oData.data.d.results)) {
								oResp.oResults = oData.data.d.results;
							} else if (oData && oData.data && Array.isArray(oData.data.results)) {
								oResp.oResults = oData.data.results;
							} else if (oData && Array.isArray(oData.data)) {
								oResp.oResults = oData.data;
							} else if (oData && oData.data) {
								oResp.oResults = [oData.data];
							}

							resolve(oResp);
						},
						error: function () {
							resolve(oResp);
						}
					});
				});
			});
		},

		_goToSeguimientoPrincipal: function () {
			const oModelProyect = this.getView().getModel("oModelProyect");

			if (oModelProyect) {
				oModelProyect.setData(models.createModelProyect());
				oModelProyect.refresh(true);
			}

			const oRouter = sap.ui.core.UIComponent.getRouterFor(this);


			oRouter.navTo("View", {}, true);
		},








	});

});
