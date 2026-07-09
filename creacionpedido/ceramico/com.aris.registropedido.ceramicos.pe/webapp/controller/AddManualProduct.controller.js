sap.ui.define([
    "com/aris/registropedido/ceramicos/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "com/aris/registropedido/ceramicos/pe/model/models",
    "com/aris/registropedido/ceramicos/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    '../util/util',
    '../util/utilUI',
], (BaseController, Controller,models,Formatter,JSONModel, util, utilUI) => {
    "use strict";

         var that;
        formatter: Formatter;
    return BaseController.extend("com.aris.registropedido.ceramicos.pe.controller.AddManualProduct", {
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
                    this._attachMaterialMultiPaste(this.byId("miMaterialSellerandCoord"));
                }
            });
        },
         handleRouteMatched: function(bInit){
            sap.ui.core.BusyIndicator.show(0)
            let sCustomer = this.oRouter.getHashChanger().hash.split("/")[1];
             Promise.all([that._getUsers(),that._getPrueba(),that._getMaterialStock(),that._getClientPet(sCustomer),
            that._getDescriptionMaterial(),that._getTipMaterialData()
            ]).then((values) => {
            that.oModelProyect = that.getModel("oModelProyect");
            that.oModelData = that.getModel("oModelData");
            that.oModelUser = that.getModel("oModelUser");
            that.oModelDevice = that.getModel("oModelDevice");
            that.oModelData = that.getModel("oModelData");
            const oMaterialResp = values[2];
            if (oMaterialResp && oMaterialResp.sEstado === "S") {
                that.oModelData.setProperty("/ListBrandCodes", oMaterialResp.aBrands || []);
            }
            let aMateriales      = oMaterialResp.oResults        || [];
            let aBrands          = oMaterialResp.aBrands         || [];
            let aMaterialGroups  = oMaterialResp.aMaterialGroups || [];
            let aDescriptions    = oMaterialResp.aDescriptions   || [];
            that.oModelData.setProperty("/oFilterMaterial", aMateriales);
            that.oModelData.setProperty("/aBrands", aBrands);
            that.oModelData.setProperty("/ListDescription", aDescriptions);
            that.oModelData.setProperty("/ListDescriptionSug", []);
            const oBrandResp = values[4];
            if (oBrandResp && oBrandResp.sEstado === "S") {
                const aBrandsFull = oBrandResp.oResults || [];
                that.oModelData.setProperty("/ListBrand", aBrandsFull);
                that.oModelData.setProperty("/ListBrandSug", aBrandsFull);
            }
            const oMatGroupResp = values[5];
            that.oModelData.setProperty("/oMaterialGroup", oMatGroupResp.oResults || []);
            const aDet = values[3].oResults;
            const aMatch = aDet.filter(item => item.Customer == sCustomer);
            if (aMatch.length) {
                that.oModelProyect.setProperty("/oDatClient", aMatch[0]);
            }
            that._resetAddManualState();
            that._resetFiltersAndTable();
            that._afterOpenAddManualProduct();
            sap.ui.core.BusyIndicator.hide(0);
            if (!that.oModelProyect.getProperty("/oSelectDetail")) {
                that.oModelProyect.setProperty("/oSelectDetail", {
                    material: [],
                    Description: [],
                    grupoMaterial: "",
                    Brand: "",
                    Formato: "",
                    Calidad: "",
                    Estilo: "",
                    MetrosMin: ""

                });
            }
            that.getView().getModel("oModelProyect").setProperty("/oTreeCer", []);
            }).catch(function (oError) {
                that.getMessageBox("error", that.getI18nText("errorUserData"));
                sap.ui.core.BusyIndicator.hide(0);
            });
        },
        _resetAddManualState: function () {
            const oProj = this.getView().getModel("oModelProyect");
            oProj.setProperty("/oAddManual", {
                Cantidades: {},
                Envios: []
            });
            oProj.setProperty("/oSelectDetail", {
                material      : "",
                aMaterials    : [],
                Description   : "",
                aDescriptions : [],
                grupoMaterial : "",
                Brand         : "",
                Formato       : "",
                Calidad       : "",
                Estilo        : "",
                MetrosMin     : ""
            });
            oProj.setProperty("/oTreeCer", []);
            oProj.setProperty("/oTreeCerBase", []);
            oProj.setProperty("/oMaterialSelect", []);
            oProj.setProperty("/oMaterialBase", []);
            oProj.setProperty("/showTipoFilter", false);
            oProj.setProperty("/tipoStockSeleccionado", "TODOS");
            // MultiInputs
            this.byId("miMaterialSellerandCoord")?.removeAllTokens();
            this.byId("miDescriptionSellerandCoord")?.removeAllTokens();
            // Combos (usa SOLO los IDs reales del AddManualProduct)
            ["cbGrupoMaterialTree","cbBrandTree","cbFormatoTree","cbCalidadTree","cbEstiloTree"].forEach(id => {
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
                    const iLen  = oBind && oBind.getLength ? oBind.getLength() : 0;
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
            this._attachMaterialMultiPaste(this.byId("miMaterialSellerandCoord"));
            if (!oTree) return;
            oTree.clearSelection();
            oTree.setFirstVisibleRow(0);
            oTree.collapseAll();
            this._restoreSelectionByCantidad();
        },
        _attachMaterialMultiPaste: function (oControl) {
            if (!oControl || oControl.data("multiPasteAttached")) return;

            oControl.data("multiPasteAttached", true);
            oControl.attachBrowserEvent("paste", this._handleMaterialMultiPaste.bind(this, oControl));
        },
        _handleMaterialMultiPaste: function (oControl, oEvent) {
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
        _restoreSelectionByCantidad: function () {
            const oTree = this.byId("ttCer");
            if (!oTree) return;

            try {
                oTree.clearSelection();

                const oBind = oTree.getBinding("rows");
                const iLen  = oBind && oBind.getLength ? oBind.getLength() : 0;

                for (let i = 0; i < iLen; i++) {
                    const oCtx = oTree.getContextByIndex(i);
                    if (!oCtx) continue;

                    const oRow = oCtx.getObject();
                    if (!oRow) continue;

                    const nPal = parseFloat(oRow.cantidadPallets) || 0;
                    const nCaj = parseFloat(oRow.cantidadCajas)   || 0;

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
                material      : "",
                aMaterials    : [],
                Description   : "",
                aDescriptions : [],
                grupoMaterial : "",
                Brand         : "",
                Formato       : "",
                Calidad       : "",
                Estilo        : "",
                MetrosMin     : ""
            });
            oProj.setProperty("/oTreeCer", []);
            oProj.setProperty("/oTreeCerBase", []);
            const oMiMat  = this.byId("miMaterialSellerandCoord");
            const oMiDesc = this.byId("miDescriptionSellerandCoord");
            if (oMiMat)  { oMiMat.removeAllTokens(); }
            if (oMiDesc) { oMiDesc.removeAllTokens(); }
            const oCbGrupo   = this.byId("cbGrupoMaterialTree");
            const oCbBrand   = this.byId("cbBrandTree");
            const oCbFormato = this.byId("cbFormatoTree");
            const oCbCalidad = this.byId("cbCalidadTree");
            const oCbEstilo  = this.byId("cbEstiloTree");
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
            oProj.setProperty("/showTipoFilter", false);
            oProj.setProperty("/tipoStockSeleccionado", "TODOS");
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
            const oView  = this.getView();
            const oProj  = oView.getModel("oModelProyect");

            // 🔹 Filtros en el modelo
            oProj.setProperty("/oSelectDetail", {
                material      : "",
                aMaterials    : [],
                Description   : "",
                aDescriptions : [],
                grupoMaterial : "",
                Brand         : "",
                Formato       : "",
                Calidad       : "",
                Estilo        : "",
                MetrosMin     : ""

            });
            oProj.setProperty("/oTreeCer",        []);
            oProj.setProperty("/oTreeCerBase",    []);
            oProj.setProperty("/oMaterialSelect", []);
            oProj.setProperty("/oMaterialBase",   []);
            const oMiMat  = oView.byId("miMaterialSellerandCoord");
            const oMiDesc = oView.byId("miDescriptionSellerandCoord");
            if (oMiMat)  { oMiMat.removeAllTokens(); }
            if (oMiDesc) { oMiDesc.removeAllTokens(); }
            const oCbGrupo   = oView.byId("cbGrupoMaterial");
            const oCbBrand   = oView.byId("cbBrand");
            const oCbFormato = oView.byId("cbFormato");
            const oCbCalidad = oView.byId("cbCalidad");
            const oCbEstilo  = oView.byId("cbEstilo");
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
            oProj.setProperty("/showTipoFilter", false);
            oProj.setProperty("/tipoStockSeleccionado", "TODOS");
            const oTree = oView.byId("ttCer");
            if (oTree) {
                this._clearTreeSelectionDeferred();
            }
        },
        _onAcceptProductManual: function () {
            const oTree  = this.byId("ttCer");
            const oModel = this.getView().getModel("oModelProyect");

            const aSelected = oTree.getSelectedIndices();
            const aFiltered = [];
            aSelected.forEach(i => {
                const oCtx = oTree.getContextByIndex(i);
                if (!oCtx) return;

                const r = oCtx.getObject();
                if (!r) return;
                const nPal = parseFloat(r.cantidadPallets) || 0;
                const nCaj = parseFloat(r.cantidadCajas)   || 0;
                if (nPal > 0 || nCaj > 0) {
                    const bIsGroup = !!r.isGroup;
                    aFiltered.push({
                        ...r,
                        __pickLevel: bIsGroup ? "PARENT" : "CHILD"
                    });
                }
            });
            if (aFiltered.length === 0) {
                const aTree = oModel.getProperty("/oTreeCer") || [];
                aTree.forEach(g => {
                    const nPalG = parseFloat(g.cantidadPallets) || 0;
                    const nCajG = parseFloat(g.cantidadCajas)   || 0;
                    // Grupo (padre)
                    if (nPalG > 0 || nCajG > 0) {
                        aFiltered.push({
                            ...g,
                            __pickLevel: "PARENT"
                        });
                    }
                    // Hijos (detalle)
                    (g.children || []).forEach(ch => {
                        const nPal = parseFloat(ch.cantidadPallets) || 0;
                        const nCaj = parseFloat(ch.cantidadCajas)   || 0;

                        if (nPal > 0 || nCaj > 0) {
                            aFiltered.push({
                                ...ch,
                                __pickLevel: "CHILD"
                            });
                        }
                    });
                });
            }
            if (aFiltered.length === 0) {
                sap.m.MessageToast.show("Seleccione o ingrese cantidades en al menos un producto.");
                return;
            }
            sap.ui.getCore().getEventBus().publish("AddManualProduct", "MaterialSelected", aFiltered);
            this._clearTreeSelection();
            // tu navTo igual como lo tienes...
            const oProj = this.getModel("oModelProyect");
            let sCustomer = oProj.getProperty("/oDatClient/Customer");

            if (!sCustomer) {
                const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
                sCustomer = (sHash.split("/")[1]) || null;
            }
            if (!sCustomer) {
                sap.m.MessageToast.show("No se encontró Customer para continuar");
                return;
            }
            this.getOwnerComponent().getRouter().navTo("Detail", { app: sCustomer });
        },
         _onPressClose: function () {

            const oModel = this.getView().getModel("oModelProyect");
            let sCustomer = oModel.getProperty("/Customer");

            if (!sCustomer) {
                const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
                const aParts = sHash.split("/");
                sCustomer = aParts.length > 1 ? aParts[1] : null;
            }

            if (!sCustomer) {
                sap.m.MessageToast.show("No se encontró Customer para volver al Detail.");
                return;
            }

            this.getOwnerComponent().getRouter().navTo("Detail", { app: sCustomer });
        },
        _updateCantidadM2TreeRow: function (oContext) {
            const oModel = oContext.getModel();
            const oRow   = oContext.getObject();
            if (!oRow) return;

            const bIsGroup = !!oRow.isGroup;
            const sMatnr   = oRow.Matnr;
            if (!sMatnr) return;
            oRow.__qtyReqId = (oRow.__qtyReqId || 0) + 1;
            const iReqId = oRow.__qtyReqId;

            const nPal = parseFloat(oRow.cantidadPallets) || 0;
            const nCaj = parseFloat(oRow.cantidadCajas)   || 0;
            if (nPal <= 0 && nCaj <= 0) {
                oModel.setProperty(oContext.getPath() + "/Cantidad", 0);

                if (!bIsGroup) {
                    this._recalcularCantidadGrupo(oContext);
                }
                return;
            }
            const aPromises = [];
            if (nPal > 0) aPromises.push(this._getCantidadM2FromService(sMatnr, "PAL", nPal));
            if (nCaj > 0) aPromises.push(this._getCantidadM2FromService(sMatnr, "CJ",  nCaj));

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
            const sPath  = oContext.getPath();
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
                    new sap.ui.model.Filter("Meins",    sap.ui.model.FilterOperator.EQ, "M2"),
                    new sap.ui.model.Filter("Umv",      sap.ui.model.FilterOperator.EQ, sUmv),
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
            const oInput   = oEvent.getSource();
            const oContext = oInput.getBindingContext("oModelProyect");
            if (!oContext) return;

            const oModel   = oContext.getModel();
            const sRowPath = oContext.getPath();
            const oRow     = oContext.getObject();
            const sField   = oInput.getBindingPath("value");

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

            if (n > nStock) {
                const sMsg = (sField === "cantidadPallets")
                    ? `No puede ingresar Pallets mayor al stock disponible (${nStock}).`
                    : `No puede ingresar Cajas mayor al stock disponible (${nStock}).`;


                const nFixed = nStock;

                oInput.setValueState("Error");
                oInput.setValueStateText(sMsg);
                oInput.setValue(nFixed);
                oModel.setProperty(sRowPath + "/" + sField, nFixed);
                oRow[sField] = nFixed;

                sap.m.MessageToast.show(sMsg);
                this._updateCantidadM2TreeRow(oContext);
                const oTree = this.byId("ttCer");
                if (oTree) {
                    const oBind = oTree.getBinding("rows");
                    const iLen  = oBind && oBind.getLength ? oBind.getLength() : 0;

                    for (let i = 0; i < iLen; i++) {
                        const ctx = oTree.getContextByIndex(i);
                        if (ctx && ctx.getPath() === sRowPath) {
                            oTree.addSelectionInterval(i, i);
                            break;
                        }
                    }
                }

                oModel.refresh(true);
                return;
            }

            const sValueUI  = n.toFixed(3);
            const sValueSAP = sValueUI;

            oInput.setValueState("None");
            oInput.setValueStateText("");
            oInput.setValue(sValueUI);

            oModel.setProperty(sRowPath + "/" + sField, n);
            oRow[sField] = n;

            oRow.state = "Success";
            oRow.icon  = "sap-icon://accept";
            const sBase = "/oAddManual/Cantidades";
            const oCant = oModel.getProperty(sBase) || {};

            const sMatnr = oRow.Matnr || oRow.Material;
            if (sMatnr) {
                if (!oCant[sMatnr]) oCant[sMatnr] = {};
                oCant[sMatnr][sField] = sValueSAP;
                oModel.setProperty(sBase, oCant);
            }

            const sEnvBase = "/oAddManual/Envios";
            const aEnv = oModel.getProperty(sEnvBase) || [];
            aEnv.push({
                material : sMatnr || "",
                campo    : sField,
                valorUI  : sValueUI,
                valorSAP : sValueSAP,
                timestamp: new Date().toISOString()
            });
            oModel.setProperty(sEnvBase, aEnv);

            oModel.refresh(true);

            const oTree = this.byId("ttCer");
            if (oTree) {
                const oBind = oTree.getBinding("rows");
                const iLen  = oBind && oBind.getLength ? oBind.getLength() : 0;

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
            const sValue   = oEvent.getParameter("suggestValue") || "";
            const oInput   = oEvent.getSource();
            const oBinding = oInput.getBinding("suggestionItems");

            if (!oBinding) return;

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const oFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("Material",    sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
        },
         onMaterialSuggestionSelected: function (oEvent) {
            const oItem  = oEvent.getParameter("selectedItem");
            const oMulti = oEvent.getSource();
            const sMat   = oItem ? oItem.getKey() : "";

            if (!sMat) {
                return;
            }
            const aTokens = oMulti.getTokens() || [];
            const bExistsToken = aTokens.some(t => t.getKey() === sMat);
            if (!bExistsToken) {
                const sText = oItem.getText();
                const oToken = new sap.m.Token({
                    key : sMat,
                    text: sText
                });
                oMulti.addToken(oToken);
            }
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            let aMaterials      = oSelectDetail.aMaterials || [];

            if (!aMaterials.includes(sMat)) {
                aMaterials.push(sMat);
            }

            oSelectDetail.aMaterials = aMaterials;
            oSelectDetail.material   = sMat;

            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        onMaterialTokenUpdate: function (oEvent) {
            const sType   = oEvent.getParameter("type");
            const aTokens = oEvent.getParameter("tokens") || [];

            if (sType !== "removed") {
                return;
            }
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            let aMaterials      = oSelectDetail.aMaterials || [];

            aTokens.forEach(function (oToken) {
                const sKey = oToken.getKey();
                aMaterials = aMaterials.filter(m => m !== sKey);
            });

            oSelectDetail.aMaterials = aMaterials;
            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },
        onSuggestDescription: function (oEvent) {
            const sValue     = oEvent.getParameter("suggestValue") || "";
            const oModelData = this.getView().getModel("oModelData");
            const aFull      = oModelData.getProperty("/ListDescription") || [];
            const sSearch    = sValue.toUpperCase();

            let aFiltered = aFull.filter(function (v) {
                return (v || "").toUpperCase().includes(sSearch);
            });
            aFiltered = aFiltered.slice(0, 100);
            oModelData.setProperty("/ListDescriptionSug", aFiltered);
        },
        onDescriptionSuggestionSelected: function (oEvent) {
            const oItem  = oEvent.getParameter("selectedItem");
            const oMulti = oEvent.getSource();
            const sDesc  = oItem ? oItem.getText() : "";

            if (!sDesc) {
                return;
            }
            const aTokens = oMulti.getTokens() || [];
            const bExistsToken = aTokens.some(t => t.getKey() === sDesc);
            if (!bExistsToken) {
                const oToken = new sap.m.Token({
                    key : sDesc,
                    text: sDesc
                });
                oMulti.addToken(oToken);
            }
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            let aDescriptions   = oSelectDetail.aDescriptions || [];

            if (!aDescriptions.includes(sDesc)) {
                aDescriptions.push(sDesc);
            }

            oSelectDetail.aDescriptions = aDescriptions;
            oSelectDetail.Description   = sDesc;

            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);
        },

        onDescriptionTokenUpdate: function (oEvent) {
            const sType   = oEvent.getParameter("type");
            const aTokens = oEvent.getParameter("tokens") || [];

            if (sType !== "removed") {
                return;
            }

            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            let aDescriptions   = oSelectDetail.aDescriptions || [];

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
        _toStockNumber: function (v) {
            if (typeof v === "number") return v;
            let s = String(v ?? "").trim();
            if (!s) return 0;
            let bNegative = false;
            if (s.endsWith("-")) {
                bNegative = true;
                s = s.slice(0, -1);
            }
            if (s.startsWith("-")) {
                bNegative = true;
                s = s.slice(1);
            }
            s = s.replace(/\s/g, "");
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
            return bNegative ? -n : n;
        },
        _filterTreeByTipo: function (aRows, sTipo) {
            const toNum = this._toStockNumber.bind(this);
            const clone = (obj) => Object.assign({}, obj);

            if (sTipo === "TODOS") {
                return (aRows || []).map(group => Object.assign(clone(group), {
                    children: (group.children || []).map(clone)
                }));
            }

            const sField = sTipo === "SALDOS" ? "Saldos" : "Pallets";
            const sTotalField = sTipo === "SALDOS" ? "TotalSaldos" : "TotalPallets";

            return (aRows || []).reduce((acc, group) => {
                const aChildren = (group.children || [])
                    .filter(child => toNum(child[sField]) > 0)
                    .map(clone);

                if (toNum(group[sTotalField]) <= 0 && !aChildren.length) {
                    return acc;
                }

                const oGroup = Object.assign(clone(group), { children: aChildren });
                if (aChildren.length) {
                    oGroup.TotalStockFisico = aChildren.reduce((sum, child) => sum + toNum(child.StockFisico), 0);
                    oGroup.TotalPallets = aChildren.reduce((sum, child) => sum + toNum(child.Pallets), 0);
                    oGroup.TotalSaldos = aChildren.reduce((sum, child) => sum + toNum(child.Saldos), 0);
                }
                acc.push(oGroup);
                return acc;
            }, []);
        },
        _applyTipoFromTreeBase: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const sTipo = this._getTipoSeleccionado();
            const aBase = oModelProyect.getProperty("/oTreeCerBase") || [];
            oModelProyect.setProperty("/tipoStockSeleccionado", sTipo);
            oModelProyect.setProperty("/oTreeCer", this._filterTreeByTipo(aBase, sTipo));
            this._clearTreeSelectionDeferred();
        },
        onTipoRadioSelect: function (oEvent) {
            if (oEvent && oEvent.getParameter && oEvent.getParameter("selected") === false) return;
            this._applyTipoFromTreeBase();
        },
        _yieldToBrowser: function () {
            return new Promise(resolve => setTimeout(resolve, 0));
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
        onBuscarPress: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};
            const aFilters = [];

            // 👉 Limpia selección de la TreeTable ANTES de buscar
            this._clearTreeSelection();
            oModelProyect.setProperty("/oTreeCer",        []);
            oModelProyect.setProperty("/oTreeCerBase",    []);
            oModelProyect.setProperty("/oMaterialSelect", []);
            oModelProyect.setProperty("/oMaterialBase",   []);
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
                        + "/S4HANA_Materials/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/";
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
                        new sap.ui.model.Filter("Plant",            sap.ui.model.FilterOperator.EQ, "1001"),
                        new sap.ui.model.Filter("Pedven",           sap.ui.model.FilterOperator.EQ, true),
                        new sap.ui.model.Filter("Materialnumber",   sap.ui.model.FilterOperator.EQ, m.Material)
                    ];
                    return that._loadProductoSingle(aFiltersStock);
                });

                let aTotalStock = [];
                aSettledAll.forEach((r) => {
                    if (r && r.status === "fulfilled") {
                        aTotalStock.push(...(r.value || []));
                    }
                });

                // 3) Metraje queda como filtro de búsqueda; tipo se aplica sobre la base local.
                const aFiltradoBase = that._applyMetrajeFilter(aTotalStock, fMetrosMin);

                if (!aFiltradoBase.length) {
                    that.getMessageBox("warning", "No se encontraron materiales con los filtros aplicados.");
                }

                oProjModel.setProperty("/oMaterialSelect", aFiltradoBase);

                const aTreeData = await that._prepareDataForCeramicos(aFiltradoBase);
                const aTreeAdj  = that._applyReservedToTree(aTreeData);
                oProjModel.setProperty("/oTreeCerBase", aTreeAdj);
                oProjModel.setProperty("/showTipoFilter", true);
                oProjModel.setProperty("/tipoStockSeleccionado", that._getTipoSeleccionado());
                oProjModel.setProperty("/oTreeCer", that._filterTreeByTipo(aTreeAdj, that._getTipoSeleccionado()));

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
                m[k].m2  += toNum(r.cantidad);
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
                    node.TotalSaldos  = Number(sum(node.children, "Saldos").toFixed(3));
                    node.TotalStockFisico = Number(sum(node.children, "StockFisico").toFixed(3));

                    return node;
                }
                const k = this._buildStockKeyForRow(node);
                const oRes = mRes[k] || { pal: 0, caj: 0, m2: 0 };

                const nPal = Math.max(0, toNum(node.Pallets) - oRes.pal);
                const nCaj = Math.max(0, toNum(node.Saldos)  - oRes.caj);
                const nFis = Math.max(0, toNum(node.StockFisico) - oRes.m2);

                node.Pallets = Number(nPal.toFixed(3));
                node.Saldos  = Number(nCaj.toFixed(3));
                node.StockFisico = Number(nFis.toFixed(3));

                node.__reservedPal = Number(oRes.pal.toFixed(3));
                node.__reservedCaj = Number(oRes.caj.toFixed(3));

                return node;
            };

            return (aTree || []).map(walk);
        },
         onToggleOpenState: function (oEvent) {
            const oTable    = oEvent.getSource();
            const iRowIndex = oEvent.getParameter("rowIndex");
            const bExpanded = oEvent.getParameter("expanded");

            const oCtx = oTable.getContextByIndex(iRowIndex);
            if (!oCtx) return;

            const oRow   = oCtx.getObject();
            const oModel = oCtx.getModel();

            if (!oRow || !oRow.isGroup) return;

            oModel.setProperty(oCtx.getPath() + "/expanded", bExpanded);

            if (bExpanded) {
                const nPalG = parseFloat(oRow.cantidadPallets) || 0;
                const nCajG = parseFloat(oRow.cantidadCajas)   || 0;

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
        _prepareDataForCeramicos: async function (aStock) {
            const map = new Map();

            const aSafeStock = Array.isArray(aStock) ? aStock : [];
            for (let i = 0; i < aSafeStock.length; i++) {
                const item = aSafeStock[i];
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
                existing.Pallets     += parseFloat(item.Pallets) || 0;
                existing.Saldos      += parseFloat(item.Saldos) || 0;
                }
                if (i > 0 && i % 500 === 0) {
                    await this._yieldToBrowser();
                }
            }

            const grouped = {};
            let iGrouped = 0;
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
                grouped[key].TotalPallets     += item.Pallets;
                grouped[key].TotalSaldos      += item.Saldos;
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
                iGrouped++;
                if (iGrouped % 500 === 0) {
                    await this._yieldToBrowser();
                }
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

            if (v == null || v === "") return "";
            if (typeof v === "boolean") {
                v = v ? 1 : 0;
            }
            if (typeof v === "string") {
                v = v.replace(",", ".");
            }
            var n = parseFloat(v);
            if (isNaN(n)) return "";
            return n.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
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
