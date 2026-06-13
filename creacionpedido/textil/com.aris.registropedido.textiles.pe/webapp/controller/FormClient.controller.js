sap.ui.define([
    "com/aris/registropedido/textiles/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "com/aris/registropedido/textiles/pe/model/models",
    "com/aris/registropedido/textiles/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    '../util/util',
    '../util/utilUI',
    "sap/m/BusyDialog",
    "sap/ui/core/Fragment",
    "com/aris/registropedido/textiles/pe/services/Services"
], (BaseController, Controller, models, Formatter, JSONModel, MessageBox, MessageToast, util, utilUI, BusyDialog, Fragment, Services) => {
    "use strict";

    var that
    formatter: Formatter;
    return BaseController.extend("com.aris.registropedido.textiles.pe.controller.FormClient", {

        onInit() {
            that = this;
            // this._loadDriveId();
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("FormClient").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
            const sUserData = localStorage.getItem("oModelUser");
            if (sUserData) {
                const oUserData = JSON.parse(sUserData);
                const oModelUser = new sap.ui.model.json.JSONModel(oUserData);
                this.getView().setModel(oModelUser, "oModelUser");
            }

        },
        handleRouteMatched: function (bInit) {
            sap.ui.core.BusyIndicator.show(0);

            const sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];

            Promise.all([
                that._getPrueba(),                  // 0
                that._getTipMaterialData(),        // 1
                that._getTipChangeData(),          // 2
                that._getReason(),                 // 3
                that._getTipDocumentData(),        // 4
                that._getClientPet(sCustomer),     // 5
                that._getAddressData(sCustomer),   // 6
                that._getCreditDispo(sCustomer),   // 7
                that._getPrincipalSeller(sCustomer), // 8
                that._getDatClientView(sCustomer), // 9
                that._getAddresTravel(sCustomer),  // 10
                that._getCOnditionPay(),           // 11
                that._getUsers(),                  // 12
                that._getBPVendedor(),             // 13
                that._getDatClient(),               // 14
                that._getTypeShipment(),           // 15
                that._getPortEmbarkation()         // 16
            ]).then(async (values) => {
                const oModelProyect = that.getModel("oModelProyect");
                const oModelData = that.getModel("oModelData");
                const oModelUser = that.getModel("oModelUser");
                const oModelDevice = that.getModel("oModelDevice");

                if (oModelData) {
                    oModelData.setSizeLimit(900000);
                }

                if (oModelProyect) {
                    oModelProyect.setSizeLimit(900000);
                }

                that.oModelProyect = oModelProyect;
                that.oModelData = oModelData;
                that.oModelUser = oModelUser;
                that.oModelDevice = oModelDevice;
                oModelProyect.setProperty("/oClienteSeleccionado", { Customer: sCustomer });

                // IMPORTANTE: esperar a que cargue el rol
                await that._validateAccessToPortal(values);

                const aTipMaterialData = values[1]?.oResults || [];
                const aTipMaterialDataFiltrado = this._filterMaterialGroupsByPerfil(aTipMaterialData);

                oModelData.setProperty("/oTipMaterialDataAll", aTipMaterialData);
                oModelData.setProperty("/oTipMaterialData", aTipMaterialDataFiltrado);

                const oTipoCambioRaw = values[2]?.oResults || {};
                const oTipoCambio = {
                    from: {
                        moneda: oTipoCambioRaw.FromCurr || "PEN",
                        valor: oTipoCambioRaw.ExchRate || 0
                    },
                    to: {
                        moneda: oTipoCambioRaw.ToCurrncy || "USD",
                        valor: oTipoCambioRaw.ExchRate || 0
                    },
                    fechaValidez: oTipoCambioRaw.ValidFrom
                        ? new Date(parseInt(oTipoCambioRaw.ValidFrom.match(/\d+/)[0], 10))
                        : null,
                    fecha: oTipoCambioRaw.Date
                        ? new Date(parseInt(oTipoCambioRaw.Date.match(/\d+/)[0], 10))
                        : null
                };
                oModelData.setProperty("/oTipChangeData", oTipoCambio);
                oModelData.setProperty("/oReason", values[3]?.oResults || []);

                // =========================
                // Cliente / dirección
                // =========================
                const aClientPet = values[5]?.oResults || [];
                const oDataDetalleClient = aClientPet.find(item => item.Customer == sCustomer) || null;

                if (oDataDetalleClient) {
                    oModelProyect.setProperty("/oDatClient", oDataDetalleClient);
                    oModelProyect.setProperty("/oClienteSeleccionado", {
                        Customer: oDataDetalleClient.Customer
                    });
                }

                const oDir = values[6]?.oResults || {};
                if (oDir && Object.keys(oDir).length) {
                    oDir.FullAddress = `${oDir.Street || ""} ${oDir.HouseNo || ""} ${oDir.StrSuppl1 || ""} ${oDir.StrSuppl2 || ""}, ${oDir.District || ""},${oDir.Region || ""}, ${oDir.City || ""}, ${oDir.Country || ""}`;
                    oModelProyect.setProperty("/oDireccionCliente", oDir);
                }

                // =========================
                // Tipos de documento: guardar catálogo completo y luego filtrar
                // =========================
                const aTipDocsAll = values[4]?.oResults || [];
                oModelData.setProperty("/oTipDocumentDataAll", aTipDocsAll);

                const bIsCliente = !!oModelUser.getProperty("/bIsCliente");
                const bIsVendedor = !!oModelUser.getProperty("/bIsVendedor");
                const bIsCoord = !!oModelUser.getProperty("/bIsCoord");

                const sCountry = String(
                    oDir?.Country ||
                    oDataDetalleClient?.Country ||
                    oDataDetalleClient?.CountryCode ||
                    oDataDetalleClient?.Land1 ||
                    ""
                ).trim().toUpperCase();

                const bClientePE = sCountry === "PE";

                let aPermitidos = [];

                if (!bClientePE) {
                    aPermitidos = ["ZPEF"];
                } else if (bIsCliente) {
                    aPermitidos = ["ZPES"];
                } else if (bIsVendedor && !bIsCoord) {
                    aPermitidos = ["ZCNA", "ZPES", "ZPSE"];
                } else if (bIsCoord) {
                    aPermitidos = ["ZCNA", "ZPES", "ZPSE", "ZGNA"];
                } else {
                    aPermitidos = [];
                }

                const aTipDocsFiltrados = aTipDocsAll.filter(function (doc) {
                    return aPermitidos.includes(String(doc.auart || "").trim().toUpperCase());
                });

                console.log("TIPDOC ALL:", aTipDocsAll);
                console.log("TIPDOC país:", sCountry);
                console.log("TIPDOC rol:", {
                    bIsCliente,
                    bIsVendedor,
                    bIsCoord
                });
                console.log("TIPDOC permitidos:", aPermitidos);
                console.log("TIPDOC filtrados:", aTipDocsFiltrados);

                oModelData.setProperty("/oTipDocumentData", aTipDocsFiltrados);

                const oCredito = values[7]?.oResults?.[0] || {};
                oModelProyect.setProperty("/oCreditoCliente", oCredito);

                const oPrincipalSeller = values[8]?.oResults || null;

                if (oPrincipalSeller) {
                    oModelProyect.setProperty("/oPrincipalSeller", oPrincipalSeller);
                }

                console.log("PrincipalSeller CustSalesPartnertNerFunc:", oPrincipalSeller);

                const aDatClient = values[9]?.oResults || [];
                const oClientDataCurrent = aDatClient.find(function (item) {
                    return String(item.Customer || "").trim() === String(sCustomer || "").trim();
                }) || {};

                if (oClientDataCurrent && Object.keys(oClientDataCurrent).length) {
                    oModelProyect.setProperty("/oClientData", oClientDataCurrent);
                }

                const oSellerPrincipal = this._resolveSellerPrincipal(
                    oClientDataCurrent,
                    oPrincipalSeller
                );

                console.log("Seller principal resuelto:", {
                    oClientDataCurrent: oClientDataCurrent,
                    oPrincipalSeller: oPrincipalSeller,
                    oSellerPrincipal: oSellerPrincipal
                });

                const aSellerRaw = values[14]?.oResults || [];
                const mSeller = new Map();

                aSellerRaw.forEach(function (r) {
                    const sBP = String(r.kunn2 || "").trim();
                    if (sBP && !mSeller.has(sBP)) {
                        mSeller.set(sBP, {
                            kunn2: sBP,
                            Seller: r.Seller || ""
                        });
                    }
                });

                let aSellerOptions = Array.from(mSeller.values()).filter(function (item) {
                    return item.kunn2 && item.Seller;
                });

                if (oClientDataCurrent.kunn2) {
                    const bExiste = aSellerOptions.some(function (item) {
                        return item.kunn2 === oClientDataCurrent.kunn2;
                    });

                    if (!bExiste) {
                        aSellerOptions.unshift({
                            kunn2: oClientDataCurrent.kunn2,
                            Seller: oClientDataCurrent.Seller || ""
                        });
                    }
                }

                let oSellerPrincipalFinal = {
                    kunn2: oSellerPrincipal.kunn2 || "",
                    Seller: oSellerPrincipal.Seller || ""
                };

                /*
                 * Si el servicio puntual no devuelve vendedor, pero la lista general sí tiene opciones,
                 * tomamos el primer vendedor que el Select terminaría mostrando visualmente.
                 */
                if (!oSellerPrincipalFinal.kunn2 && !oSellerPrincipalFinal.Seller && aSellerOptions.length) {
                    oSellerPrincipalFinal = {
                        kunn2: aSellerOptions[0].kunn2 || "",
                        Seller: aSellerOptions[0].Seller || ""
                    };
                }

                oModelProyect.setProperty("/oSellerPrincipalOptions", aSellerOptions);

                oModelProyect.setProperty("/oSellerPrincipalSelected", {
                    kunn2: oSellerPrincipalFinal.kunn2 || "",
                    Seller: oSellerPrincipalFinal.Seller || ""
                });

                oModelProyect.setProperty("/inputForm/sellerPrincipalKunn2", oSellerPrincipalFinal.kunn2 || "");
                oModelProyect.setProperty("/inputForm/sellerPrincipalName", oSellerPrincipalFinal.Seller || "");

                /*
                 * Compatibilidad con lógica antigua.
                 */
                oModelProyect.setProperty("/oClientData/kunn2", oSellerPrincipalFinal.kunn2 || "");
                oModelProyect.setProperty("/oClientData/Seller", oSellerPrincipalFinal.Seller || "");

                console.log("FORMCLIENT Seller principal final aplicado:", {
                    aSellerOptions: aSellerOptions,
                    oSellerPrincipalOriginal: oSellerPrincipal,
                    oSellerPrincipalFinal: oSellerPrincipalFinal
                });

                const aAgencias = values[10]?.oResults || [];
                if (aAgencias.length) {
                    const aSoloAgencias = aAgencias.filter(item => item.Agencyname && item.Customer);
                    const aSoloDestinos = aAgencias.filter(item => item.Destination && item.Destinationid);

                    oModelProyect.setProperty("/oAgenciasCliente", aSoloAgencias);
                    oModelProyect.setProperty("/oDestinosCliente", aSoloDestinos);

                    that._setDefaultDestinoTextil();
                }

                oModelData.setProperty("/oConditionPay", values[11]?.oResults || []);

                const aTypeShipmentRaw = values[15]?.oResults || [];
                const aTypeShipment = aTypeShipmentRaw.map(function (row) {
                    return Object.assign({}, row, {
                        sKey: String(row.Code || row.sKey || row.Key || row.Value || row.Valpos || "").trim(),
                        sText: String(row.Text || row.sText || row.Description || row.Descripcion || "").trim()
                    });
                });

                console.log("TypeShipment normalizado:", aTypeShipment);

                oModelData.setProperty("/oTypeShipment", aTypeShipment);
                const aPortEmbarkationRaw = values[16]?.oResults || [];
                const aPortEmbarkation = this._normalizePortEmbarkation(aPortEmbarkationRaw);

                oModelData.setProperty("/oPortEmbarkation", aPortEmbarkation);
                that._setDefaultCondicionPago();
                that._setLanguageModel("esp");

                let sTipDocument = oModelProyect.getProperty("/inputForm/tipDocument") || "";
                that._applyCondPagoForDocType(sTipDocument);

                oModelProyect.setProperty("/isFormEnabled", sTipDocument !== "");
                oModelProyect.refresh(true);

                const sIdioma = oModelProyect.getProperty("/sIdioma");
                oModelProyect.setProperty("/bShowBtnPedidoRef", false);

                if (!oModelProyect.getProperty("/inputForm")) {
                    oModelProyect.setProperty("/inputForm", {
                        tipDocument: "",
                        igv: "",
                        showSeparationDates: false,
                        PedExport: false,
                        fechInicio: "",
                        fechFin: "",
                        tipoEmbarque: "05",
                        puertoEmbarque: "",
                        puertoEmbarqueText: "",
                        bultos: "",
                        obsPedido: "",
                        isFormEnabled: false,
                        isTipDocumentEnabled: true
                    });
                } else {
                    const oInputForm = oModelProyect.getProperty("/inputForm");
                    oInputForm.showSeparationDates = oInputForm.showSeparationDates || false;
                    oInputForm.PedExport = oInputForm.PedExport || false;
                    oModelProyect.setProperty("/inputForm", oInputForm);
                }

                if (sIdioma === undefined) {
                    that._setLanguageModel("esp");
                } else {
                    that._setLanguageModel(sIdioma);
                }
                that._applyTipDocumentFilter();
                that._updateFormState();
                sap.ui.core.BusyIndicator.hide(0);

            }).catch(function (oError) {
                that.getMessageBox("error", that.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            });
        },
        _validateAccessToPortal: async function (values) {
            try {
                let sURL = window.parent.location.href;
                let tUniNeg = "";
                let tSalesOrg = "";
                if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; tSalesOrg = "1110"; }
                if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; tSalesOrg = "1120"; }
                if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; tSalesOrg = "1130"; }
                const oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                const oModelUser = that.getModel("oModelUser");
                const oUserResp = values[12];
                if (!oUserResp || !oUserResp.Resources || !oUserResp.Resources.length) {
                    sap.ui.core.BusyIndicator.hide(0);
                    oRouter.navTo("AccessDenied");
                    return;
                }
                let oUser = oUserResp.Resources[0];
                let sFirstName = oUser?.name?.givenName || "";
                let sLastName = oUser?.name?.familyName || "";
                let sFullName = `${sFirstName} ${sLastName}`.trim();
                oModelUser.setProperty("/bUserName", sFullName);
                localStorage.setItem("userFullName", sFullName);
                let oAttrIAS = oUser["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];
                let aAttr = (oAttrIAS && oAttrIAS.attributes) ? oAttrIAS.attributes : [];
                let oAttr1 = aAttr.find(a => a.name === "customAttribute1");
                let oAttr2 = aAttr.find(a => a.name === "customAttribute2");
                let oAttr3 = aAttr.find(a => a.name === "customAttribute3");
                let sBPCliente = oAttr1 ? oAttr1.value : "";
                let sBPVendedor = oAttr2 ? oAttr2.value : "";
                let sBPCoord = oAttr3 ? oAttr3.value : "";
                let sBPFinal = sBPVendedor || sBPCoord || "";
                oModelUser.setProperty("/bBPFinal", sBPFinal);
                if (sBPFinal) {
                    const oModelProyect = that.getModel("oModelProyect");
                    oModelProyect.setProperty("/oSeller", [{
                        kunn2: sBPFinal,
                        Seller: sFullName
                    }]);
                }
                const oUserCache = {
                    fullName: sFullName,
                    BPCliente: sBPCliente,
                    BPVendedor: sBPVendedor,
                    BPCoord: sBPCoord,
                    UniNeg: tUniNeg,
                    SalesOrg: tSalesOrg
                };
                localStorage.setItem("oUserCache", JSON.stringify(oUserCache));
                if (sBPCliente) {
                    const aClientes = values[5]?.oResults || [];
                    const oCliente = aClientes.find(item => item.Customer === sBPCliente);
                    const aSalesOrgs = await that._getSalesOrgByBP(sBPCliente);
                    if (!Array.isArray(aSalesOrgs) || !aSalesOrgs.includes(tSalesOrg)) {
                        sap.ui.core.BusyIndicator.hide(0);
                        oRouter.navTo("AccessDenied");
                        return;
                    }
                    oModelUser.setProperty("/bRol", "CLIENTES");
                    oModelUser.setProperty("/bBP", sBPCliente);
                    oModelUser.setProperty("/bUniNeg", tUniNeg);
                    oModelUser.setProperty("/customAttribute", "customAttribute1");
                    oModelUser.setProperty("/oSalesOrgIAS", aSalesOrgs);
                    oModelUser.setProperty("/bIsCliente", true);
                    oModelUser.setProperty("/bIsInterno", false);
                    oModelUser.setProperty("/bIsVendedor", false);
                    oModelUser.setProperty("/bIsCoord", false);
                    localStorage.setItem("oModelUser", JSON.stringify(oModelUser.getData()));
                    sap.ui.core.BusyIndicator.hide(0);
                    return;
                }
                if (sBPVendedor || sBPCoord) {
                    const sUsuarioIAS = sBPVendedor || sBPCoord;
                    const oVendResp = values[13]?.oResults;
                    let aVendedores = [];
                    if (oVendResp) {
                        if (oVendResp.d && Array.isArray(oVendResp.d.results)) {
                            aVendedores = oVendResp.d.results;
                        } else if (Array.isArray(oVendResp)) {
                            aVendedores = oVendResp;
                        }
                    }
                    const oMatch = aVendedores.find(item => item.usuario === sUsuarioIAS);
                    if (!oMatch) {
                        sap.ui.core.BusyIndicator.hide(0);
                        oRouter.navTo("AccessDenied");
                        return;
                    }
                    const aSalesOrgs = aVendedores
                        .filter(v => v.usuario === sUsuarioIAS)
                        .map(v => v.orgventas);

                    if (!Array.isArray(aSalesOrgs) || !aSalesOrgs.includes(tSalesOrg)) {
                        sap.ui.core.BusyIndicator.hide(0);
                        oRouter.navTo("AccessDenied");
                        return;
                    }
                    const bIsVendedor = (oMatch.DscPerfil === "Vendedor");
                    const bIsCoord = (oMatch.DscPerfil === "Coordinador");
                    oModelUser.setProperty("/bPerfil", oMatch.DscPerfil);
                    oModelUser.setProperty("/bUniNeg", tUniNeg);
                    const sAttr = sBPVendedor ? "customAttribute2" : "customAttribute3";
                    oModelUser.setProperty("/customAttribute", sAttr);
                    oModelUser.setProperty("/bBP", sUsuarioIAS);
                    oModelUser.setProperty("/bBPFinal", sUsuarioIAS);
                    oModelUser.setProperty("/oSalesOrgIAS", aSalesOrgs);
                    oModelUser.setProperty("/bIsCliente", false);
                    oModelUser.setProperty("/bIsInterno", true);
                    oModelUser.setProperty("/bIsVendedor", bIsVendedor);
                    oModelUser.setProperty("/bIsCoord", bIsCoord);
                    localStorage.setItem("oModelUser", JSON.stringify(oModelUser.getData()));
                    sap.ui.core.BusyIndicator.hide(0);
                    return;
                }
                sap.ui.core.BusyIndicator.hide(0);
                oRouter.navTo("AccessDenied");
            } catch (oError) {
                sap.ui.core.BusyIndicator.hide(0);
                const oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("AccessDenied");
            }
        },
        // Marcas que se agregan por defecto al ingresar
        _setDefaultDestinoTextil: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) { return; }
            const sPathKey = "/inputForm/destinoTextil";
            const sCurrent = (oModel.getProperty(sPathKey) || "").trim();
            if (sCurrent) { return; }
            const aDestinos = oModel.getProperty("/oDestinosCliente") || [];
            if (!aDestinos.length) { return; }
            const oFirst = aDestinos.find(d => d && d.Destinationid);
            if (!oFirst) { return; }
            oModel.setProperty(sPathKey, oFirst.Destinationid);
            oModel.setProperty("/inputForm/destinoTextilText", oFirst.Destination || "");
            if (typeof this._updateResumenEntrega === "function") {
                this._updateResumenEntrega();
            }

            oModel.refresh(true);
        },
        _setDefaultCondicionPago: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");
            if (!oModelProyect || !oModelData) return;

            const oClientData = oModelProyect.getProperty("/oClientData") || {};
            const oInputForm = oModelProyect.getProperty("/inputForm") || {};
            const aCondiciones = oModelData.getProperty("/oConditionPay") || [];
            const bEsSeparacion = oInputForm.tipDocument === "ZPSE";

            if (bEsSeparacion) {
                oInputForm.cbCondPago = "";
                oInputForm.txtCondPago = "";
                oModelProyect.setProperty("/inputForm", oInputForm);
                return;
            }

            // Cliente exterior + ZPEF: siempre 4000
            if (typeof this._isClienteExteriorZPEF === "function" && this._isClienteExteriorZPEF()) {
                this._ensureCondPagoOption("4000", "Contado a la Fecha de Embarque");

                oInputForm.cbCondPago = "4000";
                oInputForm.txtCondPago = "Contado a la Fecha de Embarque";
                oModelProyect.setProperty("/inputForm", oInputForm);
                return;
            }

            if (!oInputForm.cbCondPago && oClientData.zterm) {
                const sCodigoCliente = oClientData.zterm;
                const sDescripcionCliente = oClientData.vtext;

                const oCondExistente = aCondiciones.find(c => c.Conditionn === sCodigoCliente);

                if (!oCondExistente && sCodigoCliente && sDescripcionCliente) {
                    aCondiciones.unshift({
                        Conditionn: sCodigoCliente,
                        DesCondition: sDescripcionCliente
                    });

                    oModelData.setProperty("/oConditionPay", aCondiciones);
                }

                oInputForm.cbCondPago = sCodigoCliente;
                oInputForm.txtCondPago = sDescripcionCliente;
                oModelProyect.setProperty("/inputForm", oInputForm);
            }
        },

        _getClienteCountry: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            if (!oModelProyect) {
                return "";
            }

            const oDir = oModelProyect.getProperty("/oDireccionCliente") || {};
            const oDatClient = oModelProyect.getProperty("/oDatClient") || {};
            const oClientData = oModelProyect.getProperty("/oClientData") || {};

            return String(
                oDir.Country ||
                oDatClient.Country ||
                oDatClient.CountryCode ||
                oDatClient.Land1 ||
                oClientData.Country ||
                oClientData.CountryCode ||
                oClientData.Land1 ||
                ""
            ).trim().toUpperCase();
        },

        _isClienteExteriorZPEF: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            if (!oModelProyect) {
                return false;
            }

            const sCountry = this._getClienteCountry();
            const sTipDoc = String(
                oModelProyect.getProperty("/inputForm/tipDocument") || ""
            ).trim().toUpperCase();

            return sCountry !== "PE" && sTipDoc === "ZPEF";
        },

        _ensureCondPagoOption: function (sKey, sText) {
            const oModelData = this.getView().getModel("oModelData");
            if (!oModelData || !sKey) {
                return;
            }

            const aCondiciones = oModelData.getProperty("/oConditionPay") || [];

            const bExists = aCondiciones.some(function (oCond) {
                return String(oCond.Conditionn || "").trim() === sKey;
            });

            if (!bExists) {
                aCondiciones.unshift({
                    Conditionn: sKey,
                    DesCondition: sText
                });

                oModelData.setProperty("/oConditionPay", aCondiciones);
            }
        },

        _isDocGratuitaMuestra: function (sDocType) {
            return ["ZGNA", "ZNGA"].includes(
                String(sDocType || "").trim().toUpperCase()
            );
        },

        _applyCondPagoForDocType: function (sDocType) {
            const oView = this.getView();
            const oModelP = oView.getModel("oModelProyect");
            const oModelD = oView.getModel("oModelData");
            const oCB = oView.byId("cbCondPago");

            if (!oModelP || !oModelD) {
                return;
            }

            const Filter = sap.ui.model.Filter;
            const FO = sap.ui.model.FilterOperator;

            const sCodigo = "0100";
            const sTexto = "TRANSFERENCIAS GRATUITA MUESTRAS";
            const bEsGratuita = this._isDocGratuitaMuestra(sDocType);

            const aCondiciones = oModelD.getProperty("/oConditionPay") || [];
            const oBind = oCB ? oCB.getBinding("items") : null;

            if (!bEsGratuita) {
                if (oBind) {
                    oBind.filter([]);
                }
                return;
            }

            let oCond0100 = aCondiciones.find(function (oCond) {
                return String(oCond.Conditionn || "").trim() === sCodigo;
            });

            if (!oCond0100) {
                oCond0100 = {
                    Conditionn: sCodigo,
                    DesCondition: sTexto
                };

                aCondiciones.unshift(oCond0100);
                oModelD.setProperty("/oConditionPay", aCondiciones);
            } else if (!oCond0100.DesCondition) {
                oCond0100.DesCondition = sTexto;
                oModelD.setProperty("/oConditionPay", aCondiciones);
            }

            if (oBind) {
                oBind.filter([
                    new Filter("Conditionn", FO.EQ, sCodigo)
                ]);
            }

            oModelP.setProperty("/inputForm/cbCondPago", sCodigo);
            oModelP.setProperty("/inputForm/txtCondPago", oCond0100.DesCondition || sTexto);

            oModelP.updateBindings(true);
            oModelD.updateBindings(true);

            setTimeout(function () {
                if (oCB) {
                    oCB.setSelectedKey(sCodigo);
                    oCB.setValue(oCond0100.DesCondition || sTexto);
                }
            }, 0);
        },

        _getTipoEmbarqueVentasCourier: function () {
            const oModelData = this.getView().getModel("oModelData");
            const aTypeShipment = oModelData ? (oModelData.getProperty("/oTypeShipment") || []) : [];

            const fnNorm = function (v) {
                return String(v || "")
                    .trim()
                    .toUpperCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
            };

            console.log("Buscando Ventas Courier en TypeShipment:", aTypeShipment);

            // Primero busca exactamente Ventas Courier, para no tomar "Muestras Courier".
            const oVentasCourier = aTypeShipment.find(function (oItem) {
                const sText = fnNorm(
                    oItem.sText ||
                    oItem.Text ||
                    oItem.Description ||
                    oItem.Descripcion ||
                    ""
                );

                return sText.indexOf("VENTAS") >= 0 && sText.indexOf("COURIER") >= 0;
            });

            if (oVentasCourier) {
                return {
                    sKey: String(
                        oVentasCourier.sKey ||
                        oVentasCourier.Code ||
                        oVentasCourier.Key ||
                        oVentasCourier.Value ||
                        ""
                    ).trim(),
                    sText: String(
                        oVentasCourier.sText ||
                        oVentasCourier.Text ||
                        oVentasCourier.Description ||
                        "Ventas Courier / BY COURIER"
                    ).trim()
                };
            }

            // Respaldo por código técnico del servicio.
            // Según tu captura: Code "05" = Ventas Courier / BY COURIER.
            const oCourierByCode05 = aTypeShipment.find(function (oItem) {
                return String(
                    oItem.sKey ||
                    oItem.Code ||
                    oItem.Key ||
                    oItem.Value ||
                    ""
                ).trim() === "05";
            });

            if (oCourierByCode05) {
                return {
                    sKey: "05",
                    sText: String(
                        oCourierByCode05.sText ||
                        oCourierByCode05.Text ||
                        oCourierByCode05.Description ||
                        "Ventas Courier / BY COURIER"
                    ).trim()
                };
            }

            return null;
        },

        _normalizePortEmbarkation: function (aRaw) {
            const aData = Array.isArray(aRaw) ? aRaw : [];

            const aResult = aData.map(function (oItem) {
                const sKey = String(
                    oItem.sKey ||
                    oItem.LocNo ||
                    ""
                ).trim();

                const sText = String(
                    oItem.sText ||
                    oItem.Description ||
                    oItem.Text ||
                    oItem.Descripcion ||
                    oItem.Name ||
                    sKey ||
                    ""
                ).trim();

                return Object.assign({}, oItem, {
                    LocNo: oItem.LocNo || sKey,
                    LocId: oItem.LocId || "",
                    Description: oItem.Description || sText,
                    sKey: sKey,
                    sText: sText
                });
            }).filter(function (oItem) {
                return !!oItem.sKey && !!oItem.sText;
            });

            return [{
                LocNo: "",
                LocId: "",
                Description: "",
                sKey: "",
                sText: ""
            }].concat(aResult);
        },

        _applyExternalZPEFCourierRules: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            if (!oModelProyect) {
                return;
            }

            const bExteriorZPEF = this._isClienteExteriorZPEF();
            const sTipDoc = String(
                oModelProyect.getProperty("/inputForm/tipDocument") || ""
            ).trim().toUpperCase();

            const bEsExpo = sTipDoc === "ZPEF";

            oModelProyect.setProperty("/inputForm/bClienteExteriorZPEF", bExteriorZPEF);

            // Visibilidad normal / especial
            oModelProyect.setProperty("/inputForm/showCondEntregaNormal", !bExteriorZPEF);
            oModelProyect.setProperty("/inputForm/showCourierEntrega", bExteriorZPEF);
            oModelProyect.setProperty("/inputForm/showMotivo", !bExteriorZPEF);
            oModelProyect.setProperty("/inputForm/showObsDelivery", !bExteriorZPEF);

            // Exportación
            oModelProyect.setProperty("/inputForm/showExportBultos", bEsExpo && !bExteriorZPEF);
            oModelProyect.setProperty("/inputForm/showExportInstrucciones", bEsExpo && !bExteriorZPEF);
            oModelProyect.setProperty("/inputForm/isTipoEmbarqueEnabled", !bExteriorZPEF);
            oModelProyect.setProperty(
                "/inputForm/labelPuertoEmbarque",
                bExteriorZPEF ? "Puerto de Destino" : "Puerto Embarque"
            );

            if (!bExteriorZPEF) {
                return;
            }

            if (!oModelProyect.getProperty("/inputForm/puertoDestinoInicializado")) {
                const sPuertoActual = String(oModelProyect.getProperty("/inputForm/puertoEmbarque") || "").trim();
                const sPuertoTextoActual = String(oModelProyect.getProperty("/inputForm/puertoEmbarqueText") || "").trim();

                if (!sPuertoActual && !sPuertoTextoActual) {
                    oModelProyect.setProperty("/inputForm/puertoEmbarque", "");
                    oModelProyect.setProperty("/inputForm/puertoEmbarqueText", "");
                }

                oModelProyect.setProperty("/inputForm/puertoDestinoInicializado", true);
            }

            // Condición de pago exterior ZPEF
            this._ensureCondPagoOption("4000", "Contado a la Fecha de Embarque");

            oModelProyect.setProperty("/inputForm/cbCondPago", "4000");
            oModelProyect.setProperty("/inputForm/txtCondPago", "Contado a la Fecha de Embarque");

            // Condición de entrega Courier
            oModelProyect.setProperty("/inputForm/tipoEntrega", "10");
            oModelProyect.setProperty("/inputForm/resumenEntrega", "Courier");
            oModelProyect.setProperty("/inputForm/courier", "10");
            oModelProyect.setProperty("/inputForm/courierText", "Courier");

            // Se limpia agencia porque Courier reemplaza las 3 opciones normales
            oModelProyect.setProperty("/inputForm/direccionAgencia", "");
            oModelProyect.setProperty("/inputForm/direccionAgenciaText", "");

            // Motivo oculto, pero enviado internamente
            oModelProyect.setProperty("/inputForm/reasonOrd", "Z00");
            oModelProyect.setProperty("/inputForm/txtReasonOrd", "Z00");

            // Campos que no deben mostrarse/enviarse en esta casuística
            oModelProyect.setProperty("/inputForm/obsDelivery", "");
            oModelProyect.setProperty("/inputForm/bultos", "");

            // Tipo de embarque: Ventas Courier
            const oTipoEmbarqueCourier = this._getTipoEmbarqueVentasCourier();

            if (oTipoEmbarqueCourier && oTipoEmbarqueCourier.sKey) {
                oModelProyect.setProperty("/inputForm/tipoEmbarque", String(oTipoEmbarqueCourier.sKey).trim());
                oModelProyect.setProperty("/inputForm/tipoEmbarqueText", oTipoEmbarqueCourier.sText || "Ventas Courier / BY COURIER");

                console.log("Tipo de embarque aplicado para exterior ZPEF:", {
                    key: oTipoEmbarqueCourier.sKey,
                    text: oTipoEmbarqueCourier.sText
                });
            } else {
                // Fallback controlado según catálogo visto en Network:
                // Code "05" = Ventas Courier / BY COURIER.
                oModelProyect.setProperty("/inputForm/tipoEmbarque", "05");
                oModelProyect.setProperty("/inputForm/tipoEmbarqueText", "Ventas Courier / BY COURIER");

                console.warn("No se encontró Ventas Courier por texto, se aplicó fallback Code 05.");
            }

            oModelProyect.refresh(true);
        },

        _getFirstById: function (aIds) {
            for (let i = 0; i < aIds.length; i++) {
                const sId = aIds[i];
                const oCtrl = this.byId(sId) || sap.ui.getCore().byId(sId);
                if (oCtrl) return oCtrl;
            }
            return null;
        },
        _updateResumenEntrega: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oFiltros = oModel.getProperty("/inputForm") || {};

            const sTipo = (oFiltros.tipoEntrega || "").trim();
            let sResumen = "";
            const aDetalle = [];

            // Cliente exterior + ZPEF: la entrega siempre es Courier
            if (oFiltros.bClienteExteriorZPEF || this._isClienteExteriorZPEF()) {
                const oComboDestino = this._getFirstById([
                    "DestinationTextandTextiles",
                    "DestinationTextandCeramicos",
                    "DestinationTextandCeramicosDetail",
                    "DestinationText"
                ]);

                const oItemDestino = oComboDestino?.getSelectedItem ? oComboDestino.getSelectedItem() : null;

                const sDestinoText = (
                    oItemDestino?.getText?.() ||
                    oFiltros.destinoTextilText ||
                    oFiltros.destinoCeramicoText ||
                    ""
                ).trim();

                if (sDestinoText) {
                    aDetalle.push(sDestinoText);
                    oModel.setProperty("/inputForm/destinoTextilText", sDestinoText);
                    oModel.setProperty("/inputForm/destinoCeramicoText", sDestinoText);
                }

                oModel.setProperty("/inputForm/tipoEntrega", "10");
                oModel.setProperty("/inputForm/resumenEntrega", "Courier");
                oModel.setProperty("/inputForm/courier", "10");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/detalleEntrega", aDetalle.join(" | "));
                oModel.refresh(true);
                return;
            }

            if (sTipo === "1") sResumen = "Cliente recoge";
            if (sTipo === "2") sResumen = "Despacho directo";
            if (sTipo === "3") sResumen = "Despacho agencia";

            if (sTipo === "2") {
                const sTrans = (oFiltros.transporte || "").trim();
                if (sTrans) aDetalle.push(sTrans);
            }

            const oComboDestino = this._getFirstById([
                "DestinationTextandTextiles",
                "DestinationTextandCeramicos",
                "DestinationTextandCeramicosDetail",
                "DestinationText"
            ]);

            const oItemDestino = oComboDestino?.getSelectedItem ? oComboDestino.getSelectedItem() : null;
            const sDestinoText = (
                oItemDestino?.getText?.() ||
                oFiltros.destinoTextilText ||
                oFiltros.destinoCeramicoText ||
                ""
            ).trim();

            if (sDestinoText) {
                aDetalle.push(sDestinoText);
                oModel.setProperty("/inputForm/destinoTextilText", sDestinoText);
                oModel.setProperty("/inputForm/destinoCeramicoText", sDestinoText);
            } else {
                oModel.setProperty("/inputForm/destinoTextilText", "");
                oModel.setProperty("/inputForm/destinoCeramicoText", "");
            }

            const oComboAgencia = this._getFirstById(["comboAgenciaForm", "comboAgencia"]);
            const oItemAgencia = oComboAgencia?.getSelectedItem ? oComboAgencia.getSelectedItem() : null;
            const sAgenciaNombre = (oItemAgencia?.getAdditionalText?.() || oFiltros.direccionAgenciaText || "").trim();

            oModel.setProperty("/inputForm/direccionAgenciaText", (sTipo === "3") ? sAgenciaNombre : "");
            oModel.setProperty("/inputForm/resumenEntrega", sResumen);
            oModel.setProperty("/inputForm/detalleEntrega", aDetalle.join(" | "));

            oModel.refresh(true);
        },
        _getSelectedSellerPrincipalForDetail: function () {
            const oModel = this.getView().getModel("oModelProyect");

            const sKeyModel = oModel.getProperty("/inputForm/sellerPrincipalKunn2") || "";
            const sNameModel = oModel.getProperty("/inputForm/sellerPrincipalName") || "";

            let sKey = String(sKeyModel || "").trim();
            let sName = String(sNameModel || "").trim();

            const oSelect = this.byId("selectSellerPrincipal");

            if (oSelect) {
                const oSelectedItem = oSelect.getSelectedItem();

                if (oSelectedItem) {
                    const oCtx = oSelectedItem.getBindingContext("oModelProyect");
                    const oObj = oCtx ? oCtx.getObject() : {};

                    sKey = String(oSelectedItem.getKey() || oObj.kunn2 || sKey || "").trim();

                    sName = String(
                        oObj.Seller ||
                        oSelectedItem.getText().replace(sKey + " - ", "") ||
                        sName ||
                        ""
                    ).trim();
                }
            }

            return {
                kunn2: sKey,
                Seller: sName
            };
        },


        _onPressMaterialDetail: function () {
            if (!this._validateRequiredFields()) {
                return;
            }

            this._updateResumenEntrega();

            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                sap.m.MessageToast.show("No existe oModelProyect en la vista");
                return;
            }

            const sToday = new Date().toISOString().split("T")[0];
            oModel.setProperty("/fechaActual", sToday);

            let sCustomer =
                oModel.getProperty("/oDatClient/Customer") ||
                oModel.getProperty("/oClientData/Customer") ||
                oModel.getProperty("/oClienteSeleccionado/Customer") ||
                "";

            if (!sCustomer) {
                const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
                const aParts = (sHash || "").split("/");
                sCustomer = aParts.length > 1 ? aParts[1] : "";
            }

            if (!sCustomer) {
                sap.m.MessageToast.show("No se encontró Customer para continuar");
                return;
            }

            this._showBusy("Cargando materiales, por favor espera...");

            setTimeout(() => {
                const oSellerPrincipal = this._getSelectedSellerPrincipalForDetail();

                if (oSellerPrincipal.kunn2 || oSellerPrincipal.Seller) {
                    oModel.setProperty("/oSellerPrincipalSelected", {
                        kunn2: oSellerPrincipal.kunn2 || "",
                        Seller: oSellerPrincipal.Seller || ""
                    });

                    oModel.setProperty("/inputForm/sellerPrincipalKunn2", oSellerPrincipal.kunn2 || "");
                    oModel.setProperty("/inputForm/sellerPrincipalName", oSellerPrincipal.Seller || "");

                    oModel.setProperty("/oClientData/kunn2", oSellerPrincipal.kunn2 || "");
                    oModel.setProperty("/oClientData/Seller", oSellerPrincipal.Seller || "");
                }

                this._syncPuertoEmbarqueFromControl(false);

                const oDataToDetail = {
                    Customer: sCustomer,
                    sellerPrincipalKunn2: oSellerPrincipal.kunn2 || "",
                    sellerPrincipalName: oSellerPrincipal.Seller || "",
                    oSellerPrincipalSelected: {
                        kunn2: oSellerPrincipal.kunn2 || "",
                        Seller: oSellerPrincipal.Seller || ""
                    },
                    oClientData: oModel.getProperty("/oClientData") || {},
                    inputForm: oModel.getProperty("/inputForm") || {}
                };

                sessionStorage.setItem(
                    "REGPED_TEXTILES_FORMCLIENT_TO_DETAIL",
                    JSON.stringify(oDataToDetail)
                );

                console.log("FORMCLIENT -> Seller enviado a Detail:", oDataToDetail);

                this._hideBusy();
                this.getRouter().navTo("Detail", { app: sCustomer });
            }, 1200);
        },
        _onPressNavButtonForm: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (oModel) {
                oModel.setData(models.createModelProyect());
                oModel.refresh(true);
            }

            this.getRouter().navTo("Main", {}, true);
        },
        onSelectRadioComprobante: function (oEvent) {
            if (!oEvent.getParameter("selected")) return;

            const oModelCheck = this.getView().getModel("oModelProyect");
            const oInputCheck = oModelCheck.getProperty("/inputForm") || {};

            if (oInputCheck.bClienteExteriorZPEF || this._isClienteExteriorZPEF()) {
                oModelCheck.setProperty("/inputForm/tipoEntrega", "10");
                oModelCheck.setProperty("/inputForm/resumenEntrega", "Courier");
                oModelCheck.setProperty("/inputForm/courier", "10");
                oModelCheck.setProperty("/inputForm/direccionAgencia", "");
                oModelCheck.setProperty("/inputForm/direccionAgenciaText", "");
                return;
            }

            const oSource = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");
            let sValor = "";
            let sDescripcion = "";
            let sDetalle = [];
            switch (oSource.getText()) {
                case this.getResourceBundle().getText("txtClientCollet"):
                    sValor = "1";
                    sDescripcion = "Cliente recoge";
                    break;
                case this.getResourceBundle().getText("txtDirectDispatch"):
                    sValor = "2";
                    sDescripcion = "Despacho directo"
                    const sTrans = oModel.getProperty("/inputForm/transporte") || "";
                    if (sTrans) sDetalle.push(sTrans);
                    break;
                case this.getResourceBundle().getText("txtDispatchAgency"):
                    sValor = "3";
                    sDescripcion = "Despacho agencia";
                    const oComboAgencia = this.byId("comboAgenciaForm");
                    const oItemAgencia = oComboAgencia ? oComboAgencia.getSelectedItem() : null;
                    if (oItemAgencia) {
                        sDetalle.push(oItemAgencia.getAdditionalText());
                        oModel.setProperty("/inputForm/direccionAgenciaText", oItemAgencia.getAdditionalText());
                    } else {
                        oModel.setProperty("/inputForm/direccionAgenciaText", "");
                    }
                    break;
            }
            const oComboDestino = this.byId("DestinationTextandCeramicos");
            const oItemDestino = oComboDestino ? oComboDestino.getSelectedItem() : null;
            if (oItemDestino) {
                sDetalle.push(oItemDestino.getText());
            }
            oModel.setProperty("/inputForm/tipoEntrega", sValor);
            oModel.setProperty("/inputForm/resumenEntrega", sDescripcion);
            oModel.setProperty("/inputForm/detalleEntrega", sDetalle.join(" | "));
            if (sValor !== "2") {
                oModel.setProperty("/inputForm/transporte", "");
            }
        },
        _updateFormState: function () {
            let oModel = this.getView().getModel("oModelProyect");
            let sTipoDoc = oModel.getProperty("/inputForm/tipDocument");
            let sGrupoMaterial = oModel.getProperty("/inputForm/grupoMaterial");
            let sMoneda = "USD";

            const aPedidosNacionales = ["ZPES"];
            const aMaterialesPEN = ["03", "05"];

            if (aPedidosNacionales.includes(sTipoDoc) && aMaterialesPEN.includes(sGrupoMaterial)) {
                sMoneda = "PEN";
            }

            const bEsSeparacion = sTipoDoc === "ZPSE";

            oModel.setProperty("/inputForm/moneda", sMoneda);

            const bEsExpo = sTipoDoc === "ZPEF";

            if (bEsExpo) {
                oModel.setProperty("/inputForm/grupoMaterial", "01");
                oModel.setProperty("/inputForm/grupoMaterialText", "01 - Lanas");
            }

            oModel.setProperty("/inputForm/isMaterialEnabled", sTipoDoc !== "ZPEE" && !bEsExpo);
            oModel.setProperty("/inputForm/PedExport", bEsExpo);

            oModel.setProperty(
                "/inputForm/showSeparationDates",
                sTipoDoc === "ZPSE" || sTipoDoc === "ZCNA" || sTipoDoc === "ZACN"
            );

            oModel.setProperty("/inputForm/showCondPago", !bEsSeparacion);

            if (bEsSeparacion) {
                oModel.setProperty("/inputForm/cbCondPago", "");
                oModel.setProperty("/inputForm/txtCondPago", "");
            }

            const oHoy = new Date();
            const sHoy = String(oHoy.getDate()).padStart(2, "0") + "/" +
                String(oHoy.getMonth() + 1).padStart(2, "0") + "/" +
                oHoy.getFullYear();

            oModel.setProperty("/inputForm/fechInicio", sHoy);

            if (typeof this._applyExternalZPEFCourierRules === "function") {
                this._applyExternalZPEFCourierRules();
            }
        },
        _handleSelectChange: function (oEvent, sKeyPath, sTextPath) {
            const oItem = oEvent.getParameter("selectedItem");
            const sKey = oItem && oItem.getKey();
            const sText = oItem && oItem.getText();

            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty(sKeyPath, sKey);
            oModel.setProperty(sTextPath, sText);
        },
        _updateBtnPedidoReferenciaVisibility: function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelUser = oView.getModel("oModelUser");
            if (!oModelProyect || !oModelUser) { return; }

            const sTipDocument = oModelProyect.getProperty("/inputForm/tipDocument") || "";
            const bIsVendedor = !!oModelUser.getProperty("/bIsVendedor");
            const bIsCoord = !!oModelUser.getProperty("/bIsCoord");

            const bVisible = (sTipDocument === "ZPES" && (bIsVendedor || bIsCoord));

            oModelProyect.setProperty("/bShowBtnPedidoRef", bVisible);
        },
        onTipDocumentChange: function (oEvent) {
            const oCombo = oEvent.getSource();
            const oItem = oEvent.getParameter("selectedItem");
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelData = oView.getModel("oModelData");
            if (!oItem) {
                oModelProyect.setProperty("/inputForm/tipDocument", "");
                oModelProyect.setProperty("/inputForm/txtTipDocument", "");
                oModelProyect.setProperty("/isFormEnabled", false);
                oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", true);
                oModelData.setProperty("/oReason", []);
                this._updateFormState();
                this._updateBtnPedidoReferenciaVisibility();
                return;
            }
            const sKey = oItem.getKey();
            const sText = oItem.getText();
            const bEnabled = oModelProyect.getProperty("/inputForm/isTipDocumentEnabled");
            if (bEnabled === false) {
                const sCurrentKey = oModelProyect.getProperty("/inputForm/tipDocument") || "";
                oCombo.setSelectedKey(sCurrentKey);
                sap.m.MessageToast.show("El tipo de documento ya fue confirmado y no puede modificarse.");
                return;
            }
            const sMsg = `¿Desea generar el documento de tipo ${sText}?`;
            sap.m.MessageBox.confirm(sMsg, {
                actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                onClose: function (sAction) {
                    if (sAction === sap.m.MessageBox.Action.OK) {
                        oModelProyect.setProperty("/inputForm/tipDocument", sKey);
                        oModelProyect.setProperty("/inputForm/txtTipDocument", sText);
                        oModelProyect.setProperty("/isFormEnabled", !!sKey);
                        oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", false);
                        oModelProyect.setProperty("/inputForm/reasonOrd", "");
                        oModelProyect.setProperty("/inputForm/txtReasonOrd", "");
                        oModelProyect.setProperty("/inputForm/tipoReferencia", "");
                        oModelProyect.setProperty("/inputForm/docRefSeleccionado", null);
                        oModelProyect.setProperty("/inputForm/posRefSeleccionadas", []);
                        this._updateFormState();
                        this._applyCondPagoForDocType(sKey);
                        this._updateBtnPedidoReferenciaVisibility();
                        if (sKey) {
                            sap.ui.core.BusyIndicator.show(0);
                            this._getReason(sKey)
                                .then(function (oResp) {
                                    if (oResp && oResp.sEstado === "S") {
                                        oModelData.setProperty("/oReason", oResp.oResults || []);
                                    } else {
                                        oModelData.setProperty("/oReason", []);
                                    }
                                }.bind(this))
                                .catch(function () {
                                    oModelData.setProperty("/oReason", []);
                                })
                                .finally(function () {
                                    sap.ui.core.BusyIndicator.hide(0);
                                });
                        } else {
                            oModelData.setProperty("/oReason", []);
                        }
                    } else {
                        oCombo.setSelectedKey("");
                        oModelProyect.setProperty("/inputForm/tipDocument", "");
                        oModelProyect.setProperty("/inputForm/txtTipDocument", "");
                        oModelProyect.setProperty("/isFormEnabled", false);
                        oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", true);
                        oModelData.setProperty("/oReason", []);
                        this._updateFormState();
                        this._applyCondPagoForDocType("");
                        this._updateBtnPedidoReferenciaVisibility();
                    }
                }.bind(this)
            });
        },
        onReasonOrdChange: function (oEvent) {
            this._handleSelectChange(
                oEvent,
                "/inputForm/reasonOrd",
                "/inputForm/txtReasonOrd"
            );
        },
        onGrupoMaterialChange: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;
            const sKey = oSelectedItem.getKey();
            const sText = oSelectedItem.getText();
            oModel.setProperty("/inputForm/grupoMaterial", sKey);
            oModel.setProperty("/inputForm/grupoMaterialText", sText);
            this._updateFormState();
        },
        onSelectCondPago: function (oEvent) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sKey = oSelectedItem.getKey();   // "0103"
                const sText = oSelectedItem.getText(); // "PAGO CONTRA ENTREGA - CONTADO"
                oModelProyect.setProperty("/inputForm/cbCondPago", sKey);
                oModelProyect.setProperty("/inputForm/txtCondPago", sText);
            }
        },
        _validateRequiredFields: function () {
            let oModel = this.getView().getModel("oModelProyect");
            let oData = oModel.getProperty("/inputForm") || {};
            let aErrors = [];

            const bExteriorZPEF = !!oData.bClienteExteriorZPEF || this._isClienteExteriorZPEF();

            // Refuerzo antes de validar
            if (bExteriorZPEF) {
                oData.bClienteExteriorZPEF = true;

                oData.cbCondPago = "4000";
                oData.txtCondPago = "Contado a la Fecha de Embarque";

                oData.tipoEntrega = "10";
                oData.resumenEntrega = "Courier";
                oData.courier = "10";
                oData.courierText = "Courier";

                oData.reasonOrd = "Z00";
                oData.txtReasonOrd = "Z00";

                oData.obsDelivery = "";
                oData.bultos = "";
            }

            if (!oData.tipDocument) {
                aErrors.push("Debe seleccionar el tipo de documento");
            }

            let sCondPago = oData.cbCondPago;
            const bEsSeparacion = oData.tipDocument === "ZPSE";

            if (this._isDocGratuitaMuestra(oData.tipDocument)) {
                oData.cbCondPago = "0100";
                oData.txtCondPago = "TRANSFERENCIAS GRATUITA MUESTRAS";
                sCondPago = "0100";
            }

            if (!bEsSeparacion) {
                if (!sCondPago || String(sCondPago).trim() === "") {
                    sCondPago = oModel.getProperty("/oClientData/vtext");
                    oData.cbCondPago = sCondPago;
                }

                if (!sCondPago || String(sCondPago).trim() === "") {
                    aErrors.push("Debe ingresar la condición de pago");
                }
            } else {
                oData.cbCondPago = "";
                oData.txtCondPago = "";
            }

            if (!oData.tipoEntrega) {
                aErrors.push("Debe seleccionar una condición de entrega");
            }

            if (!bExteriorZPEF && !oData.reasonOrd) {
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
        handleFileChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var aFiles = oFileUploader.oFileUpload.files;
            var oMultiInput = this.byId("fileTokenInput");

            Array.from(aFiles).forEach(file => {
                var oToken = new sap.m.Token({
                    text: file.name,
                    key: file.name
                });

                oToken.data("fileObj", file);
                oMultiInput.addToken(oToken);
            });

            oFileUploader.clear();
        },
        onUploadAllFiles: async function () {
            const oMultiInput = this.byId("fileTokenInput");
            const tokens = oMultiInput.getTokens();
            const oPI = this.byId("piUpload");

            if (!tokens.length) {
                MessageToast.show("No hay archivos seleccionados.");
                return;
            }

            for (const tk of tokens) {

                const file = tk.data("fileObj");

                oPI.setVisible(true);
                oPI.setPercentValue(0);
                oPI.setDisplayValue("0%");

                const resp = await this._uploadSharepoint(
                    file,
                    (percent) => {
                        oPI.setPercentValue(percent);
                        oPI.setDisplayValue(percent + "%");
                    }
                );

                if (resp.sEstado === "S" && resp.oResults && resp.oResults.id) {
                    MessageToast.show(`✅ ${file.name} subido correctamente`);

                    console.log("📎 URL SharePoint:", resp.oResults.webUrl);
                    oMultiInput.removeToken(tk);
                } else {
                    console.error("❌ Error al subir:", resp.oResults);
                    MessageToast.show(`❌ Error subiendo ${file.name} (sin metadata)`);
                }
            }

            oPI.setVisible(false);
        },
        handleTokenUpdate: function (oEvent) {
            console.log("Token actualizado:", oEvent.getParameters());
        },

        //ODatas para Con Referencia

        _getClienteReferencia: function () {
            that = this;
            try {
                var oResp = {
                    sEstado: "E",
                    oResults: []
                };
                return new Promise(function (resolve, reject) {
                    let sUrl = "";

                    if (that.local) {
                        const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/SepCli?$format=json";
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/SepCli?$format=json";
                        sUrl = sPath;
                    }
                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData, message) {
                                oResp.sEstado = "S";
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
                                const aMap = aRaw.map(function (row) {
                                    const sCodigo =
                                        row.Cliente ||
                                        row.Customer ||
                                        row.Custormer ||
                                        row.Kunnr ||
                                        "";
                                    const sNombre =
                                        row.Nombre ||
                                        row.Name1 ||
                                        row.FullName ||
                                        row.CustomerFullName ||
                                        "";
                                    const sDisplay = (sCodigo && sNombre)
                                        ? (sCodigo + " - " + sNombre)
                                        : (sCodigo || sNombre);
                                    return Object.assign({}, row, {
                                        Cliente: sCodigo,
                                        Nombre: sNombre,
                                        Display: sDisplay
                                    });
                                });

                                console.log("📌 Clientes referencia mapeados:", aMap);

                                oResp.oResults = aMap;
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
        _getDocRefPendiente: function (sCustomer, sSalesDocType) {
            that = this;
            try {
                var oResp = {
                    sEstado: "E",
                    oResults: []
                };
                return new Promise(function (resolve) {
                    const oModelProyect = that.getView().getModel("oModelProyect");
                    let sSalesOrg = "";
                    if (oModelProyect) {
                        sSalesOrg = oModelProyect.getProperty("/oDatClient/SalesOrganization") || "";
                    }
                    if (!sSalesOrg) {
                        sSalesOrg = "1110";
                    }
                    if (!sSalesDocType && oModelProyect) {
                        sSalesDocType = oModelProyect.getProperty("/inputForm/tipoReferencia") || "";
                    }
                    if (sSalesDocType === "ZPSE" && oModelProyect) {
                        sCustomer =
                            oModelProyect.getProperty("/inputForm/clienteSep") ||
                            oModelProyect.getProperty("/inputForm/clienteSepCod") ||
                            sCustomer || "";
                    }
                    if (!sCustomer && oModelProyect) {
                        sCustomer = oModelProyect.getProperty("/oDatClient/Customer") || "";
                    }
                    if (!sCustomer) {
                        const oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                        const sHash = oRouter && oRouter.getHashChanger().getHash();
                        if (sHash) {
                            const aParts = sHash.split("/");
                            if (aParts.length > 1) {
                                sCustomer = aParts[1];
                            }
                        }
                    }

                    const oToday = new Date();
                    let sTodayOData = "";
                    if (Formatter && typeof Formatter.formatDateToODataNoTZ === "function") {
                        sTodayOData = Formatter.formatDateToODataNoTZ(oToday);
                    } else {
                        const pad = function (n) { return n < 10 ? "0" + n : String(n); };
                        const y = oToday.getFullYear();
                        const m = pad(oToday.getMonth() + 1);
                        const d = pad(oToday.getDate());
                        sTodayOData = y + "-" + m + "-" + d + "T00:00:00";
                    }

                    let sFilter = "$filter=SalesOrganization eq '" + sSalesOrg + "'" +
                        " and Customer eq '" + sCustomer + "'";
                    if (sSalesDocType) {
                        sFilter += " and SalesDocumentType eq '" + sSalesDocType + "'";
                    }
                    if (sSalesDocType === "ZCNA") {
                        sFilter += " and BValidFrom le datetime'" + sTodayOData + "'" +
                            " and BValidTo   ge datetime'" + sTodayOData + "'";
                    } else if (sSalesDocType === "ZACN") {
                        sFilter += " and GValidFrom le datetime'" + sTodayOData + "'" +
                            " and GValidto   ge datetime'" + sTodayOData + "'";
                    }

                    const sBasePath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DoRePe";
                    const sPath = sBasePath + "?" + sFilter + "&$format=json";

                    let sUrl = "";
                    if (that.local) {
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        sUrl = jQuery.sap.getModulePath(that.route) + "/S4HANA" + sPath;
                    }

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                oResp.sEstado = "S";

                                // 🔹 NORMALIZAR SIEMPRE A ARRAY
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

            } catch (oError) {
                that.getMessageBox("error", that.getI18nText("sErrorTry"));
            }
        },
        _getPedConRefItem: function (sSalesDocument) {
            that = this;
            try {
                var oResp = {
                    sEstado: "E",
                    oResults: []
                };

                return new Promise(function (resolve) {

                    if (!sSalesDocument) {
                        oResp.oResults = [];
                        resolve(oResp);
                        return;
                    }

                    // 🔹 Filtro solo por SalesDocument
                    const sFilter = "$filter=SalesDocument eq '" + sSalesDocument + "'";
                    const sBasePath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DoRePeItem";
                    const sPath = sBasePath + "?" + sFilter + "&$format=json";

                    let sUrl = "";
                    if (that.local) {
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        sUrl = jQuery.sap.getModulePath(that.route) + "/S4HANA" + sPath;
                    }

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData /*, message*/) {
                                oResp.sEstado = "S";
                                oResp.oResults = oData.data || [];
                                resolve(oResp);
                            },
                            error: function (/*message*/) {
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

        // Manejo de Dialog Para Referencia 

        // Para Documentos Pendientes 
        onOpenPedidoConReferencia: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const sTipDocument = oModelProyect.getProperty("/inputForm/tipDocument") || "";
            if (sTipDocument !== "ZPES") {
                sap.m.MessageToast.show("El pedido con referencia solo aplica para pedidos ZPES.");
                return;
            }
            oModelProyect.setProperty("/inputForm/tipoReferencia", "");
            oModelProyect.setProperty("/inputForm/docRefSeleccionado", null);
            oModelProyect.setProperty("/inputForm/posRefSeleccionadas", []);
            this._openDlgPedidoReferencia();
        },
        _loadDocumentosPendientes: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oDatClient = oModel.getProperty("/oDatClient") || {};
            const sTipoRef = oModel.getProperty("/inputForm/tipoReferencia") || "";
            let sCustomer = "";
            if (sTipoRef === "ZPSE") {
                sCustomer =
                    oModel.getProperty("/inputForm/clienteSepBusqueda") ||
                    oModel.getProperty("/inputForm/clienteSep") ||
                    "";
            }
            if (!sCustomer) {
                sCustomer = oDatClient.Customer || "";
            }
            const sSalesDocType = sTipoRef;
            sap.ui.core.BusyIndicator.show(0);
            return this._getDocRefPendiente(sCustomer, sSalesDocType)
                .then(oResp => {
                    sap.ui.core.BusyIndicator.hide();

                    const aRaw = oResp.oResults || [];
                    const aMap = aRaw.map(function (row) {
                        return {
                            DocComercial: row.SalesDocument,
                            ClDocum: row.SalesDocumentType + " - " + row.DscType,
                            FechaInicio: Formatter.formatODataDateNoTZ(row.BValidFrom),
                            FechaFin: Formatter.formatODataDateNoTZ(row.BValidTo),
                            PriceDate: row.PriceDate,        // "/Date(...) /"
                            DocumentType: row.DocumentType,    // "B" o "G"
                            SalesDocument: row.SalesDocument,
                            SalesDocumentType: row.SalesDocumentType,
                            _raw: row
                        };
                    });

                    oModel.setProperty("/aDocsPendientesRef", aMap);
                    return aMap;
                })
                .catch(oError => {
                    sap.ui.core.BusyIndicator.hide();
                    oModel.setProperty("/aDocsPendientesRef", []);
                    jQuery.sap.log.error("Error en _loadDocumentosPendientes", oError);
                });
        },

        _loadClientesReferencia: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (this._aClientesReferenciaAll && this._aClientesReferenciaAll.length) {
                return Promise.resolve(this._aClientesReferenciaAll);
            }
            return this._getClienteReferencia().then(oResp => {
                const aClientes = oResp.oResults || [];
                this._aClientesReferenciaAll = aClientes;
                oModel.setProperty("/aClientesReferencia", aClientes);
                return aClientes;
            });
        },
        _loadObsFromPedidoReferencia: function () {
            that = this;
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return Promise.resolve();
            }

            const sTipoRef = oModel.getProperty("/inputForm/tipoReferencia") || "";
            const oDocRef = oModel.getProperty("/inputForm/docRefSeleccionado") || null;

            // Solo aplica cuando es pedido con referencia
            if (!sTipoRef || !oDocRef) {
                return Promise.resolve();
            }

            // SalesDocument puede venir como SalesDocument, DocComercial, o dentro de _raw
            const sSalesDocument =
                oDocRef.SalesDocument ||
                oDocRef.DocComercial ||
                (oDocRef._raw && oDocRef._raw.SalesDocument) ||
                "";

            if (!sSalesDocument) {
                return Promise.resolve();
            }

            return new Promise(function (resolve) {

                // Path OData: /sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/ObserPedSet?$filter=SalesDocument eq '4090003102'&$format=json
                const sBasePath = "/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/ObserPedSet";
                const sQuery = "?$filter=SalesDocument eq '" + sSalesDocument + "'&$format=json";
                const sPath = sBasePath + sQuery;

                let sUrl = "";
                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    // Ajusta el prefijo "/S4HANA" si tu route está configurada distinto
                    sUrl = jQuery.sap.getModulePath(that.route) + "/S4HANA" + sPath;
                }

                sap.ui.core.BusyIndicator.show(0);

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData /* , message */) {
                            sap.ui.core.BusyIndicator.hide(0);

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
                                const sTextId = row.TextId || row.TdId || "";
                                const sItm = row.ItmNumber || row.Itmnumber || row.Posnr || "000000";
                                const sLine = row.TextLine || row.Tdline || row.Texto || "";

                                // Normalmente textos de cabecera vienen en ItmNumber "000000"
                                if (sItm !== "000000") {
                                    return;
                                }
                                if (!sLine) {
                                    return;
                                }

                                if (sTextId === "Z001") {
                                    sObsPedido += (sObsPedido ? "\n" : "") + sLine;
                                } else if (sTextId === "Z003") {
                                    sObsDelivery += (sObsDelivery ? "\n" : "") + sLine;
                                }
                            });

                            // Solo pisamos si tenemos algo
                            if (sObsPedido) {
                                oModel.setProperty("/inputForm/obsPedido", sObsPedido);
                            }
                            if (sObsDelivery) {
                                oModel.setProperty("/inputForm/obsDelivery", sObsDelivery);
                            }

                            resolve();
                        },
                        error: function (/* message */) {
                            sap.ui.core.BusyIndicator.hide(0);
                            console.error("❌ Error al leer observaciones desde ObserPedSet");
                            resolve();
                        }
                    });
                });
            });
        },
        // Para la tabla Final 
        _loadPosicionesDocumento: function (oDocHeader) {
            const oModel = this.getView().getModel("oModelProyect");
            const sSalesDocument =
                oDocHeader.SalesDocument ||
                oDocHeader.DocComercial ||
                (oDocHeader._raw && oDocHeader._raw.SalesDocument);

            if (!sSalesDocument) {
                oModel.setProperty("/aPosDocRef", []);
                return;
            }
            const sTipoRef = oModel.getProperty("/inputForm/tipoReferencia") || "";
            let sDocType =
                oDocHeader.DocumentType ||
                (oDocHeader._raw && oDocHeader._raw.DocumentType) || "";
            if (!sDocType) {
                if (sTipoRef === "ZCNA") {
                    sDocType = "B";
                } else if (sTipoRef === "ZACN" || sTipoRef === "ZPSE") {
                    sDocType = "G";
                }
            }
            this._getPedConRefItem(sSalesDocument).then(oResp => {
                const aRaw = oResp.oResults || [];

                if (aRaw.length) {
                    const oFirstItem = aRaw[0] || {};

                    let sGrupoMaterial = String(
                        oFirstItem.MaterialGroup ||
                        oFirstItem.Materialgroup ||
                        oFirstItem.MaterailGroup ||
                        ""
                    ).trim();

                    const sDescGrupoMaterial = String(
                        oFirstItem.DscMaterialGroup ||
                        oFirstItem.DescriptionMaterialGroup ||
                        oFirstItem.MaterialGroupDesc ||
                        ""
                    ).trim();

                    if (sGrupoMaterial) {
                        if (/^\d+$/.test(sGrupoMaterial)) {
                            sGrupoMaterial = sGrupoMaterial.padStart(2, "0");
                        }

                        const oInputForm = Object.assign({}, oModel.getProperty("/inputForm") || {});

                        oInputForm.grupoMaterial = sGrupoMaterial;
                        oInputForm.grupoMaterialText = sDescGrupoMaterial
                            ? sGrupoMaterial + " - " + sDescGrupoMaterial
                            : sGrupoMaterial;

                        oModel.setProperty("/inputForm", oInputForm);

                        if (typeof this._updateFormState === "function") {
                            this._updateFormState();
                        }

                        oModel.refresh(true);

                        console.log("📌 Grupo de materiales tomado desde primera posición DoRePeItem:", {
                            SalesDocument: sSalesDocument,
                            MaterialGroup: sGrupoMaterial,
                            DscMaterialGroup: sDescGrupoMaterial,
                            FirstItem: oFirstItem
                        });
                    } else {
                        console.warn("⚠️ Primera posición DoRePeItem no trajo MaterialGroup:", oFirstItem);
                    }
                }

                const aPos = aRaw.map(row => {
                    const sPos = row.SalesDocumentItem || "";
                    return {
                        Pos: sPos,                               // Posición referencia
                        Material: row.Material || "",
                        Descripcion: row.SalesDocumentItemText || "",
                        CtdOriginal: row.OrderQuantity || "0.000",
                        CtdPendiente: row.CanPend || "0.000",
                        CtdPedido: "0.000",                            // editable por el usuario
                        UM: row.OrderQuantityUnit || "",
                        RefDoc: sSalesDocument,
                        RefDocIt: sPos,
                        RefDocCa: sDocType
                    };
                });

                oModel.setProperty("/aPosDocRef", aPos);
            });
        },
        onClienteSepSuggest: function (oEvent) {
            const sValue = (oEvent.getParameter("suggestValue") || "").toUpperCase();
            const oModel = this.getView().getModel("oModelProyect");
            this._loadClientesReferencia().then(aAll => {
                if (!sValue) {
                    oModel.setProperty("/aClientesReferencia", aAll);
                    return;
                }
                const aFiltered = aAll.filter(function (row) {
                    const sCod = (row.Cliente || "").toUpperCase();
                    const sNom = (row.Nombre || "").toUpperCase();
                    return sCod.includes(sValue) || sNom.includes(sValue);
                });
                oModel.setProperty("/aClientesReferencia", aFiltered);
            });
        },
        onClienteSepSuggestionItemSelected: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }

            const oCtx = oItem.getBindingContext("oModelProyect");
            const oData = oCtx.getObject();
            const oModel = this.getView().getModel("oModelProyect");

            // 👇 aquí ya guardas SOLO el código
            oModel.setProperty("/inputForm/clienteSep", oData.Cliente);
            oModel.setProperty("/inputForm/clienteSepNombre", oData.Nombre);
            oModel.setProperty(
                "/inputForm/clienteSepDisplay",
                oData.Display || (oData.Cliente + " - " + oData.Nombre)
            );
        },

        _openDlgPedidoReferencia: function () {
            const oView = this.getView();

            if (!this._oDlgPedRef) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.textiles.pe.view.dialogs.DlgPedidoReferencia",
                    controller: this
                }).then(oDialog => {
                    this._oDlgPedRef = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oDlgPedRef.open();
            }
        },
        onPedidoReferenciaYes: function () {
            if (this._oDlgPedRef) {
                this._oDlgPedRef.close();
            }
            this._openDlgTipoReferencia();
        },

        onPedidoReferenciaNo: function () {
            if (this._oDlgPedRef) {
                this._oDlgPedRef.close();
            }
        },
        _openDlgTipoReferencia: function () {
            const oView = this.getView();

            if (!this._oDlgTipoRef) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.textiles.pe.view.dialogs.DlgTipoReferencia",
                    controller: this
                }).then(oDialog => {
                    this._oDlgTipoRef = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oDlgTipoRef.open();
            }
        },
        onTipoReferenciaContinuar: function () {
            const oRBG = this.byId("rbgTipoReferencia");
            const oModel = this.getView().getModel("oModelProyect");

            const oBtnSel = oRBG.getSelectedButton();
            if (!oBtnSel) {
                sap.m.MessageToast.show("Seleccione un tipo de referencia");
                return;
            }
            const sKey = oBtnSel.data("key");
            oModel.setProperty("/inputForm/tipoReferencia", sKey);

            if (this._oDlgTipoRef) {
                this._oDlgTipoRef.close();
            }
            if (sKey === "ZPSE") {
                this._openDlgSeparacionesCliente();
            } else {
                this._loadDocumentosPendientes().then(() => {
                    this._openDlgDocPendientes();
                });
            }
        },
        _openDlgSeparacionesCliente: function () {
            const oView = this.getView();
            if (this._loadClientesReferencia) {
                this._loadClientesReferencia();
            }

            if (!this._oDlgSepCli) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.textiles.pe.view.dialogs.DlgSeparacionesCliente",
                    controller: this
                }).then(oDialog => {
                    this._oDlgSepCli = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oDlgSepCli.open();
            }
        },
        onSepClienteConfirmar: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oInput = this.byId("inpClienteSep");

            // 1️⃣ Intentar tomar SIEMPRE el código puro del modelo
            let sCliente = (oModel.getProperty("/inputForm/clienteSep") || "").trim();

            // 2️⃣ Si aún no hay (por ejemplo, el usuario escribió a mano)
            if (!sCliente) {
                let sValue = (oInput.getValue() || "").trim();

                if (!sValue) {
                    sap.m.MessageToast.show("Ingrese un cliente");
                    return;
                }

                // si viene "1000001201 - CLIENTE X", nos quedamos con "1000001201"
                const iSep = sValue.indexOf("-");
                if (iSep > -1) {
                    sValue = sValue.substring(0, iSep).trim();
                }

                sCliente = sValue;

                // opcional: sincronizar también /clienteSep
                oModel.setProperty("/inputForm/clienteSep", sCliente);
            }

            // 3️⃣ Guardamos SOLO el código para búsqueda
            oModel.setProperty("/inputForm/clienteSepBusqueda", sCliente);

            if (this._oDlgSepCli) {
                this._oDlgSepCli.close();
            }

            // 4️⃣ Cargar pendientes y abrir diálogo
            this._loadDocumentosPendientes().then(() => {
                this._openDlgDocPendientes();
            });
        },
        _openDlgDocPendientes: function () {
            const oView = this.getView();
            if (!this._oDlgDocPend) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.textiles.pe.view.dialogs.DlgDocumentosPendientes",
                    controller: this
                }).then(oDialog => {
                    this._oDlgDocPend = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oDlgDocPend.open();
            }
        },

        _applyMotivoFromDoRePeReferencia: function (oDocRef) {
            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            if (!oModel || !oDocRef) {
                return;
            }

            const oRaw = oDocRef._raw || oDocRef;

            const sCodMotivo = String(
                oRaw.CodMotivoPedido ||
                oRaw.CODMOTIVOPEDIDO ||
                oRaw.CodMotivo ||
                oRaw.CodigoMotivoPedido ||
                oRaw.MotivoPedido ||
                ""
            ).trim();

            if (!sCodMotivo) {
                console.warn("⚠️ DoRePe no trajo CodMotivoPedido para el documento de referencia:", oRaw);
                return;
            }

            const aReason = oModelData ? (oModelData.getProperty("/oReason") || []) : [];

            const oReason = aReason.find(function (item) {
                return String(
                    item.ReasonRequest ||
                    item.OrdReason ||
                    item.OrderReason ||
                    item.CodMotivoPedido ||
                    ""
                ).trim() === sCodMotivo;
            });

            const sDescripcion = oReason
                ? String(
                    oReason.Description ||
                    oReason.DescriptionReason ||
                    oReason.OrderReasonText ||
                    ""
                ).trim()
                : "";

            const sTextoMotivo = sDescripcion
                ? sCodMotivo + " - " + sDescripcion
                : sCodMotivo;

            oModel.setProperty("/inputForm/reasonOrd", sCodMotivo);
            oModel.setProperty("/inputForm/txtReasonOrd", sTextoMotivo);

            console.log("📌 Motivo pedido tomado desde DoRePe:", {
                SalesDocument: oRaw.SalesDocument || oDocRef.DocComercial,
                CodMotivoPedido: sCodMotivo,
                txtReasonOrd: sTextoMotivo
            });
        },

        _applyCabeceraFromDoRePeReferencia: function (oDocRef) {
            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            if (!oModel || !oDocRef) {
                return;
            }

            const oRaw = oDocRef._raw || oDocRef;
            const oInputForm = Object.assign({}, oModel.getProperty("/inputForm") || {});

            const fnNorm = function (v) {
                return String(v || "")
                    .trim()
                    .toUpperCase()
                    .replace(/\s+/g, " ");
            };

            const fnGet = function () {
                const aKeys = Array.prototype.slice.call(arguments);

                for (let i = 0; i < aKeys.length; i++) {
                    const sKey = aKeys[i];

                    if (oRaw[sKey] !== undefined && oRaw[sKey] !== null && String(oRaw[sKey]).trim() !== "") {
                        return String(oRaw[sKey]).trim();
                    }

                    const sKeyUpper = String(sKey).toUpperCase();
                    const sRealKey = Object.keys(oRaw).find(function (k) {
                        return String(k).toUpperCase() === sKeyUpper;
                    });

                    if (sRealKey && oRaw[sRealKey] !== undefined && oRaw[sRealKey] !== null && String(oRaw[sRealKey]).trim() !== "") {
                        return String(oRaw[sRealKey]).trim();
                    }
                }

                return "";
            };

            const fnOnlyCode = function (v) {
                return String(v || "")
                    .trim()
                    .split("-")[0]
                    .trim();
            };

            const fnFindCatalogItem = function (aList, sValue, aKeyFields) {
                const sTarget = fnNorm(fnOnlyCode(sValue));

                return (aList || []).find(function (item) {
                    return aKeyFields.some(function (sField) {
                        return fnNorm(fnOnlyCode(item[sField])) === sTarget;
                    });
                }) || null;
            };

            const fnGetTextFromItem = function (oItem, aTextFields) {
                if (!oItem) {
                    return "";
                }

                for (let i = 0; i < aTextFields.length; i++) {
                    const v = oItem[aTextFields[i]];
                    if (v !== undefined && v !== null && String(v).trim() !== "") {
                        return String(v).trim();
                    }
                }

                return "";
            };

            /*
             * 1) Motivo del pedido
             * Campo esperado desde DoRePe: CodMotivoPedido
             */
            const sCodMotivo = fnOnlyCode(fnGet(
                "CodMotivoPedido",
                "CODMOTIVOPEDIDO",
                "CodMotivo",
                "CodigoMotivoPedido",
                "MotivoPedido",
                "ReasonRequest",
                "OrderReason",
                "OrdReason"
            ));

            if (sCodMotivo) {
                const aReason = oModelData ? (oModelData.getProperty("/oReason") || []) : [];

                const oReason = fnFindCatalogItem(
                    aReason,
                    sCodMotivo,
                    [
                        "ReasonRequest",
                        "OrdReason",
                        "OrderReason",
                        "CodMotivoPedido",
                        "CodMotivo"
                    ]
                );

                const sReasonDesc = fnGetTextFromItem(
                    oReason,
                    [
                        "Description",
                        "ReasonDescription",
                        "DescriptionReason",
                        "OrderReasonText",
                        "DescMotivoPedido",
                        "DescripcionMotivoPedido",
                        "DscMotivoPedido"
                    ]
                );

                oInputForm.reasonOrd = sCodMotivo;
                oInputForm.txtReasonOrd = sReasonDesc
                    ? sCodMotivo + " - " + sReasonDesc
                    : sCodMotivo;
            }

            /*
             * 2) Grupo de materiales
             * En Textil puede venir como MaterialGroup o MatlGroup.
             */
            let sGrupoMaterial = fnOnlyCode(fnGet(
                "MaterialGroup",
                "Materialgroup",
                "MaterailGroup",
                "MatlGroup",
                "MATL_GROUP",
                "GrupoMaterial",
                "GrupoMateriales",
                "MatGroup",
                "MATKL",
                "Matkl"
            ));

            if (sGrupoMaterial) {
                if (/^\d+$/.test(sGrupoMaterial)) {
                    sGrupoMaterial = sGrupoMaterial.padStart(2, "0");
                }

                const aMatGroups = oModelData
                    ? (
                        oModelData.getProperty("/oTipMaterialData") ||
                        oModelData.getProperty("/oTipMaterialDataAll") ||
                        []
                    )
                    : [];

                const oGrupo = fnFindCatalogItem(
                    aMatGroups,
                    sGrupoMaterial,
                    [
                        "MaterailGroup",
                        "MaterialGroup",
                        "MatlGroup",
                        "MatGroup",
                        "MATKL",
                        "GrupoMaterial"
                    ]
                );

                const sGrupoDesc = fnGetTextFromItem(
                    oGrupo,
                    [
                        "Description",
                        "Descripcion",
                        "Text",
                        "MaterialGroupText",
                        "MaterialGroupDesc",
                        "DscMaterialGroup"
                    ]
                );

                oInputForm.grupoMaterial = sGrupoMaterial;
                oInputForm.grupoMaterialText = sGrupoDesc
                    ? sGrupoMaterial + " - " + sGrupoDesc
                    : sGrupoMaterial;
            }

            /*
             * 3) Condición de entrega / destino / agencia
             *
             * Regla usada:
             * DeliveryCondition = 02 => Cliente recoge
             * DeliveryCondition = 01 y ShippingDestination != FinalDestination => Despacho agencia
             * DeliveryCondition = 01 y ShippingDestination = FinalDestination => Despacho directo
             */
            const sDeliveryCondition = fnOnlyCode(fnGet(
                "DeliveryCondition",
                "DELIVERYCONDITION",
                "ShipCond",
                "ShippingCondition",
                "ShippingConditionCode",
                "VSBED"
            ));

            const sShippingDestination = fnOnlyCode(fnGet(
                "ShippingDestination",
                "SHIPPINGDESTINATION",
                "Shippingdestinationid",
                "ShippingDestinationId",
                "ShipToParty",
                "WE",
                "PartnerWE",
                "PartnNumberWE"
            ));

            const sShippingDestinationName = fnGet(
                "ShippingDestinationName",
                "Shippingname",
                "ShippingDestinationText",
                "ShipToPartyName",
                "WEName"
            );

            const sFinalDestination = fnOnlyCode(fnGet(
                "FinalDestination",
                "FINALDESTINATION",
                "Finaldestinationid",
                "FinalDestinationId",
                "Destinationid",
                "DestinationId",
                "Z0",
                "PartnerZ0",
                "PartnNumberZ0"
            ));

            const sFinalDestinationName = fnGet(
                "FinalDestinationName",
                "Finaldestinationname",
                "FinalDestinationText",
                "DestinationName",
                "Z0Name"
            );

            const sCustomer = fnOnlyCode(fnGet(
                "Customer",
                "SoldToParty",
                "Cliente",
                "Kunnr",
                "ClientId"
            ));

            const sCodigoShipTo = sShippingDestination;
            const sCodigoFinal = sFinalDestination || sShippingDestination || sCustomer;

            let sTipoEntrega = "";
            let bMostrarAgencia = false;

            if (sDeliveryCondition === "02") {
                sTipoEntrega = "1";
                bMostrarAgencia = false;
            } else if (sDeliveryCondition === "01") {
                if (sCodigoShipTo && sCodigoFinal && sCodigoShipTo !== sCodigoFinal) {
                    sTipoEntrega = "3";
                    bMostrarAgencia = true;
                } else {
                    sTipoEntrega = "2";
                    bMostrarAgencia = false;
                }
            } else if (sCodigoShipTo && sCodigoFinal && sCodigoShipTo !== sCodigoFinal) {
                sTipoEntrega = "3";
                bMostrarAgencia = true;
            }

            if (sCodigoFinal) {
                let aDestinos = oModel.getProperty("/oDestinosCliente") || [];

                let oDestino = aDestinos.find(function (item) {
                    return fnNorm(item.Destinationid) === fnNorm(sCodigoFinal) ||
                        fnNorm(item.Customer) === fnNorm(sCodigoFinal) ||
                        fnNorm(item.Destination) === fnNorm(sCodigoFinal) ||
                        fnNorm(item.Finaldestination) === fnNorm(sCodigoFinal);
                });

                if (!oDestino) {
                    oDestino = {
                        Destinationid: sCodigoFinal,
                        Destination: sFinalDestinationName || sCodigoFinal,
                        Destinationname: sFinalDestinationName || sCodigoFinal,
                        Customer: sCustomer,
                        Source: "DOREPE"
                    };

                    aDestinos = [oDestino].concat(aDestinos);
                    oModel.setProperty("/oDestinosCliente", aDestinos);
                }

                oInputForm.destinoTextil = oDestino.Destinationid || sCodigoFinal;
                oInputForm.destinoTextilText = oDestino.Destination || oDestino.Destinationname || sFinalDestinationName || sCodigoFinal;

                /*
                 * Algunas funciones del formulario aún leen destinoCeramicoText.
                 * Se llena también para evitar que el resumen quede vacío.
                 */
                oInputForm.destinoCeramicoText = oInputForm.destinoTextilText;
                oInputForm.detalleEntrega = oInputForm.destinoTextilText;
            }

            if (sTipoEntrega) {
                oInputForm.tipoEntrega = sTipoEntrega;

                if (sTipoEntrega === "1") {
                    oInputForm.resumenEntrega = "Cliente recoge";
                    oInputForm.direccionAgencia = "";
                    oInputForm.direccionAgenciaText = "";
                    oInputForm.showAgencia = false;
                    oInputForm.mostrarAgencia = false;
                    oInputForm.direccionAgenciaVisible = false;
                }

                if (sTipoEntrega === "2") {
                    oInputForm.resumenEntrega = "Despacho directo";
                    oInputForm.direccionAgencia = "";
                    oInputForm.direccionAgenciaText = "";
                    oInputForm.showAgencia = false;
                    oInputForm.mostrarAgencia = false;
                    oInputForm.direccionAgenciaVisible = false;
                }

                if (sTipoEntrega === "3") {
                    let aAgencias = oModel.getProperty("/oAgenciasCliente") || [];

                    let oAgencia = aAgencias.find(function (item) {
                        return fnNorm(item.Customer) === fnNorm(sCodigoShipTo) ||
                            fnNorm(item.Agencyaddress) === fnNorm(sCodigoShipTo) ||
                            fnNorm(item.Agencyname) === fnNorm(sCodigoShipTo);
                    });

                    if (!oAgencia && sCodigoShipTo) {
                        oAgencia = {
                            Customer: sCodigoShipTo,
                            Agencyaddress: sShippingDestinationName || sCodigoShipTo,
                            Agencyname: sShippingDestinationName || sCodigoShipTo,
                            Source: "DOREPE"
                        };

                        aAgencias = [oAgencia].concat(aAgencias);
                        oModel.setProperty("/oAgenciasCliente", aAgencias);
                        oModel.setProperty("/oAgenciasClienteFiltradas", aAgencias);
                    }

                    oInputForm.resumenEntrega = "Despacho agencia";
                    oInputForm.direccionAgencia = oAgencia
                        ? (oAgencia.Customer || sCodigoShipTo)
                        : sCodigoShipTo;

                    oInputForm.direccionAgenciaText = oAgencia
                        ? (oAgencia.Agencyname || oAgencia.Agencyaddress || sShippingDestinationName || sCodigoShipTo)
                        : (sShippingDestinationName || sCodigoShipTo);

                    oInputForm.showAgencia = true;
                    oInputForm.mostrarAgencia = true;
                    oInputForm.direccionAgenciaVisible = true;
                }
            }

            oModel.setProperty("/inputForm", oInputForm);
            oModel.refresh(true);

            console.log("📌 Cabecera DoRePe aplicada a pedido con referencia Textil:", {
                rawKeys: Object.keys(oRaw),
                SalesDocument: oRaw.SalesDocument || oDocRef.DocComercial,
                CodMotivoPedido: sCodMotivo,
                GrupoMaterial: sGrupoMaterial,
                DeliveryCondition: sDeliveryCondition,
                ShippingDestination: sShippingDestination,
                FinalDestination: sFinalDestination,
                TipoEntregaAplicado: oInputForm.tipoEntrega,
                DestinoAplicado: oInputForm.destinoTextil,
                AgenciaAplicada: oInputForm.direccionAgencia,
                inputForm: JSON.parse(JSON.stringify(oInputForm))
            });
        },

        onDocPendientesContinuar: function () {
            const oTable = this.byId("tblDocPendientes");
            const oItem = oTable.getSelectedItem();

            if (!oItem) {
                sap.m.MessageToast.show("Seleccione un documento");
                return;
            }

            const oContext = oItem.getBindingContext("oModelProyect");
            const oRow = oContext.getObject();
            const oModel = this.getView().getModel("oModelProyect");

            oModel.setProperty("/inputForm/docRefSeleccionado", oRow);
            this._applyCabeceraFromDoRePeReferencia(oRow);

            if (this._oDlgDocPend) {
                this._oDlgDocPend.close();
            }

            this._openDlgDocPosiciones();
            this._loadPosicionesDocumento(oRow);
        },
        _openDlgDocPosiciones: function () {
            const oView = this.getView();

            if (!this._oDlgDocPos) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.textiles.pe.view.dialogs.DlgPosicionesDocumento",
                    controller: this
                }).then(oDialog => {
                    this._oDlgDocPos = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oDlgDocPos.open();
            }
        },
        onDocPosicionesConfirmar: function () {
            const oTable = this.byId("tblPosDocRef");
            const aItems = oTable.getSelectedItems();
            const aSeleccionadas = [];
            let bError = false;

            if (!aItems.length) {
                sap.m.MessageToast.show("Seleccione al menos una posición");
                return;
            }

            for (let i = 0; i < aItems.length; i++) {
                const oItem = aItems[i];

                const oCtx = oItem.getBindingContext("oModelProyect");
                if (!oCtx) {
                    continue;
                }

                const oRow = oCtx.getObject() || {};
                const nPend = this._parseQtyInput(oRow.CtdPendiente);
                const nPed = this._parseQtyInput(oRow.CtdPedido);

                if (!oRow.CtdPedido || nPed <= 0) {
                    sap.m.MessageToast.show("Ingrese una cantidad a pedir mayor a 0 para las posiciones seleccionadas.");
                    bError = true;
                    break;
                }

                if (nPed > nPend) {
                    sap.m.MessageToast.show("La cantidad a pedir no puede ser mayor que la cantidad pendiente.");
                    bError = true;
                    break;
                }

                oRow.CtdPedido = this._formatQtyInput(nPed);
                aSeleccionadas.push(oRow);
            }

            if (bError) {
                return;
            }

            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty("/inputForm/posRefSeleccionadas", aSeleccionadas);

            if (this._oDlgDocPos) {
                this._oDlgDocPos.close();
            }

            this._loadObsFromPedidoReferencia();
        },
        onPosRefSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");
            if (!oTable || !oModel) { return; }
            const aSelCtx = oTable.getSelectedContexts("oModelProyect") || [];
            const mSel = new Set(aSelCtx.map(c => c.getPath()));

            const aItems = oTable.getItems() || [];

            aItems.forEach((oItem) => {
                const oCtx = oItem.getBindingContext("oModelProyect");
                if (!oCtx) { return; }

                const sPath = oCtx.getPath();
                const oRow = oCtx.getObject() || {};
                if (oRow.SinStock) {
                    return;
                }

                const fPend = parseFloat(String(oRow.CtdPendiente || "0").replace(",", ".")) || 0;

                if (mSel.has(sPath)) {
                    oModel.setProperty(sPath + "/CtdPedido", fPend.toFixed(3));
                } else {
                    oModel.setProperty(sPath + "/CtdPedido", "0.000");
                }
            });
        },
        //Inicializa el pedido con referencia 
        onTipoReferenciaCancelar: function () {
            if (this._oDlgTipoRef) {
                this._oDlgTipoRef.close();
            }
        },
        onDocPendientesBack: function () {
            this.byId("dlgDocumentosPendientes").close();
            this.byId("dlgTipoReferencia").open();
        },
        onDocPendientesCancelar: function () {
            if (this._oDlgDocPend) {
                this._oDlgDocPend.close();
            }
        },
        onDocPosicionesBack: function () {
            this.byId("dlgPosicionesDocumento").close();
            this.byId("dlgDocumentosPendientes").open();
        },
        onDocPosicionesCancelar: function () {
            if (this._oDlgDocPos) {
                this._oDlgDocPos.close();
            }
        },
        onSepClienteBack: function () {
            this.byId("dlgSeparacionesCliente").close();
            this.byId("dlgTipoReferencia").open();
        },
        onSepClienteCancelar: function () {
            if (this._oDlgSepCli) {
                this._oDlgSepCli.close();
            }
        },
        formatTipoCambioLabel: function (oTipChangeData) {
            if (!oTipChangeData || !oTipChangeData.from || !oTipChangeData.to) {
                return "Tipo de cambio: N/A";
            }
            let fValorFrom = parseFloat(oTipChangeData.from.valor) || 0; // USD → PEN
            let fValorTo = parseFloat(oTipChangeData.to.valor) || 0; // PEN → USD
            let sValorFrom = new Intl.NumberFormat("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(fValorFrom);
            let sValorTo = new Intl.NumberFormat("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(fValorTo);
            return `${oTipChangeData.from.moneda}: ${sValorFrom} ${oTipChangeData.to.moneda}`;
        },
        onChangeSellerPrincipal: function (oEvent) {
            const sKey = oEvent.getSource().getSelectedKey();
            const oModelProyect = this.getView().getModel("oModelProyect");
            const aOptions = oModelProyect.getProperty("/oSellerPrincipalOptions") || [];

            const oSelected = aOptions.find(item => String(item.kunn2) === String(sKey)) || {
                kunn2: "",
                Seller: ""
            };

            oModelProyect.setProperty("/oSellerPrincipalSelected", oSelected);
            oModelProyect.setProperty("/inputForm/sellerPrincipalKunn2", oSelected.kunn2 || "");
            oModelProyect.setProperty("/inputForm/sellerPrincipalName", oSelected.Seller || "");

            // Compatibilidad: reemplaza también el vendedor visible en oClientData
            // para que cualquier lógica vieja que lo lea siga funcionando con el nuevo valor.
            oModelProyect.setProperty("/oClientData/kunn2", oSelected.kunn2 || "");
            oModelProyect.setProperty("/oClientData/Seller", oSelected.Seller || "");

            oModelProyect.refresh(true);
        },
        _applyTipDocumentFilter: function () {
            const oModelData = this.getView().getModel("oModelData");
            const oModelUser = this.getView().getModel("oModelUser");
            const oModelProyect = this.getView().getModel("oModelProyect");

            const aTipDocsAll = oModelData.getProperty("/oTipDocumentDataAll") || [];
            const oDir = oModelProyect.getProperty("/oDireccionCliente") || {};
            const oDatClient = oModelProyect.getProperty("/oDatClient") || {};

            const bIsCliente = !!oModelUser.getProperty("/bIsCliente");
            const bIsVendedor = !!oModelUser.getProperty("/bIsVendedor");
            const bIsCoord = !!oModelUser.getProperty("/bIsCoord");

            const sCountry = String(
                oDir.Country ||
                oDatClient.Country ||
                oDatClient.CountryCode ||
                oDatClient.Land1 ||
                ""
            ).trim().toUpperCase();

            const bClientePE = sCountry === "PE";

            let aPermitidos = [];

            // Regla global:
            // Si el cliente/dirección no es Perú, solo puede generar EXPO.
            // Aplica para Cliente, Vendedor y Coordinador.
            if (!bClientePE) {
                aPermitidos = ["ZPEF"];
            } else if (bIsCliente) {
                aPermitidos = ["ZPES"];
            } else if (bIsVendedor && !bIsCoord) {
                aPermitidos = ["ZCNA", "ZPES", "ZPSE"];
            } else if (bIsCoord) {
                aPermitidos = ["ZCNA", "ZPES", "ZPSE", "ZGNA"];
            } else {
                aPermitidos = [];
            }

            const aTipDocsFiltrados = aTipDocsAll.filter(function (doc) {
                return aPermitidos.includes(String(doc.auart || "").trim().toUpperCase());
            });

            console.log("REAPLICA TIPDOC -> país:", sCountry);
            console.log("REAPLICA TIPDOC -> es Perú:", bClientePE);
            console.log("REAPLICA TIPDOC -> rol:", {
                bIsCliente: bIsCliente,
                bIsVendedor: bIsVendedor,
                bIsCoord: bIsCoord
            });
            console.log("REAPLICA TIPDOC -> permitidos:", aPermitidos);
            console.log("REAPLICA TIPDOC -> filtrados:", aTipDocsFiltrados);

            oModelData.setProperty("/oTipDocumentData", aTipDocsFiltrados);

            if (!bClientePE) {
                const oZPEF = aTipDocsFiltrados.find(function (doc) {
                    return String(doc.auart || "").trim().toUpperCase() === "ZPEF";
                });

                if (oZPEF) {
                    const sTextZPEF = [oZPEF.auart, oZPEF.bezei].filter(Boolean).join(" - ");

                    oModelProyect.setProperty("/inputForm/tipDocument", "ZPEF");
                    oModelProyect.setProperty("/inputForm/txtTipDocument", sTextZPEF);
                    oModelProyect.setProperty("/isFormEnabled", true);
                    oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", false);

                    if (typeof this._updateFormState === "function") {
                        this._updateFormState();
                    }

                    if (typeof this._applyExternalZPEFCourierRules === "function") {
                        this._applyExternalZPEFCourierRules();
                    }

                    if (typeof this._updateBtnPedidoReferenciaVisibility === "function") {
                        this._updateBtnPedidoReferenciaVisibility();
                    }

                    return;
                }
            }
            const sCurrentTipDoc = String(
                oModelProyect.getProperty("/inputForm/tipDocument") || ""
            ).trim().toUpperCase();

            if (sCurrentTipDoc && !aPermitidos.includes(sCurrentTipDoc)) {
                oModelProyect.setProperty("/inputForm/tipDocument", "");
                oModelProyect.setProperty("/inputForm/txtTipDocument", "");
                oModelProyect.setProperty("/isFormEnabled", false);
                oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", true);
                oModelData.setProperty("/oReason", []);

                if (typeof this._updateFormState === "function") {
                    this._updateFormState();
                }

                if (typeof this._updateBtnPedidoReferenciaVisibility === "function") {
                    this._updateBtnPedidoReferenciaVisibility();
                }
            }
        },
        onAgenciaChange: function (oEvent) {
            const oCombo = oEvent.getSource();
            const oItem = oCombo.getSelectedItem();
            const oModel = this.getView().getModel("oModelProyect");

            if (!oItem) {
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                this._updateResumenEntrega();
                return;
            }

            oModel.setProperty("/inputForm/direccionAgencia", (oItem.getKey() || "").trim());
            oModel.setProperty("/inputForm/direccionAgenciaText", (oItem.getAdditionalText() || "").trim());

            this._updateResumenEntrega();
        },

        _syncPuertoEmbarqueFromControl: function (bAllowClear) {
            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");
            const oSelect = this.byId("PuertoDestinoFormClient");

            if (!oModel || !oModelData || !oSelect) {
                return;
            }

            const aPuertos = oModelData.getProperty("/oPortEmbarkation") || [];

            let sKey = String(
                oSelect.getSelectedKey ? oSelect.getSelectedKey() : ""
            ).trim();

            let sText = "";

            if (sKey) {
                const oPuerto = aPuertos.find(function (oItem) {
                    return String(oItem.sKey || "").trim() === sKey;
                });

                sText = String(
                    oPuerto?.sText ||
                    oSelect.getSelectedItem()?.getText?.() ||
                    ""
                ).trim();
            }

            if (!sKey && !bAllowClear) {
                return;
            }

            oModel.setProperty("/inputForm/puertoEmbarque", sKey);
            oModel.setProperty("/inputForm/puertoEmbarqueText", sText);

            console.log("Puerto destino sincronizado FormClient:", {
                puertoEmbarque: sKey,
                puertoEmbarqueText: sText
            });
        },

        onPuertoEmbarqueChange: function () {
            this._syncPuertoEmbarqueFromControl(true);
        },


    });
});