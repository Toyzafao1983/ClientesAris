sap.ui.define([
    "com/aris/registropedido/ceramicos/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "com/aris/registropedido/ceramicos/pe/model/models",
    "com/aris/registropedido/ceramicos/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    '../util/util',
    '../util/utilUI',
    "com/aris/registropedido/ceramicos/pe/services/Services"
], (BaseController, Controller, models, Formatter, JSONModel, util, utilUI, Services) => {
    "use strict";

    var that;
    formatter: Formatter;
    return BaseController.extend("com.aris.registropedido.ceramicos.pe.controller.Detail", {
        onInit() {
            that = this;
            const oModelProyect = this.getOwnerComponent().getModel("oModelProyect");
            this.getView().setModel(oModelProyect, "oModelProyect");
            const oModelUser = this.getOwnerComponent().getModel("oModelUser");
            this.getView().setModel(oModelUser, "oModelUser");
            const bus = sap.ui.getCore().getEventBus();
            bus.subscribe("AddManualProduct", "MaterialSelected", this._onManualProductAdded, this);
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("Detail").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
            const sUserData = localStorage.getItem("oModelUser");
            if (sUserData) {
                const oUserData = JSON.parse(sUserData);
                const oModelUser = new sap.ui.model.json.JSONModel(oUserData);
                this.getView().setModel(oModelUser, "oModelUser");
            }
            const oModelDevice = this.getOwnerComponent().getModel("oModelDevice");
            this.getView().setModel(oModelDevice, "oModelDevice");
            that.frgIdEditClient = "frgIdEditClient";
            that.frgIdAddProduct = "frgIdAddProduct";
            that.frgIdAddManualProduct = "frgIdAddManualProduct";
            that.frgIdAddManualProductClient = "frgIdAddManualProductClient";
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
            Promise.all([that._getPrueba(), that._getDatClient(sCustomer),
            that._getMaterialStock(), that._getClientPet(sCustomer),
            that._getTipChangeData(), that._getUsers(), that._getBPVendedor(),
            that._getDescriptionMaterial(), that._getTipMaterialData(),
            that._getAddresTravel(sCustomer), that._getDatClientView(sCustomer),
            that._getCOnditionPay(), that._getAnticipo(sCustomer, sCurrency),
            that._getNotaCredito(sCustomer, sCurrency),
            ]).then(async (values) => {
                let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");
                that._validateAccessToPortal(values);
                if (this._updateResumenEntrega) {
                    this._updateResumenEntrega();
                }
                that.oModelProyect.setProperty("/isFormEnabled", false);
                that.oModelProyect.setProperty("/isDetailEdit", false);
                const oMaterialResp = values[2];
                if (oMaterialResp && oMaterialResp.sEstado === "S") {
                    that.oModelData.setProperty("/ListBrandCodes", oMaterialResp.aBrands || []);
                }
                let aMateriales = oMaterialResp.oResults || [];
                let aDescriptions = oMaterialResp.aDescriptions || [];
                that.oModelData.setProperty("/oFilterMaterial", aMateriales);
                that.oModelData.setProperty("/ListDescription", aDescriptions);
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
                that.oModelData.setProperty("/ListBrandSug", oBrandResp.oResults || []);
                const oMatGroupResp = values[8];
                that.oModelData.setProperty("/oMaterialGroup", oMatGroupResp.oResults || []);
                let aRaw = values[9].oResults || [];
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
                let aClientData = values[10].oResults || [];
                let aClientDataFilter = aClientData.filter(item => item.Customer === sCustomer);

                if (aClientDataFilter.length > 0) {
                    that.oModelProyect.setProperty("/oClientData", aClientDataFilter[0]);
                } else {
                    that.oModelProyect.setProperty("/oClientData", {});
                }
                that.oModelData.setProperty("/oConditionPay", values[11].oResults);

                const oAnticipoResp = values[12];
                const oNotaCreditoResp = values[13];

                const sSalesOrgNC = "1130";
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
                that._ensureCondicionPagoClienteEnLista();
                that._setDefaultCondicionPago();
                that.oModelProyect.getProperty("/oDetalle");
                that.oModelProyect.getProperty("/oFormCliente");
                that.oModelProyect.getProperty("/oSelectDetail");
                if (!that.oModelProyect.getProperty("/oSelectDetail")) {
                    that.oModelProyect.setProperty("/oSelectDetail", {
                        material: "",
                        Description: "",
                        grupoMaterial: "",
                        Brand: "",
                        Formato: "",
                        Calidad: "",
                        Estilo: ""

                    });
                }
                if (bInit && !that.oModelProyect.getProperty("/oMaterial")) {
                    that.oModelProyect.setProperty("/oMaterial", []);
                }
                await that._initMaterialFromReferencia();
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
                // Usuario IAS
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
                // Atributos IAS
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

                //CASO CLIENTE
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

                //CASO VENDEDOR / COORDINADOR
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
                sap.ui.core.BusyIndicator.hide(0);
                oRouter.navTo("AccessDenied");

            } catch (oError) {
                sap.ui.core.BusyIndicator.hide(0);
                const oRouter = sap.ui.core.UIComponent.getRouterFor(that);
                oRouter.navTo("AccessDenied");
            }
        },

        // Llamada de anticipos y nota de credito
        _ensureCondicionPagoClienteEnLista: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");
            if (!oModelProyect || !oModelData) return;

            const oClientData = oModelProyect.getProperty("/oClientData") || {};
            const sKey = (oClientData.zterm || "").trim();
            const sText = (oClientData.vtext || "").trim();
            if (!sKey || !sText) return;

            const aCond = oModelData.getProperty("/oConditionPay") || [];
            const bExiste = aCond.some(c => (c.Conditionn || "").trim() === sKey);

            if (!bExiste) {
                aCond.unshift({ Conditionn: sKey, DesCondition: sText });
                oModelData.setProperty("/oConditionPay", aCond);
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
        // Ejecutar pedido con referencia
        _initMaterialFromReferencia: async function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oModelUser = this.getView().getModel("oModelUser");
            if (!oModel) { return; }

            const aPos = oModel.getProperty("/inputForm/posRefSeleccionadas") || [];
            if (!aPos.length) { return; }

            let aMaterialTech = oModel.getProperty("/oMaterial") || [];
            let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            const oCantidades = oModel.getProperty("/oCantidades") || {};
            const oCantidadesByItm = oModel.getProperty("/oCantidadesByItm") || {};
            const oRefByItm = oModel.getProperty("/oRefByItm") || {};

            const pad6 = (n) => String(n).padStart(6, "0");

            const toNum = (v) => {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const format3 = (v) => toNum(v).toFixed(3);

            const calcM2Referencia = (pos, sUMVBulto, fQtyBulto) => {
                const nQty = toNum(fQtyBulto);
                if (nQty <= 0) {
                    return 0;
                }

                const nFactor = toNum(pos.factorM2Ref);
                if (nFactor > 0) {
                    return nQty * nFactor;
                }

                const nM2Base =
                    toNum(pos.CantidadM2BaseRef) ||
                    toNum(pos.cantidadM2BaseRef) ||
                    toNum(pos.CtdOriginalM2) ||
                    toNum(pos.CtdPendienteM2);

                const nBultoBase = sUMVBulto === "CJ"
                    ? (
                        toNum(pos.NroCajas) ||
                        toNum(pos.Cajas) ||
                        toNum(pos.stockCajas) ||
                        toNum(pos.CtdPendiente)
                    )
                    : (
                        toNum(pos.NroPaletas) ||
                        toNum(pos.Pallets) ||
                        toNum(pos.stockPallets) ||
                        toNum(pos.CtdPendiente)
                    );

                return nM2Base > 0 && nBultoBase > 0
                    ? nQty * (nM2Base / nBultoBase)
                    : 0;
            };

            let iMax = 0;
            aMaterialTech.forEach(it => {
                const n = parseInt(it.ItmNumber, 10);
                if (!isNaN(n) && n > iMax) {
                    iMax = n;
                }
            });

            const nextItm = () => {
                iMax += 10;
                return pad6(iMax);
            };

            const sPlantDefault = oModel.getProperty("/oDatClient/Plant") || "1001";

            const getRefFieldsFromPos = (pos) => {
                return {
                    RefDoc: pos.RefDoc || pos.Vbeln || pos.SalesDocument || "",
                    RefDocIt: pos.RefDocIt || pos.RefItm || pos.Posnr || pos.ItmNumber || "",
                    RefDocCa: pos.RefDocCa || pos.RefDocCat || pos.Vbtyp || ""
                };
            };

            for (const pos of aPos) {
                const sMat = String(pos.Material || "").trim();
                if (!sMat) { continue; }

                const sTipBulto = String(pos.TipBulto || pos.Calidad || pos.Zzcalidad || "").trim();
                const bEsCaja = sTipBulto === "S" || toNum(pos.Cajas || pos.stockCajas || pos.cantidadCajas) > 0;
                const sUMVBulto = bEsCaja ? "CJ" : "PAL";

                const fQtyBulto = toNum(pos.CtdPedido || 0);
                if (fQtyBulto <= 0) { continue; }

                const fQtyM2Dorepe = toNum(
                    pos.OrderQuantity ??
                    pos.orderQuantity ??
                    pos.Orderquantity ??
                    pos.OrderQty ??
                    pos.orderQty ??
                    pos.CantidadM2 ??
                    pos.cantidadM2 ??
                    pos.CtdPedidoM2 ??
                    pos.CtdPendienteM2 ??
                    0
                );

                /*
                 * DorepeItem-OrderQuantity ya viene convertido a M2.
                 * CtdPedido queda como cantidad visual de PAL/CJ.
                 */
                const bTieneOrderQuantity = fQtyM2Dorepe > 0;
                const fQtyM2Calc = calcM2Referencia(pos, sUMVBulto, fQtyBulto);

                let fQtyM2 = bTieneOrderQuantity
                    ? fQtyM2Dorepe
                    : fQtyM2Calc;

                if (fQtyM2 <= 0) {
                    void 0;
                    continue;
                }

                const fFactorM2Ref = fQtyBulto > 0 ? (fQtyM2 / fQtyBulto) : 0;

                /*
                 * Solo se considera convertido si viene de OrderQuantity
                 * o de una conversión real por base M2/bulto.
                 */
                const bM2Convertido = bTieneOrderQuantity || fQtyM2Calc > 0;

                const nPalPedido = sUMVBulto === "PAL" ? fQtyBulto : 0;
                const nCajPedido = sUMVBulto === "CJ" ? fQtyBulto : 0;

                const nPalStock = toNum(pos.Pallets || pos.stockPallets || pos.NroPaletas || nPalPedido);
                const nCajStock = toNum(pos.Cajas || pos.stockCajas || pos.NroCajas || nCajPedido);

                const itm = nextItm();
                const oRef = getRefFieldsFromPos(pos);

                const oTech = {
                    ClienteId: oModel.getProperty("/oDatClient/Customer") || "",
                    ItmNumber: itm,
                    Material: sMat,
                    Plant: sPlantDefault,
                    TargetQu: "M2",
                    Zzcalibre: pos.Calibre || pos.Zzcalibre || "",
                    Zztono: pos.Tono || pos.Zztono || "",
                    Zzcalidad: sTipBulto || pos.Calidad || pos.Zzcalidad || "",
                    RefDoc: oRef.RefDoc || "",
                    RefDocIt: oRef.RefDocIt || "",
                    RefDocCa: oRef.RefDocCa || ""
                };

                const oUI = {
                    ItmNumber: itm,
                    Material: sMat,
                    codigo: sMat,

                    Descripcion: pos.Descripcion || pos.Description || pos.Descriptions || "",
                    descripcion: pos.Descripcion || pos.Description || pos.Descriptions || "",
                    Descriptions: pos.Descripcion || pos.Description || pos.Descriptions || "",

                    Pos: pos.Pos || "",
                    Posicion: pos.Posicion || pos.Pos || pos.RefDocIt || "",

                    Calibre: pos.Calibre || pos.Zzcalibre || "",
                    calibre: pos.Calibre || pos.Zzcalibre || "",
                    Tono: pos.Tono || pos.Zztono || "",
                    tono: pos.Tono || pos.Zztono || "",

                    calidad: sTipBulto || pos.Calidad || pos.Zzcalidad || "",
                    Zzcalidad: sTipBulto || pos.Calidad || pos.Zzcalidad || "",

                    m2Convertido: bM2Convertido,

                    UMV: "M2",
                    TargetQu: "M2",
                    UMVBulto: sUMVBulto,
                    TargetQuBulto: sUMVBulto,

                    cantidad: format3(fQtyM2),
                    Cantidad: format3(fQtyM2),
                    cantidadM2: format3(fQtyM2),

                    cantidadM2BaseEdit: format3(fQtyM2),
                    cantidadPalletsBaseEdit: format3(nPalPedido),
                    cantidadCajasBaseEdit: format3(nCajPedido),
                    factorM2Ref: fFactorM2Ref,
                    factorM2BultoRef: fFactorM2Ref,

                    cantidadPallets: format3(nPalPedido),
                    cantidadCajas: format3(nCajPedido),
                    NroPaletas: format3(nPalPedido),
                    NroCajas: format3(nCajPedido),

                    StockDispo: format3(fQtyM2),

                    Pallets: format3(nPalStock),
                    Cajas: format3(nCajStock),
                    stockPallets: format3(nPalStock),
                    stockCajas: format3(nCajStock),

                    Kbetr: 0,
                    subtotal: 0,
                    descuentos: 0,
                    impuesto: 0,
                    total: 0,
                    descuentoManualPctDisplay: 0,
                    descuentoManualImporte: 0,
                    esBolsa: false,

                    RefDoc: oRef.RefDoc || "",
                    RefDocIt: oRef.RefDocIt || "",
                    RefDocCa: oRef.RefDocCa || ""
                };

                aMaterialTech.push(oTech);
                aMaterialUI.push(oUI);

                oCantidades[sMat] = {
                    Material: sMat,
                    UMV: "M2",
                    TargetQu: "M2",
                    cantidad: format3(fQtyM2),
                    Cantidad: format3(fQtyM2),
                    cantidadM2: format3(fQtyM2),
                    m2Convertido: bM2Convertido,
                    factorM2Ref: fFactorM2Ref,
                    factorM2BultoRef: fFactorM2Ref,
                    cantidadPallets: format3(nPalPedido),
                    cantidadCajas: format3(nCajPedido),
                    NroPaletas: format3(nPalPedido),
                    NroCajas: format3(nCajPedido),
                    UMVBulto: sUMVBulto,
                    TargetQuBulto: sUMVBulto
                };
                oCantidadesByItm[itm] = {
                    Material: sMat,
                    UMV: "M2",
                    TargetQu: "M2",
                    cantidad: format3(fQtyM2),
                    Cantidad: format3(fQtyM2),
                    cantidadM2: format3(fQtyM2),
                    cantidadPallets: format3(nPalPedido),
                    cantidadCajas: format3(nCajPedido),
                    NroPaletas: format3(nPalPedido),
                    NroCajas: format3(nCajPedido),
                    m2Convertido: bM2Convertido,
                    UMVBulto: sUMVBulto,
                    TargetQuBulto: sUMVBulto,
                    factorM2Ref: fFactorM2Ref,
                    factorM2BultoRef: fFactorM2Ref
                };

                oRefByItm[itm] = {
                    RefDoc: oRef.RefDoc || "",
                    RefDocIt: oRef.RefDocIt || "",
                    RefDocCa: oRef.RefDocCa || ""
                };
            }

            oModel.setProperty("/oMaterial", aMaterialTech);
            oModel.setProperty("/oMaterialUI", aMaterialUI);
            oModel.setProperty("/oCantidades", oCantidades);
            oModel.setProperty("/oCantidadesByItm", oCantidadesByItm);
            oModel.setProperty("/oRefByItm", oRefByItm);

            oModel.setProperty("/inputForm/posRefSeleccionadas", []);
            oModel.setProperty("/inputForm/needsInitFromRef", false);
            oModel.refresh(true);

            const bIsCliente =
                !!oModelUser?.getProperty("/bIsCliente") ||
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bRol") === "CLIENTES";

            if (aMaterialTech.length) {
                if (bIsCliente && typeof this.onSimulateOrderCliente === "function") {
                    this.onSimulateOrderCliente();
                } else if (typeof this.onSimulateOrder === "function") {
                    this.onSimulateOrder();
                }
            }
        },
        // confirmacion de orden
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
        // Limpia los filtros
        _resetFiltersAndTableClient: function () {
            const oView = this.getView();
            const oProj = oView.getModel("oModelProyect");

            oProj.setProperty("/oSelectDetail", {
                material: "",
                aMaterials: [],
                Description: "",
                aDescriptions: [],
                grupoMaterial: "",
                Brand: "",
                Formato: "",
                Calidad: "",
                Estilo: "",
                MetrosMin: ""
            });

            oProj.setProperty("/oMaterialSelect", []);
            oProj.setProperty("/oMaterialSelectBase", []);
            oProj.setProperty("/oMaterialBase", []);
            oProj.setProperty("/showTipoFilterClient", false);
            oProj.setProperty("/tipoStockSeleccionadoClient", "TODOS");

            const oMiMat = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "miMaterial");
            const oMiDesc = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "miDescription");

            if (oMiMat) {
                oMiMat.removeAllTokens();
                oMiMat.setValue("");
            }

            if (oMiDesc) {
                oMiDesc.removeAllTokens();
                oMiDesc.setValue("");
            }

            const oCbGrupo = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "cbGrupoMaterialClient");
            const oCbBrand = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "cbBrandClient");
            const oCbFormato = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "cbFormatoClient");
            const oCbCalidad = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "cbCalidadClient");
            const oCbEstilo = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "cbEstiloClient");

            [oCbGrupo, oCbBrand, oCbFormato, oCbCalidad, oCbEstilo].forEach(cb => {
                if (cb) {
                    cb.setSelectedKey("");
                    cb.setValue("");
                }
            });

            const rb4 = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "rbtype4");
            const rb5 = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "rbtype5");
            const rb6 = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "rbtype6");

            if (rb4 && rb5 && rb6) {
                rb4.setSelected(false);
                rb5.setSelected(false);
                rb6.setSelected(true);
            }
            oProj.setProperty("/showTipoFilterClient", false);
            oProj.setProperty("/tipoStockSeleccionadoClient", "TODOS");

            const oTable = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "tblStockCliente2");
            if (oTable) {
                oTable.removeSelections(true);
            }

            oProj.refresh(true);
        },
        onClearFiltersAndTableClient: function () {
            this._resetFiltersAndTableClient();
        },
        _onPressAddProductClient: function () {
            const oView = this.getView();
            let oModelProyect = oView.getModel("oModelProyect");

            if (!oModelProyect) {
                oModelProyect = new sap.ui.model.json.JSONModel(models.createModelProyect());
                oView.setModel(oModelProyect, "oModelProyect");
            }

            oModelProyect.setProperty("/oSelectDetail", {
                material: "",
                aMaterials: [],
                Description: "",
                aDescriptions: [],
                grupoMaterial: "",
                Brand: "",
                Formato: "",
                Calidad: "",
                Estilo: ""
            });
            oModelProyect.setProperty("/oMaterialSelect", []);
            oModelProyect.setProperty("/oMaterialSelectBase", []);
            oModelProyect.setProperty("/showTipoFilterClient", false);
            oModelProyect.setProperty("/tipoStockSeleccionadoClient", "TODOS");
            oModelProyect.refresh(true);
            this.setFragment(
                "_dialogAddManualProductClient",
                this.frgIdAddManualProductClient,
                "AddManualProductClient",
                this
            );
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
            const oMulti = oEvent.getSource();
            const sMat = oItem ? oItem.getKey() : "";

            if (!sMat) {
                return;
            }
            const aTokens = oMulti.getTokens() || [];
            const bExistsToken = aTokens.some(t => t.getKey() === sMat);
            if (!bExistsToken) {
                const sText = oItem.getText(); // "MAT - DESC"
                const oToken = new sap.m.Token({
                    key: sMat,
                    text: sText
                });
                oMulti.addToken(oToken);
            }
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            let aMaterials = oSelectDetail.aMaterials || [];

            if (!aMaterials.includes(sMat)) {
                aMaterials.push(sMat);
            }

            oSelectDetail.aMaterials = aMaterials;
            oSelectDetail.material = sMat;

            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        onMaterialTokenUpdate: function (oEvent) {
            const sType = oEvent.getParameter("type");
            const aTokens = oEvent.getParameter("tokens") || [];

            if (sType !== "removed") {
                return;
            }

            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            let aMaterials = oSelectDetail.aMaterials || [];

            aTokens.forEach(function (oToken) {
                const sKey = oToken.getKey();
                aMaterials = aMaterials.filter(m => m !== sKey);
            });

            oSelectDetail.aMaterials = aMaterials;
            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        onSuggestDescription: function (oEvent) {
            const sValue = oEvent.getParameter("suggestValue") || "";
            const oModelData = this.getView().getModel("oModelData");
            const aFull = oModelData.getProperty("/ListDescription") || [];
            const sSearch = sValue.toUpperCase();

            let aFiltered = aFull.filter(function (v) {
                return (v || "").toUpperCase().includes(sSearch);
            });
            aFiltered = aFiltered.slice(0, 100);
            oModelData.setProperty("/ListDescriptionSug", aFiltered);
        },
        onDescriptionSuggestionSelected: function (oEvent) {
            const oItem = oEvent.getParameter("selectedItem");
            const oMulti = oEvent.getSource();
            const sDesc = oItem ? oItem.getText() : "";

            if (!sDesc) {
                return;
            }
            const aTokens = oMulti.getTokens() || [];
            const bExistsToken = aTokens.some(t => t.getKey() === sDesc);
            if (!bExistsToken) {
                const oToken = new sap.m.Token({
                    key: sDesc,
                    text: sDesc
                });
                oMulti.addToken(oToken);
            }
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            let aDescriptions = oSelectDetail.aDescriptions || [];

            if (!aDescriptions.includes(sDesc)) {
                aDescriptions.push(sDesc);
            }

            oSelectDetail.aDescriptions = aDescriptions;
            oSelectDetail.Description = sDesc;

            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        onDescriptionTokenUpdate: function (oEvent) {
            const sType = oEvent.getParameter("type");
            const aTokens = oEvent.getParameter("tokens") || [];

            if (sType !== "removed") {
                return;
            }

            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            let aDescriptions = oSelectDetail.aDescriptions || [];

            aTokens.forEach(function (oToken) {
                const sKey = oToken.getKey();
                aDescriptions = aDescriptions.filter(d => d !== sKey);
            });

            oSelectDetail.aDescriptions = aDescriptions;
            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        // Buscar Stock
        _getTipoSeleccionado: function () {
            const sFrag = this.frgIdAddManualProductClient;
            const rbCompletos = sap.ui.core.Fragment.byId(sFrag, "rbtype4") || this.byId("rbtype4");
            const rbSaldos = sap.ui.core.Fragment.byId(sFrag, "rbtype5") || this.byId("rbtype5");
            const rbTodos = sap.ui.core.Fragment.byId(sFrag, "rbtype6") || this.byId("rbtype6");

            if (rbCompletos?.getSelected?.()) return "COMPLETOS";
            if (rbSaldos?.getSelected?.()) return "SALDOS";
            if (rbTodos?.getSelected?.()) return "TODOS";
            return "TODOS";
        },

        _applyTipoFilter: function (aData, sTipo) {
            if (!Array.isArray(aData) || !aData.length) {
                return [];
            }
            const toNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            switch (sTipo) {
                case "COMPLETOS":
                    return aData
                        .filter(item => toNum(item.Pallets) > 0)
                        .map(item => Object.assign({}, item, {
                            StockFisico: toNum(item.StockFisicoCompletos)
                        }));
                case "SALDOS":
                    return aData
                        .filter(item => toNum(item.Saldos) > 0)
                        .map(item => Object.assign({}, item, {
                            StockFisico: toNum(item.StockFisicoSaldos)
                        }));

                case "TODOS":
                default:
                    return aData;
            }
        },
        _applyTipoFromMaterialSelectBase: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const sTipo = this._getTipoSeleccionado();
            const aBase = oModelProyect.getProperty("/oMaterialSelectBase") || [];

            oModelProyect.setProperty("/tipoStockSeleccionadoClient", sTipo);
            oModelProyect.setProperty("/oMaterialSelect", this._applyTipoFilter(aBase, sTipo));

            const oTable = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "tblStockCliente2") || this.byId("tblStockCliente2");
            if (oTable) {
                oTable.removeSelections(true);
            }
        },
        onTipoRadioSelectClient: function (oEvent) {
            if (oEvent && oEvent.getParameter && oEvent.getParameter("selected") === false) return;
            this._applyTipoFromMaterialSelectBase();
        },
        _applyMetrajeFilter: function (aData, fMetrosMin) {
            if (!Array.isArray(aData) || !aData.length) {
                return [];
            }
            const nMin = parseFloat(fMetrosMin) || 0;
            if (nMin <= 0) {
                return aData;
            }
            const toNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            return aData.filter(item => toNum(item.StockFisico) >= nMin);
        },
        _runInBatches: async function (aItems, iBatchSize, fn) {
            const aSettledAll = [];
            const iSize = Math.max(1, parseInt(iBatchSize, 10) || 8);

            for (let i = 0; i < aItems.length; i += iSize) {
                await this._yieldToBrowser();
                const aBatch = aItems.slice(i, i + iSize);
                const aSettled = await Promise.allSettled(aBatch.map(fn));
                aSettledAll.push(...aSettled);
            }
            return aSettledAll;
        },
        _yieldToBrowser: function () {
            return new Promise(resolve => setTimeout(resolve, 0));
        },
        // Para Activar el Boton de stock
        onBuscarPress: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            const aFilters = [];

            const oTableCliente =
                sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "tblStockCliente2") ||
                this.byId("tblStockCliente2");

            if (oTableCliente) {
                oTableCliente.removeSelections(true);
            }

            oModelProyect.setProperty("/oMaterialSelect", []);
            oModelProyect.setProperty("/oMaterialSelectBase", []);
            oModelProyect.setProperty("/oMaterialBase", []);

            // Sincronizar SIEMPRE desde lo visible en los MultiInput
            const oMiMat = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "miMaterial");
            const oMiDesc = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "miDescription");

            const aMat = oMiMat
                ? oMiMat.getTokens().map(t => (t.getKey() || "").trim()).filter(Boolean)
                : [];

            const aDesc = oMiDesc
                ? oMiDesc.getTokens().map(t => (t.getKey() || t.getText() || "").trim()).filter(Boolean)
                : [];

            oSelectDetail.aMaterials = aMat;
            oSelectDetail.aDescriptions = aDesc;
            oSelectDetail.material = aMat[0] || "";
            oSelectDetail.Description = aDesc[0] || "";
            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);

            aFilters.push(new sap.ui.model.Filter(
                "DistributionChannel",
                sap.ui.model.FilterOperator.EQ,
                "C1"
            ));

            if (oSelectDetail.grupoMaterial) {
                aFilters.push(new sap.ui.model.Filter(
                    "MaterialGroup",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.grupoMaterial
                ));
            }

            if (aMat.length) {
                const aMatFilters = aMat.map(function (sMat) {
                    return new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, sMat);
                });
                aFilters.push(new sap.ui.model.Filter(aMatFilters, false));
            }

            if (aDesc.length) {
                const aDescFilters = aDesc.map(function (sDesc) {
                    return new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.EQ, sDesc);
                });
                aFilters.push(new sap.ui.model.Filter(aDescFilters, false));
            }

            if (oSelectDetail.Brand) {
                aFilters.push(new sap.ui.model.Filter(
                    "Brand",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.Brand
                ));
            }

            if (oSelectDetail.Formato) {
                aFilters.push(new sap.ui.model.Filter(
                    "Formatt",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.Formato
                ));
            }

            if (oSelectDetail.Calidad) {
                aFilters.push(new sap.ui.model.Filter(
                    "TextileArticleQuality",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.Calidad
                ));
            }

            if (oSelectDetail.Estilo) {
                aFilters.push(new sap.ui.model.Filter(
                    "OrilloStyle",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.Estilo
                ));
            }

            if (aFilters.length === 1) {
                this.getMessageBox("warning", "Debe seleccionar al menos un filtro antes de buscar.");
                return;
            }

            const fMetrosMin = parseFloat(oSelectDetail.MetrosMin || "0") || 0;

            this._loadMateriales(aFilters, fMetrosMin);
        },
        _loadMateriales: function (aFilters, fMetrosMin) {
            const that = this;
            let sUrl;
            try {
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
                    success: async function (oData) {
                        try {
                            const aResults = oData.results || [];
                            if (!aResults.length) {
                                that.getMessageBox("warning", "No se encontraron materiales con los filtros aplicados.");
                                return;
                            }
                            const oProjModel = that.getView().getModel("oModelProyect");
                            oProjModel.setProperty("/oMaterialBase", aResults);
                            oProjModel.setProperty("/oMaterialSelect", []); // limpiar tabla
                            const iBatchSize = 8;
                            const aSettledAll = await that._runInBatches(aResults, iBatchSize, (m) => {
                                const aFiltersStock = [
                                    new sap.ui.model.Filter("Salesorganization", sap.ui.model.FilterOperator.EQ, m.SalesOrganization || "1130"),
                                    new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, "1001"),
                                    new sap.ui.model.Filter("Pedven", sap.ui.model.FilterOperator.EQ, true),
                                    new sap.ui.model.Filter("Materialnumber", sap.ui.model.FilterOperator.EQ, m.Material)
                                ];
                                return that._loadProductoSingle(aFiltersStock);
                            });

                            const aTotalStock = [];
                            aSettledAll.forEach((r, idx) => {
                                const m = aResults[idx];
                                if (r.status === "fulfilled") {

                                    aTotalStock.push(...(r.value || []));
                                }
                            });

                            let aFinal = await that._prepareDataForCeramicos(aTotalStock);

                            aFinal = that._applyMetrajeFilter(aFinal, fMetrosMin);

                            if (!aFinal.length) {
                                that.getMessageBox("warning", "No se encontraron materiales con los filtros aplicados.");
                            }
                            oProjModel.setProperty("/oMaterialSelectBase", aFinal);
                            oProjModel.setProperty("/showTipoFilterClient", true);
                            oProjModel.setProperty("/tipoStockSeleccionadoClient", that._getTipoSeleccionado());
                            oProjModel.setProperty("/oMaterialSelect", that._applyTipoFilter(aFinal, that._getTipoSeleccionado()));
                        } catch (err) {
                            that.getMessageBox("error", "Error consultando stock en paralelo.");
                        } finally {
                            sap.ui.core.BusyIndicator.hide(0);
                        }
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
                        urlParameters: { "$expand": "toStockCeramico" },
                        success: function (oData) {
                            const aResult = (oData.results || []).flatMap(item =>
                                (item.toStockCeramico?.results || []).map(c => ({
                                    Matnr: c.Matnr,
                                    Descripcion: c.Descripcion,
                                    Calibre: c.Calibre || "",
                                    Tono: c.Tono || "",
                                    Um: c.Um || "",
                                    StockFisico: parseFloat(c.StockFisico) || 0,
                                    Pallets: parseFloat(c.Pallets) || 0,
                                    Saldos: parseFloat(c.Saldos) || 0,
                                    Metraje: parseFloat(c.Metraje) || 0
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
        _buildStockKeyForRow: function (oRow) {
            const sMat = (oRow?.Matnr || oRow?.Material || oRow?.codigo || "").trim();
            const sPick = (oRow?.pickLevel || oRow?.__pickLevel || "").trim();
            const bInferParent = !!oRow?.isGroup || sPick === "PARENT";
            if (bInferParent) return sMat;
            const sCal = (oRow?.Calibre || oRow?.calibre || oRow?.Zzcalibre || "").trim();
            const sTon = (oRow?.Tono || oRow?.tono || oRow?.Zztono || "").trim();

            return [sMat, sCal, sTon].join("|");
        },

        _getReservedMapFromPedido: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const aPedido = oModel.getProperty("/oMaterialUI") || [];

            const toNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

            const m = {};
            aPedido.forEach(r => {
                const k = this._buildStockKeyForRow(r);
                if (!k) return;

                if (!m[k]) m[k] = { pal: 0, caj: 0, m2: 0 };

                m[k].pal += toNum(r.cantidadPallets);
                m[k].caj += toNum(r.cantidadCajas);
                m[k].m2 += toNum(r.cantidad);
            });

            return m;
        },
        _prepareDataForCeramicos: async function (aStock) {
            const map = new Map();

            const aSafeStock = Array.isArray(aStock) ? aStock : [];
            for (let i = 0; i < aSafeStock.length; i++) {
                const item = aSafeStock[i];
                const sMatnr = (item?.Matnr || "").trim();
                if (!sMatnr) continue;

                const nStock = parseFloat(item.StockFisico) || 0;
                const nPallets = parseFloat(item.Pallets) || 0;
                const nSaldos = parseFloat(item.Saldos) || 0;
                const nMetraje = parseFloat(item.Metraje) || 0;
                const nStockSaldos = nSaldos > 0
                    ? (nMetraje > 0 ? Math.min(nStock, nSaldos * nMetraje) : (nPallets > 0 ? 0 : nStock))
                    : 0;
                const nStockCompletos = nPallets > 0 ? Math.max(0, nStock - nStockSaldos) : 0;

                const sCalibre = item.Calibre || "";
                const sTono = item.Tono || "";
                const sCalidad = item.Calidad || item.Zzcalidad || "";

                if (!map.has(sMatnr)) {
                    map.set(sMatnr, {
                        Matnr: sMatnr,
                        Descripcion: item.Descripcion || "",
                        Um: item.Um || "",
                        Calibre: sCalibre,
                        Tono: sTono,
                        Calidad: sCalidad,

                        StockFisico: nStock,
                        StockFisicoCompletos: nStockCompletos,
                        StockFisicoSaldos: nStockSaldos,
                        Pallets: nPallets,
                        Saldos: nSaldos,

                        Cantidad: 0,
                        cantidadPallets: 0,
                        cantidadCajas: 0,
                        isGroup: false
                    });
                } else {
                    const acc = map.get(sMatnr);
                    acc.StockFisico += nStock;
                    acc.StockFisicoCompletos += nStockCompletos;
                    acc.StockFisicoSaldos += nStockSaldos;
                    acc.Pallets += nPallets;
                    acc.Saldos += nSaldos;
                    if (!acc.Calibre && sCalibre) acc.Calibre = sCalibre;
                    if (!acc.Tono && sTono) acc.Tono = sTono;
                    if (!acc.Calidad && sCalidad) acc.Calidad = sCalidad;
                    if (!acc.Descripcion && item.Descripcion) acc.Descripcion = item.Descripcion;
                    if (!acc.Um && item.Um) acc.Um = item.Um;
                }
                if (i > 0 && i % 500 === 0) {
                    await this._yieldToBrowser();
                }
            }

            return Array.from(map.values()).map(item => ({
                ...item,
                StockFisico: Number(item.StockFisico.toFixed(2)),
                StockFisicoCompletos: Number(item.StockFisicoCompletos.toFixed(2)),
                StockFisicoSaldos: Number(item.StockFisicoSaldos.toFixed(2)),
                Pallets: Number(item.Pallets.toFixed(2)),
                Saldos: Number(item.Saldos.toFixed(2))
            }));
        },
        // Carga los datos cuando es supervisor o vendedor
        _onManualProductAdded: function (sChannel, sEvent, aSelectedRows) {
            const oModel = this.getView().getModel("oModelProyect");
            const oData = oModel.getData();
            const aMaterialExist = oModel.getProperty("/oMaterial") || [];
            const aScheduleExist = oModel.getProperty("/oSchedule") || [];
            const aMaterialUIExist = oModel.getProperty("/oMaterialUI") || [];
            const oCantByItmExist = oModel.getProperty("/oCantidadesByItm") || {};
            const oCantByItmNew = { ...oCantByItmExist };

            const aMaterialNew = [];
            const aScheduleNew = [];
            const aMaterialUINew = [];

            let lastNum = 0;
            if (aMaterialExist.length > 0) {
                lastNum = Math.max(...aMaterialExist.map(i => parseInt(i.ItmNumber) || 0));
            }

            let iItemCounter = lastNum;
            const nextItm = () => {
                iItemCounter += 10;
                return iItemCounter.toString().padStart(6, "0");
            };

            aSelectedRows.forEach(r => {
                const qPal = parseFloat(r.cantidadPallets) || 0;
                const qCaj = parseFloat(r.cantidadCajas) || 0;
                const sDescripcion = r.Descripcion || "";

                const sPick = (
                    (r.__pickLevel || r.pickLevel || r.PickLevel || (r.isGroup ? "PARENT" : "CHILD") || "").trim()
                ) || "CHILD";
                const nTotalPal = parseFloat(
                    (r.TotalPallets ?? r.Pallets ?? r.stockPallets)
                ) || 0;

                const nTotalCaj = parseFloat(
                    (r.TotalSaldos ?? r.Saldos ?? r.stockCajas)
                ) || 0;
                const aChildren = (Array.isArray(r.children) && r.children.length) ? r.children : undefined;

                if (qPal > 0) {
                    const itm = nextItm();

                    aMaterialNew.push({
                        ClienteId: oData.oDatClient?.Customer || "",
                        ItmNumber: itm,
                        Material: r.Matnr,
                        Plant: "1001",
                        TargetQu: "PAL",
                        Zzcalibre: r.Calibre || "",
                        Zztono: r.Tono || "",
                        Zzcalidad: r.Calidad || ""
                    });

                    aScheduleNew.push({
                        ClientId: oData.oDatClient?.Customer || "",
                        ItmNumber: itm,
                        SchedLine: "0001",
                        ReqQty: qPal.toFixed(3)
                    });

                    aMaterialUINew.push({
                        ItmNumber: itm,
                        Material: r.Matnr,
                        Descripcion: sDescripcion,
                        Calibre: r.Calibre || "",
                        Tono: r.Tono || "",
                        UMV: "PAL",
                        stockPallets: parseFloat(r.Pallets) || 0,
                        stockCajas: parseFloat(r.Saldos) || 0,
                        pickLevel: sPick,
                        __pickLevel: sPick,
                        TotalPallets: (sPick === "PARENT") ? nTotalPal : undefined,
                        TotalSaldos: (sPick === "PARENT") ? nTotalCaj : undefined,
                        children: (sPick === "PARENT") ? aChildren : undefined,
                        cantidadPallets: qPal,
                        cantidadCajas: 0,
                        precioUnit: 0,
                        descuentos: 0,
                        impuesto: 0,
                        subtotal: 0,
                        total: 0
                    });
                    oCantByItmNew[itm] = {
                        Material: r.Matnr,
                        UMV: "PAL",
                        cantidad: qPal.toFixed(3)
                    };
                }

                if (qCaj > 0) {
                    const itm = nextItm();

                    aMaterialNew.push({
                        ClienteId: oData.oDatClient?.Customer || "",
                        ItmNumber: itm,
                        Material: r.Matnr,
                        Plant: "1001",
                        TargetQu: "CJ",
                        Zzcalibre: r.Calibre || "",
                        Zztono: r.Tono || "",
                        Zzcalidad: "S"
                    });

                    aScheduleNew.push({
                        ClientId: oData.oDatClient?.Customer || "",
                        ItmNumber: itm,
                        SchedLine: "0001",
                        ReqQty: qCaj.toFixed(3)
                    });

                    aMaterialUINew.push({
                        ItmNumber: itm,
                        Material: r.Matnr,
                        Descripcion: sDescripcion,
                        Calibre: r.Calibre || "",
                        Tono: r.Tono || "",
                        UMV: "CJ",
                        stockPallets: parseFloat(r.Pallets) || 0,
                        stockCajas: parseFloat(r.Saldos) || 0,
                        pickLevel: sPick,
                        __pickLevel: sPick,
                        TotalPallets: (sPick === "PARENT") ? nTotalPal : undefined,
                        TotalSaldos: (sPick === "PARENT") ? nTotalCaj : undefined,
                        children: (sPick === "PARENT") ? aChildren : undefined,
                        cantidadPallets: 0,
                        cantidadCajas: qCaj,
                        precioUnit: 0,
                        descuentos: 0,
                        impuesto: 0,
                        subtotal: 0,
                        total: 0
                    });
                    oCantByItmNew[itm] = {
                        Material: r.Matnr,
                        UMV: "CJ",
                        cantidad: qCaj.toFixed(3)
                    };
                }
            });

            oModel.setProperty("/oMaterial", [...aMaterialExist, ...aMaterialNew]);
            oModel.setProperty("/oSchedule", [...aScheduleExist, ...aScheduleNew]);
            oModel.setProperty("/oMaterialUI", [...aMaterialUIExist, ...aMaterialUINew]);
            oModel.setProperty("/oCantidadesByItm", oCantByItmNew);
            oModel.refresh(true);
            this.onSimulateOrder();
            sap.m.MessageToast.show("Productos agregados correctamente");
        },
        _onPressAddProduct: function () {
            const oModel = this.getModel("oModelProyect");
            let sCustomer = oModel.getProperty("/oClienteSeleccionado/Customer");
            if (!sCustomer) {
                const oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
                const sHash = oHashChanger.getHash();
                const aParts = sHash.split("/");
                sCustomer = aParts.length > 1 ? aParts[1] : null;
            }

            if (!sCustomer) {
                sap.m.MessageToast.show("No se encontró Customer para continuar");
                return;
            }

            this.getOwnerComponent().getRouter().navTo("AddManualProduct", { app: sCustomer });
        },
        // Calcular El Peso Por fila
        // Calcular el peso por fila usando siempre los M2 reales de la posición
        _calcPesoRow: function (row) {
            const toNum = (v) => {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const sMatnr = String(row.Material || row.codigo || "").trim();

            if (!sMatnr) {
                return Promise.resolve("0.000");
            }

            /*
             * Para el peso NO se debe usar cantidadPallets ni cantidadCajas.
             * El servicio MaterialPesoSet debe recibir:
             * Meins = M2
             * Umv = M2
             * Quantity = cantidad en M2 de la posición
             */
            const nM2 =
                toNum(row.cantidadM2) ||
                toNum(row.Cantidad) ||
                toNum(row.cantidad) ||
                toNum(row.StockDispo);

            if (nM2 <= 0) {
                return Promise.resolve("0.000");
            }

            return this._getPesoFromService(sMatnr, "M2", nM2)
                .then(v => toNum(v).toFixed(3))
                .catch(() => "0.000");
        },

        _isPedidoReferenciaCeramicos: function (aItemsTech, aMaterialUI) {
            const fnTieneReferencia = function (oItem) {
                const sRefDoc = String(oItem?.RefDoc || "").trim();
                const sRefDocIt = String(oItem?.RefDocIt || "").trim();

                /*
                 * Pedido con referencia real debe tener documento y posición.
                 * No usamos solo RefDocCa porque puede aparecer vacío o derivado.
                 */
                return !!(sRefDoc && sRefDocIt);
            };

            return (aItemsTech || []).some(fnTieneReferencia) ||
                (aMaterialUI || []).some(fnTieneReferencia);
        },

        _buildScheduleDefaultCeramicos: function (aItemsTech, aMaterialUI, oCantByItm, sClientId) {
            const toNumber = function (v) {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const mUIByItm = {};
            (aMaterialUI || []).forEach(function (r) {
                const sItm = String(r.ItmNumber || "").padStart(6, "0");
                if (sItm) {
                    mUIByItm[sItm] = r;
                }
            });

            return (aItemsTech || [])
                .map(function (it) {
                    const sItm = String(it.ItmNumber || "").padStart(6, "0");
                    const ui = mUIByItm[sItm] || {};
                    const cant = oCantByItm[sItm] || oCantByItm[it.ItmNumber] || {};
                    const sTarget = String(
                        it.TargetQu ||
                        ui.TargetQu ||
                        ui.UMV ||
                        cant.TargetQu ||
                        cant.UMV ||
                        ""
                    ).trim();

                    let nQty = 0;

                    if (sTarget === "PAL") {
                        nQty =
                            toNumber(cant.cantidad) ||
                            toNumber(ui.cantidadPallets) ||
                            toNumber(ui.NroPaletas) ||
                            toNumber(it.cantidad) ||
                            toNumber(it.ReqQty) ||
                            toNumber(it.TargetQty);
                    } else if (sTarget === "CJ") {
                        nQty =
                            toNumber(cant.cantidad) ||
                            toNumber(ui.cantidadCajas) ||
                            toNumber(ui.NroCajas) ||
                            toNumber(it.cantidad) ||
                            toNumber(it.ReqQty) ||
                            toNumber(it.TargetQty);
                    } else {
                        nQty =
                            toNumber(cant.cantidadM2) ||
                            toNumber(cant.Cantidad) ||
                            toNumber(cant.cantidad) ||
                            toNumber(ui.cantidadM2) ||
                            toNumber(ui.Cantidad) ||
                            toNumber(ui.cantidad) ||
                            toNumber(it.cantidadM2) ||
                            toNumber(it.Cantidad) ||
                            toNumber(it.cantidad) ||
                            toNumber(it.ReqQty) ||
                            toNumber(it.TargetQty);
                    }

                    return {
                        ClientId: sClientId || "",
                        ItmNumber: sItm,
                        SchedLine: "0001",
                        ReqQty: nQty.toFixed(3)
                    };
                })
                .filter(function (s) {
                    return toNumber(s.ReqQty) > 0;
                });
        },

        _getCantidadM2PayloadCeramicos: async function (oArgs) {
            const toNumber = function (v) {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const it = oArgs.it || {};
            const ui = oArgs.ui || {};
            const cant = oArgs.cant || {};

            const sMatnr = String(
                it.Material ||
                ui.Material ||
                ui.codigo ||
                cant.Material ||
                ""
            ).trim();

            const nPal = toNumber(
                cant.cantidadPallets ||
                cant.NroPaletas ||
                ui.cantidadPallets ||
                ui.NroPaletas ||
                it.cantidadPallets ||
                it.NroPaletas
            );

            const nCaj = toNumber(
                cant.cantidadCajas ||
                cant.NroCajas ||
                ui.cantidadCajas ||
                ui.NroCajas ||
                it.cantidadCajas ||
                it.NroCajas
            );

            const sUMVBulto = String(
                cant.UMVBulto ||
                cant.TargetQuBulto ||
                ui.UMVBulto ||
                ui.TargetQuBulto ||
                it.UMVBulto ||
                it.TargetQuBulto ||
                (nPal > 0 ? "PAL" : (nCaj > 0 ? "CJ" : ""))
            ).trim();

            const nFactorM2Ref = toNumber(
                cant.factorM2BultoRef ||
                cant.factorM2Ref ||
                ui.factorM2BultoRef ||
                ui.factorM2Ref ||
                it.factorM2BultoRef ||
                it.factorM2Ref
            );

            const nM2Fallback = toNumber(
                cant.cantidadM2 ||
                cant.Cantidad ||
                cant.cantidad ||
                ui.cantidadM2 ||
                ui.Cantidad ||
                ui.cantidad ||
                it.cantidadM2 ||
                it.Cantidad ||
                it.cantidad ||
                it.ReqQty ||
                it.TargetQty
            );

            const bVieneDeBulto = nPal > 0 || nCaj > 0;
            const bM2Convertido =
                cant.m2Convertido === true ||
                ui.m2Convertido === true ||
                it.m2Convertido === true;

            /*
             * Si viene de DorepeItem, el factor nace de:
             * OrderQuantity M2 / CtdPedido PAL-CJ.
             * Solo usar el factor si el M2 fue realmente convertido.
             */
            if (nFactorM2Ref > 0 && bM2Convertido) {
                if (sUMVBulto === "PAL" && nPal > 0) {
                    return nPal * nFactorM2Ref;
                }

                if (sUMVBulto === "CJ" && nCaj > 0) {
                    return nCaj * nFactorM2Ref;
                }
            }

            /*
             * Si ya tenemos M2 confiable desde DorepeItem, usarlo.
             */
            if (bM2Convertido && nM2Fallback > 0) {
                return nM2Fallback;
            }

            /*
             * Fallback solo para posiciones manuales que no vienen de DorepeItem.
             * Para referencia, no debe reemplazar OrderQuantity.
             */
            if (sMatnr && nPal > 0 && !bM2Convertido && nFactorM2Ref <= 0) {
                const nM2Srv = await this._getCantidadM2FromService(sMatnr, "PAL", nPal);
                if (toNumber(nM2Srv) > 0 && toNumber(nM2Srv) !== nPal) {
                    return toNumber(nM2Srv);
                }
            }

            if (sMatnr && nCaj > 0 && !bM2Convertido && nFactorM2Ref <= 0) {
                const nM2Srv = await this._getCantidadM2FromService(sMatnr, "CJ", nCaj);
                if (toNumber(nM2Srv) > 0 && toNumber(nM2Srv) !== nCaj) {
                    return toNumber(nM2Srv);
                }
            }

            /*
             * Si no viene de PAL/CJ, permitir M2 directo.
             */
            if (!bVieneDeBulto && nM2Fallback > 0) {
                return nM2Fallback;
            }

            return 0;
        },

        _buildScheduleM2Ceramicos: async function (aItemsTech, aMaterialUI, oCantByItm, sClientId) {
            const toNumber = function (v) {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const mUIByItm = {};
            (aMaterialUI || []).forEach(function (r) {
                const sItm = String(r.ItmNumber || "").padStart(6, "0");
                if (sItm) {
                    mUIByItm[sItm] = r;
                }
            });

            const aSchedule = [];

            for (const it of (aItemsTech || [])) {
                const sItm = String(it.ItmNumber || "").padStart(6, "0");
                if (!sItm) {
                    continue;
                }

                const ui = mUIByItm[sItm] || {};
                const cant = oCantByItm[sItm] || oCantByItm[it.ItmNumber] || {};

                const nQtyM2 = await this._getCantidadM2PayloadCeramicos({
                    it: it,
                    ui: ui,
                    cant: cant
                });

                if (toNumber(nQtyM2) <= 0) {
                    continue;
                }

                aSchedule.push({
                    ClientId: sClientId || "",
                    ItmNumber: sItm,
                    SchedLine: "0001",
                    ReqQty: toNumber(nQtyM2).toFixed(3)
                });
            }

            return aSchedule;
        },

        _buildCantidadM2FrontMapCeramicos: async function (aItemsTech, aMaterialUI, oCantByItm) {
            const toNumber = function (v) {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const mTechByItm = {};
            (aItemsTech || []).forEach(function (it) {
                const sItm = String(it.ItmNumber || "").padStart(6, "0");
                if (sItm) {
                    mTechByItm[sItm] = it;
                }
            });

            const mResult = {};

            for (const mat of (aMaterialUI || [])) {
                const sItm = String(mat.ItmNumber || "").padStart(6, "0");
                if (!sItm) {
                    continue;
                }

                const it = mTechByItm[sItm] || {};
                const cant = oCantByItm[sItm] || oCantByItm[mat.ItmNumber] || {};
                const sMatnr = String(
                    mat.Material ||
                    mat.codigo ||
                    it.Material ||
                    cant.Material ||
                    ""
                ).trim();

                const nPal = toNumber(
                    mat.cantidadPallets ||
                    mat.NroPaletas ||
                    cant.cantidadPallets ||
                    cant.NroPaletas ||
                    it.cantidadPallets ||
                    it.NroPaletas
                );

                const nCaj = toNumber(
                    mat.cantidadCajas ||
                    mat.NroCajas ||
                    cant.cantidadCajas ||
                    cant.NroCajas ||
                    it.cantidadCajas ||
                    it.NroCajas
                );

                const sUMVBulto = String(
                    mat.UMVBulto ||
                    mat.TargetQuBulto ||
                    cant.UMVBulto ||
                    cant.TargetQuBulto ||
                    it.UMVBulto ||
                    it.TargetQuBulto ||
                    it.TargetQu ||
                    mat.TargetQu ||
                    cant.TargetQu ||
                    cant.UMV ||
                    ""
                ).trim();

                const nFactorM2 = toNumber(
                    mat.factorM2BultoRef ||
                    mat.factorM2Ref ||
                    cant.factorM2BultoRef ||
                    cant.factorM2Ref ||
                    it.factorM2BultoRef ||
                    it.factorM2Ref
                );

                const nM2Directo = toNumber(
                    mat.cantidadM2 ||
                    mat.Cantidad ||
                    cant.cantidadM2 ||
                    cant.Cantidad ||
                    it.cantidadM2 ||
                    it.Cantidad
                );

                let nM2 = 0;

                /*
                 * Caso pedido con referencia:
                 * usar factor calculado desde DorepeItem-OrderQuantity.
                 */
                if (nFactorM2 > 0) {
                    if (sUMVBulto === "PAL" && nPal > 0) {
                        nM2 = nPal * nFactorM2;
                    } else if (sUMVBulto === "CJ" && nCaj > 0) {
                        nM2 = nCaj * nFactorM2;
                    }
                }

                /*
                 * Caso pedido nuevo:
                 * convertir PAL/CJ a M2 solo para presentación.
                 * No modifica el payload.
                 */
                if (nM2 <= 0 && sMatnr && nPal > 0) {
                    nM2 = await this._getCantidadM2FromService(sMatnr, "PAL", nPal);
                }

                if (nM2 <= 0 && sMatnr && nCaj > 0) {
                    nM2 = await this._getCantidadM2FromService(sMatnr, "CJ", nCaj);
                }

                /*
                 * Fallback: si ya existe M2 guardado, usarlo.
                 */
                if (nM2 <= 0 && nM2Directo > 0) {
                    nM2 = nM2Directo;
                }

                if (nM2 > 0) {
                    mResult[sItm] = nM2;
                }
            }

            return mResult;
        },

        onSimulateOrderCliente: async function () {

            const oModelProyect = this.getView().getModel("oModelProyect");
            const oData = oModelProyect.getData();

            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = this._formatDateForSAP(sFechaActual);

            const toNumber = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            const sDestinoCeramico = oData.inputForm?.destinoCeramico || "";

            const aPartners = [
                { ClientId: oData.oDatClient?.Customer || "", PartnRole: "AG", PartnNumber: oData.oDatClient?.Customer || "" },
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "WE",
                    PartnNumber: (() => {
                        const sTipoEntrega = oData.inputForm?.tipoEntrega;
                        switch (sTipoEntrega) {
                            case "1": return oData.oDatClient?.Customer || "";
                            case "2": return oData.inputForm?.destinoCeramico || "";
                            case "3": return oData.inputForm?.direccionAgencia || "";
                            default: return oData.inputForm?.destinoCeramico || "";
                        }
                    })()
                }
            ];

            if (sDestinoCeramico) {
                aPartners.push({ ClientId: oData.oDatClient?.Customer || "", PartnRole: "Z0", PartnNumber: sDestinoCeramico, ItmNumber: "000000" });
            }

            const aItemsTech = oData.oMaterial || [];
            const aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];
            const oCantByItm = oModelProyect.getProperty("/oCantidadesByItm") || {};

            const bPedidoReferencia = this._isPedidoReferenciaCeramicos(aItemsTech, aMaterialUI);

            const aItemsTechSim = bPedidoReferencia
                ? this._buildHeaderToItemSimCeramicos(aItemsTech)
                : aItemsTech;

            const mTargetByItm = {};
            aItemsTech.forEach(it => {
                if (it?.ItmNumber) {
                    mTargetByItm[String(it.ItmNumber).padStart(6, "0")] = bPedidoReferencia
                        ? "M2"
                        : String(it.TargetQu || "").trim();
                }
            });

            const aSchedule = bPedidoReferencia
                ? await this._buildScheduleM2Ceramicos(
                    aItemsTech,
                    aMaterialUI,
                    oCantByItm,
                    oData.oDatClient?.Customer || ""
                )
                : this._buildScheduleDefaultCeramicos(
                    aItemsTech,
                    aMaterialUI,
                    oCantByItm,
                    oData.oDatClient?.Customer || ""
                );

            if (!aSchedule.length) {
                sap.ui.core.BusyIndicator.hide();

                sap.m.MessageBox.warning(
                    bPedidoReferencia
                        ? "No se pudo determinar la cantidad en M2 desde DorepeItem-OrderQuantity. Revise que la referencia traiga OrderQuantity para las posiciones seleccionadas."
                        : "Ingrese una cantidad mayor a 0 antes de recalcular."
                );

                return;
            }

            oModelProyect.setProperty("/oSchedule", aSchedule);

            const oPayload = this._cleanPayload({
                ClientId: oData.oDatClient?.Customer || "",
                TOperation: oData.TOperation || "CS",
                DocType: oData.inputForm?.tipDocument || "",
                SalesOrg: oData.oDatClient?.SalesOrganization || "",
                DistrChan: (oData.inputForm?.tipDocument === "ZPEF") ? "C2" : "C1",
                Division: oData.oDatClient?.Division || "",
                ReqDateH: oPurchDate,
                PurchDate: this._formatDateForSAP(oData.inputForm?.ocExpDate),
                PurchNoC: oData.inputForm?.purchaseOrder || "",
                ShipCond: (oData.inputForm?.resumenEntrega === "Cliente recoge") ? "02" : "01",
                Pmnttrms: oData.inputForm?.cbCondPago || "",
                Currency: oData.inputForm?.moneda || "USD",
                PoMethod: "Z001",
                PoSupplem: "CLTE",
                HeaderToItem: aItemsTechSim,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toConditionEx: [{ ClientId: "", ItmNumber: "", CondType: "", CondValue: "0.00", Condvalue: "0.00" }],
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
                success: async (oResponse) => {
                    sap.ui.core.BusyIndicator.hide();
                    const aConditions = oResponse?.toConditionEx?.results || [];
                    const aReturns = oResponse?.HeaderToReturn?.results || [];

                    const aReturnErrors = aReturns.filter(function (r) {
                        const sType = String(r.Type || "").trim().toUpperCase();
                        return sType === "E" || sType === "A" || sType === "X";
                    });

                    if (aReturnErrors.length) {
                        const sMsg = this._buildSapMessageFromReturn(
                            aReturnErrors,
                            ["E", "A", "X"],
                            "SAP devolvió error en la simulación."
                        );

                        sap.m.MessageBox.error(sMsg, { title: "Error en simulación SAP" });

                        oModelProyect.setProperty("/isSimulated", false);
                        oModelProyect.setProperty("/isFormEnabled", false);

                        return;
                    }

                    const aConditionsValidas = aConditions.filter(function (c) {
                        return String(c.ItmNumber || "").trim() !== "000000" &&
                            String(c.CondType || "").trim();
                    });

                    if (!aConditionsValidas.length) {
                        sap.m.MessageBox.error(
                            "SAP no devolvió condiciones válidas para las posiciones." +
                            "\n\nMensajes SAP:" +
                            "\n" + this._buildSapMessageFromReturn(
                                aReturns,
                                ["S", "I", "W", "E", "A", "X"],
                                "Sin mensajes en HeaderToReturn."
                            ),
                            { title: "Simulación SAP sin condiciones" }
                        );
                        return;
                    }
                    const mCond = {};
                    aConditionsValidas.forEach(c => {
                        const key = c.ItmNumber;
                        if (!mCond[key]) mCond[key] = [];
                        mCond[key].push(c);
                    });

                    const mCantidadM2Front = await this._buildCantidadM2FrontMapCeramicos(
                        aItemsTech,
                        aMaterialUI,
                        oCantByItm
                    );

                    const aReporte = aMaterialUI.map(mat => {
                        const sItm = mat.ItmNumber;
                        const conds = mCond[sItm] || [];
                        const sTarget = (mat.TargetQu || mTargetByItm[sItm] || "").trim();

                        const condZPRE = conds.find(c => c.CondType === "ZPRE");

                        const precioBruto = toNumber(condZPRE?.Condvalue || condZPRE?.Condvalue);
                        const precioListaSAP = toNumber(condZPRE?.CondValue);

                        const descuentoTotal = this._getDiscountTotalFromSimulationConditions(conds, mPriceConditionTypes);
                        const descuentoPorcentaje = precioBruto !== 0 ? (descuentoTotal / precioBruto) * 100 : 0;
                        const reItm = new RegExp(`(^|\\D)${sItm}(\\D|$)`);
                        const aRtnLines = aReturns
                            .filter(r => typeof r.Message === "string" && reItm.test(r.Message))
                            .map(r => r.Message);
                        let sPosicionFromReturn = "";

                        if (aRtnLines.length > 0) {
                            const sFirstLine = aRtnLines[0] || "";
                            const aPartsRaw = String(sFirstLine).split("-").map(p => (p || "").trim());

                            const sPosRaw = aPartsRaw[0] || "";
                            const nPos = parseInt(sPosRaw, 10);

                            sPosicionFromReturn = isNaN(nPos) ? sPosRaw : String(nPos);
                        }

                        let cantidad = 0;
                        let calidadS = mat.calidad || "";

                        const oCantItmReporte = oCantByItm[sItm] || oCantByItm[String(sItm).padStart(6, "0")] || {};

                        /*
                         * La columna Cantidad debe mostrar el equivalente M2.
                         * Pallets y cajas quedan en sus columnas/control, pero no como cantidad técnica.
                         */
                        cantidad =
                            toNumber(mCantidadM2Front[String(sItm).padStart(6, "0")]) ||
                            toNumber(oCantItmReporte.cantidadM2) ||
                            toNumber(oCantItmReporte.Cantidad) ||
                            toNumber(mat.cantidadM2) ||
                            toNumber(mat.Cantidad) ||
                            toNumber(mat.ReqQty) ||
                            toNumber(mat.TargetQty);

                        if (cantidad <= 0 && precioBruto > 0 && precioListaSAP > 0) {
                            cantidad = precioBruto / precioListaSAP;
                        }

                        if (!calidadS && toNumber(mat.cantidadCajas) > 0) {
                            calidadS = "S";
                        }

                        const precioLista = precioListaSAP > 0
                            ? precioListaSAP
                            : (cantidad > 0 ? (precioBruto / cantidad) : 0);
                        const precioNetoTotal = precioBruto - descuentoTotal;
                        const precioUnit = cantidad > 0 ? (precioNetoTotal / cantidad) : 0;
                        const total = precioNetoTotal;

                        const sMatnr = mat.Material || mat.codigo || "";
                        const nStockPal = toNumber(mat.stockPallets ?? mat.Pallets ?? 0);
                        const nStockCaj = toNumber(mat.stockCajas ?? mat.Saldos ?? 0);
                        const calibreFinal = mat.calibre || mat.Calibre || mat.Zzcalibre || "";
                        const tonoFinal = mat.tono || mat.Tono || mat.Zztono || "";
                        const calidadFinal = calidadS || mat.calidad || ((toNumber(mat.cantidadCajas) > 0 || sTarget === "CJ") ? "S" : "");
                        const posicionFinal =
                            sPosicionFromReturn ||
                            mat.Posicion ||
                            mat.Pos ||
                            mat.RefDocIt ||
                            sItm;

                        return {
                            ...mat,
                            ItmNumber: sItm,
                            Pos: posicionFinal,
                            Posicion: posicionFinal,
                            Material: sMatnr,
                            codigo: sMatnr,
                            descripcion: this._getDescripcionMaterial(sMatnr, mat, this.getView()),
                            cantidad: cantidad.toFixed(3),
                            Cantidad: cantidad.toFixed(3),
                            cantidadM2: cantidad.toFixed(3),
                            TargetQu: "M2",
                            UMV: "M2",
                            UMVBulto: mat.UMVBulto || mat.TargetQuBulto || sTarget,
                            TargetQuBulto: mat.TargetQuBulto || mat.UMVBulto || sTarget,
                            calibre: calibreFinal,
                            tono: tonoFinal,
                            stockPallets: nStockPal,
                            stockCajas: nStockCaj,
                            prLista: precioLista.toFixed(2),
                            descuentos: descuentoPorcentaje.toFixed(2),
                            prUnit: precioUnit.toFixed(2),
                            total: total.toFixed(2),
                            calidad: calidadFinal
                        };
                    });

                    const subtotalGeneral = aReporte.reduce((acc, item) => acc + toNumber(item.total), 0);
                    const embalajeTotal = aConditions.filter(c => c.CondType === "ZRFN").reduce((acc, c) => acc + toNumber(c.Condvalue), 0);
                    const igvTotal = aConditions.filter(c => c.CondType === "MWST").reduce((acc, c) => acc + toNumber(c.Condvalue), 0);
                    const totalFooter = subtotalGeneral + embalajeTotal + igvTotal;

                    oModelProyect.setProperty("/oMaterialUI", aReporte);
                    oModelProyect.setProperty("/Totales", {
                        SubTotal: subtotalGeneral.toFixed(2),
                        Flete: embalajeTotal.toFixed(2),
                        IGV: igvTotal.toFixed(2),
                        Total: totalFooter.toFixed(2)
                    });
                    const aPesoPromises = aReporte.map((row, index) => {
                        const sPathPeso = `/oMaterialUI/${index}/peso`;

                        return this._calcPesoRow(row)
                            .then(sPeso => {
                                oModelProyect.setProperty(sPathPeso, sPeso);
                            })
                            .catch(() => {
                                oModelProyect.setProperty(sPathPeso, "0.000");
                            });
                    });

                    await Promise.all(aPesoPromises);
                    oModelProyect.refresh(true);
                    this._showSapSimulationOkMessage(aReturns, "Simulación calculada y pintada correctamente.");
                },
                error: (oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    const sMsg = this._getODataErrorMessage(oError, "Error en la simulación para cliente.");
                    sap.m.MessageBox.error(sMsg, { title: "Error en simulación SAP" });
                    void 0;
                }
            });
        },
        onSimulateOrder: async function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oData = oModelProyect.getData();

            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = this._formatDateForSAP(sFechaActual);
            const oPriceDate = this._formatDateForSAP(
                oData.inputForm?.priceDate || oData.inputForm?.PriceDate || sFechaActual
            );

            const toNumber = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            const sDestinoCeramico = oData.inputForm?.destinoCeramico || "";

            const aPartners = [
                { ClientId: oData.oDatClient?.Customer || "", PartnRole: "AG", PartnNumber: oData.oDatClient?.Customer || "" },
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "WE",
                    PartnNumber: (() => {
                        const sTipoEntrega = oData.inputForm?.tipoEntrega;
                        switch (sTipoEntrega) {
                            case "1": return oData.oDatClient?.Customer || "";
                            case "2": return oData.inputForm?.destinoCeramico || "";
                            case "3": return oData.inputForm?.direccionAgencia || "";
                            default: return oData.inputForm?.destinoCeramico || "";
                        }
                    })()
                }
            ];

            if (sDestinoCeramico) {
                aPartners.push({ ClientId: oData.oDatClient?.Customer || "", PartnRole: "Z0", PartnNumber: sDestinoCeramico, ItmNumber: "000000" });
            }
            const aItemsTech = oData.oMaterial || [];
            const aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];
            const oCantByItm = oModelProyect.getProperty("/oCantidadesByItm") || {};

            const bPedidoReferencia = this._isPedidoReferenciaCeramicos(aItemsTech, aMaterialUI);

            const aItemsTechSim = bPedidoReferencia
                ? this._buildHeaderToItemSimCeramicos(aItemsTech)
                : aItemsTech;

            const mTargetByItm = {};
            aItemsTech.forEach(it => {
                if (it?.ItmNumber) {
                    mTargetByItm[String(it.ItmNumber).padStart(6, "0")] = bPedidoReferencia
                        ? "M2"
                        : String(it.TargetQu || "").trim();
                }
            });

            const aSchedule = bPedidoReferencia
                ? await this._buildScheduleM2Ceramicos(
                    aItemsTech,
                    aMaterialUI,
                    oCantByItm,
                    oData.oDatClient?.Customer || ""
                )
                : this._buildScheduleDefaultCeramicos(
                    aItemsTech,
                    aMaterialUI,
                    oCantByItm,
                    oData.oDatClient?.Customer || ""
                );

            if (!aSchedule.length) {
                sap.ui.core.BusyIndicator.hide();

                sap.m.MessageBox.warning(
                    bPedidoReferencia
                        ? "No se pudo determinar la cantidad en M2 desde DorepeItem-OrderQuantity. Revise que la referencia traiga OrderQuantity para las posiciones seleccionadas."
                        : "Ingrese una cantidad mayor a 0 antes de recalcular."
                );

                return;
            }

            oModelProyect.setProperty("/oSchedule", aSchedule);

            const oPayload = this._cleanPayload({
                ClientId: oData.oDatClient?.Customer || "",
                TOperation: oData.TOperation || "CS",
                DocType: oData.inputForm?.tipDocument || "",
                SalesOrg: oData.oDatClient?.SalesOrganization || "",
                DistrChan: (oData.inputForm?.tipDocument === "ZPEF") ? "C2" : "C1",
                Division: oData.oDatClient?.Division || "",
                ReqDateH: oPurchDate,
                PurchDate: this._formatDateForSAP(oData.inputForm?.ocExpDate),
                PriceDate: oPriceDate,
                PurchNoC: oData.inputForm?.purchaseOrder || "",
                ShipCond: (oData.inputForm?.resumenEntrega === "Cliente recoge") ? "02" : "01",
                Pmnttrms: oData.inputForm?.cbCondPago || "",
                Currency: oData.inputForm?.moneda || "USD",
                PoMethod: "Z001",
                HeaderToItem: aItemsTechSim,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toConditionEx: [{ ClientId: "", ItmNumber: "", CondType: "", CondValue: "0.00", Condvalue: "0.00" }],
                HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
            });

            const oModelEntity = oView.getModel("oModelEntity");
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
                success: async (oResponse) => {

                    sap.ui.core.BusyIndicator.hide();

                    const aConditions = oResponse?.toConditionEx?.results || [];
                    const aReturns = oResponse?.HeaderToReturn?.results || [];

                    const aReturnErrors = aReturns.filter(function (r) {
                        const sType = String(r.Type || "").trim().toUpperCase();
                        return sType === "E" || sType === "A" || sType === "X";
                    });

                    if (aReturnErrors.length) {
                        const sMsg = this._buildSapMessageFromReturn(
                            aReturnErrors,
                            ["E", "A", "X"],
                            "SAP devolvió error en la simulación."
                        );

                        sap.m.MessageBox.error(sMsg, { title: "Error en simulación SAP" });

                        oModelProyect.setProperty("/isSimulated", false);
                        oModelProyect.setProperty("/isFormEnabled", false);

                        return;
                    }

                    const aConditionsValidas = aConditions.filter(function (c) {
                        return String(c.ItmNumber || "").trim() !== "000000" &&
                            String(c.CondType || "").trim();
                    });

                    if (!aConditionsValidas.length) {
                        sap.m.MessageBox.error(
                            "SAP no devolvió condiciones válidas para las posiciones." +
                            "\n\nMensajes SAP:" +
                            "\n" + this._buildSapMessageFromReturn(
                                aReturns,
                                ["S", "I", "W", "E", "A", "X"],
                                "Sin mensajes en HeaderToReturn."
                            ),
                            { title: "Simulación SAP sin condiciones" }
                        );
                        return;
                    }

                    const mCond = {};
                    aConditionsValidas.forEach(c => {
                        const key = c.ItmNumber;
                        if (!mCond[key]) mCond[key] = [];
                        mCond[key].push(c);
                    });

                    const mCantidadM2Front = await this._buildCantidadM2FrontMapCeramicos(
                        aItemsTech,
                        aMaterialUI,
                        oCantByItm
                    );

                    const aReporte = aMaterialUI.map(mat => {
                        const sItm = mat.ItmNumber;
                        const conds = mCond[sItm] || [];
                        const sTarget = (mat.TargetQu || mTargetByItm[sItm] || "").trim();

                        const condZPRE = conds.find(c => c.CondType === "ZPRE");

                        const precioBruto = toNumber(condZPRE?.Condvalue || condZPRE?.Condvalue);
                        const precioListaSAP = toNumber(condZPRE?.CondValue);

                        const descuentoTotal = this._getDiscountTotalFromSimulationConditions(conds, mPriceConditionTypes);
                        const descuentoPorcentaje = precioBruto !== 0 ? (descuentoTotal / precioBruto) * 100 : 0;

                        const reItm = new RegExp(`(^|\\D)${sItm}(\\D|$)`);
                        const aRtnLines = aReturns
                            .filter(r => typeof r.Message === "string" && reItm.test(r.Message))
                            .map(r => r.Message);

                        let sPosicionFromReturn = "";

                        if (aRtnLines.length > 0) {
                            const sFirstLine = aRtnLines[0] || "";
                            const aPartsRaw = String(sFirstLine).split("-").map(p => (p || "").trim());

                            const sPosRaw = aPartsRaw[0] || "";
                            const nPos = parseInt(sPosRaw, 10);

                            sPosicionFromReturn = isNaN(nPos) ? sPosRaw : String(nPos);
                        }
                        let cantidad = 0;
                        let calidadS = mat.calidad || "";

                        const oCantItmReporte = oCantByItm[sItm] || oCantByItm[String(sItm).padStart(6, "0")] || {};

                        /*
                         * La columna Cantidad debe mostrar el equivalente M2.
                         * Pallets y cajas quedan en sus columnas/control, pero no como cantidad técnica.
                         */
                        cantidad =
                            toNumber(mCantidadM2Front[String(sItm).padStart(6, "0")]) ||
                            toNumber(oCantItmReporte.cantidadM2) ||
                            toNumber(oCantItmReporte.Cantidad) ||
                            toNumber(mat.cantidadM2) ||
                            toNumber(mat.Cantidad) ||
                            toNumber(mat.ReqQty) ||
                            toNumber(mat.TargetQty);

                        if (cantidad <= 0 && precioBruto > 0 && precioListaSAP > 0) {
                            cantidad = precioBruto / precioListaSAP;
                        }

                        if (!calidadS && toNumber(mat.cantidadCajas) > 0) {
                            calidadS = "S";
                        }

                        const precioLista = precioListaSAP > 0
                            ? precioListaSAP
                            : (cantidad > 0 ? (precioBruto / cantidad) : 0);
                        const precioNetoTotal = precioBruto - descuentoTotal;
                        const precioUnit = cantidad > 0 ? (precioNetoTotal / cantidad) : 0;
                        const total = precioNetoTotal;

                        const sMatnr = mat.Material || mat.codigo || "";
                        const nStockPal = toNumber(mat.stockPallets ?? mat.Pallets ?? 0);
                        const nStockCaj = toNumber(mat.stockCajas ?? mat.Saldos ?? 0);
                        const calibreFinal = mat.Calibre || mat.Zzcalibre || "";
                        const tonoFinal = mat.Tono || mat.Zztono || "";
                        const calidadFinal = calidadS || mat.calidad || ((toNumber(mat.cantidadCajas) > 0 || sTarget === "CJ") ? "S" : "");

                        const posicionFinal =
                            sPosicionFromReturn ||
                            mat.Posicion ||
                            mat.Pos ||
                            mat.RefDocIt ||
                            sItm;
                        return {
                            ...mat,
                            ItmNumber: sItm,
                            Pos: posicionFinal,
                            Posicion: posicionFinal,
                            Material: sMatnr,
                            codigo: sMatnr,
                            descripcion: this._getDescripcionMaterial(sMatnr, mat, oView),
                            cantidad: cantidad.toFixed(3),
                            Cantidad: cantidad.toFixed(3),
                            cantidadM2: cantidad.toFixed(3),
                            TargetQu: "M2",
                            UMV: "M2",
                            UMVBulto: mat.UMVBulto || mat.TargetQuBulto || sTarget,
                            TargetQuBulto: mat.TargetQuBulto || mat.UMVBulto || sTarget,
                            calibre: calibreFinal,
                            tono: tonoFinal,
                            stockPallets: nStockPal,
                            stockCajas: nStockCaj,
                            prLista: precioLista.toFixed(2),
                            descuentos: descuentoPorcentaje.toFixed(2),
                            prUnit: precioUnit.toFixed(2),
                            total: total.toFixed(2),
                            calidad: calidadFinal
                        };
                    });

                    const subtotalGeneral = aReporte.reduce((acc, item) => acc + toNumber(item.total), 0);
                    const embalajeTotal = aConditionsValidas.filter(c => c.CondType === "ZRFN").reduce((acc, c) => acc + toNumber(c.Condvalue), 0);
                    const igvTotal = aConditionsValidas.filter(c => c.CondType === "MWST").reduce((acc, c) => acc + toNumber(c.Condvalue), 0);
                    const totalFooter = subtotalGeneral + embalajeTotal + igvTotal;

                    oModelProyect.setProperty("/oMaterialUI", aReporte);
                    oModelProyect.setProperty("/Totales", {
                        SubTotal: subtotalGeneral.toFixed(2),
                        Flete: embalajeTotal.toFixed(2),
                        IGV: igvTotal.toFixed(2),
                        Total: totalFooter.toFixed(2)
                    });

                    const aPesoPromises = aReporte.map((row, index) => {
                        const sPathPeso = `/oMaterialUI/${index}/peso`;

                        return this._calcPesoRow(row)
                            .then(sPeso => {
                                oModelProyect.setProperty(sPathPeso, sPeso);
                            })
                            .catch(() => {
                                oModelProyect.setProperty(sPathPeso, "0.000");
                            });
                    });

                    await Promise.all(aPesoPromises);
                    oModelProyect.refresh(true);
                    this._showSapSimulationOkMessage(aReturns, "Datos calculados y actualizados correctamente.");
                },
                error: (oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    const sMsg = this._getODataErrorMessage(oError, "Error en la simulación.");
                    sap.m.MessageBox.error(sMsg, { title: "Error en simulación SAP" });
                    void 0;
                }
            });
        },

        _getSapReturnMessages: function (aReturns, aTypes) {
            const aList = Array.isArray(aReturns) ? aReturns : [];
            const aAllowedTypes = Array.isArray(aTypes) ? aTypes.map(function (t) {
                return String(t || "").trim().toUpperCase();
            }) : [];

            const mAllowed = {};
            aAllowedTypes.forEach(function (sType) {
                if (sType) {
                    mAllowed[sType] = true;
                }
            });

            const aMessages = aList.map(function (r) {
                const sType = String(r.Type || r.type || "").trim().toUpperCase();

                if (aAllowedTypes.length && !mAllowed[sType]) {
                    return "";
                }

                const sMessage = String(
                    r.Message ||
                    r.message ||
                    r.MessageText ||
                    r.Text ||
                    ""
                ).trim();

                if (!sMessage) {
                    return "";
                }

                return sType ? "[" + sType + "] " + sMessage : sMessage;
            }).filter(Boolean);

            return Array.from(new Set(aMessages));
        },

        _buildSapMessageFromReturn: function (aReturns, aTypes, sFallback) {
            const aMessages = this._getSapReturnMessages(aReturns, aTypes);
            return aMessages.length ? aMessages.join("\n") : (sFallback || "SAP no devolvió detalle del mensaje.");
        },

        _getODataErrorMessage: function (oError, sFallback) {
            const aMessages = [];

            const fnAdd = function (vMessage) {
                if (vMessage === null || vMessage === undefined) {
                    return;
                }

                let sMessage = "";

                if (typeof vMessage === "string") {
                    sMessage = vMessage;
                } else if (typeof vMessage === "object") {
                    sMessage = vMessage.value || vMessage.message || vMessage.Message || "";
                }

                sMessage = String(sMessage || "")
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                if (sMessage) {
                    aMessages.push(sMessage);
                }
            };

            const fnReadJsonError = function (oJson) {
                if (!oJson) {
                    return;
                }

                const oSapError = oJson.error || oJson;

                fnAdd(oSapError.message);
                fnAdd(oSapError.message && oSapError.message.value);

                const aDetails =
                    oSapError.innererror?.errordetails ||
                    oSapError.innererror?.error_details ||
                    oSapError.details ||
                    [];

                if (Array.isArray(aDetails)) {
                    aDetails.forEach(function (oDetail) {
                        fnAdd(
                            oDetail.message ||
                            oDetail.Message ||
                            oDetail.longtext ||
                            oDetail.LongText
                        );
                    });
                }
            };

            fnReadJsonError(oError?.responseJSON);

            if (oError?.responseText) {
                try {
                    fnReadJsonError(JSON.parse(oError.responseText));
                } catch (e) {
                    fnAdd(oError.responseText);
                }
            }

            fnAdd(oError?.message);

            if (oError?.status || oError?.statusText) {
                fnAdd("HTTP " + (oError.status || "") + " " + (oError.statusText || ""));
            }

            const aUniqueMessages = Array.from(new Set(aMessages));
            return aUniqueMessages.length
                ? aUniqueMessages.join("\n")
                : (sFallback || "Error técnico al consultar SAP.");
        },

        _showSapSimulationOkMessage: function (aReturns, sFallback) {
            const aWarnings = this._getSapReturnMessages(aReturns, ["W"]);
            const aSuccess = this._getSapReturnMessages(aReturns, ["S", "I"]);

            if (aWarnings.length) {
                sap.m.MessageBox.warning(
                    aWarnings.concat(aSuccess).join("\n") || sFallback,
                    { title: "Simulación calculada con advertencias" }
                );
                return;
            }

            const sMessage = (aSuccess[0] || sFallback || "Simulación calculada correctamente.")
                .replace(/^\[[A-Z]\]\s*/, "");

            sap.m.MessageToast.show(sMessage);
        },

        _getDescripcionMaterial: function (matnr, matUI, oView) {

            if (matUI) {
                if (matUI.Descripcion) return matUI.Descripcion;
                if (matUI.descripcion) return matUI.descripcion;
                if (matUI.Maktx) return matUI.Maktx;
            }

            try {
                const oModelProyect = oView.getModel("oModelProyect");
                const aTree = oModelProyect.getProperty("/oTreeCer") || [];
                const grp = aTree.find(g => g.isGroup && g.Matnr === matnr);
                if (grp?.Descripcion) return grp.Descripcion;
            } catch (e) { }

            try {
                const oModelProyect = oView.getModel("oModelProyect");
                const aBase = oModelProyect.getProperty("/oMaterialBase") || [];
                const base = aBase.find(x => x.Material === matnr);
                if (base?.Description) return base.Description;
                if (base?.Descripcion) return base.Descripcion;
            } catch (e) { }

            try {
                const oModelData = oView.getModel("oModelData");
                const aCat = oModelData?.getProperty("/oFilterMaterial") || [];
                const cat = aCat.find(x => x.Material === matnr);
                if (cat?.Description) return cat.Description;
                if (cat?.Descripcion) return cat.Descripcion;
            } catch (e) { }
            return String(matnr || "");
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

        _createOrderCeramicos: async function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelUser = oView.getModel("oModelUser");
            const oData = oModelProyect.getData();

            const toNumber = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

            const aItemsTech = oData.oMaterial || [];
            const aUIRows = oModelProyect.getProperty("/oMaterialUI") || [];
            const oCant = oModelProyect.getProperty("/oCantidades") || {};
            const oCantByItm = oModelProyect.getProperty("/oCantidadesByItm") || {}; // ✅ clave
            const sDestinoCeramico = oData.inputForm?.destinoCeramico || "";

            if (!Array.isArray(aItemsTech) || aItemsTech.length === 0) {
                sap.m.MessageBox.warning("No hay ítems técnicos (/oMaterial) para crear el pedido.");
                return;
            }

            const sTipoEntrega = oData.inputForm?.tipoEntrega;

            const isClienteIAS =
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bIsCliente") === true;

            const sVendorPrincipal = oData.oClientData?.kunn2 || "";
            const sLoggedBP =
                oModelUser?.getProperty("/bBPFinal") ||
                oModelUser?.getProperty("/bBP") ||
                "";

            const bIsInternoForVendor =
                !isClienteIAS && (!!oModelUser?.getProperty("/bIsCoord") || !!oModelUser?.getProperty("/bIsVendedor"));

            const sZV = !isClienteIAS ? (sVendorPrincipal || sLoggedBP || "") : "";

            const aVendPartners = [];
            if (sZV) {
                aVendPartners.push({
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "ZV",
                    PartnNumber: sZV
                });
            }
            if (bIsInternoForVendor && sLoggedBP && sLoggedBP !== sZV) {
                aVendPartners.push({
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "ZY",
                    PartnNumber: sLoggedBP
                });
            }

            const aPartners = [
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "AG",
                    PartnNumber: oData.oDatClient?.Customer || ""
                },
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "WE",
                    PartnNumber: (() => {
                        switch (sTipoEntrega) {
                            case "1": return oData.oDatClient?.Customer || "";
                            case "2": return oData.inputForm?.destinoCeramico || "";
                            case "3": return oData.inputForm?.direccionAgencia || "";
                            default: return oData.inputForm?.destinoCeramico || "";
                        }
                    })()
                },
                ...aVendPartners
            ];

            if (sDestinoCeramico) {
                aPartners.push({
                    ClientId: oData.oDatClient?.Customer || "",
                    PartnRole: "Z0",
                    PartnNumber: sDestinoCeramico,
                    ItmNumber: "000000"
                });
            }

            const findUIRow = (sItm, sMatnr) => {
                let r = aUIRows.find(x => x.ItmNumber === sItm);
                if (!r) r = aUIRows.find(x => (x.Material || x.codigo) === sMatnr);
                return r || {};
            };

            const bPedidoReferencia = this._isPedidoReferenciaCeramicos(aItemsTech, aUIRows);

            const getReqQtyDefault = function (it, oUI) {
                const sItmKey = String(it.ItmNumber || "").padStart(6, "0");
                const oCantItm = oCantByItm[sItmKey] || oCantByItm[it.ItmNumber] || {};
                const sTarget = String(
                    it.TargetQu ||
                    oUI.TargetQu ||
                    oUI.UMV ||
                    oCantItm.TargetQu ||
                    oCantItm.UMV ||
                    ""
                ).trim();

                if (sTarget === "PAL") {
                    return toNumber(oCantItm.cantidad) ||
                        toNumber(oUI.cantidadPallets) ||
                        toNumber(oUI.NroPaletas) ||
                        toNumber(it.cantidad) ||
                        toNumber(it.ReqQty) ||
                        toNumber(it.TargetQty);
                }

                if (sTarget === "CJ") {
                    return toNumber(oCantItm.cantidad) ||
                        toNumber(oUI.cantidadCajas) ||
                        toNumber(oUI.NroCajas) ||
                        toNumber(it.cantidad) ||
                        toNumber(it.ReqQty) ||
                        toNumber(it.TargetQty);
                }

                return toNumber(oCantItm.cantidadM2) ||
                    toNumber(oCantItm.Cantidad) ||
                    toNumber(oCantItm.cantidad) ||
                    toNumber(oUI.cantidadM2) ||
                    toNumber(oUI.Cantidad) ||
                    toNumber(oUI.cantidad) ||
                    toNumber(it.cantidadM2) ||
                    toNumber(it.Cantidad) ||
                    toNumber(it.cantidad) ||
                    toNumber(it.ReqQty) ||
                    toNumber(it.TargetQty);
            };

            // ✅ Cantidad por item: primero ItmNumber, luego UI, luego oCant por material

            let mScheduleM2ByItm = {};

            if (bPedidoReferencia) {
                const aScheduleM2 = await this._buildScheduleM2Ceramicos(
                    aItemsTech,
                    aUIRows,
                    oCantByItm,
                    oData.oDatClient?.Customer || ""
                );

                aScheduleM2.forEach(function (s) {
                    mScheduleM2ByItm[s.ItmNumber] = s;
                });
            }

            const aItems = [];
            const aSchedule = [];

            aItemsTech.forEach(it => {
                const sItm = (it.ItmNumber || "").trim();
                const sMatnr = (it.Material || "").trim();
                const sUMV = bPedidoReferencia ? "M2" : String(it.TargetQu || "").trim();
                if (!sItm || !sMatnr) return;

                const oUI = findUIRow(sItm, sMatnr);

                let fReqQty = 0;

                if (bPedidoReferencia) {
                    const oScheduleM2 = mScheduleM2ByItm[String(sItm).padStart(6, "0")];
                    fReqQty = oScheduleM2 ? toNumber(oScheduleM2.ReqQty) : 0;
                } else {
                    fReqQty = getReqQtyDefault(it, oUI);
                }

                // ✅ Si no hay cantidad válida, no mandes schedule ni item
                if (fReqQty <= 0) return;

                const bIsSaldoCJ = (sUMV === "CJ") || ((it.Zzcalidad || "").trim() === "S");

                const sTipoRef = oData.inputForm?.tipoReferencia || "";
                let sRefDocCa = it.RefDocCa || oUI.RefDocCa || "";

                if (!sRefDocCa && sTipoRef) {
                    if (sTipoRef === "ZCNA") sRefDocCa = "B";
                    if (sTipoRef === "ZACN" || sTipoRef === "ZPSE") sRefDocCa = "G";
                }

                aItems.push({
                    ClienteId: oData.oDatClient?.Customer || "",
                    ItmNumber: sItm,
                    Material: sMatnr,
                    Plant: it.Plant || "1001",
                    TargetQu: sUMV,
                    Zzcalibre: it.Zzcalibre || "",
                    Zztono: it.Zztono || "",
                    Zzcalidad: it.Zzcalidad || "",
                    StoreLoc: bIsSaldoCJ ? "T303" : undefined,

                    RefDoc: bPedidoReferencia ? (it.RefDoc || oUI.RefDoc || "") : "",
                    RefDocIt: bPedidoReferencia ? (it.RefDocIt || oUI.RefDocIt || "") : "",
                    RefDocCa: bPedidoReferencia ? (sRefDocCa || "") : ""
                });

                aSchedule.push({
                    ClientId: oData.oDatClient?.Customer || "",
                    ItmNumber: sItm,
                    SchedLine: "0001",
                    ReqQty: toNumber(fReqQty).toFixed(3)
                });
            });

            if (aItems.length === 0) {
                sap.m.MessageBox.warning("No hay cantidades válidas para crear el pedido.");
                return;
            }
            const aTexts = [
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    ItmNumber: "000000",
                    TextId: "Z001",
                    Langu: "ES",
                    TextLine: oData.inputForm?.obsPedido || ""
                },
                {
                    ClientId: oData.oDatClient?.Customer || "",
                    ItmNumber: "000000",
                    TextId: "Z003",
                    Langu: "ES",
                    TextLine: oData.inputForm?.obsDelivery || ""
                }
            ].filter(t => (t.TextLine || "").trim() !== "");

            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = this._formatDateForSAP(sFechaActual);

            const oPriceDate = this._formatDateForSAP(
                oData.inputForm?.priceDate || oData.inputForm?.PriceDate || sFechaActual
            );

            const sDocType = oData.inputForm?.tipDocument || "";
            const sTOperation = (sDocType === "ZCNA") ? "CC" : "CP";

            const bIsCoord = !!oModelUser?.getProperty("/bIsCoord");
            const bIsVendedor = !!oModelUser?.getProperty("/bIsVendedor");

            const sPoSupplem = isClienteIAS ? "CLTE" : (bIsCoord ? "SUPE" : (bIsVendedor ? "VEND" : ""));
            const extraPoSupplem = sPoSupplem ? { PoSupplem: sPoSupplem } : {};

            const oPayload = this._cleanPayload({
                ClientId: oData.oDatClient?.Customer || "",
                TOperation: sTOperation,
                DocType: sDocType,
                SalesOrg: oData.oDatClient?.SalesOrganization || "",
                DistrChan: (sDocType === "ZPEF") ? "C2" : "C1",
                Division: oData.oDatClient?.Division || "",
                ReqDateH: oPurchDate,
                PurchDate: this._formatDateForSAP(oData.inputForm?.ocExpDate),
                QtValidF: this._formatDateForSAP(oData.inputForm?.fechInicio) || "",
                QtValidT: this._formatDateForSAP(oData.inputForm?.fechFin) || "",
                PriceDate: oPriceDate,
                PoMethod: "Z001",
                ...extraPoSupplem,
                Pmnttrms: oData.inputForm?.cbCondPago || "",
                PurchNoC: oData.inputForm?.purchaseOrder || "",
                ShipCond: (oData.inputForm?.resumenEntrega === "Cliente recoge") ? "02" : "01",
                Currency: oData.inputForm?.moneda || "USD",
                OrdReason: oData.inputForm?.reasonOrd || "",
                HeaderToItem: aItems,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toText: aTexts,
                HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
            });

            const oModelEntity = oView.getModel("oModelEntity");
            sap.ui.core.BusyIndicator.show(0);

            oModelEntity.create("/iHeaderSet", oPayload, {
                success: async (oResponse) => {
                    sap.ui.core.BusyIndicator.hide();

                    const aMensajes = oResponse?.HeaderToReturn?.results || [];
                    const aErroresSap = this._getSapReturnMessages(aMensajes, ["E", "A", "X"]);
                    const aWarningsSap = this._getSapReturnMessages(aMensajes, ["W"]);
                    const aSuccessSap = this._getSapReturnMessages(aMensajes, ["S", "I"]);
                    let sNumPedido = "";

                    aMensajes.forEach(m => {
                        const sMessage = String(m.Message || m.message || "");
                        const match = sMessage.match(/\d{10}/);
                        if (match) sNumPedido = match[0];
                    });

                    if (aErroresSap.length) {
                        sap.m.MessageBox.error(aErroresSap.join("\n"), { title: "Error al crear pedido en SAP" });
                        return;
                    }

                    const fnAfterOk = () => {
                        oModelProyect.setProperty("/", models.createModelProyect());
                        oModelProyect.refresh(true);

                        const oTable = oView.byId("tbProductos1") || sap.ui.getCore().byId("tbProductos1");
                        if (oTable?.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        this._goToLaunchpadHome();
                    };

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
                            `Pedido Creado Exitosamente.\nNúmero de pedido: ${sNumPedido}${sUploadMessage}`,
                            {
                                title: "Pedido Creado",
                                onClose: function () {
                                    this._clearPendingOCFiles();
                                    fnAfterOk();
                                }.bind(this)
                            }
                        );
                    } else {
                        sap.m.MessageBox.warning(
                            "SAP indicó que el pedido fue procesado, pero no se pudo identificar el número de pedido. Verifique el documento en SAP antes de volver a grabar." +
                            "\n\nMensajes SAP:\n" + this._buildSapMessageFromReturn(
                                aMensajes,
                                ["S", "I", "W", "E", "A", "X"],
                                "Sin mensajes en HeaderToReturn."
                            ),
                            {
                                title: "Respuesta SAP no concluyente"
                            }
                        );
                    }
                },
                error: (oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    const sMsg = this._getODataErrorMessage(oError, "Error en la creación del pedido.");
                    sap.m.MessageBox.error(sMsg, { title: "Error al crear pedido en SAP" });
                    void 0;
                }
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
        _onPressRecalculateSimulation: function () {
            const oView = this.getView();
            const oModelUser = oView.getModel("oModelUser");

            const bIsCliente =
                !!oModelUser?.getProperty("/bIsCliente") ||
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bRol") === "CLIENTES";
            const oModelProyect = oView.getModel("oModelProyect");
            const aItems = oModelProyect?.getProperty("/oMaterial") || [];
            if (!aItems.length) {
                sap.m.MessageToast.show("No hay ítems para recalcular.");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            try {
                if (bIsCliente) {
                    if (typeof this.onSimulateOrderCliente === "function") {
                        this.onSimulateOrderCliente();
                    } else {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error("No existe la función onSimulateOrderCliente() en este controller.");
                    }
                } else {
                    if (typeof this.onSimulateOrder === "function") {
                        this.onSimulateOrder();
                    } else {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error("No existe la función onSimulateOrder() en este controller.");
                    }
                }
            } catch (e) {
                sap.ui.core.BusyIndicator.hide(0);
                sap.m.MessageBox.error("Error al recalcular la simulación.");
                void 0;
            }
        },
        _onAcceptProductManual: function (oEvent) {
            const oModelProyect = this.getView().getModel("oModelProyect");

            const oTable =
                this._byId("frgIdAddManualProductClient--tblStockCliente2") ||
                sap.ui.getCore().byId("frgIdAddManualProductClient--tblStockCliente2");

            if (!oTable) {
                jQuery.sap.log.error("No se encontró la tabla 'tblStockCliente2' en el fragmento AddManualProductClient");
                return;
            }

            const aSelectedItems = oTable.getSelectedItems() || [];
            if (!aSelectedItems.length) {
                this.getMessageBox("error", this.getI18nText("errorSelectProduct"));
                return;
            }

            const aMaterialSAP = oModelProyect.getProperty("/oMaterial") || [];
            const aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];
            const oData = oModelProyect.getData();
            const oCantidades = oModelProyect.getProperty("/oCantidades") || {};
            let lastNum = 0;

            aMaterialSAP.forEach(it => {
                const n = parseInt(it.ItmNumber, 10);
                if (!isNaN(n)) {
                    lastNum = Math.max(lastNum, n);
                }
            });

            aMaterialUI.forEach(it => {
                const n = parseInt(it.ItmNumber, 10);
                if (!isNaN(n)) {
                    lastNum = Math.max(lastNum, n);
                }
            });
            let iItemCounter = lastNum;
            const nextItm = () => {
                iItemCounter += 10;
                return iItemCounter.toString().padStart(6, "0");
            };

            let iAgregados = 0;

            aSelectedItems.forEach(oItem => {
                const oCtx = oItem.getBindingContext("oModelProyect");
                if (!oCtx) {
                    return;
                }

                const r = oCtx.getObject();

                const sMatnr = r.Matnr;
                let sDescripcion = r.Descripcion || r.descripcion || r.Maktx ||
                    this._getDescripcionMaterial(sMatnr, r, this.getView());

                const qPal = parseFloat(r.cantidadPallets) || 0;
                const qCaj = parseFloat(r.cantidadCajas) || 0;

                if (qPal <= 0 && qCaj <= 0) {
                    return;
                }
                if (!oCantidades[sMatnr]) {
                    oCantidades[sMatnr] = {};
                }
                if (qPal > 0) {
                    oCantidades[sMatnr].cantidadPallets = qPal.toFixed(3);
                }
                if (qCaj > 0) {
                    oCantidades[sMatnr].cantidadCajas = qCaj.toFixed(3);
                }
                if (qPal > 0) {
                    const itmPal = nextItm();
                    aMaterialSAP.push({
                        ClienteId: oData.oDatClient?.Customer || "",
                        ItmNumber: itmPal,
                        Material: sMatnr,
                        Plant: "1001",
                        TargetQu: "PAL",
                        Zzcalibre: r.Calibre || "",
                        Zztono: r.Tono || "",
                        Zzcalidad: r.Calidad || ""
                    });
                    aMaterialUI.push({
                        ItmNumber: itmPal,
                        Material: sMatnr,
                        Descripcion: sDescripcion,
                        Calibre: r.Calibre,
                        Tono: r.Tono,
                        UMV: "PAL",
                        stockPallets: parseFloat(r.Pallets) || 0,
                        stockCajas: parseFloat(r.Saldos) || 0,
                        cantidadPallets: qPal,
                        cantidadCajas: 0,
                        precioUnit: 0,
                        precioBase: 0,
                        descuentos: 0,
                        impuesto: 0,
                        subtotal: 0,
                        total: 0
                    });

                    iAgregados++;
                }
                if (qCaj > 0) {
                    const itmCaj = nextItm();
                    aMaterialSAP.push({
                        ClienteId: oData.oDatClient?.Customer || "",
                        ItmNumber: itmCaj,
                        Material: sMatnr,
                        Plant: "1001",
                        TargetQu: "CJ",
                        Zzcalibre: r.Calibre || "",
                        Zztono: r.Tono || "",
                        Zzcalidad: "S"
                    });
                    aMaterialUI.push({
                        ItmNumber: itmCaj,
                        Material: sMatnr,
                        Descripcion: sDescripcion,
                        Calibre: r.Calibre,
                        Tono: r.Tono,
                        UMV: "CJ",
                        stockPallets: parseFloat(r.Pallets) || 0,
                        stockCajas: parseFloat(r.Saldos) || 0,
                        cantidadPallets: 0,
                        cantidadCajas: qCaj,
                        precioUnit: 0,
                        precioBase: 0,
                        descuentos: 0,
                        impuesto: 0,
                        subtotal: 0,
                        total: 0
                    });

                    iAgregados++;
                }
            });

            if (iAgregados === 0) {
                this.getMessageBox("error", this.getI18nText("errorNotCant"));
                return;
            }

            oModelProyect.setProperty("/oMaterial", aMaterialSAP);
            oModelProyect.setProperty("/oMaterialUI", aMaterialUI);
            oModelProyect.setProperty("/oCantidades", oCantidades);
            oModelProyect.refresh(true);
            oTable.removeSelections(true);
            oEvent.getSource().getParent().close();
            this.onSimulateOrderCliente();
        },
        onValidateCantidad: function (oEvent) {
            const oInput = oEvent.getSource(); // StepInput
            const oContext = oInput.getBindingContext("oModelProyect");
            if (!oContext) return;

            const oRow = oContext.getObject() || {};
            const oModel = oContext.getModel();
            const toNum = (v) => {
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };
            const sField = oInput.getBindingPath("value");
            const vRaw = oEvent.getParameter("value");
            let n = toNum(vRaw);
            if (n < 0) n = 0;
            const nStockPal = toNum(oRow.Pallets ?? oRow.stockPallets);
            const nStockCaj = toNum(oRow.Saldos ?? oRow.stockCajas);

            let nMax = 0;
            if (sField === "cantidadPallets") nMax = nStockPal;
            if (sField === "cantidadCajas") nMax = nStockCaj;

            let bCapped = false;
            if (nMax <= 0 && n > 0) {
                n = 0;
                bCapped = true;
                sap.m.MessageToast.show("No hay stock disponible para esta unidad.");
            }
            if (nMax > 0 && n > nMax) {
                n = nMax;
                bCapped = true;
                sap.m.MessageToast.show(`La cantidad no puede exceder el stock. Máximo: ${nMax}`);
            }
            oModel.setProperty(oContext.getPath() + "/" + sField, n);
            oInput.setValue(n);
            if (bCapped) {
                oInput.setValueState("Warning");
                oInput.setValueStateText("Cantidad ajustada al stock disponible.");
                oRow.state = "Warning";
                oRow.icon = "sap-icon://alert";
            } else {
                oInput.setValueState("None");
                oRow.state = "Success";
                oRow.icon = "sap-icon://accept";
            }
            try {
                const oItem = oInput.getParent && oInput.getParent();
                const oTable = oItem && oItem.getParent && oItem.getParent();
                if (oTable && oTable.setSelectedItem) {
                    const nPalCur = toNum(oRow.cantidadPallets);
                    const nCajCur = toNum(oRow.cantidadCajas);

                    const nPalEff = (sField === "cantidadPallets") ? n : nPalCur;
                    const nCajEff = (sField === "cantidadCajas") ? n : nCajCur;

                    const bSelect = (nPalEff > 0 || nCajEff > 0);
                    oTable.setSelectedItem(oItem, bSelect);
                }
            } catch (e) {
                void 0;
            }
            const sValueSAP = toNum(n).toFixed(3);
            const oCant = oModel.getProperty("/oCantidades") || {};
            const sMatKey = (oRow.Matnr || oRow.Material || "").trim();

            if (sMatKey) {
                if (!oCant[sMatKey]) oCant[sMatKey] = {};
                oCant[sMatKey][sField] = sValueSAP;
                oModel.setProperty("/oCantidades", oCant);
            }
            const aEnv = oModel.getProperty("/oEnvios") || [];
            aEnv.push({
                material: sMatKey,
                campo: sField,
                valorUI: String(n),
                valorSAP: sValueSAP,
                timestamp: new Date().toISOString()
            });
            oModel.setProperty("/oEnvios", aEnv);

            oModel.refresh(true);

            if (typeof this._updateCantidadM2Fila === "function") {
                this._updateCantidadM2Fila(oContext);
            }
        },
        _updateCantidadM2Fila: function (oContext) {
            const oModel = oContext.getModel();
            const oRow = oContext.getObject();

            const toNum = (v) => {
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            if (!toNum(oRow.cantidadM2BaseEdit)) {
                oModel.setProperty(
                    oContext.getPath() + "/cantidadM2BaseEdit",
                    toNum(oRow.cantidadM2 || oRow.cantidad || oRow.Cantidad).toFixed(3)
                );
            }

            if (!toNum(oRow.cantidadPalletsBaseEdit)) {
                oModel.setProperty(
                    oContext.getPath() + "/cantidadPalletsBaseEdit",
                    toNum(oRow.cantidadPallets || oRow.Pallets).toFixed(3)
                );
            }

            if (!toNum(oRow.cantidadCajasBaseEdit)) {
                oModel.setProperty(
                    oContext.getPath() + "/cantidadCajasBaseEdit",
                    toNum(oRow.cantidadCajas || oRow.Cajas).toFixed(3)
                );
            }

            const oRowUpdated = oModel.getProperty(oContext.getPath()) || {};
            const nPal = toNum(oRowUpdated.cantidadPallets);
            const nCaj = toNum(oRowUpdated.cantidadCajas);

            let fTotalM2 = 0;

            if (nPal > 0) {
                fTotalM2 += this._getCantidadM2EditCeramico(oRowUpdated, "PAL", nPal);
            }

            if (nCaj > 0) {
                fTotalM2 += this._getCantidadM2EditCeramico(oRowUpdated, "CJ", nCaj);
            }

            oModel.setProperty(oContext.getPath() + "/Cantidad", fTotalM2.toFixed(3));
            oModel.setProperty(oContext.getPath() + "/cantidad", fTotalM2.toFixed(3));
            oModel.setProperty(oContext.getPath() + "/cantidadM2", fTotalM2.toFixed(3));
        },
        // oData para cambiar las cantidades en M2 para las tablas
        _getValorFromMaterialService: function (sMatnr, sMeins, sUmv, fQty) {
            const that = this;
            return new Promise(function (resolve) {
                if (!sMatnr || !sMeins || !sUmv || fQty <= 0) {
                    resolve(0);
                    return;
                }
                let sUrl;
                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject()
                        .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route) +
                        "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
                }
                const oModelPeso = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                    useBatch: false,
                    defaultBindingMode: "TwoWay"
                });
                const aFilters = [
                    new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, sMatnr),
                    new sap.ui.model.Filter("Meins", sap.ui.model.FilterOperator.EQ, sMeins),
                    new sap.ui.model.Filter("Umv", sap.ui.model.FilterOperator.EQ, sUmv),
                    new sap.ui.model.Filter("Quantity", sap.ui.model.FilterOperator.EQ, fQty.toFixed(3))
                ];

                oModelPeso.read("/MaterialPesoSet", {
                    filters: aFilters,
                    success: function (oData) {
                        const oRes = (oData.results && oData.results[0]) || null;
                        if (!oRes) {
                            resolve(0);
                            return;
                        }
                        const fValor = parseFloat(oRes.Peso) || 0;
                        resolve(fValor);
                    },
                    error: function (oError) {
                        resolve(0);
                    }
                });
            });
        },
        _getCantidadM2FromService: function (sMatnr, sUmv, fQty) {
            return this._getValorFromMaterialService(sMatnr, "M2", sUmv, fQty);
        },
        _getPesoFromService: function (sMatnr, sUmv, fQty) {
            return this._getValorFromMaterialService(sMatnr, "M2", sUmv, fQty);
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
            const oContext = oEvent.getSource().getParent().getBindingContext("oModelProyect");
            if (!oContext) return;

            this._oContextMaterialEdit = oContext;

            const oItem = oContext.getObject();
            const oModel = this.getView().getModel("oModelProyect");
            const toNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

            const nPalQty = toNum(oItem.cantidadPallets);
            const nCajQty = toNum(oItem.cantidadCajas);
            const { pal: nStockPal, caj: nStockCaj } = this._getStockForEdit(oItem);
            let sUMV = oItem.UMV;
            if (!sUMV || sUMV === "M2") {
                if (nPalQty > 0 && nCajQty === 0) sUMV = "PAL";
                else if (nCajQty > 0 && nPalQty === 0) sUMV = "CJ";
                else sUMV = (nPalQty >= nCajQty) ? "PAL" : "CJ";
            }

            const bIsPAL = (sUMV === "PAL");
            const bIsCJ = (sUMV === "CJ");

            const sMatnr = (oItem.Material || oItem.codigo || "").trim();

            oModel.setProperty("/oMaterialesSelectedMatnr", sMatnr);
            oModel.setProperty("/oMaterialesSelectedDesc", oItem.descripcion || oItem.Descripcion || oItem.Maktx || "");
            const sKey = this._buildStockKey(oItem);
            const oAcc = this._getAcumuladoPedidoPorKey(sKey);
            const nOtherPal = Math.max(0, toNum(oAcc.pal) - nPalQty);
            const nOtherCaj = Math.max(0, toNum(oAcc.caj) - nCajQty);
            const nDispPal = Math.max(0, nStockPal - nOtherPal);
            const nDispCaj = Math.max(0, nStockCaj - nOtherCaj);

            const nRestPal = Math.max(0, nDispPal - nPalQty);
            const nRestCaj = Math.max(0, nDispCaj - nCajQty);

            oModel.setProperty("/oSelecTableDetalle", {
                ...oItem,
                stockKey: sKey,
                UMV: sUMV,
                isPAL: bIsPAL,
                isCJ: bIsCJ,
                cantidadPallets: nPalQty,
                cantidadCajas: nCajQty,
                stockPalletsTotal: nStockPal,
                stockCajasTotal: nStockCaj,
                stockPalletsMax: nDispPal,
                stockCajasMax: nDispCaj,

                stockPalletsRest: nRestPal,
                stockCajasRest: nRestCaj,

                cantidadM2: (oItem.cantidad ? String(oItem.cantidad) : "0.000"),

                cantidadM2BaseEdit: (toNum(oItem.cantidad || oItem.Cantidad || oItem.cantidadM2)).toFixed(3),
                cantidadPalletsBaseEdit: nPalQty.toFixed(3),
                cantidadCajasBaseEdit: nCajQty.toFixed(3)
            });

            this.setFragment("_dialogEditDetail", this.frgIdEditClient, "EditDetail", this);
        },
        // Ayuda para pintar stock padre
        _buildStockKey: function (oItem) {
            const sMat = (oItem?.Material || oItem?.codigo || oItem?.Matnr || "").trim();

            let sPick = (oItem?.pickLevel || oItem?.__pickLevel || oItem?.PickLevel || "").trim();

            const sCalInf = (oItem?.Calibre || oItem?.calibre || oItem?.Zzcalibre || "").trim();
            const sTonInf = (oItem?.Tono || oItem?.tono || oItem?.Zztono || "").trim();
            const bInferParent = !!oItem?.isGroup || (Array.isArray(oItem?.children) && oItem.children.length) || (!sCalInf && !sTonInf);

            if (!sPick && bInferParent) sPick = "PARENT";

            if (sPick === "PARENT") return sMat;

            const sCal = sCalInf;
            const sTon = sTonInf;

            return [sMat, sCal, sTon].join("|");
        },

        _getAcumuladoPedidoPorKey: function (sKey) {
            const oModel = this.getView().getModel("oModelProyect");
            const aUI = oModel.getProperty("/oMaterialUI") || [];
            const toNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

            let pal = 0, caj = 0;

            aUI.forEach(r => {
                const k = this._buildStockKey(r);
                if (k !== sKey) return;

                pal += toNum(r.cantidadPallets);
                caj += toNum(r.cantidadCajas);
            });

            return { pal, caj };
        },
        _getStockForEdit: function (oItem) {
            const toNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

            let sPick = (oItem?.pickLevel || oItem?.__pickLevel || oItem?.PickLevel || "").trim();

            const sCal = (oItem?.Calibre || oItem?.calibre || oItem?.Zzcalibre || "").trim();
            const sTon = (oItem?.Tono || oItem?.tono || oItem?.Zztono || "").trim();
            const bInferParent = !!oItem?.isGroup || (Array.isArray(oItem?.children) && oItem.children.length) || (!sCal && !sTon);
            if (!sPick && bInferParent) sPick = "PARENT";

            if (sPick === "PARENT") {
                let pal = toNum(oItem.TotalPallets ?? oItem.stockPallets ?? oItem.Pallets);
                let caj = toNum(oItem.TotalSaldos ?? oItem.stockCajas ?? oItem.Saldos);

                if (pal === 0 && caj === 0 && Array.isArray(oItem.children) && oItem.children.length) {
                    pal = oItem.children.reduce((a, c) => a + toNum(c.Pallets ?? c.stockPallets), 0);
                    caj = oItem.children.reduce((a, c) => a + toNum(c.Saldos ?? c.stockCajas), 0);
                }
                return { pal, caj };
            }

            return {
                pal: toNum(oItem.Pallets ?? oItem.stockPallets ?? 0),
                caj: toNum(oItem.Saldos ?? oItem.stockCajas ?? 0)
            };
        },
        _getFactorM2DesdeBaseEdit: function (oRow, sUmv) {
            const toNum = (v) => {
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const nCantidadM2Base =
                toNum(oRow.cantidadM2BaseEdit) ||
                toNum(oRow.cantidadM2) ||
                toNum(oRow.cantidad) ||
                toNum(oRow.Cantidad);

            if (nCantidadM2Base <= 0) {
                return 0;
            }
            if (sUmv === "PAL") {
                const nPalletsBase =
                    toNum(oRow.cantidadPalletsBaseEdit) ||
                    toNum(oRow.cantidadPallets) ||
                    toNum(oRow.Pallets);
                if (nPalletsBase > 0) {
                    return nCantidadM2Base / nPalletsBase;
                }
            }

            if (sUmv === "CJ") {
                const nCajasBase =
                    toNum(oRow.cantidadCajasBaseEdit) ||
                    toNum(oRow.cantidadCajas) ||
                    toNum(oRow.Cajas);

                if (nCajasBase > 0) {
                    return nCantidadM2Base / nCajasBase;
                }
            }

            return 0;
        },

        _getCantidadM2EditCeramico: function (oRow, sUmv, fQty) {
            const nQty = parseFloat(fQty) || 0;
            if (nQty <= 0) return 0;

            const nFactor = this._getFactorM2DesdeBaseEdit(oRow, sUmv);
            if (nFactor <= 0) return 0;

            return nQty * nFactor;
        },


        // Step input de midificar cantidad en stock
        onEditDetalleCantidadChange: function (oEvent) {
            const oStep = oEvent.getSource();
            const oModel = this.getView().getModel("oModelProyect");

            const toNum = v => {
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const oBinding = oStep.getBinding("value");
            const sPath = oBinding ? oBinding.getPath() : "";
            let nVal = toNum(oEvent.getParameter("value"));
            if (nVal < 0) nVal = 0;

            const oEditRef = oModel.getProperty("/oSelecTableDetalle") || {};
            const nMax =
                sPath.includes("cantidadPallets") ? toNum(oEditRef.stockPalletsMax ?? oEditRef.stockPallets) :
                    sPath.includes("cantidadCajas") ? toNum(oEditRef.stockCajasMax ?? oEditRef.stockCajas) :
                        0;

            if (nMax <= 0 && nVal > 0) {
                nVal = 0;
                sap.m.MessageToast.show("No hay stock disponible para esta unidad.");
                oStep.setValueState("Warning");
                oStep.setValueStateText("Sin stock disponible.");
            } else if (nMax > 0 && nVal > nMax) {
                nVal = nMax;
                sap.m.MessageToast.show(`La cantidad no puede exceder el stock. Máximo: ${nMax}`);
                oStep.setValueState("Warning");
                oStep.setValueStateText("Cantidad ajustada al stock disponible.");
            } else {
                oStep.setValueState("None");
                oStep.setValueStateText("");
            }

            if (sPath) {
                oModel.setProperty(sPath, nVal);
            }
            oStep.setValue(nVal);

            const oEditNow = oModel.getProperty("/oSelecTableDetalle") || {};

            const nMaxPalNow = toNum(oEditNow.stockPalletsMax ?? oEditNow.stockPallets);
            const nMaxCajNow = toNum(oEditNow.stockCajasMax ?? oEditNow.stockCajas);

            const nCurPalNow = toNum(oEditNow.cantidadPallets);
            const nCurCajNow = toNum(oEditNow.cantidadCajas);

            oModel.setProperty("/oSelecTableDetalle/stockPalletsRest", Math.max(0, nMaxPalNow - nCurPalNow));
            oModel.setProperty("/oSelecTableDetalle/stockCajasRest", Math.max(0, nMaxCajNow - nCurCajNow));

            const sUmv = oEditNow.UMV;

            let fQty = 0;
            if (sUmv === "PAL") fQty = toNum(oEditNow.cantidadPallets);
            if (sUmv === "CJ") fQty = toNum(oEditNow.cantidadCajas);

            if (!sUmv || fQty <= 0) {
                oModel.setProperty("/oSelecTableDetalle/cantidadM2", "0.000");
                return;
            }

            const oEditUpdated = oModel.getProperty("/oSelecTableDetalle") || {};
            const fM2 = this._getCantidadM2EditCeramico(oEditUpdated, sUmv, fQty);

            oModel.setProperty("/oSelecTableDetalle/cantidadM2", toNum(fM2).toFixed(3));
        },
        _onConfirmEditDetail: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oCtx = this._oContextMaterialEdit;
            if (!oCtx) return;

            const toNum = (v) => {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const oEdit = oModel.getProperty("/oSelecTableDetalle") || {};
            const sMatnr = String(oEdit.Material || oEdit.codigo || "").trim();
            const sItmNumber = String(oEdit.ItmNumber || "").trim();

            if (!sMatnr || !sItmNumber) {
                sap.m.MessageToast.show("No se encontró la posición a editar.");
                return;
            }

            const sRowPath = oCtx.getPath();
            const oRow = oModel.getProperty(sRowPath) || {};

            const nMaxPal = toNum(
                oEdit.stockPalletsMax ??
                oEdit.stockPalletsTotal ??
                oRow.TotalPallets ??
                oEdit.TotalPallets ??
                oRow.stockPallets ??
                oRow.Pallets ??
                0
            );

            const nMaxCaj = toNum(
                oEdit.stockCajasMax ??
                oEdit.stockCajasTotal ??
                oRow.TotalSaldos ??
                oEdit.TotalSaldos ??
                oRow.stockCajas ??
                oRow.Saldos ??
                0
            );

            let qPal = toNum(oEdit.cantidadPallets);
            let qCaj = toNum(oEdit.cantidadCajas);

            const sBaseUMV = oEdit.isPAL
                ? "PAL"
                : oEdit.isCJ
                    ? "CJ"
                    : String(oEdit.UMVBulto || oEdit.TargetQuBulto || oEdit.UMVBaseEdit || oEdit.TargetQuOriginal || oEdit.TargetQu || oEdit.UMV || "").trim();

            if (sBaseUMV === "PAL") qCaj = 0;
            if (sBaseUMV === "CJ") qPal = 0;

            if (qPal > nMaxPal) qPal = nMaxPal;
            if (qCaj > nMaxCaj) qCaj = nMaxCaj;

            const fQtyBulto = sBaseUMV === "PAL" ? qPal : qCaj;
            const fM2 = this._getCantidadM2EditCeramico(oEdit, sBaseUMV, fQtyBulto);
            const sM2 = toNum(fM2).toFixed(3);
            const sPal = qPal > 0 ? qPal.toFixed(3) : "0.000";
            const sCaj = qCaj > 0 ? qCaj.toFixed(3) : "0.000";

            const fFactorM2Ref = toNum(
                oEdit.factorM2BultoRef ||
                oEdit.factorM2Ref ||
                oRow.factorM2BultoRef ||
                oRow.factorM2Ref
            );

            oModel.setProperty(sRowPath, {
                ...oRow,
                cantidadPallets: sPal,
                cantidadCajas: sCaj,
                NroPaletas: sPal,
                NroCajas: sCaj,

                cantidad: sM2,
                Cantidad: sM2,
                cantidadM2: sM2,
                UMV: "M2",
                TargetQu: "M2",
                UMVBulto: sBaseUMV,
                TargetQuBulto: sBaseUMV,
                factorM2Ref: fFactorM2Ref,
                factorM2BultoRef: fFactorM2Ref,
                m2Convertido: true
            });

            if (typeof this._rebuildCantidadesFromUI === "function") {
                const aUI = oModel.getProperty("/oMaterialUI") || [];
                oModel.setProperty("/oCantidades", this._rebuildCantidadesFromUI(aUI));
            } else {
                const oCant = oModel.getProperty("/oCantidades") || {};
                if (!oCant[sMatnr]) oCant[sMatnr] = {};

                oCant[sMatnr].Material = sMatnr;
                oCant[sMatnr].UMV = "M2";
                oCant[sMatnr].TargetQu = "M2";
                oCant[sMatnr].cantidad = sM2;
                oCant[sMatnr].Cantidad = sM2;
                oCant[sMatnr].cantidadM2 = sM2;
                oCant[sMatnr].cantidadPallets = sPal;
                oCant[sMatnr].cantidadCajas = sCaj;
                oModel.setProperty("/oCantidades", oCant);
            }

            const oCantByItm = oModel.getProperty("/oCantidadesByItm") || {};

            const sItmKey = String(sItmNumber || "").padStart(6, "0");
            const sUMVPayload = sBaseUMV || "M2";

            /*
             * IMPORTANTE:
             * Si el item técnico viaja como PAL/CJ, entonces HeaderToSchedule
             * también debe llevar cantidad PAL/CJ, no M2.
             *
             * El M2 queda guardado solo como cantidadM2 para pantalla/cálculos.
             */
            const sQtyPayload = sUMVPayload === "PAL"
                ? sPal
                : sUMVPayload === "CJ"
                    ? sCaj
                    : sM2;

            oCantByItm[sItmKey] = {
                ...(oCantByItm[sItmKey] || {}),

                Material: sMatnr,

                // Unidad que debe usar _buildScheduleDefaultCeramicos
                UMV: sUMVPayload,
                TargetQu: sUMVPayload,

                // Cantidad que debe viajar en HeaderToSchedule según la unidad técnica.
                cantidad: sQtyPayload,

                // M2 solo como dato calculado/visual.
                Cantidad: sM2,
                cantidadM2: sM2,

                cantidadPallets: sPal,
                cantidadCajas: sCaj,
                NroPaletas: sPal,
                NroCajas: sCaj,

                UMVBulto: sBaseUMV,
                TargetQuBulto: sBaseUMV,

                factorM2Ref: fFactorM2Ref,
                factorM2BultoRef: fFactorM2Ref,
                m2Convertido: true
            };

            oModel.setProperty("/oCantidadesByItm", oCantByItm);

            /*
             * Si ya existe /oSchedule en memoria, mantenerlo consistente también.
             */
            const aSchedule = oModel.getProperty("/oSchedule") || [];
            const aScheduleUpd = aSchedule.map(function (s) {
                const sItm = String(s.ItmNumber || "").padStart(6, "0");

                if (sItm !== sItmKey) {
                    return s;
                }

                return {
                    ...s,
                    ReqQty: sQtyPayload
                };
            });

            oModel.setProperty("/oSchedule", aScheduleUpd);

            oModel.refresh(true);
            if (this._dialogEditDetail) this._dialogEditDetail.close();

            const oUser = this.getView().getModel("oModelUser");
            const bIsCliente =
                !!oUser?.getProperty("/bIsCliente") ||
                oUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oUser?.getProperty("/bRol") === "CLIENTES";

            if (bIsCliente && typeof this.onSimulateOrderCliente === "function") {
                this.onSimulateOrderCliente();
            } else if (typeof this.onSimulateOrder === "function") {
                this.onSimulateOrder();
            }
        },
        _onCloseEditDetail: function () {
            if (this._dialogEditDetail) this._dialogEditDetail.close();
        },
        _onDeleteProduct: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oItem = oEvent.getSource().getParent();
            const oContext = oItem.getBindingContext("oModelProyect");
            if (!oContext) return;

            const sPath = oContext.getPath(); // /oMaterialUI/idx
            const iIndex = parseInt(sPath.split("/").pop(), 10);

            let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            let aMaterial = oModel.getProperty("/oMaterial") || [];
            let aSchedule = oModel.getProperty("/oSchedule") || [];

            if (iIndex < 0 || !aMaterialUI[iIndex]) {
                sap.m.MessageToast.show(" No se encontró el producto seleccionado.");
                return;
            }

            const oDeletedItem = aMaterialUI[iIndex];
            aMaterialUI.splice(iIndex, 1);
            if (oDeletedItem.ItmNumber) {
                aMaterial = aMaterial.filter(it => it.ItmNumber !== oDeletedItem.ItmNumber);
                aSchedule = aSchedule.filter(it => it.ItmNumber !== oDeletedItem.ItmNumber);
            }
            const oCantNew = this._rebuildCantidadesFromUI(aMaterialUI);

            oModel.setProperty("/oMaterialUI", aMaterialUI);
            oModel.setProperty("/oMaterial", aMaterial);
            oModel.setProperty("/oSchedule", aSchedule);
            oModel.setProperty("/oCantidades", oCantNew);

            oModel.refresh(true);
            this.onSimulateOrder();

            sap.m.MessageToast.show("🗑️ Producto eliminado correctamente.");
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
        _afterOpenAddManualProduct: function () {
            const oMiMat = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "miMaterial") || this.byId("miMaterial");
            this._attachMaterialMultiPasteClient(oMiMat);

            // Tabla dentro del fragmento de cliente
            const oTable =
                sap.ui.getCore().byId(this.frgIdAddManualProductClient + "--tblStockCliente2") ||
                this.byId("tblStockCliente2");

            if (oTable) {
                oTable.removeSelections(true);
            }
        },
        _attachMaterialMultiPasteClient: function (oControl) {
            if (!oControl || oControl.data("multiPasteAttached")) return;

            oControl.data("multiPasteAttached", true);
            oControl.attachBrowserEvent("paste", this._handleMaterialMultiPasteClient.bind(this, oControl));
        },
        _handleMaterialMultiPasteClient: function (oControl, oEvent) {
            const sText = (oEvent.originalEvent?.clipboardData || oEvent.clipboardData)?.getData("text") || "";
            const aCodes = Array.from(new Set(
                String(sText)
                    .split(/[\s,;\t\r\n]+/)
                    .map(v => v.trim())
                    .filter(Boolean)
            ));

            if (aCodes.length <= 1) return;

            oEvent.preventDefault();

            const oModelData = this.getView().getModel("oModelData");
            const aCatalog = oModelData ? (oModelData.getProperty("/oFilterMaterial") || []) : [];
            const mCatalog = {};

            aCatalog.forEach(row => {
                const sMat = String(row.Material || "").trim();
                if (sMat) mCatalog[sMat] = row;
            });

            const aExisting = (oControl.getTokens() || []).map(t => String(t.getKey() || t.getText()).trim());

            aCodes.forEach(sCode => {
                const oRow = mCatalog[sCode];
                if (!oRow || aExisting.includes(sCode)) return;

                oControl.addToken(new sap.m.Token({
                    key: sCode,
                    text: oRow.Description ? `${sCode} - ${oRow.Description}` : sCode
                }));
                aExisting.push(sCode);
            });

            oControl.setValue("");

            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            oSelectDetail.aMaterials = (oControl.getTokens() || [])
                .map(t => String(t.getKey() || t.getText()).trim())
                .filter(Boolean);
            oSelectDetail.material = oSelectDetail.aMaterials.length ? oSelectDetail.aMaterials[oSelectDetail.aMaterials.length - 1] : "";
            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        // Modificación de Detail
        onDetailEdit: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oInputForm = oModel.getProperty("/inputForm") || {};

            // Backup del estado actual del formulario
            oModel.setProperty("/inputFormBackup", JSON.parse(JSON.stringify(oInputForm)));

            // Habilita modo edición
            oModel.setProperty("/isDetailEdit", true);
            oModel.setProperty("/isFormEnabled", true);
        },
        onDetailCancel: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oBackup = oModel.getProperty("/inputFormBackup") || {};

            // Restaurar valores anteriores
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

        // Sirve para todo lo que tenga que ver con direcciones
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
        _updateResumenEntrega: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oFiltros = oModel.getProperty("/inputForm") || {};
            const sTipo = (oFiltros.tipoEntrega || "").trim();
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
        _getFirstById: function (aIds) {
            for (let i = 0; i < aIds.length; i++) {
                const sId = aIds[i];
                const oCtrl = this.byId(sId) || sap.ui.getCore().byId(sId);
                if (oCtrl) return oCtrl;
            }
            return null;
        },
        onDestinoCeramicoChange: function (oEvent) {
            const oCombo = oEvent.getSource();
            const oItem = oCombo.getSelectedItem();
            const oModel = this.getView().getModel("oModelProyect");

            if (!oItem) {
                oModel.setProperty("/inputForm/destinoCeramico", "");
                oModel.setProperty("/inputForm/destinoCeramicoText", "");
                oModel.setProperty("/inputForm/destinoCeramicoName", "");
                oModel.setProperty("/inputForm/destinoCeramicoAddress", "");
                this._updateResumenEntrega();
                return;
            }

            const sKey = (oItem.getKey() || "").trim();
            const sAddr = (oItem.getText() || "").trim();
            const sName = (oItem.getAdditionalText() || "").trim();

            oModel.setProperty("/inputForm/destinoCeramico", sKey);
            oModel.setProperty("/inputForm/destinoCeramicoName", sName);
            oModel.setProperty("/inputForm/destinoCeramicoAddress", sAddr);

            oModel.setProperty("/inputForm/destinoCeramicoText", [sName, sAddr].filter(Boolean).join(" - "));

            this._updateResumenEntrega();
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

        _getDiscountTotalFromSimulationConditions: function (aCond, mPriceConditionTypes) {
            return (aCond || [])
                .filter(function (oCond) {
                    return this._isActiveDiscountCondition(oCond, mPriceConditionTypes);
                }.bind(this))
                .reduce(function (nAcc, oCond) {
                    return nAcc + Math.abs(this._getConditionAmount(oCond));
                }.bind(this), 0);
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

            const nValue = parseFloat(String(vAmount || "0").replace(",", "."));
            return isNaN(nValue) ? 0 : nValue;
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

        _buildHeaderToItemSimCeramicos: function (aItemsTech) {
            const fnCleanRefItm = function (v) {
                const s = String(v || "").trim();

                if (!s) {
                    return "";
                }

                const sNoZeros = s.replace(/^0+/, "");
                return sNoZeros || s;
            };

            return (aItemsTech || [])
                .map(function (oItem) {
                    const sRefDoc = String(oItem.RefDoc || "").trim();
                    const sRefDocIt = fnCleanRefItm(oItem.RefDocIt);
                    const sItmNumber = String(oItem.ItmNumber || "").trim();

                    const oTech = {
                        ClienteId: String(oItem.ClienteId || oItem.ClientId || "").trim(),
                        ItmNumber: sItmNumber ? sItmNumber.padStart(6, "0") : "",
                        Material: String(oItem.Material || "").trim(),
                        Plant: String(oItem.Plant || "1001").trim(),

                        // Para pedidos con referencia / modificación, la simulación técnica va en M2.
                        TargetQu: "M2",

                        Zzcalidad: String(oItem.Zzcalidad || oItem.calidad || oItem.TipBulto || "").trim(),
                        Zzcalibre: String(oItem.Zzcalibre || oItem.Calibre || oItem.calibre || "").trim(),
                        Zztono: String(oItem.Zztono || oItem.Tono || oItem.tono || "").trim()
                    };

                    if (sRefDoc && sRefDocIt) {
                        oTech.RefDoc = sRefDoc;
                        oTech.RefDocIt = sRefDocIt;
                        oTech.RefDocCa = String(oItem.RefDocCa || "C").trim();
                    }

                    return oTech;
                })
                .filter(function (oItem) {
                    return oItem.ItmNumber && oItem.Material && oItem.Plant && oItem.TargetQu;
                });
        },

        _cleanPayload: function (oData) {
            return JSON.parse(JSON.stringify(oData, (key, value) => {
                if (value === "" || value === null || value === undefined) {
                    return undefined;
                }
                return value;
            }));
        },
        // 16/12 fecha
        _rebuildCantidadesFromUI: function (aMaterialUI) {
            const toNumber = v => {
                const n = parseFloat(String(v ?? "0").replace(",", "."));
                return isNaN(n) ? 0 : n;
            };

            const oCant = {};

            (aMaterialUI || []).forEach(row => {
                const sMat = row.Material || row.codigo;
                if (!sMat) return;

                const nM2 = toNumber(row.cantidadM2 || row.Cantidad || row.cantidad);
                const nPal = toNumber(row.cantidadPallets);
                const nCaj = toNumber(row.cantidadCajas ?? 0);
                const sTarget = String(row.TargetQu || row.UMV || "").trim();

                if (!oCant[sMat]) oCant[sMat] = { Material: sMat };

                if (sTarget === "M2" && nM2 > 0) {
                    oCant[sMat].UMV = "M2";
                    oCant[sMat].TargetQu = "M2";
                    oCant[sMat].cantidad = nM2.toFixed(3);
                    oCant[sMat].Cantidad = nM2.toFixed(3);
                    oCant[sMat].cantidadM2 = nM2.toFixed(3);
                }

                if (nPal > 0) oCant[sMat].cantidadPallets = nPal.toFixed(3);
                if (nCaj > 0) oCant[sMat].cantidadCajas = nCaj.toFixed(3);

                if (!oCant[sMat].cantidad && !oCant[sMat].cantidadPallets && !oCant[sMat].cantidadCajas) {
                    delete oCant[sMat];
                }
            });

            return oCant;
        },
        _formatDateForSAP: function (sDate) {
            if (!sDate) return null;

            try {
                if (sDate.includes("-")) {
                    const [year, month, day] = sDate.split("-");
                    const oDate = new Date(year, month - 1, day);
                    return "/Date(" + oDate.getTime() + ")/";
                }
                if (sDate.includes("/")) {
                    const [day, month, year] = sDate.split("/");
                    const oDate = new Date(year, month - 1, day);
                    return "/Date(" + oDate.getTime() + ")/";
                }

                return null;
            } catch (e) {
                return null;
            }
        },
        formatTipDocumentText: function (sKey) {
            if (!sKey) return "";
            const aDocuments = this.getOwnerComponent().getModel("oModelData").getProperty("/oTipDocumentData");
            if (!aDocuments) return sKey;
            const oDoc = aDocuments.find(doc => doc.key === sKey);
            return oDoc ? oDoc.text : sKey;
        },
        formatTipoCambioLabel: function (oTipChangeData) {
            if (!oTipChangeData || !oTipChangeData.from || !oTipChangeData.to) {
                return "Tipo de cambio: N/A";
            }
            let fValorFrom = parseFloat(oTipChangeData.from.valor) || 0;
            let fValorTo = parseFloat(oTipChangeData.to.valor) || 0;
            let sValorFrom = new Intl.NumberFormat("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(fValorFrom);
            let sValorTo = new Intl.NumberFormat("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(fValorTo);
            return `${oTipChangeData.to.moneda}: ${sValorFrom} ${oTipChangeData.from.moneda}`;
        },
        formatCondPagoDisplay: function (sCodigo, sTexto) {
            if (!sCodigo && !sTexto) return "";
            if (!sTexto) return sCodigo;
            if (!sCodigo) return sTexto;
            return `${sCodigo} - ${sTexto}`;
        },

    });
});
