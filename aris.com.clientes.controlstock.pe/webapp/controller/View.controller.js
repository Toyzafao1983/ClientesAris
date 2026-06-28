sap.ui.define([
    "aris/com/clientes/controlstock/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/resource/ResourceModel",
    "aris/com/clientes/controlstock/pe/model/models",
    "aris/com/clientes/controlstock/pe/model/formatter",
    "aris/com/clientes/controlstock/pe/services/Services",
    "aris/com/clientes/controlstock/pe/util/util",
    "aris/com/clientes/controlstock/pe/util/utilUI",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (BaseController, Controller, ResourceModel, models, formatter, Services, util, utilUI, Filter, FilterOperator) => {
    "use strict";
    var that;
    var tUniNeg = "", tRol = "", oBPUser = "";
    return BaseController.extend("aris.com.clientes.controlstock.pe.controller.View", {
        tMetTextil: false,
        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("View").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
            this.frgIdTableMainTextil = "frgIdTableMainTextil";
            this.frgIdTableMainQuimico = "ffrgIdTableMainQuimico";
            this.frgIdTableMainCeramico = "frgIdTableMainCeramico";
            var oModelImages = new sap.ui.model.json.JSONModel({
                Images: []
            });
            sap.ui.getCore().setModel(oModelImages, "oModelImages");

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

            var oTipoModel = new sap.ui.model.json.JSONModel(this.JsonTipo(this));
            this.getView().setModel(oTipoModel, "oModelTipo");

            this._setMultiInputValidators();
            that.JsonBrand().then(oResult => {
                const oModelBrand = new sap.ui.model.json.JSONModel(oResult);
                that.getView().setModel(oModelBrand, "oModelBrand");
            });

            const oM = this.getModel("oModelProyect");

            if (!oM.getProperty("/Main")) oM.setProperty("/Main", {});
            if (!oM.getProperty("/Main/filter")) oM.setProperty("/Main/filter", {});

            const vIndex = oM.getProperty("/Main/filter/iTipoIndex");
            if (typeof vIndex !== "number" || !Number.isInteger(vIndex) || vIndex < 0 || vIndex > 2) {
                oM.setProperty("/Main/filter/iTipoIndex", 2);
            }

            const vTipo = oM.getProperty("/Main/filter/rbTipo");
            if (typeof vTipo !== "string" || !vTipo.trim()) {
                oM.setProperty("/Main/filter/rbTipo", "TODOS");
            }

            const oUserM = this.getView().getModel("oModelUser") || this.getOwnerComponent().getModel("oModelUser");
            oUserM && oUserM.setProperty("/bUiReady", false);


        },

        _hasIASGroup: function (oUser, sGroupName) {
            const sTarget = String(sGroupName || "").trim().toUpperCase();
            const aGroups = oUser && Array.isArray(oUser.groups) ? oUser.groups : [];

            if (!sTarget || !aGroups.length) {
                return false;
            }

            return aGroups.some(function (oGroup) {
                const sValue = String(oGroup && oGroup.value || "").trim().toUpperCase();
                const sDisplay = String(oGroup && oGroup.display || "").trim().toUpperCase();

                return sValue === sTarget || sDisplay === sTarget;
            });
        },

        handleRouteMatched: async function (bInit) {
            sap.ui.core.BusyIndicator.show(0);

            try {
                const values = await Promise.all([
                    this._getUsers(),
                    this._getDataCeramicos(this),
                    this._getDataCeramicoImagen2(this)
                ]);

                const that = this;
                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");

                let sIdioma = that.oModelProyect.getProperty("/sIdioma");
                that.oModelProyect.setSizeLimit(99999999);
                that.oModelData.setSizeLimit(99999999);

                let oUser = values[0]?.Resources?.[0];
                let oAttr = oUser?.["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];

                let oBPUser = "";
                let tipoBP = "";
                let sCustomAttribute = "";

                // Ya no se valida el rol con grupo IAS hardcodeado.
                // El rol se determina por atributos IAS y se confirma contra UsOrve.
                that.tMetTextil = false;

                if (oAttr && Array.isArray(oAttr.attributes)) {
                    const attr1 = oAttr.attributes.find(a => a.name === "customAttribute1"); // Cliente
                    const attr2 = oAttr.attributes.find(a => a.name === "customAttribute2"); // Vendedor
                    const attr3 = oAttr.attributes.find(a => a.name === "customAttribute3"); // Coordinador / Supervisor

                    if (attr1 && attr1.value) {
                        oBPUser = attr1.value.trim();
                        tipoBP = "CLIENTE";
                        sCustomAttribute = "customAttribute1";
                    } else if (attr2 && attr2.value) {
                        oBPUser = attr2.value.trim();
                        tipoBP = "VENDEDOR";
                        sCustomAttribute = "customAttribute2";
                    } else if (attr3 && attr3.value) {
                        oBPUser = attr3.value.trim();
                        tipoBP = "VENDEDOR";
                        sCustomAttribute = "customAttribute3";
                    }
                }

                that.tMetTextil = (
                    tUniNeg === "TEXTILES" &&
                    tipoBP === "CLIENTE" &&
                    this._hasIASGroup(oUser, "INT_CLIENTES_VISUALIZACION_STOCK")
                    //this._hasIASGroup(oUser, "AYC_INT_CLIENTES_VISUALIZACION_STOCK")
                );

                that.oModelUser && that.oModelUser.setProperty("/customAttribute", sCustomAttribute);

                void 0;

                void 0;

                if (!oBPUser) {
                    sap.m.MessageBox.error(
                        "No se encontró ningún código asignado a su usuario IAS. No tiene permisos para acceder a esta aplicación.",
                        { onClose: () => (window.location.href = "/") }
                    );
                    sap.ui.core.BusyIndicator.hide(0);
                    that.oModelUser && that.oModelUser.setProperty("/bUiReady", false);
                    return;
                }

                let accesoPermitido = false;

                if (tipoBP === "CLIENTE") {
                    void 0;
                    const vUOIAs = await this._getSalesOrgByBP(oBPUser);

                    const UOIAs = Array.isArray(vUOIAs)
                        ? vUOIAs.map(function (sOrg) {
                            return String(sOrg || "").trim();
                        }).filter(Boolean)
                        : (vUOIAs ? [String(vUOIAs).trim()] : []);

                    void 0;

                    if (UOIAs.length > 0) {
                        const bAccessGranted = this._validateAccessToPortal(UOIAs, that.sSalesOrg);
                        if (bAccessGranted) {
                            tRol = "CLIENTES";
                            accesoPermitido = true;
                            void 0;
                        } else {
                            sap.ui.core.BusyIndicator.hide(0);
                            sap.m.MessageBox.error(
                                "No tiene permisos para acceder a esta unidad de negocio. Será redirigido a la página principal.",
                                { onClose: () => (window.location.href = "/") }
                            );
                            that.oModelUser && that.oModelUser.setProperty("/bUiReady", false);
                            return;
                        }
                    } else {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error(
                            "No se encontraron unidades organizacionales para su código de cliente.",
                            { onClose: () => (window.location.href = "/") }
                        );
                        that.oModelUser && that.oModelUser.setProperty("/bUiReady", false);
                        return;
                    }
                }

                if (!accesoPermitido && (tipoBP === "VENDEDOR")) {
                    const oPerfilResp = await this._getPerfilByUsuario(oBPUser, that.sSalesOrg);
                    void 0;

                    if (!oPerfilResp.autorizado) {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error(
                            "No tiene permisos para acceder a esta unidad organizacional. Será redirigido a la página principal.",
                            { onClose: () => (window.location.href = "/") }
                        );
                        that.oModelUser && that.oModelUser.setProperty("/bUiReady", false);
                        return;
                    }

                    switch (oPerfilResp.perfil) {
                        case "Coordinador":
                            tRol = "SUPERVISOR";
                            accesoPermitido = true;
                            break;
                        case "Vendedor":
                            tRol = "VENDEDOR";
                            accesoPermitido = true;
                            break;
                        default:
                            sap.ui.core.BusyIndicator.hide(0);
                            sap.m.MessageBox.error(
                                "Su perfil no está autorizado para acceder a esta aplicación.",
                                { onClose: () => (window.location.href = "/") }
                            );
                            that.oModelUser && that.oModelUser.setProperty("/bUiReady", false);

                            return;
                    }

                    void 0;
                }

                if (!accesoPermitido) {
                    sap.ui.core.BusyIndicator.hide(0);
                    sap.m.MessageBox.error(
                        "No se encontraron permisos válidos para su usuario. Será redirigido a la página principal.",
                        { onClose: () => (window.location.href = "/") }
                    );
                    that.oModelUser && that.oModelUser.setProperty("/bUiReady", false);

                    return;
                }

                // Configuración de idioma
                if (!sIdioma) {
                    that._setLanguageModel("esp");
                } else {
                    that._setLanguageModel(sIdioma);
                }


                if (!this.getView().getModel("oModelData")) {
                    this.getView().setModel(new sap.ui.model.json.JSONModel({}), "oModelData");
                }

                that.oModelUser.setProperty("/Information", oUser);
                that.oModelUser.setProperty("/BPUser", oBPUser);
                that.oModelUser.setProperty("/sNameComp", `${oUser.name.givenName} ${oUser.name.familyName}`);
                that.oModelUser.setProperty("/rTextil", tUniNeg === "TEXTILES");
                that.oModelUser.setProperty("/rQuimicos", tUniNeg === "QUIMICOS");
                that.oModelUser.setProperty("/rCeramicos", tUniNeg === "CERAMICOS");
                that.oModelUser.setProperty("/rCliente", tRol === "CLIENTES");
                that.oModelUser.setProperty("/rVendedor", tRol === "VENDEDOR");
                that.oModelUser.setProperty("/bRolTitulo", tRol.charAt(0).toUpperCase() + tRol.slice(1).toLowerCase());
                that.oModelData.setProperty("/oUniNeg", tUniNeg);
                that.oModelData.setProperty("/rRol", tRol);
                that.oModelUser.setProperty("/rMetTextil", that.tMetTextil);
                that.oModelUser.setProperty("/rClienteTextilVisualizaStock", that.tMetTextil);

                // ✅ Traer Razón Social (solo para CLIENTE)
                let sRazonSocial = "";
                if (tipoBP === "CLIENTE") {
                    sRazonSocial = await this._getRazonSocialClienteByBP(oBPUser);
                }

                // Guardar en modelo usuario
                that.oModelUser.setProperty("/RazonSocial", sRazonSocial);

                // (opcional) armar un título para mostrar en la vista
                const sUni = (tUniNeg === "TEXTILES") ? "Textiles"
                    : (tUniNeg === "QUIMICOS") ? "Químicos"
                        : "Cerámicos";

                const sTitulo = sRazonSocial ? `${sUni} - ${sRazonSocial}` : `${sUni} - ${oBPUser}`;
                that.oModelUser.setProperty("/TitleApp", sTitulo);

                // ✅ Armar saludo: Cliente => BP - Razón Social | Vendedor/Supervisor => BP - Nombre usuario
                const bp = (that.oModelUser.getProperty("/BPUser") || "").trim();
                const rs = (that.oModelUser.getProperty("/RazonSocial") || "").trim();
                const nom = (that.oModelUser.getProperty("/sNameComp") || "").trim();

                let display = "";
                if (tipoBP === "CLIENTE") {
                    display = rs || nom;
                } else {
                    display = nom;
                }

                that.oModelUser.setProperty("/WelcomeDisplay", `${bp} - ${display}`.trim());



                if (tUniNeg === "CERAMICOS") {
                    const oProj = that.oModelProyect;
                    if (!oProj.getProperty("/Main")) oProj.setProperty("/Main", {});
                    if (!oProj.getProperty("/Main/filter")) oProj.setProperty("/Main/filter", {});

                    const iTipoActual = oProj.getProperty("/Main/filter/iTipoIndex");

                    const v = oProj.getProperty("/Main/filter/iTipoIndex");
                    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 2) {
                        oProj.setProperty("/Main/filter/iTipoIndex", 2);
                        oProj.setProperty("/Main/filter/rbTipo", "TODOS");
                    }

                }


                let sComponent = "";
                if (tUniNeg === "QUIMICOS") sComponent = "TableMainQuimico";
                else if (tUniNeg === "TEXTILES") sComponent = "TableMainTextil";
                else sComponent = (tRol === "CLIENTES") ? "TableMainCeramicoCli" : "TableMainCeramicoSup";

                if (!that["_fragment" + tUniNeg]) {
                    const frgId = "frgId" + sComponent;
                    that["_fragment" + tUniNeg] = sap.ui.xmlfragment(
                        frgId,
                        that.route + ".view.fragments." + sComponent,
                        that
                    );

                    that._byId("vbTableMain").addItem(that["_fragment" + tUniNeg]);

                    const oDataMatGrp = await this.JsonMaterialGroup();
                    this.getView().setModel(new sap.ui.model.json.JSONModel(oDataMatGrp), "oModelMaterialGroup");
                }

                try {
                    const spResp = await this._getSharepoint();
                    if (spResp && spResp.sEstado === "S") {
                        this._buildImagesModelFromSharepoint(spResp);
                        const oImgModel = sap.ui.getCore().getModel("oModelImages");
                        oImgModel && oImgModel.refresh(true);
                    } else {
                        void 0;
                    }
                } catch (e) {
                    void 0;
                }


                that.oModelUser.setProperty("/bUiReady", true);
                sap.ui.core.BusyIndicator.hide(0);



            } catch (oError) {
                void 0;
                sap.m.MessageBox.error("Error al cargar datos del usuario o catálogos");
                sap.ui.core.BusyIndicator.hide(0);
                that.oModelUser && that.oModelUser.setProperty("/bUiReady", false);

            }
        },


        _onClearFilter: function () {
            const tbReporte = this._byId("vbTableMain").getItems().length > 0 ? this._byId("vbTableMain").getItems()[0] : null;
            if (!this.isEmpty(tbReporte)) { tbReporte.removeSelections(true); }

            that._onClearComponentGlobal(that.getI18nText("sStateInit"), this._byId("idFilterBar"), false);
            that._onClearDataFilter();
            that._onPressExecute();
        },
        _onClearDataFilter: function () {
            that.getModel("oModelProyect").setProperty("/Main", models.createModelProyect().Main);
        },
        _onPressNavigateDetailPieza: function (oEvent) {
            let oSource = oEvent.getSource();
            let oParentRow = oSource.getParent();
            let jRow = oParentRow.getBindingContext("oModelProyect");
            let jData = jRow.getObject();
            that.oModelProyect.setProperty("/oCabecera", jData);
            let sHeader = "DetallePieza";
            that.oModelProyect.setProperty("/sHeaderDetalle", sHeader);
            that.oRouter.navTo("Detail", {
                app: jData.Material,
                header: sHeader
            });
        },
        _onPressNavigateDetailStockContrato: function (oEvent) {
            let oSource = oEvent.getSource();
            let oParentRow = oSource.getParent();
            let jRow = oParentRow.getBindingContext("oModelProyect");
            let jData = jRow.getObject();
            that.oModelProyect.setProperty("/oCabecera", jData);
            let sHeader = "StockContratado";
            that.oModelProyect.setProperty("/sHeaderDetalle", sHeader);
            that.oRouter.navTo("Detail", {
                app: jData.Material,
                header: sHeader
            });
        },
        _onPressNavigateDetailStockPendiente: function (oEvent) {
            let oSource = oEvent.getSource();
            let oParentRow = oSource.getParent();
            let jRow = oParentRow.getBindingContext("oModelProyect");
            let jData = jRow.getObject();
            that.oModelProyect.setProperty("/oCabecera", jData);
            let sHeader = "StockPendiente";
            that.oModelProyect.setProperty("/sHeaderDetalle", sHeader);
            that.oRouter.navTo("Detail", {
                app: jData.Material,
                header: sHeader
            });
        },
        _onPressNavigateDetailStockSeparacion: function (oEvent) {
            let oSource = oEvent.getSource();
            let oParentRow = oSource.getParent();
            let jRow = oParentRow.getBindingContext("oModelProyect");
            let jData = jRow.getObject();
            that.oModelProyect.setProperty("/oCabecera", jData);
            let sHeader = "StockSeparacion";
            that.oModelProyect.setProperty("/sHeaderDetalle", sHeader);
            that.oRouter.navTo("Detail", {
                app: jData.Material,
                header: sHeader
            });
        },


        onLanguageEsp: function () {
            this._setLanguageModel("esp");
        },

        onLanguageEng: function () {
            this._setLanguageModel("ing");
        },
        stockDisplay: function (isGroup, totalStockM2, stockM2) {
            var val = isGroup ? totalStockM2 : stockM2;
            if (val == null || val === "") return "";
            if (typeof val === "boolean") return val ? "1" : "0";
            return Number(val);
        },

        onUpdateFinishedTextil: function (oEvent) {
            var oTable = oEvent.getSource();
            var aItems = oTable.getItems();

            aItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("oModelProyect");
                if (oCtx) {
                    var iTxt3 = oCtx.getProperty("StockDispo");
                    var numStock = parseFloat(iTxt3) || 0;
                    if (numStock <= 0) {
                        oItem.addStyleClass("myRedText");
                    } else {
                        oItem.removeStyleClass("myRedText");
                    }
                }
            });
        },

        onUpdateFinishedQuimicos: function (oEvent) {
            var oTable = oEvent.getSource();
            var aItems = oTable.getItems();

            aItems.forEach(function (oItem) {
                var oCtx = oItem.getBindingContext("oModelProyect");
                if (oCtx) {
                    var iTxt5 = oCtx.getProperty("Stockf");
                    if (parseInt(iTxt5, 10) === 0) {
                        oItem.addStyleClass("myPlomText");
                    } else {
                        oItem.removeStyleClass("myPlomText");
                    }
                }
            });
        },

        onChangeDescMaterial: function (oEvent) {
            const sValue = (oEvent.getParameter("suggestValue") || "").trim();
            const oMI = oEvent.getSource();
            const oBinding = oMI.getBinding("suggestionItems");
            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }
            oBinding.filter([
                new sap.ui.model.Filter("Display", sap.ui.model.FilterOperator.Contains, sValue)
            ]);
            const reqId = (this._descReqId = (this._descReqId || 0) + 1);

            clearTimeout(this._tDescDebounce);
            this._tDescDebounce = setTimeout(async () => {
                const bEmpty = oBinding.getContexts(0, 1).length === 0;
                if (!bEmpty) return;

                const a = await this._GetFiltroDescMaterial(sValue, "/oFiltroDescMaterial");

                if (reqId !== this._descReqId) return;

                if (a && a.length) {

                    oBinding.filter([
                        new sap.ui.model.Filter("Display", sap.ui.model.FilterOperator.Contains, sValue)
                    ]);
                    if (oMI.isSuggestionPopupOpen && !oMI.isSuggestionPopupOpen()) {
                        oMI.suggest(true);
                    } else {
                        oMI.suggest(true);
                    }
                }
            }, 250);
        },


        _GetFiltroDescMaterial: function (sValue, sTargetPath) {
            return new Promise((resolve) => {
                if (!sValue || sValue.length < 2) {
                    this.getView().getModel("oModelData").setProperty(sTargetPath, []);
                    return resolve([]);
                }

                const that = this;
                const sSalesOrg = that.sSalesOrg || "1110";

                const sSafe = (sValue || "").replaceAll("'", "''");
                const sUp = sSafe.toUpperCase();

                const sFilter =
                    `$filter=SalesOrganization eq '${sSalesOrg}' and substringof('${sUp}', Description) eq true`;

                let sUrl = "";
                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(
                        `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=200&$format=json&sap-language=ES`
                    );
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=200&$format=json&sap-language=ES`;
                }

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const unique = {};
                            arr.forEach(item => {
                                const desc = (item.Description || "").trim();
                                if (desc && !unique[desc]) {
                                    unique[desc] = { key: desc, Description: desc, Display: desc };
                                }
                            });
                            const aDescripciones = Object.values(unique);
                            that.getView().getModel("oModelData").setProperty(sTargetPath, aDescripciones);
                            resolve(aDescripciones);
                        },
                        error: function () {
                            that.getView().getModel("oModelData").setProperty(sTargetPath, []);
                            resolve([]);
                        }
                    });
                });
            });
        },


        JsonBrand: function () {
            return new Promise((resolve) => {
                const that = this;
                const sSalesOrg = that.sSalesOrg || "";

                // 🔹 Armar filtro OData para Org_Ventas (SalesOrganization)
                const sFilter = `$filter=org_ventas eq '${sSalesOrg}'`;

                // 🔹 Construir URL
                let sUrl = "";
                const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MarMat?${sFilter}&$format=json&sap-language=ES`;

                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route) + `/S4HANA${sPath}`;
                }

                void 0;

                // 🔹 Consumir OData
                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            if (!oData.data || !Array.isArray(oData.data)) {
                                void 0;
                                resolve({ d: { results: [] } });
                                return;
                            }

                            // 🔹 Mapear resultados con Brand y DscBrand
                            const mUnique = {};
                            oData.data.forEach(item => {
                                const brand = (item.Brand || "").trim();
                                const desc = (item.DscBrand || "").trim();
                                if (brand && !mUnique[brand]) {
                                    mUnique[brand] = {
                                        sKey: brand,
                                        sText: `${brand} - ${desc}`
                                    };
                                }
                            });

                            const aBrands = Object.values(mUnique);
                            void 0;
                            resolve({ d: { results: aBrands } });
                        },
                        error: function () {
                            void 0;
                            resolve({ d: { results: [] } });
                        }
                    });
                });
            });
        },

        onChangeTextileArticle: function (oEvent) {
            const sValue = (oEvent.getParameter("suggestValue") || "").trim();
            this._GetFiltroTextileArticle(sValue, "/oFiltroTextileArticleSug");
        },

        _GetFiltroTextileArticle: function (sValue, sTargetPath) {
            const that = this;

            if (!sValue || sValue.length < 2) {
                that.getView().getModel("oModelData").setProperty(sTargetPath, []);
                return Promise.resolve([]);
            }

            const sSalesOrg = that.sSalesOrg || "1110";
            const sv = this._odStr(sValue);
            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and startswith(TextileArticleQuality,'${sv}')`;

            let sUrl = "";
            if (that.local) {
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(
                    `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`
                );
            } else {
                sUrl = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
            }

            return new Promise((resolve) => {
                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const mUnique = {};

                            arr.forEach(item => {
                                const taq = (item.TextileArticleQuality || "").trim();
                                if (taq && !mUnique[taq]) {
                                    mUnique[taq] = {
                                        key: taq,
                                        TextileArticleQuality: taq,
                                        Display: taq
                                    };
                                }
                            });

                            const aTextiles = Object.values(mUnique);
                            that.getView().getModel("oModelData").setProperty(sTargetPath, aTextiles);
                            resolve(aTextiles);
                        },
                        error: function () {
                            that.getView().getModel("oModelData").setProperty(sTargetPath, []);
                            resolve([]);
                        }
                    });
                });
            });
        },

        onChangeFormat: function (oEvent) {
            const sValue = oEvent.getParameter("suggestValue");
            this._GetFiltroFormat(sValue, "/oFiltroFormat");
        },

        _GetFiltroFormat: function (sValue, sTargetPath) {
            if (!sValue || sValue.length < 2) {
                this.getView().getModel("oModelData").setProperty(sTargetPath, []);
                return;
            }

            const that = this;
            const sSalesOrg = that.sSalesOrg || "1110";

            // seguimos filtrando por Formatt (como hoy)
            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and startswith(Formatt,'${sValue}')`;

            let sUrl = "";
            if (that.local) {
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(
                    `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`
                );
            } else {
                sUrl = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
            }

            Services.getoDataERPSync(that, sUrl, function (result) {
                util.response.validateAjaxGetERPNotMessage(result, {
                    success: function (oData) {
                        const arr = Array.isArray(oData.data) ? oData.data : [];
                        const mUnique = {};

                        arr.forEach(item => {
                            const format = (item.Formatt || "").trim();
                            const desc = (item.FormatDescription || "").trim();

                            if (!format) return;

                            if (!mUnique[format]) {
                                mUnique[format] = {
                                    key: format,
                                    Formatt: format,
                                    Display: desc || format
                                };
                            } else {
                                const prev = mUnique[format];
                                if ((prev.Display === format || !prev.Display) && desc) {
                                    prev.Display = desc;
                                }
                            }
                        });
                        const aFormatos = Object.values(mUnique);
                        that.getView().getModel("oModelData").setProperty(sTargetPath, aFormatos);
                    },
                    error: function () {
                        that.getView().getModel("oModelData").setProperty(sTargetPath, []);
                    }
                });
            });
        },

        _odStr: function (s) { return String(s || "").replace(/'/g, "''"); },

        onChangeStyle: function (oEvent) {
            const sValue = oEvent.getParameter("suggestValue");
            this._GetFiltroStyle(sValue, "/oFiltroStyle");
        },

        _GetFiltroStyle: function (sValue, sTargetPath) {
            if (!sValue || sValue.length < 2) {
                this.getView().getModel("oModelData").setProperty(sTargetPath, []);
                return;
            }

            const that = this;
            const sSalesOrg = that.sSalesOrg || "1110";
            const sv = this._odStr(sValue);


            const sFilter =
                `$filter=SalesOrganization eq '${sSalesOrg}' ` +
                `and LevelNumber eq '5' ` +
                `and startswith(Hierarchy,'3') ` +
                `and (startswith(OrilloStyle,'${sv}') or startswith(Hierarchy,'${sv}'))`;

            let sUrl = "";
            if (that.local) {
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(
                    `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`
                );
            } else {
                sUrl = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
            }

            Services.getoDataERPSync(that, sUrl, function (result) {
                util.response.validateAjaxGetERPNotMessage(result, {
                    success: function (oData) {
                        const arr = Array.isArray(oData.data) ? oData.data : [];
                        const mUnique = {};

                        arr.forEach(item => {
                            const hierarchy = (item.Hierarchy || "").trim();
                            const style = (item.OrilloStyle || "").trim();
                            if (hierarchy && style) {
                                // dedupe por par Hierarchy + OrilloStyle
                                const key = `${hierarchy}|${style}`;
                                if (!mUnique[key]) {
                                    mUnique[key] = {
                                        key,
                                        Hierarchy: hierarchy,
                                        OrilloStyle: style,
                                        Display: `${hierarchy} - ${style}`
                                    };
                                }
                            }
                        });

                        this.getView().getModel("oModelData").setProperty(sTargetPath, Object.values(mUnique));
                    }.bind(this),
                    error: function () {
                        this.getView().getModel("oModelData").setProperty(sTargetPath, []);
                    }.bind(this)
                });
            }.bind(this));
        },

        JsonTipo: function (context) {
            return {
                "d": {
                    "results": [
                        { "sKey": "Completos", "sText": context.getI18nText("txtTipo.Completos") },
                        { "sKey": "Saldos", "sText": context.getI18nText("txtTipo.Saldos") },
                        { "sKey": "Todos", "sText": context.getI18nText("txtTipo.Todos") }
                    ]
                }
            };
        },
        JsonMaterialGroup: function () {
            return new Promise((resolve) => {
                const that = this;
                const sSalesOrg = that.sSalesOrg || "";

                let sUrl = "";
                const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;
                const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MatGroup?${sFilter}&$format=json&sap-language=ES`;

                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route) + `/S4HANA${sPath}`;
                }
                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            if (!oData.data || !Array.isArray(oData.data)) {
                                resolve({ d: { results: [] } });
                                return;
                            }

                            // 🔹 Mapear resultados: sKey = MaterialGroup, sText = "Description"
                            const aGroups = oData.data
                                .filter(item => item.MaterailGroup) // solo válidos
                                .map(item => ({
                                    sKey: item.MaterailGroup,
                                    sText: `${item.Description || ""}`
                                }));

                            resolve({ d: { results: aGroups } });
                        },
                        error: function () {
                            resolve({ d: { results: [] } });
                        }
                    });
                });
            });
        },

        onTipoRadioSelect: function (oEvent) {
            const i = oEvent.getSource().getSelectedIndex();
            const aMap = ["COMPLETOS", "SALDOS", "TODOS"];

            const oM = this.getModel("oModelProyect");
            oM.setProperty("/Main/filter/iTipoIndex", i);
            oM.setProperty("/Main/filter/rbTipo", aMap[i] || "TODOS");
        },




        _onPressExecute: async function () {
            const that = this;
            this.getView().setBusyIndicatorDelay(0);
            this.getView().setBusy(true);

            // forzar render del busy antes de bloquear
            await new Promise(r => setTimeout(r, 0));

            // ✅ 1) Auditoría de tokens / texto suelto (BLOQUEANTE)
            const oTokenAudit = this._collectValidTokensAndDiscardRaw && this._collectValidTokensAndDiscardRaw([
                { id: "miMaterial", label: "Material" },
                { id: "miDescMaterial", label: "Descripción" },
                { id: "miTextileArticle", label: "Artículo textil" },
                { id: "miQuality", label: "Calidad" },
                { id: "miOrillo", label: "Orillo" },
                { id: "miStyle", label: "Estilo" },
                { id: "miFormat", label: "Formato" }
            ]);

            // ✅ Si hay texto inválido/incompleto en algún MultiInput → NO buscar
            if (
                oTokenAudit &&
                Array.isArray(oTokenAudit.invalidRawInputs) &&
                oTokenAudit.invalidRawInputs.length > 0
            ) {
                this.getView().setBusy(false);

                sap.m.MessageBox.error(
                    "Hay filtros con texto inválido o incompleto. Debe seleccionar una sugerencia válida para convertirla en token antes de buscar."
                );
                return;
            }

            void 0;

            let oModel = this.getModel("oModelProyect");

            // ✅ 2) Usar SIEMPRE los tokens auditados (ya limpios)
            const mTok = (oTokenAudit && oTokenAudit.tokensById) || {};

            // === MATERIAL
            let oMat = mTok.miMaterial || { keys: [] };
            oModel.setProperty("/Main/filter/cbCodMaterial", oMat.keys);

            // === DESCRIPCIÓN
            let oDesc = mTok.miDescMaterial || { keys: [] };
            oModel.setProperty("/Main/filter/cbDescMaterial", oDesc.keys);

            // === MARCA
            let oBrand = this.byId("cbBrand")?.getSelectedKeys?.() || [];
            oModel.setProperty("/Main/filter/cbBrand", oBrand);

            // === MATERIAL GROUP
            let oMatGrp = this.byId("cbMaterialGroup")?.getSelectedKeys?.() || [];
            oModel.setProperty("/Main/filter/cbMaterialGroup", oMatGrp);

            // === TAQ: TextileArticleQuality (miTextileArticle + miQuality)
            let aTAQ1 = (mTok.miTextileArticle || { keys: [] }).keys;
            let aTAQ2 = (mTok.miQuality || { keys: [] }).keys;
            let aTAQ = Array.from(new Set([...(aTAQ1 || []), ...(aTAQ2 || [])]));
            oModel.setProperty("/Main/filter/cbTextileArticleQuality", aTAQ);
            oModel.setProperty("/Main/filter/cbTextileArticle", aTAQ);
            oModel.setProperty("/Main/filter/cbQuality", aTAQ);

            // === ORILLO (nuevo: prefijo 2 dígitos para filtrar por Material)
            let aOriPrefix2 = (mTok.miOrillo || { keys: [] }).keys || [];
            aOriPrefix2 = Array.from(new Set(aOriPrefix2.map(v => String(v).trim()).filter(Boolean)));

            oModel.setProperty("/Main/filter/cbOrilloPrefix2", aOriPrefix2);
            oModel.setProperty("/Main/filter/cbOrillo", aOriPrefix2);

            // === STYLE (si sigues usando miStyle como filtro exacto de OrilloStyle)
            let aSty = (mTok.miStyle || { keys: [] }).keys || [];
            aSty = Array.from(new Set(aSty.map(v => String(v).trim()).filter(Boolean)));

            oModel.setProperty("/Main/filter/cbStyle", aSty);

            // ⚠️ Si ya NO quieres usar cbOrilloStyle unificado, déjalo vacío
            oModel.setProperty("/Main/filter/cbOrilloStyle", []);
            // === CERÁMICOS - FORMATO
            let oFormat = mTok.miFormat || { keys: [] };
            oModel.setProperty("/Main/filter/cbFormat", oFormat.keys);

            // === RADIO TIPO (CERÁMICOS)
            const oRb = this.byId("rbTipo");
            const i = oRb ? oRb.getSelectedIndex() : 2;
            const aMap = ["COMPLETOS", "SALDOS", "TODOS"];
            oModel.setProperty("/Main/filter/iTipoIndex", i);
            oModel.setProperty("/Main/filter/rbTipo", aMap[i] || "TODOS");

            // === METRAJE MÍNIMO (TEXTILES)
            const sMinFootage = (this.byId("inpMinimumFootage")?.getValue?.() || "").trim();
            oModel.setProperty("/Main/filter/iMinimumFootage", sMinFootage);

            const jFilter = oModel.getProperty("/Main/filter") || {};
            void 0;

            // Helper local para parsear números formateados o crudos
            const _toNum = (v) => {
                if (typeof v === "number") return v;
                const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
                return isNaN(n) ? 0 : n;
            };

            try {
                const aMaterials = await this._GetFilteredMaterials(jFilter);

                if (!Array.isArray(aMaterials) || aMaterials.length === 0) {
                    void 0;
                    that.getModel("oModelProyect").setProperty("/oStockDisponible", []);

                    if (tUniNeg === "TEXTILES") {
                        that.getModel("oModelProyect").setProperty("/oStockTextil", []);
                    } else if (tUniNeg === "QUIMICOS") {
                        that.getModel("oModelProyect").setProperty("/oStockQuimico", []);
                    } else if (tUniNeg === "CERAMICOS") {
                        if (tRol === "CLIENTES") {
                            that.getModel("oModelProyect").setProperty("/oReporteCeraCli", []);
                        } else {
                            that.getModel("oModelProyect").setProperty("/oTreeCer", []);
                        }
                    }
                    return;
                }

                void 0;

                // Consulta de stock para TODOS
                const allResults = await that._fetchStockForMaterials(aMaterials);

                let results = [];

                if (tUniNeg === "TEXTILES") {
                    results = that._prepareDataForTextiles(allResults);

                    // 🔸 Aplicar AND de “MTS” + “>= metraje mínimo”
                    const minFoot = _toNum(jFilter.iMinimumFootage);
                    if (minFoot > 0) {
                        results = results.filter(row =>
                            (String(row.Um || "").toUpperCase() === "MTS") &&
                            (_toNum(row.StockDispo) >= minFoot)
                        );
                    }

                    that.getModel("oModelProyect").setProperty("/oStockTextil", results);

                } else if (tUniNeg === "QUIMICOS") {
                    results = that._prepareDataForQuimicos(allResults);
                    that.getModel("oModelProyect").setProperty("/oStockQuimico", results);

                } else if (tUniNeg === "CERAMICOS") {
                    let aFlatten = that._prepareDataForCeramicos(allResults);

                    // Metraje mínimo cerámicos (M2)
                    const minFootCera = _toNum(jFilter.iGreaterFootage);

                    if (tRol === "CLIENTES") {
                        let oConsolidados = Object.values(
                            aFlatten.reduce((acc, item) => {
                                const key = item.Material;
                                if (!acc[key]) {
                                    acc[key] = {
                                        Matnr: item.Matnr,
                                        Descripcion: item.Descripcion,
                                        Um: item.Um,
                                        StockFisico: 0,
                                        Pallets: 0,
                                        Saldos: 0
                                    };
                                }
                                acc[key].StockFisico += Number(item.StockFisico) || 0;
                                acc[key].Pallets += Number(item.Pallets) || 0;
                                acc[key].Saldos += Number(item.Saldos) || 0;
                                return acc;
                            }, {})
                        );

                        // 1) Metraje mínimo: UM = M2 y StockFisico ≥ minFootCera
                        if (minFootCera > 0) {
                            oConsolidados = oConsolidados.filter(row =>
                                String(row.Um || "").toUpperCase() === "M2" &&
                                _toNum(row.StockFisico) >= minFootCera
                            );
                        }

                        oConsolidados = oConsolidados.map(row => ({
                            ...row,
                            StockFisicoFmt: this.formatNumber(row.StockFisico),
                            PalletsFmt: this.formatNumber(row.Pallets),
                            SaldosFmt: this.formatNumber(row.Saldos)
                        }));

                        that.getModel("oModelProyect").setProperty("/oReporteCeraCli", oConsolidados);
                        results = oConsolidados;

                    } else {
                        let oHeaders = Object.values(
                            aFlatten.reduce((acc, item) => {
                                const key = item.Material;
                                if (!acc[key]) {
                                    acc[key] = {
                                        isGroup: true,
                                        Matnr: item.Matnr,
                                        Descripcion: item.Descripcion,
                                        Um: item.Um,
                                        TotalStockFisico: 0,
                                        TotalPallets: 0,
                                        TotalSaldos: 0,
                                        children: []
                                    };
                                }

                                acc[key].TotalStockFisico += item.StockFisico;
                                acc[key].TotalPallets += item.Pallets;
                                acc[key].TotalSaldos += item.Saldos;
                                acc[key].children.push(item);
                                return acc;
                            }, {})
                        );

                        // 1) Metraje mínimo: UM = M2 y TotalStockFisico ≥ minFootCera
                        if (minFootCera > 0) {
                            oHeaders = oHeaders.filter(h =>
                                String(h.Um || "").toUpperCase() === "M2" &&
                                _toNum(h.TotalStockFisico) >= minFootCera
                            );
                        }

                        oHeaders.forEach(h => {
                            h.TotalStockFisicoFmt = this.formatNumber(h.TotalStockFisico);
                            h.TotalPalletsFmt = this.formatNumber(h.TotalPallets);
                            h.TotalSaldosFmt = this.formatNumber(h.TotalSaldos);
                        });

                        that.getModel("oModelProyect").setProperty("/oTreeCer", oHeaders);
                        results = oHeaders;
                    }
                }

                // Guardamos en modelo principal
                that.getModel("oModelProyect").setProperty("/oStockDisponible", results);
                void 0;

            } catch (err) {
                void 0;
                sap.m.MessageBox.error("Ocurrió un error durante la búsqueda.");
            } finally {
                this.getView().setBusy(false);
            }
        },

        _GetFilteredMaterials: function (jFilter) {
            let that = this;
            return new Promise((resolve) => {
                try {
                    const sSalesOrg = that.sSalesOrg || "1110";

                    // ✅ Escape seguro para caracteres especiales (%, &, /, (, ), etc.)
                    const encode = (v) => encodeURIComponent(String(v));

                    // ✅ Helper para concatenar con OR + escapar comillas + encoding
                    function buildOrCondition(values, field) {
                        if (!values || values.length === 0) return null;

                        return "(" + values
                            .map(v => {
                                // Escape SAP para comillas simples (' → '')
                                const cleaned = String(v).replace(/'/g, "''");
                                // Encode para caracteres especiales (% → %25)
                                const encoded = encode(cleaned);
                                return `${field} eq '${encoded}'`;
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

                    // ✅ Material Group
                    cond = buildOrCondition(jFilter.cbMaterialGroup, "MaterialGroup");
                    if (cond) aFilters.push(cond);

                    // ✅ Material
                    cond = buildOrCondition(jFilter.cbCodMaterial, "Material");
                    if (cond) aFilters.push(cond);

                    // ✅ Description (este era el que fallaba por %)
                    cond = buildOrCondition(jFilter.cbDescMaterial, "Description");
                    if (cond) aFilters.push(cond);

                    // ✅ Brand
                    cond = buildOrCondition(jFilter.cbBrand, "Brand");
                    if (cond) aFilters.push(cond);

                    // ✅ TextileArticleQuality (ya unificado desde onPressExecute)
                    cond = buildOrCondition(jFilter.cbTextileArticleQuality, "TextileArticleQuality");
                    if (cond) aFilters.push(cond);

                    // ✅ STYLE exacto (solo si miStyle sigue siendo filtro por OrilloStyle)
                    cond = buildOrCondition(jFilter.cbStyle, "OrilloStyle");
                    if (cond) aFilters.push(cond);

                    // ✅ ORILLO (nuevo): prefijo 2 dígitos aplicado a Material
                    cond = buildStartsWithCondition(jFilter.cbOrilloPrefix2, "Material");
                    if (cond) aFilters.push(cond);

                    // ✅ Format (cerámicos)
                    cond = buildOrCondition(jFilter.cbFormat, "Formatt");
                    if (cond) aFilters.push(cond);

                    // ✅ Tipo (cerámicos)
                    // cond = buildOrCondition(jFilter.rbTipo, "Tipo");
                    // if (cond) aFilters.push(cond);

                    // ✅ Construcción final del $filter
                    let sFilter = "$filter=" + aFilters.join(" and ");

                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
                        sUrl = sPath;
                    }

                    void 0;

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                if (oData.data && Array.isArray(oData.data)) {
                                    if (oData.data.length > 0) {
                                        void 0;
                                    }

                                    // ✅ Se asegura que no haya duplicados
                                    const seen = new Set();
                                    const aMaterials = oData.data
                                        .map(i => i.Material)
                                        .filter(m => {
                                            if (!m) return false;
                                            if (seen.has(m)) return false;
                                            seen.add(m);
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


        _onLoadMoreStock: function () {
            const that = this;
            const queue = this.getModel("oModelProyect").getProperty("/oStockQueue") || [];
            const PAGE_SIZE = this.getModel("oModelProyect").getProperty("/oStockPageSize") || 1000;

            if (!queue.length) {
                void 0;
                return;
            }

            sap.ui.core.BusyIndicator.show();

            const nextChunk = queue.slice(0, PAGE_SIZE);
            const remaining = queue.slice(PAGE_SIZE);

            void 0;

            this._fetchStockForMaterials(nextChunk).then((chunkResults) => {
                const current = that.getModel("oModelProyect").getProperty("/oStockDisponible") || [];
                const merged = current.concat(chunkResults);
                void 0;
                void 0;

                that.getModel("oModelProyect").setProperty("/oStockDisponible", merged);
                that.getModel("oModelProyect").setProperty("/oStockQueue", remaining);
                sap.ui.core.BusyIndicator.hide();
            }).catch((err) => {
                void 0;
                sap.ui.core.BusyIndicator.hide();
            });
        },
        _fetchStockForMaterials: function (aMaterials) {
            const that = this;

            const run = async () => {
                const sSalesOrg = that.sSalesOrg || "1110";
                const plant = (sSalesOrg === "1130") ? "1001" : "1000";

                // 🔹 Normalizar lista de materiales
                let aMatList = (aMaterials || [])
                    .map(m => (m && m.key) ? m.key : m)
                    .map(m => (m || "").toString().trim())
                    .filter(Boolean);

                // 🔹 Eliminar duplicados
                aMatList = Array.from(new Set(aMatList));

                if (!aMatList.length) {
                    void 0;
                    return [];
                }

                // ✅ Tamaño de bloque por unidad de negocio
                let CHUNK_SIZE = 80;
                if (sSalesOrg === "1130") { // CERÁMICOS
                    CHUNK_SIZE = 10;
                } else if (sSalesOrg === "1120") { // QUÍMICOS
                    CHUNK_SIZE = 30;
                } else if (sSalesOrg === "1110") { // TEXTILES
                    CHUNK_SIZE = 50;
                }

                const chunkArray = (arr, size) => {
                    const out = [];
                    for (let i = 0; i < arr.length; i += size) {
                        out.push(arr.slice(i, i + size));
                    }
                    return out;
                };

                const aChunks = chunkArray(aMatList, CHUNK_SIZE);
                let aResults = [];

                void 0;

                const escapeOData = (v) => String(v || "").replace(/'/g, "''");

                that.getModel("oModelProyect").setProperty("/Main/stockProgress", {
                    totalChunks: aChunks.length,
                    currentChunk: 0,
                    processedMaterials: 0,
                    totalMaterials: aMatList.length
                });

                for (let i = 0; i < aChunks.length; i++) {
                    const aChunk = aChunks[i];
                    if (!aChunk.length) continue;

                    const sOrMaterials = aChunk
                        .map(m => `Materialnumber eq '${escapeOData(m)}'`)
                        .join(" or ");

                    const sFilterCore =
                        `(${sOrMaterials}) ` +
                        `and Plant eq '${plant}' ` +
                        `and Salesorganization eq '${sSalesOrg}' ` +
                        `and Pedven eq true ` +
                        `and Stockven eq true`;

                    const sQuery =
                        `$filter=${sFilterCore}` +
                        `&$expand=toEtextil,toStockCeramico,toStockQuimico` +
                        `&$format=json&sap-language=ES`;

                    let sUrl = "";
                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sQuery}`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        sUrl = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/I_StockDisponibleSet?${sQuery}`;
                    }

                    void 0;
                    void 0;

                    // eslint-disable-next-line no-await-in-loop
                    const aChunkData = await new Promise((resolve) => {
                        Services.getoDataERPSync(that, sUrl, function (result) {
                            util.response.validateAjaxGetERPNotMessage(result, {
                                success: function (oData) {
                                    let data = [];
                                    if (oData.data && Array.isArray(oData.data)) {
                                        data = oData.data;
                                    } else if (oData.data) {
                                        data = [oData.data];
                                    }

                                    void 0;
                                    resolve(data);
                                },
                                error: function (err) {
                                    void 0;
                                    resolve([]); // continúa con el siguiente chunk
                                }
                            });
                        });
                    });

                    aResults = aResults.concat(aChunkData);

                    that.getModel("oModelProyect").setProperty("/Main/stockProgress/currentChunk", i + 1);
                    that.getModel("oModelProyect").setProperty("/Main/stockProgress/processedMaterials", Math.min((i + 1) * CHUNK_SIZE, aMatList.length));
                    void 0;
                }

                // 🔹 Deduplicar por Materialnumber + Salesorganization + Plant
                const mUnique = new Map();
                aResults.forEach(item => {
                    const key = [
                        item.Materialnumber || "",
                        item.Salesorganization || "",
                        item.Plant || ""
                    ].join("|");

                    if (!mUnique.has(key)) {
                        mUnique.set(key, item);
                    }
                });

                const aFinal = Array.from(mUnique.values());

                void 0;
                return aFinal;
            };

            return run();
        },

        _collectValidTokensAndDiscardRaw: function (aConfigs) {
            const aInvalidRawInputs = [];
            const mResult = {};

            (aConfigs || []).forEach(cfg => {
                const oCtrl = this.byId(cfg.id);
                const oTok = this._extractTokens(oCtrl, cfg.id);

                mResult[cfg.id] = oTok;

                // Si escribió texto pero no creó token => descartar
                if (oTok.keys.length === 0 && (oTok.rawValue || "").trim()) {
                    aInvalidRawInputs.push(`${cfg.label}: "${oTok.rawValue.trim()}"`);

                    try {
                        if (oCtrl && typeof oCtrl.setValue === "function") {
                            oCtrl.setValue("");
                        }
                        // opcional: limpiar estado visual
                        if (oCtrl && typeof oCtrl.setValueState === "function") {
                            oCtrl.setValueState("None");
                        }
                    } catch (e) {
                        // no romper flujo
                        void 0;
                    }
                }
            });

            return {
                tokensById: mResult,
                invalidRawInputs: aInvalidRawInputs
            };
        },

        _extractTokens: function (oControl, sControlId) {
            if (!oControl) {
                void 0;
                return { keys: [], texts: [], rawValue: "" };
            }
            let aKeys = [], aTexts = [], rawVal = "";
            try {
                const aTokens = typeof oControl.getTokens === "function" ? oControl.getTokens() : [];
                aTokens.forEach(oToken => {
                    aKeys.push(oToken.getKey());
                    aTexts.push(oToken.getText());
                });
            } catch (e) { }
            try { rawVal = oControl.getValue ? oControl.getValue() : ""; } catch (_) { }
            return { keys: aKeys, texts: aTexts, rawValue: rawVal };
        },
        _prepareDataForTextiles: function (aStock) {
            let aFlatten = [];
            let seen = new Set();
            const that = this;

            const isSupervisor = tRol === "SUPERVISOR";
            const isVendedor = tRol === "VENDEDOR";
            const isCliente = (tRol === "CLIENTE" || tRol === "CLIENTES");

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

            aStock.forEach(parent => {
                const aDet = parent?.toEtextil?.results || [];

                aDet.forEach(child => {
                    const lineaRaw = String(child?.Linea ?? "");
                    const linea = normalizeLinea(lineaRaw);

                    const isLineaVacia = linea === "";
                    const isLineaSlash = linea === "/";
                    const isLineaAster = linea === "*";

                    const stockDispo = toNumber(child?.StockDispo);
                    const stockPend = toNumber(child?.StockPedido);

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
                        } else if (isLineaVacia) {
                            ocultar = !((stockDispo !== 0) || (stockPend > 0));
                        } else if (isLineaSlash) {
                            ocultar = false;
                        } else {
                            ocultar = true;
                        }

                    } else if (isVendedor) {
                        if (isLineaAster) {
                            ocultar = false;
                        } else if (isLineaVacia) {
                            ocultar = !((stockDispo !== 0) || (stockPend > 0));
                        } else if (isLineaSlash) {
                            ocultar = true;
                        } else {
                            ocultar = true;
                        }

                    } else {
                        ocultar = true;
                    }

                    void 0;

                    if (ocultar) return;

                    const key = `${parent.Materialnumber}|${child.Matnr}|${linea}|${child.Bezei}|${child.Um}|${child.StockDispo}|${child.StockContrato}|${child.StockFisico}|${child.StockPedido}|${child.StockSepara}`;

                    if (!seen.has(key)) {
                        seen.add(key);
                        aFlatten.push({
                            Material: parent.Materialnumber,
                            SalesOrg: parent.Salesorganization,
                            Plant: parent.Plant,
                            Matnr: child.Matnr,
                            Linea: linea,
                            Bezei: child.Bezei,
                            Um: child.Um,
                            StockDispo: that.formatNumber(child.StockDispo),
                            StockContrato: that.formatNumber(child.StockContrato),
                            StockFisico: that.formatNumber(child.StockFisico),
                            StockPedido: that.formatNumber(child.StockPedido),
                            StockSepara: that.formatNumber(child.StockSepara)
                        });
                    }
                });
            });

            aFlatten = this._sortByMaterialAsc(aFlatten);
            return aFlatten;
        },
        _prepareDataForQuimicos: function (aStock) {
            let seen = new Set();
            let aFlatten = [];

            aStock.forEach(parent => {
                if (parent.toStockQuimico && parent.toStockQuimico.results) {
                    parent.toStockQuimico.results.forEach(child => {
                        // clave única
                        const key = `${parent.Materialnumber}|${child.Matnr}|${child.Charg}|${child.Meins}`;

                        if (!seen.has(key)) {
                            seen.add(key);
                            aFlatten.push({
                                Material: parent.Materialnumber,
                                SalesOrg: parent.Salesorganization,
                                Plant: parent.Plant,
                                Matnr: child.Matnr,
                                Maktx: child.Maktx,
                                Charg: child.Charg,
                                Stockf: that.formatNumber(child.Stockf),
                                Clabs: that.formatNumber(child.Clabs),
                                Meins: child.Meins
                            });
                        }
                    });
                }
            });
            aFlatten = this._sortByMaterialAsc(aFlatten);
            return aFlatten;
        },

        _prepareDataForCeramicos: function (aStock) {
            let aFlatten = [];

            aStock.forEach(parent => {
                if (parent.toStockCeramico && parent.toStockCeramico.results) {

                    const oGrouped = parent.toStockCeramico.results.reduce((acc, child) => {
                        const sCalibre = child.Calibre || "";
                        const sTono = child.Tono || "";
                        const sUm = child.Um || "";
                        const sKey = [
                            parent.Materialnumber || "",
                            child.Matnr || "",
                            sCalibre,
                            sTono,
                            sUm
                        ].join("|");

                        const nStock = Number(child.StockFisico) || 0;
                        const nPallet = Number(child.Pallets) || 0;
                        const nSaldo = Number(child.Saldos) || 0;

                        if (!acc[sKey]) {
                            acc[sKey] = {
                                Material: parent.Materialnumber,
                                SalesOrg: parent.Salesorganization,
                                Plant: parent.Plant,

                                Matnr: child.Matnr,
                                Descripcion: child.Descripcion,
                                Tono: sTono,
                                Calibre: sCalibre,
                                Um: sUm,

                                StockFisico: 0,
                                Pallets: 0,
                                Saldos: 0,

                                Metraje: child.Metraje || ""
                            };
                        }

                        acc[sKey].StockFisico += nStock;
                        acc[sKey].Pallets += nPallet;
                        acc[sKey].Saldos += nSaldo;

                        return acc;
                    }, {});

                    const aGrouped = Object.values(oGrouped).map(item => ({
                        ...item,
                        StockFisicoFmt: this.formatNumber(item.StockFisico),
                        PalletsFmt: this.formatNumber(item.Pallets),
                        SaldosFmt: this.formatNumber(item.Saldos)
                    }));

                    aFlatten.push(...aGrouped);
                }
            });

            aFlatten = this._sortByMaterialAsc(aFlatten);
            return aFlatten;
        },



        onChangeMaterial: function (oEvent) {
            const sValue = oEvent.getParameter("suggestValue");
            this._GetFiltroMaterial(sValue, "/oFiltroMaterial");
        },

        _GetFiltroMaterial: function (sValue, sTargetPath) {
            if (!sValue || sValue.length < 2) {
                this.getView().getModel("oModelData").setProperty(sTargetPath, []);
                return;
            }

            const that = this;
            const sSalesOrg = that.sSalesOrg || "1110";
            let sUrl = "";

            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and startswith(Material,'${sValue}')`;

            if (that.local) {
                const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=90000000&$format=json&sap-language=ES`;
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
            } else {
                const sPath = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=90000000&$format=json&sap-language=ES`;
                sUrl = sPath;
            }

            Services.getoDataERPSync(that, sUrl, function (result) {
                util.response.validateAjaxGetERPNotMessage(result, {
                    success: function (oData) {
                        if (!oData.data || !Array.isArray(oData.data)) {
                            that.getView().getModel("oModelData").setProperty(sTargetPath, []);
                            return;
                        }

                        const aMateriales = oData.data.map(item => ({
                            Material: item.Material || "",
                            Display: item.Material || ""
                        }));

                        // 🔹 Eliminar duplicados
                        const mUnique = {};
                        const aUnique = [];
                        aMateriales.forEach(m => {
                            if (m.Material && !mUnique[m.Material]) {
                                mUnique[m.Material] = true;
                                aUnique.push(m);
                            }
                        });

                        that.getView().getModel("oModelData").setProperty(sTargetPath, aUnique);
                    },
                    error: function () {
                        that.getView().getModel("oModelData").setProperty(sTargetPath, []);
                    }
                });
            });
        },

        // 🔹 Abre el ValueHelp (modo diálogo)
        onOpenMaterialDialog: function () {
            const that = this;
            const oView = this.getView();
            sap.ui.core.BusyIndicator.show(0);

            this._loadAllMateriales()
                .then(() => {
                    if (!that._oMaterialDialog) {
                        that._oMaterialDialog = sap.ui.xmlfragment(
                            "aris.com.clientes.controlstock.pe.view.dialogs.ValueHelpMaterial",
                            that
                        );


                        oView.addDependent(that._oMaterialDialog);
                    }

                    const oDialog = that._oMaterialDialog;
                    oDialog.clearSelection();
                    const oBinding = oDialog.getBinding("items");
                    if (oBinding) oBinding.filter([]);

                    oDialog.open();
                })
                .finally(() => sap.ui.core.BusyIndicator.hide());
        },

        // 🔹 Carga completa (cuando se abre la lupa)
        _loadAllMateriales: function () {
            const that = this;
            return new Promise((resolve) => {
                const sSalesOrg = that.sSalesOrg || "1110";
                const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;

                let sPath;
                if (that.local) {
                    sPath = that.getOwnerComponent().getManifestObject().resolveUri(
                        `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`
                    );
                } else {
                    sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
                }

                Services.getoDataERPSync(that, sPath, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const unique = [];
                            const seen = {};
                            arr.forEach(item => {
                                if (item.Material && !seen[item.Material]) {
                                    seen[item.Material] = true;
                                    unique.push({
                                        key: item.Material,
                                        Material: item.Material,
                                        Description: item.Description || "",
                                        Display: `${item.Material} - ${item.Description || ""}`
                                    });
                                }
                            });
                            that.getView().getModel("oModelData").setProperty("/oFiltroMaterial", unique);
                            resolve();
                        },
                        error: function () {
                            that.getView().getModel("oModelData").setProperty("/oFiltroMaterial", []);
                            resolve();
                        }
                    });
                });
            });
        },


        // 🔹 Búsqueda interna en el diálogo
        onMaterialLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oSource = oEvent.getSource();
            const oBinding = oSource.getBinding("items");
            const that = this;

            // Limpia si no hay texto
            if (!sValue) {
                oBinding.filter([]);
                return;
            }


            // 🔹 Primero filtra localmente (Material o Descripción)
            const aFilters = [
                new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sValue)
            ];
            oBinding.filter([new sap.ui.model.Filter({ filters: aFilters, and: false })]);

            // 🔹 Si no encuentra nada localmente → consulta backend
            if (oBinding.getLength() === 0) {
                that._GetFiltroMaterial(sValue, "/oFiltroMaterial");
            }
        },
        onMaterialSearch: function (oEvent) {
            this.onMaterialLiveChange(oEvent);
        },

        // 🔹 Confirmar selección (agrega sin duplicar)
        onDialogMaterialConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miMaterial");
            const aExisting = (oMultiInput.getTokens() || []).map(t => t.getKey());

            aSelectedItems.forEach(oItem => {
                const key = oItem.getTitle();          // Material
                const desc = oItem.getDescription();   // Description
                if (key && !aExisting.includes(key)) {
                    oMultiInput.addToken(new sap.m.Token({
                        key,
                        text: `${key} - ${desc || ""}`  // 👈 Concatenado correctamente
                    }));
                }
            });

            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },


        // 🔹 Cancelar (limpia filtro interno)
        onDialogMaterialCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },
        _loadAllDescMaterial: function () {
            const that = this;
            return new Promise((resolve) => {
                const sSalesOrg = that.sSalesOrg || "1110";
                const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;

                let sPath;
                if (that.local) {
                    sPath = that.getOwnerComponent().getManifestObject().resolveUri(
                        `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`
                    );
                } else {
                    sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
                }

                Services.getoDataERPSync(that, sPath, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const unique = {};
                            arr.forEach(item => {
                                const desc = (item.Description || "").trim();
                                if (desc && !unique[desc]) {
                                    unique[desc] = {
                                        key: desc,
                                        Description: desc,
                                        Display: desc
                                    };
                                }
                            });
                            const aDescripciones = Object.values(unique);
                            that.getView().getModel("oModelData").setProperty("/oFiltroDescMaterial", aDescripciones);
                            resolve();
                        },
                        error: function () {
                            that.getView().getModel("oModelData").setProperty("/oFiltroDescMaterial", []);
                            resolve();
                        }
                    });
                });
            });
        },
        onDescMaterialLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oBinding = oEvent.getSource().getBinding("items");
            const that = this;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const aFilters = [
                new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("Display", sap.ui.model.FilterOperator.Contains, sValue)
            ];
            oBinding.filter([new sap.ui.model.Filter({ filters: aFilters, and: false })]);

            // Si no encuentra nada localmente, consulta CDS
            if (oBinding.getLength() === 0) {
                that._GetFiltroDescMaterial(sValue, "/oFiltroDescMaterial");
            }
        },

        onDialogDescMaterialConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miDescMaterial");
            const aExisting = (oMultiInput.getTokens() || []).map(t => t.getKey());

            aSelectedItems.forEach(oItem => {
                const key = oItem.getTitle();
                if (key && !aExisting.includes(key)) {
                    oMultiInput.addToken(new sap.m.Token({
                        key,
                        text: key
                    }));
                }
            });

            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },

        onDialogDescMaterialCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },
        onOpenDescMaterialDialog: function () {
            const that = this;
            if (!that._oDescMaterialDialog) {
                that._oDescMaterialDialog = sap.ui.xmlfragment(
                    "aris.com.clientes.controlstock.pe.view.dialogs.ValueHelpDescMaterial",
                    that
                );
                that.getView().addDependent(that._oDescMaterialDialog);
            }

            that._loadAllDescMaterial().then(() => {
                that._oDescMaterialDialog.open();
            });
        },

        onDialogTextileArticleConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miTextileArticle");

            // Tokens ya existentes
            const aExistingKeys = (oMultiInput.getTokens() || []).map(t => t.getKey());

            // Agregar solo los nuevos
            aSelectedItems.forEach(oItem => {
                const key = oItem.getTitle();    // usamos el title como key
                if (key && !aExistingKeys.includes(key)) {
                    oMultiInput.addToken(new sap.m.Token({
                        key,
                        text: key
                    }));
                }
            });

            // ✅ Limpia el filtro del SelectDialog (si existe binding)
            const oDialog = oEvent.getSource();
            const oBinding = oDialog.getBinding("items");
            if (oBinding) {
                oBinding.filter([]); // cleanup
            }

            // ✅ Importante: limpiar items dinámicos para que la próxima búsqueda sea limpia
            oDialog.destroyItems();
        },

        onDialogTextileArticleCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },
        onOpenTextileArticleDialog: async function () {
            if (!this._oTextileArticleDialog) {
                this._oTextileArticleDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "aris.com.clientes.controlstock.pe.view.dialogs.ValueHelpTextileArticle",
                    this
                );
                this.getView().addDependent(this._oTextileArticleDialog);
            }

            const sTyped = (this.byId("miTextileArticle")?.getValue?.() || "").trim();

            if (sTyped.length >= 2) {
                await this._GetFiltroTextileArticle(sTyped, "/oFiltroTextileArticleDlg");
            } else {
                await this._GetFiltroTextileArticleInitial(50, "/oFiltroTextileArticleDlg");
            }

            const oBinding = this._oTextileArticleDialog.getBinding("items");
            if (oBinding) {
                oBinding.filter([]);
                oBinding.refresh(true);
            }

            this._oTextileArticleDialog.open(sTyped);
        },

        _loadAllOrillo: function () {
            const that = this;
            return new Promise((resolve) => {
                const sSalesOrg = that.sSalesOrg || "1110";
                const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;

                let sPath;
                if (that.local) {
                    sPath = that.getOwnerComponent().getManifestObject().resolveUri(
                        `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`
                    );
                } else {
                    sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
                }

                Services.getoDataERPSync(that, sPath, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const mUniquePrefix = {};

                            arr.forEach(item => {
                                const sMaterial = String(item.Material || "").trim();
                                if (!sMaterial || sMaterial.length < 2) return;

                                const prefix2 = sMaterial.substring(0, 2);
                                if (!/^\d{2}$/.test(prefix2)) return;

                                if (!mUniquePrefix[prefix2]) {
                                    mUniquePrefix[prefix2] = {
                                        key: prefix2,
                                        Prefix2: prefix2,
                                        Display: prefix2
                                    };
                                }
                            });

                            const aOut = Object.values(mUniquePrefix).sort((a, b) =>
                                String(a.Prefix2).localeCompare(String(b.Prefix2), undefined, { numeric: true })
                            );

                            that.getView().getModel("oModelData").setProperty("/oFiltroOrillo", aOut);
                            resolve();
                        },
                        error: function () {
                            that.getView().getModel("oModelData").setProperty("/oFiltroOrillo", []);
                            resolve();
                        }
                    });
                });
            });
        },
        onOrilloLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oDialog = oEvent.getSource();
            const oBinding = oDialog.getBinding("items");
            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const aFilters = [
                new sap.ui.model.Filter("Prefix2", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("Display", sap.ui.model.FilterOperator.Contains, sValue)
            ];

            oBinding.filter([new sap.ui.model.Filter({ filters: aFilters, and: false })]);
        },


        onDialogOrilloConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miOrillo");
            const aExisting = (oMultiInput.getTokens() || []).map(t => t.getKey());

            aSelectedItems.forEach(oItem => {
                const sPrefix = oItem.getTitle(); // "12", "13", etc.
                if (sPrefix && !aExisting.includes(sPrefix)) {
                    oMultiInput.addToken(new sap.m.Token({
                        key: sPrefix,
                        text: sPrefix
                    }));
                }
            });

            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },

        onDialogOrilloCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },
        onOpenOrilloDialog: function () {
            const that = this;
            if (!that._oOrilloDialog) {
                that._oOrilloDialog = sap.ui.xmlfragment(
                    "aris.com.clientes.controlstock.pe.view.dialogs.ValueHelpOrillo",
                    that
                );
                that.getView().addDependent(that._oOrilloDialog);
            }
            that._loadAllOrillo(/* inicial */).then(() => {
                that._oOrilloDialog.open();
            });
        },

        _loadAllFormat: function () {
            const that = this;
            return new Promise((resolve) => {
                const sSalesOrg = that.sSalesOrg || "1110";

                const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;
                const sSelect = `$select=Formatt,FormatDescription`;
                const sQuery = `${sFilter}&${sSelect}`;

                let sPath;
                if (that.local) {
                    sPath = that.getOwnerComponent().getManifestObject().resolveUri(
                        `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sQuery}&$top=5000&$format=json&sap-language=ES`
                    );
                } else {
                    sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sQuery}&$top=5000&$format=json&sap-language=ES`;
                }

                Services.getoDataERPSync(that, sPath, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const mUnique = {};

                            arr.forEach(item => {
                                const format = (item.Formatt || "").trim();
                                const desc = (item.FormatDescription || "").trim();
                                if (!format) return;

                                if (!mUnique[format]) {
                                    mUnique[format] = {
                                        key: format,
                                        Formatt: format,
                                        Display: desc
                                    };
                                } else if (desc) {

                                    const prev = mUnique[format];
                                    if (!prev.Display || prev.Display === format || desc.length > prev.Display.length) {
                                        prev.Display = desc;
                                    }
                                }
                            });

                            const oMD = that.getView().getModel("oModelData");
                            oMD.setProperty("/oFiltroFormat", Object.values(mUnique));
                            oMD.refresh(true);

                            resolve();
                        },
                        error: function () {
                            const oMD = that.getView().getModel("oModelData");
                            oMD.setProperty("/oFiltroFormat", []);
                            oMD.refresh(true);
                            resolve();
                        }
                    });
                });
            });
        },

        onFormatLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oBinding = oEvent.getSource().getBinding("items");
            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const aFilters = [
                new sap.ui.model.Filter("Formatt", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("Display", sap.ui.model.FilterOperator.Contains, sValue)
            ];

            oBinding.filter([new sap.ui.model.Filter({ filters: aFilters, and: false })]);
        },

        onDialogFormatConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miFormat");
            const aExisting = (oMultiInput.getTokens() || []).map(t => t.getKey());

            aSelectedItems.forEach(oItem => {
                const oCtx = oItem.getBindingContext("oModelData");
                const oObj = oCtx && oCtx.getObject();
                if (!oObj) return;

                const key = (oObj.Formatt || oObj.key || "").trim();

                const text = (oObj.FormatDescription || oObj.Display || key).trim();

                if (key && !aExisting.includes(key)) {
                    oMultiInput.addToken(new sap.m.Token({
                        key: key,
                        text: text
                    }));
                }
            });

            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },


        onDialogFormatCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },
        onOpenFormatDialog: function () {
            const that = this;
            if (!that._oFormatDialog) {
                that._oFormatDialog = sap.ui.xmlfragment(
                    "aris.com.clientes.controlstock.pe.view.dialogs.ValueHelpFormat",
                    that
                );
                that.getView().addDependent(that._oFormatDialog);
            }

            that._loadAllFormat().then(() => {
                that._oFormatDialog.open();
            });
        },
        onChangeQuality: function (oEvent) {
            const sValue = oEvent.getParameter("suggestValue");
            this._GetFiltroQuality(sValue, "/oFiltroQuality");
        },

        _GetFiltroQuality: function (sValue, sTargetPath) {
            if (!sValue || sValue.length < 2) {
                this.getView().getModel("oModelData").setProperty(sTargetPath, []);
                return;
            }

            const that = this;
            const sSalesOrg = that.sSalesOrg || "1110";
            const sv = this._odStr ? this._odStr(sValue) : sValue;

            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and startswith(TextileArticleQuality,'${sv}')`;
            const sSelect = `$select=TextileArticleQuality,TextArtQuaDescription`;
            const sQuery = `${sFilter}&${sSelect}`;

            let sUrl = "";
            if (that.local) {
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(
                    `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sQuery}&$top=2000&$format=json&sap-language=ES`
                );
            } else {
                sUrl = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sQuery}&$top=2000&$format=json&sap-language=ES`;
            }

            Services.getoDataERPSync(that, sUrl, function (result) {
                util.response.validateAjaxGetERPNotMessage(result, {
                    success: function (oData) {
                        const arr = Array.isArray(oData.data) ? oData.data : [];
                        const mUnique = {};

                        arr.forEach(item => {
                            const q = (item.TextileArticleQuality || "").trim();
                            const d = (item.TextArtQuaDescription || "").trim();
                            if (!q) return;

                            if (!mUnique[q]) {
                                mUnique[q] = {
                                    key: q,
                                    TextileArticleQuality: q,
                                    Display: d || q
                                };
                            } else if (d) {
                                const prev = mUnique[q];
                                if (!prev.Display || prev.Display === q || d.length > prev.Display.length) {
                                    prev.Display = d;
                                }
                            }
                        });

                        const aQuality = Object.values(mUnique);
                        const oMD = that.getView().getModel("oModelData");
                        oMD.setProperty(sTargetPath, aQuality);
                        oMD.refresh(true);
                    },
                    error: function () {
                        const oMD = that.getView().getModel("oModelData");
                        oMD.setProperty(sTargetPath, []);
                        oMD.refresh(true);
                    }
                });
            });
        },


        // Carga total (SelectDialog)
        _loadAllQuality: function () {
            const that = this;
            return new Promise((resolve) => {
                const sSalesOrg = that.sSalesOrg || "1110";

                const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;
                const sSelect = `$select=TextileArticleQuality,TextArtQuaDescription`;
                const sQuery = `${sFilter}&${sSelect}`;

                let sPath;
                if (that.local) {
                    sPath = that.getOwnerComponent().getManifestObject().resolveUri(
                        `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sQuery}&$top=5000&$format=json&sap-language=ES`
                    );
                } else {
                    sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sQuery}&$top=5000&$format=json&sap-language=ES`;
                }

                Services.getoDataERPSync(that, sPath, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const unique = {};

                            arr.forEach(item => {
                                const q = (item.TextileArticleQuality || "").trim();
                                const d = (item.TextArtQuaDescription || "").trim();
                                if (!q) return;

                                if (!unique[q]) {
                                    unique[q] = {
                                        key: q,
                                        TextileArticleQuality: q,
                                        Display: d || q
                                    };
                                } else if (d) {
                                    const prev = unique[q];
                                    if (!prev.Display || prev.Display === q || d.length > prev.Display.length) {
                                        prev.Display = d;
                                    }
                                }
                            });

                            const oMD = that.getView().getModel("oModelData");
                            oMD.setProperty("/oFiltroQuality", Object.values(unique));
                            oMD.refresh(true);
                            resolve();
                        },
                        error: function () {
                            const oMD = that.getView().getModel("oModelData");
                            oMD.setProperty("/oFiltroQuality", []);
                            oMD.refresh(true);
                            resolve();
                        }
                    });
                });
            });
        },


        onQualityLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oBinding = oEvent.getSource().getBinding("items");
            if (!oBinding) return;

            if (!sValue) { oBinding.filter([]); return; }

            const aFilters = [
                new sap.ui.model.Filter("TextileArticleQuality", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("Display", sap.ui.model.FilterOperator.Contains, sValue)
            ];
            oBinding.filter([new sap.ui.model.Filter(aFilters, false)]);
        },


        onDialogQualityConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miQuality");
            const aExisting = (oMultiInput.getTokens() || []).map(t => t.getKey());

            aSelectedItems.forEach(oItem => {
                const oObj = oItem.getBindingContext("oModelData")?.getObject();
                if (!oObj) return;

                const key = (oObj.TextileArticleQuality || oObj.key || "").trim();
                const text = (oObj.Display || oObj.TextArtQuaDescription || key).trim();

                if (key && !aExisting.includes(key)) {
                    oMultiInput.addToken(new sap.m.Token({ key, text }));
                }
            });

            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },


        onDialogQualityCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },

        onOpenQualityDialog: function () {
            const that = this;
            if (!that._oQualityDialog) {
                that._oQualityDialog = sap.ui.xmlfragment(
                    "aris.com.clientes.controlstock.pe.view.dialogs.ValueHelpQuality",
                    that
                );
                that.getView().addDependent(that._oQualityDialog);
            }
            that._loadAllQuality().then(() => that._oQualityDialog.open());
        },
        onOpenStyleDialog: function () {
            if (!this._oStyleDialog) {
                this._oStyleDialog = sap.ui.xmlfragment(
                    "aris.com.clientes.controlstock.pe.view.dialogs.ValueHelpStyle",
                    this
                );
                this.getView().addDependent(this._oStyleDialog);
            }
            this._loadAllStyle().then(() => this._oStyleDialog.open());
        },

        _loadAllStyle: function () {
            const that = this;
            return new Promise((resolve) => {
                const sSalesOrg = that.sSalesOrg || "1110";
                const sFilter =
                    `$filter=SalesOrganization eq '${sSalesOrg}' ` +
                    `and LevelNumber eq '5' ` +
                    `and startswith(Hierarchy,'3')`;

                let sPath = "";
                if (that.local) {
                    sPath = that.getOwnerComponent().getManifestObject().resolveUri(
                        `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`
                    );
                } else {
                    sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
                }

                Services.getoDataERPSync(that, sPath, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const mUnique = {};

                            arr.forEach(item => {
                                const style = (item.OrilloStyle || "").trim();
                                if (style) {
                                    const key = style;
                                    if (!mUnique[key]) {
                                        mUnique[key] = {
                                            OrilloStyle: style
                                        };
                                    }
                                }
                            });

                            that.getView().getModel("oModelData").setProperty("/oFiltroStyle", Object.values(mUnique));

                            resolve();
                        },
                        error: function () {
                            that.getView().getModel("oModelData").setProperty("/oFiltroStyle", []);
                            resolve();
                        }
                    });
                });
            });
        },

        onStyleLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oBinding = oEvent.getSource().getBinding("items");
            if (!oBinding) return;

            if (!sValue) { oBinding.filter([]); return; }

            oBinding.filter([
                new sap.ui.model.Filter("OrilloStyle", sap.ui.model.FilterOperator.Contains, sValue)
            ]);
        },


        onDialogStyleConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miStyle");
            const aExisting = (oMultiInput.getTokens() || []).map(t => t.getKey());

            aSelectedItems.forEach(oItem => {
                const style = oItem.getTitle();
                const key = style;

                if (key && !aExisting.includes(key)) {
                    oMultiInput.addToken(new sap.m.Token({
                        key,
                        text: style
                    }));
                }
            });

            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },


        onDialogStyleCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },
        getMaterialsByMetrajeMinimo: async function () {
            const that = this;
            sap.ui.core.BusyIndicator.show(0);

            try {
                const oModel = that.getView().getModel("oModelProyect");
                const sSalesOrg = that.sSalesOrg || "1110";
                const tUniNeg = that.oModelUser?.getProperty("/bUniNeg") || "";
                const fMetrajeMinimo = parseFloat(oModel.getProperty("/Main/filter/fMetrajeMinimo")) || 0;

                if (!fMetrajeMinimo || isNaN(fMetrajeMinimo)) {
                    sap.m.MessageToast.show("Debe ingresar un valor válido para Metraje Mínimo.");
                    sap.ui.core.BusyIndicator.hide();
                    return [];
                }

                void 0;
                let sUrl = "";
                const sFilter = `$filter=UMV eq 'MTS' and SalesOrganization eq '${sSalesOrg}'&$format=json&sap-language=ES`;

                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}`;
                    sUrl = sPath;
                }

                void 0;

                const aMaterials = await new Promise((resolve) => {
                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                let aRaw = [];
                                if (oData.data && Array.isArray(oData.data)) aRaw = oData.data;
                                else if (oData.data) aRaw = [oData.data];

                                // Solo códigos y descripciones
                                const aClean = aRaw.map(m => ({
                                    key: m.Materialnumber,
                                    desc: m.Description,
                                    UMV: m.UMV
                                }));
                                void 0;
                                resolve(aClean);
                            },
                            error: function (err) {
                                void 0;
                                resolve([]);
                            }
                        });
                    });
                });

                if (!aMaterials.length) {
                    sap.m.MessageToast.show("No se encontraron materiales con UMV=MTS.");
                    sap.ui.core.BusyIndicator.hide();
                    return [];
                }
                const aStockData = await that._fetchStockForMaterials(aMaterials);

                if (!aStockData || !aStockData.length) {
                    sap.m.MessageToast.show("No se encontró stock disponible para los materiales MTS.");
                    sap.ui.core.BusyIndicator.hide();
                    return [];
                }

                const aFiltered = aStockData.filter(item => {
                    const qty = parseFloat(item.Quantity || item.Cantidad || 0);
                    return qty >= fMetrajeMinimo;
                });

                void 0;

                let aFinal = [];
                switch (tUniNeg) {
                    case "TEXTILES":
                        aFinal = aFiltered.map(it => ({
                            Material: it.Materialnumber,
                            Descripcion: it.Description || "",
                            StockFisico: it.Stock || it.Quantity || 0,
                            UM: it.Umv || "MTS"
                        }));
                        break;
                    case "CERAMICOS":
                        aFinal = aFiltered.map(it => ({
                            Material: it.Materialnumber,
                            Descripcion: it.Description || "",
                            Saldos: it.Stock || 0,
                            UM: it.Umv || "MTS"
                        }));
                        break;
                    case "QUIMICOS":
                        aFinal = aFiltered.map(it => ({
                            Material: it.Materialnumber,
                            Descripcion: it.Description || "",
                            StockDisponible: it.Stock || 0,
                            UM: it.Umv || "MTS"
                        }));
                        break;
                    default:
                        aFinal = aFiltered;
                }

                void 0;
                sap.m.MessageToast.show(`✅ ${aFinal.length} materiales cumplen con el metraje mínimo (${fMetrajeMinimo}).`);

                sap.ui.core.BusyIndicator.hide();
                return aFinal;

            } catch (err) {
                void 0;
                sap.ui.core.BusyIndicator.hide();
                return [];
            }
        },

        _getSalesOrgByBP: function (sBP) {
            const that = this;

            return new Promise((resolve) => {
                if (!sBP) {
                    void 0;
                    resolve([]);
                    return;
                }

                const sFilter = `$filter=BP eq '${sBP}'&$expand=toBpSalesOrganization&$format=json`;
                let sUrl = "";

                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iBpSalesOrganizationSet?${sFilter}`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/iBpSalesOrganizationSet?${sFilter}`;
                    sUrl = sPath;
                }

                void 0;

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const aSalesOrgs = [];
                            const aResults = oData?.data || oData?.d?.results || [];

                            if (!Array.isArray(aResults) || aResults.length === 0) {
                                void 0;
                                resolve([]);
                                return;
                            }

                            aResults.forEach(function (oItem) {
                                const sDirectSalesOrg =
                                    oItem.SALES_ORG ||
                                    oItem.SalesOrganization ||
                                    oItem.Salesorganization ||
                                    "";

                                if (sDirectSalesOrg) {
                                    aSalesOrgs.push(String(sDirectSalesOrg).trim());
                                }

                                const aNested = oItem?.toBpSalesOrganization?.results || [];

                                aNested.forEach(function (oSubItem) {
                                    const sNestedSalesOrg =
                                        oSubItem.SALES_ORG ||
                                        oSubItem.SalesOrganization ||
                                        oSubItem.Salesorganization ||
                                        "";

                                    if (sNestedSalesOrg) {
                                        aSalesOrgs.push(String(sNestedSalesOrg).trim());
                                    }
                                });
                            });

                            const aUniqueSalesOrgs = [...new Set(aSalesOrgs)].filter(Boolean);

                            void 0;

                            resolve(aUniqueSalesOrgs);
                        },
                        error: function (err) {
                            void 0;
                            resolve([]);
                        }
                    });
                });
            });
        },
        _validateAccessToPortal: function (aSalesOrgs, sCurrentSalesOrg) {
            const mPortalNames = {
                "1110": "Textiles",
                "1120": "Químicos",
                "1130": "Cerámicos"
            };

            if (!Array.isArray(aSalesOrgs) || aSalesOrgs.length === 0) {
                void 0;
                sap.m.MessageBox.error(
                    "No tiene unidades organizacionales asignadas. Comuníquese con el área de soporte para habilitar su acceso."
                );
                return false;
            }

            if (!sCurrentSalesOrg) {
                void 0;
                sap.m.MessageBox.error("No se pudo determinar la unidad organizacional actual del portal.");
                return false;
            }

            void 0;
            const bHasAccess = aSalesOrgs.includes(sCurrentSalesOrg);

            if (!bHasAccess) {
                const sPortalName = mPortalNames[sCurrentSalesOrg] || `Unidad ${sCurrentSalesOrg}`;
                void 0;

                sap.m.MessageBox.error(
                    `No tiene permisos para acceder al portal de ${sPortalName}. Será redirigido a la página principal.`,
                    {
                        onClose: () => {
                            window.location.href = "/";
                        }
                    }
                );
                return false;
            }

            void 0;
            return true;
        },
        _getPerfilByUsuario: function (sUsuario, sSalesOrg) {
            const that = this;

            return new Promise((resolve) => {
                if (!sUsuario || !sSalesOrg) {
                    void 0;
                    resolve({ perfil: "", autorizado: false });
                    return;
                }

                const sFilter = `$filter=usuario eq '${sUsuario}' and orgventas eq '${sSalesOrg}'&$select=DscPerfil`;
                let sUrl = "";

                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/UsOrve?${sFilter}&$format=json&sap-language=ES`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/UsOrve?${sFilter}&$format=json&sap-language=ES`;
                    sUrl = sPath;
                }

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            let sPerfil = "";

                            if (oData && Array.isArray(oData.data) && oData.data.length > 0) {
                                sPerfil = (oData.data[0].DscPerfil || "").trim();
                            } else if (oData && oData.data && oData.data.DscPerfil) {
                                sPerfil = (oData.data.DscPerfil || "").trim();
                            }

                            if (sPerfil) {
                                resolve({ perfil: sPerfil, autorizado: true });
                            } else {
                                resolve({ perfil: "", autorizado: false });
                            }
                        },
                        error: function (err) {
                            void 0;
                            resolve({ perfil: "", autorizado: false });
                        }
                    });
                });
            });
        },
        async onLoadImages() {

            void 0;

            try {
                const oResp = await this._getSharepoint();

                void 0;

                if (oResp.sEstado !== "S") {
                    void 0;
                    return;
                }

                const files = oResp.oResults;

                const aImages = files
                    .filter(f => f.file && f.name && (f.name.endsWith(".png") || f.name.endsWith(".jpg") || f.name.endsWith(".jpeg")))
                    .map(f => ({
                        name: f.name.toUpperCase(),
                        url: f["@microsoft.graph.downloadUrl"]
                    }));

                void 0;

                const oModelImages = new sap.ui.model.json.JSONModel({
                    Images: aImages
                });

                sap.ui.getCore().setModel(oModelImages, "oModelImages");

                void 0;

            } catch (err) {
                void 0;
            }
        },
        onTextileArticleLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oDialog = oEvent.getSource();

            if (!sValue) {
                this._GetFiltroTextileArticleInitial(1000000, "/oFiltroTextileArticleDlg").then(() => {
                    const oBinding = oDialog.getBinding("items");
                    if (oBinding) { oBinding.filter([]); oBinding.refresh(true); }
                });
                return;
            }

            this._GetFiltroTextileArticle(sValue, "/oFiltroTextileArticleDlg").then(() => {
                const oBinding = oDialog.getBinding("items");
                if (oBinding) { oBinding.filter([]); oBinding.refresh(true); }
            });
        },
        _GetFiltroTextileArticleInitial: function (iTop, sTargetPath) {
            const that = this;
            const sSalesOrg = that.sSalesOrg || "1110";
            const top = Number(iTop) > 0 ? Number(iTop) : 1000000;
            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and startswith(TextileArticleQuality,'1')`;
            let sUrl = "";

            if (that.local) {
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(
                    `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=${top}&$format=json&sap-language=ES`
                );
            } else {
                sUrl = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=${top}&$format=json&sap-language=ES`;
            }

            const isNumeric = (s) => /^\d+$/.test(String(s || "").trim()); // ✅ solo números

            return new Promise((resolve) => {
                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const mUnique = {};

                            arr.forEach(item => {
                                const taq = (item.TextileArticleQuality || "").trim();
                                if (!taq) return;

                                // ✅ descartar alfanuméricos tipo DMM...
                                if (!isNumeric(taq)) return;

                                if (!mUnique[taq]) {
                                    mUnique[taq] = { key: taq, TextileArticleQuality: taq, Display: taq };
                                }
                            });

                            // ✅ ordenar numéricamente ascendente
                            const aOut = Object.values(mUnique).sort((a, b) =>
                                String(a.key).localeCompare(String(b.key), undefined, { numeric: true })
                            );

                            that.getView().getModel("oModelData").setProperty(sTargetPath, aOut);
                            resolve(aOut);
                        },
                        error: function () {
                            that.getView().getModel("oModelData").setProperty(sTargetPath, []);
                            resolve([]);
                        }
                    });
                });
            });
        },
        _buildImagesModelFromSharepoint: function (oResp) {
            const aItems = (oResp?.oResults?.value || oResp?.oResults?.data || oResp?.oResults || []);

            const aImages = aItems
                .filter(it => it.file && it.file.mimeType && it.file.mimeType.startsWith("image/"))
                .map(it => {
                    const name = (it.name || "").trim();
                    const code = name.split(".")[0].trim().toUpperCase();
                    const dl = it["@microsoft.graph.downloadUrl"];

                    return {
                        id: it.id,
                        name,
                        code,
                        url: dl || it.webUrl || "",
                        thumb: dl || "",
                        mime: it.file.mimeType,
                        size: it.size
                    };
                });

            const mByCode = {};
            aImages.forEach(x => mByCode[x.code] = x.url);

            const oJson = new sap.ui.model.json.JSONModel({
                Images: aImages,
                MapByCode: mByCode
            });
            sap.ui.getCore().setModel(oJson, "oModelImages");
        },
        getMaterialsByMetrajeM2: async function () {
            const that = this;
            sap.ui.core.BusyIndicator.show(0);

            try {

                const sSalesOrg = "1130";

                void 0;

                let sUrl = "";
                const sFilter = `$filter=UMV eq 'M2' and SalesOrganization eq '${sSalesOrg}'&$format=json&sap-language=ES`;

                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}`;
                    sUrl = sPath;
                }

                void 0;

                const aMaterials = await new Promise((resolve) => {
                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                let aRaw = [];
                                if (oData.data && Array.isArray(oData.data)) aRaw = oData.data;
                                else if (oData.data) aRaw = [oData.data];
                                const aClean = aRaw.map(m => ({
                                    key: m.Materialnumber,
                                    desc: m.Description,
                                    UMV: m.UMV
                                }));

                                void 0;
                                resolve(aClean);
                            },
                            error: function (err) {
                                void 0;
                                resolve([]);
                            }
                        });
                    });
                });

                if (!aMaterials.length) {
                    sap.m.MessageToast.show("No se encontraron materiales con UMV = M2 para CERÁMICOS (1130).");
                }

                sap.ui.core.BusyIndicator.hide();
                return aMaterials;

            } catch (err) {
                void 0;
                sap.ui.core.BusyIndicator.hide();
                return [];
            }
        },
        _getRazonSocialClienteByBP: function (sBP) {
            const that = this;

            return new Promise((resolve) => {
                const bp = String(sBP || "").trim();
                if (!bp) return resolve("");

                const sSalesOrg = that.sSalesOrg || "";
                if (!sSalesOrg) return resolve("");

                let sUrl = "";

                const sFilter =
                    `$filter=SalesOrganization eq '${sSalesOrg}' and Customer eq '${bp}'`;

                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?${sFilter}&$top=1&$format=json&sap-language=ES`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?${sFilter}&$top=1&$format=json&sap-language=ES`;
                    sUrl = sPath;
                }

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = Array.isArray(oData.data) ? oData.data : [];
                            const first = arr[0] || null;

                            const rs = (first && first.CustomerFullName) ? String(first.CustomerFullName).trim() : "";
                            resolve(rs);
                        },
                        error: function () {
                            resolve("");
                        }
                    });
                });
            });
        },
        onPressExportarExcel: function () {
            const bEsClienteTextil = (
                String(tUniNeg || "").toUpperCase() === "TEXTILES" &&
                String(tRol || "").toUpperCase() === "CLIENTES"
            );

            if (bEsClienteTextil) {
                sap.m.MessageBox.warning("No tiene permisos para exportar el stock de Textiles en Excel.");
                return;
            }

            this.onExportStockExcel({
                uniNeg: tUniNeg,
                rol: tRol
            });
        },
        onChangeOrillo: function (oEvent) {
            const sValue = (oEvent.getParameter("suggestValue") || "").trim();
            this._GetFiltroOrilloPrefixSuggest(sValue, "/oFiltroOrilloSuggest");
        },

        _GetFiltroOrilloPrefixSuggest: function (sValue, sTargetPath) {
            const oModelData = this.getView().getModel("oModelData");

            if (!sValue || sValue.length < 1) {
                oModelData.setProperty(sTargetPath, []);
                return;
            }

            const that = this;
            const sSalesOrg = that.sSalesOrg || "1110";
            const sv = this._odStr ? this._odStr(sValue) : String(sValue).replace(/'/g, "''");

            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' ` +
                `and startswith(Material,'${sv}')`;

            let sUrl = "";
            if (that.local) {
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(
                    `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`
                );
            } else {
                sUrl = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/MaterialsConsultation?${sFilter}&$top=900000000&$format=json&sap-language=ES`;
            }

            Services.getoDataERPSync(that, sUrl, function (result) {
                util.response.validateAjaxGetERPNotMessage(result, {
                    success: function (oData) {
                        const arr = Array.isArray(oData.data) ? oData.data : [];
                        const mUniquePrefix = {};

                        arr.forEach(item => {
                            const sMaterial = String(item.Material || "").trim();
                            if (!sMaterial || sMaterial.length < 2) return;

                            const sPrefix2 = sMaterial.substring(0, 2);
                            if (!/^\d{2}$/.test(sPrefix2)) return;

                            if (!mUniquePrefix[sPrefix2]) {
                                mUniquePrefix[sPrefix2] = {
                                    key: sPrefix2,
                                    Display: sPrefix2,
                                    OrilloPrefix2: sPrefix2
                                };
                            }
                        });

                        let aSuggest = Object.values(mUniquePrefix).sort((a, b) =>
                            String(a.key).localeCompare(String(b.key), undefined, { numeric: true })
                        );

                        oModelData.setProperty(sTargetPath, aSuggest);
                    },
                    error: function () {
                        oModelData.setProperty(sTargetPath, []);
                    }
                });
            });
        },
        onOrilloSuggestionItemSelected: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            const oMultiInput = this.byId("miOrillo");

            if (!oSelectedItem || !oMultiInput) return;

            const sKey = String(oSelectedItem.getKey() || "").trim();
            const sText = String(oSelectedItem.getText() || sKey).trim();

            if (!sKey) return;

            const bExists = (oMultiInput.getTokens() || []).some(function (oToken) {
                return String(oToken.getKey()) === sKey;
            });

            if (!bExists) {
                oMultiInput.addToken(new sap.m.Token({
                    key: sKey,
                    text: sText
                }));
            }

            oMultiInput.setValue("");
        }

    });
});