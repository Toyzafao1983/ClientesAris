sap.ui.define([], function () {
    "use strict";

    // One cache per Component; never persisted or shared between applications.
    function CustomerQueryCache() {
        this._entries = new Map();
    }

    CustomerQueryCache.prototype.read = function (sUrl, fnLoad) {
        let entry = this._entries.get(sUrl);
        if (!entry) {
            entry = {};
            entry.promise = Promise.resolve().then(fnLoad).then(result => {
                if ((!result || result.sEstado !== "S") && this._entries.get(sUrl) === entry) {
                    this._entries.delete(sUrl);
                }
                return result;
            }, error => {
                if (this._entries.get(sUrl) === entry) this._entries.delete(sUrl);
                throw error;
            });
            this._entries.set(sUrl, entry);
        }
        // Controllers enrich and filter rows: each consumer receives its own copy.
        return entry.promise.then(result => JSON.parse(JSON.stringify(result)));
    };

    CustomerQueryCache.prototype.readCatalog = function (sUrl, sCatalogUrl, sCustomer, fnLoad) {
        const catalog = this._entries.get(sCatalogUrl);
        if (sCustomer && catalog) {
            // Wait for the initial request before deciding whether local filtering is safe.
            return catalog.promise.then(result => {
                if (result && result.sEstado === "S" && result.complete === true) {
                    return {
                        sEstado: "S",
                        oResults: JSON.parse(JSON.stringify(result.oResults.filter(row =>
                            String(row.Customer) === String(sCustomer))))
                    };
                }
                return this.read(sUrl, () => this._loadCatalogBlock(sUrl, fnLoad));
            }, () => this.read(sUrl, () => this._loadCatalogBlock(sUrl, fnLoad)));
        }
        // Direct entry to the form/detail only loads the requested customer.
        return this.read(sUrl, () => this._loadCatalogBlock(sUrl, fnLoad));
    };

    CustomerQueryCache.prototype._loadCatalogBlock = async function (sUrl, fnLoad) {
        const rows = [];
        const visited = new Set();
        let pageUrl = sUrl;
        while (pageUrl) {
            if (visited.has(pageUrl)) return { sEstado: "E", oResults: [] };
            visited.add(pageUrl);
            const result = await fnLoad(pageUrl);
            if (!result || result.sEstado !== "S" || !Array.isArray(result.oResults)) {
                return { sEstado: "E", oResults: [] };
            }
            result.oResults.forEach(row => rows.push(row));
            if (!result.next) break;
            // SAP may return its internal absolute URL. Keep the application's
            // original destination/proxy path and use SAP's continuation query.
            const next = String(result.next);
            const queryIndex = next.indexOf("?");
            if (queryIndex < 0) return { sEstado: "E", oResults: [] };
            pageUrl = sUrl.split("?")[0] + next.slice(queryIndex);
        }
        return { sEstado: "S", oResults: rows, complete: true };
    };

    CustomerQueryCache.prototype.clear = function () {
        this._entries.clear();
    };

    return CustomerQueryCache;
});
