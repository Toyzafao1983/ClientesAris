sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/aris/consultaestadocuenta/pe/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.aris.consultaestadocuenta.pe.Component", {
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
