sap.ui.define([
    "com/aris/registropedido/textiles/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "com/aris/registropedido/textiles/pe/model/models",
    "com/aris/registropedido/textiles/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    '../util/util',
    '../util/utilUI',
    "sap/m/Token",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/aris/registropedido/textiles/pe/services/Services",
], (BaseController, Controller, models, Formatter, JSONModel, util, utilUI, Token, Filter, FilterOperator, Services) => {
    "use strict";

    var that;
    formatter: Formatter;
    return BaseController.extend("com.aris.registropedido.textiles.pe.controller.Detail", {

        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("Detail").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
            const sUserData = localStorage.getItem("oModelUser");
            if (sUserData) {
                const oUserData = JSON.parse(sUserData);
                const oModelUser = new sap.ui.model.json.JSONModel(oUserData);
                this.getView().setModel(oModelUser, "oModelUser");
            }
            this.frgIdEditClient = "frgIdEditClient";
            this.frgIdAddProduct = "frgIdAddProduct";
            this.frgIdAddManualProduct = "frgIdAddManualProduct";
            this.frgIdInfoPartMaterial = "frgIdInfoPartMaterial";
        },
        handleRouteMatched: function (bInit) {
            sap.ui.core.BusyIndicator.show(0)
            let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
            let oProj = this.getView().getModel("oModelProyect");
            if (!oProj) {
                oProj = new sap.ui.model.json.JSONModel(models.createModelProyect());
                this.getView().setModel(oProj, "oModelProyect");
            }
            let oInputForm = oProj.getProperty("/inputForm") || {};
            let sCurrency = (oInputForm.moneda || "").trim();
            if (typeof this._updateFormState === "function") {
                this._updateFormState(); // <- aquí dentro tú ya pones PEN, etc.
                oInputForm = oProj.getProperty("/inputForm") || {};
                sCurrency = (oInputForm.moneda || "").trim();
            }
            if (!sCurrency) {
                sCurrency = "PEN";
                oInputForm.moneda = sCurrency;
                oProj.setProperty("/inputForm", oInputForm);
            }
            Promise.all([
                that._getPrueba(),                     // 0
                that._getDatClientView(sCustomer),     // 1
                that._getMaterialStock(),              // 2
                that._getClientPet(sCustomer),         // 3
                that._getTipChangeData(),              // 4
                that._getUsers(),                      // 5
                that._getBPVendedor(),                 // 6
                that._getDescriptionMaterial(),        // 7
                that._getAddresTravel(sCustomer),      // 8
                that._getCOnditionPay(),               // 9
                that._getReason(),                     // 10
                that._getAnticipo(sCustomer, sCurrency), // 11
                that._getNotaCredito(sCustomer, sCurrency), // 12
                that._getPrincipalSeller(sCustomer),   // 13
                that._getPortEmbarkation()             // 14
            ]).then((values) => {
                let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");
                that.oModelData = that.getModel("oModelData");
                that.oModelProyect.setProperty("/isFormEnabled", false);
                that.oModelProyect.setProperty("/isDetailEdit", false);
                that.oModelData.setSizeLimit(900000);

                if (typeof that._applyExternalZPEFDetailLock === "function") {
                    that._applyExternalZPEFDetailLock();
                }

                const oMaterialResp = values[2];

                if (oMaterialResp && oMaterialResp.sEstado === "S") {
                    that.oModelData.setProperty("/oFilterMaterial", oMaterialResp.oResults);
                    that.oModelData.setProperty("/ListMaterial", oMaterialResp.ListMaterial);
                    that.oModelData.setProperty("/ListBrand", oMaterialResp.ListBrand);
                    that.oModelData.setProperty("/ListArtTextil", oMaterialResp.ListArtTextil);
                    that.oModelData.setProperty("/ListOrillo", oMaterialResp.ListOrillo);;
                    that.oModelData.setProperty("/ListBrandSug", oMaterialResp.ListBrand);
                    that.oModelData.setProperty("/ListArtTextilSug", oMaterialResp.ListArtTextil);
                    that.oModelData.setProperty("/ListOrilloSug", oMaterialResp.ListOrillo);
                }
                let oDataDetalle = values[3].oResults;
                let oDetailCliendFilter = oDataDetalle.filter(item => item.Customer == sCustomer);

                if (oDetailCliendFilter.length > 0) {
                    that.oModelProyect.setProperty("/oDatClient", oDetailCliendFilter[0]);
                }



                const aDatClient = values[1]?.oResults || [];

                const oClientDataCurrent = aDatClient.find(function (item) {
                    return String(item.Customer || "").trim() === String(sCustomer || "").trim();
                }) || {};

                if (oClientDataCurrent && Object.keys(oClientDataCurrent).length) {
                    that.oModelProyect.setProperty("/oClientData", oClientDataCurrent);
                }

                const oPrincipalSeller = values[13]?.oResults || null;

                if (oPrincipalSeller) {
                    that.oModelProyect.setProperty("/oPrincipalSeller", oPrincipalSeller);
                }

                const oCacheFormClient = that._getFormClientCacheForDetail(sCustomer) || {};
                const oInputCache = oCacheFormClient.inputForm || {};

                if (oInputCache.tipoEmbarque || oInputCache.tipoEmbarqueText) {
                    that.oModelProyect.setProperty(
                        "/inputForm/tipoEmbarque",
                        String(oInputCache.tipoEmbarque || "").trim()
                    );

                    that.oModelProyect.setProperty(
                        "/inputForm/tipoEmbarqueText",
                        String(oInputCache.tipoEmbarqueText || "").trim()
                    );
                }

                if (oInputCache.puertoEmbarque || oInputCache.puertoEmbarqueText) {
                    that.oModelProyect.setProperty(
                        "/inputForm/puertoEmbarque",
                        String(oInputCache.puertoEmbarque || "").trim()
                    );

                    that.oModelProyect.setProperty(
                        "/inputForm/puertoEmbarqueText",
                        String(oInputCache.puertoEmbarqueText || "").trim()
                    );
                }

                let oSellerPrincipal = that._resolveSellerPrincipal(
                    oClientDataCurrent,
                    oPrincipalSeller
                );

                if (!oSellerPrincipal.kunn2 && !oSellerPrincipal.Seller) {
                    oSellerPrincipal = {
                        kunn2:
                            oCacheFormClient.sellerPrincipalKunn2 ||
                            oCacheFormClient.oSellerPrincipalSelected?.kunn2 ||
                            oCacheFormClient.inputForm?.sellerPrincipalKunn2 ||
                            oCacheFormClient.oClientData?.kunn2 ||
                            "",
                        Seller:
                            oCacheFormClient.sellerPrincipalName ||
                            oCacheFormClient.oSellerPrincipalSelected?.Seller ||
                            oCacheFormClient.inputForm?.sellerPrincipalName ||
                            oCacheFormClient.oClientData?.Seller ||
                            ""
                    };
                }

                if (!oSellerPrincipal.kunn2 && !oSellerPrincipal.Seller) {
                    oSellerPrincipal = {
                        kunn2:
                            that.oModelProyect.getProperty("/inputForm/sellerPrincipalKunn2") ||
                            that.oModelProyect.getProperty("/oSellerPrincipalSelected/kunn2") ||
                            that.oModelProyect.getProperty("/oClientData/kunn2") ||
                            "",
                        Seller:
                            that.oModelProyect.getProperty("/inputForm/sellerPrincipalName") ||
                            that.oModelProyect.getProperty("/oSellerPrincipalSelected/Seller") ||
                            that.oModelProyect.getProperty("/oClientData/Seller") ||
                            ""
                    };
                }

                void 0;

                if (oSellerPrincipal.kunn2 || oSellerPrincipal.Seller) {
                    that.oModelProyect.setProperty("/oSellerPrincipalSelected", {
                        kunn2: oSellerPrincipal.kunn2 || "",
                        Seller: oSellerPrincipal.Seller || ""
                    });

                    that.oModelProyect.setProperty("/inputForm/sellerPrincipalKunn2", oSellerPrincipal.kunn2 || "");
                    that.oModelProyect.setProperty("/inputForm/sellerPrincipalName", oSellerPrincipal.Seller || "");

                    that.oModelProyect.setProperty("/oClientData/kunn2", oSellerPrincipal.kunn2 || "");
                    that.oModelProyect.setProperty("/oClientData/Seller", oSellerPrincipal.Seller || "");
                }

                if (typeof that._applyExternalZPEFDetailLock === "function") {
                    that._applyExternalZPEFDetailLock();
                }
                let oData = values[4].oResults;
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
                const oBrandResp = values[7];
                if (oBrandResp && oBrandResp.sEstado === "S") {
                    that.oModelData.setProperty("/ListBrand", oBrandResp.oResults);
                    that.oModelData.setProperty("/ListBrandSug", oBrandResp.oResults);
                }
                that.oModelProyect.getProperty("/oDetalle");
                that.oModelProyect.getProperty("/oFormCliente");
                that.oModelProyect.getProperty("/oSelectDetail");
                let aAgencias = values[8].oResults;
                if (aAgencias && aAgencias.length) {
                    const aSoloAgencias = aAgencias.filter(item => item.Agencyname && item.Customer);
                    const aSoloDestinos = aAgencias.filter(item => item.Destination && item.Destinationid);

                    that.oModelProyect.setProperty("/oAgenciasCliente", aSoloAgencias);
                    that.oModelProyect.setProperty("/oDestinosCliente", aSoloDestinos);
                }
                that.oModelData.setProperty("/oConditionPay", values[9].oResults);
                const aPortEmbarkationRaw = values[14]?.oResults || [];
                const aPortEmbarkation = that._normalizePortEmbarkation(aPortEmbarkationRaw);

                that.oModelData.setProperty("/oPortEmbarkation", aPortEmbarkation);
                that._resolvePuertoDestinoText();
                const oAnticipoResp = values[11];
                const oNotaCreditoResp = values[12];

                const sSalesOrgNC = "1110";
                const aAnticipoItems = Array.isArray(oAnticipoResp?.oResults) ? oAnticipoResp.oResults : [];

                const fTotalAnticipo = aAnticipoItems.reduce((acc, it) => {
                    const n = parseFloat(String(it?.OutstandingAmount ?? "0").replace(/,/g, "").trim());
                    return acc + (isNaN(n) ? 0 : n);
                }, 0);
                that.oModelData.setProperty("/Anticipo", {
                    items: aAnticipoItems,
                    OutstandingAmount: fTotalAnticipo,
                    Currency: aAnticipoItems[0]?.Currency || sCurrency
                });

                const aNotaCreditoItems = Array.isArray(oNotaCreditoResp?.oResults) ? oNotaCreditoResp.oResults : [];
                const aNotaCreditoFiltrado = aNotaCreditoItems.filter(it => String(it?.SalesOrganization ?? "").trim() === sSalesOrgNC);
                const fTotalNotaCredito = aNotaCreditoFiltrado.reduce((acc, it) => {
                    const n = parseFloat(String(it?.TotalAmount ?? "0").replace(/,/g, "").trim());
                    return acc + (isNaN(n) ? 0 : n);
                }, 0);

                that.oModelData.setProperty("/NotaCredito", {
                    items: aNotaCreditoItems,
                    NotaCredito: fTotalNotaCredito,
                    Currency: aNotaCreditoItems[0]?.Currency || sCurrency,
                    SalesOrganization: sSalesOrgNC
                });
                that.getView().getModel("oModelProyect").setProperty("/oMaterial", []);
                that._initMaterialFromReferencia();
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
                const oUserResp = values[5];
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
                    const aClientes = values[3]?.oResults || [];
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
                    const oVendResp = values[6]?.oResults;
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
                        .map(v => v.orgventas); // ejemplo: ["1110", "1120"]

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

        _getCantidadFromMap: function (oCantidades, oItem) {
            oCantidades = oCantidades || {};
            oItem = oItem || {};

            const sItm = String(oItem.ItmNumber || "").trim();
            const sMat = String(oItem.Material || oItem.Matnr || "").trim();

            let vCantidad = "";

            // Prioridad: posición. Esto evita que dos líneas del mismo material se pisen.
            if (sItm && oCantidades[sItm] !== undefined) {
                vCantidad = oCantidades[sItm];
            } else if (sMat && oCantidades[sMat] !== undefined) {
                // Fallback para datos antiguos que todavía estén guardados por material.
                vCantidad = oCantidades[sMat];
            } else if (oItem.cantidad !== undefined) {
                vCantidad = oItem.cantidad;
            } else if (oItem.Cantidad !== undefined) {
                vCantidad = oItem.Cantidad;
            }

            const nCantidad = parseFloat(String(vCantidad || "0").replace(",", "."));
            return isNaN(nCantidad) ? 0 : nCantidad;
        },

        _initMaterialFromReferencia: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) { return; }

            const aPosRef = oModel.getProperty("/inputForm/posRefSeleccionadas") || [];
            if (!aPosRef.length) { return; }

            let aMaterialSAP = oModel.getProperty("/oMaterial") || [];
            let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            const oCantidades = oModel.getProperty("/oCantidades") || {};

            // Si ya hay materiales cargados, no duplicar
            if (aMaterialSAP.length || aMaterialUI.length) {
                return;
            }

            const oDatClient = oModel.getProperty("/oDatClient") || {};
            const sCliente = oDatClient.Customer || "";
            const sPlant = oDatClient.Plant || "1000";

            let iItm = 10;

            aPosRef.forEach(function (pos) {
                const sMat = pos.Material || "";
                if (!sMat) { return; }

                const sItmNumber = String(iItm).padStart(6, "0");
                iItm += 10;

                const sCantPend = pos.CtdPendiente || "0.000";
                const sCantPed = pos.CtdPedido && pos.CtdPedido !== "0.000"
                    ? pos.CtdPedido
                    : sCantPend;

                // Cantidad para este material (clave = código de material)
                oCantidades[sItmNumber] = sCantPed;

                // Ítem para BAPI
                aMaterialSAP.push({
                    ClienteId: sCliente,
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    Brand: pos.Brand || "",
                    TargetQu: pos.UM || "MTS",
                    Plant: sPlant,
                    RefDoc: pos.RefDoc,
                    RefDocIt: pos.RefDocIt,
                    RefDocCa: pos.RefDocCa
                });

                // Ítem para UI
                aMaterialUI.push({
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    Descriptions: pos.Descripcion || "",
                    cantidad: sCantPed,
                    UMV: pos.UM || "MTS",
                    Brand: pos.Brand || "",
                    StockDispo: sCantPend,
                    Kbetr: 0,
                    subtotal: 0,
                    descuentos: 0,
                    impuesto: 0,
                    total: 0,
                    esBolsa: false
                });
            });

            oModel.setProperty("/oMaterial", aMaterialSAP);
            oModel.setProperty("/oMaterialUI", aMaterialUI);
            oModel.setProperty("/oCantidades", oCantidades);
            oModel.refresh(true);
            if (aMaterialSAP.length) {
                this.onSimulateOrder();
            }
        },
        _afterOpenAddPedido: function () {
            const oData = this._oContextMaterialEdit?.getObject();

            if (oData) {
                const oInputCantidad = sap.ui.core.Fragment.byId(this.frgIdEditClient, "inputCantidadModificada");
                const oTextCodigo = sap.ui.core.Fragment.byId(this.frgIdEditClient, "textCodigoMaterial");

                if (oInputCantidad) oInputCantidad.setValue(oData.cantidad);
                if (oTextCodigo) oTextCodigo.setText(oData.Matnr);
            }
        },
        _onPressAddProduct: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!this._validateGrupoMaterialRequired("agregar materiales")) {
                return;
            }

            const bValidaBolsas = this._shouldValidateBolsas();

            if (bValidaBolsas && oModel) {
                const aMatUI = oModel.getProperty("/oMaterialUI") || [];
                const bTieneBolsa = aMatUI.some(function (it) {
                    return !!it.esBolsa;
                });

                if (bTieneBolsa) {
                    this.getMessageBox(
                        "warning",
                        "Primero elimine la línea de bolsas para agregar más productos y luego vuelva a calcular las bolsas."
                    );
                    return;
                }
            }
            let that = this;
            sap.ui.core.BusyIndicator.show();

            Promise.resolve().then(() => {
                let oJSONModel = this.getView().getModel("oModelProyect");

                if (!oJSONModel) {
                    oJSONModel = new sap.ui.model.json.JSONModel(models.createModelProyect());
                    this.getView().setModel(oJSONModel, "oModelProyect");
                } else {
                    let oCurrent = oJSONModel.getData();
                    let oBase = models.createModelProyect();

                    oBase.oMaterialSelect = oCurrent.oMaterialSelect || [];
                    oCurrent.oSelectDetail = oBase.oSelectDetail;
                    oJSONModel.setData(oCurrent);
                }
                this._resetMaterialFilters();
                this.setFragment(
                    "_dialogAddManualProduct",
                    this.frgIdAddManualProduct,
                    "AddManualProduct",
                    this
                );

                sap.ui.core.BusyIndicator.hide();
            }).catch((oError) => {
                this.getMessageBox("error", this.getI18nText("errorData"));
                void 0;
                sap.ui.core.BusyIndicator.hide();
            });
        },
        onSuggestMaterial: function (oEvent) {
            const sValue = (oEvent.getParameter("suggestValue") || "").trim();
            this._GetFiltroMaterial(sValue, "/oFilterMaterial");
        },
        onSuggestArtTextil: function (oEvent) {
            const sValue = (oEvent.getParameter("suggestValue") || "").trim();
            // llena oModelData>/ListArtTextilSug
            this._GetFiltroArtTextil(sValue, "/ListArtTextilSug");
        },

        onArtTextilChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            this._GetFiltroArtTextil(sValue, "/ListArtTextilSug");
        },
        onOrilloChange: function (oEvent) {
            const sValue = (oEvent.getParameter("suggestValue") || "").trim();
            this._GetFiltroOrilloPrefixSuggest(sValue, "/oFiltroOrilloSuggest");
        },

        onMaterialSuggestionSelected: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) { return; }

            const sKey = String(oItem.getKey() || "").trim();
            const sText = String(oItem.getText() || "").trim();

            if (!sKey) { return; }

            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");

            const aTokens = oMI.getTokens() || [];
            const bExiste = aTokens.some(function (oToken) {
                return String(oToken.getKey() || oToken.getText() || "").trim() === sKey;
            });

            if (!bExiste) {
                oMI.addToken(new Token({
                    key: sKey,
                    text: sText || sKey
                }));
            }

            const aKeys = Array.from(new Set(
                (oMI.getTokens() || [])
                    .map(function (oToken) {
                        return String(oToken.getKey() || oToken.getText() || "").trim();
                    })
                    .filter(Boolean)
            ));

            oModelProyect.setProperty("/oSelectDetail/aMaterials", aKeys);
            oModelProyect.setProperty("/oSelectDetail/material", aKeys.length ? aKeys[aKeys.length - 1] : "");

            oMI.setValue("");

            void 0;
        },

        // MARCA
        onBrandSelectionFinish: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oModelProyect = this.getView().getModel("oModelProyect");
            const aBrands = aSelectedItems.map(function (oItem) {
                return oItem.getKey();
            });

            // Guardar array completo
            oModelProyect.setProperty("/oSelectDetail/aBrands", aBrands);
            const oLast = aSelectedItems[aSelectedItems.length - 1];
            if (oLast) {
                oModelProyect.setProperty("/oSelectDetail/Brand", oLast.getKey());
                oModelProyect.setProperty("/oSelectDetail/BrandText", oLast.getText());
            }
        },
        // ART. TEXTIL
        onArtTextilSuggestionSelected: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) return;

            const sKey = (oItem.getKey() || "").trim();
            const sText = (oItem.getText() || "").trim();

            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");
            const aTokens = oMI.getTokens() || [];
            const bExiste = aTokens.some(t => (t.getKey() || "").trim() === sKey);
            if (!bExiste) {
                oMI.addToken(new Token({ key: sKey, text: sText }));
            }
            const aArtOld = oModelProyect.getProperty("/oSelectDetail/aArtTextil") || [];
            const aArtNew = Array.from(new Set([...aArtOld, sKey]));

            oModelProyect.setProperty("/oSelectDetail/aArtTextil", aArtNew);
            oModelProyect.setProperty("/oSelectDetail/ArtTextil", sKey);

            oMI.setValue("");
        },
        // ORILLO
        onOrilloSuggestionItemSelected: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) return;

            const sKey = (oItem.getKey() || "").trim();
            const sText = (oItem.getText() || "").trim();

            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");

            const aTokens = oMI.getTokens() || [];
            const bExists = aTokens.some(t => t.getKey() === sKey);

            if (!bExists) {
                oMI.addToken(new Token({ key: sKey, text: sText }));
            }

            const aOld = oModelProyect.getProperty("/oSelectDetail/aOrillo") || [];
            const aNew = Array.from(new Set([...aOld, sKey]));

            oModelProyect.setProperty("/oSelectDetail/aOrillo", aNew);

            oMI.setValue("");
        },
        onMaterialTokenUpdate: function (oEvent) {
            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");

            let aKeys = (oMI.getTokens() || [])
                .map(function (oToken) {
                    return String(oToken.getKey() || oToken.getText() || "").trim();
                })
                .filter(Boolean);

            const aAdded = oEvent.getParameter("addedTokens") || [];
            const aRemoved = oEvent.getParameter("removedTokens") || [];

            aAdded.forEach(function (oToken) {
                const sKey = String(oToken.getKey() || oToken.getText() || "").trim();
                if (sKey && !aKeys.includes(sKey)) {
                    aKeys.push(sKey);
                }
            });

            const aRemovedKeys = aRemoved.map(function (oToken) {
                return String(oToken.getKey() || oToken.getText() || "").trim();
            }).filter(Boolean);

            if (aRemovedKeys.length) {
                aKeys = aKeys.filter(function (sKey) {
                    return !aRemovedKeys.includes(sKey);
                });
            }

            aKeys = Array.from(new Set(aKeys));

            oModelProyect.setProperty("/oSelectDetail/aMaterials", aKeys);
            oModelProyect.setProperty("/oSelectDetail/material", aKeys.length ? aKeys[aKeys.length - 1] : "");

            void 0;
        },
        onArtTextilTokenUpdate: function (oEvent) {
            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");

            const aKeys = Array.from(new Set((oMI.getTokens() || []).map(t => t.getKey())));
            oModelProyect.setProperty("/oSelectDetail/aArtTextil", aKeys);
            oModelProyect.setProperty("/oSelectDetail/ArtTextil", aKeys.length ? aKeys[aKeys.length - 1] : "");
        },
        _getTokenKeysFromMultiInput: function (oControl) {
            if (!oControl || !oControl.getTokens) {
                return [];
            }

            return Array.from(new Set(
                (oControl.getTokens() || [])
                    .map(function (oToken) {
                        return String(oToken.getKey() || oToken.getText() || "").trim();
                    })
                    .filter(Boolean)
            ));
        },

        _auditMultiInputToken: function (sControlId, sLabel) {
            const oControl = this._byId(this.frgIdAddManualProduct + "--" + sControlId);

            if (!oControl) {
                return {
                    ok: true,
                    keys: []
                };
            }

            const aKeys = this._getTokenKeysFromMultiInput(oControl);
            const sRawValue = String(oControl.getValue ? (oControl.getValue() || "") : "").trim();

            if (sRawValue) {
                return {
                    ok: false,
                    keys: aKeys,
                    message: sLabel + ": el valor escrito '" + sRawValue + "' no fue seleccionado como token. Seleccione una sugerencia válida antes de buscar."
                };
            }

            return {
                ok: true,
                keys: aKeys
            };
        },

        _auditMultiComboBoxSelection: function (sControlId, sLabel) {
            const oControl = this._byId(this.frgIdAddManualProduct + "--" + sControlId);

            if (!oControl) {
                return {
                    ok: true,
                    keys: []
                };
            }

            const aKeys = oControl.getSelectedKeys ? (oControl.getSelectedKeys() || []) : [];
            const sRawValue = String(oControl.getValue ? (oControl.getValue() || "") : "").trim();

            if (sRawValue) {
                return {
                    ok: false,
                    keys: aKeys,
                    message: sLabel + ": el valor escrito '" + sRawValue + "' no fue seleccionado. Seleccione una marca válida antes de buscar."
                };
            }

            return {
                ok: true,
                keys: aKeys
            };
        },

        onOrilloTokenUpdate: function (oEvent) {
            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");

            const aKeys = this._getTokenKeysFromMultiInput(oMI);

            oModelProyect.setProperty("/oSelectDetail/aOrillo", aKeys);
            oModelProyect.setProperty("/oSelectDetail/Orillo", aKeys.length ? aKeys[aKeys.length - 1] : "");
        },

        _getAddManualControl: function (sId) {
            return sap.ui.getCore().byId(this.frgIdAddManualProduct + "--" + sId) ||
                this.byId(sId) ||
                sap.ui.getCore().byId(sId);
        },

        _getTokenKeysFromMultiInput: function (oControl) {
            if (!oControl || !oControl.getTokens) {
                return [];
            }

            return Array.from(new Set(
                (oControl.getTokens() || [])
                    .map(function (oToken) {
                        return String(oToken.getKey() || oToken.getText() || "").trim();
                    })
                    .filter(Boolean)
            ));
        },

        _syncMultiInputTokensToModel: function (oControl, sArrayPath, sLastPath) {
            const oModel = this.getView().getModel("oModelProyect");
            const aKeys = this._getTokenKeysFromMultiInput(oControl);

            oModel.setProperty(sArrayPath, aKeys);
            oModel.setProperty(sLastPath, aKeys.length ? aKeys[aKeys.length - 1] : "");

            return aKeys;
        },

        _refreshDialogItems: function (oDialog) {
            const oBinding = oDialog && oDialog.getBinding ? oDialog.getBinding("items") : null;

            if (oBinding) {
                oBinding.filter([]);
                if (oBinding.refresh) {
                    oBinding.refresh(true);
                }
            }
        },

        _prepareVHMaterialItems: function (sValue) {
            const oModelData = this.getView().getModel("oModelData");
            const oModel = this.getView().getModel("oModelProyect");

            const sSearch = String(sValue || "").trim().toUpperCase();
            const sGrupo = String(oModel.getProperty("/inputForm/grupoMaterial") || "").trim();

            const aBase =
                oModelData.getProperty("/oFilterMaterialFull") ||
                oModelData.getProperty("/oFilterMaterial") ||
                [];

            const aOut = [];
            const mSeen = {};
            const iMax = sSearch ? 200 : 100;

            for (let i = 0; i < aBase.length; i++) {
                const item = aBase[i] || {};
                const sMaterial = String(item.Material || "").trim();
                const sDesc = String(item.Description || "").trim();
                const sMatGroup = String(item.MaterialGroup || "").trim();

                if (!sMaterial || mSeen[sMaterial]) {
                    continue;
                }

                if (sGrupo && sMatGroup && sMatGroup !== sGrupo) {
                    continue;
                }

                if (sSearch) {
                    const sCompare = (sMaterial + " " + sDesc).toUpperCase();
                    if (!sCompare.includes(sSearch)) {
                        continue;
                    }
                }

                mSeen[sMaterial] = true;

                aOut.push({
                    Material: sMaterial,
                    Description: sDesc
                });

                if (aOut.length >= iMax) {
                    break;
                }
            }

            oModelData.setProperty("/oVHMaterialItems", aOut);
        },

        _prepareVHArtTextilItems: function (sValue) {
            const oModelData = this.getView().getModel("oModelData");
            const sSearch = String(sValue || "").trim().toUpperCase();

            const aBase = oModelData.getProperty("/ListArtTextil") || [];
            const aOut = [];
            const mSeen = {};

            for (let i = 0; i < aBase.length; i++) {
                const item = aBase[i] || {};

                const sKey = String(item.key || item.TextileArticleQuality || "").trim();
                const sText = String(item.text || "").trim();
                const sDesc = String(item.desc || "").trim();

                if (!sKey || mSeen[sKey]) {
                    continue;
                }

                if (sSearch) {
                    const sCompare = (sKey + " " + sText + " " + sDesc).toUpperCase();
                    if (!sCompare.includes(sSearch)) {
                        continue;
                    }
                }

                mSeen[sKey] = true;

                aOut.push({
                    key: sKey,
                    text: sText || sKey,
                    desc: sDesc || sText || sKey
                });

                if (aOut.length >= 200) {
                    break;
                }
            }

            oModelData.setProperty("/oVHArtTextilItems", aOut);
        },

        _prepareVHOrilloItems: function (sValue) {
            const oModelData = this.getView().getModel("oModelData");
            const sSearch = String(sValue || "").trim();

            let aBase = oModelData.getProperty("/ListOrilloSug") || [];

            const mUnique = {};

            (aBase || []).forEach(function (item) {
                const sRaw = typeof item === "string"
                    ? item
                    : String(item.key || item.Display || item.OrilloPrefix2 || "").trim();

                const m = String(sRaw || "").match(/(\d+)/);
                if (!m || !m[1]) {
                    return;
                }

                const sPrefix = m[1].substring(0, 2);

                if (!sPrefix || !/^\d{2}$/.test(sPrefix)) {
                    return;
                }

                if (sSearch && !sPrefix.includes(sSearch)) {
                    return;
                }

                mUnique[sPrefix] = {
                    key: sPrefix,
                    Display: sPrefix
                };
            });

            const aOut = Object.values(mUnique).sort(function (a, b) {
                return String(a.key).localeCompare(String(b.key), undefined, { numeric: true });
            });

            oModelData.setProperty("/oVHOrilloItems", aOut);
        },

        onOpenMaterialDialog: function () {
            if (!this._oVHMaterialRegistro) {
                this._oVHMaterialRegistro = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "com.aris.registropedido.textiles.pe.view.dialogs.ValueHelpMaterialRegistro",
                    this
                );
                this.getView().addDependent(this._oVHMaterialRegistro);
            }

            const oMI = this._getAddManualControl("miMaterial");
            const sTyped = oMI && oMI.getValue ? oMI.getValue() : "";

            this._prepareVHMaterialItems(sTyped);
            this._oVHMaterialRegistro.open(sTyped);
        },

        onMaterialDialogSearch: function (oEvent) {
            const sValue = String(oEvent.getParameter("value") || "").trim();
            this._prepareVHMaterialItems(sValue);
            this._refreshDialogItems(oEvent.getSource());
        },

        onDialogMaterialConfirm: function (oEvent) {
            const oMI = this._getAddManualControl("miMaterial");
            if (!oMI) {
                return;
            }

            const aExisting = this._getTokenKeysFromMultiInput(oMI);
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];

            aSelectedItems.forEach(function (oItem) {
                const sKey = String(oItem.getTitle() || "").trim();
                const sDesc = String(oItem.getDescription() || "").trim();

                if (!sKey || aExisting.includes(sKey)) {
                    return;
                }

                oMI.addToken(new Token({
                    key: sKey,
                    text: sDesc ? (sKey + " - " + sDesc) : sKey
                }));

                aExisting.push(sKey);
            });

            oMI.setValue("");

            this._syncMultiInputTokensToModel(
                oMI,
                "/oSelectDetail/aMaterials",
                "/oSelectDetail/material"
            );

            this._refreshDialogItems(oEvent.getSource());
        },

        onDialogMaterialCancel: function (oEvent) {
            this._refreshDialogItems(oEvent.getSource());
        },

        onOpenArtTextilDialog: function () {
            if (!this._oVHArtTextilRegistro) {
                this._oVHArtTextilRegistro = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "com.aris.registropedido.textiles.pe.view.dialogs.ValueHelpArtTextilRegistro",
                    this
                );
                this.getView().addDependent(this._oVHArtTextilRegistro);
            }

            const oMI = this._getAddManualControl("miArtTextil");
            const sTyped = oMI && oMI.getValue ? oMI.getValue() : "";

            this._prepareVHArtTextilItems(sTyped);
            this._oVHArtTextilRegistro.open(sTyped);
        },

        onArtTextilDialogSearch: function (oEvent) {
            const sValue = String(oEvent.getParameter("value") || "").trim();
            this._prepareVHArtTextilItems(sValue);
            this._refreshDialogItems(oEvent.getSource());
        },

        onDialogArtTextilConfirm: function (oEvent) {
            const oMI = this._getAddManualControl("miArtTextil");
            if (!oMI) {
                return;
            }

            const aExisting = this._getTokenKeysFromMultiInput(oMI);
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];

            aSelectedItems.forEach(function (oItem) {
                const sKey = String(oItem.getTitle() || "").trim();
                const sDesc = String(oItem.getDescription() || "").trim();

                if (!sKey || aExisting.includes(sKey)) {
                    return;
                }

                oMI.addToken(new Token({
                    key: sKey,
                    text: sDesc && sDesc !== sKey ? (sKey + " - " + sDesc) : sKey
                }));

                aExisting.push(sKey);
            });

            oMI.setValue("");

            this._syncMultiInputTokensToModel(
                oMI,
                "/oSelectDetail/aArtTextil",
                "/oSelectDetail/ArtTextil"
            );

            this._refreshDialogItems(oEvent.getSource());
        },

        onDialogArtTextilCancel: function (oEvent) {
            this._refreshDialogItems(oEvent.getSource());
        },

        onOpenOrilloDialog: function () {
            if (!this._oVHOrilloRegistro) {
                this._oVHOrilloRegistro = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "com.aris.registropedido.textiles.pe.view.dialogs.ValueHelpOrilloRegistro",
                    this
                );
                this.getView().addDependent(this._oVHOrilloRegistro);
            }

            const oMI = this._getAddManualControl("miOrillo");
            const sTyped = oMI && oMI.getValue ? oMI.getValue() : "";

            this._prepareVHOrilloItems(sTyped);
            this._oVHOrilloRegistro.open(sTyped);
        },

        onOrilloDialogSearch: function (oEvent) {
            const sValue = String(oEvent.getParameter("value") || "").trim();
            this._prepareVHOrilloItems(sValue);
            this._refreshDialogItems(oEvent.getSource());
        },

        onDialogOrilloConfirm: function (oEvent) {
            const oMI = this._getAddManualControl("miOrillo");
            if (!oMI) {
                return;
            }

            const aExisting = this._getTokenKeysFromMultiInput(oMI);
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];

            aSelectedItems.forEach(function (oItem) {
                const sKey = String(oItem.getTitle() || "").trim();

                if (!sKey || aExisting.includes(sKey)) {
                    return;
                }

                oMI.addToken(new Token({
                    key: sKey,
                    text: sKey
                }));

                aExisting.push(sKey);
            });

            oMI.setValue("");

            this._syncMultiInputTokensToModel(
                oMI,
                "/oSelectDetail/aOrillo",
                "/oSelectDetail/Orillo"
            );

            this._refreshDialogItems(oEvent.getSource());
        },

        onDialogOrilloCancel: function (oEvent) {
            this._refreshDialogItems(oEvent.getSource());
        },

        onOrilloTokenUpdate: function (oEvent) {
            const oMI = oEvent.getSource();

            this._syncMultiInputTokensToModel(
                oMI,
                "/oSelectDetail/aOrillo",
                "/oSelectDetail/Orillo"
            );
        },

        onBuscarPress: async function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oInputForm = oModel.getProperty("/inputForm") || {};

            const oMatAudit = this._auditMultiInputToken("miMaterial", "Código de Material");
            if (!oMatAudit.ok) {
                this.getMessageBox("warning", oMatAudit.message);
                return;
            }

            const oArtAudit = this._auditMultiInputToken("miArtTextil", "Artículo Textil");
            if (!oArtAudit.ok) {
                this.getMessageBox("warning", oArtAudit.message);
                return;
            }

            const oOriAudit = this._auditMultiInputToken("miOrillo", "Orillo");
            if (!oOriAudit.ok) {
                this.getMessageBox("warning", oOriAudit.message);
                return;
            }

            const oBrandAudit = this._auditMultiComboBoxSelection("mcBrand", "Marca");
            if (!oBrandAudit.ok) {
                this.getMessageBox("warning", oBrandAudit.message);
                return;
            }

            const aMaterialTokens = oMatAudit.keys || [];
            const aArtTextilTokens = oArtAudit.keys || [];
            const aOrilloTokens = oOriAudit.keys || [];
            const aBrandKeys = oBrandAudit.keys || [];

            oModel.setProperty("/oSelectDetail/aMaterials", aMaterialTokens);
            oModel.setProperty("/oSelectDetail/material", aMaterialTokens.length ? aMaterialTokens[aMaterialTokens.length - 1] : "");

            oModel.setProperty("/oSelectDetail/aArtTextil", aArtTextilTokens);
            oModel.setProperty("/oSelectDetail/ArtTextil", aArtTextilTokens.length ? aArtTextilTokens[aArtTextilTokens.length - 1] : "");

            oModel.setProperty("/oSelectDetail/aOrillo", aOrilloTokens);
            oModel.setProperty("/oSelectDetail/Orillo", aOrilloTokens.length ? aOrilloTokens[aOrilloTokens.length - 1] : "");

            oModel.setProperty("/oSelectDetail/aBrands", aBrandKeys);
            oModel.setProperty("/oSelectDetail/Brand", aBrandKeys.length ? aBrandKeys[aBrandKeys.length - 1] : "");

            const bTieneFiltroReal =
                aMaterialTokens.length > 0 ||
                aArtTextilTokens.length > 0 ||
                aOrilloTokens.length > 0 ||
                aBrandKeys.length > 0;

            if (!bTieneFiltroReal) {
                this.getMessageBox(
                    "warning",
                    "Debe seleccionar al menos un token válido de Material, Artículo Textil u Orillo, o seleccionar una Marca. No se ejecutará la búsqueda solo con Grupo de Material para evitar una consulta masiva."
                );
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            try {
                const jFilter = {
                    cbMaterialGroup: oInputForm.grupoMaterial ? [oInputForm.grupoMaterial] : [],
                    cbCodMaterial: aMaterialTokens,
                    cbBrand: aBrandKeys,
                    cbTextileArticleQuality: aArtTextilTokens,
                    cbOrilloPrefix2: aOrilloTokens,
                    iMinimumFootage: ""
                };

                void 0;

                const aMaterials = await this._GetFilteredMaterialsRegistro(jFilter);

                if (!Array.isArray(aMaterials) || !aMaterials.length) {
                    oModel.setProperty("/oMaterialBase", []);
                    oModel.setProperty("/oMaterialSelect", []);
                    this.getMessageBox("warning", "No se encontraron materiales con los filtros aplicados.");
                    return;
                }

                oModel.setProperty("/oMaterialBase", aMaterials);

                const aMaterialCodes = Array.from(
                    new Set(aMaterials.map(r => r.Material).filter(Boolean))
                );

                void 0;

                oModel.setProperty("/oMaterialSelect", []);

                const aTotalStock = await this._loadProductoBulk({
                    aMaterials: aMaterialCodes,
                    SalesOrg: "1110",
                    Plant: "1000",
                    Pedven: true,
                    ChunkSize: 30,
                    PaintPartial: true
                });

                const aPreparedFinal = this._prepareDataForTextilesPedido(aTotalStock);
                oModel.setProperty("/oMaterialSelect", aPreparedFinal);

            } catch (e) {
                void 0;
                this.getMessageBox("error", "Ocurrió un error al buscar materiales.");
            } finally {
                sap.ui.core.BusyIndicator.hide(0);
            }
        },
        _loadProductoBulk: function (oParams) {
            const that = this;

            const aMaterials = (oParams && Array.isArray(oParams.aMaterials)) ? oParams.aMaterials.filter(Boolean) : [];
            const sSalesOrg = (oParams && oParams.SalesOrg) ? oParams.SalesOrg : "1110";
            const sPlant = (oParams && oParams.Plant) ? oParams.Plant : "1000";
            const bPedven = (oParams && oParams.Pedven !== undefined) ? !!oParams.Pedven : true;
            const iChunkSize = (oParams && oParams.ChunkSize) ? parseInt(oParams.ChunkSize, 10) : 30;
            const bPaintPartial = !!(oParams && oParams.PaintPartial);

            const aUnique = Array.from(new Set(aMaterials));
            if (!aUnique.length) {
                return Promise.resolve([]);
            }

            const _createStockModel = () => {
                let sUrl;
                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject()
                        .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route) +
                        "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
                }
                return new sap.ui.model.odata.v2.ODataModel(sUrl, {
                    useBatch: false,
                    defaultBindingMode: "TwoWay"
                });
            };

            const _readChunk = (oModel, aChunk) => {
                return new Promise((resolve, reject) => {
                    // OR: Materialnumber = mat1 OR mat2 ...
                    const aOrMat = aChunk.map(mat =>
                        new sap.ui.model.Filter("Materialnumber", sap.ui.model.FilterOperator.EQ, mat)
                    );
                    const oOr = new sap.ui.model.Filter(aOrMat, false); // false = OR

                    const aFilters = [
                        new sap.ui.model.Filter("Salesorganization", sap.ui.model.FilterOperator.EQ, sSalesOrg),
                        new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sPlant),
                        new sap.ui.model.Filter("Pedven", sap.ui.model.FilterOperator.EQ, bPedven),
                        oOr
                    ];

                    oModel.read("/I_StockDisponibleSet", {
                        filters: aFilters,
                        urlParameters: { "$expand": "toEtextil,toEtextilStockVen" },
                        success: function (oData) {
                            const aRes = [];

                            (oData.results || []).forEach(item => {
                                const aDetTextil = item.toEtextil?.results || [];
                                const aPiezas = item.toEtextilStockVen?.results || [];

                                aDetTextil.forEach(oEtextil => {
                                    const sStockDispoRaw = (oEtextil.StockDispo || "").toString().trim() || "0";
                                    const sStockPedidoRaw = (oEtextil.StockPedido || "").toString().trim() || "0";

                                    const fStock = that._parseSapNumber(sStockDispoRaw);
                                    const fPend = that._parseSapNumber(sStockPedidoRaw);

                                    aRes.push({
                                        Matnr: item.Materialnumber,
                                        Material: item.Materialnumber,
                                        Linea: oEtextil.Linea || "",
                                        Bezei: oEtextil.Bezei || "",
                                        Um: oEtextil.Um || "",

                                        // Valor original SAP
                                        StockDispoRaw: sStockDispoRaw,
                                        StockPedidoRaw: sStockPedidoRaw,

                                        // Valor mostrado en pantalla
                                        StockDispo: that._formatSapStock(fStock, 3),
                                        StockPedido: that._formatSapStock(fPend, 3),

                                        // Valor real para cálculos
                                        StockDispoNum: fStock,
                                        StockPedidoNum: fPend,

                                        stockNegativo: fStock < 0,
                                        state: fStock < 0 ? "Error" : "None",
                                        pieza: aPiezas.length.toString(),
                                        piezasDetalle: aPiezas
                                    });
                                });
                            });

                            resolve(aRes);
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                });
            };

            return (async () => {
                const oStockModel = _createStockModel();
                const aAll = [];
                const oProjModel = that.getView().getModel("oModelProyect");

                for (let i = 0; i < aUnique.length; i += iChunkSize) {
                    const aChunk = aUnique.slice(i, i + iChunkSize);

                    const aChunkRes = await _readChunk(oStockModel, aChunk);
                    aAll.push(...aChunkRes);

                    // Pintado parcial (opcional)
                    if (bPaintPartial && oProjModel) {
                        const aPreparedPartial = that._prepareDataForTextilesPedido(aAll);
                        oProjModel.setProperty("/oMaterialSelect", aPreparedPartial);
                    }
                }

                return aAll;
            })();
        },
        _loadProductoSingle: function (aFiltersStock) {
            const aMat = [];
            (aFiltersStock || []).forEach(f => {
                try {
                    if (f && f.sPath === "Materialnumber" && f.oValue1) {
                        aMat.push(f.oValue1);
                    }
                } catch (e) { }
            });

            return this._loadProductoBulk({
                aMaterials: aMat,
                SalesOrg: "1110",
                Plant: "1000",
                Pedven: true,
                ChunkSize: 30,
                PaintPartial: false
            });
        },
        _onPressAddManual: function () {
            this["_dialogAddProduct"].close();
            this.setFragment("_dialogAddManualProduct", this.frgIdAddManualProduct, "AddManualProduct", this);
        },
        onCalcularBolsas: function () {
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect");

            if (!oModel) {
                sap.m.MessageToast.show("Modelo no disponible.");
                return;
            }

            const bValidaBolsas = this._shouldValidateBolsas();
            if (!bValidaBolsas) {
                sap.m.MessageToast.show(
                    "El cálculo de bolsas solo aplica para pedidos ZCNA / ZPES con grupo de materiales 01 o 02."
                );
                return;
            }

            const bSerieEspecial = this._isSerie80OBelfast();

            this._removeBolsaActual();

            if (bSerieEspecial) {
                const nTotalPiezas = this._getTotalPiezasSinBolsa();
                const PIEZAS_POR_BOLSA = 3;

                if (nTotalPiezas <= 0) {
                    sap.m.MessageToast.show("No hay piezas válidas para calcular bolsas.");
                    return;
                }

                const nBolsasInt = Math.floor(nTotalPiezas / PIEZAS_POR_BOLSA);

                if (isNaN(nBolsasInt) || nBolsasInt <= 0) {
                    sap.m.MessageToast.show(
                        "El cálculo de bolsas no devolvió una cantidad válida. No se generará bolsa."
                    );
                    if ((oModel.getProperty("/oMaterial") || []).length) {
                        this.onSimulateOrder();
                    }
                    return;
                }

                const sGrupoMaterial = oModel.getProperty("/inputForm/grupoMaterial") || "";
                let sBaseUrl = "";

                if (this.local) {
                    sBaseUrl = this.getOwnerComponent()
                        .getManifestObject()
                        .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
                } else {
                    sBaseUrl = jQuery.sap.getModulePath(this.route) +
                        "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
                }

                const oODataModel = new sap.ui.model.odata.v2.ODataModel(sBaseUrl, {
                    useBatch: false,
                    defaultBindingMode: "TwoWay"
                });

                // Solo para obtener el material de bolsa
                const sKey = oODataModel.createKey("/CalBolsasSet", {
                    MaterialGroup: sGrupoMaterial,
                    CanMetros: 100
                });

                sap.ui.core.BusyIndicator.show(0);

                oODataModel.read(sKey, {
                    success: function (oData) {
                        sap.ui.core.BusyIndicator.hide(0);

                        const sMaterialBolsa = oData.Material || "";
                        if (!sMaterialBolsa) {
                            sap.m.MessageToast.show("No se encontró el material de bolsa configurado.");
                            return;
                        }

                        oModel.setProperty("/oCalBolsas", oData);

                        let oAllData = oModel.getData();
                        let aMatSAP = oAllData.oMaterial || [];
                        let aMatUI2 = oAllData.oMaterialUI || [];

                        let nMaxItm = 0;
                        aMatSAP.forEach(function (it) {
                            const n = parseInt(it.ItmNumber || "0", 10);
                            if (!isNaN(n) && n > nMaxItm) {
                                nMaxItm = n;
                            }
                        });

                        const sNextItm = String(nMaxItm + 10).padStart(6, "0");
                        const oFirstItem = aMatSAP[0] || {};
                        const sClienteId = oFirstItem.ClienteId ||
                            (oAllData.oDatClient && oAllData.oDatClient.Customer) || "";
                        const sPlant = oFirstItem.Plant || "1000";
                        const sTargetQ = oFirstItem.TargetQu || "UND";
                        const sUMVBolsa = "PQT";

                        const oItemSAP = {
                            ClienteId: sClienteId,
                            ItmNumber: sNextItm,
                            Material: sMaterialBolsa,
                            TargetQu: sTargetQ,
                            Plant: sPlant
                        };

                        const sCantBolsas = nBolsasInt.toString();

                        const oItemUI = {
                            ItmNumber: sNextItm,
                            Material: sMaterialBolsa,
                            cantidad: sCantBolsas,
                            UMV: sUMVBolsa,
                            Kbetr: 0,
                            subtotal: 0,
                            descuentos: 0,
                            impuesto: 0,
                            total: 0,
                            esBolsa: true
                        };

                        aMatSAP.push(oItemSAP);
                        aMatUI2.push(oItemUI);

                        oModel.setProperty("/oMaterial", aMatSAP);
                        oModel.setProperty("/oMaterialUI", aMatUI2);

                        let oCantidades = oModel.getProperty("/oCantidades") || {};
                        oCantidades[sMaterialBolsa] = sCantBolsas;
                        oModel.setProperty("/oCantidades", oCantidades);

                        oModel.refresh(true);
                        sap.m.MessageToast.show("Cantidad de bolsas calculada: " + sCantBolsas);
                        this.onSimulateOrder();
                    }.bind(this),
                    error: function () {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error("Error al obtener el material de bolsa en SAP.");
                    }
                });

                return;
            }

            const nTotalMetros = this._getTotalMetrosSinBolsa();
            const MIN_METROS_BOLSA = 100;

            if (nTotalMetros < MIN_METROS_BOLSA) {
                sap.m.MessageToast.show(
                    "No se cumple el mínimo de " + MIN_METROS_BOLSA + " metros para calcular una bolsa."
                );

                const aMatSAP = oModel.getProperty("/oMaterial") || [];
                if (aMatSAP.length) {
                    this.onSimulateOrder();
                }

                return;
            }

            const sGrupoMaterial = oModel.getProperty("/inputForm/grupoMaterial") || "";
            let sBaseUrl = "";

            if (this.local) {
                sBaseUrl = this.getOwnerComponent()
                    .getManifestObject()
                    .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
            } else {
                sBaseUrl = jQuery.sap.getModulePath(this.route) +
                    "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
            }

            const oODataModel = new sap.ui.model.odata.v2.ODataModel(sBaseUrl, {
                useBatch: false,
                defaultBindingMode: "TwoWay"
            });

            const nCanMetros = parseFloat(nTotalMetros.toFixed(2));
            if (isNaN(nCanMetros) || nCanMetros <= 0) {
                sap.m.MessageToast.show("Cantidad de metros inválida para cálculo de bolsas.");
                return;
            }

            const sKey = oODataModel.createKey("/CalBolsasSet", {
                MaterialGroup: sGrupoMaterial,
                CanMetros: nCanMetros
            });

            sap.ui.core.BusyIndicator.show(0);

            oODataModel.read(sKey, {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide(0);

                    const sMaterialBolsa = oData.Material || "";
                    const nBolsasRaw = parseFloat((oData.Bolsas || "0").replace(",", "."));
                    const nBolsasInt = Math.floor(nBolsasRaw + 1e-6);

                    if (!sMaterialBolsa || isNaN(nBolsasInt) || nBolsasInt <= 0) {
                        sap.m.MessageToast.show(
                            "El cálculo de bolsas no devolvió una cantidad válida. No se generará bolsa."
                        );
                        if ((oModel.getProperty("/oMaterial") || []).length) {
                            this.onSimulateOrder();
                        }
                        return;
                    }

                    oModel.setProperty("/oCalBolsas", oData);

                    let oAllData = oModel.getData();
                    let aMatSAP = oAllData.oMaterial || [];
                    let aMatUI2 = oAllData.oMaterialUI || [];

                    let nMaxItm = 0;
                    aMatSAP.forEach(function (it) {
                        const n = parseInt(it.ItmNumber || "0", 10);
                        if (!isNaN(n) && n > nMaxItm) {
                            nMaxItm = n;
                        }
                    });

                    const sNextItm = String(nMaxItm + 10).padStart(6, "0");
                    const oFirstItem = aMatSAP[0] || {};
                    const sClienteId = oFirstItem.ClienteId ||
                        (oAllData.oDatClient && oAllData.oDatClient.Customer) || "";
                    const sPlant = oFirstItem.Plant || "1000";
                    const sTargetQ = oFirstItem.TargetQu || "UND";
                    const sUMVBolsa = "PQT";

                    const oItemSAP = {
                        ClienteId: sClienteId,
                        ItmNumber: sNextItm,
                        Material: sMaterialBolsa,
                        TargetQu: sTargetQ,
                        Plant: sPlant
                    };

                    const sCantBolsas = nBolsasInt.toString();

                    const oItemUI = {
                        ItmNumber: sNextItm,
                        Material: sMaterialBolsa,
                        cantidad: sCantBolsas,
                        UMV: sUMVBolsa,
                        Kbetr: 0,
                        subtotal: 0,
                        descuentos: 0,
                        impuesto: 0,
                        total: 0,
                        esBolsa: true
                    };

                    aMatSAP.push(oItemSAP);
                    aMatUI2.push(oItemUI);

                    oModel.setProperty("/oMaterial", aMatSAP);
                    oModel.setProperty("/oMaterialUI", aMatUI2);

                    let oCantidades = oModel.getProperty("/oCantidades") || {};
                    oCantidades[sMaterialBolsa] = sCantBolsas;
                    oModel.setProperty("/oCantidades", oCantidades);

                    oModel.refresh(true);
                    sap.m.MessageToast.show("Cantidad de bolsas calculada: " + sCantBolsas);
                    this.onSimulateOrder();

                }.bind(this),
                error: function () {
                    sap.ui.core.BusyIndicator.hide(0);
                    sap.m.MessageBox.error("Error al calcular bolsas en SAP.");
                }
            });
        },
        //  Helper para el marcado en la tabla
        _getManualTable: function () {
            return (
                this._byId(this.frgIdAddManualProduct + "--tbMaterialesManual") ||
                sap.ui.getCore().byId(this.frgIdAddManualProduct + "--tbMaterialesManual") ||
                sap.ui.getCore().byId("tbMaterialesManual") ||
                this.byId("tbMaterialesManual")
            );
        },
        _setRowSelectedFromInput: function (oInput, bSelected) {
            try {
                const oItem = oInput.getParent && oInput.getParent();
                if (!oItem || !oItem.isA || !oItem.isA("sap.m.ColumnListItem")) return;

                const oTable = oItem.getParent && oItem.getParent();
                if (!oTable || !oTable.isA || !oTable.isA("sap.m.Table")) return;

                // MultiSelect
                if (oTable.setSelectedItem) {
                    oTable.setSelectedItem(oItem, !!bSelected);
                } else if (oItem.setSelected) {
                    oItem.setSelected(!!bSelected);
                }
            } catch (e) {
            }
        },
        _onAcceptProductManual: function (oEvent) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oModelUser = this.getView().getModel("oModelUser");

            const bIsCliente = !!oModelUser?.getProperty("/bIsCliente");

            const aMaterialPrev = oModelProyect.getProperty("/oMaterial") || [];
            const aMaterialUIPrev = oModelProyect.getProperty("/oMaterialUI") || [];
            const oData = oModelProyect.getData();
            const oCantidades = oModelProyect.getProperty("/oCantidades") || {};

            const tb = this._byId("frgIdAddManualProduct--tbMaterialesManual");
            const aSelected = tb.getSelectedItems() || [];

            let nMaxItm = 0;
            aMaterialPrev.forEach(it => {
                const n = parseInt(it.ItmNumber || "0", 10);
                if (!isNaN(n) && n > nMaxItm) nMaxItm = n;
            });

            aSelected.forEach((oItem, i) => {
                const oObj = oItem.getBindingContext("oModelProyect").getObject() || {};

                const nNextItm = nMaxItm + ((i + 1) * 10);
                const sItmNumber = nNextItm.toString().padStart(6, "0");

                const sMat = (oObj.Matnr || oObj.Material || "").toString().trim();
                if (!sMat) return;

                // ✅ TOMAR CANTIDAD REAL (del row o del mapa) y formatear
                let sQtyRaw = (oObj.cantidad !== undefined && oObj.cantidad !== null) ? String(oObj.cantidad) : "";
                sQtyRaw = sQtyRaw.replace(",", ".").trim();

                let nQty = parseFloat(sQtyRaw);
                const fStock = oObj.StockDispoNum !== undefined
                    ? Number(oObj.StockDispoNum)
                    : this._parseSapNumber(oObj.StockDispoRaw !== undefined ? oObj.StockDispoRaw : oObj.StockDispo);

                if (isNaN(nQty) || nQty <= 0) {
                    return;
                }

                if (bIsCliente && fStock <= 0) {
                    return;
                }

                if (bIsCliente && nQty > fStock) {
                    sap.m.MessageToast.show("No hay suficiente cantidad para el material " + sMat);
                    return;
                }
                const sQty = nQty.toFixed(3);

                // ✅ guardar en mapa por material
                oCantidades[sItmNumber] = sQty;

                aMaterialPrev.push({
                    ClienteId: oData.oDatClient?.Customer || "",
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    TargetQu: "MTS",
                    Plant: "1000"
                });

                // opcional: state según stock vs cantidad
                const bWarn = fStock < nQty;

                aMaterialUIPrev.push({
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    cantidad: sQty,
                    UMV: oObj.Um || "MTS",
                    Brand: oObj.Brand || "",
                    StockDispo: this._formatSapStock(fStock, 3),
                    StockDispoRaw: oObj.StockDispoRaw !== undefined ? oObj.StockDispoRaw : oObj.StockDispo,
                    StockDispoNum: fStock,
                    StockDispoView: this._formatSapStock(fStock, 3),
                    StockDispoOriginalNum: fStock,
                    CantidadOriginalNum: nQty,
                    Kbetr: 0,
                    subtotal: 0,
                    descuentos: 0,
                    impuesto: 0,
                    total: 0,
                    esBolsa: false,
                    state: bWarn ? "Warning" : "None"
                });
            });

            oModelProyect.setProperty("/oCantidades", oCantidades);
            oModelProyect.setProperty("/oMaterial", aMaterialPrev);
            oModelProyect.setProperty("/oMaterialUI", aMaterialUIPrev);
            oModelProyect.refresh(true);

            // limpiar selección
            const oTable = this._byId("frgIdAddManualProduct--tbMaterialesManual");
            if (oTable && oTable.removeSelections) {
                oTable.removeSelections(true);
            }

            oEvent.getSource().getParent().close();
            this.onSimulateOrder();
        },

        _isClienteExteriorZPEF: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            if (!oModelProyect) {
                return false;
            }

            const oInputForm = oModelProyect.getProperty("/inputForm") || {};
            const oDir = oModelProyect.getProperty("/oDireccionCliente") || {};
            const oDatClient = oModelProyect.getProperty("/oDatClient") || {};
            const oClientData = oModelProyect.getProperty("/oClientData") || {};

            const sCountry = String(
                oDir.Country ||
                oDatClient.Country ||
                oDatClient.CountryCode ||
                oDatClient.Land1 ||
                oClientData.Country ||
                oClientData.CountryCode ||
                oClientData.Land1 ||
                ""
            ).trim().toUpperCase();

            const sTipDoc = String(oInputForm.tipDocument || "").trim().toUpperCase();

            return !!oInputForm.bClienteExteriorZPEF || (sCountry !== "PE" && sTipDoc === "ZPEF");
        },

        _getShipCondForPayload: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oInputForm = oModelProyect ? (oModelProyect.getProperty("/inputForm") || {}) : {};

            if (this._isClienteExteriorZPEF()) {
                return oInputForm.courier || "10";
            }

            return (oInputForm.resumenEntrega === "Cliente recoge") ? "02" : "01";
        },
        _getZPEFHeaderFieldsForPayload: function (oInputForm, sDocType) {
            const sDoc = String(
                sDocType ||
                oInputForm?.tipDocument ||
                ""
            ).trim().toUpperCase();

            if (sDoc !== "ZPEF") {
                return {};
            }

            const sTipoEmbarque = String(oInputForm?.tipoEmbarque || "").trim() || "05";
            const sPuertoDestino = String(oInputForm?.puertoEmbarque || "").trim();

            return {
                Zztipembarque: sTipoEmbarque,
                Zzlocnodest: sPuertoDestino
            };
        },

        _buildPartnersVendedor: function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelUser = oView.getModel("oModelUser");
            const oData = (oModelProyect && oModelProyect.getData()) ? oModelProyect.getData() : {};
            const sCliente = oData.oDatClient?.Customer || "";
            const sVendorPrincipal =
                oData.inputForm?.sellerPrincipalKunn2 ||
                oData.oSellerPrincipalSelected?.kunn2 ||
                oData.oClientData?.kunn2 ||
                oData.oDatClient?.kunn2 ||
                "";

            const sLoggedBP =
                (oModelUser && (oModelUser.getProperty("/bBPFinal") || oModelUser.getProperty("/bBP"))) || "";

            const bIsInterno = !!(oModelUser && oModelUser.getProperty("/bIsInterno"));
            const bIsVendedor = !!(oModelUser && oModelUser.getProperty("/bIsVendedor"));
            const bIsCoord = !!(oModelUser && oModelUser.getProperty("/bIsCoord"));
            const aPartners = [];
            if (sCliente && sVendorPrincipal) {
                aPartners.push({
                    ClientId: sCliente,
                    PartnRole: "ZV",
                    PartnNumber: sVendorPrincipal,
                    ItmNumber: "000000"
                });
            }
            const bEsApoyo = bIsInterno && (bIsVendedor || bIsCoord) &&
                !!sLoggedBP && !!sVendorPrincipal && (sLoggedBP !== sVendorPrincipal);

            if (bEsApoyo) {
                aPartners.push({
                    ClientId: sCliente,
                    PartnRole: "ZY",
                    PartnNumber: sLoggedBP,
                    ItmNumber: "000000"
                });
            }
            if (sCliente && !sVendorPrincipal && sLoggedBP && (bIsVendedor || bIsCoord || bIsInterno)) {
                aPartners.push({
                    ClientId: sCliente,
                    PartnRole: "ZV",
                    PartnNumber: sLoggedBP,
                    ItmNumber: "000000"
                });
            }

            return aPartners;
        },
        _validateGrupoMaterialRequired: function (sActionText) {
            const oModel = this.getView().getModel("oModelProyect");
            const sGrupo = oModel ? String(oModel.getProperty("/inputForm/grupoMaterial") || "").trim() : "";

            if (!sGrupo) {
                sap.m.MessageBox.warning(
                    "Debe seleccionar el grupo de material antes de " + (sActionText || "continuar") + "."
                );
                return false;
            }

            return true;
        },

        _validateOrderHasMaterials: function (sActionText) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const aMaterialSAP = oModelProyect ? (oModelProyect.getProperty("/oMaterial") || []) : [];

            const aMaterialValid = aMaterialSAP.filter(function (oItem) {
                return !!String(oItem && oItem.Material || "").trim();
            });

            if (!aMaterialValid.length) {
                sap.m.MessageBox.warning(
                    "Debe agregar al menos un material antes de " + (sActionText || "continuar") + "."
                );
                return false;
            }

            return true;
        },

        _getSapReturnMessages: function (oResponse) {
            const aRaw =
                oResponse?.HeaderToReturn?.results ||
                oResponse?.d?.HeaderToReturn?.results ||
                oResponse?.HeaderToReturn ||
                [];

            return (Array.isArray(aRaw) ? aRaw : []).map(function (oMsg) {
                return {
                    Type: String(oMsg.Type || oMsg.type || oMsg.Severity || "").trim().toUpperCase(),
                    Message: String(oMsg.Message || oMsg.message || oMsg.Text || "").trim()
                };
            }).filter(function (oMsg) {
                return !!oMsg.Message;
            });
        },

        _getSapReturnErrors: function (oResponse) {
            return this._getSapReturnMessages(oResponse).filter(function (oMsg) {
                return ["E", "A", "X"].includes(oMsg.Type);
            });
        },

        _extractODataErrorMessages: function (oError) {
            const aMessages = [];
            const sResponseText = oError && oError.responseText ? oError.responseText : "";

            if (sResponseText) {
                try {
                    const oParsed = JSON.parse(sResponseText);
                    const sMain = oParsed?.error?.message?.value || oParsed?.error?.message || "";

                    if (sMain) {
                        aMessages.push(String(sMain).trim());
                    }

                    const aDetails = oParsed?.error?.innererror?.errordetails || [];
                    aDetails.forEach(function (oDetail) {
                        const sMsg = oDetail && oDetail.message ? String(oDetail.message).trim() : "";
                        if (sMsg) {
                            aMessages.push(sMsg);
                        }
                    });
                } catch (e) {
                    aMessages.push(
                        sResponseText
                            .replace(/<[^>]+>/g, " ")
                            .replace(/\s+/g, " ")
                            .trim()
                    );
                }
            }

            if (!aMessages.length && oError && oError.message) {
                aMessages.push(String(oError.message).trim());
            }

            return aMessages.filter(Boolean);
        },

        _showSapErrors: function (sTitle, aMessages) {
            const aTexts = (aMessages || []).map(function (v) {
                return typeof v === "string" ? v : (v && v.Message) || "";
            }).filter(Boolean);

            const aUnique = Array.from(new Set(aTexts));
            const sBody = aUnique.length
                ? aUnique.map(function (sMsg) { return "• " + sMsg; }).join("\n")
                : "• SAP no devolvió el detalle del error.";

            sap.m.MessageBox.error(
                "Se detectaron los siguientes errores:\n\n" + sBody,
                {
                    title: sTitle || "Errores SAP"
                }
            );
        },

        _enforceExternalZPEFDetailDefaults: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel || !this._isClienteExteriorZPEF()) {
                return;
            }

            oModel.setProperty("/inputForm/bClienteExteriorZPEF", true);
            oModel.setProperty("/inputForm/cbCondPago", "4000");
            oModel.setProperty("/inputForm/txtCondPago", "Contado a la Fecha de Embarque");

            oModel.setProperty("/inputForm/tipoEntrega", "10");
            oModel.setProperty("/inputForm/resumenEntrega", "Courier");
            oModel.setProperty("/inputForm/courier", "10");
            oModel.setProperty("/inputForm/courierText", "Courier");

            oModel.setProperty("/inputForm/reasonOrd", "Z00");
            oModel.setProperty("/inputForm/txtReasonOrd", "Z00");

            oModel.setProperty("/inputForm/obsDelivery", "");
            oModel.setProperty("/inputForm/showObsDelivery", false);
            oModel.setProperty("/inputForm/showMotivo", false);
            oModel.setProperty("/inputForm/showTipoCambio", false);
            oModel.setProperty("/inputForm/showMensajeFleteZPEF", true);
            oModel.setProperty("/inputForm/labelPuertoEmbarque", "Puerto de Destino");
        },

        onSimulateOrder: async function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oCantidades = oModelProyect.getProperty("/oCantidades") || {};
            const oData = oModelProyect.getData();
            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = this._formatDateForSAP(sFechaActual);
            const bValidaBolsas = this._shouldValidateBolsas();
            const sGrupoMaterial = oModelProyect.getProperty("/inputForm/grupoMaterial") || "";
            const aMaterialSAP = oData.oMaterial || [];
            const aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];
            const oModelUser = this.getView().getModel("oModelUser");
            const isClienteIAS =
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bIsCliente") === true;

            const normalizeMat = function (s) {
                if (!s) {
                    return "";
                }
                return String(s).replace(/^0+/, "");
            };

            const mDescByMat = {};
            (oData.oMaterial || []).forEach(function (m) {
                const sMatRaw = m.Material || m.Matnr;
                const sMatNorm = normalizeMat(sMatRaw);
                const sDesc = m.Descriptions || m.Maktx || m.Description;
                if (sMatNorm && sDesc) {
                    mDescByMat[sMatNorm] = sDesc;
                }
            });
            (aMaterialUI || []).forEach(function (m) {
                const sMatRaw = m.Material || m.Matnr;
                const sMatNorm = normalizeMat(sMatRaw);
                const sDesc = m.Descriptions || m.Maktx || m.Description;
                if (sMatNorm && sDesc && !mDescByMat[sMatNorm]) {
                    mDescByMat[sMatNorm] = sDesc;
                }
            });

            if (!this._validateGrupoMaterialRequired("simular")) {
                return;
            }

            if (!this._validateOrderHasMaterials("simular")) {
                return;
            }

            this._enforceExternalZPEFDetailDefaults();
            if (bValidaBolsas) {

                if (!aMaterialSAP.length) {
                    sap.m.MessageBox.warning(
                        "Debe agregar al menos un material para simular."
                    );
                    return;
                }
                const aBolsasUI = aMaterialUI.filter(function (it) {
                    return !!it.esBolsa;
                });
                if (aBolsasUI.length > 1) {
                    sap.m.MessageBox.error(
                        "Existen líneas de bolsas. Elimine las líneas de bolsas y vuelva a calcular."
                    );
                    return;
                }
            }
            const mBolsaByItem = {};
            (aMaterialUI || []).forEach(function (it) {
                if (it.ItmNumber) {
                    mBolsaByItem[it.ItmNumber] = !!it.esBolsa;
                }
            });
            const aPartnersBase = [
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "AG",
                    PartnNumber: oData.oDatClient?.Customer || "",
                    ItmNumber: "000000"
                },
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "WE",
                    PartnNumber: (() => {
                        const sTipoEntrega = oData.inputForm?.tipoEntrega;
                        switch (sTipoEntrega) {
                            case "1": return oData.oDatClient?.Customer || "";
                            case "2": return oData.inputForm?.destinoTextil || "";
                            case "3": return oData.inputForm?.direccionAgencia || "";
                            default: return oData.inputForm?.destinoTextil || "";
                        }

                    })(),
                    ItmNumber: "000000"
                }
            ];
            (function () {
                const sSalesOrg = (oData.oDatClient?.SalesOrganization || "").toString();
                if (sSalesOrg !== "1110") return;

                const sTipoEntrega = oData.inputForm?.tipoEntrega;
                const sPartnNumber =
                    (sTipoEntrega === "1")
                        ? (oData.inputForm?.destinoTextil || "")
                        : (oData.inputForm?.destinoTextil || "");

                aPartnersBase.push({
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "Z0",
                    PartnNumber: sPartnNumber,
                    ItmNumber: "000000"
                });
            })();
            const aVendPartners = this._buildPartnersVendedor();
            if (Array.isArray(aVendPartners) && aVendPartners.length) {
                aPartnersBase.push(...aVendPartners);
            }

            const aPartners = aPartnersBase;
            let aMaterialSim = (oData.oMaterial || []).slice();
            if (bValidaBolsas) {
                aMaterialSim.sort(function (a, b) {
                    const iA = parseInt(a.ItmNumber || "0", 10) || 0;
                    const iB = parseInt(b.ItmNumber || "0", 10) || 0;
                    return iA - iB;
                });
            }
            const aSchedule = aMaterialSim.map(item => {
                const sMat = item.Material;
                const sItm = item.ItmNumber || "";
                let nQty = this._getCantidadFromMap(oCantidades, item);
                const bIsBolsa = !!mBolsaByItem[sItm];
                if (bIsBolsa) {
                    nQty = Math.floor(nQty + 1e-6);
                }
                return {
                    ClientId: item.ClienteId || oData.oDatClient?.Customer || "",
                    ItmNumber: sItm,
                    SchedLine: "0001",
                    ReqQty: nQty.toFixed(3)
                };
            });
            const sTipDocUI = oData.inputForm?.tipDocument || "";
            const sDocType = (["ZACN", "ZPSE"].includes(sTipDocUI)) ? "ZPES" : sTipDocUI;
            const oZPEFHeaderFields = this._getZPEFHeaderFieldsForPayload(oData.inputForm, sDocType);
            const bIsCoord = !!oModelUser?.getProperty("/bIsCoord");
            const bIsVendedor = !!oModelUser?.getProperty("/bIsVendedor");
            const sPoSupplem = isClienteIAS ? "CLTE" : (bIsCoord ? "SUPE" : (bIsVendedor ? "VEND" : ""));
            const extraPoSupplem = sPoSupplem ? { PoSupplem: sPoSupplem } : {};
            const sTipoRef = oData.inputForm?.tipoReferencia || "";
            const bPedidoConReferencia = !!(sTipoRef && oData.inputForm?.docRefSeleccionado);
            let sPriceDate = null;
            if (bPedidoConReferencia) {
                const oDocRefSel = oData.inputForm.docRefSeleccionado;
                sPriceDate = oDocRefSel.PriceDate ||
                    (oDocRefSel._raw && oDocRefSel._raw.PriceDate) ||
                    null;
            }
            if (bPedidoConReferencia) {
                aMaterialSim = aMaterialSim.map(item => {
                    let sRefDocCa = item.RefDocCa;

                    if (!sRefDocCa) {
                        if (sTipoRef === "ZCNA") {
                            sRefDocCa = "B";
                        } else if (sTipoRef === "ZACN" || sTipoRef === "ZPSE") {
                            sRefDocCa = "G";
                        }
                    }

                    const bTieneRefItem =
                        !!item.RefDoc &&
                        !!item.RefDocIt &&
                        !!sRefDocCa;
                    if (!bTieneRefItem) {
                        return item;
                    }
                    return Object.assign({}, item, {
                        RefDoc: item.RefDoc,
                        RefDocIt: item.RefDocIt,
                        RefDocCa: sRefDocCa
                    });
                });
            }
            const oPayload = this._cleanPayload({
                ClientId: oData.oDatClient?.Customer || "",
                TOperation: oData.TOperation || "CS",
                DocType: sDocType,
                SalesOrg: oData.oDatClient?.SalesOrganization || "",
                DistrChan: (oData.inputForm?.tipDocument === "ZPEF") ? "C2" : "C1",
                Division: oData.oDatClient?.Division || "",
                ReqDateH: oPurchDate,
                PurchDate: this._formatDateForSAP(oData.inputForm?.ocExpDate),
                PriceDate: this._formatDateForSAP(sPriceDate),
                PurchNoC: oData.inputForm?.purchaseOrder || "",
                ShipCond: this._getShipCondForPayload(),
                Pmnttrms: this._isClienteExteriorZPEF() ? "4000" : (oData.inputForm?.cbCondPago || ""),
                OrdReason: this._isClienteExteriorZPEF() ? "Z00" : (oData.inputForm?.reasonOrd || ""),
                Currency: oData.inputForm?.moneda || "USD",
                PoMethod: "Z001",
                ...extraPoSupplem,
                ...oZPEFHeaderFields,
                HeaderToItem: aMaterialSim,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toConditionEx: [{ ClientId: "", ItmNumber: "", CondType: "", CondValue: "0.00", Condvalue: "0.00" }],
                toItemsOut: [{ ClientId: "", ItmNumber: "", Material: "", ItemCateg: "", ShortText: "", ReqQty: "0.000", TargetQty: "0.000" }],
                HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
            });

            const oModelEntity = this.getView().getModel("oModelEntity");
            sap.ui.core.BusyIndicator.show(0);

            const sSalesOrgSim = oPayload.SalesOrg || oData.oDatClient?.SalesOrganization || "";
            const oPriceCondResp = await this._getPriceConditionsBySalesOrg(sSalesOrgSim);
            const mPriceConditionTypes = this._buildDiscountConditionTypeMap(oPriceCondResp.oResults);

            if (oPriceCondResp.sEstado !== "S") {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No se pudo obtener la tabla PriceConditions para la organización " + sSalesOrgSim + ".");
                return;
            }

            if (!Object.keys(mPriceConditionTypes).length) {
                sap.ui.core.BusyIndicator.hide();

                void 0;

                sap.m.MessageBox.error(
                    "El servicio PriceConditions respondió, pero no se identificaron condiciones de descuento para la organización " +
                    sSalesOrgSim +
                    ". Revisar los campos PriceCondition y Classification."
                );

                return;
            }

            void 0;
            void 0;

            oModelEntity.create("/iHeaderSet", oPayload, {
                success: function (oResponse) {
                    sap.ui.core.BusyIndicator.hide();

                    const aErroresSap = this._getSapReturnErrors(oResponse);
                    if (aErroresSap.length) {
                        this._showSapErrors("Error en la simulación", aErroresSap);
                        return;
                    }

                    let aMaterialUI2 = oModelProyect.getProperty("/oMaterialUI") || [];
                    const aConditions = oResponse.toConditionEx?.results || [];
                    const aItemsOut = oResponse.toItemsOut?.results || [];
                    const _n = function (v) {
                        const n = parseFloat(v);
                        return isNaN(n) ? 0 : n;
                    };
                    const itnToNum = function (itn) {
                        return _n(itn);
                    };

                    if (!aConditions.length) {
                        sap.m.MessageBox.error(" No se recibió información de simulación desde SAP.");
                        oModelProyect.setProperty("/oMaterialUI", []);
                        oModelProyect.setProperty("/oDatCalculo", {
                            subtotalGeneral: "0.00",
                            embalaje: "0.00",
                            totalImpuesto: "0.00",
                            totalGeneral: "0.00"
                        });
                        return;
                    }

                    aMaterialUI2 = aMaterialUI2.filter(function (item) {
                        if (!item.isExtraFromSAP) {
                            return true;
                        }
                        return aItemsOut.some(function (io) {
                            return io.ItmNumber === item.ItmNumber;
                        });
                    });

                    aItemsOut.forEach(function (io) {
                        const sItm = io.ItmNumber;
                        if (!sItm || sItm === "000000") {
                            return;
                        }

                        const existeUI = aMaterialUI2.some(function (ui) {
                            return ui.ItmNumber === sItm;
                        });

                        if (existeUI) {
                            return;
                        }

                        const parent = aMaterialUI2
                            .filter(function (x) {
                                return !x.isExtraFromSAP && itnToNum(x.ItmNumber) < itnToNum(sItm);
                            })
                            .sort(function (a, b) {
                                return itnToNum(b.ItmNumber) - itnToNum(a.ItmNumber);
                            })[0];

                        const sMat = io.Material || (parent && parent.Material) || "";
                        const sMatNorm = normalizeMat(sMat);
                        const sDesc = io.ShortText || mDescByMat[sMatNorm] || (parent && parent.Descriptions) || sMatNorm || sMat;
                        const nCantidad = _n(io.ReqQty != null ? io.ReqQty : io.TargetQty);

                        aMaterialUI2.push({
                            ItmNumber: sItm,
                            Material: sMat,
                            Descriptions: sDesc,
                            cantidad: nCantidad.toFixed(3),
                            UMV: parent ? parent.UMV : "MTS",
                            Brand: parent ? parent.Brand : "",
                            StockDispo: "0.000",
                            Kbetr: 0,
                            precioUnit: 0,
                            precioBase: 0,
                            descuentos: 0,
                            impuesto: 0,
                            subtotal: 0,
                            total: 0,
                            importeTabla: 0,
                            esBolsa: false,
                            isExtraFromSAP: true,
                            Bonus: "Boni",
                            ParentItmNumber: parent ? parent.ItmNumber : ""
                        });
                    });

                    const bonusItmSet = new Set(
                        aConditions.filter(function (c) {
                            return c.CondType === "ZABO";
                        }).map(function (c) {
                            return c.ItmNumber;
                        })
                    );

                    aMaterialUI2.forEach(function (it) {
                        if (it.isExtraFromSAP) {
                            bonusItmSet.add(it.ItmNumber);
                        }
                    });

                    const getSum = function (sCondType, sItmNumber) {
                        return aConditions
                            .filter(function (c) {
                                return c.CondType === sCondType && (!sItmNumber || c.ItmNumber === sItmNumber);
                            })
                            .reduce(function (acc, c) {
                                return acc + _n(c.Condvalue !== undefined ? c.Condvalue : c.CondValue);
                            }, 0);
                    };

                    const getFirstCond = function (sCondType, sItmNumber) {
                        return aConditions.find(function (c) {
                            return c.CondType === sCondType && (!sItmNumber || c.ItmNumber === sItmNumber);
                        });
                    };

                    const getBonusPrecioTotal = function (sItmNumber) {
                        const fZPRE = Math.abs(getSum("ZPRE", sItmNumber));
                        const fZABO = Math.abs(getSum("ZABO", sItmNumber));

                        // La bonificación debe mostrar precio, pero quedar descontada al 100%.
                        // Si SAP manda ZPRE, usamos ZPRE. Si no, usamos ZABO como respaldo.
                        return fZPRE || fZABO || 0;
                    };

                    const getBonusPrecioUnit = function (sItmNumber, fCantidad) {
                        const oCondZPRE = getFirstCond("ZPRE", sItmNumber);
                        const fUnitZPRE = oCondZPRE
                            ? Math.abs(_n(oCondZPRE.CondValue !== undefined ? oCondZPRE.CondValue : oCondZPRE.Condvalue))
                            : 0;

                        if (fUnitZPRE > 0) {
                            return fUnitZPRE;
                        }

                        const fTotal = getBonusPrecioTotal(sItmNumber);
                        return fCantidad > 0 ? fTotal / fCantidad : 0;
                    };

                    sap.m.MessageBox.success("Simulación creada con éxito");
                    aMaterialUI2.forEach(item => {
                        item.precioUnit = 0;
                        item.precioBase = 0;
                        item.descuentos = 0;
                        item.impuesto = 0;
                        item.subtotal = 0;
                        item.total = 0;
                    });
                    let embalajeTotal = 0;
                    let totalImpuesto = 0;
                    aConditions.forEach(cond => {
                        const oItemUI = aMaterialUI2.find(ui => ui.ItmNumber === cond.ItmNumber);
                        if (!oItemUI) return;
                        const fTotalCond = parseFloat(cond.Condvalue) || 0;
                        const fUnitCond = parseFloat(cond.CondValue) || 0;
                        switch (cond.CondType) {
                            case "ZPRE":
                                if (!oItemUI.esBolsa) {
                                    oItemUI.subtotal = fTotalCond;
                                    oItemUI.precioUnit = fUnitCond;
                                    oItemUI.precioBase = fTotalCond;
                                }
                                break;
                            case "ZPBO":
                                if (oItemUI.esBolsa) {
                                    oItemUI.precioUnit = fUnitCond;
                                }
                                break;
                            default:
                                if (this._isActiveDiscountCondition(cond, mPriceConditionTypes)) {
                                    oItemUI.descuentos = (oItemUI.descuentos || 0) - Math.abs(fTotalCond);
                                }
                                break;

                            case "MWST":
                                oItemUI.impuesto = (oItemUI.impuesto || 0) + fTotalCond;
                                totalImpuesto += fTotalCond;
                                break;
                            case "ZREP":
                                embalajeTotal += fTotalCond;
                                break;
                        }
                    });
                    aMaterialUI2.forEach(item => {
                        const oItemOut = aItemsOut.find(function (io) {
                            return io.ItmNumber === item.ItmNumber;
                        });

                        if (oItemOut && (oItemOut.ReqQty != null || oItemOut.TargetQty != null)) {
                            const fReqOut = _n(oItemOut.ReqQty != null ? oItemOut.ReqQty : oItemOut.TargetQty);
                            item.cantidad = fReqOut.toFixed(3);
                        } else {
                            const oSchedule = aSchedule.find(s => s.ItmNumber === item.ItmNumber);
                            if (oSchedule) {
                                const fReq = parseFloat(oSchedule.ReqQty) || 0;

                                if (item.esBolsa) {
                                    const nInt = Math.floor(fReq + 1e-6);
                                    item.cantidad = nInt.toString();
                                } else {
                                    item.cantidad = fReq.toFixed(3);
                                }
                            }
                        }

                        const fQty = parseFloat(item.cantidad || "0") || 0;
                        if (item.esBolsa) {
                            const fUnitBolsa = parseFloat(item.precioUnit || "0") || 0;
                            item.precioBase = fQty * fUnitBolsa;
                        }

                        if (bonusItmSet.has(item.ItmNumber)) {
                            const fPrecioBonusTotal = getBonusPrecioTotal(item.ItmNumber);
                            const fPrecioBonusUnit = getBonusPrecioUnit(item.ItmNumber, fQty);

                            item.precioUnit = fPrecioBonusUnit;
                            item.precioBase = fPrecioBonusTotal;

                            // La bonificación se muestra con precio, pero se descuenta al 100%.
                            item.descuentos = -Math.abs(fPrecioBonusTotal);
                            item.impuesto = 0;

                            // Total visual y total general deben quedar en cero.
                            item.importeTabla = 0;
                            item.subtotal = 0;
                            item.total = 0;
                            item.totalpos = 0;
                            item.pvNeto = "0.00";

                            item.Bonus = item.Bonus || "Boni";
                            item.isExtraFromSAP = true;

                            return;
                        }

                        const fBase = item.precioBase || 0;
                        const fDescuentos = item.descuentos || 0;
                        const fImpuesto = item.impuesto || 0;

                        item.importeTabla = fBase + fDescuentos;
                        item.subtotal = item.importeTabla;
                        item.total = item.subtotal + fImpuesto;
                    });

                    let subtotalGeneral = 0, totalGeneral = 0;
                    totalImpuesto = 0;

                    aMaterialUI2.forEach(item => {
                        subtotalGeneral += item.subtotal || 0;
                        totalImpuesto += item.impuesto || 0;
                        totalGeneral += item.total || 0;
                    });

                    let sSubtotalGeneral = subtotalGeneral.toFixed(2);
                    let sEmbalajeTotal = embalajeTotal.toFixed(2);
                    let sTotalImpuesto = totalImpuesto.toFixed(2);
                    let sTotalGeneral = (totalGeneral + embalajeTotal).toFixed(2);

                    if (sTipDocUI === "ZGNA") {
                        sTotalGeneral = "0.00";
                    }

                    oModelProyect.setProperty("/oMaterialUI", aMaterialUI2);
                    oModelProyect.setProperty("/oDatCalculo", {
                        subtotalGeneral: sSubtotalGeneral,
                        embalaje: sEmbalajeTotal,
                        totalImpuesto: sTotalImpuesto,
                        totalGeneral: sTotalGeneral
                    });
                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();

                    const aErrores = this._extractODataErrorMessages(oError);
                    this._showSapErrors(
                        "Error en la simulación",
                        aErrores.length ? aErrores : ["Error en la simulación."]
                    );
                }.bind(this)
            });
        },

        _sanitizeSharePointFileNamePart: function (sValue) {
            return String(sValue || "")
                .replace(/[\\/:*?"<>|#%&{}~()°]/g, "-")
                .replace(/\s+/g, " ")
                .trim();
        },

        _buildOCFileNameWithOrder: function (sOriginalName, sSalesDocument) {
            const sName = String(sOriginalName || "archivo").trim();
            const sDoc = this._sanitizeSharePointFileNamePart(sSalesDocument);

            const iDot = sName.lastIndexOf(".");
            const bHasExt = iDot > 0 && iDot < sName.length - 1;

            const sBase = bHasExt ? sName.substring(0, iDot) : sName;
            const sExt = bHasExt ? sName.substring(iDot) : "";

            const sBaseClean = this._sanitizeSharePointFileNamePart(sBase) || "archivo";

            return sBaseClean + "-" + sDoc + sExt;
        },

        _clearPendingOCFiles: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (oModel) {
                oModel.setProperty("/aOCFilesPending", []);
            }
        },

        _uploadPendingOCFilesAfterOrder: async function (sSalesDocument) {
            const oModel = this.getView().getModel("oModelProyect");
            const aPending = oModel ? (oModel.getProperty("/aOCFilesPending") || []) : [];

            const oResult = {
                total: aPending.length,
                success: 0,
                error: 0,
                errors: []
            };

            if (!aPending.length || !sSalesDocument) {
                return oResult;
            }

            for (let i = 0; i < aPending.length; i++) {
                const oPending = aPending[i] || {};
                const oFile = oPending.fileObj;

                if (!oFile) {
                    oResult.error++;
                    oResult.errors.push((oPending.name || "Archivo sin nombre") + ": no se encontró el objeto File.");
                    continue;
                }

                const sUploadName = this._buildOCFileNameWithOrder(oFile.name, sSalesDocument);

                const oResp = await this._uploadSharepoint(
                    oFile,
                    function (percent) {
                        void 0;
                    },
                    sUploadName
                );

                if (oResp.sEstado === "S" && oResp.oResults && oResp.oResults.id) {
                    oResult.success++;
                    void 0;
                } else {
                    oResult.error++;
                    oResult.errors.push(oFile.name + ": error al subir a SharePoint.");
                    void 0;
                }
            }

            return oResult;
        },

        _createOrder: function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelUser = oView.getModel("oModelUser");
            const oData = oModelProyect.getData();
            const oCantidades = oModelProyect.getProperty("/oCantidades") || {};
            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = this._formatDateForSAP(sFechaActual);
            const sCliente = oData.oDatClient?.Customer || "";
            const sTipDoc = oData.inputForm?.tipDocument || "";
            const sSalesOrg = oData.oDatClient?.SalesOrganization || "";
            const sDivision = oData.oDatClient?.Division || "";
            const sTipoEntrega = oData.inputForm?.tipoEntrega;
            const bContratoSeparacion = (sTipDoc === "ZACN" || sTipDoc === "ZPSE");
            const sTOperation =
                (sTipDoc === "ZCNA") ? "CC" :
                    (sTipDoc === "ZACN" || sTipDoc === "ZPSE") ? "RS" :
                        "CP";
            const sPoMethod = "Z001";
            const sTipoRef = oData.inputForm?.tipoReferencia || "";
            const bPedidoConReferencia = !!(sTipoRef && oData.inputForm?.docRefSeleccionado);
            let sPriceDate = null;
            if (bPedidoConReferencia) {
                const oDocRefSel = oData.inputForm.docRefSeleccionado;
                sPriceDate = oDocRefSel.PriceDate ||
                    (oDocRefSel._raw && oDocRefSel._raw.PriceDate) ||
                    null;
            }

            const bValidaBolsas = this._shouldValidateBolsas();
            const aMaterialSAP = oData.oMaterial || [];
            const aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];
            const isClienteIAS =
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bIsCliente") === true;

            if (!this._validateGrupoMaterialRequired("grabar el pedido")) {
                return;
            }

            if (!this._validateOrderHasMaterials("grabar el pedido")) {
                return;
            }

            this._enforceExternalZPEFDetailDefaults();
            if (bValidaBolsas) {

                if (!aMaterialSAP.length) {
                    sap.m.MessageBox.warning(
                        "Debe agregar al menos un material antes de crear el pedido."
                    );
                    return;
                }

                const aBolsasUI = aMaterialUI.filter(function (it) {
                    return !!it.esBolsa;
                });

                if (aBolsasUI.length > 1) {
                    sap.m.MessageBox.error(
                        "Existen  líneas de bolsas. Elimine las líneas de bolsas y vuelva a recalcular."
                    );
                    return;
                }
                if (aBolsasUI.length === 1) {
                    const oBolsaUI = aBolsasUI[0];
                    const iBolsaItm = parseInt(oBolsaUI.ItmNumber || "0", 10) || 0;

                    const iMaxItm = aMaterialUI.reduce(function (max, it) {
                        const n = parseInt(it.ItmNumber || "0", 10) || 0;
                        return n > max ? n : max;
                    }, 0);

                    if (iBolsaItm !== iMaxItm) {
                        sap.m.MessageBox.error(
                            "La posición de bolsas debe ser la última. Elimine la línea de bolsas y vuelva a recalcular."
                        );
                        return;
                    }
                }
            }

            // 2) PARTNERS
            const aPartnersBase = [
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "AG",
                    PartnNumber: oData.oDatClient?.Customer || ""
                },
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "WE",
                    PartnNumber: (() => {
                        const sTipoEntregaLoc = oData.inputForm?.tipoEntrega;
                        switch (sTipoEntregaLoc) {
                            case "1": return oData.oDatClient?.Customer || "";
                            case "2": return oData.inputForm?.destinoTextil || "";
                            case "3": return oData.inputForm?.direccionAgencia || "";
                            default: return oData.inputForm?.destinoTextil || "";
                        }
                    })()
                }
            ];
            const aVendPartners = this._buildPartnersVendedor();
            if (Array.isArray(aVendPartners) && aVendPartners.length) {
                aPartnersBase.push(...aVendPartners);
            }
            /*   if (oData.inputForm?.tipoEntrega === "3") {
                   aPartnersBase.push({
                       ClientId: oData.oDatClient?.Customer || "",
                       PartnRole: "ZA",
                       PartnNumber: oData.inputForm?.direccionAgencia || "",
                       ItmNumber: "000000"
                   });
               }*/

            const aPartners = aPartnersBase;

            // 🔹 3) MAPA ÍTEM → BOLSA
            const mBolsaByItem = {};
            (aMaterialUI || []).forEach(function (it) {
                if (it.ItmNumber) {
                    mBolsaByItem[it.ItmNumber] = !!it.esBolsa;
                }
            });

            // 🔹 4) ÍTEMS (aplicando entero para bolsas + referencia condicional)
            let aItems = aMaterialSAP.map(item => {
                const sMat = item.Material;
                const sItm = item.ItmNumber || "";

                let nQty = this._getCantidadFromMap(oCantidades, item);
                const bIsBolsaItem = !!mBolsaByItem[sItm];

                if (bIsBolsaItem) {
                    nQty = Math.floor(nQty + 1e-6);
                }

                const sCant = nQty.toFixed(3);

                // 🔹 Determinar categoría de referencia (B / G) si aplica
                let sRefDocCa = item.RefDocCa;
                if (!sRefDocCa && sTipoRef) {
                    if (sTipoRef === "ZCNA") {
                        sRefDocCa = "B";
                    } else if (sTipoRef === "ZACN" || sTipDoc === "ZPSE") {
                        sRefDocCa = "G";
                    }
                }
                const bTieneReferencia =
                    bPedidoConReferencia &&
                    !!item.RefDoc &&
                    !!item.RefDocIt &&
                    !!sRefDocCa;

                const oItem = {
                    ClienteId: item.ClienteId || sCliente,
                    ItmNumber: sItm,
                    Material: sMat,
                    TargetQu: item.TargetQu || "MTS",
                    Plant: item.Plant || "1000"
                };

                // Para contratos / separaciones se envía TargetQty
                if (bContratoSeparacion) {
                    oItem.TargetQty = sCant;
                }

                // 🔹 Campos de referencia hacia la BAPI SOLO si corresponde
                if (bTieneReferencia) {
                    oItem.RefDoc = item.RefDoc;
                    oItem.RefDocIt = item.RefDocIt;
                    oItem.RefDocCa = sRefDocCa;
                }

                return oItem;
            });

            // Ordenar por ItmNumber solo si aplica bolsas
            if (bValidaBolsas) {
                aItems = aItems.slice().sort(function (a, b) {
                    const iA = parseInt(a.ItmNumber || "0", 10) || 0;
                    const iB = parseInt(b.ItmNumber || "0", 10) || 0;
                    return iA - iB;
                });
            }

            // 5) SCHEDULE (también respeta entero para bolsas)
            const aSchedule = bContratoSeparacion
                ? []
                : aItems.map(item => {
                    const sMat = item.Material;
                    const sItm = item.ItmNumber || "";

                    let nQty = this._getCantidadFromMap(oCantidades, item);
                    const bIsBolsaItem = !!mBolsaByItem[sItm];

                    if (bIsBolsaItem) {
                        nQty = Math.floor(nQty + 1e-6);
                    }

                    return {
                        ClientId: item.ClienteId || sCliente,
                        ItmNumber: sItm,
                        SchedLine: "0001",
                        ReqQty: nQty.toFixed(3)
                    };
                });

            // 6) TEXTOS CABECERA (sin repetir por ítem)
            const aTexts = [];
            const sObsPedido = oData.inputForm?.obsPedido || "";
            const sObsDelivery = this._isClienteExteriorZPEF() ? "" : (oData.inputForm?.obsDelivery || "");

            if (sObsPedido) {
                aTexts.push({
                    ClientId: sCliente,
                    ItmNumber: "000000",
                    TextId: "Z001",
                    Langu: "ES",
                    TextLine: sObsPedido
                });
            }

            if (sObsDelivery) {
                aTexts.push({
                    ClientId: sCliente,
                    ItmNumber: "000000",
                    TextId: "Z003",
                    Langu: "ES",
                    TextLine: sObsDelivery
                });
            }
            const bIsCoord = !!oModelUser?.getProperty("/bIsCoord");
            const bIsVendedor = !!oModelUser?.getProperty("/bIsVendedor");
            const sPoSupplem = isClienteIAS ? "CLTE" : (bIsCoord ? "SUPE" : (bIsVendedor ? "VEND" : ""));
            const extraPoSupplem = sPoSupplem ? { PoSupplem: sPoSupplem } : {};
            const oZPEFHeaderFields = this._getZPEFHeaderFieldsForPayload(oData.inputForm, sTipDoc);

            const oPayload = this._cleanPayload({
                ClientId: sCliente,
                TOperation: sTOperation,
                DocType: sTipDoc,
                SalesOrg: sSalesOrg,
                DistrChan: (sTipDoc === "ZPEF") ? "C2" : "C1",
                Division: sDivision,
                ReqDateH: oPurchDate,
                PurchDate: this._formatDateForSAP(oData.inputForm?.ocExpDate),
                QtValidF: this._formatDateForSAP(oData.inputForm?.fechInicio) || "",
                QtValidT: this._formatDateForSAP(oData.inputForm?.fechFin) || "",
                PriceDate: this._formatDateForSAP(sPriceDate),
                PoMethod: sPoMethod,
                ...extraPoSupplem,
                PurchNoC: oData.inputForm?.purchaseOrder || "",
                Pmnttrms: this._isClienteExteriorZPEF() ? "4000" : (oData.inputForm?.cbCondPago || ""),
                ShipCond: this._getShipCondForPayload(),
                OrdReason: this._isClienteExteriorZPEF() ? "Z00" : (oData.inputForm?.reasonOrd || ""),
                Currency: oData.inputForm?.moneda || "USD",
                ...oZPEFHeaderFields,
                HeaderToItem: aItems,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toText: aTexts,
                HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
            });

            const oModelEntity = oView.getModel("oModelEntity");
            sap.ui.core.BusyIndicator.show(0);

            oModelEntity.create("/iHeaderSet", oPayload, {
                success: async function (oResponse) {
                    sap.ui.core.BusyIndicator.hide();

                    const aErroresSap = this._getSapReturnErrors(oResponse);
                    if (aErroresSap.length) {
                        this._showSapErrors("Error en la creación del pedido", aErroresSap);
                        return;
                    }

                    let sNumDocumento = "";
                    const aMensajes = this._getSapReturnMessages(oResponse);

                    aMensajes.some(function (m) {
                        const match = m.Message && m.Message.match(/\b\d{10}\b/);
                        if (match) {
                            sNumDocumento = match[0];
                            return true;
                        }
                        return false;
                    });

                    const fnAfterOk = function () {
                        oModelProyect.setProperty("/oMaterial", []);
                        oModelProyect.setProperty("/oMaterialUI", []);
                        oModelProyect.setProperty("/oCantidades", {});
                        oModelProyect.setProperty("/oDatCalculo", {
                            subtotalGeneral: "0.00",
                            totalImpuesto: "0.00",
                            totalGeneral: "0.00"
                        });
                        oModelProyect.setProperty("/inputForm", {
                            purchaseOrder: "",
                            obsPedido: "",
                            obsDelivery: "",
                            reasonOrd: "",
                            moneda: "USD",
                            embalaje: "0.00",
                            ocExpDate: null,
                            resumenEntrega: ""
                        });
                        oModelProyect.refresh(true);

                        const oTable = oView.byId("tbProductos1") || sap.ui.getCore().byId("tbProductos1");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        oRouter.navTo("Main");
                    }.bind(this);

                    if (sNumDocumento) {
                        sap.ui.core.BusyIndicator.show(0);

                        const oUploadResult = await this._uploadPendingOCFilesAfterOrder(sNumDocumento);

                        sap.ui.core.BusyIndicator.hide();

                        let sUploadMessage = "";

                        if (oUploadResult.total > 0) {
                            if (oUploadResult.error > 0) {
                                sUploadMessage =
                                    "\n\nArchivos OC: " +
                                    oUploadResult.success +
                                    " de " +
                                    oUploadResult.total +
                                    " subidos correctamente. Revisar consola para los errores.";
                            } else {
                                sUploadMessage =
                                    "\n\nArchivos OC subidos correctamente: " +
                                    oUploadResult.success +
                                    " de " +
                                    oUploadResult.total +
                                    ".";
                            }
                        }

                        sap.m.MessageBox.success(
                            `Pedido creado exitosamente.\nNúmero de pedido: ${sNumDocumento}${sUploadMessage}`,
                            {
                                title: "Pedido creado",
                                onClose: function () {
                                    this._clearPendingOCFiles();
                                    fnAfterOk();
                                }.bind(this)
                            }
                        );
                    } else {
                        this._showSapErrors(
                            "Respuesta de SAP sin número de pedido",
                            aMensajes.length
                                ? aMensajes
                                : ["SAP no devolvió el número de pedido. No se limpiará la pantalla ni se navegará al listado."]
                        );
                    }

                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();

                    const aErrores = this._extractODataErrorMessages(oError);
                    this._showSapErrors(
                        "Error en la creación del pedido",
                        aErrores.length ? aErrores : ["Error en la creación del pedido."]
                    );
                }.bind(this)
            });
        },
        _shouldValidateBolsas: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return false;
            }

            const sTipDoc = (oModel.getProperty("/inputForm/tipDocument") || "").toUpperCase();
            const sTipoRef = (oModel.getProperty("/inputForm/tipoReferencia") || "").toUpperCase();
            const sGrupo = (oModel.getProperty("/inputForm/grupoMaterial") || "").toUpperCase();

            const aDocsConBolsas = ["ZCNA", "ZPES", "ZACN"];
            const bDocAplica =
                aDocsConBolsas.includes(sTipDoc) ||
                (sTipoRef && aDocsConBolsas.includes(sTipoRef));
            const bGrupoValido = ["01", "02"].includes(sGrupo);

            return bDocAplica && bGrupoValido;
        },
        _getTotalMetrosSinBolsa: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return 0;
            }

            const aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            let nTotal = 0;

            aMaterialUI.forEach(function (item) {
                if (item.esBolsa) {
                    return; // ignorar línea de bolsa
                }
                const n = parseFloat(item.cantidad);
                if (!isNaN(n) && n > 0) {
                    nTotal += n;
                }
            });

            return nTotal;
        },
        _removeBolsaActual: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) return;

            let aMatSAP = oModel.getProperty("/oMaterial") || [];
            let aMatUI = oModel.getProperty("/oMaterialUI") || [];
            let oCant = oModel.getProperty("/oCantidades") || {};

            const aBolsaUI = aMatUI.filter(it => !!it.esBolsa);
            if (!aBolsaUI.length) {
                return;
            }

            const aBolsaItm = aBolsaUI.map(it => it.ItmNumber);
            const aBolsaMat = aBolsaUI.map(it => it.Material);

            // Quitar de UI
            aMatUI = aMatUI.filter(it => !it.esBolsa);

            // Quitar de SAP
            aMatSAP = aMatSAP.filter(it => !aBolsaItm.includes(it.ItmNumber));

            // Quitar de oCantidades
            aBolsaMat.forEach(function (sMat) {
                if (oCant[sMat] !== undefined) {
                    delete oCant[sMat];
                }
            });

            oModel.setProperty("/oMaterial", aMatSAP);
            oModel.setProperty("/oMaterialUI", aMatUI);
            oModel.setProperty("/oCantidades", oCant);
            oModel.refresh(true);


        },
        _revisarBolsasTrasCambioCantidad: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return false;
            }

            const bValidaBolsas = this._shouldValidateBolsas && this._shouldValidateBolsas();
            if (!bValidaBolsas) {
                return false;
            }

            const aMatUI = oModel.getProperty("/oMaterialUI") || [];
            const bHayBolsa = aMatUI.some(function (it) {
                return !!it.esBolsa;
            });

            if (!bHayBolsa) {
                return false;
            }

            const MIN_METROS_BOLSA = 100;
            const nTotalMetros = this._getTotalMetrosSinBolsa();

            if (nTotalMetros < MIN_METROS_BOLSA) {
                this._removeBolsaActual();

                sap.m.MessageToast.show(
                    "La cantidad total es menor a " + MIN_METROS_BOLSA + " metros. Se eliminó la línea de bolsas."
                );

                const aMatSAP = oModel.getProperty("/oMaterial") || [];
                if (aMatSAP.length) {
                    this.onSimulateOrder();
                    return true;
                }
            }

            return false;
        },

        _buildPriceConditionsUrl: function (sSalesOrg) {
            const sOrg = String(sSalesOrg || "").trim().replace(/'/g, "''");
            const sFilter = "$filter=SalesOrganization eq '" + sOrg + "'";

            if (this.local) {
                const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/PriceConditions" +
                    "?$format=json&" + sFilter;

                return this.getOwnerComponent().getManifestObject().resolveUri(sPath);
            }

            return jQuery.sap.getModulePath(this.route) +
                "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/PriceConditions" +
                "?$format=json&" + sFilter;
        },

        _getPriceConditionsBySalesOrg: function (sSalesOrg) {
            const that = this;

            const oResp = {
                sEstado: "E",
                oResults: []
            };

            return new Promise(function (resolve) {
                const sOrg = String(sSalesOrg || "").trim();

                if (!sOrg) {
                    resolve(oResp);
                    return;
                }

                const sUrl = that._buildPriceConditionsUrl(sOrg);

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            oResp.sEstado = "S";
                            oResp.oResults = that._extractODataArrayPriceConditions(
                                oData && oData.data !== undefined ? oData.data : oData
                            );

                            resolve(oResp);
                        },
                        error: function () {
                            resolve(oResp);
                        }
                    });
                });
            });
        },

        _extractODataArrayPriceConditions: function (vData) {
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

        _buildDiscountConditionTypeMap: function (aPriceConditions) {
            const mCondTypes = {};

            (aPriceConditions || []).forEach(function (oRow) {
                if (!this._isDiscountPriceConditionRow(oRow)) {
                    return;
                }

                const sCondType = String(this._getPriceConditionCondType(oRow) || "")
                    .trim()
                    .toUpperCase();

                if (!sCondType) {
                    return;
                }

                // Excluir condiciones que en Textiles no deben tratarse como descuento.
                if (["ZPRE", "ZPBO", "ZPRL", "ZREP", "ZRFN", "ZRFM", "ZRF0", "MWST"].includes(sCondType)) {
                    return;
                }

                if (!/^[A-Z0-9_]{3,10}$/.test(sCondType)) {
                    return;
                }

                mCondTypes[sCondType] = true;
            }.bind(this));

            return mCondTypes;
        },

        _isDiscountPriceConditionRow: function (oRow) {
            const sCondType = String(this._getPriceConditionCondType(oRow) || "")
                .trim()
                .toUpperCase();

            const sClassification = String(this._getFirstNonEmptyValue(oRow, [
                "Classification",
                "classification",
                "CLASSIFICATION"
            ]) || "").trim().toUpperCase();

            const sDscPriceCondition = String(this._getFirstNonEmptyValue(oRow, [
                "DscPriceCondition",
                "DSCPRICECONDITION",
                "dscPriceCondition",
                "Description",
                "DESCRIPTION",
                "DscCondition",
                "Text"
            ]) || "").trim().toUpperCase();

            const sDscClassification = String(this._getFirstNonEmptyValue(oRow, [
                "DscClassification",
                "DSCCLASSIFICATION",
                "dscClassification",
                "Type",
                "TYPE"
            ]) || "").trim().toUpperCase();

            if (["ZPRE", "ZPBO", "ZPRL", "ZREP", "ZRFN", "ZRFM", "ZRF0", "MWST"].includes(sCondType)) {
                return false;
            }

            if (
                sDscPriceCondition.indexOf("FLETE") >= 0 ||
                sDscClassification.indexOf("FLETE") >= 0 ||
                sDscPriceCondition.indexOf("EMBALAJE") >= 0 ||
                sDscClassification.indexOf("EMBALAJE") >= 0 ||
                sDscPriceCondition.indexOf("IMPUESTO") >= 0 ||
                sDscClassification.indexOf("IMPUESTO") >= 0
            ) {
                return false;
            }

            if (sClassification === "2") {
                return true;
            }

            return (
                sDscPriceCondition.indexOf("DESCUENTO") >= 0 ||
                sDscPriceCondition.indexOf("DCTO") >= 0 ||
                sDscPriceCondition.indexOf("DSCTO") >= 0 ||
                sDscPriceCondition.indexOf("REDUCCION") >= 0 ||
                sDscPriceCondition.indexOf("REDUCCIÓN") >= 0 ||
                sDscClassification.indexOf("DESCUENTO") >= 0 ||
                sDscClassification.indexOf("DCTO") >= 0 ||
                sDscClassification.indexOf("DSCTO") >= 0
            );
        },

        _getPriceConditionCondType: function (oRow) {
            return this._getFirstNonEmptyValue(oRow, [
                "PriceCondition",
                "PRICECONDITION",
                "priceCondition",
                "CondType",
                "Condtype",
                "CONDTYPE",
                "ConditionType",
                "Conditiontype",
                "CONDITIONTYPE",
                "ClassCondition",
                "ConditionCode",
                "ConditionKey",
                "Condition",
                "KSCHL",
                "Kschl",
                "kschl",
                "Condicion",
                "IdCondicion"
            ]);
        },

        _isActiveDiscountCondition: function (oCond, mPriceConditionTypes) {
            const sCondType = String(oCond && oCond.CondType || "").trim().toUpperCase();

            if (!sCondType || !mPriceConditionTypes || !mPriceConditionTypes[sCondType]) {
                return false;
            }

            const sCondisacti = String(this._getFirstNonEmptyValue(oCond, [
                "CONDISACTI",
                "Condisacti",
                "CondIsActi",
                "CondInactive",
                "Inactive"
            ]) || "").trim().toUpperCase();

            return sCondisacti === "";
        },

        _getFirstNonEmptyValue: function (oData, aKeys) {
            for (let i = 0; i < aKeys.length; i++) {
                const v = oData && oData[aKeys[i]];

                if (v !== undefined && v !== null && String(v).trim() !== "") {
                    return v;
                }
            }

            return "";
        },

        _cleanPayload: function (oData) {
            return JSON.parse(JSON.stringify(oData, (key, value) => {
                if (value === "" || value === null || value === undefined) {
                    return undefined;
                }
                return value;
            }));
        },
        _onLiveChangeCantidad: function (oEvent) {
            const oInput = oEvent.getSource();
            const oContext = oInput.getBindingContext("oModelProyect");
            if (!oContext) return;

            const oObject = oContext.getObject() || {};
            const oModel = oContext.getModel();

            const oModelUser = this.getView().getModel("oModelUser");
            const bIsCliente = !!oModelUser?.getProperty("/bIsCliente");

            const sMatKey = (oObject.Matnr || oObject.Material || "").toString().trim();

            const sValue = oInput.getValue() || "";
            const cleaned = sValue.replace(/[^\d.]/g, "");
            const nValue = parseFloat(cleaned);

            const sRowPath = oContext.getPath();

            const fnLimpiarCantidad = function () {
                oInput.setValue("");
                oModel.setProperty(sRowPath + "/cantidad", "");

                const oCantidades = oModel.getProperty("/oCantidades") || {};
                if (sMatKey) {
                    delete oCantidades[sMatKey];
                    oModel.setProperty("/oCantidades", oCantidades);
                }

                this._setRowSelectedFromInput(oInput, false);
            }.bind(this);

            if (cleaned === "") {
                fnLimpiarCantidad();
                oModel.refresh(true);
                this._revisarBolsasTrasCambioCantidad();
                return;
            }

            if (isNaN(nValue)) {
                oInput.setValue(cleaned);
                return;
            }

            oInput.setValue(cleaned);
            oModel.setProperty(sRowPath + "/cantidad", cleaned);

            const fStock = oObject.StockDispoNum !== undefined
                ? Number(oObject.StockDispoNum)
                : this._parseSapNumber(oObject.StockDispoRaw !== undefined ? oObject.StockDispoRaw : oObject.StockDispo);

            // Solo CLIENTE: no permite digitar si no hay stock
            if (bIsCliente && fStock <= 0) {
                fnLimpiarCantidad();
                sap.m.MessageToast.show("Este material no tiene stock disponible.");
                return;
            }

            // Solo CLIENTE: no permite cantidad mayor al stock
            if (bIsCliente && nValue > fStock) {
                fnLimpiarCantidad();
                sap.m.MessageToast.show("No hay suficiente cantidad de este material.");
                return;
            }

            // Estado visual: para cliente respeta stock; para vendedor/coordinador no bloquea
            if (fStock < nValue) {
                oModel.setProperty(sRowPath + "/state", bIsCliente ? "Warning" : "Success");
                oModel.setProperty(sRowPath + "/icon", bIsCliente ? "sap-icon://alert" : "sap-icon://inbox");
            } else {
                oModel.setProperty(sRowPath + "/state", "Success");
                oModel.setProperty(sRowPath + "/icon", "sap-icon://inbox");
            }

            const oCantidades = oModel.getProperty("/oCantidades") || {};
            if (sMatKey) {
                oCantidades[sMatKey] = cleaned;
                oModel.setProperty("/oCantidades", oCantidades);
            }

            this._setRowSelectedFromInput(oInput, true);
            oModel.refresh(true);

            this._revisarBolsasTrasCambioCantidad();
        },

        _onPressNavButtonDetail: function () {
            const oModel = this.getView().getModel("oModelProyect");

            let sCustomer =
                oModel.getProperty("/oClienteSeleccionado/Customer") ||
                oModel.getProperty("/oDatClient/Customer") ||
                "";

            if (!sCustomer) {
                const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
                const aParts = (sHash || "").split("/");
                sCustomer = aParts.length > 1 ? aParts[1] : "";
            }

            const oNewData = models.createModelProyect();
            oNewData.oClienteSeleccionado = { Customer: sCustomer };

            oModel.setData(oNewData);
            oModel.refresh(true);

            if (sCustomer) {
                this.getRouter().navTo("FormClient", { app: sCustomer });
            } else {
                this.getRouter().navTo("Main");
            }
        },
        _onPressEditDetail: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect");
            const oContext = oEvent.getSource().getParent().getBindingContext("oModelProyect");
            const oSelectedObj = oContext.getObject() || {};
            const sMatnr = oSelectedObj.Matnr || oSelectedObj.Material || "";
            const sDesc = oSelectedObj.Descriptions || oSelectedObj.Maktx || oSelectedObj.Bezei || "";
            const sStock = oSelectedObj.StockDispo ?? oSelectedObj.Stock ?? "0";
            const sUMV = oSelectedObj.UMV || oSelectedObj.Um || oSelectedObj.Uom || "MTS";
            const sCant = (oSelectedObj.cantidad !== undefined && oSelectedObj.cantidad !== null && oSelectedObj.cantidad !== "")
                ? oSelectedObj.cantidad
                : "1";
            oModel.setProperty("/oMaterialesSelectedMatnr", sMatnr);
            oModel.setProperty("/oMaterialesSelectedDesc", sDesc);

            oModel.setProperty("/oSelecTableDetalle", Object.assign({}, oSelectedObj, {
                Matnr: sMatnr,
                Material: sMatnr,
                StockDispo: sStock,
                UMV: sUMV,
                Brand: oSelectedObj.Brand || "",
                cantidad: sCant
            }));

            if (!this._oDialogEdit) {
                this._oDialogEdit = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.aris.registropedido.textiles.pe.view.dialogs.EditDetail",
                    this
                );
                oView.addDependent(this._oDialogEdit);
            }

            this._oDialogEdit.open();
        },

        _onLiveChangeCantidadModificadaTextil: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");

            const sValue = String(oEvent.getParameter("value") || "").trim();
            oModel.setProperty("/oSelecTableDetalle/cantidad", sValue);

            const oDetalle = oModel.getProperty("/oSelecTableDetalle") || {};

            const nCantidadOriginal = Number(oDetalle.CantidadOriginalNum);
            const nStockOriginal = Number(oDetalle.StockDispoOriginalNum);

            if (!sValue) {
                const sStockOriginal = this._formatSapStock(nStockOriginal || 0, 3);

                oModel.setProperty("/oSelecTableDetalle/StockDispoNum", nStockOriginal || 0);
                oModel.setProperty("/oSelecTableDetalle/StockDispo", sStockOriginal);
                oModel.setProperty("/oSelecTableDetalle/StockDispoView", sStockOriginal);
                oModel.checkUpdate(true);

                return;
            }

            if (!Number.isFinite(nCantidadOriginal) || !Number.isFinite(nStockOriginal)) {
                void 0;
                return;
            }

            const nCantidadNueva = this._parseSapNumber(sValue);

            if (!Number.isFinite(nCantidadNueva) || nCantidadNueva < 0) {
                return;
            }

            const nDiferencia = nCantidadNueva - nCantidadOriginal;
            const nStockCalculado = nStockOriginal - nDiferencia;
            const sStockCalculado = this._formatSapStock(nStockCalculado, 3);

            oModel.setProperty("/oSelecTableDetalle/StockDispoNum", nStockCalculado);
            oModel.setProperty("/oSelecTableDetalle/StockDispo", sStockCalculado);
            oModel.setProperty("/oSelecTableDetalle/StockDispoView", sStockCalculado);

            oModel.checkUpdate(true);

            void 0;
        },

        _onAcceptEditCantidad: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oDetalle = oModel.getProperty("/oSelecTableDetalle") || {};

            const sMatnr = oDetalle.Matnr || oDetalle.Material;
            const sItmNumber = String(oDetalle.ItmNumber || "").trim();
            const sUMV = oDetalle.UMV || oDetalle.Um || "MTS";

            const sCantRaw = (oDetalle.cantidad !== undefined && oDetalle.cantidad !== null)
                ? oDetalle.cantidad.toString().replace(",", ".")
                : "";
            const nNuevaCantidad = parseFloat(sCantRaw);

            if (!sMatnr) {
                sap.m.MessageToast.show("No se encontró el código de material seleccionado.");
                return;
            }
            if (isNaN(nNuevaCantidad) || nNuevaCantidad <= 0) {
                sap.m.MessageToast.show("Ingrese una cantidad válida.");
                return;
            }

            const sCantFormat = nNuevaCantidad.toFixed(3);
            const nCantidadOriginal = Number(oDetalle.CantidadOriginalNum);
            const nStockOriginal = Number(oDetalle.StockDispoOriginalNum);

            let nStockCalculado = Number(oDetalle.StockDispoNum);

            if (Number.isFinite(nCantidadOriginal) && Number.isFinite(nStockOriginal)) {
                nStockCalculado = nStockOriginal - (nNuevaCantidad - nCantidadOriginal);
            }

            const sStockCalculado = Number.isFinite(nStockCalculado)
                ? this._formatSapStock(nStockCalculado, 3)
                : (oDetalle.StockDispo || "0.000");

            // 🔹 Actualizar /oCantidades
            const oCantidades = oModel.getProperty("/oCantidades") || {};
            const sCantKey = sItmNumber || sMatnr;

            if (sCantKey) {
                oCantidades[sCantKey] = sCantFormat;
            }

            oModel.setProperty("/oCantidades", oCantidades);;

            // 🔹 Actualizar /oMaterialUI (cantidad de la fila)
            const aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            const oItemUI = aMaterialUI.find(function (item) {
                return sItmNumber && item.ItmNumber === sItmNumber;
            }) || aMaterialUI.find(function (item) {
                return item.Material === sMatnr;
            });
            if (oItemUI) {
                oItemUI.cantidad = sCantFormat;
                oItemUI.Cantidad = sCantFormat;
                oItemUI.UMV = oItemUI.UMV || sUMV;

                if (Number.isFinite(nStockCalculado)) {
                    oItemUI.StockDispoNum = nStockCalculado;
                    oItemUI.StockDispo = sStockCalculado;
                    oItemUI.StockDispoView = sStockCalculado;
                }
            }
            oModel.setProperty("/oMaterialUI", aMaterialUI);
            oModel.refresh(true);

            // Limpiar selección
            oModel.setProperty("/oSelecTableDetalle", {});

            // Cerrar el diálogo
            if (this._oDialogEdit && this._oDialogEdit.isOpen && this._oDialogEdit.isOpen()) {
                this._oDialogEdit.close();
                this._oDialogEdit.destroy();
                this._oDialogEdit = null;
            } else {
                const oDialog = oEvent.getSource().getParent();
                if (oDialog && oDialog.close) {
                    oDialog.close();
                    oDialog.destroy();
                }
            }
            const bAplicaBolsas = this._shouldValidateBolsas
                ? this._shouldValidateBolsas()
                : false;

            let bSimuladoPorBolsas = false;

            if (bAplicaBolsas && this._revisarBolsasTrasCambioCantidad) {
                bSimuladoPorBolsas = this._revisarBolsasTrasCambioCantidad() === true;
            }

            if (!bSimuladoPorBolsas) {
                this.onSimulateOrder();
            }

            sap.m.MessageToast.show("Cantidad actualizada correctamente.");
        },
        _afterOpenAddPedido: async function () {
            const oTable = this._getManualTable && this._getManualTable();

            if (oTable) {
                if (oTable.removeSelections) {
                    oTable.removeSelections(true);
                }
                if (oTable.clearSelection) {
                    oTable.clearSelection();
                }
            }

            const oModel = this.getView().getModel("oModelProyect");
            const oDet = oModel.getProperty("/oSelecTableDetalle") || {};
            const sMatnr = oDet.Matnr || oDet.Material;

            if (!sMatnr) {
                return;
            }

            let nCantidadOriginal = this._parseSapNumber(oDet.cantidad || oDet.Cantidad || "0");

            let nStockOriginal = Number(oDet.StockDispoNum);
            if (!Number.isFinite(nStockOriginal)) {
                nStockOriginal = this._parseSapNumber(
                    oDet.StockDispoRaw !== undefined ? oDet.StockDispoRaw : oDet.StockDispo
                );
            }

            let sUMV = oDet.UMV || oDet.Um || "MTS";

            try {
                const aFiltersStock = [
                    new sap.ui.model.Filter("Salesorganization", sap.ui.model.FilterOperator.EQ, "1110"),
                    new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, "1000"),
                    new sap.ui.model.Filter("Pedven", sap.ui.model.FilterOperator.EQ, true),
                    new sap.ui.model.Filter("Materialnumber", sap.ui.model.FilterOperator.EQ, sMatnr)
                ];

                const aStock = await this._loadProductoSingle(aFiltersStock);
                const oStock = (aStock && aStock.length) ? aStock[0] : null;

                if (oStock) {
                    nStockOriginal = oStock.StockDispoNum !== undefined
                        ? Number(oStock.StockDispoNum)
                        : this._parseSapNumber(
                            oStock.StockDispoRaw !== undefined ? oStock.StockDispoRaw : oStock.StockDispo
                        );

                    sUMV = oStock.Um || oDet.UMV || "MTS";

                    oModel.setProperty(
                        "/oSelecTableDetalle/StockDispoRaw",
                        oStock.StockDispoRaw !== undefined ? oStock.StockDispoRaw : oStock.StockDispo
                    );
                }
            } catch (e) {
                void 0;
            }

            const sStockView = this._formatSapStock(nStockOriginal, 3);

            oModel.setProperty("/oSelecTableDetalle/StockDispoOriginalNum", nStockOriginal);
            oModel.setProperty("/oSelecTableDetalle/StockDispoNum", nStockOriginal);
            oModel.setProperty("/oSelecTableDetalle/StockDispo", sStockView);
            oModel.setProperty("/oSelecTableDetalle/StockDispoView", sStockView);

            oModel.setProperty("/oSelecTableDetalle/CantidadOriginalNum", nCantidadOriginal);
            oModel.setProperty("/oSelecTableDetalle/UMV", sUMV);

            oModel.checkUpdate(true);
        },
        _onClose: function (oEvent) {
            try {
                const oDialog = oEvent?.getSource?.().getParent?.();
                if (oDialog?.isA?.("sap.m.Dialog")) {
                    oDialog.close();
                    return;
                }

                if (this._oDialogEdit?.isOpen?.()) {
                    this._oDialogEdit.close();
                    return;
                }
            } catch (e) {

            }
        },
        _onDeleteProduct: function (oEvent) {
            const oItem = oEvent.getSource().getParent();
            const oContext = oItem.getBindingContext("oModelProyect");
            const sPath = oContext.getPath();
            const oModel = oContext.getModel();
            let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            let aMaterial = oModel.getProperty("/oMaterial") || [];
            const iIndex = parseInt(sPath.split("/").pop(), 10);

            if (isNaN(iIndex) || iIndex < 0 || iIndex >= aMaterialUI.length) {
                return;
            }

            const oDeletedItem = aMaterialUI[iIndex];
            const sDeletedItm = oDeletedItem && oDeletedItem.ItmNumber;
            const sDeletedMaterial = (oDeletedItem && (oDeletedItem.Material || oDeletedItem.Matnr)) || "";

            aMaterialUI.splice(iIndex, 1);

            if (oDeletedItem && !oDeletedItem.isExtraFromSAP) {
                aMaterialUI = aMaterialUI.filter(function (item) {
                    if (!item.isExtraFromSAP) {
                        return true;
                    }

                    const bSameParent =
                        item.ParentItmNumber &&
                        sDeletedItm &&
                        item.ParentItmNumber === sDeletedItm;

                    const bSameMaterial =
                        !!sDeletedMaterial &&
                        (item.Material === sDeletedMaterial || item.Matnr === sDeletedMaterial);

                    return !(bSameParent || bSameMaterial);
                });

                if (sDeletedItm) {
                    aMaterial = aMaterial.filter(function (item) {
                        return item.ItmNumber !== sDeletedItm;
                    });
                } else if (sDeletedMaterial) {
                    aMaterial = aMaterial.filter(function (item) {
                        return item.Material !== sDeletedMaterial && item.Matnr !== sDeletedMaterial;
                    });
                }

                if (sDeletedMaterial) {
                    const oCant = oModel.getProperty("/oCantidades") || {};
                    if (oCant[sDeletedMaterial] !== undefined) {
                        delete oCant[sDeletedMaterial];
                        oModel.setProperty("/oCantidades", oCant);
                    }
                }
            }

            oModel.setProperty("/oMaterialUI", aMaterialUI);
            oModel.setProperty("/oMaterial", aMaterial);

            let subtotalGeneral = 0, totalImpuesto = 0, totalGeneral = 0;

            aMaterialUI.forEach(item => {
                subtotalGeneral += item.subtotal || 0;
                totalImpuesto += item.impuesto || 0;
                totalGeneral += item.total || 0;
            });

            const oDatCalculo = oModel.getProperty("/oDatCalculo") || {};
            const igvPorcentaje = oDatCalculo.igvPorcentaje ? parseFloat(oDatCalculo.igvPorcentaje) : 18;

            oModel.setProperty("/oDatCalculo", {
                subtotalGeneral: subtotalGeneral.toFixed(2),
                embalaje: "0.00",
                totalImpuesto: totalImpuesto.toFixed(2),
                totalGeneral: totalGeneral.toFixed(2),
                igvPorcentaje: igvPorcentaje.toFixed(2)
            });

            oModel.refresh(true);
        },
        onPressPieza: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("oModelProyect");
            if (!oCtx) return;
            const oRow = oCtx.getObject();
            const aPiezas = oRow.piezasDetalle || [];
            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty("/Piezas", aPiezas);
            this.setFragment(
                "_dialogInfoPartMaterial",
                this.frgIdInfoPartMaterial,
                "InfoPartMaterial",
                this
            );
        },
        onPressBackToMaterials: function () {
            if (this["_dialogInfoPartMaterial"]) {
                this["_dialogInfoPartMaterial"].close();
            }
            this.setFragment("_dialogAddManualProduct", this.frgIdAddManualProduct, "AddManualProduct", this);
        },
        onConfirmCreateOrder: function () {
            const that = this;

            if (!this._validateGrupoMaterialRequired("grabar el pedido")) {
                return;
            }

            if (!this._validateOrderHasMaterials("grabar el pedido")) {
                return;
            }

            sap.m.MessageBox.confirm(
                "¿Desea crear la orden ?",
                {
                    title: "Confirmación",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            that._createOrder();
                        }
                    }
                }
            );
        },
        onCancelOrder: function () {
            var that = this;
            sap.m.MessageBox.confirm(
                "¿Desea cancelar el pedido?",
                {
                    title: "Confirmación",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            that._clearPendingOCFiles();

                            var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                            oRouter.navTo("Main");
                        }
                    }
                }
            );
        },
        _resetMaterialFilters: function () {
            const oView = this.getView();
            const oModelP = oView.getModel("oModelProyect");
            const oModelData = oView.getModel("oModelData");
            oModelP.setProperty("/oSelectDetail", {
                material: "",
                Description: "",
                Brand: "",
                ArtTextil: "",
                Orillo: "",
                aMaterials: [],
                aDescriptions: [],
                aBrands: [],
                aArtTextil: [],
                aOrillo: []
            });
            oModelP.setProperty("/oMaterialSelect", []);
            oModelP.setProperty("/oMaterialBase", []);
            oModelP.setProperty("/Piezas", []);
            if (oModelData) {
                const aFullMat = oModelData.getProperty("/oFilterMaterialFull") || [];
                const aFullDesc = oModelData.getProperty("/ListDescription") || [];
                const aFullBrand = oModelData.getProperty("/ListBrand") || [];
                const aFullArt = oModelData.getProperty("/ListArtTextil") || [];
                const aFullOri = oModelData.getProperty("/ListOrillo") || [];
                this._SetOrilloPrefixList(aFullOri);
                oModelData.setProperty("/oFilterMaterial", aFullMat);
                oModelData.setProperty("/ListDescriptionSug", aFullDesc);
                oModelData.setProperty("/ListBrandSug", aFullBrand);
                oModelData.setProperty("/ListArtTextilSug", aFullArt);
                //oModelData.setProperty("/ListOrilloSug", aFullOri);
            }
            const aBaseIds = [
                "miMaterial",
                "miDescription",
                "miBrand",
                "miArtTextil",
                "miOrillo"
            ];

            aBaseIds.forEach(function (sId) {
                const sFragId = this.frgIdAddManualProduct ? (this.frgIdAddManualProduct + "--" + sId) : sId;

                const oCtrl =
                    sap.ui.getCore().byId(sFragId) ||
                    oView.byId(sId) ||
                    sap.ui.getCore().byId(sId);

                if (oCtrl) {
                    // MultiInput
                    if (oCtrl.removeAllTokens) {
                        oCtrl.removeAllTokens();
                    }
                    // MultiComboBox / InputBase
                    if (oCtrl.setSelectedKeys) {
                        oCtrl.setSelectedKeys([]);
                    }
                    if (oCtrl.setValue) {
                        oCtrl.setValue("");
                    }
                }
            }.bind(this));
            const oTableManual =
                sap.ui.getCore().byId(this.frgIdAddManualProduct + "--tbMaterialesManual") ||
                sap.ui.getCore().byId("tbMaterialesManual") ||
                oView.byId("tbMaterialesManual");

            if (oTableManual) {
                if (oTableManual.removeSelections) {
                    oTableManual.removeSelections();
                }
                const oBinding = oTableManual.getBinding("items");
                if (oBinding) {
                    oBinding.filter([]);
                    oBinding.refresh();
                }
            }

            oModelP.refresh(true);
        },
        onLimpiarPress: function () {
            this._resetMaterialFilters();
        },
        onDetailEdit: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oInputForm = oModel.getProperty("/inputForm") || {};
            const bExteriorZPEF = this._isClienteExteriorZPEF();

            if (bExteriorZPEF) {
                this._applyExternalZPEFDetailLock();
                this._enforceExternalZPEFDetailDefaults();
            }

            oModel.setProperty("/inputFormBackup", JSON.parse(JSON.stringify(oInputForm)));
            oModel.setProperty("/isDetailEdit", true);

            // Para ZPEF exterior solo se habilitan destino, puerto destino y observación pedido.
            // Para los demás escenarios se mantiene la edición normal.
            oModel.setProperty("/isFormEnabled", !bExteriorZPEF);
            oModel.setProperty("/isExternalZPEFEdit", bExteriorZPEF);
        },

        onDetailCancel: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oBackup = oModel.getProperty("/inputFormBackup") || {};
            oModel.setProperty("/inputForm", JSON.parse(JSON.stringify(oBackup)));

            oModel.setProperty("/isDetailEdit", false);
            oModel.setProperty("/isFormEnabled", false);
            oModel.setProperty("/isExternalZPEFEdit", false);

            if (this._applyExternalZPEFDetailLock) {
                this._applyExternalZPEFDetailLock();
            }

            sap.m.MessageToast.show("Cambios descartados.");
        },

        onDetailSave: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const bExteriorZPEF = this._isClienteExteriorZPEF();

            if (bExteriorZPEF) {
                this._enforceExternalZPEFDetailDefaults();
            } else if (this._validateRequiredFields && !this._validateRequiredFields()) {
                return;
            }

            if (this._updateResumenEntrega) {
                this._updateResumenEntrega();
            }

            // Reforzamos nuevamente porque _updateResumenEntrega actualiza resumen/detalle.
            // Esto evita que ZPEF exterior pierda Courier, 4000, Z00 o tipoEntrega 10.
            if (bExteriorZPEF) {
                this._enforceExternalZPEFDetailDefaults();
            }

            oModel.setProperty("/isDetailEdit", false);
            oModel.setProperty("/isFormEnabled", false);
            oModel.setProperty("/isExternalZPEFEdit", false);

            sap.m.MessageToast.show("Condiciones comerciales actualizadas.");
        },
        onSelectRadioComprobante: function (oEvent) {
            if (!oEvent.getParameter("selected")) return;

            const oSource = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");

            let sValor = "";
            switch (oSource.getText()) {
                case this.getResourceBundle().getText("txtClientCollet"):
                    sValor = "1";
                    break;
                case this.getResourceBundle().getText("txtDirectDispatch"):
                    sValor = "2";
                    break;
                case this.getResourceBundle().getText("txtDispatchAgency"):
                    sValor = "3";
                    break;
            }

            oModel.setProperty("/inputForm/tipoEntrega", sValor);
            if (sValor !== "2") {
                oModel.setProperty("/inputForm/transporte", "");
            }

            this._updateResumenEntrega();
        },
        _handleSelectChange: function (oEvent, sKeyPath, sTextPath) {
            const oItem = oEvent.getParameter("selectedItem");
            const sKey = oItem && oItem.getKey();
            const sText = oItem && oItem.getText();

            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty(sKeyPath, sKey);
            oModel.setProperty(sTextPath, sText);
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

            if (sTipo === "1") sResumen = "Cliente recoge";
            if (sTipo === "2") sResumen = "Despacho directo";
            if (sTipo === "3") sResumen = "Despacho agencia";
            if (sTipo === "10") sResumen = "Courier";
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
            const sDestinoText = (oItemDestino?.getText?.() || oFiltros.destinoCeramicoText || "").trim();

            if (sDestinoText) {
                aDetalle.push(sDestinoText);
                oModel.setProperty("/inputForm/destinoCeramicoText", sDestinoText);
            } else {
                oModel.setProperty("/inputForm/destinoCeramicoText", "");
            }

            const oComboAgencia = this._getFirstById(["comboAgencia"]);
            const oItemAgencia = oComboAgencia?.getSelectedItem ? oComboAgencia.getSelectedItem() : null;
            const sAgenciaNombre = (oItemAgencia?.getAdditionalText?.() || oFiltros.direccionAgenciaText || "").trim();

            oModel.setProperty("/inputForm/direccionAgenciaText", (sTipo === "3") ? sAgenciaNombre : "");

            oModel.setProperty("/inputForm/resumenEntrega", sResumen);
            oModel.setProperty("/inputForm/detalleEntrega", aDetalle.join(" | "));

            oModel.refresh(true);
        },

        onDestinoTextilDetailChange: function (oEvent) {
            const oCombo = oEvent.getSource();
            const oItem = oCombo.getSelectedItem();
            const oModel = this.getView().getModel("oModelProyect");

            if (!oItem) {
                oModel.setProperty("/inputForm/destinoTextil", "");
                oModel.setProperty("/inputForm/destinoTextilText", "");
                oModel.setProperty("/inputForm/destinoCeramicoText", "");
                this._updateResumenEntrega();
                return;
            }

            const sKey = oItem.getKey ? oItem.getKey() : "";
            const sText = oItem.getText ? oItem.getText() : "";

            oModel.setProperty("/inputForm/destinoTextil", sKey);
            oModel.setProperty("/inputForm/destinoTextilText", sText);
            oModel.setProperty("/inputForm/destinoCeramicoText", sText);

            this._updateResumenEntrega();
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

        onPuertoDestinoDetailChange: function (oEvent) {
            const oSelect = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            const aPuertos = oModelData ? (oModelData.getProperty("/oPortEmbarkation") || []) : [];

            const sKey = String(
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

            oModel.setProperty("/inputForm/puertoEmbarque", sKey);
            oModel.setProperty("/inputForm/puertoEmbarqueText", sText);

            void 0;

            oModel.refresh(true);
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

        _formatDateForSAP: function (sDate) {
            if (!sDate) return null;

            try {
                // Caso 0: ya viene de SAP en formato /Date(…)/ → lo devolvemos tal cual
                if (typeof sDate === "string" && /^\/Date\(\d+\)\/$/.test(sDate)) {
                    return sDate;
                }

                // Caso 1: objeto Date nativo
                if (sDate instanceof Date) {
                    const time = Date.UTC(
                        sDate.getFullYear(),
                        sDate.getMonth(),
                        sDate.getDate()
                    );
                    return "/Date(" + time + ")/";
                }

                // Normalizamos a string
                if (typeof sDate !== "string") {
                    sDate = String(sDate);
                }

                // Caso 2: formato YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS
                if (sDate.includes("-")) {
                    const s = sDate.substring(0, 10); // nos quedamos con YYYY-MM-DD
                    const [year, month, day] = s.split("-");
                    const time = Date.UTC(+year, +month - 1, +day);
                    return "/Date(" + time + ")/";
                }

                // Caso 3: formato dd/MM/yyyy
                if (sDate.includes("/")) {
                    const [day, month, year] = sDate.split("/");
                    const time = Date.UTC(+year, +month - 1, +day);
                    return "/Date(" + time + ")/";
                }

                // Caso 4: formato YYYYMMDD
                if (/^\d{8}$/.test(sDate)) {
                    const year = sDate.slice(0, 4);
                    const month = sDate.slice(4, 6);
                    const day = sDate.slice(6, 8);
                    const time = Date.UTC(+year, +month - 1, +day);
                    return "/Date(" + time + ")/";
                }

                // Si no reconocemos el formato, mejor no enviamos nada
                return null;

            } catch (e) {
                void 0;
                return null;
            }
        },
        formatTipDocumentText: function (sKey) {
            if (!sKey) return "";

            // Obtener la lista de documentos desde el modelo
            const aDocuments = this.getOwnerComponent().getModel("oModelData").getProperty("/oTipDocumentData");
            if (!aDocuments) return sKey;

            // Buscar el texto del key seleccionado
            const oDoc = aDocuments.find(doc => doc.key === sKey);
            return oDoc ? oDoc.text : sKey; // Devuelve el texto si existe, si no, el key
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

        formatSellerPrincipalDisplay: function (sKunn2, sSeller, sKunn2Fallback, sSellerFallback) {
            const sCode = String(sKunn2 || sKunn2Fallback || "").trim();
            const sName = String(sSeller || sSellerFallback || "").trim();

            if (sCode && sName) {
                return sCode + " - " + sName;
            }

            return sName || sCode || "";
        },

        formatCantidad: function (value) {
            if (value === null || value === undefined || value === "") return "";
            const n = parseFloat(value);
            // Si es entero, devuelve sin decimales; si no, devuelve con los decimales reales
            return Number.isInteger(n) ? n.toString() : n.toString();
        },
        formatCondPagoDisplay: function (sCodigo, sTexto) {
            if (!sCodigo && !sTexto) return "";
            if (!sTexto) return sCodigo;
            if (!sCodigo) return sTexto;
            return `${sCodigo} - ${sTexto}`;
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
        _isSerie80OBelfast: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const sGrupoMaterial = String(
                oModel.getProperty("/inputForm/grupoMaterial") || ""
            ).trim();

            // Si Belfast se identifica por otro campo/código, aquí lo ajustas
            const aMatUI = oModel.getProperty("/oMaterialUI") || [];
            const bBelfast = aMatUI.some(function (oItem) {
                const sBrand = String(oItem.Brand || "").trim().toUpperCase();
                return sBrand.includes("BELFAST") || sBrand === "T01";
            });

            return sGrupoMaterial === "02" || bBelfast;
        },
        _getTotalPiezasSinBolsa: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const aMatUI = oModel.getProperty("/oMaterialUI") || [];

            let nTotalPiezas = 0;

            aMatUI.forEach(function (oItem) {
                if (oItem.esBolsa) {
                    return;
                }

                const nCantidad = parseFloat(String(oItem.cantidad || "0").replace(",", "."));
                if (!isNaN(nCantidad) && nCantidad > 0) {
                    nTotalPiezas += nCantidad;
                }
            });

            return nTotalPiezas;
        },
        _GetFiltroOrilloPrefixSuggest: function (sValue, sTargetPath) {
            const oModelData = this.getView().getModel("oModelData");

            if (!sValue || sValue.length < 1) {
                oModelData.setProperty(sTargetPath, []);
                return;
            }

            const that = this;
            const sSalesOrg = "1110";

            const sv = String(sValue).replace(/'/g, "''");

            const sFilter =
                `$filter=SalesOrganization eq '${sSalesOrg}' and startswith(Material,'${sv}')`;

            let sUrl = "";
            if (that.local) {
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(
                    `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=200&$format=json`
                );
            } else {
                sUrl = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=200&$format=json`;
            }

            Services.getoDataERPSync(that, sUrl, function (result) {
                util.response.validateAjaxGetERPNotMessage(result, {
                    success: function (oData) {

                        const arr = Array.isArray(oData.data) ? oData.data : [];
                        const map = {};

                        arr.forEach(item => {
                            const mat = String(item.Material || "").trim();
                            if (mat.length < 2) return;

                            const pref = mat.substring(0, 2);

                            if (!map[pref]) {
                                map[pref] = {
                                    key: pref,
                                    Display: pref
                                };
                            }
                        });

                        oModelData.setProperty(sTargetPath, Object.values(map));
                    },
                    error: function () {
                        oModelData.setProperty(sTargetPath, []);
                    }
                });
            });
        },
        _SetOrilloPrefixList: function (aSource) {
            const oModelData = this.getView().getModel("oModelData");
            const getPrefix2 = function (s) {
                const txt = String(s || "").trim();
                const m = txt.match(/(\d+)/);
                if (!m || !m[1]) return "";
                return m[1].substring(0, 2);
            };

            const mUnique = {};

            (aSource || []).forEach(function (item) {
                const sText = typeof item === "string"
                    ? item
                    : (item.OrilloStyle || item.Display || item.key || "");

                const sPrefix2 = getPrefix2(sText);
                if (!sPrefix2) return;

                if (!mUnique[sPrefix2]) {
                    mUnique[sPrefix2] = {
                        key: sPrefix2,
                        Display: sPrefix2,
                        OrilloPrefix2: sPrefix2
                    };
                }
            });

            const aOut = Object.values(mUnique).sort(function (a, b) {
                return String(a.key).localeCompare(String(b.key), undefined, { numeric: true });
            });

            oModelData.setProperty("/ListOrilloSug", aOut);
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

            // Caso: 197,910.180
            if (sValue.includes(",") && sValue.includes(".")) {
                if (sValue.lastIndexOf(".") > sValue.lastIndexOf(",")) {
                    sValue = sValue.replace(/,/g, "");
                } else {
                    // Caso europeo: 197.910,180
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

        _formatSapStock: function (value, iDecimals) {
            const nValue = this._parseSapNumber(value);
            const iDec = iDecimals !== undefined ? iDecimals : 3;

            const sAbs = Math.abs(nValue).toFixed(iDec);
            const aParts = sAbs.split(".");

            aParts[0] = aParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

            return (nValue < 0 ? "-" : "") + aParts.join(".");
        },

        _prepareDataForTextilesPedido: function (aStock) {
            const that = this;
            const oModelUser = this.getView().getModel("oModelUser");

            const isSupervisor = !!oModelUser.getProperty("/bIsCoord");
            const isVendedor = !!oModelUser.getProperty("/bIsVendedor");
            const isCliente = !!oModelUser.getProperty("/bIsCliente");

            const normalizeLinea = (v) => {
                return String(v ?? "")
                    .replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, "")
                    .trim();
            };

            const toNumber = (v) => {
                let s = String(v ?? "").trim().replace(/\s/g, "");
                if (!s) return 0;

                let isNegative = false;

                if (s.endsWith("-")) {
                    isNegative = true;
                    s = s.slice(0, -1);
                }
                if (s.startsWith("-")) {
                    isNegative = true;
                    s = s.slice(1);
                }

                if (s.includes(",") && s.includes(".")) {
                    if (s.lastIndexOf(".") > s.lastIndexOf(",")) {
                        s = s.replace(/,/g, "");
                    } else {
                        s = s.replace(/\./g, "").replace(",", ".");
                    }
                } else if (s.includes(",")) {
                    s = s.replace(",", ".");
                }

                const n = parseFloat(s);
                if (!Number.isFinite(n)) return 0;
                return isNegative ? -n : n;
            };

            return (aStock || []).filter(function (child) {
                const linea = normalizeLinea(child?.Linea ?? "");
                const isLineaVacia = linea === "";
                const isLineaSlash = linea === "/";
                const isLineaAster = linea === "*";

                const stockDispo = that._parseSapNumber(
                    child.StockDispoRaw !== undefined ? child.StockDispoRaw : child.StockDispo
                );

                const stockPend = that._parseSapNumber(
                    child.StockPedidoRaw !== undefined ? child.StockPedidoRaw : child.StockPedido
                );

                let ocultar = false;

                if (isCliente) {
                    if (isLineaAster) {
                        ocultar = false;
                    } else if (isLineaVacia) {
                        ocultar = !(stockDispo > 0);
                    } else if (isLineaSlash) {
                        ocultar = true;
                    } else {
                        ocultar = true;
                    }
                } else if (isSupervisor) {
                    if (isLineaAster) {
                        ocultar = false;
                    } else if (isLineaSlash) {
                        ocultar = false;
                    } else if (isLineaVacia) {
                        ocultar = !((stockDispo !== 0) || (stockPend > 0));
                    } else {
                        ocultar = true;
                    }
                } else if (isVendedor) {
                    if (isLineaAster) {
                        ocultar = false;
                    } else if (isLineaSlash) {
                        ocultar = true;
                    } else if (isLineaVacia) {
                        ocultar = !((stockDispo !== 0) || (stockPend > 0));
                    } else {
                        ocultar = true;
                    }
                } else {
                    ocultar = true;
                }

                child.StockDispoRaw = child.StockDispoRaw !== undefined ? child.StockDispoRaw : child.StockDispo;
                child.StockPedidoRaw = child.StockPedidoRaw !== undefined ? child.StockPedidoRaw : child.StockPedido;

                child.StockDispoNum = stockDispo;
                child.StockPedidoNum = stockPend;

                child.StockDispo = that._formatSapStock(stockDispo, 3);
                child.StockPedido = that._formatSapStock(stockPend, 3);

                child.stockNegativo = stockDispo < 0;
                child.state = stockDispo < 0 ? "Error" : "None";
                child.SinStock = stockDispo <= 0;

                // Solo CLIENTE bloquea cuando no hay stock
                child.CantidadEditable = isCliente ? stockDispo > 0 : true;

                if (isCliente && child.SinStock) {
                    child.cantidad = "";
                }
                return !ocultar;
            });
        },
        _GetFilteredMaterialsRegistro: function (jFilter) {
            const that = this;

            return new Promise((resolve) => {
                try {
                    const sSalesOrg = "1110";

                    function buildOrCondition(values, field) {
                        if (!values || values.length === 0) return null;

                        return "(" + values
                            .map(v => {
                                const cleaned = String(v).trim().replace(/'/g, "''");
                                return `${field} eq '${cleaned}'`;
                            })
                            .join(" or ") + ")";
                    }

                    function buildStartsWithCondition(values, field) {
                        if (!values || values.length === 0) return null;

                        return "(" + values
                            .map(v => {
                                const cleaned = String(v || "").trim().replace(/'/g, "''");
                                if (!cleaned) return null;
                                return `startswith(${field},'${cleaned}')`;
                            })
                            .filter(Boolean)
                            .join(" or ") + ")";
                    }

                    let aFilters = [`SalesOrganization eq '${sSalesOrg}'`];
                    let cond;

                    cond = buildOrCondition(jFilter.cbMaterialGroup, "MaterialGroup");
                    if (cond) aFilters.push(cond);

                    cond = buildOrCondition(jFilter.cbCodMaterial, "Material");
                    if (cond) aFilters.push(cond);

                    cond = buildOrCondition(jFilter.cbBrand, "Brand");
                    if (cond) aFilters.push(cond);

                    cond = buildOrCondition(jFilter.cbTextileArticleQuality, "TextileArticleQuality");
                    if (cond) aFilters.push(cond);

                    cond = buildStartsWithCondition(jFilter.cbOrilloPrefix2, "Material");
                    if (cond) aFilters.push(cond);

                    let sFilter = "$filter=" + aFilters.join(" and ");

                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        sUrl = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
                    }

                    void 0;

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                if (oData.data && Array.isArray(oData.data)) {
                                    const seen = new Set();
                                    const aOrillo = (jFilter.cbOrilloPrefix2 || []).map(v => String(v).trim()).filter(Boolean);

                                    const aMaterials = oData.data
                                        .filter(Boolean)
                                        .filter(item => item.Material)
                                        .filter(item => {
                                            const sMat = String(item.Material || "").trim();

                                            if (aOrillo.length > 0 && !aOrillo.some(pref => sMat.startsWith(pref))) {
                                                return false;
                                            }

                                            if (seen.has(sMat)) {
                                                return false;
                                            }

                                            seen.add(sMat);
                                            return true;
                                        });

                                    void 0;
                                    resolve(aMaterials);
                                } else {
                                    resolve([]);
                                }
                            },
                            error: function () {
                                void 0;
                                resolve([]);
                            }
                        });
                    });

                } catch (err) {
                    void 0;
                    resolve([]);
                }
            });
        },
        _fetchStockForMaterialsRegistro: async function (aMaterials) {
            const that = this;

            const aMatnr = Array.from(
                new Set((aMaterials || []).map(x => x.Material).filter(Boolean))
            );

            if (!aMatnr.length) {
                return [];
            }

            let sUrl;
            if (that.local) {
                sUrl = that.getOwnerComponent()
                    .getManifestObject()
                    .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
            } else {
                sUrl = jQuery.sap.getModulePath(that.route) +
                    "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
            }

            const oModel = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                useBatch: false,
                defaultBindingMode: "TwoWay"
            });

            const chunkSize = 30;
            let allResults = [];

            const readChunk = function (aChunk) {
                return new Promise((resolve, reject) => {
                    const aOrMat = aChunk.map(mat =>
                        new sap.ui.model.Filter("Materialnumber", sap.ui.model.FilterOperator.EQ, mat)
                    );

                    const aFilters = [
                        new sap.ui.model.Filter("Salesorganization", sap.ui.model.FilterOperator.EQ, "1110"),
                        new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, "1000"),
                        new sap.ui.model.Filter("Pedven", sap.ui.model.FilterOperator.EQ, true),
                        new sap.ui.model.Filter("Stockven", sap.ui.model.FilterOperator.EQ, true),
                        new sap.ui.model.Filter(aOrMat, false)
                    ];

                    oModel.read("/I_StockDisponibleSet", {
                        filters: aFilters,
                        urlParameters: {
                            "$expand": "toEtextil,toEtextilStockVen"
                        },
                        success: function (oData) {
                            resolve(oData.results || []);
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                });
            };

            for (let i = 0; i < aMatnr.length; i += chunkSize) {
                const aChunk = aMatnr.slice(i, i + chunkSize);
                const aRes = await readChunk(aChunk);
                allResults.push(...aRes);
            }

            return allResults;
        },
        onEditarBolsa: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("oModelProyect");
            if (!oCtx) return;

            const oRow = oCtx.getObject();
            const oModel = oCtx.getModel();

            if (!oRow.esBolsa) {
                sap.m.MessageToast.show("Esta opción solo aplica para líneas de bolsa.");
                return;
            }

            this._oBolsaEditContext = oCtx;

            oModel.setProperty("/oBolsaSelected", {
                Material: oRow.Material || "",
                cantidad: oRow.cantidad || "0",
                cantidadNueva: oRow.cantidad || "0",
                UMV: oRow.UMV || "PQT"
            });

            this.setFragment(
                "_dialogEditBolsa",
                "frgIdEditBolsa",
                "EditBolsa",
                this
            );
        },
        _onAcceptEditBolsa: function () {
            const oCtx = this._oBolsaEditContext;
            if (!oCtx) return;

            const oModel = oCtx.getModel();
            const sPath = oCtx.getPath();
            const oRow = oCtx.getObject();

            const oBolsa = oModel.getProperty("/oBolsaSelected") || {};
            const nActual = parseFloat(oBolsa.cantidad || "0") || 0;
            const nNueva = parseFloat(String(oBolsa.cantidadNueva || "0").replace(",", ".")) || 0;

            if (nNueva <= 0) {
                sap.m.MessageBox.warning("No puede colocar 0 bolsas. Si desea quitar todas las bolsas, elimine la fila.");
                return;
            }

            if (nNueva > nActual) {
                sap.m.MessageBox.warning("La cantidad de bolsas solo puede reducirse, no aumentarse.");
                return;
            }

            oModel.setProperty(sPath + "/cantidad", nNueva.toString());

            const oCantidades = oModel.getProperty("/oCantidades") || {};
            oCantidades[oRow.Material] = nNueva.toString();
            oModel.setProperty("/oCantidades", oCantidades);

            oModel.refresh(true);

            if (this._dialogEditBolsa) {
                this._dialogEditBolsa.close();
            }

            this.onSimulateOrder();
        },
        _onCloseBolsa: function () {
            if (this._dialogEditBolsa) {
                this._dialogEditBolsa.close();
            }
        },

        _getClienteCountryForDetail: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return "";
            }

            const oDir = oModel.getProperty("/oDireccionCliente") || {};
            const oDatClient = oModel.getProperty("/oDatClient") || {};
            const oClientData = oModel.getProperty("/oClientData") || {};

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
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return false;
            }

            const oInputForm = oModel.getProperty("/inputForm") || {};
            const sTipDoc = String(oInputForm.tipDocument || "").trim().toUpperCase();
            const sCountry = this._getClienteCountryForDetail();

            // Regla del negocio: país vacío también se trata como exterior/no PE.
            return !!oInputForm.bClienteExteriorZPEF || (sTipDoc === "ZPEF" && sCountry !== "PE");
        },

        _applyExternalZPEFDetailLock: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return;
            }

            const bLock = this._isClienteExteriorZPEF();

            oModel.setProperty("/isExternalZPEFDetailLocked", bLock);

            oModel.setProperty("/inputForm/showObsDelivery", !bLock);
            oModel.setProperty("/inputForm/showMotivo", !bLock);
            oModel.setProperty("/inputForm/showTipoCambio", !bLock);

            oModel.setProperty("/inputForm/showMensajeFleteZPEF", bLock);
            oModel.setProperty(
                "/inputForm/mensajeFleteZPEF",
                bLock
                    ? "El valor del flete será calculado según peso y volumen final. El equipo comercial se comunicará con usted para coordinar el pago y despacho."
                    : ""
            );

            if (bLock) {
                oModel.setProperty("/inputForm/obsDelivery", "");
                oModel.setProperty("/inputForm/labelPuertoEmbarque", "Puerto de Destino");

                if (!oModel.getProperty("/isDetailEdit")) {
                    oModel.setProperty("/isFormEnabled", false);
                    oModel.setProperty("/isExternalZPEFEdit", false);
                }
            }

            oModel.refresh(true);
        },
        _getFormClientCacheForDetail: function (sCustomer) {
            try {
                const sRaw = sessionStorage.getItem("REGPED_TEXTILES_FORMCLIENT_TO_DETAIL");

                if (!sRaw) {
                    return null;
                }

                const oCache = JSON.parse(sRaw);

                if (String(oCache.Customer || "").trim() !== String(sCustomer || "").trim()) {
                    return null;
                }

                return oCache;
            } catch (e) {
                void 0;
                return null;
            }
        },

        _resolvePuertoDestinoText: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            if (!oModel || !oModelData) {
                return;
            }

            const sPuertoKey = String(oModel.getProperty("/inputForm/puertoEmbarque") || "").trim();
            const sPuertoTextActual = String(oModel.getProperty("/inputForm/puertoEmbarqueText") || "").trim();

            if (!sPuertoKey) {
                if (!sPuertoTextActual) {
                    oModel.setProperty("/inputForm/puertoEmbarqueText", "");
                }
                return;
            }

            const aPuertos = oModelData.getProperty("/oPortEmbarkation") || [];

            const oPuerto = aPuertos.find(function (oItem) {
                return String(oItem.sKey || "").trim() === sPuertoKey;
            });

            if (oPuerto) {
                oModel.setProperty("/inputForm/puertoEmbarqueText", oPuerto.sText || sPuertoTextActual || sPuertoKey);
            } else if (!sPuertoTextActual) {
                oModel.setProperty("/inputForm/puertoEmbarqueText", sPuertoKey);
            }
        },


    });
});
