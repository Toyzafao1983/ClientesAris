const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let BaseController;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controller/BaseController.js'), 'utf8'), {
    window: { location: { href: 'launchpad' } },
    sap: { ui: { define: (deps, factory) => {
        const args = deps.map(dep => dep === 'sap/ui/core/mvc/Controller'
            ? { extend: (_, methods) => { BaseController = methods; return methods; } } : {});
        factory(...args);
    } } }
});
const install = BaseController._optimizeComboListRendering.bind(BaseController);

// Model the flat-list position/count behavior in SAPUI5 1.152.0 ListBase.
function list(items) {
    return {
        items, scans: 0, visits: 0, grouped: false,
        onBeforeRendering() { this._bRendering = true; },
        onAfterRendering() { this._bRendering = false; },
        getVisibleItems() {
            this.scans++;
            return this.items.filter(item => { this.visits++; return item.visible; });
        },
        getSize() { return this.getVisibleItems().length; },
        _hasNestedGrouping() { return this.grouped; },
        getSkipGroupHeaderFocus() { return false; },
        getAccessbilityPosition(item) {
            return { setsize: this.getSize(), posinset: item ? this.getVisibleItems().indexOf(item) + 1 : undefined };
        }
    };
}
function position(l, item) { return JSON.parse(JSON.stringify(l.getAccessbilityPosition(item))); }
const items = Array.from({ length: 10000 }, (_, i) => ({ key: 'carrier-' + i, visible: i % 3 !== 0 }));
const native = list(items);
const optimized = list(items);
install(optimized);
const before = optimized.onBeforeRendering;
install(optimized);
assert.equal(optimized.onBeforeRendering, before, 'installation must be idempotent');
optimized.onBeforeRendering();
items.forEach(item => assert.deepEqual(position(optimized, item), position(native, item)));
assert.deepEqual(position(optimized, undefined), position(native, undefined));
assert.deepEqual(position(optimized, {}), position(native, {}));
assert.equal(optimized.scans, 1, 'one visible-list scan for the entire render');
assert.equal(optimized.visits, items.length);
assert.equal(optimized.getVisibleItems().length, native.getVisibleItems().length);
optimized.onAfterRendering();

// Filtering, replacement and keys near the end of the full catalog stay live.
items[9999].visible = true;
assert.deepEqual(position(optimized, items[9999]), position(native, items[9999]));
const replacement = [{ key: 'agency-other-carrier', visible: true }];
optimized.items = replacement;
optimized.onBeforeRendering();
assert.deepEqual(position(optimized, replacement[0]), { setsize: 1, posinset: 1 });
assert.deepEqual(position(optimized, items[1]), { setsize: 1, posinset: 0 });
optimized.onAfterRendering();
optimized.items = [];
optimized.onBeforeRendering();
assert.deepEqual(position(optimized, undefined), { setsize: 0 });
optimized.onAfterRendering();

const grouped = list(items);
let nativeGroupedCalls = 0;
grouped.grouped = true;
grouped.getAccessbilityPosition = () => { nativeGroupedCalls++; return { setsize: 7, posinset: 2 }; };
install(grouped);
grouped.onBeforeRendering();
assert.deepEqual(position(grouped, items[1]), { setsize: 7, posinset: 2 });
assert.equal(nativeGroupedCalls, 1);
grouped.onAfterRendering();

const failing = list(items);
failing.onAfterRendering = function () { this._bRendering = false; throw Error('render failed'); };
install(failing);
failing.onBeforeRendering();
failing.getVisibleItems();
assert.throws(() => failing.onAfterRendering(), /render failed/);
failing.items = replacement;
failing.onBeforeRendering();
assert.deepEqual(position(failing, replacement[0]), { setsize: 1, posinset: 1 });
install(null);
const unsupported = {};
install(unsupported);
assert.deepEqual(unsupported, {});
// A native ComboBox creates its list lazily, after controller rendering.
let syncCalls = 0;
const picker = {};
const combo = {
    _getList() { return this.list; },
    syncPickerContent(argument) {
        assert.equal(this, combo);
        assert.equal(argument, 'open');
        syncCalls++;
        this.list ||= list(items);
        return picker;
    }
};
BaseController._optimizeCatalogCombo(combo);
const sync = combo.syncPickerContent;
BaseController._optimizeCatalogCombo(combo);
assert.equal(combo.syncPickerContent, sync);
assert.equal(combo.syncPickerContent('open'), picker);
assert.equal(syncCalls, 1);
combo.list.onBeforeRendering();
items.forEach(item => combo.list.getAccessbilityPosition(item));
assert.equal(combo.list.scans, 1);
combo.list.onAfterRendering();
combo.syncPickerContent('open');
combo.list.onBeforeRendering();
combo.list.getAccessbilityPosition(items[1]);
assert.equal(combo.list.scans, 2, 'new opening uses a fresh render snapshot');
combo.list.onAfterRendering();
const existing = list(replacement);
BaseController._optimizeCatalogCombo({
    _getList: () => existing,
    syncPickerContent: () => picker
});
existing.onBeforeRendering();
existing.getAccessbilityPosition(replacement[0]);
existing.getAccessbilityPosition(replacement[0]);
assert.equal(existing.scans, 1);
existing.onAfterRendering();
BaseController._optimizeCatalogCombo(null);
BaseController._optimizeCatalogCombo({});
console.log('PASS: 10,000 entries, exact positions/counts, one scan per render, filtering, rebinding, grouping, cleanup and fallback.');
