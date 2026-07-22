sap.ui.define([
    "aris/com/clientes/controlstock/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "aris/com/clientes/controlstock/pe/model/models",
    "aris/com/clientes/controlstock/pe/model/formatter",
    "aris/com/clientes/controlstock/pe/services/Services",
    "aris/com/clientes/controlstock/pe/util/util",
    'aris/com/clientes/controlstock/pe/util/utilUI'
], (BaseController, Controller, models, formatter, Services, util, utilUI) => {
    "use strict";
    var that;
    var sTipo = "";
    var sCliente = "";
    var sEstado = "";
    var tUniNeg = "", tRol = "", tVar = "";
    var vcontDet = false;
    var sNumPedido = "", sHeader = "";

    return BaseController.extend("aris.com.clientes.controlstock.pe.controller.Detail", {
        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("Detail").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
            this.frgIdTableDetailTextilPieza = "frgIdTableDetailTextilPieza";
            this.frgIdTableDetailTextilSContratado = "frgIdTableDetailTextilSContratado";
            this.frgIdTableDetailTextilSPendiente = "frgIdTableDetailTextilSPendiente";
            this.frgIdTableDetailTextilSSeparacion = "frgIdTableDetailTextilSSeparacion";
            var oModelData = new sap.ui.model.json.JSONModel({});
            this.getView().setModel(oModelData, "oModelData");

            let sURL = window.parent.location.href;
            if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; that.sSalesOrg = "1110" };
            if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; that.sSalesOrg = "1120" };
            if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; that.sSalesOrg = "1130" };

            var oModelProyect = new sap.ui.model.json.JSONModel(models.createModelProyect());
            this.getView().setModel(oModelProyect, "oModelProyect");

            var oI18nModel = this.getOwnerComponent().getModel("i18n");
            this.getView().setModel(oI18nModel, "i18n");


        },
        handleRouteMatched: function (bInit) {
            sap.ui.core.BusyIndicator.show(0);
            sNumPedido = this.oRouter.getHashChanger().hash.split("/")[1];
            sHeader = this.oRouter.getHashChanger().hash.split("/")[2];
            this._destroyDetailFragment();

            Promise.all([
                this._getUsers()
            ]).then((values) => {
                //capturas a que unidad de negocio pertenece la pagina

                let oUser = values[0].Resources[0];
                // con este foreach validas los elementos del arreglo donde esta el Rol
                oUser.groups.forEach(element => {
                    let vRol = element.value;
                    if (vRol.includes(tUniNeg)) {
                        //con esto separas en un arreglo y en la 3era posicion del arreglo esta el rol
                        let aux = vRol.split("_");
                        // con esto lo asignas
                        tRol = aux[2];
                    }
                });
                that.getModel("oModelUser").setProperty("/bDetQuimicos", tUniNeg == "QUIMICOS" ? true : false);

                let sIdioma = that.getModel("oModelProyect").getProperty("/sIdioma");
                if (sIdioma == undefined) {
                    that._setLanguageModel("esp");
                } else {
                    that._setLanguageModel(sIdioma);
                }
                /*  if (that.getModel("oModelProyect").getProperty("/oCabecera") == undefined) {
                      let jData = values[0].oResults[0];
                      that.getModel("oModelProyect").setProperty("/oCabecera", jData);
                  }*/

                that.getModel("oModelProyect").setProperty("/sHeaderDetalle", sHeader);
                that.getModel("oModelProyect").setProperty("/sMaterial", sNumPedido);
                let sComponentTableDetailTextilPieza = "TableDetailTextilPieza";
                let sComponentTableDetailTextilSContratado = "TableDetailTextilSContratado";
                let sComponentTableDetailTextilSPendiente = "TableDetailTextilSPendiente";
                let sComponentTableDetailTextilSSeparacion = "TableDetailTextilSSeparacion";

                if (sHeader == "DetallePieza") {
                    this._getStockVenByMaterialFisico(sNumPedido, that.sSalesOrg).then((aData) => {
                        this.getModel("oModelProyect").setProperty("/oStockTextilStockVen", aData);
                        sap.ui.core.BusyIndicator.hide();
                    });
                    that.fragmentTable = sap.ui.xmlfragment(this.frgIdTableDetailTextilPieza, that.route + ".view.fragments." + sComponentTableDetailTextilPieza, that);
                } else if (sHeader == "StockContratado") {
                    this._getStockVenByMaterialContratado(sNumPedido, that.sSalesOrg).then((aData) => {
                        this.getModel("oModelProyect").setProperty("/oStockTextilStockCont", aData);
                        sap.ui.core.BusyIndicator.hide();
                    });
                    that.fragmentTable = sap.ui.xmlfragment(this.frgIdTableDetailTextilSContratado, that.route + ".view.fragments." + sComponentTableDetailTextilSContratado, that);
                } else if (sHeader == "StockPendiente") {
                    this._getStockVenByMaterialPendiente(sNumPedido, that.sSalesOrg).then((aData) => {
                        this.getModel("oModelProyect").setProperty("/oStockTextilStockPen", aData);
                        sap.ui.core.BusyIndicator.hide();
                    });
                    that.fragmentTable = sap.ui.xmlfragment(this.frgIdTableDetailTextilSPendiente, that.route + ".view.fragments." + sComponentTableDetailTextilSPendiente, that);
                } else if (sHeader == "StockSeparacion") {
                    this._getStockVenByMaterialSeparacion(sNumPedido, that.sSalesOrg).then((aData) => {
                        this.getModel("oModelProyect").setProperty("/oStockTextilStockSep", aData);
                        sap.ui.core.BusyIndicator.hide();
                    });
                    that.fragmentTable = sap.ui.xmlfragment(this.frgIdTableDetailTextilSSeparacion, that.route + ".view.fragments." + sComponentTableDetailTextilSSeparacion, that);
                }

                this._byId("vbViewDetail").addItem(that.fragmentTable);
                sap.ui.core.BusyIndicator.hide(0);
            }).catch(function (oError) {
                that.getMessageBox("error", that.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            });
        },
        _onPressNavButtonDetail: function () {
            let jData = undefined;
            that.getModel("oModelProyect").setProperty("/oCabecera", jData);
            this._destroyDetailFragment();
            this.oRouter.navTo("View");
        },
        _onFlpBackNavigation: function () {
            this._onPressNavButtonDetail();
        },
        _destroyDetailFragment: function () {
            const oDetailContainer = this._byId("vbViewDetail");

            if (oDetailContainer) {
                oDetailContainer.destroyItems();
            } else if (this.fragmentTable) {
                this.fragmentTable.destroy();
            }

            this.fragmentTable = null;
        },

        _getStockVenByMaterialFisico: function (sMaterial, sSalesOrg) {
            const that = this;
            return new Promise((resolve, reject) => {
                if (!sMaterial || !sSalesOrg) {
                    void 0;
                    resolve([]);
                    return;
                }

                // Construcción de filtro
                const sFilter = `$filter=Materialnumber eq '${sMaterial}' and Plant eq '1000' and Salesorganization eq '${sSalesOrg}' and Pedven eq true and Stockven eq true&$expand=toEtextil,toEtextilStockVen&$format=json&sap-language=ES`;

                let sUrl = "";
                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sFilter}`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sFilter}`;
                    sUrl = sPath;
                }

                void 0;

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            let aFlatten = [];
                            try {
                                const parent = (oData && oData.data)
                                    ? (Array.isArray(oData.data) ? oData.data[0] : oData.data)
                                    : null;

                                if (parent && parent.toEtextilStockVen && parent.toEtextilStockVen.results) {
                                    aFlatten = parent.toEtextilStockVen.results
                                        .filter(child => String(child.Calidad).trim() === "1")
                                        .map(child => ({
                                            Material: parent.Materialnumber,
                                            SalesOrg: parent.Salesorganization,
                                            Plant: parent.Plant,
                                            Matnr: child.Matnr,
                                            Maktx: child.Maktx,
                                            Charg: child.Charg,
                                            Longitud: that.formatNumber(child.Longitud),
                                            Calidad: child.Calidad,
                                            Procedencia: child.Procedencia,
                                            Tipo: child.Tipo,
                                            FechaIngreso: that.formatFechaYYYYMMDD_DDMMYYYY(child.FechaIngreso),
                                            OrdenFabric: child.OrdenFabric,
                                            Cliente: child.Cliente
                                        }));
                                }

                            } catch (err) {
                                void 0;
                            }
                            aFlatten = that._sortByFieldAsc(aFlatten, "Charg", { mode: "hyphenNumeric" });
                            resolve(aFlatten);

                        },
                        error: function (err) {
                            void 0;
                            resolve([]);
                        }
                    });
                });
            });
        },
        _getStockVenByMaterialContratado: function (sMaterial, sSalesOrg) {
            const that = this;
            return new Promise((resolve, reject) => {
                if (!sMaterial || !sSalesOrg) {
                    void 0;
                    resolve([]);
                    return;
                }

                // Construcción de filtro
                const sFilter = `$filter=Materialnumber eq '${sMaterial}' and Plant eq '1000' and Salesorganization eq '${sSalesOrg}' and Pedven eq false and Stockven eq true&$expand=toEtextil,toTextilStoctrat&$format=json&sap-language=ES`;

                let sUrl = "";
                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sFilter}`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sFilter}`;
                    sUrl = sPath;
                }

                void 0;

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            let aFlatten = [];
                            try {
                                const parent = (oData && oData.data)
                                    ? (Array.isArray(oData.data) ? oData.data[0] : oData.data)
                                    : null;

                                if (parent && parent.toTextilStoctrat && parent.toTextilStoctrat.results) {
                                    aFlatten = parent.toTextilStoctrat.results
                                        .filter(child => String(child.Calidad).trim() === "1")
                                        .map(child => ({
                                            Material: parent.Materialnumber,
                                            SalesOrg: parent.Salesorganization,
                                            Plant: parent.Plant,
                                            Matnr: child.Matnr,
                                            Maktx: child.Maktx,
                                            Charg: child.Charg,
                                            Longitud: that.formatNumber(child.Longitud),
                                            Calidad: child.Calidad,
                                            Procedencia: child.Procedencia,
                                            Tipo: child.Tipo,
                                            FechaIngreso: that.formatFechaYYYYMMDD_DDMMYYYY(child.FechaIngreso),
                                            OrdenFabric: child.OrdenFabric,
                                            Cliente: child.Cliente
                                        }));
                                }

                            } catch (err) {
                                void 0;
                            }

                            aFlatten = that._sortByFieldAsc(aFlatten, "Charg", { mode: "hyphenNumeric" });
                            resolve(aFlatten);
                        },
                        error: function (err) {
                            void 0;
                            resolve([]);
                        }
                    });
                });
            });
        },
        _getStockVenByMaterialPendiente: function (sMaterial, sSalesOrg) {
            const that = this;
            return new Promise((resolve, reject) => {
                if (!sMaterial || !sSalesOrg) {
                    void 0;
                    resolve([]);
                    return;
                }

                // Construcción de filtro
                const sFilter = `$filter=Materialnumber eq '${sMaterial}' and Plant eq '1000' and Salesorganization eq '${sSalesOrg}' and Pedven eq false and Stockven eq true&$expand=toEtextil,toTextilStocpedido&$format=json&sap-language=ES`;

                let sUrl = "";
                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sFilter}`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sFilter}`;
                    sUrl = sPath;
                }

                void 0;

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            let aFlatten = [];
                            try {
                                const parent = (oData && oData.data)
                                    ? (Array.isArray(oData.data) ? oData.data[0] : oData.data)
                                    : null;

                                if (parent && parent.toTextilStocpedido && parent.toTextilStocpedido.results) {
                                    aFlatten = parent.toTextilStocpedido.results.map(child => ({
                                        Material: parent.Materialnumber,
                                        SalesOrg: parent.Salesorganization,
                                        Plant: parent.Plant,
                                        Material: child.Material,
                                        Pedido: child.Pedido,
                                        Cliente: child.Cliente,
                                        FechaPedido: that.formatFechaYYYYMMDD_DDMMYYYY(child.FechaPedido),
                                        Um: child.Um,
                                        CantSoli: that.formatNumber(child.CantSoli),
                                        CantEntre: that.formatNumber(child.CantEntre),
                                        CantPendi: that.formatNumber(child.CantPendi),
                                        Estado: child.Estado
                                    }));
                                }

                            } catch (err) {
                                void 0;
                            }

                            aFlatten = that._sortByFieldAsc(aFlatten, "Pedido", { mode: "string", numericLocale: true });
                            resolve(aFlatten);
                        },
                        error: function (err) {
                            void 0;
                            resolve([]);
                        }
                    });
                });
            });
        },
        _getStockVenByMaterialSeparacion: function (sMaterial, sSalesOrg) {
            const that = this;
            return new Promise((resolve, reject) => {
                if (!sMaterial || !sSalesOrg) {
                    void 0;
                    resolve([]);
                    return;
                }

                // Construcción de filtro
                const sFilter = `$filter=Materialnumber eq '${sMaterial}' and Plant eq '1000' and Salesorganization eq '${sSalesOrg}' and Pedven eq false and Stockven eq true&$expand=toEtextil,toTextilStocsepara&$format=json&sap-language=ES`;

                let sUrl = "";
                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sFilter}`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sFilter}`;
                    sUrl = sPath;
                }

                void 0;

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            let aFlatten = [];
                            try {
                                const parent = (oData && oData.data)
                                    ? (Array.isArray(oData.data) ? oData.data[0] : oData.data)
                                    : null;

                                if (parent && parent.toTextilStocsepara && parent.toTextilStocsepara.results) {
                                    aFlatten = parent.toTextilStocsepara.results.map(child => ({
                                        Material: parent.Materialnumber,
                                        SalesOrg: parent.Salesorganization,
                                        Plant: parent.Plant,
                                        Documento: child.Documento,
                                        Cliente: child.Cliente,
                                        Material: child.Material,
                                        CantPrev: that.formatNumber(child.CantPrev),
                                        CantPendi: that.formatNumber(child.CantPendi),
                                        Valido: that.formatDate(child.Valido),
                                        Hasta: that.formatDate(child.Hasta),
                                        DiasAtraso: child.DiasAtraso,
                                        Observaciones: child.Observaciones
                                    }));
                                }

                            } catch (err) {
                                void 0;
                            }

                            aFlatten = that._sortByFieldAsc(aFlatten, "Documento", { mode: "string", numericLocale: true });
                            resolve(aFlatten);
                        },
                        error: function (err) {
                            void 0;
                            resolve([]);
                        }
                    });
                });
            });
        },
        onExit: function () {
            if (this.fragmentTable) {
                this.fragmentTable.destroy();
                this.fragmentTable = null;
            }
        }


    });
});
