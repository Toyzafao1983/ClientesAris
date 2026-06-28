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
    "aris/com/clientes/seguimiento/pe/model/formatter",
    "aris/com/clientes/seguimiento/pe/services/Services",
], (BaseController, Controller, models, Formatter, JSONModel, util, utilUI, Token, Filter, FilterOperator, formatter, Services) => {
    "use strict";

    var that;
    return BaseController.extend("aris.com.clientes.seguimiento.pe.controller.ModPedCeramicos", {
        formatter: Formatter,
        onInit() {
            that = this;
            const oModelProyect = this.getOwnerComponent().getModel("oModelProyect");
            this.getView().setModel(oModelProyect, "oModelProyect");
            const oModelUser = this.getOwnerComponent().getModel("oModelUser");
            this.getView().setModel(oModelUser, "oModelUser");
            this._oAddManualProductBus = sap.ui.getCore().getEventBus();
            this._oAddManualProductBus.unsubscribe(
                "AddManualProduct",
                "MaterialSelected",
                this._onManualProductAdded,
                this
            );

            this._oAddManualProductBus.subscribe(
                "AddManualProduct",
                "MaterialSelected",
                this._onManualProductAdded,
                this
            );
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getTarget("ModPedCeramicos").attachDisplay(jQuery.proxy(this.handleRouteMatched, this));
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

        onExit: function () {
            if (this._oAddManualProductBus) {
                this._oAddManualProductBus.unsubscribe(
                    "AddManualProduct",
                    "MaterialSelected",
                    this._onManualProductAdded,
                    this
                );
            }
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

            if (this._restoreModPedCeramicosFromStockReturn(oProj, sPedido)) {
                sap.ui.core.BusyIndicator.hide(0);
                return;
            }

            const oCfg = this._getPedidoUnitConfig("1130");

            oProj.setProperty("/pedidoModificar", sPedido);
            oProj.setProperty("/isFormEnabled", false);
            oProj.setProperty("/isDetailEdit", false);
            oProj.setProperty("/modoModificacion", true);
            oProj.setProperty("/SalesOrgModificacion", oCfg.SalesOrg);
            oProj.setProperty("/PlantModificacion", oCfg.Plant);

            oProj.setProperty("/oMaterialDeletedMod", []);
            oProj.setProperty("/oManualBultosByItm", {});

            Promise.all([
                this._getDocRefPendientePorPedido(sPedido),
                this._getPedConRefItem(sPedido),
                this._loadObsFromPedidoReferencia(sPedido),
                this._getTipChangeData(),
                this._getCOnditionPay("1130"),
                this._getReason()
            ]).then(function (values) {
                const oCabResp = values[0];
                const oItemResp = values[1];
                const oObsResp = values[2];
                const oTipoCambioResp = values[3];

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

                // Si DoRePe trae cabecera, manda DoRePe.
                // Pero conserva datos de OrderTracking que DoRePe no trae: VendorID, Vendor, TaxNumber, etc.
                if (oCab) {
                    oCab = Object.assign({}, oCabStorage, oCab);
                } else if (Object.keys(oCabStorage).length) {
                    oCab = oCabStorage;
                    void 0;
                }

                if (oCab) {
                    oCab = this._mergeHeaderNonEmpty(oCabStorage, oCab);
                }

                if (!oCab && Object.keys(oCabStorage).length) {
                    oCab = oCabStorage;
                    void 0;
                }

                if (!oCab) {
                    oCab = {
                        SalesDocument: sPedido,
                        SalesOrganization: "1130",
                        Division: "",
                        TransactionCurrency: "USD",
                        SalesDocumentType: "",
                        Customer: ""
                    };
                }

                if (!aItems.length) {
                    sap.m.MessageBox.warning("No se encontraron posiciones para el pedido " + sPedido + ".");
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

                oDataModel.setProperty("/oConditionPay", values[4].oResults || []);
                oDataModel.setProperty("/oReason", values[5].oResults || []);

                this._mapPedidoModificacionCeramicosToModel(oCab, aItems);

                this._applyObsFromPedidoReferenciaMod(oObsResp);

                this._refreshBloqueoEdicionCalidadSMod();

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
                    "TRANSACTIONCURRENCY",
                    "Currency",
                    "CURRENCY",
                    "DocumentCurrency",
                    "Moneda"
                ) || "PEN";

                void 0;
                void 0;
                void 0;

                return Promise.all([
                    this._getDatClientView(sCustomer, "1130"),
                    this._getClientPet("1130"),
                    this._getAddresTravel(sCustomer, "1130"),
                    this._getAnticipo(sCustomer, sCurrency, "1130"),
                    this._getNotaCredito(sCustomer, sCurrency, "1130")
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
                    return item.Customer === sCustomer;
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
                        return r.Customer && r.Agencyname;
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
                        Id: String(id || "").trim(),
                        Text: String(text || "").trim(),
                        Name: String(name || "").trim(),
                        Customer: String(cust || "").trim(),
                        Source: source || "DESTINO"
                    };
                };

                const aDestino1 = aDirecciones
                    .filter(function (r) {
                        return r.Destinationid || r.Destination;
                    })
                    .map(function (r) {
                        return fnNormDestino(
                            r.Destinationid,
                            r.Destination,
                            r.Destinationname,
                            r.Customer,
                            "DESTINO"
                        );
                    });

                const aDestino2 = aDirecciones
                    .filter(function (r) {
                        return r.Shippingdestinationid || r.Shippingdestination;
                    })
                    .map(function (r) {
                        return fnNormDestino(
                            r.Shippingdestinationid,
                            r.Shippingdestination,
                            r.Shippingname,
                            r.Customer,
                            "DESTINO"
                        );
                    });

                const mDestinos = new Map();

                aDestino1.concat(aDestino2).forEach(function (d) {
                    if (d.Id && !mDestinos.has(d.Id)) {
                        mDestinos.set(d.Id, d);
                    }
                });

                const aFinal = aDirecciones
                    .filter(function (r) {
                        return r.Finaldestinationid || r.Finaldestination;
                    })
                    .map(function (r) {
                        return fnNormDestino(
                            r.Finaldestinationid,
                            r.Finaldestination,
                            r.Finaldestinationname,
                            r.Customer,
                            "FINAL"
                        );
                    });

                const mFinal = new Map();

                aFinal.forEach(function (d) {
                    if (d.Id && !mFinal.has(d.Id)) {
                        mFinal.set(d.Id, d);
                    }
                });

                oProj.setProperty("/oAgenciasCliente", aAgencias);
                oProj.setProperty("/oAgenciasClienteFiltradas", aAgencias);
                oProj.setProperty("/oDestinosCliente", Array.from(mDestinos.values()));
                oProj.setProperty("/oFinalDestinosCliente", Array.from(mFinal.values()));

                this._aplicarCondicionPagoDesdeReferencia(oCab);
                this._aplicarRecomendacionesDestinoYAgencia(oCab);
                this._capturarEntregaInicialModCeramicos();

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
                    SalesOrganization: "1130"
                });

                oProj.refresh(true);

                oProj.refresh(true);

                const aMaterialesSim = oProj.getProperty("/oMaterial") || [];

                void 0;

                if (aMaterialesSim.length && typeof this.onSimulateOrder === "function") {
                    setTimeout(function () {
                        void 0;
                        this.onSimulateOrder();
                    }.bind(this), 0);
                }
            }.bind(this)).catch(function (oError) {
                void 0;
                this.getMessageBox("error", "No se pudo cargar el pedido de Cerámicos para modificación.");
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

            if (!sZterm) {
                return;
            }
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

            if (sCondActual === sZterm) {
                oModelProyect.setProperty("/inputForm/txtCondPago", sVtext || sZterm);
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

            const fnGetTextByTipobs = function (sTipobs) {
                return aObs
                    .filter(function (oRow) {
                        return String(oRow.Tipobs || "").trim().toUpperCase() === sTipobs;
                    })
                    .map(function (oRow) {
                        return String(oRow.Nota || oRow.Msg || "").trim();
                    })
                    .filter(Boolean)
                    .join("\n");
            };
            const sObsPedido = fnGetTextByTipobs("OBPE");
            const sObsEntrega = fnGetTextByTipobs("OBEN");

            if (sObsPedido) {
                oModel.setProperty("/inputForm/obsPedido", sObsPedido);
            }

            if (sObsEntrega) {
                oModel.setProperty("/inputForm/obsDelivery", sObsEntrega);
            }

            void 0;
        },


        // Ejecutar pedido con referencia
        // confirmacion de orden
        onConfirmCreateOrder: function () {
            const that = this;

            if (this._validateRequiredFields && !this._validateRequiredFields()) {
                return;
            }
            sap.m.MessageBox.confirm(
                "¿Desea crear la orden?",
                {
                    title: "Confirmación",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === sap.m.MessageBox.Action.YES) {
                            that._ModifyOrderCeramicos();
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

                        that._discardModPedCeramicosAndGoSeguimiento();
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
            oProj.setProperty("/oMaterialBase", []);

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

            const oTable = sap.ui.core.Fragment.byId(this.frgIdAddManualProductClient, "tblStockCliente2");
            if (oTable) {
                oTable.removeSelections(true);
            }

            oProj.refresh(true);
        },
        onClearFiltersAndTableClient: function () {
            this._resetFiltersAndTableClient();
        },

        _saveModPedCeramicosDraftForStock: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const sPedido = String(
                oModel.getProperty("/pedidoModificar") ||
                sessionStorage.getItem("pedidoModificarNumero") ||
                ""
            ).trim();

            if (!sPedido) {
                return;
            }

            const aPaths = [
                "pedidoModificar",
                "isFormEnabled",
                "isDetailEdit",
                "modoModificacion",
                "SalesOrgModificacion",
                "PlantModificacion",

                "inputForm",
                "oDatClient",
                "oClientData",
                "docModificarCabecera",
                "oEntregaInicialMod",

                "oMaterial",
                "oMaterialUI",
                "oSchedule",
                "oCantidades",
                "oCantidadesByItm",
                "oRefByItm",

                "oMaterialDeletedMod",
                "oManualBultosByItm",

                "oMaterialOriginalModBase",
                "oMaterialUIOriginalModBase",
                "oCantidadesByItmOriginalModBase",

                "oMaterialOriginalMod",
                "oMaterialUIOriginalMod",
                "oCantidadesByItmOriginalMod"
            ];

            const oDraft = {};

            aPaths.forEach(function (sPath) {
                oDraft[sPath] = oModel.getProperty("/" + sPath);
            });

            try {
                sessionStorage.setItem("modPedCeramicosDraftPedido", sPedido);
                sessionStorage.setItem("modPedCeramicosDraft", JSON.stringify(oDraft));
            } catch (e) {
                void 0;
            }
        },

        _restoreModPedCeramicosFromStockReturn: function (oModel, sPedido) {
            const bReturnFromStock =
                sessionStorage.getItem("modPedCeramicosReturnFromStock") === "X";

            if (!bReturnFromStock) {
                return false;
            }

            sessionStorage.removeItem("modPedCeramicosReturnFromStock");

            const sPedidoActual = String(sPedido || "").trim();
            const sPedidoDraft = String(
                sessionStorage.getItem("modPedCeramicosDraftPedido") || ""
            ).trim();

            if (sPedidoDraft && sPedidoActual && sPedidoDraft !== sPedidoActual) {
                return false;
            }

            const bModeloVivo =
                String(oModel.getProperty("/pedidoModificar") || "").trim() === sPedidoActual &&
                Array.isArray(oModel.getProperty("/oMaterialUI"));

            if (bModeloVivo) {
                oModel.setProperty("/modoModificacion", true);
                oModel.refresh(true);

                void 0;

                return true;
            }

            const sDraft = sessionStorage.getItem("modPedCeramicosDraft");

            if (!sDraft) {
                return false;
            }

            try {
                const oDraft = JSON.parse(sDraft) || {};

                Object.keys(oDraft).forEach(function (sKey) {
                    oModel.setProperty("/" + sKey, oDraft[sKey]);
                });

                oModel.setProperty("/modoModificacion", true);
                oModel.refresh(true);

                void 0;

                return true;
            } catch (e) {
                void 0;
                return false;
            }
        },

        _clearModPedCeramicosDraftForStock: function () {
            sessionStorage.removeItem("modPedCeramicosReturnFromStock");
            sessionStorage.removeItem("modPedCeramicosDraftPedido");
            sessionStorage.removeItem("modPedCeramicosDraft");
        },

        _discardModPedCeramicosAndGoSeguimiento: function () {
            const that = this;

            sessionStorage.setItem("segReturnFromModPedCancel", "X");
            this._navBackToSeguimientoFromModCancel();
            setTimeout(function () {
                try {
                    if (that._clearModPedCeramicosDraftForStock) {
                        that._clearModPedCeramicosDraftForStock();
                    }

                    if (that._clearModPedCeramicosRuntimeState) {
                        that._clearModPedCeramicosRuntimeState();
                    }
                } catch (e) {
                    void 0;
                }
            }, 0);
        },

        _navBackToSeguimientoFromModCancel: function () {
            const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            const oHashChanger = sap.ui.core.routing.HashChanger.getInstance();

            const sHashBefore = oHashChanger.getHash();

            try {
                oRouter.navTo("View", {}, true);
            } catch (e) {
                void 0;
            }
            setTimeout(function () {
                const sHashAfter = oHashChanger.getHash();

                const bSigueEnModPed =
                    String(sHashAfter || "").indexOf("ModPedCeramicos") >= 0;

                const bNoCambioHash = sHashAfter === sHashBefore;

                if (bSigueEnModPed || bNoCambioHash) {
                    void 0;

                    try {
                        oHashChanger.replaceHash("");
                    } catch (e) {
                        void 0;
                    }
                }
            }, 100);
        },



        _clearModPedCeramicosRuntimeState: function () {
            const oView = this.getView();
            const oModel = oView.getModel("oModelProyect") || this.getOwnerComponent().getModel("oModelProyect");
            const oDataModel = oView.getModel("oModelData") || this.getOwnerComponent().getModel("oModelData");

            const fnClone = function (vValue) {
                if (vValue === undefined) {
                    return undefined;
                }

                try {
                    return JSON.parse(JSON.stringify(vValue));
                } catch (e) {
                    return vValue;
                }
            };

            const oInitial = models && models.createModelProyect
                ? models.createModelProyect()
                : {};

            const fnInitial = function (sKey, vDefault) {
                if (Object.prototype.hasOwnProperty.call(oInitial, sKey)) {
                    return fnClone(oInitial[sKey]);
                }

                return fnClone(vDefault);
            };


            if (oModel) {
                oModel.setProperty("/pedidoModificar", "");
                oModel.setProperty("/isFormEnabled", false);
                oModel.setProperty("/isDetailEdit", false);
                oModel.setProperty("/modoModificacion", false);
                oModel.setProperty("/SalesOrgModificacion", "");
                oModel.setProperty("/PlantModificacion", "");

                oModel.setProperty("/inputForm", fnInitial("inputForm", {}));
                oModel.setProperty("/oDatClient", fnInitial("oDatClient", {}));
                oModel.setProperty("/oClientData", fnInitial("oClientData", {}));
                oModel.setProperty("/docModificarCabecera", {});
                oModel.setProperty("/fechaActual", "");

                oModel.setProperty("/oMaterial", []);
                oModel.setProperty("/oMaterialUI", []);
                oModel.setProperty("/oSchedule", []);
                oModel.setProperty("/oCantidades", {});
                oModel.setProperty("/oCantidadesByItm", {});
                oModel.setProperty("/oRefByItm", {});

                oModel.setProperty("/Totales", {
                    SubTotal: "0.00",
                    Flete: "0.00",
                    IGV: "0.00",
                    Total: "0.00"
                });

                oModel.setProperty("/oMaterialDeletedMod", []);
                oModel.setProperty("/oManualBultosByItm", {});

                oModel.setProperty("/oMaterialOriginalModBase", []);
                oModel.setProperty("/oMaterialUIOriginalModBase", []);
                oModel.setProperty("/oCantidadesByItmOriginalModBase", {});

                oModel.setProperty("/oMaterialOriginalMod", []);
                oModel.setProperty("/oMaterialUIOriginalMod", []);
                oModel.setProperty("/oCantidadesByItmOriginalMod", {});

                oModel.setProperty("/bBultoOrderDetailsInicializado", false);

                oModel.setProperty("/oSelecTableDetalle", {});
                oModel.setProperty("/oStockEditDetail", {});

                oModel.setProperty("/oAgenciasCliente", []);
                oModel.setProperty("/oAgenciasClienteFiltradas", []);
                oModel.setProperty("/oDestinosCliente", []);
                oModel.setProperty("/oFinalDestinosCliente", []);
                oModel.setProperty("/oEntregaInicialMod", {});

                oModel.setProperty("/oSelectDetail", fnInitial("oSelectDetail", {
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
                }));

                oModel.setProperty("/oMaterialSelect", []);
                oModel.setProperty("/oMaterialBase", []);
                oModel.setProperty("/oTreeCer", []);
                oModel.setProperty("/oAddManual", {
                    Cantidades: {},
                    Envios: []
                });

                oModel.refresh(true);
            }
            if (oDataModel) {
                oDataModel.setProperty("/Anticipo", {});
                oDataModel.setProperty("/NotaCredito", {});
                oDataModel.setProperty("/oTipChangeData", {});
                oDataModel.refresh(true);
            }
            this._bSimulacionCeramicosEnProceso = false;
            this._oContextMaterialEdit = null;

            [
                "_dialogEditDetail",
                "_dialogAddProduct",
                "_dialogAddManualProduct",
                "_dialogAddManualProductClient"
            ].forEach(function (sDialogName) {
                if (this[sDialogName] && this[sDialogName].close) {
                    this[sDialogName].close();
                }
            }.bind(this));
            sessionStorage.removeItem("modPedCeramicosReturnFromStock");
            sessionStorage.removeItem("modPedCeramicosDraftPedido");
            sessionStorage.removeItem("modPedCeramicosDraft");
            sessionStorage.removeItem("pedidoModificarNumero");
            sessionStorage.removeItem("pedidoModificarCabecera");
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
                    return aData.filter(item => toNum(item.Pallets) > 0);
                case "SALDOS":
                    return aData.filter(item =>
                        toNum(item.Saldos) > 0 &&
                        toNum(item.Pallets) === 0
                    );

                case "TODOS":
                default:
                    return aData;
            }
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
                const aBatch = aItems.slice(i, i + iSize);
                const aSettled = await Promise.allSettled(aBatch.map(fn));
                aSettledAll.push(...aSettled);
            }
            return aSettledAll;
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
                        + "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/";
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

                            const sTipo = that._getTipoSeleccionado();
                            let aFiltrado = that._applyTipoFilter(aTotalStock, sTipo);
                            let aFinal = that._prepareDataForCeramicos(aFiltrado);

                            aFinal = that._applyMetrajeFilter(aFinal, fMetrosMin);

                            if (!aFinal.length) {
                                that.getMessageBox("warning", "No se encontraron materiales con los filtros (tipo y metraje).");
                            }
                            oProjModel.setProperty("/oMaterialSelect", aFinal);
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
        _prepareDataForCeramicos: function (aStock) {
            const map = new Map();

            (aStock || []).forEach(item => {
                const sMatnr = (item?.Matnr || "").trim();
                if (!sMatnr) return;

                const nStock = parseFloat(item.StockFisico) || 0;
                const nPallets = parseFloat(item.Pallets) || 0;
                const nSaldos = parseFloat(item.Saldos) || 0;

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
                    acc.Pallets += nPallets;
                    acc.Saldos += nSaldos;
                    if (!acc.Calibre && sCalibre) acc.Calibre = sCalibre;
                    if (!acc.Tono && sTono) acc.Tono = sTono;
                    if (!acc.Calidad && sCalidad) acc.Calidad = sCalidad;
                    if (!acc.Descripcion && item.Descripcion) acc.Descripcion = item.Descripcion;
                    if (!acc.Um && item.Um) acc.Um = item.Um;
                }
            });

            return Array.from(map.values()).map(item => ({
                ...item,
                StockFisico: Number(item.StockFisico.toFixed(2)),
                Pallets: Number(item.Pallets.toFixed(2)),
                Saldos: Number(item.Saldos.toFixed(2))
            }));
        },

        _getCantidadM2ManualCeramicosMod: function (sMatnr, sUmv, fQty) {
            const that = this;

            return new Promise(function (resolve) {
                if (!sMatnr || !sUmv || fQty <= 0) {
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
                    new sap.ui.model.Filter("Quantity", sap.ui.model.FilterOperator.EQ, Number(fQty).toFixed(3))
                ];

                oModelPeso.read("/MaterialPesoSet", {
                    filters: aFilters,
                    success: function (oData) {
                        const oRes = oData && oData.results && oData.results[0];

                        if (!oRes) {
                            resolve(0);
                            return;
                        }

                        const nM2 = parseFloat(oRes.Peso) || 0;
                        resolve(nM2);
                    },
                    error: function () {
                        resolve(0);
                    }
                });
            });
        },
        _calcM2FromStockRowFallbackMod: function (r, sUmv, fQtyBulto) {
            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const norm = function (v) {
                return String(v || "").trim().toUpperCase();
            };

            const sMaterial = norm(r.Matnr || r.Material || r.codigo);
            const sUnidad = norm(sUmv);
            const nQty = toNum(fQtyBulto);

            if (!sMaterial || !["PAL", "CJ"].includes(sUnidad) || nQty <= 0) {
                return 0;
            }

            let oModel = null;

            try {
                oModel = this.getView().getModel("oModelProyect");
            } catch (e) {
                oModel = null;
            }

            if (oModel) {
                const aRows = []
                    .concat(oModel.getProperty("/oMaterialUI") || [])
                    .concat(oModel.getProperty("/oMaterial") || [])
                    .concat(Object.values(oModel.getProperty("/oCantidadesByItm") || {}))
                    .concat(Object.values(oModel.getProperty("/oManualBultosByItm") || {}));

                const getM2 = function (row) {
                    return toNum(
                        row.cantidadM2BaseEdit ||
                        row.cantidadM2 ||
                        row.Cantidad ||
                        row.cantidad
                    );
                };

                const getBultos = function (row) {
                    if (sUnidad === "PAL") {
                        return toNum(
                            row.cantidadPalletsBaseEdit ||
                            row.cantidadPallets ||
                            row.NroPaletas
                        );
                    }

                    return toNum(
                        row.cantidadCajasBaseEdit ||
                        row.cantidadCajas ||
                        row.NroCajas
                    );
                };

                const oBase = aRows.find(function (row) {
                    const sMatRow = norm(row.Material || row.codigo || row.Matnr);
                    return sMatRow === sMaterial && getM2(row) > 0 && getBultos(row) > 0;
                });

                if (oBase) {
                    const nFactor = getM2(oBase) / getBultos(oBase);

                    if (nFactor > 0) {
                        const nM2 = nFactor * nQty;

                        void 0;

                        return nM2;
                    }
                }
            }

            const getM2CajaFromDescripcion = function () {
                const sTexto = String(
                    r.Descripcion ||
                    r.Description ||
                    r.descripcion ||
                    ""
                ).replace(",", ".");

                const aNums = sTexto.match(/\d+(?:\.\d+)?/g) || [];

                for (let i = aNums.length - 1; i >= 0; i--) {
                    const n = toNum(aNums[i]);

                    if (n > 0 && n <= 10) {
                        return n;
                    }
                }

                return 0;
            };

            const nM2Caja = getM2CajaFromDescripcion();

            if (sUnidad === "CJ" && nM2Caja > 0) {
                const nM2 = nM2Caja * nQty;

                void 0;

                return nM2;
            }

            if (sUnidad === "PAL" && nM2Caja > 0) {
                const nStockFisico = toNum(
                    r.StockFisico ||
                    r.TotalStockFisico ||
                    r.stockFisico ||
                    0
                );

                const nPalletsStock = toNum(
                    r.Pallets ||
                    r.TotalPallets ||
                    r.stockPallets ||
                    0
                );

                const nCajasStock = toNum(
                    r.Saldos ||
                    r.TotalSaldos ||
                    r.Cajas ||
                    r.stockCajas ||
                    0
                );

                if (nStockFisico > 0 && nPalletsStock > 0) {
                    let nStockSoloPallets = nStockFisico;

                    if (nCajasStock > 0) {
                        nStockSoloPallets = nStockFisico - (nCajasStock * nM2Caja);
                    }

                    const nFactorPalRaw = nStockSoloPallets > 0
                        ? nStockSoloPallets / nPalletsStock
                        : 0;

                    if (nFactorPalRaw > 0) {
                        const nCajasPorPallet = Math.max(
                            1,
                            Math.round(nFactorPalRaw / nM2Caja)
                        );

                        const nFactorPal = nCajasPorPallet * nM2Caja;
                        const nM2 = nFactorPal * nQty;

                        void 0;

                        return nM2;
                    }
                }
            }


            const nStockFisicoFinal = toNum(
                r.StockFisico ||
                r.TotalStockFisico ||
                r.stockFisico ||
                0
            );

            const nPalletsFinal = toNum(
                r.Pallets ||
                r.TotalPallets ||
                r.stockPallets ||
                0
            );

            const nCajasFinal = toNum(
                r.Saldos ||
                r.TotalSaldos ||
                r.Cajas ||
                r.stockCajas ||
                0
            );

            if (sUnidad === "PAL" && nStockFisicoFinal > 0 && nPalletsFinal > 0 && nCajasFinal <= 0) {
                return (nStockFisicoFinal / nPalletsFinal) * nQty;
            }

            if (sUnidad === "CJ" && nStockFisicoFinal > 0 && nCajasFinal > 0 && nPalletsFinal <= 0) {
                return (nStockFisicoFinal / nCajasFinal) * nQty;
            }

            void 0;

            return 0;
        },

        _restoreDraftCeramicosBeforeManualAdd: function (oModel) {
            if (!oModel) {
                return;
            }

            const sDraft = sessionStorage.getItem("modPedCeramicosDraft");

            if (!sDraft) {
                return;
            }

            const sPedidoDraft = String(
                sessionStorage.getItem("modPedCeramicosDraftPedido") || ""
            ).trim();

            const sPedidoActual = String(
                oModel.getProperty("/pedidoModificar") ||
                sessionStorage.getItem("pedidoModificarNumero") ||
                sPedidoDraft ||
                ""
            ).trim();

            if (sPedidoDraft && sPedidoActual && sPedidoDraft !== sPedidoActual) {
                return;
            }

            const bTieneCliente = !!String(
                oModel.getProperty("/oDatClient/Customer") ||
                oModel.getProperty("/docModificarCabecera/Customer") ||
                ""
            ).trim();

            const bTieneTipoDoc = !!String(
                oModel.getProperty("/inputForm/tipDocument") ||
                oModel.getProperty("/docModificarCabecera/SalesDocumentType") ||
                oModel.getProperty("/docModificarCabecera/DocType") ||
                ""
            ).trim();

            const aMaterialActual = oModel.getProperty("/oMaterial") || [];
            const bTieneMateriales = Array.isArray(aMaterialActual) && aMaterialActual.length > 0;


            if (bTieneCliente && bTieneTipoDoc && bTieneMateriales) {
                return;
            }

            try {
                const oDraft = JSON.parse(sDraft) || {};

                Object.keys(oDraft).forEach(function (sKey) {
                    if (oDraft[sKey] !== undefined) {
                        oModel.setProperty("/" + sKey, oDraft[sKey]);
                    }
                });

                oModel.setProperty("/modoModificacion", true);
                oModel.refresh(true);

                void 0;
            } catch (e) {
                void 0;
            }
        },

        // Carga los datos cuando es supervisor o vendedor
        _onManualProductAdded: async function (sChannel, sEvent, aSelectedRows) {
            const oModel = this.getView().getModel("oModelProyect");
            this._restoreDraftCeramicosBeforeManualAdd(oModel);

            const oData = oModel.getData();

            const aMaterialExist = oModel.getProperty("/oMaterial") || [];
            const aScheduleExist = oModel.getProperty("/oSchedule") || [];
            const aMaterialUIExist = oModel.getProperty("/oMaterialUI") || [];
            const oCantByItmExist = oModel.getProperty("/oCantidadesByItm") || {};
            const oCantByItmNew = Object.assign({}, oCantByItmExist);

            const oManualBultosByItm = Object.assign(
                {},
                oModel.getProperty("/oManualBultosByItm") || {}
            );

            const aMaterialNew = [];
            const aScheduleNew = [];
            const aMaterialUINew = [];

            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const getFirstChildValue = function (r, sField) {
                if (r && r[sField] !== undefined && r[sField] !== null && r[sField] !== "") {
                    return r[sField];
                }

                if (Array.isArray(r.children) && r.children.length) {
                    const oChild = r.children.find(function (ch) {
                        return ch && ch[sField];
                    });

                    return oChild ? (oChild[sField] || "") : "";
                }

                return "";
            };

            const fnToItmNum = function (oItem) {
                const sItm = String(
                    oItem.ItmNumber ||
                    oItem.OriginalItmNumber ||
                    oItem.Posicion ||
                    oItem.Pos ||
                    ""
                ).trim();

                const n = parseInt(sItm, 10);
                return isNaN(n) ? 0 : n;
            };

            const aDeletedModCounter = oModel.getProperty("/oMaterialDeletedMod") || [];
            const aOriginalModCounter =
                oModel.getProperty("/oMaterialOriginalModBase") ||
                oModel.getProperty("/oMaterialOriginalMod") ||
                [];

            const aAllItemsForCounter = []
                .concat(aMaterialExist || [])
                .concat(aMaterialUIExist || [])
                .concat(aDeletedModCounter || [])
                .concat(aOriginalModCounter || []);

            let lastNum = 0;

            if (aAllItemsForCounter.length > 0) {
                lastNum = Math.max.apply(null, aAllItemsForCounter.map(fnToItmNum));
            }

            let iItemCounter = lastNum;

            const nextItm = function () {
                iItemCounter += 10;
                return iItemCounter.toString().padStart(6, "0");
            };

            const sClientId =
                oData.oDatClient?.Customer ||
                oData.docModificarCabecera?.Customer ||
                oData.inputForm?.cliente ||
                "";
            const that = this;

            const fnAddLine = async function (r, sUmv, fQtyBulto) {
                if (fQtyBulto <= 0) {
                    return;
                }

                const sMaterial = String(r.Matnr || r.Material || "").trim();

                if (!sMaterial) {
                    return;
                }

                const nPalFila = toNum(r.cantidadPallets);
                const nCajFila = toNum(r.cantidadCajas);

                const bM2FilaCorrespondeSoloAEstaUnidad =
                    (sUmv === "PAL" && nPalFila > 0 && nCajFila <= 0) ||
                    (sUmv === "CJ" && nCajFila > 0 && nPalFila <= 0);

                let nM2 = bM2FilaCorrespondeSoloAEstaUnidad
                    ? toNum(
                        r.cantidadM2 ||
                        r.Cantidad ||
                        r.cantidad ||
                        0
                    )
                    : 0;

                if (nM2 <= 0) {
                    nM2 = await that._getCantidadM2ManualCeramicosMod(
                        sMaterial,
                        sUmv,
                        fQtyBulto
                    );
                    nM2 = toNum(nM2);
                }

                if (nM2 <= 0) {

                    nM2 = that._calcM2FromStockRowFallbackMod(r, sUmv, fQtyBulto);
                    nM2 = toNum(nM2);

                    void 0;
                }

                if (nM2 <= 0) {
                    void 0;

                    sap.m.MessageToast.show(
                        "No se pudo calcular los M2 para el material " + sMaterial + "."
                    );

                    return;
                }

                const itm = nextItm();

                const sDescripcion = r.Descripcion || r.Description || "";

                const sPick = (
                    (r.__pickLevel || r.pickLevel || r.PickLevel || (r.isGroup ? "PARENT" : "CHILD") || "").trim()
                ) || "CHILD";

                const bSeleccionDesdeCabecera = sPick === "PARENT" || !!r.isGroup;


                const sCalibre = bSeleccionDesdeCabecera
                    ? ""
                    : getFirstChildValue(r, "Calibre");

                const sTono = bSeleccionDesdeCabecera
                    ? ""
                    : getFirstChildValue(r, "Tono");


                const sTipBulto = sUmv === "CJ"
                    ? "S"
                    : String(r.TipBulto || r.Zzcalidad || r.calidad || "").trim();

                const nPalIngresado = sUmv === "PAL" ? fQtyBulto : 0;
                const nCajIngresado = sUmv === "CJ" ? fQtyBulto : 0;

                const sPalManual = nPalIngresado > 0 ? nPalIngresado.toFixed(3) : "";
                const sCajManual = nCajIngresado > 0 ? nCajIngresado.toFixed(3) : "";
                const sCalidadManual = sUmv === "CJ" ? "S" : "";

                const bBloqueaEdicionCalidadS = String(sCalidadManual || "").trim().toUpperCase() === "S";

                const oManualSnapshot = {
                    ManualCantidadPallets: sPalManual,
                    ManualCantidadCajas: sCajManual,
                    ManualCalibre: sCalibre,
                    ManualTono: sTono,
                    ManualCalidad: sCalidadManual,

                    cantidadPalletsManual: sPalManual,
                    cantidadCajasManual: sCajManual,
                    calibreManual: sCalibre,
                    tonoManual: sTono,
                    calidadManual: sCalidadManual,

                    BloqueaEdicionCalidadS: bBloqueaEdicionCalidadS,
                    EditablePorCalidadS: !bBloqueaEdicionCalidadS
                };

                const oManualBulto = {
                    Material: sMaterial,

                    UMV: "M2",
                    TargetQu: "M2",
                    cantidad: nM2.toFixed(3),
                    Cantidad: nM2.toFixed(3),
                    cantidadM2: nM2.toFixed(3),

                    cantidadPallets: sPalManual,
                    cantidadCajas: sCajManual,
                    NroPaletas: sPalManual,
                    NroCajas: sCajManual,

                    Calibre: sCalibre,
                    calibre: sCalibre,
                    Zzcalibre: sCalibre,
                    Tono: sTono,
                    tono: sTono,
                    Zztono: sTono,

                    calidad: sCalidadManual,
                    Zzcalidad: sCalidadManual,
                    TipBulto: sCalidadManual,

                    ...oManualSnapshot,

                    __isNewManual: true,
                    __keepManualBultos: true,
                    AccionPosicion: "I",
                    TipoOperacion: "I"
                };

                oManualBultosByItm[itm] = oManualBulto;

                const nTotalPal = toNum(r.TotalPallets ?? r.Pallets ?? r.stockPallets);
                const nTotalCaj = toNum(r.TotalSaldos ?? r.Saldos ?? r.stockCajas);
                const aChildren = (Array.isArray(r.children) && r.children.length) ? r.children : undefined;
                aMaterialNew.push({
                    ClienteId: sClientId,
                    ItmNumber: itm,
                    Material: sMaterial,
                    Plant: "1001",
                    TargetQu: "M2",
                    UMV: "M2",
                    cantidad: nM2.toFixed(3),
                    Cantidad: nM2.toFixed(3),
                    cantidadM2: nM2.toFixed(3),

                    pickLevel: sPick,
                    __pickLevel: sPick,

                    cantidadPallets: sPalManual,
                    cantidadCajas: sCajManual,
                    NroPaletas: sPalManual,
                    NroCajas: sCajManual,
                    Calibre: sCalibre,
                    Zzcalibre: sCalibre,
                    Tono: sTono,
                    Zztono: sTono,
                    Zzcalidad: sCalidadManual,
                    calidad: sCalidadManual,
                    TipBulto: sCalidadManual,
                    ...oManualSnapshot,

                    __isNewManual: true,
                    __keepManualBultos: true,
                    AccionPosicion: "I",
                    TipoOperacion: "I"
                });
                aScheduleNew.push({
                    ClientId: sClientId,
                    ItmNumber: itm,
                    SchedLine: "0001",
                    ReqQty: nM2.toFixed(3)
                });

                aMaterialUINew.push({
                    ItmNumber: itm,
                    Material: sMaterial,
                    codigo: sMaterial,

                    Descripcion: sDescripcion,
                    descripcion: sDescripcion,
                    Description: sDescripcion,

                    Calibre: sCalibre,
                    calibre: sCalibre,
                    Zzcalibre: sCalibre,

                    Tono: sTono,
                    tono: sTono,
                    Zztono: sTono,

                    calidad: sCalidadManual,
                    Zzcalidad: sCalidadManual,
                    TipBulto: sCalidadManual,

                    UMV: "M2",
                    TargetQu: "M2",

                    stockPallets: toNum(r.Pallets),
                    stockCajas: toNum(r.Saldos),
                    Pallets: toNum(r.Pallets),
                    Saldos: toNum(r.Saldos),

                    pickLevel: sPick,
                    __pickLevel: sPick,
                    TotalPallets: (sPick === "PARENT") ? nTotalPal : undefined,
                    TotalSaldos: (sPick === "PARENT") ? nTotalCaj : undefined,
                    children: (sPick === "PARENT") ? aChildren : undefined,
                    cantidadPallets: sPalManual,
                    cantidadCajas: sCajManual,
                    NroPaletas: sPalManual,
                    NroCajas: sCajManual,
                    cantidad: nM2.toFixed(3),
                    Cantidad: nM2.toFixed(3),
                    cantidadM2: nM2.toFixed(3),

                    cantidadPalletsBaseEdit: sPalManual,
                    cantidadCajasBaseEdit: sCajManual,
                    cantidadM2BaseEdit: nM2.toFixed(3),

                    precioUnit: 0,
                    descuentos: 0,
                    impuesto: 0,
                    subtotal: 0,
                    total: 0,

                    ...oManualSnapshot,

                    __isNewManual: true,
                    __keepManualBultos: true,
                    AccionPosicion: "I",
                    TipoOperacion: "I"
                });

                oCantByItmNew[itm] = {
                    Material: sMaterial,
                    UMV: "M2",
                    TargetQu: "M2",
                    cantidad: nM2.toFixed(3),
                    Cantidad: nM2.toFixed(3),
                    cantidadM2: nM2.toFixed(3),
                    cantidadPallets: sPalManual,
                    cantidadCajas: sCajManual,
                    NroPaletas: sPalManual,
                    NroCajas: sCajManual,
                    Calibre: sCalibre,
                    calibre: sCalibre,
                    Zzcalibre: sCalibre,

                    Tono: sTono,
                    tono: sTono,
                    Zztono: sTono,

                    Zzcalidad: sCalidadManual,
                    calidad: sCalidadManual,
                    TipBulto: sCalidadManual,

                    ...oManualSnapshot,

                    __isNewManual: true,
                    __keepManualBultos: true,
                    AccionPosicion: "I",
                    TipoOperacion: "I"
                };
            };

            for (const r of (aSelectedRows || [])) {
                const qPal = toNum(r.cantidadPallets);
                const qCaj = toNum(r.cantidadCajas);

                if (qPal > 0) {
                    await fnAddLine(r, "PAL", qPal);
                }

                if (qCaj > 0) {
                    await fnAddLine(r, "CJ", qCaj);
                }
            }

            if (!aMaterialNew.length) {
                sap.m.MessageBox.warning("No se pudo agregar el material porque la fila no trae M2 calculado.");
                return;
            }

            oModel.setProperty("/oMaterial", aMaterialExist.concat(aMaterialNew));
            oModel.setProperty("/oSchedule", aScheduleExist.concat(aScheduleNew));
            oModel.setProperty("/oMaterialUI", aMaterialUIExist.concat(aMaterialUINew));
            oModel.setProperty("/oCantidadesByItm", oCantByItmNew);
            oModel.setProperty("/oManualBultosByItm", oManualBultosByItm);

            oModel.refresh(true);

            if (typeof this.onSimulateOrder === "function") {
                this.onSimulateOrder();
            }

            sap.m.MessageToast.show("Productos agregados correctamente");
        },
        _onPressAddProduct: function () {
            const oModel = this.getView().getModel("oModelProyect");

            const sCustomer =
                oModel.getProperty("/oDatClient/Customer") ||
                oModel.getProperty("/docModificarCabecera/Customer") ||
                oModel.getProperty("/docModificarCabecera/Kunnr") ||
                "";

            const sPedido =
                oModel.getProperty("/pedidoModificar") ||
                sessionStorage.getItem("pedidoModificarNumero") ||
                "";

            if (!sCustomer) {
                sap.m.MessageToast.show("No se encontró Customer para continuar");
                return;
            }

            if (sPedido) {
                sessionStorage.setItem("pedidoModificarNumero", sPedido);
            }
            this._saveModPedCeramicosDraftForStock();

            this.getOwnerComponent().getRouter().navTo("AddManualProduct", {
                app: sCustomer
            });
        },
        // Calcular El Peso Por fila
        onSimulateOrderCliente: async function () {

            const oModelProyect = this.getView().getModel("oModelProyect");
            const oData = oModelProyect.getData();

            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = this._formatDateForSAP(sFechaActual);

            const toNumber = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            const aItemsTech = oData.oMaterial || [];

            const aPartners = this._buildHeaderToPartnersSimCeramicos(oData);
            const aItemsTechSim = this._buildHeaderToItemSimCeramicos(aItemsTech);
            const sPoSupplem = "CLTE";
            const aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];

            const mTargetByItm = {};
            aItemsTech.forEach(it => {
                if (it?.ItmNumber) mTargetByItm[it.ItmNumber] = (it.TargetQu || "").trim();
            });
            const mUIByItm = {};
            aMaterialUI.forEach(r => { if (r?.ItmNumber) mUIByItm[r.ItmNumber] = r; });

            const oCantByItm = oModelProyect.getProperty("/oCantidadesByItm") || {};
            const oCabeceraMod = oData.docModificarCabecera || {};
            const oInputForm = oData.inputForm || {};
            const oDatClient = oData.oDatClient || {};

            const sClientIdSim = String(
                oDatClient.Customer ||
                oCabeceraMod.Customer ||
                oCabeceraMod.SoldToParty ||
                oCabeceraMod.ClientId ||
                oInputForm.cliente ||
                oInputForm.Customer ||
                ""
            ).trim();

            const sDocTypeSim = String(
                oInputForm.tipDocument ||
                oCabeceraMod.SalesDocumentType ||
                oCabeceraMod.DocType ||
                oCabeceraMod.AUART ||
                "ZPES"
            ).trim();

            const sSalesOrgSim = String(
                oDatClient.SalesOrganization ||
                oCabeceraMod.SalesOrganization ||
                oCabeceraMod.SalesOrg ||
                oData.SalesOrgModificacion ||
                "1130"
            ).trim();

            const sDivisionSim = String(
                oDatClient.Division ||
                oCabeceraMod.Division ||
                oCabeceraMod.DivisionCode ||
                "S1"
            ).trim();

            const sCurrencySim = String(
                oInputForm.moneda ||
                oCabeceraMod.TransactionCurrency ||
                oCabeceraMod.Currency ||
                "PEN"
            ).trim();

            const sPmntTrmsSim = String(
                oInputForm.cbCondPago ||
                oCabeceraMod.PaymentTerms ||
                oCabeceraMod.Pmnttrms ||
                ""
            ).trim();

            const sPurchNoCSim = String(
                oInputForm.purchaseOrder ||
                oCabeceraMod.PurchaseOrderByCustomer ||
                oCabeceraMod.PurchNoC ||
                ""
            ).trim();

            const oPriceDate = oPurchDate;

            const aSchedule = aItemsTech
                .map(it => {
                    const ui = mUIByItm[it.ItmNumber] || {};
                    const oCantItm = oCantByItm[it.ItmNumber] || {};
                    const sTarget = (it.TargetQu || ui.TargetQu || ui.UMV || "").trim();

                    let nQty = 0;

                    if (sTarget === "PAL") {
                        nQty =
                            toNumber(oCantItm.cantidad) ||
                            toNumber(ui.cantidadPallets) ||
                            toNumber(it.cantidad) ||
                            toNumber(it.ReqQty) ||
                            toNumber(it.TargetQty);
                    } else if (sTarget === "CJ") {
                        nQty =
                            toNumber(oCantItm.cantidad) ||
                            toNumber(ui.cantidadCajas) ||
                            toNumber(it.cantidad) ||
                            toNumber(it.ReqQty) ||
                            toNumber(it.TargetQty);
                    } else {
                        nQty =
                            toNumber(oCantItm.cantidad) ||
                            toNumber(ui.cantidad) ||
                            toNumber(it.cantidad) ||
                            toNumber(it.ReqQty) ||
                            toNumber(it.TargetQty);
                    }

                    return {
                        ClientId: oData.oDatClient?.Customer || "",
                        ItmNumber: it.ItmNumber,
                        SchedLine: "0001",
                        ReqQty: nQty.toFixed(3)
                    };
                })
                .filter(s => toNumber(s.ReqQty) > 0);

            if (!aSchedule.length) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.warning("Ingrese una cantidad mayor a 0 antes de recalcular.");
                return;
            }

            oModelProyect.setProperty("/oSchedule", aSchedule);



            const oPayloadBase = {
                ClientId: sClientIdSim,
                TOperation: oData.TOperation || "CS",
                DocType: sDocTypeSim,
                SalesOrg: sSalesOrgSim,
                DistrChan: sDocTypeSim === "ZPEF" ? "C2" : "C1",
                Division: sDivisionSim,
                ReqDateH: oPurchDate,
                PurchDate: this._formatDateForSAP(oInputForm.ocExpDate),
                PriceDate: oPriceDate,
                PurchNoC: sPurchNoCSim,
                ShipCond: oInputForm.tipoEntrega === "1" ? "02" : "01",
                Pmnttrms: sPmntTrmsSim,
                Currency: sCurrencySim,
                PoMethod: "Z001",
                PoSupplem: sPoSupplem,
                HeaderToItem: aItemsTechSim,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toConditionEx: [
                    {
                        CondValue: "0.00",
                        Condvalue: "0.00"
                    }
                ],
                HeaderToReturn: [{}]
            };

            const oPayload = this._cleanPayload(oPayloadBase);

            const oModelEntity = this._getOrCreateOModelEntity();

            void 0;
            void 0;
            void 0;
            void 0;
            // VALIDACIÓN ANTES DE SIMULAR
            if (!oPayload.ClientId || !oPayload.DocType || !oPayload.SalesOrg || !oPayload.Division) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("Faltan datos de cabecera para simular: cliente, tipo documento, organización o división.");
                void 0;
                return;
            }

            if (!oPayload.HeaderToItem || !oPayload.HeaderToItem.length) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay posiciones válidas para simular.");
                void 0;
                return;
            }

            if (!oPayload.HeaderToSchedule || !oPayload.HeaderToSchedule.length) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay cantidades válidas para simular.");
                void 0;
                return;
            }

            if (!oPayload.HeaderToPartners || !oPayload.HeaderToPartners.length) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay interlocutores válidos para simular.");
                void 0;
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            const oPriceCondResp = await this._getPriceConditionsBySalesOrg(sSalesOrgSim);
            const mPriceConditionTypes = this._buildDiscountConditionTypeMap(oPriceCondResp.oResults);

            if (oPriceCondResp.sEstado !== "S") {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No se pudo obtener la tabla de condiciones de precio para la organización " + sSalesOrgSim + ".");
                return;
            }

            if (!Object.keys(mPriceConditionTypes).length) {
                sap.ui.core.BusyIndicator.hide();

                void 0;

                sap.m.MessageBox.error(
                    "El servicio PriceConditions respondió, pero no se identificaron condiciones de descuento para la organización " +
                    sSalesOrgSim +
                    ". Revisar campo PriceCondition y Classification."
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
                    if (!aConditions.length) {
                        this._bSimulacionCeramicosEnProceso = false;
                        sap.m.MessageBox.error(" No se recibió información de simulación desde SAP.");
                        return;
                    }
                    const mCond = {};
                    aConditions.forEach(c => {
                        const key = c.ItmNumber;
                        if (!mCond[key]) mCond[key] = [];
                        mCond[key].push(c);
                    });

                    let aReporte = aMaterialUI.map(mat => {
                        const sItm = mat.ItmNumber;
                        const conds = mCond[sItm] || [];
                        const sTarget = (mat.TargetQu || mTargetByItm[sItm] || "").trim();

                        const condZPRE = conds.find(c => c.CondType === "ZPRE");
                        const precioBruto = toNumber(condZPRE?.Condvalue);

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

                        if (aRtnLines.length > 0) {
                            aRtnLines.forEach(line => {
                                const partes = line.split("-").map(p => (p || "").trim()).filter(Boolean);
                                const isCaja = partes.includes("S");
                                const cantidadTmp = isCaja ? toNumber(partes[3]) : toNumber(partes[2]);
                                if (sTarget === "CJ" && isCaja) { cantidad = cantidadTmp; calidadS = "S"; }
                                if (sTarget === "PAL" && !isCaja) { cantidad = cantidadTmp; }
                            });
                        }
                        if (cantidad === 0) {
                            if (sTarget === "CJ") {
                                cantidad = toNumber(mat.cantidadCajas);
                                if (!calidadS) calidadS = "S";
                            } else if (sTarget === "PAL") {
                                cantidad = toNumber(mat.cantidadPallets);
                            } else {
                                cantidad = toNumber(mat.cantidad);
                            }
                        }

                        const precioLista = cantidad > 0 ? (precioBruto / cantidad) : 0;
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
                            TargetQu: sTarget,
                            UMV: "M2",
                            Calibre: calibreFinal,
                            calibre: calibreFinal,
                            Zzcalibre: calibreFinal,

                            Tono: tonoFinal,
                            tono: tonoFinal,
                            Zztono: tonoFinal,
                            stockPallets: nStockPal,
                            stockCajas: nStockCaj,
                            prLista: precioLista.toFixed(2),
                            descuentos: descuentoPorcentaje.toFixed(2),
                            prUnit: precioUnit.toFixed(2),
                            total: total.toFixed(2),
                            calidad: calidadFinal
                        };
                    });
                    aReporte = await this._enrichBultosFromOrderDetailsMod(aReporte);
                    aReporte = this._restoreManualBultosInReporteMod(aReporte);

                    void 0;

                    const subtotalGeneral = aReporte.reduce((acc, item) => acc + toNumber(item.total), 0);
                    const embalajeTotal = aConditions.filter(c => c.CondType === "ZRFN").reduce((acc, c) => acc + toNumber(c.Condvalue), 0);
                    const igvTotal = aConditions.filter(c => c.CondType === "MWST").reduce((acc, c) => acc + toNumber(c.Condvalue), 0);
                    const totalFooter = subtotalGeneral + embalajeTotal + igvTotal;

                    aReporte = this._applyBloqueoEdicionCalidadSMod(aReporte);
                    oModelProyect.setProperty("/oMaterialUI", aReporte);
                    oModelProyect.setProperty("/Totales", {
                        SubTotal: subtotalGeneral.toFixed(2),
                        Flete: embalajeTotal.toFixed(2),
                        IGV: igvTotal.toFixed(2),
                        Total: totalFooter.toFixed(2)
                    });
                    const aPesoPromises = aReporte.map((row, index) => {
                        const sMatnr = String(row.Material || row.codigo || "").trim();
                        const sPathPeso = `/oMaterialUI/${index}/peso`;

                        if (!sMatnr) {
                            oModelProyect.setProperty(sPathPeso, "0.000");
                            return Promise.resolve();
                        }
                        const nM2 = toNumber(
                            row.cantidadM2 !== undefined && row.cantidadM2 !== null && row.cantidadM2 !== ""
                                ? row.cantidadM2
                                : row.cantidad !== undefined && row.cantidad !== null && row.cantidad !== ""
                                    ? row.cantidad
                                    : row.Cantidad
                        );

                        if (nM2 <= 0) {
                            oModelProyect.setProperty(sPathPeso, "0.000");
                            return Promise.resolve();
                        }

                        return this._getPesoFromService(sMatnr, "M2", nM2)
                            .then(v => {
                                oModelProyect.setProperty(sPathPeso, toNumber(v).toFixed(3));
                            })
                            .catch(() => {
                                oModelProyect.setProperty(sPathPeso, "0.000");
                            });
                    });

                    await Promise.all(aPesoPromises);
                    oModelProyect.refresh(true);
                    sap.m.MessageToast.show("Simulación calculada y pintada correctamente.");
                },
                error: (oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error(" Error en la simulación para cliente");
                }
            });
        },
        onSimulateOrder: async function () {
            if (this._bSimulacionCeramicosEnProceso) {
                void 0;
                return;
            }

            this._bSimulacionCeramicosEnProceso = true;

            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oData = oModelProyect.getData();

            const sFechaActual = oModelProyect.getProperty("/fechaActual");
            const oPurchDate = this._formatDateForSAP(sFechaActual);
            const oPriceDate = this._formatDateForSAP(
                oData.inputForm?.priceDate || oData.inputForm?.PriceDate || sFechaActual
            );

            const toNumber = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            let aItemsTech = oModelProyect.getProperty("/oMaterial") || [];
            const aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];

            // Seguridad: si una posición existe en UI pero no en oMaterial,
            // se reconstruye para que viaje en HeaderToItem.
            const mTechByItm = {};
            aItemsTech.forEach(function (it) {
                if (it && it.ItmNumber) {
                    mTechByItm[String(it.ItmNumber).padStart(6, "0")] = it;
                }
            });

            aMaterialUI.forEach(function (ui) {
                const sItm = String(ui.ItmNumber || "").padStart(6, "0");
                const sMat = String(ui.Material || ui.codigo || "").trim();

                if (!sItm || !sMat || mTechByItm[sItm]) {
                    return;
                }

                const sTarget = String(ui.TargetQu || "").trim() || "M2";

                const oTech = {
                    ClienteId: oModelProyect.getProperty("/oDatClient/Customer") || "",
                    ItmNumber: sItm,
                    Material: sMat,
                    Plant: String(ui.Plant || "1001").trim(),
                    TargetQu: sTarget,
                    Zzcalibre: ui.Calibre || ui.calibre || ui.Zzcalibre || "",
                    Zztono: ui.Tono || ui.tono || ui.Zztono || "",
                    Zzcalidad: ui.calidad || ui.Calidad || ui.Zzcalidad || "S"
                };

                aItemsTech.push(oTech);
                mTechByItm[sItm] = oTech;
            });

            oModelProyect.setProperty("/oMaterial", aItemsTech);

            const aPartners = this._buildHeaderToPartnersSimCeramicos(oData);
            const aItemsTechSim = this._buildHeaderToItemSimCeramicos(aItemsTech);
            const sPoSupplem = this._getPoSupplemSimCeramicos();
            const mTargetByItm = {};
            aItemsTech.forEach(it => {
                if (it?.ItmNumber) mTargetByItm[it.ItmNumber] = (it.TargetQu || "").trim();
            });

            const mUIByItm = {};
            aMaterialUI.forEach(r => { if (r?.ItmNumber) mUIByItm[r.ItmNumber] = r; });

            const oCantByItm = oModelProyect.getProperty("/oCantidadesByItm") || {};

            const oCabeceraMod = oData.docModificarCabecera || {};
            const oInputForm = oData.inputForm || {};
            const oDatClient = oData.oDatClient || {};

            const sClientIdSim = String(
                oDatClient.Customer ||
                oCabeceraMod.Customer ||
                oCabeceraMod.SoldToParty ||
                oCabeceraMod.ClientId ||
                oInputForm.cliente ||
                oInputForm.Customer ||
                ""
            ).trim();

            const sDocTypeSim = String(
                oInputForm.tipDocument ||
                oCabeceraMod.SalesDocumentType ||
                oCabeceraMod.DocType ||
                oCabeceraMod.AUART ||
                "ZPES"
            ).trim();

            const sSalesOrgSim = String(
                oDatClient.SalesOrganization ||
                oCabeceraMod.SalesOrganization ||
                oCabeceraMod.SalesOrg ||
                oData.SalesOrgModificacion ||
                "1130"
            ).trim();

            const sDivisionSim = String(
                oDatClient.Division ||
                oCabeceraMod.Division ||
                oCabeceraMod.DivisionCode ||
                "S1"
            ).trim();

            const sCurrencySim = String(
                oInputForm.moneda ||
                oCabeceraMod.TransactionCurrency ||
                oCabeceraMod.Currency ||
                oCabeceraMod.DocumentCurrency ||
                "PEN"
            ).trim();

            const sPmntTrmsSim = String(
                oInputForm.cbCondPago ||
                oCabeceraMod.PaymentCondition ||
                oCabeceraMod.PaymentTerms ||
                oCabeceraMod.CustomerPaymentTerms ||
                oCabeceraMod.Pmnttrms ||
                oCabeceraMod.Zterm ||
                ""
            ).trim();

            const sPurchNoCSim = String(
                oInputForm.purchaseOrder ||
                oCabeceraMod.PurchaseOrderByCustomer ||
                oCabeceraMod.PurchNoC ||
                oCabeceraMod.PurchaseOrder ||
                ""
            ).trim();

            const sTipoEntregaSim = String(oInputForm.tipoEntrega || "").trim();

            const sShipCondSim = sTipoEntregaSim === "1"
                ? "02"
                : String(
                    oCabeceraMod.DeliveryCondition ||
                    oCabeceraMod.ShippingCondition ||
                    oCabeceraMod.ShipCond ||
                    "01"
                ).trim();

            const aSchedule = aItemsTech
                .map(it => {
                    const sItm = String(it.ItmNumber || "").padStart(6, "0");
                    const ui = mUIByItm[sItm] || {};
                    const oCantItm = oCantByItm[sItm] || {};
                    const nQty =
                        toNumber(oCantItm.cantidadM2) ||
                        toNumber(oCantItm.Cantidad) ||
                        toNumber(oCantItm.cantidad) ||
                        toNumber(ui.cantidadM2) ||
                        toNumber(ui.Cantidad) ||
                        toNumber(ui.cantidad) ||
                        toNumber(it.cantidadM2) ||
                        toNumber(it.Cantidad) ||
                        toNumber(it.cantidad) ||
                        toNumber(it.ReqQty) ||
                        toNumber(it.TargetQty);

                    return {
                        ClientId: sClientIdSim,
                        ItmNumber: sItm,
                        SchedLine: "0001",
                        ReqQty: nQty.toFixed(3)
                    };
                })
                .filter(s => toNumber(s.ReqQty) > 0);
            if (!aSchedule.length) {
                this._bSimulacionCeramicosEnProceso = false;
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.warning("Ingrese una cantidad mayor a 0 antes de recalcular.");
                return;
            }

            oModelProyect.setProperty("/oSchedule", aSchedule);

            const oPayloadBase = {
                ClientId: sClientIdSim,
                TOperation: oData.TOperation || "CS",
                DocType: sDocTypeSim,
                SalesOrg: sSalesOrgSim,
                DistrChan: sDocTypeSim === "ZPEF" ? "C2" : "C1",
                Division: sDivisionSim,
                ReqDateH: oPurchDate,
                PurchDate: this._formatDateForSAP(oInputForm.ocExpDate) || oPurchDate,
                PriceDate: oPriceDate,
                PurchNoC: sPurchNoCSim,
                ShipCond: sShipCondSim,
                Pmnttrms: sPmntTrmsSim,
                Currency: sCurrencySim,
                PoMethod: "Z001",
                HeaderToItem: aItemsTechSim,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toConditionEx: [
                    {
                        CondValue: "0.00",
                        Condvalue: "0.00"
                    }
                ],
                HeaderToReturn: [{}]
            };

            if (sPoSupplem) {
                oPayloadBase.PoSupplem = sPoSupplem;
            }

            const oPayload = this._cleanPayload(oPayloadBase);

            const oModelEntity = this._getOrCreateOModelEntity();

            void 0;
            void 0;
            void 0;
            void 0;
            void 0;
            void 0;
            // VALIDACIÓN ANTES DE SIMULAR
            if (!oPayload.ClientId || !oPayload.DocType || !oPayload.SalesOrg || !oPayload.Division) {
                this._bSimulacionCeramicosEnProceso = false;
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("Faltan datos de cabecera para simular: cliente, tipo documento, organización o división.");
                void 0;
                return;
            }

            if (!oPayload.HeaderToItem || !oPayload.HeaderToItem.length) {
                this._bSimulacionCeramicosEnProceso = false;
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay posiciones válidas para simular.");
                void 0;
                return;
            }

            if (!oPayload.HeaderToSchedule || !oPayload.HeaderToSchedule.length) {
                this._bSimulacionCeramicosEnProceso = false;
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay cantidades válidas para simular.");
                void 0;
                return;
            }

            if (!oPayload.HeaderToPartners || !oPayload.HeaderToPartners.length) {
                this._bSimulacionCeramicosEnProceso = false;
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay interlocutores válidos para simular.");
                void 0;
                return;
            }

            sap.ui.core.BusyIndicator.show(0);

            const oPriceCondResp = await this._getPriceConditionsBySalesOrg(sSalesOrgSim);
            const mPriceConditionTypes = this._buildDiscountConditionTypeMap(oPriceCondResp.oResults);

            if (oPriceCondResp.sEstado !== "S" || !Object.keys(mPriceConditionTypes).length) {
                this._bSimulacionCeramicosEnProceso = false;
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No se pudo obtener la tabla de condiciones de precio para la organización " + sSalesOrgSim + ".");
                return;
            }

            if (!Object.keys(mPriceConditionTypes).length) {
                sap.ui.core.BusyIndicator.hide();

                void 0;

                sap.m.MessageBox.error(
                    "El servicio PriceConditions respondió, pero no se identificaron condiciones de descuento para la organización " +
                    sSalesOrgSim +
                    ". Revisar campo PriceCondition y Classification."
                );
                return;
            }

            void 0;
            void 0;

            oModelEntity.create("/iHeaderSet", oPayload, {
                success: async (oResponse) => {
                    sap.ui.core.BusyIndicator.hide();
                    this._bSimulacionCeramicosEnProceso = false;

                    const aConditionsRaw = oResponse?.toConditionEx?.results || [];
                    const aReturns = oResponse?.HeaderToReturn?.results || [];

                    const aReturnErrors = aReturns.filter(function (r) {
                        const sType = String(r.Type || "").trim().toUpperCase();
                        return ["E", "A", "X"].includes(sType);
                    });

                    if (aReturnErrors.length) {
                        const sMsg = aReturnErrors
                            .map(function (r) {
                                return String(r.Message || "").trim();
                            })
                            .filter(Boolean)
                            .join("\n");

                        sap.m.MessageBox.error(
                            sMsg || "SAP devolvió un error de simulación. No se actualizarán precios ni descuentos."
                        );

                        void 0;

                        return;
                    }

                    const aConditions = aConditionsRaw.filter(function (c) {
                        const sItm = String(c.ItmNumber || "").trim();
                        const sCondType = String(c.CondType || "").trim();

                        return sItm && sItm !== "000000" && sCondType;
                    });

                    if (!aConditions.length) {
                        sap.m.MessageBox.error("No se recibió información válida de simulación desde SAP.");
                        void 0;
                        return;
                    }

                    const mM2ByItm = {};

                    aReturns.forEach(function (r) {
                        const sMsg = String(r.Message || "").trim();
                        const aParts = sMsg.split("-");

                        if (aParts.length >= 4) {
                            const sItm = String(aParts[0] || "").padStart(6, "0");
                            const nM2 = toNumber(aParts[aParts.length - 1]);

                            if (sItm && nM2 > 0) {
                                mM2ByItm[sItm] = nM2;
                            }
                        }
                    });

                    void 0;
                    const normItm = function (v) {
                        const s = String(v || "").trim();
                        const n = parseInt(s, 10);
                        return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
                    };

                    const mCond = {};

                    aConditions.forEach(function (c) {
                        const key = normItm(c.ItmNumber);

                        if (!mCond[key]) {
                            mCond[key] = [];
                        }

                        mCond[key].push(c);
                    });

                    void 0;

                    const oCantByItmReporte = oModelProyect.getProperty("/oCantidadesByItm") || {};
                    const oManualBultosByItmReporte = oModelProyect.getProperty("/oManualBultosByItm") || {};
                    const aMaterialUIReporte = oModelProyect.getProperty("/oMaterialUI") || [];

                    const mUIByItmReporte = {};
                    aMaterialUIReporte.forEach(function (ui) {
                        const sItmUI = normItm(ui.ItmNumber || ui.OriginalItmNumber || ui.Posicion || ui.Pos || "");
                        if (sItmUI) {
                            mUIByItmReporte[sItmUI] = ui;
                        }
                    });

                    let aReporte = aItemsTech.map(function (mat) {
                        const sItm = normItm(mat.ItmNumber);
                        const aCond = mCond[sItm] || [];

                        if (!aCond.length) {
                            void 0;
                        }

                        const precioBruto = aCond
                            .filter(function (c) {
                                return c.CondType === "ZPRE";
                            })
                            .reduce(function (acc, c) {
                                return acc + toNumber(c.Condvalue);
                            }, 0);

                        const descuentoTotal = this._getDiscountTotalFromSimulationConditions(aCond, mPriceConditionTypes);

                        const descuentoPorcentaje = precioBruto > 0
                            ? (descuentoTotal / precioBruto) * 100
                            : 0;

                        const oCantItm = oCantByItmReporte[sItm] || {};
                        const oManualItm = oManualBultosByItmReporte[sItm] || {};
                        const oUI = mUIByItmReporte[sItm] || {};
                        let cantidadM2 = toNumber(
                            mM2ByItm[sItm] ||
                            oManualItm.cantidadM2 ||
                            oManualItm.Cantidad ||
                            oManualItm.cantidad ||
                            oCantItm.cantidadM2 ||
                            oCantItm.Cantidad ||
                            oCantItm.cantidad ||
                            oUI.cantidadM2 ||
                            oUI.Cantidad ||
                            oUI.cantidad ||
                            mat.cantidadM2 ||
                            mat.Cantidad ||
                            mat.cantidad ||
                            mat.ReqQty ||
                            mat.TargetQty
                        );

                        const precioLista = cantidadM2 > 0 ? (precioBruto / cantidadM2) : 0;
                        const precioNetoTotal = precioBruto - descuentoTotal;
                        const precioUnit = cantidadM2 > 0 ? (precioNetoTotal / cantidadM2) : 0;
                        const total = precioNetoTotal;

                        const sMatnr = String(
                            mat.Material ||
                            mat.codigo ||
                            oUI.Material ||
                            oUI.codigo ||
                            oManualItm.Material ||
                            oCantItm.Material ||
                            ""
                        ).trim();
                        const nStockPal = toNumber(
                            mat.stockPalletsOriginalEdit ||
                            mat.stockPalletsTotal ||
                            mat.stockPallets ||
                            mat.Pallets ||
                            0
                        );

                        const nStockCaj = toNumber(
                            mat.stockCajasOriginalEdit ||
                            mat.stockCajasTotal ||
                            mat.stockCajas ||
                            mat.Saldos ||
                            0
                        );

                        const nStockM2Original = toNumber(
                            mat.stockM2OriginalEdit ||
                            mat.stockM2Total ||
                            mat.StockFisico ||
                            mat.stockFisico ||
                            0
                        );
                        const nPalFinal = toNumber(
                            oManualItm.cantidadPallets ||
                            oManualItm.NroPaletas ||
                            oCantItm.cantidadPallets ||
                            oCantItm.NroPaletas ||
                            oUI.cantidadPallets ||
                            oUI.NroPaletas ||
                            mat.cantidadPallets ||
                            mat.NroPaletas
                        );

                        const nCajFinal = toNumber(
                            oManualItm.cantidadCajas ||
                            oManualItm.NroCajas ||
                            oCantItm.cantidadCajas ||
                            oCantItm.NroCajas ||
                            oUI.cantidadCajas ||
                            oUI.NroCajas ||
                            mat.cantidadCajas ||
                            mat.NroCajas
                        );

                        const sCalibre = String(
                            oManualItm.Calibre ||
                            oManualItm.calibre ||
                            oManualItm.Zzcalibre ||
                            oCantItm.Calibre ||
                            oCantItm.calibre ||
                            oCantItm.Zzcalibre ||
                            oUI.Calibre ||
                            oUI.calibre ||
                            oUI.Zzcalibre ||
                            mat.Calibre ||
                            mat.calibre ||
                            mat.Zzcalibre ||
                            ""
                        ).trim();

                        const sTono = String(
                            oManualItm.Tono ||
                            oManualItm.tono ||
                            oManualItm.Zztono ||
                            oCantItm.Tono ||
                            oCantItm.tono ||
                            oCantItm.Zztono ||
                            oUI.Tono ||
                            oUI.tono ||
                            oUI.Zztono ||
                            mat.Tono ||
                            mat.tono ||
                            mat.Zztono ||
                            ""
                        ).trim();

                        const sCalidad = String(
                            oManualItm.Zzcalidad ||
                            oManualItm.calidad ||
                            oManualItm.TipBulto ||
                            oCantItm.Zzcalidad ||
                            oCantItm.calidad ||
                            oCantItm.TipBulto ||
                            oUI.Zzcalidad ||
                            oUI.calidad ||
                            oUI.TipBulto ||
                            mat.Zzcalidad ||
                            mat.calidad ||
                            mat.TipBulto ||
                            (nCajFinal > 0 ? "S" : "")
                        ).trim();

                        let sPosicionFromReturn = "";

                        const reItm = new RegExp("(^|\\D)" + sItm + "(\\D|$)");
                        const aRtnLines = aReturns
                            .filter(function (r) {
                                return typeof r.Message === "string" && reItm.test(r.Message);
                            })
                            .map(function (r) {
                                return r.Message;
                            });

                        if (aRtnLines.length > 0) {
                            const sFirstLine = aRtnLines[0] || "";
                            const aPartsRaw = String(sFirstLine).split("-").map(function (p) {
                                return (p || "").trim();
                            });

                            const sPosRaw = aPartsRaw[0] || "";
                            const nPos = parseInt(sPosRaw, 10);

                            sPosicionFromReturn = isNaN(nPos)
                                ? String(sPosRaw || "").padStart(6, "0")
                                : String(nPos).padStart(6, "0");
                        }

                        const posicionFinal =
                            sPosicionFromReturn ||
                            mat.Posicion ||
                            mat.Pos ||
                            mat.RefDocIt ||
                            oUI.Posicion ||
                            oUI.Pos ||
                            oUI.RefDocIt ||
                            sItm;
                        const sPosicionFinalNorm = normItm(posicionFinal || sItm);
                        const bEsNuevaManual =
                            oManualItm.__isNewManual === true ||
                            oManualItm.__keepManualBultos === true ||
                            oManualItm.AccionPosicion === "I" ||
                            oManualItm.TipoOperacion === "I" ||
                            mat.__isNewManual === true ||
                            mat.__keepManualBultos === true ||
                            mat.AccionPosicion === "I" ||
                            mat.TipoOperacion === "I";

                        return {
                            ...mat,

                            ItmNumber: sItm,
                            OriginalItmNumber: mat.OriginalItmNumber || oUI.OriginalItmNumber || sItm,
                            Pos: sPosicionFinalNorm,
                            Posicion: sPosicionFinalNorm,

                            Material: sMatnr,
                            codigo: sMatnr,
                            Descripcion: this._getDescripcionMaterial(sMatnr, mat, oView),
                            descripcion: this._getDescripcionMaterial(sMatnr, mat, oView),
                            Description: this._getDescripcionMaterial(sMatnr, mat, oView),
                            cantidad: cantidadM2.toFixed(3),
                            Cantidad: cantidadM2.toFixed(3),
                            cantidadM2: cantidadM2.toFixed(3),
                            TargetQu: "M2",
                            UMV: "M2",
                            Calibre: sCalibre,
                            calibre: sCalibre,
                            Zzcalibre: sCalibre,

                            Tono: sTono,
                            tono: sTono,
                            Zztono: sTono,

                            calidad: sCalidad,
                            Zzcalidad: sCalidad,
                            TipBulto: sCalidad,

                            stockPallets: nStockPal,
                            stockCajas: nStockCaj,

                            stockPalletsOriginalEdit: nStockPal.toFixed(3),
                            stockCajasOriginalEdit: nStockCaj.toFixed(3),
                            stockM2OriginalEdit: nStockM2Original.toFixed(3),

                            stockPalletsTotal: nStockPal,
                            stockCajasTotal: nStockCaj,
                            stockM2Total: nStockM2Original,

                            prLista: precioLista.toFixed(2),
                            descuentos: descuentoPorcentaje.toFixed(2),
                            prUnit: precioUnit.toFixed(2),
                            total: total.toFixed(2),
                            cantidadPallets: nPalFinal > 0 ? nPalFinal.toFixed(3) : "",
                            cantidadCajas: nCajFinal > 0 ? nCajFinal.toFixed(3) : "",
                            NroPaletas: nPalFinal > 0 ? nPalFinal.toFixed(3) : "",
                            NroCajas: nCajFinal > 0 ? nCajFinal.toFixed(3) : "",

                            __isNewManual: bEsNuevaManual,
                            __keepManualBultos: bEsNuevaManual,
                            AccionPosicion: bEsNuevaManual ? "I" : (mat.AccionPosicion || ""),
                            TipoOperacion: bEsNuevaManual ? "I" : (mat.TipoOperacion || "")
                        };
                    }.bind(this));

                    aReporte = this._restoreManualBultosInReporteMod(aReporte);

                    void 0;

                    aReporte = await this._enrichBultosFromOrderDetailsMod(aReporte);
                    aReporte = this._restoreManualBultosInReporteMod(aReporte);

                    void 0;

                    const subtotalGeneral = aReporte.reduce((acc, item) => acc + toNumber(item.total), 0);
                    const embalajeTotal = aConditions.filter(c => c.CondType === "ZRFN").reduce((acc, c) => acc + toNumber(c.Condvalue), 0);
                    const igvTotal = aConditions.filter(c => c.CondType === "MWST").reduce((acc, c) => acc + toNumber(c.Condvalue), 0);
                    const totalFooter = subtotalGeneral + embalajeTotal + igvTotal;

                    aReporte = this._applyBloqueoEdicionCalidadSMod(aReporte);
                    oModelProyect.setProperty("/oMaterialUI", aReporte);
                    const oCantidadesByItmSync = oModelProyect.getProperty("/oCantidadesByItm") || {};
                    const aMaterialTechSync = oModelProyect.getProperty("/oMaterial") || [];
                    const oManualBultosByItmSync = oModelProyect.getProperty("/oManualBultosByItm") || {};

                    aReporte.forEach(function (row) {
                        const sItm = normItm(row.ItmNumber);
                        const nM2 = toNumber(row.cantidadM2 || row.cantidad || row.Cantidad);

                        if (!sItm || nM2 <= 0) return;

                        const oManual = oManualBultosByItmSync[sItm] || {};

                        const sPalFinal =
                            oManual.cantidadPallets !== undefined &&
                                oManual.cantidadPallets !== null &&
                                oManual.cantidadPallets !== ""
                                ? oManual.cantidadPallets
                                : row.cantidadPallets;

                        const sCajFinal =
                            oManual.cantidadCajas !== undefined &&
                                oManual.cantidadCajas !== null &&
                                oManual.cantidadCajas !== ""
                                ? oManual.cantidadCajas
                                : row.cantidadCajas;

                        const sCalibreFinal =
                            oManual.Calibre ||
                            oManual.calibre ||
                            oManual.Zzcalibre ||
                            row.Calibre ||
                            row.calibre ||
                            row.Zzcalibre ||
                            "";

                        const sTonoFinal =
                            oManual.Tono ||
                            oManual.tono ||
                            oManual.Zztono ||
                            row.Tono ||
                            row.tono ||
                            row.Zztono ||
                            "";

                        const sCalidadFinal =
                            oManual.Zzcalidad ||
                            oManual.calidad ||
                            oManual.TipBulto ||
                            row.Zzcalidad ||
                            row.calidad ||
                            row.TipBulto ||
                            "";

                        oCantidadesByItmSync[sItm] = Object.assign({}, oCantidadesByItmSync[sItm] || {}, {
                            Material: row.Material || row.codigo || "",
                            UMV: "M2",
                            TargetQu: "M2",
                            cantidad: nM2.toFixed(3),
                            Cantidad: nM2.toFixed(3),
                            cantidadM2: nM2.toFixed(3),
                            cantidadPallets: sPalFinal,
                            cantidadCajas: sCajFinal,
                            NroPaletas: sPalFinal,
                            NroCajas: sCajFinal,
                            Calibre: sCalibreFinal,
                            Zzcalibre: sCalibreFinal,
                            Tono: sTonoFinal,
                            Zztono: sTonoFinal,
                            calidad: sCalidadFinal,
                            Zzcalidad: sCalidadFinal,
                            TipBulto: sCalidadFinal,

                            __isNewManual: oManual.__isNewManual === true || row.__isNewManual === true,
                            __keepManualBultos: oManual.__keepManualBultos === true || row.__keepManualBultos === true,
                            AccionPosicion: oManual.AccionPosicion || row.AccionPosicion || "",
                            TipoOperacion: oManual.TipoOperacion || row.TipoOperacion || ""
                        });

                        const oTech = aMaterialTechSync.find(function (x) {
                            return normItm(x.ItmNumber) === sItm;
                        });

                        if (oTech) {
                            oTech.cantidad = nM2.toFixed(3);
                            oTech.Cantidad = nM2.toFixed(3);
                            oTech.cantidadM2 = nM2.toFixed(3);
                            oTech.UMV = "M2";
                            oTech.TargetQu = "M2";

                            if (sPalFinal !== undefined && sPalFinal !== null && sPalFinal !== "") {
                                oTech.cantidadPallets = sPalFinal;
                                oTech.NroPaletas = sPalFinal;
                            }

                            if (sCajFinal !== undefined && sCajFinal !== null && sCajFinal !== "") {
                                oTech.cantidadCajas = sCajFinal;
                                oTech.NroCajas = sCajFinal;
                            }

                            oTech.Zzcalibre = sCalibreFinal;
                            oTech.Calibre = sCalibreFinal;
                            oTech.Zztono = sTonoFinal;
                            oTech.Tono = sTonoFinal;
                            oTech.Zzcalidad = sCalidadFinal;
                            oTech.calidad = sCalidadFinal;
                            oTech.TipBulto = sCalidadFinal;

                            if (oManual.__isNewManual === true || row.__isNewManual === true) {
                                oTech.__isNewManual = true;
                                oTech.__keepManualBultos = true;
                                oTech.AccionPosicion = "I";
                                oTech.TipoOperacion = "I";
                            }
                        }
                    });

                    oModelProyect.setProperty("/oCantidadesByItm", oCantidadesByItmSync);
                    oModelProyect.setProperty("/oMaterial", aMaterialTechSync);
                    oModelProyect.setProperty("/Totales", {
                        SubTotal: subtotalGeneral.toFixed(2),
                        Flete: embalajeTotal.toFixed(2),
                        IGV: igvTotal.toFixed(2),
                        Total: totalFooter.toFixed(2)
                    });

                    const aPesoPromises = aReporte.map((row, index) => {
                        const sMatnr = String(row.Material || row.codigo || "").trim();
                        const sPathPeso = `/oMaterialUI/${index}/peso`;

                        if (!sMatnr) {
                            oModelProyect.setProperty(sPathPeso, "0.000");
                            return Promise.resolve();
                        }
                        const nM2 = toNumber(
                            row.cantidadM2 !== undefined && row.cantidadM2 !== null && row.cantidadM2 !== ""
                                ? row.cantidadM2
                                : row.cantidad !== undefined && row.cantidad !== null && row.cantidad !== ""
                                    ? row.cantidad
                                    : row.Cantidad
                        );

                        if (nM2 <= 0) {
                            oModelProyect.setProperty(sPathPeso, "0.000");
                            return Promise.resolve();
                        }

                        return this._getPesoFromService(sMatnr, "M2", nM2)
                            .then(v => {
                                oModelProyect.setProperty(sPathPeso, toNumber(v).toFixed(3));
                            })
                            .catch(() => {
                                oModelProyect.setProperty(sPathPeso, "0.000");
                            });
                    });

                    await Promise.all(aPesoPromises);
                    oModelProyect.refresh(true);
                    sap.m.MessageToast.show("Datos calculados y actualizados correctamente.");
                },
                error: (oError) => {
                    this._bSimulacionCeramicosEnProceso = false;
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Error en la simulación");
                    void 0;
                }
            });
        },
        _getDescripcionMaterial: function (matnr, matUI, oView) {
            const sMatnr = String(matnr || "").trim();

            const pickDesc = function (o) {
                if (!o) return "";

                return String(
                    o.Descripcion ||
                    o.descripcion ||
                    o.Description ||
                    o.description ||
                    o.Descriptions ||
                    o.MaterialDescription ||
                    o.Maktx ||
                    o.MAKTX ||
                    ""
                ).trim();
            };

            let sDesc = pickDesc(matUI);
            if (sDesc) {
                return sDesc;
            }

            try {
                const oModelProyect = oView.getModel("oModelProyect");

                const aMaterialUI = oModelProyect.getProperty("/oMaterialUI") || [];
                const oUI = aMaterialUI.find(function (x) {
                    return String(x.Material || x.codigo || "").trim() === sMatnr;
                });

                sDesc = pickDesc(oUI);
                if (sDesc) {
                    return sDesc;
                }

                const aTree = oModelProyect.getProperty("/oTreeCer") || [];
                const oTreeRow = aTree.find(function (x) {
                    return String(x.Matnr || x.Material || "").trim() === sMatnr;
                });

                sDesc = pickDesc(oTreeRow);
                if (sDesc) {
                    return sDesc;
                }

                const aBase = oModelProyect.getProperty("/oMaterialBase") || [];
                const oBase = aBase.find(function (x) {
                    return String(x.Material || x.Matnr || "").trim() === sMatnr;
                });

                sDesc = pickDesc(oBase);
                if (sDesc) {
                    return sDesc;
                }
            } catch (e) { }

            try {
                const oModelData = oView.getModel("oModelData");
                const aCat = oModelData?.getProperty("/oFilterMaterial") || [];

                const oCat = aCat.find(function (x) {
                    return String(x.Material || x.Matnr || "").trim() === sMatnr;
                });

                sDesc = pickDesc(oCat);
                if (sDesc) {
                    return sDesc;
                }
            } catch (e) { }

            return sMatnr;
        },
        _getTipoOperacionModCeramicos: function (oItem, oUI, fReqQty) {
            const oModel = this.getView().getModel("oModelProyect");
            const aOriginalBase = oModel.getProperty("/oMaterialOriginalModBase") || [];

            const aOriginal = aOriginalBase.length
                ? aOriginalBase
                : (oModel.getProperty("/oMaterialOriginalMod") || []);

            const oCantOriginalBase = oModel.getProperty("/oCantidadesByItmOriginalModBase") || {};
            const oCantOriginalCurrent = oModel.getProperty("/oCantidadesByItmOriginalMod") || {};

            const oCantOriginal = Object.keys(oCantOriginalBase).length
                ? oCantOriginalBase
                : oCantOriginalCurrent;

            const normalize = function (v) {
                return String(v === undefined || v === null ? "" : v).trim();
            };

            const fnNormItm = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };

            const toQty = function (v) {
                const n = parseFloat(String(v || "0").replace(",", "."));
                return isNaN(n) ? "0.000" : n.toFixed(3);
            };

            const sTipoActual = normalize(
                oItem.TipoOperacion ||
                oItem.AccionPosicion ||
                oUI.TipoOperacion ||
                oUI.AccionPosicion ||
                ""
            );

            const bDeleted =
                oItem.Deleted === true ||
                oUI.Deleted === true ||
                sTipoActual === "D";

            if (bDeleted) {
                return "D";
            }

            const sOriginalItm = fnNormItm(
                oItem.OriginalItmNumber ||
                oUI.OriginalItmNumber ||
                oItem.ItmNumber ||
                oUI.ItmNumber ||
                oUI.Posicion ||
                ""
            );

            const oOrig = aOriginal.find(function (x) {
                return fnNormItm(x.ItmNumber || x.OriginalItmNumber || "") === sOriginalItm;
            });

            const bTieneFlagInsert =
                sTipoActual === "I" ||
                oItem.__isNewManual === true ||
                oItem.__keepManualBultos === true ||
                oUI.__isNewManual === true ||
                oUI.__keepManualBultos === true;

            if (!oOrig && bTieneFlagInsert) {
                return "I";
            }

            if (!oOrig) {
                return "I";
            }

            if (sTipoActual === "U") {
                return "U";
            }

            const aCampos = [
                "Material",
                "TargetQu",
                "Plant",
                "Zzcalibre",
                "Zztono",
                "Zzcalidad",
                "RefDoc",
                "RefDocIt",
                "RefDocCa"
            ];

            const bCambioCampo = aCampos.some(function (sCampo) {
                return normalize(oOrig[sCampo]) !== normalize(oItem[sCampo] || oUI[sCampo]);
            });

            const oOrigCant = oCantOriginal[sOriginalItm] || {};

            const sQtyOriginal = toQty(
                oOrigCant.cantidadM2 ||
                oOrigCant.Cantidad ||
                oOrigCant.cantidad ||
                oOrig.cantidadM2 ||
                oOrig.Cantidad ||
                oOrig.cantidad ||
                0
            );

            const sQtyActual = toQty(fReqQty);

            if (bCambioCampo) {
                return "U";
            }

            if (sQtyOriginal !== "0.000" && sQtyOriginal !== sQtyActual) {
                return "U";
            }

            return "N";
        },
        _ModifyOrderCeramicos: function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect");
            const oModelUser = oView.getModel("oModelUser");

            if (this._syncEntregaControlsToModelMod) {
                this._syncEntregaControlsToModelMod();
            }


            const oData = oModelProyect.getData();

            const toNumber = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

            const aItemsTech = oData.oMaterial || [];
            const aUIRows = oModelProyect.getProperty("/oMaterialUI") || [];
            const oCant = oModelProyect.getProperty("/oCantidades") || {};
            const oCantByItm = oModelProyect.getProperty("/oCantidadesByItm") || {}; // ✅ clave
            const oManualBultosByItm = oModelProyect.getProperty("/oManualBultosByItm") || {};

            const sCliente = String(
                oData.oDatClient?.Customer ||
                oData.docModificarCabecera?.Customer ||
                oData.inputForm?.cliente ||
                ""
            ).trim();

            const sTipoEntrega = String(oData.inputForm?.tipoEntrega || "").trim();
            const sDestinoCeramico = String(oData.inputForm?.destinoCeramico || "").trim();
            const sDireccionAgencia = String(oData.inputForm?.direccionAgencia || "").trim();

            const sShipCondMod = sTipoEntrega === "1" ? "02" : "01";

            let sPartnerWE = "";

            switch (sTipoEntrega) {
                case "1":
                    // Cliente recoge: WE = Z0 = destino
                    sPartnerWE = sDestinoCeramico;
                    break;

                case "2":
                    // Despacho directo: WE = Z0 = destino
                    sPartnerWE = sDestinoCeramico;
                    break;

                case "3":
                    // Despacho agencia: WE = agencia, Z0 = destino
                    sPartnerWE = sDireccionAgencia;
                    break;

                default:
                    sPartnerWE = sDestinoCeramico;
                    break;
            }

            if (!Array.isArray(aItemsTech) || aItemsTech.length === 0) {
                sap.m.MessageBox.warning("No hay ítems técnicos (/oMaterial) para modificar el pedido.");
                return;
            }

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
                    ClientId: sCliente,
                    PartnRole: "AG",
                    PartnNumber: sCliente
                },
                {
                    ClientId: sCliente,
                    PartnRole: "WE",
                    PartnNumber: sPartnerWE
                },
                ...aVendPartners
            ].filter(function (oPartner) {
                return String(oPartner.PartnNumber || "").trim() !== "";
            });

            if (sDestinoCeramico) {
                aPartners.push({
                    ClientId: sCliente,
                    PartnRole: "Z0",
                    PartnNumber: sDestinoCeramico,
                    ItmNumber: "000000"
                });
            }
            const oEntregaInicialMod = oModelProyect.getProperty("/oEntregaInicialMod") || {};
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

            const findUIRow = (sItm, sMatnr) => {
                let r = aUIRows.find(x => x.ItmNumber === sItm);
                if (!r) r = aUIRows.find(x => (x.Material || x.codigo) === sMatnr);
                return r || {};
            };

            // ✅ Cantidad por item: primero ItmNumber, luego UI, luego oCant por material
            const getReqQty = (it, oUI) => {
                const sItm = (it.ItmNumber || "").trim();
                const byItm = oCantByItm[sItm] || {};

                const nM2ByItm = toNumber(byItm.cantidadM2 || byItm.cantidad);
                if (nM2ByItm > 0) return nM2ByItm;

                const nM2UI = toNumber(oUI.cantidadM2 || oUI.cantidad || oUI.Cantidad);
                if (nM2UI > 0) return nM2UI;

                const nM2Tech = toNumber(it.cantidadM2 || it.cantidad || it.Cantidad);
                if (nM2Tech > 0) return nM2Tech;

                return 0;
            };

            const sDocType = oData.inputForm?.tipDocument || "";

            const sVbelnPedido =
                oModelProyect.getProperty("/pedidoModificar") ||
                oData.docModificarCabecera?.SalesDocument ||
                oData.docModificarCabecera?.VbelnPedido ||
                "";

            const aItems = [];
            const aSchedule = [];

            const fnNormItm = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };
            const fnIsSapOriginalItem = function (it) {
                if (!it) {
                    return false;
                }

                const sTipo = String(
                    it.TipoOperacion ||
                    it.AccionPosicion ||
                    ""
                ).trim();

                const bEsManualNueva =
                    sTipo === "I" ||
                    it.__isNewManual === true ||
                    it.__keepManualBultos === true ||
                    it.AccionPosicion === "I" ||
                    it.TipoOperacion === "I";

                if (bEsManualNueva) {
                    return false;
                }

                return (
                    sTipo === "N" ||
                    !!it.OriginalItmNumber ||
                    !!it.RefDoc ||
                    !!it.RefDocIt
                );
            };

            const aOriginalBaseMod = oModelProyect.getProperty("/oMaterialOriginalModBase") || [];

            const aOriginalMod = aOriginalBaseMod.length
                ? aOriginalBaseMod
                : (oModelProyect.getProperty("/oMaterialOriginalMod") || []);

            const aDeletedManual = oModelProyect.getProperty("/oMaterialDeletedMod") || [];

            const mActualByItm = {};

            (aItemsTech || []).forEach(function (it) {
                const sItm = fnNormItm(it.ItmNumber || it.OriginalItmNumber || "");

                if (!sItm) {
                    return;
                }

                const sTipo = String(
                    it.TipoOperacion ||
                    it.AccionPosicion ||
                    ""
                ).trim();

                const bEsNueva =
                    sTipo === "I" ||
                    it.__isNewManual === true ||
                    it.__keepManualBultos === true;

                if (!bEsNueva) {
                    mActualByItm[sItm] = it;
                }
            });

            const mDeletedByItm = {};
            const mSapOriginalByItm = {};

            (aOriginalMod || []).forEach(function (orig) {
                const sOrig = fnNormItm(orig.ItmNumber || orig.OriginalItmNumber || "");

                if (!sOrig) {
                    return;
                }

                if (fnIsSapOriginalItem(orig)) {
                    mSapOriginalByItm[sOrig] = orig;
                }
            });
            (aDeletedManual || []).forEach(function (it) {
                const sItm = fnNormItm(it.ItmNumber || it.OriginalItmNumber || "");

                if (!sItm) {
                    return;
                }

                const oOrig = mSapOriginalByItm[sItm];

                if (!oOrig) {
                    void 0;
                    return;
                }

                mDeletedByItm[sItm] = Object.assign({}, oOrig, it, {
                    ItmNumber: sItm,
                    OriginalItmNumber: fnNormItm(oOrig.OriginalItmNumber || oOrig.ItmNumber || sItm),
                    Material: oOrig.Material || it.Material || it.codigo || "",
                    Plant: oOrig.Plant || it.Plant || "1001",
                    TargetQu: oOrig.TargetQu || it.TargetQu || it.UMV || "M2",
                    UMV: oOrig.UMV || it.UMV || "M2",
                    TipoOperacion: "D",
                    Deleted: true,
                    __isNewManual: false,
                    __keepManualBultos: false,
                    AccionPosicion: "D"
                });
            });
            Object.keys(mSapOriginalByItm).forEach(function (sItm) {
                const oOrig = mSapOriginalByItm[sItm];

                if (!mActualByItm[sItm] && !mDeletedByItm[sItm]) {
                    mDeletedByItm[sItm] = Object.assign({}, oOrig, {
                        ItmNumber: sItm,
                        OriginalItmNumber: fnNormItm(oOrig.OriginalItmNumber || oOrig.ItmNumber || sItm),
                        Material: oOrig.Material || "",
                        Plant: oOrig.Plant || "1001",
                        TargetQu: oOrig.TargetQu || oOrig.UMV || "M2",
                        UMV: oOrig.UMV || "M2",
                        TipoOperacion: "D",
                        Deleted: true,
                        __isNewManual: false,
                        __keepManualBultos: false,
                        AccionPosicion: "D"
                    });
                }
            });
            const mOriginalByItm = {};

            (aOriginalMod || []).forEach(function (orig) {
                const sOrig = fnNormItm(orig.ItmNumber || orig.OriginalItmNumber || "");
                if (sOrig) {
                    mOriginalByItm[sOrig] = orig;
                }
            });

            let aItemsTechPayload = (aItemsTech || []).map(function (it) {
                return Object.assign({}, it);
            });

            const mDeletedFromModelByItm = {};
            Object.values(mDeletedByItm || {}).forEach(function (d) {
                const sItmDel = fnNormItm(
                    d.OriginalItmNumber ||
                    d.ItmNumber ||
                    d.Posicion ||
                    ""
                );

                if (!sItmDel) {
                    return;
                }

                mDeletedFromModelByItm[sItmDel] = Object.assign({}, d, {
                    ItmNumber: sItmDel,
                    OriginalItmNumber: sItmDel,
                    TipoOperacion: "D",
                    AccionPosicion: "D",
                    Deleted: true,
                    __isNewManual: false,
                    __keepManualBultos: false,
                    __editManualBultosMod: false,
                    __keepEditedBultosMod: false
                });
            });

            // Luego agrega las eliminadas guardadas desde el botón eliminar.
            (aDeletedManual || []).forEach(function (d) {
                const sItmDel = fnNormItm(
                    d.OriginalItmNumber ||
                    d.ItmNumber ||
                    d.Posicion ||
                    ""
                );

                if (!sItmDel) {
                    return;
                }

                const oOrig = mSapOriginalByItm[sItmDel] || d;

                const sMaterialDel = String(
                    d.Material ||
                    d.codigo ||
                    oOrig.Material ||
                    oOrig.codigo ||
                    ""
                ).trim();

                if (!sMaterialDel) {
                    return;
                }

                mDeletedFromModelByItm[sItmDel] = Object.assign({}, oOrig, d, {
                    ItmNumber: sItmDel,
                    OriginalItmNumber: sItmDel,
                    Material: sMaterialDel,
                    Plant: d.Plant || oOrig.Plant || "1001",
                    TargetQu: "M2",
                    UMV: "M2",
                    TipoOperacion: "D",
                    AccionPosicion: "D",
                    Deleted: true,

                    // Una posición D nunca debe quedar como nueva/manual.
                    __isNewManual: false,
                    __keepManualBultos: false,
                    __editManualBultosMod: false,
                    __keepEditedBultosMod: false
                });
            });

            let aDeletedItems = Object.values(mDeletedFromModelByItm);

            const mVisibleCurrentByItm = {};

            (aUIRows || []).forEach(function (r) {
                const sItm = fnNormItm(
                    r.ItmNumber ||
                    r.OriginalItmNumber ||
                    r.Posicion ||
                    r.Pos ||
                    ""
                );

                if (sItm) {
                    mVisibleCurrentByItm[sItm] = r;
                }
            });

            (aDeletedManual || []).forEach(function (d) {
                const sItmDel = fnNormItm(
                    d.OriginalItmNumber ||
                    d.ItmNumber ||
                    d.Posicion ||
                    d.Pos ||
                    ""
                );

                if (!sItmDel) {
                    return;
                }

                const oOrig = mSapOriginalByItm[sItmDel] || d;

                const sMaterialDel = String(
                    d.Material ||
                    d.codigo ||
                    oOrig.Material ||
                    oOrig.codigo ||
                    ""
                ).trim();

                if (!sMaterialDel) {
                    return;
                }

                mDeletedFromModelByItm[sItmDel] = Object.assign({}, oOrig, d, {
                    ItmNumber: sItmDel,
                    OriginalItmNumber: sItmDel,
                    Material: sMaterialDel,
                    Plant: d.Plant || oOrig.Plant || "1001",
                    TargetQu: "M2",
                    UMV: "M2",
                    TipoOperacion: "D",
                    AccionPosicion: "D",
                    Deleted: true,

                    __isNewManual: false,
                    __keepManualBultos: false,
                    __editManualBultosMod: false,
                    __keepEditedBultosMod: false,
                    __fromDeleteButtonMod: true,
                    __isSapExistingForDelete: true
                });
            });

            Object.keys(mSapOriginalByItm || {}).forEach(function (sItmOrig) {
                if (mVisibleCurrentByItm[sItmOrig]) {
                    return;
                }

                const oOrig = mSapOriginalByItm[sItmOrig] || {};

                const sMaterialOrig = String(
                    oOrig.Material ||
                    oOrig.codigo ||
                    ""
                ).trim();

                if (!sMaterialOrig) {
                    return;
                }

                mDeletedFromModelByItm[sItmOrig] = Object.assign({}, oOrig, {
                    ItmNumber: sItmOrig,
                    OriginalItmNumber: sItmOrig,
                    Material: sMaterialOrig,
                    Plant: oOrig.Plant || "1001",
                    TargetQu: "M2",
                    UMV: "M2",
                    TipoOperacion: "D",
                    AccionPosicion: "D",
                    Deleted: true,

                    __isNewManual: false,
                    __keepManualBultos: false,
                    __editManualBultosMod: false,
                    __keepEditedBultosMod: false,
                    __fromDeleteButtonMod: true,
                    __isSapExistingForDelete: true
                });
            });

            aDeletedItems = Object.values(mDeletedFromModelByItm);
            aItemsTechPayload = aItemsTechPayload.filter(function (it) {
                const sItm = fnNormItm(it.ItmNumber || it.OriginalItmNumber || "");

                const sTipo = String(
                    it.TipoOperacion ||
                    it.AccionPosicion ||
                    ""
                ).trim();

                const bEsInsert =
                    sTipo === "I" ||
                    it.__isNewManual === true ||
                    it.__keepManualBultos === true;

                if (mDeletedFromModelByItm[sItm] && !bEsInsert) {
                    return false;
                }

                return true;
            });

            void 0;

            const mCurrentInsertedByItm = {};

            aItemsTechPayload.forEach(function (it) {
                const sItm = fnNormItm(it.ItmNumber || it.OriginalItmNumber || "");

                const sTipo = String(
                    it.TipoOperacion ||
                    it.AccionPosicion ||
                    ""
                ).trim();

                const bEsInsert =
                    sTipo === "I" ||
                    it.__isNewManual === true ||
                    it.__keepManualBultos === true;

                if (sItm && bEsInsert) {
                    mCurrentInsertedByItm[sItm] = it;
                }
            });

            aDeletedItems = aDeletedItems.filter(function (d) {
                const sDel = fnNormItm(d.ItmNumber || d.OriginalItmNumber || "");
                const bExisteOriginal = !!mOriginalByItm[sDel];
                const bExisteComoInsertActual = !!mCurrentInsertedByItm[sDel];

                const bDeleteForzado =
                    d.__fromDeleteButtonMod === true ||
                    d.__isSapExistingForDelete === true ||
                    d.Deleted === true ||
                    String(d.TipoOperacion || "").trim() === "D" ||
                    String(d.AccionPosicion || "").trim() === "D";

                if (bDeleteForzado) {
                    return true;
                }

                if (bExisteComoInsertActual && !bExisteOriginal) {
                    return false;
                }

                return true;
            });

            const mUsedItm = {};

            (aOriginalMod || []).forEach(function (it) {
                const s = fnNormItm(it.ItmNumber || it.OriginalItmNumber || "");
                if (s) {
                    mUsedItm[s] = true;
                }
            });

            (aDeletedItems || []).forEach(function (it) {
                const s = fnNormItm(it.ItmNumber || it.OriginalItmNumber || "");
                if (s) {
                    mUsedItm[s] = true;
                }
            });

            (aItemsTechPayload || []).forEach(function (it) {
                const s = fnNormItm(it.ItmNumber || it.OriginalItmNumber || "");
                if (s) {
                    mUsedItm[s] = true;
                }
            });

            let iMaxItm = Object.keys(mUsedItm).reduce(function (max, s) {
                const n = parseInt(s, 10);
                return isNaN(n) ? max : Math.max(max, n);
            }, 0);

            const fnNextFreeItm = function () {
                let sNew = "";

                do {
                    iMaxItm += 10;
                    sNew = String(iMaxItm).padStart(6, "0");
                } while (mUsedItm[sNew]);

                mUsedItm[sNew] = true;
                return sNew;
            };

            const mDeletedFinalByItm = {};
            aDeletedItems.forEach(function (d) {
                const sDel = fnNormItm(d.ItmNumber || d.OriginalItmNumber || "");
                if (sDel) {
                    mDeletedFinalByItm[sDel] = d;
                }
            });

            aItemsTechPayload.forEach(function (it) {
                const sOld = fnNormItm(it.ItmNumber || it.OriginalItmNumber || "");

                const sTipo = String(
                    it.TipoOperacion ||
                    it.AccionPosicion ||
                    ""
                ).trim();

                const bEsInsert =
                    sTipo === "I" ||
                    it.__isNewManual === true ||
                    it.__keepManualBultos === true;

                if (bEsInsert && mDeletedFinalByItm[sOld]) {
                    const sNew = fnNextFreeItm();

                    void 0;

                    it.ItmNumber = sNew;
                    it.OriginalItmNumber = sNew;

                    if (oCantByItm[sOld] && !oCantByItm[sNew]) {
                        oCantByItm[sNew] = Object.assign({}, oCantByItm[sOld]);
                    }

                    if (oManualBultosByItm[sOld] && !oManualBultosByItm[sNew]) {
                        oManualBultosByItm[sNew] = Object.assign({}, oManualBultosByItm[sOld]);
                    }
                }
            });

            const aItemsParaGuardar = [].concat(aItemsTechPayload, aDeletedItems);
            const oCantByItmOriginalBase =
                oModelProyect.getProperty("/oCantidadesByItmOriginalModBase") || {};

            const oCantByItmOriginalCurrent =
                oModelProyect.getProperty("/oCantidadesByItmOriginalMod") || {};

            const oCantByItmOriginal = Object.keys(oCantByItmOriginalBase).length
                ? oCantByItmOriginalBase
                : oCantByItmOriginalCurrent;

            const aMaterialOriginalBase =
                oModelProyect.getProperty("/oMaterialOriginalModBase") || [];

            const aMaterialUIOriginalBase =
                oModelProyect.getProperty("/oMaterialUIOriginalModBase") || [];

            const aMaterialOriginal = aMaterialOriginalBase.length
                ? aMaterialOriginalBase
                : (oModelProyect.getProperty("/oMaterialOriginalMod") || []);

            const aMaterialUIOriginal = aMaterialUIOriginalBase.length
                ? aMaterialUIOriginalBase
                : (oModelProyect.getProperty("/oMaterialUIOriginalMod") || []);

            const mOriginalTechByItm = {};
            const mOriginalUIByItm = {};

            aMaterialOriginal.forEach(function (r) {
                const s = fnNormItm(r.ItmNumber || r.OriginalItmNumber || "");
                if (s) {
                    mOriginalTechByItm[s] = r;
                }
            });

            aMaterialUIOriginal.forEach(function (r) {
                const s = fnNormItm(r.ItmNumber || r.OriginalItmNumber || r.Posicion || "");
                if (s) {
                    mOriginalUIByItm[s] = r;
                }
            });

            const getOriginalReqQty = function (sItm) {
                const oOrigCant = oCantByItmOriginal[sItm] || {};
                const oOrigTech = mOriginalTechByItm[sItm] || {};
                const oOrigUI = mOriginalUIByItm[sItm] || {};

                return toNumber(
                    oOrigCant.cantidadM2 ||
                    oOrigCant.Cantidad ||
                    oOrigCant.cantidad ||
                    oOrigTech.cantidadM2 ||
                    oOrigTech.Cantidad ||
                    oOrigTech.cantidad ||
                    oOrigTech.ReqQty ||
                    oOrigTech.TargetQty ||
                    oOrigUI.cantidadM2 ||
                    oOrigUI.Cantidad ||
                    oOrigUI.cantidad ||
                    0
                );
            };

            aItemsParaGuardar.forEach(it => {
                const sItm = fnNormItm(
                    it.ItmNumber ||
                    it.OriginalItmNumber ||
                    ""
                );

                const sMatnr = String(
                    it.Material ||
                    it.codigo ||
                    ""
                ).trim();

                const bDeletedItem =
                    it.Deleted === true ||
                    String(it.TipoOperacion || "").trim() === "D";

                const sUMV = String(
                    it.TargetQu ||
                    it.UMV ||
                    "M2"
                ).trim();

                if (!sItm || !sMatnr) {
                    return;
                }

                const oUI = bDeletedItem ? {} : findUIRow(sItm, sMatnr);
                const oManualItm = oManualBultosByItm[sItm] || {};
                const oCantItm = oCantByItm[sItm] || {};

                let fReqQty = bDeletedItem ? 0 : getReqQty(it, oUI);

                const sTipoOperacion = bDeletedItem
                    ? "D"
                    : this._getTipoOperacionModCeramicos(it, oUI, fReqQty);

                let fReqQtyPayload = fReqQty;

                if (sTipoOperacion === "U") {
                    const fReqQtyOriginal = getOriginalReqQty(sItm);

                    if (fReqQtyOriginal > 0 && Math.abs(fReqQty - fReqQtyOriginal) < 0.0005) {
                        return;
                    }

                    fReqQtyPayload = fReqQty;
                }


                if (sTipoOperacion !== "D" && fReqQty <= 0) {
                    return;
                }

                const sTipoRef = oData.inputForm?.tipoReferencia || "";
                let sRefDocCa = it.RefDocCa || oUI.RefDocCa || "";

                if (!sRefDocCa && sTipoRef) {
                    if (sTipoRef === "ZCNA") {
                        sRefDocCa = "B";
                    }

                    if (sTipoRef === "ZACN" || sTipoRef === "ZPSE") {
                        sRefDocCa = "G";
                    }
                }


                const sZzcalibre = String(
                    oManualItm.Zzcalibre ||
                    oManualItm.Calibre ||
                    oManualItm.calibre ||
                    oCantItm.Zzcalibre ||
                    oCantItm.Calibre ||
                    oCantItm.calibre ||
                    oUI.Zzcalibre ||
                    oUI.Calibre ||
                    oUI.calibre ||
                    it.Zzcalibre ||
                    it.Calibre ||
                    it.calibre ||
                    ""
                ).trim();

                const sZztono = String(
                    oManualItm.Zztono ||
                    oManualItm.Tono ||
                    oManualItm.tono ||
                    oCantItm.Zztono ||
                    oCantItm.Tono ||
                    oCantItm.tono ||
                    oUI.Zztono ||
                    oUI.Tono ||
                    oUI.tono ||
                    it.Zztono ||
                    it.Tono ||
                    it.tono ||
                    ""
                ).trim();

                const nCajasManual = toNumber(
                    oManualItm.cantidadCajas ||
                    oManualItm.NroCajas ||
                    oManualItm.ManualCantidadCajas ||
                    oManualItm.cantidadCajasManual ||
                    oCantItm.cantidadCajas ||
                    oCantItm.NroCajas ||
                    oUI.cantidadCajas ||
                    oUI.NroCajas ||
                    it.cantidadCajas ||
                    it.NroCajas
                );

                const sZzcalidad = String(
                    oManualItm.Zzcalidad ||
                    oManualItm.TipBulto ||
                    oManualItm.calidad ||
                    oManualItm.ManualCalidad ||
                    oManualItm.calidadManual ||
                    oCantItm.Zzcalidad ||
                    oCantItm.TipBulto ||
                    oCantItm.calidad ||
                    oUI.Zzcalidad ||
                    oUI.TipBulto ||
                    oUI.calidad ||
                    it.Zzcalidad ||
                    it.TipBulto ||
                    it.calidad ||
                    (nCajasManual > 0 ? "S" : "")
                ).trim();


                const bIsSaldoCJ = sZzcalidad === "S";

                aItems.push({
                    ClienteId: oData.oDatClient?.Customer || "",
                    ItmNumber: sItm,
                    Material: sMatnr,
                    Plant: it.Plant || "1001",


                    TargetQu: sUMV || "M2",

                    Zzcalibre: sZzcalibre,
                    Zztono: sZztono,
                    Zzcalidad: sZzcalidad,

                    StoreLoc: bIsSaldoCJ ? "T303" : undefined,

                    RefDoc: "",
                    RefDocIt: "",
                    RefDocCa: "",

                    TipoOperacion: sTipoOperacion
                });


                if (sTipoOperacion === "I" || sTipoOperacion === "U") {
                    aSchedule.push({
                        ClientId: oData.oDatClient?.Customer || "",
                        ItmNumber: sItm,
                        SchedLine: "0001",
                        ReqQty: toNumber(fReqQtyPayload).toFixed(3)
                    });
                }
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
            const bIsCoord = !!oModelUser?.getProperty("/bIsCoord");
            const bIsVendedor = !!oModelUser?.getProperty("/bIsVendedor");

            const sPoSupplem = isClienteIAS ? "CLTE" : (bIsCoord ? "SUPE" : (bIsVendedor ? "VEND" : ""));
            const extraPoSupplem = sPoSupplem ? { PoSupplem: sPoSupplem } : {};

            const oPayload = this._cleanPayload({
                ClientId: sCliente,
                TOperation: "MP",
                VbelnPedido: sVbelnPedido,
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
                ShipCond: sShipCondMod,
                Currency: oData.inputForm?.moneda || "USD",
                OrdReason: oData.inputForm?.reasonOrd || "",
                HeaderToItem: aItems,
                HeaderToPartners: aPartners,
                HeaderToSchedule: aSchedule,
                toText: aTexts,
                HeaderToReturn: [{ ClientId: "", Type: "", Message: "" }]
            });

            const oModelEntity = this._getOrCreateOModelEntity();


            // VALIDACIÓN ANTES DE SIMULAR
            if (!oPayload.ClientId || !oPayload.DocType || !oPayload.SalesOrg || !oPayload.Division) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("Faltan datos de cabecera para simular: cliente, tipo documento, organización o división.");
                void 0;
                return;
            }

            if (!oPayload.HeaderToItem || !oPayload.HeaderToItem.length) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay posiciones válidas para simular.");
                void 0;
                return;
            }

            const bRequiereSchedule = (oPayload.HeaderToItem || []).some(function (it) {
                const sTipo = String(it.TipoOperacion || "").trim();
                return sTipo === "I" || sTipo === "U";
            });

            if (bRequiereSchedule && (!oPayload.HeaderToSchedule || !oPayload.HeaderToSchedule.length)) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay cantidades válidas para guardar.");
                void 0;
                return;
            }

            if (!oPayload.HeaderToPartners || !oPayload.HeaderToPartners.length) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageBox.error("No hay interlocutores válidos para simular.");
                void 0;
                return;
            }


            sap.ui.core.BusyIndicator.show(0);

            oModelEntity.create("/iHeaderSet", oPayload, {
                success: (oResponse) => {
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

                    const sNumPedido = this._extractSalesDocumentFromSapReturn(aMensajes) || sVbelnPedido;

                    if (!sNumPedido) {
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

                    const fnAfterOk = () => {
                        oModelProyect.setProperty("/", models.createModelProyect());
                        oModelProyect.refresh(true);

                        const oTable = oView.byId("tbProductosCerMod") || sap.ui.getCore().byId("tbProductosCerMod");
                        if (oTable?.getBinding("items")) {
                            oTable.getBinding("items").refresh();
                        }

                        this._goToSeguimientoPrincipal();
                    };

                    sap.m.MessageBox.success(
                        "Pedido modificado exitosamente.\nNúmero de pedido: " + sNumPedido,
                        {
                            title: "Pedido modificado",
                            onClose: fnAfterOk
                        }
                    );
                },

                error: (oError) => {
                    sap.ui.core.BusyIndicator.hide();

                    const sDetalle = this._extractODataErrorDetail(oError);

                    sap.m.MessageBox.error(
                        "Hubo un error al registrar el pedido." +
                        (sDetalle ? "\n\n" + sDetalle : ""),
                        {
                            title: "Error al modificar pedido"
                        }
                    );
                }
            });
        },
        _goToSeguimientoPrincipal: function () {
            const oView = this.getView();
            const oModelProyect = oView.getModel("oModelProyect") || this.getOwnerComponent().getModel("oModelProyect");
            const oModelData = oView.getModel("oModelData") || this.getOwnerComponent().getModel("oModelData");

            [
                "_dialogEditDetail"
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

            if (this._clearModPedCeramicosDraftForStock) {
                this._clearModPedCeramicosDraftForStock();
            }

            if (this._clearModPedCeramicosRuntimeState) {
                this._clearModPedCeramicosRuntimeState();
            }

            if (oModelProyect) {
                if (models && typeof models.createModelProyect === "function") {
                    oModelProyect.setData(models.createModelProyect());
                } else {
                    oModelProyect.setData({});
                }

                oModelProyect.refresh(true);
            }

            if (oModelData) {
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
        _onPressRecalculateSimulation: function () {
            void 0;

            const oView = this.getView();
            const oModelUser = oView.getModel("oModelUser");

            const bIsCliente =
                !!oModelUser?.getProperty("/bIsCliente") ||
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bRol") === "CLIENTES";

            const oModelProyect = oView.getModel("oModelProyect");
            const aItems = oModelProyect?.getProperty("/oMaterial") || [];

            void 0;

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
        _onAcceptProductManual: function () {
            const oTree = this.byId("ttCer");
            const oModel = this.getView().getModel("oModelProyect");

            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const aFiltered = [];

            const fnPushRow = function (r, sLevel) {
                if (!r) return;

                const nPal = toNum(r.cantidadPallets);
                const nCaj = toNum(r.cantidadCajas);

                if (nPal > 0 || nCaj > 0) {
                    aFiltered.push({
                        ...r,
                        __pickLevel: sLevel || (r.isGroup ? "PARENT" : "CHILD")
                    });
                }
            };

            const aSelected = oTree ? oTree.getSelectedIndices() : [];

            aSelected.forEach(function (i) {
                const oCtx = oTree.getContextByIndex(i);
                if (!oCtx) return;

                const r = oCtx.getObject();
                fnPushRow(r, r && r.isGroup ? "PARENT" : "CHILD");
            });

            if (aFiltered.length === 0) {
                const aTree = oModel.getProperty("/oTreeCer") || [];

                aTree.forEach(function (g) {
                    fnPushRow(g, "PARENT");
                    (g.children || []).forEach(function (ch) {
                        fnPushRow(ch, "CHILD");
                    });
                });
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
        onValidateCantidad: function (oEvent) {
            const oInput = oEvent.getSource();
            const oContext = oInput.getBindingContext("oModelProyect");

            if (!oContext) {
                return;
            }

            const oModel = oContext.getModel();
            const sRowPath = oContext.getPath();
            const oRow = oContext.getObject() || {};
            const sField = oInput.getBindingPath("value");

            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const vRaw =
                oEvent.getParameter("value") ??
                oEvent.getParameter("newValue") ??
                oInput.getValue();

            let nValorDigitado = toNum(vRaw);

            if (nValorDigitado < 0) {
                nValorDigitado = 0;
            }
            oModel.setProperty(sRowPath + "/" + sField, nValorDigitado);
            oInput.setValue(nValorDigitado);

            oInput.setValueState("None");

            try {
                const oTable = this.byId("ttCer");
                if (oTable) {
                    const nPal = sField === "cantidadPallets"
                        ? nValorDigitado
                        : toNum(oRow.cantidadPallets);

                    const nCaj = sField === "cantidadCajas"
                        ? nValorDigitado
                        : toNum(oRow.cantidadCajas);

                    const iIndex = oTable.getRows().findIndex(function (oRowCtrl) {
                        return oRowCtrl.getBindingContext("oModelProyect") === oContext;
                    });

                    if (iIndex >= 0 && (nPal > 0 || nCaj > 0)) {
                        oTable.addSelectionInterval(iIndex, iIndex);
                    }
                }
            } catch (e) {
                void 0;
            }
            this._updateCantidadM2TreeRow(oContext);

            oModel.refresh(true);
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

                        that._discardModPedCeramicosAndGoSeguimiento();
                    }
                }
            );
        },

        _getCalidadPosicionMod: function (oRow) {
            return String(
                (oRow && (
                    oRow.Zzcalidad ||
                    oRow.calidad ||
                    oRow.Calidad ||
                    oRow.TipBulto ||
                    oRow.ManualCalidad ||
                    oRow.calidadManual
                )) || ""
            ).trim().toUpperCase();
        },

        _isCalidadSMod: function (oRow) {
            return this._getCalidadPosicionMod(oRow) === "S";
        },

        _applyBloqueoEdicionCalidadSMod: function (aRows) {
            return (aRows || []).map(function (oRow) {
                const bBloqueado = this._isCalidadSMod(oRow);

                return Object.assign({}, oRow, {
                    BloqueaEdicionCalidadS: bBloqueado,
                    EditablePorCalidadS: !bBloqueado
                });
            }.bind(this));
        },

        _refreshBloqueoEdicionCalidadSMod: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const aUI = this._applyBloqueoEdicionCalidadSMod(
                oModel.getProperty("/oMaterialUI") || []
            );

            const aTech = this._applyBloqueoEdicionCalidadSMod(
                oModel.getProperty("/oMaterial") || []
            );

            oModel.setProperty("/oMaterialUI", aUI);
            oModel.setProperty("/oMaterial", aTech);
        },

        _preserveStockOriginalEditMod: function (oModel, sPath, oItem, oStock) {
            const toNum = function (v) {
                if (v === null || v === undefined || v === "") {
                    return 0;
                }

                if (typeof v === "string") {
                    v = v.replace(",", ".");
                }

                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const firstPositive = function () {
                for (let i = 0; i < arguments.length; i++) {
                    const n = toNum(arguments[i]);

                    if (n > 0) {
                        return n;
                    }
                }

                return 0;
            };
            const nPalActual = firstPositive(
                oStock && oStock.pal,
                oItem.stockPalletsOriginalEdit,
                oItem.stockPalletsTotal,
                oItem.stockPallets,
                oItem.Pallets,
                oItem.cantidadPallets,
                oItem.NroPaletas
            );

            const nCajActual = firstPositive(
                oStock && oStock.caj,
                oItem.stockCajasOriginalEdit,
                oItem.stockCajasTotal,
                oItem.stockCajas,
                oItem.Cajas,
                oItem.Saldos,
                oItem.cantidadCajas,
                oItem.NroCajas
            );

            const nM2Actual = firstPositive(
                oStock && oStock.m2,
                oItem.stockM2OriginalEdit,
                oItem.stockM2Total,
                oItem.StockFisico,
                oItem.stockFisico,
                oItem.cantidadM2,
                oItem.cantidad,
                oItem.Cantidad
            );

            const oStockOriginal = {
                stockPalletsOriginalEdit: nPalActual.toFixed(3),
                stockCajasOriginalEdit: nCajActual.toFixed(3),
                stockM2OriginalEdit: nM2Actual.toFixed(3),

                stockPalletsTotal: nPalActual,
                stockCajasTotal: nCajActual,
                stockM2Total: nM2Actual
            };

            if (oModel && sPath) {
                Object.keys(oStockOriginal).forEach(function (sKey) {
                    oModel.setProperty(sPath + "/" + sKey, oStockOriginal[sKey]);
                });
            }

            return oStockOriginal;
        },

        _onPressEditDetail: async function (oEvent) {
            const oContext = oEvent.getSource().getParent().getBindingContext("oModelProyect");
            if (!oContext) return;

            const oItem = oContext.getObject();

            if (this._isCalidadSMod(oItem)) {
                sap.m.MessageToast.show(
                    "Las posiciones con calidad S no se pueden editar. Elimine la línea y agréguela nuevamente."
                );
                return;
            }

            this._oContextMaterialEdit = oContext;
            const oModel = this.getView().getModel("oModelProyect");
            const toNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);

            const nPalQty = toNum(oItem.cantidadPallets);
            const nCajQty = toNum(oItem.cantidadCajas);

            let oStockEdit = this._getStockForEdit(oItem);

            let nStockPal = toNum(oStockEdit.pal);
            let nStockCaj = toNum(oStockEdit.caj);
            let nStockM2 = toNum(oStockEdit.m2);

            // Si la posición viene de DoRePeItem normalmente no trae stock.
            // En ese caso se consulta el stock real al servicio.
            if (nStockPal <= 0 && nStockCaj <= 0) {
                sap.ui.core.BusyIndicator.show(0);

                const oStockService = await this._getStockForEditFromService(oItem);

                sap.ui.core.BusyIndicator.hide();

                if (oStockService && oStockService.found) {
                    nStockPal = toNum(oStockService.pal);
                    nStockCaj = toNum(oStockService.caj);
                    nStockM2 = toNum(oStockService.m2);
                }
            }

            const oStockOriginalEdit = this._preserveStockOriginalEditMod(
                oModel,
                oContext.getPath(),
                oItem,
                {
                    pal: nStockPal,
                    caj: nStockCaj,
                    m2: nStockM2
                }
            );

            nStockPal = toNum(oStockOriginalEdit.stockPalletsOriginalEdit);
            nStockCaj = toNum(oStockOriginalEdit.stockCajasOriginalEdit);
            nStockM2 = toNum(oStockOriginalEdit.stockM2OriginalEdit);

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

            const oMaxEdit = this._getMaxEditableBultosMod(oItem, nDispPal, nDispCaj);

            const nMaxPalEdit = oMaxEdit.limitePallets;
            const nMaxCajEdit = oMaxEdit.limiteCajas;

            const nRestPal = Math.max(0, nMaxPalEdit - nPalQty);
            const nRestCaj = Math.max(0, nMaxCajEdit - nCajQty);

            const bEsNuevaManualEdit = this._isNuevaManualPedidoMod(oItem);
            const nStockPalView = bEsNuevaManualEdit ? nRestPal : nMaxPalEdit;
            const nStockCajView = bEsNuevaManualEdit ? nRestCaj : nMaxCajEdit;

            const oBaseM2Edit = {
                ...oItem,
                cantidadPallets: nPalQty,
                cantidadCajas: nCajQty,
                stockM2Total: nStockM2,
                stockM2OriginalEdit: nStockM2,
                cantidadM2BaseEdit: (
                    oItem.cantidadM2BaseEdit ||
                    oItem.cantidadM2 ||
                    oItem.Cantidad ||
                    oItem.cantidad
                )
            };

            const nQtyParaM2 = bIsPAL
                ? nPalQty
                : (
                    bIsCJ
                        ? nCajQty
                        : toNum(oItem.cantidadM2 || oItem.Cantidad || oItem.cantidad)
                );

            let nCantidadM2Inicial = toNum(
                this._getCantidadM2EditCeramico(oBaseM2Edit, sUMV, nQtyParaM2)
            );

            if (nCantidadM2Inicial <= 0) {
                nCantidadM2Inicial = toNum(
                    oItem.cantidadM2 ||
                    oItem.Cantidad ||
                    oItem.cantidad ||
                    oMaxEdit.originalM2 ||
                    0
                );
            }

            const sCantidadM2Inicial = nCantidadM2Inicial.toFixed(3);

            oModel.setProperty("/oSelecTableDetalle", {
                ...oItem,

                stockKey: sKey,
                UMV: sUMV,
                isPAL: bIsPAL,
                isCJ: bIsCJ,

                cantidadPallets: nPalQty,
                cantidadCajas: nCajQty,

                stockPalletsOriginalEdit: nStockPal.toFixed(3),
                stockCajasOriginalEdit: nStockCaj.toFixed(3),
                stockM2OriginalEdit: nStockM2.toFixed(3),

                stockPalletsTotal: nStockPal,
                stockCajasTotal: nStockCaj,
                stockM2Total: nStockM2,
                cantidadM2: sCantidadM2Inicial,
                cantidadM2BaseEdit: sCantidadM2Inicial,
                stockPalletsMax: nMaxPalEdit,
                stockCajasMax: nMaxCajEdit,

                stockPalletsRest: nRestPal,
                stockCajasRest: nRestCaj,

                stockPalletsDisponibleView: nStockPalView.toFixed(2),
                stockCajasDisponibleView: nStockCajView.toFixed(2),

                // Foto inicial del stock mostrado al abrir el popup.
                // Esta base se usa para sumar/restar cuando cambia la cantidad editable.
                stockPalletsViewBaseEdit: nStockPalView,
                stockCajasViewBaseEdit: nStockCajView,

                limitePalletsMax: nMaxPalEdit,
                limiteCajasMax: nMaxCajEdit,

                limitePalletsRest: Math.max(0, oMaxEdit.limitePallets - nPalQty),
                limiteCajasRest: Math.max(0, oMaxEdit.limiteCajas - nCajQty),

                // Nuevo: datos informativos para saber si viene del pedido original
                esPosicionOriginalMod: oMaxEdit.esOriginal,
                esPosicionNuevaManualMod: bEsNuevaManualEdit,
                cantidadPalletsOriginalMod: oMaxEdit.originalPallets,
                cantidadCajasOriginalMod: oMaxEdit.originalCajas,
                cantidadM2OriginalMod: oMaxEdit.originalM2,
                cantidadPalletsBaseEdit: nPalQty.toFixed(3),
                cantidadCajasBaseEdit: nCajQty.toFixed(3)
            });

            this._syncStockRestanteEditDialog();
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

        _getStockForEditFromService: async function (oItem) {
            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const sMatnr = String(
                oItem.Material ||
                oItem.codigo ||
                oItem.Matnr ||
                ""
            ).trim();

            if (!sMatnr) {
                return {
                    pal: 0,
                    caj: 0,
                    m2: 0,
                    found: false
                };
            }

            const sCalibre = String(
                oItem.Calibre ||
                oItem.calibre ||
                oItem.Zzcalibre ||
                ""
            ).trim();

            const sTono = String(
                oItem.Tono ||
                oItem.tono ||
                oItem.Zztono ||
                ""
            ).trim();

            const oModel = this.getView().getModel("oModelProyect");

            const sSalesOrg =
                oModel.getProperty("/SalesOrgModificacion") ||
                oModel.getProperty("/inputForm/SalesOrg") ||
                oModel.getProperty("/inputForm/salesOrg") ||
                "1130";

            const sPlant =
                oModel.getProperty("/PlantModificacion") ||
                oModel.getProperty("/oDatClient/Plant") ||
                "1001";

            const aFiltersStock = [
                new sap.ui.model.Filter("Salesorganization", sap.ui.model.FilterOperator.EQ, sSalesOrg),
                new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sPlant),
                new sap.ui.model.Filter("Pedven", sap.ui.model.FilterOperator.EQ, true),
                new sap.ui.model.Filter("Materialnumber", sap.ui.model.FilterOperator.EQ, sMatnr)
            ];

            let aStock = [];

            try {
                aStock = await this._loadProductoSingle(aFiltersStock);
            } catch (e) {
                void 0;
                return {
                    pal: 0,
                    caj: 0,
                    m2: 0,
                    found: false
                };
            }

            aStock = Array.isArray(aStock) ? aStock : [];

            if (!aStock.length) {
                return {
                    pal: 0,
                    caj: 0,
                    m2: 0,
                    found: false
                };
            }

            let aMatch = aStock.filter(function (r) {
                const bMat = String(r.Matnr || r.Material || "").trim() === sMatnr;

                const bCal = !sCalibre || String(r.Calibre || "").trim() === sCalibre;
                const bTon = !sTono || String(r.Tono || "").trim() === sTono;

                return bMat && bCal && bTon;
            });

            // Si no encuentra exacto por calibre/tono, usa todo el stock del material.
            if (!aMatch.length) {
                aMatch = aStock.filter(function (r) {
                    return String(r.Matnr || r.Material || "").trim() === sMatnr;
                });
            }

            const oTotal = aMatch.reduce(function (acc, r) {
                acc.pal += toNum(r.Pallets || r.stockPallets || r.TotalPallets);
                acc.caj += toNum(r.Saldos || r.Cajas || r.stockCajas || r.TotalSaldos);
                acc.m2 += toNum(r.StockFisico || r.stockFisico || r.TotalStockFisico);
                return acc;
            }, {
                pal: 0,
                caj: 0,
                m2: 0
            });

            return {
                pal: Number(oTotal.pal.toFixed(3)),
                caj: Number(oTotal.caj.toFixed(3)),
                m2: Number(oTotal.m2.toFixed(3)),
                found: true
            };
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
                sPath.includes("cantidadPallets")
                    ? toNum(oEditRef.limitePalletsMax ?? oEditRef.stockPalletsMax ?? oEditRef.stockPallets)
                    : sPath.includes("cantidadCajas")
                        ? toNum(oEditRef.limiteCajasMax ?? oEditRef.stockCajasMax ?? oEditRef.stockCajas)
                        : 0;

            if (nMax <= 0 && nVal > 0) {
                nVal = 0;

                sap.m.MessageToast.show(
                    `La cantidad no puede exceder el stock disponible. Máximo: ${nMax}`
                );
                oStep.setValueStateText("Cantidad ajustada al stock disponible.");

                oStep.setValueState("Warning");

            } else if (nMax > 0 && nVal > nMax) {
                nVal = nMax;

                if (oEditRef.esPosicionOriginalMod) {
                    sap.m.MessageToast.show(
                        `La cantidad no puede superar la cantidad original del pedido. Máximo: ${nMax}`
                    );
                    oStep.setValueStateText("Cantidad ajustada al máximo permitido del pedido original.");
                } else {
                    sap.m.MessageToast.show(
                        `La cantidad no puede exceder el stock disponible. Máximo: ${nMax}`
                    );
                    oStep.setValueStateText("Cantidad ajustada al stock disponible.");
                }

                oStep.setValueState("Warning");

            } else {
                oStep.setValueState("None");
                oStep.setValueStateText("");
            }

            if (sPath) {
                oModel.setProperty(sPath, nVal);
            }

            oStep.setValue(nVal);

            const oEditNow = oModel.getProperty("/oSelecTableDetalle") || {};

            const nMaxPalNow = toNum(
                oEditNow.limitePalletsMax ??
                oEditNow.stockPalletsMax ??
                oEditNow.stockPallets
            );

            const nMaxCajNow = toNum(
                oEditNow.limiteCajasMax ??
                oEditNow.stockCajasMax ??
                oEditNow.stockCajas
            );

            const nCurPalNow = toNum(oEditNow.cantidadPallets);
            const nCurCajNow = toNum(oEditNow.cantidadCajas);

            oModel.setProperty("/oSelecTableDetalle/stockPalletsRest", Math.max(0, nMaxPalNow - nCurPalNow));
            oModel.setProperty("/oSelecTableDetalle/stockCajasRest", Math.max(0, nMaxCajNow - nCurCajNow));

            oModel.setProperty("/oSelecTableDetalle/limitePalletsRest", Math.max(0, nMaxPalNow - nCurPalNow));
            oModel.setProperty("/oSelecTableDetalle/limiteCajasRest", Math.max(0, nMaxCajNow - nCurCajNow));

            // Actualiza inmediatamente el Stock Actual del lado izquierdo.
            this._syncStockRestanteEditDialog();

            const sUmv = oEditNow.UMV;

            let fQty = 0;
            if (sUmv === "PAL") fQty = toNum(oEditNow.cantidadPallets);
            if (sUmv === "CJ") fQty = toNum(oEditNow.cantidadCajas);

            if (!sUmv || fQty <= 0) {
                oModel.setProperty("/oSelecTableDetalle/cantidadM2", "0.000");
                oModel.setProperty("/oSelecTableDetalle/Cantidad", "0.000");
                oModel.setProperty("/oSelecTableDetalle/cantidad", "0.000");

                this._syncStockRestanteEditDialog();
                oModel.refresh(true);
                return;
            }

            const oEditUpdated = oModel.getProperty("/oSelecTableDetalle") || {};
            const fM2 = this._getCantidadM2EditCeramico(oEditUpdated, sUmv, fQty);
            const sM2 = toNum(fM2).toFixed(3);

            oModel.setProperty("/oSelecTableDetalle/cantidadM2", sM2);
            oModel.setProperty("/oSelecTableDetalle/Cantidad", sM2);
            oModel.setProperty("/oSelecTableDetalle/cantidad", sM2);
            oModel.setProperty("/oSelecTableDetalle/stockM2Total", sM2);

            this._syncStockRestanteEditDialog();

            oModel.refresh(true);
        },
        _onConfirmEditDetail: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oCtx = this._oContextMaterialEdit;
            if (!oCtx) return;

            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const oEdit = oModel.getProperty("/oSelecTableDetalle") || {};

            const sRowPathValida = oCtx.getPath();
            const oRowValida = oModel.getProperty(sRowPathValida) || {};

            if (this._isCalidadSMod(oEdit) || this._isCalidadSMod(oRowValida)) {
                sap.m.MessageToast.show(
                    "Las posiciones con calidad S no se pueden editar. Elimine la línea y agréguela nuevamente."
                );

                if (this._dialogEditDetail) {
                    this._dialogEditDetail.close();
                }

                return;
            }

            const sMatnr = String(oEdit.Material || oEdit.codigo || "").trim();
            const normItm = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };

            const sItmNumber = normItm(oEdit.ItmNumber || oEdit.OriginalItmNumber || oEdit.Posicion || "");

            if (!sMatnr || !sItmNumber) {
                sap.m.MessageToast.show("No se encontró la posición a editar.");
                return;
            }

            const sRowPath = oCtx.getPath();
            const oRow = oModel.getProperty(sRowPath) || {};

            const nMaxPal = toNum(
                oEdit.limitePalletsMax ??
                oEdit.stockPalletsMax ??
                oEdit.stockPalletsTotal ??
                oRow.TotalPallets ??
                oEdit.TotalPallets ??
                oRow.stockPallets ??
                oRow.Pallets ??
                0
            );

            const nMaxCaj = toNum(
                oEdit.limiteCajasMax ??
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
                    : String(oEdit.UMVBaseEdit || oEdit.TargetQuOriginal || oEdit.TargetQu || oEdit.UMV || "").trim();

            if (sBaseUMV === "PAL") {
                qCaj = 0;
            }

            if (sBaseUMV === "CJ") {
                qPal = 0;
            }

            // Valida contra el máximo final permitido.
            // Para posición original: límite = min(stock disponible, cantidad original del pedido)
            // Para posición nueva: límite = stock disponible
            if (qPal > nMaxPal) qPal = nMaxPal;
            if (qCaj > nMaxCaj) qCaj = nMaxCaj;

            // Esta es la parte que faltaba.
            // Convierte la cantidad editada PAL/CJ a M2 para que la simulación trabaje correctamente.
            const fQtyBulto = sBaseUMV === "PAL" ? qPal : qCaj;
            const fM2 = this._getCantidadM2EditCeramico(oEdit, sBaseUMV, fQtyBulto);

            const sM2 = fM2.toFixed(3);
            const sPal = qPal > 0 ? qPal.toFixed(3) : "";
            const sCaj = qCaj > 0 ? qCaj.toFixed(3) : "";

            const sCalibreEdit = oEdit.Calibre || oEdit.calibre || oEdit.Zzcalibre || "";
            const sTonoEdit = oEdit.Tono || oEdit.tono || oEdit.Zztono || "";
            const sCalidadEdit = oEdit.Zzcalidad || oEdit.calidad || oEdit.TipBulto || "";

            const bEsNuevaManualEdit =
                oEdit.__isNewManual === true ||
                oEdit.__keepManualBultos === true ||
                String(oEdit.AccionPosicion || oEdit.TipoOperacion || "").trim() === "I";

            const oAliasesManualEdit = bEsNuevaManualEdit ? {
                ManualCantidadPallets: sPal,
                ManualCantidadCajas: sCaj,
                cantidadPalletsManual: sPal,
                cantidadCajasManual: sCaj,
                ManualCalibre: sCalibreEdit,
                ManualTono: sTonoEdit,
                ManualCalidad: sCalidadEdit,
                calibreManual: sCalibreEdit,
                tonoManual: sTonoEdit,
                calidadManual: sCalidadEdit
            } : {};

            oModel.setProperty(sRowPath, {
                ...oRow,
                cantidadPallets: sPal,
                cantidadCajas: sCaj,
                NroPaletas: sPal,
                NroCajas: sCaj,

                ...oAliasesManualEdit,

                cantidad: sM2,
                Cantidad: sM2,
                cantidadM2: sM2,

                UMV: "M2",
                TargetQu: "M2",

                TipoOperacion: oEdit.__isNewManual === true ? "I" : "U",
                AccionPosicion: oEdit.__isNewManual === true ? "I" : "U",

                // Nuevo: evita que OrderDetails vuelva a pisar los bultos editados.
                __editManualBultosMod: oEdit.__isNewManual !== true,
                __keepEditedBultosMod: oEdit.__isNewManual !== true,

                __isNewManual: oEdit.__isNewManual === true,
                __keepManualBultos: oEdit.__isNewManual === true
            });

            if (typeof this._rebuildCantidadesFromUI === "function") {
                const aUI = oModel.getProperty("/oMaterialUI") || [];
                oModel.setProperty("/oCantidades", this._rebuildCantidadesFromUI(aUI));
            } else {
                const oCant = oModel.getProperty("/oCantidades") || {};

                if (!oCant[sMatnr]) {
                    oCant[sMatnr] = {};
                }

                oCant[sMatnr].cantidad = sM2;
                oCant[sMatnr].Cantidad = sM2;
                oCant[sMatnr].cantidadM2 = sM2;
                oCant[sMatnr].cantidadPallets = sPal;
                oCant[sMatnr].cantidadCajas = sCaj;
                oCant[sMatnr].NroPaletas = sPal;
                oCant[sMatnr].NroCajas = sCaj;
                oCant[sMatnr].UMV = "M2";
                oCant[sMatnr].TargetQu = "M2";

                oModel.setProperty("/oCantidades", oCant);
            }

            const oCantByItm = oModel.getProperty("/oCantidadesByItm") || {};

            oCantByItm[sItmNumber] = {
                Material: sMatnr,

                UMV: "M2",
                TargetQu: "M2",
                cantidad: sM2,
                Cantidad: sM2,
                cantidadM2: sM2,

                cantidadPallets: sPal,
                cantidadCajas: sCaj,
                NroPaletas: sPal,
                NroCajas: sCaj,

                ...oAliasesManualEdit,

                Calibre: sCalibreEdit,
                Zzcalibre: sCalibreEdit,
                Tono: sTonoEdit,
                Zztono: sTonoEdit,
                calidad: sCalidadEdit,
                Zzcalidad: sCalidadEdit,
                TipBulto: sCalidadEdit,

                TipoOperacion: oEdit.__isNewManual === true ? "I" : "U",
                AccionPosicion: oEdit.__isNewManual === true ? "I" : "U",

                __editManualBultosMod: oEdit.__isNewManual !== true,
                __keepEditedBultosMod: oEdit.__isNewManual !== true,

                __isNewManual: oEdit.__isNewManual === true,
                __keepManualBultos: oEdit.__isNewManual === true
            };

            oModel.setProperty("/oCantidadesByItm", oCantByItm);

            const aMaterialTech = oModel.getProperty("/oMaterial") || [];

            const normItmLocal = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };

            const sItmNumberNorm = normItmLocal(sItmNumber);

            const oTech = aMaterialTech.find(function (x) {
                return normItmLocal(x.ItmNumber || x.OriginalItmNumber || "") === sItmNumberNorm;
            });

            if (oTech) {
                oTech.cantidad = sM2;
                oTech.Cantidad = sM2;
                oTech.cantidadM2 = sM2;

                oTech.UMV = "M2";
                oTech.TargetQu = "M2";

                oTech.cantidadPallets = sPal;
                oTech.cantidadCajas = sCaj;
                oTech.NroPaletas = sPal;
                oTech.NroCajas = sCaj;

                oTech.Zzcalibre = oEdit.Calibre || oEdit.calibre || oEdit.Zzcalibre || "";
                oTech.Calibre = oEdit.Calibre || oEdit.calibre || oEdit.Zzcalibre || "";

                oTech.Zztono = oEdit.Tono || oEdit.tono || oEdit.Zztono || "";
                oTech.Tono = oEdit.Tono || oEdit.tono || oEdit.Zztono || "";

                oTech.Zzcalidad = oEdit.Zzcalidad || oEdit.calidad || oEdit.TipBulto || "";
                oTech.calidad = oEdit.Zzcalidad || oEdit.calidad || oEdit.TipBulto || "";
                oTech.TipBulto = oEdit.Zzcalidad || oEdit.calidad || oEdit.TipBulto || "";

                oTech.TipoOperacion = oEdit.__isNewManual === true ? "I" : "U";
                oTech.AccionPosicion = oEdit.__isNewManual === true ? "I" : "U";

                oTech.__editManualBultosMod = oEdit.__isNewManual !== true;
                oTech.__keepEditedBultosMod = oEdit.__isNewManual !== true;

                if (oEdit.__isNewManual === true || oEdit.__keepManualBultos === true) {
                    oTech.__isNewManual = true;
                    oTech.__keepManualBultos = true;
                }
            }

            oModel.setProperty("/oMaterial", aMaterialTech);

            const oManualBultosByItm = oModel.getProperty("/oManualBultosByItm") || {};

            if (bEsNuevaManualEdit) {
                oManualBultosByItm[sItmNumberNorm] = Object.assign(
                    {},
                    oManualBultosByItm[sItmNumberNorm] || {},
                    oCantByItm[sItmNumberNorm] || oCantByItm[sItmNumber] || {},
                    {
                        Material: sMatnr,

                        UMV: "M2",
                        TargetQu: "M2",
                        cantidad: sM2,
                        Cantidad: sM2,
                        cantidadM2: sM2,

                        cantidadPallets: sPal,
                        cantidadCajas: sCaj,
                        NroPaletas: sPal,
                        NroCajas: sCaj,

                        ManualCantidadPallets: sPal,
                        ManualCantidadCajas: sCaj,
                        cantidadPalletsManual: sPal,
                        cantidadCajasManual: sCaj,

                        Calibre: sCalibreEdit,
                        calibre: sCalibreEdit,
                        Zzcalibre: sCalibreEdit,

                        Tono: sTonoEdit,
                        tono: sTonoEdit,
                        Zztono: sTonoEdit,

                        calidad: sCalidadEdit,
                        Zzcalidad: sCalidadEdit,
                        TipBulto: sCalidadEdit,

                        ManualCalibre: sCalibreEdit,
                        ManualTono: sTonoEdit,
                        ManualCalidad: sCalidadEdit,
                        calibreManual: sCalibreEdit,
                        tonoManual: sTonoEdit,
                        calidadManual: sCalidadEdit,

                        __isNewManual: true,
                        __keepManualBultos: true,
                        AccionPosicion: "I",
                        TipoOperacion: "I"
                    }
                );

                oModel.setProperty("/oManualBultosByItm", oManualBultosByItm);
            }

            oModel.refresh(true);

            if (this._dialogEditDetail) {
                this._dialogEditDetail.close();
            }

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

            if (!oContext) {
                return;
            }

            const sPath = oContext.getPath();
            const iIndex = parseInt(sPath.split("/").pop(), 10);

            let aMaterialUI = oModel.getProperty("/oMaterialUI") || [];
            let aMaterial = oModel.getProperty("/oMaterial") || [];
            let aSchedule = oModel.getProperty("/oSchedule") || [];
            let aDeleted = oModel.getProperty("/oMaterialDeletedMod") || [];

            if (iIndex < 0 || !aMaterialUI[iIndex]) {
                sap.m.MessageToast.show("No se encontró el producto seleccionado.");
                return;
            }

            const oDeletedUI = aMaterialUI[iIndex];

            const fnNormItm = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };

            const sItmNumber = String(
                oDeletedUI.ItmNumber ||
                oDeletedUI.OriginalItmNumber ||
                oDeletedUI.Posicion ||
                oDeletedUI.Pos ||
                ""
            ).trim();

            const sItmNorm = fnNormItm(sItmNumber);

            const oDeletedTech = aMaterial.find(function (it) {
                return fnNormItm(it.ItmNumber || it.OriginalItmNumber || "") === sItmNorm;
            }) || {};

            const aOriginalBase = oModel.getProperty("/oMaterialOriginalModBase") || [];
            const aOriginalUIBase = oModel.getProperty("/oMaterialUIOriginalModBase") || [];

            const aOriginalMod = aOriginalBase.length
                ? aOriginalBase
                : (oModel.getProperty("/oMaterialOriginalMod") || []);

            const aOriginalUIMod = aOriginalUIBase.length
                ? aOriginalUIBase
                : (oModel.getProperty("/oMaterialUIOriginalMod") || []);

            const oOriginalSap = aOriginalMod.find(function (orig) {
                return fnNormItm(orig.ItmNumber || orig.OriginalItmNumber || "") === sItmNorm;
            }) || aOriginalUIMod.find(function (orig) {
                return fnNormItm(orig.ItmNumber || orig.OriginalItmNumber || orig.Posicion || "") === sItmNorm;
            });

            const sTipoActual = String(
                oDeletedUI.TipoOperacion ||
                oDeletedUI.AccionPosicion ||
                oDeletedTech.TipoOperacion ||
                oDeletedTech.AccionPosicion ||
                ""
            ).trim();

            const bTieneFlagNueva =
                sTipoActual === "I" ||
                oDeletedUI.__isNewManual === true ||
                oDeletedUI.__keepManualBultos === true ||
                oDeletedTech.__isNewManual === true ||
                oDeletedTech.__keepManualBultos === true;

            const bEsNuevaLocal = !oOriginalSap && bTieneFlagNueva;

            if (!bEsNuevaLocal) {
                const bYaExisteDeleted = aDeleted.some(function (d) {
                    return fnNormItm(d.ItmNumber || d.OriginalItmNumber || "") === sItmNorm;
                });

                if (!bYaExisteDeleted) {
                    const oBaseDel = oOriginalSap || oDeletedTech || oDeletedUI || {};

                    aDeleted.push(Object.assign({}, oBaseDel, oDeletedTech, oDeletedUI, {
                        TipoOperacion: "D",
                        AccionPosicion: "D",
                        Deleted: true,

                        ItmNumber: sItmNorm,
                        OriginalItmNumber: fnNormItm(
                            oBaseDel.OriginalItmNumber ||
                            oBaseDel.ItmNumber ||
                            oDeletedUI.OriginalItmNumber ||
                            oDeletedUI.ItmNumber ||
                            sItmNorm
                        ),

                        TargetQu: "M2",
                        UMV: "M2",

                        Material: String(
                            oBaseDel.Material ||
                            oDeletedTech.Material ||
                            oDeletedUI.Material ||
                            oDeletedUI.codigo ||
                            ""
                        ).trim(),

                        Plant: oBaseDel.Plant || oDeletedTech.Plant || oDeletedUI.Plant || "1001",

                        __isNewManual: false,
                        __keepManualBultos: false,
                        __editManualBultosMod: false,
                        __keepEditedBultosMod: false,
                        __fromDeleteButtonMod: true,
                        __isSapExistingForDelete: true,
                    }));
                }
            }
            aMaterialUI.splice(iIndex, 1);

            if (sItmNorm) {
                aMaterial = aMaterial.filter(function (it) {
                    return fnNormItm(it.ItmNumber || it.OriginalItmNumber || "") !== sItmNorm;
                });

                aSchedule = aSchedule.filter(function (it) {
                    return fnNormItm(it.ItmNumber || it.OriginalItmNumber || "") !== sItmNorm;
                });

                const oCantByItm = oModel.getProperty("/oCantidadesByItm") || {};
                delete oCantByItm[sItmNorm];
                oModel.setProperty("/oCantidadesByItm", oCantByItm);
            }

            const oCantNew = this._rebuildCantidadesFromUI(aMaterialUI);

            oModel.setProperty("/oMaterialUI", aMaterialUI);
            oModel.setProperty("/oMaterial", aMaterial);
            oModel.setProperty("/oSchedule", aSchedule);
            oModel.setProperty("/oCantidades", oCantNew);
            const mDeletedUnique = {};

            aDeleted.forEach(function (d) {
                const sKey = fnNormItm(d.ItmNumber || d.OriginalItmNumber || "");

                if (sKey) {
                    mDeletedUnique[sKey] = Object.assign({}, d, {
                        ItmNumber: sKey,
                        OriginalItmNumber: fnNormItm(d.OriginalItmNumber || d.ItmNumber || sKey),
                        TipoOperacion: "D",
                        AccionPosicion: "D",
                        Deleted: true,

                        __isNewManual: false,
                        __keepManualBultos: false,
                        __editManualBultosMod: false,
                        __keepEditedBultosMod: false,

                        __fromDeleteButtonMod: d.__fromDeleteButtonMod === true,
                        __isSapExistingForDelete: d.__isSapExistingForDelete === true
                    });
                }
            });

            aDeleted = Object.values(mDeletedUnique);
            oModel.setProperty("/oMaterialDeletedMod", aDeleted);

            oModel.refresh(true);

            if (typeof this.onSimulateOrder === "function") {
                this.onSimulateOrder();
            }

            sap.m.MessageToast.show("Producto marcado para eliminar correctamente.");
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
            // Tabla dentro del fragmento de cliente
            const oTable =
                sap.ui.getCore().byId(this.frgIdAddManualProductClient + "--tblStockCliente2") ||
                this.byId("tblStockCliente2");

            if (oTable) {
                oTable.removeSelections(true);
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
            const bEsSeparacion = oData.tipDocument === "ZPSE";

            if (!bEsSeparacion) {
                if (!sCondPago || String(sCondPago).trim() === "") {
                    sCondPago = oModel.getProperty("/oClientData/vtext");
                    oData.cbCondPago = sCondPago;
                }

                if (!sCondPago || String(sCondPago).trim() === "") {
                    aErrors.push("Debe ingresar la condición de pago");
                }
            } else {
                oData.cbCondPago = "";
                oData.txtCondPago = "";
            }

            if (!oData.tipoEntrega) {
                aErrors.push("Debe seleccionar una condición de entrega");
            }
            const sTipoEntregaReq = String(oData.tipoEntrega || "").trim();
            const sDestinoReq = String(oData.destinoCeramico || "").trim();
            const sAgenciaReq = String(oData.direccionAgencia || "").trim();

            if (["1", "2", "3"].includes(sTipoEntregaReq)) {
                if (!sDestinoReq) {
                    aErrors.push("Debe ingresar el destino");
                }
            }

            if (sTipoEntregaReq === "3") {
                if (!sAgenciaReq) {
                    aErrors.push("Debe seleccionar una agencia");
                }
            }

            if (oData.showSeparationDates) {
                if (!oData.fechInicio) {
                    aErrors.push("Debe ingresar la fecha de inicio");
                }

                if (!oData.fechFin) {
                    aErrors.push("Debe ingresar la fecha de fin");
                }
            }

            if (aErrors.length > 0) {
                const sFormattedText = aErrors.map(function (msg) {
                    return "• " + msg;
                }).join("\n");

                sap.m.MessageBox.error(sFormattedText, {
                    title: "Campos requeridos incompletos",
                    icon: sap.m.MessageBox.Icon.ERROR
                });

                return false;
            }

            oModel.setProperty("/inputForm", oData);
            return true;
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

            if (this._syncEntregaVisibilityMod) {
                this._syncEntregaVisibilityMod();
            }

            oModel.refresh(true);
        },
        onDetailCancel: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oBackup = oModel.getProperty("/inputFormBackup") || {};

            // Restaurar valores anteriores
            oModel.setProperty("/inputForm", JSON.parse(JSON.stringify(oBackup)));

            if (this._syncEntregaVisibilityMod) {
                this._syncEntregaVisibilityMod();
            }

            oModel.setProperty("/isDetailEdit", false);
            oModel.setProperty("/isFormEnabled", false);

            oModel.refresh(true);

            sap.m.MessageToast.show("Cambios descartados.");
        },
        _syncEntregaControlsToModelMod: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const oInputForm = oModel.getProperty("/inputForm") || {};
            const sTipoEntrega = String(oInputForm.tipoEntrega || "").trim();

            const oComboDestino = this._getFirstById([
                "DestinationTextandCeramicosDetailC",
                "DestinationTextandCeramicosDetail",
                "DestinationTextandCeramicos"
            ]);

            if (oComboDestino) {
                const sDestinoKey = String(oComboDestino.getSelectedKey && oComboDestino.getSelectedKey() || "").trim();
                const oDestinoItem = oComboDestino.getSelectedItem ? oComboDestino.getSelectedItem() : null;

                if (sDestinoKey) {
                    const sDestinoText = String(oDestinoItem && oDestinoItem.getText ? oDestinoItem.getText() : "").trim();
                    const sDestinoName = String(oDestinoItem && oDestinoItem.getAdditionalText ? oDestinoItem.getAdditionalText() : "").trim();

                    oModel.setProperty("/inputForm/destinoCeramico", sDestinoKey);
                    oModel.setProperty("/inputForm/destinoCeramicoText", sDestinoText);
                    oModel.setProperty("/inputForm/destinoCeramicoName", sDestinoName);
                    oModel.setProperty("/inputForm/destinoCeramicoAddress", sDestinoText);
                }
            }

            const oComboAgencia = this._getFirstById([
                "comboAgenciaC",
                "comboAgencia",
                "AgencyTextandCeramicosDetailC",
                "AgencyTextandCeramicosDetail"
            ]);

            if (sTipoEntrega === "3" && oComboAgencia) {
                const sAgenciaKey = String(oComboAgencia.getSelectedKey && oComboAgencia.getSelectedKey() || "").trim();
                const oAgenciaItem = oComboAgencia.getSelectedItem ? oComboAgencia.getSelectedItem() : null;

                if (sAgenciaKey) {
                    const sAgenciaAddr = String(oAgenciaItem && oAgenciaItem.getText ? oAgenciaItem.getText() : "").trim();
                    const sAgenciaName = String(oAgenciaItem && oAgenciaItem.getAdditionalText ? oAgenciaItem.getAdditionalText() : "").trim();

                    oModel.setProperty("/inputForm/direccionAgencia", sAgenciaKey);
                    oModel.setProperty("/inputForm/direccionAgenciaName", sAgenciaName);
                    oModel.setProperty("/inputForm/direccionAgenciaAddress", sAgenciaAddr);
                    oModel.setProperty("/inputForm/direccionAgenciaText", [sAgenciaName, sAgenciaAddr].filter(Boolean).join(" - "));
                    oModel.setProperty("/inputForm/direccionAgenciaAddrText", sAgenciaAddr);
                    oModel.setProperty("/inputForm/agenciaFullText", [sAgenciaAddr, sAgenciaName].filter(Boolean).join(" - "));
                }
            }

            if (sTipoEntrega !== "3") {
                oModel.setProperty("/inputForm/direccionAgencia", "");
                oModel.setProperty("/inputForm/direccionAgenciaName", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddress", "");
                oModel.setProperty("/inputForm/direccionAgenciaText", "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                oModel.setProperty("/inputForm/agenciaFullText", "");
            }

            oModel.refresh(true);
        },

        onDetailSave: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (this._syncEntregaControlsToModelMod) {
                this._syncEntregaControlsToModelMod();
            }

            if (this._validateRequiredFields && !this._validateRequiredFields()) {
                return;
            }

            if (this._updateResumenEntrega) {
                this._updateResumenEntrega();
            }

            oModel.setProperty("/isDetailEdit", false);
            oModel.setProperty("/isFormEnabled", false);
            oModel.refresh(true);

            void 0;

            sap.m.MessageToast.show("Condiciones comerciales actualizadas.");
        },

        // Sirve para todo lo que tenga que ver con direcciones
        onSelectRadioComprobante: function (oEvent) {
            if (!oEvent.getParameter("selected")) {
                return;
            }

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

            if (sValor !== "3") {
                this._clearAgenciaEntregaMod();
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
        _clearAgenciaEntregaMod: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            oModel.setProperty("/inputForm/direccionAgencia", "");
            oModel.setProperty("/inputForm/direccionAgenciaName", "");
            oModel.setProperty("/inputForm/direccionAgenciaAddress", "");
            oModel.setProperty("/inputForm/direccionAgenciaText", "");
            oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
            oModel.setProperty("/inputForm/agenciaFullText", "");
        },

        _syncEntregaVisibilityMod: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const sTipo = String(oModel.getProperty("/inputForm/tipoEntrega") || "").trim();
            oModel.setProperty("/inputForm/showDireccionDestino", sTipo === "1" || sTipo === "2" || sTipo === "3");
            oModel.setProperty("/inputForm/showAgenciaEntrega", sTipo === "3");

            if (sTipo !== "3") {
                this._clearAgenciaEntregaMod();
            }
        },

        _updateResumenEntrega: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oFiltros = oModel.getProperty("/inputForm") || {};
            const sTipo = String(oFiltros.tipoEntrega || "").trim();

            let sResumen = "";

            if (sTipo === "1") {
                sResumen = "Cliente recoge";
            }

            if (sTipo === "2") {
                sResumen = "Despacho directo";
            }

            if (sTipo === "3") {
                sResumen = "Despacho agencia";
            }

            oModel.setProperty("/inputForm/resumenEntrega", sResumen);

            const oComboDestino = this._getFirstById([
                "DestinationTextandCeramicosDetailC",
                "DestinationTextandCeramicosDetail",
                "DestinationTextandCeramicos"
            ]);

            const oItemDestino = oComboDestino?.getSelectedItem
                ? oComboDestino.getSelectedItem()
                : null;

            const sDestName = (
                oItemDestino?.getAdditionalText?.() ||
                oFiltros.destinoCeramicoName ||
                ""
            ).trim();

            const sDestAddr = (
                oItemDestino?.getText?.() ||
                oFiltros.destinoCeramicoAddress ||
                ""
            ).trim();

            const sDestinoText = (
                [sDestName, sDestAddr].filter(Boolean).join(" - ") ||
                oFiltros.destinoCeramicoText ||
                ""
            ).trim();

            let sDetalleEntrega = "";

            if (sTipo === "1" || sTipo === "2" || sTipo === "3") {
                sDetalleEntrega = sDestinoText;
            }

            oModel.setProperty("/inputForm/detalleEntrega", sDetalleEntrega);

            this._syncEntregaVisibilityMod();

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
            const toNumber = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            const oCant = {};
            (aMaterialUI || []).forEach(row => {
                const sMat = row.Material || row.codigo;
                if (!sMat) return;
                const nPal = toNumber(row.cantidadPallets);
                const nCaj = toNumber(row.cantidadCajas ?? 0);
                if (!oCant[sMat]) oCant[sMat] = {};
                if (nPal > 0) oCant[sMat].cantidadPallets = nPal.toFixed(3);
                if (nCaj > 0) oCant[sMat].cantidadCajas = nCaj.toFixed(3);
                if (!oCant[sMat].cantidadPallets && !oCant[sMat].cantidadCajas) {
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

        _formatDateToDDMMYYYY: function (vDate) {
            if (!vDate) {
                return "";
            }

            const fnPad = function (v) {
                return String(v).padStart(2, "0");
            };

            try {
                if (vDate instanceof Date && !isNaN(vDate.getTime())) {
                    return [
                        fnPad(vDate.getUTCDate()),
                        fnPad(vDate.getUTCMonth() + 1),
                        vDate.getUTCFullYear()
                    ].join("/");
                }

                const sDate = String(vDate || "").trim();

                if (!sDate) {
                    return "";
                }

                // Formato SAP OData: /Date(1775000400000)/
                const oSapMatch = /\/Date\((-?\d+)(?:[+-]\d+)?\)\//.exec(sDate);

                if (oSapMatch) {
                    const oDate = new Date(parseInt(oSapMatch[1], 10));

                    return [
                        fnPad(oDate.getUTCDate()),
                        fnPad(oDate.getUTCMonth() + 1),
                        oDate.getUTCFullYear()
                    ].join("/");
                }

                // Formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss
                const oIsoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(sDate);

                if (oIsoMatch) {
                    return `${oIsoMatch[3]}/${oIsoMatch[2]}/${oIsoMatch[1]}`;
                }

                // Formato YYYYMMDD
                const oDatsMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(sDate);

                if (oDatsMatch) {
                    return `${oDatsMatch[3]}/${oDatsMatch[2]}/${oDatsMatch[1]}`;
                }

                // Formato dd/MM/yyyy o dd.MM.yyyy
                const oDMYMatch = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/.exec(sDate);

                if (oDMYMatch) {
                    return `${fnPad(oDMYMatch[1])}/${fnPad(oDMYMatch[2])}/${oDMYMatch[3]}`;
                }

                // Fallback por si llega como string Date parseable.
                const iParsed = Date.parse(sDate);

                if (!isNaN(iParsed)) {
                    const oDate = new Date(iParsed);

                    return [
                        fnPad(oDate.getUTCDate()),
                        fnPad(oDate.getUTCMonth() + 1),
                        oDate.getUTCFullYear()
                    ].join("/");
                }

                return "";
            } catch (e) {
                return "";
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
        formatCantidad: function (value) {
            if (value === null || value === undefined || value === "") return "";
            const n = parseFloat(value);
            return Number.isInteger(n) ? n.toString() : n.toString();
        },
        formatCondPagoDisplay: function (sCodigo, sTexto) {
            if (!sCodigo && !sTexto) return "";
            if (!sTexto) return sCodigo;
            if (!sCodigo) return sTexto;
            return `${sCodigo} - ${sTexto}`;
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
        _mapPedidoModificacionCeramicosToModel: function (oCab, aItems) {
            const oModel = this.getView().getModel("oModelProyect");
            const oDataModel = this.getView().getModel("oModelData");
            const oCfg = this._getPedidoUnitConfig("1130");

            oCab = oCab || {};
            aItems = Array.isArray(aItems) ? aItems : [];

            // IMPORTANTE:
            // Si /inputForm no existe, los setProperty("/inputForm/xxx") no pintan nada.
            const oInputFormActual = oModel.getProperty("/inputForm") || {};
            oModel.setProperty("/inputForm", Object.assign({}, oInputFormActual));

            const fnGet = function () {
                const aArgs = [oCab].concat(Array.prototype.slice.call(arguments));
                return this._getDocHeaderValue.apply(this, aArgs);
            }.bind(this);

            const sCustomer = fnGet(
                "Customer",
                "SoldToParty",
                "Cliente",
                "Kunnr",
                "ClientId"
            );

            const sCustomerName = fnGet(
                "CustomerName",
                "CustomerFullName",
                "Name1",
                "RazonSocial"
            );

            const sSalesOrg = fnGet(
                "SalesOrganization",
                "OrgVentas",
                "SalesOrg"
            ) || oCfg.SalesOrg;

            const sDivision = fnGet(
                "Division",
                "DivisionCode"
            ) || "S1";

            const sDocType = fnGet(
                "SalesDocumentType",
                "DocType",
                "AUART"
            ) || "ZPES";

            let sDocTypeText = fnGet(
                "DscSalesDocumentType",
                "DescriptionSalesDocumentType",
                "SalesDocumentTypeText",
                "DocumentTypeText",
                "DscType"
            );

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

            const sCurrency = fnGet(
                "Currency",
                "TransactionCurrency",
                "DocumentCurrency",
                "CurrencyCode",
                "Moneda"
            ) || "PEN";

            const sCondPago = fnGet(
                "PaymentCondition",
                "PaymentTerms",
                "CustomerPaymentTerms",
                "Pmnttrms",
                "Zterm"
            );

            let sCondPagoText = fnGet(
                "DescriptionConditionPayment",
                "PaymentConditionText",
                "DesCondition",
                "Vtext"
            );

            if (!sCondPagoText && oDataModel) {
                const aCond = oDataModel.getProperty("/oConditionPay") || [];
                const oCond = aCond.find(function (c) {
                    return String(c.Conditionn || "").trim() === String(sCondPago || "").trim();
                });

                if (oCond) {
                    sCondPagoText = oCond.DesCondition || oCond.Description || "";
                }
            }

            if (!sCondPagoText) {
                sCondPagoText = sCondPago;
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
                "Fechavencimientooc",
                "OCFechaVencimiento",
                "FechaVencOC"
            ));

            const sVendorId = fnGet(
                "VendorID",
                "VendorId",
                "kunn2",
                "Kunn2",
                "SalesEmployee",
                "SellerId"
            );

            const sVendorName = fnGet(
                "Vendor",
                "VendorName",
                "Seller",
                "SalesEmployeeName"
            );

            const sShipCond = fnGet(
                "DeliveryCondition",
                "ShippingCondition",
                "ShipCond"
            );

            const sAgency = fnGet(
                "Agency",
                "AgencyCustomer",
                "DireccionAgencia"
            );

            const sAgencyName = fnGet(
                "AgencyName",
                "Agencyname"
            );

            const sFinalDestination = fnGet(
                "FinalDestination",
                "Destination",
                "Destinationid",
                "Destino"
            );

            const sFinalDestinationName = fnGet(
                "FinalDestinationName",
                "DestinationName",
                "DestinationText"
            );

            const sShippingDestination = fnGet(
                "ShippingDestination"
            );

            const sShippingDestinationName = fnGet(
                "ShippingDestinationName"
            );

            const sCustomerGroup = fnGet(
                "CustomerGroup"
            );

            const sCodigoWE = String(sAgency || sShippingDestination || "").trim();
            const sCodigoZ0 = String(sFinalDestination || "").trim();

            let sTipoEntrega = "2";

            if (sShipCond === "02") {
                // Cliente recoge: WE = Z0
                sTipoEntrega = "1";
            } else if (sShipCond === "01") {
                // Despacho agencia solo cuando WE y Z0 son distintos.
                sTipoEntrega = (sCodigoWE && sCodigoZ0 && sCodigoWE !== sCodigoZ0)
                    ? "3"
                    : "2";
            }

            const sResumenEntrega =
                sTipoEntrega === "1"
                    ? "Cliente recoge"
                    : sTipoEntrega === "3"
                        ? "Despacho agencia"
                        : "Despacho directo";

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

            const oInputForm = Object.assign({}, oModel.getProperty("/inputForm") || {}, {
                tipDocument: sDocType,
                txtTipDocument: sDocTypeText || sDocType,
                moneda: sCurrency,
                cbCondPago: sCondPago,
                txtCondPago: sCondPagoText || sCondPago,
                purchaseOrder: sPurchaseOrder || "",
                ocExpDate: sFechaVencimientoOC || "",
                tipoEntrega: sTipoEntrega,
                resumenEntrega: sResumenEntrega,
                destinoCeramico: sCodigoZ0 || sCodigoWE,
                destinoCeramicoText: sFinalDestinationName,
                destinoCeramicoName: sFinalDestinationName,
                destinoCeramicoAddress: sFinalDestinationName || sCodigoZ0 || sCodigoWE,
                detalleEntrega: sFinalDestinationName || sCodigoZ0 || sCodigoWE,

                direccionAgencia: sTipoEntrega === "3" ? sCodigoWE : "",
                direccionAgenciaText: sTipoEntrega === "3"
                    ? (sAgencyName || sShippingDestinationName || sCodigoWE)
                    : "",
                direccionAgenciaAddrText: sTipoEntrega === "3"
                    ? (sAgencyName || sShippingDestinationName || "")
                    : "",
                agenciaFullText: sTipoEntrega === "3"
                    ? (sAgencyName || sShippingDestinationName || sCodigoWE)
                    : "",
                agenciaFullText: sAgencyName || sShippingDestinationName || sAgency || sShippingDestination,
                isTipDocumentEnabled: false
            });

            oModel.setProperty("/inputForm", oInputForm);
            oModel.setProperty("/isFormEnabled", true);

            const aMaterialTech = [];
            const aMaterialUI = [];
            const oCantidades = {};
            const oCantidadesByItm = {};
            const oRefByItm = {};

            aItems.forEach(function (oItem, index) {
                const sMat = String(oItem.Material || oItem.Product || oItem.Matnr || "").trim();

                if (!sMat) {
                    return;
                }

                const sItmNumber = String(
                    oItem.SalesDocumentItem ||
                    oItem.ItmNumber ||
                    oItem.Item ||
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
                    "M2"
                ).trim();
                const sZzcalibre = String(
                    oItem.Zzcalibre ||
                    oItem.zzcalibre ||
                    oItem.Calibre ||
                    oItem.calibre ||
                    ""
                ).trim();

                const sZztono = String(
                    oItem.Zztono ||
                    oItem.zztono ||
                    oItem.Tono ||
                    oItem.tono ||
                    ""
                ).trim();

                const sZzcalidad = String(
                    oItem.Zzcalidad ||
                    oItem.zzcalidad ||
                    oItem.Calidad ||
                    oItem.calidad ||
                    oItem.TipBulto ||
                    oItem.tipbulto ||
                    ""
                ).trim();

                const oRef = {
                    RefDoc: oItem.RefDoc || oItem.ReferenceSDDocument || oItem.SalesDocument || oCab.SalesDocument || "",
                    RefDocIt: oItem.RefDocIt || oItem.ReferenceSDDocumentItem || oItem.SalesDocumentItem || sItmNumber,
                    RefDocCa: oItem.RefDocCa || oItem.SDDocumentCategory || oItem.SalesDocumentCategory || "C"
                };

                aMaterialTech.push({
                    ItmNumber: sItmNumber,
                    Material: sMat,
                    TargetQu: sTargetQu,
                    UMV: sTargetQu,

                    cantidad: sQty,
                    Cantidad: sQty,
                    cantidadM2: sQty,

                    Plant: oItem.Plant || oCfg.Plant,
                    Zzcalibre: sZzcalibre,
                    Zztono: sZztono,
                    Zzcalidad: sZzcalidad,
                    TipBulto: sZzcalidad,
                    RefDoc: oRef.RefDoc,
                    RefDocIt: oRef.RefDocIt,
                    RefDocCa: oRef.RefDocCa,

                    TipoOperacion: "N",
                    OriginalItmNumber: sItmNumber,
                    Deleted: false
                });

                aMaterialUI.push({
                    ItmNumber: sItmNumber,
                    Posicion: sItmNumber,
                    OriginalItmNumber: sItmNumber,
                    Material: sMat,
                    codigo: sMat,
                    descripcion:
                        oItem.SalesDocumentItemText ||
                        oItem.MaterialDescription ||
                        oItem.ProductDescription ||
                        oItem.Description ||
                        oItem.Descripcion ||
                        "",
                    Descriptions:
                        oItem.SalesDocumentItemText ||
                        oItem.MaterialDescription ||
                        oItem.ProductDescription ||
                        oItem.Description ||
                        oItem.Descripcion ||
                        "",
                    cantidad: sQty,
                    cantidadPallets: "",
                    cantidadCajas: "",
                    UMV: sTargetQu,
                    TargetQu: sTargetQu,
                    calibre: sZzcalibre,
                    Calibre: sZzcalibre,
                    Zzcalibre: sZzcalibre,

                    tono: sZztono,
                    Tono: sZztono,
                    Zztono: sZztono,

                    calidad: sZzcalidad,
                    Zzcalidad: sZzcalidad,
                    TipBulto: sZzcalidad,
                    prLista: 0,
                    descuentos: 0,
                    prUnit: 0,
                    total: 0,
                    TipoOperacion: "N",
                    OriginalItmNumber: sItmNumber,
                    Deleted: false
                });

                oCantidades[sMat] = {
                    cantidad: fQty,
                    cantidadPallets: 0,
                    cantidadCajas: 0
                };

                oCantidadesByItm[sItmNumber] = {
                    Material: sMat,
                    UMV: sTargetQu,
                    TargetQu: sTargetQu,

                    cantidad: sQty,
                    Cantidad: sQty,
                    cantidadM2: sQty,

                    cantidadPallets: 0,
                    cantidadCajas: 0
                };

                oRefByItm[sItmNumber] = oRef;
            }.bind(this));

            oModel.setProperty("/oMaterial", aMaterialTech);
            oModel.setProperty("/oMaterialUI", aMaterialUI);

            const aMaterialTechBase = JSON.parse(JSON.stringify(aMaterialTech));
            const aMaterialUIBase = JSON.parse(JSON.stringify(aMaterialUI));
            const oCantidadesByItmBase = JSON.parse(JSON.stringify(oCantidadesByItm));

            oModel.setProperty("/oMaterialOriginalModBase", aMaterialTechBase);
            oModel.setProperty("/oMaterialUIOriginalModBase", aMaterialUIBase);
            oModel.setProperty("/oCantidadesByItmOriginalModBase", oCantidadesByItmBase);

            oModel.setProperty("/oMaterialOriginalMod", aMaterialTechBase);
            oModel.setProperty("/oMaterialUIOriginalMod", aMaterialUIBase);
            oModel.setProperty("/oCantidadesByItmOriginalMod", oCantidadesByItmBase);

            oModel.setProperty("/oMaterialDeletedMod", []);

            // Bandera para que el llenado inicial de pallets/cajas no marque modificación.
            oModel.setProperty("/bBultoOrderDetailsInicializado", false);

            oModel.setProperty("/oCantidades", oCantidades);
            oModel.setProperty("/oCantidadesByItm", oCantidadesByItm);
            oModel.setProperty("/oRefByItm", oRefByItm);

            void 0;

            oModel.refresh(true);
        },

        _normalizeItmNumberMod: function (v) {
            const s = String(v === undefined || v === null ? "" : v).trim();

            if (!s) {
                return "";
            }

            const n = parseInt(s, 10);
            return isNaN(n) ? s : String(n).padStart(6, "0");
        },

        _toNumberMod: function (v) {
            if (v === undefined || v === null || v === "") {
                return 0;
            }

            const n = parseFloat(String(v).replace(",", "."));
            return isNaN(n) ? 0 : n;
        },

        _getPedidoModificarNumeroMod: function () {
            const oModel = this.getView().getModel("oModelProyect");
            const oData = oModel ? oModel.getData() : {};

            return String(
                oModel?.getProperty("/pedidoModificar") ||
                oData?.pedidoModificar ||
                oData?.docModificarCabecera?.SalesDocument ||
                oData?.docModificarCabecera?.VbelnPedido ||
                ""
            ).trim();
        },

        _getCantidadDocumentoOrderDetailsMod: function (oItem) {
            const sCat = String(oItem.SDDocumentCategory || oItem.SalesDocumentCategory || "").trim();

            if (sCat === "G") {
                return this._toNumberMod(oItem.TargetQuantity || "0");
            }

            if (sCat === "B") {
                return this._toNumberMod(oItem.OrderQuantity || "0");
            }

            return this._toNumberMod(oItem.OrderQuantity || oItem.TargetQuantity || "0");
        },

        _buildOrderDetailsUrlMod: function (sPedido) {
            const sFilter = "$filter=SalesDocument eq '" + sPedido + "'";

            if (this.local) {
                const sPath = "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderDetails" +
                    "?" + sFilter + "&$format=json&sap-language=ES";

                return this.getOwnerComponent().getManifestObject().resolveUri(sPath);
            }

            return jQuery.sap.getModulePath(this.route) +
                "/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/OrderDetails" +
                "?" + sFilter + "&$format=json&sap-language=ES";
        },

        _getOrderDetailsBultosMod: function (sSalesDocument) {
            const that = this;

            const oResp = {
                sEstado: "E",
                oResults: []
            };

            return new Promise(function (resolve) {
                const sPedido = String(sSalesDocument || "").trim();

                if (!sPedido) {
                    resolve(oResp);
                    return;
                }

                const sUrl = that._buildOrderDetailsUrlMod(sPedido);

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            let aData = oData && oData.data ? oData.data : [];

                            if (!Array.isArray(aData)) {
                                aData = [aData];
                            }

                            const mGrouped = {};

                            aData.forEach(function (oItem) {
                                const sPos = that._normalizeItmNumberMod(
                                    oItem.SalesDocumentItem ||
                                    oItem.ItmNumber ||
                                    oItem.Item ||
                                    ""
                                );

                                if (!sPos) {
                                    return;
                                }

                                if (!mGrouped[sPos]) {
                                    mGrouped[sPos] = Object.assign({}, oItem, {
                                        SalesDocumentItem: sPos,
                                        _orderQty: that._getCantidadDocumentoOrderDetailsMod(oItem)
                                    });
                                }

                                const sTipBulto = String(oItem.TipBulto || oItem.tipbulto || "").trim();
                                const nOrdered = that._getCantidadDocumentoOrderDetailsMod(oItem);

                                const nPalletUmren = that._toNumberMod(oItem.PalletUmren);
                                const nPalletUmrez = that._toNumberMod(oItem.PalletUmrez);

                                const nCajaUmren = that._toNumberMod(oItem.CajaUmren);
                                const nCajaUmrez = that._toNumberMod(oItem.CajaUmrez);

                                const nCantidadPallets = nPalletUmrez !== 0
                                    ? (nOrdered * nPalletUmren) / nPalletUmrez
                                    : 0;

                                const nCantidadCajas = nCajaUmrez !== 0
                                    ? (nOrdered * nCajaUmren) / nCajaUmrez
                                    : 0;

                                mGrouped[sPos].CantidadPallets = nCantidadPallets;
                                mGrouped[sPos].CantidadCajas = nCantidadCajas;

                                if (sTipBulto) {
                                    mGrouped[sPos].TipBulto = sTipBulto;
                                }
                            });

                            oResp.sEstado = "S";
                            oResp.oResults = Object.keys(mGrouped).map(function (sPos) {
                                const r = mGrouped[sPos];
                                const nOrdered = that._toNumberMod(r._orderQty);

                                const nPalletUmren = that._toNumberMod(r.PalletUmren);
                                const nPalletUmrez = that._toNumberMod(r.PalletUmrez);
                                const nCajaUmren = that._toNumberMod(r.CajaUmren);
                                const nCajaUmrez = that._toNumberMod(r.CajaUmrez);

                                const nPaletas = nPalletUmrez !== 0
                                    ? (nOrdered * nPalletUmren) / nPalletUmrez
                                    : 0;

                                const nCajas = nCajaUmrez !== 0
                                    ? (nOrdered * nCajaUmren) / nCajaUmrez
                                    : 0;

                                const sTipBulto = String(r.TipBulto || r.tipbulto || "").trim();

                                const bEsCaja = sTipBulto === "S";

                                return {
                                    SalesDocumentItem: sPos,
                                    TipBulto: sTipBulto,
                                    CantidadPalletsCalc: nPaletas,
                                    CantidadCajasCalc: nCajas,
                                    NroPaletasCalc: nPaletas,
                                    NroCajasCalc: nCajas
                                };
                            });

                            resolve(oResp);
                        },
                        error: function () {
                            resolve(oResp);
                        }
                    });
                });
            });
        },

        _enrichBultosFromOrderDetailsMod: async function (aMaterialUI) {
            const oModel = this.getView().getModel("oModelProyect");
            const sPedido = this._getPedidoModificarNumeroMod();
            const aUI = Array.isArray(aMaterialUI) ? aMaterialUI : [];

            if (!oModel || !sPedido || !aUI.length) {
                return aUI;
            }

            const fnFormatBulto = function (v) {
                const n = this._toNumberMod(v);
                return n > 0 ? n.toFixed(3) : "";
            }.bind(this);

            const fnHasManualFlag = function (oObj) {
                return !!(
                    oObj &&
                    (
                        oObj.__keepManualBultos === true ||
                        oObj.__isNewManual === true ||
                        //oObj.AccionPosicion === "N" ||
                        oObj.AccionPosicion === "I" ||
                        //oObj.accionPosicion === "N" ||
                        oObj.accionPosicion === "I" ||
                        oObj.TipoOperacion === "I"
                    )
                );
            };
            const fnHasEditedFlag = function (oObj) {
                return !!(
                    oObj &&
                    (
                        oObj.__editManualBultosMod === true ||
                        oObj.__keepEditedBultosMod === true ||
                        oObj.AccionPosicion === "U" ||
                        oObj.TipoOperacion === "U"
                    )
                );
            };

            const normItm = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };

            try {
                const oResp = await this._getOrderDetailsBultosMod(sPedido);
                const aBultos = oResp && Array.isArray(oResp.oResults) ? oResp.oResults : [];

                const mBultoByItm = {};
                aBultos.forEach(function (b) {
                    const sItm = normItm(
                        b.SalesDocumentItem ||
                        b.ItmNumber ||
                        b.Posicion ||
                        ""
                    );

                    if (sItm) {
                        mBultoByItm[sItm] = b;
                    }
                });

                const oCantidades = oModel.getProperty("/oCantidades") || {};
                const oCantidadesByItm = oModel.getProperty("/oCantidadesByItm") || {};
                const oManualBultosByItm = oModel.getProperty("/oManualBultosByItm") || {};
                const aMaterialTech = oModel.getProperty("/oMaterial") || [];

                const mTechByItm = {};
                aMaterialTech.forEach(function (it) {
                    const sItm = normItm(it.ItmNumber || it.OriginalItmNumber || "");
                    if (sItm) {
                        mTechByItm[sItm] = it;
                    }
                });

                const aEnriched = aUI.map(function (row) {
                    const sItm = normItm(
                        row.ItmNumber ||
                        row.OriginalItmNumber ||
                        row.Posicion ||
                        row.Pos ||
                        ""
                    );

                    const sMat = String(row.Material || row.codigo || "").trim();
                    const oCantItm = oCantidadesByItm[sItm] || {};
                    const oTechItm = mTechByItm[sItm] || {};
                    const oManualItm = oManualBultosByItm[sItm] || {};
                    const oBulto = mBultoByItm[sItm];

                    const bEditado =
                        fnHasEditedFlag(row) ||
                        fnHasEditedFlag(oCantItm) ||
                        fnHasEditedFlag(oTechItm);

                    if (bEditado) {
                        const nM2Edit = this._toNumberMod(
                            oCantItm.cantidadM2 ||
                            oCantItm.Cantidad ||
                            oCantItm.cantidad ||
                            oTechItm.cantidadM2 ||
                            oTechItm.Cantidad ||
                            oTechItm.cantidad ||
                            row.cantidadM2 ||
                            row.Cantidad ||
                            row.cantidad ||
                            0
                        );

                        const sPal =
                            oCantItm.cantidadPallets ||
                            oCantItm.NroPaletas ||
                            oTechItm.cantidadPallets ||
                            oTechItm.NroPaletas ||
                            row.cantidadPallets ||
                            row.NroPaletas ||
                            "";

                        const sCaj =
                            oCantItm.cantidadCajas ||
                            oCantItm.NroCajas ||
                            oTechItm.cantidadCajas ||
                            oTechItm.NroCajas ||
                            row.cantidadCajas ||
                            row.NroCajas ||
                            "";

                        if (sItm) {
                            oCantidadesByItm[sItm] = Object.assign({}, oCantItm, {
                                Material: sMat || oCantItm.Material,
                                UMV: "M2",
                                TargetQu: "M2",

                                cantidad: nM2Edit > 0 ? nM2Edit.toFixed(3) : "",
                                Cantidad: nM2Edit > 0 ? nM2Edit.toFixed(3) : "",
                                cantidadM2: nM2Edit > 0 ? nM2Edit.toFixed(3) : "",

                                cantidadPallets: sPal,
                                cantidadCajas: sCaj,
                                NroPaletas: sPal,
                                NroCajas: sCaj,

                                TipoOperacion: "U",
                                AccionPosicion: "U",

                                __editManualBultosMod: true,
                                __keepEditedBultosMod: true,
                                __isNewManual: false,
                                __keepManualBultos: false
                            });
                        }

                        return Object.assign({}, row, {
                            cantidad: nM2Edit > 0 ? nM2Edit.toFixed(3) : row.cantidad,
                            Cantidad: nM2Edit > 0 ? nM2Edit.toFixed(3) : row.Cantidad,
                            cantidadM2: nM2Edit > 0 ? nM2Edit.toFixed(3) : row.cantidadM2,

                            UMV: "M2",
                            TargetQu: "M2",

                            cantidadPallets: sPal,
                            cantidadCajas: sCaj,
                            NroPaletas: sPal,
                            NroCajas: sCaj,

                            TipoOperacion: "U",
                            AccionPosicion: "U",

                            __editManualBultosMod: true,
                            __keepEditedBultosMod: true,
                            __isNewManual: false,
                            __keepManualBultos: false
                        });
                    }



                    const bManual =
                        fnHasManualFlag(row) ||
                        fnHasManualFlag(oCantItm) ||
                        fnHasManualFlag(oTechItm) ||
                        fnHasManualFlag(oManualItm);

                    if (bManual) {
                        const nM2Manual = this._toNumberMod(
                            row.cantidadM2 ||
                            row.Cantidad ||
                            row.cantidad ||
                            oManualItm.cantidadM2 ||
                            oManualItm.Cantidad ||
                            oManualItm.cantidad ||
                            oCantItm.cantidadM2 ||
                            oCantItm.Cantidad ||
                            oCantItm.cantidad ||
                            oTechItm.cantidadM2 ||
                            oTechItm.Cantidad ||
                            oTechItm.cantidad
                        );

                        const sPal =
                            oManualItm.cantidadPallets ||
                            oManualItm.NroPaletas ||
                            oCantItm.cantidadPallets ||
                            oCantItm.NroPaletas ||
                            oTechItm.cantidadPallets ||
                            oTechItm.NroPaletas ||
                            row.cantidadPallets ||
                            row.NroPaletas ||
                            "";

                        const sCaj =
                            oManualItm.cantidadCajas ||
                            oManualItm.NroCajas ||
                            oCantItm.cantidadCajas ||
                            oCantItm.NroCajas ||
                            oTechItm.cantidadCajas ||
                            oTechItm.NroCajas ||
                            row.cantidadCajas ||
                            row.NroCajas ||
                            "";

                        const sCalibre =
                            oManualItm.Calibre ||
                            oManualItm.calibre ||
                            oManualItm.Zzcalibre ||
                            row.Calibre ||
                            row.calibre ||
                            row.Zzcalibre ||
                            oCantItm.Calibre ||
                            oCantItm.Zzcalibre ||
                            oTechItm.Calibre ||
                            oTechItm.Zzcalibre ||
                            "";

                        const sTono =
                            oManualItm.Tono ||
                            oManualItm.tono ||
                            oManualItm.Zztono ||
                            row.Tono ||
                            row.tono ||
                            row.Zztono ||
                            oCantItm.Tono ||
                            oCantItm.Zztono ||
                            oTechItm.Tono ||
                            oTechItm.Zztono ||
                            "";

                        const sCalidad =
                            oManualItm.Zzcalidad ||
                            oManualItm.calidad ||
                            oManualItm.TipBulto ||
                            row.Zzcalidad ||
                            row.calidad ||
                            row.TipBulto ||
                            oCantItm.Zzcalidad ||
                            oCantItm.calidad ||
                            oCantItm.TipBulto ||
                            oTechItm.Zzcalidad ||
                            oTechItm.calidad ||
                            oTechItm.TipBulto ||
                            "";

                        if (sItm) {
                            oCantidadesByItm[sItm] = Object.assign({}, oCantItm, {
                                Material: sMat || oCantItm.Material,

                                UMV: "M2",
                                TargetQu: "M2",
                                cantidad: nM2Manual > 0 ? nM2Manual.toFixed(3) : (oCantItm.cantidad || ""),
                                Cantidad: nM2Manual > 0 ? nM2Manual.toFixed(3) : (oCantItm.Cantidad || ""),
                                cantidadM2: nM2Manual > 0 ? nM2Manual.toFixed(3) : (oCantItm.cantidadM2 || ""),

                                cantidadPallets: sPal,
                                cantidadCajas: sCaj,
                                NroPaletas: sPal,
                                NroCajas: sCaj,

                                Calibre: sCalibre,
                                Zzcalibre: sCalibre,
                                Tono: sTono,
                                Zztono: sTono,
                                calidad: sCalidad,
                                Zzcalidad: sCalidad,
                                TipBulto: sCalidad,

                                __keepManualBultos: true,
                                __isNewManual: true,
                                AccionPosicion: "I",
                                TipoOperacion: "I"
                            });
                        }

                        if (sMat) {
                            oCantidades[sMat] = Object.assign({}, oCantidades[sMat] || {}, {
                                cantidad: nM2Manual > 0 ? nM2Manual.toFixed(3) : "",
                                Cantidad: nM2Manual > 0 ? nM2Manual.toFixed(3) : "",
                                cantidadM2: nM2Manual > 0 ? nM2Manual.toFixed(3) : "",

                                cantidadPallets: sPal,
                                cantidadCajas: sCaj,
                                NroPaletas: sPal,
                                NroCajas: sCaj,

                                Calibre: sCalibre,
                                Zzcalibre: sCalibre,
                                Tono: sTono,
                                Zztono: sTono,
                                calidad: sCalidad,
                                Zzcalidad: sCalidad,
                                TipBulto: sCalidad,

                                __keepManualBultos: true,
                                __isNewManual: true,
                                AccionPosicion: "I",
                                TipoOperacion: "I"
                            });
                        }

                        return Object.assign({}, row, {
                            ItmNumber: sItm || this._normItmMod(row.ItmNumber),
                            OriginalItmNumber: row.OriginalItmNumber || sItm || this._normItmMod(row.ItmNumber),
                            Pos: sItm || this._normItmMod(row.Pos || row.Posicion || row.ItmNumber),
                            Posicion: sItm || this._normItmMod(row.Posicion || row.Pos || row.ItmNumber),

                            cantidad: nM2Manual > 0 ? nM2Manual.toFixed(3) : row.cantidad,
                            Cantidad: nM2Manual > 0 ? nM2Manual.toFixed(3) : row.Cantidad,
                            cantidadM2: nM2Manual > 0 ? nM2Manual.toFixed(3) : row.cantidadM2,
                            TargetQu: "M2",
                            UMV: "M2",

                            cantidadPallets: sPal,
                            cantidadCajas: sCaj,
                            NroPaletas: sPal,
                            NroCajas: sCaj,

                            Calibre: sCalibre,
                            calibre: sCalibre,
                            Zzcalibre: sCalibre,
                            Tono: sTono,
                            tono: sTono,
                            Zztono: sTono,
                            calidad: sCalidad,
                            Zzcalidad: sCalidad,
                            TipBulto: sCalidad,

                            __keepManualBultos: true,
                            __isNewManual: true,
                            AccionPosicion: "I",
                            TipoOperacion: "I"
                        });
                    }

                    if (!oBulto) {
                        return row;
                    }

                    const sTargetQu = String(
                        row.TargetQu ||
                        row.UMV ||
                        oBulto.TargetQuBulto ||
                        ""
                    ).trim();

                    const sTipBultoFinal = String(
                        row.TipBulto ||
                        row.Zzcalidad ||
                        row.calidad ||
                        oBulto.TipBulto ||
                        ""
                    ).trim();

                    const bEsCaja = sTipBultoFinal === "S";

                    const nPalCalc = this._toNumberMod(
                        oBulto.CantidadPalletsCalc ||
                        oBulto.NroPaletasCalc ||
                        oBulto.CantidadPallets
                    );

                    const nCajCalc = this._toNumberMod(
                        oBulto.CantidadCajasCalc ||
                        oBulto.NroCajasCalc ||
                        oBulto.CantidadCajas
                    );

                    const nPal = bEsCaja ? 0 : nPalCalc;
                    const nCaj = bEsCaja ? nCajCalc : 0;

                    const sCalibreFinal =
                        row.Calibre ||
                        row.calibre ||
                        row.Zzcalibre ||
                        oBulto.Calibre ||
                        oBulto.Zzcalibre ||
                        "";

                    const sTonoFinal =
                        row.Tono ||
                        row.tono ||
                        row.Zztono ||
                        oBulto.Tono ||
                        oBulto.Zztono ||
                        "";

                    if (sItm) {
                        oCantidadesByItm[sItm] = Object.assign({}, oCantItm, {
                            Material: sMat,

                            cantidadPallets: fnFormatBulto(nPal),
                            cantidadCajas: fnFormatBulto(nCaj),
                            NroPaletas: fnFormatBulto(nPal),
                            NroCajas: fnFormatBulto(nCaj),

                            Calibre: sCalibreFinal,
                            Zzcalibre: sCalibreFinal,
                            Tono: sTonoFinal,
                            Zztono: sTonoFinal,

                            calidad: sTipBultoFinal,
                            Zzcalidad: sTipBultoFinal,
                            TipBulto: sTipBultoFinal
                        });
                    }

                    return Object.assign({}, row, {
                        ItmNumber: sItm || row.ItmNumber,
                        Posicion: row.Posicion || sItm,

                        cantidadPallets: fnFormatBulto(nPal),
                        cantidadCajas: fnFormatBulto(nCaj),
                        NroPaletas: fnFormatBulto(nPal),
                        NroCajas: fnFormatBulto(nCaj),

                        Calibre: sCalibreFinal,
                        calibre: sCalibreFinal,
                        Zzcalibre: sCalibreFinal,
                        Tono: sTonoFinal,
                        tono: sTonoFinal,
                        Zztono: sTonoFinal,

                        calidad: sTipBultoFinal,
                        Zzcalidad: sTipBultoFinal,
                        TipBulto: sTipBultoFinal
                    });
                }.bind(this));

                aMaterialTech.forEach(function (it) {
                    const sItm = normItm(it.ItmNumber || it.OriginalItmNumber || "");
                    const oCantItm = oCantidadesByItm[sItm] || {};
                    const oManualItm = oManualBultosByItm[sItm] || {};
                    const oBulto = mBultoByItm[sItm];

                    const bManual =
                        fnHasManualFlag(it) ||
                        fnHasManualFlag(oCantItm) ||
                        fnHasManualFlag(oManualItm);

                    if (bManual) {
                        const nM2Manual = this._toNumberMod(
                            it.cantidadM2 ||
                            it.Cantidad ||
                            it.cantidad ||
                            oManualItm.cantidadM2 ||
                            oManualItm.Cantidad ||
                            oManualItm.cantidad ||
                            oCantItm.cantidadM2 ||
                            oCantItm.Cantidad ||
                            oCantItm.cantidad
                        );

                        const sPal =
                            oManualItm.cantidadPallets ||
                            oManualItm.NroPaletas ||
                            oCantItm.cantidadPallets ||
                            oCantItm.NroPaletas ||
                            it.cantidadPallets ||
                            it.NroPaletas ||
                            "";

                        const sCaj =
                            oManualItm.cantidadCajas ||
                            oManualItm.NroCajas ||
                            oCantItm.cantidadCajas ||
                            oCantItm.NroCajas ||
                            it.cantidadCajas ||
                            it.NroCajas ||
                            "";

                        const sCalibre =
                            oManualItm.Calibre ||
                            oManualItm.calibre ||
                            oManualItm.Zzcalibre ||
                            oCantItm.Calibre ||
                            oCantItm.Zzcalibre ||
                            it.Zzcalibre ||
                            it.Calibre ||
                            "";

                        const sTono =
                            oManualItm.Tono ||
                            oManualItm.tono ||
                            oManualItm.Zztono ||
                            oCantItm.Tono ||
                            oCantItm.Zztono ||
                            it.Zztono ||
                            it.Tono ||
                            "";

                        const sCalidad =
                            oManualItm.Zzcalidad ||
                            oManualItm.calidad ||
                            oManualItm.TipBulto ||
                            oCantItm.Zzcalidad ||
                            oCantItm.calidad ||
                            oCantItm.TipBulto ||
                            it.Zzcalidad ||
                            it.calidad ||
                            it.TipBulto ||
                            "";

                        it.ItmNumber = sItm || it.ItmNumber;

                        if (nM2Manual > 0) {
                            it.cantidad = nM2Manual.toFixed(3);
                            it.Cantidad = nM2Manual.toFixed(3);
                            it.cantidadM2 = nM2Manual.toFixed(3);
                        }

                        it.TargetQu = "M2";
                        it.UMV = "M2";

                        it.cantidadPallets = sPal;
                        it.cantidadCajas = sCaj;
                        it.NroPaletas = sPal;
                        it.NroCajas = sCaj;

                        it.Zzcalibre = sCalibre;
                        it.Calibre = sCalibre;
                        it.Zztono = sTono;
                        it.Tono = sTono;
                        it.Zzcalidad = sCalidad;
                        it.calidad = sCalidad;
                        it.TipBulto = sCalidad;

                        it.__keepManualBultos = true;
                        it.__isNewManual = true;
                        it.AccionPosicion = "I";
                        it.TipoOperacion = "I";

                        return;
                    }
                    const bTieneEdicionManual =
                        it.__editManualBultosMod === true ||
                        it.__keepEditedBultosMod === true;

                    if (bTieneEdicionManual) {

                        it.cantidadPallets = it.cantidadPallets || it.NroPaletas || "";
                        it.cantidadCajas = it.cantidadCajas || it.NroCajas || "";
                        it.NroPaletas = it.NroPaletas || it.cantidadPallets || "";
                        it.NroCajas = it.NroCajas || it.cantidadCajas || "";

                        return;
                    }

                    if (!oBulto) {
                        return;
                    }

                    const sTipBulto = String(oBulto.TipBulto || "").trim();
                    const bEsCaja = sTipBulto === "S";

                    const nPalCalc = this._toNumberMod(
                        oBulto.CantidadPalletsCalc ||
                        oBulto.NroPaletasCalc ||
                        oBulto.CantidadPallets
                    );

                    const nCajCalc = this._toNumberMod(
                        oBulto.CantidadCajasCalc ||
                        oBulto.NroCajasCalc ||
                        oBulto.CantidadCajas
                    );

                    const nPal = bEsCaja ? 0 : nPalCalc;
                    const nCaj = bEsCaja ? nCajCalc : 0;

                    it.ItmNumber = sItm || it.ItmNumber;
                    it.cantidadPallets = fnFormatBulto(nPal);
                    it.cantidadCajas = fnFormatBulto(nCaj);
                    it.NroPaletas = fnFormatBulto(nPal);
                    it.NroCajas = fnFormatBulto(nCaj);
                    it.Zzcalidad = sTipBulto;
                    it.calidad = sTipBulto;
                    it.TipBulto = sTipBulto;
                }.bind(this));

                oModel.setProperty("/oMaterial", aMaterialTech);
                oModel.setProperty("/oCantidades", oCantidades);
                oModel.setProperty("/oCantidadesByItm", oCantidadesByItm);

                const bSnapshotInicializado =
                    oModel.getProperty("/bBultoOrderDetailsInicializado") === true;

                const bHayCambiosUsuario =
                    typeof this._hasUserChangesModCeramicos === "function" &&
                    this._hasUserChangesModCeramicos();

                if (!bSnapshotInicializado && !bHayCambiosUsuario) {
                    const aTechSnap = JSON.parse(JSON.stringify(aMaterialTech));
                    const aUISnap = JSON.parse(JSON.stringify(aEnriched));
                    const oCantSnap = JSON.parse(JSON.stringify(oCantidadesByItm));

                    oModel.setProperty("/oMaterialOriginalMod", aTechSnap);
                    oModel.setProperty("/oMaterialUIOriginalMod", aUISnap);
                    oModel.setProperty("/oCantidadesByItmOriginalMod", oCantSnap);

                    oModel.setProperty("/oMaterialOriginalModBase", aTechSnap);
                    oModel.setProperty("/oMaterialUIOriginalModBase", aUISnap);
                    oModel.setProperty("/oCantidadesByItmOriginalModBase", oCantSnap);

                    oModel.setProperty("/bBultoOrderDetailsInicializado", true);
                } else if (!bSnapshotInicializado && bHayCambiosUsuario) {
                    void 0;
                }

                return aEnriched;
            } catch (e) {
                void 0;
                return aUI;
            }
        },

        _buildPriceConditionsUrlMod: function (sSalesOrg) {
            const sOrg = String(sSalesOrg || "").trim().replace(/'/g, "''");
            const sFilter = "$filter=SalesOrganization eq '" + sOrg + "'";

            if (this.local) {
                const sPath =
                    "/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/PriceConditions" +
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

                const sUrl = that._buildPriceConditionsUrlMod(sOrg);

                Services.getoDataERPSync(that, sUrl, function (result) {
                    util.response.validateAjaxGetERPNotMessage(result, {
                        success: function (oData) {
                            oResp.sEstado = "S";
                            oResp.oResults = that._extractODataArrayMod(
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

        _extractODataArrayMod: function (vData) {
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

                if (["ZPRE", "ZRFN", "ZRFM"].includes(sCondType)) {
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

            const sClassification = String(this._getFirstNonEmptyValueMod(oRow, [
                "Classification",
                "classification",
                "CLASSIFICATION"
            ]) || "").trim().toUpperCase();

            const sDscPriceCondition = String(this._getFirstNonEmptyValueMod(oRow, [
                "DscPriceCondition",
                "DSCPRICECONDITION",
                "dscPriceCondition",
                "Description",
                "DESCRIPTION",
                "DscCondition",
                "Text"
            ]) || "").trim().toUpperCase();

            const sDscClassification = String(this._getFirstNonEmptyValueMod(oRow, [
                "DscClassification",
                "DSCCLASSIFICATION",
                "dscClassification",
                "Type",
                "TYPE"
            ]) || "").trim().toUpperCase();

            if (["ZPRE", "ZRFN", "ZRFM"].includes(sCondType)) {
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

            if (
                sDscPriceCondition.indexOf("DESCUENTO") >= 0 ||
                sDscPriceCondition.indexOf("DCTO") >= 0 ||
                sDscPriceCondition.indexOf("DSCTO") >= 0 ||
                sDscPriceCondition.indexOf("REDUCCION") >= 0 ||
                sDscPriceCondition.indexOf("REDUCCIÓN") >= 0 ||
                sDscClassification.indexOf("DESCUENTO") >= 0 ||
                sDscClassification.indexOf("DCTO") >= 0 ||
                sDscClassification.indexOf("DSCTO") >= 0
            ) {
                return true;
            }

            return false;
        },

        _getPriceConditionCondType: function (oRow) {
            return this._getFirstNonEmptyValueMod(oRow, [
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
                    return nAcc + Math.abs(this._getConditionAmountMod(oCond));
                }.bind(this), 0);
        },

        _isActiveDiscountCondition: function (oCond, mPriceConditionTypes) {
            const sCondType = String(oCond && oCond.CondType || "").trim().toUpperCase();

            if (!sCondType || !mPriceConditionTypes || !mPriceConditionTypes[sCondType]) {
                return false;
            }

            const sCondisacti = String(this._getFirstNonEmptyValueMod(oCond, [
                "CONDISACTI",
                "Condisacti",
                "CondIsActi",
                "CondInactive",
                "Inactive"
            ]) || "").trim().toUpperCase();

            return sCondisacti === "";
        },

        _getConditionAmountMod: function (oCond) {
            const vAmount = oCond && oCond.Condvalue !== undefined
                ? oCond.Condvalue
                : oCond && oCond.CondValue !== undefined
                    ? oCond.CondValue
                    : 0;

            return this._toNumberMod(vAmount);
        },

        _getFirstNonEmptyValueMod: function (oData, aKeys) {
            for (let i = 0; i < aKeys.length; i++) {
                const v = oData && oData[aKeys[i]];

                if (v !== undefined && v !== null && String(v).trim() !== "") {
                    return v;
                }
            }

            return "";
        },

        _getOrCreateOModelEntity: function () {
            const oView = this.getView();

            let oModelEntity =
                oView.getModel("oModelEntity") ||
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

                oView.setModel(oModelEntity, "oModelEntity");
            }

            return oModelEntity;
        },
        _getDocHeaderValue: function (oDocHeader) {
            const oRaw = (oDocHeader && oDocHeader._raw) || oDocHeader || {};
            const aKeys = Array.prototype.slice.call(arguments, 1);

            for (let i = 0; i < aKeys.length; i++) {
                const v = oRaw[aKeys[i]];
                if (v !== undefined && v !== null && String(v).trim() !== "") {
                    return String(v).trim();
                }
            }

            return "";
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
                return String(c.Conditionn || "").trim() === sCondPago;
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
        _aplicarRecomendacionesDestinoYAgencia: function (oDocHeader) {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel || !oDocHeader) {
                return;
            }

            const sDeliveryCondition = this._getDocHeaderValue(
                oDocHeader,
                "DELIVERYCONDITION",
                "DeliveryCondition",
                "ShipCond",
                "ShippingCondition"
            );

            const sAgency = this._getDocHeaderValue(oDocHeader, "AGENCY", "Agency");
            const sFinalDestination = this._getDocHeaderValue(oDocHeader, "FINALDESTINATION", "FinalDestination");
            const sShippingDestination = this._getDocHeaderValue(oDocHeader, "SHIPPINGDESTINATION", "ShippingDestination");
            const sCustomerGroup = this._getDocHeaderValue(oDocHeader, "CUSTOMERGROUP", "CustomerGroup");

            const aAgencias = oModel.getProperty("/oAgenciasCliente") || [];
            const aDestinos = oModel.getProperty("/oDestinosCliente") || [];
            const aFinalDestinos = oModel.getProperty("/oFinalDestinosCliente") || [];

            const fnFindByAny = function (arr, keys, value) {
                const sVal = String(value || "").trim();

                if (!sVal) {
                    return null;
                }

                return (arr || []).find(function (item) {
                    return keys.some(function (k) {
                        return String(item && item[k] || "").trim() === sVal;
                    });
                }) || null;
            };

            const fnClearAgency = function () {
                const sAgenciaActual = oModel.getProperty("/inputForm/direccionAgencia");
                const sAgenciaTextoActual = oModel.getProperty("/inputForm/direccionAgenciaText");

                if (!sAgenciaActual && !sAgenciaTextoActual) {
                    oModel.setProperty("/inputForm/direccionAgencia", "");
                    oModel.setProperty("/inputForm/direccionAgenciaText", "");
                    oModel.setProperty("/inputForm/direccionAgenciaAddrText", "");
                    oModel.setProperty("/inputForm/agenciaFullText", "");
                }
            };

            let sTipoEntrega = "";

            if (sDeliveryCondition === "02") {
                sTipoEntrega = "1"; // Cliente recoge
            } else if (sDeliveryCondition === "01") {
                if (sAgency) {
                    sTipoEntrega = "2"; // Despacho directo
                } else if (sCustomerGroup === "18") {
                    sTipoEntrega = "3"; // Despacho agencia
                } else {
                    sTipoEntrega = "2";
                }
            } else {
                sTipoEntrega = oModel.getProperty("/inputForm/tipoEntrega") || "";
            }

            oModel.setProperty("/inputForm/tipoEntrega", sTipoEntrega);

            if (sFinalDestination) {
                const oDestino =
                    fnFindByAny(
                        aFinalDestinos,
                        ["Id", "Customer", "Kunnr", "Partner", "Destination", "Destinationid", "Finaldestinationid"],
                        sFinalDestination
                    ) ||
                    fnFindByAny(
                        aDestinos,
                        ["Id", "Customer", "Kunnr", "Partner", "Destination", "Destinationid"],
                        sFinalDestination
                    );

                oModel.setProperty("/inputForm/destinoCeramico", sFinalDestination);
                oModel.setProperty(
                    "/inputForm/destinoCeramicoText",
                    oDestino
                        ? (oDestino.Text || oDestino.Destinationname || oDestino.Finaldestinationname || oDestino.Name || "")
                        : ""
                );
                oModel.setProperty(
                    "/inputForm/destinoCeramicoName",
                    oDestino
                        ? (oDestino.Name || oDestino.Destinationname || oDestino.Finaldestinationname || "")
                        : ""
                );
                oModel.setProperty(
                    "/inputForm/destinoCeramicoAddress",
                    oDestino
                        ? (oDestino.Text || oDestino.Destination || oDestino.Finaldestination || "")
                        : ""
                );
            } else {
                oModel.setProperty("/inputForm/destinoCeramico", "");
                oModel.setProperty("/inputForm/destinoCeramicoText", "");
                oModel.setProperty("/inputForm/destinoCeramicoName", "");
                oModel.setProperty("/inputForm/destinoCeramicoAddress", "");
            }

            if (sTipoEntrega === "1") {
                fnClearAgency();
                oModel.setProperty("/oAgenciasClienteFiltradas", aAgencias);
                this._updateResumenEntrega();
                oModel.refresh(true);
                return;
            }

            oModel.setProperty("/oAgenciasClienteFiltradas", aAgencias);

            let oAgencyMatch = null;

            if (sTipoEntrega === "2" && sAgency) {
                oAgencyMatch = aAgencias.find(function (a) {
                    return String(a.Customer || "").trim() === String(sAgency).trim();
                }) || null;
            }

            if (!oAgencyMatch && sTipoEntrega === "3" && sCustomerGroup === "18" && sShippingDestination) {
                oAgencyMatch = aAgencias.find(function (a) {
                    return String(a.Customer || "").trim() === String(sShippingDestination).trim();
                }) || null;
            }

            if (oAgencyMatch) {
                oModel.setProperty("/inputForm/direccionAgencia", oAgencyMatch.Customer || "");
                oModel.setProperty("/inputForm/direccionAgenciaText", oAgencyMatch.Agencyname || "");
                oModel.setProperty("/inputForm/direccionAgenciaAddrText", oAgencyMatch.Agencyaddress || "");
                oModel.setProperty(
                    "/inputForm/agenciaFullText",
                    [oAgencyMatch.Agencyaddress, oAgencyMatch.Agencyname].filter(Boolean).join(" - ")
                );
            } else {
                fnClearAgency();
            }

            this._updateResumenEntrega();
            oModel.refresh(true);
        },

        _capturarEntregaInicialModCeramicos: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const oCapturaActual = oModel.getProperty("/oEntregaInicialMod") || {};

            if (oCapturaActual._capturado === true) {
                return;
            }

            const sTipoEntrega = String(
                oModel.getProperty("/inputForm/tipoEntrega") || ""
            ).trim();

            const sDestinoInicial = String(
                oModel.getProperty("/inputForm/destinoCeramico") || ""
            ).trim();

            const sAgenciaInicial = String(
                oModel.getProperty("/inputForm/direccionAgencia") || ""
            ).trim();

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

                    const oTech = {
                        ItmNumber: String(oItem.ItmNumber || "").padStart(6, "0"),
                        Material: String(oItem.Material || "").trim(),
                        Plant: String(oItem.Plant || "1001").trim(),

                        TargetQu: "M2",

                        Zzcalidad: String(
                            oItem.Zzcalidad ||
                            oItem.calidad ||
                            oItem.TipBulto ||
                            ""
                        ).trim(),

                        Zzcalibre: String(
                            oItem.Zzcalibre ||
                            oItem.Calibre ||
                            oItem.calibre ||
                            ""
                        ).trim(),

                        Zztono: String(
                            oItem.Zztono ||
                            oItem.Tono ||
                            oItem.tono ||
                            ""
                        ).trim()
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

        _buildHeaderToPartnersSimCeramicos: function (oData) {
            const oCabeceraMod = oData.docModificarCabecera || {};
            const oInputForm = oData.inputForm || {};
            const oDatClient = oData.oDatClient || {};

            const sClientId = String(
                oDatClient.Customer ||
                oCabeceraMod.Customer ||
                oCabeceraMod.SoldToParty ||
                oCabeceraMod.ClientId ||
                oInputForm.cliente ||
                oInputForm.Customer ||
                ""
            ).trim();

            const sTipoEntrega = String(oInputForm.tipoEntrega || "").trim();

            const sDestino = String(oData.inputForm?.destinoCeramico || "").trim();
            const sAgencia = String(oData.inputForm?.direccionAgencia || "").trim();

            let sWE = "";

            if (sTipoEntrega === "1") {
                // Cliente recoge: WE = Z0 = destino
                sWE = sDestino;
            } else if (sTipoEntrega === "2") {
                // Despacho directo: WE = Z0 = destino
                sWE = sDestino;
            } else if (sTipoEntrega === "3") {
                // Despacho agencia: WE = agencia, Z0 = destino
                sWE = sAgencia;
            } else {
                sWE = sDestino;
            }

            const aPartners = [
                {
                    ClientId: sClientId,
                    PartnRole: "AG",
                    PartnNumber: sClientId
                },
                {
                    ClientId: sClientId,
                    PartnRole: "WE",
                    PartnNumber: sWE
                }
            ];

            // Z0 debe ir con el destino final cuando exista.
            if (sDestino) {
                aPartners.push({
                    ClientId: sClientId,
                    PartnRole: "Z0",
                    PartnNumber: sDestino,
                    ItmNumber: "000000"
                });
            }

            return aPartners.filter(function (p) {
                return p.ClientId && p.PartnRole && p.PartnNumber;
            });
        },

        _getPoSupplemSimCeramicos: function () {
            const oModelUser = this.getView().getModel("oModelUser");

            const bIsCliente =
                !!oModelUser?.getProperty("/bIsCliente") ||
                oModelUser?.getProperty("/customAttribute") === "customAttribute1" ||
                oModelUser?.getProperty("/bRol") === "CLIENTES";

            const bIsCoord = !!oModelUser?.getProperty("/bIsCoord");
            const bIsVendedor = !!oModelUser?.getProperty("/bIsVendedor");

            if (bIsCliente) {
                return "CLTE";
            }

            if (bIsCoord) {
                return "SUPE";
            }

            if (bIsVendedor) {
                return "VEND";
            }

            return "";
        },
        _restoreManualBultosInReporteMod: function (aReporte) {
            const oModel = this.getView().getModel("oModelProyect");
            const oManualBultosByItm = oModel.getProperty("/oManualBultosByItm") || {};

            const normItm = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };

            const hasValue = function (v) {
                return v !== undefined && v !== null && String(v).trim() !== "";
            };

            return (aReporte || []).map(function (row) {
                const sItm = normItm(
                    row.ItmNumber ||
                    row.OriginalItmNumber ||
                    row.Posicion ||
                    row.Pos ||
                    ""
                );

                const oManualMap = oManualBultosByItm[sItm] || {};

                const bEsManual =
                    row.__isNewManual === true ||
                    row.__keepManualBultos === true ||
                    row.AccionPosicion === "I" ||
                    row.TipoOperacion === "I" ||
                    oManualMap.__isNewManual === true ||
                    oManualMap.__keepManualBultos === true ||
                    oManualMap.AccionPosicion === "I" ||
                    oManualMap.TipoOperacion === "I" ||
                    hasValue(row.ManualCantidadPallets) ||
                    hasValue(row.ManualCantidadCajas) ||
                    hasValue(oManualMap.ManualCantidadPallets) ||
                    hasValue(oManualMap.ManualCantidadCajas);

                if (!bEsManual) {
                    return row;
                }

                const sPal = String(
                    oManualMap.cantidadPallets ||
                    oManualMap.NroPaletas ||
                    oManualMap.cantidadPalletsManual ||
                    oManualMap.ManualCantidadPallets ||
                    row.cantidadPallets ||
                    row.NroPaletas ||
                    row.cantidadPalletsManual ||
                    row.ManualCantidadPallets ||
                    ""
                ).trim();

                const sCaj = String(
                    oManualMap.cantidadCajas ||
                    oManualMap.NroCajas ||
                    oManualMap.cantidadCajasManual ||
                    oManualMap.ManualCantidadCajas ||
                    row.cantidadCajas ||
                    row.NroCajas ||
                    row.cantidadCajasManual ||
                    row.ManualCantidadCajas ||
                    ""
                ).trim();

                const sCalibre = String(
                    oManualMap.ManualCalibre ||
                    oManualMap.calibreManual ||
                    oManualMap.Calibre ||
                    oManualMap.calibre ||
                    oManualMap.Zzcalibre ||
                    row.ManualCalibre ||
                    row.calibreManual ||
                    row.Calibre ||
                    row.calibre ||
                    row.Zzcalibre ||
                    ""
                ).trim();

                const sTono = String(
                    oManualMap.ManualTono ||
                    oManualMap.tonoManual ||
                    oManualMap.Tono ||
                    oManualMap.tono ||
                    oManualMap.Zztono ||
                    row.ManualTono ||
                    row.tonoManual ||
                    row.Tono ||
                    row.tono ||
                    row.Zztono ||
                    ""
                ).trim();

                const sCalidad = String(
                    oManualMap.ManualCalidad ||
                    oManualMap.calidadManual ||
                    oManualMap.Zzcalidad ||
                    oManualMap.calidad ||
                    oManualMap.TipBulto ||
                    row.ManualCalidad ||
                    row.calidadManual ||
                    row.Zzcalidad ||
                    row.calidad ||
                    row.TipBulto ||
                    ""
                ).trim();

                return Object.assign({}, row, {
                    ItmNumber: sItm,
                    Posicion: row.Posicion || sItm,

                    UMV: "M2",
                    TargetQu: "M2",

                    cantidadPallets: sPal,
                    cantidadCajas: sCaj,
                    NroPaletas: sPal,
                    NroCajas: sCaj,

                    Calibre: sCalibre,
                    calibre: sCalibre,
                    Zzcalibre: sCalibre,

                    Tono: sTono,
                    tono: sTono,
                    Zztono: sTono,

                    calidad: sCalidad,
                    Zzcalidad: sCalidad,
                    TipBulto: sCalidad,

                    ManualCantidadPallets: sPal,
                    ManualCantidadCajas: sCaj,
                    ManualCalibre: sCalibre,
                    ManualTono: sTono,
                    ManualCalidad: sCalidad,

                    cantidadPalletsManual: sPal,
                    cantidadCajasManual: sCaj,
                    calibreManual: sCalibre,
                    tonoManual: sTono,
                    calidadManual: sCalidad,

                    __isNewManual: true,
                    __keepManualBultos: true,
                    AccionPosicion: "I",
                    TipoOperacion: "I"
                });
            });
        },
        _isNuevaManualPedidoMod: function (oItem) {
            oItem = oItem || {};

            const sTipo = String(
                oItem.TipoOperacion ||
                oItem.AccionPosicion ||
                ""
            ).trim();

            return (
                sTipo === "I" ||
                oItem.__isNewManual === true ||
                oItem.__keepManualBultos === true
            );
        },
        _isOriginalPedidoMod: function (oItem) {
            const oModel = this.getView().getModel("oModelProyect");
            const aOriginal = oModel.getProperty("/oMaterialOriginalMod") || [];

            const normItm = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };

            const sTipo = String(
                oItem.TipoOperacion ||
                oItem.AccionPosicion ||
                ""
            ).trim();

            if (
                sTipo === "I" ||
                oItem.__isNewManual === true ||
                oItem.__keepManualBultos === true
            ) {
                return false;
            }

            const sItm = normItm(
                oItem.OriginalItmNumber ||
                oItem.ItmNumber ||
                oItem.Posicion ||
                ""
            );

            return aOriginal.some(function (orig) {
                return normItm(orig.ItmNumber || orig.OriginalItmNumber || "") === sItm;
            });
        },

        _getOriginalBultosEditMod: function (oItem) {
            const oModel = this.getView().getModel("oModelProyect");

            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const normItm = function (v) {
                const s = String(v || "").trim();
                const n = parseInt(s, 10);
                return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
            };

            const sItm = normItm(
                oItem.OriginalItmNumber ||
                oItem.ItmNumber ||
                oItem.Posicion ||
                ""
            );

            const oOriginalByItm = oModel.getProperty("/oCantidadesByItmOriginalMod") || {};
            const aOriginalUI = oModel.getProperty("/oMaterialUIOriginalMod") || [];

            const oCantOrig = oOriginalByItm[sItm] || {};
            const oUIOrig = aOriginalUI.find(function (x) {
                return normItm(x.ItmNumber || x.OriginalItmNumber || x.Posicion || "") === sItm;
            }) || {};

            return {
                pallets: toNum(
                    oCantOrig.cantidadPallets ||
                    oCantOrig.NroPaletas ||
                    oUIOrig.cantidadPallets ||
                    oUIOrig.NroPaletas ||
                    oItem.cantidadPalletsBaseEdit ||
                    oItem.cantidadPallets
                ),
                cajas: toNum(
                    oCantOrig.cantidadCajas ||
                    oCantOrig.NroCajas ||
                    oUIOrig.cantidadCajas ||
                    oUIOrig.NroCajas ||
                    oItem.cantidadCajasBaseEdit ||
                    oItem.cantidadCajas
                ),
                m2: toNum(
                    oCantOrig.cantidadM2 ||
                    oCantOrig.Cantidad ||
                    oCantOrig.cantidad ||
                    oUIOrig.cantidadM2 ||
                    oUIOrig.Cantidad ||
                    oUIOrig.cantidad ||
                    oItem.cantidadM2BaseEdit ||
                    oItem.cantidadM2 ||
                    oItem.cantidad
                )
            };
        },

        _getMaxEditableBultosMod: function (oItem, nStockPal, nStockCaj) {
            const toNum = function (v) {
                if (v === null || v === undefined || v === "") return 0;
                if (typeof v === "string") v = v.replace(",", ".");
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const bOriginal = this._isOriginalPedidoMod(oItem);
            const oOrig = bOriginal
                ? this._getOriginalBultosEditMod(oItem)
                : {
                    pallets: 0,
                    cajas: 0,
                    m2: 0
                };

            const nPalStockDisponible = toNum(nStockPal);
            const nCajStockDisponible = toNum(nStockCaj);
            return {
                esOriginal: bOriginal,

                originalPallets: toNum(oOrig.pallets),
                originalCajas: toNum(oOrig.cajas),
                originalM2: toNum(oOrig.m2),

                limitePallets: Math.max(0, nPalStockDisponible),
                limiteCajas: Math.max(0, nCajStockDisponible)
            };
        },
        _normItmMod: function (v) {
            const s = String(v || "").trim();
            if (!s) {
                return "";
            }

            const n = parseInt(s, 10);
            return isNaN(n) ? s.padStart(6, "0") : String(n).padStart(6, "0");
        },

        _hasUserChangesModCeramicos: function () {
            const oModel = this.getView().getModel("oModelProyect");
            if (!oModel) {
                return false;
            }

            const aDeleted = oModel.getProperty("/oMaterialDeletedMod") || [];
            if (aDeleted.length > 0) {
                return true;
            }

            const fnHasChange = function (r) {
                if (!r) {
                    return false;
                }

                const sTipo = String(
                    r.TipoOperacion ||
                    r.AccionPosicion ||
                    ""
                ).trim();

                return (
                    sTipo === "I" ||
                    sTipo === "U" ||
                    sTipo === "D" ||
                    r.Deleted === true ||
                    r.__isNewManual === true ||
                    r.__keepManualBultos === true ||
                    r.__editManualBultosMod === true ||
                    r.__keepEditedBultosMod === true
                );
            };

            const aTech = oModel.getProperty("/oMaterial") || [];
            const aUI = oModel.getProperty("/oMaterialUI") || [];

            return aTech.some(fnHasChange) || aUI.some(fnHasChange);
        },
        _syncStockRestanteEditDialog: function () {
            const oModel = this.getView().getModel("oModelProyect");

            if (!oModel) {
                return;
            }

            const oEdit = oModel.getProperty("/oSelecTableDetalle") || {};

            const toNum = function (v) {
                if (v === null || v === undefined || v === "") {
                    return 0;
                }

                if (typeof v === "string") {
                    v = v.replace(",", ".");
                }

                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const nLimitePal = toNum(
                oEdit.limitePalletsMax ||
                oEdit.stockPalletsMax ||
                oEdit.stockPalletsTotal
            );

            const nLimiteCaj = toNum(
                oEdit.limiteCajasMax ||
                oEdit.stockCajasMax ||
                oEdit.stockCajasTotal
            );

            const nQtyPalActual = toNum(oEdit.cantidadPallets);
            const nQtyCajActual = toNum(oEdit.cantidadCajas);

            const nQtyPalBase = toNum(
                oEdit.cantidadPalletsBaseEdit ||
                oEdit.cantidadPalletsOriginalMod ||
                oEdit.cantidadPallets
            );

            const nQtyCajBase = toNum(
                oEdit.cantidadCajasBaseEdit ||
                oEdit.cantidadCajasOriginalMod ||
                oEdit.cantidadCajas
            );

            const nStockPalBaseView = toNum(
                oEdit.stockPalletsViewBaseEdit !== undefined
                    ? oEdit.stockPalletsViewBaseEdit
                    : oEdit.stockPalletsDisponibleView
            );

            const nStockCajBaseView = toNum(
                oEdit.stockCajasViewBaseEdit !== undefined
                    ? oEdit.stockCajasViewBaseEdit
                    : oEdit.stockCajasDisponibleView
            );

            const bIsPAL = oEdit.isPAL === true || String(oEdit.UMV || "").trim() === "PAL";
            const bIsCJ = oEdit.isCJ === true || String(oEdit.UMV || "").trim() === "CJ";

            /*
                Regla:
                - Al abrir el popup guardamos el stock mostrado.
                - Si el usuario baja la cantidad, ese stock aumenta.
                - Si el usuario sube la cantidad, ese stock disminuye.
            */
            const nStockPalView = bIsPAL
                ? Math.max(0, nStockPalBaseView + nQtyPalBase - nQtyPalActual)
                : nStockPalBaseView;

            const nStockCajView = bIsCJ
                ? Math.max(0, nStockCajBaseView + nQtyCajBase - nQtyCajActual)
                : nStockCajBaseView;

            const nRestPal = Math.max(0, nLimitePal - nQtyPalActual);
            const nRestCaj = Math.max(0, nLimiteCaj - nQtyCajActual);

            oModel.setProperty("/oSelecTableDetalle/stockPalletsDisponibleView", nStockPalView.toFixed(2));
            oModel.setProperty("/oSelecTableDetalle/stockCajasDisponibleView", nStockCajView.toFixed(2));

            oModel.setProperty("/oSelecTableDetalle/stockPalletsRest", nRestPal);
            oModel.setProperty("/oSelecTableDetalle/stockCajasRest", nRestCaj);

            oModel.setProperty("/oSelecTableDetalle/limitePalletsRest", nRestPal);
            oModel.setProperty("/oSelecTableDetalle/limiteCajasRest", nRestCaj);
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
