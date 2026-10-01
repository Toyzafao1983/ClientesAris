sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/aris/registropedido/textiles/pe/model/models",
    "com/aris/registropedido/textiles/pe/services/CustomerQueryCache"
], (UIComponent, models, CustomerQueryCache) => {
    "use strict";

    return UIComponent.extend("com.aris.registropedido.textiles.pe.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "oModelDevice");

            this._customerQueryCache = new CustomerQueryCache();

            // enable routing
            this.getRouter().initialize();

            this._initFlpBackNavigation();
        },

        getCustomerQuery(sUrl, fnLoad) {
            return this._customerQueryCache.read(sUrl, fnLoad);
        },

        getCustomerCatalog(sUrl, sCatalogUrl, sCustomer, fnLoadPage) {
            return this._customerQueryCache.readCatalog(sUrl, sCatalogUrl, sCustomer, fnLoadPage);
        },

        getOrderQueryDate() {
            if (!this._orderQueryDate) this._orderQueryDate = new Date();
            return new Date(this._orderQueryDate.getTime());
        },

        clearCustomerQueries() {
            this._customerQueryCache.clear();
            this._orderQueryDate = null;
        },

        destroy() {
            this.clearCustomerQueries();
            UIComponent.prototype.destroy.apply(this, arguments);
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
