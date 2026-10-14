const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
function load(file) {
    let controller;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../controller', file + '.controller.js'), 'utf8'), {
        sap: { ui: { define: (names, factory) => { controller = factory(...names.map(name => name.endsWith('/BaseController') ? { extend: (_, methods) => methods } : {})); } } }
    });
    return controller;
}
const form = load('FormClient'), detail = load('Detail');
for (const role of ['cliente', 'vendedor', 'coordinador']) for (const country of ['', 'PE', 'US']) {
    const values = { '/oDireccionCliente': { Country: country }, '/oDatClient': {}, '/oClientData': {},
        '/inputForm': { tipDocument: 'ZPEF', bClienteExteriorZPEF: true }, '/inputForm/tipDocument': 'ZPEF' };
    const model = { getProperty: key => values[key], setProperty: (key, value) => {
        values[key] = value;
        if (key.startsWith('/inputForm/')) values['/inputForm'][key.slice('/inputForm/'.length)] = value;
    } };
    const dataValues = { '/oTipDocumentDataAll': ['ZPEF', 'ZPES', 'ZCNA', 'ZPSE', 'ZGNA'].map(auart => ({ auart })) };
    const data = { getProperty: key => dataValues[key], setProperty: (key, value) => { dataValues[key] = value; } };
    const user = { getProperty: key => ({ '/bIsCliente': role === 'cliente', '/bIsVendedor': role === 'vendedor', '/bIsCoord': role === 'coordinador' })[key] };
    const context = Object.assign({}, form, { getView: () => ({ getModel: name => name === 'oModelData' ? data : name === 'oModelUser' ? user : model }),
        _updateFormState() {}, _applyExternalZPEFCourierRules() {}, _updateBtnPedidoReferenciaVisibility() {} });
    form._applyTipDocumentFilter.call(context);
    const allowed = Array.from(dataValues['/oTipDocumentData'], doc => doc.auart);
    if (!country) {
        assert.deepEqual(allowed, []);
        assert.equal(values['/inputForm/tipDocument'], '');
        assert.equal(values['/isFormEnabled'], false);
        assert.equal(values['/inputForm/bClienteExteriorZPEF'], false);
        let blocked = false;
        context.getMessageBox = () => { blocked = true; };
        context._validateRequiredFields = () => assert.fail('unknown country reached form continuation');
        form._onPressMaterialDetail.call(context);
        assert.equal(blocked, true);
    } else if (country === 'US') {
        assert.deepEqual(allowed, ['ZPEF']);
        assert.equal(values['/inputForm/tipDocument'], 'ZPEF');
    } else {
        assert.ok(allowed.includes('ZPES'));
        assert.ok(!allowed.includes('ZPEF'));
    }
    assert.equal(form._isClienteExteriorZPEF.call(context), country === 'US');
    assert.equal(detail._isClienteExteriorZPEF.call(Object.assign({}, context, { _getClienteCountryForDetail: detail._getClienteCountryForDetail })), country === 'US');
}
console.log('PASS: missing country blocks document selection/continuation; PE retains national types and confirmed foreign countries retain export for all roles.');
