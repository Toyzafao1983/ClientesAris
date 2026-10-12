sap.ui.define([], function () {
    "use strict";
    const copy = value => JSON.parse(JSON.stringify(value));
    function AccountQueryCache() {
        this.entries = new Map();
        this.identities = new Map();
    }
    AccountQueryCache.prototype.clear = function () {
        this.entries.clear();
        this.identities.clear();
    };
    AccountQueryCache.prototype.read = function (url, load, callback) {
        const parsed = new URL(url, "https://account.invalid");
        // Only client catalogs and seller assignments are shared here. Financial reads stay fresh.
        if (!/\/(Customer|DataCustomer|UsOrve)$/.test(parsed.pathname)) return load(callback);
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
        // A customer-specific read may reuse an identical complete catalog filter.
        const filter = parsed.searchParams.get("$filter") || "";
        const customer = filter.match(/ and Customer eq '([^']+)'$/);
        if (customer && /\/(Customer|DataCustomer)$/.test(parsed.pathname)) {
            const catalog = new URL(parsed.toString());
            catalog.searchParams.set("$filter", filter.slice(0, customer.index));
            catalog.searchParams.sort();
            const catalogKey = catalog.origin + catalog.pathname + "?" + catalog.searchParams.toString();
            const existing = this.entries.get(catalogKey);
            if (existing && existing.result && Array.isArray(existing.result.data)) {
                const rows = existing.result.data.filter(row => row.Customer === customer[1]);
                if (rows.length) return callback(copy(Object.assign({}, existing.result, { u: url, data: rows })));
            }
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
    AccountQueryCache.prototype.readIdentity = function (url, load) {
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
    return AccountQueryCache;
});
