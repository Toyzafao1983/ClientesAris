sap.ui.define([
	"com/aris/consultaestadocuenta/pe/controller/BaseController",
	"sap/ui/core/mvc/Controller",
	"com/aris/consultaestadocuenta/pe/model/models",
	"com/aris/consultaestadocuenta/pe/model/formatter",
	"com/aris/consultaestadocuenta/pe/services/Services",
	"com/aris/consultaestadocuenta/pe/util/util",
	'com/aris/consultaestadocuenta/pe/util/utilUI'
], (BaseController, Controller, models, Formatter, Services, util, utilUI) => {
	"use strict";
	var that;
	var tUniNeg = "", tRol = ""
	formatter: Formatter;
	return BaseController.extend("com.aris.consultaestadocuenta.pe.controller.Detail", {
		onInit() {
			that = this;
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getTarget("Detail").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));

			let sURL = window.parent.location.href;
			if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; }
			if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; }
			if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; }

			const oModelUser = this.getModel("oModelUser");
			if (oModelUser) {
				oModelUser.setProperty("/bUniNeg", tUniNeg);
			}
		},
		handleRouteMatched: function (bInit) {
			sap.ui.core.BusyIndicator.show(0);
			let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
			Promise.all([that._getAddressData(sCustomer), that._getClientDetail(tUniNeg, sCustomer),
			that._getEstadoCuenta(sCustomer), that._getProductPres(sCustomer), that._getUsers()
			]).then((values) => {
				let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
				that.oModelProyect = that.getModel("oModelProyect");
				that.oModelData = that.getModel("oModelData");
				let oDataDetalle = values[1].oResults;
				let oDataDetalleClient = oDataDetalle.filter(item => item.Customer == sCustomer);
				if (oDataDetalleClient.length > 0) {
					that.oModelProyect.setProperty("/oDatClient", oDataDetalleClient[0]);
				}
				let oDir = values[0].oResults;
				if (oDir) {
					oDir.FullAddress = `${oDir.Street || ""} ${oDir.HouseNo || ""} ${oDir.StrSuppl1 || ""} ${oDir.StrSuppl2 || ""}, ${oDir.District || ""}, ${oDir.City || ""}, ${oDir.Country || ""}`;
					that.oModelProyect.setProperty("/oDireccionCliente", oDir);
				}
				const oModelUser = this.getModel("oModelUser");

				tRol = oModelUser.getProperty("/bRol") || tRol || "";

				if (!tRol) {
					const oUser = values?.[4]?.Resources?.[0];
					const oAttrIAS = oUser?.["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];
					const aAttr = oAttrIAS?.attributes || [];

					const oAttr1 = aAttr.find(a => a.name === "customAttribute1");
					const oAttr2 = aAttr.find(a => a.name === "customAttribute2");
					const oAttr3 = aAttr.find(a => a.name === "customAttribute3");

					if (oAttr1?.value) {
						tRol = "CLIENTES";
					} else if (oAttr3?.value) {
						tRol = "COORDINADOR";
					} else if (oAttr2?.value) {
						tRol = "VENDEDOR";
					}
				}

				oModelUser.setProperty("/bRol", tRol);
				if (tRol === "CLIENTES") {
					that.getModel("oModelUser").setProperty("/hideAdvancedFields", true);

					if (tUniNeg === "TEXTILES" || tUniNeg === "QUIMICOS") {
						that.getModel("oModelUser").setProperty("/hideSpecialFields", true);
					} else {
						that.getModel("oModelUser").setProperty("/hideSpecialFields", false);
					}

				} else {
					that.getModel("oModelUser").setProperty("/hideAdvancedFields", false);
				}
				if (tUniNeg === "TEXTILES" || tUniNeg === "QUIMICOS") {
					that.getModel("oModelUser").setProperty("/hideSpecialFields", true);
				} else {
					that.getModel("oModelUser").setProperty("/hideSpecialFields", false);
				}
				let ProducPres = Array.isArray(values[3].oResults) ? values[3].oResults : [];
				that.oModelProyect.setProperty("/oLoanedProducts", ProducPres);
				let EstadoCuenta = Array.isArray(values[2].oResults) ? values[2].oResults : [];
				that.oModelProyect.setProperty("/oDetalle", EstadoCuenta);
				that.oModelProyect.refresh(true);
				let sIdioma = that.getModel("oModelProyect").getProperty("/sIdioma");
				if (sIdioma == undefined) {
					that._setLanguageModel("esp");
				}
				sap.ui.core.BusyIndicator.hide(0);
			}).catch(function (oError) {
				that.getMessageBox("error", that.getI18nText("errorUserData"));
				sap.ui.core.BusyIndicator.hide(0);
			});
		},
		_onPressNavButtonDetail: function () {
			this.oRouter.navTo("Main");
		},
		DownloadPdf: function () {
			const oDetalle = this.getModel("oModelProyect").getProperty("/oDetalle");
			const oCliente = this.getModel("oModelProyect").getProperty("/oDatClient");

			if (!oDetalle || oDetalle.length === 0) {
				sap.m.MessageToast.show("No hay datos para descargar el PDF");
				return;
			}

			const sBase64 = oDetalle[0].EPdf;
			if (!sBase64) {
				sap.m.MessageToast.show("El registro no contiene PDF");
				return;
			}

			try {
				const byteCharacters = atob(sBase64);
				const byteNumbers = new Array(byteCharacters.length);
				for (let i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i);
				}
				const byteArray = new Uint8Array(byteNumbers);
				const blob = new Blob([byteArray], { type: "application/pdf" });
				const link = document.createElement("a");
				link.href = URL.createObjectURL(blob);
				const sNombreCliente = oCliente?.CustomerFullName || "Cliente";
				const sBP = oCliente?.Customer || "BP";
				const sFactura = oDetalle[0].Xblnr || "Factura";

				const sFileName = `EECC_${sNombreCliente}_${sBP}`;
				link.download = `${sFileName}.pdf`;

				link.click();
				URL.revokeObjectURL(link.href);
			} catch (e) {
				console.error("Error al generar PDF", e);
				sap.m.MessageToast.show("Error al descargar el PDF");
			}
		},
		_getClientDetail: function (tUniNeg, sCustomer) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					var mapOrg = {
						"TEXTILES": "1110",
						"QUIMICOS": "1120",
						"CERAMICOS": "1130"
					};
					var sSalesOrg = mapOrg[tUniNeg] || "1110";
					let sUrl = "";
					if (that.local) {
						const sPath =
							"/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$filter=" +
							"SalesOrganization eq '" + sSalesOrg + "'" +
							" and (DistributionChannel eq 'C1' or DistributionChannel eq 'C2')" +
							" and Division eq 'S1'" +
							(sCustomer ? " and Customer eq '" + sCustomer + "'" : "") +
							"&$format=json&sap-language=es-ES";

						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath =
							jQuery.sap.getModulePath(that.route) +
							"/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$filter=" +
							"SalesOrganization eq '" + sSalesOrg + "'" +
							" and (DistributionChannel eq 'C1' or DistributionChannel eq 'C2')" +
							" and Division eq 'S1'" +
							(sCustomer ? " and Customer eq '" + sCustomer + "'" : "") +
							"&$format=json&sap-language=es-ES";

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
		_getDatClient: function (tUniNeg, sCustomer) {
			that = this;
			try {
				var oResp = {
					"sEstado": "E",
					"oResults": []
				};
				return new Promise(function (resolve, reject) {
					var mapOrg = {
						"TEXTILES": "1110",
						"QUIMICOS": "1120",
						"CERAMICOS": "1130"
					};
					var sSalesOrg = mapOrg[tUniNeg] || "1110";

					let sUrl = "";
					if (that.local) {
						const sPath =
							"/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DataCustomer?$filter=" +
							"SalesOrganization eq '" + sSalesOrg + "'" +
							" and DistributionChannel eq 'C1'" +
							" and Division eq 'S1'" +
							" and (CustomerDni ne '' or CustomerRuc ne '')" +
							(sCustomer ? " and Customer eq '" + sCustomer + "'" : "") +
							"&$format=json&sap-language=es-ES";

						sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
					} else {
						const sPath =
							jQuery.sap.getModulePath(that.route) +
							"/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DataCustomer?$filter=" +
							"SalesOrganization eq '" + sSalesOrg + "'" +
							" and DistributionChannel eq 'C1'" +
							" and Division eq 'S1'" +
							" and (CustomerDni ne '' or CustomerRuc ne '')" +
							(sCustomer ? " and Customer eq '" + sCustomer + "'" : "") +
							"&$format=json&sap-language=es-ES";

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
		formatDayMonthYear: function (oDate) {
			if (!oDate) return "";
			var day = oDate.getDate().toString().padStart(2, "0");
			var month = (oDate.getMonth() + 1).toString().padStart(2, "0");
			var year = oDate.getFullYear();
			return `${day}/${month}/${year}`;
		},
		formatStatusColor: function (sVencido) {
			if (!sVencido) {
				return "None";
			}
			if (sVencido === "@0A@") {
				return "Error";
			} else if (sVencido === "@08@") {
				return "Success";
			}
			return "None";
		},
		getDocumento: function (oContext) {
			if (!oContext) return "";

			return (
				oContext.TaxNumber1 ||
				oContext.TaxNumber2 ||
				oContext.TaxNumber3 ||
				oContext.TaxNumber4 ||
				oContext.TaxNumber5 ||
				oContext.TaxNumber6 ||
				""
			);
		},

		getFirstTaxNumber: function (oCliente) {
			if (!oCliente) return "";
			for (let i = 1; i <= 6; i++) {
				const tax = oCliente["TaxNumber" + i];
				if (tax && tax.trim() !== "") {
					return tax.trim();
				}
			}
			return "";
		},
		_formatDateDDMMYYYY: function (sapDate) {
			if (!sapDate) return "";
			try {
				if (sapDate.includes("/Date(")) {
					const timestamp = parseInt(sapDate.replace(/[^0-9]/g, ""), 10);
					const date = new Date(timestamp);

					const day = String(date.getUTCDate()).padStart(2, "0");
					const month = String(date.getUTCMonth() + 1).padStart(2, "0");
					const year = date.getUTCFullYear();

					return `${day}/${month}/${year}`;
				}
				if (sapDate.includes("-")) {
					const [year, month, day] = sapDate.split("-");
					return `${day}/${month}/${year}`;
				}

				return sapDate;

			} catch (e) {
				return sapDate;
			}
		},
		onAbrirTestEcomprobantes: async function (oEvent) {
			const oCtx = oEvent.getSource().getBindingContext("oModelProyect");
			if (!oCtx) {
				sap.m.MessageBox.warning("No se pudo determinar el comprobante seleccionado.");
				return;
			}

			const oRow = oCtx.getObject() || {};
			const sDocRef = (oRow.Xblnr || "").trim();

			if (!sDocRef) {
				sap.m.MessageBox.warning("El registro no tiene número de comprobante.");
				return;
			}

			let tDoc = "01";
			let sFact = "";
			let cFact = "";

			const aParts = sDocRef.split("-").map(s => (s || "").trim()).filter(Boolean);

			if (aParts.length >= 3 && /^\d{2}$/.test(aParts[0])) {
				tDoc = aParts[0];
				sFact = aParts[1];
				cFact = aParts.slice(2).join("-");
			} else if (aParts.length >= 2) {
				sFact = aParts[0];
				cFact = aParts.slice(1).join("-");
			} else {
				sap.m.MessageBox.warning("El campo Xblnr no tiene el formato esperado.");
				return;
			}

			let issueDate = "";
			const vDocDate = oRow.DocDate;

			if (typeof vDocDate === "string" && vDocDate.includes("/Date(")) {
				const timestamp = parseInt(vDocDate.replace(/[^0-9]/g, ""), 10);
				const date = new Date(timestamp);
				const yyyy = date.getUTCFullYear();
				const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
				const dd = String(date.getUTCDate()).padStart(2, "0");
				issueDate = `${yyyy}-${mm}-${dd}`;
			} else if (typeof vDocDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(vDocDate)) {
				issueDate = vDocDate.slice(0, 10);
			}

			const sTotalAmount = oRow.Monto || "";
			const sRucEmisor = "20100257298";

			const payload = {
				accountingSupplierPartyId: sRucEmisor,
				documentNumber: cFact,
				documentSerie: sFact,
				documentType: tDoc,
				issueDate: issueDate,
				totalAmount: sTotalAmount,
				fileType: "PDF"
			};

			try {
				sap.ui.core.BusyIndicator.show(0);
				const sNombreArchivo = `${sRucEmisor}-${tDoc}-${sFact}-${cFact}.pdf`;
				await this._downloadFromEcomprobantes(payload, sNombreArchivo);
			} catch (e) {
				if (e && e.message) {
					sap.m.MessageBox.error(e.message);
				}
			} finally {
				sap.ui.core.BusyIndicator.hide();
			}
		},
		_isLinkFactura: function (sXblnr) {
			const s = (sXblnr || "").toString().trim().toUpperCase();

			if (!s) {
				return false;
			}

			// Títulos / cabeceras conocidos
			if (
				s === "ANTICIPOS" ||
				s === "FACTURA" ||
				s.startsWith("TOTAL ")
			) {
				return false;
			}

			// Si tiene al menos un número, lo tratamos como documento
			// porque hay casos válidos como:
			// OC 000000095
			// OC 2026000295
			// 01-FF2A-00000882
			// 6390001294
			const bTieneNumero = /\d/.test(s);

			if (bTieneNumero) {
				return true;
			}

			// Si no tiene números, es texto descriptivo
			return false;
		},
		_isTextFactura: function (sXblnr) {
			return !this._isLinkFactura(sXblnr);
		},
	});
});