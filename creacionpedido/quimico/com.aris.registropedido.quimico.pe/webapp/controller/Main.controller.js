
sap.ui.define([
    "com/aris/registropedido/quimico/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/resource/ResourceModel",
    "com/aris/registropedido/quimico/pe/model/models",
    "com/aris/registropedido/quimico/pe/model/formatter",
    "com/aris/registropedido/quimico/pe/services/Services",
    "com/aris/registropedido/quimico/pe/util/util",
    "com/aris/registropedido/quimico/pe/util/utilUI",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
], (BaseController, Controller, ResourceModel, models, Formatter, Services, util, utilUI, Filter, FilterOperator, Fragment, MessageToast, JSONModel) => {
    "use strict";
    var that;
    var tUniNeg="", tRol="", tPerfil = "", tSalesOrg = "";
    formatter: Formatter;
    return BaseController.extend("com.aris.registropedido.quimico.pe.controller.Main", {
        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("Main").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));

            // 🌐 Unidad de negocio según URL
            let sURL      = window.parent.location.href;

            if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES";  tSalesOrg = "1110"; }
            if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS";  tSalesOrg = "1120"; }
            if (sURL.includes("site-ceramicos")){ tUniNeg = "CERAMICOS"; tSalesOrg = "1130"; }


            this.frgIdSelectClient = "frgIdSelectClient";
            this.frgIdFilterSeller = "frgIdFilterSeller";
            this.frgIdFilterCodClient = "frgIdFilterCodClient";
            this.frgIdFilterRazonSocial = "frgIdFilterRazonSocial";
            this.frgIdFilterDocument = "frgIdFilterDocument";

        },
         handleRouteMatched: function (bInit) {

            sap.ui.core.BusyIndicator.show(0)
             Promise.all([that._getUsers(), that._getPrueba(),
            that._getTipChangeData(),that._getCreditDispo(),that._getDatClient(),
            that._getClientPet(),that._getBPVendedor()
            ]).then((values) => {
                that._setLanguageModel("esp");
                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");
                that._onClearDataFilter();
                that.onClearFilters();
                let sIdioma = that.getModel("oModelProyect").getProperty("/sIdioma");
                that.oModelProyect.setSizeLimit(99999999);
                that.oModelData.setSizeLimit(99999999);
                that._validateAccessToPortal(values);
                that.oModelProyect.setProperty("/oSeller", values[4].oResults);
                that.oModelProyect.setProperty("/oClienteFilter", values[5].oResults);
                let oData = values[3].oResults;
                let oTipoCambio = {
                    from: {
                        moneda: oData.FromCurr || "PEN",
                        valor: oData.ExchRateV || 0
                    },
                    to: {
                        moneda: oData.ToCurrncy || "USD",
                        valor: oData.ExchRate || 0
                    },
                    fechaValidez: oData.ValidFrom ? new Date(parseInt(oData.ValidFrom.match(/\d+/)[0], 10)) : null,
                    fecha: oData.Date ? new Date(parseInt(oData.Date.match(/\d+/)[0], 10)) : null
                };
                that.oModelData.setProperty("/oTipChangeData", oTipoCambio);
                if(sIdioma == undefined){
                    that._setLanguageModel("esp");
                }else{
                    that._setLanguageModel(sIdioma);
                }
                that.getModel("oModelUser").setProperty("/Information", values[0].Resources[0]);
                that.getModel("oModelUser").setProperty("/sNameComp", values[0].Resources[0].name.givenName + " " + values[0].Resources[0].name.familyName);
                that.getModel("oModelUser").setProperty("/bUniNeg", tUniNeg);
                that.getModel("oModelUser").setProperty("/bRol", tRol);
                that.getModel("oModelUser").setProperty("/bPerfil", tPerfil);
                sap.ui.core.BusyIndicator.hide(0);
            }).catch(function (oError) {
                that.getMessageBox("error", that.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            });
        },
          _validateAccessToPortal: async function (values) {
    try {
        const oRouter    = sap.ui.core.UIComponent.getRouterFor(this);
        const oModelUser = this.getModel("oModelUser");


        // 👤 Usuario IAS (SCIM)
        let oUser = values[0]?.Resources?.[0];
        if (!oUser) {
            void 0;
            sap.ui.core.BusyIndicator.hide(0);
            oRouter.navTo("AccessDenied");
            return;
        }

        // 🧩 Nombre
        let sFirstName = oUser?.name?.givenName  || "";
        let sLastName  = oUser?.name?.familyName || "";
        let sFullName  = `${sFirstName} ${sLastName}`.trim();

        oModelUser.setProperty("/bUserName", sFullName);
        localStorage.setItem("userFullName", sFullName);

        // 🧩 Atributos IAS
        let oAttrIAS = oUser["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];
        let aAttr    = oAttrIAS?.attributes || [];

        let oAttr1 = aAttr.find(a => a.name === "customAttribute1"); // Cliente
        let oAttr2 = aAttr.find(a => a.name === "customAttribute2"); // Interno (Vendedor / Coordinador)
        // customAttribute3 podrías dejarlo de backup si quieres:
        let oAttr3 = aAttr.find(a => a.name === "customAttribute3"); // opcional / legacy

        let sBPCliente  = oAttr1?.value || "";
        let sBPInterno2 = oAttr2?.value || "";
        let sBPInterno3 = oAttr3?.value || "";
        // Por compatibilidad: si antes usabas 2 para vendedor y 3 para coordinador,
        // ahora tomamos el que venga:
        let sBPInterno = sBPInterno2 || sBPInterno3;

        // Para algunos usos antiguos tuyos:
        let sBPVendedor = sBPInterno2; // si quieres seguir diferenciando
        let sBPCoord    = sBPInterno3;

        // Cache simple
        const oUserCache = {
            fullName  : sFullName,
            BPCliente : sBPCliente,
            BPInterno : sBPInterno,
            BPVendedor: sBPVendedor,
            BPCoord   : sBPCoord,
            UniNeg    : tUniNeg,
            SalesOrg  : tSalesOrg
        };
        localStorage.setItem("oUserCache", JSON.stringify(oUserCache));

        // ========================================================
        // 1️⃣ CASO CLIENTE (customAttribute1)
        // ========================================================
        if (sBPCliente) {
            let aClientes = values[5]?.oResults || [];
            let oCliente  = aClientes.find(item => item.Customer === sBPCliente);

            const aSalesOrgs = await this._getSalesOrgByBP(sBPCliente);
            if (!Array.isArray(aSalesOrgs) || !aSalesOrgs.includes(tSalesOrg)) {
                void 0;-
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

        // ========================================================
        // 2️⃣ CASO INTERNO (VENDEDOR / COORDINADOR) -> customAttribute2
        // ========================================================
        if (sBPInterno) {
            const sUsuarioIAS = sBPInterno;
            // values[7] debe traer tu OData de vendedores/coordinadores
            let oVendResp   = values[6]?.oResults;
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
                void 0;
                sap.ui.core.BusyIndicator.hide(0);
                oRouter.navTo("AccessDenied");
                return;
            }

            // 📌 Determinar organizaciones de venta permitidas desde _getBPVendedor
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
                void 0;
                sap.ui.core.BusyIndicator.hide(0);
                oRouter.navTo("AccessDenied");
                return;
            }

            // 🔍 Ahora diferenciamos por PERFIL
            const sPerfilCode = (oMatch.perfil   || "").toUpperCase();   // "VD" o "CD"
            const sPerfilDesc = (oMatch.DscPerfil || "").toUpperCase();  // "VENDEDOR" o "COORDINADOR"

            const bIsVendedor = (sPerfilCode === "VD") || sPerfilDesc.includes("VENDEDOR");
            const bIsCoord    = (sPerfilCode === "CD") || sPerfilDesc.includes("COORDINADOR");

            // Guardamos en modelo para usar en filtros (ej. stock Linea con/ sin *)
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

        // ========================================================
        // 3️⃣ SIN ATRIBUTOS VÁLIDOS
        // ========================================================
        void 0;
        sap.ui.core.BusyIndicator.hide(0);
        oRouter.navTo("AccessDenied");

    } catch (oError) {
        void 0;
        sap.ui.core.BusyIndicator.hide(0);
        const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("AccessDenied");
    }
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
                void 0;
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
        _getCreditoCliente: function(sPartner, sSegment = "100102") {
            return new Promise((resolve, reject) => {
                const oModel = this.getOwnerComponent().getModel("oModelEntity");
                if (!oModel) {
                    void 0;
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
                        void 0;
                        reject(oError);
                    }
                });
            });
        },
         _onPressExecute: function () {
            let jFilter = this.oModelProyect.getProperty("/Main/filter") || {},
                bFilter = false;
            if (jFilter.fSeller && jFilter.fSeller.length > 0) bFilter = true;
            if (jFilter.fCodClient && jFilter.fCodClient.length > 0) bFilter = true;
            if (jFilter.fRazSocial && jFilter.fRazSocial.length > 0) bFilter = true;
            if (jFilter.fDocument && jFilter.fDocument.length > 0) bFilter = true;
            sap.ui.core.BusyIndicator.show();
            Promise.all([that._getData(jFilter), that._getClientPet(),that._getDatClient()])
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
                    let aVend     = oDataVend.oResults || [];
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
                        const aSellerFilters = jFilter.fSeller.map(key =>
                            new sap.ui.model.Filter({
                                filters: [
                                    new sap.ui.model.Filter("Seller", sap.ui.model.FilterOperator.EQ, key),
                                ],
                                and: false
                            })
                        );
                        aFilters.push(new sap.ui.model.Filter({ filters: aSellerFilters, and: false }));
                    }
                    // Código Cliente
                    if (jFilter.fCodClient && jFilter.fCodClient.length > 0) {
                        const aCodFilters = jFilter.fCodClient.map(key =>
                            new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.EQ, key)
                        );
                        aFilters.push(new sap.ui.model.Filter({ filters: aCodFilters, and: false }));
                    }
                    // Razón Social
                    if (jFilter.fRazSocial && jFilter.fRazSocial.length > 0) {
                        const aRazFilters = jFilter.fRazSocial.map(key =>
                            new sap.ui.model.Filter("CustomerFullName", sap.ui.model.FilterOperator.Contains, key)
                        );
                        aFilters.push(new sap.ui.model.Filter({ filters: aRazFilters, and: false }));
                    }
                    // Documento (Tax Numbers)
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
                    // Seller (txt12 + txt13)
                    if (Array.isArray(jFilter.fSeller) && jFilter.fSeller.length > 0) {
                        const validKeys = jFilter.fSeller.filter(k => k && k.trim() !== "");
                        if (validKeys.length > 0) {
                            const aSellerOrs = validKeys.map(key =>
                                new sap.ui.model.Filter({
                                    filters: [
                                        new sap.ui.model.Filter("Seller", sap.ui.model.FilterOperator.EQ, key),
                                        new sap.ui.model.Filter("kunn2", sap.ui.model.FilterOperator.EQ, key)
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
                    var sPath = jQuery.sap.getModulePath("com.aris.registropedido.quimico.pe") +
                        "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$filter=SalesOrganization eq '1120' and DistributionChannel eq 'C1' and Division eq 'S1'&$format=json&sap-language=es-ES";
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
            FilterSelling: function () {
                const that = this;

                Promise.all([that._getClientPet(), that._getDatClient()])
                    .then((values) => {
                        const oDataClientes = values[0];
                        const oDataVendedores = values[1];
                        let aClientes = oDataClientes.oResults || [];
                        let aVend = oDataVendedores.oResults || [];
                        let aVendedoresFiltrados = aVend.filter(oVend =>
                            oVend.Seller && oVend.Seller !== "" &&
                            aClientes.some(oCli => oCli.Customer === oVend.Customer)
                        );
                        let aUnicos = [];
                        let oMap = {};
                        aVendedoresFiltrados.forEach(oVend => {
                            if (!oMap[oVend.Seller]) {
                                oMap[oVend.Seller] = true;
                                aUnicos.push(oVend);
                            }
                        });
                        that.oModelProyect.setProperty("/oVendedores", aUnicos);
                        if (!that._dialogFilterSeller) {
                            that._dialogFilterSeller = sap.ui.xmlfragment(
                                that.frgIdFilterSeller,
                                "com.aris.registropedido.quimico.pe.view.dialogs.FilterSeller",
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
           FilterCodClient: function () {
                var that = this;
                Promise.all([that._getClientPet()])
                    .then((values) => {
                        const oResp = values[0];
                        that.oModelProyect.setProperty("/oCliente", oResp.sEstado === "S" ? oResp.oResults : []);
                        if (!that._dialogFilterCodClient) {
                            that._dialogFilterCodClient = sap.ui.xmlfragment(
                                that.frgIdFilterCodClient,
                                "com.aris.registropedido.quimico.pe.view.dialogs.FilterCodClient",
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
                var that = this;
                Promise.all([that._getClientPet()])
                    .then((values) => {
                        const oResp = values[0];
                        that.oModelProyect.setProperty("/oCliente", oResp.sEstado === "S" ? oResp.oResults : []);
                        if (!that._dialogFilterRazonSocial) {
                            that._dialogFilterRazonSocial = sap.ui.xmlfragment(
                                that.frgIdFilterRazonSocial,
                                "com.aris.registropedido.quimico.pe.view.dialogs.FilterRazonSocial",
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
                var that = this;
                Promise.all([that._getClientPet()])
                    .then((values) => {
                        const oResp = values[0];
                        that.oModelProyect.setProperty("/oCliente", oResp.sEstado === "S" ? oResp.oResults : []);
                        if (!that._dialogFilterDocument) {
                            that._dialogFilterDocument = sap.ui.xmlfragment(
                                that.frgIdFilterDocument,
                                "com.aris.registropedido.quimico.pe.view.dialogs.FilterDocument",
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
                onSearch: function (oEvent) {
                const sQuery = oEvent.getParameter("value");
                const oSource = oEvent.getSource();
                const oBinding = oSource.getBinding("items");

                const sDialogId = oSource.getId().split("--").pop();
                let aFieldFilters = [];

                switch (sDialogId) {
                    case "FilterSellerDialog":
                        aFieldFilters = ["Seller", "kunn2"];
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
                    aKeyFields = ["Seller"];
                    aTextFields = ["kunn2"];
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
                    aKeyFields = ["TaxNumber1","TaxNumber2","TaxNumber3","TaxNumber4","TaxNumber5","TaxNumber6"];
                    aTextFields = ["TaxNumber1","TaxNumber2","TaxNumber3","TaxNumber4","TaxNumber5","TaxNumber6"];
                    sFilterProp = "/Main/filter/fDocument";
                    break;
                default:
                    return;
            }
            if (aSelectedContexts && aSelectedContexts.length > 0 && oMultiInput) {
                const aSelectedKeys = [];
                oMultiInput.removeAllTokens();

                aSelectedContexts.forEach(ctx => {
                    const oData = ctx.getObject();
                    const sKey = aKeyFields.map(f => oData[f]).find(v => v && v.trim() !== "") || "";
                    const sText = aTextFields.map(f => oData[f]).find(v => v && v.trim() !== "") || "";
                    if (sKey) {
                        aSelectedKeys.push(sKey);
                        const bExists = oMultiInput.getTokens().some(token => token.getKey() === sKey);
                        if (!bExists) {
                            const oToken = new sap.m.Token({ key: sKey, text: sText || sKey });
                            oMultiInput.addToken(oToken);
                        }
                    }
                });
                if (sFilterProp) {
                    this.oModelProyect.setProperty(sFilterProp, aSelectedKeys);
                }
            }
        },
            onLiveFilter: function (oEvent) {
                const oSource = oEvent.getSource();
                const sValue = oEvent.getParameter("value");

                if (sValue) {
                    this._sLiveValue = this._sLiveValue || {};
                    this._sLiveValue[oSource.getId()] = sValue;
                } else {
                    if (this._sLiveValue) {
                        delete this._sLiveValue[oSource.getId()];
                    }
                }
                this.onApplyFiltersToTable();
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
                },
                    onSuggestSeller: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;
            if (!term) { b.filter([]); return; }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            b.filter([ new F([
                new F("kunn2", FO.Contains, term),
                new F("Seller", FO.Contains, term)
            ], false) ]);
            },

            onSuggestClient: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;
            if (!term) { b.filter([]); return; }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            b.filter([ new F([
                new F("Customer", FO.Contains, term),
                new F("CustomerFullName", FO.Contains, term)
            ], false) ]);
            },

            onSuggestRazonSocial: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;
            if (!term) { b.filter([]); return; }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            b.filter([ new F([ new F("CustomerFullName", FO.Contains, term) ], false) ]);
            },

            onSuggestDocument: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;
            if (!term) { b.filter([]); return; }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;
            b.filter([ new F([
                new F("TaxNumber1", FO.Contains, term),
                new F("TaxNumber2", FO.Contains, term),
                new F("TaxNumber3", FO.Contains, term),
                new F("TaxNumber4", FO.Contains, term),
                new F("TaxNumber5", FO.Contains, term),
                new F("TaxNumber6", FO.Contains, term),
                new F("CustomerFullName", FO.Contains, term) // ayuda a encontrar por nombre
            ], false) ]);
            },
            _getTokenKeys: function (oMI) {
            return oMI.getTokens().map(t => t.getKey()).filter(Boolean);
            },

            _setArray: function (path, arr) {
            this.getModel("oModelProyect").setProperty(path, Array.from(new Set(arr)));
            },

            // Handlers por campo
            onTokenUpdateSeller: function (oEvent) {
                const oMI = this.byId("multiInputSeller");
                // 🔹 Forzamos que el texto del token sea solo el código (key)
                oMI.getTokens().forEach(token => {
                    token.setText(token.getKey());
                });
                const keys = this._getTokenKeys(oMI);
                this._setArray("/Main/filter/fSeller", keys);
            },

            onTokenUpdateClient: function (oEvent) {
                const oMI = this.byId("multiInputCodClient");
                oMI.getTokens().forEach(token => {
                    token.setText(token.getKey()); // 👈 Fuerza que el texto = código
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
                    new F({ filters: [ new F("Seller", FO.EQ, k), new F("txt13", FO.EQ, k) ], and: false })
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
                    new F({ filters: [ new F("CustomerFullName", FO.Contains, k) ], and: false })
                ),
                and: false
                }));
            }

            if (jFilter.fRazSocial?.length) {
                a.push(new F({
                    filters: jFilter.fRazSocial.map(k =>
                        new F({ filters: [
                            new F("CustomerFullName", FO.Contains, k),
                            new F("TaxNumber1", FO.Contains, k),
                            new F("TaxNumber2", FO.Contains, k),
                            new F("TaxNumber3", FO.Contains, k),
                            new F("TaxNumber4", FO.Contains, k),
                            new F("TaxNumber5", FO.Contains, k),
                            new F("TaxNumber6", FO.Contains, k)
                        ], and: false })
                    ),
                    and: false
                }));
            }

        return a;
        },
            formatTipoCambioLabel: function(oTipChangeData) {
			if (!oTipChangeData || !oTipChangeData.from || !oTipChangeData.to) {
				return "Tipo de cambio: N/A";
			}
			let fValorFrom = parseFloat(oTipChangeData.from.valor) || 0; // USD → PEN
			let fValorTo   = parseFloat(oTipChangeData.to.valor)   || 0; // PEN → USD
			let sValorFrom = new Intl.NumberFormat("es-PE", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(fValorFrom);
			let sValorTo = new Intl.NumberFormat("es-PE", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(fValorTo);
			return `TIPO CAMBIO:${oTipChangeData.to.moneda}: ${sValorFrom} ${oTipChangeData.from.moneda}`;
		}


    });
});