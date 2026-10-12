sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/aris/consultaestadocuenta/pe/model/models",
    "com/aris/consultaestadocuenta/pe/services/AccountQueryCache"
], (UIComponent, models, AccountQueryCache) => {
    "use strict";

    return UIComponent.extend("com.aris.consultaestadocuenta.pe.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        _getAccountCache() {
            if (!this._accountCache) this._accountCache = new AccountQueryCache();
            return this._accountCache;
        },
        ensureAccountOrganization(unit) {
            if (this._accountUnit !== unit) {
                this._getAccountCache().clear();
                this._accountDetail = null;
                this._accountUnit = unit;
            }
        },
        getAccountQuery(url, load, callback) {
            return this._getAccountCache().read(url, load, callback);
        },
        getCustomerQuery(url, load) {
            return this._getAccountCache().readIdentity(url, load);
        },
        setAccountDetail(customer, unit, date, values) {
            this._accountDetail = { customer, unit, date, values: JSON.parse(JSON.stringify(values)) };
        },
        takeAccountDetail(customer, unit, date) {
            const detail = this._accountDetail;
            this._accountDetail = null;
            return detail && detail.customer === customer && detail.unit === unit && detail.date === date
                ? JSON.parse(JSON.stringify(detail.values)) : null;
        },
        clearAccountDetail() {
            this._accountDetail = null;
        },
        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "oModelDevice");

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
