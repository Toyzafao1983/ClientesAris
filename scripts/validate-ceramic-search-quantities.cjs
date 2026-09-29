const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const file = path.join(__dirname, '../creacionpedido/ceramico/com.aris.registropedido.ceramicos.pe/webapp/controller/AddManualProduct.controller.js');
let controller;
const sap = { ui: { define: (_, factory) => factory({ extend: (_, methods) => { controller = methods; } }),
    model: { Filter: function () {}, FilterOperator: { EQ: 'EQ' } } } };
vm.runInNewContext(fs.readFileSync(file, 'utf8'), { sap, setTimeout });
const data = { '/oSelectDetail': {} };
const model = { getProperty: key => data[key], setProperty: (key, value) => { data[key] = value; }, refresh() {} };
Object.assign(controller, {
    getView: () => ({ getModel: () => model }), byId: () => null,
    _clearTreeSelection() {}, _loadMateriales() {}, _getTipoSeleccionado: () => 'TODOS'
});
const stock = (mat, calibre, tono) => ({ Matnr: mat, Calibre: calibre, Tono: tono, Pallets: 20, Saldos: 10, StockFisico: 100 });
(async () => {
    const original = [stock('A', '1', 'T1'), stock('A', '2', 'T2'), stock('B', '1', 'T1')];
    let tree = await controller._prepareDataForCeramicos(original);
    tree[0].children[0].cantidadPallets = 3;
    tree[0].children[0].cantidadCajas = 2;
    tree[0].children[1].cantidadPallets = 5;
    tree[1].cantidadPallets = 7;
    data['/oTreeCer'] = tree;
    controller.onBuscarPress();
    assert.equal(data['/oTreeCer'].length, 0);
    tree = controller._restoreManualQuantities(await controller._prepareDataForCeramicos([
        stock('C', '1', 'T1'), ...original.slice().reverse()
    ]));
    const a = tree.find(r => r.Matnr === 'A');
    const b = tree.find(r => r.Matnr === 'B');
    assert.equal(a.children.find(r => r.Calibre === '1').cantidadPallets, 3);
    assert.equal(a.children.find(r => r.Calibre === '1').cantidadCajas, 2);
    assert.equal(a.children.find(r => r.Calibre === '2').cantidadPallets, 5);
    assert.equal(b.cantidadPallets, 7);
    assert.equal(b.children[0].cantidadPallets, 0);
    assert.equal(tree.find(r => r.Matnr === 'C').children[0].cantidadPallets, 0);
    // Edits, including explicit zero, survive a subsequent search and type change.
    a.children[0].cantidadPallets = 0;
    data['/oTreeCer'] = tree;
    data['/oTreeCerBase'] = await controller._prepareDataForCeramicos(original);
    controller._applyTipoFromTreeBase();
    assert.equal(data['/oTreeCer'].find(r => r.Matnr === 'A').children.find(r => r.Calibre === a.children[0].Calibre).cantidadPallets, 0);
    // A filter temporarily hiding A does not erase its saved quantities.
    data['/oTreeCer'] = [b];
    controller.onBuscarPress();
    const restored = controller._restoreManualQuantities(await controller._prepareDataForCeramicos(original));
    assert.equal(restored[0].children.find(r => r.Calibre === '1').cantidadCajas, 2);
    // Explicit Clear starts a fresh selection session.
    controller._resetFiltersAndTableTree();
    const cleared = controller._restoreManualQuantities(await controller._prepareDataForCeramicos(original));
    assert.equal(cleared[0].children[0].cantidadPallets, 0);
    assert.equal(cleared[0].children[0].cantidadCajas, 0);
    console.log('Ceramic quantities preserved across searches, reordered rows and type filters; explicit clear verified.');
})().catch(error => { console.error(error); process.exitCode = 1; });
