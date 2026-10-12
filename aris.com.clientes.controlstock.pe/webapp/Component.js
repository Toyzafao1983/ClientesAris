sap.ui.define([
    "sap/ui/core/UIComponent",
    "aris/com/clientes/controlstock/pe/model/models",
    "aris/com/clientes/controlstock/pe/services/StockQueryCache"
], (UIComponent, models, StockQueryCache) => {
    "use strict";

    return UIComponent.extend("aris.com.clientes.controlstock.pe.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        _getStockQueryCache() {
            if (!this._stockQueryCache) this._stockQueryCache = new StockQueryCache();
            return this._stockQueryCache;
        },
        ensureStockOrganization(salesOrg) {
            if (this._stockOrganization !== salesOrg) {
                this._getStockQueryCache().clear();
                this._stockOrganization = salesOrg;
            }
        },
        getStockQuery(url, salesOrg, load, callback) {
            this.ensureStockOrganization(salesOrg);
            return this._getStockQueryCache().read(url, load, callback);
        },
        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

            this._initFlpBackNavigation();
        },

        _initFlpBackNavigation() {
            if (!sap.ushell?.Container) return;

            this.getService("ShellUIService").then((oShellUI) => {
                oShellUI.setBackNavigation(() => {
                    const oRootView = this.getRootControl();
                    const oApp = oRootView && oRootView.byId("app");
                    const oPage = oApp && oApp.getCurrentPage();
                    const oController = oPage && oPage.getController();

                    if (oController && typeof oController._onFlpBackNavigation === "function") {
                        oController._onFlpBackNavigation();
                        return;
                    }

                    sap.ushell.Container.getServiceAsync("CrossApplicationNavigation")
                        .then((oCrossAppNav) => oCrossAppNav.toExternal({
                            target: { shellHash: "#" }
                        }));
                });
            }).catch(() => undefined);
        }
    });
});
