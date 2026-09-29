const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../creacionpedido/quimico/com.aris.registropedido.quimico.pe/webapp/controller/Detail.controller.js'), 'utf8');
let controller;
vm.runInNewContext(source, { sap: { ui: { define(deps, factory) {
    controller = factory(...deps.map(d => d.endsWith('/BaseController') ? { extend: (_, obj) => obj } : {}));
} } } });
controller._parseCantidadSAP = value => Number(value) || 0;
const conditions = [
    { ItmNumber: '000000', CondType: 'ZRF0', Condvalue: '100' },
    { ItmNumber: '000010', CondType: 'ZRF0', Condvalue: '60' },
    { ItmNumber: '000020', CondType: 'ZRF0', Condvalue: '40' },
    { ItmNumber: '000000', CondType: 'ZRFM', CondValue: '100' },
    { ItmNumber: '000010', CondType: 'ZRF1', Condvalue: '380' },
    { ItmNumber: '000010', CondType: 'ZPRE', Condvalue: '600' },
    { ItmNumber: '000020', CondType: 'ZPRE', Condvalue: '400' }
];
assert.equal(controller._getFreightAmount(conditions, 'ZRF0'), 100);
assert.equal(controller._getFreightAmount(conditions.filter(c => c.ItmNumber !== '000000'), 'ZRF0'), 100);
assert.equal(controller._getFreightAmount(conditions, 'ZRFM'), 100);
const begin = source.indexOf('                                aConditions.forEach(cond => {');
const end = source.indexOf('                                const bonusItmSet', begin);
assert.ok(begin > 0 && end > begin);
for (const included of [true, false]) {
    const rows = [
        { ItmNumber: '000010', precioBase: 0, descuentos: 0 },
        { ItmNumber: '000020', precioBase: 0, descuentos: 0 }
    ];
    const ctx = {
        aConditions: conditions, aMaterialUI: rows, oData: { inputForm: { fleteIncluido: included } },
        fleteIncluidoUI: included, mPriceConditionTypes: {}, _n: Number,
        getSum: () => { throw new Error('Selected freight must use header-aware total'); },
        oModelProyect: { setProperty() {} },
        controller
    };
    // Force ZRF1 to look like a configured discount: the explicit guard must ignore it.
    controller._isActiveDiscountCondition = c => c.CondType === 'ZRF1';
    vm.runInNewContext('(function () {' + source.slice(begin, end) + '}).call(controller)', ctx);
    assert.equal(rows[0].descuentos, 0);
    assert.equal(rows[0].fleteIncluido, included ? 60 : 0);
    assert.equal(rows[1].fleteIncluido, included ? 40 : 0);
    const subtotal = rows.reduce((sum, row) => sum + row.precioBase + row.descuentos - row.fleteIncluido, 0);
    const totals = controller._calculateFreightTotals(included, subtotal, 100, 18);
    assert.equal(subtotal, included ? 900 : 1000);
    assert.equal(totals.flete, 100);
    assert.equal(totals.igv, included ? 180 : 198);
    assert.equal(totals.total, included ? 1180 : 1298);
}
for (const selected of [null, undefined, '']) {
    assert.equal(controller._calculateFreightTotals(selected, 1000, 100, 18), null);
}
assert.equal(controller._calculateFreightTotals(false, 1000, 100, 0).igv, 0);
assert.equal(controller._calculateFreightTotals(false, 1000, 100, undefined).igv, 198);
assert.equal(controller._calculateFreightTotals(false, 0, 0, 18).total, 0);
assert.equal(controller._calculateFreightTotals(false, 10.01, 0.02, 18).total, 11.84);
console.log('Químicos: Sí/No/sin selección, ZRF0 frente a ZRF1, cabecera/posiciones sin duplicar, IGV, tasa cero y redondeo: OK.');
