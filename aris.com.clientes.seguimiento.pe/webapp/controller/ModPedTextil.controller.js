sap.ui.define([
    "aris/com/clientes/seguimiento/pe/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "aris/com/clientes/seguimiento/pe/model/models",
    "aris/com/clientes/seguimiento/pe/model/formatter",
    "sap/ui/model/json/JSONModel",
    '../util/util',
    '../util/utilUI',
    "sap/m/Token",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",

    "aris/com/clientes/seguimiento/pe/services/Services",
], (BaseController, Controller, models, Formatter, JSONModel, util, utilUI, Token, Filter, FilterOperator, Services) => {
    "use strict";

    var that;
    //formatter: Formatter;
    return BaseController.extend("aris.com.clientes.seguimiento.pe.controller.ModPedTextil", {

        onInit() {
            that = this;
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("ModPedTextil").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));

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
        handleRouteMatched: function () {
            sap.ui.core.BusyIndicator.show(0);

            const sPedido = this.oRouter.getHashChanger().hash.split("/")[1];
            const oView = this.getView();

            let oProj = oView.getModel("oModelProyect");
            if (!oProj) {
                oProj = new sap.ui.model.json.JSONModel(models.createModelProyect());
                oView.setModel(oProj, "oModelProyect");
            }

            let oDataModel = oView.getModel("oModelData");
            if (!oDataModel) {
                oDataModel = new sap.ui.model.json.JSONModel({});
                oView.setModel(oDataModel, "oModelData");
            }

            const oCfg = this._getPedidoUnitConfig("1110");

            oProj.setProperty("/pedidoModificar", sPedido);
            oProj.setProperty("/isFormEnabled", false);
            oProj.setProperty("/isDetailEdit", false);
            oProj.setProperty("/modoModificacion", true);
            oProj.setProperty("/SalesOrgModificacion", oCfg.SalesOrg);
            oProj.setProperty("/PlantModificacion", oCfg.Plant);
            oProj.setProperty("/oMaterialDeletedMod", []);

            // Oculta la tabla inicial hasta terminar la primera simulación
            oProj.setProperty("/bSimulandoInicialTextil", true);
            oProj.setProperty("/sTextoSimulacionInicialTextil", "Simulando pedido...");

            Promise.all([
                this._getDocRefPendientePorPedido(sPedido),
                this._getPedConRefItem(sPedido),
                this._loadObsFromPedidoReferencia(sPedido),
                this._getMaterialStock("1110"),
                this._getTipChangeData(),
                this._getDescriptionMaterial(),
                this._getCOnditionPay("1110"),
                this._getReason()
            ]).then(function (values) {
                const oCabResp = values[0];
                const oItemResp = values[1];
                const oObsResp = values[2];
                const oMaterialResp = values[3];
                const oTipoCambioResp = values[4];
                const oBrandResp = values[5];

                const aCab = oCabResp && Array.isArray(oCabResp.oResults) ? oCabResp.oResults : [];
                const aItems = oItemResp && Array.isArray(oItemResp.oResults) ? oItemResp.oResults : [];

                void 0;
                void 0;

                let oCab = aCab.length ? aCab[0] : null;
                let oCabStorage = {};

                try {
                    const sCabStorage = sessionStorage.getItem("pedidoModificarCabecera");
                    const sPedidoStorage = sessionStorage.getItem("pedidoModificarNumero");

                    if (sCabStorage && sPedidoStorage === sPedido) {
                        oCabStorage = JSON.parse(sCabStorage) || {};
                    }
                } catch (e) {
                    void 0;
                }

                if (oCab) {
                    oCab = this._mergeHeaderNonEmpty(oCabStorage, oCab);
                } else if (Object.keys(oCabStorage).length) {
                    oCab = oCabStorage;
                    void 0;
                }

                if (!oCab) {
                    oCab = {
                        SalesDocument: sPedido,
                        SalesOrganization: "1110",
                        Division: "S1",
                        TransactionCurrency: "USD",
                        SalesDocumentType: "",
                        Customer: ""
                    };
                }

                if (!aItems.length) {
                    sap.m.MessageBox.warning("No se encontraron posiciones para el pedido " + sPedido + ".");
                }

                if (oMaterialResp && oMaterialResp.sEstado === "S") {
                    oDataModel.setProperty("/oFilterMaterial", oMaterialResp.oResults || []);
                    oDataModel.setProperty("/ListMaterial", oMaterialResp.ListMaterial || []);
                    oDataModel.setProperty("/ListDescription", oMaterialResp.ListDescription || []);
                    oDataModel.setProperty("/ListBrand", oMaterialResp.ListBrand || []);
                    oDataModel.setProperty("/ListArtTextil", oMaterialResp.ListArtTextil || []);
                    oDataModel.setProperty("/ListOrillo", oMaterialResp.ListOrillo || []);
                    oDataModel.setProperty("/ListBrandSug", oMaterialResp.ListBrand || []);
                    oDataModel.setProperty("/ListArtTextilSug", oMaterialResp.ListArtTextil || []);
                    oDataModel.setProperty("/ListOrilloSug", oMaterialResp.ListOrillo || []);
                }

                if (oBrandResp && oBrandResp.sEstado === "S") {
                    oDataModel.setProperty("/ListBrand", oBrandResp.oResults || oDataModel.getProperty("/ListBrand") || []);
                    oDataModel.setProperty("/ListBrandSug", oBrandResp.oResults || oDataModel.getProperty("/ListBrandSug") || []);
                }

                const oTipo = oTipoCambioResp && oTipoCambioResp.oResults ? oTipoCambioResp.oResults : {};
                oDataModel.setProperty("/oTipChangeData", {
                    from: {
                        moneda: oTipo.FromCurr || "PEN",
                        valor: oTipo.ExchRate || 0
                    },
                    to: {
                        moneda: oTipo.ToCurrncy || "USD",
                        valor: oTipo.ExchRate || 0
                    },
                    fechaValidez: oTipo.ValidFrom ? new Date(parseInt(String(oTipo.ValidFrom).match(/\d+/)[0], 10)) : null,
                    fecha: oTipo.Date ? new Date(parseInt(String(oTipo.Date).match(/\d+/)[0], 10)) : null
                });

                oDataModel.setProperty("/oConditionPay", values[6].oResults || []);
                const aReasonPermitidos = ["Z01", "Z02", "Z03", "Z04"];

                const aReasonFiltrados = (values[7].oResults || [])
                    .filter(function (item) {
                        return aReasonPermitidos.includes(String(item.ReasonRequest || "").trim());
                    })
                    .filter(function (item, index, self) {
                        const sKey = String(item.ReasonRequest || "").trim();
                        return index === self.findIndex(function (x) {
                            return String(x.ReasonRequest || "").trim() === sKey;
                        });
                    });

                oDataModel.setProperty("/oReason", aReasonFiltrados);

                this._mapPedidoModificacionToModel(oCab, aItems);
                this._applyObsFromPedidoReferenciaMod(oObsResp);

                const sCustomer = this._getDocHeaderValue(
                    oCab,
                    "Customer",
                    "CUSTOMER",
                    "SoldToParty",
                    "SOLDTO",
                    "Cliente",
                    "Kunnr",
                    "KUNNR",
                    "ClientId"
                );

                const sCurrency = oProj.getProperty("/inputForm/moneda") || this._getDocHeaderValue(
                    oCab,
                    "TransactionCurrency",
                    "Currency",
                    "DocumentCurrency",
                    "Moneda"
                ) || "USD";

                return Promise.all([
                    this._getDatClientView(sCustomer, "1110"),
                    this._getClientPet("1110"),
                    this._getAddresTravel(sCustomer, "1110"),
                    this._getAnticipo(sCustomer, sCurrency, "1110"),
                    this._getNotaCredito(sCustomer, sCurrency, "1110")
                ]);
            }.bind(this)).then(function (values) {
                if (!values) {
                    return;
                }

                const oDatClientResp = values[0];
                const oClientPetResp = values[1];
                const oAddressResp = values[2];
                const oAnticipoResp = values[3];
                const oNotaCreditoResp = values[4];

                const oCab = oProj.getProperty("/docModificarCabecera") || {};
                const sCustomer = this._getDocHeaderValue(
                    oCab,
                    "Customer",
                    "CUSTOMER",
                    "SoldToParty",
                    "SOLDTO",
                    "Cliente",
                    "Kunnr",
                    "KUNNR",
                    "ClientId"
                );

                const aClientes = oClientPetResp && Array.isArray(oClientPetResp.oResults)
                    ? oClientPetResp.oResults
                    : [];

                const oCliente = aClientes.find(function (item) {
                    return String(item.Customer || "").trim() === String(sCustomer || "").trim();
                });

                if (oCliente) {
                    oProj.setProperty("/oDatClient", Object.assign(
                        {},
                        oProj.getProperty("/oDatClient") || {},
                        oCliente
                    ));
                } else if (oDatClientResp && Array.isArray(oDatClientResp.oResults) && oDatClientResp.oResults.length) {
                    oProj.setProperty("/oDatClient", Object.assign(
                        {},
                        oProj.getProperty("/oDatClient") || {},
                        oDatClientResp.oResults[0]
                    ));
                }

                this._mergeCondicionPagoFromDataCustomerMod(oDatClientResp, sCustomer);
                this._ensureCondicionPagoClienteEnLista();

                const aDirecciones = oAddressResp && Array.isArray(oAddressResp.oResults)
                    ? oAddressResp.oResults
                    : [];

                const aAgencias = aDirecciones
                    .filter(function (r) {
                        return r.Customer && (r.Agencyaddress || r.Agencyname);
                    })
                    .map(function (r) {
                        return {
                            Customer: String(r.Customer || "").trim(),
                            Agencyaddress: r.Agencyaddress || "",
                            Agencyname: r.Agencyname || ""
                        };
                    });

                const fnNormDestino = function (id, text, name, cust, source) {
                    return {
                        Destinationid: String(id || "").trim(),
                        Destination: String(text || "").trim(),
                        Destinationname: String(name || "").trim(),
                        Customer: String(cust || "").trim(),
                        Source: source || "DESTINO"
                    };
                };

                const aDestino1 = aDirecciones
                    .filter(function (r) {
                        return r.Destinationid || r.Destination;
                    })
                    .map(function (r) {
                        return fnNormDestino(r.Destinationid, r.Destination, r.Destinationname, r.Customer, "DESTINO");
                    });

                const aDestino2 = aDirecciones
                    .filter(function (r) {
                        return r.Shippingdestinationid || r.Shippingdestination;
                    })
                    .map(function (r) {
                        return fnNormDestino(r.Shippingdestinationid, r.Shippingdestination, r.Shippingname, r.Customer, "WE");
                    });

                const aDestino3 = aDirecciones
                    .filter(function (r) {
                        return r.Finaldestinationid || r.Finaldestination;
                    })
                    .map(function (r) {
                        return fnNormDestino(r.Finaldestinationid, r.Finaldestination, r.Finaldestinationname, r.Customer, "Z0");
                    });

                const mDestinos = new Map();
                aDestino1.concat(aDestino2, aDestino3).forEach(function (d) {
                    if (d.Destinationid && !mDestinos.has(d.Destinationid)) {
                        mDestinos.set(d.Destinationid, d);
                    }
                });

                oProj.setProperty("/oAgenciasCliente", aAgencias);
                oProj.setProperty("/oAgenciasClienteFiltradas", aAgencias);
                oProj.setProperty("/oDestinosCliente", Array.from(mDestinos.values()));

                this._aplicarCondicionPagoDesdeReferencia(oCab);
                this._aplicarRecomendacionesDestinoYAgenciaTextil(oCab);
                this._capturarEntregaInicialModTextil();

                const aAnticipoItems = Array.isArray(oAnticipoResp && oAnticipoResp.oResults)
                    ? oAnticipoResp.oResults
                    : [];

                const fTotalAnticipo = aAnticipoItems.reduce(function (acc, it) {
                    const n = parseFloat(String(it.OutstandingAmount || "0").replace(/,/g, "").trim());
                    return acc + (isNaN(n) ? 0 : n);
                }, 0);

                oDataModel.setProperty("/Anticipo", {
                    items: aAnticipoItems,
                    OutstandingAmount: fTotalAnticipo,
                    Currency: aAnticipoItems[0]
                        ? aAnticipoItems[0].Currency
                        : oProj.getProperty("/inputForm/moneda")
                });

                const aNotaCreditoItems = Array.isArray(oNotaCreditoResp && oNotaCreditoResp.oResults)
                    ? oNotaCreditoResp.oResults
                    : [];

                const fTotalNotaCredito = aNotaCreditoItems.reduce(function (acc, it) {
                    const n = parseFloat(String(it.TotalAmount || "0").replace(/,/g, "").trim());
                    return acc + (isNaN(n) ? 0 : n);
                }, 0);

                oDataModel.setProperty("/NotaCredito", {
                    items: aNotaCreditoItems,
                    NotaCredito: fTotalNotaCredito,
                    Currency: aNotaCreditoItems[0]
                        ? aNotaCreditoItems[0].Currency
                        : oProj.getProperty("/inputForm/moneda"),
                    SalesOrganization: "1110"
                });

                oProj.refresh(true);

                const aMaterialesSim = oProj.getProperty("/oMaterial") || [];

                if (aMaterialesSim.length && typeof this.onSimulateOrder === "function") {
                    this._enrichPedidoModTextilConStock().finally(function () {
                        setTimeout(function () {
                            this.onSimulateOrder({
                                ocultarTabla: true
                            });
                        }.bind(this), 0);
                    }.bind(this));
                } else {
                    oProj.setProperty("/bSimulandoInicialTextil", false);
                }
            }.bind(this)).catch(function (oError) {
                void 0;

                const oProjError = this.getView().getModel("oModelProyect");
                if (oProjError) {
                    oProjError.setProperty("/bSimulandoInicialTextil", false);
                }

                this.getMessageBox("error", "No se pudo cargar el pedido de Textil para modificación.");
            }.bind(this)).finally(function () {
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
                const oUserResp = values[4];
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
                    const oVendResp = values[5]?.oResults;
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
            if (!oItem) {
                return;
            }

            const sKey = (oItem.getKey() || oItem.getText() || "").trim();
            const sText = (oItem.getText() || sKey).trim();

            if (!sKey) {
                return;
            }

            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModelProyect.getProperty("/oSelectDetail") || {};

            const bExists = (oMI.getTokens() || []).some(function (oToken) {
                return (oToken.getKey() || oToken.getText() || "").trim() === sKey;
            });

            if (!bExists) {
                oMI.addToken(new Token({
                    key: sKey,
                    text: sText
                }));
            }

            const aMaterialTokens = (oMI.getTokens() || [])
                .map(function (oToken) {
                    return (oToken.getKey() || oToken.getText() || "").trim();
                })
                .filter(Boolean);

            const aMaterialsModel = (oSelectDetail.aMaterials || [])
                .map(function (sMat) {
                    return (sMat || "").trim();
                })
                .filter(Boolean);

            const aMaterials = Array.from(new Set(
                aMaterialsModel.concat(aMaterialTokens).concat([sKey])
            ));

            oSelectDetail.aMaterials = aMaterials;
            oSelectDetail.material = aMaterials.length ? aMaterials[aMaterials.length - 1] : "";

            oModelProyect.setProperty("/oSelectDetail", oSelectDetail);

            oMI.setValue("");

            if (oMI.updateDomValue) {
                oMI.updateDomValue("");
            }
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

            const fnSyncMaterialTokens = function () {
                const aKeys = Array.from(new Set(
                    (oMI.getTokens() || [])
                        .map(function (oToken) {
                            return (oToken.getKey() || oToken.getText() || "").trim();
                        })
                        .filter(Boolean)
                ));

                oModelProyect.setProperty("/oSelectDetail/aMaterials", aKeys);
                oModelProyect.setProperty("/oSelectDetail/material", aKeys.length ? aKeys[aKeys.length - 1] : "");
            };

            setTimeout(fnSyncMaterialTokens, 0);
        },
        onArtTextilTokenUpdate: function (oEvent) {
            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");

            const aKeys = Array.from(new Set((oMI.getTokens() || []).map(t => t.getKey())));
            oModelProyect.setProperty("/oSelectDetail/aArtTextil", aKeys);
            oModelProyect.setProperty("/oSelectDetail/ArtTextil", aKeys.length ? aKeys[aKeys.length - 1] : "");
        },
        onDescriptionTokenUpdate: function (oEvent) {
            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");

            const aKeys = (oMI.getTokens() || []).map(t => t.getKey());
            oModelProyect.setProperty("/oSelectDetail/aDescriptions", aKeys);
            oModelProyect.setProperty("/oSelectDetail/Description", aKeys.length ? aKeys[aKeys.length - 1] : "");
        },

        onBrandTokenUpdate: function (oEvent) {
            const oMI = oEvent.getSource();
            const oModelProyect = this.getView().getModel("oModelProyect");

            const aKeys = (oMI.getTokens() || []).map(t => t.getKey());
            oModelProyect.setProperty("/oSelectDetail/aBrands", aKeys);
            oModelProyect.setProperty("/oSelectDetail/Brand", aKeys.length ? aKeys[aKeys.length - 1] : "");
        },
        onBuscarPress: async function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oSelectDetail = oModel.getProperty("/oSelectDetail") || {};
            const oInputForm = oModel.getProperty("/inputForm") || {};

            sap.ui.core.BusyIndicator.show(0);

            try {
                let aOrilloTokens = [];
                const oMiOrillo = this._byId(this.frgIdAddManualProduct + "--miOrillo");

                if (oMiOrillo) {
                    aOrilloTokens = (oMiOrillo.getTokens() || [])
                        .map(t => (t.getKey() || t.getText() || "").trim())
                        .filter(Boolean);
                }

                let aMaterialTokens = [];
                const oMiMaterial = this._byId(this.frgIdAddManualProduct + "--miMaterialTextil");

                if (oMiMaterial) {
                    aMaterialTokens = Array.from(new Set(
                        (oMiMaterial.getTokens() || [])
                            .map(function (oToken) {
                                return (oToken.getKey() || oToken.getText() || "").trim();
                            })
                            .filter(Boolean)
                    ));
                } else {
                    aMaterialTokens = Array.from(new Set(
                        (oSelectDetail.aMaterials || [])
                            .map(function (sMat) {
                                return (sMat || "").trim();
                            })
                            .filter(Boolean)
                    ));
                }

                oModel.setProperty("/oSelectDetail/aMaterials", aMaterialTokens);
                oModel.setProperty("/oSelectDetail/material", aMaterialTokens.length ? aMaterialTokens[aMaterialTokens.length - 1] : "");

                const jFilter = {
                    cbMaterialGroup: oInputForm.grupoMaterial ? [oInputForm.grupoMaterial] : [],
                    cbCodMaterial: aMaterialTokens,
                    cbBrand: oSelectDetail.aBrands || [],
                    cbTextileArticleQuality: oSelectDetail.aArtTextil || [],
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
        _loadMateriales: function (aFilters) {
            const that = this;

            try {
                let sUrl;
                if (that.local) {
                    const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/";
                    sUrl = that.getOwnerComponent().getManifestObject().resolveUri(sPath);
                } else {
                    sUrl = jQuery.sap.getModulePath(that.route) +
                        "/S4HANA_Materials/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/";
                }

                const oModel = new sap.ui.model.odata.v2.ODataModel(sUrl, {
                    useBatch: false,
                    defaultBindingMode: "TwoWay"
                });

                const oProjModel = that.getView().getModel("oModelProyect");
                sap.ui.core.BusyIndicator.show(0);

                const aAllResults = [];

                const _readNextPage = function (sNextUrl) {
                    return new Promise((resolve, reject) => {
                        const mParams = {
                            success: function (oData) {
                                const aPageResults = oData.results || [];
                                aAllResults.push(...aPageResults);

                                void 0;
                                void 0;
                                void 0;

                                if (oData.__next) {
                                    let sRelativeNext = oData.__next;

                                    // convertir a relativa si viene absoluta
                                    if (sRelativeNext.startsWith("http")) {
                                        const iIdx = sRelativeNext.indexOf("/MaterialsConsultation");
                                        if (iIdx >= 0) {
                                            sRelativeNext = sRelativeNext.substring(iIdx);
                                        } else {
                                            const iServiceIdx = sRelativeNext.indexOf("/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/");
                                            if (iServiceIdx >= 0) {
                                                sRelativeNext = sRelativeNext.substring(
                                                    iServiceIdx + "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES".length
                                                );
                                            }
                                        }
                                    }

                                    _readNextPage(sRelativeNext).then(resolve).catch(reject);
                                } else {
                                    resolve(aAllResults);
                                }
                            },
                            error: function (oError) {
                                reject(oError);
                            }
                        };

                        if (sNextUrl) {
                            oModel.read(sNextUrl, mParams);
                        } else {
                            oModel.read("/MaterialsConsultation", {
                                filters: aFilters,
                                success: mParams.success,
                                error: mParams.error
                            });
                        }
                    });
                };

                _readNextPage().then(async function (aResults) {
                    oProjModel.setProperty("/oMaterialBase", aResults);

                    if (!aResults.length) {
                        sap.ui.core.BusyIndicator.hide(0);
                        that.getMessageBox("warning", "No se encontraron materiales con los filtros aplicados.");
                        return;
                    }

                    try {
                        const aMaterials = Array.from(
                            new Set(aResults.map(r => r.Material).filter(Boolean))
                        );

                        void 0;
                        void 0;

                        oProjModel.setProperty("/oMaterialSelect", []);

                        const aTotalStock = await that._loadProductoBulk({
                            aMaterials: aMaterials,
                            SalesOrg: "1110",
                            Plant: "1000",
                            Pedven: true,
                            ChunkSize: 30,
                            PaintPartial: true
                        });

                        const aPreparedFinal = that._prepareDataForTextilesPedido(aTotalStock);
                        oProjModel.setProperty("/oMaterialSelect", aPreparedFinal);

                    } catch (err) {
                        that.getMessageBox("error", "Error al consultar stock (BULK).");
                    } finally {
                        sap.ui.core.BusyIndicator.hide(0);
                    }
                }).catch(function (oError) {
                    sap.ui.core.BusyIndicator.hide(0);
                    that.getMessageBox("error", "Error al cargar materiales desde el servicio (filtros internos).");
                });

            } catch (e) {
                sap.ui.core.BusyIndicator.hide(0);
                that.getMessageBox("error", "Error interno al cargar materiales.");
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

                                    const fStock = that._parseSapNumber
                                        ? that._parseSapNumber(sStockDispoRaw)
                                        : parseFloat(sStockDispoRaw) || 0;

                                    const fPend = that._parseSapNumber
                                        ? that._parseSapNumber(sStockPedidoRaw)
                                        : parseFloat(sStockPedidoRaw) || 0;

                                    aRes.push({
                                        Matnr: item.Materialnumber,
                                        Material: item.Materialnumber,
                                        Linea: oEtextil.Linea || "",
                                        Bezei: oEtextil.Bezei || "",
                                        Um: oEtextil.Um || "",

                                        // Valor crudo SAP
                                        StockDispoRaw: sStockDispoRaw,
                                        StockPedidoRaw: sStockPedidoRaw,

                                        // Valor para mostrar en pantalla
                                        StockDispo: that.formatNumber ? that.formatNumber(fStock) : String(fStock),
                                        StockPedido: that.formatNumber ? that.formatNumber(fPend) : String(fPend),

                                        // Valor numérico real para cálculos
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
                    useBatch: true,
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
                        const sUMVBolsa = "PAQ";

                        const oItemSAP = {
                            ClienteId: sClienteId,
                            ItmNumber: sNextItm,
                            Material: sMaterialBolsa,
                            TargetQu: sUMVBolsa,
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
                useBatch: true,
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
                    const sUMVBolsa = "PAQ";

                    const oItemSAP = {
                        ClienteId: sClienteId,
                        ItmNumber: sNextItm,
                        Material: sMaterialBolsa,
                        TargetQu: sUMVBolsa,
                        Plant: sPlant
                    };

                    const sCantBolsas = nBolsasInt.toString();

                    const oItemUI = {
                        ItmNumber: sNextItm,
                        Material: sMaterialBolsa,
                        cantidad: sCantBolsas,
                        UMV: sUMVBolsa,
                        TargetQu: sUMVBolsa,
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
                    oCantidades[sNextItm] = sCantBolsas;
                    oModel.setProperty("/oCantidades", oCantidades);

                    const oCantidadesByItm = oModel.getProperty("/oCantidadesByItm") || {};
                    oCantidadesByItm[sNextItm] = {
                        Material: sMaterialBolsa,
                        UMV: sUMVBolsa,
                        TargetQu: sUMVBolsa,
                        cantidad: sCantBolsas,
                        Cantidad: sCantBolsas
                    };
                    oModel.setProperty("/oCantidadesByItm", oCantidadesByItm);

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

            const bHaySeleccionValida = aSelected.some(function (oItem) {
                const oObj = oItem.getBindingContext("oModelProyect").getObject() || {};
                const sMat = String(oObj.Matnr || oObj.Material || "").trim();

                let sQtyRaw = (oObj.cantidad !== undefined && oObj.cantidad !== null) ? String(oObj.cantidad) : "";
                sQtyRaw = sQtyRaw.replace(",", ".").trim();

                const nQty = parseFloat(sQtyRaw);
                const fStock = oObj.StockDispoNum !== undefined
                    ? Number(oObj.StockDispoNum)
                    : this._parseSapNumber(oObj.StockDispo);

                if (!sMat || isNaN(nQty) || nQty <= 0) {
                    return false;
                }

                if (bIsCliente && fStock <= 0) {
                    return false;
                }

                if (bIsCliente && nQty > fStock) {
                    return false;
                }

                return true;
            }.bind(this));

            if (
                bHaySeleccionValida &&
                this._shouldValidateBolsas &&
                this._shouldValidateBolsas() &&
                this._tieneBolsaTextil()
            ) {
                this._confirmarEliminarBolsaPorCambioTextil(
                    "agregar materiales",
                    function () {
                        this._onAcceptProductManual(oEvent);
                    }.bind(this)
                );
                return;
            }

            const fnToItmNumber = function (v) {
                const n = parseInt(String(v || "0").trim(), 10);
                return isNaN(n) ? 0 : n;
            };

            let nMaxItm = parseInt(oModelProyect.getProperty("/oLastItmNumberMod") || "0", 10) || 0;

            const fnEvalMax = function (arr) {
                (arr || []).forEach(function (it) {
                    const n = fnToItmNumber(it.ItmNumber || it.OriginalItmNumber || it.Posicion);
                    if (n > nMaxItm) {
                        nMaxItm = n;
                    }
                });
            };

            fnEvalMax(aMaterialPrev);
            fnEvalMax(aMaterialUIPrev);
            fnEvalMax(oModelProyect.getProperty("/oMaterialDeletedMod") || []);
            fnEvalMax(oModelProyect.getProperty("/oMaterialOriginalModBase") || []);
            fnEvalMax(oModelProyect.getProperty("/oMaterialUIOriginalModBase") || []);

            aSelected.forEach((oItem) => {
                const oObj = oItem.getBindingContext("oModelProyect").getObject() || {};

                nMaxItm += 10;
                const sItmNumber = nMaxItm.toString().padStart(6, "0");

                const sMat = (oObj.Matnr || oObj.Material || "").toString().trim();
                if (!sMat) return;

                // ✅ TOMAR CANTIDAD REAL (del row o del mapa) y formatear
                let sQtyRaw = (oObj.cantidad !== undefined && oObj.cantidad !== null) ? String(oObj.cantidad) : "";
                sQtyRaw = sQtyRaw.replace(",", ".").trim();

                let nQty = parseFloat(sQtyRaw);
                const fStock = oObj.StockDispoNum !== undefined
                    ? Number(oObj.StockDispoNum)
                    : this._parseSapNumber(oObj.StockDispo);

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
                oCantidades[sMat] = sQty;

                oCantidades[sItmNumber] = sQty;

                const oCantidadesByItm = oModelProyect.getProperty("/oCantidadesByItm") || {};
                oCantidadesByItm[sItmNumber] = {
                    Material: sMat,
                    UMV: oObj.Um || oObj.UMV || "MTS",
                    TargetQu: oObj.Um || oObj.UMV || "MTS",
                    cantidad: sQty,
                    Cantidad: sQty
                };
                oModelProyect.setProperty("/oCantidadesByItm", oCantidadesByItm);

                aMaterialPrev.push({
                    ClienteId: oData.oDatClient?.Customer || "",
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    TargetQu: "MTS",
                    Plant: "1000"
                });

                // opcional: state según stock vs cantidad
                const bWarn = fStock < nQty;

                const sDescripcion = String(
                    oObj.Descriptions ||
                    oObj.descripcion ||
                    oObj.Description ||
                    oObj.Bezei ||
                    oObj.MaterialDescription ||
                    ""
                ).trim();

                aMaterialUIPrev.push({
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    codigo: sMat,
                    Matnr: sMat,
                    Descriptions: sDescripcion,
                    descripcion: sDescripcion,
                    Description: sDescripcion,
                    Bezei: sDescripcion,
                    cantidad: sQty,
                    UMV: oObj.Um || oObj.UMV || "MTS",
                    Brand: oObj.Brand || "",
                    StockDispo: oObj.StockDispo || "0",
                    Kbetr: 0,
                    subtotal: 0,
                    descuentos: 0,
                    impuesto: 0,
                    total: 0,
                    esBolsa: false,
                    state: bWarn ? "Warning" : "None"
                });
            });
            oModelProyect.setProperty("/oLastItmNumberMod", nMaxItm);
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

        _buildHeaderToPartnersTextilMod: function (oData, bIncluirEntregaInicial) {
            const oInputForm = oData.inputForm || {};
            const oCabeceraMod = oData.docModificarCabecera || {};
            const oDatClient = oData.oDatClient || {};

            const sCliente = String(
                oDatClient.Customer ||
                oCabeceraMod.Customer ||
                oCabeceraMod.SoldToParty ||
                oCabeceraMod.ClientId ||
                oInputForm.cliente ||
                oInputForm.Customer ||
                ""
            ).trim();

            const sTipoEntrega = String(oInputForm.tipoEntrega || "").trim();
            const sDestino = String(oInputForm.destinoTextil || "").trim();
            const sAgencia = String(oInputForm.direccionAgencia || "").trim();

            let sWE = "";

            switch (sTipoEntrega) {
                case "1":
                    // Cliente recoge: WE = Z0 = destino
                    sWE = sDestino || sCliente;
                    break;

                case "2":
                    // Despacho directo: WE = Z0 = destino
                    sWE = sDestino || sCliente;
                    break;

                case "3":
                    // Despacho agencia: WE = agencia, Z0 = destino
                    sWE = sAgencia || sDestino || sCliente;
                    break;

                default:
                    sWE = sDestino || sCliente;
                    break;
            }

            const aPartners = [
                {
                    ClientId: sCliente,
                    PartnRole: "AG",
                    PartnNumber: sCliente,
                    ItmNumber: "000000"
                },
                {
                    ClientId: sCliente,
                    PartnRole: "WE",
                    PartnNumber: sWE,
                    ItmNumber: "000000"
                }
            ];

            if (sDestino) {
                aPartners.push({
                    ClientId: sCliente,
                    PartnRole: "Z0",
                    PartnNumber: sDestino,
                    ItmNumber: "000000"
                });
            }

            const aVendPartners = this._buildPartnersVendedor ? this._buildPartnersVendedor() : [];
            if (Array.isArray(aVendPartners) && aVendPartners.length) {
                aPartners.push(...aVendPartners);
            }

            if (bIncluirEntregaInicial) {
                const oEntregaInicialMod = this.getView()
                    .getModel("oModelProyect")
                    .getProperty("/oEntregaInicialMod") || {};

                const sWEInicial = String(oEntregaInicialMod.we || "").trim();
                const sZ0Inicial = String(oEntregaInicialMod.z0 || "").trim();

                if (sWEInicial) {
                    aPartners.push({
                        ClientId: sCliente,
                        PartnRole: "WE",
                        PartnNumber: sWEInicial,
                        ItmNumber: "000000"
                    });
                }

                if (sZ0Inicial) {
                    aPartners.push({
                        ClientId: sCliente,
                        PartnRole: "Z0",
                        PartnNumber: sZ0Inicial,
                        ItmNumber: "000000"
                    });
                }
            }

            return aPartners.filter(function (p) {
                return p.ClientId && p.PartnRole && p.PartnNumber;
            });
        },

        _capturarEntregaInicialModTextil: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const oCapturaActual = oModel.getProperty("/oEntregaInicialMod") || {};
            if (oCapturaActual._capturado === true) {
                return;
            }

            const sTipoEntrega = String(oModel.getProperty("/inputForm/tipoEntrega") || "").trim();
            const sDestinoInicial = String(oModel.getProperty("/inputForm/destinoTextil") || "").trim();
            const sAgenciaInicial = String(oModel.getProperty("/inputForm/direccionAgencia") || "").trim();

            const sWEInicial = sTipoEntrega === "3"
                ? (sAgenciaInicial || sDestinoInicial)
                : sDestinoInicial;

            const sZ0Inicial = sDestinoInicial;

            if (!sWEInicial && !sZ0Inicial) {
                return;
            }

            oModel.setProperty("/oEntregaInicialMod", {
                _capturado: true,
                tipoEntrega: sTipoEntrega,
                destino: sDestinoInicial,
                agencia: sAgenciaInicial,
                we: sWEInicial,
                z0: sZ0Inicial
            });

            void 0;
        },
        onSimulateOrder: function (mOptions) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const bOcultarTablaDuranteSimulacion = !!(mOptions && mOptions.ocultarTabla);

            const fnFinalizarVistaSimulacion = function () {
                if (bOcultarTablaDuranteSimulacion) {
                    oModelProyect.setProperty("/bSimulandoInicialTextil", false);
                    oModelProyect.refresh(true);
                }
            };

            if (bOcultarTablaDuranteSimulacion) {
                oModelProyect.setProperty("/bSimulandoInicialTextil", true);
            }
            const oCantidades = oModelProyect.getProperty("/oCantidades") || {};
            const oData = oModelProyect.getData();
            const fnToNumber = function (v) {
                let s = String(v ?? "0").trim();

                if (!s) {
                    return 0;
                }

                s = s.replace(/\s/g, "");

                if (s.includes(",") && s.includes(".")) {
                    s = s.replace(/,/g, "");
                } else if (s.includes(",") && !s.includes(".")) {
                    s = s.replace(",", ".");
                }

                const n = parseFloat(s);
                return isNaN(n) ? 0 : n;
            };

            const fnGetQtyForSimulation = function (item) {
                const sItm = String(item.ItmNumber || "").trim();
                const sMat = String(item.Material || "").trim();

                return fnToNumber(
                    oCantidades[sItm] ||
                    oCantidades[sMat] ||
                    item.TargetQty ||
                    item.OrderQuantity ||
                    item.TargetQuantity ||
                    item.Quantity ||
                    item.Cantidad ||
                    item.cantidad ||
                    "0"
                );
            };
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
            if (bValidaBolsas) {

                if (!aMaterialSAP.length) {
                    fnFinalizarVistaSimulacion();
                    sap.m.MessageBox.warning(
                        "Debe agregar al menos un material para simular."
                    );
                    return;
                }
                const aBolsasUI = aMaterialUI.filter(function (it) {
                    return !!it.esBolsa;
                });
                if (aBolsasUI.length > 1) {
                    fnFinalizarVistaSimulacion();
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
            const aPartners = this._buildHeaderToPartnersTextilMod(oData, false);
            let aMaterialSim = (oData.oMaterial || []).slice();
            if (bValidaBolsas) {
                aMaterialSim.sort(function (a, b) {
                    const iA = parseInt(a.ItmNumber || "0", 10) || 0;
                    const iB = parseInt(b.ItmNumber || "0", 10) || 0;
                    return iA - iB;
                });
            }
            const aSchedule = aMaterialSim.map(item => {
                const sItm = String(item.ItmNumber || "").trim();
                let nQty = fnGetQtyForSimulation(item);

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
            const aHeaderToItem = aMaterialSim.map(function (item) {
                const sItm = String(item.ItmNumber || "").padStart(6, "0");
                const bIsBolsa = !!mBolsaByItem[sItm] || !!item.esBolsa;

                return {
                    ClienteId: item.ClienteId || oData.oDatClient?.Customer || "",
                    ItmNumber: sItm,
                    Material: item.Material || "",
                    TargetQu: bIsBolsa ? "PAQ" : (item.TargetQu || item.UMV || "MTS"),
                    Plant: item.Plant || "1000"
                };
            });

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
                ShipCond: String(oData.inputForm?.tipoEntrega || "").trim() === "1" ? "02" : "01",
                Pmnttrms: oData.inputForm?.cbCondPago || "",
                Currency: oData.inputForm?.moneda || "USD",
                OrdReason: oData.inputForm?.reasonOrd || "",
                PoMethod: "Z001",
                ...extraPoSupplem,
                HeaderToItem: aHeaderToItem,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toConditionEx: [{ ClientId: "", ItmNumber: "", CondType: "", CondValue: "0.00", Condvalue: "0.00" }],
                toItemsOut: [{ ClientId: "", ItmNumber: "", Material: "", ItemCateg: "", ShortText: "", ReqQty: "0.000", TargetQty: "0.000" }],
                HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
            });

            let oModelEntity =
                this.getView().getModel("oModelEntity") ||
                this.getOwnerComponent().getModel("oModelEntity");

            if (!oModelEntity) {
                let sBaseUrl = "";

                if (this.local) {
                    sBaseUrl = this.getOwnerComponent()
                        .getManifestObject()
                        .resolveUri("/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/");
                } else {
                    sBaseUrl = jQuery.sap.getModulePath(this.route) +
                        "/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/";
                }

                oModelEntity = new sap.ui.model.odata.v2.ODataModel(sBaseUrl, {
                    useBatch: true,
                    defaultBindingMode: "TwoWay"
                });

                this.getView().setModel(oModelEntity, "oModelEntity");
            }

            void 0;
            void 0;
            void 0;
            void 0;

            sap.ui.core.BusyIndicator.show(0);

            oModelEntity.create("/iHeaderSet", oPayload, {
                success: function (oResponse) {
                    void 0;
                    void 0;
                    void 0;

                    sap.ui.core.BusyIndicator.hide();

                    let aMaterialUI2 = oModelProyect.getProperty("/oMaterialUI") || [];
                    const aConditions = oResponse.toConditionEx?.results || [];
                    const aItemsOut = oResponse.toItemsOut?.results || [];
                    const aReturns = oResponse.HeaderToReturn?.results || [];

                    const fnNormItmBonus = function (v) {
                        const s = String(v || "").trim();
                        return s ? s.padStart(6, "0") : "";
                    };

                    const fnItmNumBonus = function (v) {
                        const n = parseInt(fnNormItmBonus(v), 10);
                        return isNaN(n) ? 0 : n;
                    };

                    const fnFindParentBonus = function (sBonusItm, sMaterial) {
                        const nBonus = fnItmNumBonus(sBonusItm);

                        let aCandidates = aMaterialUI2.filter(function (x) {
                            return !this._isBonificacionTextilItem(x) &&
                                fnItmNumBonus(x.ItmNumber || x.OriginalItmNumber) < nBonus;
                        }.bind(this));

                        const sMatNorm = String(sMaterial || "").trim();
                        const aSameMaterial = sMatNorm
                            ? aCandidates.filter(function (x) {
                                return String(x.Material || x.Matnr || "").trim() === sMatNorm;
                            })
                            : [];

                        if (aSameMaterial.length) {
                            aCandidates = aSameMaterial;
                        }

                        return aCandidates.sort(function (a, b) {
                            return fnItmNumBonus(b.ItmNumber || b.OriginalItmNumber) -
                                fnItmNumBonus(a.ItmNumber || a.OriginalItmNumber);
                        })[0] || null;
                    }.bind(this);

                    const oReturnError = aReturns.find(function (r) {
                        return String(r.Type || "").trim().toUpperCase() === "E";
                    });

                    if (oReturnError) {
                        fnFinalizarVistaSimulacion();
                        sap.m.MessageBox.error(oReturnError.Message || "SAP devolvió error en la simulación.");

                        oModelProyect.setProperty("/oDatCalculo", {
                            subtotalGeneral: "0.00",
                            embalaje: "0.00",
                            totalImpuesto: "0.00",
                            totalGeneral: "0.00"
                        });

                        return;
                    }

                    const bTieneCondicionPosicion = aConditions.some(function (cond) {
                        const sItm = String(cond.ItmNumber || "").trim();
                        return sItm && sItm !== "000000";
                    });

                    if (!aConditions.length || !bTieneCondicionPosicion) {
                        fnFinalizarVistaSimulacion();
                        sap.m.MessageBox.error("SAP no devolvió precios por posición para la simulación.");

                        oModelProyect.setProperty("/oDatCalculo", {
                            subtotalGeneral: "0.00",
                            embalaje: "0.00",
                            totalImpuesto: "0.00",
                            totalGeneral: "0.00"
                        });

                        return;
                    }

                    const mBonusItm = {};

                    aConditions.forEach(function (cond) {
                        if (String(cond.CondType || "").trim().toUpperCase() === "ZABO") {
                            const sItm = fnNormItmBonus(cond.ItmNumber);
                            if (sItm) {
                                mBonusItm[sItm] = true;
                            }
                        }
                    });

                    aMaterialUI2.forEach(function (item) {
                        const sItm = fnNormItmBonus(item.ItmNumber || item.OriginalItmNumber);

                        if (mBonusItm[sItm] || this._isBonificacionTextilItem(item)) {
                            const oParent = fnFindParentBonus(sItm, item.Material || item.Matnr);
                            this._markTextilBonusItem(item, oParent && (oParent.ItmNumber || oParent.OriginalItmNumber));
                        }
                    }.bind(this));

                    aMaterialUI2 = aMaterialUI2.filter(function (item) {
                        if (!this._isBonificacionTextilItem(item)) {
                            return true;
                        }

                        const sItm = fnNormItmBonus(item.ItmNumber || item.OriginalItmNumber);

                        const bSigueEnCondiciones = !!mBonusItm[sItm];

                        const bSigueEnItemsOut = aItemsOut.some(function (io) {
                            return fnNormItmBonus(io.ItmNumber) === sItm;
                        });

                        return bSigueEnCondiciones || bSigueEnItemsOut;
                    }.bind(this));

                    aItemsOut.forEach(function (io) {
                        const sItm = fnNormItmBonus(io.ItmNumber);

                        if (!sItm || sItm === "000000") {
                            return;
                        }

                        const bExisteUI = aMaterialUI2.some(function (ui) {
                            return fnNormItmBonus(ui.ItmNumber || ui.OriginalItmNumber) === sItm;
                        });

                        if (bExisteUI) {
                            return;
                        }

                        const oParent = fnFindParentBonus(sItm, io.Material);
                        const sMat = io.Material || (oParent && oParent.Material) || "";
                        const nCantidad = fnToNumber(io.ReqQty != null ? io.ReqQty : io.TargetQty);

                        aMaterialUI2.push(this._markTextilBonusItem({
                            ItmNumber: sItm,
                            Posicion: sItm,
                            OriginalItmNumber: sItm,
                            Material: sMat,
                            codigo: sMat,
                            Descriptions: io.ShortText || (oParent && oParent.Descriptions) || sMat,
                            descripcion: io.ShortText || (oParent && oParent.descripcion) || sMat,
                            Description: io.ShortText || (oParent && oParent.Description) || sMat,
                            cantidad: nCantidad.toFixed(3),
                            UMV: oParent ? oParent.UMV : "MTS",
                            TargetQu: oParent ? oParent.TargetQu : "MTS",
                            Brand: oParent ? oParent.Brand : "",
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
                            TipoOperacion: "N",
                            Deleted: false,
                            state: "None"
                        }, oParent && (oParent.ItmNumber || oParent.OriginalItmNumber)));
                    }.bind(this));

                    const aMaterialSinBonificacion = (oModelProyect.getProperty("/oMaterial") || []).filter(function (item) {
                        const sItm = fnNormItmBonus(item.ItmNumber || item.OriginalItmNumber);
                        return !mBonusItm[sItm] && !this._isBonificacionTextilItem(item);
                    }.bind(this));

                    oModelProyect.setProperty("/oMaterial", aMaterialSinBonificacion);

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
                            case "ZDSC":
                            case "ZDCP":
                            case "ZATG":
                            case "ZARI":
                            case "ZDVV":
                                oItemUI.descuentos = (oItemUI.descuentos || 0) + fTotalCond;
                                break;
                            case "MWST":
                                oItemUI.impuesto = (oItemUI.impuesto || 0) + fTotalCond;
                                totalImpuesto += fTotalCond;
                                break;
                            case "ZABO":
                                this._markTextilBonusItem(oItemUI);
                                oItemUI.descuentos = (oItemUI.descuentos || 0) + fTotalCond;
                                break;

                            case "ZREP":
                                embalajeTotal += fTotalCond;
                                break;
                        }
                    });
                    const fnGetSumCondBonus = function (sCondType, sItmNumber) {
                        return aConditions
                            .filter(function (c) {
                                return String(c.CondType || "").trim().toUpperCase() === sCondType &&
                                    (!sItmNumber || fnNormItmBonus(c.ItmNumber) === fnNormItmBonus(sItmNumber));
                            })
                            .reduce(function (acc, c) {
                                return acc + fnToNumber(c.Condvalue !== undefined ? c.Condvalue : c.CondValue);
                            }, 0);
                    };

                    const fnGetNetoBonus = function (sItmNumber) {
                        return fnGetSumCondBonus("ZPRE", sItmNumber) + fnGetSumCondBonus("ZABO", sItmNumber);
                    };

                    aMaterialUI2.forEach(item => {
                        const oItemOut = aItemsOut.find(function (io) {
                            return fnNormItmBonus(io.ItmNumber) === fnNormItmBonus(item.ItmNumber || item.OriginalItmNumber);
                        });

                        if (oItemOut && (oItemOut.ReqQty != null || oItemOut.TargetQty != null)) {
                            item.cantidad = fnToNumber(oItemOut.ReqQty != null ? oItemOut.ReqQty : oItemOut.TargetQty).toFixed(3);
                        }

                        if (this._isBonificacionTextilItem(item)) {
                            const fNetoBonus = fnGetNetoBonus(item.ItmNumber || item.OriginalItmNumber);

                            item.precioBase = fNetoBonus;
                            item.precioUnit = 0;
                            item.descuentos = 0;
                            item.impuesto = 0;
                            item.importeTabla = fNetoBonus;
                            item.subtotal = fNetoBonus;
                            item.total = fNetoBonus;

                            this._markTextilBonusItem(item);
                            return;
                        }

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
                        const fQty = parseFloat(item.cantidad || "0") || 0;
                        if (item.esBolsa) {
                            const fUnitBolsa = parseFloat(item.precioUnit || "0") || 0;
                            item.precioBase = fQty * fUnitBolsa;
                        }

                        const fBase = item.precioBase || 0;
                        const fDescuentos = item.descuentos || 0;
                        const fImpuesto = item.impuesto || 0;

                        item.importeTabla = fBase + fDescuentos;
                        item.subtotal = item.importeTabla;
                        item.total = item.subtotal + fImpuesto;
                    });

                    let subtotalGeneral = 0, totalGeneral = 0;
                    aMaterialUI2.forEach(item => {
                        subtotalGeneral += item.subtotal || 0;
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
                    fnFinalizarVistaSimulacion();
                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    fnFinalizarVistaSimulacion();
                    sap.m.MessageBox.error(" Error en la simulación");
                }
            });
        },
        _createOrder: function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelUser = oView.getModel("oModelUser");
            const oData = oModelProyect && oModelProyect.getData ? (oModelProyect.getData() || {}) : {};
            const oCantidades = oModelProyect ? (oModelProyect.getProperty("/oCantidades") || {}) : {};
            const fnToNumber = function (v) {
                let s = String(v ?? "0").trim();

                if (!s) {
                    return 0;
                }

                s = s.replace(/\s/g, "");

                if (s.includes(",") && s.includes(".")) {
                    s = s.replace(/,/g, "");
                } else if (s.includes(",") && !s.includes(".")) {
                    s = s.replace(",", ".");
                }

                const n = parseFloat(s);
                return isNaN(n) ? 0 : n;
            };

            const fnGetQtyForSimulation = function (item) {
                const sItm = String(item.ItmNumber || "").trim();
                const sMat = String(item.Material || "").trim();

                return fnToNumber(
                    oCantidades[sItm] ||
                    oCantidades[sMat] ||
                    item.TargetQty ||
                    item.OrderQuantity ||
                    item.TargetQuantity ||
                    item.Quantity ||
                    item.Cantidad ||
                    item.cantidad ||
                    "0"
                );
            };
            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = this._formatDateForSAP(sFechaActual);
            const sCliente = oData.oDatClient?.Customer || "";
            const sTipDoc = oData.inputForm?.tipDocument || "";
            const sSalesOrg = oData.oDatClient?.SalesOrganization || "";
            const sDivision = oData.oDatClient?.Division || "";
            const sTipoEntrega = oData.inputForm?.tipoEntrega;
            const bContratoSeparacion = (sTipDoc === "ZACN" || sTipDoc === "ZPSE");

            const sVbelnPedido = String(
                oData.pedidoModificar ||
                oModelProyect.getProperty("/pedidoModificar") ||
                oData.docModificarCabecera?.SalesDocument ||
                oData.docModificarCabecera?.VbelnPedido ||
                oData.docModificarCabecera?.SalesOrder ||
                ""
            ).trim();

            if (!sVbelnPedido) {
                sap.m.MessageBox.error("No se encontró el número de pedido a modificar.");
                return;
            }
            const sTOperation = "MP";
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

            // 2) PARTNERS - misma lógica de Cerámicos
            const sTipoEntregaMod = String(oData.inputForm?.tipoEntrega || "").trim();
            const aPartners = this._buildHeaderToPartnersTextilMod(oData, true);
            const sShipCondMod = sTipoEntregaMod === "1" ? "02" : "01";

            // 🔹 3) MAPA ÍTEM → BOLSA
            const mBolsaByItem = {};
            (aMaterialUI || []).forEach(function (it) {
                if (it.ItmNumber) {
                    mBolsaByItem[it.ItmNumber] = !!it.esBolsa;
                }
            });

            const fnNormItm = function (v) {
                const s = String(v || "").trim();
                return s ? s.padStart(6, "0") : "";
            };

            const aOriginalBase = oModelProyect.getProperty("/oMaterialOriginalModBase") || [];
            const aOriginalUIBase = oModelProyect.getProperty("/oMaterialUIOriginalModBase") || [];
            const oCantidadesOriginalByItm = oModelProyect.getProperty("/oCantidadesByItmOriginalModBase") || {};
            const aDeletedItems = oModelProyect.getProperty("/oMaterialDeletedMod") || [];

            const mOriginalByItm = {};
            const mOriginalQtyByItm = {};
            const mOriginalUIByItm = {};
            const mUIByItm = {};

            aOriginalUIBase.forEach(function (row) {
                const sItm = fnNormItm(row.ItmNumber || row.OriginalItmNumber);
                if (sItm) {
                    mOriginalUIByItm[sItm] = row;
                }
            });

            aMaterialUI.forEach(function (row) {
                const sItm = fnNormItm(row.ItmNumber || row.OriginalItmNumber);
                if (sItm) {
                    mUIByItm[sItm] = row;
                }
            });

            aOriginalBase.forEach(function (it) {
                const sItm = fnNormItm(it.ItmNumber || it.OriginalItmNumber);

                if (!sItm) {
                    return;
                }

                mOriginalByItm[sItm] = true;

                const oOrigCant = oCantidadesOriginalByItm[sItm] || {};
                const oOrigUI = mOriginalUIByItm[sItm] || {};

                const nQtyOriginal = fnToNumber(
                    oOrigCant.cantidad ||
                    oOrigCant.Cantidad ||
                    oOrigUI.cantidad ||
                    oOrigUI.Cantidad ||
                    it.TargetQty ||
                    it.cantidad ||
                    it.Cantidad ||
                    "0"
                );

                mOriginalQtyByItm[sItm] = nQtyOriginal;
            });

            const fnGetQtyFinalByItem = function (item) {
                const sItm = fnNormItm(item.ItmNumber || item.OriginalItmNumber);
                const sMat = String(item.Material || "").trim();
                const oCantByItm = oModelProyect.getProperty("/oCantidadesByItm") || {};
                const oCantItm = oCantByItm[sItm] || {};
                const oUI = mUIByItm[sItm] || {};

                return fnToNumber(
                    oCantItm.cantidad ||
                    oCantItm.Cantidad ||
                    oCantidades[sItm] ||
                    oUI.cantidad ||
                    oUI.Cantidad ||
                    item.TargetQty ||
                    item.cantidad ||
                    item.Cantidad ||
                    oCantidades[sMat] ||
                    "0"
                );
            };

            const aItems = [];
            const aSchedule = [];

            const aItemsParaGuardar = [].concat(aMaterialSAP, aDeletedItems).filter(function (item) {
                return !this._isBonificacionTextilItem(item);
            }.bind(this));

            aItemsParaGuardar.forEach(function (item) {
                const sMat = String(item.Material || "").trim();
                const sItm = fnNormItm(item.ItmNumber || item.OriginalItmNumber);

                if (!sMat || !sItm) {
                    return;
                }

                const bDeletedItem = item.Deleted === true || String(item.TipoOperacion || "").trim() === "D";
                const bExistiaAntes = !!mOriginalByItm[sItm] || !!item.OriginalItmNumber;

                let sTipoOperacionItem = String(item.TipoOperacion || "").trim();

                if (bDeletedItem) {
                    sTipoOperacionItem = "D";
                } else if (!sTipoOperacionItem || sTipoOperacionItem === "N") {
                    sTipoOperacionItem = bExistiaAntes ? "U" : "I";
                }

                let nQtyFinal = fnGetQtyFinalByItem(item);
                const bIsBolsaItem = !!mBolsaByItem[sItm];

                if (bIsBolsaItem) {
                    nQtyFinal = Math.floor(nQtyFinal + 1e-6);
                }

                let nQtyPayload = nQtyFinal;

                if (sTipoOperacionItem === "U") {
                    const nQtyOriginal = fnToNumber(mOriginalQtyByItm[sItm] || "0");

                    if (nQtyOriginal > 0 && Math.abs(nQtyFinal - nQtyOriginal) < 0.0005) {
                        return;
                    }

                    nQtyPayload = nQtyFinal;
                }

                if (sTipoOperacionItem !== "D" && nQtyFinal <= 0) {
                    return;
                }

                const oUIItem = mUIByItm[sItm] || {};
                const bIsBolsaPayload = bIsBolsaItem || !!item.esBolsa || !!oUIItem.esBolsa;

                const oItem = {
                    ClienteId: item.ClienteId || sCliente,
                    ItmNumber: sItm,
                    Material: sMat,
                    TargetQu: bIsBolsaPayload ? "PAQ" : (item.TargetQu || item.UMV || oUIItem.TargetQu || oUIItem.UMV || "MTS"),
                    Plant: item.Plant || "1000",
                    TipoOperacion: sTipoOperacionItem
                };

                if (bContratoSeparacion && sTipoOperacionItem !== "D") {
                    oItem.TargetQty = nQtyPayload.toFixed(3);
                }

                aItems.push(oItem);

                if (sTipoOperacionItem !== "D" && !bContratoSeparacion) {
                    aSchedule.push({
                        ClientId: item.ClienteId || sCliente,
                        ItmNumber: sItm,
                        SchedLine: "0001",
                        ReqQty: nQtyPayload.toFixed(3)
                    });
                }
            });

            void 0;
            void 0;
            void 0;
            void 0;
            // 6) TEXTOS CABECERA (sin repetir por ítem)
            const aTexts = [];
            const sObsPedido = oData.inputForm?.obsPedido || "";
            const sObsDelivery = oData.inputForm?.obsDelivery || "";

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

            const oPayload = this._cleanPayload({
                ClientId: sCliente,
                TOperation: sTOperation,
                VbelnPedido: sVbelnPedido,
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
                Pmnttrms: oData.inputForm?.cbCondPago || "",
                PurchNoC: oData.inputForm?.purchaseOrder || "",
                ShipCond: sShipCondMod,
                Currency: oData.inputForm?.moneda || "USD",
                OrdReason: oData.inputForm?.reasonOrd || "",
                HeaderToItem: aItems,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toText: aTexts,
                HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
            });


            if (!Array.isArray(oPayload.HeaderToItem)) {
                oPayload.HeaderToItem = [];
            }

            if (!Array.isArray(oPayload.HeaderToSchedule)) {
                oPayload.HeaderToSchedule = [];
            }

            if (!Array.isArray(oPayload.toText)) {
                oPayload.toText = [];
            }

            if (!Array.isArray(oPayload.HeaderToPartners)) {
                oPayload.HeaderToPartners = [];
            }

            void 0;
            void 0;
            void 0;
            void 0;
            void 0;

            const oModelEntity = oView.getModel("oModelEntity");
            sap.ui.core.BusyIndicator.show(0);

            oModelEntity.create("/iHeaderSet", oPayload, {
                success: function (oResponse) {
                    sap.ui.core.BusyIndicator.hide();

                    const aMensajes = this._getSapReturnMessages(oResponse);
                    const aErrores = aMensajes.filter(this._isSapReturnError.bind(this));

                    if (aErrores.length > 0) {
                        const sDetalleSap = this._formatSapReturnMessages(aMensajes);

                        sap.m.MessageBox.error(
                            "Hubo un error al registrar el pedido." +
                            (sDetalleSap ? "\n\n" + sDetalleSap : ""),
                            {
                                title: "Error al modificar pedido"
                            }
                        );

                        return;
                    }

                    const sNumDocumento = this._extractSalesDocumentFromSapReturn(aMensajes) || sVbelnPedido;

                    if (!sNumDocumento) {
                        const sDetalleSap = this._formatSapReturnMessages(aMensajes);

                        sap.m.MessageBox.error(
                            "Hubo un error al registrar el pedido.\n\nSAP no devolvió número de pedido." +
                            (sDetalleSap ? "\n\nMensajes SAP:\n" + sDetalleSap : ""),
                            {
                                title: "Error al modificar pedido"
                            }
                        );

                        return;
                    }

                    const fnAfterOk = function () {
                        this._goToSeguimientoPrincipal();
                    }.bind(this);

                    sap.m.MessageBox.success(
                        "Pedido modificado exitosamente.\nNúmero de pedido: " + sNumDocumento,
                        {
                            title: "Pedido modificado",
                            onClose: fnAfterOk
                        }
                    );

                }.bind(this),

                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();

                    const sDetalle = this._extractODataErrorDetail(oError);

                    sap.m.MessageBox.error(
                        "Hubo un error al registrar el pedido." +
                        (sDetalle ? "\n\n" + sDetalle : ""),
                        {
                            title: "Error al modificar pedido"
                        }
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
        _isBolsaTextilItem: function (oItem) {
            oItem = oItem || {};

            if (oItem.esBolsa === true) {
                return true;
            }

            const sUMV = String(
                oItem.TargetQu ||
                oItem.UMV ||
                oItem.Um ||
                oItem.Uom ||
                ""
            ).trim().toUpperCase();

            const sTexto = [
                oItem.SalesDocumentItemText,
                oItem.MaterialDescription,
                oItem.ProductDescription,
                oItem.Description,
                oItem.Descriptions,
                oItem.descripcion,
                oItem.Descripcion,
                oItem.MaterialText,
                oItem.Bezei
            ].join(" ").toUpperCase();

            return sUMV === "PAQ" || sTexto.indexOf("BOLSA") >= 0;
        },

        _isBonificacionTextilItem: function (oItem) {
            oItem = oItem || {};

            if (oItem.isExtraFromSAP === true || oItem._isBonificacionSAP === true) {
                return true;
            }

            const sBonus = String(
                oItem.Bonus ||
                oItem.Boni ||
                oItem.Bonificacion ||
                oItem.Bonification ||
                ""
            ).trim().toUpperCase();

            if (sBonus.indexOf("BONI") >= 0 || sBonus === "X") {
                return true;
            }

            const sCondType = String(oItem.CondType || oItem.ConditionType || "").trim().toUpperCase();
            if (sCondType === "ZABO") {
                return true;
            }

            const sItemCateg = String(
                oItem.ItemCateg ||
                oItem.ItemCategory ||
                oItem.SalesDocumentItemCategory ||
                oItem.SalesDocumentItemType ||
                oItem.Pstyv ||
                oItem.PSTYV ||
                ""
            ).trim().toUpperCase();

            if (["TANN", "ZANN", "ZBON", "ZB01", "ZABO", "BONI"].includes(sItemCateg)) {
                return true;
            }

            const sTexto = [
                oItem.ShortText,
                oItem.SalesDocumentItemText,
                oItem.MaterialDescription,
                oItem.ProductDescription,
                oItem.Description,
                oItem.Descriptions,
                oItem.descripcion,
                oItem.Descripcion,
                oItem.MaterialText,
                oItem.Bezei
            ].join(" ").toUpperCase();

            return sTexto.indexOf("BONIF") >= 0;
        },

        _markTextilBonusItem: function (oItem, sParentItmNumber) {
            if (!oItem) {
                return oItem;
            }

            oItem.isExtraFromSAP = true;
            oItem._isBonificacionSAP = true;
            oItem.Bonus = oItem.Bonus || "Boni";

            const sParent = String(sParentItmNumber || "").trim();
            if (sParent && !oItem.ParentItmNumber) {
                oItem.ParentItmNumber = sParent.padStart(6, "0");
            }

            return oItem;
        },

        _tieneBolsaTextil: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return false;
            }

            const aMatUI = oModel.getProperty("/oMaterialUI") || [];

            return aMatUI.some(function (oItem) {
                return this._isBolsaTextilItem(oItem);
            }.bind(this));
        },

        _registrarItemEliminadoModTextil: function (oItemUI, oItemSAP) {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return false;
            }

            oItemUI = oItemUI || {};
            oItemSAP = oItemSAP || {};

            const fnNormItm = function (v) {
                const s = String(v || "").trim();
                return s ? s.padStart(6, "0") : "";
            };

            const sItm = fnNormItm(
                oItemSAP.ItmNumber ||
                oItemSAP.OriginalItmNumber ||
                oItemUI.ItmNumber ||
                oItemUI.OriginalItmNumber
            );

            const sMat = String(
                oItemSAP.Material ||
                oItemUI.Material ||
                oItemUI.Matnr ||
                ""
            ).trim();

            if (!sItm || !sMat) {
                return false;
            }

            const aOriginalBase = oModel.getProperty("/oMaterialOriginalModBase") || [];

            const bExistiaAntes = aOriginalBase.some(function (oItem) {
                return fnNormItm(oItem.ItmNumber || oItem.OriginalItmNumber) === sItm;
            });

            if (!bExistiaAntes) {
                return false;
            }

            let aDeleted = oModel.getProperty("/oMaterialDeletedMod") || [];

            const bYaExiste = aDeleted.some(function (oItem) {
                return fnNormItm(oItem.ItmNumber || oItem.OriginalItmNumber) === sItm;
            });

            if (bYaExiste) {
                return false;
            }

            const bEsBolsa = this._isBolsaTextilItem(oItemUI) || this._isBolsaTextilItem(oItemSAP);

            aDeleted.push({
                ClienteId: oItemSAP.ClienteId || oModel.getProperty("/oDatClient/Customer") || "",
                ItmNumber: sItm,
                OriginalItmNumber: sItm,
                Material: sMat,
                TargetQu: bEsBolsa ? "PAQ" : (oItemSAP.TargetQu || oItemUI.TargetQu || oItemUI.UMV || "MTS"),
                Plant: oItemSAP.Plant || "1000",
                TipoOperacion: "D",
                Deleted: true,
                esBolsa: bEsBolsa
            });

            oModel.setProperty("/oMaterialDeletedMod", aDeleted);

            return true;
        },

        _confirmarEliminarBolsaPorCambioTextil: function (sAccion, fnContinuar) {
            const bAplicaBolsas = this._shouldValidateBolsas ? this._shouldValidateBolsas() : false;

            if (!bAplicaBolsas || !this._tieneBolsaTextil()) {
                if (typeof fnContinuar === "function") {
                    fnContinuar();
                }
                return;
            }

            sap.m.MessageBox.confirm(
                "Este pedido tiene una posición de paquete de bolsas. Al " + sAccion +
                ", la bolsa debe eliminarse porque se recalculará cuando finalice la modificación del pedido. ¿Desea eliminar la bolsa y continuar?",
                {
                    title: "Confirmar eliminación de bolsa",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction !== sap.m.MessageBox.Action.YES) {
                            sap.m.MessageToast.show("No se aplicó el cambio porque la bolsa no fue eliminada.");
                            return;
                        }

                        this._removeBolsaActual({
                            registrarEliminacion: true
                        });

                        if (typeof fnContinuar === "function") {
                            fnContinuar();
                        }
                    }.bind(this)
                }
            );
        },

        _removeBolsaActual: function (mOptions) {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return 0;
            }

            const bRegistrarEliminacion = !!(mOptions && mOptions.registrarEliminacion);

            let aMatSAP = oModel.getProperty("/oMaterial") || [];
            let aMatUI = oModel.getProperty("/oMaterialUI") || [];
            let oCant = oModel.getProperty("/oCantidades") || {};
            let oCantByItm = oModel.getProperty("/oCantidadesByItm") || {};

            const fnNormItm = function (v) {
                const s = String(v || "").trim();
                return s ? s.padStart(6, "0") : "";
            };

            const aBolsaUI = aMatUI.filter(function (oItem) {
                return this._isBolsaTextilItem(oItem);
            }.bind(this));

            if (!aBolsaUI.length) {
                return 0;
            }

            const mBolsaItm = {};

            aBolsaUI.forEach(function (oBolsaUI) {
                const sItm = fnNormItm(oBolsaUI.ItmNumber || oBolsaUI.OriginalItmNumber);
                const sMat = String(oBolsaUI.Material || oBolsaUI.Matnr || "").trim();

                if (sItm) {
                    mBolsaItm[sItm] = true;
                }

                const oBolsaSAP = aMatSAP.find(function (oItemSAP) {
                    return fnNormItm(oItemSAP.ItmNumber || oItemSAP.OriginalItmNumber) === sItm;
                }) || {};

                if (bRegistrarEliminacion) {
                    this._registrarItemEliminadoModTextil(oBolsaUI, oBolsaSAP);
                }

                if (sItm && oCant[sItm] !== undefined) {
                    delete oCant[sItm];
                }

                if (sMat && oCant[sMat] !== undefined) {
                    delete oCant[sMat];
                }

                if (sItm && oCantByItm[sItm] !== undefined) {
                    delete oCantByItm[sItm];
                }
            }.bind(this));

            aMatUI = aMatUI.filter(function (oItem) {
                const sItm = fnNormItm(oItem.ItmNumber || oItem.OriginalItmNumber);
                return !mBolsaItm[sItm] && !this._isBolsaTextilItem(oItem);
            }.bind(this));

            aMatSAP = aMatSAP.filter(function (oItem) {
                const sItm = fnNormItm(oItem.ItmNumber || oItem.OriginalItmNumber);
                return !mBolsaItm[sItm] && !this._isBolsaTextilItem(oItem);
            }.bind(this));

            oModel.setProperty("/oMaterial", aMatSAP);
            oModel.setProperty("/oMaterialUI", aMatUI);
            oModel.setProperty("/oCantidades", oCant);
            oModel.setProperty("/oCantidadesByItm", oCantByItm);
            oModel.refresh(true);

            return aBolsaUI.length;
        },

        _revisarBolsasTrasCambioCantidad: function () {
            return;
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
                : this._parseSapNumber(oObject.StockDispo);

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
            const that = this;

            sap.m.MessageBox.confirm(
                "¿Desea salir de la modificación del pedido?",
                {
                    title: "Confirmación",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction !== sap.m.MessageBox.Action.YES) {
                            return;
                        }

                        that._goToSeguimientoPrincipal();
                    }
                }
            );
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

            if (sValue.endsWith("-")) {
                bNegative = true;
                sValue = sValue.slice(0, -1);
            }

            if (sValue.startsWith("-")) {
                bNegative = true;
                sValue = sValue.slice(1);
            }

            if (sValue.includes(",") && sValue.includes(".")) {
                if (sValue.lastIndexOf(".") > sValue.lastIndexOf(",")) {
                    sValue = sValue.replace(/,/g, "");
                } else {
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

        _onPressEditDetail: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect");
            const oContext = oEvent.getSource().getParent().getBindingContext("oModelProyect");
            const oSelectedObj = oContext.getObject() || {};

            if (this._isBonificacionTextilItem(oSelectedObj)) {
                sap.m.MessageToast.show("La posición de bonificación es informativa y no se puede editar.");
                return;
            }

            const sMatnr = oSelectedObj.Matnr || oSelectedObj.Material || "";
            const sDesc = oSelectedObj.Descriptions || oSelectedObj.Maktx || oSelectedObj.Bezei || "";
            const sStockRaw = oSelectedObj.StockDispoRaw ?? oSelectedObj.StockDispo ?? oSelectedObj.Stock ?? "0";
            const sUMV = oSelectedObj.UMV || oSelectedObj.Um || oSelectedObj.Uom || "MTS";
            const sCant = (oSelectedObj.cantidad !== undefined && oSelectedObj.cantidad !== null && oSelectedObj.cantidad !== "")
                ? oSelectedObj.cantidad
                : "1";

            let nStockActual = Number(oSelectedObj.StockDispoNum);
            if (!Number.isFinite(nStockActual)) {
                nStockActual = this._parseSapNumber(sStockRaw);
            }

            const nCantidadActual = this._parseSapNumber(sCant);
            oModel.setProperty("/oMaterialesSelectedMatnr", sMatnr);
            oModel.setProperty("/oMaterialesSelectedDesc", sDesc);

            oModel.setProperty("/oSelecTableDetalle", Object.assign({}, oSelectedObj, {
                Matnr: sMatnr,
                Material: sMatnr,
                StockDispo: this._formatSapStock(nStockActual, 3),
                StockDispoRaw: sStockRaw,
                StockDispoNum: nStockActual,
                StockDispoOriginalNum: nStockActual,
                StockDispoView: this._formatSapStock(nStockActual, 3),
                CantidadOriginalNum: nCantidadActual,
                UMV: sUMV,
                Brand: oSelectedObj.Brand || "",
                cantidad: sCant
            }));

            if (this._oDialogEdit) {
                this._oDialogEdit.destroy();
                this._oDialogEdit = null;
            }

            this._oDialogEdit = sap.ui.xmlfragment(
                oView.getId(),
                "aris.com.clientes.seguimiento.pe.view.dialogs.EditDetailT",
                this
            );

            oView.addDependent(this._oDialogEdit);
            this._oDialogEdit.open();
        },

        _afterOpenEditTextil: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oDet = oModel.getProperty("/oSelecTableDetalle") || {};

            let nStockOriginal = Number(oDet.StockDispoOriginalNum);
            if (!Number.isFinite(nStockOriginal)) {
                nStockOriginal = this._parseSapNumber(
                    oDet.StockDispoRaw !== undefined ? oDet.StockDispoRaw : oDet.StockDispo
                );
            }

            let nCantidadOriginal = Number(oDet.CantidadOriginalNum);
            if (!Number.isFinite(nCantidadOriginal)) {
                nCantidadOriginal = this._parseSapNumber(oDet.cantidad);
            }

            const sStockView = this._formatSapStock(nStockOriginal, 3);

            oModel.setProperty("/oSelecTableDetalle/StockDispoOriginalNum", nStockOriginal);
            oModel.setProperty("/oSelecTableDetalle/StockDispoNum", nStockOriginal);
            oModel.setProperty("/oSelecTableDetalle/StockDispo", sStockView);
            oModel.setProperty("/oSelecTableDetalle/StockDispoView", sStockView);
            oModel.setProperty("/oSelecTableDetalle/CantidadOriginalNum", nCantidadOriginal);

            oModel.checkUpdate(true);

            const oInputStock =
                this.byId("inputStock") ||
                sap.ui.getCore().byId(this.getView().getId() + "--inputStock");

            if (oInputStock) {
                oInputStock.setValue(sStockView);
            }
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

                const oInputStock =
                    this.byId("inputStock") ||
                    sap.ui.getCore().byId(this.getView().getId() + "--inputStock");

                if (oInputStock) {
                    oInputStock.setValue(sStockOriginal);
                }

                return;
            }

            if (!Number.isFinite(nCantidadOriginal) || !Number.isFinite(nStockOriginal)) {
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

            const oInputStock =
                this.byId("inputStock") ||
                sap.ui.getCore().byId(this.getView().getId() + "--inputStock");

            if (oInputStock) {
                oInputStock.setValue(sStockCalculado);
            }

            void 0;
        },

        _onAcceptEditCantidad: function (oEvent) {
            const oModel = this.getView().getModel("oModelProyect");
            const oDetalle = oModel.getProperty("/oSelecTableDetalle") || {};

            const sItmNumber = String(oDetalle.ItmNumber || "").trim().padStart(6, "0");
            const sMatnr = String(oDetalle.Matnr || oDetalle.Material || "").trim();

            const sCantRaw = (oDetalle.cantidad !== undefined && oDetalle.cantidad !== null)
                ? String(oDetalle.cantidad).replace(",", ".").trim()
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
            const sUMV = String(oDetalle.UMV || oDetalle.TargetQu || "MTS").trim();

            const bCambioCantidad = !Number.isFinite(Number(oDetalle.CantidadOriginalNum)) ||
                Math.abs(nNuevaCantidad - Number(oDetalle.CantidadOriginalNum)) > 0.0005;

            const bEditaBolsa = this._isBolsaTextilItem(oDetalle);

            if (
                bCambioCantidad &&
                !bEditaBolsa &&
                this._shouldValidateBolsas &&
                this._shouldValidateBolsas() &&
                this._tieneBolsaTextil()
            ) {
                this._confirmarEliminarBolsaPorCambioTextil(
                    "editar la posición " + sItmNumber,
                    function () {
                        this._onAcceptEditCantidad(oEvent);
                    }.bind(this)
                );
                return;
            }


            const nCantidadOriginal = Number(oDetalle.CantidadOriginalNum);
            const nStockOriginal = Number(oDetalle.StockDispoOriginalNum);

            let nStockCalculado = Number(oDetalle.StockDispoNum);

            if (Number.isFinite(nCantidadOriginal) && Number.isFinite(nStockOriginal)) {
                nStockCalculado = nStockOriginal - (nNuevaCantidad - nCantidadOriginal);
            }

            const sStockCalculado = Number.isFinite(nStockCalculado)
                ? this._formatSapStock(nStockCalculado, 3)
                : (oDetalle.StockDispo || "0.000");

            const oCantidades = oModel.getProperty("/oCantidades") || {};

            if (sItmNumber) {
                oCantidades[sItmNumber] = sCantFormat;
            }

            /*
             * Mantener también por material solo como fallback.
             * La clave confiable para modificación es ItmNumber.
             */
            oCantidades[sMatnr] = sCantFormat;
            oModel.setProperty("/oCantidades", oCantidades);

            const oCantidadesByItm = oModel.getProperty("/oCantidadesByItm") || {};

            if (sItmNumber) {
                oCantidadesByItm[sItmNumber] = Object.assign(
                    {},
                    oCantidadesByItm[sItmNumber] || {},
                    {
                        Material: sMatnr,
                        UMV: sUMV,
                        TargetQu: sUMV,
                        cantidad: sCantFormat,
                        Cantidad: sCantFormat
                    }
                );
            }

            oModel.setProperty("/oCantidadesByItm", oCantidadesByItm);

            const aMaterialUI = oModel.getProperty("/oMaterialUI") || [];

            const oItemUI = aMaterialUI.find(function (item) {
                return String(item.ItmNumber || "").trim().padStart(6, "0") === sItmNumber;
            });

            if (oItemUI) {
                oItemUI.cantidad = sCantFormat;
                oItemUI.Cantidad = sCantFormat;
                oItemUI.TargetQu = oItemUI.TargetQu || sUMV;
                oItemUI.UMV = oItemUI.UMV || sUMV;

                if (Number.isFinite(nStockCalculado)) {
                    oItemUI.StockDispoNum = nStockCalculado;
                    oItemUI.StockDispo = sStockCalculado;
                    oItemUI.StockDispoView = sStockCalculado;
                }

                if (String(oItemUI.TipoOperacion || "").trim() !== "I") {
                    oItemUI.TipoOperacion = "U";
                }
            }

            oModel.setProperty("/oMaterialUI", aMaterialUI);

            const aMaterialSAP = oModel.getProperty("/oMaterial") || [];

            const oItemSAP = aMaterialSAP.find(function (item) {
                return String(item.ItmNumber || "").trim().padStart(6, "0") === sItmNumber;
            });

            if (oItemSAP) {
                oItemSAP.TargetQty = sCantFormat;
                oItemSAP.cantidad = sCantFormat;
                oItemSAP.Cantidad = sCantFormat;
                oItemSAP.TargetQu = oItemSAP.TargetQu || sUMV;

                if (String(oItemSAP.TipoOperacion || "").trim() !== "I") {
                    oItemSAP.TipoOperacion = "U";
                }
            }

            oModel.setProperty("/oMaterial", aMaterialSAP);
            oModel.setProperty("/oSelecTableDetalle", {});
            oModel.refresh(true);

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

            if (bAplicaBolsas) {
                this._revisarBolsasTrasCambioCantidad();
            }
            this.onSimulateOrder();

            sap.m.MessageToast.show("Cantidad actualizada correctamente.");
        },
        _afterOpenAddPedido: async function () {
            const oTable = this._getManualTable();
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
            if (!sMatnr) return;

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
                    oModel.setProperty("/oSelecTableDetalle/StockDispo", oStock.StockDispo || "0");
                    oModel.setProperty("/oSelecTableDetalle/UMV", oStock.Um || oDet.UMV || "MTS");
                }
            } catch (e) {
            }
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

            if (!oContext) {
                return;
            }

            const oModel = oContext.getModel();
            const oDeletedItemInicial = oContext.getObject() || {};

            if (this._isBonificacionTextilItem(oDeletedItemInicial)) {
                sap.m.MessageToast.show("La posición de bonificación es informativa y no se puede eliminar directamente.");
                return;
            }

            const fnNormItm = function (v) {
                const s = String(v || "").trim();
                return s ? s.padStart(6, "0") : "";
            };

            const sItmDeletedInicial = fnNormItm(
                oDeletedItemInicial.ItmNumber ||
                oDeletedItemInicial.OriginalItmNumber
            );

            const bEliminaBolsa = this._isBolsaTextilItem(oDeletedItemInicial);

            const fnEliminarPosicion = function () {
                let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
                let aMaterial = oModel.getProperty("/oMaterial") || [];
                let aDeleted = oModel.getProperty("/oMaterialDeletedMod") || [];

                const aOriginalBase = oModel.getProperty("/oMaterialOriginalModBase") || [];

                const iIndex = aMaterialUI.findIndex(function (oItemUI) {
                    return fnNormItm(oItemUI.ItmNumber || oItemUI.OriginalItmNumber) === sItmDeletedInicial;
                });

                if (iIndex < 0) {
                    return;
                }

                const oDeletedItem = aMaterialUI[iIndex] || {};
                const sItmDeleted = fnNormItm(oDeletedItem.ItmNumber || oDeletedItem.OriginalItmNumber);
                const nItmDeleted = parseInt(sItmDeleted, 10);
                const nLastItm = parseInt(oModel.getProperty("/oLastItmNumberMod") || "0", 10) || 0;

                if (!isNaN(nItmDeleted) && nItmDeleted > nLastItm) {
                    oModel.setProperty("/oLastItmNumberMod", nItmDeleted);
                }

                const sMatDeleted = String(oDeletedItem.Material || oDeletedItem.Matnr || "").trim();
                const aBonificacionesRemover = [];

                const bExistiaAntes = aOriginalBase.some(function (it) {
                    return fnNormItm(it.ItmNumber || it.OriginalItmNumber) === sItmDeleted;
                });

                if (bExistiaAntes && sItmDeleted && sMatDeleted) {
                    const oItemSAP = aMaterial.find(function (it) {
                        return fnNormItm(it.ItmNumber || it.OriginalItmNumber) === sItmDeleted;
                    }) || {};

                    const bYaExisteDeleted = aDeleted.some(function (it) {
                        return fnNormItm(it.ItmNumber || it.OriginalItmNumber) === sItmDeleted;
                    });

                    const bEsBolsaDeleted = this._isBolsaTextilItem(oDeletedItem) || this._isBolsaTextilItem(oItemSAP);

                    if (!bYaExisteDeleted) {
                        aDeleted.push({
                            ClienteId: oItemSAP.ClienteId || oModel.getProperty("/oDatClient/Customer") || "",
                            ItmNumber: sItmDeleted,
                            OriginalItmNumber: sItmDeleted,
                            Material: sMatDeleted,
                            TargetQu: bEsBolsaDeleted ? "PAQ" : (oItemSAP.TargetQu || oDeletedItem.TargetQu || oDeletedItem.UMV || "MTS"),
                            Plant: oItemSAP.Plant || "1000",
                            TipoOperacion: "D",
                            Deleted: true,
                            esBolsa: bEsBolsaDeleted
                        });
                    }
                }

                aMaterialUI.splice(iIndex, 1);

                aMaterialUI = aMaterialUI.filter(function (item) {
                    if (!this._isBonificacionTextilItem(item)) {
                        return true;
                    }

                    const sBonusItm = fnNormItm(item.ItmNumber || item.OriginalItmNumber);
                    const sParent = fnNormItm(item.ParentItmNumber);
                    const sMatBonus = String(item.Material || item.Matnr || "").trim();

                    const bMismoPadre = !!sParent && sParent === sItmDeleted;
                    const bMismoMaterial = !!sMatDeleted && sMatBonus === sMatDeleted;

                    if (bMismoPadre || bMismoMaterial) {
                        if (sBonusItm) {
                            aBonificacionesRemover.push(sBonusItm);
                        }
                        return false;
                    }

                    return true;
                }.bind(this));

                aMaterial = aMaterial.filter(function (item) {
                    const sItmItem = fnNormItm(item.ItmNumber || item.OriginalItmNumber);
                    return sItmItem !== sItmDeleted && aBonificacionesRemover.indexOf(sItmItem) < 0;
                });

                const oCant = oModel.getProperty("/oCantidades") || {};

                if (sItmDeleted && oCant[sItmDeleted] !== undefined) {
                    delete oCant[sItmDeleted];
                }

                if (sMatDeleted && oCant[sMatDeleted] !== undefined) {
                    delete oCant[sMatDeleted];
                }

                const oCantByItm = oModel.getProperty("/oCantidadesByItm") || {};

                if (sItmDeleted && oCantByItm[sItmDeleted] !== undefined) {
                    delete oCantByItm[sItmDeleted];
                }

                aBonificacionesRemover.forEach(function (sBonusItm) {
                    if (oCant[sBonusItm] !== undefined) {
                        delete oCant[sBonusItm];
                    }
                    if (oCantByItm[sBonusItm] !== undefined) {
                        delete oCantByItm[sBonusItm];
                    }
                });

                oModel.setProperty("/oMaterialUI", aMaterialUI);
                oModel.setProperty("/oMaterial", aMaterial);
                oModel.setProperty("/oMaterialDeletedMod", aDeleted);
                oModel.setProperty("/oCantidades", oCant);
                oModel.setProperty("/oCantidadesByItm", oCantByItm);

                let subtotalGeneral = 0;
                let totalImpuesto = 0;
                let totalGeneral = 0;

                aMaterialUI.forEach(function (item) {
                    subtotalGeneral += parseFloat(item.subtotal || "0") || 0;
                    totalImpuesto += parseFloat(item.impuesto || "0") || 0;
                    totalGeneral += parseFloat(item.total || "0") || 0;
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

                if ((oModel.getProperty("/oMaterial") || []).length) {
                    this.onSimulateOrder();
                }
            }.bind(this);

            if (
                !bEliminaBolsa &&
                this._shouldValidateBolsas &&
                this._shouldValidateBolsas() &&
                this._tieneBolsaTextil()
            ) {
                this._confirmarEliminarBolsaPorCambioTextil(
                    "eliminar la posición " + sItmDeletedInicial,
                    fnEliminarPosicion
                );
                return;
            }

            fnEliminarPosicion();
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
        _goToSeguimientoPrincipal: function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelData = oView.getModel("oModelData");

            [
                "_oDialogEdit",
                "_dialogAddManualProduct",
                "_dialogAddProduct",
                "_dialogInfoPartMaterial"
            ].forEach(function (sDialogName) {
                const oDialog = this[sDialogName];

                if (oDialog) {
                    try {
                        if (oDialog.close) {
                            oDialog.close();
                        }

                        if (oDialog.destroy) {
                            oDialog.destroy();
                        }
                    } catch (e) {
                        void 0;
                    }

                    this[sDialogName] = null;
                }
            }.bind(this));

            if (oModelProyect) {
                if (models && typeof models.createModelProyect === "function") {
                    oModelProyect.setData(models.createModelProyect());
                } else {
                    oModelProyect.setData({});
                }

                oModelProyect.refresh(true);
            }

            if (oModelData) {
                [
                    "/Anticipo",
                    "/NotaCredito",
                    "/oReason",
                    "/oConditionPay",
                    "/oFilterMaterial",
                    "/ListMaterial",
                    "/ListDescription",
                    "/ListBrand",
                    "/ListArtTextil",
                    "/ListOrillo",
                    "/ListBrandSug",
                    "/ListArtTextilSug",
                    "/ListOrilloSug"
                ].forEach(function (sPath) {
                    oModelData.setProperty(sPath, Array.isArray(oModelData.getProperty(sPath)) ? [] : {});
                });

                oModelData.refresh(true);
            }

            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            const oHashChanger = sap.ui.core.routing.HashChanger.getInstance();

            try {
                oRouter.navTo("View", {}, true);
            } catch (e) {
                void 0;

                if (oHashChanger) {
                    oHashChanger.replaceHash("");
                }
            }
        },

        onConfirmCreateOrder: function () {
            const that = this;

            sap.m.MessageBox.confirm(
                "¿Desea guardar la modificación del pedido?",
                {
                    title: "Confirmación",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            that._createOrder();
                        }
                    }
                }
            );
        },
        onCancelOrder: function () {
            const that = this;

            sap.m.MessageBox.confirm(
                "¿Desea cancelar la modificación del pedido?",
                {
                    title: "Confirmación",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    emphasizedAction: sap.m.MessageBox.Action.YES,
                    onClose: function (sAction) {
                        if (sAction !== sap.m.MessageBox.Action.YES) {
                            return;
                        }

                        that._goToSeguimientoPrincipal();
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
                "miMaterialTextil",
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
            oModel.setProperty("/inputFormBackup", JSON.parse(JSON.stringify(oInputForm)));
            oModel.setProperty("/isDetailEdit", true);
            oModel.setProperty("/isFormEnabled", true);
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

            // Salir de modo edición
            oModel.setProperty("/isDetailEdit", false);
            oModel.setProperty("/isFormEnabled", false);

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
            if (!oModel) {
                return;
            }

            const oFiltros = oModel.getProperty("/inputForm") || {};
            const sTipo = String(oFiltros.tipoEntrega || "").trim();

            let sResumen = "";
            const aDetalle = [];

            if (sTipo === "1") {
                sResumen = "Cliente recoge";
            } else if (sTipo === "2") {
                sResumen = "Despacho directo";
            } else if (sTipo === "3") {
                sResumen = "Despacho agencia";
            }

            const bMostrarAgencia = sTipo === "3";

            const oComboDestino = this._getFirstById([
                "DestinationTextandTextiles",
                "DestinationTextandCeramicos",
                "DestinationTextandCeramicosDetail",
                "DestinationText"
            ]);

            const oItemDestino = oComboDestino && oComboDestino.getSelectedItem
                ? oComboDestino.getSelectedItem()
                : null;

            const sDestinoText = String(
                (oItemDestino && oItemDestino.getText && oItemDestino.getText()) ||
                oFiltros.destinoCeramicoText ||
                oFiltros.detalleEntrega ||
                ""
            ).trim();

            if (sDestinoText) {
                aDetalle.push(sDestinoText);
                oModel.setProperty("/inputForm/destinoCeramicoText", sDestinoText);
            }

            if (bMostrarAgencia) {
                const oComboAgencia = this._getFirstById(["comboAgencia"]);
                const oItemAgencia = oComboAgencia && oComboAgencia.getSelectedItem
                    ? oComboAgencia.getSelectedItem()
                    : null;

                const sAgenciaNombre = String(
                    (oItemAgencia && oItemAgencia.getAdditionalText && oItemAgencia.getAdditionalText()) ||
                    oFiltros.direccionAgenciaText ||
                    ""
                ).trim();

                oModel.setProperty("/inputForm/direccionAgenciaText", sAgenciaNombre);

                if (sAgenciaNombre) {
                    aDetalle.push(sAgenciaNombre);
                }
            } else {

                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
            }

            oModel.setProperty("/inputForm/showAgencia", bMostrarAgencia);
            oModel.setProperty("/inputForm/mostrarAgencia", bMostrarAgencia);
            oModel.setProperty("/inputForm/direccionAgenciaVisible", bMostrarAgencia);

            oModel.setProperty("/inputForm/resumenEntrega", sResumen);
            oModel.setProperty("/inputForm/detalleEntrega", aDetalle.join(" | "));

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
        _formatDateToDDMMYYYY: function (vDate) {
            if (!vDate) {
                return "";
            }

            try {
                if (vDate instanceof Date) {
                    const dd = String(vDate.getDate()).padStart(2, "0");
                    const mm = String(vDate.getMonth() + 1).padStart(2, "0");
                    const yyyy = vDate.getFullYear();
                    return dd + "/" + mm + "/" + yyyy;
                }

                let sDate = String(vDate).trim();

                const aSapDate = sDate.match(/\/Date\((\d+)\)\//);
                if (aSapDate) {
                    const oDate = new Date(parseInt(aSapDate[1], 10));
                    const dd = String(oDate.getUTCDate()).padStart(2, "0");
                    const mm = String(oDate.getUTCMonth() + 1).padStart(2, "0");
                    const yyyy = oDate.getUTCFullYear();
                    return dd + "/" + mm + "/" + yyyy;
                }

                if (/^\d{4}-\d{2}-\d{2}/.test(sDate)) {
                    const yyyy = sDate.substring(0, 4);
                    const mm = sDate.substring(5, 7);
                    const dd = sDate.substring(8, 10);
                    return dd + "/" + mm + "/" + yyyy;
                }

                if (/^\d{8}$/.test(sDate)) {
                    const yyyy = sDate.substring(0, 4);
                    const mm = sDate.substring(4, 6);
                    const dd = sDate.substring(6, 8);
                    return dd + "/" + mm + "/" + yyyy;
                }

                if (/^\d{2}\/\d{2}\/\d{4}$/.test(sDate)) {
                    return sDate;
                }

                return "";
            } catch (e) {
                void 0;
                return "";
            }
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
        _prepareDataForTextilesPedido: function (aStock) {
            const oModelUser = this.getView().getModel("oModelUser");

            const sRol = String(
                oModelUser && oModelUser.getProperty("/bRol") || ""
            ).trim().toUpperCase();

            const isSupervisor =
                !!(oModelUser && oModelUser.getProperty("/bIsCoord")) ||
                sRol === "SUPERVISOR" ||
                sRol === "COORDINADOR";

            const isVendedor =
                !!(oModelUser && oModelUser.getProperty("/bIsVendedor")) ||
                sRol === "VENDEDOR";

            const isCliente =
                !!(oModelUser && oModelUser.getProperty("/bIsCliente")) ||
                sRol === "CLIENTE" ||
                sRol === "CLIENTES";

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

            const fnFormatNumber = this.formatNumber
                ? this.formatNumber.bind(this)
                : function (v) { return String(v); };

            return (aStock || []).filter(function (child) {
                const linea = normalizeLinea(child?.Linea ?? "");
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

                child.StockDispo = fnFormatNumber(stockDispo);
                child.StockPedido = fnFormatNumber(stockPend);

                child.SinStock = stockDispo <= 0;
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
                useBatch: true,
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
                UMV: oRow.UMV || "PAQ"
            });

            this.setFragment(
                "_dialogEditBolsa",
                "frgIdEditBolsa",
                "EditBolsa",
                this
            );
        },
        _getDocHeaderValue: function (oDocHeader) {
            const oRaw = (oDocHeader && oDocHeader._raw) || oDocHeader || {};
            const aKeys = Array.prototype.slice.call(arguments, 1);

            if (!oRaw || typeof oRaw !== "object") {
                return "";
            }

            const mKeys = {};
            Object.keys(oRaw).forEach(function (k) {
                mKeys[String(k).toLowerCase()] = k;
            });

            for (let i = 0; i < aKeys.length; i++) {
                const sSearch = String(aKeys[i] || "").toLowerCase();
                const sRealKey = mKeys[sSearch];

                if (sRealKey) {
                    const v = oRaw[sRealKey];
                    if (v !== undefined && v !== null && String(v).trim() !== "") {
                        return String(v).trim();
                    }
                }
            }

            return "";
        },

        _mergeHeaderNonEmpty: function (oBase, oExtra) {
            const oResult = Object.assign({}, oBase || {});

            Object.keys(oExtra || {}).forEach(function (sKey) {
                const v = oExtra[sKey];
                if (v !== undefined && v !== null && String(v).trim() !== "") {
                    oResult[sKey] = v;
                }
            });

            return oResult;
        },

        _mergeCondicionPagoFromDataCustomerMod: function (oDatClientResp, sCustomer) {
            const oModelProyect = this.getView().getModel("oModelProyect");

            if (!oModelProyect) {
                return;
            }

            const aDataCustomer = oDatClientResp && Array.isArray(oDatClientResp.oResults)
                ? oDatClientResp.oResults
                : [];

            const sCliente = String(sCustomer || "").trim();

            const oDataCustomer = aDataCustomer.find(function (oRow) {
                return String(oRow.Customer || oRow.kunnr || oRow.Kunnr || "").trim() === sCliente;
            }) || aDataCustomer[0];

            if (!oDataCustomer) {
                return;
            }

            const sZterm = String(
                oDataCustomer.zterm ||
                oDataCustomer.Zterm ||
                oDataCustomer.PaymentCondition ||
                oDataCustomer.PaymentTerms ||
                ""
            ).trim();

            const sVtext = String(
                oDataCustomer.vtext ||
                oDataCustomer.Vtext ||
                oDataCustomer.DescriptionConditionPayment ||
                oDataCustomer.PaymentConditionText ||
                oDataCustomer.DesCondition ||
                ""
            ).trim();

            oModelProyect.setProperty("/oClientData", Object.assign(
                {},
                oModelProyect.getProperty("/oClientData") || {},
                oDataCustomer,
                {
                    zterm: sZterm,
                    vtext: sVtext || sZterm
                }
            ));

            const sCondActual = String(oModelProyect.getProperty("/inputForm/cbCondPago") || "").trim();
            if (sZterm && sCondActual === sZterm) {
                oModelProyect.setProperty("/inputForm/txtCondPago", sVtext || sZterm);
            }
        },

        _ensureCondicionPagoClienteEnLista: function () {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            if (!oModelProyect || !oModelData) {
                return;
            }

            const oClientData = oModelProyect.getProperty("/oClientData") || {};
            const sKey = String(
                oClientData.zterm ||
                oClientData.Zterm ||
                oClientData.PaymentCondition ||
                oClientData.PaymentTerms ||
                ""
            ).trim();

            const sText = String(
                oClientData.vtext ||
                oClientData.Vtext ||
                oClientData.DescriptionConditionPayment ||
                oClientData.PaymentConditionText ||
                oClientData.DesCondition ||
                ""
            ).trim();

            if (!sKey) {
                return;
            }

            const aCond = oModelData.getProperty("/oConditionPay") || [];
            const bExiste = aCond.some(function (c) {
                return String(c.Conditionn || c.PaymentCondition || c.Zterm || "").trim() === sKey;
            });

            if (!bExiste) {
                aCond.unshift({
                    Conditionn: sKey,
                    DesCondition: sText || sKey,
                    __fromDataCustomer: true
                });
                oModelData.setProperty("/oConditionPay", aCond);
            }

            const sCondActual = String(oModelProyect.getProperty("/inputForm/cbCondPago") || "").trim();
            if (sCondActual === sKey) {
                oModelProyect.setProperty("/inputForm/txtCondPago", sText || sKey);
            }
        },

        _applyObsFromPedidoReferenciaMod: function (oObsResp) {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const aObs = oObsResp && Array.isArray(oObsResp.oResults)
                ? oObsResp.oResults
                : [];

            if (!aObs.length) {
                return;
            }

            const fnGetText = function (sTipobs, sTextId) {
                return aObs
                    .filter(function (oRow) {
                        const sTip = String(oRow.Tipobs || "").trim().toUpperCase();
                        const sId = String(oRow.TextId || oRow.TdId || "").trim().toUpperCase();
                        return sTip === sTipobs || sId === sTextId;
                    })
                    .map(function (oRow) {
                        return String(oRow.Nota || oRow.Msg || oRow.TextLine || oRow.Tdline || "").trim();
                    })
                    .filter(Boolean)
                    .join("\n");
            };

            const sObsPedido = fnGetText("OBPE", "Z001");
            const sObsEntrega = fnGetText("OBEN", "Z003");

            if (sObsPedido) {
                oModel.setProperty("/inputForm/obsPedido", sObsPedido);
            }

            if (sObsEntrega) {
                oModel.setProperty("/inputForm/obsDelivery", sObsEntrega);
            }
        },

        _aplicarCondicionPagoDesdeReferencia: function (oDocHeader) {
            const oModelProyect = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            if (!oModelProyect || !oModelData || !oDocHeader) {
                return;
            }

            const sCondPago = this._getDocHeaderValue(
                oDocHeader,
                "PaymentCondition",
                "Pmnttrms",
                "PaymentTerms",
                "CustomerPaymentTerms",
                "Zterm"
            );

            if (!sCondPago) {
                return;
            }

            const aCondiciones = oModelData.getProperty("/oConditionPay") || [];
            let oMatch = aCondiciones.find(function (c) {
                return String(c.Conditionn || c.PaymentCondition || c.Zterm || "").trim() === sCondPago;
            });

            if (!oMatch) {
                const oClientData = oModelProyect.getProperty("/oClientData") || {};
                const sTextoCabecera = this._getDocHeaderValue(
                    oDocHeader,
                    "DescriptionConditionPayment",
                    "PaymentConditionText",
                    "DesCondition",
                    "Vtext"
                );

                const sTextoDataCustomer = String(
                    oClientData.vtext ||
                    oClientData.Vtext ||
                    oClientData.DescriptionConditionPayment ||
                    oClientData.PaymentConditionText ||
                    ""
                ).trim();

                const sZtermDataCustomer = String(
                    oClientData.zterm ||
                    oClientData.Zterm ||
                    oClientData.PaymentCondition ||
                    oClientData.PaymentTerms ||
                    ""
                ).trim();

                const sTextoFinal = sZtermDataCustomer === sCondPago
                    ? (sTextoDataCustomer || sTextoCabecera || sCondPago)
                    : (sTextoCabecera || sCondPago);

                oMatch = {
                    Conditionn: sCondPago,
                    DesCondition: sTextoFinal,
                    __fromPedidoHeader: true
                };

                aCondiciones.unshift(oMatch);
                oModelData.setProperty("/oConditionPay", aCondiciones);
            }

            oModelProyect.setProperty("/inputForm/cbCondPago", oMatch.Conditionn || "");
            oModelProyect.setProperty("/inputForm/txtCondPago", oMatch.DesCondition || "");
        },

        _aplicarRecomendacionesDestinoYAgenciaTextil: function (oDocHeader) {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel || !oDocHeader) {
                return;
            }

            const fnNorm = function (v) {
                return String(v || "").trim();
            };

            const sDeliveryCondition = this._getDocHeaderValue(
                oDocHeader,
                "DELIVERYCONDITION",
                "DeliveryCondition",
                "ShipCond",
                "ShippingCondition"
            );

            const sShippingDestination = this._getDocHeaderValue(
                oDocHeader,
                "SHIPPINGDESTINATION",
                "ShippingDestination",
                "ShipToParty"
            );

            const sFinalDestination = this._getDocHeaderValue(
                oDocHeader,
                "FINALDESTINATION",
                "FinalDestination",
                "Finaldestinationid",
                "FinalDestinationId"
            );

            const sCustomer = this._getDocHeaderValue(
                oDocHeader,
                "Customer",
                "SoldToParty",
                "Cliente",
                "Kunnr",
                "ClientId"
            );

            const sShipTo = fnNorm(sShippingDestination);
            const sFinal = fnNorm(sFinalDestination);
            const sCliente = fnNorm(sCustomer);

            let sTipoEntrega = "2";
            let bMostrarAgencia = false;

            if (sDeliveryCondition === "02") {
                sTipoEntrega = "1";
                bMostrarAgencia = false;
            } else if (sDeliveryCondition === "01") {
                if (sShipTo && sFinal && sShipTo !== sFinal) {
                    sTipoEntrega = "3";
                    bMostrarAgencia = true;
                } else {
                    sTipoEntrega = "2";
                    bMostrarAgencia = false;
                }
            }

            const sCodigoDestino = sFinal || sShipTo || sCliente;
            const sCodigoAgencia = bMostrarAgencia ? sShipTo : "";

            const aAgencias = oModel.getProperty("/oAgenciasCliente") || [];
            const aDestinos = oModel.getProperty("/oDestinosCliente") || [];

            const oDestino = aDestinos.find(function (item) {
                return [
                    item.Customer,
                    item.Shippingdestinationid,
                    item.Finaldestinationid,
                    item.Destinationid
                ].some(function (v) {
                    return fnNorm(v) === sCodigoDestino;
                });
            });

            const oAgencia = bMostrarAgencia
                ? aAgencias.find(function (item) {
                    return fnNorm(item.Customer) === sCodigoAgencia;
                })
                : null;

            const sTextoDestino = oDestino
                ? (
                    oDestino.Finaldestination ||
                    oDestino.Finaldestinationname ||
                    oDestino.Shippingdestination ||
                    oDestino.Shippingname ||
                    oDestino.Destination ||
                    oDestino.Destinationname ||
                    sCodigoDestino
                )
                : sCodigoDestino;

            const sTextoAgencia = oAgencia
                ? (
                    oAgencia.Agencyname ||
                    oAgencia.Agencyaddress ||
                    sCodigoAgencia
                )
                : "";

            oModel.setProperty("/inputForm/tipoEntrega", sTipoEntrega);

            oModel.setProperty(
                "/inputForm/resumenEntrega",
                sTipoEntrega === "1"
                    ? "Cliente recoge"
                    : sTipoEntrega === "3"
                        ? "Despacho agencia"
                        : "Despacho directo"
            );

            // Z0 = FinalDestination
            oModel.setProperty("/inputForm/destinoTextil", sCodigoDestino);
            oModel.setProperty("/inputForm/destinoCeramicoText", sTextoDestino);
            oModel.setProperty("/inputForm/detalleEntrega", sTextoDestino);

            // WE = ShippingDestination solo si ShippingDestination != FinalDestination
            oModel.setProperty("/inputForm/direccionAgencia", sCodigoAgencia);
            oModel.setProperty("/inputForm/direccionAgenciaText", bMostrarAgencia ? sTextoAgencia : "");

            oModel.setProperty("/inputForm/showAgencia", bMostrarAgencia);
            oModel.setProperty("/inputForm/mostrarAgencia", bMostrarAgencia);
            oModel.setProperty("/inputForm/direccionAgenciaVisible", bMostrarAgencia);

            void 0;

            oModel.refresh(true);
        },

        _enrichPedidoModTextilConStock: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oModelData = this.getView().getModel("oModelData");

            if (!oModel) {
                return Promise.resolve();
            }

            const aMaterialTech = oModel.getProperty("/oMaterial") || [];
            const aMaterialUI = oModel.getProperty("/oMaterialUI") || [];

            const aMaterials = Array.from(new Set(
                aMaterialTech
                    .map(function (item) {
                        return String(item.Material || "").trim();
                    })
                    .filter(Boolean)
            ));

            const aCatalogo = oModelData
                ? (
                    oModelData.getProperty("/oFilterMaterialFull") ||
                    oModelData.getProperty("/oFilterMaterial") ||
                    []
                )
                : [];

            const mCatalogoByMaterial = new Map();

            (aCatalogo || []).forEach(function (row) {
                const sMaterial = String(row.Material || row.Matnr || "").trim();

                if (!sMaterial || mCatalogoByMaterial.has(sMaterial)) {
                    return;
                }

                mCatalogoByMaterial.set(sMaterial, row);
            });

            if (!aMaterials.length || typeof this._loadProductoBulk !== "function") {
                return Promise.resolve();
            }

            return this._loadProductoBulk({
                aMaterials: aMaterials,
                SalesOrg: "1110",
                Plant: "1000",
                Pedven: true,
                ChunkSize: 30,
                PaintPartial: false
            }).then(function (aStock) {
                const mStockByMaterial = new Map();

                (aStock || []).forEach(function (row) {
                    const sMaterial = String(row.Material || row.Matnr || "").trim();

                    if (!sMaterial) {
                        return;
                    }

                    const oActual = mStockByMaterial.get(sMaterial);

                    if (!oActual) {
                        mStockByMaterial.set(sMaterial, row);
                        return;
                    }

                    const sDescActual = String(oActual.Bezei || "").trim();
                    const sDescNuevo = String(row.Bezei || "").trim();

                    const nStockActual = oActual.StockDispoNum !== undefined
                        ? Number(oActual.StockDispoNum)
                        : that._parseSapNumber(oActual.StockDispo);

                    const nStockNuevo = row.StockDispoNum !== undefined
                        ? Number(row.StockDispoNum)
                        : that._parseSapNumber(row.StockDispo);

                    if ((!sDescActual && sDescNuevo) || nStockNuevo > nStockActual) {
                        mStockByMaterial.set(sMaterial, row);
                    }
                });

                aMaterialUI.forEach(function (ui) {
                    const sMaterial = String(ui.Material || ui.codigo || ui.Matnr || "").trim();
                    const oStock = mStockByMaterial.get(sMaterial) || {};

                    const sDescActual = String(
                        ui.Descriptions ||
                        ui.descripcion ||
                        ui.Description ||
                        ""
                    ).trim();

                    const sDescStock = String(
                        oStock.Bezei ||
                        oStock.Description ||
                        oStock.MaterialDescription ||
                        ""
                    ).trim();

                    const sDescripcionFinal = sDescActual || sDescStock || "";

                    ui.Material = sMaterial;
                    ui.codigo = ui.codigo || sMaterial;
                    ui.Matnr = ui.Matnr || oStock.Matnr || sMaterial;

                    ui.Descriptions = sDescripcionFinal;
                    ui.Description = sDescripcionFinal;
                    ui.descripcion = sDescripcionFinal;
                    ui.Bezei = sDescripcionFinal;

                    ui.UMV = ui.UMV || oStock.Um || ui.TargetQu || "MTS";
                    ui.TargetQu = ui.TargetQu || oStock.Um || ui.UMV || "MTS";
                    ui.Brand = ui.Brand || oStock.Brand || "";
                    ui.Linea = oStock.Linea || ui.Linea || "";
                    ui.StockDispo = oStock.StockDispo || ui.StockDispo || "0";
                    ui.StockPedido = oStock.StockPedido || ui.StockPedido || "0";
                    ui.pieza = oStock.pieza || ui.pieza || "0";
                    ui.piezasDetalle = oStock.piezasDetalle || ui.piezasDetalle || [];
                });

                aMaterialTech.forEach(function (tech) {
                    delete tech.UMV;
                    delete tech.cantidad;
                    delete tech.Cantidad;
                    delete tech.TipoOperacion;
                    delete tech.OriginalItmNumber;
                    delete tech.Deleted;
                    delete tech.Description;
                    delete tech.Descriptions;
                    delete tech.descripcion;
                    delete tech.StockDispo;
                    delete tech.StockPedido;
                    delete tech.Linea;
                    delete tech.pieza;
                    delete tech.piezasDetalle;
                    delete tech.RefDoc;
                    delete tech.RefDocIt;
                    delete tech.RefDocCa;
                    delete tech.TargetQty;
                    delete tech.Brand;
                });

                oModel.setProperty("/oMaterial", aMaterialTech);
                oModel.setProperty("/oMaterialUI", aMaterialUI);
                oModel.refresh(true);

                void 0;
            }.bind(this)).catch(function (oError) {
                void 0;
            });
        },

        _mapPedidoModificacionToModel: function (oCab, aItems) {
            const oModel = this.getView().getModel("oModelProyect");
            const oDataModel = this.getView().getModel("oModelData");
            const oCfg = this._getPedidoUnitConfig("1110");

            oCab = oCab || {};
            aItems = Array.isArray(aItems) ? aItems : [];

            const oInputFormActual = oModel.getProperty("/inputForm") || {};
            oModel.setProperty("/inputForm", Object.assign({}, oInputFormActual));

            const fnGet = function () {
                const aArgs = [oCab].concat(Array.prototype.slice.call(arguments));
                return this._getDocHeaderValue.apply(this, aArgs);
            }.bind(this);

            const fnFindText = function (aList, sCode, aCodeFields, aTextFields) {
                const sKey = String(sCode || "").trim();
                if (!sKey || !Array.isArray(aList)) {
                    return "";
                }

                const oMatch = aList.find(function (row) {
                    return aCodeFields.some(function (field) {
                        return String(row && row[field] || "").trim() === sKey;
                    });
                });

                if (!oMatch) {
                    return "";
                }

                for (let i = 0; i < aTextFields.length; i++) {
                    const sText = String(oMatch[aTextFields[i]] || "").trim();
                    if (sText) {
                        return sText;
                    }
                }

                return "";
            };

            const sCustomer = fnGet("Customer", "SoldToParty", "Cliente", "Kunnr", "ClientId");
            const sCustomerName = fnGet("CustomerName", "CustomerFullName", "Name1", "RazonSocial");
            const sSalesOrg = fnGet("SalesOrganization", "OrgVentas", "SalesOrg") || oCfg.SalesOrg;
            const sDivision = fnGet("Division", "DivisionCode") || "S1";
            const sDocType = fnGet("SalesDocumentType", "DocumentType", "DocType", "AUART") || "ZPES";

            let sDocTypeText = fnGet("DscSalesDocumentType", "DescriptionSalesDocumentType", "SalesDocumentTypeText", "DocumentTypeText", "DscType");
            if (!sDocTypeText) {
                if (sDocType === "ZPES") {
                    sDocTypeText = "Pedido Nacional";
                } else if (sDocType === "ZPEF") {
                    sDocTypeText = "Exportación";
                } else if (sDocType === "ZGNA") {
                    sDocTypeText = "T/Gratuita";
                } else if (sDocType === "ZCNA") {
                    sDocTypeText = "Cotización";
                } else {
                    sDocTypeText = sDocType;
                }
            }

            const sCurrency = fnGet("Currency", "TransactionCurrency", "DocumentCurrency", "CurrencyCode", "Moneda") || "USD";
            const sCondPago = fnGet("PaymentCondition", "PaymentTerms", "CustomerPaymentTerms", "Pmnttrms", "Zterm");
            let sCondPagoText = fnGet("DescriptionConditionPayment", "PaymentConditionText", "DesCondition", "Vtext");

            if (!sCondPagoText && oDataModel) {
                sCondPagoText = fnFindText(
                    oDataModel.getProperty("/oConditionPay") || [],
                    sCondPago,
                    ["Conditionn", "PaymentCondition", "Zterm"],
                    ["DesCondition", "Description", "PaymentConditionText", "Vtext"]
                );
            }
            if (!sCondPagoText) {
                sCondPagoText = sCondPago;
            }

            const sReason = fnGet(
                "CodMotivoPedido",
                "CODMOTIVOPEDIDO",
                "CodMotivo",
                "CodigoMotivoPedido",
                "MotivoPedido",
                "SalesDocumentRjcnReason",
                "OrderReason",
                "OrdReason",
                "ReasonRequest"
            );

            let sReasonText = fnGet(
                "DescMotivoPedido",
                "DescripcionMotivoPedido",
                "DscMotivoPedido",
                "MotivoPedidoText",
                "ReasonDescription",
                "DescriptionReason",
                "OrderReasonText",
                "Description"
            );

            if (!sReasonText && oDataModel) {
                sReasonText = fnFindText(
                    oDataModel.getProperty("/oReason") || [],
                    sReason,
                    [
                        "ReasonRequest",
                        "OrdReason",
                        "OrderReason",
                        "CodMotivoPedido",
                        "CodMotivo",
                        "CodigoMotivoPedido",
                        "MotivoPedido"
                    ],
                    [
                        "Description",
                        "DescriptionReason",
                        "OrderReasonText",
                        "DescMotivoPedido",
                        "DescripcionMotivoPedido",
                        "DscMotivoPedido",
                        "MotivoPedidoText"
                    ]
                );
            }

            if (!sReasonText) {
                sReasonText = sReason;
            }

            const sPurchaseOrder = fnGet(
                "OrdenCompra",
                "PurchaseOrderByCustomer",
                "PurchNoC",
                "PurchaseOrder",
                "PurchaseOrderNumber"
            );

            const sFechaVencimientoOC = this._formatDateToDDMMYYYY(fnGet(
                "FechaVencimientoOC",
                "FechaVencimientoOc",
                "OCExpirationDate",
                "PurchaseOrderExpirationDate",
                "FechaVencimiento"
            ));
            const sVendorId = fnGet("VendorID", "VendorId", "kunn2", "Kunn2", "SalesEmployee", "SellerId");
            const sVendorName = fnGet("Vendor", "VendorName", "Seller", "SalesEmployeeName");

            const sShipCond = fnGet("DeliveryCondition", "ShippingCondition", "ShipCond");

            const sShippingDestination = fnGet(
                "ShippingDestination",
                "SHIPPINGDESTINATION",
                "ShipToParty"
            );

            const sFinalDestination = fnGet(
                "FinalDestination",
                "FINALDESTINATION",
                "Finaldestinationid",
                "FinalDestinationId"
            );

            const sFinalDestinationName = fnGet(
                "FinalDestinationName",
                "Finaldestinationname",
                "FinalDestinationText"
            );

            const sShippingDestinationName = fnGet(
                "ShippingDestinationName",
                "Shippingname",
                "ShippingDestinationText"
            );

            const sCodigoShipTo = String(sShippingDestination || "").trim();
            const sCodigoFinal = String(sFinalDestination || sShippingDestination || sCustomer || "").trim();

            let sTipoEntrega = "2";
            let bMostrarAgencia = false;

            if (sShipCond === "02") {
                sTipoEntrega = "1";
                bMostrarAgencia = false;
            } else if (sShipCond === "01") {
                if (sCodigoShipTo && sCodigoFinal && sCodigoShipTo !== sCodigoFinal) {
                    sTipoEntrega = "3";
                    bMostrarAgencia = true;
                } else {
                    sTipoEntrega = "2";
                    bMostrarAgencia = false;
                }
            }

            const sCodigoWE = bMostrarAgencia ? sCodigoShipTo : sCodigoFinal;
            const sCodigoZ0 = sCodigoFinal;

            const sResumenEntrega =
                sTipoEntrega === "1"
                    ? "Cliente recoge"
                    : sTipoEntrega === "3"
                        ? "Despacho agencia"
                        : "Despacho directo";

            const sGrupoMaterialCab = fnGet("MaterialGroup", "MatlGroup", "GrupoMaterial");

            oModel.setProperty("/docModificarCabecera", Object.assign({}, oCab, {
                Customer: sCustomer,
                CustomerName: sCustomerName,
                SalesOrganization: sSalesOrg,
                Division: sDivision,
                SalesDocumentType: sDocType,
                Currency: sCurrency,
                PaymentCondition: sCondPago,
                DeliveryCondition: sShipCond
            }));

            oModel.setProperty("/docModificarItems", aItems);
            oModel.setProperty("/oDatClient", Object.assign(
                {},
                oModel.getProperty("/oDatClient") || {},
                {
                    Customer: sCustomer,
                    CustomerFullName: sCustomerName,
                    SalesOrganization: sSalesOrg,
                    Division: sDivision,
                    Currency: sCurrency,
                    Plant: oCfg.Plant
                }
            ));

            oModel.setProperty("/oClientData", Object.assign(
                {},
                oModel.getProperty("/oClientData") || {},
                {
                    Customer: sCustomer,
                    kunnr: sCustomer,
                    CustomerFullName: sCustomerName,
                    name1: sCustomerName,
                    kunn2: sVendorId,
                    Seller: sVendorName,
                    zterm: sCondPago,
                    vtext: sCondPagoText
                }
            ));

            const aMaterialSAP = [];
            const aMaterialUI = [];
            const oCantidades = {};
            const oCantidadesByItm = {};
            const oRefByItm = {};
            const aPosRef = [];

            let sGrupoMaterial = sGrupoMaterialCab;

            aItems.forEach(function (oItem, index) {
                const sMat = String(oItem.Material || oItem.Product || oItem.MaterialNumber || oItem.Matnr || "").trim();
                if (!sMat) {
                    return;
                }

                const sItmNumber = String(
                    oItem.SalesDocumentItem ||
                    oItem.ItmNumber ||
                    oItem.Item ||
                    oItem.Posnr ||
                    ((index + 1) * 10)
                ).padStart(6, "0");

                const fQty = this._getItemQtyForSimulation(oItem);
                const sQty = this._formatQty3(fQty);

                const sTargetQu = String(
                    oItem.TargetQu ||
                    oItem.TargetQuantityUnit ||
                    oItem.OrderQuantityUnit ||
                    oItem.SalesUnit ||
                    oItem.BaseUnit ||
                    oItem.Unit ||
                    oItem.UM ||
                    oItem.Um ||
                    oItem.UOM ||
                    "MTS"
                ).trim();

                const sBrand = String(oItem.Brand || oItem.Marca || "").trim();
                const sItemGroup = String(oItem.MaterialGroup || oItem.MatlGroup || oItem.GrupoMaterial || "").trim();
                if (!sGrupoMaterial && sItemGroup) {
                    sGrupoMaterial = sItemGroup;
                }

                const oRef = {
                    RefDoc: oItem.RefDoc || oItem.ReferenceSDDocument || oItem.SalesDocument || oCab.SalesDocument || "",
                    RefDocIt: oItem.RefDocIt || oItem.ReferenceSDDocumentItem || oItem.SalesDocumentItem || sItmNumber,
                    RefDocCa: oItem.RefDocCa || oItem.SDDocumentCategory || oItem.SalesDocumentCategory || (sDocType === "ZCNA" ? "B" : "G")
                };

                const sDesc = String(
                    oItem.SalesDocumentItemText ||
                    oItem.MaterialDescription ||
                    oItem.ProductDescription ||
                    oItem.Description ||
                    oItem.Descripcion ||
                    oItem.DescripcionMaterial ||
                    oItem.MaterialText ||
                    ""
                ).trim();

                const bEsBolsaTextil = this._isBolsaTextilItem({
                    Material: sMat,
                    TargetQu: sTargetQu,
                    UMV: sTargetQu,
                    SalesDocumentItemText: oItem.SalesDocumentItemText,
                    MaterialDescription: oItem.MaterialDescription,
                    ProductDescription: oItem.ProductDescription,
                    Description: sDesc,
                    Descriptions: sDesc,
                    descripcion: sDesc
                });

                aMaterialSAP.push({
                    ClienteId: sCustomer,
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    TargetQu: bEsBolsaTextil ? "PAQ" : (sTargetQu || "MTS"),
                    esBolsa: bEsBolsaTextil,
                    Plant: oItem.Plant || oCfg.Plant
                });

                aMaterialUI.push({
                    ItmNumber: sItmNumber,
                    Posicion: sItmNumber,
                    OriginalItmNumber: sItmNumber,
                    Material: sMat,
                    codigo: sMat,
                    Descriptions: sDesc,
                    descripcion: sDesc,
                    Description: sDesc,
                    cantidad: sQty,
                    UMV: bEsBolsaTextil ? "PAQ" : sTargetQu,
                    TargetQu: bEsBolsaTextil ? "PAQ" : sTargetQu,
                    Brand: sBrand,
                    StockDispo: oItem.StockDispo || oItem.CtdPendiente || "0",
                    Kbetr: 0,
                    precioUnit: 0,
                    precioBase: 0,
                    subtotal: 0,
                    descuentos: 0,
                    impuesto: 0,
                    total: 0,
                    importeTabla: 0,
                    esBolsa: bEsBolsaTextil,
                    TipoOperacion: "N",
                    OriginalItmNumber: sItmNumber,
                    Deleted: false,
                    state: "None"
                });

                oCantidades[sItmNumber] = sQty;
                oCantidades[sMat] = sQty;

                oCantidadesByItm[sItmNumber] = {
                    Material: sMat,
                    UMV: sTargetQu,
                    TargetQu: sTargetQu,
                    cantidad: sQty,
                    Cantidad: sQty
                };

                oRefByItm[sItmNumber] = oRef;

                aPosRef.push({
                    Material: sMat,
                    Descripcion: sDesc,
                    CtdPedido: sQty,
                    CtdPendiente: oItem.CtdPendiente || sQty,
                    UM: sTargetQu,
                    Brand: sBrand,
                    RefDoc: oRef.RefDoc,
                    RefDocIt: oRef.RefDocIt,
                    RefDocCa: oRef.RefDocCa
                });
            }.bind(this));

            const sGrupoMaterialText = sGrupoMaterial
                ? (sGrupoMaterial === "01" ? "01 - Lanas" : sGrupoMaterial)
                : "";

            const oInputForm = Object.assign({}, oModel.getProperty("/inputForm") || {}, {
                tipDocument: sDocType,
                txtTipDocument: sDocTypeText || sDocType,
                moneda: sCurrency,
                cbCondPago: sCondPago,
                txtCondPago: sCondPagoText || sCondPago,
                reasonOrd: sReason,
                txtReasonOrd: sReasonText || sReason,
                purchaseOrder: sPurchaseOrder || "",
                ocExpDate: sFechaVencimientoOC || "",
                grupoMaterial: sGrupoMaterial,
                grupoMaterialText: sGrupoMaterialText,
                tipoReferencia: "",
                docRefSeleccionado: null,
                posRefSeleccionadas: aPosRef,
                tipoEntrega: sTipoEntrega,
                resumenEntrega: sResumenEntrega,

                // Z0 = FinalDestination
                destinoTextil: sCodigoZ0,
                destinoCeramicoText: sFinalDestinationName || sCodigoZ0,
                detalleEntrega: sFinalDestinationName || sCodigoZ0,

                // WE = ShippingDestination solo cuando ShippingDestination != FinalDestination
                direccionAgencia: bMostrarAgencia ? sCodigoWE : "",
                direccionAgenciaText: bMostrarAgencia ? (sShippingDestinationName || sCodigoWE) : "",

                showAgencia: bMostrarAgencia,
                mostrarAgencia: bMostrarAgencia,
                direccionAgenciaVisible: bMostrarAgencia,
                isTipDocumentEnabled: false
            });

            oModel.setProperty("/inputForm", oInputForm);
            oModel.setProperty("/isFormEnabled", true);

            oModel.setProperty("/oMaterial", aMaterialSAP);
            oModel.setProperty("/oMaterialUI", aMaterialUI);
            oModel.setProperty("/oCantidades", oCantidades);
            oModel.setProperty("/oCantidadesByItm", oCantidadesByItm);
            oModel.setProperty("/oRefByItm", oRefByItm);

            const aMaterialSAPBase = JSON.parse(JSON.stringify(aMaterialSAP));
            const aMaterialUIBase = JSON.parse(JSON.stringify(aMaterialUI));
            const oCantidadesByItmBase = JSON.parse(JSON.stringify(oCantidadesByItm));

            oModel.setProperty("/oMaterialOriginalModBase", aMaterialSAPBase);
            oModel.setProperty("/oMaterialUIOriginalModBase", aMaterialUIBase);
            oModel.setProperty("/oCantidadesByItmOriginalModBase", oCantidadesByItmBase);
            oModel.setProperty("/oMaterialOriginalMod", aMaterialSAPBase);
            oModel.setProperty("/oMaterialUIOriginalMod", aMaterialUIBase);
            oModel.setProperty("/oCantidadesByItmOriginalMod", oCantidadesByItmBase);
            oModel.setProperty("/oMaterialDeletedMod", []);

            oModel.setProperty("/oDatCalculo", {
                subtotalGeneral: "0.00",
                embalaje: "0.00",
                totalImpuesto: "0.00",
                totalGeneral: "0.00"
            });

            void 0;

            oModel.refresh(true);
        },
        _onPressRecalculateSimulation: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const aItems = oModel ? (oModel.getProperty("/oMaterial") || []) : [];

            if (!aItems.length) {
                sap.m.MessageToast.show("No hay ítems para recalcular.");
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            try {
                this.onSimulateOrder();
            } catch (e) {
                sap.ui.core.BusyIndicator.hide(0);
                void 0;
                sap.m.MessageBox.error("Error al recalcular la simulación.");
            }
        },
        _getSapReturnMessages: function (oResponse) {
            const vReturn = oResponse && oResponse.HeaderToReturn;

            if (!vReturn) {
                return [];
            }

            if (Array.isArray(vReturn)) {
                return vReturn;
            }

            if (Array.isArray(vReturn.results)) {
                return vReturn.results;
            }

            return [];
        },

        _isSapReturnError: function (oMsg) {
            const sType = String(
                oMsg.Type ||
                oMsg.TYPE ||
                oMsg.type ||
                ""
            ).trim().toUpperCase();

            return sType === "E" || sType === "A";
        },

        _getSapReturnText: function (oMsg) {
            const sType = String(
                oMsg.Type ||
                oMsg.TYPE ||
                oMsg.type ||
                ""
            ).trim().toUpperCase();

            const sMessage = String(
                oMsg.Message ||
                oMsg.MESSAGE ||
                oMsg.message ||
                oMsg.MessageV1 ||
                ""
            ).trim();

            if (!sMessage) {
                return "";
            }

            return sType ? "[" + sType + "] " + sMessage : sMessage;
        },

        _formatSapReturnMessages: function (aMessages) {
            const aLines = [];
            const oSeen = {};

            (aMessages || []).forEach(function (oMsg) {
                const sText = this._getSapReturnText(oMsg);

                if (sText && !oSeen[sText]) {
                    oSeen[sText] = true;
                    aLines.push("• " + sText);
                }
            }.bind(this));

            return aLines.join("\n");
        },

        _extractSalesDocumentFromSapReturn: function (aMessages) {
            let sDocumento = "";

            (aMessages || []).some(function (oMsg) {
                const sMessage = String(
                    oMsg.Message ||
                    oMsg.MESSAGE ||
                    oMsg.message ||
                    ""
                ).trim();

                const aMatch = sMessage.match(/\b\d{10}\b/);

                if (aMatch && aMatch[0]) {
                    sDocumento = aMatch[0];
                    return true;
                }

                return false;
            });

            return sDocumento;
        },

        _extractODataErrorDetail: function (oError) {
            const aMessages = [];
            const oSeen = {};

            const fnPush = function (sText) {
                sText = String(sText || "").trim();

                if (sText && !oSeen[sText]) {
                    oSeen[sText] = true;
                    aMessages.push("• " + sText);
                }
            };

            try {
                if (oError && oError.responseText) {
                    const oJson = JSON.parse(oError.responseText);

                    fnPush(oJson && oJson.error && oJson.error.message && oJson.error.message.value);

                    const aDetails = oJson &&
                        oJson.error &&
                        oJson.error.innererror &&
                        oJson.error.innererror.errordetails;

                    if (Array.isArray(aDetails)) {
                        aDetails.forEach(function (oDetail) {
                            fnPush(oDetail.message || oDetail.Message);
                        });
                    }
                }
            } catch (e) {
                fnPush(oError && oError.message);
            }

            fnPush(oError && oError.message);

            return aMessages.join("\n");
        },


    });
});