sap.ui.define([
    "aris/com/clientes/seguimiento/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "aris/com/clientes/seguimiento/pe/model/models",
    "aris/com/clientes/seguimiento/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    '../util/util',
    '../util/utilUI',
], (BaseController, Controller, models, Formatter, JSONModel, util, utilUI) => {
    "use strict";

    var that;
    formatter: Formatter;
    return BaseController.extend("aris.com.clientes.seguimiento.pe.controller.AddManualProduct", {
        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("AddManualProduct").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
            const sUserData = localStorage.getItem("oModelUser");
            if (sUserData) {
                const oUserData = JSON.parse(sUserData);
                const oModelUser = new sap.ui.model.json.JSONModel(oUserData);
                this.getView().setModel(oModelUser, "oModelUser");
            }
            this.getView().addEventDelegate({
                onAfterRendering: () => {
                    const oTree = this.byId("ttCer");
                    if (oTree && !this._bRestoreHooked) {
                        this._bRestoreHooked = true;
                        oTree.attachEvent("rowsUpdated", this._restoreSelectionByCantidad.bind(this));
                    }
                }
            });
        },
        handleRouteMatched: function () {
            sap.ui.core.BusyIndicator.show(0);

            const sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
            const oView = this.getView();

            let oProj = oView.getModel("oModelProyect") || this.getOwnerComponent().getModel("oModelProyect");
            if (!oProj) {
                oProj = new sap.ui.model.json.JSONModel(models.createModelProyect());
            }
            oView.setModel(oProj, "oModelProyect");

            let oDataModel = oView.getModel("oModelData") || this.getOwnerComponent().getModel("oModelData");
            if (!oDataModel) {
                oDataModel = new sap.ui.model.json.JSONModel({});
            }
            oDataModel.setSizeLimit(900000000);
            oView.setModel(oDataModel, "oModelData");

            const oUserModel = oView.getModel("oModelUser") || this.getOwnerComponent().getModel("oModelUser");
            if (oUserModel) {
                oView.setModel(oUserModel, "oModelUser");
            }

            const fnBuildCodeDesc = function (aRows, sCodeField, sDescField) {
                const m = new Map();
                (aRows || []).forEach(function (r) {
                    const sCode = String(r[sCodeField] || "").trim();
                    const sDesc = String(r[sDescField] || "").trim();
                    if (!sCode) return;
                    if (!m.has(sCode)) {
                        m.set(sCode, { Code: sCode, Description: sDesc || sCode });
                    } else if (sDesc) {
                        const o = m.get(sCode);
                        if (!o.Description || o.Description === o.Code) {
                            o.Description = sDesc;
                        }
                    }
                });
                return Array.from(m.values()).sort(function (a, b) {
                    return a.Code.localeCompare(b.Code);
                });
            };

            Promise.all([
                that._getUsers(),
                that._getPrueba(),
                that._getMaterialStock("1130"),
                that._getClientPet("1130"),
                that._getDescriptionMaterial()
            ]).then(function (values) {
                that.oModelProyect = that.getView().getModel("oModelProyect");
                that.oModelData = that.getView().getModel("oModelData");
                that.oModelUser = that.getView().getModel("oModelUser");

                const oMaterialResp = values[2] || {};
                const aMateriales = oMaterialResp.oResults || [];
                const aDescriptions = oMaterialResp.aDescriptions || oMaterialResp.ListDescription || [];
                const aBrands = oMaterialResp.aBrands || oMaterialResp.ListBrand || [];
                const aMaterialGroups = oMaterialResp.aMaterialGroups || [];

                const aFormats = oMaterialResp.aFormats && oMaterialResp.aFormats.length
                    ? oMaterialResp.aFormats
                    : fnBuildCodeDesc(aMateriales, "Formatt", "FormatDescription");

                const aQualities = oMaterialResp.aQualities && oMaterialResp.aQualities.length
                    ? oMaterialResp.aQualities
                    : fnBuildCodeDesc(aMateriales, "TextileArticleQuality", "TextArtQuaDescription");

                const aStyles = oMaterialResp.aStyles && oMaterialResp.aStyles.length
                    ? oMaterialResp.aStyles
                    : Array.from(new Set(
                        (aMateriales || [])
                            .map(function (r) { return String(r.Estilo || r.OrilloStyle || "").trim(); })
                            .filter(Boolean)
                    )).sort();

                that.oModelData.setProperty("/oFilterMaterial", aMateriales);
                that.oModelData.setProperty("/ListDescription", aDescriptions);
                that.oModelData.setProperty("/ListDescriptionSug", []);
                that.oModelData.setProperty("/aBrands", aBrands);
                that.oModelData.setProperty("/ListBrandCodes", aBrands);
                that.oModelData.setProperty("/ListBrandSug", aBrands.map(function (b) {
                    return (typeof b === "string") ? { Brand: b, DscBrand: b } : b;
                }));
                that.oModelData.setProperty("/oMaterialGroup", aMaterialGroups.map(function (g) {
                    return (typeof g === "string")
                        ? { MaterailGroup: g, MaterialGroup: g, Description: g }
                        : Object.assign({ MaterailGroup: g.MaterialGroup || g.MaterailGroup }, g);
                }));
                that.oModelData.setProperty("/aFormats", aFormats);
                that.oModelData.setProperty("/aQualities", aQualities);
                that.oModelData.setProperty("/aStyles", aStyles);

                const aClientes = values[3] && Array.isArray(values[3].oResults) ? values[3].oResults : [];
                const aMatch = aClientes.filter(function (item) { return String(item.Customer) === String(sCustomer); });
                if (aMatch.length) {
                    that.oModelProyect.setProperty("/oDatClient", Object.assign(
                        {},
                        that.oModelProyect.getProperty("/oDatClient") || {},
                        aMatch[0]
                    ));
                }

                that._resetAddManualState();
                that._resetFiltersAndTable();
                that._afterOpenAddManualProduct();
                that.oModelProyect.setProperty("/oTreeCer", []);
                that.oModelProyect.refresh(true);
                sap.ui.core.BusyIndicator.hide();
            }).catch(function (oError) {
                console.error("Error inicializando AddManualProduct en modificación:", oError);
                that.getMessageBox("error", that.getI18nText("errorUserData") || "Error cargando datos de materiales.");
                sap.ui.core.BusyIndicator.hide();
            });
        },
        _resetAddManualState: function () {
            const oProj = this.getView().getModel("oModelProyect");
            oProj.setProperty("/oAddManual", {
                Cantidades: {},
                Envios: []
            });
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
            oProj.setProperty("/oTreeCer", []);
            oProj.setProperty("/oMaterialSelect", []);
            oProj.setProperty("/oMaterialBase", []);
            // MultiInputs
            this.byId("miMaterialSellerandCoord")?.removeAllTokens();
            this.byId("miDescriptionSellerandCoord")?.removeAllTokens();
            // Combos (usa SOLO los IDs reales del AddManualProduct)
            ["cbGrupoMaterialTree", "cbBrandTree", "cbFormatoTree", "cbCalidadTree", "cbEstiloTree"].forEach(id => {
                const cb = this.byId(id);
                if (cb) { cb.setSelectedKey(""); cb.setValue(""); }
            });
            // Radios default: TODOS
            this.byId("rbtype1")?.setSelected(false);
            this.byId("rbtype2")?.setSelected(false);
            this.byId("rbtype3")?.setSelected(true);
            // Limpieza fuerte de selección del Tree
            this._clearTreeSelectionDeferred();
            oProj.refresh(true);
        },
        _applyMetrajeFilterTree: function (aTree, fMetrosMin) {
            const toNum = (v) => {
                if (v == null || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const nMin = toNum(fMetrosMin);
            if (nMin <= 0) return aTree || [];

            const filterNode = (node) => {
                if (!node) return null;

                // Padre: usa TotalStockFisico (si no existe, intenta StockFisico)
                if (node.isGroup) {
                    const nTotal = toNum(node.TotalStockFisico ?? node.StockFisico);
                    if (nTotal < nMin) return null;
                    const children = Array.isArray(node.children) ? node.children : [];
                    return { ...node, children };
                }
                return node;
            };

            return (aTree || [])
                .map(filterNode)
                .filter(Boolean);
        },
        _clearTreeSelection: function () {
            const oTree = this.byId("ttCer");
            if (!oTree) {
                return;
            }
            oTree.clearSelection();

            try {
                const iMax = oTree.getMaxSelectionIndex();
                if (iMax >= 0) {
                    oTree.removeSelectionInterval(0, iMax);
                }
            } catch (e) {
            }
        },
        _clearTreeSelectionDeferred: function () {
            const oTree = this.byId("ttCer");
            if (!oTree) return;

            const fnClear = () => {
                try {
                    oTree.clearSelection();

                    const oBind = oTree.getBinding("rows");
                    const iLen = oBind && oBind.getLength ? oBind.getLength() : 0;
                    if (iLen > 0) {
                        oTree.removeSelectionInterval(0, iLen - 1);
                    }

                    oTree.setFirstVisibleRow(0);
                    oTree.collapseAll();
                } catch (e) {
                }
            };

            fnClear();
            oTree.attachEventOnce("rowsUpdated", fnClear);
        },
        _afterOpenAddManualProduct: function () {
            const oTree = this.byId("ttCer");
            if (!oTree) return;
            oTree.clearSelection();
            oTree.setFirstVisibleRow(0);
            oTree.collapseAll();
            this._restoreSelectionByCantidad();
        },
        _restoreSelectionByCantidad: function () {
            const oTree = this.byId("ttCer");
            if (!oTree) return;

            try {
                oTree.clearSelection();

                const oBind = oTree.getBinding("rows");
                const iLen = oBind && oBind.getLength ? oBind.getLength() : 0;

                for (let i = 0; i < iLen; i++) {
                    const oCtx = oTree.getContextByIndex(i);
                    if (!oCtx) continue;

                    const oRow = oCtx.getObject();
                    if (!oRow) continue;

                    const nPal = parseFloat(oRow.cantidadPallets) || 0;
                    const nCaj = parseFloat(oRow.cantidadCajas) || 0;

                    if (nPal > 0 || nCaj > 0) {
                        oTree.addSelectionInterval(i, i);
                    }
                }
            } catch (e) {
                // no romper UI
            }
        },
        _resetFiltersAndTableTree: function () {
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
            oProj.setProperty("/oTreeCer", []);
            const oMiMat = this.byId("miMaterialSellerandCoord");
            const oMiDesc = this.byId("miDescriptionSellerandCoord");
            if (oMiMat) { oMiMat.removeAllTokens(); }
            if (oMiDesc) { oMiDesc.removeAllTokens(); }
            const oCbGrupo = this.byId("cbGrupoMaterialTree");
            const oCbBrand = this.byId("cbBrandTree");
            const oCbFormato = this.byId("cbFormatoTree");
            const oCbCalidad = this.byId("cbCalidadTree");
            const oCbEstilo = this.byId("cbEstiloTree");
            [oCbGrupo, oCbBrand, oCbFormato, oCbCalidad, oCbEstilo].forEach(cb => {
                if (cb) {
                    cb.setSelectedKey("");
                    cb.setValue("");
                }
            });
            const rb1 = this.byId("rbtype1");
            const rb2 = this.byId("rbtype2");
            const rb3 = this.byId("rbtype3");
            if (rb1 && rb2 && rb3) {
                rb1.setSelected(false);
                rb2.setSelected(false);
                rb3.setSelected(true);
            }
            const oTree = this.byId("ttCer");
            if (oTree) {
                this._clearTreeSelectionDeferred();
            }

            oProj.refresh(true);
        },
        onClearFiltersAndTable: function () {
            this._resetFiltersAndTableTree();
        },
        _resetFiltersAndTable: function () {
            const oView = this.getView();
            const oProj = oView.getModel("oModelProyect");

            // 🔹 Filtros en el modelo
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
            oProj.setProperty("/oTreeCer", []);
            oProj.setProperty("/oMaterialSelect", []);
            oProj.setProperty("/oMaterialBase", []);
            const oMiMat = oView.byId("miMaterialSellerandCoord");
            const oMiDesc = oView.byId("miDescriptionSellerandCoord");
            if (oMiMat) { oMiMat.removeAllTokens(); }
            if (oMiDesc) { oMiDesc.removeAllTokens(); }
            const oCbGrupo = oView.byId("cbGrupoMaterial");
            const oCbBrand = oView.byId("cbBrand");
            const oCbFormato = oView.byId("cbFormato");
            const oCbCalidad = oView.byId("cbCalidad");
            const oCbEstilo = oView.byId("cbEstilo");
            [oCbGrupo, oCbBrand, oCbFormato, oCbCalidad, oCbEstilo].forEach(cb => {
                if (cb) {
                    cb.setSelectedKey("");
                    cb.setValue("");
                }
            });
            const rb1 = oView.byId("rbtype1");
            const rb2 = oView.byId("rbtype2");
            const rb3 = oView.byId("rbtype3");
            if (rb1 && rb2 && rb3) {
                rb1.setSelected(false);
                rb2.setSelected(false);
                rb3.setSelected(true);
            }
            const oTree = oView.byId("ttCer");
            if (oTree) {
                this._clearTreeSelectionDeferred();
            }
        },
        _onAcceptProductManual: async function () {
            const oTree = this.byId("ttCer");
            const oModel = this.getView().getModel("oModelProyect");

            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const fnEnsureM2 = async function (oCtx, r) {
                const nPal = toNum(r.cantidadPallets);
                const nCaj = toNum(r.cantidadCajas);
                let nM2 = toNum(r.Cantidad || r.cantidadM2 || r.cantidad);

                if (nM2 > 0) {
                    r.Cantidad = nM2.toFixed(3);
                    r.cantidadM2 = nM2.toFixed(3);
                    return r;
                }

                const sMatnr = String(r.Matnr || r.Material || "").trim();

                if (!sMatnr) {
                    return r;
                }

                const aPromises = [];

                if (nPal > 0) {
                    aPromises.push(this._getCantidadM2FromService(sMatnr, "PAL", nPal));
                }

                if (nCaj > 0) {
                    aPromises.push(this._getCantidadM2FromService(sMatnr, "CJ", nCaj));
                }

                const aM2 = await Promise.all(aPromises);
                nM2 = aM2.reduce(function (acc, v) {
                    return acc + toNum(v);
                }, 0);

                r.Cantidad = nM2.toFixed(3);
                r.cantidadM2 = nM2.toFixed(3);

                if (oCtx) {
                    oModel.setProperty(oCtx.getPath() + "/Cantidad", nM2.toFixed(3));
                    oModel.setProperty(oCtx.getPath() + "/cantidadM2", nM2.toFixed(3));
                }

                return r;
            }.bind(this);

            const aFiltered = [];

            const fnPushRow = async function (oCtx, r, sLevel) {
                if (!r) {
                    return;
                }

                const nPal = toNum(r.cantidadPallets);
                const nCaj = toNum(r.cantidadCajas);

                if (nPal <= 0 && nCaj <= 0) {
                    return;
                }

                const oRowCopy = Object.assign({}, r, {
                    __pickLevel: sLevel || (r.isGroup ? "PARENT" : "CHILD")
                });

                await fnEnsureM2(oCtx, oRowCopy);

                aFiltered.push(oRowCopy);
            };

            const aSelected = oTree ? oTree.getSelectedIndices() : [];

            for (const i of aSelected) {
                const oCtx = oTree.getContextByIndex(i);
                if (!oCtx) {
                    continue;
                }

                const r = oCtx.getObject();
                await fnPushRow(oCtx, r, r && r.isGroup ? "PARENT" : "CHILD");
            }

            if (aFiltered.length === 0) {
                const aTree = oModel.getProperty("/oTreeCer") || [];

                for (const g of aTree) {
                    await fnPushRow(null, g, "PARENT");

                    for (const ch of (g.children || [])) {
                        await fnPushRow(null, ch, "CHILD");
                    }
                }
            }

            if (aFiltered.length === 0) {
                sap.m.MessageToast.show("Seleccione o ingrese cantidades en al menos un producto.");
                return;
            }

            sap.ui.getCore().getEventBus().publish(
                "AddManualProduct",
                "MaterialSelected",
                aFiltered
            );

            this._clearTreeSelection();
            this._navBackToModPedido();
        },
        _onPressClose: function () {
            this._navBackToModPedido();
        },
        _navBackToModPedido: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const sPedido =
                (oModel && oModel.getProperty("/pedidoModificar")) ||
                sessionStorage.getItem("pedidoModificarNumero") ||
                "";

            if (sPedido) {
                /*
                 * Indica a ModPedCeramicos que el regreso viene desde búsqueda de stock.
                 * Por lo tanto, no debe volver a cargar el pedido desde SAP.
                 */
                sessionStorage.setItem("modPedCeramicosReturnFromStock", "X");

                this.getOwnerComponent().getRouter().navTo("ModPedCeramicos", { pedido: sPedido }, true);
                return;
            }

            window.history.go(-1);
        },
        _updateCantidadM2TreeRow: function (oContext) {
            const oModel = oContext.getModel();
            const oRow = oContext.getObject();
            if (!oRow) return;

            const bIsGroup = !!oRow.isGroup;
            const sMatnr = oRow.Matnr;
            if (!sMatnr) return;
            oRow.__qtyReqId = (oRow.__qtyReqId || 0) + 1;
            const iReqId = oRow.__qtyReqId;

            const nPal = parseFloat(oRow.cantidadPallets) || 0;
            const nCaj = parseFloat(oRow.cantidadCajas) || 0;
            if (nPal <= 0 && nCaj <= 0) {
                oModel.setProperty(oContext.getPath() + "/Cantidad", 0);

                if (!bIsGroup) {
                    this._recalcularCantidadGrupo(oContext);
                }
                return;
            }
            const aPromises = [];
            if (nPal > 0) aPromises.push(this._getCantidadM2FromService(sMatnr, "PAL", nPal));
            if (nCaj > 0) aPromises.push(this._getCantidadM2FromService(sMatnr, "CJ", nCaj));

            Promise.all(aPromises).then((aVals) => {
                if ((oRow.__qtyReqId || 0) !== iReqId) return;

                const fTotalM2 = aVals.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
                oModel.setProperty(oContext.getPath() + "/Cantidad", fTotalM2.toFixed(3));

                if (!bIsGroup) {
                    this._recalcularCantidadGrupo(oContext);
                }
            }).catch((err) => {
                if ((oRow.__qtyReqId || 0) !== iReqId) return;
            });
        },
        _recalcularCantidadGrupo: function (oContext) {
            const oModel = oContext.getModel();
            const sPath = oContext.getPath();
            const sParentPath = this._getParentGroupFromRowCtxPath(sPath);

            if (!sParentPath) return;

            const aChildren = oModel.getProperty(sParentPath + "/children") || [];
            const sum = aChildren.reduce((acc, child) => {
                return acc + (parseFloat(child.Cantidad) || 0);
            }, 0);

            oModel.setProperty(sParentPath + "/Cantidad", sum.toFixed(3));
        },
        _getCantidadM2FromService: function (sMatnr, sUmv, fQty) {
            const that = this;
            return new Promise(function (resolve) {
                if (!sMatnr || fQty <= 0) {
                    resolve(0);
                    return;
                }
                let sUrl;
                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject()
                        .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route)
                        + "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
                }
                const oModelPeso = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                    useBatch: false,
                    defaultBindingMode: "TwoWay"
                });
                const aFilters = [
                    new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, sMatnr),
                    new sap.ui.model.Filter("Meins", sap.ui.model.FilterOperator.EQ, "M2"),
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
                        const fCantM2 = parseFloat(oRes.Peso) || 0;
                        resolve(fCantM2);
                    },
                    error: function (oError) {

                        resolve(0);
                    }
                });
            });
        },
        onValidateCantidad: function (oEvent) {
            const oInput = oEvent.getSource();
            const oContext = oInput.getBindingContext("oModelProyect");
            if (!oContext) return;

            const oModel = oContext.getModel();
            const sRowPath = oContext.getPath();
            const oRow = oContext.getObject();
            const sField = oInput.getBindingPath("value");

            const toNumber = (v) => {
                if (v == null || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const vRaw =
                oEvent.getParameter("value") ??
                oEvent.getParameter("newValue") ??
                oInput.getValue();

            const n = toNumber(vRaw);
            const bIsGroup = !!oRow.isGroup;

            let nStock = 0;

            if (sField === "cantidadPallets") {
                nStock = bIsGroup ? toNumber(oRow.TotalPallets) : toNumber(oRow.Pallets);
            } else if (sField === "cantidadCajas") {
                nStock = bIsGroup ? toNumber(oRow.TotalSaldos) : toNumber(oRow.Saldos);
            } else {
                nStock = 999999999;
            }

            if (nStock < 0) nStock = 0;

            console.log("🧪 VALIDAR CANTIDAD PALLET/CAJA", {
                campo: sField,
                valorDigitado: n,
                stockDisponible: nStock,
                esGrupo: bIsGroup,
                rowPath: sRowPath,
                row: JSON.parse(JSON.stringify(oRow))
            });

            const nBultoEntero = Math.max(0, Math.round(n));

            /*
             * Regla:
             * - Visualmente se muestra entero: 3
             * - Internamente se guarda con 3 decimales: 3.000
             */
            const sValueUI = String(nBultoEntero);
            const sValueSAP = nBultoEntero.toFixed(3);

            if (nBultoEntero > nStock && nStock > 0) {
                const sMsg = (sField === "cantidadPallets")
                    ? `La cantidad ingresada de pallets supera el stock disponible (${nStock}).`
                    : `La cantidad ingresada de cajas supera el stock disponible (${nStock}).`;

                oInput.setValueState("Warning");
                oInput.setValueStateText(sMsg);
                sap.m.MessageToast.show(sMsg);
            } else {
                oInput.setValueState("None");
                oInput.setValueStateText("");
            }

            /*
             * El input muestra entero.
             */
            oInput.setValue(sValueUI);

            /*
             * El modelo guarda decimal interno para que:
             * - fnEnsureM2
             * - MaterialPesoSet
             * - simulación
             * - BAPI
             * trabajen como antes.
             */
            oModel.setProperty(sRowPath + "/" + sField, sValueSAP);
            oRow[sField] = sValueSAP;

            oRow.state = "Success";
            oRow.icon = "sap-icon://accept";

            const sBase = "/oAddManual/Cantidades";
            const oCant = oModel.getProperty(sBase) || {};

            const sMatnr = oRow.Matnr || oRow.Material;
            if (sMatnr) {
                if (!oCant[sMatnr]) {
                    oCant[sMatnr] = {};
                }

                oCant[sMatnr][sField] = sValueSAP;
                oModel.setProperty(sBase, oCant);
            }

            const sEnvBase = "/oAddManual/Envios";
            const aEnv = oModel.getProperty(sEnvBase) || [];

            aEnv.push({
                material: sMatnr || "",
                campo: sField,
                valorUI: sValueUI,
                valorSAP: sValueSAP,
                timestamp: new Date().toISOString()
            });

            oModel.setProperty(sEnvBase, aEnv);

            oModel.refresh(true);

            /*
             * Después del refresh, reforzamos que el input visible quede sin decimales.
             * El modelo igual conserva el valor interno con 3 decimales.
             */
            setTimeout(function () {
                oInput.setValue(sValueUI);
            }, 0);

            const oTree = this.byId("ttCer");
            if (oTree) {
                const oBind = oTree.getBinding("rows");
                const iLen = oBind && oBind.getLength ? oBind.getLength() : 0;

                for (let i = 0; i < iLen; i++) {
                    const ctx = oTree.getContextByIndex(i);
                    if (ctx && ctx.getPath() === sRowPath) {
                        oTree.addSelectionInterval(i, i);
                        break;
                    }
                }
            }
            this._updateCantidadM2TreeRow(oContext);
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
                const sText = oItem.getText();
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
        _getTipoSeleccionado: function () {
            const rb1 = this.byId("rbtype1"); // Completos
            const rb2 = this.byId("rbtype2"); // Saldos
            const rb3 = this.byId("rbtype3"); // Todos

            if (rb1 && rb1.getSelected()) {
                return "COMPLETOS";
            }
            if (rb2 && rb2.getSelected()) {
                return "SALDOS";
            }
            // por defecto
            return "TODOS";
        },
        _applyMetrajeFilter: function (aStock, fMetrosMin) {
            if (!Array.isArray(aStock) || !aStock.length) {
                return [];
            }
            if (!fMetrosMin || fMetrosMin <= 0) {
                return aStock;
            }

            return aStock.filter(item => {
                const nM2 = parseFloat(item.StockFisico) || 0;
                return nM2 >= fMetrosMin;
            });
        },
        _applyTipoFilter: function (aStock, sTipo) {
            if (!Array.isArray(aStock) || !aStock.length) {
                return [];
            }

            if (sTipo === "TODOS") {
                return aStock;
            }

            if (sTipo === "SALDOS") {
                return aStock
                    .filter(item => (parseFloat(item.Saldos) || 0) > 0)
                    .map(item => ({
                        ...item,
                        Pallets: 0
                    }));
            }

            if (sTipo === "COMPLETOS") {
                return aStock
                    .filter(item => (parseFloat(item.Pallets) || 0) > 0)
                    .map(item => ({
                        ...item,
                        Saldos: 0
                    }));
            }

            return aStock;
        },
        _runInBatches: async function (aItems, iBatchSize, fn) {
            const aSettledAll = [];
            const iSize = Math.max(1, parseInt(iBatchSize, 10) || 8);

            for (let i = 0; i < aItems.length; i += iSize) {
                const aBatch = aItems.slice(i, i + iSize);
                const aSettled = await Promise.allSettled(aBatch.map(fn));
                aSettledAll.push(...aSettled);
            }
            return aSettledAll;
        },
        onBuscarPress: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            const aFilters = [];

            // 👉 Limpia selección de la TreeTable ANTES de buscar
            this._clearTreeSelection();
            oModelProyect.setProperty("/oTreeCer", []);
            oModelProyect.setProperty("/oMaterialSelect", []);
            oModelProyect.setProperty("/oMaterialBase", []);
            aFilters.push(new sap.ui.model.Filter(
                "DistributionChannel",                 // si tu campo se llama distinto, cámbialo aquí
                sap.ui.model.FilterOperator.EQ,
                "C1"
            ));

            // GRUPO DE MATERIAL
            if (oSelectDetail.grupoMaterial) {
                aFilters.push(new sap.ui.model.Filter(
                    "MaterialGroup",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.grupoMaterial
                ));
            }

            // MATERIAL (MultiInput)
            const aMat = oSelectDetail.aMaterials || [];
            if (aMat.length) {
                const aMatFilters = aMat.map(function (sMat) {
                    return new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.EQ, sMat);
                });
                aFilters.push(new sap.ui.model.Filter(aMatFilters, false)); // OR
            }

            // DESCRIPCIÓN (MultiInput)
            const aDesc = oSelectDetail.aDescriptions || [];
            if (aDesc.length) {
                const aDescFilters = aDesc.map(function (sDesc) {
                    return new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.EQ, sDesc);
                });
                aFilters.push(new sap.ui.model.Filter(aDescFilters, false)); // OR
            }

            // MARCA
            if (oSelectDetail.Brand) {
                aFilters.push(new sap.ui.model.Filter(
                    "Brand",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.Brand
                ));
            }

            // FORMATO
            if (oSelectDetail.Formato) {
                aFilters.push(new sap.ui.model.Filter(
                    "Formatt",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.Formato
                ));
            }

            // CALIDAD
            if (oSelectDetail.Calidad) {
                aFilters.push(new sap.ui.model.Filter(
                    "TextileArticleQuality",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.Calidad
                ));
            }

            // ESTILO
            if (oSelectDetail.Estilo) {
                aFilters.push(new sap.ui.model.Filter(
                    "OrilloStyle",
                    sap.ui.model.FilterOperator.EQ,
                    oSelectDetail.Estilo
                ));
            }

            if (aFilters.length === 0) {
                this.getMessageBox("warning", "Debe seleccionar al menos un filtro antes de buscar.");
                return;
            }

            const fMetrosMin = parseFloat(oSelectDetail.MetrosMin || "0") || 0;
            this._loadMateriales(aFilters, fMetrosMin);
        },
        _loadMateriales: async function (aFilters, fMetrosMin) {
            const that = this;

            let sUrl;
            try {
                if (that.local) {
                    sUrl = that.getOwnerComponent().getManifestObject()
                        .resolveUri("/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/");
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route)
                        + "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/";
                }

                const oModel = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                    useBatch: false,
                    defaultBindingMode: "TwoWay"
                });

                sap.ui.core.BusyIndicator.show(0);

                // 1) Leer materiales (await)
                const oData = await new Promise((resolve, reject) => {
                    oModel.read("/MaterialsConsultation", {
                        filters: aFilters,
                        success: resolve,
                        error: reject
                    });
                });

                const aResults = oData.results || [];
                if (!aResults.length) {
                    that.getMessageBox("warning", "No se encontraron materiales con los filtros aplicados.");
                    return;
                }

                const oProjModel = that.getView().getModel("oModelProyect");
                oProjModel.setProperty("/oMaterialBase", aResults);
                oProjModel.setProperty("/oMaterialSelect", []);

                // 2) Stock en paralelo por lotes
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

                let aTotalStock = [];
                aSettledAll.forEach((r) => {
                    if (r && r.status === "fulfilled") {
                        aTotalStock.push(...(r.value || []));
                    }
                });

                // 3) Filtros tipo + metraje
                const sTipo = that._getTipoSeleccionado();
                let aFiltradoTipo = that._applyTipoFilter(aTotalStock, sTipo);
                aFiltradoTipo = that._applyMetrajeFilter(aFiltradoTipo, fMetrosMin);

                if (!aFiltradoTipo.length) {
                    that.getMessageBox("warning", "No se encontraron materiales con los filtros (tipo y metraje).");
                }

                // 4) Set modelo + tree
                oProjModel.setProperty("/oMaterialSelect", aFiltradoTipo);

                const aTreeData = that._prepareDataForCeramicos(aFiltradoTipo);
                const aTreeAdj = that._applyReservedToTree(aTreeData);
                oProjModel.setProperty("/oTreeCer", aTreeAdj);

                that._clearTreeSelectionDeferred();

            } catch (e) {
                // OData read error o error paralelo
                // (si quieres, aquí puedes loguear e / e.responseText)
                that.getMessageBox("error", "Error consultando materiales/stock.");
            } finally {
                sap.ui.core.BusyIndicator.hide();
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
                                    Saldos: parseFloat(c.Saldos) || 0
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

        _applyReservedToTree: function (aTree) {
            const toNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            const mRes = this._getReservedMapFromPedido();

            const walk = (n) => {
                const node = { ...n };
                if (Array.isArray(node.children) && node.children.length) {
                    node.children = node.children.map(walk);
                    const sum = (arr, field) => arr.reduce((acc, x) => acc + toNum(x[field]), 0);

                    node.TotalPallets = Number(sum(node.children, "Pallets").toFixed(3));
                    node.TotalSaldos = Number(sum(node.children, "Saldos").toFixed(3));
                    node.TotalStockFisico = Number(sum(node.children, "StockFisico").toFixed(3));

                    return node;
                }
                const k = this._buildStockKeyForRow(node);
                const oRes = mRes[k] || { pal: 0, caj: 0, m2: 0 };

                const nPal = Math.max(0, toNum(node.Pallets) - oRes.pal);
                const nCaj = Math.max(0, toNum(node.Saldos) - oRes.caj);
                const nFis = Math.max(0, toNum(node.StockFisico) - oRes.m2);

                node.Pallets = Number(nPal.toFixed(3));
                node.Saldos = Number(nCaj.toFixed(3));
                node.StockFisico = Number(nFis.toFixed(3));

                node.__reservedPal = Number(oRes.pal.toFixed(3));
                node.__reservedCaj = Number(oRes.caj.toFixed(3));

                return node;
            };

            return (aTree || []).map(walk);
        },
        onToggleOpenState: function (oEvent) {
            const oTable = oEvent.getSource();
            const iRowIndex = oEvent.getParameter("rowIndex");
            const bExpanded = oEvent.getParameter("expanded");

            const oCtx = oTable.getContextByIndex(iRowIndex);
            if (!oCtx) return;

            const oRow = oCtx.getObject();
            const oModel = oCtx.getModel();

            if (!oRow || !oRow.isGroup) return;

            oModel.setProperty(oCtx.getPath() + "/expanded", bExpanded);

            if (bExpanded) {
                const nPalG = parseFloat(oRow.cantidadPallets) || 0;
                const nCajG = parseFloat(oRow.cantidadCajas) || 0;

                if (nPalG > 0 || nCajG > 0) {
                    oTable.collapse(iRowIndex);
                    oModel.setProperty(oCtx.getPath() + "/expanded", false);

                    sap.m.MessageBox.error(
                        "Para ver el detalle primero elimine las cantidades ingresadas en la línea resumen."
                    );
                }
            }
            setTimeout(() => this._restoreSelectionByCantidad(), 0);
        },
        _prepareDataForCeramicos: function (aStock) {
            const map = new Map();

            aStock.forEach(item => {
                const key = `${item.Matnr}_${item.Calibre || ""}_${item.Tono || ""}`;
                if (!map.has(key)) {
                    map.set(key, {
                        ...item,
                        StockFisico: parseFloat(item.StockFisico) || 0,
                        Pallets: parseFloat(item.Pallets) || 0,
                        Saldos: parseFloat(item.Saldos) || 0
                    });
                } else {
                    const existing = map.get(key);
                    existing.StockFisico += parseFloat(item.StockFisico) || 0;
                    existing.Pallets += parseFloat(item.Pallets) || 0;
                    existing.Saldos += parseFloat(item.Saldos) || 0;
                }
            });

            const grouped = {};
            for (const item of map.values()) {
                const key = item.Matnr;
                if (!grouped[key]) {
                    grouped[key] = {
                        isGroup: true,
                        Matnr: item.Matnr,
                        Descripcion: item.Descripcion,
                        Um: item.Um,
                        TotalStockFisico: 0,
                        TotalPallets: 0,
                        TotalSaldos: 0,
                        expanded: false,
                        children: []
                    };
                }
                grouped[key].TotalStockFisico += item.StockFisico;
                grouped[key].TotalPallets += item.Pallets;
                grouped[key].TotalSaldos += item.Saldos;
                grouped[key].children.push({
                    isGroup: false,
                    Matnr: item.Matnr,
                    Descripcion: grouped[key].Descripcion,
                    Calibre: item.Calibre || "",
                    Tono: item.Tono || "",
                    Um: item.Um,
                    StockFisico: item.StockFisico,
                    Pallets: item.Pallets,
                    Saldos: item.Saldos,
                    cantidadPallets: 0,
                    cantidadCajas: 0
                });
            }

            return Object.values(grouped).map(g => ({
                ...g,
                TotalStockFisico: Number(g.TotalStockFisico.toFixed(2)),
                TotalPallets: Number(g.TotalPallets.toFixed(2)),
                TotalSaldos: Number(g.TotalSaldos.toFixed(2))
            }));
        },

        _getParentGroupFromRowCtxPath: function (sPath) {
            try {
                // Paths típicos: /oTreeCer/0/children/2  → padre: /oTreeCer/0
                const parts = sPath.split("/");
                const idxChildren = parts.indexOf("children");
                if (idxChildren > 0) {
                    return parts.slice(0, idxChildren).join("/");
                }
                // Si ya es grupo, devolvemos el mismo path
                return sPath;
            } catch (e) {
                return null;
            }
        },
        pickGroupOrDetail: function (isGroup, totalVal, detailVal) {
            var v = isGroup ? totalVal : detailVal;

            if (v == null || v === "") {
                return "";
            }

            if (typeof v === "boolean") {
                v = v ? 1 : 0;
            }

            if (typeof v === "string") {
                v = v.replace(",", ".");
            }

            var n = parseFloat(v);

            if (isNaN(n)) {
                return "";
            }

            return String(Math.round(n));
        },

        stockDisplay: function (isGroup, totalStockM2, stockM2) {
            var val = isGroup ? totalStockM2 : stockM2;
            if (val == null || val === "") return "";
            if (typeof val === "boolean") {
                val = val ? 1 : 0;
            }
            if (typeof val === "string") {
                val = val.replace(",", ".");
            }
            var n = parseFloat(val);
            if (isNaN(n)) return "";
            return n.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },

    });
});