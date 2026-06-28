sap.ui.define([
    "com/aris/registropedido/quimico/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "com/aris/registropedido/quimico/pe/model/models",
    "com/aris/registropedido/quimico/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    '../util/util',
    '../util/utilUI',
    "sap/ui/core/Fragment",
    "com/aris/registropedido/quimico/pe/services/Services"
], (BaseController, Controller, models, Formatter, JSONModel, util, utilUI, Fragment, Services) => {
    "use strict";

    var that;
    var tUniNeg = "", tRol = "", tPerfil = "", tSalesOrg = "";
    formatter: Formatter;
    return BaseController.extend("com.aris.registropedido.quimico.pe.controller.FormClient", {

        onInit: function () {
            that = this;

            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("FormClient").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));

            // ✅ usa el del Component
            const oModelProyect = this.getOwnerComponent().getModel("oModelProyect");

            // si por alguna razón viniera sin data, lo inicializas
            if (!oModelProyect.getData() || Object.keys(oModelProyect.getData()).length === 0) {
                oModelProyect.setData(models.createModelProyect());
            }

            oModelProyect.setProperty("/Main/filter/fechInicio", new Date());
            this.getView().setModel(oModelProyect, "oModelProyect");
            let sURL = window.parent.location.href;
            if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; tSalesOrg = "1110"; }
            if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; tSalesOrg = "1120"; }
            if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; tSalesOrg = "1130"; }

            const sUserData = localStorage.getItem("oModelUser");
            if (sUserData) {
                const oUserData = JSON.parse(sUserData);
                const oModelUser = new sap.ui.model.json.JSONModel(oUserData);
                this.getView().setModel(oModelUser, "oModelUser");
            }
        },

        onAfterRendering: function () {
            this._applyContainsFilterToCombos();
        },

        handleRouteMatched: function (bInit) {

            const oModelProyect = this.getView().getModel("oModelProyect");
            if (oModelProyect) {
                oModelProyect.setProperty("/Main/filter/fechInicio", new Date());
            }

            sap.ui.core.BusyIndicator.show(0);
            let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];

            this._clearOCUploadState();

            Promise.all([
                that._getPrueba(),
                that._getTipMaterialData(),
                that._getTipChangeData(),
                that._getTipDocumentData(),
                that._getClientPet(sCustomer),
                that._getAddressData(sCustomer),
                that._getCreditDispo(sCustomer, tSalesOrg),
                that._getPrincipalSeller(sCustomer),
                that._getDatClient(sCustomer),
                that._getTipMoney(that),
                that._getTransport(),
                that._getCOnditionPay(),
                that._getUsers(),
                that._getBPVendedor(),
                that._getReason()
            ]).then(async (values) => {

                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");

                let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];

                await that._validateAccessToPortal(values);

                let oDataDetalle = values[4].oResults;
                let oDataDetalleClient = oDataDetalle.filter(item => item.Customer == sCustomer);
                if (oDataDetalleClient.length > 0) {
                    that.oModelProyect.setProperty("/oDatClient", oDataDetalleClient[0]);
                }

                let oDir = values[5].oResults;
                if (oDir) {
                    oDir.FullAddress = `${oDir.Street || ""} ${oDir.HouseNo || ""} ${oDir.StrSuppl1 || ""} ${oDir.StrSuppl2 || ""}, ${oDir.District || ""}, ${oDir.City || ""}, ${oDir.Region || ""}, ${oDir.Country || ""}`;
                    that.oModelProyect.setProperty("/oDireccionCliente", oDir);
                }

                let oCredito = values[6].oResults[0];
                that.oModelProyect.setProperty("/oCreditoCliente", oCredito || {});

                let oPrincipalSeller = values[7].oResults;
                if (oPrincipalSeller) {
                    that.oModelProyect.setProperty("/oPrincipalSeller", oPrincipalSeller);
                }

                let oClientData = values[8].oResults;
                let oClientDataFilter = oClientData.filter(item => item.Customer == sCustomer);
                if (oDataDetalleClient.length > 0) {
                    that.oModelProyect.setProperty("/oClientData", oClientDataFilter[0]);
                }

                // 🔹 AHORA se ejecuta después de validar acceso y cargar oModelUser
                let oRespTravel = await that._getAddresTravel(sCustomer);
                if (oRespTravel && oRespTravel.sEstado === "S") {
                    // La función ya llena:
                    // /oAgenciasCliente
                    // /oDestinosCliente
                    // /oFinalDestinosCliente
                } else {
                    that.oModelProyect.setProperty("/oAgenciasCliente", []);
                    that.oModelProyect.setProperty("/oDestinosCliente", []);
                    that.oModelProyect.setProperty("/oFinalDestinosCliente", []);
                }

                that.oModelProyect.setProperty("/oAgenciasClienteFiltradas", []);

                // 🔹 índices corridos porque _getAddresTravel salió del Promise.all
                that.oModelData.setProperty("/oTipMoney", values[9].d.results);
                that.oModelData.setProperty("/oTrasport", values[10].oResults);
                that.oModelData.setProperty("/oConditionPay", values[11].oResults);
                that.oModelData.setProperty("/oReason", values[14].oResults);

                that._setLanguageModel("esp");
                that.oModelProyect.getProperty("/oDetalle");
                that.oModelProyect.getProperty("/oFormCliente");

                that.oModelData.setProperty("/oTipMaterialData", values[1].oResults);
                that.oModelData.setProperty("/oTipChangeData", values[2].oResults);

                let aTipDocs = values[3].oResults || [];
                const oModelUser = that.getModel("oModelUser");
                const bIsCliente = oModelUser.getProperty("/bIsCliente");
                const bIsVendedor = oModelUser.getProperty("/bIsVendedor");
                const bIsCoord = oModelUser.getProperty("/bIsCoord");

                if (bIsCliente) {
                    aTipDocs = aTipDocs.filter(function (doc) {
                        return doc.auart === "ZPES";
                    });
                } else if (bIsVendedor) {
                    aTipDocs = aTipDocs.filter(function (doc) {
                        return doc.auart === "ZCNA" ||
                            doc.auart === "ZPES" ||
                            doc.auart === "ZGNA" ||
                            doc.auart === "ZACN";
                    });
                } else if (bIsCoord) {
                    aTipDocs = aTipDocs.filter(function (doc) {
                        return doc.auart === "ZCNA" ||
                            doc.auart === "ZPES" ||
                            doc.auart === "ZGNA" ||
                            doc.auart === "ZACN";
                    });
                }

                that.oModelData.setProperty("/oTipDocumentData", aTipDocs);

                const oInput = that.oModelProyect.getProperty("/inputForm") || {};
                const aMonedas = that.oModelData.getProperty("/oTipMoney") || [];

                if (!oInput.moneda) {
                    const oUSD = aMonedas.find(m => m.sKey === "USD");
                    oInput.moneda = "USD";
                    oInput.monedaText = oUSD ? oUSD.sText : "USD";
                    oInput.isMonedaUSD = true;
                    oInput.isMonedaPEN = false;

                    that.oModelProyect.setProperty("/inputForm", oInput);
                }

                let oData = values[2].oResults;
                let oTipoCambio = {
                    from: {
                        moneda: oData.FromCurr || "PEN",
                        valor: oData.ExchRate || 0
                    },
                    to: {
                        moneda: oData.ToCurrncy || "USD",
                        valor: oData.ExchRate || 0
                    },
                    fechaValidez: oData.ValidFrom ? new Date(parseInt(oData.ValidFrom.match(/\d+/)[0], 10)) : null,
                    fecha: oData.Date ? new Date(parseInt(oData.Date.match(/\d+/)[0], 10)) : null
                };

                that.oModelData.setProperty("/oTipChangeData", oTipoCambio);

                let sTipDocument = that.oModelProyect.getProperty("/inputForm/tipDocument") || "";
                that.oModelProyect.setProperty("/bShowBtnPedidoRef", false);
                that.oModelProyect.setProperty("/isFormEnabled", sTipDocument !== "");

                that._setDefaultCondicionPago();
                that.oModelProyect.refresh(true);

                let sIdioma = that.getModel("oModelProyect").getProperty("/sIdioma");
                that.oModelProyect.getProperty("/inputForm");

                if (!that.oModelProyect.getProperty("/inputForm")) {
                    that.oModelProyect.setProperty("/inputForm", {
                        tipDocument: "",
                        igv: "",
                        showSeparationDates: false,
                        PedExport: false,
                        fechInicio: "",
                        fechFin: "",
                        tipoEmbarque: "05",
                        puertoEmbarque: "SP01",
                        bultos: "",
                        obsPedido: "",
                        isFormEnabled: false,
                        isTipDocumentEnabled: true,
                        showReasonOrd: false,
                        reasonOrd: "",
                        txtReasonOrd: ""
                    });
                } else {
                    const oInputForm = that.oModelProyect.getProperty("/inputForm");
                    oInputForm.showSeparationDates = !!oInputForm.showSeparationDates;
                    oInputForm.PedExport = !!oInputForm.PedExport;
                    oInputForm.showReasonOrd = !!oInputForm.showReasonOrd;
                    that.oModelProyect.setProperty("/inputForm", oInputForm);
                }

                if (sIdioma == undefined) {
                    that._setLanguageModel("esp");
                } else {
                    that._setLanguageModel(sIdioma);
                }

                sap.ui.core.BusyIndicator.hide(0);

            }).catch(function (oError) {
                that.getMessageBox("error", that.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            });

        },
        _validateAccessToPortal: async function (values) {
            try {
                void 0;

                let sURL = window.parent.location.href;
                let tUniNeg = "";
                let tSalesOrg = "";

                if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; tSalesOrg = "1110"; }
                else if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; tSalesOrg = "1120"; }
                else if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; tSalesOrg = "1130"; }

                void 0;
                void 0;

                const oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                const oModelUser = that.getModel("oModelUser");

                // ========================
                // 1) USUARIO IAS
                // ========================
                const oUserResp = values[12];
                void 0;

                if (!oUserResp || !oUserResp.Resources || !oUserResp.Resources.length) {
                    void 0;
                    sap.ui.core.BusyIndicator.hide(0);
                    oRouter.navTo("AccessDenied");
                    return;
                }

                let oUser = oUserResp.Resources[0];
                void 0;

                let sFullName = `${oUser?.name?.givenName || ""} ${oUser?.name?.familyName || ""}`.trim();
                oModelUser.setProperty("/bUserName", sFullName);

                // ========================
                // 2) ATRIBUTOS IAS
                // ========================
                let oAttrIAS = oUser["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];
                let aAttr = (oAttrIAS && oAttrIAS.attributes) ? oAttrIAS.attributes : [];

                void 0;

                let oAttr1 = aAttr.find(a => a.name === "customAttribute1");
                let oAttr2 = aAttr.find(a => a.name === "customAttribute2");
                let oAttr3 = aAttr.find(a => a.name === "customAttribute3");

                let sBPCliente = oAttr1 ? String(oAttr1.value || "").trim() : "";
                let sBPVendedor = oAttr2 ? String(oAttr2.value || "").trim() : "";
                let sBPCoord = oAttr3 ? String(oAttr3.value || "").trim() : "";

                void 0;
                void 0;
                void 0;

                let sBPFinal = sBPVendedor || sBPCoord || "";
                oModelUser.setProperty("/bBPFinal", sBPFinal);

                void 0;

                // ========================
                // 3) CASO CLIENTE
                // ========================
                if (sBPCliente) {
                    void 0;

                    const aSalesOrgs = await that._getSalesOrgByBP(sBPCliente);
                    void 0;

                    if (!Array.isArray(aSalesOrgs) || !aSalesOrgs.includes(tSalesOrg)) {
                        void 0;
                        sap.ui.core.BusyIndicator.hide(0);
                        oRouter.navTo("AccessDenied");
                        return;
                    }

                    oModelUser.setProperty("/bIsCliente", true);
                    oModelUser.setProperty("/bIsInterno", false);
                    oModelUser.setProperty("/bIsVendedor", false);
                    oModelUser.setProperty("/bIsCoord", false);

                    void 0;
                    return;
                }

                // ========================
                // 4) CASO INTERNO
                // ========================
                if (sBPVendedor || sBPCoord) {
                    void 0;

                    const sUsuarioIAS = String(sBPVendedor || sBPCoord).trim();
                    const sOrgActual = String(tSalesOrg);

                    void 0;
                    void 0;

                    const oVendResp = values[13]?.oResults;
                    void 0;

                    let aVendedores = [];

                    if (oVendResp?.d?.results) {
                        aVendedores = oVendResp.d.results;
                    } else if (Array.isArray(oVendResp)) {
                        aVendedores = oVendResp;
                    }

                    void 0;

                    const aUserRows = aVendedores.filter(v =>
                        String(v.usuario || "").trim() === sUsuarioIAS
                    );

                    void 0;

                    if (!aUserRows.length) {
                        void 0;
                        oRouter.navTo("AccessDenied");
                        return;
                    }

                    const aRowsOrg = aUserRows.filter(v =>
                        String(v.orgventas || "").trim() === sOrgActual
                    );

                    void 0;

                    if (!aRowsOrg.length) {
                        void 0;
                        oRouter.navTo("AccessDenied");
                        return;
                    }

                    const oMatchOrg =
                        aRowsOrg.find(r => String(r.perfil || "").toUpperCase().trim() === "CD") ||
                        aRowsOrg.find(r => String(r.perfil || "").toUpperCase().trim() === "VD") ||
                        aRowsOrg[0];

                    void 0;

                    const sPerfilCode = String(oMatchOrg?.perfil || "").toUpperCase().trim();

                    void 0;
                    void 0;

                    const bIsVendedor = (sPerfilCode === "VD");
                    const bIsCoord = (sPerfilCode === "CD");

                    void 0;
                    void 0;

                    oModelUser.setProperty("/bIsCliente", false);
                    oModelUser.setProperty("/bIsInterno", true);
                    oModelUser.setProperty("/bIsVendedor", bIsVendedor);
                    oModelUser.setProperty("/bIsCoord", bIsCoord);

                    void 0;

                    return;
                }

                void 0;
                oRouter.navTo("AccessDenied");

            } catch (oError) {
                void 0;
                const oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("AccessDenied");
            }
        },
        _validarStockPosicionesDocRef: async function () {
            const oModel = this.getView().getModel("oModelProyect");

            const oTable = this.byId("tblPosDocRef") || sap.ui.getCore().byId("tblPosDocRef");
            if (!oTable) return true;

            const aSelItems = oTable.getSelectedItems();
            if (!aSelItems.length) {
                sap.m.MessageBox.warning("Debe seleccionar al menos una posición de referencia.");
                return false;
            }

            // arma solicitado por material solo con seleccionados
            const mSolicitadoByMat = {};
            const _n = v => {
                const n = parseFloat(String(v || "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            aSelItems.forEach(oItem => {
                const oCtx = oItem.getBindingContext("oModelProyect");
                if (!oCtx) return;
                const oRow = oCtx.getObject() || {};

                const sMat = String(oRow.Material || "").trim();
                const nCant = _n(oRow.CtdPedido || "0");
                if (!sMat) return;

                if (!mSolicitadoByMat[sMat]) mSolicitadoByMat[sMat] = { cantidadTotal: 0, items: [] };
                mSolicitadoByMat[sMat].cantidadTotal += nCant;
                mSolicitadoByMat[sMat].items.push({ row: oRow, item: oItem });
            });

            // si seleccionaron pero todo en 0, también es inválido
            const aMatKeys = Object.keys(mSolicitadoByMat);
            const nTotal = aMatKeys.reduce((acc, k) => acc + (mSolicitadoByMat[k].cantidadTotal || 0), 0);

            if (!aMatKeys.length || nTotal <= 0) {
                sap.m.MessageBox.warning("Debe ingresar una cantidad mayor a 0 en al menos una posición seleccionada.");
                return false;
            }

            // ✅ Todo OK: hay stock suficiente para todo lo seleccionado
            sap.m.MessageBox.success(
                "Stock verificado correctamente.\n" +
                "Todas las posiciones seleccionadas tienen stock suficiente."
            );

            return true;
        },
        _loadProductoSingle: function (aFiltersStock) {
            const that = this;
            return new Promise((resolve, reject) => {
                try {
                    let sUrl;
                    if (that.local) {
                        sUrl = that.getOwnerComponent().getManifestObject()
                            .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
                    } else {
                        sUrl = jQuery.sap.getModulePath(that.route)
                            + "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
                    }

                    const oModel = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                        useBatch: false,
                        defaultBindingMode: "TwoWay"
                    });
                    oModel.read("/I_StockDisponibleSet", {
                        filters: aFiltersStock,
                        urlParameters: { "$expand": "toStockQuimico" },
                        success: function (oData) {
                            const aResult = (oData.results || []).flatMap(item =>
                                (item.toStockQuimico?.results || []).map(q => ({
                                    Matnr: q.Matnr,
                                    Maktx: q.Maktx,
                                    Meins: q.Meins,
                                    Clabs: q.Clabs?.trim() || "0",
                                    Charg: q.Charg,
                                    cantidad: ""
                                }))
                            );
                            resolve(aResult);
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                } catch (e) {
                    reject(e);
                }
            });
        },
        _loadObsFromPedidoReferencia: function (sSalesDocument) {
            const oModelProyect = this.getView().getModel("oModelProyect");

            if (!sSalesDocument) {
                return Promise.resolve();
            }

            let sUrl = "";
            if (this.local) {
                sUrl = this.getOwnerComponent().getManifestObject()
                    .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
            } else {
                sUrl = jQuery.sap.getModulePath(this.route) +
                    "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
            }

            const oModel = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                useBatch: false,
                defaultBindingMode: "TwoWay"
            });

            const aFilters = [
                new sap.ui.model.Filter("SalesDocument", sap.ui.model.FilterOperator.EQ, String(sSalesDocument).trim())
            ];

            return new Promise((resolve) => {
                oModel.read("/ObserPedSet", {
                    filters: aFilters,
                    success: function (oData) {
                        const aRaw = oData.results || [];

                        let sObsPedido = "";
                        let sObsDelivery = "";

                        aRaw.forEach(function (row) {
                            const sTipoObs = String(row.Tipobs || "").trim().toUpperCase();
                            const sNota = String(row.Nota || "").trim();

                            if (!sNota) return;

                            if (sTipoObs === "OBPE") {
                                sObsPedido += (sObsPedido ? "\n" : "") + sNota;
                            }

                            if (sTipoObs === "OBEN") {
                                sObsDelivery += (sObsDelivery ? "\n" : "") + sNota;
                            }
                        });

                        const oInputForm = oModelProyect.getProperty("/inputForm") || {};
                        oInputForm.obsPedido = sObsPedido;
                        oInputForm.obsDelivery = sObsDelivery;

                        oModelProyect.setProperty("/inputForm", oInputForm);
                        oModelProyect.setProperty("/inputForm/obsPedido", sObsPedido);
                        oModelProyect.setProperty("/inputForm/obsDelivery", sObsDelivery);
                        oModelProyect.updateBindings(true);
                        oModelProyect.refresh(true);

                        const oObsPed = sap.ui.getCore().byId("ObservationsPed") || this.byId?.("ObservationsPed");
                        const oObsDel = sap.ui.getCore().byId("ObservationsDelivery") || this.byId?.("ObservationsDelivery");

                        if (oObsPed && oObsPed.setValue) {
                            oObsPed.setValue(sObsPedido);
                        }

                        if (oObsDel && oObsDel.setValue) {
                            oObsDel.setValue(sObsDelivery);
                        }

                        resolve({
                            obsPedido: sObsPedido,
                            obsDelivery: sObsDelivery
                        });
                    }.bind(this),
                    error: function () {
                        resolve();
                    }
                });
            });
        },
        _setDefaultCondicionPago: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");
            if (!oModelProyect || !oModelData) return;

            const oClientData = oModelProyect.getProperty("/oClientData") || {};
            const oInputForm = oModelProyect.getProperty("/inputForm") || {};
            const aCondiciones = oModelData.getProperty("/oConditionPay") || [];
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
        _onPressMaterialDetail: function () {
            if (!this._validateRequiredFields()) {
                return;
            }
            const oModel = this.getModel("oModelProyect");
            const oDatosCliente = oModel.getProperty("/oClienteSeleccionado");
            const oFiltros = oModel.getProperty("/inputForm");
            // ✅ siempre recalcular con la misma lógica
            this._updateResumenEntrega();
            this._syncPendingOCFilesFromTokens();
            const oToday = new Date();
            const sToday = oToday.toISOString().split("T")[0];
            oModel.setProperty("/fechaActual", sToday);
            let sCustomer = oDatosCliente?.Customer;
            if (!sCustomer) {
                const oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
                const sHash = oHashChanger.getHash();
                const aParts = sHash.split("/");
                sCustomer = aParts.length > 1 ? aParts[1] : null;
            }

            if (sCustomer) {
                this.getRouter().navTo("Detail", { app: sCustomer });
                sap.m.MessageToast.show("Fecha guardada: " + sToday);
            } else {
                sap.m.MessageToast.show("No se encontró Customer para continuar");
            }
        },
        _onPressNavButtonForm: function () {
            this._clearOCUploadState();

            const oM = this.getView().getModel("oModelProyect");
            if (oM) {
                oM.setData(models.createModelProyect());
            }

            // por si hay fragmentos en este controller
            ["_dialogAddManualProduct"].forEach(sName => {
                if (this[sName]) {
                    try { this[sName].destroy(); } catch (e) { }
                    this[sName] = null;
                }
            });

            this.oRouter.navTo("Main");
        },
        onSelectRadioComprobante: function (oEvent) {
            if (!oEvent.getParameter("selected")) return;
            const oModel = this.getView().getModel("oModelProyect");
            const oSource = oEvent.getSource();
            const sText = oSource.getText();
            let sValor = "";
            let sDescripcion = "";
            switch (sText) {
                case this.getResourceBundle().getText("txtClientCollet"):
                    sValor = "1";
                    sDescripcion = "Cliente recoge";
                    break;
                case this.getResourceBundle().getText("txtDirectDispatch"):
                    sValor = "2";
                    sDescripcion = "Despacho directo";
                    break;
                case this.getResourceBundle().getText("txtDispatchAgency"):
                    sValor = "3";
                    sDescripcion = "Dirección agencia";
                    break;
            }
            const sPrevTipo = oModel.getProperty("/inputForm/tipoEntrega");
            oModel.setProperty("/inputForm/tipoEntrega", sValor);
            if (sPrevTipo && sPrevTipo !== sValor) {
                oModel.setProperty("/inputForm/transporte", "");
                oModel.setProperty("/inputForm/transporteText", "");
                // Limpia agencia (todo lo asociado)
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/agenciaFullText", "");

                // ✅ NUEVO: limpia lista filtrada
                oModel.setProperty("/oAgenciasClienteFiltradas", []);
            }

            switch (sValor) {
                case "1":
                    break;
                case "2":
                    break;
                case "3":
                    break;
            }

            this._updateResumenEntrega();
        },
        onSelectTransporte: function (oEvent) {
            const oCombo = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");
            const oItem = oEvent.getParameter("selectedItem");

            if (!oItem) {
                oCombo.setSelectedKey("");
                oCombo.setValue("");

                oModel.setProperty("/inputForm/transporte", "");
                oModel.setProperty("/inputForm/transporteText", "");
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/agenciaFullText", "");
                oModel.setProperty("/oAgenciasClienteFiltradas", []);

                const oComboAgencia = this.byId("cbDireccionAgencia");
                if (oComboAgencia) {
                    oComboAgencia.setSelectedKey("");
                    oComboAgencia.setValue("");
                    oComboAgencia.data("manualSearchTerm", "");
                    oComboAgencia.data("lastValidSearch", "");
                    oComboAgencia.data("lastValidKey", "");
                    oComboAgencia.data("lastValidValue", "");
                    oComboAgencia.data("lastValidAdditional", "");
                }

                this._updateResumenEntrega();
                return;
            }

            const sCarrier = String(oItem.getKey() || "").trim();
            const sName = String(oItem.getText() || "").trim();

            oCombo.setSelectedKey(sCarrier);
            oCombo.setValue(sName);

            oModel.setProperty("/inputForm/transporte", sCarrier);
            oModel.setProperty("/inputForm/transporteText", sName);

            oModel.setProperty("/inputForm/direccionAgencia", "");
            oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
            oModel.setProperty("/inputForm/direccionAgenciaText", "");
            oModel.setProperty("/inputForm/agenciaFullText", "");

            const oComboAgencia = this.byId("cbDireccionAgencia");
            if (oComboAgencia) {
                oComboAgencia.setSelectedKey("");
                oComboAgencia.setValue("");
                oComboAgencia.data("manualSearchTerm", "");
                oComboAgencia.data("lastValidSearch", "");
                oComboAgencia.data("lastValidKey", "");
                oComboAgencia.data("lastValidValue", "");
                oComboAgencia.data("lastValidAdditional", "");
            }


            const aAll = oModel.getProperty("/oAgenciasCliente") || [];
            const aFiltered = aAll.filter(function (row) {
                const sRowCarrier = String(
                    row.Carrier ||
                    (row._raw && row._raw.Carrier) ||
                    ""
                ).trim();

                return sRowCarrier === sCarrier;
            });

            if (!aFiltered.length) {
                const bHayCarrierEnAlguno = aAll.some(function (r) {
                    return String(r.Carrier || "").trim();
                });

                if (!bHayCarrierEnAlguno) {
                    oModel.setProperty("/oAgenciasClienteFiltradas", aAll);
                    this._updateResumenEntrega();
                    return;
                }
            }

            oModel.setProperty("/oAgenciasClienteFiltradas", aFiltered);

            this._updateResumenEntrega();
        },
        onSelectDireccionAgencia: function (oEvent) {
            const oCombo = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");
            const oItem = oEvent.getParameter("selectedItem");

            if (!oItem) {
                oCombo.setSelectedKey("");
                oCombo.setValue("");

                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/agenciaFullText", "");

                this._updateResumenEntrega();
                return;
            }

            const sKey = String(oItem.getKey() || "").trim();
            const sAddrText = String(oItem.getText() || "").trim();
            const sAgencyName = String(oItem.getAdditionalText() || "").trim();

            oCombo.data("manualSearchTerm", "");
            oCombo.data("lastValidSearch", "");
            oCombo.data("lastValidKey", sKey);
            oCombo.data("lastValidValue", sAddrText);
            oCombo.data("lastValidAdditional", sAgencyName);

            oCombo.setSelectedKey(sKey);
            oCombo.setValue(sAddrText);

            oModel.setProperty("/inputForm/direccionAgencia", sKey);
            oModel.setProperty("/inputForm/direccionAgenciaAddrText", sAddrText);
            oModel.setProperty("/inputForm/direccionAgenciaText", sAgencyName);
            oModel.setProperty(
                "/inputForm/agenciaFullText",
                [sAgencyName, sAddrText].filter(Boolean).join(" - ")
            );

            this._updateResumenEntrega();
        },
        onSelectDestinoQuimico: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oItem = oEvent.getParameter("selectedItem");

            if (oItem) {
                const sKey = oItem.getKey();
                const sText = oItem.getText();

                oModel.setProperty("/inputForm/destinoQuimicos", sKey);
                oModel.setProperty("/inputForm/destinoQuimicosText", sText);
            }

            this._updateResumenEntrega();
        },
        onSelectDestinoFinal: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oItem = oEvent.getParameter("selectedItem");
            if (oItem) {
                const sKey = oItem.getKey();
                const sText = oItem.getText();

                oModel.setProperty("/inputForm/destinoFinal", sKey);
                oModel.setProperty("/inputForm/destinoFinalText", sText);
            }
            this._updateResumenEntrega();
        },
        onSelectMoneda: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const aMonedas = this.getView().getModel("oModelData").getProperty("/oTipMoney") || [];
            const oItem = oEvent.getParameter("selectedItem");

            // 🔹 Si limpiaron el combo o no hay item → dejamos USD por defecto
            if (!oItem) {
                const oUSD = aMonedas.find(m => m.sKey === "USD");

                oModel.setProperty("/inputForm/moneda", "USD");
                oModel.setProperty("/inputForm/monedaText", oUSD ? oUSD.sText : "USD");

                oModel.setProperty("/inputForm/isMonedaUSD", true);
                oModel.setProperty("/inputForm/isMonedaPEN", false);
                return;
            }

            const sKey = oItem.getKey();   // "USD" / "PEN" / ...
            const sText = oItem.getText();  // descripción

            // 🔹 Guardamos la moneda en el inputForm (se comparte con Detail)
            oModel.setProperty("/inputForm/moneda", sKey);
            oModel.setProperty("/inputForm/monedaText", sText);

            // 🔹 Flags para lógica de UI / flete
            oModel.setProperty("/inputForm/isMonedaUSD", sKey === "USD");
            oModel.setProperty("/inputForm/isMonedaPEN", sKey === "PEN");
        },
        onSelectCondPago: function (oEvent) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sKey = oSelectedItem.getKey();
                const sText = oSelectedItem.getText();
                oModelProyect.setProperty("/inputForm/cbCondPago", sKey);
                oModelProyect.setProperty("/inputForm/txtCondPago", sText);
            }
        },
        _updateResumenEntrega: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oInputForm = oModel.getProperty("/inputForm") || {};

            const sTipo = (oInputForm.tipoEntrega || "").trim();
            let sDetalle = "";
            const sDestQ = (oInputForm.destinoQuimicosText || "").trim();
            const sDestF = (oInputForm.destinoFinalText || "").trim();

            if (sDestQ) sDetalle = sDestQ;
            if (sDestF) sDetalle = sDetalle ? (sDetalle + " / " + sDestF) : sDestF;
            let sResumen = "";
            if (sTipo === "1") sResumen = "Cliente recoge";
            if (sTipo === "2") sResumen = "Despacho directo";
            if (sTipo === "3") sResumen = "Despacho agencia";
            if (sTipo === "1") {
                // if (sDetalle) sResumen += " - " + sDetalle;
            }

            if (sTipo === "2") {
                const sTrans = (oInputForm.transporteText || "").trim();
                // if (sTrans) sResumen += " - " + sTrans;
                // if (sDetalle) sResumen += " / " + sDetalle;
            }

            if (sTipo === "3") {
                const sAgenciaRS = (oInputForm.direccionAgenciaText || "").trim();
                // if (sAgenciaRS) sResumen += " - " + sAgenciaRS;
                // if (sDetalle) sResumen += " / " + sDetalle;
            }
            oModel.setProperty("/inputForm/resumenEntrega", sResumen);
            oModel.setProperty("/inputForm/detalleEntrega", sDetalle);

            oModel.setProperty("/inputForm/transportistaText", (sTipo === "2") ? (oInputForm.transporteText || "") : "");
            if (sTipo !== "2" && sTipo !== "3") {
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
            }

            oModel.refresh(true);
        },
        onSelectDestinoTravelChemical: function (oEvent) {
            if (!oEvent.getParameter("selected")) return;
            const isYes = oEvent.getSource().getId().includes("DestinationTravel1");
            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty("/inputForm/sedeFinalDiferente", isYes);
            this.byId("lblDestinatiFinish").setVisible(isYes);
            this.byId("DestinationFinishChemicals").setVisible(isYes);
            if (!isYes) {
                this.byId("DestinationFinishChemicals").setValue("");
                oModel.setProperty("/inputForm/destinoFinal", "");
                oModel.setProperty("/inputForm/destinoFinalText", "");
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
        // Para validar el pedido con referencia por perfil
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
            if (!oItem) {
                oModelProyect.setProperty("/inputForm/tipDocument", "");
                oModelProyect.setProperty("/inputForm/txtTipDocument", "");
                oModelProyect.setProperty("/isFormEnabled", false);
                oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", true);
                oModelProyect.setProperty("/inputForm/tipoReferencia", "");
                oModelProyect.setProperty("/inputForm/docRefSeleccionado", null);
                oModelProyect.setProperty("/inputForm/posRefSeleccionadas", []);

                if (this._updateFormState) {
                    this._updateFormState();
                }
                if (this._updateBtnPedidoReferenciaVisibility) {
                    this._updateBtnPedidoReferenciaVisibility();
                }
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
                        // CONFIRMADO → guardo y BLOQUEO el combo
                        oModelProyect.setProperty("/inputForm/tipDocument", sKey);
                        oModelProyect.setProperty("/inputForm/txtTipDocument", sText);
                        oModelProyect.setProperty("/isFormEnabled", !!sKey);
                        oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", false);

                        this._applyCondPagoForDocType(sKey);

                        // Limpio referencias de pedido
                        oModelProyect.setProperty("/inputForm/tipoReferencia", "");
                        oModelProyect.setProperty("/inputForm/docRefSeleccionado", null);
                        oModelProyect.setProperty("/inputForm/posRefSeleccionadas", []);

                        if (this._updateFormState) {
                            this._updateFormState();
                        }
                        if (this._updateBtnPedidoReferenciaVisibility) {
                            this._updateBtnPedidoReferenciaVisibility();
                        }

                    } else {
                        oCombo.setSelectedKey("");
                        oModelProyect.setProperty("/inputForm/tipDocument", "");
                        oModelProyect.setProperty("/inputForm/txtTipDocument", "");
                        oModelProyect.setProperty("/isFormEnabled", false);
                        oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", true);

                        // También limpiamos referencias de pedido
                        oModelProyect.setProperty("/inputForm/tipoReferencia", "");
                        oModelProyect.setProperty("/inputForm/docRefSeleccionado", null);
                        oModelProyect.setProperty("/inputForm/posRefSeleccionadas", []);

                        if (this._updateFormState) {
                            this._updateFormState();
                        }
                        if (this._updateBtnPedidoReferenciaVisibility) {
                            this._updateBtnPedidoReferenciaVisibility();
                        }
                    }
                }.bind(this)
            });
        },


        // Manejo de Dialog Para Referencia
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
                        const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/SepCli?&$top=10000&$format=json&sap-language=es-ES";
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/SepCli?&$top=10000&$format=json&sap-language=es-ES";
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
                        sSalesOrg = "1120";
                    }
                    if (!sSalesDocType && oModelProyect) {
                        sSalesDocType = oModelProyect.getProperty("/inputForm/tipoReferencia") || "";
                    }
                    if (sSalesDocType === "ZPSE" && oModelProyect) {
                        // 👉 aquí usamos lo que setea onClienteSepSuggestionItemSelected
                        sCustomer = oModelProyect.getProperty("/inputForm/clienteSep") || "";
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
                    const sPath = sBasePath + "?" + sFilter + "&&$top=10000&$format=json&sap-language=es-ES";
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
                                oResp.oResults = oData.data || [];
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
                    const sPath = sBasePath + "?" + sFilter + "&&$top=10000&$format=json&sap-language=es-ES";

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

        // BTN para inicializar el dialog
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
        // Para Documentos Pendientes
        _loadDocumentosPendientes: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oDatClient = oModel.getProperty("/oDatClient") || {};
            let sCustomer = oModel.getProperty("/inputForm/clienteSepBusqueda") || "";
            const sTipoRef = oModel.getProperty("/inputForm/tipoReferencia") || "";

            if (!sCustomer) {
                sCustomer = oDatClient.Customer || "";
            }

            const sSalesDocType = sTipoRef;

            sap.ui.core.BusyIndicator.show(0);

            return this._getDocRefPendiente(sCustomer, sSalesDocType).then(oResp => {
                sap.ui.core.BusyIndicator.hide();

                const aRaw = oResp.oResults || [];

                const aMap = aRaw.map(function (row) {
                    const dFechaInicio = sTipoRef === "ZACN"
                        ? (row.GValidFrom || row.BValidFrom)
                        : row.BValidFrom;

                    const dFechaFin = sTipoRef === "ZACN"
                        ? (row.GValidto || row.GValidTo || row.BValidTo)
                        : row.BValidTo;

                    return {
                        DocComercial: row.SalesDocument,
                        ClDocum: row.SalesDocumentType + " - " + row.DscType,
                        FechaInicio: Formatter.formatODataDateNoTZ(dFechaInicio),
                        FechaFin: Formatter.formatODataDateNoTZ(dFechaFin),
                        _raw: row
                    };
                });

                oModel.setProperty("/aDocsPendientesRef", aMap);
                return aMap;

            }).catch(oError => {
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
        // Para la tabla Final

        _loadPosicionesDocumento: function (oDocHeader) {
            const oModel = this.getView().getModel("oModelProyect");

            const sSalesDocument =
                oDocHeader.SalesDocument ||
                oDocHeader.DocComercial ||
                (oDocHeader._raw && oDocHeader._raw.SalesDocument) ||
                "";

            if (!sSalesDocument) {
                oModel.setProperty("/aPosDocRef", []);
                return;
            }

            this._getPedConRefItem(sSalesDocument).then(oResp => {
                const aRaw = oResp.oResults || [];
                const sTipoRef = oModel.getProperty("/inputForm/tipoReferencia") || "";

                const aPos = aRaw.map(row => {
                    const nPend = this._parseQtyInput(row.CanPend || "0");

                    return {
                        Pos: row.SalesDocumentItem || "",
                        Material: row.Material || "",
                        Descripcion: row.SalesDocumentItemText || "",
                        CtdOriginal: row.OrderQuantity || "0.000",
                        CtdPendiente: row.CanPend || "0.000",
                        CtdPedido: "0.000",
                        UM: row.OrderQuantityUnit || "",
                        SinPendiente: nPend <= 0,

                        RefDoc: row.SalesDocument || sSalesDocument,
                        RefDocIt: row.SalesDocumentItem || "",
                        RefDocCa:
                            row.RefDocCa ||
                            row.Refdocca ||
                            (sTipoRef === "ZCNA" ? "B" : (sTipoRef === "ZACN" || sTipoRef === "ZPSE" ? "G" : "")),

                        _raw: row
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
            if (!oItem) {
                return;
            }
            const oCtx = oItem.getBindingContext("oModelProyect");
            const oData = oCtx.getObject();
            const oModel = this.getView().getModel("oModelProyect");
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
                    name: "com.aris.registropedido.quimico.pe.view.dialogs.DlgPedidoReferencia",
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
                    name: "com.aris.registropedido.quimico.pe.view.dialogs.DlgTipoReferencia",
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
                    name: "com.aris.registropedido.quimico.pe.view.dialogs.DlgSeparacionesCliente",
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
            const sCliente = (oInput.getValue() || "").trim();

            if (!sCliente) {
                sap.m.MessageToast.show("Ingrese un cliente");
                return;
            }

            // Guardamos el cliente buscado para el filtro
            oModel.setProperty("/inputForm/clienteSepBusqueda", sCliente);

            if (this._oDlgSepCli) {
                this._oDlgSepCli.close();
            }

            // 🔹 Primero cargamos documentos, luego abrimos el diálogo
            this._loadDocumentosPendientes().then(() => {
                this._openDlgDocPendientes();
            });
        },
        _openDlgDocPendientes: function () {
            const oView = this.getView();
            if (!this._oDlgDocPend) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.quimico.pe.view.dialogs.DlgDocumentosPendientes",
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
        onDocPendientesContinuar: async function () {
            const oTable = this.byId("tblDocPendientes");
            const oItem = oTable.getSelectedItem();

            if (!oItem) {
                sap.m.MessageToast.show("Seleccione un documento");
                return;
            }

            const oContext = oItem.getBindingContext("oModelProyect");
            const oRow = oContext.getObject();
            const oModel = this.getView().getModel("oModelProyect");

            const oSeleccionado = {
                ...oRow,
                _raw: oRow._raw || oRow
            };

            oModel.setProperty("/inputForm/docRefSeleccionado", oSeleccionado);

            await this._loadDatosPedidoReferencia();

            const sSalesDocument =
                oSeleccionado.DocComercial ||
                oSeleccionado.SalesDocument ||
                (oSeleccionado._raw && oSeleccionado._raw.SalesDocument) ||
                "";

            await this._loadObsFromPedidoReferencia(sSalesDocument);

            if (this._oDlgDocPend) {
                this._oDlgDocPend.close();
            }

            this._openDlgDocPosiciones();
            this._loadPosicionesDocumento(oSeleccionado);
        },
        _openDlgDocPosiciones: function () {
            const oView = this.getView();

            if (!this._oDlgDocPos) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.quimico.pe.view.dialogs.DlgPosicionesDocumento",
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
            const aItems = oTable.getItems();
            const aSeleccionadas = [];
            let bError = false;

            for (let i = 0; i < aItems.length; i++) {
                const oItem = aItems[i];

                if (!oItem.getSelected()) {
                    continue;
                }

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

            if (!aSeleccionadas.length) {
                sap.m.MessageToast.show("Seleccione al menos una posición");
                return;
            }

            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty("/inputForm/posRefSeleccionadas", aSeleccionadas);

            if (this._oDlgDocPos) {
                this._oDlgDocPos.close();
            }

            const oDocRef = oModel.getProperty("/inputForm/docRefSeleccionado") || {};

            const sSalesDocument =
                oDocRef.SalesDocument ||
                oDocRef.DocComercial ||
                (oDocRef._raw && oDocRef._raw.SalesDocument) ||
                "";

            this._loadObsFromPedidoReferencia(sSalesDocument);
        },
        onPosRefSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");

            if (!oTable || !oModel) {
                return;
            }

            const bSelected = !!oEvent.getParameter("selected");
            const bSelectAll = !!oEvent.getParameter("selectAll");

            // Header: seleccionar todo
            if (bSelectAll && bSelected) {
                const aItems = oTable.getItems() || [];

                aItems.forEach((oItem) => {
                    const oCtx = oItem.getBindingContext("oModelProyect");
                    if (!oCtx) {
                        return;
                    }

                    const sPath = oCtx.getPath();
                    const oRow = oCtx.getObject() || {};

                    if (oRow.SinStock) {
                        return;
                    }

                    const nPend = this._parseQtyInput(oRow.CtdPendiente);
                    oModel.setProperty(sPath + "/CtdPedido", this._formatQtyInput(nPend));
                });

                return;
            }

            // Header: deseleccionar todo -> NO borrar nada
            if (bSelectAll && !bSelected) {
                return;
            }

            // Selección individual
            const oListItem = oEvent.getParameter("listItem");
            if (!oListItem) {
                return;
            }

            const oCtx = oListItem.getBindingContext("oModelProyect");
            if (!oCtx) {
                return;
            }

            const sPath = oCtx.getPath();
            const oRow = oCtx.getObject() || {};

            if (oRow.SinStock) {
                return;
            }

            // Solo al seleccionar llena con pendiente
            if (bSelected) {
                const nPend = this._parseQtyInput(oRow.CtdPendiente);
                oModel.setProperty(sPath + "/CtdPedido", this._formatQtyInput(nPend));
            }

            // Al deseleccionar no borrar nada
        },
        //Control de Navegacion entre Dialog
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
            this._clearPosDocRefSelection(false);
            this.byId("dlgPosicionesDocumento").close();
            this.byId("dlgDocumentosPendientes").open();
        },
        onDocPosicionesCancelar: function () {
            this._clearPosDocRefSelection(false);
            const oDlg = this.byId("dlgPosicionesDocumento") || this._oDlgDocPos;
            if (oDlg && oDlg.close) oDlg.close();
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
        onDlgPosDocRefAfterClose: function () {
            this._clearPosDocRefSelection(false);
        },

        // Control de Tipo de documentos y las funciones
        _updateFormState: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            if (!oModelProyect) {
                return;
            }
            const sTipoDoc = oModelProyect.getProperty("/inputForm/tipDocument") || "";
            const bShowSeparationDates =
                sTipoDoc === "ZPSE" ||
                sTipoDoc === "ZCNA" ||
                sTipoDoc === "ZACN";
            oModelProyect.setProperty("/inputForm/showSeparationDates", bShowSeparationDates);
            oModelProyect.setProperty("/inputForm/PedExport", sTipoDoc === "ZPEF");
            const bShowReasonOrd = (sTipoDoc === "ZGNA");
            oModelProyect.setProperty("/inputForm/showReasonOrd", bShowReasonOrd);
            if (!bShowReasonOrd) {
                oModelProyect.setProperty("/inputForm/reasonOrd", "");
                oModelProyect.setProperty("/inputForm/txtReasonOrd", "");
            }

            if (!bShowSeparationDates) {
                oModelProyect.setProperty("/inputForm/fechInicio", "");
                oModelProyect.setProperty("/inputForm/fechFin", "");
            }
        },
        // Control de la Rason
        onReasonOrdChange: function (oEvent) {
            this._handleSelectChange(
                oEvent,
                "/inputForm/reasonOrd",
                "/inputForm/txtReasonOrd"
            );
        },

        // Validacion para Los datos
        _validateRequiredFields: function () {
            let oModel = this.getView().getModel("oModelProyect");
            let oData = oModel.getProperty("/inputForm") || {};
            let aErrors = [];

            if (!oData.tipDocument) {
                aErrors.push("Debe seleccionar el tipo de documento");
            }

            let sCondPago = oData.cbCondPago;
            if (!sCondPago || sCondPago.trim() === "") {
                sCondPago = oModel.getProperty("/oClientData/vtext");
            }
            if (!sCondPago || sCondPago.trim() === "") {
                aErrors.push("Debe ingresar la condición de pago");
            } else {
                oData.cbCondPago = sCondPago;
            }

            if (!oData.tipoEntrega) {
                aErrors.push("Debe seleccionar una condición de entrega");
            }

            if (!oData.moneda) {
                aErrors.push("Debe seleccionar el tipo de moneda");
            }

            if (!oData.destinoQuimicos || oData.destinoQuimicos.trim() === "") {
                aErrors.push("Debe ingresar el destino de los químicos");
            }

            const oView = this.getView();
            const oDestinoFinalInput = oView.byId("DestinationFinishChemicals");
            if (oDestinoFinalInput.getVisible()) {
                if (!oData.destinoFinal || oData.destinoFinal.trim() === "") {
                    aErrors.push("Debe ingresar el destino final");
                }
            }

            if (oData.showSeparationDates) {
                if (!oData.fechFin || String(oData.fechFin).trim() === "") {
                    aErrors.push("Debe ingresar la fecha fin");
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

        getMonedaDescripcion: function (sKey) {
            if (!sKey) return "";
            const aMonedas = this.getView().getModel("oModelData").getProperty("/oTipMoney") || [];
            const oMoneda = aMonedas.find(item => item.sKey === sKey);
            return oMoneda ? oMoneda.sText : sKey;
        },
        _buildOCFileKey: function (file) {
            return [
                file.name || "",
                file.size || 0,
                file.lastModified || Date.now()
            ].join("|");
        },

        _resetOCFileUploader: function () {
            const oFileUploader = this.byId("fileUploader");

            if (!oFileUploader) {
                return;
            }

            if (oFileUploader.clear) {
                oFileUploader.clear();
            }

            if (oFileUploader.setValue) {
                oFileUploader.setValue("");
            }

            if (oFileUploader.oFileUpload) {
                oFileUploader.oFileUpload.value = "";
            }
        },

        _syncPendingOCFilesFromTokens: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oMultiInput = this.byId("fileTokenInput");

            if (!oModel || !oMultiInput) {
                return [];
            }

            const aPending = [];

            oMultiInput.getTokens().forEach(function (oToken) {
                const oFile = oToken.data("fileObj");
                const sKey = oToken.getKey();
                const sName = oToken.getText();

                if (oFile && sKey && sName) {
                    aPending.push({
                        key: sKey,
                        name: sName,
                        fileObj: oFile
                    });
                }
            });

            oModel.setProperty("/aOCFilesPending", aPending);
            return aPending;
        },

        _clearOCUploadState: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oMultiInput = this.byId("fileTokenInput");
            const oPI = this.byId("piUpload");

            if (oMultiInput) {
                oMultiInput.removeAllTokens();
            }

            if (oPI) {
                oPI.setVisible(false);
                oPI.setPercentValue(0);
                oPI.setDisplayValue("0%");
            }

            if (oModel) {
                oModel.setProperty("/aOCFilesPending", []);
            }

            this._resetOCFileUploader();
        },

        // Controla el Sharepoint
        handleFileChange: function (oEvent) {
            const oFileUploader = oEvent.getSource();
            const aFiles = oEvent.getParameter("files") ||
                (oFileUploader.oFileUpload && oFileUploader.oFileUpload.files) ||
                [];

            const oMultiInput = this.byId("fileTokenInput");

            if (!oMultiInput) {
                this._resetOCFileUploader();
                return;
            }

            const aPendingActual = this._syncPendingOCFilesFromTokens();

            const mKeysExistentes = new Set(
                aPendingActual.map(function (item) {
                    return item.key;
                })
            );

            Array.from(aFiles).forEach(function (file) {
                if (!file) {
                    return;
                }

                const sKey = this._buildOCFileKey(file);

                if (mKeysExistentes.has(sKey)) {
                    return;
                }

                const oToken = new sap.m.Token({
                    text: file.name,
                    key: sKey
                });

                oToken.data("fileObj", file);
                oMultiInput.addToken(oToken);

                mKeysExistentes.add(sKey);
            }.bind(this));

            this._syncPendingOCFilesFromTokens();
            this._resetOCFileUploader();
        },
        onUploadAllFiles: async function () {
            this._syncPendingOCFilesFromTokens();

            const oModel = this.getView().getModel("oModelProyect");
            const aPending = oModel ? (oModel.getProperty("/aOCFilesPending") || []) : [];

            if (!aPending.length) {
                sap.m.MessageToast.show("No hay archivos seleccionados.");
                return;
            }

            sap.m.MessageToast.show("Los archivos se subirán automáticamente cuando se cree el pedido.");
        },

        onClearOCUploadFiles: function () {
            this._clearOCUploadState();
            sap.m.MessageToast.show("Archivos adjuntos limpiados.");
        },
        handleTokenUpdate: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const sType = oEvent.getParameter("type");
            const aRemovedTokens = oEvent.getParameter("removedTokens") || [];

            if (sType === "removedAll") {
                oModel.setProperty("/aOCFilesPending", []);
            }

            if (aRemovedTokens.length > 0) {
                const mRemovedKeys = {};

                aRemovedTokens.forEach(function (oToken) {
                    const sKey = oToken.getKey();

                    if (sKey) {
                        mRemovedKeys[sKey] = true;
                    }
                });

                const aPending = oModel.getProperty("/aOCFilesPending") || [];

                const aPendingFiltrado = aPending.filter(function (item) {
                    return !mRemovedKeys[item.key];
                });

                oModel.setProperty("/aOCFilesPending", aPendingFiltrado);
            }

            setTimeout(function () {
                this._syncPendingOCFilesFromTokens();
                this._resetOCFileUploader();
            }.bind(this), 0);
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
        formatCondPagoDisplay: function (sCodigo, sTexto) {
            if (!sCodigo && !sTexto) return "";
            if (!sTexto) return sCodigo;
            if (!sCodigo) return sTexto;
            return `${sCodigo} - ${sTexto}`;
        },
        onUpdateFinishedQuimicos: function (oEvent) {
            var oTable = oEvent.getSource();
            var aItems = oTable.getItems();

            aItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("oModelProyect");
                if (!oCtx) { return; }

                var v = oCtx.getProperty("Clabs");
                var n = parseFloat(String(v || "0").replace(",", ".")) || 0;

                if (n <= 0) {
                    oItem.addStyleClass("myPlomText");
                } else {
                    oItem.removeStyleClass("myPlomText");
                }
            });
        },
        _clearPosDocRefSelection: function (bResetQty) {
            const oTable = this.byId("tblPosDocRef") || sap.ui.getCore().byId("tblPosDocRef");
            const oModel = this.getView().getModel("oModelProyect");
            if (!oTable || !oModel) return;

            // ✅ limpia selección visual
            oTable.removeSelections(true);

            // opcional: resetear cantidades de la tabla de referencia
            if (bResetQty) {
                const aData = oModel.getProperty("/aPosDocRef") || [];
                aData.forEach(r => { r.CtdPedido = "0.000"; });
                oModel.setProperty("/aPosDocRef", aData);
            }
        },

        _applyCondPagoForDocType: function (sDocType) {
            const oView = this.getView();
            const oModelP = oView.getModel("oModelProyect");
            const oModelD = oView.getModel("oModelData");
            const oCB = oView.byId("cbCondPago");

            if (!oCB || !oModelP || !oModelD) {
                return;
            }

            const aCond = oModelD.getProperty("/oConditionPay") || [];
            const oBind = oCB.getBinding("items");
            const Filter = sap.ui.model.Filter;
            const FO = sap.ui.model.FilterOperator;

            const norm = function (v) {
                return String(v || "").trim();
            };

            if (sDocType === "ZGNA") {
                if (!aCond.some(function (c) {
                    return norm(c.Conditionn) === "0100";
                })) {
                    aCond.unshift({
                        Conditionn: "0100",
                        DesCondition: "TRANFERENCIA GRATUITA MUESTRAS"
                    });
                    oModelD.setProperty("/oConditionPay", aCond);
                }

                setTimeout(function () {
                    if (oBind) {
                        oBind.filter([
                            new Filter("Conditionn", FO.EQ, "0100")
                        ]);
                    }
                    oModelP.setProperty("/inputForm/cbCondPago", "0100");
                    oModelP.setProperty("/inputForm/txtCondPago", "TRANFERENCIA GRATUITA MUESTRAS");
                    oCB.setSelectedKey("0100");
                }, 0);

                return;
            }

            // Para los demás documentos no forzar códigos aquí.
            // Solo dejar disponible la lógica normal.
            if (oBind) {
                oBind.filter([]);
            }
        },
        _loadDatosPedidoReferencia: function () {
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect");
            const oModelData = oView.getModel("oModelData");

            if (!oModel) {
                return Promise.resolve();
            }

            const oDocRef = oModel.getProperty("/inputForm/docRefSeleccionado") || null;

            if (!oDocRef) {
                return Promise.resolve();
            }

            const oRaw = oDocRef._raw || oDocRef;

            // =========================
            // MONEDA
            // =========================
            const sMoneda =
                oRaw.Currency ||
                oRaw.TransactionCurrency ||
                oRaw.Waerk ||
                "";

            if (sMoneda) {
                oModel.setProperty("/inputForm/moneda", sMoneda);

                const aMonedas = oModelData?.getProperty("/oTipMoney") || [];
                const oMon = aMonedas.find(x => x.sKey === sMoneda);
                oModel.setProperty("/inputForm/monedaText", oMon ? oMon.sText : sMoneda);
            }

            // =========================
            // CONDICIÓN DE PAGO
            // =========================
            const sCondPago =
                oRaw.PaymentCondition ||
                oRaw.Pmnttrms ||
                oRaw.PaymentTerms ||
                oRaw.Zterm ||
                "";

            if (sCondPago) {
                oModel.setProperty("/inputForm/cbCondPago", sCondPago);

                const aCondiciones = oModelData?.getProperty("/oConditionPay") || [];
                const oCond = aCondiciones.find(x => x.Conditionn === sCondPago);

                oModel.setProperty("/inputForm/txtCondPago", oCond ? (oCond.DesCondition || "") : "");
            }

            // =========================
            // DATOS REFERENCIA
            // =========================
            const sDeliveryCondition = String(
                oRaw.DeliveryCondition ||
                oRaw.DELIVERYCONDITION ||
                oRaw.ShipCond ||
                oRaw.ShippingCondition ||
                ""
            ).trim();

            const sCarrier = String(
                oRaw.Carrier ||
                oRaw.CARRIER ||
                ""
            ).trim();

            const sCarrierName = String(
                oRaw.CarrierName ||
                oRaw.CARRIERNAME ||
                ""
            ).trim();

            const sAgency = String(
                oRaw.Agency ||
                oRaw.AGENCY ||
                ""
            ).trim();

            const sFinalDestination = String(
                oRaw.FinalDestination ||
                oRaw.FINALDESTINATION ||
                ""
            ).trim();

            // =========================
            // TIPO ENTREGA
            // 02 -> Cliente Recoge
            // 01 + Agency -> Despacho Agencia
            // 01 sin Agency -> Despacho Directo
            // =========================
            const sCustomerGroup = String(
                oRaw.CustomerGroup ||
                oRaw.CUSTOMERGROUP ||
                ""
            ).trim();

            let sTipoEntrega = "";

            if (sDeliveryCondition === "02") {
                sTipoEntrega = "1";
            } else if (sDeliveryCondition === "01") {
                if (sAgency) {
                    sTipoEntrega = "2"; // Despacho Directo
                } else {
                    sTipoEntrega = (sCustomerGroup === "18") ? "3" : "2";
                }
            }

            if (sTipoEntrega) {
                oModel.setProperty("/inputForm/tipoEntrega", sTipoEntrega);
            }

            // =========================
            // DESTINO ENVÍO
            // usar FINALDESTINATION, pero mantener sedeFinalDiferente = false
            // =========================
            const aDestinos = oModel.getProperty("/oDestinosCliente") || [];
            const aFinalDestinos = oModel.getProperty("/oFinalDestinosCliente") || [];

            let oDestinoMatch = null;

            if (sFinalDestination) {
                oDestinoMatch =
                    aFinalDestinos.find(d =>
                        String(d.Id || d.Customer || d.Destination || d.Destinationid || "").trim() === sFinalDestination
                    ) ||
                    aDestinos.find(d =>
                        String(d.Id || d.Customer || d.Destination || d.Destinationid || "").trim() === sFinalDestination
                    ) ||
                    null;
            }

            oModel.setProperty("/inputForm/sedeFinalDiferente", false);

            if (oDestinoMatch) {
                const sKeyDestino =
                    oDestinoMatch.Id ||
                    oDestinoMatch.Destinationid ||
                    oDestinoMatch.Destination ||
                    oDestinoMatch.Customer ||
                    sFinalDestination;

                const sTextDestino =
                    oDestinoMatch.Text ||
                    oDestinoMatch.Destinationname ||
                    oDestinoMatch.Finaldestinationname ||
                    oDestinoMatch.Name ||
                    "";

                oModel.setProperty("/inputForm/destinoQuimicos", sKeyDestino);
                oModel.setProperty("/inputForm/destinoQuimicosText", sTextDestino);
            } else if (sFinalDestination) {
                oModel.setProperty("/inputForm/destinoQuimicos", sFinalDestination);
                oModel.setProperty("/inputForm/destinoQuimicosText", "");
            }

            oModel.setProperty("/inputForm/destinoFinal", "");
            oModel.setProperty("/inputForm/destinoFinalText", "");

            // =========================
            // TRANSPORTISTA
            // =========================
            const aTransportes = oModelData?.getProperty("/oTrasport") || [];
            let oCarrierMatch = null;

            if (sCarrier) {
                oCarrierMatch = aTransportes.find(t =>
                    String(t.Carrier || t.Customer || "").trim() === sCarrier
                ) || null;
            }

            if (!oCarrierMatch && sCarrierName) {
                oCarrierMatch = aTransportes.find(t =>
                    String(t.Name1 || t.Agencyname || "").trim() === sCarrierName
                ) || null;
            }

            if (sTipoEntrega === "1") {
                oModel.setProperty("/inputForm/transporte", "");
                oModel.setProperty("/inputForm/transporteText", "");
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                // no borrar toda la lista base
                // solo dejar lista filtrada vacía si realmente no aplica
                oModel.setProperty("/oAgenciasClienteFiltradas", []);
            } else {
                const sCarrierKey = oCarrierMatch ? (oCarrierMatch.Carrier || oCarrierMatch.Customer || sCarrier) : sCarrier;
                const sCarrierText = oCarrierMatch
                    ? (oCarrierMatch.Name1 || oCarrierMatch.Agencyname || sCarrierName || sCarrierKey)
                    : (sCarrierName || "");

                oModel.setProperty("/inputForm/transporte", sCarrierKey || "");
                oModel.setProperty("/inputForm/transporteText", sCarrierText || "");

                // =========================
                // RECONSTRUIR LISTA FILTRADA DE AGENCIAS
                // SIN BORRAR LA LISTA BASE
                // =========================
                const aAllAgencias = oModel.getProperty("/oAgenciasCliente") || [];

                let aFiltered = aAllAgencias;

                if (sCarrierKey) {
                    const aByCarrier = aAllAgencias.filter(row =>
                        String(row.Carrier || (row._raw && row._raw.Carrier) || "").trim() === String(sCarrierKey).trim()
                    );

                    // si encuentra por carrier, usar filtrada
                    // si no encuentra, conservar lista original para no dejar "Sin datos"
                    if (aByCarrier.length > 0) {
                        aFiltered = aByCarrier;
                    }
                }

                oModel.setProperty("/oAgenciasClienteFiltradas", aFiltered);

                // =========================
                // DR. AGENCIA
                // comparar Agency con Customer del ComboBox
                // =========================
                const sAgencyKey = (sTipoEntrega === "2")
                    ? sAgency
                    : ((sTipoEntrega === "3" && sCustomerGroup === "18") ? String(
                        oRaw.ShippingDestination ||
                        oRaw.SHIPPINGDESTINATION ||
                        ""
                    ).trim() : "");

                let oAgencyMatch =
                    aFiltered.find(a => String(a.Customer || "").trim() === String(sAgencyKey).trim()) ||
                    aAllAgencias.find(a => String(a.Customer || "").trim() === String(sAgencyKey).trim()) ||
                    null;

                if (oAgencyMatch) {
                    oModel.setProperty("/inputForm/direccionAgencia", oAgencyMatch.Customer || "");
                    oModel.setProperty("/inputForm/direccionAgenciaAddrText", oAgencyMatch.Agencyaddress || "");
                    oModel.setProperty("/inputForm/direccionAgenciaText", oAgencyMatch.Agencyname || "");
                    oModel.setProperty(
                        "/inputForm/agenciaFullText",
                        [oAgencyMatch.Agencyname, oAgencyMatch.Agencyaddress].filter(Boolean).join(" - ")
                    );
                } else {
                    oModel.setProperty("/inputForm/direccionAgencia", "");
                    oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                    oModel.setProperty("/inputForm/direccionAgenciaText", "");
                    oModel.setProperty("/inputForm/agenciaFullText", "");
                }
            }

            if (typeof this._updateResumenEntrega === "function") {
                this._updateResumenEntrega();
            }

            oModel.refresh(true);
            return Promise.resolve();
        },
        onPosRefCantidadChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const oCtx = oInput.getBindingContext("oModelProyect");
            const oModel = this.getView().getModel("oModelProyect");

            if (!oCtx || !oModel) {
                return;
            }

            const sPath = oCtx.getPath();
            const oRow = oCtx.getObject() || {};

            let nValor = this._parseQtyInput(oInput.getValue());
            const nPend = this._parseQtyInput(oRow.CtdPendiente);

            if (nPend <= 0) {
                nValor = 0;
                oInput.setValueState("None");
                oInput.setValueStateText("");
                oModel.setProperty(sPath + "/CtdPedido", this._formatQtyInput(0));
                return;
            }

            if (nValor < 0) {
                nValor = 0;
            }

            if (nValor > nPend) {
                nValor = nPend;
                oInput.setValueState("Error");
                oInput.setValueStateText("La cantidad no puede ser mayor que la cantidad pendiente.");
            } else {
                oInput.setValueState("None");
                oInput.setValueStateText("");
            }

            oModel.setProperty(sPath + "/CtdPedido", this._formatQtyInput(nValor));
        },

        _getRefValue: function (oRaw, aKeys) {
            for (const k of aKeys) {
                const v = oRaw?.[k];
                if (v !== undefined && v !== null && String(v).trim() !== "") {
                    return String(v).trim();
                }
            }
            return "";
        },

        _findByAnyKey: function (aList, aKeys, sValue) {
            const sNeedle = String(sValue || "").trim();
            if (!sNeedle || !Array.isArray(aList)) return null;

            return aList.find(item =>
                aKeys.some(k => String(item?.[k] || "").trim() === sNeedle)
            ) || null;
        },

        _setEmptyTransporte: function (oModel) {
            oModel.setProperty("/inputForm/transporte", "");
            oModel.setProperty("/inputForm/transporteText", "");
        },

        _setEmptyDirAgencia: function (oModel) {
            oModel.setProperty("/inputForm/direccionAgencia", "");
            oModel.setProperty("/inputForm/direccionAgenciaText", "");
            oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
        },

        _setEmptyDestinoFinal: function (oModel) {
            oModel.setProperty("/inputForm/destinoFinal", "");
            oModel.setProperty("/inputForm/destinoFinalText", "");
        },
        _normalizeComboSearch: function (sValue) {
            let sText = String(sValue || "").trim().toUpperCase();

            if (sText.normalize) {
                sText = sText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            }

            return sText
                .replace(/[.,;:/\\\-#°º]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        },

        _applyContainsFilterToCombos: function () {
            this._applyContainsFilterToCombo("inputTransporte");
            this._applyContainsFilterToCombo("cbDireccionAgencia");
        },

        _applyContainsFilterToCombo: function (sComboId) {
            const oCombo = this.byId(sComboId);

            if (!oCombo || !oCombo.setFilterFunction) {
                return;
            }

            const fnNormalize = this._normalizeComboSearch.bind(this);

            oCombo.setFilterFunction(function (sTerm, oItem) {
                const sNeedle = fnNormalize(sTerm);

                if (!sNeedle) {
                    return true;
                }

                const aTexts = [
                    oItem.getText && oItem.getText(),
                    oItem.getAdditionalText && oItem.getAdditionalText(),
                    oItem.getKey && oItem.getKey()
                ];

                return aTexts.some(function (sText) {
                    return fnNormalize(sText).indexOf(sNeedle) !== -1;
                });
            });
        },

        onChangeComboSoloSeleccion: function (oEvent) {
            const oCombo = oEvent.getSource();
            const sId = String(oCombo.getId() || "");
            const sValue = String(oCombo.getValue() || "").trim();

            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            const bEsTransporte = sId.includes("inputTransporte");
            const bEsAgencia = sId.includes("cbDireccionAgencia");

            const fnNorm = this._normalizeComboSearch.bind(this);

            const fnClearAgencia = function () {
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/agenciaFullText", "");
            };

            const fnClearTransporte = function () {
                oModel.setProperty("/inputForm/transporte", "");
                oModel.setProperty("/inputForm/transporteText", "");
                fnClearAgencia();
                oModel.setProperty("/oAgenciasClienteFiltradas", []);
            };

            if (!sValue) {
                if (bEsTransporte) {
                    fnClearTransporte();
                }

                if (bEsAgencia) {
                    fnClearAgencia();
                }

                this._updateResumenEntrega();
                return;
            }

            if (bEsTransporte) {
                const aTransportes = oModelData.getProperty("/oTrasport") || [];
                const sNeedle = fnNorm(sValue);

                let oMatch = null;

                const oSelectedItem = oCombo.getSelectedItem();
                if (oSelectedItem) {
                    const sKey = String(oSelectedItem.getKey() || "").trim();
                    oMatch = aTransportes.find(function (row) {
                        return String(row.Carrier || "").trim() === sKey;
                    });
                }

                if (!oMatch) {
                    const aContains = aTransportes.filter(function (row) {
                        const sCarrier = String(row.Carrier || "").trim();
                        const sName = String(row.Name1 || "").trim();
                        const sFull = [sName, sCarrier].filter(Boolean).join(" - ");

                        return fnNorm(sCarrier) === sNeedle ||
                            fnNorm(sName) === sNeedle ||
                            fnNorm(sFull) === sNeedle;
                    });

                    if (aContains.length === 1) {
                        oMatch = aContains[0];
                    }
                }

                if (!oMatch) {
                    fnClearTransporte();
                    oCombo.setSelectedKey("");
                    sap.m.MessageToast.show("Debe seleccionar un transportista de la lista.");
                    this._updateResumenEntrega();
                    return;
                }

                const sCarrier = String(oMatch.Carrier || "").trim();
                const sName = String(oMatch.Name1 || "").trim();

                oCombo.setSelectedKey(sCarrier);
                oCombo.setValue(sName);

                oModel.setProperty("/inputForm/transporte", sCarrier);
                oModel.setProperty("/inputForm/transporteText", sName);

                fnClearAgencia();

                const aAll = oModel.getProperty("/oAgenciasCliente") || [];
                let aFiltered = aAll.filter(function (row) {
                    const sRowCarrier = String(
                        row.Carrier ||
                        (row._raw && row._raw.Carrier) ||
                        ""
                    ).trim();

                    return sRowCarrier === sCarrier;
                });

                if (!aFiltered.length) {
                    const bHayCarrierEnAlguno = aAll.some(function (r) {
                        return String(r.Carrier || "").trim();
                    });

                    if (!bHayCarrierEnAlguno) {
                        aFiltered = aAll;
                    }
                }

                oModel.setProperty("/oAgenciasClienteFiltradas", aFiltered);
            }

            if (bEsAgencia) {
                const aAgencias = oModel.getProperty("/oAgenciasClienteFiltradas") || [];
                const sNeedle = fnNorm(sValue);

                let oMatch = null;

                const oSelectedItem = oCombo.getSelectedItem();
                if (oSelectedItem) {
                    const sKey = String(oSelectedItem.getKey() || "").trim();
                    const sText = String(oSelectedItem.getText() || "").trim();
                    const sAdditional = String(oSelectedItem.getAdditionalText() || "").trim();

                    oMatch = aAgencias.find(function (row) {
                        return String(row.Customer || "").trim() === sKey &&
                            String(row.Agencyaddress || "").trim() === sText &&
                            String(row.Agencyname || "").trim() === sAdditional;
                    }) || aAgencias.find(function (row) {
                        return String(row.Customer || "").trim() === sKey;
                    });
                }

                if (!oMatch) {
                    const aExact = aAgencias.filter(function (row) {
                        const sKey = String(row.Customer || "").trim();
                        const sAddress = String(row.Agencyaddress || "").trim();
                        const sAgency = String(row.Agencyname || "").trim();
                        const sFull = [sAddress, sAgency].filter(Boolean).join(" - ");

                        return fnNorm(sKey) === sNeedle ||
                            fnNorm(sAddress) === sNeedle ||
                            fnNorm(sAgency) === sNeedle ||
                            fnNorm(sFull) === sNeedle;
                    });

                    if (aExact.length === 1) {
                        oMatch = aExact[0];
                    }
                }

                if (!oMatch) {
                    fnClearAgencia();
                    oCombo.setSelectedKey("");
                    sap.m.MessageToast.show("Debe seleccionar una agencia de la lista.");
                    this._updateResumenEntrega();
                    return;
                }

                const sKey = String(oMatch.Customer || "").trim();
                const sAddrText = String(oMatch.Agencyaddress || "").trim();
                const sAgencyName = String(oMatch.Agencyname || "").trim();

                oCombo.setSelectedKey(sKey);
                oCombo.setValue(sAddrText);

                oModel.setProperty("/inputForm/direccionAgencia", sKey);
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", sAddrText);
                oModel.setProperty("/inputForm/direccionAgenciaText", sAgencyName);
                oModel.setProperty(
                    "/inputForm/agenciaFullText",
                    [sAgencyName, sAddrText].filter(Boolean).join(" - ")
                );
            }

            this._updateResumenEntrega();
        },

    });
});