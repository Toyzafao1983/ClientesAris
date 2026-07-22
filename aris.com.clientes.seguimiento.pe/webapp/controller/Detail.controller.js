sap.ui.define([
    "aris/com/clientes/seguimiento/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "aris/com/clientes/seguimiento/pe/model/models",
    "aris/com/clientes/seguimiento/pe/model/formatter",
    "aris/com/clientes/seguimiento/pe/services/Services",
    "aris/com/clientes/seguimiento/pe/util/util",
    'aris/com/clientes/seguimiento/pe/util/utilUI'
], (BaseController, Controller, models, formatter, Services, util, utilUI) => {
    "use strict";
    var that;
    var sTipo = "";
    var sCliente = "";
    var sEstado = "";
    var tUniNeg = "", tRol = "", tVar = "";
    var vcontDet = false;
    var sNumPedido = "";

    return BaseController.extend("aris.com.clientes.seguimiento.pe.controller.Detail", {
        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("Detail").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));



            this.frgIdDetailVGE = "frgIdDetailVGE";
            this.frgIdDetailCS = "frgIdDetailCS";
            this.frgIdDetailES = "frgIdDetailES";

            let sURL = window.parent.location.href;
            if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; that.sSalesOrg = "1110" };
            if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; that.sSalesOrg = "1120" };
            if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; that.sSalesOrg = "1130" };

            this._initFlpBackNavigation();

        },
        handleRouteMatched: function (bInit) {
            sap.ui.core.BusyIndicator.show(0);
            sNumPedido = this.oRouter.getHashChanger().hash.split("/")[1];

            // La flecha del FLP puede volver al listado sin ejecutar el botón
            // "Regresar" del detalle. Destruir aquí cualquier fragmento anterior
            // evita conservar controles con los mismos IDs al abrir otro pedido.
            this._destroyDetailFragment();

            this._getEstadoGeneral(sNumPedido).then((oEstadoResp) => {
                if (oEstadoResp && Array.isArray(oEstadoResp.oResults) && oEstadoResp.oResults.length > 0) {
                    sEstado = oEstadoResp.oResults[0].EstadoGeneral || "";
                } else {
                    sEstado = "";
                    void 0;
                }
                void 0;

                let aInvoices = [];
                if (oEstadoResp && Array.isArray(oEstadoResp.oResults)) {
                    oEstadoResp.oResults.forEach(r => {
                        if (Array.isArray(r.RawRecords)) {
                            r.RawRecords.forEach(rec => {
                                if (rec.Invoice && rec.Invoice.trim() !== "" && !aInvoices.includes(rec.Invoice)) {
                                    aInvoices.push(rec.Invoice);
                                }
                            });
                        }
                    });
                }
                void 0;

                return Promise.all([
                    this._getData(sNumPedido),
                    this._getUsers(),
                    Promise.resolve(oEstadoResp),
                    this._getDataPedido(sNumPedido, sEstado),
                    this._getDataFacturas(aInvoices),
                    this._getDataFil(sNumPedido)
                ]);
            }).then((values) => {
                sTipo = values[0].oResults[0].DscSalesDocumentType;
                let oDataDetalle = values[3].oResults;
                let aDeliveries = values[3].aDeliveries;
                let oDataEstado = values[2].oResults || [];

                oDataEstado = this._applyFinalizadoGraficoTransferenciaGratuita(oDataEstado, sTipo);
                let oFacturas = values[4].oResults || [];
                let oDataFil = values[5].oResults || [];


                if (oDataEstado.length > 0) {
                    sEstado = oDataEstado[0].EstadoGeneral || "";
                }


                that.getModel("oModelUser").setProperty("/bDetCeramicos", tUniNeg == "CERAMICOS");

                let sIdioma = that.getModel("oModelProyect").getProperty("/sIdioma");
                if (sIdioma == undefined) {
                    that._setLanguageModel("esp");
                } else {
                    that._setLanguageModel(sIdioma);
                }

                if (that.getModel("oModelProyect").getProperty("/oCabecera") == undefined) {
                    let jData = values[0].oResults[0];
                    that.getModel("oModelProyect").setProperty("/oCabecera", jData);
                }

                let sValoresVGECantPedi = 0;
                let sValoresVGECantDesp = 0;
                let sValoresVGECantPend = 0;

                oDataDetalle.forEach(function (item) {
                    sValoresVGECantPedi += that._getCantidadDocumento(item);
                    sValoresVGECantDesp += that._toNumber(item.TotalDelivered);
                    sValoresVGECantPend += that._toNumber(item.PendingQuantity);
                });

                that.getModel("oModelProyect").setProperty("/oValoresVGECantPedi", that.formatNumber(sValoresVGECantPedi));
                that.getModel("oModelProyect").setProperty("/oValoresVGECantDesp", that.formatNumber(sValoresVGECantDesp));
                that.getModel("oModelProyect").setProperty("/oValoresVGECantPend", that.formatNumber(sValoresVGECantPend));

                that.getModel("oModelUser").setProperty("/oAuxCotSep", vcontDet);
                that.getModel("oModelProyect").setProperty("/oDataEsta", oDataEstado);
                that.getModel("oModelProyect").setProperty("/oDetalle", oDataDetalle);
                that.getModel("oModelProyect").setProperty("/oFacturas", oFacturas);
                that.getModel("oModelProyect").setProperty("/oListCliente", oDataFil);
                that.getModel("oModelUser").setProperty("/bUniNeg", tUniNeg);

                let oUser = values[1].Resources[0];
                let oAttr = oUser["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];

                let oBPUser = "";

                if (oAttr && Array.isArray(oAttr.attributes)) {
                    const attr1 = oAttr.attributes.find(a => a.name === "customAttribute1");
                    const attr2 = oAttr.attributes.find(a => a.name === "customAttribute2");
                    const attr3 = oAttr.attributes.find(a => a.name === "customAttribute3");

                    if (attr1 && attr1.value) {
                        oBPUser = attr1.value.trim();
                    } else if (attr2 && attr2.value) {
                        oBPUser = attr2.value.trim();
                    }
                }



                that.getModel("oModelProyect").setProperty("/oTitulo", values[0].oResults[0].SalesDocument + ' ' + sTipo + ' - ' + values[0].oResults[0].Customer + ' ' + values[0].oResults[0].CustomerFullName);

                let sComponentDetailVGE = "DetailVGE";
                let sComponentDetailCS = "DetailCS";
                let sComponentDetailES = "DetailES";

                let vbDetail = this._byId("vbViewDetail");

                if (sEstado === "Rechazado") {
                    that.fragmentTable = sap.ui.xmlfragment(this.frgIdDetailES, that.route + ".view.fragments." + sComponentDetailES, that);
                    vbDetail.addItem(that.fragmentTable);
                } else {
                    if (sTipo === "Pedido Nacional" || sTipo === "T/Gratuita" || sTipo === "Expo" || sTipo === "Pedido Anticipos" || sTipo === "Pedido Caja Rapida" || sTipo === "Pedido Saldos") {
                        that.fragmentTable = sap.ui.xmlfragment(this.frgIdDetailVGE, that.route + ".view.fragments." + sComponentDetailVGE, that);
                        vbDetail.addItem(that.fragmentTable);
                    } else {
                        that.fragmentTable = sap.ui.xmlfragment(this.frgIdDetailCS, that.route + ".view.fragments." + sComponentDetailCS, that);
                        vbDetail.addItem(that.fragmentTable);
                        that._createExtraModelCS(values[0].oResults || []);

                    }
                }

                return that._getDataDespachos(aDeliveries);
            }).then((aDespachos) => {
                that.getModel("oModelProyect").setProperty("/oListDesp", aDespachos);

                return that._getDireccionCliente(sNumPedido);
            }).then(oDir => {
                void 0;
                sap.ui.core.BusyIndicator.hide(0);

            }).catch((oError) => {
                void 0;
                that.getMessageBox("error", that.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            });
        },
        _onPressNavButtonDetail: function () {
            this._cleanupDetailState();
            this.oRouter.navTo("View");
        },
        _destroyDetailFragment: function () {
            const oDetailContainer = this._byId("vbViewDetail");

            if (oDetailContainer) {
                // destroyItems elimina también los controles internos registrados
                // por UI5; removeAllItems solo los separa del contenedor.
                oDetailContainer.destroyItems();
            } else if (this.fragmentTable) {
                this.fragmentTable.destroy();
            }

            this.fragmentTable = null;
        },
        _cleanupDetailState: function () {
            const oModelProyect = this.getModel("oModelProyect");

            if (oModelProyect) {
                oModelProyect.setProperty("/oCabecera", undefined);
            }

            this._destroyDetailFragment();
            sTipo = "";
            sCliente = "";
            sEstado = "";
            tVar = "";
            vcontDet = false;
            sNumPedido = "";

        },
        _getData: function (sNumPedido) {
            that = this;
            try {
                var oResp = {
                    "sEstado": "E",
                    "oResults": []
                };
                return new Promise(function (resolve, reject) {
                    let sUrl = "";
                    let sSalesOrg = that.sSalesOrg || "1110";

                    // armar filtro con SalesOrg y SalesDocument
                    let sFilter = "$filter=SalesOrganization eq '" + sSalesOrg + "'";
                    if (sNumPedido) {
                        sFilter += " and SalesDocument eq '" + sNumPedido + "'";
                    }

                    if (that.local) {
                        const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?$top=8000&"
                            + sFilter + "&$format=json&sap-language=ES"; // 👈 agregado el &
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?$top=8000&"
                            + sFilter + "&$format=json&sap-language=ES"; // 👈 agregado el &
                        sUrl = sPath;
                    }

                    void 0;

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData, message) {
                                oResp.sEstado = "S";
                                oResp.oResults = oData.data;
                                if (Array.isArray(oData.data) && oData.data.length > 0) {
                                    sCliente = oData.data[0].Customer || "";
                                }
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
        _onPressNavigateDetail2: function (oEvent) {

            let oSource = oEvent.getSource();
            let oParentRow = oSource.getParent();
            let jRow = oParentRow.getBindingContext("oModelProyect");
            let jData = jRow.getObject();
            that.getModel("oModelProyect").setProperty("/oCabecera", jData);
            vcontDet = true;
            tVar = sNumPedido;
            that.fragmentTable.destroy();
            that.oRouter.navTo("Detail", {
                app: jData.SalesDocument
            });
        },
        _onPressNavRetCotSep: function (oEvent) {

            sNumPedido = tVar;
            that.fragmentTable.destroy();
            vcontDet = false;
            that.oRouter.navTo("Detail", {
                app: sNumPedido
            });
        },
        _normalizeDocumentFlowData: function (data) {
            const grouped = {};
            (Array.isArray(data) ? data : []).forEach(r => {
                const key = `${r.SalesDocument}|${r.Delivery}|${r.Invoice}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        ...r,
                        ClearingDocument: r.ClearingDocument ? [r.ClearingDocument] : []
                    };
                } else if (r.ClearingDocument && !grouped[key].ClearingDocument.includes(r.ClearingDocument)) {
                    grouped[key].ClearingDocument.push(r.ClearingDocument);
                }
            });

            return Object.values(grouped).reduce((acc, r) => {
                if (!acc[r.SalesDocument]) {
                    acc[r.SalesDocument] = [];
                }
                acc[r.SalesDocument].push(r);
                return acc;
            }, {});
        },
        _buildEstadosFromDocumentFlow: function (recordsBySalesDoc) {
            const norm = v => String(v ?? "").trim().toUpperCase();
            const aFinal = [];

            for (const [salesDoc, records] of Object.entries(recordsBySalesDoc || {})) {
                let PendienteAprobacion = "";
                let PedidoRechazado = "";
                let Aprobado = "";
                let EnPreparacion = "";
                let Facturacion = "";
                let Finalizado = "";
                let EstadoGeneral = "";

                const deliveries = [...new Set(records.map(r => norm(r.Delivery)).filter(Boolean))];
                const hasDeliveries = deliveries.length > 0;

                if (!hasDeliveries) {
                    const r = records[0] || {};
                    const sProc = norm(r.OverallSDProcessStatus);
                    const sRej = norm(r.OverallSDDocumentRejectionSts);
                    const sTotDel = norm(r.OverallTotalDeliveryStatus);
                    const sDel = norm(r.OverallDeliveryStatus);
                    const sBlock = norm(r.OverallDeliveryBlockStatus);

                    if ((sProc === "A" || sProc === "B") &&
                        (sRej === "A" || sRej === "B") &&
                        (sTotDel === "A" || sTotDel === "B") &&
                        sDel === "A" &&
                        sBlock === "C") {
                        PendienteAprobacion = "OK";
                        EstadoGeneral = "Pend. Aprobación";
                    } else if (sProc === "C" &&
                        sRej === "C" &&
                        sTotDel === "C" &&
                        sDel === "A" &&
                        (sBlock === "C" || sBlock === "")) {
                        PedidoRechazado = "OK";
                        EstadoGeneral = "Rechazado";
                    } else if (sProc === "A" &&
                        sRej === "A" &&
                        sTotDel === "A" &&
                        sDel === "A" &&
                        sBlock === "") {
                        PendienteAprobacion = "OK";
                        Aprobado = "OK";
                        EstadoGeneral = "Aprobado";
                    }
                } else {
                    const facturasValidas = records.filter(r => {
                        const sInvoice = norm(r.Invoice);
                        const sCancelled = norm(r.BillingDocumentIsCancelled);
                        const bCancelled = sCancelled === "X" || sCancelled === "TRUE" || sCancelled === "1";
                        return !!sInvoice && !bCancelled;
                    });

                    const invoices = [...new Set(facturasValidas.map(r => norm(r.Invoice)).filter(Boolean))];
                    const hasInvoices = invoices.length > 0;
                    const singleRecord = records.length === 1;
                    const multipleRecordsSameSalesDoc = records.length > 1;
                    const hasStatusB = records.some(r => norm(r.OverallTotalDeliveryStatus) === "B");
                    const hasStatusC = records.some(r => norm(r.OverallTotalDeliveryStatus) === "C");
                    const hasRecordWithInvoice = records.some(r => !!norm(r.Invoice) && !(norm(r.BillingDocumentIsCancelled) === "X" || norm(r.BillingDocumentIsCancelled) === "TRUE" || norm(r.BillingDocumentIsCancelled) === "1"));
                    const hasRecordWithoutInvoice = records.some(r => !norm(r.Invoice));
                    const allHaveInvoices = deliveries.every(d => facturasValidas.some(f => norm(f.Delivery) === d));

                    if (singleRecord && hasInvoices) {
                        if (hasStatusC) {
                            const allCompensadas = facturasValidas.every(r => {
                                const cd = r.ClearingDocument;
                                return Array.isArray(cd) ? cd.length > 0 : !!norm(cd);
                            });

                            if (allCompensadas) {
                                Facturacion = "OK";
                                Finalizado = "OK";
                                EstadoGeneral = "Finalizado";
                            } else {
                                Facturacion = "OK";
                                EstadoGeneral = "Facturado";
                            }
                        } else if (hasStatusB) {
                            EnPreparacion = "Parcial";
                            Facturacion = "Parcial";
                            EstadoGeneral = "Despacho parcial";
                        }
                    } else if (multipleRecordsSameSalesDoc) {
                        if (hasStatusB && hasRecordWithInvoice) {
                            EnPreparacion = "Parcial";
                            Facturacion = "Parcial";
                            EstadoGeneral = "Despacho parcial";
                        } else if (hasStatusC && hasRecordWithInvoice && hasRecordWithoutInvoice) {
                            EnPreparacion = "Parcial";
                            Facturacion = "Parcial";
                            EstadoGeneral = "Despacho parcial";
                        } else if (hasInvoices && allHaveInvoices) {
                            const allTotalStatusC = records.every(r => norm(r.OverallTotalDeliveryStatus) === "C");
                            if (allTotalStatusC) {
                                const allCompensadas = facturasValidas.every(r => {
                                    const cd = r.ClearingDocument;
                                    return Array.isArray(cd) ? cd.length > 0 : !!norm(cd);
                                });

                                if (allCompensadas) {
                                    Facturacion = "OK";
                                    Finalizado = "OK";
                                    EstadoGeneral = "Finalizado";
                                } else {
                                    Facturacion = "OK";
                                    EstadoGeneral = "Facturado";
                                }
                            } else {
                                EnPreparacion = "Parcial";
                                Facturacion = "Parcial";
                                EstadoGeneral = "Despacho parcial";
                            }
                        } else if (hasDeliveries && !hasInvoices) {
                            EnPreparacion = "OK";
                            EstadoGeneral = "En preparación";
                        }
                    } else if (hasDeliveries && !hasInvoices) {
                        EnPreparacion = "OK";
                        EstadoGeneral = "En preparación";
                    }
                }

                if (EstadoGeneral === "Despacho parcial") {
                    PendienteAprobacion = PendienteAprobacion || "OK";
                    Aprobado = Aprobado || "OK";
                    EnPreparacion = "Parcial";
                    Facturacion = "Parcial";
                    Finalizado = "";
                } else if (EstadoGeneral === "Facturado") {
                    PendienteAprobacion = PendienteAprobacion || "OK";
                    Aprobado = Aprobado || "OK";
                    EnPreparacion = EnPreparacion || "OK";
                    Facturacion = "OK";
                } else if (EstadoGeneral === "Finalizado") {
                    PendienteAprobacion = PendienteAprobacion || "OK";
                    Aprobado = Aprobado || "OK";
                    EnPreparacion = EnPreparacion || "OK";
                    Facturacion = "OK";
                    Finalizado = "OK";
                } else if (EstadoGeneral === "En preparación") {
                    PendienteAprobacion = PendienteAprobacion || "OK";
                    Aprobado = Aprobado || "OK";
                    EnPreparacion = EnPreparacion || "OK";
                }

                aFinal.push({
                    SalesDocument: salesDoc,
                    PendienteAprobacion,
                    PedidoRechazado,
                    Aprobado,
                    EnPreparacion,
                    Facturacion,
                    Finalizado,
                    EstadoGeneral,
                    RawRecords: records
                });
            }

            return aFinal;
        },
        _getEstadoGeneral: function (sNumPedido) {
            var that = this;
            try {
                var oResp = { sEstado: "E", oResults: [] };
                let sFilter = "$filter=SalesDocument eq '" + sNumPedido + "'";

                return new Promise(function (resolve) {
                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DocumentFlow2?$top=8000&${sFilter}&$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DocumentFlow2?$top=8000&${sFilter}&$format=json&sap-language=ES`;
                        sUrl = sPath;
                    }

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                oResp.sEstado = "S";
                                const recordsBySalesDoc = that._normalizeDocumentFlowData(oData.data);
                                oResp.oResults = that._buildEstadosFromDocumentFlow(recordsBySalesDoc);
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
        _getDataDespacho: function (sNumPedido) {
            let that = this;
            try {
                var oResp = { sEstado: "E", oResults: [] };
                return new Promise(function (resolve, reject) {
                    let sUrl = "";
                    let sFilter = "$filter=DeliveryDocument eq '" + sNumPedido + "'";

                    if (that.local) {
                        const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DispatchList" +
                            "?" + sFilter + "&$format=json&sap-language=ES";
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DispatchList" +
                            "?" + sFilter + "&$format=json&sap-language=ES";
                        sUrl = sPath;
                    }

                    void 0;

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                oResp.sEstado = "S";

                                // Mapeo y reemplazo directo de la fecha
                                oResp.oResults = (oData.data || []).map(item => {
                                    return {
                                        ...item,
                                        ActualGoodsMovementDate: that.formatDate(item.ActualGoodsMovementDate)
                                    };
                                });
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

        _getDataDespachos: function (aDeliveries) {
            let that = this;
            let promises = aDeliveries.map(deliv => this._getDataDespacho(deliv));

            return Promise.all(promises).then(results => {
                // results es un array con {sEstado, oResults}
                let merged = [];
                results.forEach(r => {
                    if (r.sEstado === "S" && Array.isArray(r.oResults)) {
                        merged = merged.concat(r.oResults);
                    }
                });
                void 0;

                return merged;
            });
        },

        _getDataFacturas: function (aInvoices) {
            let that = this;
            try {
                if (!Array.isArray(aInvoices) || aInvoices.length === 0) {
                    void 0;
                    return Promise.resolve({ sEstado: "E", oResults: [] });
                }

                void 0;

                // 1️⃣ Crear promesas por cada factura usando la nueva CDS
                let promises = aInvoices.map(inv => {
                    void 0;
                    return this._getDataFactura(inv);
                });

                // 2️⃣ Ejecutarlas en paralelo
                return Promise.all(promises).then(results => {
                    void 0;

                    let merged = [];
                    results.forEach((r, idx) => {
                        void 0;
                        if (r.sEstado === "S" && Array.isArray(r.oResults)) {
                            merged = merged.concat(r.oResults);
                        }
                    });

                    void 0;
                    return { sEstado: "S", oResults: merged };
                });

            } catch (oError) {
                void 0;
                that.getMessageBox("error", that.getI18nText("sErrorTry"));
                return Promise.resolve({ sEstado: "E", oResults: [] });
            }
        },


        _getDataFactura: function (Invoice) {
            let that = this;
            try {
                var oResp = { sEstado: "E", oResults: [] };
                void 0;

                let sFilter = "$filter=Invoice eq '" + Invoice + "'";

                return new Promise(function (resolve) {
                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/FacNCND?${sFilter}&$expand=to_toNCND&$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/FacNCND?${sFilter}&$expand=to_toNCND&$format=json&sap-language=ES`;
                        sUrl = sPath;
                    }

                    void 0;

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                oResp.sEstado = "S";
                                let aFacturas = oData.data || [];

                                if (!Array.isArray(aFacturas) || aFacturas.length === 0) {
                                    resolve(oResp);
                                    return;
                                }

                                let aResults = aFacturas.map(factura => {
                                    // calcular monto total
                                    let neto = parseFloat(factura.TotalNetAmount) || 0;
                                    let impuesto = parseFloat(factura.TotalTaxAmount) || 0;
                                    factura.MontoTotal = (neto + impuesto).toFixed(2);

                                    // formato fechas
                                    factura.BillingDocumentDate = that.formatDate(factura.BillingDocumentDate);

                                    // 🔹 Aplanar DocumentReferenceID con salto de línea
                                    if (factura.to_toNCND && Array.isArray(factura.to_toNCND.results)) {
                                        let refs = factura.to_toNCND.results
                                            .map(nc => nc.DocumentReferenceID)
                                            .filter(Boolean); // quitar nulos
                                        factura.DocumentosNCND = refs.join("\n"); // 👈 salto de línea
                                    } else {
                                        factura.DocumentosNCND = "";
                                    }

                                    return factura;
                                });

                                oResp.oResults = aResults;
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
                void 0;
                that.getMessageBox("error", that.getI18nText("sErrorTry"));
                return Promise.resolve({ sEstado: "E", oResults: [] });
            }
        },

        _getDataFil: function (sNumPedido) {
            var that = this;
            try {
                var oResp = { sEstado: "E", oResults: [] };

                return new Promise(function (resolve) {

                    let sUrlOrderForQuotation;
                    let sFilterQ = "$filter=Quotation eq '" + sNumPedido + "'";

                    if (that.local) {
                        const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderForQuotation?" +
                            sFilterQ + "&$format=json&sap-language=ES";
                        sUrlOrderForQuotation = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderForQuotation?" +
                            sFilterQ + "&$format=json&sap-language=ES";
                        sUrlOrderForQuotation = sPath;
                    }

                    Services.getoDataERPSync(that, sUrlOrderForQuotation, function (resultQ) {
                        util.response.validateAjaxGetERPNotMessage(resultQ, {
                            success: function (oDataQ) {
                                if (!oDataQ.data || !Array.isArray(oDataQ.data)) {
                                    void 0;
                                    resolve({ sEstado: "S", oResults: [] });
                                    return;
                                }

                                // Extraer valores de Orderr devueltos por la CDS
                                let aOrders = oDataQ.data
                                    .map(item => item.Orderr)
                                    .filter(Boolean);

                                if (aOrders.length === 0) {
                                    resolve({ sEstado: "S", oResults: [] });
                                    return;
                                }

                                void 0;

                                let sSalesOrg = that.sSalesOrg || "1110";
                                let sFilter = "$filter=SalesOrganization eq '" + sSalesOrg +
                                    "' and Customer eq '" + sCliente + "'" +
                                    " and SalesDocument ne '" + sNumPedido + "'";


                                let sOrdersFilter = aOrders
                                    .filter(o => o !== sNumPedido)
                                    .map(o => "SalesDocument eq '" + o + "'")
                                    .join(" or ");

                                if (sOrdersFilter) {
                                    sFilter += " and (" + sOrdersFilter + ")";
                                }

                                let sUrlOrderTracking;
                                if (that.local) {
                                    const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?$top=8000&" +
                                        sFilter + "&$format=json&sap-language=ES";
                                    sUrlOrderTracking = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                                } else {
                                    const sPath = jQuery.sap.getModulePath(that.route) +
                                        "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?$top=8000&" +
                                        sFilter + "&$format=json&sap-language=ES";
                                    sUrlOrderTracking = sPath;
                                }

                                Services.getoDataERPSync(that, sUrlOrderTracking, function (result) {
                                    util.response.validateAjaxGetERPNotMessage(result, {
                                        success: function (oData) {
                                            oResp.sEstado = "S";
                                            if (!oData.data || !Array.isArray(oData.data)) {
                                                void 0;
                                                oResp.oResults = [];
                                                resolve(oResp);
                                                return;
                                            }

                                            let aResults = oData.data.map(item => {
                                                let dDoc = that.parseODataDate(item.SalesDocumentDate);
                                                let dReq = that.parseODataDate(item.RequestedDeliveryDate);

                                                let ruc = [
                                                    item.TaxNumber1, item.TaxNumber2, item.TaxNumber3,
                                                    item.TaxNumber4, item.TaxNumber5, item.TaxNumber6
                                                ].find(v => v && v.trim() !== "") || "";

                                                return {
                                                    SalesDocument: item.SalesDocument,
                                                    CustomerFullName: item.CustomerFullName,
                                                    RUC: ruc,
                                                    Vendor: item.Vendor || "",
                                                    SalesOrganization: item.SalesOrganization,
                                                    TotalNetAmount: parseFloat(item.TotalNetAmount) || 0,
                                                    TransactionCurrency: item.TransactionCurrency,
                                                    SalesDocumentDate: that.formatDate(dDoc),
                                                    RequestedDeliveryDate: that.formatDate(dReq),
                                                    DscSalesDocumentType: item.DscSalesDocumentType
                                                };
                                            });


                                            that._getEstadoGeneralFil().then(oEstado => {
                                                if (oEstado.sEstado === "S") {
                                                    const estadosMap = {};
                                                    oEstado.oResults.forEach(e => {
                                                        estadosMap[e.SalesDocument] = e.EstadoGeneral;
                                                    });

                                                    let enriched = aResults.map(it => ({
                                                        ...it,
                                                        EstadoGeneral: estadosMap[it.SalesDocument] || ""
                                                    }));


                                                    oResp.oResults = enriched;
                                                    resolve(oResp);
                                                } else {
                                                    oResp.oResults = aResults;
                                                    resolve(oResp);
                                                }
                                            });
                                        },
                                        error: function (err) {
                                            void 0;
                                            oResp.oResults = [];
                                            resolve(oResp);
                                        }
                                    });
                                });
                            },
                            error: function (errQ) {
                                void 0;
                                resolve({ sEstado: "S", oResults: [] });
                            }
                        });
                    });
                });
            } catch (e) {
                void 0;
                that.getMessageBox("error", that.getI18nText("sErrorTry"));
            }
        },
        _getEstadoGeneralFil: function () {
            var that = this;
            try {
                var oResp = { sEstado: "E", oResults: [] };
                const sSalesOrg = that.sSalesOrg;
                let sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;

                return new Promise(function (resolve) {
                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DocumentFlow2?$top=8000&${sFilter}&$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DocumentFlow2?$top=8000&${sFilter}&$format=json&sap-language=ES`;
                        sUrl = sPath;
                    }

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                oResp.sEstado = "S";
                                const recordsBySalesDoc = that._normalizeDocumentFlowData(oData.data);
                                oResp.oResults = that._buildEstadosFromDocumentFlow(recordsBySalesDoc);
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
        _getNotasCredito: function (sInvoice) {
            let that = this;
            try {
                // 👇 importante: usar mayúscula
                let sFilter = "$filter=Invoice eq '" + sInvoice + "'";
                void 0;

                return new Promise(function (resolve) {
                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/GetNCND?${sFilter}&$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/GetNCND?${sFilter}&$format=json&sap-language=ES`;
                        sUrl = sPath;
                    }

                    void 0;

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                let notas = [];
                                if (oData.data && Array.isArray(oData.data)) {
                                    notas = oData.data.map(item => item.nota || "").filter(Boolean);
                                }
                                resolve(notas);
                            },
                            error: function () {
                                resolve([]);
                            }
                        });
                    });
                });

            } catch (e) {
                void 0;
                return Promise.resolve([]);
            }
        },
        _createExtraModelCS: function (oResults) {
            try {
                const aExtraData = (oResults || []).map(item => {
                    let tipo = "";
                    let fechaInicio = "";
                    let fechaFin = "";

                    if (item.SDDocumentCategory === "B") {
                        tipo = "Cotización";
                        fechaInicio = that.formatDate(item.BindingPeriodValidityStartDate) || "";
                        fechaFin = that.formatDate(item.BindingPeriodValidityEndDate) || "";
                    } else if (item.SDDocumentCategory === "G") {
                        tipo = "Separación";
                        fechaInicio = that.formatDate(item.AgrmtValdtyStartDate) || "";
                        fechaFin = that.formatDate(item.AgrmtValdtyEndDate) || "";
                    }

                    return {
                        TipoDoc: tipo,
                        FechaInicio: fechaInicio,
                        FechaFin: fechaFin
                    };
                });

                const oModelExtra = new sap.ui.model.json.JSONModel(aExtraData);
                that.getView().setModel(oModelExtra, "oModelExtra"); // 👈 nuevo modelo SOLO para CS
                void 0;
            } catch (e) {
                void 0;
            }
        },
        _getDireccionCliente: function (sNumPedido) {
            let that = this;
            try {
                return new Promise(function (resolve) {
                    // 1️⃣ Determinar PartnerFunction según unidad de negocio
                    let sPartner = "Z0"; // default
                    if (that.sSalesOrg === "1130") { // Cerámicos
                        sPartner = "WE";
                    }

                    // 2️⃣ Filtro OData
                    const sFilter = `$filter=SalesDocument eq '${sNumPedido}' and PartnerFunction eq '${sPartner}'`;

                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DirDes?${sFilter}&$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DirDes?${sFilter}&$format=json&sap-language=ES`;
                        sUrl = sPath;
                    }
                    // 3️⃣ Llamada OData
                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                let data = Array.isArray(oData.data) ? oData.data : [oData.data];
                                let direccionFinal = "";

                                if (data && data.length > 0) {
                                    direccionFinal = data.map(d => {
                                        let country = (d.Country === "PE") ? "PERÚ" : d.Country;
                                        return `${d.Street || ""}  ${d.HouseNumber || ""}  ${d.StrSuppl1 || ""}  ${d.StrSuppl2 || ""} - ${d.City2 || ""}  - ${d.City || ""} - ${d.RegionName || ""} - ${country || ""}`;
                                    }).join("\n");
                                }
                                // 4️⃣ Inyectar dirección en cada item de /oListDesp
                                let aDesp = that.getModel("oModelProyect").getProperty("/oListDesp") || [];
                                aDesp = aDesp.map(d => ({
                                    ...d,
                                    Direccion: direccionFinal,
                                    HeaderGrossWeight: that.formatNumber(d.HeaderGrossWeight),
                                    HeaderNetWeight: that.formatNumber(d.HeaderNetWeight),
                                    ActualDeliveryQuantity: parseFloat(d.ActualDeliveryQuantity).toFixed(0)


                                }));
                                that.getModel("oModelProyect").setProperty("/oListDesp", aDesp);

                                resolve({ Direccion: direccionFinal });
                            },
                            error: function () {
                                void 0;
                                resolve({ Direccion: "" });
                            }
                        });
                    });
                });
            } catch (e) {
                void 0;
                return Promise.resolve({ Direccion: "" });
            }
        },
        _getDataPedido: function (sNumPedido, sEstado) {
            that = this;
            try {
                var oResp = { sEstado: "E", oResults: [], aDeliveries: [] };

                return new Promise(function (resolve) {
                    let sUrl = "";
                    let sFilter = "$filter=SalesDocument eq '" + sNumPedido + "'";

                    if (that.local) {
                        const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderDetails" +
                            "?" + sFilter + "&$format=json&sap-language=ES";
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderDetails" +
                            "?" + sFilter + "&$format=json&sap-language=ES";
                        sUrl = sPath;
                    }

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                oResp.sEstado = "S";
                                let data = oData.data || [];
                                if (!Array.isArray(data)) {
                                    data = [data];
                                }

                                // === 1) Deliveries únicos ===
                                const setDeliveries = new Set();
                                data.forEach(item => {
                                    if (item.DeliveryDocument && item.DeliveryDocument.trim() !== "") {
                                        setDeliveries.add(item.DeliveryDocument);
                                    }
                                });
                                oResp.aDeliveries = Array.from(setDeliveries);

                                // === 2) Agrupar por posición ===
                                const grouped = {};
                                data.forEach(item => {
                                    const pos = item.SalesDocumentItem || "0000";
                                    if (!grouped[pos]) {
                                        grouped[pos] = {
                                            ...item,
                                            _orderQty: that._getCantidadDocumento(item),
                                            _sumQtyConvert: 0,
                                            _posDeliveries: new Set()
                                        };
                                    }

                                    const qc = parseFloat(item.QuantityConvert) || 0;
                                    grouped[pos]._sumQtyConvert += qc;

                                    if (item.DeliveryDocument && item.DeliveryDocument.trim() !== "") {
                                        grouped[pos]._posDeliveries.add(item.DeliveryDocument);
                                    }

                                    const tipBultoRaw = item.TipBulto || item.tipbulto || "";
                                    if (tipBultoRaw && tipBultoRaw.trim() !== "") {
                                        grouped[pos].TipBulto = tipBultoRaw;
                                    }
                                });

                                // === 3) Normalizar con cálculos ===
                                const EPS = 1e-4;
                                const normalized = Object.entries(grouped).map(([pos, r]) => {
                                    const ordered = r._orderQty;       // fijo
                                    const delivered = r._sumQtyConvert;  // sumado
                                    let pending = ordered - delivered;

                                    if (Math.abs(pending) < EPS) pending = 0;
                                    if (pending < 0) pending = 0;

                                    let EstadoPosicion = "";
                                    switch (sEstado) {
                                        case "Pend. Aprobación":
                                        case "Pendiente Aprobación":
                                        case "Pend. Aprobacion":
                                        case "Pendiente Aprobacion":
                                            EstadoPosicion = "Por aprobar";
                                            break;

                                        case "Rechazado":
                                            EstadoPosicion = "Cerrado";
                                            break;

                                        case "Aprobado":
                                            EstadoPosicion = "Aprobado";
                                            break;

                                        case "Despacho parcial":
                                        case "En preparación":
                                        case "En preparacion":
                                            if (pending <= EPS) {
                                                EstadoPosicion = "Cerrada";
                                            } else if (delivered <= EPS) {
                                                EstadoPosicion = "Pendiente";
                                            } else {
                                                EstadoPosicion = "Parcial";
                                            }
                                            break;

                                        case "Finalizado":
                                        case "Facturado":
                                        case "Facturacion":
                                            EstadoPosicion = "Cerrado";
                                            break;

                                        default:
                                            EstadoPosicion = "";
                                    }

                                    // Paletas y Cajas en base a cantidad pedida
                                    const PalletUmren = parseFloat(r.PalletUmren) || 0;
                                    const PalletUmrez = parseFloat(r.PalletUmrez) || 0;
                                    const CajaUmren = parseFloat(r.CajaUmren) || 0;
                                    const CajaUmrez = parseFloat(r.CajaUmrez) || 0;

                                    const nroPaletas = PalletUmrez !== 0 ? (ordered * PalletUmren) / PalletUmrez : 0;
                                    const nroCajas = CajaUmrez !== 0 ? (ordered * CajaUmren) / CajaUmrez : 0;

                                    const tipBultoRaw = r.TipBulto || r.tipbulto || "";
                                    const TipBultoFinal = (tipBultoRaw && tipBultoRaw.trim() !== "") ? tipBultoRaw : "C";

                                    return {
                                        ...r,
                                        SalesDocumentItem: pos,
                                        OrderQuantity: that.formatNumber(ordered, 2),
                                        TargetQuantity: that.formatNumber(parseFloat(r.TargetQuantity || "0") || 0, 2),
                                        TotalDelivered: that.formatNumber(delivered, 2),
                                        PendingQuantity: that.formatNumber(pending, 2),
                                        EstadoPosicion,
                                        NroPaletas: Math.round(nroPaletas),
                                        NroCajas: Math.round(nroCajas),
                                        TipBulto: TipBultoFinal,
                                        PosDeliveries: Array.from(r._posDeliveries)
                                    };
                                });

                                oResp.oResults = normalized;
                                resolve(oResp);
                            },
                            error: function () {
                                oResp.oResults = [];
                                oResp.aDeliveries = [];
                                resolve(oResp);
                            }
                        });
                    });
                });
            } catch (oError) {
                that.getMessageBox("error", that.getI18nText("sErrorTry"));
            }
        },
        // Parser tolerante (F001-123456 o F001123456)
        _prefillDesdeFila: function (row) {
            // Usa tus utilidades existentes
            const raw = row?.DocumentReferenceID || row?.ReferenceDocumentNumber || "";
            const { serie, numero } = this._parseSerieNumeroFlexible(raw);
            const documentType = this._detectTipoPorSerie(serie, row?.DocumentReferenceID ? "01" : (row?.ReferenceDocumentNumber ? "09" : ""));
            const issueDateRaw = row?.BillingDocumentDate || row?.ActualGoodsMovementDate || "";
            const issueDate = /^\d{8}$/.test(issueDateRaw)
                ? `${issueDateRaw.slice(0, 4)}-${issueDateRaw.slice(4, 6)}-${issueDateRaw.slice(6, 8)}`
                : (issueDateRaw || "");

            const ruc = row?.RUCEmisor || row?.EmisorRUC ||
                this.getModel("oModelProyect")?.getProperty("/Emisor/RUC") ||
                this.getModel("oModelProyect")?.getProperty("/inputForm/rucProveedor") || "";

            return {
                accountingSupplierPartyId: ruc,
                documentType: documentType || "01",
                documentSerie: serie || "",
                documentNumber: numero || "",
                issueDate,
                fileType: "PDF"
            };
        },

        onAbrirTestEcomprobantes: async function (oEvent, sTipoDocumento = "FACTURA") {
            const oCtx = oEvent.getSource().getBindingContext("oModelProyect");
            if (!oCtx) {
                sap.m.MessageBox.warning("No se pudo determinar el documento seleccionado.");
                return;
            }

            const oRow = oCtx.getObject() || {};
            const sRucEmisor = "20100257298";

            let sDocRef = "";
            let issueDate = "";
            let sTotalAmount = "";

            if (sTipoDocumento === "GUIA") {
                sDocRef = String(oRow.ReferenceDocumentNumber || "").trim();

                if (!sDocRef) {
                    sap.m.MessageBox.warning("No existe guía o la guía aún está en preparación.");
                    return;
                }

                // Ajusta aquí el campo fecha real de la guía si corresponde
                // Ejemplo: oRow.ReferenceDocumentDate, oRow.DeliveryDocumentDate, etc.
                if (oRow.ReferenceDocumentDate) {
                    const aDate = String(oRow.ReferenceDocumentDate).split("-");
                    if (aDate.length === 3) {
                        const [dd, mm, yyyy] = aDate;
                        issueDate = `${yyyy}-${mm}-${dd}`;
                    }
                }

                sTotalAmount = "0.00";
            } else {
                sDocRef = String(oRow.DocumentReferenceID || "").trim();

                if (!sDocRef) {
                    sap.m.MessageBox.warning("El registro no tiene DocumentReferenceID.");
                    return;
                }

                if (oRow.BillingDocumentDate) {
                    const aDate = String(oRow.BillingDocumentDate).split("-");
                    if (aDate.length === 3) {
                        const [dd, mm, yyyy] = aDate;
                        issueDate = `${yyyy}-${mm}-${dd}`;
                    }
                }

                sTotalAmount = oRow.MontoTotal || "";
            }

            // Formato esperado: TT-SERIE-NUMERO
            const aParts = sDocRef.split("-");
            if (aParts.length < 3) {
                sap.m.MessageBox.warning("El identificador del documento no tiene el formato esperado (TT-SERIE-NÚMERO).");
                return;
            }

            const tDoc = (aParts[0] || "").trim();
            const sFact = (aParts[1] || "").trim();
            const cFact = (aParts.slice(2).join("-") || "").trim();

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

        onAbrirTestEcomprobantesDesdeFila: function (oEvent) {
            const row = oEvent.getSource().getBindingContext("oModelProyect")?.getObject();
            const defaults = this._prefillDesdeFila(row);
            defaults.totalAmount = ""; // si lo quieres enviar
            this._abrirDialogoTestCPE(defaults);
        },

        _abrirDialogoTestCPE: function (prefill) {
            const dlg = new sap.m.Dialog({
                title: "Probar descarga CPE (POST)",
                contentWidth: "460px",
                content: [
                    new sap.m.Label({ text: "RUC Emisor (11 díg.)" }),
                    new sap.m.Input("dgf_inpRUC", { value: prefill.accountingSupplierPartyId || "" }),

                    new sap.m.Label({ text: "Tipo SUNAT (01=Factura, 03=Boleta, 09=Guía)" }),
                    new sap.m.Input("dgf_inpTipo", { value: prefill.documentType || "01" }),

                    new sap.m.Label({ text: "Serie" }),
                    new sap.m.Input("dgf_inpSerie", { value: prefill.documentSerie || "" }),

                    new sap.m.Label({ text: "Número" }),
                    new sap.m.Input("dgf_inpNumero", { value: prefill.documentNumber || "" }),

                    new sap.m.Label({ text: "Fecha Emisión (YYYY-MM-DD)" }),
                    new sap.m.Input("dgf_inpFecha", { value: prefill.issueDate || "" }),

                    new sap.m.Label({ text: "Total (opcional)" }),
                    new sap.m.Input("dgf_inpTotal", { value: prefill.totalAmount || "" }),

                    new sap.m.Label({ text: "Tipo de archivo" }),
                    new sap.m.Select("dgf_selFormato", {
                        selectedKey: prefill.fileType || "PDF",
                        items: ["PDF", "XML", "CDR"].map(k => new sap.ui.core.Item({ key: k, text: k }))
                    })
                ],
                beginButton: new sap.m.Button({
                    text: "Probar",
                    type: "Emphasized",
                    press: async () => {
                        const payload = {
                            accountingSupplierPartyId: sap.ui.getCore().byId("dgf_inpRUC").getValue().trim(),
                            documentType: sap.ui.getCore().byId("dgf_inpTipo").getValue().trim(),
                            documentSerie: sap.ui.getCore().byId("dgf_inpSerie").getValue().trim(),
                            documentNumber: sap.ui.getCore().byId("dgf_inpNumero").getValue().trim(),
                            issueDate: sap.ui.getCore().byId("dgf_inpFecha").getValue().trim(),
                            totalAmount: sap.ui.getCore().byId("dgf_inpTotal").getValue().trim(),
                            fileType: sap.ui.getCore().byId("dgf_selFormato").getSelectedKey()
                        };

                        try {
                            if (!/^\d{11}$/.test(payload.accountingSupplierPartyId)) throw new Error("RUC emisor inválido (11 dígitos).");
                            if (!payload.documentType) throw new Error("Falta documentType (01/03/09).");
                            if (!payload.documentSerie) throw new Error("Falta documentSerie.");
                            if (!payload.documentNumber) throw new Error("Falta documentNumber.");

                            sap.ui.core.BusyIndicator.show(0);
                            await this._downloadFromEcomprobantes(payload);  // ← usa tu helper POST
                            sap.m.MessageToast.show("Descarga OK (test).");
                        } catch (e) {
                            sap.m.MessageBox.error(e.message || "Error en la descarga.");
                        } finally {
                            sap.ui.core.BusyIndicator.hide();
                        }
                    }
                }),
                endButton: new sap.m.Button({ text: "Cerrar", press: function () { dlg.close(); dlg.destroy(); } })
            });
            this.getView().addDependent(dlg);
            dlg.open();
        },

        onAbrirPdfGuia: function (oEvent) {
            return this.onAbrirTestEcomprobantes(oEvent, "GUIA");
        },

        onAbrirTestEcomprobantes: async function (oEvent, sTipoDocumento = "FACTURA") {
            const oCtx = oEvent.getSource().getBindingContext("oModelProyect");
            if (!oCtx) {
                sap.m.MessageBox.warning("No se pudo determinar el documento seleccionado.");
                return;
            }

            const oRow = oCtx.getObject() || {};
            const sRucEmisor = "20100257298";

            let sDocRef = "";
            let issueDate = "";
            let sTotalAmount = "";

            if (sTipoDocumento === "GUIA") {
                sDocRef = String(oRow.ReferenceDocumentNumber || "").trim();

                if (!sDocRef) {
                    sap.m.MessageBox.warning("No existe guía o la guía aún está en preparación.");
                    return;
                }

                if (oRow.ActualGoodsMovementDate) {
                    const aDate = String(oRow.ActualGoodsMovementDate).split("-");
                    if (aDate.length === 3) {
                        const [dd, mm, yyyy] = aDate;
                        issueDate = `${yyyy}-${mm}-${dd}`;
                    }
                }

                sTotalAmount = "0.00";
            } else {
                sDocRef = String(oRow.DocumentReferenceID || "").trim();

                if (!sDocRef) {
                    sap.m.MessageBox.warning("El registro no tiene DocumentReferenceID.");
                    return;
                }

                if (oRow.BillingDocumentDate) {
                    const aDate = String(oRow.BillingDocumentDate).split("-");
                    if (aDate.length === 3) {
                        const [dd, mm, yyyy] = aDate;
                        issueDate = `${yyyy}-${mm}-${dd}`;
                    }
                }

                sTotalAmount = oRow.MontoTotal || "";
            }

            const aParts = sDocRef.split("-");
            if (aParts.length < 3) {
                sap.m.MessageBox.warning("El identificador del documento no tiene el formato esperado (TT-SERIE-NÚMERO).");
                return;
            }

            const tDoc = (aParts[0] || "").trim();
            const sFact = (aParts[1] || "").trim();
            const cFact = (aParts.slice(2).join("-") || "").trim();

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
        _applyFinalizadoGraficoTransferenciaGratuita: function (aEstados, sTipoDocumento) {
            const sTipo = String(sTipoDocumento || "").trim().toUpperCase();

            const bEsTransferenciaGratuita =
                sTipo === "T/GRATUITA" ||
                sTipo === "TRANSFERENCIA GRATUITA" ||
                sTipo === "TRANFERENCIA GRATUITA";

            if (!bEsTransferenciaGratuita || !Array.isArray(aEstados)) {
                return aEstados;
            }

            aEstados.forEach(function (oEstado) {
                const bFacturado =
                    oEstado.EstadoGeneral === "Facturado" &&
                    oEstado.Facturacion === "OK";

                if (bFacturado) {
                    oEstado.Finalizado = "OK";
                    oEstado.EsTransferenciaGratuitaFacturada = true;
                }
            });

            return aEstados;
        },
        _getCantidadDocumento: function (item) {
            const sCat = String(item.SDDocumentCategory || "").trim();

            if (sCat === "G") {
                return parseFloat(item.TargetQuantity || "0") || 0;
            }

            if (sCat === "B") {
                return parseFloat(item.OrderQuantity || "0") || 0;
            }

            return parseFloat(item.OrderQuantity || item.TargetQuantity || "0") || 0;
        },




    });
});
