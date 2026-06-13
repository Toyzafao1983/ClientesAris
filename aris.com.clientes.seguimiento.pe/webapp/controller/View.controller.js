sap.ui.define([
    "aris/com/clientes/seguimiento/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/resource/ResourceModel",
    "aris/com/clientes/seguimiento/pe/model/models",
    "aris/com/clientes/seguimiento/pe/model/formatter",
    "aris/com/clientes/seguimiento/pe/services/Services",
    "aris/com/clientes/seguimiento/pe/util/util",
    "aris/com/clientes/seguimiento/pe/util/utilUI",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageBox"
], (BaseController, Controller, ResourceModel, models, formatter, Services, util, utilUI, JSONModel, Filter, FilterOperator, ODataModel, MessageBox) => {
    "use strict";
    var that;
    var tUniNeg = "", tRol = "", tVendedor = "", oBPUser = "", tDisplay = "";

    return BaseController.extend("aris.com.clientes.seguimiento.pe.controller.View", {


        onInit: function () {
            that = this;

            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("View").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));


            this.frgIdTableMain = "frgIdTableMain";
            this.frgIdFilterInit = "frgIdFilterInit";

            // Crear modelo proyect
            var oModelProyect = models.createModelProyect();

            // Calcular fechas
            var oToday = new Date();                  // hoy
            var oOneMonthBefore = new Date(oToday);   // un mes antes
            oOneMonthBefore.setMonth(oToday.getMonth() - 1);

            oModelProyect.setProperty("/Main/filter/dStartDate", oOneMonthBefore);
            oModelProyect.setProperty("/Main/filter/dEndDate", oToday);

            // Setear modelo en la vista
            this.getView().setModel(oModelProyect, "oModelProyect");

            // ✅ Crear modelo vacío para datos auxiliares (sugerencias, combos, etc.)
            var oModelData = new sap.ui.model.json.JSONModel({});
            this.getView().setModel(oModelData, "oModelData");
            let sURL = window.parent.location.href;
            if (sURL.includes("site-textiles")) { tUniNeg = "TEXTILES"; that.sSalesOrg = "1110" };
            if (sURL.includes("site-quimicos")) { tUniNeg = "QUIMICOS"; that.sSalesOrg = "1120" };
            if (sURL.includes("site-ceramicos")) { tUniNeg = "CERAMICOS"; that.sSalesOrg = "1130" };
            var oUi = new sap.ui.model.json.JSONModel({
                filtersReady: false,
                loadingText: "Cargando filtros"
            });
            this.getView().setModel(oUi, "ui");

            oUi.setProperty("/filtersReady", false);

            this._initFlpBackNavigation();

        },
        handleRouteMatched: async function (bInit) {
            sap.ui.core.BusyIndicator.show(0);

            try {

                const values = await Promise.all([
                    this._getUsers(),                 // 0
                    this._getEstadoGeneral(),         // 1
                    this._getDatClient(this.sSalesOrg), // 2 DataCustomer
                    this._getCliente(this.sSalesOrg),   // 3 Customer
                    this._getEstado(this),            // 4
                    this._getClasePedido(this)        // 5
                ]);

                const that = this;
                that.oModelProyect = that.getModel("oModelProyect");
                that.oModelData = that.getModel("oModelData");
                that.oModelUser = that.getModel("oModelUser");
                that.oModelDevice = that.getModel("oModelDevice");

                let sIdioma = that.oModelProyect.getProperty("/sIdioma");
                that.oModelProyect.setSizeLimit(99999999);
                that.oModelData.setSizeLimit(99999999);


                let oUser = values[0].Resources[0];
                let oAttr = oUser["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"];

                let oBPUser = "";
                let tipoBP = ""; // CLIENTE / VENDEDOR / SUPERVISOR

                if (oAttr && Array.isArray(oAttr.attributes)) {
                    const attr1 = oAttr.attributes.find(a => a.name === "customAttribute1");
                    const attr2 = oAttr.attributes.find(a => a.name === "customAttribute2");
                    const attr3 = oAttr.attributes.find(a => a.name === "customAttribute3");

                    if (attr1 && attr1.value) {
                        oBPUser = attr1.value.trim();
                        tipoBP = "CLIENTE";
                    } else if (attr2 && attr2.value) {
                        oBPUser = attr2.value.trim();
                        tipoBP = "VENDEDOR";
                    }
                }


                if (!oBPUser) {
                    sap.m.MessageBox.error(
                        "No se encontró ningún código asignado a su usuario IAS. No tiene permisos para acceder a esta aplicación.",
                        { onClose: () => (window.location.href = "/") }
                    );
                    sap.ui.core.BusyIndicator.hide(0);
                    return;
                }


                let accesoPermitido = false;

                if (tipoBP === "CLIENTE") {
                    // 🔹 Validar unidades organizacionales del cliente
                    console.log("🔍 Validando unidades organizacionales del cliente…");
                    const vUOIAs = await this._getSalesOrgByBP(oBPUser);

                    const UOIAs = Array.isArray(vUOIAs)
                        ? vUOIAs.map(function (sOrg) {
                            return String(sOrg || "").trim();
                        }).filter(Boolean)
                        : (vUOIAs ? [String(vUOIAs).trim()] : []);

                    console.log("🏢 Unidades organizacionales normalizadas del cliente:", UOIAs, "| Portal actual:", that.sSalesOrg);

                    if (UOIAs.length > 0) {
                        const bAccessGranted = this._validateAccessToPortal(UOIAs, that.sSalesOrg);
                        if (bAccessGranted) {
                            tRol = "CLIENTES";
                            accesoPermitido = true; // ✅ IMPORTANTE
                            console.log("🎯 Rol asignado (cliente con acceso autorizado):", tRol);
                        } else {
                            sap.ui.core.BusyIndicator.hide(0);
                            sap.m.MessageBox.error(
                                "No tiene permisos para acceder a esta unidad de negocio. Será redirigido a la página principal.",
                                { onClose: () => (window.location.href = "/") }
                            );
                            return;
                        }
                    } else {
                        // No tiene ninguna UO asociada
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error(
                            "No se encontraron unidades organizacionales para su código de cliente.",
                            { onClose: () => (window.location.href = "/") }
                        );
                        return;
                    }
                }

                // 🔸 Si aún no se concedió acceso y es vendedor/supervisor, validar por UsOrve
                if (!accesoPermitido && (tipoBP === "VENDEDOR")) {
                    const oPerfilResp = await this._getPerfilByUsuario(oBPUser, that.sSalesOrg);
                    console.log("autorizado:", oPerfilResp.autorizado, "perfil:", oPerfilResp.perfil);

                    if (!oPerfilResp.autorizado) {
                        sap.ui.core.BusyIndicator.hide(0);
                        sap.m.MessageBox.error(
                            "No tiene permisos para acceder a esta unidad organizacional. Será redirigido a la página principal.",
                            { onClose: () => (window.location.href = "/") }
                        );
                        return;
                    }

                    switch (oPerfilResp.perfil) {
                        case "Coordinador":
                            tRol = "SUPERVISOR";
                            accesoPermitido = true; // ✅ IMPORTANTE
                            break;
                        case "Vendedor":
                            tRol = "VENDEDOR";
                            accesoPermitido = true;
                            that.oModelProyect.setProperty("/Main/filter/cbVendor", oBPUser ? [oBPUser.trim()] : []);
                            that.oModelUser.setProperty("/bVendedor", oBPUser ? oBPUser.trim() : "");

                            break;

                        default:
                            sap.ui.core.BusyIndicator.hide(0);
                            sap.m.MessageBox.error(
                                "Su perfil no está autorizado para acceder a esta aplicación.",
                                { onClose: () => (window.location.href = "/") }
                            );
                            return;
                    }

                    console.log("🎯 Rol asignado desde CDS UsOrve:", tRol);
                }

                // 🔒 Filtro final: si nunca se concedió acceso, bloquear
                if (!accesoPermitido) {
                    sap.ui.core.BusyIndicator.hide(0);
                    sap.m.MessageBox.error(
                        "No se encontraron permisos válidos para su usuario. Será redirigido a la página principal.",
                        { onClose: () => (window.location.href = "/") }
                    );
                    return;
                }

                if (!sIdioma) {
                    that._setLanguageModel("esp");
                } else {
                    that._setLanguageModel(sIdioma);
                }

                that.oModelUser.setProperty("/Information", oUser);
                that.oModelUser.setProperty("/sNameComp", oUser.name.givenName + " " + oUser.name.familyName);
                that.oModelUser.setProperty("/bUniNeg", tUniNeg);
                that.oModelUser.setProperty("/bRol", tRol);
                that.oModelUser.setProperty("/bRolTitulo", tRol.charAt(0).toUpperCase() + tRol.slice(1).toLowerCase());
                that.oModelUser.setProperty("/bBprueba", oBPUser);
                that.oModelProyect.setProperty("/Main/tRol", tRol);

                const sRolNorm = String(tRol || "").trim().toUpperCase();

                const bIsClienteUser = sRolNorm === "CLIENTE" || sRolNorm === "CLIENTES";
                const bIsVendedorUser = sRolNorm === "VENDEDOR";
                const bIsCoordUser = sRolNorm === "SUPERVISOR" || sRolNorm === "COORDINADOR";

                that.oModelUser.setProperty("/bIsCliente", bIsClienteUser);
                that.oModelUser.setProperty("/bIsVendedor", bIsVendedorUser);
                that.oModelUser.setProperty("/bIsCoord", bIsCoordUser);
                that.oModelUser.setProperty("/bIsInterno", !bIsClienteUser);
                that.oModelUser.setProperty("/bBP", oBPUser);
                that.oModelUser.setProperty("/bBPFinal", oBPUser);

                try {
                    localStorage.setItem("oModelUser", JSON.stringify(that.oModelUser.getData()));
                } catch (e) {
                    console.warn("No se pudo guardar oModelUser en localStorage:", e);
                }




                // 🧩 Asignar nombre del usuario IAS (fallback si displayName viene vacío)
                let sDisplayName = (oUser.displayName || "").trim();
                if (!sDisplayName) {
                    const given = (oUser.name?.givenName || "").trim();
                    const family = (oUser.name?.familyName || "").trim();
                    sDisplayName = `${given} ${family}`.trim();
                }

                // Asignar siempre un valor válido al modelo
                that.oModelUser.setProperty("/bNombre", sDisplayName || "Usuario sin nombre");

                const aDatClientAll =
                    values[2]?.oResults ||
                    values[2]?.data ||
                    values[2]?.d?.results ||
                    [];

                const aClientesAll =
                    values[3]?.oResults ||
                    values[3]?.data ||
                    values[3]?.d?.results ||
                    [];

                console.log("DEBUG aDatClientAll:", aDatClientAll.length, aDatClientAll);
                console.log("DEBUG aClientesAll:", aClientesAll.length, aClientesAll);

                console.log("🔥 CLIENTES RAW RESPONSE:", values[3]);
                console.log("🔥 CLIENTES NORMALIZADOS:", aClientesAll.length, aClientesAll);

                that.oModelProyect.setProperty("/oDatClientAll", aDatClientAll);
                that.oModelProyect.setProperty("/oClienteFilterAll", aClientesAll);
                that.oModelProyect.setProperty("/oClienteFilter", aClientesAll);
                that.oModelProyect.setProperty("/oCliente", aClientesAll);
                that.oModelData.setProperty("/oEstado", values[4].d.results);
                that.oModelData.setProperty("/oClasePedido", values[5].d.results);

                // ✅ Bienvenido + (Razón social si CLIENTE) / (Nombre IAS si interno)
                await this._setWelcomeTextMain({
                    bp: oBPUser,
                    rol: tRol,
                    displayName: that.oModelUser.getProperty("/bNombre"),
                    clientes: values[3]?.d?.results || []
                });


                // CLIENTE normal: se mantiene amarrado a su BP.
                // Excepción QUIMICOS: debe poder ver/filtrar todos los clientes,
                // porque en esta unidad no existe asignación estricta cliente-vendedor.
                const bClienteQuimicos = (tRol === "CLIENTES" && tUniNeg === "QUIMICOS");

                if (tRol === "CLIENTES" && oBPUser && !bClienteQuimicos) {
                    that.oModelProyect.setProperty("/Main/filter/cbCliente", [oBPUser]);
                    that.oModelProyect.refresh(true);

                    const oMultiInput = this.byId("miCliente");
                    if (oMultiInput) {
                        oMultiInput.removeAllTokens();
                        oMultiInput.addToken(new sap.m.Token({ key: oBPUser, text: oBPUser }));
                        oMultiInput.setEditable(false);
                    }
                } else if (bClienteQuimicos) {
                    that.oModelProyect.setProperty("/Main/filter/cbCliente", []);
                    that.oModelProyect.setProperty("/oClienteFilter", aClientesAll);
                    that.oModelProyect.setProperty("/oCliente", aClientesAll);
                    that.oModelProyect.refresh(true);

                    const oMultiInput = this.byId("miCliente");
                    if (oMultiInput) {
                        oMultiInput.removeAllTokens();
                        oMultiInput.setValue("");
                        oMultiInput.setEditable(true);
                        oMultiInput.setEnabled(true);
                    }
                }

                if ((tUniNeg === "CERAMICOS" && tRol === "VENDEDOR")) {
                    that.oModelUser.setProperty("/bCampVen", true);
                } else {
                    that.oModelUser.setProperty("/bCampVen", false);
                }


                let sComponentTable = "TableMainDesktop";
                if (!that.fragmentTable) {
                    that.fragmentTable = sap.ui.xmlfragment(
                        this.frgIdTableMain,
                        that.route + ".view.fragments." + sComponentTable,
                        that
                    );
                    this._byId("vbTableMain").addItem(that.fragmentTable);
                }

                await this._loadVendedores();

                this._applyScopeBySelectedVendors();
                this._purgeClientTokensOutOfScope();
                this._setClientFiltersEnabledBySeller();

                const oData = await this._getData();
                this.getView().getModel("ui").setProperty("/filtersReady", true);

                if (tRol === "CLIENTES" || tRol === "VENDEDOR" || tUniNeg == "QUIMICOS") {
                    this._onPressExecute();

                }
                sap.ui.core.BusyIndicator.hide(0);

            } catch (oError) {
                console.error("💥 Error en handleRouteMatched:", oError);
                that.getMessageBox("error", that.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            }
        },
        _onClearFilter: function () {
            const tbReporte = this._byId("vbTableMain").getItems().length > 0
                ? this._byId("vbTableMain").getItems()[0]
                : null;
            if (!this.isEmpty(tbReporte)) {
                tbReporte.removeSelections(true);
            }
            this._onClearComponent();
            this._onPressExecute();
        },

        _onClearDataFilter: function () {
            const oModel = that.getModel("oModelProyect");
            if (!oModel) { return; }

            // Rol desde modelo o variable global
            let sRol = oModel.getProperty("/Main/tRol") || tRol || "";
            sRol = String(sRol).toUpperCase();
            const bIsCliente = (sRol === "CLIENTE" || sRol === "CLIENTES");
            const bIsVendedor = (sRol === "VENDEDOR");
            const bIsSupervisor = (sRol === "SUPERVISOR");

            // Valores actuales (por si hay que preservarlos)
            const aCliActual = oModel.getProperty("/Main/filter/cbCliente") || [];
            const aVenActual = oModel.getProperty("/Main/filter/cbVendor") || [];

            // Nuevo objeto Main “limpio”
            const oMainNew = models.createModelProyect().Main;

            // Preservar según rol
            if (bIsCliente) {
                oMainNew.filter.cbCliente = aCliActual;
                oMainNew.filter.cbVendor = aVenActual;
            } else if (bIsVendedor) {
                oMainNew.filter.cbVendor = aVenActual;
            }
            // Supervisor no preserva nada

            oModel.setProperty("/Main", oMainNew);
        },
        _onPressNavigateDetail: function (oEvent) {
            let oSource = oEvent.getSource();
            let oParentRow = oSource.getParent();
            let jRow = oParentRow.getBindingContext("oModelProyect");
            let jData = jRow.getObject();
            that.oModelProyect.setProperty("/oCabecera", jData);

            that.oRouter.navTo("Detail", {
                app: jData.SalesDocument
            });
        },
        _onPressExecute: function () {
            let oModel = this.getView().getModel("oModelProyect");

            function extractTokens(oControl, sControlId) {
                if (!oControl) {
                    console.error(`[extractTokens] ❌ No existe control '${sControlId}'`);
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
            }

            let aWarnings = [];
            let invalidRawInputs = [];
            let bHasValidTokens = false;

            // ==== Documento ====
            let oDoc = extractTokens(this.byId("miDocumento"), "miDocumento");
            oModel.setProperty("/Main/filter/cbDocumento", oDoc.keys);
            if (oDoc.keys.length > 0) bHasValidTokens = true;
            if (oDoc.keys.length === 0 && oDoc.rawValue) {
                invalidRawInputs.push(`Documento: "${oDoc.rawValue}"`);
                this.byId("miDocumento").setValue("");
            }

            const oLocked = this._getLockedFiltersByProfile();

            // ==== Cliente ====
            let oCli = extractTokens(this.byId("miCliente"), "miCliente");
            let aCli = oCli.keys.map(v => String(v || "").trim()).filter(Boolean);

            // Si es perfil CLIENTE, el BP cliente es obligatorio aunque el filtro esté oculto.
            if (oLocked.aClienteLocked.length > 0) {
                aCli = oLocked.aClienteLocked;
            }

            oModel.setProperty("/Main/filter/cbCliente", aCli);

            if (aCli.length > 0) bHasValidTokens = true;

            if (aCli.length === 0 && oCli.rawValue) {
                invalidRawInputs.push(`Cliente: "${oCli.rawValue}"`);
                this.byId("miCliente").setValue("");
            }

            // ==== Vendedor ====
            let aVen = [];
            const oMcbVendedor = this.byId("mcbVendedor");

            if (oMcbVendedor && oMcbVendedor.getSelectedKeys) {
                aVen = oMcbVendedor.getSelectedKeys();
            }

            aVen = aVen.map(v => String(v || "").trim()).filter(Boolean);

            // Si es perfil VENDEDOR, el BP vendedor es obligatorio aunque el control esté oculto/deshabilitado.
            if (oLocked.aVendedorLocked.length > 0) {
                aVen = oLocked.aVendedorLocked;

                if (oMcbVendedor && oMcbVendedor.setSelectedKeys) {
                    oMcbVendedor.setSelectedKeys(aVen);
                }
            }

            oModel.setProperty("/Main/filter/cbVendor", aVen);

            if (aVen.length > 0) bHasValidTokens = true;

            //codigo agregado el 16/02/2026
            // 🚫 Regla: en CERAMICOS, si es VENDEDOR el filtro vendedor es obligatorio
            const sRol = (this.getModel("oModelUser").getProperty("/bRol") || tRol || "").toUpperCase();
            const sUniNeg = (this.getModel("oModelUser").getProperty("/bUniNeg") || tUniNeg || "").toUpperCase();

            const bPortalObligaVendedor = (sUniNeg === "CERAMICOS");
            const bEsVendedor = (sRol === "VENDEDOR");

            if (bEsVendedor && bPortalObligaVendedor && (!Array.isArray(aVen) || aVen.length === 0)) {
                sap.m.MessageToast.show("El filtro Vendedor no puede estar vacío.");
                // opcional: llevar foco al control
                const oMcb = this.byId("mcbVendedor");
                if (oMcb && oMcb.focus) { oMcb.focus(); }
                return;
            }


            // ==== Fechas ====
            let dStart = this.byId("dStartDate").getDateValue();
            let dEnd = this.byId("dEndDate").getDateValue();
            oModel.setProperty("/Main/filter/dStartDate", dStart);
            oModel.setProperty("/Main/filter/dEndDate", dEnd);


            if (!dStart || !dEnd) {
                sap.m.MessageToast.show("Debe seleccionar un rango de fechas (inicio y fin).");
                return;
            }

            // ==== Validaciones de tokens ====
            if (invalidRawInputs.length > 0 && !bHasValidTokens) {
                oModel.setProperty("/oReporte", []);
                sap.m.MessageToast.show("Ningún token válido encontrado. No se realizará la búsqueda.\nDescartados: " + invalidRawInputs.join("; "));
                return;
            }

            if (invalidRawInputs.length > 0) {
                sap.m.MessageToast.show("Se descartaron: " + invalidRawInputs.join("; "));
            }

            // ==== Ejecutar ====
            sap.ui.core.BusyIndicator.show();
            this._getData().then(oData => {
                if (oData.sEstado === "E") {
                    this.getMessageBox("error", this.getI18nText("errorData"));
                } else {
                    oModel.setProperty("/oReporte", oData.oResults);

                    // 📌 Inicializar dataset filtrado con lo mismo
                    oModel.setProperty("/oReporteFiltrado", oData.oResults);

                    // 📌 Mostrar el MultiComboBox de estados
                    this.byId("mcbEstadosF").setVisible(true);

                    this._applyEstadoFilterFromModel();
                }
                sap.ui.core.BusyIndicator.hide();
            }).catch(() => {
                this.getMessageBox("error", this.getI18nText("errorData"));
                sap.ui.core.BusyIndicator.hide(0);
            });
        },

        onLanguageEsp: function () {
            this._setLanguageModel("esp");
        },

        onLanguageEng: function () {
            this._setLanguageModel("ing");
        },

        onDocumentoLiveChange: function (oEvent) {
            const sValue = (oEvent.getSource().getValue() || "").trim();
            this._GetFiltroDocumento(sValue, "/oFiltroDocumento");
            oEvent.getSource().suggest(true);
        },

        onChangeDocumento: function (oEvent) {
            const oMI = oEvent.getSource();
            const sRaw = oEvent.getParameter("value") || "";
            const sValue = this._cleanDocumentoValue(sRaw);

            if (sRaw !== sValue) {
                oMI.updateDomValue(sValue);
            }

            if (!sValue || sValue.length < 2) {
                this.getView().getModel("oModelData").setProperty("/oFiltroDocumento", []);
                return;
            }

            this._GetFiltroDocumento(sValue, "/oFiltroDocumento");
        },

        _GetFiltroDocumento: function (sValue, sTargetPath) {
            sValue = this._cleanDocumentoValue(sValue);

            const oModelData = this.getView().getModel("oModelData");

            if (!sValue || sValue.length < 2) {
                oModelData.setProperty(sTargetPath, []);
                return;
            }

            const sSalesOrg = String(this.sSalesOrg || "").trim().replace(/'/g, "''");
            const sDoc = String(sValue).trim().replace(/'/g, "''");

            const bExact = sDoc.length >= 10;
            const sDocFilter = bExact
                ? `SalesDocument eq '${sDoc}'`
                : `startswith(SalesDocument,'${sDoc}')`;

            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and ${sDocFilter}`;
            const sQuery = `${sFilter}&$top=8000&$format=json&sap-language=ES`;

            let sUrl = "";
            if (this.local) {
                const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?${sQuery}`;
                sUrl = this.getOwnerComponent().getManifestObject().resolveUri(sPath);
            } else {
                sUrl = jQuery.sap.getModulePath(this.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?${sQuery}`;
            }

            Services.getoDataERPSync(this, sUrl, function (result) {
                util.response.validateAjaxGetERPNotMessage(result, {
                    success: function (oData) {
                        const aDocs = Array.isArray(oData.data) ? oData.data : [];
                        const oSeen = new Set();

                        const aSuggest = aDocs.reduce(function (aRes, oItem) {
                            const sDocumento = String(oItem.SalesDocument || "").trim();

                            if (sDocumento && !oSeen.has(sDocumento)) {
                                oSeen.add(sDocumento);
                                aRes.push({
                                    SalesDocument: sDocumento,
                                    Display: sDocumento
                                });
                            }

                            return aRes;
                        }, []);

                        oModelData.setProperty(sTargetPath, aSuggest);
                    }.bind(this),
                    error: function (e) {
                        console.error("Error OData documento:", e);
                        oModelData.setProperty(sTargetPath, []);
                    }.bind(this)
                });
            }.bind(this));
        },

        onChangeCliente: function (oEvent) {
            const oSource = oEvent.getSource();
            const sValue = (
                oEvent.getParameter("suggestValue") ||
                oEvent.getParameter("newValue") ||
                oEvent.getParameter("value") ||
                oSource.getValue() ||
                ""
            ).trim();

            this._GetFiltroCliente(sValue, "/oFiltroCliente");

            if (oSource && typeof oSource.suggest === "function") {
                oSource.suggest(true);
            }
        },
        _GetFiltroCliente: function (sValue, sTargetPath) {
            const oModelData = this.getView().getModel("oModelData");
            const aBase = oModelData.getProperty("/oClienteScope") || oModelData.getProperty("/oClienteAll") || [];
            const aClientes = this._mapClientesForFilter(aBase);

            if (!sValue || sValue.length < 2) {
                oModelData.setProperty(sTargetPath, aClientes);
                return;
            }

            const up = sValue.toUpperCase();

            const aFiltered = aClientes.filter(c =>
                (c.Display || "").toUpperCase().includes(up) ||
                (c.Customer || "").toUpperCase().includes(up) ||
                (c.CustomerFullName || "").toUpperCase().includes(up)
            );

            oModelData.setProperty(sTargetPath, aFiltered);
        },
        _loadVendedores: function () {
            var that = this;
            let sUrl = "";
            const sSalesOrg = that.sSalesOrg;

            let sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;

            if (that.local) {
                const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Vendor?$top=8000&${sFilter}&$format=json&sap-language=ES`;
                sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
            } else {
                const sPath = jQuery.sap.getModulePath(that.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Vendor?$top=8000&${sFilter}&$format=json&sap-language=ES`;
                sUrl = sPath;
            }

            Services.getoDataERPSync(that, sUrl, function (result) {
                util.response.validateAjaxGetERPNotMessage(result, {
                    success: function (oData) {
                        let aRaw = [];
                        if (oData && oData.d && Array.isArray(oData.d.results)) {
                            aRaw = oData.d.results;
                        } else if (oData.data && Array.isArray(oData.data)) {
                            aRaw = oData.data;
                        }

                        const aVendors = aRaw.map(item => {
                            const code = (item.vendor || "").toString().trim();          // <-- BP/código
                            const name = (item.VendorName || "").toString().trim();
                            return {
                                VendorCode: code,
                                VendorName: name,
                                Display: `${code} - ${name}`
                            };
                        });

                        // Quitar vacíos y duplicados por VendorCode (BP)
                        const seen = new Set();
                        const aUnique = aVendors.filter(v => {
                            if (!v.VendorCode) return false;
                            if (seen.has(v.VendorCode)) return false;
                            seen.add(v.VendorCode);
                            return true;
                        });

                        that.getView().getModel("oModelData").setProperty("/oVendedores", aUnique);
                    },
                    error: function () {
                        that.getView().getModel("oModelData").setProperty("/oVendedores", []);
                    }
                });
            });
        },

        onVendorSelectionChange: function (oEvent) {
            let aSelected = oEvent.getSource().getSelectedKeys() || [];
            aSelected = aSelected.map(v => (v || "").toString().trim()).filter(Boolean);

            console.log("DEBUG onVendorSelectionChange aSelected:", aSelected);

            this.getView().getModel("oModelProyect").setProperty("/Main/filter/cbVendor", aSelected);

            this._applyScopeBySelectedVendors();
            this._purgeClientTokensOutOfScope();
            this._setClientFiltersEnabledBySeller();
        },
        ChangeMultiImput: function (oEvent) {
            const p = oEvent.getParameters();
            const src = oEvent.getSource();
            const sFieldName = src.data("fieldName");
            const sBindingPath = src.data("bindingPath");

            console.log("🔹 ChangeMultiImput ejecutado");
            console.log("   → custom:", sFieldName, sBindingPath);
            console.log("   → type:", p.type);
            console.log("   → Tokens detectados:", p.addedTokens || []);

            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelData = oView.getModel("oModelData");

            const syncTokensToModel = () => {
                const aKeys = (src.getTokens() || [])
                    .map(t => (t.getKey() || t.getText() || "").trim())
                    .filter(Boolean);

                if (sBindingPath) {
                    oModelProyect.setProperty(sBindingPath, aKeys);
                }
            };

            if (p.type === "removed" || p.type === "removedAll") {
                syncTokensToModel();

                if (sFieldName === "Documento") {
                    oModelData.setProperty("/oFiltroDocumento", []);
                    src.updateDomValue("");
                }

                if (sFieldName === "RUC") {
                    oModelData.setProperty("/oFiltroCliente", []);
                    src.updateDomValue("");
                }

                return;
            }

            if (sFieldName === "Documento" && p.type === "added" && (p.addedTokens || []).length) {
                const aAdded = p.addedTokens.map(t => t.getKey() || t.getText());

                this._validateDocumentsAgainstCDS(aAdded).then((oResult) => {
                    const { validSet } = oResult;

                    (p.addedTokens || []).forEach(tok => {
                        const k = tok.getKey() || tok.getText();
                        if (!validSet.has(k)) {
                            src.removeToken(tok);
                            sap.m.MessageToast.show(`Documento inválido: ${k}`);
                        }
                    });

                    syncTokensToModel();
                }).catch(() => {
                    (p.addedTokens || []).forEach(tok => src.removeToken(tok));
                    sap.m.MessageToast.show("No se pudo validar el documento. Inténtalo nuevamente.");
                    syncTokensToModel();
                });

                return;
            }

            if (sFieldName === "RUC" && p.type === "added" && (p.addedTokens || []).length) {
                const aAdded = p.addedTokens.map(t => t.getKey() || t.getText());

                this._validateClientsAgainstCDS(aAdded).then((oResult) => {
                    const { validSet } = oResult;

                    (p.addedTokens || []).forEach(tok => {
                        const k = tok.getKey() || tok.getText();
                        if (!validSet.has(k)) {
                            src.removeToken(tok);
                            sap.m.MessageToast.show(`Cliente inválido: ${k}`);
                        }
                    });

                    syncTokensToModel();
                }).catch(() => {
                    (p.addedTokens || []).forEach(tok => src.removeToken(tok));
                    sap.m.MessageToast.show("No se pudo validar el cliente. Inténtalo nuevamente.");
                    syncTokensToModel();
                });

                return;
            }

            syncTokensToModel();
        },
        _validateDocumentsAgainstCDS: function (aDocs) {
            if (!aDocs || aDocs.length === 0) {
                return Promise.resolve({ validSet: new Set() });
            }

            const uniq = Array.from(new Set(aDocs.filter(Boolean)));
            const sSalesOrg = this.sSalesOrg || "1110";
            const orDocs = uniq.map(d => `SalesDocument eq '${d}'`).join(" or ");
            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and (${orDocs})`;

            let sUrl = "";
            if (this.local) {
                const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?$top=8000&${sFilter}&$select=SalesDocument&$format=json&sap-language=ES`;
                sUrl = this.getOwnerComponent().getManifestObject().resolveUri(sPath);
            } else {
                const sPath = jQuery.sap.getModulePath(this.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?$top=8000&${sFilter}&$select=SalesDocument&$format=json&sap-language=ES`;
                sUrl = sPath;
            }

            return new Promise((resolve) => {
                Services.getoDataERPSync(this, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = (oData && Array.isArray(oData.data)) ? oData.data : [];
                            const validSet = new Set(arr.map(x => x.SalesDocument));
                            resolve({ validSet });
                        }.bind(this),
                        error: function () {
                            resolve({ validSet: new Set() });
                        }.bind(this)
                    });
                }.bind(this));
            });
        },
        _validateClientsAgainstCDS: function (aClients) {
            if (!aClients || aClients.length === 0) {
                return Promise.resolve({ validSet: new Set() });
            }

            const uniq = Array.from(new Set(aClients.filter(Boolean)));
            const sSalesOrg = this.sSalesOrg || "1110";
            const orCli = uniq.map(c => `Customer eq '${c}'`).join(" or ");
            const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and (${orCli})`;

            let sUrl = "";
            if (this.local) {
                const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$top=8000&${sFilter}&$select=Customer&$format=json&sap-language=ES`;
                sUrl = this.getOwnerComponent().getManifestObject().resolveUri(sPath);
            } else {
                const sPath = jQuery.sap.getModulePath(this.route) +
                    `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$top=8000&${sFilter}&$select=Customer&$format=json&sap-language=ES`;
                sUrl = sPath;
            }

            return new Promise((resolve) => {
                Services.getoDataERPSync(this, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const arr = (oData && Array.isArray(oData.data)) ? oData.data : [];
                            const validSet = new Set(
                                arr.map(x => (x.Customer || "").toString().trim()).filter(Boolean)
                            );
                            resolve({ validSet });
                        }.bind(this),
                        error: function () {
                            resolve({ validSet: new Set() });
                        }.bind(this)
                    });
                }.bind(this));
            });
        },
        onEstadoSelectionChange: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const aSelected = oEvent.getSource().getSelectedKeys() || [];

            // ✅ Persistir selección del filtro Estado
            oModel.setProperty("/Main/filter/cbEstadoGeneral", aSelected);

            // ✅ Aplicar filtro con lo guardado
            this._applyEstadoFilterFromModel();
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
        _getEstadoGeneral: function () {
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
        _getUnifiedTaxNumber: function (oItem) {
            // Lista de posibles campos
            const aCandidates = [
                oItem.TaxNumber1,
                oItem.TaxNumber2,
                oItem.TaxNumber3,
                oItem.TaxNumber4,
                oItem.TaxNumber5,
                oItem.TaxNumber6
            ];

            for (let i = 0; i < aCandidates.length; i++) {
                const v = aCandidates[i];
                if (v !== undefined && v !== null) {
                    const s = String(v).trim();
                    if (s) {
                        return s; // devuelve el primero que tenga data
                    }
                }
            }

            return ""; // si ninguno vino lleno
        },

        _normSeguimiento: function (v) {
            return String(v || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
                .toUpperCase();
        },

        _isPedidoNacionalSeguimiento: function (oPedido) {
            oPedido = oPedido || {};

            const sTipoDoc = this._normSeguimiento(
                oPedido.SalesDocumentType ||
                oPedido.DocType ||
                oPedido.DocumentType ||
                oPedido.SalesDocumentTypeCode ||
                ""
            );

            const sDescTipoDoc = this._normSeguimiento(
                oPedido.DscSalesDocumentType ||
                oPedido.SalesDocumentTypeName ||
                oPedido.DescripcionTipoDocumento ||
                ""
            );

            // ZPEF / EXPO nunca debe habilitar modificación.
            if (
                sTipoDoc === "ZPEF" ||
                sDescTipoDoc.indexOf("ZPEF") >= 0 ||
                sDescTipoDoc.indexOf("EXPO") >= 0 ||
                sDescTipoDoc.indexOf("EXPORT") >= 0
            ) {
                return false;
            }

            // Si viene código técnico, validamos contra ZPES.
            if (sTipoDoc) {
                return sTipoDoc === "ZPES";
            }

            // Si no viene código, validamos por descripción.
            return sDescTipoDoc.indexOf("PEDIDO NACIONAL") >= 0;
        },

        _isEstadoPendienteAprobacionSeguimiento: function (oPedido) {
            oPedido = oPedido || {};

            const sEstado = this._normSeguimiento(
                oPedido.EstadoGeneral ||
                oPedido.Estado ||
                oPedido.Status ||
                oPedido.SalesDocumentStatus ||
                ""
            ).replace(/\s+/g, " ");

            return (
                sEstado === "PEND. APROBACION" ||
                sEstado === "PEND APROBACION" ||
                sEstado === "PENDIENTE APROBACION" ||
                sEstado === "PENDIENTE DE APROBACION" ||
                (
                    sEstado.indexOf("PEND") >= 0 &&
                    sEstado.indexOf("APROB") >= 0
                )
            );
        },

        _canShowModificarPedido: function (oPedido) {
            oPedido = oPedido || {};

            const oUser = this.getModel("oModelUser");

            const sRol = this._normSeguimiento(
                oUser && oUser.getProperty("/bRol") || tRol || ""
            );

            const sUniNeg = this._normSeguimiento(
                oUser && oUser.getProperty("/bUniNeg") || tUniNeg || ""
            );

            const sSalesOrg = String(
                oPedido.SalesOrganization ||
                oPedido.OrgVentas ||
                oPedido.SalesOrg ||
                ""
            ).trim();

            const bRolPermitido =
                sRol === "VENDEDOR" ||
                sRol === "SUPERVISOR";

            const bUnidadPermitida =
                sUniNeg === "TEXTILES" ||
                sUniNeg === "CERAMICOS" ||
                sSalesOrg === "1110" ||
                sSalesOrg === "1130";

            const bPedidoNacional = this._isPedidoNacionalSeguimiento(oPedido);

            const bEstadoPendienteAprobacion =
                this._isEstadoPendienteAprobacionSeguimiento(oPedido);

            return (
                bRolPermitido &&
                bUnidadPermitida &&
                bPedidoNacional &&
                bEstadoPendienteAprobacion
            );
        },

        _getData: function () {
            var that = this;
            try {
                var oResp = { sEstado: "E", oResults: [] };

                return new Promise(function (resolve) {
                    let sUrl = "";
                    let sSalesOrg = that.sSalesOrg || "1110";
                    let sFilter = "$filter=SalesOrganization eq '" + sSalesOrg + "'";

                    if (that.local) {
                        const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking" +
                            "?$top=8000&" +
                            sFilter +
                            "&$orderby=SalesDocumentDate desc,SalesDocument desc" +
                            "&$format=json&sap-language=ES";
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking" +
                            "?$top=8000&" +
                            sFilter +
                            "&$orderby=SalesDocumentDate desc,SalesDocument desc" +
                            "&$format=json&sap-language=ES";
                        sUrl = sPath;
                    }

                    console.log("➡️ Ejecutando _getData con URL:", sUrl);

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                oResp.sEstado = "S";
                                if (!oData.data || !Array.isArray(oData.data)) {
                                    console.warn("⚠️ oData.data no es array");
                                    oResp.oResults = [];
                                    resolve(oResp);
                                    return;
                                }

                                let aResults = oData.data.map(item => {
                                    let dDoc = that.parseODataDate(item.SalesDocumentDate);
                                    let dReq = that.parseODataDate(item.RequestedDeliveryDate);

                                    // Nuevo: obtener RUC unificado
                                    let sTaxNumber = that._getUnifiedTaxNumber(item);

                                    const oPedidoRow = {
                                        SalesDocument: item.SalesDocument,
                                        Customer: item.Customer || "",
                                        CustomerFullName: item.CustomerFullName || "",
                                        VendorID: (item.VendorID || "").toString().trim(),
                                        Vendor: (item.Vendor || "").toString().trim(),
                                        SalesOrganization: item.SalesOrganization,

                                        SalesDocumentType:
                                            item.SalesDocumentType ||
                                            item.DocType ||
                                            item.DocumentType ||
                                            item.SalesDocumentTypeCode ||
                                            "",

                                        DocType:
                                            item.DocType ||
                                            item.SalesDocumentType ||
                                            item.DocumentType ||
                                            item.SalesDocumentTypeCode ||
                                            "",

                                        TotalNetAmount: (item.DscSalesDocumentType === "T/Gratuita")
                                            ? 0
                                            : (parseFloat(item.TotalNetAmount) || 0),

                                        TransactionCurrency: item.TransactionCurrency,
                                        SalesDocumentDate: that.formatDate(dDoc),
                                        SalesDocumentDateMs: that.toUTCDateMs(dDoc),
                                        RequestedDeliveryDate: that.formatDate(dReq),
                                        RequestedDeliveryDateMs: that.toUTCDateMs(dReq),
                                        DscSalesDocumentType: item.DscSalesDocumentType,
                                        TaxNumber: sTaxNumber
                                    };

                                    oPedidoRow.MostrarBotonModificar = that._canShowModificarPedido(oPedidoRow);

                                    return oPedidoRow;
                                });

                                console.log("✅ aResults mapeados:", aResults.length);

                                // === Recuperar filtros ===
                                const jFilter = that.getModel("oModelProyect").getProperty("/Main/filter");
                                console.log("📌 Filtros recibidos:", jFilter);

                                // Sets de referencia
                                const setOf = (arr, prop) => new Set(arr.map(x => x[prop]).filter(Boolean));
                                const sets = {
                                    documento: setOf(aResults, "SalesDocument"),
                                    cliente: setOf(aResults, "Customer"),
                                    vendor: setOf(aResults, "VendorID")
                                };

                                // Validar tokens
                                const splitValidInvalid = (vals = [], set) => {
                                    const valid = [], invalid = [];
                                    (vals || []).forEach(v => {
                                        (set.has(v) ? valid : invalid).push(v);
                                    });
                                    return { valid, invalid };
                                };

                                const vDocs = splitValidInvalid(jFilter.cbDocumento, sets.documento);
                                const vCli = splitValidInvalid(jFilter.cbCliente, sets.cliente);
                                const vVen = splitValidInvalid(jFilter.cbVendor, sets.vendor);

                                console.log("📊 Tokens documentos:", vDocs);
                                console.log("📊 Tokens clientes:", vCli);
                                console.log("📊 Tokens vendedores:", vVen);

                                // Sets válidos
                                const k = {
                                    doc: new Set(vDocs.valid),
                                    cli: new Set(vCli.valid),
                                    ven: new Set(vVen.valid)
                                };

                                const from = jFilter.dStartDate ? that.toUTCDateMs(jFilter.dStartDate) : null;
                                const to = jFilter.dEndDate ? that.toUTCDateMs(jFilter.dEndDate, true) : null;


                                console.log("📅 Fechas filtro (UTC):", from, "→", to);

                                // 🚨 Fechas obligatorias
                                if (from === null || to === null) {
                                    sap.m.MessageToast.show("Debe seleccionar un rango de fechas (inicio y fin).");
                                    resolve({ sEstado: "S", oResults: [] });
                                    return;
                                }

                                // === 1) Filtrar siempre por fechas ===
                                let filteredByDate = aResults.filter(it =>
                                    it.SalesDocumentDateMs &&
                                    it.SalesDocumentDateMs >= from &&
                                    it.SalesDocumentDateMs <= to
                                );

                                // === 2) Aplicar filtros restrictivos ===
                                let filtered = filteredByDate.filter(it => {
                                    if (k.doc.size > 0 && !k.doc.has(it.SalesDocument)) return false;
                                    if (k.cli.size > 0 && !k.cli.has(it.Customer)) return false;
                                    if (k.ven.size > 0 && !k.ven.has(it.VendorID)) return false;
                                    return true;
                                });

                                // === 3) Eliminar tokens inválidos en UI según resultados ===
                                const foundDocs = new Set(filtered.map(it => it.SalesDocument));
                                const foundCli = new Set(filtered.map(it => it.Customer));
                                const foundVen = new Set(filtered.map(it => it.VendorID));

                                if (k.doc.size > 0 && that.byId("miDocumento")) {
                                    const invalidDocs = [...k.doc].filter(d => !foundDocs.has(d));
                                    if (invalidDocs.length) {
                                        invalidDocs.forEach(invalid => {
                                            const oCtrl = that.byId("miDocumento");
                                            oCtrl.removeToken(oCtrl.getTokens().find(t => t.getKey() === invalid || t.getText() === invalid));
                                        });
                                    }
                                }
                                if (k.cli.size > 0 && that.byId("miCliente")) {
                                    const invalidCli = [...k.cli].filter(c => !foundCli.has(c));
                                    if (invalidCli.length) {
                                        invalidCli.forEach(invalid => {
                                            const oCtrl = that.byId("miCliente");
                                            oCtrl.removeToken(oCtrl.getTokens().find(t => t.getKey() === invalid || t.getText() === invalid));
                                        });
                                    }
                                }
                                if (k.ven.size > 0 && that.byId("mcbVendedor")) {
                                    const invalidVen = [...k.ven].filter(v => !foundVen.has(v));
                                    if (invalidVen.length) {
                                        that.byId("mcbVendedor").setSelectedKeys(
                                            that.byId("mcbVendedor").getSelectedKeys().filter(k => !invalidVen.includes(k))
                                        );
                                    }
                                }

                                console.log("✅ Resultado filtrado (final):", filtered.length);
                                if (filtered.length > 0) console.table(filtered.slice(0, 10));

                                // === Enriquecer con EstadoGeneral ===
                                that._getEstadoGeneral().then(oEstado => {
                                    if (oEstado.sEstado === "S") {
                                        const estadosMap = {};
                                        oEstado.oResults.forEach(e => {
                                            estadosMap[e.SalesDocument] = e.EstadoGeneral;
                                        });

                                        let enriched = filtered.map(it => {
                                            let sEstado = estadosMap[it.SalesDocument] || "";

                                            const sTipoDoc = String(it.DscSalesDocumentType || "").toUpperCase();
                                            const sEstadoUpper = String(sEstado || "").toUpperCase();

                                            const bTransferenciaGratuita =
                                                sTipoDoc === "T/GRATUITA" ||
                                                sTipoDoc.includes("GRATUITA");

                                            // 🔥 REGLA NUEVA
                                            if (bTransferenciaGratuita && sEstadoUpper === "FACTURADO") {
                                                sEstado = "Finalizado";
                                            }

                                            const oPedidoEvaluado = {
                                                ...it,
                                                EstadoGeneral: sEstado
                                            };

                                            oPedidoEvaluado.MostrarBotonModificar =
                                                that._canShowModificarPedido(oPedidoEvaluado);

                                            return oPedidoEvaluado;
                                        });

                                        oResp.oResults = enriched;
                                        resolve(oResp);
                                    } else {
                                        oResp.oResults = filtered;
                                        resolve(oResp);
                                    }
                                });
                            },
                            error: function (err) {
                                console.error("❌ Error backend:", err);
                                oResp.oResults = [];
                                resolve(oResp);
                            }
                        });
                    });
                });
            } catch (e) {
                console.error("💥 EXCEPTION en _getData:", e);
                that.getMessageBox("error", that.getI18nText("sErrorTry"));
            }
        },
        // ❶ Abrir el diálogo SIEMPRE cargando TODO (independiente del texto afuera)
        onOpenClienteDialog: function () {
            const oView = this.getView();
            const oDataModel = oView.getModel("oModelData");

            // Mostrar busy (opcional)
            sap.ui.core.BusyIndicator.show(0);

            // Carga total SIN depender del sValue externo
            this._loadAllClientes()
                .then(() => {
                    if (!this._oClienteDialog) {
                        this._oClienteDialog = sap.ui.xmlfragment(
                            "aris.com.clientes.seguimiento.pe.view.dialogs.ValueHelpClient",
                            this
                        );
                        oView.addDependent(this._oClienteDialog);
                    }

                    // Limpiar selección y filtros anteriores SIEMPRE
                    this._oClienteDialog.clearSelection();
                    const oBinding = this._oClienteDialog.getBinding("items");
                    if (oBinding) oBinding.filter([]);

                    this._oClienteDialog.open();
                })
                .finally(() => sap.ui.core.BusyIndicator.hide());
        },

        // ❷ Carga total desde backend (promesa). NO usa lo escrito afuera.
        _loadAllClientes: function () {
            const oProj = this.getModel("oModelProyect");
            const aScope = oProj.getProperty("/oClienteFilter") || [];

            oProj.setProperty("/oCliente", aScope);
            return Promise.resolve();
        },

        // ❸ Filtrar en vivo dentro del Diálogo (independiente del texto externo)
        onClienteLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oBinding = oEvent.getSource().getBinding("items");
            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const aFilters = [
                new sap.ui.model.Filter("CustomerFullName", sap.ui.model.FilterOperator.Contains, sValue),
                new sap.ui.model.Filter("Customer", sap.ui.model.FilterOperator.Contains, sValue)
            ];
            oBinding.filter([new sap.ui.model.Filter({ filters: aFilters, and: false })]);
        },

        // (opcional) si el usuario pulsa enter o la lupa del SearchField interno
        onClienteSearch: function (oEvent) {
            this.onClienteLiveChange(oEvent);
        },

        // ❹ Confirmar selección: AGREGAR (no reemplazar) tokens afuera (sin duplicar)
        onDialogClienteConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miCliente");

            // Claves ya existentes para evitar duplicados
            const aExisting = (oMultiInput.getTokens() || []).map(t => t.getKey());

            aSelectedItems.forEach(oItem => {
                const key = oItem.getTitle();        // Customer
                const desc = oItem.getDescription();  // CustomerFullName
                if (key && !aExisting.includes(key)) {
                    oMultiInput.addToken(new sap.m.Token({
                        key,
                        text: `${key} - ${desc}`
                    }));
                }
            });

            // Limpia filtro del diálogo para la próxima vez
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },

        onDialogClienteCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },
        // ❶ Abrir el diálogo (siempre recarga todos los documentos)
        onOpenDocumentoDialog: function () {
            const oView = this.getView();
            sap.ui.core.BusyIndicator.show(0);

            this._loadAllDocumentos()
                .then(() => {
                    if (!this._oDocumentoDialog) {
                        this._oDocumentoDialog = sap.ui.xmlfragment(
                            "aris.com.clientes.seguimiento.pe.view.dialogs.ValueHelpDocumento",
                            this
                        );
                        oView.addDependent(this._oDocumentoDialog);
                    }

                    // Limpia selección y filtros anteriores
                    this._oDocumentoDialog.clearSelection();
                    const oBinding = this._oDocumentoDialog.getBinding("items");
                    if (oBinding) oBinding.filter([]);

                    this._oDocumentoDialog.open();
                })
                .finally(() => sap.ui.core.BusyIndicator.hide());
        },

        // ❷ Cargar todos los documentos (sin depender del texto externo)
        _loadAllDocumentos: function () {
            const that = this;
            return new Promise((resolve, reject) => {
                const sSalesOrg = that.sSalesOrg || "1110";
                const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;
                let sUrl = "";

                if (that.local) {
                    const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?${sFilter}&$top=8000&$format=json&sap-language=ES`;
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    const sPath = jQuery.sap.getModulePath(that.route) +
                        `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderTracking?${sFilter}&$top=8000&$format=json&sap-language=ES`;
                    sUrl = sPath;
                }

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const aRaw = Array.isArray(oData.data) ? oData.data : [];
                            const aDocs = aRaw.map(d => ({
                                SalesDocument: d.SalesDocument,
                                Display: d.SalesDocument
                            }));

                            that.getView().getModel("oModelData").setProperty("/oFiltroDocumento", aDocs);
                            resolve();
                        },
                        error: function () {
                            that.getView().getModel("oModelData").setProperty("/oFiltroDocumento", []);
                            resolve();
                        }
                    });
                });
            });
        },

        // ❸ Búsqueda en vivo dentro del diálogo
        onDocumentoLiveChange: function (oEvent) {
            const sValue = (oEvent.getParameter("value") || "").trim();
            const oBinding = oEvent.getSource().getBinding("items");
            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const aFilters = [
                new sap.ui.model.Filter("SalesDocument", sap.ui.model.FilterOperator.Contains, sValue)
            ];
            oBinding.filter(aFilters);
        },

        onDocumentoSearch: function (oEvent) {
            this.onDocumentoLiveChange(oEvent);
        },

        // ❹ Confirmar selección: agregar al MultiInput sin duplicar
        onDialogDocumentoConfirm: function (oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oMultiInput = this.byId("miDocumento");
            const aExisting = (oMultiInput.getTokens() || []).map(t => t.getKey());

            aSelectedItems.forEach(oItem => {
                const key = oItem.getTitle();
                const desc = oItem.getDescription();
                if (key && !aExisting.includes(key)) {
                    oMultiInput.addToken(new sap.m.Token({
                        key,
                        text: desc || key
                    }));
                }
            });

            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },

        onDialogDocumentoCancel: function (oEvent) {
            const oBinding = oEvent.getSource().getBinding("items");
            if (oBinding) oBinding.filter([]);
        },
        _getSalesOrgByBP: function (sBP) {
            const that = this;

            return new Promise((resolve) => {
                if (!sBP) {
                    console.warn("⚠️ No se recibió BP válido para _getSalesOrgByBP");
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

                console.log("📡 Consultando unidades organizacionales para BP:", sBP, "→", sUrl);

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            const aSalesOrgs = [];
                            const aResults = oData?.data || oData?.d?.results || [];

                            if (!Array.isArray(aResults) || aResults.length === 0) {
                                console.warn("⚠️ iBpSalesOrganizationSet no devolvió resultados para BP:", sBP);
                                resolve([]);
                                return;
                            }

                            aResults.forEach(function (oItem) {
                                // Caso directo, por si el servicio devuelve SALES_ORG en la cabecera
                                const sDirectSalesOrg =
                                    oItem.SALES_ORG ||
                                    oItem.SalesOrganization ||
                                    oItem.Salesorganization ||
                                    "";

                                if (sDirectSalesOrg) {
                                    aSalesOrgs.push(String(sDirectSalesOrg).trim());
                                }

                                // Caso real de QAS: viene dentro de toBpSalesOrganization.results
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

                            console.log("🏢 Unidades organizacionales encontradas para BP:", sBP, aUniqueSalesOrgs);

                            resolve(aUniqueSalesOrgs);
                        },
                        error: function (err) {
                            console.error("💥 Error consultando unidades organizacionales para BP:", sBP, err);
                            resolve([]);
                        }
                    });
                });
            });
        },

        _validateAccessToPortal: function (aSalesOrgs, sCurrentSalesOrg) {
            // 🔹 Mapeo de nombres legibles según las unidades organizacionales
            const mPortalNames = {
                "1110": "Textiles",
                "1120": "Químicos",
                "1130": "Cerámicos"
            };

            if (!Array.isArray(aSalesOrgs) || aSalesOrgs.length === 0) {
                console.warn("⚠️ El usuario no tiene unidades organizacionales asignadas en IAS/CDS.");
                sap.m.MessageBox.error(
                    "No tiene unidades organizacionales asignadas. Comuníquese con el área de soporte para habilitar su acceso."
                );
                return false;
            }

            if (!sCurrentSalesOrg) {
                console.warn("⚠️ No se especificó SalesOrg actual del portal.");
                sap.m.MessageBox.error("No se pudo determinar la unidad organizacional actual del portal.");
                return false;
            }

            console.log("🔍 Validando acceso → BP SalesOrgs:", aSalesOrgs, "| Portal actual:", sCurrentSalesOrg);
            const bHasAccess = aSalesOrgs.includes(sCurrentSalesOrg);

            if (!bHasAccess) {
                const sPortalName = mPortalNames[sCurrentSalesOrg] || `Unidad ${sCurrentSalesOrg}`;
                console.warn(`🚫 Acceso denegado: el usuario no pertenece a la unidad ${sPortalName} (${sCurrentSalesOrg})`);

                sap.m.MessageBox.error(
                    `No tiene permisos para acceder al portal de ${sPortalName}. Será redirigido a la página principal.`,
                    {
                        onClose: () => {
                            // 🔄 Redirigir fuera del portal
                            window.location.href = "/";
                            // 🔹 O en Launchpad (opcional):
                            // sap.ushell.Container.getService("CrossApplicationNavigation")
                            //     .toExternal({ target: { shellHash: "#Shell-home" } });
                        }
                    }
                );
                return false;
            }

            console.log("✅ Acceso permitido al portal:", mPortalNames[sCurrentSalesOrg] || sCurrentSalesOrg);
            return true;
        },
        _getPerfilByUsuario: function (sUsuario, sSalesOrg) {
            const that = this;

            return new Promise((resolve) => {
                if (!sUsuario || !sSalesOrg) {
                    console.warn("⚠️ _getPerfilByUsuario llamado sin parámetros válidos:", sUsuario, sSalesOrg);
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
                            console.error("❌ Error en _getPerfilByUsuario:", err);
                            resolve({ perfil: "", autorizado: false });
                        }
                    });
                });
            });
        },
        _getCodigoPDF: function (sSalesDocument, sClassCondition) {
            const that = this;

            try {
                var oResp = {
                    sEstado: "E",
                    oResults: null
                };

                return new Promise(function (resolve) {
                    let sUrl = "";

                    // 👉 Usamos el entityset CotNacSet como tú mostraste:
                    // /S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/CotNacSet(SalesDocument='4090000066',ClassCondition='Z001')?$format=json
                    if (that.local) {
                        const sPath =
                            `/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/CotNacSet(` +
                            `SalesDocument='${sSalesDocument}',ClassCondition='${sClassCondition}')` +
                            `?$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath =
                            jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/CotNacSet(` +
                            `SalesDocument='${sSalesDocument}',ClassCondition='${sClassCondition}')` +
                            `?$format=json&sap-language=ES`;
                        sUrl = sPath;
                    }

                    console.log("📡 Llamando a CotNacSet para PDF:", sUrl);

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                oResp.sEstado = "S";

                                // util.response normalmente te deja todo en oData.data
                                // para un entity único debería ser un objeto con campo Pdf
                                const data = oData && oData.data ? oData.data : (oData.d || null);

                                oResp.oResults = data;
                                resolve(oResp);
                            },
                            error: function () {
                                oResp.oResults = null;
                                resolve(oResp);
                            }
                        });
                    });
                });
            } catch (oError) {
                that.getMessageBox("error", that.getI18nText("sErrorTry"));
            }
        },

        // 📌 Llama al servicio OData y descarga el PDF
        // 📌 Llama al servicio OData (vía Services) y descarga el PDF
        // 📌 Llama al servicio OData ZSDWS_PORTAL_CLIENTES_SRV y descarga el PDF
        _downloadCotizacionPdf: function (sSalesDocument, sClassCondition, sFileName) {
            const that = this;

            // 1. Construir la URL base del servicio OData (igual patrón que el resto del proyecto)
            let sServiceUrl = "";
            if (this.local) {
                const sPath = "/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
                sServiceUrl = this.getOwnerComponent().getManifestObject().resolveUri(sPath);
            } else {
                const sPath = jQuery.sap.getModulePath(this.route) +
                    "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
                sServiceUrl = sPath;
            }

            console.log("📡 Service URL ZSDWS_PORTAL_CLIENTES_SRV:", sServiceUrl);

            // 2. Crear un ODataModel puntual SOLO para este servicio
            const oODataModel = new ODataModel(sServiceUrl, {
                useBatch: false
            });

            // 3. Entity con las llaves
            const sPathEntity = "/CotNacSet(SalesDocument='" + sSalesDocument +
                "',ClassCondition='" + sClassCondition + "')";

            sap.ui.core.BusyIndicator.show(0);

            oODataModel.read(sPathEntity, {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();

                    console.log("✅ Respuesta CotNacSet:", oData);

                    // En V2, oData ya es el entity: { ..., Pdf: "ABCDEF..." }
                    if (!oData || !oData.Pdf) {
                        sap.m.MessageToast.show("No se recibió ningún PDF desde el servicio (campo 'Pdf' vacío).");
                        return;
                    }

                    // 4.  Blob PDF
                    const oBlob = that._pdfDataToPdfBlob(oData.Pdf);

                    // 5. Nombre del archivo
                    const sDefaultName = "Cotizacion_" + sSalesDocument + "_" + sClassCondition + ".pdf";
                    const sFinalName = sFileName || sDefaultName;

                    that._downloadBlob(oBlob, sFinalName);
                },
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Error al obtener el PDF de la cotización.");
                    console.error("💥 Error en _downloadCotizacionPdf (ODataModel):", oError);
                }
            });
        },


        onPressDescargarPdfCotizacion: function (oEvent) {
            let oSource = oEvent.getSource();
            let oParentRow = oSource.getParent();
            let jRow = oParentRow.getBindingContext("oModelProyect");
            let jData = jRow.getObject();
            // Ejemplo: podrías obtener estos datos de la tabla/selección
            var sSalesDocument = jData.SalesDocument;
            let sClassCondition = "";
            if (tUniNeg === "TEXTILES") { sClassCondition = "Z001" };
            if (tUniNeg === "QUIMICOS") { sClassCondition = "Z002" };
            if (tUniNeg === "CERAMICOS") { sClassCondition = "Z003" };

            var sFileName = sSalesDocument + "_" + jData.CustomerFullName + "_" + jData.TaxNumber + ".pdf";

            this._downloadCotizacionPdf(sSalesDocument, sClassCondition, sFileName);
        },
        _downloadBlob: function (oBlob, sFileName) {
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                // Soporte para IE/Edge antiguos
                window.navigator.msSaveOrOpenBlob(oBlob, sFileName);
            } else {
                var oUrl = window.URL.createObjectURL(oBlob);
                var oLink = document.createElement("a");
                oLink.href = oUrl;
                oLink.download = sFileName;
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                window.URL.revokeObjectURL(oUrl);
            }
        },

        _pdfDataToPdfBlob: function (sData) {
            if (!sData) {
                throw new Error("PDF vacío (sData sin contenido)");
            }

            // Eliminar espacios, saltos de línea, etc.
            sData = String(sData).trim().replace(/\s+/g, "");

            // Si viene con prefijo 0x, lo quitamos
            if (sData.startsWith("0x") || sData.startsWith("0X")) {
                sData = sData.slice(2);
            }

            let aBytes;

            // 👉 1) Detectar si parece HEX
            const isHex = /^[0-9A-Fa-f]+$/.test(sData) && (sData.length % 2 === 0);

            if (isHex) {
                // 🔹 Interpretar como HEX
                const nBytes = sData.length / 2;
                aBytes = new Uint8Array(nBytes);

                for (let i = 0; i < nBytes; i++) {
                    aBytes[i] = parseInt(sData.substr(i * 2, 2), 16);
                }
            } else {
                // 🔹 Interpretar como BASE64 (lo típico de Edm.Binary)
                try {
                    const binaryStr = window.atob(sData);
                    const nBytes = binaryStr.length;
                    aBytes = new Uint8Array(nBytes);
                    for (let i = 0; i < nBytes; i++) {
                        aBytes[i] = binaryStr.charCodeAt(i);
                    }
                } catch (e) {
                    console.error("❌ No se pudo decodificar ni como HEX ni como Base64", e);
                    throw e;
                }
            }

            // Debug: ver los primeros bytes y la firma del PDF
            const header = Array.from(aBytes.slice(0, 8));
            console.log("🔍 Primeros bytes del PDF:", header);
            console.log(
                "🔍 Firma como texto:",
                String.fromCharCode.apply(null, aBytes.slice(0, 8))
            ); // debería empezar con "%PDF"

            return new Blob([aBytes], { type: "application/pdf" });
        },
        _getLockedFiltersByProfile: function () {
            const oProj = this.getModel("oModelProyect");
            const oUser = this.getModel("oModelUser");

            const sRol = String(
                (oUser && oUser.getProperty("/bRol")) ||
                (oProj && oProj.getProperty("/Main/tRol")) ||
                tRol ||
                ""
            ).toUpperCase();

            const sBP = String(
                (oUser && oUser.getProperty("/bBprueba")) ||
                ""
            ).trim();

            const sVendedor = String(
                (oUser && oUser.getProperty("/bVendedor")) ||
                sBP ||
                ""
            ).trim();

            const bIsCliente = sRol === "CLIENTE" || sRol === "CLIENTES";
            const bIsVendedor = sRol === "VENDEDOR";
            const bIsSupervisor = sRol === "SUPERVISOR";

            return {
                sRol: sRol,
                bIsCliente: bIsCliente,
                bIsVendedor: bIsVendedor,
                bIsSupervisor: bIsSupervisor,
                aClienteLocked: bIsCliente && sBP ? [sBP] : [],
                aVendedorLocked: bIsVendedor && sVendedor ? [sVendedor] : []
            };
        },
        _restoreLockedFiltersByProfile: function () {
            const oProj = this.getModel("oModelProyect");
            const oUser = this.getModel("oModelUser");
            if (!oProj || !oUser) return;

            const oLocked = this._getLockedFiltersByProfile();

            // =========================
            // CLIENTE: conservar BP cliente
            // =========================
            if (oLocked.aClienteLocked.length > 0) {
                const sCliente = oLocked.aClienteLocked[0];

                oProj.setProperty("/Main/filter/cbCliente", [sCliente]);

                const oMiCliente = this.byId("miCliente");
                if (oMiCliente) {
                    oMiCliente.removeAllTokens();

                    const aClientesAll = oProj.getProperty("/oClienteFilterAll") || oProj.getProperty("/oClienteFilter") || [];
                    const oCli = aClientesAll.find(c =>
                        String(c.Customer || "").trim() === sCliente
                    );

                    const sTextCliente = oCli
                        ? `${oCli.Customer} - ${oCli.CustomerFullName || ""}`.trim()
                        : sCliente;

                    oMiCliente.addToken(new sap.m.Token({
                        key: sCliente,
                        text: sTextCliente
                    }));

                    oMiCliente.setValue("");

                    // Si el perfil cliente lo tiene oculto o bloqueado, igual internamente queda seteado.
                    if (oMiCliente.setEditable) {
                        oMiCliente.setEditable(false);
                    }
                }
            }

            // =========================
            // VENDEDOR: conservar BP vendedor
            // =========================
            if (oLocked.aVendedorLocked.length > 0) {
                const sVendedor = oLocked.aVendedorLocked[0];

                oProj.setProperty("/Main/filter/cbVendor", [sVendedor]);

                const oMcbVendedor = this.byId("mcbVendedor");
                if (oMcbVendedor && oMcbVendedor.setSelectedKeys) {
                    oMcbVendedor.setSelectedKeys([sVendedor]);
                }
            }

            console.log("✅ Filtros obligatorios restaurados por perfil:", {
                rol: oLocked.sRol,
                clienteLocked: oLocked.aClienteLocked,
                vendedorLocked: oLocked.aVendedorLocked
            });
        },
        _onClearComponent: function () {
            const oView = this.getView();
            const oModel = this.getModel("oModelProyect");
            const oLocked = this._getLockedFiltersByProfile();

            // 1. Fechas
            const oToday = new Date();
            const oOneMonthBefore = new Date(oToday);
            oOneMonthBefore.setMonth(oToday.getMonth() - 1);

            // 2. Documento: siempre se limpia
            const oMiDoc = oView.byId("miDocumento");
            if (oMiDoc) {
                if (oMiDoc.removeAllTokens) oMiDoc.removeAllTokens();
                if (oMiDoc.setValue) oMiDoc.setValue("");
            }

            // 3. Cliente:
            // Supervisor y Vendedor pueden limpiar cliente.
            // Cliente NO puede limpiar su propio BP.
            const oMiCliente = oView.byId("miCliente");
            if (oMiCliente && !oLocked.bIsCliente) {
                if (oMiCliente.removeAllTokens) oMiCliente.removeAllTokens();
                if (oMiCliente.setValue) oMiCliente.setValue("");
            }

            // 4. Estado: siempre se limpia
            const oMcbEstados = oView.byId("mcbEstados");
            if (oMcbEstados && oMcbEstados.setSelectedKeys) {
                oMcbEstados.setSelectedKeys([]);
            }

            // 5. Vendedor:
            // Solo Supervisor puede limpiar vendedor.
            // Vendedor NO puede perder su BP predefinido.
            const oMcbVendedor = oView.byId("mcbVendedor");
            if (oMcbVendedor && oLocked.bIsSupervisor && oMcbVendedor.setSelectedKeys) {
                oMcbVendedor.setSelectedKeys([]);
            }

            // 6. Ocultar filtro de estados
            const oFilterEstados = oView.byId("mcbEstadosF");
            if (oFilterEstados) {
                oFilterEstados.setVisible(false);
            }

            // 7. Otros combos si existen
            ["cbClasePedido", "cbOtro"].forEach(id => {
                const oCtrl = oView.byId(id);
                if (oCtrl && oCtrl.setSelectedKey) {
                    oCtrl.setSelectedKey("");
                }
            });

            // 8. Fechas visuales
            const oStartDate = oView.byId("dStartDate");
            const oEndDate = oView.byId("dEndDate");

            if (oStartDate) oStartDate.setDateValue(oOneMonthBefore);
            if (oEndDate) oEndDate.setDateValue(oToday);

            // 9. Modelo
            if (oModel) {
                oModel.setProperty("/Main/filter/dStartDate", oOneMonthBefore);
                oModel.setProperty("/Main/filter/dEndDate", oToday);
                oModel.setProperty("/Main/filter/cbDocumento", []);
                oModel.setProperty("/Main/filter/cbEstadoGeneral", []);

                // Cliente:
                // Supervisor y Vendedor sí pueden limpiar cliente.
                // Cliente debe conservar su BP.
                if (!oLocked.bIsCliente) {
                    oModel.setProperty("/Main/filter/cbCliente", []);
                }

                // Vendedor:
                // Solo Supervisor puede limpiar vendedor.
                // Vendedor debe conservar su BP.
                if (oLocked.bIsSupervisor) {
                    oModel.setProperty("/Main/filter/cbVendor", []);
                }

                oModel.setProperty("/oReporte", []);
                oModel.setProperty("/oReporteFiltrado", []);
            }

            // 10. Restaurar filtros obligatorios por perfil
            this._restoreLockedFiltersByProfile();

            // 11. Recalcular scope de clientes según vendedor/perfil
            if (this._applyScopeBySelectedVendors) {
                this._applyScopeBySelectedVendors();
            }

            if (this._purgeClientTokensOutOfScope) {
                this._purgeClientTokensOutOfScope();
            }

            if (this._restoreLockedFiltersByProfile) {
                this._restoreLockedFiltersByProfile();
            }

            if (this._setClientFiltersEnabledBySeller) {
                this._setClientFiltersEnabledBySeller();
            }

            // 12. Mensaje
            let sMsg = "✅ Filtros reiniciados y tabla limpia";

            if (oLocked.bIsVendedor) {
                sMsg = "✅ Filtros reiniciados. Se mantiene el vendedor asignado por perfil.";
            } else if (oLocked.bIsCliente) {
                sMsg = "✅ Filtros reiniciados. Se mantiene el cliente asignado por perfil.";
            }

            sap.m.MessageToast.show(sMsg);
        },

        _setWelcomeTextMain: async function ({ bp, rol, displayName, clientes }) {
            const oModelUser = this.getModel("oModelUser");
            const sBP = (bp || "").trim();
            const sRol = (rol || "").trim();
            const sNombreIAS = (displayName || "").trim();

            if (!oModelUser || !sBP) return;


            if (sRol === "VENDEDOR" || sRol === "SUPERVISOR") {
                oModelUser.setProperty("/welcomeText", `${sBP} - ${sNombreIAS || sBP}`);
                return;
            }


            if (sRol === "CLIENTES") {

                let sRS = "";
                if (Array.isArray(clientes) && clientes.length) {
                    const oMatch =
                        clientes.find(c => (c.Customer || c.key || "").trim() === sBP) ||
                        clientes.find(c => (c.Customer || c.key || "").trim().endsWith(sBP));

                    sRS = (oMatch?.CustomerFullName || oMatch?.Name1 || "").trim();
                }

                if (!sRS) {
                    sRS = await this._getCustomerFullNameByBP(sBP);
                }

                oModelUser.setProperty("/welcomeText", sRS ? `${sBP} - ${sRS}` : `${sBP}`);
                return;
            }

            oModelUser.setProperty("/welcomeText", `${sBP} - ${sNombreIAS || "Usuario"}`);
        },

        _getCustomerFullNameByBP: function (sBP) {
            const that = this;
            const sSalesOrg = that.sSalesOrg;
            const sCustomer = (sBP || "").trim();

            return new Promise(function (resolve) {
                if (!sCustomer) return resolve("");

                const sFilter = `$filter=SalesOrganization eq '${sSalesOrg}' and Customer eq '${sCustomer}'`;
                const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?${sFilter}&$top=1&$format=json&sap-language=ES`;

                let sUrl = "";
                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route) + `/S4HANA${sPath}`;
                }

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            let a = [];
                            if (oData && oData.data) {
                                if (oData.data.d && Array.isArray(oData.data.d.results)) a = oData.data.d.results;
                                else if (Array.isArray(oData.data.results)) a = oData.data.results;
                                else if (Array.isArray(oData.data)) a = oData.data;
                            }
                            resolve((a[0]?.CustomerFullName || "").trim());
                        },
                        error: function () { resolve(""); }
                    });
                });
            });
        },
        _applyEstadoFilterFromModel: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) { return; }

            const aAll = oModel.getProperty("/oReporte") || [];
            const aSelected = oModel.getProperty("/Main/filter/cbEstadoGeneral") || [];

            // Si no hay estados seleccionados => mostrar todo
            if (!Array.isArray(aSelected) || aSelected.length === 0) {
                oModel.setProperty("/oReporteFiltrado", aAll);
                return;
            }

            // Filtrar por EstadoGeneral
            const aFiltered = aAll.filter(r => aSelected.includes(r.EstadoGeneral));
            oModel.setProperty("/oReporteFiltrado", aFiltered);
        },
        _loadVendedoresSoloVD: function () {
            var that = this;

            return that._getAllowedVendorCodesVD().then((allowedSet) => {
                // Reutilizamos tu _loadVendedores pero filtrando antes de setear
                return new Promise((resolve) => {
                    let sUrl = "";
                    const sSalesOrg = that.sSalesOrg;
                    let sFilter = `$filter=SalesOrganization eq '${sSalesOrg}'`;

                    if (that.local) {
                        const sPath = `/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Vendor?$top=8000&${sFilter}&$format=json&sap-language=ES`;
                        sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                    } else {
                        const sPath = jQuery.sap.getModulePath(that.route) +
                            `/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Vendor?$top=8000&${sFilter}&$format=json&sap-language=ES`;
                        sUrl = sPath;
                    }

                    Services.getoDataERPSync(that, sUrl, function (result) {
                        util.response.validateAjaxGetERPNotMessage(result, {
                            success: function (oData) {
                                let aRaw = [];
                                if (oData && oData.d && Array.isArray(oData.d.results)) aRaw = oData.d.results;
                                else if (oData.data && Array.isArray(oData.data)) aRaw = oData.data;

                                // 🔥 Filtra solo los vendor codes permitidos por UsOrve (perfil VD)
                                aRaw = aRaw.filter(item => allowedSet.has((item.vendor || "").toString().trim()));

                                const aVendors = aRaw.map(item => {
                                    const code = (item.vendor || "").toString().trim();
                                    const name = (item.VendorName || "").toString().trim();
                                    return { VendorCode: code, VendorName: name, Display: `${code} - ${name}` };
                                });

                                const seen = new Set();
                                const aUnique = aVendors.filter(v => v.VendorCode && !seen.has(v.VendorCode) && seen.add(v.VendorCode));

                                that.getView().getModel("oModelData").setProperty("/oVendedores", aUnique);
                                resolve();
                            },
                            error: function () {
                                that.getView().getModel("oModelData").setProperty("/oVendedores", []);
                                resolve();
                            }
                        });
                    });
                });
            });
        },
        onDocumentoChangeFinal: function (oEvent) {
            const oMI = oEvent.getSource();
            let sValue = (oMI.getValue() || "").trim().replace(/[^\d]/g, "");

            oMI.setValue(sValue);

            if (!sValue) {
                return;
            }

            this._GetFiltroDocumento(sValue, "/oFiltroDocumento", oMI, true);
        },

        _cleanDocumentoValue: function (sValue) {
            return String(sValue ?? "")
                .normalize("NFKC")
                .replace(/[\u200B-\u200D\uFEFF]/g, "")
                .replace(/\u00A0/g, "")
                .replace(/[\r\n\t]/g, "")
                .replace(/\s+/g, "")
                .replace(/[^0-9]/g, "")
                .trim();
        },
        _applyScopeBySelectedVendors: function () {
            const oProj = this.getModel("oModelProyect");
            const oUser = this.getModel("oModelUser");
            if (!oProj || !oUser) return;

            const aClientesAll = oProj.getProperty("/oClienteFilterAll") || [];
            const aDatAll = oProj.getProperty("/oDatClientAll") || [];

            const sRol = String(oUser.getProperty("/bRol") || "").toUpperCase();
            const sUniNeg = String(oUser.getProperty("/bUniNeg") || tUniNeg || "").toUpperCase();

            const bIsVendedor = (sRol === "VENDEDOR");
            const bIsSupervisor = (sRol === "SUPERVISOR");
            const bIsCliente = (sRol === "CLIENTE" || sRol === "CLIENTES");
            const bEsQuimicos = (sUniNeg === "QUIMICOS");

            const aVendorKeys = (oProj.getProperty("/Main/filter/cbVendor") || [])
                .map(v => String(v || "").trim())
                .filter(Boolean);

            // QUIMICOS: no se valida cliente-vendedor.
            // Debe mostrar todos los clientes del SalesOrganization 1120.
            if (bEsQuimicos) {
                oProj.setProperty("/oClienteFilter", aClientesAll);
                oProj.setProperty("/oCliente", aClientesAll);

                console.log("✅ QUIMICOS: se cargan todos los clientes al filtro, sin validar vendedor-cliente", {
                    rol: sRol,
                    uniNeg: sUniNeg,
                    totalClientes: aClientesAll.length
                });

                return;
            }

            // SUPERVISOR: siempre ve todos los clientes
            if (bIsSupervisor) {
                oProj.setProperty("/oClienteFilter", aClientesAll);
                oProj.setProperty("/oCliente", aClientesAll);
                return;
            }

            // CLIENTE en unidades que no son QUIMICOS:
            // mantiene la lógica normal, porque el token del BP ya se setea en handleRouteMatched.
            if (bIsCliente) {
                oProj.setProperty("/oClienteFilter", aClientesAll);
                oProj.setProperty("/oCliente", aClientesAll);
                return;
            }

            // VENDEDOR sin vendedor seleccionado: vacío
            if (bIsVendedor && !aVendorKeys.length) {
                oProj.setProperty("/oClienteFilter", []);
                oProj.setProperty("/oCliente", []);
                return;
            }

            // Otros perfiles: todos
            if (!bIsVendedor) {
                oProj.setProperty("/oClienteFilter", aClientesAll);
                oProj.setProperty("/oCliente", aClientesAll);
                return;
            }

            // VENDEDOR con vendedor seleccionado: solo clientes de ese vendedor
            const setCustomers = new Set();

            aDatAll.forEach(r => {
                const bp = (r.kunn2 || "").toString().trim();
                const customer = (r.Customer || "").toString().trim();

                if (bp && customer && aVendorKeys.includes(bp)) {
                    setCustomers.add(customer);
                }
            });

            const aClientesScope = aClientesAll.filter(c =>
                setCustomers.has((c.Customer || "").toString().trim())
            );

            oProj.setProperty("/oClienteFilter", aClientesScope);
            oProj.setProperty("/oCliente", aClientesScope);
        },
        _purgeClientTokensOutOfScope: function () {
            const oProj = this.getModel("oModelProyect");
            const aScope = oProj.getProperty("/oClienteFilter") || [];
            const setOK = new Set(aScope.map(c => String(c.Customer || "").trim()));

            const oMI = this.byId("miCliente");
            if (oMI) {
                const aKeep = oMI.getTokens().filter(t => setOK.has(String(t.getKey()).trim()));
                oMI.removeAllTokens();
                aKeep.forEach(t => oMI.addToken(t));
                oProj.setProperty("/Main/filter/cbCliente", aKeep.map(t => t.getKey()));
            }
        },
        onSuggestClient: function (e) {
            const term = (e.getParameter("suggestValue") || "").trim();
            const b = e.getSource().getBinding("suggestionItems");
            if (!b) return;

            if (!term) {
                b.filter([]);
                return;
            }

            const F = sap.ui.model.Filter, FO = sap.ui.model.FilterOperator;

            b.filter([new F([
                new F("Customer", FO.Contains, term),
                new F("CustomerFullName", FO.Contains, term)
            ], false)]);
        },
        _setClientFiltersEnabledBySeller: function () {
            const oProj = this.getModel("oModelProyect");
            const oUser = this.getModel("oModelUser");
            if (!oProj || !oUser) return;

            const sRol = String(oUser.getProperty("/bRol") || "").toUpperCase();
            const sUniNeg = String(oUser.getProperty("/bUniNeg") || tUniNeg || "").toUpperCase();

            const bIsVendedor = (sRol === "VENDEDOR");
            const bIsSupervisor = (sRol === "SUPERVISOR");
            const bEsQuimicos = (sUniNeg === "QUIMICOS");

            const aVendorKeys = (oProj.getProperty("/Main/filter/cbVendor") || [])
                .map(v => String(v || "").trim())
                .filter(Boolean);

            let bEnableClientFilters = true;
            let bEnableExecuteSearch = true;

            // En QUIMICOS no se obliga vendedor para habilitar filtros/clientes.
            if (!bEsQuimicos && bIsVendedor && aVendorKeys.length === 0) {
                bEnableClientFilters = false;
                bEnableExecuteSearch = false;
            }

            if (bIsSupervisor || bEsQuimicos) {
                bEnableClientFilters = true;
                bEnableExecuteSearch = true;
            }

            oProj.setProperty("/Main/ui/bEnableClientFilters", bEnableClientFilters);
            oProj.setProperty("/Main/ui/bEnableExecuteSearch", bEnableExecuteSearch);

            console.log("DEBUG bloqueo filtros:", {
                rol: sRol,
                uniNeg: sUniNeg,
                aVendorKeys,
                bEnableClientFilters,
                bEnableExecuteSearch
            });
        },
        onModificar: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("oModelProyect");

            if (!oCtx) {
                sap.m.MessageBox.warning("No se pudo obtener el pedido seleccionado.");
                return;
            }

            const oPedido = oCtx.getObject() || {};

            const sPedido =
                oPedido.SalesDocument ||
                oPedido.Pedido ||
                oPedido.Documento ||
                oPedido.Order ||
                "";

            if (!this._canShowModificarPedido(oPedido)) {
                sap.m.MessageBox.warning(
                    "La modificación de pedidos solo está habilitada para vendedores o supervisores, " +
                    "en Textiles o Cerámicos, únicamente para pedidos nacionales en estado Pend. Aprobación."
                );
                return;
            }

            const sSalesOrg = String(
                oPedido.SalesOrganization ||
                oPedido.OrgVentas ||
                oPedido.UnidadOrganizacional ||
                oPedido.SalesOrg ||
                ""
            ).trim();

            let sTarget = "";

            if (sSalesOrg === "1110") {
                sTarget = "ModPedTextil";
            } else if (sSalesOrg === "1130") {
                sTarget = "ModPedCeramicos";
            } else {
                sap.m.MessageBox.warning(
                    "No se pudo determinar la unidad organizacional del pedido " + sPedido + "."
                );
                return;
            }

            try {
                sessionStorage.setItem("pedidoModificarCabecera", JSON.stringify(oPedido));
                sessionStorage.setItem("pedidoModificarNumero", sPedido);
            } catch (e) {
                console.warn("No se pudo guardar cabecera temporal para modificación:", e);
            }

            sap.m.MessageBox.confirm("¿Desea modificar el pedido " + sPedido + "?", {
                title: "Confirmación",
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                emphasizedAction: sap.m.MessageBox.Action.YES,
                onClose: function (sAction) {
                    if (sAction !== sap.m.MessageBox.Action.YES) {
                        return;
                    }

                    sap.ui.core.BusyIndicator.show(0);

                    setTimeout(function () {
                        try {
                            this.getRouter().navTo(sTarget, {
                                pedido: sPedido
                            });
                        } catch (e) {
                            sap.ui.core.BusyIndicator.hide(0);
                            console.error("No se pudo navegar a la pantalla de modificación:", e);
                            sap.m.MessageBox.error("No se pudo abrir la pantalla de modificación del pedido.");
                        }
                    }.bind(this), 100);
                }.bind(this)
            });
        }

    });
});
