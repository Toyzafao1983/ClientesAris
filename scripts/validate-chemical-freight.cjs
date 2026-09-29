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
// Validar la construcción de la solicitud con el importe del caso reportado.
const requestBegin = source.indexOf('                    let aCondSim = [];');
const requestEnd = source.indexOf('                    (aMatForSap || []).forEach', requestBegin);
assert.ok(requestBegin > 0 && requestEnd > requestBegin);
for (const included of [true, false, null]) {
    for (const amount of ['2.939', '0.000']) {
        const ctx = {
            sSalesOrg: '1120', sFleteUSD3: amount,
            oData: { inputForm: { fleteIncluido: included } },
            fleteIngresado: Number(amount) > 0, fleteIncluidoUI: !!included,
            // La moneda del pedido no debe sustituir el flete USD de cabecera.
            sFleteCondValor: '10.000', sFleteCondCurr: 'PEN'
        };
        vm.runInNewContext(source.slice(requestBegin, requestEnd) +
            '\nresult = { header: oFreightHeader, conditions: aCondSim };', ctx);
        const result = JSON.parse(JSON.stringify(ctx.result));
        const slot = included ? '1' : '2';
        assert.deepEqual(result.header, Number(amount) > 0 && included !== null ? {
            ['CdType' + slot]: included ? 'ZRF0' : 'ZRFM',
            ['CdValue' + slot]: '2.939', ['CdCurr' + slot]: 'USD'
        } : {});
        assert.deepEqual(result.conditions, []);
        assert.deepEqual(JSON.parse(JSON.stringify(controller._cleanPayload(result.header))), result.header);
    }
}
const conditions = [
    { ItmNumber: '000000', CondType: 'ZRF0', Condvalue: '100' },
    { ItmNumber: '000010', CondType: 'ZRF0', Condvalue: '25' },
    { ItmNumber: '000020', CondType: 'ZRF0', Condvalue: '75' },
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
for (const freightByItem of [[25, 75], [0, 100], [100, null]]) {
for (const included of [true, false]) {
    const responseConditions = conditions
        .filter(c => c.CondType !== 'ZRF0' || c.ItmNumber === '000000')
        .concat(freightByItem.flatMap((amount, index) => amount === null ? [] : [{
            ItmNumber: index === 0 ? '000010' : '000020',
            CondType: 'ZRF0', Condvalue: String(amount)
        }]));
    const rows = [
        { ItmNumber: '000010', precioBase: 0, descuentos: 0, fleteIncluido: 0 },
        { ItmNumber: '000020', precioBase: 0, descuentos: 0, fleteIncluido: 0 }
    ];
    const ctx = {
        aConditions: responseConditions, aMaterialUI: rows, oData: { inputForm: { fleteIncluido: included } },
        fleteIncluidoUI: included, mPriceConditionTypes: {}, _n: Number,
        getSum: () => { throw new Error('Selected freight must use header-aware total'); },
        oModelProyect: { setProperty() {} },
        controller
    };
    // Force ZRF1 to look like a configured discount: the explicit guard must ignore it.
    controller._isActiveDiscountCondition = c => c.CondType === 'ZRF1';
    vm.runInNewContext('(function () {' + source.slice(begin, end) + '}).call(controller)', ctx);
    assert.equal(rows[0].descuentos, 0);
    // SAP distribuye 25/75 pese a que los precios base están en proporción 60/40.
    assert.equal(rows[0].fleteIncluido, included ? freightByItem[0] : 0);
    assert.equal(rows[1].fleteIncluido, included ? (freightByItem[1] || 0) : 0);
    const subtotal = rows.reduce((sum, row) => sum + row.precioBase + row.descuentos - row.fleteIncluido, 0);
    const totals = controller._calculateFreightTotals(included, subtotal, 100, 18);
    assert.equal(subtotal, included ? 900 : 1000);
    assert.equal(totals.flete, 100);
    assert.equal(totals.igv, included ? 180 : 198);
    assert.equal(totals.total, included ? 1180 : 1298);
}
}
for (const selected of [null, undefined, '']) {
    assert.equal(controller._calculateFreightTotals(selected, 1000, 100, 18), null);
}
assert.equal(controller._calculateFreightTotals(false, 1000, 100, 0).igv, 0);
assert.equal(controller._calculateFreightTotals(false, 1000, 100, undefined).igv, 198);
assert.equal(controller._calculateFreightTotals(false, 0, 0, 18).total, 0);
assert.equal(controller._calculateFreightTotals(false, 10.01, 0.02, 18).total, 11.84);
console.log('Químicos: flete SAP por posición sin prorratear, importe cero/ausente, Sí/No/sin selección, ZRF0 frente a ZRF1, totales, IGV y redondeo: OK.');
