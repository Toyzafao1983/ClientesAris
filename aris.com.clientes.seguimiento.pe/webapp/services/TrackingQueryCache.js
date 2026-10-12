sap.ui.define([], function () {
    "use strict";
    const copy = value => JSON.parse(JSON.stringify(value));
    function describe(url) {
        const parsed = new URL(url, "https://tracking.invalid");
        parsed.searchParams.delete("$top");
        parsed.searchParams.sort();
        return { key: parsed.pathname + "?" + parsed.searchParams.toString(), path: parsed.pathname,
            query: parsed.searchParams, filter: parsed.searchParams.get("$filter") || "" };
    }
    function TrackingQueryCache() {
        this.entries = new Map();
        this.identities = new Map();
    }
    TrackingQueryCache.prototype.clear = function () {
        this.entries.clear();
        this.identities.clear();
    };
    TrackingQueryCache.prototype.refreshData = function () {
        // Catalogs/identity remain available; operational states are renewed.
        for (const [key, entry] of this.entries) {
            if (!/\/(Customer|DataCustomer|UsOrve|Vendor)$/.test(entry.description.path)) this.entries.delete(key);
        }
    };
    TrackingQueryCache.prototype.readIdentity = function (url, load) {
        let entry = this.identities.get(url);
        if (!entry) {
            entry = Promise.resolve().then(load).then(result => {
                if (!result || result.sEstado !== "S") {
                    if (this.identities.get(url) === entry) this.identities.delete(url);
                }
                return result;
            }, error => {
                if (this.identities.get(url) === entry) this.identities.delete(url);
                throw error;
            });
            this.identities.set(url, entry);
        }
        return entry.then(copy);
    };
    TrackingQueryCache.prototype.read = function (url, salesOrg, load, callback) {
        const description = describe(url);
        // Explicit small limits serve suggestions/single-record lookups.
        const top = new URL(url, "https://tracking.invalid").searchParams.get("$top");
        if (top && Number(top) <= 200) return load(callback);
        let entry = this.entries.get(description.key);
        if (entry) {
            if (entry.result) return callback(copy(entry.result));
            entry.callbacks.push(callback);
            return;
        }
        // Only reuse complete, unprojected organization catalogs for document reads.
        const doc = description.filter.match(/^(?:SalesOrganization eq '([^']+)' and )?SalesDocument eq '([^']+)'$/);
        if (doc && /\/(OrderTracking|DocumentFlow2)$/.test(description.path) &&
            !description.query.has("$select") && !description.query.has("$expand") &&
            !description.query.has("$orderby")) {
            const org = doc[1] || salesOrg;
            for (const candidate of this.entries.values()) {
                const d = candidate.description;
                if (org && candidate.result && d.path === description.path &&
                    d.filter === "SalesOrganization eq '" + org + "'" &&
                    d.query.get("sap-language") === description.query.get("sap-language") &&
                    !d.query.has("$select") && !d.query.has("$expand") &&
                    Array.isArray(candidate.result.data)) {
                    const rows = candidate.result.data.filter(row => row.SalesDocument === doc[2]);
                    // A missing document may belong to another scope; use SAP as fallback.
                    if (rows.length) return callback(copy(Object.assign({}, candidate.result, { u: url, data: rows })));
                }
            }
        }
        entry = { description: description, callbacks: [callback] };
        this.entries.set(description.key, entry);
        load(result => {
            if (result && result.iCode === 1 && !result.next) entry.result = copy(result);
            else if (this.entries.get(description.key) === entry) this.entries.delete(description.key);
            const callbacks = entry.callbacks;
            entry.callbacks = [];
            callbacks.forEach(fn => fn(copy(result)));
        });
    };
    return TrackingQueryCache;
});
