sap.ui.define([
    "com/aris/registropedido/quimico/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "com/aris/registropedido/quimico/pe/model/models",
    "com/aris/registropedido/quimico/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    '../util/util',
    '../util/utilUI',
    "com/aris/registropedido/quimico/pe/services/Services"
], (BaseController, Controller, models, Formatter, JSONModel, util, utilUI, Services) => {
    "use strict";

    var that,
        bValueHelpEquipment = false,
        clouconnector = true;
    formatter: Formatter;
    return BaseController.extend("com.aris.registropedido.quimico.pe.controller.Detail", {
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
        },
        onAfterRendering: function () {
            this._applyContainsFilterToCombos();
        },
        handleRouteMatched: function (bInit) {
            sap.ui.core.BusyIndicator.show(0);
            let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
            const oProj = this.getOwnerComponent().getModel("oModelProyect");
            if (!this.getView().getModel("oModelProyect")) {
                this.getView().setModel(oProj, "oModelProyect");
            }
            if (!oProj.getProperty("/ui")) {
                oProj.setProperty("/ui", {
                    materialesBusy: false,
                    pendingExcludedNoIgv: []
                });
            }
            let oInputForm = oProj.getProperty("/inputForm") || {};

            if (oInputForm.fleteIncluido !== true && oInputForm.fleteIncluido !== false) {
                oInputForm.fleteIncluido = null;
            }

            oProj.setProperty("/inputForm", oInputForm);
            let sCurrency = (oInputForm.moneda || "").trim();
            if (typeof this._updateFormState === "function") {
                this._updateFormState(); // <- aquí dentro tú ya pones PEN, etc.
                oInputForm = oProj.getProperty("/inputForm") || {};
                sCurrency = (oInputForm.moneda || "").trim();
            }
            const bRef = !!(oInputForm.tipoReferencia && oInputForm.docRefSeleccionado);
            oProj.setProperty("/inputForm/esConReferencia", bRef);


            if (!sCurrency) {
                sCurrency = "PEN";
                oInputForm.moneda = sCurrency;
                oProj.setProperty("/inputForm", oInputForm);
            }
            Promise.all([that._getPrueba(), that._getDatClient(sCustomer),
            that._getMaterialStock(), that._getClientPet(sCustomer), that._getTipChangeData(),
            that._getUsers(), that._getBPVendedor(), that._getDescriptionMaterial(),
            that._getTipMaterialData(), that._getAddresTravel(sCustomer), that._getTipMoney(that),
            that._getTransport(), that._getCOnditionPay(), that._getAnticipo(sCustomer, sCurrency),
            that._getNotaCredito(sCustomer, sCurrency),
            ]).then((values) => {
                let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");
                that._validateAccessToPortal(values);
                const oInputForm = that.oModelProyect.getProperty("/inputForm") || {};
                that.oModelProyect.setProperty("/inputFormBackup", JSON.parse(JSON.stringify(oInputForm)));
                that.oModelProyect.setProperty("/isDetailEdit", false);
                that.oModelProyect.setProperty("/inputForm", oInputForm);
                that.oModelProyect.setProperty("/isFormEnabled", false);
                this._setMaterialesBusy(false);
                if (!that.oModelProyect.getProperty("/oSelecTableDetalle")) {
                    that.oModelProyect.setProperty("/oSelecTableDetalle", {
                        ItmNumber: "",
                        Material: "",
                        Descriptions: "",
                        cantidad: "",
                        precioBase: "",
                        Kbetr: "",
                        DescuentoPermitido: "",
                        DescuentoPermitidoNum: 0,
                        DescuentoManual: "0",
                        usarPrecioManual: false,
                        tieneDescuentoManual: false
                    });
                }
                if (!that.oModelProyect.getProperty("/oSelectDetail")) {
                    that.oModelProyect.setProperty("/oSelectDetail", {
                        material: "",
                        Description: "",
                        grupoMaterial: "",
                        Brand: "",
                        aMaterials: [],
                        aDescriptions: [],
                        aBrands: [],
                    });
                }
                const oMaterialResp = values[2];
                if (oMaterialResp && oMaterialResp.sEstado === "S") {
                    that.oModelData.setProperty("/ListBrandCodes", oMaterialResp.aBrands || []);
                }
                let aMateriales = oMaterialResp.oResults || [];
                let aBrands = oMaterialResp.aBrands || [];
                let aMaterialGroups = oMaterialResp.aMaterialGroups || [];
                let aDescriptions = oMaterialResp.aDescriptions || [];
                that.oModelData.setProperty("/oFilterMaterial", aMateriales);
                that.oModelData.setProperty("/aBrands", aBrands);
                that.oModelData.setProperty("/ListDescription", aDescriptions);
                that.oModelData.setProperty("/ListDescriptionSug", []);
                let oDataDetalle = values[3].oResults;
                let oDetailCliendFilter = oDataDetalle.filter(item => item.Customer == sCustomer)
                if (oDetailCliendFilter.length > 0) {
                    that.oModelProyect.setProperty("/oDatClient", oDetailCliendFilter[0]);
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
                    const aBrandsFull = oBrandResp.oResults || [];
                    that.oModelData.setProperty("/ListBrand", aBrandsFull);
                    that.oModelData.setProperty("/ListBrandSug", aBrandsFull);
                }
                const oMatGroupResp = values[8];
                that.oModelData.setProperty("/oMaterialGroup", oMatGroupResp.oResults || []);
                let oRespTravel = values[9];
                if (oRespTravel && oRespTravel.sEstado === "S") {
                } else {
                    that.oModelProyect.setProperty("/oAgenciasCliente", []);
                    that.oModelProyect.setProperty("/oDestinosCliente", []);
                    that.oModelProyect.setProperty("/oFinalDestinosCliente", []);
                }
                that.oModelData.setProperty("/oTipMoney", values[10].d.results);
                that.oModelData.setProperty("/oTrasport", values[11].oResults);
                that.oModelData.setProperty("/oConditionPay", values[12].oResults);

                if (that._syncEntregaEditData) {
                    that._syncEntregaEditData();
                }

                const oAnticipoResp = values[13];
                const oNotaCreditoResp = values[14];

                const sSalesOrgNC = "1120";
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
                that.oModelProyect.getProperty("/oDetalle");
                that.oModelProyect.getProperty("/oFormCliente");
                that.oModelProyect.setProperty("/inputForm/showFleteSection", false);
                that.getView().getModel("oModelProyect").setProperty("/oMaterial", []);
                this._initMaterialFromReferencia();
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
                void 0;
                sap.ui.core.BusyIndicator.hide(0);
                oRouter.navTo("AccessDenied");

            } catch (oError) {
                void 0;
                sap.ui.core.BusyIndicator.hide(0);
                const oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("AccessDenied");
            }
        },
        _resetAddManualProductFilters: function () {
            const oView = this.getView();
            const oModelP = oView.getModel("oModelProyect");

            // 🔹 Reset objeto de filtros en el modelo
            oModelP.setProperty("/oSelectDetail", {
                material: "",
                Description: "",
                grupoMaterial: "",
                Brand: "",
                aMaterials: [],
                aDescriptions: [],
                aBrands: []
            });

            oModelP.setProperty("/inputForm/grupoMaterialText", "");
            oModelP.setProperty("/oMaterialSelect", []);

            const aFilterIds = [
                this.frgIdAddManualProduct + "--miMaterial",
                this.frgIdAddManualProduct + "--miDescription",
                this.frgIdAddManualProduct + "--cbGrupoMaterial",
                this.frgIdAddManualProduct + "--mcBrand"
            ];

            aFilterIds.forEach(id => {
                const oCtrl = sap.ui.getCore().byId(id) || oView.byId(id);
                if (!oCtrl) return;

                // MultiInput
                if (oCtrl.removeAllTokens) {
                    oCtrl.removeAllTokens();
                }

                // ComboBox (simple)
                if (oCtrl.setSelectedKey) {
                    oCtrl.setSelectedKey("");
                }

                // 🔹 MultiComboBox: limpiar selección
                if (oCtrl.removeAllSelectedItems) {
                    oCtrl.removeAllSelectedItems();
                }
                if (oCtrl.setSelectedKeys) {
                    oCtrl.setSelectedKeys([]);
                }

                // Texto libre
                if (oCtrl.setValue) {
                    oCtrl.setValue("");
                }
            });

            // 🔹 Limpiar tabla
            const sTableId = this.frgIdAddManualProduct + "--tbMaterialesManual";
            const oTable = sap.ui.getCore().byId(sTableId) || oView.byId(sTableId);

            if (oTable) {
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.filter([]);
                    oBinding.refresh();
                } else {
                    oTable.removeAllItems();
                }
            }
            // ✅ Limpiar también los ValueHelp dialogs (Material y Descripción)
            this._clearSelectDialogSelection(this._oVHMaterial);
            this._clearSelectDialogSelection(this._oVHDescription);
            if (this._oVHMaterial && this._oVHMaterial.isOpen && this._oVHMaterial.isOpen()) {
                this._oVHMaterial.invalidate();
            }
            if (this._oVHDescription && this._oVHDescription.isOpen && this._oVHDescription.isOpen()) {
                this._oVHDescription.invalidate();
            }
            oModelP.refresh(true);
        },

        _getCantidadFromMap: function (oCantidades, oItem) {
            oCantidades = oCantidades || {};
            oItem = oItem || {};

            const sItmNumber = String(oItem.ItmNumber || oItem.Posnr || "").trim();
            const sMaterial = String(oItem.Material || oItem.Matnr || "").trim();

            let vCantidad = "";

            if (sItmNumber && oCantidades[sItmNumber] !== undefined) {
                vCantidad = oCantidades[sItmNumber];
            } else if (oItem.cantidad !== undefined && oItem.cantidad !== null && String(oItem.cantidad).trim() !== "") {
                vCantidad = oItem.cantidad;
            } else if (oItem.ReqQty !== undefined && oItem.ReqQty !== null && String(oItem.ReqQty).trim() !== "") {
                vCantidad = oItem.ReqQty;
            } else if (oItem.TargetQty !== undefined && oItem.TargetQty !== null && String(oItem.TargetQty).trim() !== "") {
                vCantidad = oItem.TargetQty;
            } else if (sMaterial && oCantidades[sMaterial] !== undefined) {
                // Fallback para datos antiguos que aún estén guardados por material.
                vCantidad = oCantidades[sMaterial];
            }

            const nCantidad = this._parseCantidadSAP
                ? this._parseCantidadSAP(vCantidad)
                : parseFloat(String(vCantidad || "0").replace(",", "."));

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

                const nCantPed = this._parseCantidadSAP(pos.CtdPedido);
                const nCantPend = this._parseCantidadSAP(pos.CtdPendiente);

                const nCantidadFinal = nCantPed > 0 ? nCantPed : nCantPend;
                const sCantidadFinal = nCantidadFinal.toFixed(3);

                oCantidades[sItmNumber] = sCantidadFinal;

                aMaterialSAP.push({
                    ClienteId: sCliente,
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    TargetQu: pos.UM || "KG",
                    Plant: sPlant,
                    RefDoc: pos.RefDoc,
                    RefDocIt: pos.RefDocIt,
                    RefDocCa: pos.RefDocCa
                });

                aMaterialUI.push({
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    Descriptions: pos.Descripcion || "",
                    cantidad: sCantidadFinal,
                    TargetQu: pos.UM || "KG",
                    UMV: pos.UM || "KG",
                    UMVWeight: "KG",
                    StockDispo: nCantPend.toFixed(3),
                    Kbetr: 0,
                    subtotal: 0,
                    descuentos: 0,
                    impuesto: 0,
                    total: 0,
                    descuentoManualPctDisplay: 0,
                    descuentoManualImporte: 0,
                    esBolsa: false
                });
            }.bind(this));

            oModel.setProperty("/oMaterial", aMaterialSAP);
            oModel.setProperty("/oMaterialUI", aMaterialUI);
            oModel.setProperty("/oCantidades", oCantidades);
            oModel.refresh(true);

            if (aMaterialSAP.length && this.onSimulateOrder) {
                this.onSimulateOrder();
            }
        },
        _onPressAddProduct: function () {
            const oView = this.getView();
            sap.ui.core.BusyIndicator.show(0);
            try {
                let oJSONModel = oView.getModel("oModelProyect");
                if (!oJSONModel) {
                    oJSONModel = new sap.ui.model.json.JSONModel(models.createModelProyect());
                    oView.setModel(oJSONModel, "oModelProyect");
                }
                oJSONModel.setProperty("/oMaterialSelect", []);
                oJSONModel.setProperty("/oSelectDetail", {
                    material: "",
                    Description: "",
                    grupoMaterial: "",
                    Brand: "",
                    aMaterials: [],
                    aDescriptions: [],
                    aBrands: []
                });
                oJSONModel.setProperty("/inputForm/grupoMaterialText", "");
                oJSONModel.refresh(true);
                this.setFragment(
                    "_dialogAddManualProduct",
                    this.frgIdAddManualProduct,
                    "AddManualProduct",
                    this
                );
                this._resetAddManualProductFilters();

            } catch (err) {
                this.getMessageBox("error", this.getI18nText("errorData"));
            }
            sap.ui.core.BusyIndicator.hide(0);
        },
        _onPressDeleteProducts: function () {
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect");
            if (!oModel) { return; }

            sap.m.MessageBox.confirm(
                "¿Desea eliminar todos los artículos de la tabla?",
                {
                    title: "Confirmación",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction !== sap.m.MessageBox.Action.YES) {
                            return;
                        }
                        oModel.setProperty("/oMaterialUI", []);
                        oModel.setProperty("/oMaterial", []);
                        oModel.setProperty("/oCantidades", {});

                        oModel.setProperty("/oSelecTableDetalle", {
                            ItmNumber: "",
                            Material: "",
                            Descriptions: "",
                            cantidad: "",
                            precioBase: "",
                            Kbetr: "",
                            DescuentoPermitido: "",
                            DescuentoPermitidoNum: 0,
                            DescuentoManual: "0",
                            usarPrecioManual: false,
                            tieneDescuentoManual: false
                        });

                        const oDatCalculo = oModel.getProperty("/oDatCalculo") || {};
                        oModel.setProperty("/oDatCalculo", {
                            subtotalGeneral: "0.00",
                            embalaje: "0.00",
                            totalImpuesto: "0.00",
                            totalGeneral: "0.00",
                            igvPorcentaje: (oDatCalculo.igvPorcentaje != null ? String(oDatCalculo.igvPorcentaje) : "18")
                        });
                        const oTable = oView.byId("tbProductos1") || sap.ui.getCore().byId("tbProductos1");
                        if (oTable && oTable.removeSelections) {
                            oTable.removeSelections(true);
                        }

                        oModel.refresh(true);

                        sap.m.MessageToast.show("Se eliminaron todos los artículos.");
                    }.bind(this)
                }
            );
        },
        onSuggestDescription: function (oEvent) {
            const sValue = (oEvent.getParameter("suggestValue") || "").toString().trim().toUpperCase();
            const oModelData = this.getView().getModel("oModelData");

            // ✅ Fuente: materiales completos (Material + Description)
            const aFull = oModelData.getProperty("/oFilterMaterial") || [];

            let aFiltered = aFull;

            if (sValue) {
                aFiltered = aFull.filter(r => {
                    const sMat = (r.Material || "").toString().toUpperCase();
                    const sDesc = (r.Description || "").toString().toUpperCase();
                    return sMat.includes(sValue) || sDesc.includes(sValue);
                });
            }

            // ✅ evitar duplicados por Description (texto visible)
            const seen = new Set();
            const aUnique = [];
            aFiltered.forEach(r => {
                const sDesc = (r.Description || "").toString().trim().toUpperCase();
                const sMat = (r.Material || "").toString().trim();
                if (!sDesc || !sMat) return;

                if (seen.has(sDesc)) return;
                seen.add(sDesc);

                aUnique.push({ Material: sMat, Description: r.Description || "" });
            });

            oModelData.setProperty("/ListDescriptionSug", aUnique.slice(0, 100));
        },
        onDescriptionSuggestionSelected: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            const oMulti = oEvent.getSource();
            if (!oItem) return;

            const sMat = (oItem.getKey() || "").toString().trim();      // ✅ Material
            const sDesc = (oItem.getText() || "").toString().trim();    // ✅ Description
            if (!sMat) return;

            const bYaExiste = (oMulti.getTokens() || []).some(t => (t.getKey() || "") === sMat);
            if (bYaExiste) return;

            // ✅ Token: key = Material, text = Description (visible)
            oMulti.addToken(new sap.m.Token({ key: sMat, text: sDesc }));

            // ✅ Guardar en modelo: aDescriptions ahora guardará CÓDIGOS
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            const a = oSelectDetail.aDescriptions || [];

            if (!a.includes(sMat)) a.push(sMat);
            oSelectDetail.aDescriptions = a;

            // opcional: un "último" seleccionado
            oSelectDetail.Description = sMat;

            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },

        // Cuando se agrega o elimina un token manualmente
        onDescriptionTokenUpdate: function (oEvent) {
            const oMulti = oEvent.getSource();
            const aTokens = oMulti.getTokens() || [];

            // ✅ aquí key = Material (código)
            const aMatFromDesc = aTokens
                .map(t => (t.getKey() || "").toString().trim())
                .filter(Boolean);

            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};

            oSelectDetail.aDescriptions = aMatFromDesc;
            oSelectDetail.Description = aMatFromDesc.length ? aMatFromDesc[aMatFromDesc.length - 1] : "";

            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        onSuggestMaterial: function (oEvent) {
            const sValue = oEvent.getParameter("suggestValue") || "";
            const oInput = oEvent.getSource();
            const oBinding = oInput.getBinding("suggestionItems");

            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const oFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
        },
        onMaterialSuggestionSelected: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            const sMat = oItem?.getKey();
            const oModelProj = this.getView().getModel("oModelProyect");
            const oSelect = oModelProj.getProperty("/oSelectDetail") || {};

            if (sMat) {
                oSelect.aMaterials = oSelect.aMaterials || [];
                if (!oSelect.aMaterials.includes(sMat)) {
                    oSelect.aMaterials.push(sMat);
                }
                oSelect.material = sMat;
                oModelProj.setProperty("/oSelectDetail", oSelect);
            }
        },

        onMaterialTokenUpdate: function (oEvent) {
            const oMulti = oEvent.getSource();
            const aTokens = oMulti.getTokens() || [];

            // ✅ siempre reconstruir desde UI
            const aMaterials = aTokens
                .map(t => (t.getKey() || t.getText() || "").toString().trim())
                .filter(Boolean);

            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};

            oSelectDetail.aMaterials = aMaterials;
            oSelectDetail.material = aMaterials.length ? aMaterials[aMaterials.length - 1] : "";

            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        onBrandSelectionChange: function (oEvent) {
            const oMultiCombo = oEvent.getSource();
            const aSelectedItems = oMultiCombo.getSelectedItems() || [];
            const aSelectedBrands = aSelectedItems.map(function (oItem) {
                return oItem.getKey(); // Brand
            });
            const oModelProj = this.getView().getModel("oModelProyect");
            const oSelect = oModelProj.getProperty("/oSelectDetail") || {};
            oSelect.aBrands = aSelectedBrands;
            oSelect.Brand = aSelectedBrands.length ? aSelectedBrands[aSelectedBrands.length - 1] : "";
            oModelProj.setProperty("/oSelectDetail", oSelect);
        },
        onBuscarPress: function () {
            this._resetSearchResultsOnly(false);
            this._syncFiltersFromUI();
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};

            const aFilters = [];

            // =========================
            // AND: Grupo
            // =========================
            const sGrupo = (oSelectDetail.grupoMaterial || "").toString().trim();
            if (sGrupo) {
                aFilters.push(new sap.ui.model.Filter(
                    "MaterialGroup",
                    sap.ui.model.FilterOperator.EQ,
                    sGrupo
                ));
            }

            // =========================
            // AND: Marca(s) (OR entre marcas)
            // =========================
            const aBrands = (oSelectDetail.aBrands || [])
                .map(x => (x || "").toString().trim())
                .filter(Boolean);

            if (aBrands.length) {
                const aBrandFilters = aBrands.map(b =>
                    new sap.ui.model.Filter("Brand", sap.ui.model.FilterOperator.EQ, b)
                );
                aFilters.push(new sap.ui.model.Filter(aBrandFilters, false)); // OR
            }

            // =========================
            // OR: Código y "Descripción"
            // (tu Description ya guarda Material codes)
            // =========================
            const uniq = (arr) => Array.from(new Set(
                (arr || []).map(x => (x || "").toString().trim()).filter(Boolean)
            ));

            const aMatFromCodigo = uniq(oSelectDetail.aMaterials || []);
            const aMatFromDesc = uniq(oSelectDetail.aDescriptions || []); // codes
            const aUnion = uniq([...aMatFromCodigo, ...aMatFromDesc]);

            if (aUnion.length) {
                const aMatFilters = aUnion.map(m =>
                    new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, m)
                );
                aFilters.push(new sap.ui.model.Filter(aMatFilters, false)); // OR
            }

            if (aFilters.length === 0) {
                this.getMessageBox("warning", "Debe seleccionar al menos un filtro antes de buscar.");
                return;
            }

            this._loadMateriales(aFilters);
        },
        _runInBatches: async function (aItems, iBatchSize, fnWorker) {
            const aSettledAll = [];
            const size = Math.max(1, parseInt(iBatchSize, 10) || 1);

            for (let i = 0; i < aItems.length; i += size) {
                const aSlice = aItems.slice(i, i + size);
                const aPromises = aSlice.map((item) => Promise.resolve().then(() => fnWorker(item)));
                const aSettled = await Promise.allSettled(aPromises);
                aSettledAll.push(...aSettled);
            }
            return aSettledAll;
        },
        _loadMateriales: function (aFilters, fMetrosMin) {
            const that = this;

            try {
                let sUrl;
                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject()
                        .resolveUri("/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/");
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route)
                        + "/S4HANA_Materials/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/";
                }

                const oModel = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                    useBatch: false,
                    defaultBindingMode: "TwoWay"
                });

                sap.ui.core.BusyIndicator.show(0);

                oModel.read("/MaterialsConsultation", {
                    filters: aFilters,

                    success: function (oData) {
                        const aResults = oData.results || [];

                        if (!aResults.length) {
                            that.getMessageBox("warning", "No se encontraron materiales con los filtros aplicados.");
                            sap.ui.core.BusyIndicator.hide(0);
                            return;
                        }

                        const oProjModel = that.getView().getModel("oModelProyect");
                        oProjModel.setProperty("/oMaterialBase", aResults);

                        (async () => {
                            try {
                                const aUnique = [];
                                const seen = new Set();

                                aResults.forEach(r => {
                                    const sMat = (r.Material || "").trim();
                                    if (sMat && !seen.has(sMat)) {
                                        seen.add(sMat);
                                        aUnique.push(r);
                                    }
                                });

                                const oDatClient = oProjModel.getProperty("/oDatClient") || {};
                                const sSalesOrg = oDatClient.SalesOrganization || "1120";
                                const sPlant = oDatClient.Plant || "1000";
                                const iBatchSize = 8;

                                const aSettledAll = await that._runInBatches(aUnique, iBatchSize, (m) => {
                                    const sMat = (m.Material || "").trim();

                                    const aFiltersStock = [
                                        new sap.ui.model.Filter("Salesorganization", sap.ui.model.FilterOperator.EQ, sSalesOrg),
                                        new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sPlant),
                                        new sap.ui.model.Filter("Pedven", sap.ui.model.FilterOperator.EQ, true),
                                        new sap.ui.model.Filter("Materialnumber", sap.ui.model.FilterOperator.EQ, sMat)
                                    ];

                                    return that._loadProductoSingle(aFiltersStock).catch(() => []);
                                });

                                const aTotalStock = [];
                                aSettledAll.forEach((r) => {
                                    if (r.status === "fulfilled") {
                                        aTotalStock.push(...(r.value || []));
                                    }
                                });

                                if (!aTotalStock.length) {
                                    that.getMessageBox("warning", "No se pudo obtener stock para los materiales consultados.");
                                    sap.ui.core.BusyIndicator.hide(0);
                                    return;
                                }

                                const _normMat = (v) => String(v || "").trim().replace(/^0+/, "") || "0";
                                const mConsultByMat = {};

                                aResults.forEach(r => {
                                    const sKey = _normMat(r.Material || r.Matnr);
                                    if (sKey) {
                                        mConsultByMat[sKey] = r;
                                    }
                                });

                                const seenMatnr = new Set();
                                const aFinal = [];

                                aTotalStock.forEach(r => {
                                    const sMatnr = (r.Matnr || "").toString().trim();
                                    if (!sMatnr || seenMatnr.has(sMatnr)) return;
                                    seenMatnr.add(sMatnr);

                                    const oMatConsult = mConsultByMat[_normMat(sMatnr)] || {};

                                    aFinal.push({
                                        Matnr: sMatnr,
                                        Maktx: r.Maktx || oMatConsult.Description || oMatConsult.Descriptions || "",
                                        Meins: r.Meins || "",
                                        Charg: r.Charg || "",
                                        Clabs: (r.Clabs != null ? String(r.Clabs).trim() : "0"),
                                        Stockf: (r.Stockf != null ? String(r.Stockf).trim() : ""),
                                        cantidad: r.cantidad || ""
                                    });
                                });

                                aFinal.sort((a, b) => {
                                    const A = (a.Matnr || "").toString().trim();
                                    const B = (b.Matnr || "").toString().trim();
                                    return (parseInt(A, 10) || 0) - (parseInt(B, 10) || 0);
                                });

                                // ✅ Aquí NO se discrimina IGV
                                // ✅ Solo se cargan todos los materiales con stock
                                that._mergeMaterialSelect(aFinal);

                                oProjModel.refresh(true);
                                sap.ui.core.BusyIndicator.hide(0);
                            } catch (err) {
                                sap.ui.core.BusyIndicator.hide(0);
                                that.getMessageBox("error", "Error consultando stock en paralelo.");
                            }
                        })();
                    },
                    error: function (oError) {
                        that.getMessageBox("error", "Error al cargar materiales desde el servicio.");
                        sap.ui.core.BusyIndicator.hide(0);
                    }
                });

            } catch (e) {
                sap.ui.core.BusyIndicator.hide(0);
                that.getMessageBox("error", "Error interno al cargar materiales.");
            }
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
                            const aMain = oData?.results || oData?.d?.results || [];
                            if (!aMain.length) {
                                resolve([]);
                                return;
                            }

                            const oMain0 = aMain[0] || {};

                            // ✅ Si el expand ya trae stock total (tu caso), usa SOLO la primera fila
                            const aQ = oMain0.toStockQuimico?.results || [];
                            const oQ0 = aQ[0] || null;

                            if (oQ0) {
                                resolve([{
                                    Matnr: (oQ0.Matnr || "").toString().trim(),
                                    Maktx: oQ0.Maktx || "",
                                    Meins: oQ0.Meins || "",
                                    Charg: oQ0.Charg || "",

                                    // ✅ NO SUMAR: solo el Clabs de la primera fila
                                    Clabs: (oQ0.Clabs != null ? String(oQ0.Clabs).trim() : "0"),
                                    Stockf: (oQ0.Stockf != null ? String(oQ0.Stockf).trim() : ""),

                                    cantidad: ""
                                }]);
                                return;
                            }

                            // Fallback (si por alguna razón no viene expand)
                            // Nota: el root en tu payload tiene Materialnumber, no Matnr; ajusto
                            resolve([{
                                Matnr: (oMain0.Materialnumber || oMain0.Matnr || "").toString().trim(),
                                Maktx: oMain0.Maktx || "",
                                Meins: oMain0.Meins || "",
                                Charg: oMain0.Charg || "",
                                Clabs: (oMain0.Clabs != null ? String(oMain0.Clabs).trim() : "0"),
                                Stockf: (oMain0.Stockf != null ? String(oMain0.Stockf).trim() : ""),
                                cantidad: ""
                            }]);
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

        onLimpiarPress: function () {
            this._resetAddManualProductFilters();
        },
        _onDeleteProduct: function (oEvent) {
            const oItem = oEvent.getSource().getParent();
            const oContext = oItem.getBindingContext("oModelProyect");
            const oModel = oContext.getModel();
            const sPath = oContext.getPath();
            const iIndex = parseInt(sPath.split("/").pop(), 10);
            let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            let aMaterial = oModel.getProperty("/oMaterial") || [];
            if (isNaN(iIndex) || iIndex < 0 || iIndex >= aMaterialUI.length) {
                return;
            }
            const oDeletedItem = aMaterialUI[iIndex];
            const sDeletedItm = oDeletedItem.ItmNumber;
            const sDeletedMaterial = oDeletedItem.Material || oDeletedItem.Matnr || "";
            const sDetalleItm = oModel.getProperty("/oSelecTableDetalle/ItmNumber") || "";
            aMaterialUI.splice(iIndex, 1);
            if (!oDeletedItem.isExtraFromSAP) {
                aMaterialUI = aMaterialUI.filter(item => {
                    if (!item.isExtraFromSAP) {
                        return true;
                    }
                    const sameParent =
                        item.ParentItmNumber && sDeletedItm && item.ParentItmNumber === sDeletedItm;
                    const sameMaterial =
                        !!sDeletedMaterial &&
                        (item.Material === sDeletedMaterial || item.Matnr === sDeletedMaterial);
                    return !(sameParent || sameMaterial);
                });
            }
            if (sDeletedItm) {
                aMaterial = aMaterial.filter(item => item.ItmNumber !== sDeletedItm);
            } else if (sDeletedMaterial) {
                aMaterial = aMaterial.filter(item =>
                    item.Material !== sDeletedMaterial && item.Matnr !== sDeletedMaterial
                );
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
                embalaje: oDatCalculo.embalaje || "0.00",
                totalImpuesto: totalImpuesto.toFixed(2),
                totalGeneral: totalGeneral.toFixed(2),
                igvPorcentaje: igvPorcentaje.toFixed(2)
            });
            const bYaNoExisteEnUI = !aMaterialUI.some(it => it.ItmNumber === sDetalleItm);
            if (!aMaterialUI.length || bYaNoExisteEnUI) {
                oModel.setProperty("/oSelecTableDetalle", {
                    ItmNumber: "",
                    Material: "",
                    Descriptions: "",
                    cantidad: "",
                    precioBase: "",
                    Kbetr: "",
                    DescuentoPermitido: "",
                    DescuentoPermitidoNum: 0,
                    DescuentoManual: "0",
                    usarPrecioManual: false,
                    tieneDescuentoManual: false
                });
                const oView = this.getView();
                const oTable = oView.byId("tbProductos1");
                if (oTable) {
                    oTable.removeSelections(true);
                }
            }
            oModel.refresh(true);
            this._recalcTotalPeso();
        },
        _onAcceptProductManual: async function (oEvent) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oData = oModelProyect.getData();

            const aRowsAll = oModelProyect.getProperty("/oMaterialSelect") || [];
            if (!aRowsAll.length) {
                sap.m.MessageBox.warning("No hay resultados para agregar.");
                return;
            }

            const _toNumber = (v) => {
                if (v === null || v === undefined) return NaN;
                if (typeof v === "number") return v;
                const s = String(v).trim().replace(",", ".");
                const n = Number(s);
                return Number.isFinite(n) ? n : NaN;
            };

            const _toQty3 = (v) => {
                const n = _toNumber(v);
                return (!Number.isFinite(n) || n <= 0) ? "" : n.toFixed(3);
            };

            const aRowsSelected = aRowsAll.filter(o => {
                const n = _toNumber(o?.cantidad);
                return Number.isFinite(n) && n > 0;
            });

            if (!aRowsSelected.length) {
                sap.m.MessageBox.warning("Ingresa cantidad al menos a un material.");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            try {
                const norm = (v) => String(v || "").trim().replace(/^0+/, "") || "0";

                // 1) usar primero TaxClasification que ya viene en la grilla
                let aRowsSelectedWithTax = aRowsSelected.map(r => ({
                    ...r,
                    TaxClasification: this._getMaterialTaxClassification(r)
                }));

                // 2) solo si faltara clasificación en alguno, intentar reconsulta
                const bHayFaltantes = aRowsSelectedWithTax.some(r => !this._getMaterialTaxClassification(r));

                if (bHayFaltantes && typeof this._getTaxClassificationForSelectedMaterials === "function") {
                    try {
                        const aConsult = await this._getTaxClassificationForSelectedMaterials(aRowsSelected);
                        const mTaxByMat = {};

                        aConsult.forEach(r => {
                            const sKey = norm(r.Material || r.Matnr);
                            if (sKey) {
                                mTaxByMat[sKey] = this._getMaterialTaxClassification(r);
                            }
                        });

                        aRowsSelectedWithTax = aRowsSelected.map(r => {
                            const sKey = norm(r.Matnr || r.Material);
                            return {
                                ...r,
                                TaxClasification: this._getMaterialTaxClassification(r) || mTaxByMat[sKey] || ""
                            };
                        });
                    } catch (eTax) {
                        void 0;
                    }
                }

                void 0;

                const aBaseUI = oModelProyect.getProperty("/oMaterialUI") || [];
                const aMaterialBase = oModelProyect.getProperty("/oMaterialBase") || [];
                const aStockActual = oModelProyect.getProperty("/oMaterialSelect") || [];

                const aBaseExistente = (oModelProyect.getProperty("/oMaterialUI") || []).map(oRow => ({
                    ...oRow,
                    TaxClasification: this._getMaterialTaxClassification(oRow)
                }));

                void 0;

                const oTaxRuleAdd = this._applyTaxClassificationRuleToRows(aRowsSelectedWithTax, aBaseExistente);
                void 0;
                void 0;
                void 0;
                void 0;
                void 0;
                const aRows = oTaxRuleAdd.rows || [];

                // Guardar materiales excluidos para mostrarlos después de la simulación
                oModelProyect.setProperty(
                    "/ui/pendingExcludedNoIgv",
                    Array.isArray(oTaxRuleAdd.excludedNoIgv) ? oTaxRuleAdd.excludedNoIgv : []
                );

                if (!aRows.length) {
                    sap.ui.core.BusyIndicator.hide(0);

                    const aPend = oModelProyect.getProperty("/ui/pendingExcludedNoIgv") || [];

                    if (aPend.length) {
                        this._showPendingExcludedNoIgvMessage();
                    } else {
                        sap.m.MessageBox.warning("No hay materiales válidos para agregar.");
                    }

                    return;
                }

                oModelProyect.setProperty("/_tmpPrevMaterial", JSON.parse(JSON.stringify(oModelProyect.getProperty("/oMaterial") || [])));
                oModelProyect.setProperty("/_tmpPrevMaterialUI", JSON.parse(JSON.stringify(oModelProyect.getProperty("/oMaterialUI") || [])));
                oModelProyect.setProperty("/_tmpPrevCantidades", JSON.parse(JSON.stringify(oModelProyect.getProperty("/oCantidades") || {})));

                const aMaterialPrev = (oModelProyect.getProperty("/oMaterial") || []).slice();
                const aMaterialUIPrev = (oModelProyect.getProperty("/oMaterialUI") || []).slice();
                const oCantidades = Object.assign({}, oModelProyect.getProperty("/oCantidades") || {});

                let iMaxItm = 0;
                aMaterialPrev.forEach(m => {
                    const n = parseInt(m.ItmNumber, 10);
                    if (!isNaN(n) && n > iMaxItm) iMaxItm = n;
                });

                const mExist = new Set(
                    aMaterialPrev.map(x => `${String(x.Material || x.Matnr).trim()}|${String(x.Plant || "1000").trim()}`)
                );
                const bPedidoConReferencia = !!oModelProyect.getProperty("/inputForm/esConReferencia");

                const aAddedItmNumbers = [];

                aRows.forEach(oObj => {
                    const sMat = String(oObj.Matnr || oObj.Material || "").trim();
                    if (!sMat) return;

                    const sUM = oObj.Meins || "KG";
                    const sPlant = "1000";
                    const sDup = `${sMat}|${sPlant}`;

                    if (!bPedidoConReferencia && mExist.has(sDup)) return;

                    const sQty = _toQty3(oObj.cantidad);
                    if (!sQty) return;

                    iMaxItm += 10;
                    const sItmNumber = iMaxItm.toString().padStart(6, "0");

                    aMaterialPrev.push({
                        ClienteId: oData.oDatClient?.Customer || "",
                        ItmNumber: sItmNumber,
                        Material: sMat,
                        TargetQu: sUM,
                        Plant: sPlant
                    });

                    aMaterialUIPrev.push({
                        ItmNumber: sItmNumber,
                        Material: sMat,
                        Descriptions: oObj.Maktx || oObj.Description || "",
                        cantidad: sQty,
                        TargetQu: sUM,
                        TaxClasification: this._getMaterialTaxClassification(oObj),
                        subtotal: 0,
                        descuentos: 0,
                        impuesto: 0,
                        total: 0,
                        descuentoManualPctDisplay: 0,
                        descuentoManualImporte: 0
                    });

                    oCantidades[sItmNumber] = sQty;
                    mExist.add(sDup);
                    aAddedItmNumbers.push(sItmNumber);
                });

                void 0;

                oModelProyect.setProperty("/_tmpAddedItmNumbers", aAddedItmNumbers);
                oModelProyect.setProperty("/oMaterial", aMaterialPrev);
                oModelProyect.setProperty("/oMaterialUI", aMaterialUIPrev);
                oModelProyect.setProperty("/oCantidades", oCantidades);

                oEvent.getSource().getParent().close();

                sap.ui.core.BusyIndicator.hide(0);
                void 0;
                setTimeout(() => this.onSimulateOrder(), 0);

            } catch (e) {
                sap.ui.core.BusyIndicator.hide(0);
                void 0;
                sap.m.MessageBox.error("No se pudo validar la clasificación de impuesto de los materiales seleccionados.");
            }
        },
        _buildVendorPartnersQuimicos: function (oData) {
            const oModelUser = this.getView().getModel("oModelUser");

            const sCliente = (oData.oDatClient?.Customer || "").trim();

            // BP del usuario (IAS)
            const sUserBP =
                (oModelUser?.getProperty("/bBPFinal") ||
                    oModelUser?.getProperty("/bBP") ||
                    "").trim();

            const bIsVendedor = !!oModelUser?.getProperty("/bIsVendedor");
            const bIsCoord = !!oModelUser?.getProperty("/bIsCoord");
            const bIsCliente =
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bIsCliente") === true;

            // 0) CLIENTE => no enviar ZV/ZY
            if (bIsCliente) {
                return [];
            }

            // 1) VENDEDOR => SOLO ZV
            if (bIsVendedor) {
                return sUserBP ? [{
                    ClientId: sCliente,
                    ItmNumber: "000000",
                    PartnRole: "ZV",
                    PartnNumber: sUserBP
                }] : [];
            }

            // 2) COORDINADOR (solo si NO es vendedor) => SOLO ZY
            if (bIsCoord) {
                return sUserBP ? [{
                    ClientId: sCliente,
                    ItmNumber: "000000",
                    PartnRole: "ZY",
                    PartnNumber: sUserBP
                }] : [];
            }

            // 3) Ninguno => nada
            return [];
        },
        onSimulateOrder: function () {
            return new Promise(async (resolve, reject) => {
                const oModelProyect = this.getView().getModel("oModelProyect");

                // Evitar simulaciones duplicadas
                if (oModelProyect.getProperty("/ui/materialesBusy") === true) {
                    resolve();
                    return;
                }

                oModelProyect.setProperty("/ui/materialesBusy", true);

                try {
                    const oMU = this.getView().getModel("oModelUser");
                    const oCantidades = oModelProyect.getProperty("/oCantidades") || {};
                    const oData = oModelProyect.getData();
                    const sFechaActual = oModelProyect.getProperty("/fechaActual");
                    const oPurchDate = Formatter._formatDateForSAP(sFechaActual);

                    const normalizeMat = (s) => {
                        if (!s) return "";
                        return String(s).replace(/^0+/, "");
                    };

                    const mDescByMat = {};
                    (oData.oMaterial || []).forEach(m => {
                        const sMatRaw = m.Material || m.Matnr;
                        const sMatNorm = normalizeMat(sMatRaw);
                        const sDesc = m.Descriptions || m.Maktx || m.Description;
                        if (sMatNorm && sDesc) {
                            mDescByMat[sMatNorm] = sDesc;
                        }
                    });

                    const aStock = oModelProyect.getProperty("/oMaterialSelect") || [];
                    aStock.forEach(row => {
                        const sMatRaw = row.Matnr || row.Material;
                        const sMatNorm = normalizeMat(sMatRaw);
                        const sDesc = row.Maktx || row.Description;
                        if (sMatNorm && sDesc && !mDescByMat[sMatNorm]) {
                            mDescByMat[sMatNorm] = sDesc;
                        }
                    });

                    const sSalesOrg = oData.oDatClient?.SalesOrganization || "";
                    const sTipoEntrega = oData.inputForm?.tipoEntrega;
                    const sSedeFinalDif = oData.inputForm?.sedeFinalDiferente;
                    const bSedeFinalDif = (sSedeFinalDif === true || sSedeFinalDif === "SI" || sSedeFinalDif === "Si");
                    const sTransportista = oData.inputForm?.transporte;
                    const sCliente = oData.oDatClient?.Customer || "";
                    const sDestinoQuimicos = oData.inputForm?.destinoQuimicos || "";
                    const sDirAgencia = oData.inputForm?.direccionAgencia || "";
                    const sDestinoFinal = oData.inputForm?.destinoFinal || "";
                    const sTipDocUI = oData.inputForm?.tipDocument || "";
                    const sDocType = (["ZACN", "ZPSE"].includes(sTipDocUI)) ? "ZPES" : sTipDocUI;

                    const oModelUser = this.getView().getModel("oModelUser");
                    const isClienteIAS =
                        oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                        oModelUser?.getProperty("/bIsCliente") === true;

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
                        const aConPrecioManual = (oData.oMaterial || []).filter(it => it.usarPrecioManual === true);
                        const aConDescManual = (oData.oMaterial || []).filter(it =>
                            it.descuentoManualPct != null &&
                            !isNaN(it.descuentoManualPct) &&
                            it.descuentoManualPct > 0
                        );

                        if (aConPrecioManual.length > 0 || aConDescManual.length > 0) {
                            sap.m.MessageBox.error(
                                "No es posible utilizar precio manual ni descuento manual cuando el pedido se crea con referencia.\n" +
                                "Por favor elimine los precios/descuentos manuales antes de simular."
                            );
                            oModelProyect.setProperty("/ui/materialesBusy", false);
                            resolve();
                            return;
                        }
                    }

                    const aMat = oModelProyect.getProperty("/oMaterial") || oData.oMaterial || [];
                    if (!aMat.length) {
                        sap.m.MessageBox.warning("Debe agregar al menos un material antes de recalcular.");
                        oModelProyect.setProperty("/ui/materialesBusy", false);
                        resolve();
                        return;
                    }

                    let aPartners = [];

                    if (sSalesOrg === "1120") {
                        aPartners.push({ ClientId: sCliente, PartnRole: "AG", PartnNumber: sCliente });
                        aPartners.push({
                            ClientId: sCliente,
                            PartnRole: "WE",
                            PartnNumber:
                                sTipoEntrega === "1" ? sCliente :
                                    (sTipoEntrega === "3" ? sDirAgencia : sDestinoQuimicos)
                        });
                        aPartners.push({
                            ClientId: sCliente,
                            PartnNumber: (sTipoEntrega === "1")
                                ? sDestinoQuimicos
                                : (bSedeFinalDif ? sDestinoFinal : sDestinoQuimicos),
                            PartnRole: "Z0",
                            ItmNumber: "000000"
                        });

                        if (bSedeFinalDif) {
                            aPartners.push({
                                ClientId: sCliente,
                                PartnRole: "ZE",
                                PartnNumber: sDestinoQuimicos || "",
                                ItmNumber: "000000"
                            });
                        }

                        if (sTipoEntrega === "2" && sDirAgencia) {
                            aPartners.push({
                                ClientId: sCliente,
                                PartnRole: "ZA",
                                PartnNumber: sDirAgencia,
                                ItmNumber: "000000"
                            });
                        }

                        if (sTransportista) {
                            aPartners.push({
                                ClientId: sCliente,
                                PartnRole: "Z2",
                                PartnNumber: sTransportista,
                                ItmNumber: "000000"
                            });
                        }
                    } else {
                        aPartners = [
                            { ClientId: sCliente, PartnRole: "AG", PartnNumber: sCliente }
                        ];
                    }

                    const aMatForSap =
                        oModelProyect.getProperty("/oMaterial") ||
                        oData.oMaterial ||
                        [];

                    const _parseCantidad = function (v) {
                        if (v === null || v === undefined || v === "") {
                            return 0;
                        }

                        let s = String(v).trim().replace(/\s/g, "");

                        // Caso 1,500.00 => formato US
                        if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
                            const iComma = s.lastIndexOf(",");
                            const iDot = s.lastIndexOf(".");

                            if (iComma < iDot) {
                                // 1,500.00
                                s = s.replace(/,/g, "");
                            } else {
                                // 1.500,00
                                s = s.replace(/\./g, "").replace(",", ".");
                            }
                        } else if (s.indexOf(",") > -1) {
                            // 1500,00
                            s = s.replace(",", ".");
                        }

                        const n = parseFloat(s);
                        return isNaN(n) ? 0 : n;
                    };

                    const aSchedule = aMatForSap.map(function (item) {
                        const nQty = this._getCantidadFromMap(oCantidades, item);

                        return {
                            ClientId: item.ClienteId || oData.oDatClient?.Customer || "",
                            ItmNumber: item.ItmNumber || "",
                            SchedLine: "0001",
                            ReqQty: nQty.toFixed(3)
                        };
                    }.bind(this));
                    if (!aSchedule.some(s => parseFloat(s.ReqQty) > 0)) {
                        sap.m.MessageBox.warning("Ingrese una cantidad mayor a 0 antes de recalcular.");
                        oModelProyect.setProperty("/ui/materialesBusy", false);
                        resolve();
                        return;
                    }

                    const sMonedaKey = oData.inputForm?.moneda || "USD";
                    const bMonedaPEN = (sMonedaKey === "PEN");
                    const fleteIncluidoUI = !!oData.inputForm?.fleteIncluido;

                    let sFleteUSD3 = oData.inputForm?.fleteUSD_SAP || "";
                    if (!sFleteUSD3) {
                        let fleteUSDNum = parseFloat(oData.inputForm?.fleteUSD || "0");
                        if (!isFinite(fleteUSDNum) || fleteUSDNum < 0) {
                            fleteUSDNum = 0;
                        }
                        const fleteUSD3Num = Math.round(fleteUSDNum * 1000) / 1000;
                        sFleteUSD3 = fleteUSD3Num.toFixed(3);
                        oModelProyect.setProperty("/inputForm/fleteUSDNum", fleteUSD3Num);
                        oModelProyect.setProperty("/inputForm/fleteUSD_SAP", sFleteUSD3);
                    }

                    const fletePEN = parseFloat(oData.inputForm?.fletePEN || "0");
                    const fleteIngresado = bMonedaPEN
                        ? (fletePEN > 0)
                        : (parseFloat(sFleteUSD3) > 0);

                    const sFleteCondCurr = bMonedaPEN ? "PEN" : "USD";
                    let sFleteCondValor = "";

                    if (bMonedaPEN) {
                        const fletePEN3 = Math.round((isFinite(fletePEN) ? fletePEN : 0) * 1000) / 1000;
                        sFleteCondValor = fletePEN3.toFixed(3);
                    } else {
                        sFleteCondValor = sFleteUSD3;
                    }

                    let aCondSim = [];
                    if (fleteIngresado) {
                        aCondSim.push({
                            ItmNumber: "000000",
                            CondType: fleteIncluidoUI ? "ZRF0" : "ZRFM",
                            CondValue: sFleteCondValor,
                            Currency: sFleteCondCurr
                        });
                    }


                    (aMatForSap || []).forEach(item => {
                        if (
                            item.descuentoManualPct != null &&
                            !isNaN(item.descuentoManualPct) &&
                            parseFloat(item.descuentoManualPct) > 0
                        ) {
                            aCondSim.push({
                                ItmNumber: item.ItmNumber,
                                CondType: "ZDMP",
                                CondValue: parseFloat(item.descuentoManualPct).toString()
                            });
                        }
                    });
                    void 0;
                    void 0;

                    const aHeaderToItem = aMatForSap.map(item => {
                        const oItm = {
                            ItmNumber: item.ItmNumber,
                            Material: item.Material || item.Matnr,
                            TargetQu: item.TargetQu || "UND"
                        };

                        const vManual = (item.prlist !== undefined && item.prlist !== null && item.prlist !== "")
                            ? item.prlist
                            : item.precioBase;
                        const nManual = parseFloat(vManual);

                        if (item.usarPrecioManual === true && !isNaN(nManual) && nManual > 0) {
                            oItm.CondType = "ZPMA";
                            oItm.CondValue = nManual.toString();
                            oItm.CondPUnt = "00010";
                            oItm.CondDUnt = item.TargetQu || item.UMV || "UND";
                        }

                        if (bPedidoConReferencia) {
                            let sRefDocCa = item.RefDocCa;

                            if (!sRefDocCa && sTipoRef) {
                                if (sTipoRef === "ZCNA") {
                                    sRefDocCa = "B";
                                } else if (sTipoRef === "ZACN" || sTipDocUI === "ZPSE") {
                                    sRefDocCa = "G";
                                }
                            }

                            const bTieneReferencia =
                                !!item.RefDoc &&
                                !!item.RefDocIt &&
                                !!sRefDocCa;

                            if (bTieneReferencia) {
                                oItm.RefDoc = item.RefDoc;
                                oItm.RefDocIt = item.RefDocIt;
                                oItm.RefDocCa = sRefDocCa;
                            }
                        }

                        return oItm;
                    });
                    const sPoSupplem = isClienteIAS ? "CLTE" : "VEND";
                    const extraPoSupplem = sPoSupplem ? { PoSupplem: sPoSupplem } : {};

                    void 0;
                    void 0;

                    const oPayload = this._cleanPayload({
                        ClientId: sCliente,
                        TOperation: oData.TOperation || "CS",
                        DocType: sDocType,
                        SalesOrg: sSalesOrg,
                        DistrChan: (oData.inputForm?.tipDocument === "ZPEF") ? "C2" : "C1",
                        Division: oData.oDatClient?.Division || "",
                        ReqDateH: oPurchDate,
                        PurchDate: Formatter._formatDateForSAP(oData.inputForm?.ocExpDate),
                        PriceDate: Formatter._formatDateForSAP(sPriceDate),
                        PurchNoC: oData.inputForm?.purchaseOrder || "",
                        ShipCond: (oData.inputForm?.resumenEntrega === "Cliente recoge") ? "02" : "01",
                        Pmnttrms: oData.inputForm?.cbCondPago || "",
                        PoMethod: "Z001",
                        ...extraPoSupplem,
                        Currency: sMonedaKey,
                        HeaderToItem: aHeaderToItem,
                        HeaderToPartners: aPartners,
                        HeaderToSchedule: aSchedule,
                        toConditions: aCondSim,
                        toConditionEx: [{ ClientId: "", ItmNumber: "", CondType: "", CondValue: "0.00", Condvalue: "0.00" }],
                        toItemsOut: [{ ClientId: "", ItmNumber: "", Material: "", ItemCateg: "", ShortText: "", ReqQty: "0.00", TargetQty: "0.00" }],
                        HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
                    });
                    const oModelEntity = this.getView().getModel("oModelEntity");
                    const _n = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

                    const getSum = (conds, type, itmNumber) =>
                        conds
                            .filter(c => c.CondType === type && (!itmNumber || c.ItmNumber === itmNumber))
                            .reduce((acc, c) => acc + _n(c.Condvalue), 0);

                    const findCond = (conds, type, itmNumber) =>
                        conds.find(c => c.CondType === type && (!itmNumber || c.ItmNumber === itmNumber));

                    void 0;
                    void 0;
                    void 0;
                    void 0;
                    void 0;
                    void 0;
                    void 0;
                    void 0;
                    void 0;

                    const oPriceCondResp = await this._getPriceConditionsBySalesOrg(sSalesOrg);
                    const mPriceConditionTypes = this._buildDiscountConditionTypeMap(oPriceCondResp.oResults);

                    if (oPriceCondResp.sEstado !== "S") {
                        sap.m.MessageBox.error("No se pudo obtener la tabla PriceConditions para la organización " + sSalesOrg + ".");
                        oModelProyect.setProperty("/ui/materialesBusy", false);
                        resolve();
                        return;
                    }

                    if (!Object.keys(mPriceConditionTypes).length) {
                        void 0;

                        sap.m.MessageBox.error(
                            "El servicio PriceConditions respondió, pero no se identificaron condiciones de descuento para la organización " +
                            sSalesOrg +
                            ". Revisar los campos PriceCondition y Classification."
                        );

                        oModelProyect.setProperty("/ui/materialesBusy", false);
                        resolve();
                        return;
                    }

                    void 0;
                    void 0;

                    oModelEntity.create("/iHeaderSet", oPayload, {
                        success: async (oResponse) => {

                            try {
                                const aReturn = oResponse.HeaderToReturn?.results || [];
                                const aTaxErrors = aReturn.filter(r => {
                                    const sMsg = (r.Message || "").toUpperCase();
                                    return sMsg.includes("IMPUESTO");
                                });

                                if (aTaxErrors.length > 0) {
                                    const aMatPrev = oModelProyect.getProperty("/_tmpPrevMaterial") || [];
                                    const aMatUIPrev = oModelProyect.getProperty("/_tmpPrevMaterialUI") || [];
                                    const oCantPrev = oModelProyect.getProperty("/_tmpPrevCantidades") || {};

                                    oModelProyect.setProperty("/oMaterial", aMatPrev);
                                    oModelProyect.setProperty("/oMaterialUI", aMatUIPrev);
                                    oModelProyect.setProperty("/oCantidades", oCantPrev);
                                    oModelProyect.refresh(true);
                                    oModelProyect.setProperty("/ui/materialesBusy", false);

                                    this._showPendingExcludedNoIgvMessage();

                                    resolve(oResponse);
                                    return;
                                }

                                const aReturnFiltered = aReturn.filter(r => {
                                    const msg = (r.Message || "").toUpperCase();

                                    // ❌ Ignorar errores de impuesto SAP
                                    if (msg.includes("IMPUESTO") || msg.includes("MWST")) {
                                        return false;
                                    }

                                    return true;
                                });

                                const aCondFromToConditions = oResponse.toConditions?.results || [];
                                const aCondFromToConditionEx = oResponse.toConditionEx?.results || [];

                                const mSeen = new Set();
                                const aConditionsRaw = [...aCondFromToConditions, ...aCondFromToConditionEx].filter(c => {
                                    const k = `${c.ItmNumber}|${c.CondType}|${c.Currency}|${c.CondValue}|${c.Condvalue}`;
                                    if (mSeen.has(k)) return false;
                                    mSeen.add(k);
                                    return true;
                                });

                                const aConditions = aConditionsRaw.filter(c =>
                                    !(c.ItmNumber === "000000" && (!c.CondType || c.CondType === ""))
                                );

                                void 0;
                                void 0;
                                void 0;

                                const aErrors = aReturnFiltered.filter(r => r.Type === "E");

                                if (aErrors.length > 0) {
                                    aErrors.forEach(r => {
                                        const sMsg = r.Message || "";
                                        const oMatch = sMsg.match(/Stock de material\s+(\d+)/i);
                                        if (oMatch && oMatch[1]) {
                                            const sMatErr = oMatch[1];
                                            let aMat = oModelProyect.getProperty("/oMaterial") || [];
                                            let aMatUI = oModelProyect.getProperty("/oMaterialUI") || [];
                                            let oCants = oModelProyect.getProperty("/oCantidades") || {};

                                            aMat = aMat.filter(m => (m.Material || m.Matnr) !== sMatErr);
                                            aMatUI = aMatUI.filter(m => (m.Material || m.Matnr) !== sMatErr);

                                            if (oCants[sMatErr] !== undefined) {
                                                delete oCants[sMatErr];
                                            }

                                            oModelProyect.setProperty("/oMaterial", aMat);
                                            oModelProyect.setProperty("/oMaterialUI", aMatUI);
                                            oModelProyect.setProperty("/oCantidades", oCants);
                                        }
                                    });

                                    const sMsgUI = aErrors.map(e => e.Message).join("\n") ||
                                        "No hay stock para uno de los materiales seleccionados.";

                                    sap.m.MessageBox.error(sMsgUI);
                                    oModelProyect.setProperty("/ui/materialesBusy", false);
                                    resolve(oResponse);
                                    return;
                                }

                                let aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];

                                if (fleteIngresado) {
                                    const sTipoFlete = fleteIncluidoUI ? "ZRF0" : "ZRFM";

                                    const yaVino = aConditions.some(c =>
                                        c.ItmNumber === "000000" && c.CondType === sTipoFlete
                                    );

                                    if (!yaVino) {
                                        aConditions.push({
                                            ClientId: sCliente,
                                            ItmNumber: "000000",
                                            CondType: sTipoFlete,
                                            Condvalue: sFleteCondValor,
                                            CondValue: sFleteCondValor,
                                            Currency: sFleteCondCurr
                                        });
                                    }
                                }

                                oModelProyect.setProperty("/oConditionsSAP", aConditions);

                                if (!aConditions.length) {
                                    sap.m.MessageBox.error("❌ No se recibió información de simulación desde SAP.");
                                    oModelProyect.setProperty("/oMaterialUI", []);
                                    oModelProyect.setProperty("/oDatCalculo", {
                                        subtotalGeneral: "0.00",
                                        embalaje: "0.00",
                                        totalImpuesto: "0.00",
                                        totalGeneral: "0.00"
                                    });
                                    oModelProyect.setProperty("/ui/materialesBusy", false);

                                    this._showPendingExcludedNoIgvMessage();

                                    resolve(oResponse);
                                    return;
                                }

                                const aItemsBase = (oModelProyect.getProperty("/oMaterialUI") || []).filter(it => !it.isExtraFromSAP);

                                const aBaseItems = (oData.oMaterial || []).filter(it => !it.isExtraFromSAP);
                                if (isClienteIAS) {
                                    const aSinZPRE = aBaseItems.filter(it =>
                                        !aConditions.some(c => c.ItmNumber === it.ItmNumber && c.CondType === "ZPRE")
                                    );

                                    if (aSinZPRE.length > 0) {
                                        const sMatList = aSinZPRE
                                            .map(it => it.Material || it.Matnr || it.ItmNumber)
                                            .join(", ");

                                        sap.m.MessageBox.error(
                                            "Material no válido.\nLos siguientes materiales no tienen precio de lista: " + sMatList
                                        );

                                        let aMat = oModelProyect.getProperty("/oMaterial") || [];
                                        let aMatUI = oModelProyect.getProperty("/oMaterialUI") || [];
                                        let oCants = oModelProyect.getProperty("/oCantidades") || {};
                                        const aBadItmNumbers = aSinZPRE.map(it => it.ItmNumber);
                                        const aBadMatnr = aSinZPRE.map(it => it.Material || it.Matnr);

                                        aMat = aMat.filter(m => !aBadItmNumbers.includes(m.ItmNumber));
                                        aMatUI = aMatUI.filter(m => !aBadItmNumbers.includes(m.ItmNumber));

                                        aBadMatnr.forEach(m => {
                                            if (m && oCants[m] !== undefined) {
                                                delete oCants[m];
                                            }
                                        });

                                        oModelProyect.setProperty("/oMaterial", aMat);
                                        oModelProyect.setProperty("/oMaterialUI", aMatUI);
                                        oModelProyect.setProperty("/oCantidades", oCants);
                                        oModelProyect.setProperty("/ui/materialesBusy", false);
                                        resolve(oResponse);
                                        return;
                                    }
                                }

                                const aItemsOut = oResponse.toItemsOut?.results || [];
                                oModelProyect.setProperty("/oItemsOutSAP", aItemsOut);

                                const itnToNum = itn => _n(itn);

                                aMaterialUI = aMaterialUI.filter(item => {
                                    if (!item.isExtraFromSAP) return true;
                                    return aItemsOut.some(io => io.ItmNumber === item.ItmNumber);
                                });

                                aItemsOut.forEach(io => {
                                    const sItm = io.ItmNumber;
                                    const existeUI = aMaterialUI.some(ui => ui.ItmNumber === sItm);
                                    if (existeUI) {
                                        return;
                                    }

                                    const parent = [...aMaterialUI]
                                        .filter(x => !x.isExtraFromSAP && itnToNum(x.ItmNumber) < itnToNum(sItm))
                                        .sort((a, b) => itnToNum(b.ItmNumber) - itnToNum(a.ItmNumber))[0];

                                    const sMat = io.Material || (parent && parent.Material) || "";
                                    const sMatNorm = normalizeMat(sMat);
                                    const sDesc =
                                        io.ShortText ||
                                        mDescByMat[sMatNorm] ||
                                        (parent && parent.Descriptions) ||
                                        sMatNorm || sMat;

                                    const sTargetQu = parent && parent.TargetQu ? parent.TargetQu : "UND";

                                    aMaterialUI.push({
                                        ItmNumber: sItm,
                                        Material: sMat,
                                        Descriptions: sDesc,
                                        TargetQu: sTargetQu,
                                        UMVWeight: parent ? parent.UMVWeight : "KG",
                                        cantidad: "0.000",
                                        prlist: parent ? parent.prlist : 0,
                                        CondPUnt: parent ? parent.CondPUnt : 1,
                                        precioBase: 0,
                                        precioUnit: 0,
                                        descuentos: 0,
                                        impuesto: 0,
                                        subtotal: 0,
                                        total: 0,
                                        totalpos: 0,
                                        usarPrecioManual: false,
                                        isExtraFromSAP: true,
                                        Bonus: "Boni",
                                        ParentItmNumber: parent ? parent.ItmNumber : ""
                                    });
                                });

                                sap.m.MessageBox.success("Datos de material ingresados con éxito");

                                aMaterialUI.forEach(item => {
                                    item.precioUnit = 0;
                                    item.precioBase = 0;
                                    item.totalpos = 0;
                                    item.pvNeto = 0;
                                    item.descuentos = 0;
                                    item.impuesto = 0;
                                    item.subtotal = 0;
                                    item.total = 0;
                                    item.UMVWeight = item.UMVWeight || "KG";
                                    item.fleteIncluido = 0;
                                    item.Peso = item.Peso || "0.000";
                                    if (!item.isExtraFromSAP) {
                                        item.prlist = 0;
                                    }
                                    item.usarPrecioManual =
                                        (oData.oMaterial.find(i => i.ItmNumber === item.ItmNumber)?.usarPrecioManual) || false;
                                });

                                aConditions.forEach(cond => {
                                    const oItemUI = aMaterialUI.find(ui => ui.ItmNumber === cond.ItmNumber);
                                    const nValor = this._getConditionAmount(cond);

                                    if (cond.ItmNumber === "000000" && cond.CondType === "ZRF0") {
                                        return;
                                    }

                                    if (!oItemUI) {
                                        return;
                                    }

                                    if (this._isActiveDiscountCondition(cond, mPriceConditionTypes)) {
                                        oItemUI.descuentos -= Math.abs(nValor);
                                        return;
                                    }

                                    switch (cond.CondType) {
                                        case "ZPMA":
                                            oItemUI.precioBase = nValor;
                                            oItemUI.precioUnit = nValor;
                                            break;

                                        case "ZPRE":
                                            if (!oItemUI.usarPrecioManual) {
                                                oItemUI.precioBase = nValor;
                                                oItemUI.precioUnit = nValor;
                                            }
                                            break;

                                        case "ZPOS":
                                            oItemUI.totalpos = this._getConditionAmount(cond);
                                            break;

                                        case "MWST":
                                            oItemUI.impuesto = nValor;
                                            break;

                                        case "ZPRL":
                                            oItemUI.CondPUnt = this._getConditionAmount(cond) || 1;
                                            break;

                                        case "ZRF0":
                                            oItemUI.fleteIncluido = (oItemUI.fleteIncluido || 0) + nValor;
                                            break;
                                    }
                                });

                                const fleteIncluidoValorBatch = getSum(aConditions, "ZRF0");
                                const fleteNoIncluidoValorBatch = getSum(aConditions, "ZRFM");

                                aMaterialUI.forEach(it => it.fleteIncluido = 0);

                                if (fleteIncluidoUI && fleteIncluidoValorBatch > 0) {
                                    const aLines = aMaterialUI.filter(it => !it.isExtraFromSAP);
                                    const baseTotal = aLines.reduce((acc, it) => acc + _n(it.precioBase), 0);

                                    if (baseTotal > 0) {
                                        aLines.forEach(it => {
                                            const share = (_n(it.precioBase) / baseTotal) * fleteIncluidoValorBatch;
                                            it.fleteIncluido = share;
                                        });
                                    }
                                }

                                const fleteMostrar = fleteIncluidoUI ? fleteIncluidoValorBatch : fleteNoIncluidoValorBatch;
                                oModelProyect.setProperty("/inputForm/fleteUSD", (fleteMostrar || 0).toFixed(2));

                                const bonusItmSet = new Set(
                                    aConditions.filter(c => c.CondType === "ZABO").map(c => c.ItmNumber)
                                );

                                aMaterialUI.forEach(it => {
                                    if (it.isExtraFromSAP) {
                                        bonusItmSet.add(it.ItmNumber);
                                    }
                                });

                                const getNetoBonus = (itmNum) =>
                                    getSum(aConditions, "ZPRE", itmNum) + getSum(aConditions, "ZABO", itmNum);

                                let subtotalGeneral = 0, totalImpuesto = 0, totalGeneral = 0;

                                const findParentForBonus = (bonusItem) => {
                                    if (!bonusItem) return null;
                                    const bonusNum = itnToNum(bonusItem.ItmNumber);
                                    const sameMat = bonusItem.Material;

                                    if (sameMat) {
                                        const candidateSameMat = [...aMaterialUI]
                                            .filter(x => !x.isExtraFromSAP && itnToNum(x.ItmNumber) < bonusNum && x.Material && x.Material === sameMat)
                                            .sort((a, b) => itnToNum(b.ItmNumber) - itnToNum(a.ItmNumber))[0];
                                        if (candidateSameMat) return candidateSameMat;
                                    }

                                    const candidatePrev = [...aMaterialUI]
                                        .filter(x => !x.isExtraFromSAP && itnToNum(x.ItmNumber) < bonusNum)
                                        .sort((a, b) => itnToNum(b.ItmNumber) - itnToNum(a.ItmNumber))[0];
                                    if (candidatePrev) return candidatePrev;

                                    const firstNonBonus = aMaterialUI.find(x => !x.isExtraFromSAP);
                                    return firstNonBonus || null;
                                };

                                const aPesoPromises = [];

                                aMaterialUI.forEach(item => {
                                    const oItemOut = aItemsOut.find(io => io.ItmNumber === item.ItmNumber);
                                    let cantidad = 0;

                                    if (oItemOut && oItemOut.ReqQty != null) {
                                        cantidad = _n(oItemOut.ReqQty);
                                    } else {
                                        const oSchedule = aSchedule.find(s => s.ItmNumber === item.ItmNumber);
                                        cantidad = _n(oSchedule?.ReqQty) || _n(item.cantidad) || 0;
                                    }

                                    const CondPUnt = 1;

                                    if (bonusItmSet.has(item.ItmNumber)) {
                                        const neto = getNetoBonus(item.ItmNumber);
                                        item.precioBase = neto;
                                        item.descuentos = 0;
                                        item.impuesto = 0;
                                        item.totalpos = neto;
                                    } else {
                                        if (cantidad > 0 && CondPUnt > 0) {
                                            item.prlist = (item.precioBase / CondPUnt / cantidad).toFixed(2);
                                        } else {
                                            item.prlist = (item.prlist || "0.00");
                                        }
                                    }

                                    const fleteLinea = fleteIncluidoUI ? (_n(item.fleteIncluido) || 0) : 0;

                                    if (item.usarPrecioManual) {
                                        item.subtotal = item.precioBase - fleteLinea;
                                    } else {
                                        item.subtotal = (item.precioBase + item.descuentos) - fleteLinea;
                                    }

                                    item.totalpos = item.subtotal;

                                    const srcItem = oData.oMaterial.find(i => i.ItmNumber === item.ItmNumber);
                                    const hasDescManual = !!(
                                        srcItem &&
                                        srcItem.descuentoManualPct != null &&
                                        !isNaN(srcItem.descuentoManualPct) &&
                                        srcItem.descuentoManualPct > 0
                                    );

                                    if (hasDescManual) {
                                        const fPctManual = parseFloat(srcItem?.descuentoManualPct || 0);

                                        void 0;

                                        if (fPctManual > 0) {
                                            item.descuentoManualPctDisplay = fPctManual.toString().replace(/\.0+$/, "") + "%";

                                            const nBaseDescuento = _n(item.totalpos || item.precioBase || 0);
                                            const nZDMPImporte = (nBaseDescuento * fPctManual) / 100;

                                            void 0;
                                            void 0;

                                            item.descuentoManualImporte = nZDMPImporte;
                                            item.totalpos = nBaseDescuento - nZDMPImporte;
                                            item.subtotal = item.totalpos;

                                            void 0;
                                            void 0;
                                            void 0;
                                        } else {
                                            item.descuentoManualPctDisplay = "";
                                            item.descuentoManualImporte = 0;

                                            void 0;
                                        }
                                    } else {
                                        item.descuentoManualPctDisplay = "";
                                        item.descuentoManualImporte = 0;

                                        void 0;
                                    }

                                    item.total = item.subtotal + item.impuesto;
                                    item.cantidad = cantidad > 0 ? cantidad.toFixed(3) : "0.000";
                                    item.pvNeto = (cantidad > 0) ? (item.totalpos / cantidad).toFixed(2) : "0.00";


                                    const sMatRaw = item.Material || item.Matnr;
                                    const sMatNorm = normalizeMat(sMatRaw);

                                    if (!item.Descriptions ||
                                        item.Descriptions === item.Material ||
                                        item.Descriptions === sMatRaw ||
                                        item.Descriptions === sMatNorm) {
                                        item.Descriptions =
                                            mDescByMat[sMatNorm] ||
                                            item.Maktx ||
                                            item.Descriptions ||
                                            sMatNorm ||
                                            sMatRaw || "";
                                    }

                                    item.TargetQu = item.TargetQu || "UND";

                                    subtotalGeneral += item.subtotal;
                                    totalImpuesto += item.impuesto;
                                    totalGeneral += item.total;

                                    const sMaterialPeso = item.Material || item.Matnr;
                                    const sMeinsPeso = "KG";
                                    const sUmvPeso = item.TargetQu || item.UMV || "KG";

                                    const oSchedulePeso = aSchedule.find(s => s.ItmNumber === item.ItmNumber);
                                    const fQtyPeso = _n(oSchedulePeso?.ReqQty) || _n(item.cantidad) || cantidad;

                                    if (sMaterialPeso && fQtyPeso > 0) {
                                        aPesoPromises.push(
                                            this._getPesoProducto(sMaterialPeso, sMeinsPeso, sUmvPeso, fQtyPeso)
                                                .then(oRespPeso => {
                                                    let aResults = [];
                                                    if (oRespPeso && Array.isArray(oRespPeso.oResults)) {
                                                        aResults = oRespPeso.oResults;
                                                    } else if (Array.isArray(oRespPeso)) {
                                                        aResults = oRespPeso;
                                                    } else if (oRespPeso && Array.isArray(oRespPeso.results)) {
                                                        aResults = oRespPeso.results;
                                                    } else if (oRespPeso && oRespPeso.d && Array.isArray(oRespPeso.d.results)) {
                                                        aResults = oRespPeso.d.results;
                                                    } else if (oRespPeso && oRespPeso.Peso) {
                                                        aResults = [oRespPeso];
                                                    }

                                                    if (aResults.length > 0) {
                                                        const oRow = aResults[0];
                                                        const nPeso = _n(oRow.Peso || oRow.Weight || oRow.Weigth);
                                                        item.Peso = !isNaN(nPeso) ? nPeso.toFixed(3) : "0.000";
                                                    } else {
                                                        item.Peso = "0.000";
                                                    }
                                                })
                                                .catch(() => {
                                                    item.Peso = "0.000";
                                                })
                                        );
                                    } else {
                                        item.Peso = "0.000";
                                    }
                                });

                                await Promise.all(aPesoPromises);

                                oModelProyect.setProperty("/oMaterialUI", aMaterialUI);

                                this._recalcTotalPeso();

                                const bonusItmSetNums = Array.from(bonusItmSet);
                                bonusItmSetNums.forEach(bonusItmNumber => {
                                    const bonusItem = aMaterialUI.find(x => x.ItmNumber === bonusItmNumber);
                                    if (!bonusItem) return;

                                    const parent = findParentForBonus(bonusItem);
                                    if (!parent) return;

                                    bonusItem.prlist = parent.prlist;
                                });

                                const embalajeUI = (!fleteIncluidoUI) ? fleteNoIncluidoValorBatch : 0;
                                totalGeneral += embalajeUI;

                                if (sTipDocUI === "ZGNA") {
                                    totalGeneral = 0;
                                }

                                const oDatCalculoActual = oModelProyect.getProperty("/oDatCalculo") || {};

                                oModelProyect.setProperty("/oDatCalculo", {
                                    ...oDatCalculoActual,
                                    subtotalGeneral: subtotalGeneral.toFixed(2),
                                    embalaje: embalajeUI.toFixed(2),
                                    totalImpuesto: totalImpuesto.toFixed(2),
                                    totalGeneral: totalGeneral.toFixed(2)
                                });
                                oModelProyect.refresh(true);
                                oModelProyect.setProperty("/ui/materialesBusy", false);

                                sap.ui.getCore().applyChanges();

                                setTimeout(() => {
                                    this._showPendingExcludedNoIgvMessage();
                                }, 200);

                                resolve(oResponse);
                            } catch (e) {
                                oModelProyect.setProperty("/ui/materialesBusy", false);
                                void 0;
                                reject(e);
                            }
                        },
                        error: (oError) => {
                            oModelProyect.setProperty("/ui/materialesBusy", false);

                            this._showPendingExcludedNoIgvMessage();

                            sap.m.MessageBox.error("❌ Error en la simulación");
                            void 0;
                            reject(oError);
                        }
                    });
                } catch (e) {
                    oModelProyect.setProperty("/ui/materialesBusy", false);

                    setTimeout(() => {
                        this._showPendingExcludedNoIgvMessage();
                    }, 200);

                    void 0;
                    reject(e);
                }
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

                try {
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
                } catch (e) {
                    oResult.error++;
                    oResult.errors.push(oFile.name + ": excepción al subir a SharePoint.");

                    void 0;
                }
            }

            return oResult;
        },


        _createOrder: async function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oCantidades = oModelProyect.getProperty("/oCantidades") || {};
            const oData = oModelProyect.getData();
            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = Formatter._formatDateForSAP(sFechaActual);
            const sSalesOrg = oData.oDatClient?.SalesOrganization || "";
            const sCliente = oData.oDatClient?.Customer || "";
            const sTipoEntrega = oData.inputForm?.tipoEntrega;
            const sSedeFinalDif = oData.inputForm?.sedeFinalDiferente;
            const sTransportista = oData.inputForm?.transporte;
            const sDestinoTextil = oData.inputForm?.destinoTextil || "";
            const sDestinoQuimicos = oData.inputForm?.destinoQuimicos || "";
            const sDirAgencia = oData.inputForm?.direccionAgencia || "";
            const sDestinoFinal = oData.inputForm?.destinoFinal || "";
            const oModelUser = this.getView().getModel("oModelUser");
            const isClienteIAS =
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bIsCliente") === true;
            const sTipDocUI = oData.inputForm?.tipDocument || "";
            const sTOperation =
                (sTipDocUI === "ZCNA") ? "CC" :
                    (sTipDocUI === "ZACN" || sTipDocUI === "ZPSE") ? "RS" :
                        "CP";
            const bCantidadEnItemSinSchedule = (sTipDocUI === "ZACN");
            const bSedeFinalDif = (sSedeFinalDif === true || sSedeFinalDif === "SI" || sSedeFinalDif === "Si");
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
                const aConPrecioManual = (oData.oMaterial || []).filter(it => it.usarPrecioManual === true);
                const aConDescManual = (oData.oMaterial || []).filter(it =>
                    it.descuentoManualPct != null &&
                    !isNaN(it.descuentoManualPct) &&
                    it.descuentoManualPct > 0
                );
                if (aConPrecioManual.length > 0 || aConDescManual.length > 0) {
                    sap.m.MessageBox.error(
                        "No es posible utilizar precio manual ni descuento manual cuando el pedido se crea con referencia.\n" +
                        "Por favor elimine los precios/descuentos manuales antes de grabar la orden."
                    );
                    this._setMaterialesBusy(false);
                    return;
                }
            }
            //  PARTNERS
            let aPartners = [];
            if (sSalesOrg === "1120") {
                aPartners.push({ ClientId: sCliente, PartnRole: "AG", PartnNumber: sCliente });
                aPartners.push({
                    ClientId: sCliente,
                    PartnRole: "WE",
                    PartnNumber:
                        sTipoEntrega === "1" ? sCliente :
                            (sTipoEntrega === "3" ? sDirAgencia : sDestinoQuimicos)
                });
                aPartners.push({
                    ClientId: sCliente,
                    PartnRole: "Z0",
                    PartnNumber: (sTipoEntrega === "1")
                        ? (sDestinoQuimicos || sCliente)
                        : (bSedeFinalDif ? sDestinoFinal : sDestinoQuimicos),
                    ItmNumber: "000000"
                });

                if (bSedeFinalDif) {
                    aPartners.push({
                        ClientId: sCliente,
                        PartnRole: "ZE",
                        PartnNumber: sDestinoQuimicos || "",
                        ItmNumber: "000000"
                    });
                }
                if (sTipoEntrega === "2" && sDirAgencia) {
                    aPartners.push({
                        ClientId: sCliente,
                        PartnRole: "ZA",
                        PartnNumber: sDirAgencia,
                        ItmNumber: "000000"
                    });
                }
                if (sTransportista) {
                    aPartners.push({
                        ClientId: sCliente,
                        PartnRole: "Z2",
                        PartnNumber: sTransportista,
                        ItmNumber: "000000"
                    });
                }
                aPartners = aPartners.concat(this._buildVendorPartnersQuimicos(oData));

            } else {
                aPartners = [{ ClientId: sCliente, PartnRole: "AG", PartnNumber: sCliente }];
            }
            // SCHEDULE
            let aSchedule = [];
            if (!bCantidadEnItemSinSchedule) {
                aSchedule = (oData.oMaterial || []).map(item => ({
                    ClientId: item.ClienteId || sCliente,
                    ItmNumber: item.ItmNumber,
                    SchedLine: "0001",
                    ReqQty: this._getCantidadFromMap(oCantidades, item).toFixed(3)
                }));
            }
            //  TEXTOS
            const aTexts = [
                {
                    ClientId: sCliente,
                    ItmNumber: "000000",   // cabecera
                    TextId: "Z001",
                    Langu: "ES",
                    TextLine: oData.inputForm?.obsPedido || ""
                },
                {
                    ClientId: sCliente,
                    ItmNumber: "000000",   // cabecera
                    TextId: "Z003",
                    Langu: "ES",
                    TextLine: oData.inputForm?.obsDelivery || ""
                }
            ].filter(t => t.TextLine);
            // CONDITIONS (flete + precio manual)
            const sMoneda = oData.inputForm?.monedaText || "USD";
            const sMonedaKey = oData.inputForm?.moneda || "USD";

            const fleteIncluidoUI = !!oData.inputForm?.fleteIncluido;
            let sFleteUSD3 = oData.inputForm?.fleteUSD_SAP || "";

            if (!sFleteUSD3) {
                let fleteUSDNum = parseFloat(oData.inputForm?.fleteUSD || "0");
                if (!isFinite(fleteUSDNum) || fleteUSDNum < 0) {
                    fleteUSDNum = 0;
                }
                const fleteUSD3Num = Math.round(fleteUSDNum * 1000) / 1000;
                sFleteUSD3 = fleteUSD3Num.toFixed(3);
                oModelProyect.setProperty("/inputForm/fleteUSDNum", fleteUSD3Num);
                oModelProyect.setProperty("/inputForm/fleteUSD_SAP", sFleteUSD3);
            }
            const fletePEN = parseFloat(oData.inputForm?.fletePEN || "0");
            const bMonedaPEN = (sMoneda === "PEN");
            const fleteIngresado = bMonedaPEN
                ? (fletePEN > 0)
                : (parseFloat(sFleteUSD3) > 0);

            let sFleteCondValor = "";
            let sFleteCondCurr = bMonedaPEN ? "PEN" : "USD";

            if (bMonedaPEN) {
                const fletePEN3 = Math.round((isFinite(fletePEN) ? fletePEN : 0) * 1000) / 1000;
                sFleteCondValor = fletePEN3.toFixed(3);
            } else {
                sFleteCondValor = sFleteUSD3;
            }

            let aConditions = [];

            if (fleteIngresado) {
                if (fleteIncluidoUI) {
                    // Flete incluido en precio → ZRF0
                    aConditions.push({
                        ItmNumber: "000000",
                        CondType: "ZRF0",
                        CondValue: sFleteCondValor,
                        Currency: sFleteCondCurr
                    });
                } else {
                    // Flete NO incluido en precio → ZRFM
                    aConditions.push({
                        ItmNumber: "000000",
                        CondType: "ZRFM",
                        CondValue: sFleteCondValor,
                        Currency: sFleteCondCurr
                    });
                }
            }
            if (fletePEN > 0) {
                aConditions.push({
                    ItmNumber: "000000",
                    CondType: "ZRF1",
                    CondValue: fletePEN.toFixed(2),
                    Currency: "PEN"
                });
            }
            // ZPMA en toConditions (solo si NO es pedido con referencia, pero ya bloqueamos antes)
            (oData.oMaterial || []).forEach(item => {
                if (item.usarPrecioManual && item.precioBase) {
                    const nPrecioManual = parseFloat(item.precioBase || "0");
                    const nPrecioBapi = isNaN(nPrecioManual) ? 0 : nPrecioManual / 10;

                    aConditions.push({
                        ItmNumber: item.ItmNumber,
                        CondType: "ZPMA",
                        CondValue: nPrecioBapi.toString(),
                        CondPUnt: "1"
                    });
                }
            });
            //  ZDMP en toConditions: "Descuento Manual" por posición
            (oData.oMaterial || []).forEach(item => {
                if (
                    item.descuentoManualPct != null &&
                    !isNaN(item.descuentoManualPct) &&
                    item.descuentoManualPct > 0
                ) {
                    aConditions.push({
                        ItmNumber: item.ItmNumber,
                        CondType: "ZDMP",
                        CondValue: item.descuentoManualPct.toString(),
                    });
                }
            });

            //  ITEMS (TargetQty para ZACN + REFERENCIA)
            const aItems = (oData.oMaterial || []).map(item => {
                const sQty = this._getCantidadFromMap(oCantidades, item).toFixed(3);

                const oItemPayload = {
                    ClienteId: item.ClienteId || sCliente,
                    ItmNumber: item.ItmNumber,
                    Material: item.Material,
                    Plant: "1000",
                    TargetQu: item.TargetQu || "UND"
                };

                if (bCantidadEnItemSinSchedule) {
                    oItemPayload.TargetQty = sQty;
                }

                // ZPMA a nivel de item
                if (item.usarPrecioManual && item.precioBase) {
                    const nPrecioManual = parseFloat(item.precioBase || "0");
                    const nPrecioBapi = isNaN(nPrecioManual) ? 0 : nPrecioManual;

                    Object.assign(oItemPayload, {
                        CondType: "ZPMA",
                        CondValue: nPrecioBapi.toString(),
                        CondPUnt: "1",
                        CondDUnt: item.TargetQu || item.UMV || "UND"
                    });
                }
                // Referencia de documento (RefDoc / RefDocIt / RefDocCa)
                if (bPedidoConReferencia) {
                    let sRefDocCa = item.RefDocCa;

                    if (!sRefDocCa && sTipoRef) {
                        if (sTipoRef === "ZCNA") {
                            sRefDocCa = "B";
                        } else if (sTipoRef === "ZACN" || sTipDocUI === "ZPSE") {
                            sRefDocCa = "G";
                        }
                    }

                    const bTieneReferencia =
                        !!item.RefDoc &&
                        !!item.RefDocIt &&
                        !!sRefDocCa;

                    if (bTieneReferencia) {
                        oItemPayload.RefDoc = item.RefDoc;
                        oItemPayload.RefDocIt = item.RefDocIt;
                        oItemPayload.RefDocCa = sRefDocCa;
                    }
                }

                return oItemPayload;
            });
            const bIsCoord = !!oModelUser?.getProperty("/bIsCoord");
            const bIsVendedor = !!oModelUser?.getProperty("/bIsVendedor");
            const sPoSupplem = isClienteIAS ? "CLTE" : (bIsCoord ? "SUPE" : (bIsVendedor ? "VEND" : ""));
            const extraPoSupplem = sPoSupplem ? { PoSupplem: sPoSupplem } : {};
            let sShipCond = "";
            switch (String(sTipoEntrega || "")) {
                case "1":
                    sShipCond = "02";
                    break;
                case "2":
                    sShipCond = "01";
                    break;
                case "3":
                    sShipCond = "01";
                    break;
                default:
                    sShipCond = "";
                    break;
            }


            const oPayload = this._cleanPayload({
                ClientId: sCliente,
                TOperation: sTOperation,
                DocType: sTipDocUI,
                SalesOrg: sSalesOrg,
                DistrChan: (sTipDocUI === "ZPEF") ? "C2" : "C1",
                Division: oData.oDatClient?.Division || "",
                ReqDateH: oPurchDate,
                PurchDate: Formatter._formatDateForSAP(oData.inputForm?.ocExpDate),
                QtValidF: Formatter._formatDateForSAP(oData.inputForm?.fechInicio) || "",
                QtValidT: Formatter._formatDateForSAP(oData.inputForm?.fechFin) || "",
                PriceDate: Formatter._formatDateForSAP(sPriceDate),
                PoMethod: "Z001",
                Pmnttrms: oData.inputForm?.cbCondPago || "",
                PurchNoC: oData.inputForm?.purchaseOrder || "",
                ShipCond: sShipCond,
                Currency: sMoneda,
                OrdReason: oData.inputForm?.reasonOrd || "",
                ...extraPoSupplem,
                HeaderToItem: aItems,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toConditions: aConditions,
                toText: aTexts,
                HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
            });

            const oModelEntity = oView.getModel("oModelEntity");
            this._setMaterialesBusy(true);
            sap.ui.core.BusyIndicator.show(0);
            oModelEntity.create("/iHeaderSet", oPayload, {
                success: async function (oResponse) {
                    sap.ui.core.BusyIndicator.hide();
                    this._setMaterialesBusy(false);
                    let sNumPedido = "";
                    const aMensajes = oResponse?.HeaderToReturn?.results || [];
                    aMensajes.forEach(m => {
                        const sMessage = String(m.Message || m.message || "");
                        const match = sMessage.match(/\d{10}/);
                        if (match) sNumPedido = match[0];
                    });
                    const fnAfterOk = function () {
                        oModelProyect.setProperty("/oMaterial", []);
                        oModelProyect.setProperty("/oMaterialUI", []);
                        oModelProyect.setProperty("/oCantidades", {});
                        oModelProyect.setProperty("/oDatCalculo", {
                            subtotalGeneral: "0.00",
                            totalImpuesto: "0.00",
                            totalGeneral: "0.00",
                            embalaje: "0.00"
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
                        oModelProyect.setProperty("/oSelecTableDetalle", {
                            ItmNumber: "",
                            Material: "",
                            Descriptions: "",
                            cantidad: "",
                            precioBase: "",
                            Kbetr: "",
                            DescuentoPermitido: "",
                            DescuentoPermitidoNum: 0,
                            DescuentoManual: "0",
                            usarPrecioManual: false,
                            tieneDescuentoManual: false
                        });

                        oModelProyect.refresh(true);

                        const oTable = oView.byId("tbProductos1") || sap.ui.getCore().byId("tbProductos1");
                        if (oTable && oTable.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        this._goToLaunchpadHome();
                    }.bind(this);
                    if (sNumPedido) {
                        sap.ui.core.BusyIndicator.show(0);

                        const oUploadResult = await this._uploadPendingOCFilesAfterOrder(sNumPedido);

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
                            ` Orden creada.\nNúmero: ${sNumPedido}${sUploadMessage}`,
                            {
                                title: "Orden creada",
                                onClose: function () {
                                    this._clearPendingOCFiles();
                                    fnAfterOk();
                                }.bind(this)
                            }
                        );
                    } else {
                        sap.m.MessageBox.success(
                            " Orden creada, pero SAP no envió número.",
                            { title: "Orden creada", onClose: fnAfterOk }
                        );
                    }
                }.bind(this),

                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    this._setMaterialesBusy(false);
                    sap.m.MessageBox.error(
                        "No se puede crear el pedido en este momento. Por favor, verifique los datos e intente nuevamente.",
                        { title: "Error al crear pedido" }
                    );
                }.bind(this)
            });
        },
        _goToLaunchpadHome: async function () {
            try {
                if (sap.ushell && sap.ushell.Container) {
                    const oCrossAppNav = await sap.ushell.Container.getServiceAsync("CrossApplicationNavigation");
                    oCrossAppNav.toExternal({ target: { shellHash: "#Shell-home" } });
                    return;
                }
                window.location.hash = "";
            } catch (e) {
                window.location.assign(window.location.origin);
            }
        },

        _cleanPayload: function (oData) {
            return JSON.parse(JSON.stringify(oData, (key, value) => {
                if (value === "" || value === null || value === undefined) {
                    return undefined;
                }
                return value;
            }));
        },
        onSelectProducto: function (oEvent) {
            const oTable = oEvent.getSource();
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
                sap.m.MessageToast.show("Seleccione un producto.");
                return;
            }

            const oContext = oSelectedItem.getBindingContext("oModelProyect");
            const oSelectedRow = oContext.getObject();

            const oModel = this.getView().getModel("oModelProyect");
            const sItmNumber = oSelectedRow.ItmNumber || oSelectedRow.Posnr;
            const sMaterial = oSelectedRow.Material || oSelectedRow.Matnr;

            // 🔹 Condiciones de SAP para sacar ZDPM de esa posición
            const aConditions = oModel.getProperty("/oConditionsSAP") || [];
            const oCondZDPM = aConditions.find(c =>
                c.ItmNumber === sItmNumber && c.CondType === "ZDPM"
            );
            let fDesPerm = 0;
            let sDesPermText = "";

            if (oCondZDPM && oCondZDPM.CondValue) {
                fDesPerm = parseFloat(oCondZDPM.CondValue) || 0;
                if (fDesPerm > 0) {
                    sDesPermText = fDesPerm.toString().replace(/\.0+$/, "") + "%";
                }
            }

            // 🔹 Buscar el item en oMaterial para recuperar descuentoManualPct y usarPrecioManual
            const aMaterial = oModel.getProperty("/oMaterial") || [];
            const oItemMat = aMaterial.find(i => i.ItmNumber === sItmNumber);
            const fDesManual = oItemMat?.descuentoManualPct || 0;
            const sDesManualText = fDesManual ? fDesManual.toString() : "";
            const bUsarPrecioMan = !!oItemMat?.usarPrecioManual;
            const bTieneDescManual = fDesManual > 0;

            const oDetalleSeleccionado = {
                ItmNumber: sItmNumber,
                Material: sMaterial,
                Descriptions: oSelectedRow.Descriptions || oSelectedRow.Maktx || "",
                cantidad: oSelectedRow.cantidad || oSelectedRow.ReqQty || 0,
                precioBase: oSelectedRow.precioUnit || oSelectedRow.Kbetr || 0,
                Kbetr: oSelectedRow.prlist,
                DescuentoPermitido: sDesPermText,
                DescuentoPermitidoNum: fDesPerm,
                DescuentoManual: sDesManualText,
                usarPrecioManual: bUsarPrecioMan,
                tieneDescuentoManual: bTieneDescManual
            };

            void 0;
            void 0;

            oModel.setProperty("/oSelecTableDetalle", oDetalleSeleccionado);
        },
        onChangeDescuentoManual: function (oEvent) {
            const oInput = oEvent.getSource();
            let sValue = (oInput.getValue() || "").toString().replace(",", ".");
            const fValor = parseFloat(sValue);

            const oModel = this.getView().getModel("oModelProyect");
            const fMax = parseFloat(oModel.getProperty("/oSelecTableDetalle/DescuentoPermitidoNum") || "0");
            const sMaxText = oModel.getProperty("/oSelecTableDetalle/DescuentoPermitido") || "";
            const sItmNumber = oModel.getProperty("/oSelecTableDetalle/ItmNumber");

            void 0;
            void 0;
            void 0;
            void 0;

            if (sValue.trim() === "" || isNaN(fValor) || fValor <= 0) {
                oInput.setValueState("None");
                oInput.setValueStateText("");
                oModel.setProperty("/oSelecTableDetalle/DescuentoManual", "");
                oModel.setProperty("/oSelecTableDetalle/tieneDescuentoManual", false);

                let aMaterial = oModel.getProperty("/oMaterial") || [];
                aMaterial = aMaterial.map(it => {
                    if (it.ItmNumber === sItmNumber) {
                        const copy = Object.assign({}, it);
                        delete copy.descuentoManualPct;
                        delete copy.usarDescuentoManual;
                        return copy;
                    }
                    return it;
                });
                oModel.setProperty("/oMaterial", aMaterial);

                let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
                aMaterialUI = aMaterialUI.map(it => {
                    if (it.ItmNumber === sItmNumber) {
                        const copy = Object.assign({}, it);
                        delete copy.descuentoManualPct;
                        delete copy.usarDescuentoManual;
                        copy.descuentoManualPctDisplay = "";
                        copy.descuentoManualImporte = 0;
                        return copy;
                    }
                    return it;
                });
                oModel.setProperty("/oMaterialUI", aMaterialUI);
                return;
            }

            if (fMax > 0 && fValor > fMax) {
                oInput.setValueState("Error");
                const sMsg = `El descuento ingresado no puede exceder el descuento permitido (${sMaxText || (fMax + "%")}).`;
                oInput.setValueStateText(sMsg);
                sap.m.MessageBox.error(sMsg);

                oInput.setValue(fMax.toString());
                oModel.setProperty("/oSelecTableDetalle/DescuentoManual", fMax.toString());
                return;
            }

            oInput.setValueState("None");
            oModel.setProperty("/oSelecTableDetalle/DescuentoManual", fValor.toString());
            oModel.setProperty("/oSelecTableDetalle/tieneDescuentoManual", true);
            oModel.setProperty("/oSelecTableDetalle/usarPrecioManual", false);

            oModel.setProperty("/oSelecTableDetalle/prlistDraft", "");
            oModel.setProperty("/oSelecTableDetalle/_pendientePrecioManual", false);

            const oInpPrecio = this.byId("inpPrecioManual") || sap.ui.getCore().byId("inpPrecioManual");
            if (oInpPrecio) {
                oInpPrecio.setValue("");
                oInpPrecio.setValueState("None");
                oInpPrecio.setValueStateText("");
            }
            if (this._oLastPrecioManualInput) {
                this._oLastPrecioManualInput.setValue("");
            }

            let aMaterial = oModel.getProperty("/oMaterial") || [];
            aMaterial = aMaterial.map(it => {
                if (it.ItmNumber === sItmNumber) {
                    return Object.assign({}, it, {
                        descuentoManualPct: fValor,
                        usarDescuentoManual: true,
                        usarPrecioManual: false
                    });
                }
                return it;
            });
            oModel.setProperty("/oMaterial", aMaterial);

            let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            aMaterialUI = aMaterialUI.map(it => {
                if (it.ItmNumber === sItmNumber) {
                    return Object.assign({}, it, {
                        descuentoManualPct: fValor,
                        usarDescuentoManual: true,
                        usarPrecioManual: false,
                        descuentoManualPctDisplay: fValor.toString().replace(/\.0+$/, "") + "%"
                    });
                }
                return it;
            });
            oModel.setProperty("/oMaterialUI", aMaterialUI);

            void 0;
            void 0;
            void 0;
            void 0;
        },
        onChangePrecioManual: function (oEvent) {
            const oInput = oEvent.getSource();
            this._oLastPrecioManualInput = oInput;

            const oModel = this.getView().getModel("oModelProyect");

            // Tomar lo que escribe tal cual (sin forzar 2 decimales)
            let sRaw = (oEvent.getParameter("newValue") ?? oInput.getValue() ?? "").toString();

            // Normalizar: permitir dígitos y un solo separador decimal
            sRaw = sRaw.replace(/,/g, ".");
            sRaw = sRaw.replace(/[^0-9.]/g, "");
            const iDot = sRaw.indexOf(".");
            if (iDot !== -1) {
                sRaw = sRaw.slice(0, iDot + 1) + sRaw.slice(iDot + 1).replace(/\./g, "");
            }

            // Guardar texto crudo (esto evita que se convierta en 1.00 mientras escribes)
            oModel.setProperty("/oSelecTableDetalle/prlistDraft", sRaw);

            // Parsear solo para decidir flags (sin re-escribir el valor formateado)
            const f = parseFloat(sRaw);

            // Vacío o inválido => liberar descuento y NO bloquear
            if (!isFinite(f) || f <= 0) {
                oModel.setProperty("/oSelecTableDetalle/_pendientePrecioManual", false);
                oModel.setProperty("/oSelecTableDetalle/usarPrecioManual", false);
                return;
            }

            // Hay número válido => marcar pendiente y bloquear el otro input
            oModel.setProperty("/oSelecTableDetalle/_pendientePrecioManual", true);
            oModel.setProperty("/oSelecTableDetalle/usarPrecioManual", true);
            oModel.setProperty("/oSelecTableDetalle/tieneDescuentoManual", false);

            // Limpiar descuento manual (modelo + UI)
            oModel.setProperty("/oSelecTableDetalle/DescuentoManual", "");

            const oInpDesc = this.byId("inpDescuentoManual") || sap.ui.getCore().byId("inpDescuentoManual");
            if (oInpDesc) {
                oInpDesc.setValue("");
                oInpDesc.setValueState("None");
                oInpDesc.setValueStateText("");
            }

            // Quitar descuento manual del item actual en /oMaterial (para NO enviar ZDMP)
            const sItmNumber = oModel.getProperty("/oSelecTableDetalle/ItmNumber");
            if (sItmNumber) {
                let aMaterial = oModel.getProperty("/oMaterial") || [];
                aMaterial = aMaterial.map(it => {
                    if (it.ItmNumber === sItmNumber) {
                        const copy = Object.assign({}, it);
                        delete copy.descuentoManualPct;
                        delete copy.usarDescuentoManual;
                        return copy;
                    }
                    return it;
                });
                oModel.setProperty("/oMaterial", aMaterial);

                let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
                aMaterialUI = aMaterialUI.map(it => {
                    if (it.ItmNumber === sItmNumber) {
                        const copy = Object.assign({}, it);
                        delete copy.descuentoManualPct;
                        delete copy.usarDescuentoManual;
                        return copy;
                    }
                    return it;
                });
                oModel.setProperty("/oMaterialUI", aMaterialUI);
            }
        },
        onRecalculatePrices: async function () {
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect");

            void 0;
            void 0;
            void 0;
            void 0;

            const _getCtrl = (sId) => {
                return oView.byId(sId) || sap.ui.getCore().byId(sId) || sap.ui.getCore().byId(oView.getId() + "--" + sId);
            };

            const _clearManualInputs = () => {
                oModel.setProperty("/oSelecTableDetalle/prlistDraft", "");
                oModel.setProperty("/oSelecTableDetalle/DescuentoManual", "");
                oModel.setProperty("/oSelecTableDetalle/_pendientePrecioManual", false);
                oModel.setProperty("/oSelecTableDetalle/usarPrecioManual", false);
                oModel.setProperty("/oSelecTableDetalle/tieneDescuentoManual", false);

                const oInpPrecio = _getCtrl("inpPrecioManual");
                if (oInpPrecio) {
                    oInpPrecio.setValue("");
                    oInpPrecio.setValueState("None");
                    oInpPrecio.setValueStateText("");
                }

                const oInpDesc = _getCtrl("inpDescuentoManual");
                if (oInpDesc) {
                    oInpDesc.setValue("");
                    oInpDesc.setValueState("None");
                    oInpDesc.setValueStateText("");
                }

                if (this._oLastPrecioManualInput) {
                    this._oLastPrecioManualInput.setValue("");
                    this._oLastPrecioManualInput.setValueState("None");
                    this._oLastPrecioManualInput.setValueStateText("");
                }
            };

            const bRef = !!oModel.getProperty("/inputForm/esConReferencia");
            if (bRef) {
                sap.ui.core.BusyIndicator.show(0);
                try {
                    await this.onSimulateOrder();
                    _clearManualInputs();

                    const oTbl = _getCtrl("tbProductos1");
                    if (oTbl && oTbl.removeSelections) {
                        oTbl.removeSelections(true);
                    }
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
                return;
            }

            const oTable = oView.byId("tbProductos1");
            const oSelectedItem = oTable && oTable.getSelectedItem ? oTable.getSelectedItem() : null;

            if (!oSelectedItem) {
                sap.ui.core.BusyIndicator.show(0);
                try {
                    await this.onSimulateOrder();
                    _clearManualInputs();
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
                return;
            }

            const oCtx = oSelectedItem.getBindingContext("oModelProyect");
            const sPath = oCtx.getPath();
            const oItem = oModel.getProperty(sPath) || {};
            const sItmNumber = oModel.getProperty(sPath + "/ItmNumber");

            const fPrecioManual = parseFloat(
                String(oModel.getProperty("/oSelecTableDetalle/prlistDraft") || "").replace(",", ".")
            );

            const fDescuentoManual = parseFloat(
                String(oModel.getProperty("/oSelecTableDetalle/DescuentoManual") || "").replace(",", ".")
            );
            // Reinyectar descuento manual a /oMaterial antes de simular
            if (!isNaN(fDescuentoManual) && fDescuentoManual > 0) {
                let aMatSAPDesc = oModel.getProperty("/oMaterial") || [];
                aMatSAPDesc = aMatSAPDesc.map(it => {
                    if (it.ItmNumber === sItmNumber) {
                        return Object.assign({}, it, {
                            descuentoManualPct: fDescuentoManual,
                            usarDescuentoManual: true,
                            usarPrecioManual: false
                        });
                    }
                    return it;
                });
                oModel.setProperty("/oMaterial", aMatSAPDesc);

                let aMatUIDesc = oModel.getProperty("/oMaterialUI") || [];
                aMatUIDesc = aMatUIDesc.map(it => {
                    if (it.ItmNumber === sItmNumber) {
                        return Object.assign({}, it, {
                            descuentoManualPct: fDescuentoManual,
                            usarDescuentoManual: true,
                            usarPrecioManual: false,
                            descuentoManualPctDisplay: fDescuentoManual.toString().replace(/\.0+$/, "") + "%"
                        });
                    }
                    return it;
                });
                oModel.setProperty("/oMaterialUI", aMatUIDesc);

            }

            // Si no hay precio manual, igual debe simular con descuento
            if (isNaN(fPrecioManual) || fPrecioManual <= 0) {
                sap.ui.core.BusyIndicator.show(0);
                try {
                    await this.onSimulateOrder();
                    _clearManualInputs();

                    if (oTable && oTable.removeSelections) {
                        oTable.removeSelections(true);
                    }
                } finally {
                    sap.ui.core.BusyIndicator.hide();
                }
                return;
            }

            // Flujo precio manual
            const CondPUnt = parseFloat(oItem.CondPUnt) || 1;
            const fPrecioBaseSAP = fPrecioManual * CondPUnt;

            oModel.setProperty(sPath + "/CondType", "ZPMA");
            oModel.setProperty(sPath + "/CondValue", fPrecioBaseSAP.toFixed(2));
            oModel.setProperty(sPath + "/CondPUnit", CondPUnt);
            oModel.setProperty(sPath + "/usarPrecioManual", true);
            oModel.setProperty(sPath + "/prlist", fPrecioManual.toFixed(2));
            oModel.setProperty(sPath + "/precioBase", fPrecioBaseSAP.toFixed(2));
            oModel.setProperty(sPath + "/precioUnit", fPrecioManual.toFixed(2));
            oModel.setProperty(sPath + "/_pendientePrecioManual", false);

            sap.ui.core.BusyIndicator.show(0);
            try {
                let aMatSAP = oModel.getProperty("/oMaterial") || [];
                aMatSAP = aMatSAP.map(it => {
                    if (it.ItmNumber === sItmNumber) {
                        return Object.assign({}, it, {
                            usarPrecioManual: true,
                            prlist: fPrecioBaseSAP.toFixed(2),
                            precioBase: fPrecioBaseSAP.toFixed(2)
                        });
                    }
                    return it;
                });
                oModel.setProperty("/oMaterial", aMatSAP);
                await this.onSimulateOrder();

                _clearManualInputs();

                if (oTable && oTable.removeSelections) {
                    oTable.removeSelections(true);
                }
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        },

        _onLiveChangeCantidad: function (oEvent) {
            const oInput = oEvent.getSource();
            const oContext = oInput.getBindingContext("oModelProyect");
            const oObject = oContext.getObject();
            const oModel = oContext.getModel();
            const sContextPath = oContext.getPath();

            // Tomamos el valor nuevo (si viene) o el actual
            let sValue = oEvent.getParameter("newValue");
            if (sValue === undefined || sValue === null) {
                sValue = oInput.getValue();
            }

            let sCleanValue = String(sValue || "")
                .replace(",", ".")
                .replace(/[^\d.]/g, "");

            const iFirstDot = sCleanValue.indexOf(".");
            if (iFirstDot !== -1) {
                sCleanValue =
                    sCleanValue.substring(0, iFirstDot + 1) +
                    sCleanValue.substring(iFirstDot + 1).replace(/\./g, "");
            }

            let numValue = parseFloat(sCleanValue);
            if (isNaN(numValue)) {
                numValue = 0;
            }

            const stock = parseFloat(oObject.Clabs || 0);

            if (numValue <= stock) {
                oModel.setProperty(sContextPath + "/state", "Success");
                oModel.setProperty(sContextPath + "/icon", "sap-icon://inbox");

                if (oInput.getValue() !== sCleanValue) {
                    oInput.setValue(sCleanValue);
                }
            } else {
                oModel.setProperty(sContextPath + "/state", "Information");
                oModel.setProperty(sContextPath + "/icon", "sap-icon://outbox");

                this.getMessageBox("error", this.getI18nText("errorSupPermitido"));

                numValue = 0;
                sCleanValue = "0";
                oInput.setValue(sCleanValue);
            }

            // Valor con 3 decimales para SAP.
            // Esta cantidad pertenece al diálogo de agregar material; no debe modificar líneas ya agregadas.
            const sValueSAP = Number(numValue).toFixed(3);
            const oCantidades = oModel.getProperty("/oCantidades") || {};

            if (oObject.Matnr) {
                oCantidades[oObject.Matnr] = sValueSAP;
            }

            // Durante liveChange conservamos el texto digitado para no mover el cursor.
            oModel.setProperty(sContextPath + "/cantidad", sCleanValue);

            oModel.setProperty("/oCantidades", oCantidades);

            // 🔹 Seleccionar / des-seleccionar automáticamente la fila en la tabla manual
            try {
                // El Input está dentro del ColumnListItem (fila)
                const oListItem = oInput.getParent();       // sap.m.ColumnListItem
                const oTable = oListItem && oListItem.getParent(); // sap.m.Table

                if (oTable && oTable.isA("sap.m.Table") && oTable.setSelectedItem) {
                    // Si la cantidad es > 0, marcamos la fila; si es 0, la desmarcamos
                    oTable.setSelectedItem(oListItem, numValue > 0);
                }
            } catch (e) {
                // En caso de algún problema con la selección, solo logueamos
                void 0;
            }
        },
        _onPressNavButtonDetail: function () {
            that.getModel("oModelProyect").setProperty("/", models.createModelProyect());
            let sCustomer = that.getModel("oModelProyect").getProperty("/oClienteSeleccionado/Customer");
            if (!sCustomer) {
                const oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
                const sHash = oHashChanger.getHash();
                const aParts = sHash.split("/");
                sCustomer = aParts.length > 1 ? aParts[1] : null;
            }
            if (sCustomer) {
                this.getRouter().navTo("FormClient", { app: sCustomer });
            } else {
                this.getRouter().navTo("FormClient");
                sap.m.MessageToast.show("No se encontró Customer para regresar");
            }
        },
        _onPressEditDetail: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect");

            const oContext = oEvent.getSource().getParent().getBindingContext("oModelProyect");
            const oSelectedObj = oContext.getObject();
            this._oContextMaterialEdit = oContext;

            const sMatnr = oSelectedObj.Matnr || oSelectedObj.Material;
            const sDescripcion = oSelectedObj.Descriptions || oSelectedObj.Maktx || "";

            oModel.setProperty("/oMaterialesSelectedMatnr", sMatnr);
            oModel.setProperty("/oMaterialesSelectedDesc", sDescripcion);
            const oDetalle = Object.assign({}, oSelectedObj);
            this._fillStockAndUMVForEdit(oDetalle);

            oModel.setProperty("/oSelecTableDetalle", oDetalle);

            if (!this._oDialogEdit) {
                this._oDialogEdit = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.aris.registropedido.quimico.pe.view.dialogs.EditDetail",
                    this
                );
                oView.addDependent(this._oDialogEdit);
            }

            this._oDialogEdit.open();
        },
        _fillStockAndUMVForEdit: function (oDetalle) {
            const oModel = this.getView().getModel("oModelProyect");

            const sMat = (oDetalle.Matnr || oDetalle.Material || "").toString();
            if (!sMat) return;
            const aStock = oModel.getProperty("/oMaterialSelect") || [];
            const norm = (v) => (v || "").toString().replace(/^0+/, "");
            const sMatN = norm(sMat);
            const oStockRow = aStock.find(r => norm(r.Matnr || r.Material) === sMatN);
            const sClabs = oStockRow?.Clabs ?? oDetalle.Clabs ?? oDetalle.StockDispo ?? "";
            const sMeins = oStockRow?.Meins ?? oDetalle.Meins ?? oDetalle.TargetQu ?? oDetalle.UMV ?? "";
            oDetalle.StockCTD = (sClabs !== null && sClabs !== undefined) ? String(sClabs) : "";
            oDetalle.StockUMV = sMeins ? String(sMeins) : "";
            oDetalle.UMV = sMeins ? String(sMeins) : (oDetalle.UMV || "");
        },
        _onAcceptEditCantidad: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oDetalle = oModel.getProperty("/oSelecTableDetalle") || {};

            const sMatnr = String(oDetalle.Matnr || oDetalle.Material || "").trim();
            const sItmNumber = String(oDetalle.ItmNumber || oDetalle.Posnr || "").trim();
            const nNuevaCantidad = this._parseCantidadSAP
                ? this._parseCantidadSAP(oDetalle.cantidad)
                : parseFloat(String(oDetalle.cantidad || "0").replace(",", "."));

            if (!sMatnr) {
                sap.m.MessageToast.show("No se encontró el código de material seleccionado.");
                return;
            }

            if (isNaN(nNuevaCantidad) || nNuevaCantidad <= 0) {
                sap.m.MessageToast.show("Ingrese una cantidad válida.");
                return;
            }

            const sCantidadSAP = nNuevaCantidad.toFixed(3);
            const sCantKey = sItmNumber || sMatnr;
            const oCantidades = oModel.getProperty("/oCantidades") || {};

            if (sCantKey) {
                oCantidades[sCantKey] = sCantidadSAP;
            }

            oModel.setProperty("/oCantidades", oCantidades);

            let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            aMaterialUI = aMaterialUI.map(function (item) {
                if ((sItmNumber && item.ItmNumber === sItmNumber) || (!sItmNumber && item.Material === sMatnr)) {
                    return Object.assign({}, item, {
                        cantidad: sCantidadSAP
                    });
                }
                return item;
            });
            oModel.setProperty("/oMaterialUI", aMaterialUI);

            let aMaterialSAP = oModel.getProperty("/oMaterial") || [];
            aMaterialSAP = aMaterialSAP.map(function (item) {
                if ((sItmNumber && item.ItmNumber === sItmNumber) || (!sItmNumber && item.Material === sMatnr)) {
                    return Object.assign({}, item, {
                        cantidad: sCantidadSAP
                    });
                }
                return item;
            });
            oModel.setProperty("/oMaterial", aMaterialSAP);

            sap.m.MessageToast.show("Actualizando simulación...");
            this.onSimulateOrder();

            oModel.setProperty("/oSelecTableDetalle", {});

            if (this._oDialogEdit && this._oDialogEdit.isOpen()) {
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

            sap.m.MessageToast.show("Cantidad actualizada correctamente.");
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
        _onClose: function () {
            if (this._oDialogEdit) {
                this._oDialogEdit.close();

            }
        },
        formatKbetr: function (sKbetr) {
            if (!sKbetr) {
                return "";
            }

            var fValor = parseFloat(sKbetr);
            if (isNaN(fValor)) {
                return sKbetr;
            }
            var oCurrencyFormatter = sap.ui.core.format.NumberFormat.getFloatInstance({
                maxFractionDigits: 2,
                minFractionDigits: 2,
                groupingEnabled: true
            });

            return oCurrencyFormatter.format(fValor);
        },
        onSelectFleteYes: function (oEvent) {
            if (!oEvent.getParameter("selected")) return;
            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty("/inputForm/fleteIncluido", true);
        },

        onSelectFleteNo: function (oEvent) {
            if (!oEvent.getParameter("selected")) return;
            const oModel = this.getView().getModel("oModelProyect");
            oModel.setProperty("/inputForm/fleteIncluido", false);
        },
        onFletePENChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");
            let sValue = oEvent.getParameter("newValue");
            if (sValue === undefined || sValue === null) {
                sValue = oEvent.getParameter("value");
            }

            sValue = (sValue || "").toString();
            sValue = sValue.replace(/,/g, ".");
            sValue = sValue.replace(/[^0-9.]/g, "");

            const iFirstDot = sValue.indexOf(".");
            if (iFirstDot !== -1) {
                const sBefore = sValue.slice(0, iFirstDot + 1);
                const sAfter = sValue.slice(iFirstDot + 1).replace(/\./g, "");
                sValue = sBefore + sAfter;
            }

            if (!sValue || sValue === ".") {
                oInput.setValue("");
                oModel.setProperty("/inputForm/fletePEN", "");
                oModel.setProperty("/inputForm/fleteUSD", "0.00");
                oModel.setProperty("/inputForm/fleteUSDNum", 0);
                oModel.setProperty("/inputForm/fleteUSD_SAP", "0.000");
                oModel.setProperty("/inputForm/fleteIncluido", null);
                return;
            }

            let fletePEN = parseFloat(sValue);
            if (!isFinite(fletePEN) || fletePEN < 0) {
                fletePEN = 0;
            }

            let tipoCambio = 1;
            const oTipChangeData = oModelData && oModelData.getProperty("/oTipChangeData");
            if (oTipChangeData && oTipChangeData.from) {
                const fTC = parseFloat(oTipChangeData.from.valor);
                if (!isNaN(fTC) && fTC > 0) {
                    tipoCambio = fTC;
                }
            }

            const fleteUSD = tipoCambio > 0 ? (fletePEN / tipoCambio) : 0;
            const sUSD = fleteUSD.toFixed(2);
            const fleteUSD3Num = Math.round(fleteUSD * 1000) / 1000;
            const sFleteUSD3 = fleteUSD3Num.toFixed(3);

            oInput.setValue(sValue);
            oModel.setProperty("/inputForm/fletePEN", sValue);
            oModel.setProperty("/inputForm/fleteUSD", sUSD);
            oModel.setProperty("/inputForm/fleteUSDNum", fleteUSD3Num);
            oModel.setProperty("/inputForm/fleteUSD_SAP", sFleteUSD3);

            if (fletePEN <= 0) {
                oModel.setProperty("/inputForm/fleteIncluido", null);
            }
        },

        onConfirmCreateOrder: function () {
            const that = this;
            if (this._validateRequiredFields && !this._validateRequiredFields()) {
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
            sap.m.MessageBox.confirm("¿Desea cancelar?", {
                actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                onClose: (sAction) => {
                    if (sAction !== sap.m.MessageBox.Action.OK) return;

                    this._clearPendingOCFiles();

                    const oM = this.getOwnerComponent().getModel("oModelProyect");
                    oM.setProperty("/_nav/resetOnNextFormClient", true);
                    oM.setProperty("/aOCFilesPending", []);
                    oM.refresh(true);

                    this.getRouter().navTo("Main", {}, true);
                }
            });
        },
        getMonedaDescripcion: function (sKey) {
            if (!sKey) return "";
            const aMonedas = this.getView().getModel("oModelData").getProperty("/oTipMoney") || [];
            const oMoneda = aMonedas.find(item => item.sKey === sKey);
            return oMoneda ? oMoneda.sText : sKey;
        },
        // Editar Formulario
        onDetailEdit: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oInputForm = oModel.getProperty("/inputForm") || {};
            oModel.setProperty("/inputFormBackup", JSON.parse(JSON.stringify(oInputForm)));
            this._syncAgenciasFiltradasPorTransporte();
            oModel.setProperty("/isDetailEdit", true);
            oModel.setProperty("/isFormEnabled", true);
            setTimeout(function () {
                this._applyContainsFilterToCombos();
            }.bind(this), 0);
        },
        onDetailCancel: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oBackup = oModel.getProperty("/inputFormBackup") || {};

            oModel.setProperty("/inputForm", JSON.parse(JSON.stringify(oBackup)));

            oModel.setProperty("/isDetailEdit", false);
            oModel.setProperty("/isFormEnabled", false);

            sap.m.MessageToast.show("Cambios descartados.");
        },
        onDetailSave: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (this._validateRequiredFields && !this._validateRequiredFields()) {
                return;
            }
            if (this._updateResumenEntrega) {
                this._updateResumenEntrega();
            }

            oModel.setProperty("/isDetailEdit", false);
            oModel.setProperty("/isFormEnabled", false);

            sap.m.MessageToast.show("Condiciones comerciales actualizadas.");
        },
        onSelectRadioComprobante: function (oEvent) {
            if (!oEvent.getParameter("selected")) return;
            const oModel = this.getView().getModel("oModelProyect");
            const oSource = oEvent.getSource();
            const sText = oSource.getText();
            let sValor = "";
            switch (sText) {
                case this.getResourceBundle().getText("txtClientCollet"): sValor = "1"; break;
                case this.getResourceBundle().getText("txtDirectDispatch"): sValor = "2"; break;
                case this.getResourceBundle().getText("txtDispatchAgency"): sValor = "3"; break;
            }
            const sPrevTipo = oModel.getProperty("/inputForm/tipoEntrega");
            oModel.setProperty("/inputForm/tipoEntrega", sValor);

            if (sPrevTipo && sPrevTipo !== sValor) {
                oModel.setProperty("/inputForm/transporte", "");
                oModel.setProperty("/inputForm/transporteText", "");
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/agenciaFullText", "");
                oModel.setProperty("/oAgenciasClienteFiltradas", []);
            }

            this._updateResumenEntrega();
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
            this._applyContainsFilterToCombo("inputTransporteDetail");
            this._applyContainsFilterToCombo("cbDireccionAgenciaDetail");
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

        _syncAgenciasFiltradasPorTransporte: function (sCarrierParam) {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return [];
            }

            const sCarrier = String(
                sCarrierParam !== undefined
                    ? sCarrierParam
                    : (oModel.getProperty("/inputForm/transporte") || "")
            ).trim();

            const aAll = oModel.getProperty("/oAgenciasCliente") || [];
            let aFiltered = [];

            if (sCarrier) {
                aFiltered = aAll.filter(function (row) {
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
            }

            oModel.setProperty("/oAgenciasClienteFiltradas", aFiltered);
            return aFiltered;
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
                    const aExact = aTransportes.filter(function (row) {
                        const sCarrier = String(row.Carrier || "").trim();
                        const sName = String(row.Name1 || "").trim();
                        const sFull = [sName, sCarrier].filter(Boolean).join(" - ");

                        return fnNorm(sCarrier) === sNeedle ||
                            fnNorm(sName) === sNeedle ||
                            fnNorm(sFull) === sNeedle;
                    });

                    if (aExact.length === 1) {
                        oMatch = aExact[0];
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

                const oComboAgencia = this.byId("cbDireccionAgenciaDetail");
                if (oComboAgencia) {
                    oComboAgencia.setSelectedKey("");
                    oComboAgencia.setValue("");
                }

                this._syncAgenciasFiltradasPorTransporte(sCarrier);
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
        onSelectTransporte: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oItem = oEvent.getParameter("selectedItem");

            if (!oItem) {
                oModel.setProperty("/inputForm/transporte", "");
                oModel.setProperty("/inputForm/transporteText", "");
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                this._updateResumenEntrega();
                return;
            }

            const sKey = String(oItem.getKey() || "").trim();
            const sText = String(oItem.getText() || "").trim();
            const sTransporteAnterior = String(oModel.getProperty("/inputForm/transporte") || "").trim();

            oModel.setProperty("/inputForm/transporte", sKey);
            oModel.setProperty("/inputForm/transporteText", sText);

            if (sTransporteAnterior !== sKey) {
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");

                const oComboAgencia = this.byId("cbDireccionAgenciaDetail");
                if (oComboAgencia) {
                    oComboAgencia.setSelectedKey("");
                    oComboAgencia.setValue("");
                }
            }

            this._updateResumenEntrega();
        },
        onSelectDireccionAgencia: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oItem = oEvent.getParameter("selectedItem");

            if (!oItem) {
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                this._updateResumenEntrega();
                return;
            }

            const sKey = String(oItem.getKey() || "").trim();
            const sAddrText = String(oItem.getText() || "").trim();
            const sAgencyName = String(oItem.getAdditionalText() || "").trim();

            oModel.setProperty("/inputForm/direccionAgencia", sKey);
            oModel.setProperty("/inputForm/direccionAgenciaAddrText", sAddrText);
            oModel.setProperty("/inputForm/direccionAgenciaText", sAgencyName);

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
        onSelectMoneda: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const aMonedas = this.getView().getModel("oModelData").getProperty("/oTipMoney") || [];
            const oItem = oEvent.getParameter("selectedItem");
            if (!oItem) {
                const oUSD = aMonedas.find(m => m.sKey === "USD");
                oModel.setProperty("/inputForm/moneda", "USD");
                oModel.setProperty("/inputForm/monedaText", oUSD ? oUSD.sText : "USD");
                return;
            }
            const sKey = oItem.getKey();
            const sText = oItem.getText();
            oModel.setProperty("/inputForm/moneda", sKey);
            oModel.setProperty("/inputForm/monedaText", sText);
        },
        onSelectCondPago: function (oEvent) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectedItem = oEvent.getParameter("selectedItem");

            if (oSelectedItem) {
                const sKey = oSelectedItem.getKey();
                const sText = oSelectedItem.getText();

                // Guardamos ambos valores
                oModelProyect.setProperty("/inputForm/cbCondPago", sKey);
                oModelProyect.setProperty("/inputForm/txtCondPago", sText);
            }
        },
        _validateRequiredFields: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oData = oModel.getProperty("/inputForm") || {};
            const aErrors = [];

            if (!oData.tipDocument) {
                aErrors.push("Debe seleccionar el tipo de documento");
            }

            let sCondPago = oData.cbCondPago;
            if (!sCondPago || sCondPago.trim() === "") {
                sCondPago = (oModel.getProperty("/oClientData/vtext") || "").trim();
            }

            if (!sCondPago) {
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

            const bSedeFinalDiferente = !!oData.sedeFinalDiferente;
            if (bSedeFinalDiferente) {
                if (!oData.destinoFinal || oData.destinoFinal.trim() === "") {
                    aErrors.push("Debe ingresar el destino final");
                }
            }

            if (aErrors.length > 0) {
                const sFormattedText = aErrors.map(msg => "• " + msg).join("\n");

                sap.m.MessageBox.error(sFormattedText, {
                    title: "Campos requeridos incompletos",
                    icon: sap.m.MessageBox.Icon.ERROR
                });

                return false;
            }
            oModel.setProperty("/inputForm", oData);
            return true;
        },
        _syncEntregaEditData: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            if (!oModel) {
                return;
            }

            const oInputForm = oModel.getProperty("/inputForm") || {};
            const aAgencias = oModel.getProperty("/oAgenciasCliente") || [];
            const aTransportes = oModelData ? (oModelData.getProperty("/oTrasport") || []) : [];

            const sCarrier = String(oInputForm.transporte || "").trim();
            const sAgencia = String(oInputForm.direccionAgencia || "").trim();

            if (sCarrier && !oInputForm.transporteText) {
                const oTransporte = aTransportes.find(function (row) {
                    return String(row.Carrier || "").trim() === sCarrier;
                });

                if (oTransporte) {
                    oModel.setProperty("/inputForm/transporteText", String(oTransporte.Name1 || "").trim());
                }
            }

            this._syncAgenciasFiltradasPorTransporte(sCarrier);

            if (sAgencia) {
                const aAgenciasFiltradas = oModel.getProperty("/oAgenciasClienteFiltradas") || [];
                const oAgencia = aAgenciasFiltradas.find(function (row) {
                    return String(row.Customer || "").trim() === sAgencia;
                }) || aAgencias.find(function (row) {
                    return String(row.Customer || "").trim() === sAgencia;
                });

                if (oAgencia) {
                    oModel.setProperty("/inputForm/direccionAgenciaText", String(oAgencia.Agencyname || "").trim());
                    oModel.setProperty("/inputForm/direccionAgenciaAddrText", String(oAgencia.Agencyaddress || "").trim());
                }
            }

            this._updateResumenEntrega();
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
                //if (sDetalle) sResumen += " - " + sDetalle;
            }

            if (sTipo === "2") {
                const sTrans = (oInputForm.transporteText || "").trim();
                //if (sTrans) sResumen += " - ";
                // if (sDetalle) sResumen += " / " + sDetalle;
            }

            if (sTipo === "3") {
                const sAgenciaRS = (oInputForm.direccionAgenciaText || "").trim();
                if (sAgenciaRS) sResumen += " - " + sAgenciaRS;
                if (sDetalle) sResumen += " / " + sDetalle;
            }
            oModel.setProperty("/inputForm/resumenEntrega", sResumen);
            oModel.setProperty("/inputForm/detalleEntrega", sDetalle);
            if (sTipo !== "2" && sTipo !== "3") {
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
            }

            oModel.refresh(true);
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
        onUpdateFinishedQuimicos: function (oEvent) {
            var oTable = oEvent.getSource();
            var aItems = oTable.getItems();

            aItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("oModelProyect");
                if (oCtx) {
                    var iTxt5 = oCtx.getProperty("Clabs");
                    if (parseInt(iTxt5, 10) === 0) {
                        oItem.addStyleClass("myPlomText");
                    } else {
                        oItem.removeStyleClass("myPlomText");
                    }
                }

            });
        },
        onLiveChangeDescuentoManual: function (oEvent) {
            const oInput = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");

            // texto en vivo
            let sRaw = (oEvent.getParameter("newValue") ?? oInput.getValue() ?? "").toString();
            sRaw = sRaw.replace(/,/g, ".");
            sRaw = sRaw.replace(/[^0-9.]/g, "");
            const iDot = sRaw.indexOf(".");
            if (iDot !== -1) {
                sRaw = sRaw.slice(0, iDot + 1) + sRaw.slice(iDot + 1).replace(/\./g, "");
            }

            // guardar crudo
            oModel.setProperty("/oSelecTableDetalle/DescuentoManual", sRaw);

            const fValor = parseFloat(sRaw);

            // vacío / inválido / <=0 => liberar bloqueo
            if (!isFinite(fValor) || fValor <= 0) {
                oModel.setProperty("/oSelecTableDetalle/tieneDescuentoManual", false);
                return;
            }

            // ✅ Exclusión mutua: al digitar descuento, bloquear precio manual
            oModel.setProperty("/oSelecTableDetalle/tieneDescuentoManual", true);
            oModel.setProperty("/oSelecTableDetalle/usarPrecioManual", false);

            // limpiar precio manual (modelo + UI)
            oModel.setProperty("/oSelecTableDetalle/prlistDraft", "");
            oModel.setProperty("/oSelecTableDetalle/_pendientePrecioManual", false);

            const oInpPrecio = this.byId("inpPrecioManual") || sap.ui.getCore().byId("inpPrecioManual");
            if (oInpPrecio) {
                oInpPrecio.setValue("");
                oInpPrecio.setValueState("None");
                oInpPrecio.setValueStateText("");
            }
        },
        _resetSearchResultsOnly: function (bClearResults) {
            const oView = this.getView();
            const oModelP = oView.getModel("oModelProyect");

            // ✅ Por defecto NO limpiar resultados (para búsqueda incremental)
            if (bClearResults === true) {
                oModelP.setProperty("/oMaterialSelect", []);
                oModelP.setProperty("/oMaterialBase", []);
            }

            // ✅ SIEMPRE limpiar filtros/selección visual del binding (esto NO borra datos)
            const sTableId = this.frgIdAddManualProduct + "--tbMaterialesManual";
            const oTable = sap.ui.getCore().byId(sTableId) || oView.byId(sTableId);

            if (oTable) {
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.filter([]);
                    oBinding.refresh(true);
                } else {
                    oTable.removeAllItems();
                }
                if (oTable.removeSelections) {
                    oTable.removeSelections(true);
                }
            }

            oModelP.refresh(true);
        },
        _syncFiltersFromUI: function () {
            const oView = this.getView();
            const oModelP = oView.getModel("oModelProyect");

            const oSel = oModelP.getProperty("/oSelectDetail") || {};

            const oMiMat = sap.ui.getCore().byId(this.frgIdAddManualProduct + "--miMaterial") || oView.byId("miMaterial");
            const oMiDesc = sap.ui.getCore().byId(this.frgIdAddManualProduct + "--miDescription") || oView.byId("miDescription");

            const tokensToKeys = (oCtrl) => {
                if (!oCtrl || !oCtrl.getTokens) return [];
                return (oCtrl.getTokens() || [])
                    .map(t => (t.getKey() || t.getText() || "").toString().trim())
                    .filter(Boolean);
            };

            // ✅ estos dos SIEMPRE deben reflejar tokens actuales
            oSel.aMaterials = tokensToKeys(oMiMat);
            oSel.material = oSel.aMaterials.length ? oSel.aMaterials[oSel.aMaterials.length - 1] : "";

            // ✅ en miDescription tu key = Material (código)
            oSel.aDescriptions = tokensToKeys(oMiDesc);
            oSel.Description = oSel.aDescriptions.length ? oSel.aDescriptions[oSel.aDescriptions.length - 1] : "";

            oModelP.setProperty("/oSelectDetail", oSel);
        },
        _getMaterialTaxClassification: function (oMat) {
            return String(
                oMat?.TaxClasification ??
                oMat?.Taxclassification ??
                oMat?.TaxClassification ??
                oMat?.Taxclassification ??
                ""
            ).trim();
        },
        _applyTaxClassificationRuleToRows: function (aRows, aBaseRows) {
            const aSafeRows = Array.isArray(aRows) ? aRows : [];
            const aSafeBase = Array.isArray(aBaseRows) ? aBaseRows : [];

            const getTax = (oRow) => String(this._getMaterialTaxClassification(oRow) || "").trim();

            const aAfecto = [];
            const aNoAfecto = [];
            const aSinClasificacion = [];

            aSafeRows.forEach(oRow => {
                const sTax = getTax(oRow);

                if (sTax === "1") {
                    aAfecto.push(oRow);
                } else if (sTax === "0") {
                    aNoAfecto.push(oRow);
                } else {
                    aSinClasificacion.push(oRow);
                }
            });

            const aBaseTaxes = aSafeBase
                .map(getTax)
                .filter(s => s === "1" || s === "0");

            const sBaseTax = aBaseTaxes.length ? aBaseTaxes[0] : "";

            const formatRow = (oRow) => {
                const sMat = (oRow.Matnr || oRow.Material || "").toString().trim();
                const sDesc = (oRow.Maktx || oRow.Description || oRow.Descriptions || "").toString().trim();
                return `${sMat} - ${sDesc}`.trim();
            };

            const aExcludedNoIgv = [];
            const aExcludedInvalid = Array.from(new Set(aSinClasificacion.map(formatRow).filter(Boolean)));
            let aRowsValidas = [];

            if (sBaseTax === "1") {
                aRowsValidas = aAfecto;
                aExcludedNoIgv.push(...aNoAfecto.map(formatRow));
            } else if (sBaseTax === "0") {
                aRowsValidas = aNoAfecto;
                aExcludedNoIgv.push(...aAfecto.map(formatRow));
            } else {
                const bHayAfecto = aAfecto.length > 0;
                const bHayNoAfecto = aNoAfecto.length > 0;

                if (bHayAfecto && bHayNoAfecto) {
                    aRowsValidas = aAfecto;
                    aExcludedNoIgv.push(...aNoAfecto.map(formatRow));
                } else if (bHayAfecto) {
                    aRowsValidas = aAfecto;
                } else if (bHayNoAfecto) {
                    aRowsValidas = aNoAfecto;
                }
            }

            return {
                rows: aRowsValidas,
                excludedNoIgv: Array.from(new Set(aExcludedNoIgv.filter(Boolean))),
                excludedInvalid: aExcludedInvalid
            };
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
                            oResp.oResults = that._extractODataArray(
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

        _extractODataArray: function (vData) {
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

                if (["ZPRE", "ZRFN", "ZRFM", "ZRF0"].includes(sCondType)) {
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

            if (["ZPRE", "ZRFN", "ZRFM", "ZRF0"].includes(sCondType)) {
                return false;
            }

            if (
                sDscPriceCondition.indexOf("FLETE") >= 0 ||
                sDscClassification.indexOf("FLETE") >= 0
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

        _getConditionAmount: function (oCond) {
            const vAmount = oCond && oCond.Condvalue !== undefined
                ? oCond.Condvalue
                : oCond && oCond.CondValue !== undefined
                    ? oCond.CondValue
                    : 0;

            return this._parseCantidadSAP(vAmount);
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

        _simulateOnlyForConditions: function (oPayload) {
            const oModelEntity = this.getView().getModel("oModelEntity");
            return new Promise((resolve, reject) => {
                oModelEntity.create("/iHeaderSet", oPayload, {
                    success: (oResp) => {
                        const aCond1 = oResp.toConditions?.results || [];
                        const aCond2 = oResp.toConditionEx?.results || [];
                        resolve([...(aCond1 || []), ...(aCond2 || [])]);
                    },
                    error: reject
                });
            });
        },

        onVHMaterial: async function () {
            if (!this._oVHMaterial) {
                this._oVHMaterial = await sap.ui.core.Fragment.load({
                    id: this.getView().getId(),               // ✅ prefijo único
                    name: "com.aris.registropedido.quimico.pe.view.fragments.VHMaterial",
                    controller: this
                });
                this.getView().addDependent(this._oVHMaterial);
            }
            this._oVHMaterial.open();
        },

        onVHDescription: async function () {
            if (!this._oVHDescription) {
                this._oVHDescription = await sap.ui.core.Fragment.load({
                    id: this.getView().getId(),               // ✅ prefijo único
                    name: "com.aris.registropedido.quimico.pe.view.fragments.VHDescription",
                    controller: this
                });
                this.getView().addDependent(this._oVHDescription);
            }
            this._oVHDescription.open();
        },

        onVHMaterialSearch: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oBinding = oEvent.getSource().getBinding("items");
            const aFilters = [];

            if (sValue) {
                aFilters.push(new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.Contains, sValue),
                        new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oBinding.filter(aFilters);
        },

        onVHDescriptionSearch: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oBinding = oEvent.getSource().getBinding("items");
            const aFilters = [];

            if (sValue) {
                aFilters.push(new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sValue),
                        new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oBinding.filter(aFilters);
        },

        onVHMaterialConfirm: function (oEvent) {
            const oSD = oEvent.getSource();
            const aItems = oEvent.getParameter("selectedItems") || [];

            const oMI = sap.ui.core.Fragment.byId(this.frgIdAddManualProduct, "miMaterial");
            if (!oMI) return;

            oMI.removeAllTokens();
            aItems.forEach(oItem => {
                const oCtx = oItem.getBindingContext("oModelData");
                const sMat = oCtx.getProperty("Material");
                const sDes = oCtx.getProperty("Description");
                oMI.addToken(new sap.m.Token({ key: sMat, text: `${sMat} - ${sDes}` }));
            });

            this.onMaterialTokenUpdate({ getSource: () => oMI });

            // ✅ limpiar y cerrar
            this._clearSelectDialogSelection(oSD);
            oSD.close();
        },

        onVHDescriptionConfirm: function (oEvent) {
            const oSD = oEvent.getSource();
            const aItems = oEvent.getParameter("selectedItems") || [];

            const oMI = sap.ui.core.Fragment.byId(this.frgIdAddManualProduct, "miDescription");
            if (!oMI) return;

            oMI.removeAllTokens();
            aItems.forEach(oItem => {
                const oCtx = oItem.getBindingContext("oModelData");
                const sMat = oCtx.getProperty("Material");
                const sDes = oCtx.getProperty("Description");
                oMI.addToken(new sap.m.Token({ key: sMat, text: sDes }));
            });

            this.onDescriptionTokenUpdate({ getSource: () => oMI });

            // ✅ limpiar y cerrar
            this._clearSelectDialogSelection(oSD);
            oSD.close();
        },

        onVHClose: function (oEvent) {
            const oSD = oEvent.getSource();   // ✅ este es el SelectDialog
            if (!oSD || !oSD.close) return;

            // limpiar selección si quieres
            if (oSD.removeSelections) oSD.removeSelections(true);

            // limpiar filtro/búsqueda si quieres
            const oBinding = oSD.getBinding("items");
            if (oBinding) oBinding.filter([]);

            oSD.close();
        },
        _clearSelectDialogSelection: function (oSD) {
            if (!oSD) return;

            // 0) lista interna del SelectDialog
            const oList = oSD._oList || oSD.getAggregation && oSD.getAggregation("_list");

            // 1) quitar selección desde la LISTA (lo más importante)
            if (oList && oList.removeSelections) {
                oList.removeSelections(true);
            }

            // 2) por si quedaron flags en los items
            const aItems = (oSD.getItems && oSD.getItems()) || [];
            aItems.forEach(it => {
                if (it && it.setSelected) it.setSelected(false);
            });

            // 3) limpiar búsqueda del SearchField interno
            if (oSD._oSearchField && oSD._oSearchField.setValue) {
                oSD._oSearchField.setValue("");
            }
            // (algunas versiones exponen setValue en el dialog)
            if (oSD.setValue) {
                oSD.setValue("");
            }

            // 4) limpiar filtros del binding
            const oBinding = oSD.getBinding && oSD.getBinding("items");
            if (oBinding) {
                oBinding.filter([]);
                oBinding.refresh(true);
            }

            // 5) reset internos (por si sigue “pegado”)
            if (oSD._oSelectedItems) oSD._oSelectedItems = {};
            if (oSD._aSelectedItems) oSD._aSelectedItems = [];

            // 6) forzar refresh del contador "Seleccionado: n"
            if (typeof oSD._updateSelectionIndicator === "function") {
                oSD._updateSelectionIndicator();
            }
        },

        _mergeMaterialSelect: function (aIncoming) {
            const oModelP = this.getView().getModel("oModelProyect");
            const aCurrent = oModelP.getProperty("/oMaterialSelect") || [];

            const norm = (v) => (v || "").toString().trim();

            // Mapa por Matnr
            const m = new Map();
            aCurrent.forEach(r => {
                const k = norm(r.Matnr || r.Material);
                if (k) m.set(k, r);
            });

            // append/merge
            (aIncoming || []).forEach(nw => {
                const k = norm(nw.Matnr || nw.Material);
                if (!k) return;

                const old = m.get(k);
                if (old) {
                    // ✅ ya existe: NO duplicar y NO perder cantidad
                    const keepQty = old.cantidad;
                    const keepState = old.state;
                    const keepIcon = old.icon;

                    // actualiza info nueva (stock, desc, etc.)
                    old.Maktx = nw.Maktx ?? old.Maktx;
                    old.Meins = nw.Meins ?? old.Meins;
                    old.Charg = nw.Charg ?? old.Charg;
                    old.Clabs = nw.Clabs ?? old.Clabs;
                    old.Stockf = nw.Stockf ?? old.Stockf;
                    old.TaxClasification = nw.TaxClasification ?? old.TaxClasification;

                    // restaura edición
                    old.cantidad = keepQty;
                    old.state = keepState;
                    old.icon = keepIcon;

                } else {
                    // ✅ nuevo: al final
                    m.set(k, Object.assign({
                        cantidad: "",
                        state: "None",
                        icon: ""
                    }, nw));
                }
            });

            // conservar orden actual y anexar lo nuevo al final
            const aOut = [];
            const used = new Set();

            aCurrent.forEach(r => {
                const k = norm(r.Matnr || r.Material);
                if (k && m.has(k)) {
                    aOut.push(m.get(k));
                    used.add(k);
                }
            });

            // lo nuevo que no estaba antes
            for (const [k, v] of m.entries()) {
                if (!used.has(k)) aOut.push(v);
            }

            oModelP.setProperty("/oMaterialSelect", aOut);
            oModelP.setProperty("/oTreeCer", aOut); // si lo usas igual
            oModelP.refresh(true);
        },
        _recalcTotalPeso: function () {
            const oM = this.getView().getModel("oModelProyect");
            if (!oM) return;

            const aItems = oM.getProperty("/oMaterialUI") || [];

            const toNum = (v) => {
                if (v === null || v === undefined || v === "") return 0;
                const s = String(v).trim().replace(",", ".");
                const n = parseFloat(s);
                return isFinite(n) ? n : 0;
            };

            const total = aItems.reduce((acc, it) => acc + toNum(it.Peso), 0);

            const oDatCalculo = oM.getProperty("/oDatCalculo") || {};
            oM.setProperty("/oDatCalculo", {
                ...oDatCalculo,
                totalPeso: total.toFixed(3)
            });

            oM.refresh(true);
        },
        _setMaterialesBusy: function (bBusy) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            if (!oModelProyect) return;

            if (!oModelProyect.getProperty("/ui")) {
                oModelProyect.setProperty("/ui", {});
            }

            oModelProyect.setProperty("/ui/materialesBusy", !!bBusy);
            oModelProyect.refresh(true);
        },
        _getTaxClassificationForSelectedMaterials: function (aRows) {
            const that = this;

            return new Promise((resolve, reject) => {
                try {
                    let sUrl;
                    if (that.local) {
                        sUrl = that.getOwnerComponent().getManifestObject()
                            .resolveUri("/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/");
                    } else {
                        sUrl = jQuery.sap.getModulePath(that.route)
                            + "/S4HANA_Materials/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/";
                    }

                    const oModel = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                        useBatch: false,
                        defaultBindingMode: "TwoWay"
                    });

                    const aMaterials = Array.from(new Set(
                        (aRows || [])
                            .map(r => String(r.Matnr || r.Material || "").trim())
                            .filter(Boolean)
                    ));

                    if (!aMaterials.length) {
                        resolve([]);
                        return;
                    }

                    const aMatFilters = aMaterials.map(sMat =>
                        new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, sMat)
                    );

                    oModel.read("/MaterialsConsultation", {
                        filters: [
                            new sap.ui.model.Filter({
                                filters: aMatFilters,
                                and: false
                            })
                        ],
                        success: function (oData) {
                            resolve(oData.results || []);
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
        _showPendingExcludedNoIgvMessage: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const aExcluded = oModelProyect.getProperty("/ui/pendingExcludedNoIgv") || [];

            void 0;

            if (!Array.isArray(aExcluded) || !aExcluded.length) {
                return;
            }

            const sMsg =
                "Estos materiales:\n\n" +
                aExcluded.map(function (sMat) {
                    return "• " + sMat;
                }).join("\n") +
                "\n\nno fueron agregados a la tabla por ser inafectos a IGV.";

            oModelProyect.setProperty("/ui/pendingExcludedNoIgv", []);

            sap.ui.getCore().applyChanges();

            setTimeout(function () {
                sap.m.MessageBox.warning(sMsg, {
                    title: "Materiales inafectos a IGV"
                });
            }, 300);
        },
        _parseCantidadSAP: function (v) {
            if (v === null || v === undefined || v === "") {
                return 0;
            }

            if (typeof v === "number") {
                return isNaN(v) ? 0 : v;
            }

            let s = String(v).trim().replace(/\s/g, "");

            if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
                const iComma = s.lastIndexOf(",");
                const iDot = s.lastIndexOf(".");

                if (iComma < iDot) {
                    // 1,000.00
                    s = s.replace(/,/g, "");
                } else {
                    // 1.000,00
                    s = s.replace(/\./g, "").replace(",", ".");
                }
            } else if (s.indexOf(",") > -1) {
                // 1000,00
                s = s.replace(",", ".");
            }

            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
        },


    });
});
