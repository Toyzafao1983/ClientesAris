
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
	"com/aris/consultaestadocuenta/pe/services/ServiceOdata",
	"com/aris/consultaestadocuenta/pe/model/models",
	"com/aris/consultaestadocuenta/pe/model/formatter",
	"com/aris/consultaestadocuenta/pe/services/Services",
	"com/aris/consultaestadocuenta/pe/util/util",
	"sap/ui/model/resource/ResourceModel"
], function (Controller, History, UIComponent, MessageBox, MessageToast, Fragment, BusyIndicator, JSONModel,
	Filter, FilterOperator, Spreadsheet, Token, ServiceOdata, models, Formatter, Services, util, ResourceModel) {
	"use strict";
	var that;
	var sMessage = "";
	var that;
	return Controller.extend("com.aris.consultaestadocuenta.pe.controller.BaseController", {
		formatter: Formatter,
		local: window.location.href.indexOf('launchpad') == -1 ? true : false,
		localModel: true,
		AdminUser: true,
		userSet: "kestefo@ravaconsulting.com.pe",
		route: "com.aris.consultaestadocuenta.pe",
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
			var numberOutput = Math.abs(number); /* Valor absoluto del número */
			var length = number.toString().length; /* Largo del número */
			var zero = "0"; /* String de cero */

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
			let bValidate = false;
			if (oCell instanceof sap.m.HBox) bValidate = true;
			if (oCell instanceof sap.m.VBox) bValidate = true;
			return bValidate;
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

		//Llamadas reutilizables
		_getPrueba: function () {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = '/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES';
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + '/S4HANA/sap/opu/odata/sap/ZODATA_PM_SOLICIT_MAQ_Z4_SRV/EtResponsableSet?sap-language=es-ES';
						sUrl = sPath;
					}
					if (that.localModel) { resolve(models.oModelPrueba()); }
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
		_getProduct: function (sNumPedido) {
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
					if (that.localModel) { resolve(models.JsonPrestamo()); }
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
		_getEstadoCuentaListSelect: function () {
			return [
				"Bukrs",
				"Kunnr",
				"Datum",
				"Forma",
				"Vencido",
				"Xblnr",
				"ItemText",
				"Banco",
				"RefKey1",
				"DocDate",
				"Netduedate",
				"Waers",
				"Monto",
				"Condicion"
			].join(",");
		},
		_getEstadoCuentaPdfSelect: function () {
			return [
				"Bukrs",
				"Kunnr",
				"Datum",
				"Forma",
				"Xblnr",
				"EPdf"
			].join(",");
		},
		_getEstadoCuenta: function (sCustomer, sBukrs = "1001", sForma = "1", sSelect) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};

				return new Promise(function (resolve, reject) {
					let sUrl = "";

					// 📌 Obtener la fecha de hoy
					let oToday = new Date();
					let sYear = oToday.getFullYear();
					let sMonth = String(oToday.getMonth() + 1).padStart(2, "0");
					let sDay = String(oToday.getDate()).padStart(2, "0");
					let sFecha = `${sYear}-${sMonth}-${sDay}T00:00:00`;

					let sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/eEstadoCuentaSet` + `?$filter=Bukrs eq '${sBukrs}' and Kunnr eq '${sCustomer}'` + ` and Datum eq datetime'${sFecha}' and Forma eq '${sForma}'`;
					let sSelectParam = sSelect || that._getEstadoCuentaListSelect();
					if (sSelectParam) {
						sPath += `&$select=${sSelectParam}`;
					}

					if (that.local) {
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						sUrl = jQuery.sap.getModulePath(that.route) + "/S4HANA" + sPath;
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
		_getAddressData: function (sCustomer) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iDireccionesSet(Businesspartner='${sCustomer}')?$format=json`;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) +
							`/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iDireccionesSet(Businesspartner='${sCustomer}')?$format=json`;
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
		_getProductPres: function (sCustomer) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/LoanedProductsSet?$filter=Customer eq '${sCustomer}'&$format=json`;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + `/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/LoanedProductsSet?$filter=Customer eq '${sCustomer}'&$format=json`;
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

		_getUsuarios: function (sCustomer) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iConsultaDatosBPSet?$filter=COD_BP eq '1000000003' and RUC_BP eq '20481916659'&$expand=toConsultaDatosBP&format=json`;
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + `/S4HANA//sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iConsultaDatosBPSet?$filter=COD_BP eq '1000000013' and RUC_BP eq '20100201403'&$expand=toConsultaDatosBP&format=json`;
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
		_getSalesOrgByBP: function (sBP) {
			const that = this;

			return new Promise((resolve) => {
				if (!sBP) {
					void 0;
					resolve([]);
					return;
				}

				const sFilter = `$filter=BP eq '${sBP}'&$expand=toBpSalesOrganization&$format=json`;
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
							const aResults = Array.isArray(oData?.data) ? oData.data : [];

							aResults.forEach(function (oItem) {
								const sDirectSalesOrg =
									oItem.SALES_ORG ||
									oItem.SalesOrganization ||
									oItem.Salesorganization ||
									"";

								if (sDirectSalesOrg) {
									aSalesOrgs.push(String(sDirectSalesOrg).trim());
								}

								const aNested = oItem?.toBpSalesOrganization?.results || [];

								aNested.forEach(function (oSubItem) {
									const sNestedSalesOrg =
										oSubItem.SALES_ORG ||
										oSubItem.SalesOrganization ||
										oSubItem.Salesorganization ||
										"";

									if (sNestedSalesOrg) {
										aSalesOrgs.push(String(sNestedSalesOrg).trim());
									}
								});
							});

							const aUniqueSalesOrgs = [...new Set(aSalesOrgs)].filter(Boolean);

							void 0;

							resolve(aUniqueSalesOrgs);
						},
						error: function (err) {
							void 0;
							resolve([]);
						}
					});
				});
			});
		},
		_getBPVendedor: function () {
			that = this
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					let sUrl = "";
					if (that.local) {
						const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/UsOrve?$format=json";
						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath = jQuery.sap.getModulePath(that.route) + "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/UsOrve?$format=json";
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
		getBusinessUnit: function () {
			let sURL = window.parent.location.href || "";
			if (sURL.includes("site-textiles")) return "TEXTILES";
			if (sURL.includes("site-quimicos")) return "QUIMICOS";
			if (sURL.includes("site-ceramicos")) return "CERAMICOS";
			return ""; // default
		},
		_setLanguageModel: function (langKey) {
			var bundleName;
			if (langKey === "esp") {
				bundleName = "com.aris.consultaestadocuenta.pe.i18n.i18n_esp";
			} else if (langKey === "ing") {
				bundleName = "com.aris.consultaestadocuenta.pe.i18n.i18n_ing";
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
				throw oError;
			});
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


	});

});
