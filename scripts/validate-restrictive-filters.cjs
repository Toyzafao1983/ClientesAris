const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
class Filter {
    constructor(path, operator, value) { Object.assign(this, typeof path === 'object' ? path : { path, operator, value }); }
    matches(row) {
        if (this.filters) return this.and ? this.filters.every(f => f.matches(row)) : this.filters.some(f => f.matches(row));
        if (this.test) return this.test(row[this.path]);
        return this.operator === 'Contains' ? String(row[this.path] || '').includes(this.value) : row[this.path] === this.value;
    }
}
function load(file, table) {
    let result;
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
        setTimeout, sap: { m: { MessageToast: { show() {} }, MessageBox: { error() {} } }, ui: {
            model: { Filter, FilterOperator: { EQ: 'EQ', Contains: 'Contains' } },
            core: { BusyIndicator: { show() {}, hide() {} }, Fragment: { byId: () => table } },
            define: (names, factory) => { result = factory(...names.map(name => name.endsWith('/BaseController') ? { extend: (_, methods) => methods } : {})); }
        } }
    });
    return result;
}
const projects = ['com.aris.consultaestadocuenta.pe', ...['textil', 'quimico', 'ceramico'].map(unit =>
    'creacionpedido/' + unit + '/' + fs.readdirSync('creacionpedido/' + unit)[0])];
const settle = () => new Promise(resolve => setTimeout(resolve, 10));
(async () => {
    for (const project of projects) {
        let state, raw = '', criteria = {}, requests = 0, visible = [];
        const model = {
            getProperty: key => key === '/Main/filter' ? criteria : state[key],
            setProperty: (key, value) => { state[key] = value; if (key.startsWith('/Main/filter/')) criteria[key.split('/').pop()] = value; }
        };
        const table = { getBinding: () => ({ filter: filters => { visible = (state['/oReporte'] || []).filter(row => filters.every(f => f.matches(row))); } }) };
        const token = value => ({ getKey: () => value, getText: () => value, setText() {} });
        const keys = { multiInputSeller: 'fSeller', multiInputCodClient: 'fCodClient', multiInputRazonSocial: 'fRazSocial', multiInputDocument: 'fDocument' };
        const controller = load(project + '/webapp/controller/Main.controller.js', table);
        Object.assign(controller, {
            oModelProyect: model,
            getModel: name => name === 'oModelUser' ? { getProperty: () => undefined } : model,
            byId: id => id === 'TableClient' ? table : keys[id] ? {
                getTokens: () => (criteria[keys[id]] || []).map(token),
                getValue: () => id === 'multiInputCodClient' ? raw : ''
            } : undefined,
            getMessageBox() {}, getI18nText: key => key,
            _requireSellerIfVendedor: () => true,
            _getData: async () => { requests++; return { sEstado: 'S', oResults: [] }; },
            _getClient: async () => ({}), _getDatClient: async () => ({})
        });
        const customers = [{ Customer: 'A', CustomerFullName: 'Alpha', TaxNumber1: 'TAX', Seller: 'S', kunn2: 'S' },
            { Customer: 'B', CustomerFullName: 'Beta', TaxNumber1: 'OTHER', Seller: 'Z', kunn2: 'Z' }];
        controller._initialCustomerData = { customers: { sEstado: 'S', oResults: customers }, customerData: { sEstado: 'S', oResults: customers } };
        const search = async (filter, expected) => {
            state = { '/oReporte': customers, '/oClienteFilter': customers, '/oDatClientAll': customers };
            criteria = filter; visible = customers;
            controller._onPressExecute(); await settle();
            assert.deepEqual(visible.map(row => row.Customer), expected, project + ' ' + JSON.stringify(filter));
        };
        for (const field of ['fCodClient', 'fRazSocial', 'fSeller', 'fDocument']) await search({ [field]: ['MISSING'] }, []);
        await search({ fCodClient: ['A'] }, ['A']);
        await search({ fCodClient: ['A', 'MISSING'] }, ['A']);
        await search({ fCodClient: ['A'], fDocument: ['OTHER'] }, []);
        raw = 'unresolved customer'; const previousRequests = requests;
        state['/oReporte'] = customers;
        controller._onPressExecute(); await settle();
        assert.equal(state['/oReporte'].length, 0, 'incomplete input clears results');
        assert.equal(requests, previousRequests, 'incomplete input does not query');
        assert.equal(raw, 'unresolved customer');
        console.log('PASS restrictive client/name/seller/document and incomplete input:', project);
    }
    for (const project of ['aris.com.clientes.seguimiento.pe', projects.find(project => project.includes('/ceramico/'))]) {
        const tracking = project.includes('seguimiento');
        const controller = load(project + '/webapp/controller/' + (tracking ? 'View' : 'Main') + '.controller.js');
        const values = { '/oReporte': [{ Id: 'OLD' }], '/oReporteFiltrado': [{ Id: 'OLD' }] };
        let tokens = ['OUTSIDE_SCOPE', 'INSIDE_SCOPE'].map(key => ({ getKey: () => key, getText: () => key }));
        const model = { getProperty: () => [{ Customer: 'INSIDE_SCOPE' }], setProperty: (key, value) => { values[key] = value; } };
        const input = { getTokens: () => tokens, removeAllTokens: () => { tokens = []; }, addToken: token => tokens.push(token) };
        const context = Object.assign({}, controller, { oModelProyect: model, getModel: () => model,
            byId: id => id === (tracking ? 'miCliente' : 'multiInputCodClient') ? input : null });
        controller._purgeClientTokensOutOfScope.call(context);
        const key = tracking ? '/Main/filter/cbCliente' : '/Main/filter/fCodClient';
        assert.deepEqual(Array.from(values[key]), ['INSIDE_SCOPE']);
        assert.deepEqual(tokens.map(token => token.getKey()), ['INSIDE_SCOPE']);
        assert.equal(values['/oReporte'].length, 0);
        if (tracking) assert.equal(values['/oReporteFiltrado'].length, 0);
    }
    const tracking = load('aris.com.clientes.seguimiento.pe/webapp/controller/View.controller.js');
    for (const mode of ['raw', 'raw-with-token', 'blank-key']) {
        const values = { '/oReporte': [{ SalesDocument: 'OLD' }], '/oReporteFiltrado': [{ SalesDocument: 'OLD' }] };
        const model = { setProperty: (key, value) => { values[key] = value; } };
        const context = {
            getView: () => ({ getModel: () => model }),
            getModel: () => ({ getProperty: () => '' }),
            _getLockedFiltersByProfile: () => ({ aClienteLocked: [], aVendedorLocked: [] }),
            _getData: () => assert.fail('incomplete tracking filter queried orders'),
            byId: id => id === 'miCliente' ? {
                getTokens: () => mode === 'raw' ? [] : [{ getKey: () => mode === 'blank-key' ? '' : 'A', getText: () => 'Alpha' }],
                getValue: () => mode === 'blank-key' ? '' : 'unresolved'
            } : id === 'dStartDate' || id === 'dEndDate' ? { getDateValue: () => new Date(2026, 9, 14) } : null
        };
        tracking._onPressExecute.call(context);
        assert.equal(values['/oReporte'].length, 0);
        assert.equal(values['/oReporteFiltrado'].length, 0);
    }
    const stock = load('aris.com.clientes.controlstock.pe/webapp/controller/View.controller.js');
    for (const mode of ['empty', 'incomplete']) {
        const state = {};
        const paths = ['/oStockDisponible', '/oStockTextil', '/oStockQuimico', '/oReporteCeraCli', '/oReporteCeraCliBase', '/oTreeCer', '/oTreeCerBase', '/oStockQueue'];
        paths.forEach(key => { state[key] = [{ Material: 'OLD' }]; });
        const model = { getProperty: key => state[key], setProperty: (key, value) => { state[key] = value; } };
        const context = { getModel: () => model, getView: () => ({ setBusy() {}, setBusyIndicatorDelay() {} }), byId: () => null,
            _collectValidTokensAndDiscardRaw: () => ({ invalidRawInputs: mode === 'incomplete' ? ['invalid'] : [], tokensById: {} }),
            _GetFilteredMaterials: async () => [],
            _fetchStockForMaterials: () => assert.fail('empty material search must not load stock') };
        await stock._onPressExecute.call(context);
        paths.forEach(key => assert.equal(state[key].length, 0, key));
    }
    console.log('PASS: scope changes remove clients outside the seller scope and clear previous results; empty/incomplete stock searches clear all result models.');
    const chemical = projects.find(project => project.includes('/quimico/'));
    for (const file of ['FormClient', 'Detail']) {
        const controller = load(chemical + '/webapp/controller/' + file + '.controller.js');
        let filtered;
        let agencies = [{ Carrier: 'A', Id: 1 }, { Carrier: 'B', Id: 2 }];
        const model = { getProperty: key => key === '/oAgenciasCliente' ? agencies : 'A',
            setProperty: (key, value) => { if (key === '/oAgenciasClienteFiltradas') filtered = value; } };
        const context = { getView: () => ({ getModel: () => model }), byId: () => null, _updateResumenEntrega() {} };
        const search = carrier => file === 'Detail' ? controller._syncAgenciasFiltradasPorTransporte.call(context, carrier) :
            controller.onSelectTransporte.call(context, { getSource: () => ({ setSelectedKey() {}, setValue() {} }),
                getParameter: () => ({ getKey: () => carrier, getText: () => carrier }) });
        search('A'); assert.deepEqual(Array.from(filtered, row => row.Id), [1]);
        search('MISSING'); assert.equal(filtered.length, 0);
        agencies = [{ Id: 3 }, { _raw: { Carrier: 'B' }, Id: 4 }];
        search('A'); assert.deepEqual(Array.from(filtered, row => row.Id), [3, 4], 'preserve existing agency fallback when Carrier metadata is absent');
        console.log('PASS original agency/transport behavior preserved:', file);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
