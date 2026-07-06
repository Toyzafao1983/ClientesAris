sap.ui.define([
    "com/aris/consultaestadocuenta/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/resource/ResourceModel",
    "com/aris/consultaestadocuenta/pe/model/models",
    "com/aris/consultaestadocuenta/pe/model/formatter",
    "com/aris/consultaestadocuenta/pe/services/Services",
    "com/aris/consultaestadocuenta/pe/util/util",
    "com/aris/consultaestadocuenta/pe/util/utilUI",

    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (BaseController, Controller, ResourceModel, models, Formatter, Services, util, utilUI, Filter, FilterOperator) => {
    "use strict";
    var that;
    var tUniNeg = "", tRol = "", tPerfil = "", tSalesOrg = "";
    formatter: Formatter;

    return BaseController.extend("com.aris.consultaestadocuenta.pe.controller.Main", {
        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("Main").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));

            this.frgIdTableMain = "frgIdTableMain";
            this.frgIdSelectClient = "frgIdSelectClient";
            this.frgIdFilterSeller = "frgIdFilterSeller";
            this.frgIdFilterCodClient = "frgIdFilterCodClient";
            this.frgIdFilterRazonSocial = "frgIdFilterRazonSocial";
            this.frgIdFilterDocument = "frgIdFilterDocument";
            this._bMainInitialized = false;
            let sURL = window.parent.location.href;
            if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; }
            if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; }
            if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; }
            const oModelUser = this.getModel("oModelUser");
            if (oModelUser) {
                oModelUser.setProperty("/bUniNeg", tUniNeg);
                oModelUser.setProperty("/bShowMain", false);
            }

        },
        handleRouteMatched: async function (bInit) {
            sap.ui.core.BusyIndicator.show(0);

            try {
                if (!this._bMainInitialized) {
                    this._onClearDataFilter();
                    this._bMainInitialized = true;
                }

                const values = await Promise.all([
                    this._getUsers(),
                    this._getPrueba(),
                    this._getClient(tUniNeg),
                    this._getDatClient(tUniNeg),
                    this._getUsuarios(),
                    this._getBPVendedor()
                ]);

                this.oModelProyect = this.getModel("oModelProyect");
                this.oModelData = this.getModel("oModelData");
                this.oModelUser = this.getModel("oModelUser");
                this.oModelDevice = this.getModel("oModelDevice");

                const aClientesAll = values?.[2]?.oResults || [];
                const aDatClientAll = values?.[3]?.oResults || [];

                this.oModelProyect.setProperty("/oClienteFilterAll", aClientesAll);
                this.oModelProyect.setProperty("/oDatClientAll", aDatClientAll);
                this.oModelProyect.setProperty("/oClienteFilter", aClientesAll);

                const aSellerRaw = values?.[3]?.oResults || [];
                const m = new Map();

                aSellerRaw.forEach(r => {
                    const k = (r.kunn2 || "").toString().trim();
                    if (k && !m.has(k)) {
                        m.set(k, r);
                    }
                });

                this.oModelProyect.setProperty("/oSellerUnique", Array.from(m.values()));
                this.oModelProyect.setSizeLimit(99999999);
                this.oModelData.setSizeLimit(99999999);

                this._syncFiltersFromTokens();

                const bContinueMain = await this._validateAccessToPortal(values);
                if (!bContinueMain) {
                    sap.ui.core.BusyIndicator.hide(0);
                    return;
                }

                const sUni = this.oModelUser.getProperty("/bUniNeg") || tUniNeg;
                const bIsVendedor = !!this.oModelUser.getProperty("/bIsVendedor");
                const bDisableSellerFilter = (sUni === "QUIMICOS" && bIsVendedor);

                this.oModelUser.setProperty("/bDisableSellerFilter", bDisableSellerFilter);

                if (bDisableSellerFilter) {
                    const oProj = this.getModel("oModelProyect");
                    const j = oProj.getProperty("/Main/filter") || {};
                    j.fSeller = [];
                    oProj.setProperty("/Main/filter", j);

                    const oMI = this.byId("multiInputSeller");
                    if (oMI) {
                        oMI.removeAllTokens();
                    }
                }

                let sIdioma = this.getModel("oModelProyect").getProperty("/sIdioma");
                if (sIdioma == undefined) {
                    this._setLanguageModel("esp");
                } else {
                    this._setLanguageModel(sIdioma);
                }

                const sRol = this.oModelUser.getProperty("/bRol") || "";

                if (sRol === "CLIENTES") {
                    this.getModel("oModelUser").setProperty("/hideAdvancedFields", true);

                    if (tUniNeg === "TEXTILES" || tUniNeg === "QUIMICOS") {
                        this.getModel("oModelUser").setProperty("/hideSpecialFields", true);
                    } else {
                        this.getModel("oModelUser").setProperty("/hideSpecialFields", false);
                    }
                } else {
                    this.getModel("oModelUser").setProperty("/hideAdvancedFields", false);

                    if (tUniNeg === "TEXTILES" || tUniNeg === "QUIMICOS") {
                        this.getModel("oModelUser").setProperty("/hideSpecialFields", true);
                    } else {
                        this.getModel("oModelUser").setProperty("/hideSpecialFields", false);
                    }
                }

                let sComponentTable = "TableMainDesktop";
                if (!this.fragmentTable) {
                    this.fragmentTable = sap.ui.xmlfragment(
                        this.frgIdTableMain,
                        this.route + ".view.fragments." + sComponentTable,
                        this
                    );
                    this._byId("vbTableMain").addItem(this.fragmentTable);
                }

                sap.ui.getCore().applyChanges();

                this._syncTokensFromFilters();

                if (!bDisableSellerFilter) {
                    this._setDefaultSellerToken();
                    await this._applyScopeBySelectedSellers();
                } else {
                    this.oModelProyect.setProperty("/oClienteFilter", aClientesAll);
                }

                this.oModelUser.setProperty("/bShowMain", true);

                sap.ui.core.BusyIndicator.hide(0);

            } catch (oError) {
                void 0;
                this.getMessageBox("error", this.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            }
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

            if (!oUser.getProperty("/bIsVendedor")) {
                oProj.setProperty("/oClienteFilter", aClientesAll);
                return;
            }

            const jFilter = oProj.getProperty("/Main/filter") || {};
            const aSellerBPs = (jFilter.fSeller || [])
                .map(x => (x || "").toString().trim())
                .filter(Boolean);
            if (!aSellerBPs.length) {
                oProj.setProperty("/oClienteFilter", aClientesAll);
                return;
            }

            const setCustomers = new Set();
            aDatAll.forEach(r => {
                const bp = (r.kunn2 || "").toString().trim();
                const customer = (r.Customer || "").toString().trim();
                if (bp && customer && aSellerBPs.includes(bp)) setCustomers.add(customer);
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
        _getCustomerAddress: function (sCustomer) {
            const oModel = this.getOwnerComponent().getModel("oModelEntity");

            if (!oModel) {
                void 0;
                return Promise.reject("Modelo no definido");
            }

            return new Promise((resolve, reject) => {
                oModel.read(`/iDireccionesSet(Businesspartner='${sCustomer}')`, {
                    success: (oResultDireccion) => {
                        if (oResultDireccion) {
                            const oDir = oResultDireccion;
                            oDir.FullAddress = `${oDir.Street || ""} ${oDir.HouseNo || ""} ${oDir.StrSuppl1 || ""} ${oDir.StrSuppl2 || ""}, ${oDir.District || ""}, ${oDir.City || ""}, ${oDir.Country || ""}`;
                            resolve(oDir);
                        } else {
                            resolve({ FullAddress: "" });
                        }
                    },
                    error: (oError) => {
                        void 0;
                        reject(oError);
                    }
                });
            });
        },
        _getLoanedProducts: function (sCustomer) {
            const oModel = this.getOwnerComponent().getModel("oModelEntity"); // Usamos el mismo modelo OData

            if (!oModel) {
                void 0;
                return Promise.reject("Modelo no definido");
            }

            return new Promise((resolve, reject) => {
                const sUrl = "/LoanedProductsSet"; // Path de la entidad
                const aFilters = [
                    new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.EQ, sCustomer)
                ];

                oModel.read(sUrl, {
                    filters: aFilters,
                    success: (oData) => {
                        resolve(oData.results || []); // Devuelve un array vacío si no hay resultados
                    },
                    error: (oError) => {
                        void 0;
                        reject(oError);
                    }
                });
            });
        },
        _validateAccessToPortal: async function (values) {
            const that = this;

            try {
                let sURL = window.parent.location.href;

                if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; tSalesOrg = "1110"; }
                if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; tSalesOrg = "1120"; }
                if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; tSalesOrg = "1130"; }

                let oUser = values?.[0]?.Resources?.[0];
                if (!oUser) {
                    sap.ui.core.BusyIndicator.hide(0);
                    sap.m.MessageBox.error(
                        "No se pudo obtener la información del usuario.",
                        { onClose: () => (window.location.href = "/") }
                    );
                    return false;
                }

                let sFirstName = oUser?.name?.givenName || "";
                let sLastName = oUser?.name?.familyName || "";
                let sFullName = `${sFirstName} ${sLastName}`.trim();

                that.getModel("oModelUser").setProperty("/bUserName", sFullName);
                localStorage.setItem("userFullName", sFullName);

                let oAttrIAS = oUser["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];
                let aAttr = oAttrIAS?.attributes || [];
                let oAttr1 = aAttr.find(a => a.name === "customAttribute1");
                let oAttr2 = aAttr.find(a => a.name === "customAttribute2");
                let oAttr3 = aAttr.find(a => a.name === "customAttribute3");

                let sBPCliente = oAttr1?.value || "";
                let sBPVendedor = oAttr2?.value || "";
                let sBPCoord = oAttr3?.value || "";

                const oModelUser = that.getModel("oModelUser");

                if (sBPCliente) {
                    const vSalesOrgsRaw = await that._getSalesOrgByBP(sBPCliente);

                    const aSalesOrgs = Array.isArray(vSalesOrgsRaw)
                        ? vSalesOrgsRaw.map(function (x) {
                            return String(x || "").trim();
                        }).filter(Boolean)
                        : (vSalesOrgsRaw ? [String(vSalesOrgsRaw).trim()] : []);

                    const sCurrentSalesOrg = String(tSalesOrg || "").trim();

                    void 0;

                    if (!aSalesOrgs.includes(sCurrentSalesOrg)) {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error(
                            "No tiene permisos para acceder a esta aplicación.",
                            { onClose: () => (window.location.href = "/") }
                        );
                        return false;
                    }

                    let aClientes = values?.[2]?.oResults || [];
                    let oCliente = aClientes.find(function (item) {
                        return String(item.Customer || "").trim() === String(sBPCliente || "").trim();
                    });

                    // Si no vino en la carga inicial, consultar directamente el BP.
                    // Esto evita bloquear al cliente cuando Customer vino incompleto, vacío o limitado por $top.
                    if (!oCliente) {
                        void 0;

                        const oRespCliente = await that._getClient(tUniNeg, sBPCliente);
                        const aClienteDirecto = oRespCliente?.oResults || [];

                        oCliente = aClienteDirecto.find(function (item) {
                            return String(item.Customer || "").trim() === String(sBPCliente || "").trim();
                        });
                    }

                    // Si la unidad organizacional existe, se permite continuar.
                    // Si no se encontró maestro Customer, se navega con cabecera mínima para no bloquear falsamente.
                    if (!oCliente) {
                        void 0;

                        oCliente = {
                            Customer: sBPCliente,
                            CustomerName: "",
                            BusinessPartner: sBPCliente,
                            SalesOrganization: sCurrentSalesOrg
                        };
                    }

                    oModelUser.setProperty("/bRol", "CLIENTES");
                    oModelUser.setProperty("/bBP", sBPCliente);
                    oModelUser.setProperty("/bUniNeg", tUniNeg);
                    oModelUser.setProperty("/customAttribute", "customAttribute1");
                    oModelUser.setProperty("/oSalesOrgIAS", aSalesOrgs);
                    oModelUser.setProperty("/bIsCliente", true);
                    oModelUser.setProperty("/bIsInterno", false);
                    oModelUser.setProperty("/bIsVendedor", false);

                    that.getModel("oModelProyect").setProperty("/oCabecera", oCliente);

                    sap.ui.core.BusyIndicator.show(0);
                    try {
                        await that._navigateDetailForCustomer(sBPCliente, oCliente);
                    } finally {
                        sap.ui.core.BusyIndicator.hide(0);
                    }

                    return false;
                }

                if (sBPVendedor || sBPCoord) {
                    let sUsuarioIAS = sBPVendedor || sBPCoord;

                    let oVendResp = values?.[5]?.oResults;
                    let aVendedores = [];

                    if (oVendResp) {
                        if (oVendResp.d?.results) {
                            aVendedores = oVendResp.d.results;
                        } else if (Array.isArray(oVendResp)) {
                            aVendedores = oVendResp;
                        }
                    }

                    let oMatch = aVendedores.find(item =>
                        (item.usuario || "").toString().trim() === sUsuarioIAS.toString().trim() &&
                        (item.orgventas || "").toString().trim() === tSalesOrg.toString().trim()
                    );

                    if (!oMatch) {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error(
                            "No tiene permisos para acceder a esta aplicación.",
                            { onClose: () => (window.location.href = "/") }
                        );
                        return false;
                    }

                    const sPerfil = (oMatch.DscPerfil || oMatch.perfil || oMatch.Perfil || "")
                        .toString().toUpperCase().trim();

                    const bIsVendedor = sPerfil.includes("VENDEDOR");
                    const bIsCoord = sPerfil.includes("COORDINADOR");

                    oModelUser.setProperty("/bIsVendedor", bIsVendedor && !bIsCoord);
                    oModelUser.setProperty("/bPerfil", oMatch.DscPerfil || sPerfil);

                    if (bIsCoord) {
                        oModelUser.setProperty("/bRol", "COORDINADOR");
                    } else if (bIsVendedor) {
                        oModelUser.setProperty("/bRol", "VENDEDOR");
                    } else {
                        oModelUser.setProperty("/bRol", "INTERNO");
                    }

                    if (bIsVendedor && !bIsCoord) {
                        const sBP = (oMatch.kunn2 || oMatch.bp || oMatch.BP || oMatch.Seller || oMatch.txt13 || "")
                            .toString().trim() || sUsuarioIAS;

                        oModelUser.setProperty("/bBPVendedor", sBP);
                    } else {
                        oModelUser.setProperty("/bBPVendedor", "");
                    }

                    let aSalesOrgsRaw = await that._getBPVendedor(sUsuarioIAS);
                    let aSalesOrgs = [];

                    if (aSalesOrgsRaw?.d?.results) {
                        aSalesOrgs = aSalesOrgsRaw.d.results.map(r => (r.orgventas || "").toString().trim());
                    } else if (aSalesOrgsRaw?.oResults) {
                        aSalesOrgs = aSalesOrgsRaw.oResults.map(r => (r.orgventas || "").toString().trim());
                    }

                    if (!aSalesOrgs.includes((tSalesOrg || "").toString().trim())) {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error(
                            "No tiene permisos para acceder a esta aplicación.",
                            { onClose: () => (window.location.href = "/") }
                        );
                        return false;
                    }

                    oModelUser.setProperty("/bUniNeg", tUniNeg);
                    oModelUser.setProperty("/customAttribute", sBPCoord ? "customAttribute3" : "customAttribute2");
                    oModelUser.setProperty("/bIsCliente", false);
                    oModelUser.setProperty("/bIsInterno", true);

                    return true;
                }

                sap.ui.core.BusyIndicator.hide(0);
                sap.m.MessageBox.error(
                    "No se encontraron permisos válidos para su usuario.",
                    { onClose: () => (window.location.href = "/") }
                );
                return false;

            } catch (oError) {
                void 0;
                sap.ui.core.BusyIndicator.hide(0);
                sap.m.MessageBox.error(
                    "Ocurrió un error al validar el acceso a la aplicación."
                );
                return false;
            }
        },
        _navigateDetailForCustomer: function (sKunnr, oCabecera) {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelEntity = this.getOwnerComponent().getModel("oModelEntity");
            const sBukrs = "1001";
            const sForma = "1";
            const sFechaHoy = new Date();
            const sFormattedDate = Formatter._formatDateForOData(sFechaHoy);

            if (!oModelEntity) {
                return Promise.reject("Modelo OData no definido");
            }
            if (oCabecera) {
                oModelProyect.setProperty("/oCabecera", oCabecera);
            }
            oModelProyect.setProperty("/oDireccionCliente", { FullAddress: "" });
            oModelProyect.setProperty("/oLoanedProducts", []);
            oModelProyect.setProperty("/oDetalle", []);
            const aFilters = [
                new sap.ui.model.Filter("Bukrs", sap.ui.model.FilterOperator.EQ, sBukrs),
                new sap.ui.model.Filter("Kunnr", sap.ui.model.FilterOperator.EQ, sKunnr),
                new sap.ui.model.Filter("Datum", sap.ui.model.FilterOperator.EQ, sFormattedDate),
                new sap.ui.model.Filter("Forma", sap.ui.model.FilterOperator.EQ, sForma)
            ];
            return new Promise((resolve, reject) => {
                oModelEntity.read("/eEstadoCuentaSet", {
                    filters: aFilters,
                    urlParameters: {
                        "$select": this._getEstadoCuentaListSelect()
                    },
                    success: (oData) => {
                        oModelProyect.setProperty("/oDetalle", oData.results || []);

                        Promise.all([
                            this._getCustomerAddress(sKunnr),
                            this._getLoanedProducts(sKunnr)
                        ])
                            .then(([oDir, aLoaned]) => {
                                const oDireccion = (oDir && oDir.FullAddress)
                                    ? oDir
                                    : { FullAddress: "" };

                                oModelProyect.setProperty("/oDireccionCliente", oDireccion);
                                oModelProyect.setProperty("/oLoanedProducts", aLoaned || []);
                                oModelProyect.refresh(true);

                                this.oRouter.navTo("Detail", { app: sKunnr });
                                resolve();
                            })
                            .catch((err) => {
                                oModelProyect.setProperty("/oDireccionCliente", { FullAddress: "" });
                                oModelProyect.setProperty("/oLoanedProducts", []);
                                oModelProyect.refresh(true);
                                this.oRouter.navTo("Detail", { app: sKunnr });
                                resolve();
                            });
                    },
                    error: (oError) => {
                        sap.m.MessageToast.show("Error al obtener estado de cuenta del cliente");
                        oModelProyect.setProperty("/oDireccionCliente", { FullAddress: "" });
                        oModelProyect.setProperty("/oLoanedProducts", []);
                        oModelProyect.refresh(true);
                        reject(oError);
                    }
                });
            });
        },
        _onPressNavigateDetail: function (oEvent) {
            const jData = oEvent.getSource().getBindingContext("oModelProyect").getObject();
            this.oModelProyect.setProperty("/oCabecera", jData);

            const sKunnr = jData.Customer;
            const sBukrs = "1001";
            const sForma = "1";
            const sDatum = new Date();
            const sFormattedDate = Formatter._formatDateForOData(sDatum);

            sap.ui.core.BusyIndicator.show(0);

            const oModel = this.getOwnerComponent().getModel("oModelEntity");

            this.oModelProyect.setProperty("/oDireccionCliente", { FullAddress: "" });
            this.oModelProyect.setProperty("/oLoanedProducts", []);
            const aFilters = [
                new sap.ui.model.Filter("Bukrs", sap.ui.model.FilterOperator.EQ, sBukrs),
                new sap.ui.model.Filter("Kunnr", sap.ui.model.FilterOperator.EQ, sKunnr),
                new sap.ui.model.Filter("Datum", sap.ui.model.FilterOperator.EQ, sFormattedDate),
                new sap.ui.model.Filter("Forma", sap.ui.model.FilterOperator.EQ, sForma)
            ];
            oModel.read("/eEstadoCuentaSet", {
                filters: aFilters,
                urlParameters: {
                    "$select": this._getEstadoCuentaListSelect()
                },
                success: (oData) => {
                    this.oModelProyect.setProperty("/oDetalle", oData.results || []);
                    Promise.all([
                        this._getCustomerAddress(sKunnr),
                        this._getLoanedProducts(sKunnr)
                    ])
                        .then(([oDir, aLoaned]) => {
                            const oDireccion = oDir && oDir.FullAddress ? oDir : { FullAddress: "" };
                            this.oModelProyect.setProperty("/oDireccionCliente", oDireccion);
                            this.oModelProyect.setProperty("/oLoanedProducts", aLoaned || []);
                            this.oModelProyect.refresh(true);
                            this.oRouter.navTo("Detail", { app: jData.Customer });
                        })
                        .catch((err) => {
                            void 0;
                            this.oModelProyect.setProperty("/oDireccionCliente", { FullAddress: "" });
                            this.oModelProyect.setProperty("/oLoanedProducts", []);
                            this.oModelProyect.refresh(true);
                            this.oRouter.navTo("Detail", { app: jData.Customer });
                        })
                        .finally(() => {
                            sap.ui.core.BusyIndicator.hide();
                        });
                },
                error: (oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    void 0;
                    sap.m.MessageToast.show("Error al obtener estado de cuenta del cliente");
                    this.oModelProyect.setProperty("/oDireccionCliente", { FullAddress: "" });
                    this.oModelProyect.setProperty("/oLoanedProducts", []);
                    this.oModelProyect.refresh(true);
                }
            });
        },
        _onPressExecute: function () {
            const that = this;

            this._syncFiltersFromTokens();
            if (!this._requireSellerIfVendedor()) {
                return;
            }

            const jFilter = this.oModelProyect.getProperty("/Main/filter") || {};

            sap.ui.core.BusyIndicator.show(0);

            Promise.all([
                that._getData(jFilter),
                that._getClient(tUniNeg),
                that._getDatClient(tUniNeg)
            ])
                .then((values) => {
                    const oData = values[0];

                    if (oData.sEstado === "E") {
                        this.getMessageBox("error", this.getI18nText("errorData"));
                        sap.ui.core.BusyIndicator.hide();
                        return;
                    }

                    // Construir reporte (clientes + vendedor)
                    const aClientes = this.oModelProyect.getProperty("/oClienteFilter") || [];
                    const aVend = this.oModelProyect.getProperty("/oDatClientAll") || [];

                    const aReporte = aClientes.map(oCliente => {
                        const oVend = aVend.find(oExt => oExt.Customer === oCliente.Customer);
                        return {
                            ...oCliente,
                            Seller: oVend ? (oVend.Seller || "") : "",
                            kunn2: oVend ? (oVend.kunn2 || "") : ""
                        };
                    });

                    this.oModelProyect.setProperty("/oReporte", aReporte);

                    // ✅ Agarrar la tabla REAL dentro del fragmento (no el VBox)
                    const oTbl = sap.ui.core.Fragment.byId(this.frgIdTableMain, "tblMain");
                    if (!oTbl) {
                        // Si por alguna razón aún no está cargado el fragment/tabla
                        sap.ui.core.BusyIndicator.hide();
                        return;
                    }

                    // Aplicar filtros a la tabla
                    setTimeout(() => {
                        const oBinding = oTbl.getBinding("items");
                        if (oBinding) {
                            const aFilters = this._buildTableFilters(jFilter);
                            oBinding.filter(aFilters || []);
                        }
                        sap.ui.core.BusyIndicator.hide();
                    }, 0);
                })
                .catch((oError) => {
                    this.getMessageBox("error", this.getI18nText("errorData"));
                    sap.ui.core.BusyIndicator.hide();
                });
        },

        _expandSellerKeysToSellerCodes: function (aKeys) {
            const oModel = this.getModel("oModelProyect");
            const aMap = oModel?.getProperty("/oSellerUnique") || [];

            const mBP2Code = new Map();
            aMap.forEach(r => {
                const bp = (r.kunn2 || "").toString().trim();
                const sc = (r.Seller || r.txt13 || "").toString().trim();
                if (bp && sc && !mBP2Code.has(bp)) {
                    mBP2Code.set(bp, sc);
                }
            });
            const aExpanded = [];
            (aKeys || []).forEach(k => {
                const key = (k || "").toString().trim();
                if (!key) return;
                aExpanded.push(mBP2Code.get(key) || key);
            });

            return Array.from(new Set(aExpanded));
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

                    // ✅ SELLER: fSeller viene con BP (kunn2) => lo convertimos a Seller/txt13
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
                                        new sap.ui.model.Filter("txt13", sap.ui.model.FilterOperator.EQ, code)
                                    ],
                                    and: false
                                })
                            );
                            that.aFilter.push(new sap.ui.model.Filter({ filters: aSellerOrs, and: false }));
                        }
                    }

                    // Código Cliente (Customer)
                    if (Array.isArray(jFilter.fCodClient) && jFilter.fCodClient.length > 0) {
                        const validKeys = jFilter.fCodClient
                            .map(k => (k || "").toString().trim())
                            .filter(Boolean);

                        if (validKeys.length > 0) {
                            const aCodOrs = validKeys.map(key =>
                                new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.EQ, key)
                            );
                            that.aFilter.push(new sap.ui.model.Filter({ filters: aCodOrs, and: false }));
                        }
                    }

                    // Razón Social (CustomerFullName + TaxNumbers)
                    if (Array.isArray(jFilter.fRazSocial) && jFilter.fRazSocial.length > 0) {
                        const validKeys = jFilter.fRazSocial
                            .map(k => (k || "").toString().trim())
                            .filter(Boolean);

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
                    if (Array.isArray(jFilter.fDocument) && jFilter.fDocument.length > 0) {
                        const validKeys = jFilter.fDocument
                            .map(k => (k || "").toString().trim())
                            .filter(Boolean);

                        if (validKeys.length > 0) {
                            const aDocOrs = validKeys.map(key =>
                                new sap.ui.model.Filter({
                                    filters: [
                                        new sap.ui.model.Filter("CustomerFullName", sap.ui.model.FilterOperator.Contains, key),
                                        new sap.ui.model.Filter("TaxNumber1", sap.ui.model.FilterOperator.Contains, key),
                                        new sap.ui.model.Filter("TaxNumber2", sap.ui.model.FilterOperator.Contains, key),
                                        new sap.ui.model.Filter("TaxNumber3", sap.ui.model.FilterOperator.Contains, key),
                                        new sap.ui.model.Filter("TaxNumber4", sap.ui.model.FilterOperator.Contains, key),
                                        new sap.ui.model.Filter("TaxNumber5", sap.ui.model.FilterOperator.Contains, key),
                                        new sap.ui.model.Filter("TaxNumber6", sap.ui.model.FilterOperator.Contains, key)
                                    ],
                                    and: false
                                })
                            );
                            that.aFilter.push(new sap.ui.model.Filter({ filters: aDocOrs, and: false }));
                        }
                    }

                    var sPath = jQuery.sap.getModulePath("com.aris.registropedido.textiles.pe") +
                        "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/ZC_CLIENTES?$filter=SalesOrganization eq '1110' and DistributionChannel eq 'C1' and Division eq 'S1'&$format=json&sap-language=es-ES";

                    Services.getoDataERPSync(that, sPath, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData, message) {
                                oResp.sEstado = "S";
                                oResp.oResults = oData.results;
                                resolve(oResp);
                            },
                            error: function (message) {
                                oResp.oResults = [];
                                oResp.sEstado = "S";
                                oResp.oResults = models.JsonReporte().d.results;

                                // ✅ Obtener la tabla real (id="tblMain" en el fragment)
                                const oTbl = sap.ui.core.Fragment.byId(that.frgIdTableMain, "tblMain");
                                const oBinding = oTbl && oTbl.getBinding && oTbl.getBinding("items");

                                if (oBinding) {
                                    oBinding.filter(that.aFilter || []);
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
        //para cambiar idioma

        onLanguageEsp: function () {
            this._setLanguageModel("esp");
        },

        onLanguageEng: function () {
            this._setLanguageModel("ing");
        },
        FilterSelling: function () {
            const that = this;

            Promise.all([that._getClient(tUniNeg), that._getDatClient(tUniNeg)])
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
                        const k = (oVend.kunn2 || "").toString().trim();
                        if (k && !oMap[k]) {
                            oMap[k] = true;
                            aUnicos.push(oVend);
                        }
                    });

                    that.oModelProyect.setProperty("/oVendedores", aUnicos);

                    // 3) Abrir diálogo
                    if (!that._dialogFilterSeller) {
                        that._dialogFilterSeller = sap.ui.xmlfragment(
                            that.frgIdFilterSeller,
                            "com.aris.consultaestadocuenta.pe.view.dialogs.FilterSeller",
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
            if (!this._requireSellerIfVendedor()) return;
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
                        "com.aris.consultaestadocuenta.pe.view.dialogs.FilterCodClient",
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
            if (!this._requireSellerIfVendedor()) return;
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
                        "com.aris.consultaestadocuenta.pe.view.dialogs.FilterRazonSocial",
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
            if (!this._requireSellerIfVendedor()) return;
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
                        "com.aris.consultaestadocuenta.pe.view.dialogs.FilterDocument",
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

            // Si no seleccionaron nada: opcionalmente NO hacemos nada (conserva lo anterior)
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
            if (sDialogId === "FilterSellerDialog") {
                const oModelUser = this.getModel("oModelUser");
                const bIsVendedor = !!oModelUser?.getProperty("/bIsVendedor");
                const bDisable = !!oModelUser?.getProperty("/bDisableSellerFilter");

                if (bIsVendedor && !bDisable) {
                    this._applyScopeBySelectedSellers();
                }
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

            const oTable = this.byId("vbTableMain");
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
        _getTokenKeys: function (oMI) {
            return oMI.getTokens().map(t => t.getKey()).filter(Boolean);
        },

        _setArray: function (path, arr) {
            this.getModel("oModelProyect").setProperty(path, Array.from(new Set(arr)));
        },
        _syncFiltersFromTokens: function () {
            const oModel = this.getModel("oModelProyect");
            if (!oModel) {
                return;
            }

            const jFilter = oModel.getProperty("/Main/filter") || {};

            const oMISeller = this.byId("multiInputSeller");
            if (oMISeller) {
                oMISeller.getTokens().forEach(token => token.setText(token.getKey()));
                jFilter.fSeller = this._getTokenKeys(oMISeller);
            }

            const oMICodClient = this.byId("multiInputCodClient");
            if (oMICodClient) {
                oMICodClient.getTokens().forEach(token => token.setText(token.getKey()));
                jFilter.fCodClient = this._getTokenKeys(oMICodClient);
            }

            const oMIRazon = this.byId("multiInputRazonSocial");
            if (oMIRazon) {
                jFilter.fRazSocial = oMIRazon.getTokens().map(t => t.getText()).filter(Boolean);
            }

            const oMIDoc = this.byId("multiInputDocument");
            if (oMIDoc) {
                jFilter.fDocument = this._getTokenKeys(oMIDoc);
            }

            oModel.setProperty("/Main/filter", jFilter);
        },

        // Token Cuando Regresas a la vista main
        _syncTokensFromFilters: function () {
            const oModel = this.getModel("oModelProyect");
            const j = oModel.getProperty("/Main/filter") || {};

            const oMISeller = this.byId("multiInputSeller");
            if (oMISeller) {
                oMISeller.removeAllTokens();
                (j.fSeller || []).forEach(k => oMISeller.addToken(new sap.m.Token({ key: k, text: k })));
            }

            const oMICod = this.byId("multiInputCodClient");
            if (oMICod) {
                oMICod.removeAllTokens();
                (j.fCodClient || []).forEach(k => oMICod.addToken(new sap.m.Token({ key: k, text: k })));
            }
            const oMIRaz = this.byId("multiInputRazonSocial");
            if (oMIRaz) {
                oMIRaz.removeAllTokens();
                (j.fRazSocial || []).forEach(t => oMIRaz.addToken(new sap.m.Token({ key: t, text: t })));
            }
            const oMIDoc = this.byId("multiInputDocument");
            if (oMIDoc) {
                oMIDoc.removeAllTokens();
                (j.fDocument || []).forEach(k => oMIDoc.addToken(new sap.m.Token({ key: k, text: k })));
            }
        },
        onTokenUpdateSeller: function () {
            const oMI = this.byId("multiInputSeller");
            if (!oMI) return;

            oMI.getTokens().forEach(t => {
                if (!t.getKey() && t.getText()) t.setKey(t.getText().trim());
                t.setText((t.getKey() || "").trim());
            });

            const keys = oMI.getTokens().map(t => t.getKey()).filter(Boolean);
            this._setArray("/Main/filter/fSeller", keys);
            if (!this.getModel("oModelUser")?.getProperty("/bDisableSellerFilter")) {
                this._applyScopeBySelectedSellers();
            }
        },
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
                        new F({
                            filters: [
                                new F("kunn2", FO.EQ, k),
                                new F("Seller", FO.EQ, k),
                                new F("txt13", FO.EQ, k)
                            ],
                            and: false
                        })
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

            if (jFilter.fDocument?.length) {
                a.push(new F({
                    filters: jFilter.fDocument.map(k =>
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
        _getClient: function (tUniNeg, sCustomer) {
            that = this;
            try {
                var oResp = {
                    "sEstado": "E",
                    "oResults": []
                };

                return new Promise(function (resolve, reject) {
                    var mapOrg = {
                        "TEXTILES": "1110",
                        "QUIMICOS": "1120",
                        "CERAMICOS": "1130"
                    };

                    var sSalesOrg = mapOrg[tUniNeg] || "1110";
                    let sFilter = `SalesOrganization eq '${sSalesOrg}' and (DistributionChannel eq 'C1' or DistributionChannel eq 'C2') and Division eq 'S1'`;

                    if (sSalesOrg === "1130") {
                        sFilter += ` and (CustomerGroup eq '05' or CustomerGroup eq '06' or CustomerGroup eq '15')`;
                    }

                    if (sCustomer) {
                        sFilter += ` and Customer eq '${sCustomer}'`;
                    }
                    const sQuery = `Customer?$filter=${encodeURIComponent(sFilter)}&$top=3000&$format=json&sap-language=es-ES`;
                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/${sQuery}`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) + `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/${sQuery}`;
                        sUrl = sPath;
                    }
                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData, message) {
                                oResp.sEstado = "S";
                                oResp.oResults = oData.data;
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
        _getDatClient: function (tUniNeg, sCustomer, sKunn2) {
            that = this;
            try {
                var oResp = { "sEstado": "E", "oResults": [] };

                return new Promise(function (resolve, reject) {
                    var mapOrg = { "TEXTILES": "1110", "QUIMICOS": "1120", "CERAMICOS": "1130" };
                    var sSalesOrg = mapOrg[tUniNeg] || "1110";
                    let sFilter =
                        "SalesOrganization eq '" + sSalesOrg + "'" +
                        " and DistributionChannel eq 'C1'" +
                        " and Division eq 'S1'" +
                        " and (CustomerDni ne '' or CustomerRuc ne '')";

                    if (sCustomer) {
                        sFilter += " and Customer eq '" + sCustomer + "'";
                    }
                    if (sKunn2) {
                        sFilter += " and kunn2 eq '" + sKunn2 + "'";
                    }
                    const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DataCustomer?$filter=" +
                        sFilter +
                        "&$top=3000&$format=json&sap-language=es-ES";

                    let sUrl = "";
                    if (that.local) {
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        sUrl = jQuery.sap.getModulePath(that.route) + "/S4HANA" + sPath;
                    }

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData, message) {
                                oResp.sEstado = "S";
                                oResp.oResults = oData.data;
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

    });
});
