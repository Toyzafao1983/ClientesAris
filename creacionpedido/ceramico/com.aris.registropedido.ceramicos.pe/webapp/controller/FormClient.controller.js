sap.ui.define([
    "com/aris/registropedido/ceramicos/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "com/aris/registropedido/ceramicos/pe/model/models",
    "com/aris/registropedido/ceramicos/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    '../util/util',
    '../util/utilUI',
    "sap/ui/core/Fragment",
    "com/aris/registropedido/ceramicos/pe/services/Services"
], (BaseController, Controller, models, Formatter, JSONModel, MessageToast, MessageBox, util, utilUI, Fragment, Services) => {
    "use strict";

    var that
    formatter: Formatter;
    return BaseController.extend("com.aris.registropedido.ceramicos.pe.controller.FormClient", {

        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("FormClient").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));

            const oModelProyect = this.getOwnerComponent().getModel("oModelProyect");

            // si por alguna razón viniera sin data, lo inicializas
            if (!oModelProyect.getData() || Object.keys(oModelProyect.getData()).length === 0) {
                oModelProyect.setData(models.createModelProyect());
            }

            oModelProyect.setProperty("/Main/filter/fechInicio", new Date());
            this.getView().setModel(oModelProyect, "oModelProyect");
            const sUserData = localStorage.getItem("oModelUser");
            if (sUserData) {
                const oUserData = JSON.parse(sUserData);
                const oModelUser = new sap.ui.model.json.JSONModel(oUserData);
                this.getView().setModel(oModelUser, "oModelUser");
            }
        },
        handleRouteMatched: function (bInit) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            if (oModelProyect) {
                oModelProyect.setProperty("/Main/filter/fechInicio", new Date());
            }
            sap.ui.core.BusyIndicator.show(0)
            let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
            this._clearOCUploadState();
            Promise.all([that._getPrueba(), that._getTipMaterialData(),
            that._getTipChangeData(), that._getReason(), that._getTipDocumentData(),
            that._getClientPet(sCustomer), that._getAddressData(sCustomer),
            that._getCreditDispo(sCustomer), that._getPrincipalSeller(sCustomer),
            that._getDatClientView(sCustomer), that._getAddresTravel(sCustomer), that._getCOnditionPay(),
            that._getUsers(), that._getBPVendedor()
            ]).then(async (values) => {
                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");
                let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
                await that._validateAccessToPortal(values);
                let oDataDetalle = values[5].oResults;
                let oDataDetalleClient = oDataDetalle.filter(item => item.Customer == sCustomer);
                if (oDataDetalleClient.length > 0) {
                    that.oModelProyect.setProperty("/oDatClient", oDataDetalleClient[0]);
                }
                let oDir = values[6].oResults;
                if (oDir) {
                    oDir.FullAddress = `${oDir.Street || ""} ${oDir.HouseNo || ""} ${oDir.StrSuppl1 || ""} ${oDir.StrSuppl2 || ""}, ${oDir.District || ""}, ${oDir.City || ""}, ${oDir.Country || ""}`;
                    that.oModelProyect.setProperty("/oDireccionCliente", oDir);
                }
                let oCredito = values[7].oResults[0];
                that.oModelProyect.setProperty("/oCreditoCliente", oCredito || {});
                let oPrincipalSeller = values[8].oResults;
                if (oPrincipalSeller) {
                    that.oModelProyect.setProperty("/oPrincipalSeller", oPrincipalSeller);
                }
                let oClientData = values[9].oResults;
                let oClientDataFilter = oClientData.filter(item => item.Customer == sCustomer);
                if (oDataDetalleClient.length > 0) {
                    that.oModelProyect.setProperty("/oClientData", oClientDataFilter[0]);
                }
                let aRaw = values[10].oResults || [];
                const aAgencias = aRaw.filter(r =>
                    r.Customer &&
                    r.Agencyname &&
                    r.Agencyaddress
                ).map(r => ({
                    Customer: r.Customer,
                    Agencyaddress: r.Agencyaddress,
                    Agencyname: r.Agencyname
                }));

                that.oModelProyect.setProperty("/oAgenciasCliente", aAgencias);
                const aDestinos = aRaw.filter(r =>
                    r.Destinationid &&
                    r.Destination
                ).map(r => ({
                    Id: r.Destinationid,
                    Text: r.Destination,
                    Name: r.Destinationname || "",
                    Customer: r.Customer,
                    Source: "D"
                }));
                const aFinalDestinos = aRaw.filter(r =>
                    r.Finaldestinationid &&
                    r.Finaldestination
                ).map(r => ({
                    Id: r.Finaldestinationid,
                    Text: r.Finaldestination,
                    Name: r.Finaldestinationname || "",
                    Customer: r.Customer,
                    Source: "F"
                }));
                that.oModelProyect.setProperty("/oDestinosCliente", aDestinos);
                that.oModelProyect.setProperty("/oFinalDestinosCliente", aFinalDestinos);
                that.oModelData.setProperty("/oConditionPay", values[11].oResults);
                that._setDefaultCondicionPago();
                that._setLanguageModel("esp");
                that.oModelProyect.getProperty("/oDetalle");
                that.oModelProyect.getProperty("/oFormCliente");
                that.oModelData.setProperty("/oTipMaterialData", values[1].oResults);
                that.oModelData.setProperty("/oTipChangeData", values[2].oResults);
                that.oModelData.setProperty("/oReason", values[3].oResults);

                // Asegurar que inputForm exista antes de aplicar reglas por rol
                if (!that.oModelProyect.getProperty("/inputForm")) {
                    that.oModelProyect.setProperty("/inputForm", {
                        tipDocument: "",
                        txtTipDocument: "",
                        igv: "",
                        showSeparationDates: false,
                        showReasonOrd: false,
                        PedExport: false,
                        fechInicio: "",
                        fechFin: "",
                        obsPedido: "",
                        isFormEnabled: false,
                        isTipDocumentEnabled: true,
                        isMaterialEnabled: true,
                        moneda: "PEN"
                    });
                } else {
                    const oInputForm = that.oModelProyect.getProperty("/inputForm");
                    oInputForm.showSeparationDates = !!oInputForm.showSeparationDates;
                    oInputForm.PedExport = !!oInputForm.PedExport;
                    oInputForm.showReasonOrd = !!oInputForm.showReasonOrd;
                    oInputForm.isFormEnabled = !!oInputForm.isFormEnabled;

                    if (typeof oInputForm.isTipDocumentEnabled !== "boolean") {
                        oInputForm.isTipDocumentEnabled = true;
                    }

                    if (!oInputForm.moneda) {
                        oInputForm.moneda = "PEN";
                    }

                    that.oModelProyect.setProperty("/inputForm", oInputForm);
                }

                let aTipDocs = values[4].oResults || [];
                const oUserM = that.getModel("oModelUser");
                const bIsCliente = !!oUserM.getProperty("/bIsCliente");
                const bIsVendedor = !!oUserM.getProperty("/bIsVendedor");
                const bIsCoord = !!oUserM.getProperty("/bIsCoord");

                if (bIsCliente && !bIsVendedor && !bIsCoord) {
                    aTipDocs = aTipDocs.filter(function (doc) {
                        return doc.auart === "ZPES";
                    });
                } else if (bIsVendedor) {
                    aTipDocs = aTipDocs.filter(function (doc) {
                        return doc.auart === "ZCNA" ||
                            doc.auart === "ZPES" ||
                            doc.auart === "ZGNA";
                    });
                } else if (bIsCoord) {
                    aTipDocs = aTipDocs.filter(function (doc) {
                        return doc.auart === "ZCNA" ||
                            doc.auart === "ZPES" ||
                            doc.auart === "ZGNA";
                    });
                }

                that.oModelData.setProperty("/oTipDocumentData", aTipDocs);

                // Regla final de tipo de documento por rol
                if (bIsCliente && !bIsVendedor && !bIsCoord) {
                    const oDocZpes = aTipDocs.find(function (doc) {
                        return doc.auart === "ZPES";
                    });

                    that.oModelProyect.setProperty("/inputForm/tipDocument", "ZPES");
                    that.oModelProyect.setProperty(
                        "/inputForm/txtTipDocument",
                        oDocZpes ? `${oDocZpes.auart} - ${oDocZpes.bezei}` : "ZPES - Pedido Nacional"
                    );
                    that.oModelProyect.setProperty("/isFormEnabled", true);
                    that.oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", false);

                    that.oModelProyect.setProperty("/inputForm/tipoReferencia", "");
                    that.oModelProyect.setProperty("/inputForm/docRefSeleccionado", null);
                    that.oModelProyect.setProperty("/inputForm/posRefSeleccionadas", []);
                } else {
                    const sTipDocument = that.oModelProyect.getProperty("/inputForm/tipDocument") || "";
                    that.oModelProyect.setProperty("/isFormEnabled", sTipDocument !== "");
                    that.oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", true);
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
                that.oModelProyect.setProperty("/isFormEnabled", sTipDocument !== "");
                let oDocs = models.JsonDocument(this);
                let aAllDocs = oDocs.d.results;
                let tRol = that.getModel("oModelUser").getProperty("/bRol");
                let aDocsFiltrados = [];
                if (that.local) {
                    aDocsFiltrados = aAllDocs;

                } else if (tRol === "CLIENTES") {
                    aDocsFiltrados = aAllDocs.filter(doc => doc.sKey === "2");

                } else if (tRol === "VENDEDOR") {
                    aDocsFiltrados = aAllDocs.filter(doc =>
                        ["1", "2", "4", "5"].includes(doc.sKey)
                    );

                } else if (tRol === "SUPERVISOR") {
                    aDocsFiltrados = aAllDocs;
                }

                that.oModelProyect.refresh(true);
                let sIdioma = that.getModel("oModelProyect").getProperty("/sIdioma");
                that.oModelProyect.getProperty("/inputForm")
                that.oModelProyect.setProperty("/bShowBtnPedidoRef", false);

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
                let oAttr1 = aAttr.find(a => a.name === "customAttribute1"); // Cliente
                let oAttr2 = aAttr.find(a => a.name === "customAttribute2"); // Vendedor / Coord
                let oAttr3 = aAttr.find(a => a.name === "customAttribute3"); // Adicional
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
            const oFiltros = oModel.getProperty("/inputForm");
            let sDescripcion = "";
            let aDetalle = [];
            switch (oFiltros.tipoEntrega) {
                case "1":
                    sDescripcion = "Cliente recoge";
                    if (oFiltros.emitGuia) aDetalle.push("Emitir guía");
                    break;
                case "2":
                    sDescripcion = "Despacho directo";
                    break;
                case "3":
                    sDescripcion = "Despacho agencia";
                    // texto del ComboBox de agencia
                    const oComboAgencia = this.byId("comboAgencia");
                    const oItemAgencia = oComboAgencia ? oComboAgencia.getSelectedItem() : null;
                    if (oItemAgencia) aDetalle.push(oItemAgencia.getText());
                    break;
            }
            // destino ceramicos
            const oComboDestino = this.byId("DestinationTextandCeramicos");
            const oItemDestino = oComboDestino ? oComboDestino.getSelectedItem() : null;
            if (oItemDestino) aDetalle.push(oItemDestino.getText());
            // setear en modelo
            oModel.setProperty("/inputForm/resumenEntrega", sDescripcion);
            oModel.setProperty("/inputForm/detalleEntrega", aDetalle.join(" | "));
            this._syncPendingOCFilesFromTokens();
            // resto de tu lógica original
            const oToday = new Date();
            const sToday = oToday.toISOString().split("T")[0];
            oModel.setProperty("/fechaActual", sToday);
            let sCustomer = oModel.getProperty("/oClienteSeleccionado")?.Customer;
            if (!sCustomer) {
                const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
                const aParts = sHash.split("/");
                sCustomer = aParts.length > 1 ? aParts[1] : null;
            }
            if (sCustomer) {
                this.getRouter().navTo("Detail", { app: sCustomer });
            } else {
                sap.m.MessageToast.show("No se encontró Customer para continuar");
            }
        },
        _onPressNavButtonForm: function () {
            this._clearOCUploadState();

            const oModel = this.getView().getModel("oModelProyect");
            if (oModel) {
                oModel.setProperty("/aOCFilesPending", []);
            }

            this.getRouter().navTo("Main");
        },
        onSelectRadioComprobante: function (oEvent) {
            if (!oEvent.getParameter("selected")) return;

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
                    sDescripcion = "Despacho directo";
                    break;

                case this.getResourceBundle().getText("txtDispatchAgency"):
                    sValor = "3";
                    sDescripcion = "Despacho agencia";
                    const oComboAgencia = this.byId("comboAgencia");
                    const oItemAgencia = oComboAgencia ? oComboAgencia.getSelectedItem() : null;
                    if (oItemAgencia) {
                        sDetalle.push(oItemAgencia.getText());
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

            this._updateResumenEntrega();
        },
        onDestinoCeramicoChange: function (oEvent) {
            const oCombo = oEvent.getSource();
            const oItem = oCombo.getSelectedItem();
            const oModel = this.getView().getModel("oModelProyect");

            if (!oItem) {
                oModel.setProperty("/inputForm/destinoCeramico", "");
                oModel.setProperty("/inputForm/destinoCeramicoText", "");
                oModel.setProperty("/inputForm/destinoCeramicoName", "");     // razón social
                oModel.setProperty("/inputForm/destinoCeramicoAddress", "");  // dirección
                this._updateResumenEntrega();
                return;
            }

            const sKey = (oItem.getKey() || "").trim();
            const sAddr = (oItem.getText() || "").trim();              // Dirección
            const sName = (oItem.getAdditionalText() || "").trim();    // Razón social

            oModel.setProperty("/inputForm/destinoCeramico", sKey);
            oModel.setProperty("/inputForm/destinoCeramicoName", sName);
            oModel.setProperty("/inputForm/destinoCeramicoAddress", sAddr);
            oModel.setProperty("/inputForm/destinoCeramicoText", [sName, sAddr].filter(Boolean).join(" - "));

            this._updateResumenEntrega();
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

            // Resumen
            let sResumen = "";
            if (sTipo === "1") sResumen = "Cliente recoge";
            if (sTipo === "2") sResumen = "Despacho directo";
            if (sTipo === "3") sResumen = "Despacho agencia";
            oModel.setProperty("/inputForm/resumenEntrega", sResumen);

            const oComboDestino = this._getFirstById([
                "DestinationTextandCeramicosDetail",
                "DestinationTextandCeramicos"
            ]);
            const oItemDestino = oComboDestino?.getSelectedItem ? oComboDestino.getSelectedItem() : null;
            const sDestName = (oItemDestino?.getAdditionalText?.() || oFiltros.destinoCeramicoName || "").trim();
            const sDestAddr = (oItemDestino?.getText?.() || oFiltros.destinoCeramicoAddress || "").trim();

            const sDestinoText = ([sDestName, sDestAddr].filter(Boolean).join(" - ") || (oFiltros.destinoCeramicoText || "")).trim();

            let sDetalleEntrega = "";
            if (sTipo === "1" || sTipo === "2" || sTipo === "3") {
                sDetalleEntrega = sDestinoText;
            }

            oModel.setProperty("/inputForm/detalleEntrega", sDetalleEntrega);
            const sAgenciaText = (oFiltros.direccionAgenciaText || "").trim();
            oModel.setProperty("/inputForm/direccionAgenciaText", (sTipo === "3") ? sAgenciaText : "");

            oModel.refresh(true);
        },
        // Para jalar las posiciones de con referencia 
        _aplicarRecomendacionesDestinoYAgencia: function (oDocHeader) {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel || !oDocHeader) return;

            const oRaw = oDocHeader._raw || oDocHeader;

            const getVal = (...keys) => {
                for (const k of keys) {
                    const v = oRaw?.[k];
                    if (v !== undefined && v !== null && String(v).trim() !== "") {
                        return String(v).trim();
                    }
                }
                return "";
            };

            const sDeliveryCondition = getVal("DELIVERYCONDITION", "DeliveryCondition", "ShipCond", "ShippingCondition");
            const sAgency = getVal("AGENCY", "Agency");
            const sFinalDestination = getVal("FINALDESTINATION", "FinalDestination");
            const sShippingDestination = getVal("SHIPPINGDESTINATION", "ShippingDestination");
            const sCustomerGroup = getVal("CUSTOMERGROUP", "CustomerGroup");

            const aAgencias = oModel.getProperty("/oAgenciasCliente") || [];
            const aDestinos = oModel.getProperty("/oDestinosCliente") || [];
            const aFinalDestinos = oModel.getProperty("/oFinalDestinosCliente") || [];

            const findByAny = (arr, keys, value) => {
                const sVal = String(value || "").trim();
                return (arr || []).find(item =>
                    keys.some(k => String(item?.[k] || "").trim() === sVal)
                ) || null;
            };

            const setEmptyDirAgencia = () => {
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/agenciaFullText", "");
            };

            let sTipoEntrega = "";

            // Regla correcta:
            // 02 -> Cliente recoge
            // 01 + AGENCY con valor -> Despacho Directo
            // 01 + sin AGENCY + CUSTOMERGROUP 18 -> Despacho Agencia
            // 01 + sin AGENCY + otro grupo -> Despacho Directo
            if (sDeliveryCondition === "02") {
                sTipoEntrega = "1";
            } else if (sDeliveryCondition === "01") {
                if (sAgency) {
                    sTipoEntrega = "2";
                } else if (sCustomerGroup === "18") {
                    sTipoEntrega = "3";
                } else {
                    sTipoEntrega = "2";
                }
            }

            oModel.setProperty("/inputForm/tipoEntrega", sTipoEntrega);

            // Destino envío = FINALDESTINATION
            if (sFinalDestination) {
                const oDestino =
                    findByAny(aFinalDestinos, ["Id", "Customer", "Kunnr", "Partner", "Destination", "Destinationid", "Finaldestinationid"], sFinalDestination) ||
                    findByAny(aDestinos, ["Id", "Customer", "Kunnr", "Partner", "Destination", "Destinationid"], sFinalDestination);

                oModel.setProperty("/inputForm/destinoCeramico", sFinalDestination);
                oModel.setProperty(
                    "/inputForm/destinoCeramicoText",
                    oDestino
                        ? (oDestino.Text || oDestino.Destinationname || oDestino.Finaldestinationname || oDestino.Name || "")
                        : ""
                );
            } else {
                oModel.setProperty("/inputForm/destinoCeramico", "");
                oModel.setProperty("/inputForm/destinoCeramicoText", "");
            }

            // Cliente recoge -> no mostrar Dir. Agencia
            if (sTipoEntrega === "1") {
                setEmptyDirAgencia();
                oModel.setProperty("/oAgenciasClienteFiltradas", aAgencias);
                this._updateResumenEntrega();
                oModel.refresh(true);
                return;
            }

            // Ya no se filtra por transportista porque este portal no usa ese campo
            oModel.setProperty("/oAgenciasClienteFiltradas", aAgencias);

            let oAgencyMatch = null;

            // Despacho Directo -> Dirección + Nombre de AGENCY
            if (sTipoEntrega === "2" && sAgency) {
                oAgencyMatch =
                    aAgencias.find(a => String(a.Customer || "").trim() === String(sAgency).trim()) ||
                    null;
            }

            // Despacho Agencia -> Dirección + Nombre de SHIPPINGDESTINATION solo si CUSTOMERGROUP = 18
            if (!oAgencyMatch && sTipoEntrega === "3" && sCustomerGroup === "18" && sShippingDestination) {
                oAgencyMatch =
                    aAgencias.find(a => String(a.Customer || "").trim() === String(sShippingDestination).trim()) ||
                    null;
            }

            if (oAgencyMatch) {
                oModel.setProperty("/inputForm/direccionAgencia", oAgencyMatch.Customer || "");
                oModel.setProperty("/inputForm/direccionAgenciaText", oAgencyMatch.Agencyname || "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", oAgencyMatch.Agencyaddress || "");
                oModel.setProperty(
                    "/inputForm/agenciaFullText",
                    [oAgencyMatch.Agencyaddress, oAgencyMatch.Agencyname].filter(Boolean).join(" - ")
                );
            } else {
                setEmptyDirAgencia();
            }

            this._updateResumenEntrega();
            oModel.refresh(true);
        },
        _loadObsFromPedidoReferencia: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) return Promise.resolve();
            const sTipoRef = oModel.getProperty("/inputForm/tipoReferencia") || "";
            const oDocRef = oModel.getProperty("/inputForm/docRefSeleccionado") || null;
            if (!sTipoRef || !oDocRef) return Promise.resolve();
            const sSalesDocument =
                oDocRef.SalesDocument ||
                oDocRef.DocComercial ||
                (oDocRef._raw && oDocRef._raw.SalesDocument) ||
                "";
            if (!sSalesDocument) return Promise.resolve();
            return new Promise((resolve) => {
                const sBasePath = "/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/ObserPedSet";
                const sQuery = "?$filter=SalesDocument eq '" + sSalesDocument + "'&$format=json";
                const sPath = sBasePath + sQuery;
                let sUrl = "";
                if (this.local) {
                    sUrl = this.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    sUrl = jQuery.sap.getModulePath(this.route) + "/S4HANA" + sPath;
                }
                sap.ui.core.BusyIndicator.show(0);
                Services.getoDataERPSync(this, sUrl, (result) => {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: (oData) => {
                            sap.ui.core.BusyIndicator.hide(0);
                            let aRaw = [];
                            if (oData && oData.data) {
                                if (oData.data.d && Array.isArray(oData.data.d.results)) aRaw = oData.data.d.results;
                                else if (Array.isArray(oData.data.results)) aRaw = oData.data.results;
                                else if (Array.isArray(oData.data)) aRaw = oData.data;
                                else aRaw = [oData.data];
                            }
                            let sObsPedido = "";
                            let sObsDelivery = "";

                            aRaw
                                .slice()
                                .sort((a, b) => Number(a.Linea || a.Line || 0) - Number(b.Linea || b.Line || 0))
                                .forEach((row) => {
                                    const sTipoObs = String(row.Tipobs || row.TextId || row.TdId || "").trim().toUpperCase();
                                    const sLine = String(row.Nota || row.TextLine || row.Tdline || row.Texto || row.Msg || "").trim();

                                    if (!sLine) return;

                                    // ObserPedSet:
                                    // OBPE = Observación de Pedido
                                    // OBEN = Observación de Entrega
                                    if (sTipoObs === "OBPE" || sTipoObs === "Z001") {
                                        sObsPedido += (sObsPedido ? "\n" : "") + sLine;
                                    }

                                    if (sTipoObs === "OBEN" || sTipoObs === "Z003") {
                                        sObsDelivery += (sObsDelivery ? "\n" : "") + sLine;
                                    }
                                });

                            oModel.setProperty("/inputForm/obsPedido", sObsPedido);
                            oModel.setProperty("/inputForm/obsDelivery", sObsDelivery);
                            resolve();
                        },
                        error: () => {
                            sap.ui.core.BusyIndicator.hide(0);
                            resolve();
                        }
                    });
                });
            });
        },
        _updateFormState: function () {
            let oModelProyect = this.getView().getModel("oModelProyect");
            const sTipoDoc = oModelProyect.getProperty("/inputForm/tipDocument") || "";
            const bShowSeparationDates =
                sTipoDoc === "ZPSE" ||
                sTipoDoc === "ZCNA" ||
                sTipoDoc === "ZACN";
            oModelProyect.setProperty("/inputForm/showSeparationDates", bShowSeparationDates);
            let sMoneda = "PEN";
            oModelProyect.setProperty("/inputForm/moneda", sMoneda);
            oModelProyect.setProperty("/inputForm/isMaterialEnabled", sTipoDoc !== "ZPEE");
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
        _handleSelectChange: function (oEvent, sKeyPath, sTextPath) {
            const oItem = oEvent.getParameter("selectedItem");
            const sKey = oItem && oItem.getKey();
            const sText = oItem && oItem.getText();

            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty(sKeyPath, sKey);
            oModel.setProperty(sTextPath, sText);
        },
        // visibilidad del boton de con referencia 
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
            const oModelUser = oView.getModel("oModelUser");

            const bIsCliente = !!oModelUser.getProperty("/bIsCliente");
            const bIsVendedor = !!oModelUser.getProperty("/bIsVendedor");
            const bIsCoord = !!oModelUser.getProperty("/bIsCoord");

            // Cliente: siempre fijo en Pedido Nacional
            if (bIsCliente && !bIsVendedor && !bIsCoord) {
                oCombo.setSelectedKey("ZPES");
                oModelProyect.setProperty("/inputForm/tipDocument", "ZPES");
                oModelProyect.setProperty("/inputForm/txtTipDocument", "ZPES - Pedido Nacional");
                oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", false);
                oModelProyect.setProperty("/isFormEnabled", true);
                return;
            }

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
                        oModelProyect.setProperty("/inputForm/tipDocument", sKey);
                        oModelProyect.setProperty("/inputForm/txtTipDocument", sText);
                        oModelProyect.setProperty("/isFormEnabled", !!sKey);
                        oModelProyect.setProperty("/inputForm/isTipDocumentEnabled", false);

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
        onReasonOrdChange: function (oEvent) {
            this._handleSelectChange(
                oEvent,
                "/inputForm/reasonOrd",
                "/inputForm/txtReasonOrd"
            );
        },
        // Logica para Materiales
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
        // Validacion de Selccion de pago
        onSelectCondPago: function (oEvent) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const sKey = oSelectedItem.getKey();   // "0103"
                const sText = oSelectedItem.getText(); // "PAGO CONTRA ENTREGA - CONTADO"
                // Guardamos ambos valores
                oModelProyect.setProperty("/inputForm/cbCondPago", sKey);
                oModelProyect.setProperty("/inputForm/txtCondPago", sText);
            }
        },
        onAgenciaChange: function (oEvent) {
            const oCombo = oEvent.getSource();
            const oItem = oCombo.getSelectedItem();
            const oModel = this.getView().getModel("oModelProyect");

            if (!oItem) {
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaName", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddress", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                this._updateResumenEntrega();
                return;
            }

            const sKey = (oItem.getKey() || "").trim();
            const sAddr = (oItem.getText() || "").trim();
            const sName = (oItem.getAdditionalText() || "").trim();

            oModel.setProperty("/inputForm/direccionAgencia", sKey);
            oModel.setProperty("/inputForm/direccionAgenciaName", sName);
            oModel.setProperty("/inputForm/direccionAgenciaAddress", sAddr);
            oModel.setProperty("/inputForm/direccionAgenciaText", [sName, sAddr].filter(Boolean).join(" - "));

            this._updateResumenEntrega();
        },
        // Logica para Los datos que restan
        _validateRequiredFields: function () {
            let oModel = this.getView().getModel("oModelProyect");
            let oData = oModel.getProperty("/inputForm") || {};
            let aErrors = [];
            // Validaciones
            if (!oData.tipDocument) {
                aErrors.push("Debe seleccionar el tipo de documento");
            }
            // Condición de pago
            let sCondPago = oData.cbCondPago;
            if (!sCondPago || sCondPago.trim() === "") {
                sCondPago = oModel.getProperty("/oClientData/vtext");
                oData.cbCondPago = sCondPago;
            }
            if (!sCondPago || sCondPago.trim() === "") {
                aErrors.push("Debe ingresar la condición de pago");
            }
            if (!oData.tipoEntrega) {
                aErrors.push("Debe seleccionar una condición de entrega");
            }
            if (!oData.destinoCeramico) {
                aErrors.push("Debe ingresar el destino");
            }
            if (oData.showSeparationDates) {
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

        _buildOCFileKey: function (file) {
            return [
                file.name || "",
                file.size || 0,
                file.lastModified || Date.now()
            ].join("|");
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

            /*
             * Primero sincronizamos con lo que realmente existe en pantalla.
             * Si el usuario eliminó un token con X, ya no debe figurar como pendiente.
             */
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
                MessageToast.show("No hay archivos seleccionados.");
                return;
            }

            MessageToast.show("Los archivos se subirán automáticamente cuando se cree el pedido.");
        },

        onClearOCUploadFiles: function () {
            this._clearOCUploadState();
            MessageToast.show("Archivos adjuntos limpiados.");
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
        // Pedido Con referencia 
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
                        const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/SepCli?$top=1000&$format=json";
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/SepCli?$top=10000&$format=jsonormat=json";
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
                        sSalesOrg = "1130";
                    }
                    if (!sSalesDocType && oModelProyect) {
                        sSalesDocType = oModelProyect.getProperty("/inputForm/tipoReferencia") || "";
                    }
                    if (sSalesDocType === "ZPSE" && oModelProyect) {
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

        _normalizeItmNumberRef: function (vValue) {
            const sValue = String(vValue || "").trim();

            if (!sValue) {
                return "";
            }

            const nValue = parseInt(sValue, 10);
            return isNaN(nValue) ? sValue.padStart(6, "0") : String(nValue).padStart(6, "0");
        },

        _parseNumberRef: function (vValue) {
            if (vValue === null || vValue === undefined || vValue === "") {
                return 0;
            }

            const nValue = parseFloat(String(vValue).replace(",", "."));
            return isNaN(nValue) ? 0 : nValue;
        },

        _formatBultoRef: function (vValue) {
            const nValue = this._parseNumberRef(vValue);
            return nValue > 0 ? nValue.toFixed(3) : "0.000";
        },

        _getCantidadDocumentoOrderDetailsRef: function (oItem) {
            const sCat = String(oItem.SDDocumentCategory || oItem.SalesDocumentCategory || "").trim();

            if (sCat === "G") {
                return this._parseNumberRef(oItem.TargetQuantity || "0");
            }

            if (sCat === "B") {
                return this._parseNumberRef(oItem.OrderQuantity || "0");
            }

            return this._parseNumberRef(oItem.OrderQuantity || oItem.TargetQuantity || "0");
        },

        _buildOrderDetailsUrlRef: function (sSalesDocument) {
            const sPedido = String(sSalesDocument || "").trim().replace(/'/g, "''");
            const sFilter = "$filter=SalesDocument eq '" + sPedido + "'";

            if (this.local) {
                const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderDetails" +
                    "?" + sFilter + "&$format=json&sap-language=ES";

                return this.getOwnerComponent().getManifestObject().resolveUri(sPath);
            }

            return jQuery.sap.getModulePath(this.route) +
                "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderDetails" +
                "?" + sFilter + "&$format=json&sap-language=ES";
        },

        _extractODataArrayRef: function (vData) {
            if (Array.isArray(vData)) {
                return vData;
            }

            if (vData && vData.d && Array.isArray(vData.d.results)) {
                return vData.d.results;
            }

            if (vData && Array.isArray(vData.results)) {
                return vData.results;
            }

            if (vData && typeof vData === "object") {
                return [vData];
            }

            return [];
        },

        _getOrderDetailsBultosRef: function (sSalesDocument) {
            const that = this;

            const oResp = {
                sEstado: "E",
                oResults: []
            };

            return new Promise(function (resolve) {
                const sPedido = String(sSalesDocument || "").trim();

                if (!sPedido) {
                    resolve(oResp);
                    return;
                }

                const sUrl = that._buildOrderDetailsUrlRef(sPedido);

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const aData = that._extractODataArrayRef(
                                oData && oData.data !== undefined ? oData.data : oData
                            );

                            const mGrouped = {};

                            aData.forEach(function (oItem) {
                                const sPos = that._normalizeItmNumberRef(
                                    oItem.SalesDocumentItem ||
                                    oItem.ItmNumber ||
                                    oItem.Item ||
                                    ""
                                );

                                if (!sPos) {
                                    return;
                                }

                                const nOrdered = that._getCantidadDocumentoOrderDetailsRef(oItem);

                                const nPalletUmren = that._parseNumberRef(oItem.PalletUmren);
                                const nPalletUmrez = that._parseNumberRef(oItem.PalletUmrez);

                                const nCajaUmren = that._parseNumberRef(oItem.CajaUmren);
                                const nCajaUmrez = that._parseNumberRef(oItem.CajaUmrez);

                                const nPaletas = nPalletUmrez !== 0
                                    ? (nOrdered * nPalletUmren) / nPalletUmrez
                                    : 0;

                                const nCajas = nCajaUmrez !== 0
                                    ? (nOrdered * nCajaUmren) / nCajaUmrez
                                    : 0;

                                const sTipBulto = String(oItem.TipBulto || oItem.tipbulto || "").trim();

                                mGrouped[sPos] = {
                                    SalesDocumentItem: sPos,
                                    TipBulto: sTipBulto,
                                    CantidadPalletsCalc: nPaletas,
                                    CantidadCajasCalc: nCajas,
                                    NroPaletasCalc: nPaletas,
                                    NroCajasCalc: nCajas
                                };
                            });

                            oResp.sEstado = "S";
                            oResp.oResults = Object.keys(mGrouped).map(function (sPos) {
                                return mGrouped[sPos];
                            });

                            resolve(oResp);
                        },
                        error: function () {
                            resolve(oResp);
                        }
                    });
                });
            });
        },

        _mergeOrderDetailsBultosIntoPosRef: async function (sSalesDocument, aPos) {
            const aRows = Array.isArray(aPos) ? aPos : [];

            if (!sSalesDocument || !aRows.length) {
                return aRows;
            }

            const toNum = this._parseNumberRef.bind(this);
            const fmt = this._formatBultoRef.bind(this);

            try {
                const oResp = await this._getOrderDetailsBultosRef(sSalesDocument);

                if (oResp.sEstado !== "S" || !Array.isArray(oResp.oResults) || !oResp.oResults.length) {
                    console.warn("OrderDetails no devolvió cálculo de cajas/pallets para el documento de referencia:", sSalesDocument);
                    return aRows;
                }

                const mBultosByPos = {};

                oResp.oResults.forEach(function (oBulto) {
                    const sPos = this._normalizeItmNumberRef(
                        oBulto.SalesDocumentItem ||
                        oBulto.ItmNumber ||
                        ""
                    );

                    if (sPos) {
                        mBultosByPos[sPos] = oBulto;
                    }
                }.bind(this));

                return aRows.map(function (oRow) {
                    const sPos = this._normalizeItmNumberRef(oRow.RefDocIt || oRow.Pos || "");
                    const oBulto = mBultosByPos[sPos];

                    if (!oBulto) {
                        return oRow;
                    }

                    const sTipBulto = String(oBulto.TipBulto || "").trim();
                    const bEsCaja = sTipBulto === "S";
                    const sUMRef = bEsCaja ? "CJ" : "PAL";

                    const nM2Original = toNum(oRow.CtdOriginal);
                    const nM2Pendiente = toNum(oRow.CtdPendiente);

                    const nPalOriginal = toNum(
                        oBulto.CantidadPalletsCalc ||
                        oBulto.NroPaletasCalc ||
                        oBulto.CantidadPallets ||
                        "0"
                    );

                    const nCajOriginal = toNum(
                        oBulto.CantidadCajasCalc ||
                        oBulto.NroCajasCalc ||
                        oBulto.CantidadCajas ||
                        "0"
                    );

                    const nFactorPendiente = nM2Original > 0
                        ? Math.min(1, nM2Pendiente / nM2Original)
                        : 1;

                    const nPalPendiente = bEsCaja ? 0 : (nPalOriginal * nFactorPendiente);
                    const nCajPendiente = bEsCaja ? (nCajOriginal * nFactorPendiente) : 0;

                    const nBultoOriginal = bEsCaja ? nCajOriginal : nPalOriginal;
                    const nBultoPendiente = bEsCaja ? nCajPendiente : nPalPendiente;

                    const nFactorM2 = nBultoOriginal > 0
                        ? (nM2Original / nBultoOriginal)
                        : 0;

                    return Object.assign({}, oRow, {
                        Pos: sPos || oRow.Pos,
                        Posicion: sPos || oRow.Posicion || oRow.Pos,
                        RefDocIt: sPos || oRow.RefDocIt,

                        UM: sUMRef,
                        UMV: sUMRef,
                        TargetQuBulto: sUMRef,

                        TipBulto: sTipBulto,
                        Calidad: sTipBulto,
                        Zzcalidad: sTipBulto,

                        OrderQuantity: fmt(nM2Original),
                        CtdOriginalM2: fmt(nM2Original),
                        CtdPendienteM2: fmt(nM2Pendiente),
                        CantidadM2BaseRef: fmt(nM2Original),
                        cantidadM2BaseRef: fmt(nM2Original),
                        factorM2Ref: nFactorM2,
                        factorM2BultoRef: nFactorM2,

                        CtdOriginal: fmt(nBultoOriginal),
                        CtdPendiente: fmt(nBultoPendiente),
                        CtdOriginalBulto: fmt(nBultoOriginal),
                        CtdPendienteBulto: fmt(nBultoPendiente),
                        CtdPedido: "0.000",

                        Pallets: fmt(nPalPendiente),
                        Cajas: fmt(nCajPendiente),
                        stockPallets: fmt(nPalPendiente),
                        stockCajas: fmt(nCajPendiente),

                        cantidadPallets: bEsCaja ? "0.000" : fmt(nPalPendiente),
                        cantidadCajas: bEsCaja ? fmt(nCajPendiente) : "0.000",
                        NroPaletas: bEsCaja ? "0.000" : fmt(nPalPendiente),
                        NroCajas: bEsCaja ? fmt(nCajPendiente) : "0.000"
                    });
                }.bind(this));
            } catch (oError) {
                console.warn("No se pudo enriquecer posiciones de referencia con OrderDetails:", oError);
                return aRows;
            }
        },

        // Para la tabla Final 
        _loadPosicionesDocumento: function (oDocHeader) {
            const oModel = this.getView().getModel("oModelProyect");

            const sSalesDocument =
                oDocHeader.SalesDocument ||
                oDocHeader.DocComercial ||
                (oDocHeader._raw && oDocHeader._raw.SalesDocument) || "";

            if (!sSalesDocument) {
                oModel.setProperty("/aPosDocRef", []);
                return;
            }

            const sTipoRef = oModel.getProperty("/inputForm/tipoReferencia") || "";

            // B = Cotización, G = Contrato/Separación.
            let sDocType =
                (oDocHeader._raw && oDocHeader._raw.DocumentType) ||
                oDocHeader.DocumentType || "";

            if (!sDocType) {
                if (sTipoRef === "ZCNA") sDocType = "B";
                if (sTipoRef === "ZACN" || sTipoRef === "ZPSE") sDocType = "G";
            }

            this._getPedConRefItem(sSalesDocument).then(async oResp => {
                const aRaw = oResp.oResults || [];
                const aPos = aRaw.map(row => {
                    const sPos = this._normalizeItmNumberRef(row.SalesDocumentItem || row.ItmNumber || row.Posnr || "");

                    const sOrderQtyM2 = row.OrderQuantity || row.TargetQuantity || row.TargetQty || "0.000";
                    const sPendQtyM2 = row.CanPend || row.OpenQty || row.PendingQuantity || sOrderQtyM2;

                    return {
                        Pos: sPos,
                        Posicion: sPos,
                        Material: row.Material || "",
                        Descripcion: row.SalesDocumentItemText || row.Description || "",

                        /*
                         * M2 técnico desde DoRePeItem.
                         * Estos campos NO deben perderse al pasar a Detail.
                         */
                        OrderQuantity: sOrderQtyM2,
                        TargetQuantity: row.TargetQuantity || row.TargetQty || "",
                        CtdOriginalM2: sOrderQtyM2,
                        CtdPendienteM2: sPendQtyM2,
                        CantidadM2BaseRef: sOrderQtyM2,
                        cantidadM2BaseRef: sOrderQtyM2,

                        /*
                         * Al inicio aún se muestra como M2; luego _mergeOrderDetailsBultosIntoPosRef
                         * reemplaza CtdOriginal/CtdPendiente por PAL/CJ visuales.
                         */
                        CtdOriginal: sOrderQtyM2,
                        CtdPendiente: sPendQtyM2,
                        CtdPedido: row.CtdPedido || "0.000",
                        UM: row.OrderQuantityUnit || row.TargetQu || "",

                        Pallets: row.Pallets || row.NumPallets || row.TotalPallets || "0.000",
                        Cajas: row.Cajas || row.Boxes || row.TotalBoxes || row.Saldos || "0.000",
                        stockPallets: row.Pallets || row.NumPallets || row.TotalPallets || "0.000",
                        stockCajas: row.Cajas || row.Boxes || row.TotalBoxes || row.Saldos || "0.000",

                        RefDoc: sSalesDocument,
                        RefDocIt: sPos,
                        RefDocCa: sDocType
                    };
                });

                const aPosConBultos = await this._mergeOrderDetailsBultosIntoPosRef(sSalesDocument, aPos);
                oModel.setProperty("/aPosDocRef", aPosConBultos);
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
                    name: "com.aris.registropedido.ceramicos.pe.view.dialogs.DlgPedidoReferencia",
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
                    name: "com.aris.registropedido.ceramicos.pe.view.dialogs.DlgTipoReferencia",
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
                    name: "com.aris.registropedido.ceramicos.pe.view.dialogs.DlgSeparacionesCliente",
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

            let sCliente = (oModel.getProperty("/inputForm/clienteSep") || "").trim();

            if (!sCliente) {
                let sValue = (oInput.getValue() || "").trim();
                if (!sValue) {
                    sap.m.MessageToast.show("Ingrese un cliente");
                    return;
                }
                const iSep = sValue.indexOf("-");
                if (iSep > -1) sValue = sValue.substring(0, iSep).trim();
                sCliente = sValue;
                oModel.setProperty("/inputForm/clienteSep", sCliente);
            }

            oModel.setProperty("/inputForm/clienteSepBusqueda", sCliente);

            if (this._oDlgSepCli) this._oDlgSepCli.close();

            this._loadDocumentosPendientes().then(() => {
                this._openDlgDocPendientes();
            });
        },
        _openDlgDocPendientes: function () {
            const oView = this.getView();
            if (!this._oDlgDocPend) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.ceramicos.pe.view.dialogs.DlgDocumentosPendientes",
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

            // Recomendaciones de entrega (destino/agencia)
            this._aplicarRecomendacionesDestinoYAgencia(oRow);

            // NUEVO: aplicar condición de pago desde DoRePe
            this._aplicarCondicionPagoDesdeReferencia(oRow);

            // Observaciones
            this._loadObsFromPedidoReferencia();

            if (this._oDlgDocPend) this._oDlgDocPend.close();
            this._openDlgDocPosiciones();
            this._loadPosicionesDocumento(oRow);
        },
        _openDlgDocPosiciones: function () {
            const oView = this.getView();
            if (!this._oDlgDocPos) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.aris.registropedido.ceramicos.pe.view.dialogs.DlgPosicionesDocumento",
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
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect");
            const oTable = this.byId("tblPosDocRef");
            if (!oTable) { return; }

            const aSelectedCtx = oTable.getSelectedContexts("oModelProyect") || [];
            const aSeleccionadas = [];

            const toNumRef = function (v) {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const fmtRef = function (v) {
                return toNumRef(v).toFixed(3);
            };

            aSelectedCtx.forEach((oCtx) => {
                if (!oCtx) { return; }

                const oRow = oCtx.getObject() || {};
                if (oRow.SinStock) { return; }

                const fPedido = parseFloat(String(oRow.CtdPedido || "0").replace(",", ".")) || 0;
                const fPend = parseFloat(String(oRow.CtdPendiente || "0").replace(",", ".")) || 0;

                const fFactorM2Ref = toNumRef(
                    oRow.factorM2BultoRef ||
                    oRow.factorM2Ref
                );

                const fPendM2 = toNumRef(
                    oRow.CtdPendienteM2 ||
                    oRow.CanPend ||
                    oRow.OpenQty
                );

                const fOrigM2 = toNumRef(
                    oRow.CtdOriginalM2 ||
                    oRow.OrderQuantity ||
                    oRow.TargetQuantity ||
                    oRow.TargetQty
                );

                let fPedidoM2 = 0;

                /*
                 * CtdPedido está en PAL/CJ visual.
                 * Para BAPI/simulación/grabación se convierte a M2.
                 */
                if (fFactorM2Ref > 0) {
                    fPedidoM2 = fPedido * fFactorM2Ref;
                } else if (fPend > 0 && fPendM2 > 0 && Math.abs(fPedido - fPend) < 0.0001) {
                    fPedidoM2 = fPendM2;
                } else if (fOrigM2 > 0) {
                    fPedidoM2 = fOrigM2;
                }

                if (fPedido <= 0) { return; }
                if (fPedido > fPend) { return; }

                if (fPedidoM2 <= 0) {
                    console.warn("No se pudo calcular M2 para la posición seleccionada.", {
                        Posicion: oRow.Posicion || oRow.Pos,
                        Material: oRow.Material,
                        CtdPedido: fPedido,
                        CtdPendiente: fPend,
                        CtdOriginalM2: oRow.CtdOriginalM2,
                        CtdPendienteM2: oRow.CtdPendienteM2,
                        OrderQuantity: oRow.OrderQuantity,
                        factorM2Ref: oRow.factorM2Ref
                    });
                    return;
                }

                aSeleccionadas.push({
                    Pos: oRow.Pos,
                    Posicion: oRow.Posicion || oRow.Pos || oRow.RefDocIt || "",
                    Material: oRow.Material,
                    Descripcion: oRow.Descripcion,
                    CtdOriginal: oRow.CtdOriginal,
                    CtdPendiente: oRow.CtdPendiente,
                    CtdPedido: oRow.CtdPedido,
                    UM: oRow.UM,
                    TipBulto: oRow.TipBulto || "",
                    Calidad: oRow.Calidad || oRow.TipBulto || "",
                    Zzcalidad: oRow.Zzcalidad || oRow.TipBulto || "",
                    Pallets: oRow.Pallets || oRow.stockPallets || "0.000",
                    Cajas: oRow.Cajas || oRow.stockCajas || "0.000",
                    stockPallets: oRow.stockPallets || oRow.Pallets || "0.000",
                    stockCajas: oRow.stockCajas || oRow.Cajas || "0.000",
                    cantidadPallets: oRow.cantidadPallets || oRow.NroPaletas || "0.000",
                    cantidadCajas: oRow.cantidadCajas || oRow.NroCajas || "0.000",
                    NroPaletas: oRow.NroPaletas || oRow.cantidadPallets || "0.000",
                    NroCajas: oRow.NroCajas || oRow.cantidadCajas || "0.000",

                    OrderQuantity: fmtRef(fPedidoM2),
                    CtdPedidoM2: fmtRef(fPedidoM2),
                    CantidadM2: fmtRef(fPedidoM2),
                    cantidadM2: fmtRef(fPedidoM2),

                    CtdOriginalM2: fmtRef(fOrigM2),
                    CtdPendienteM2: fmtRef(fPendM2 || fPedidoM2),
                    CantidadM2BaseRef: fmtRef(fOrigM2 || fPedidoM2),
                    cantidadM2BaseRef: fmtRef(fOrigM2 || fPedidoM2),

                    factorM2Ref: fFactorM2Ref,
                    factorM2BultoRef: fFactorM2Ref,

                    UMVBulto: oRow.UMV || oRow.TargetQuBulto || oRow.UM || "",
                    TargetQuBulto: oRow.TargetQuBulto || oRow.UMV || oRow.UM || "",
                    m2Convertido: true,

                    RefDoc: oRow.RefDoc,
                    RefDocIt: oRow.RefDocIt,
                    RefDocCa: oRow.RefDocCa
                });
            });

            if (!aSeleccionadas.length) {
                sap.m.MessageBox.warning(
                    "Seleccione al menos una posición con cantidad válida (CtdPedido > 0 y <= Pendiente)."
                );
                return;
            }

            oModel.setProperty("/inputForm/posRefSeleccionadas", aSeleccionadas);
            oModel.setProperty("/inputForm/needsInitFromRef", true);

            oModel.setProperty("/oMaterial", []);
            oModel.setProperty("/oMaterialUI", []);
            oModel.setProperty("/oCantidades", {});
            oModel.setProperty("/oCantidadesByItm", {});
            oModel.setProperty("/oRefByItm", {});
            oModel.setProperty("/oConditionsSAP", []);
            oModel.setProperty("/oItemsOutSAP", []);
            oModel.setProperty("/oDatCalculo", {
                subtotalGeneral: "0.00",
                embalaje: "0.00",
                totalImpuesto: "0.00",
                totalGeneral: "0.00"
            });

            oModel.refresh(true);

            if (this._oDlgDocPos) {
                this._oDlgDocPos.close();
            } else {
                const oDlg = this.byId("dlgPosicionesDocumento");
                if (oDlg && oDlg.close) {
                    oDlg.close();
                }
            }

            sap.m.MessageToast.show("Posiciones de referencia guardadas.");
        },
        onPosRefSelectionChange: function (oEvent) {
            const oTable = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");
            if (!oTable || !oModel) { return; }

            const aSelCtx = oTable.getSelectedContexts("oModelProyect") || [];
            const mSel = new Set(aSelCtx.map(c => c.getPath()));
            const aItems = oTable.getItems() || [];

            const normalizeQty = (v) => {
                const s = String(v ?? "").replace(",", ".").trim();
                if (!s) return "";
                const n = parseFloat(s);
                return isNaN(n) ? "" : n.toFixed(3);
            };

            aItems.forEach((oItem) => {
                const oCtx = oItem.getBindingContext("oModelProyect");
                if (!oCtx) { return; }

                const sPath = oCtx.getPath();
                const oRow = oCtx.getObject() || {};
                if (oRow.SinStock) { return; }

                const sActual = String(oRow.CtdPedido ?? "").replace(",", ".").trim();
                const fActual = parseFloat(sActual);
                const sPend = normalizeQty(oRow.CtdPendiente || "0");

                if (mSel.has(sPath)) {
                    // Si ya hay una cantidad válida escrita por el usuario, la respetamos
                    if (!sActual || isNaN(fActual) || fActual <= 0) {
                        oModel.setProperty(sPath + "/CtdPedido", sPend);
                    }
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
        _aplicarCondicionPagoDesdeReferencia: function (oDocHeader) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");
            if (!oModelProyect || !oModelData || !oDocHeader) return;

            const oRaw = oDocHeader._raw || oDocHeader;

            const getVal = (...keys) => {
                for (const k of keys) {
                    const v = oRaw?.[k];
                    if (v !== undefined && v !== null && String(v).trim() !== "") {
                        return String(v).trim();
                    }
                }
                return "";
            };

            const sCondPago = getVal("PaymentCondition", "Pmnttrms", "Zterm");
            if (!sCondPago) return;

            const aCondiciones = oModelData.getProperty("/oConditionPay") || [];
            let oMatch = aCondiciones.find(c =>
                String(c.Conditionn || "").trim() === sCondPago
            );

            if (!oMatch) {
                const sTexto = getVal("DescriptionConditionPayment", "PaymentConditionText", "Vtext");
                oMatch = {
                    Conditionn: sCondPago,
                    DesCondition: sTexto || sCondPago
                };
                aCondiciones.unshift(oMatch);
                oModelData.setProperty("/oConditionPay", aCondiciones);
            }

            oModelProyect.setProperty("/inputForm/cbCondPago", oMatch.Conditionn || "");
            oModelProyect.setProperty("/inputForm/txtCondPago", oMatch.DesCondition || "");
        },

    });
});