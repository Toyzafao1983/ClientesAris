
sap.ui.define([
    "com/aris/registropedido/ceramicos/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/resource/ResourceModel",
    "com/aris/registropedido/ceramicos/pe/model/models",
    "com/aris/registropedido/ceramicos/pe/model/formatter",
    "com/aris/registropedido/ceramicos/pe/services/Services",
    "com/aris/registropedido/ceramicos/pe/util/util",
    "com/aris/registropedido/ceramicos/pe/util/utilUI",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
], (BaseController, Controller, ResourceModel, models, Formatter, Services, util, utilUI, Fragment, Filter, FilterOperator, MessageToast, JSONModel) => {
    "use strict";
    var that;
    var tUniNeg = "", tRol = "", tPerfil = "";
    return BaseController.extend("com.aris.registropedido.ceramicos.pe.controller.Main", {
        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("Main").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));

            let sURL = window.parent.location.href;
            if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; }
            if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; }
            if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; }

            const oModelUser = this.getModel("oModelUser");
            if (oModelUser) {
                oModelUser.setProperty("/bUniNeg", tUniNeg);
            }

            this.frgIdSelectClient = "frgIdSelectClient";
            this.frgIdFilterSeller = "frgIdFilterSeller";
            this.frgIdFilterCodClient = "frgIdFilterCodClient";
            this.frgIdFilterRazonSocial = "frgIdFilterRazonSocial";
            this.frgIdFilterDocument = "frgIdFilterDocument";

            this.getView().addEventDelegate({
                onAfterRendering: () => {
                    this._registerSellerTokenHandlers();
                }
            });
        },
        handleRouteMatched: function (bInit) {
            sap.ui.core.BusyIndicator.show(0);

            Promise.all([
                that._getUsers(),          // 0
                that._getPrueba(),         // 1
                that._getTipDocument(that),// 2  (si tu firma lo requiere)
                that._getTipChangeData(),  // 3
                that._getCreditDispo(),    // 4
                that._getDatClient(),      // 5  DataCustomer (Customer, CustomerFullName, TaxNumber*, kunn2)
                that._getClientPet(),      // 6  Customer (lista base clientes para filtros)
                that._getBPVendedor()      // 7  Sellers (vendedores)
            ]).then((values) => {

                that._setLanguageModel("esp");
                that._onClearDataFilter();

                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");

                let sIdioma = that.oModelProyect.getProperty("/sIdioma");

                that.oModelProyect.setSizeLimit(99999999);
                that.oModelData.setSizeLimit(99999999);

                that.onClearFilters();
                that._validateAccessToPortal(values);

                // ✅ 1) DATA ALL (para scope) - usando tUniNeg real
                const oClientesResp = values[6]; // si mantienes _getClientPet en Promise.all
                const oDatResp = values[5]; // _getDatClient

                const aClientesAll = oClientesResp?.oResults || [];
                const aDatClientAll = oDatResp?.oResults || [];

                // Guarda ALL
                that.oModelProyect.setProperty("/oClienteFilterAll", aClientesAll);
                that.oModelProyect.setProperty("/oDatClientAll", aDatClientAll);

                // Lista activa
                that.oModelProyect.setProperty("/oClienteFilter", aClientesAll);

                // ✅ SellerUnique desde DataCustomer (como Estado de Cuenta)
                const m = new Map();
                (aDatClientAll || []).forEach(r => {
                    const bp = String(r.kunn2 || "").trim();
                    if (bp && !m.has(bp)) m.set(bp, r);
                });
                that.oModelProyect.setProperty("/oSellerUnique", Array.from(m.values()));

                // ===========================
                // ✅ 2) Tipo de cambio
                // ===========================
                let oData = values[3]?.oResults || {};
                let oTipoCambio = {
                    from: {
                        moneda: oData.FromCurr || "PEN",
                        valor: oData.ExchRateV || 0
                    },
                    to: {
                        moneda: oData.ToCurrncy || "USD",
                        valor: oData.ExchRate || 0
                    },
                    fechaValidez: oData.ValidFrom ? new Date(parseInt(String(oData.ValidFrom).match(/\d+/)[0], 10)) : null,
                    fecha: oData.Date ? new Date(parseInt(String(oData.Date).match(/\d+/)[0], 10)) : null
                };
                that.oModelData.setProperty("/oTipChangeData", oTipoCambio);

                // Idioma
                if (sIdioma === undefined) {
                    that._setLanguageModel("esp");
                } else {
                    that._setLanguageModel(sIdioma);
                }

                // Usuario
                that.getModel("oModelUser").setProperty("/Information", values[0]?.Resources?.[0] || {});
                if (values[0]?.Resources?.[0]?.name) {
                    that.getModel("oModelUser").setProperty(
                        "/sNameComp",
                        values[0].Resources[0].name.givenName + " " + values[0].Resources[0].name.familyName
                    );
                }
                that.getModel("oModelUser").setProperty("/bUniNeg", tUniNeg);
                that.getModel("oModelUser").setProperty("/bRol", tRol);
                that.getModel("oModelUser").setProperty("/bPerfil", tPerfil);

                // ===========================
                // ✅ 3) Default seller + scope
                // ===========================
                // Mantén tu init
                that._onInitSellerDefault();

                // IMPORTANTE: el token default se setea async (setTimeout). Luego scopea.
                setTimeout(() => {
                    that._setDefaultSellerToken();

                    if (typeof that._applyScopeBySelectedSellers === "function") {
                        that._applyScopeBySelectedSellers();
                    }

                    // ✅ actualizar enable/disable de los 3 filtros
                    that._setClientFiltersEnabledBySeller();

                }, 0);

                sap.ui.core.BusyIndicator.hide(0);

            }).catch(function (oError) {
                that.getMessageBox("error", that.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            });
        },
        _validateAccessToPortal: async function (values) {
            try {
                const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                const oModelUser = this.getModel("oModelUser");
                let sURL = window.parent.location.href;
                let tUniNeg = "";
                let tSalesOrg = "";
                if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; tSalesOrg = "1110"; }
                if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; tSalesOrg = "1120"; }
                if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; tSalesOrg = "1130"; }
                let oUser = values[0]?.Resources?.[0];
                if (!oUser) {
                    sap.ui.core.BusyIndicator.hide(0);
                    oRouter.navTo("AccessDenied");
                    return;
                }
                let sFirstName = oUser?.name?.givenName || "";
                let sLastName = oUser?.name?.familyName || "";
                let sFullName = `${sFirstName} ${sLastName}`.trim();
                oModelUser.setProperty("/bUserName", sFullName);
                localStorage.setItem("userFullName", sFullName);
                let oAttrIAS = oUser["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];
                let aAttr = oAttrIAS?.attributes || [];
                let oAttr1 = aAttr.find(a => a.name === "customAttribute1"); // Cliente
                let oAttr2 = aAttr.find(a => a.name === "customAttribute2"); // Interno (Vendedor / Coordinador)
                let oAttr3 = aAttr.find(a => a.name === "customAttribute3"); // opcional / legacy
                let sBPCliente = oAttr1?.value || "";
                let sBPInterno2 = oAttr2?.value || "";
                let sBPInterno3 = oAttr3?.value || "";
                let sBPInterno = sBPInterno2 || sBPInterno3;
                let sBPVendedor = sBPInterno2;
                let sBPCoord = sBPInterno3;
                // Cache simple
                const oUserCache = {
                    fullName: sFullName,
                    BPCliente: sBPCliente,
                    BPInterno: sBPInterno,
                    BPVendedor: sBPVendedor,
                    BPCoord: sBPCoord,
                    UniNeg: tUniNeg,
                    SalesOrg: tSalesOrg
                };
                localStorage.setItem("oUserCache", JSON.stringify(oUserCache));
                if (sBPCliente) {
                    let aClientes = values[6]?.oResults || [];
                    let oCliente = aClientes.find(item => item.Customer === sBPCliente);
                    const aSalesOrgs = await this._getSalesOrgByBP(sBPCliente);
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
                    oModelUser.setProperty("/bPerfil", "Cliente");
                    oModelUser.setProperty("/bIsVendedor", false);
                    oModelUser.setProperty("/bIsCoord", false);
                    sap.ui.core.BusyIndicator.show(0);
                    await this._loadClientData(sBPCliente);
                    sap.ui.core.BusyIndicator.hide(0);
                    oRouter.navTo("FormClient", { app: sBPCliente });
                    return;
                }
                if (sBPInterno) {
                    const sUsuarioIAS = sBPInterno;
                    let oVendResp = values[7]?.oResults;
                    let aVendedores = [];
                    if (oVendResp) {
                        if (oVendResp.d && Array.isArray(oVendResp.d.results)) {
                            aVendedores = oVendResp.d.results;
                        } else if (Array.isArray(oVendResp)) {
                            aVendedores = oVendResp;
                        }
                    }
                    let oMatch = aVendedores.find(item => item.usuario === sUsuarioIAS);
                    if (!oMatch) {
                        sap.ui.core.BusyIndicator.hide(0);
                        oRouter.navTo("AccessDenied");
                        return;
                    }
                    const aSalesOrgsRaw = await that._getBPVendedor(sUsuarioIAS);
                    let aSalesOrgs = [];
                    if (aSalesOrgsRaw) {
                        if (aSalesOrgsRaw.d?.results) {
                            aSalesOrgs = aSalesOrgsRaw.d.results.map(r => r.orgventas);
                        } else if (aSalesOrgsRaw.results) {
                            aSalesOrgs = aSalesOrgsRaw.results.map(r => r.orgventas);
                        } else if (aSalesOrgsRaw.data?.results) {
                            aSalesOrgs = aSalesOrgsRaw.data.results.map(r => r.orgventas);
                        } else if (aSalesOrgsRaw.oResults) {
                            aSalesOrgs = aSalesOrgsRaw.oResults.map(r => r.orgventas);
                        } else if (aSalesOrgsRaw.value) {
                            aSalesOrgs = aSalesOrgsRaw.value.map(r => r.orgventas);
                        } else if (Array.isArray(aSalesOrgsRaw)) {
                            aSalesOrgs = aSalesOrgsRaw.map(r => r.orgventas || r);
                        }
                    }
                    if (!Array.isArray(aSalesOrgs) || !aSalesOrgs.includes(oMatch.orgventas)) {
                        sap.ui.core.BusyIndicator.hide(0);
                        oRouter.navTo("AccessDenied");
                        return;
                    }
                    const sPerfilCode = (oMatch.perfil || "").toUpperCase();   // "VD" o "CD"
                    const sPerfilDesc = (oMatch.DscPerfil || "").toUpperCase();  // "VENDEDOR" o "COORDINADOR"
                    const bIsVendedor = (sPerfilCode === "VD") || sPerfilDesc.includes("VENDEDOR");
                    const bIsCoord = (sPerfilCode === "CD") || sPerfilDesc.includes("COORDINADOR");
                    if (bIsVendedor && !bIsCoord) {
                        const sBP = (oMatch.kunn2 || oMatch.bp || oMatch.BP || oMatch.Seller || oMatch.txt13 || "")
                            .toString().trim() || sUsuarioIAS;

                        oModelUser.setProperty("/bBPVendedor", sBP);
                    } else {
                        oModelUser.setProperty("/bBPVendedor", "");
                    }
                    oModelUser.setProperty("/bPerfil", oMatch.DscPerfil);  // "Vendedor" / "Coordinador"
                    oModelUser.setProperty("/bUniNeg", tUniNeg);
                    oModelUser.setProperty("/bIsCliente", false);
                    oModelUser.setProperty("/bIsInterno", true);
                    oModelUser.setProperty("/bIsVendedor", bIsVendedor);
                    oModelUser.setProperty("/bIsCoord", bIsCoord);
                    oModelUser.setProperty("/oSalesOrgIAS", aSalesOrgs);
                    oModelUser.setProperty("/bBP", sBPInterno);
                    oModelUser.setProperty("/customAttribute", "customAttribute2");
                    sap.ui.core.BusyIndicator.hide(0);
                    oRouter.navTo("Main");
                    return;
                }
                sap.ui.core.BusyIndicator.hide(0);
                oRouter.navTo("AccessDenied");

            } catch (oError) {
                sap.ui.core.BusyIndicator.hide(0);
                const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("AccessDenied");
            }
        },
        _loadClientData: async function (sCustomer) {
            try {
                const oModel = this.getOwnerComponent().getModel("oModelEntity");
                if (!oModel) throw new Error("Modelo oModelEntity no definido");
                const oDireccion = await new Promise((resolve, reject) => {
                    oModel.read(`/iDireccionesSet(Businesspartner='${sCustomer}')`, {
                        success: (oResultDireccion) => {
                            const oDir = oResultDireccion || {};
                            oDir.FullAddress = `${oDir.Street || ""} ${oDir.HouseNo || ""} ${oDir.StrSuppl1 || ""} ${oDir.StrSuppl2 || ""}, ${oDir.District || ""}, ${oDir.City || ""}, ${oDir.Country || ""}`;
                            resolve(oDir);
                        },
                        error: reject
                    });
                });
                const oCredito = await this._getCreditoCliente(sCustomer);
                this.oModelProyect.setProperty("/oDireccionCliente", oDireccion);
                this.oModelProyect.setProperty("/oCreditoCliente", oCredito || { Amount: 0 });
                this.oModelProyect.refresh(true);
            } catch (e) {
                this.oModelProyect.setProperty("/oDireccionCliente", {});
                this.oModelProyect.setProperty("/oCreditoCliente", { Amount: 0 });
                sap.m.MessageToast.show("Error al cargar datos del cliente");
            }
        },
        _onInitSellerDefault: function () {
            const oUser = this.getView().getModel("oModelUser");
            const oProj = this.getView().getModel("oModelProyect");
            const sBP = oUser.getProperty("/bBPVendedor");
            const sName = oUser.getProperty("/bUserName");

            if (!sBP) return;

            const oMulti = this.byId("multiInputSeller");
            if (!oMulti) return;

            const oToken = new sap.m.Token({
                key: sBP,
                text: `${sBP} - ${sName}`
            });

            oMulti.addToken(oToken);
            oProj.setProperty("/Main/filter/fSeller", [sBP]);
        },
        _onPressFilterInit: function () {
            const tbReporte = this._byId("vbTableMain").getItems().length > 0 ? this._byId("vbTableMain").getItems()[0] : null;
            if (!this.isEmpty(tbReporte)) { tbReporte.removeSelections(true); }
            that.setFragment("_dialogFilterInit", this.frgIdFilterInit, "FilterInit", this);
            that._onClearComponentFilter(that.getI18nText("sStateInit"), [], true);
            that._onClearDataFilter();
        },
        _onClearComponentFilter: function (sState, oComponent, bOtherComponent) {
            if (sState === that.getI18nText("sStateInit")) {
                let oContent = that["_dialogFilterInit"].getContent()[0];
                if (that._validatorComponent(oContent)) {
                    oContent.getItems().forEach(function (value) {
                        if (that._validatorComponent(value)) { that._onClearComponentFilter(that.getI18nText("sStateMiddle"), value.getItems(), false); }
                        else { that._clearComponent(value); }
                    });
                } else { that._clearComponent(value); }
            } else if (sState === that.getI18nText("sStateMiddle")) {
                oComponent.forEach(function (value) {
                    if (that._validatorComponent(value)) { that._onClearComponentFilter(that.getI18nText("sStateMiddle"), value.getItems(), false); }
                    else { that._clearComponent(value); }
                });
            }
        },
        _onClearDataFilter: function () {
            that.getModel("oModelProyect").setProperty("/", models.createModelProyect());
        },
        _onPressNavigateForm: function (oEvent) {
            const jData = oEvent.getSource().getBindingContext("oModelProyect").getObject();
            if (jData.length === 0) {
                sap.m.MessageToast.show("Seleccione un cliente de la tabla");
                return;
            }
            this.oModelProyect.setProperty("/oCabecera", jData);
            const sCustomer = jData.Customer;
            const oModel = this.getOwnerComponent().getModel("oModelEntity");
            if (!oModel) {
                console.error("El modelo oModelEntity no está definido en el componente.");
                return;
            }
            sap.ui.core.BusyIndicator.show(0);
            oModel.read("/iDireccionesSet(Businesspartner='" + sCustomer + "')", {
                success: (oResultDireccion) => {
                    const oDir = oResultDireccion || {};
                    oDir.FullAddress = `${oDir.Street || ""} ${oDir.HouseNo || ""} ${oDir.StrSuppl1 || ""} ${oDir.StrSuppl2 || ""}, ${oDir.District || ""}, ${oDir.City || ""}, ${oDir.Country || ""}`;
                    this.oModelProyect.setProperty("/oDireccionCliente", oDir);
                    this.oModelProyect.refresh(true);

                    this._getCreditoCliente(sCustomer).then((oCredito) => {
                        if (oCredito) {
                            this.oModelProyect.setProperty("/oCreditoCliente", oCredito);

                        } else {
                            this.oModelProyect.setProperty("/oCreditoCliente", { Amount: 0 });

                        }
                    }).catch((err) => {
                        this.oModelProyect.setProperty("/oCreditoCliente", { Amount: 0 });
                        sap.m.MessageToast.show("Error al obtener crédito del cliente");
                    }).finally(() => {
                        sap.ui.core.BusyIndicator.hide();
                        this.oRouter.navTo("FormClient", { app: sCustomer });
                    });

                },
                error: (oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Error al obtener dirección de l cliente");
                }
            });
        },
        _getCreditoCliente: function (sPartner, sSegment = "100102") {
            return new Promise((resolve, reject) => {
                const oModel = this.getOwnerComponent().getModel("oModelEntity");
                if (!oModel) {
                    console.error("El modelo oModelEntity no está definido en el componente.");
                    reject("Modelo no definido");
                    return;
                }

                const sPath = `/EcreditosSet`;
                const aFilters = [
                    new sap.ui.model.Filter("Partner", sap.ui.model.FilterOperator.EQ, sPartner),
                    new sap.ui.model.Filter("Segment", sap.ui.model.FilterOperator.EQ, sSegment)
                ];

                oModel.read(sPath, {
                    filters: aFilters,
                    success: (oData) => {
                        if (oData.results && oData.results.length > 0) {
                            resolve(oData.results[0]); // retorna el primer registro de crédito
                        } else {
                            resolve(null); // no hay crédito
                        }
                    },
                    error: (oError) => {
                        console.error("Error al leer crédito:", oError);
                        reject(oError);
                    }
                });
            });
        },
        _onPressExecute: function () {
            const oUser = this.getModel("oModelUser");
            const bIsVendedor = !!oUser?.getProperty("/bIsVendedor");
            const bIsCoord = !!oUser?.getProperty("/bIsCoord");
            const sPerfil = (oUser?.getProperty("/bPerfil") || "").toUpperCase();
            const bIsSupervisor = sPerfil.includes("SUPERVISOR");

            // Solo vendedor requiere seller obligatorio
            if (bIsVendedor && !bIsCoord && !bIsSupervisor) {
                const aSeller = (this.oModelProyect.getProperty("/Main/filter/fSeller") || [])
                    .map(v => (v || "").toString().trim())
                    .filter(Boolean);

                if (!aSeller.length) {
                    this.oModelProyect.setProperty("/oReporte", []);
                    this.getMessageBox("warning", "Debe agregar al menos un vendedor para realizar la búsqueda.");
                    return;
                }
            }

            let jFilter = this.oModelProyect.getProperty("/Main/filter") || {};
            sap.ui.core.BusyIndicator.show();

            Promise.all([that._getData(jFilter), that._getClientPet(), that._getDatClient()])
                .then((values) => {
                    let oData = values[0];
                    let oDataPet = values[1];
                    let oDataVend = values[2];

                    if (oData.sEstado === "E") {
                        this.getMessageBox("error", this.getI18nText("errorData"));
                        sap.ui.core.BusyIndicator.hide();
                        return;
                    }

                    let aClientes = oDataPet.oResults || [];
                    let aVend = oDataVend.oResults || [];

                    let aReporte = aClientes.map(oCliente => {
                        let oVend = aVend.find(oExt => oExt.Customer === oCliente.Customer);
                        return {
                            ...oCliente,
                            Seller: oVend ? oVend.Seller : ""
                        };
                    });

                    this.oModelProyect.setProperty("/oReporte", aReporte);

                    const oTable = this.byId("TableClient");
                    const oBinding = oTable.getBinding("items");
                    const aFilters = [];

                    if (jFilter.fSeller && jFilter.fSeller.length > 0) {
                        const validKeys = jFilter.fSeller.map(k => (k || "").toString().trim()).filter(Boolean);
                        const aSellerCodes = this._expandSellerKeysToSellerCodes(validKeys);

                        const aSellerFilters = aSellerCodes.map(code =>
                            new sap.ui.model.Filter({
                                filters: [
                                    new sap.ui.model.Filter("Seller", sap.ui.model.FilterOperator.EQ, code),
                                    new sap.ui.model.Filter("kunn2", sap.ui.model.FilterOperator.EQ, code)
                                ],
                                and: false
                            })
                        );

                        aFilters.push(new sap.ui.model.Filter({ filters: aSellerFilters, and: false }));
                    }

                    if (jFilter.fCodClient && jFilter.fCodClient.length > 0) {
                        const aCodFilters = jFilter.fCodClient.map(key =>
                            new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.EQ, key)
                        );
                        aFilters.push(new sap.ui.model.Filter({ filters: aCodFilters, and: false }));
                    }

                    if (jFilter.fRazSocial && jFilter.fRazSocial.length > 0) {
                        const aRazFilters = jFilter.fRazSocial.map(key =>
                            new sap.ui.model.Filter("CustomerFullName", sap.ui.model.FilterOperator.Contains, key)
                        );
                        aFilters.push(new sap.ui.model.Filter({ filters: aRazFilters, and: false }));
                    }

                    if (jFilter.fDocument && jFilter.fDocument.length > 0) {
                        const aDocFilters = jFilter.fDocument.map(key =>
                            new sap.ui.model.Filter({
                                filters: [
                                    new sap.ui.model.Filter("TaxNumber1", sap.ui.model.FilterOperator.EQ, key),
                                    new sap.ui.model.Filter("TaxNumber2", sap.ui.model.FilterOperator.EQ, key),
                                    new sap.ui.model.Filter("TaxNumber3", sap.ui.model.FilterOperator.EQ, key),
                                    new sap.ui.model.Filter("TaxNumber4", sap.ui.model.FilterOperator.EQ, key),
                                    new sap.ui.model.Filter("TaxNumber5", sap.ui.model.FilterOperator.EQ, key),
                                    new sap.ui.model.Filter("TaxNumber6", sap.ui.model.FilterOperator.EQ, key)
                                ],
                                and: false
                            })
                        );
                        aFilters.push(new sap.ui.model.Filter({ filters: aDocFilters, and: false }));
                    }

                    if (oBinding) {
                        oBinding.filter(aFilters);
                    }

                    sap.ui.core.BusyIndicator.hide();
                })
                .catch((oError) => {
                    this.getMessageBox("error", this.getI18nText("errorData"));
                    sap.ui.core.BusyIndicator.hide(0);
                });
        },
        _getData: function () {
            try {
                var oResp = {
                    "sEstado": "E",
                    "oResults": []
                };
                return new Promise(function (resolve, reject) {
                    that.aFilter = [];
                    let jFilter = that.getModel("oModelProyect").getProperty("/Main/filter") || {};
                    if (Array.isArray(jFilter.fSeller) && jFilter.fSeller.length > 0) {
                        const validKeys = jFilter.fSeller
                            .map(k => (k || "").toString().trim())
                            .filter(Boolean);

                        if (validKeys.length > 0) {
                            const aSellerCodes = that._expandSellerKeysToSellerCodes(validKeys);

                            const aSellerOrs = aSellerCodes.map(code =>
                                new sap.ui.model.Filter({
                                    filters: [
                                        new sap.ui.model.Filter("Seller", sap.ui.model.FilterOperator.EQ, code),

                                        new sap.ui.model.Filter("kunn2", sap.ui.model.FilterOperator.EQ, code)
                                    ],
                                    and: false
                                })
                            );

                            that.aFilter.push(new sap.ui.model.Filter({ filters: aSellerOrs, and: false }));
                        }
                    }
                    // Código Cliente (Customer)
                    if (Array.isArray(jFilter.fCodClient) && jFilter.fCodClient.length > 0) {
                        const validKeys = jFilter.fCodClient.filter(k => k && k.trim() !== "");
                        if (validKeys.length > 0) {
                            const aCodOrs = validKeys.map(key =>
                                new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.EQ, key)
                            );
                            that.aFilter.push(new sap.ui.model.Filter({ filters: aCodOrs, and: false }));
                        }
                    }
                    // Razón Social (CustomerFullName + TaxNumbers)
                    if (Array.isArray(jFilter.fRazSocial) && jFilter.fRazSocial.length > 0) {
                        const validKeys = jFilter.fRazSocial.filter(k => k && k.trim() !== "");
                        if (validKeys.length > 0) {
                            const aRazOrs = validKeys.map(key =>
                                new sap.ui.model.Filter({
                                    filters: [
                                        new sap.ui.model.Filter("CustomerFullName", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber1", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber2", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber3", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber4", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber5", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber6", sap.ui.model.FilterOperator.EQ, key)
                                    ],
                                    and: false
                                })
                            );
                            that.aFilter.push(new sap.ui.model.Filter({ filters: aRazOrs, and: false }));
                        }
                    }
                    //  Documento (TaxNumbers + CustomerFullName)
                    if (Array.isArray(jFilter.fDocument) && jFilter.fDocument.length > 0) {
                        const validKeys = jFilter.fDocument.filter(k => k && k.trim() !== "");
                        if (validKeys.length > 0) {
                            const aDocOrs = validKeys.map(key =>
                                new sap.ui.model.Filter({
                                    filters: [
                                        new sap.ui.model.Filter("TaxNumber1", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber2", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber3", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber4", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber5", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("TaxNumber6", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("CustomerFullName", sap.ui.model.FilterOperator.EQ, key)
                                    ],
                                    and: false
                                })
                            );
                            that.aFilter.push(new sap.ui.model.Filter({ filters: aDocOrs, and: false }));
                        }
                    }
                    var sPath = jQuery.sap.getModulePath("com.aris.registropedido.ceramicos.pe") +
                        "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$filter=SalesOrganization eq '1110' and DistributionChannel eq 'C1' and Division eq 'S1'&$format=json&sap-language=es-ES";
                    Services.getoDataERPSync(that, sPath, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData, message) {
                                oResp.sEstado = "S";
                                oResp.oResults = oData.results;
                                resolve(oResp);
                            },
                            error: function (message) {
                                oResp.oResults = [];
                                //temporal (mock)
                                oResp.sEstado = "S";
                                oResp.oResults = models.JsonReporte().d.results;

                                // aplica filtros locales en tabla
                                const oTable = that.byId("TableClient");
                                if (oTable) {
                                    const oBinding = oTable.getBinding("items");
                                    if (oBinding) {
                                        oBinding.filter(that.aFilter);
                                    }
                                }

                                resolve(oResp);
                            }
                        });
                    });
                });

            } catch (oError) {
                that.getMessageBox("error", that.getI18nText("sErrorTry"));
            }
        },
        // para cambiar el idioma
        onLanguageEsp: function () {
            this._setLanguageModel("esp");
        },

        onLanguageEng: function () {
            this._setLanguageModel("ing");
        },
        FilterSelling: function () {
            const that = this;

            Promise.all([
                that._getClientPet(tUniNeg),
                that._getDatClient(tUniNeg)   // ajusta firma si la cambiaste
            ]).then((values) => {

                const aClientes = values[0].oResults || [];
                const aDat = values[1].oResults || []; // DataCustomer

                // vendedor válido = tiene al menos 1 customer en aClientes
                const aVendedoresFiltrados = aDat.filter(r =>
                    (r.kunn2 || "").trim() !== "" &&
                    aClientes.some(c => String(c.Customer || "").trim() === String(r.Customer || "").trim())
                );

                // únicos por BP vendedor
                const aUnicos = [];
                const seen = new Set();
                aVendedoresFiltrados.forEach(r => {
                    const bp = String(r.kunn2 || "").trim();
                    if (bp && !seen.has(bp)) {
                        seen.add(bp);
                        aUnicos.push(r);
                    }
                });

                that.oModelProyect.setProperty("/oVendedores", aUnicos);

                // 3) Abrir diálogo
                if (!that._dialogFilterSeller) {
                    that._dialogFilterSeller = sap.ui.xmlfragment(
                        that.frgIdFilterSeller,
                        "com.aris.registropedido.ceramicos.pe.view.dialogs.FilterSeller",
                        that
                    );
                    that.getView().addDependent(that._dialogFilterSeller);
                }

                const oDialog = that._dialogFilterSeller;
                oDialog.clearSelection();

                const oItemsBinding = oDialog.getBinding("items");
                if (oItemsBinding) {
                    oItemsBinding.filter([]);
                } else {
                    oDialog.attachEventOnce("afterOpen", function () {
                        const oBinding = oDialog.getBinding("items");
                        if (oBinding) oBinding.filter([]);
                    });
                }

                oDialog.open();
            })
                .catch(() => {
                    that.getMessageBox("error", that.getI18nText("sErrorTry"));
                });
        },

        onSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("value");
            const oSource = oEvent.getSource();
            const oBinding = oSource.getBinding("items");

            const sDialogId = oSource.getId().split("--").pop();
            let aFieldFilters = [];

            switch (sDialogId) {
                case "FilterSellerDialog":
                    aFieldFilters = ["kunn2", "Seller"];
                    break;
                case "FilterCodClientDialog":
                    aFieldFilters = ["Customer", "CustomerFullName"];
                    break;
                case "FilterRazSocialDialog":
                    aFieldFilters = [
                        "CustomerFullName",
                        "TaxNumber1", "TaxNumber2", "TaxNumber3",
                        "TaxNumber4", "TaxNumber5", "TaxNumber6"
                    ];
                    break;
                case "FilterDocumentDialog":
                    aFieldFilters = [
                        "TaxNumber1", "TaxNumber2", "TaxNumber3",
                        "TaxNumber4", "TaxNumber5", "TaxNumber6",
                        "CustomerFullName"
                    ];
                    break;
                default:
                    break;
            }
            if (sQuery && oBinding) {
                const aTerms = sQuery.trim().split(/\s+/);
                const aFilters = [];

                aTerms.forEach(term => {
                    aFieldFilters.forEach(field => {
                        aFilters.push(new sap.ui.model.Filter(field, sap.ui.model.FilterOperator.Contains, term));
                    });
                });
                const oCombinedFilter = new sap.ui.model.Filter({
                    filters: aFilters,
                    and: false
                });
                oBinding.filter([oCombinedFilter]);
            } else if (oBinding) {
                oBinding.filter([]);
            }
        },
        onDialogClose: function (oEvent) {
            const aSelectedContexts = oEvent.getParameter("selectedContexts");
            const oDialog = oEvent.getSource();
            const sDialogId = oDialog.getId().split("--").pop();

            let oMultiInput;
            let aKeyFields = [];
            let aTextFields = [];
            let sFilterProp = "";

            switch (sDialogId) {
                case "FilterSellerDialog":
                    oMultiInput = this.byId("multiInputSeller");
                    aKeyFields = ["kunn2"];
                    aTextFields = ["Seller"];
                    sFilterProp = "/Main/filter/fSeller";
                    break;

                case "FilterCodClientDialog":
                    oMultiInput = this.byId("multiInputCodClient");
                    aKeyFields = ["Customer"];
                    aTextFields = ["Customer"];
                    sFilterProp = "/Main/filter/fCodClient";
                    break;

                case "FilterRazSocialDialog":
                    oMultiInput = this.byId("multiInputRazonSocial");
                    aKeyFields = ["CustomerFullName"];
                    aTextFields = ["CustomerFullName"];
                    sFilterProp = "/Main/filter/fRazSocial";
                    break;

                case "FilterDocumentDialog":
                    oMultiInput = this.byId("multiInputDocument");
                    aKeyFields = ["TaxNumber1", "TaxNumber2", "TaxNumber3", "TaxNumber4", "TaxNumber5", "TaxNumber6"];
                    aTextFields = ["TaxNumber1", "TaxNumber2", "TaxNumber3", "TaxNumber4", "TaxNumber5", "TaxNumber6"];
                    sFilterProp = "/Main/filter/fDocument";
                    break;

                default:
                    return;
            }

            if (!oMultiInput) return;

            const aSelectedKeys = [];
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length > 0) {
                aSelectedContexts.forEach(ctx => {
                    const oData = ctx.getObject();
                    const sKey = aKeyFields.map(f => oData[f]).find(v => v && v.trim() !== "") || "";
                    const sText = aTextFields.map(f => oData[f]).find(v => v && v.trim() !== "") || sKey;

                    if (sKey) {
                        aSelectedKeys.push(sKey);

                        oMultiInput.addToken(new sap.m.Token({
                            key: sKey,
                            text: sKey
                        }));
                    }
                });
            }

            if (sFilterProp) {
                this.oModelProyect.setProperty(sFilterProp, aSelectedKeys);
            }

            if (sDialogId === "FilterSellerDialog") {
                this._onSellerTokensChanged();
            }
        },
        onClearFilters: function () {
            this.byId("multiInputCodClient").removeAllTokens();
            this.byId("multiInputRazonSocial").removeAllTokens();
            this.byId("multiInputDocument").removeAllTokens();
            this.byId("multiInputSeller").removeAllTokens();
            const oFilterModel = this.oModelProyect.getProperty("/Main/filter");
            if (oFilterModel) {
                oFilterModel.fSeller = [];
                oFilterModel.fCodClient = [];
                oFilterModel.fRazSocial = [];
                oFilterModel.fDocument = [];
                this.oModelProyect.setProperty("/Main/filter", oFilterModel);
            }

            this.oModelProyect.setProperty("/oReporte", []);
            const oTable = this.byId("TableClient");
            const oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter([]);
            }
            this._setClientFiltersEnabledBySeller();
        },
        //Filtros sin dialog
        onSuggestSeller: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;
            if (!term) { b.filter([]); return; }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            b.filter([new F([
                new F("kunn2", FO.Contains, term),
                new F("Seller", FO.Contains, term)
            ], false)]);
        },

        onSuggestClient: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;
            if (!term) { b.filter([]); return; }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            b.filter([new F([
                new F("Customer", FO.Contains, term),
                new F("CustomerFullName", FO.Contains, term)
            ], false)]);
        },

        onSuggestRazonSocial: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;
            if (!term) { b.filter([]); return; }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            b.filter([new F([new F("CustomerFullName", FO.Contains, term)], false)]);
        },

        onSuggestDocument: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;
            if (!term) { b.filter([]); return; }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            b.filter([new F([
                new F("TaxNumber1", FO.Contains, term),
                new F("TaxNumber2", FO.Contains, term),
                new F("TaxNumber3", FO.Contains, term),
                new F("TaxNumber4", FO.Contains, term),
                new F("TaxNumber5", FO.Contains, term),
                new F("TaxNumber6", FO.Contains, term),
                new F("CustomerFullName", FO.Contains, term) // ayuda a encontrar por nombre
            ], false)]);
        },
        _expandSellerKeysToSellerCodes: function (aKeys) {
            const aMap = this.getModel("oModelProyect")?.getProperty("/oSellerUnique") || [];

            const mBP2Code = new Map();
            aMap.forEach(r => {
                const bp = (r.kunn2 || "").toString().trim();
                const sc = (r.Seller || r.txt13 || "").toString().trim();
                if (bp && sc && !mBP2Code.has(bp)) mBP2Code.set(bp, sc);
            });

            const aExpanded = [];
            (aKeys || []).forEach(k => {
                const key = (k || "").toString().trim();
                if (!key) return;
                aExpanded.push(mBP2Code.get(key) || key);
            });

            return Array.from(new Set(aExpanded));
        },

        _getTokenKeys: function (oMI) {
            return oMI.getTokens().map(t => t.getKey()).filter(Boolean);
        },

        _setArray: function (path, arr) {
            this.getModel("oModelProyect").setProperty(path, Array.from(new Set(arr)));
        },
        // Handlers por campo

        onTokenUpdateClient: function (oEvent) {
            const oMI = this.byId("multiInputCodClient");
            oMI.getTokens().forEach(token => {
                token.setText(token.getKey());
            });
            const keys = this._getTokenKeys(oMI);
            this._setArray("/Main/filter/fCodClient", keys);
        },

        onTokenUpdateRazonSocial: function (oEvent) {
            const oMI = this.byId("multiInputRazonSocial");
            const keys = oMI.getTokens().map(token => token.getText()).filter(Boolean);
            this._setArray("/Main/filter/fRazSocial", keys);
        },

        onTokenUpdateDocument: function (oEvent) {
            const keys = this._getTokenKeys(this.byId("multiInputDocument"));
            this._setArray("/Main/filter/fDocument", keys);
        },
        _buildTableFilters: function (jFilter) {
            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            const a = [];

            if (jFilter.fSeller?.length) {
                a.push(new F({
                    filters: jFilter.fSeller.map(k =>
                        new F({ filters: [new F("Seller", FO.EQ, k), new F("txt13", FO.EQ, k)], and: false })
                    ),
                    and: false
                }));
            }
            if (jFilter.fCodClient?.length) {
                a.push(new F({ filters: jFilter.fCodClient.map(k => new F("Customer", FO.EQ, k)), and: false }));
            }
            if (jFilter.fRazSocial?.length) {
                a.push(new F({
                    filters: jFilter.fRazSocial.map(k =>
                        new F({ filters: [new F("CustomerFullName", FO.Contains, k)], and: false })
                    ),
                    and: false
                }));
            }

            if (jFilter.fRazSocial?.length) {
                a.push(new F({
                    filters: jFilter.fRazSocial.map(k =>
                        new F({
                            filters: [
                                new F("CustomerFullName", FO.Contains, k),
                                new F("TaxNumber1", FO.Contains, k),
                                new F("TaxNumber2", FO.Contains, k),
                                new F("TaxNumber3", FO.Contains, k),
                                new F("TaxNumber4", FO.Contains, k),
                                new F("TaxNumber5", FO.Contains, k),
                                new F("TaxNumber6", FO.Contains, k)
                            ], and: false
                        })
                    ),
                    and: false
                }));
            }
            return a;
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
            return `TIPO CAMBIO:${oTipChangeData.to.moneda}: ${sValorFrom} ${oTipChangeData.from.moneda}`;
        },
        _applyScopeBySelectedSellers: function () {
            const oUser = this.getModel("oModelUser");
            const oProj = this.getModel("oModelProyect");
            if (!oUser || !oProj) return;

            const aClientesAll = oProj.getProperty("/oClienteFilterAll") || [];
            const aDatAll = oProj.getProperty("/oDatClientAll") || [];

            if (oUser.getProperty("/bDisableSellerFilter")) {
                oProj.setProperty("/oClienteFilter", aClientesAll);
                return;
            }

            const bIsVendedor = !!oUser.getProperty("/bIsVendedor");
            const bIsCoord = !!oUser.getProperty("/bIsCoord");
            const sPerfil = (oUser.getProperty("/bPerfil") || "").toUpperCase();
            const bIsSupervisor = sPerfil.includes("SUPERVISOR");

            // Para perfiles distintos de vendedor, scope total
            if (!bIsVendedor || bIsCoord || bIsSupervisor) {
                oProj.setProperty("/oClienteFilter", aClientesAll);
                return;
            }

            const jFilter = oProj.getProperty("/Main/filter") || {};
            const aSellerBPs = (jFilter.fSeller || [])
                .map(x => (x || "").toString().trim())
                .filter(Boolean);

            // Para vendedor sin seller => scope vacío
            if (!aSellerBPs.length) {
                oProj.setProperty("/oClienteFilter", []);
                return;
            }

            const setCustomers = new Set();
            aDatAll.forEach(r => {
                const bp = (r.kunn2 || "").toString().trim();
                const customer = (r.Customer || "").toString().trim();
                if (bp && customer && aSellerBPs.includes(bp)) {
                    setCustomers.add(customer);
                }
            });

            const aClientesScope = aClientesAll.filter(c =>
                setCustomers.has((c.Customer || "").toString().trim())
            );

            oProj.setProperty("/oClienteFilter", aClientesScope);
        },
        _setDefaultSellerToken: function () {
            const oUser = this.getModel("oModelUser");
            const oProj = this.getModel("oModelProyect");
            if (!oUser || !oProj) return;
            if (!oUser.getProperty("/bIsVendedor")) return;
            const sBP = (oUser.getProperty("/bBPVendedor") || "").trim();
            if (!sBP) return;

            const jFilter = oProj.getProperty("/Main/filter") || {};
            const a = Array.isArray(jFilter.fSeller) ? jFilter.fSeller.slice() : [];
            if (!a.includes(sBP)) a.unshift(sBP);

            jFilter.fSeller = a;
            oProj.setProperty("/Main/filter", jFilter);

            const oMI = this.byId("multiInputSeller");
            if (oMI) {
                const existing = new Set(oMI.getTokens().map(t => t.getKey()));
                if (!existing.has(sBP)) oMI.insertToken(new sap.m.Token({ key: sBP, text: sBP }), 0);
            }
        },
        _requireSellerIfVendedor: function () {
            const oUser = this.getModel("oModelUser");
            const oProj = this.getModel("oModelProyect");
            if (!oUser || !oProj) return true;
            if (oUser.getProperty("/bDisableSellerFilter")) return true;

            const bIsVendedor = !!oUser.getProperty("/bIsVendedor");
            if (!bIsVendedor) return true;

            const jFilter = oProj.getProperty("/Main/filter") || {};
            const aSeller = (jFilter.fSeller || []).map(x => (x || "").toString().trim()).filter(Boolean);

            if (aSeller.length > 0) return true;

            this.getMessageBox("warning", "Debe agregar al menos un vendedor para poder filtrar clientes.");
            return false;
        },
        FilterCodClient: function () {
            //if (!this._requireSellerIfVendedor()) return;
            if (!this._requireSellerSelected()) return;
            var that = this;
            Promise.resolve().then(() => {
                const bDisable = !!that.getModel("oModelUser")?.getProperty("/bDisableSellerFilter");
                const aScope = bDisable
                    ? (that.oModelProyect.getProperty("/oClienteFilterAll") || [])
                    : (that.oModelProyect.getProperty("/oClienteFilter") || []);
                that.oModelProyect.setProperty("/oCliente", aScope);
                if (!that._dialogFilterCodClient) {
                    that._dialogFilterCodClient = sap.ui.xmlfragment(
                        that.frgIdFilterCodClient,
                        "com.aris.registropedido.ceramicos.pe.view.dialogs.FilterCodClient",
                        that
                    );
                    that.getView().addDependent(that._dialogFilterCodClient);
                }
                const oDialog = that._dialogFilterCodClient;
                oDialog.clearSelection();
                const oBinding = oDialog.getBinding("items");
                if (oBinding) oBinding.filter([]);
                else {
                    oDialog.attachEventOnce("afterOpen", function () {
                        const oBind = oDialog.getBinding("items");
                        if (oBind) oBind.filter([]);
                    });
                }
                oDialog.open();
            })
                .catch(() => {
                    that.getMessageBox("error", that.getI18nText("sErrorTry"));
                });
        },
        FilterRazonSocial: function () {
            //if (!this._requireSellerIfVendedor()) return;
            if (!this._requireSellerSelected()) return;
            var that = this;
            Promise.resolve().then(() => {
                const bDisable = !!that.getModel("oModelUser")?.getProperty("/bDisableSellerFilter");
                const aScope = bDisable
                    ? (that.oModelProyect.getProperty("/oClienteFilterAll") || [])
                    : (that.oModelProyect.getProperty("/oClienteFilter") || []);
                that.oModelProyect.setProperty("/oCliente", aScope);
                if (!that._dialogFilterRazonSocial) {
                    that._dialogFilterRazonSocial = sap.ui.xmlfragment(
                        that.frgIdFilterRazonSocial,
                        "com.aris.registropedido.ceramicos.pe.view.dialogs.FilterRazonSocial",
                        that
                    );
                    that.getView().addDependent(that._dialogFilterRazonSocial);
                }
                const oDialog = that._dialogFilterRazonSocial;
                oDialog.clearSelection();
                const oBinding = oDialog.getBinding("items");
                if (oBinding) oBinding.filter([]);
                else {
                    oDialog.attachEventOnce("afterOpen", function () {
                        const oBind = oDialog.getBinding("items");
                        if (oBind) oBind.filter([]);
                    });
                }
                oDialog.open();
            })
                .catch(() => {
                    that.getMessageBox("error", that.getI18nText("sErrorTry"));
                });
        },
        FilterDocument: function () {
            //if (!this._requireSellerIfVendedor()) return;
            if (!this._requireSellerSelected()) return;
            var that = this;
            Promise.resolve().then(() => {
                const bDisable = !!that.getModel("oModelUser")?.getProperty("/bDisableSellerFilter");
                const aScope = bDisable
                    ? (that.oModelProyect.getProperty("/oClienteFilterAll") || [])
                    : (that.oModelProyect.getProperty("/oClienteFilter") || []);
                that.oModelProyect.setProperty("/oCliente", aScope);
                if (!that._dialogFilterDocument) {
                    that._dialogFilterDocument = sap.ui.xmlfragment(
                        that.frgIdFilterDocument,
                        "com.aris.registropedido.ceramicos.pe.view.dialogs.FilterDocument",
                        that
                    );
                    that.getView().addDependent(that._dialogFilterDocument);
                }
                const oDialog = that._dialogFilterDocument;
                oDialog.clearSelection();
                const oBinding = oDialog.getBinding("items");
                if (oBinding) oBinding.filter([]);
                else {
                    oDialog.attachEventOnce("afterOpen", function () {
                        const oBind = oDialog.getBinding("items");
                        if (oBind) oBind.filter([]);
                    });
                }
                oDialog.open();
            })
                .catch(() => {
                    that.getMessageBox("error", that.getI18nText("sErrorTry"));
                });
        },
        _purgeClientTokensOutOfScope: function () {
            const oProj = this.getModel("oModelProyect");
            const aScope = oProj.getProperty("/oClienteFilter") || [];
            const setOK = new Set(aScope.map(c => String(c.Customer || "").trim()));

            const oMICod = this.byId("multiInputCodClient");
            if (oMICod) {
                const aKeep = oMICod.getTokens().filter(t => setOK.has(String(t.getKey()).trim()));
                oMICod.removeAllTokens();
                aKeep.forEach(t => oMICod.addToken(t));
                this._setArray("/Main/filter/fCodClient", aKeep.map(t => t.getKey()));
            }
        },
        _setClientFiltersEnabledBySeller: function () {
            const oProj = this.getModel("oModelProyect");
            const oUser = this.getModel("oModelUser");
            if (!oProj || !oUser) return;

            const bIsVendedor = !!oUser.getProperty("/bIsVendedor");
            const bIsCoord = !!oUser.getProperty("/bIsCoord");
            const sPerfil = (oUser.getProperty("/bPerfil") || "").toUpperCase();
            const bIsSupervisor = sPerfil.includes("SUPERVISOR");

            const aSellerKeys = (oProj.getProperty("/Main/filter/fSeller") || [])
                .map(v => (v || "").toString().trim())
                .filter(Boolean);

            const bEnable = (!bIsVendedor || bIsCoord || bIsSupervisor)
                ? true
                : aSellerKeys.length > 0;

            oProj.setProperty("/Main/ui/bEnableClientFilters", bEnable);
            oProj.setProperty("/Main/ui/bEnableExecuteSearch", bEnable);

            if (!bEnable && bIsVendedor && !bIsCoord && !bIsSupervisor) {
                const jFilter = oProj.getProperty("/Main/filter") || {};
                jFilter.fCodClient = [];
                jFilter.fRazSocial = [];
                jFilter.fDocument = [];
                oProj.setProperty("/Main/filter", jFilter);

                this.byId("multiInputCodClient")?.removeAllTokens();
                this.byId("multiInputRazonSocial")?.removeAllTokens();
                this.byId("multiInputDocument")?.removeAllTokens();

                oProj.setProperty("/oReporte", []);
                oProj.setProperty("/oClienteFilter", []);
            }

            oProj.refresh(true);
            this.getView().getModel("oModelProyect")?.updateBindings?.(true);
        },
        _requireSellerSelected: function () {
            const oUser = this.getModel("oModelUser");
            if (!oUser) return true;

            const bIsVendedor = !!oUser.getProperty("/bIsVendedor");
            const bIsCoord = !!oUser.getProperty("/bIsCoord");
            const sPerfil = (oUser.getProperty("/bPerfil") || "").toUpperCase();
            const bIsSupervisor = sPerfil.includes("SUPERVISOR");

            // Coordinador / Supervisor / otros internos no requieren vendedor
            if (!bIsVendedor || bIsCoord || bIsSupervisor) {
                return true;
            }

            const oMI = this.byId("multiInputSeller");
            const a = oMI
                ? oMI.getTokens().map(t => (t.getKey() || "").trim()).filter(Boolean)
                : [];

            if (a.length > 0) return true;

            this.getMessageBox("warning", "Debe agregar al menos un vendedor para habilitar filtros de cliente.");
            return false;
        },

        _registerSellerTokenHandlers: function () {
            const oMI = this.byId("multiInputSeller");
            if (!oMI || oMI._sellerDomHookInstalled) return;

            oMI._sellerDomHookInstalled = true;

            const fnRecalc = () => {
                setTimeout(() => {
                    this._onSellerTokensChanged();
                }, 0);
            };

            // Hook a eventos nativos del MultiInput
            oMI.addEventDelegate({
                onAfterRendering: () => {
                    const oDomRef = oMI.getDomRef();
                    if (!oDomRef) return;

                    // evita duplicar listeners
                    if (oMI._sellerClickHandler) {
                        oDomRef.removeEventListener("click", oMI._sellerClickHandler, true);
                        oDomRef.removeEventListener("keyup", oMI._sellerKeyupHandler, true);
                    }

                    oMI._sellerClickHandler = (oEvent) => {
                        const oTarget = oEvent.target;
                        if (!oTarget) return;

                        // X del token
                        const bIsTokenDelete =
                            oTarget.classList?.contains("sapMTokenIcon") ||
                            oTarget.closest?.(".sapMTokenIcon");

                        if (bIsTokenDelete) {
                            fnRecalc();
                        }
                    };

                    oMI._sellerKeyupHandler = (oEvent) => {
                        // backspace/delete también
                        if (oEvent.key === "Backspace" || oEvent.key === "Delete") {
                            fnRecalc();
                        }
                    };

                    oDomRef.addEventListener("click", oMI._sellerClickHandler, true);
                    oDomRef.addEventListener("keyup", oMI._sellerKeyupHandler, true);
                }
            });

        },
        _onSellerTokensChanged: function () {
            const oMI = this.byId("multiInputSeller");
            const aKeys = oMI
                ? oMI.getTokens().map(t => (t.getKey() || "").trim()).filter(Boolean)
                : [];


            this._setArray("/Main/filter/fSeller", aKeys);
            this._applyScopeBySelectedSellers?.();
            this._purgeClientTokensOutOfScope?.();
            this._setClientFiltersEnabledBySeller();
        },
        onSellerSuggestionSelected: function () {
            setTimeout(() => {
                this._normalizeSellerTokens();
                this._onSellerTokensChanged();
            }, 0);
        },
        onSellerTokenUpdate: function () {
            setTimeout(() => {
                this._normalizeSellerTokens();
                this._onSellerTokensChanged();
            }, 0);
        },
        _normalizeSellerTokens: function () {
            const oMI = this.byId("multiInputSeller");
            if (!oMI) return;

            oMI.getTokens().forEach(t => {
                const sKey = (t.getKey() || "").trim();
                if (sKey) {
                    t.setText(sKey);
                }
            });
        },
    });
});