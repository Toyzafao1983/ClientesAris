const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let controller;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controller/Detail.controller.js'), 'utf8'), {
    sap: { ui: { define: (_, factory) => {
        controller = factory({ extend: (_, methods) => methods });
    } } }
});
const plain = value => JSON.parse(JSON.stringify(value));
const rows = tax => [{ TaxClasification: tax, subtotal: 100 }];
for (const included of [true, false]) {
    for (const rate of [undefined, '', '18', 'invalid']) {
        assert.deepEqual(plain(controller._calculateFreightTotals(included, 100, 10, rate, rows('0'))),
            { flete: 10, igv: 0, total: 110 });
    }
    assert.equal(controller._calculateFreightTotals(included, 100, 10, 18, rows('1')).igv, 19.8);
    assert.equal(controller._calculateFreightTotals(included, 100, 10, 18, rows('')).igv, 0);
    assert.equal(controller._calculateFreightTotals(included, 0, 10, 18, []).igv, 0);
    const mixed = [{ TaxClasification: '0', subtotal: 50 }, { TaxClasification: '1', subtotal: 50 }];
    assert.equal(controller._calculateFreightTotals(included, 100, 10, 18, mixed).igv, 9.9);
}
assert.equal(controller._calculateFreightTotals(null, 100, 10, 18, rows('0')), null);
// Exercise the actual SAP condition handler with an unexpected positive MWST.
const source = fs.readFileSync(path.join(__dirname, '../controller/Detail.controller.js'), 'utf8');
const start = source.indexOf('                                aConditions.forEach(cond => {');
const end = source.indexOf('\n                                const bFleteSeleccionado', start);
const applyConditions = new Function('aConditions', 'aMaterialUI', 'mPriceConditionTypes', 'oData', 'fleteIncluidoUI', source.slice(start, end));
for (const tax of ['0', '1', '']) {
    const items = [{ ItmNumber: '000010', TaxClasification: tax, impuesto: 0 }];
    applyConditions.call({ ...controller, _isConditionActive: () => true, _getConditionAmount: c => c.CondValue },
        [{ ItmNumber: '000010', CondType: 'MWST', CondValue: 18 }], items, {}, { inputForm: {} }, false);
    assert.equal(items[0].impuesto, tax === '1' ? 18 : 0);
}
// Deleting a position must also clear any stale tax on remaining exempt rows.
for (const included of [null, true, false]) {
    const data = {
        '/oMaterialUI': [
            { ItmNumber: '000010', TaxClasification: '0', subtotal: 100, impuesto: 18, total: 118 },
            { ItmNumber: '000020', TaxClasification: '0', subtotal: 50, impuesto: 9, total: 59 }
        ],
        '/oMaterial': [{ ItmNumber: '000010' }, { ItmNumber: '000020' }],
        '/oDatCalculo': { embalaje: '10', igvPorcentaje: '18' },
        '/inputForm/fleteIncluido': included
    };
    const model = { getProperty: key => data[key], setProperty: (key, value) => { data[key] = value; }, refresh: () => {} };
    const event = { getSource: () => ({ getParent: () => ({ getBindingContext: () => ({
        getModel: () => model, getPath: () => '/oMaterialUI/1'
    }) }) }) };
    controller._onDeleteProduct.call({ ...controller, getView: () => ({ byId: () => null }), _recalcTotalPeso: () => {} }, event);
    assert.equal(data['/oMaterialUI'][0].impuesto, 0);
    assert.equal(data['/oMaterialUI'][0].total, 100);
    assert.equal(data['/oDatCalculo'].totalImpuesto, '0.00');
}
(async () => {
    let queried = 0;
    const data = { '/oMaterialUI': [{ Material: '000123' }, { Material: '456', TaxClasification: '0' }] };
    const model = { getProperty: key => data[key], setProperty: (key, value) => { data[key] = value; } };
    const context = { ...controller, _getTaxClassificationForSelectedMaterials: async missing => {
        queried++;
        assert.equal(missing.length, 1);
        return [{ Material: '123', TaxClasification: '0' }];
    } };
    await context._ensureMaterialTaxClassifications(model);
    assert.equal(data['/oMaterialUI'][0].TaxClasification, '0');
    await context._ensureMaterialTaxClassifications(model);
    assert.equal(queried, 1);
    data['/oMaterialUI'] = [{ Material: '999' }];
    await assert.rejects(context._ensureMaterialTaxClassifications(model), /clasificación/);
    console.log('Material tax checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
