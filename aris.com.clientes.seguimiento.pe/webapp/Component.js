sap.ui.define([
    "sap/ui/core/UIComponent",
    "aris/com/clientes/seguimiento/pe/model/models",
    "aris/com/clientes/seguimiento/pe/services/TrackingQueryCache"
], (UIComponent, models, TrackingQueryCache) => {
    "use strict";

    return UIComponent.extend("aris.com.clientes.seguimiento.pe.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        _getTrackingCache() {
            if (!this._trackingCache) this._trackingCache = new TrackingQueryCache();
            return this._trackingCache;
        },
        getTrackingQuery(url, salesOrg, load, callback) {
            if (this._trackingEditing) return load(callback);
            return this._getTrackingCache().read(url, salesOrg, load, callback);
        },
        getCustomerQuery(url, load) {
            if (this._trackingEditing) return load();
            return this._getTrackingCache().readIdentity(url, load);
        },
        refreshTrackingData() {
            this._getTrackingCache().refreshData();
        },
        ensureTrackingOrganization(salesOrg) {
            if (this._trackingOrganization !== salesOrg) {
                this._getTrackingCache().clear();
                this._trackingOrganization = salesOrg;
            }
        },
        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().attachBeforeRouteMatched(event => {
                const name = event.getParameter("name");
                const editing = name !== "View" && name !== "Detail";
                if (editing || this._trackingEditing) this._getTrackingCache().clear();
                this._trackingEditing = editing;
            });
            this.getRouter().initialize();
        }
    });
});