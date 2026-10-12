sap.ui.define([], function () {
    "use strict";
    const copy = value => JSON.parse(JSON.stringify(value));
    function StockQueryCache() {
        this.entries = new Map();
    }
    StockQueryCache.prototype.clear = function () {
        this.entries.clear();
    };
    StockQueryCache.prototype.read = function (url, load, callback) {
        const parsed = new URL(url, "https://stock.invalid");
        // Quantities and permissions always go to SAP. Only catalogs are shared.
        if (!/\/(MaterialsConsultation|MarMat|MatGroup)$/.test(parsed.pathname)) return load(callback);
        const top = parsed.searchParams.get("$top");
        if (top && Number(top) > 200) parsed.searchParams.delete("$top");
        parsed.searchParams.sort();
        const key = parsed.origin + parsed.pathname + "?" + parsed.searchParams.toString();
        let entry = this.entries.get(key);
        if (entry) {
            if (entry.result) return callback(copy(entry.result));
            entry.callbacks.push(callback);
            return;
        }
        entry = { callbacks: [callback] };
        this.entries.set(key, entry);
        load(result => {
            if (result && result.iCode === 1 && !result.next) entry.result = copy(result);
            else if (this.entries.get(key) === entry) this.entries.delete(key);
            const callbacks = entry.callbacks;
            entry.callbacks = [];
            callbacks.forEach(done => done(copy(result)));
        });
    };
    return StockQueryCache;
});
