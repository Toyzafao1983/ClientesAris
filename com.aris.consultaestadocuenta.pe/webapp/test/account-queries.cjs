const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
function load(file, deps = {}, globals = {}) {
    let module;
    const sap = globals.sap || {};
    sap.ui = sap.ui || {};
    sap.ui.define = (names, factory) => { module = factory(...names.map(n => deps[n] || {})); };
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), { URL, ...globals, sap });
    return module;
}
const Cache = load('services/AccountQueryCache.js');
const component = load('Component.js', {
    'sap/ui/core/UIComponent': { extend: (_, methods) => methods },
    'com/aris/consultaestadocuenta/pe/services/AccountQueryCache': Cache
});
const base = '/app/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/';
const query = (entity, filter) => base + entity + '?$filter=' + encodeURIComponent(filter) + '&$format=json&sap-language=es-ES';
(async () => {
    for (const org of ['1110', '1120', '1130']) {
        const cache = new Cache(); let requests = 0;
        const read = url => new Promise(resolve => cache.read(url, done => { requests++; done({ iCode: 1, data: [{ Customer: 'CLIENT', Name: 'Original' }] }); }, resolve));
        for (const entity of ['Customer', 'DataCustomer']) {
            const filter = "SalesOrganization eq '" + org + "' and Division eq 'S1'";
            const first = await read(query(entity, filter)); first.data[0].Name = 'Edited';
            const before = requests;
            const detail = await read(query(entity, filter + " and Customer eq 'CLIENT'"));
            assert.equal(requests, before); assert.equal(detail.data[0].Name, 'Original');
            await read(query(entity, filter + " and Customer eq 'MISSING'")); assert.equal(requests, before + 1);
        }
        for (const entity of ['eEstadoCuentaSet', 'LoanedProductsSet', "iDireccionesSet(Businesspartner='CLIENT')"]) {
            const before = requests; await read(query(entity, '')); await read(query(entity, '')); assert.equal(requests, before + 2, 'financial reads never cached globally');
        }
        let identityCalls = 0;
        await Promise.all([cache.readIdentity('email', async () => { identityCalls++; return { sEstado: 'S', oResults: {} }; }), cache.readIdentity('email', () => assert.fail('duplicate IAS'))]);
        assert.equal(identityCalls, 1);
    }
    for (const async of [false, true]) for (const mode of ['pages', 'single', 'fail', 'cycle']) {
        const urls = [];
        const http = load('util/utilHttp.js', {}, { $: { ajax: options => {
            urls.push(options.url);
            const respond = () => {
                const second = options.url.includes('$skiptoken');
                if (mode === 'fail' && second) return options.error({}, 'error', 'failed');
                options.success({ d: { results: [{ Kunnr: 'CLIENT', Page: second ? 2 : 1, __metadata: {} }],
                    __next: mode !== 'single' && (!second || mode === 'cycle') ? 'https://sap.internal/sap/eEstadoCuentaSet?$filter=A&$skiptoken=100' : null } });
            };
            if (async) Promise.resolve().then(respond); else respond();
        } } });
        const result = await new Promise(resolve => http[async ? 'ERPGetAsync' : 'ERPGetSync'](base + 'eEstadoCuentaSet?$top=3000&$filter=A', resolve));
        assert.equal(result.iCode, ['fail', 'cycle'].includes(mode) ? -1 : 1);
        assert.equal(urls.length, mode === 'single' ? 1 : 2);
        assert.ok(urls.every(u => u.startsWith(base))); assert.ok(urls.every(url => url.includes('$top=3000')));
        if (mode === 'pages') { assert.equal(result.data.length, 2); assert.equal(result.data[0].__metadata, undefined); }
    }
    for (const [unit, site] of [['TEXTILES', 'textiles'], ['QUIMICOS', 'quimicos'], ['CERAMICOS', 'ceramicos']]) {
        const owner = Object.assign({}, component); owner.ensureAccountOrganization(unit);
        const data = {};
        const model = { setProperty: (key, value) => { data[key] = value; }, getProperty: key => key === '/bRol' ? 'CLIENTES' : data[key], refresh() {} };
        const router = { getTarget: () => ({ attachDisplay() {} }), getHashChanger: () => ({ hash: 'Detail/CLIENT' }), navTo: name => assert.equal(name, 'Detail') };
        const sap = { ui: { core: { UIComponent: { getRouterFor: () => router }, BusyIndicator: { show() {}, hide() {} } } }, m: { MessageBox: { error() {} } } };
        const globals = { sap, jQuery: { proxy: fn => fn }, window: { parent: { location: { href: 'site-' + site } } } };
        const main = load('controller/Main.controller.js', { 'com/aris/consultaestadocuenta/pe/controller/BaseController': { extend: (_, methods) => methods } }, globals);
        let financialCalls = 0, addressCalls = 0, loanCalls = 0;
        const context = Object.assign({}, main, {
            _setLanguageModel() {}, getI18nText: key => key, getMessageBox: (_, message) => { throw new Error(message); },
            getOwnerComponent: () => owner, getModel: () => model, getView: () => ({ getModel: () => model }),
            _getEstadoCuentaDate: () => '2026-10-11T00:00:00',
            _getAddressData: async () => { addressCalls++; return { sEstado: 'S', oResults: { Street: 'Street' } }; },
            _getEstadoCuenta: async () => { financialCalls++; return { sEstado: 'S', oResults: [{ Monto: financialCalls }] }; },
            _getProductPres: async () => { loanCalls++; return { sEstado: 'S', oResults: [] }; }
        });
        main.onInit.call(context);
        await main._navigateDetailForCustomer.call(context, 'CLIENT', {});
        const detail = load('controller/Detail.controller.js', { 'com/aris/consultaestadocuenta/pe/controller/BaseController': { extend: (_, methods) => methods } }, globals);
        const detailContext = Object.assign({}, context, detail, { _getClientDetail: async () => ({ sEstado: 'S', oResults: [{ Customer: 'CLIENT' }] }), _getUsers: async () => ({ Resources: [] }) });
        detail.onInit.call(detailContext);
        detail.handleRouteMatched.call(detailContext);
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(financialCalls, 1); assert.equal(addressCalls, 1); assert.equal(loanCalls, 1);
        assert.equal(data['/oDetalle'][0].Monto, 1);
        await main._navigateDetailForCustomer.call(context, 'CLIENT', {});
        assert.equal(financialCalls, 2, 'new opening refreshes balances');
        assert.equal(owner.takeAccountDetail('OTHER', unit, '2026-10-11T00:00:00'), null, 'cannot reuse another customer');
        detail.handleRouteMatched.call(detailContext); await new Promise(resolve => setImmediate(resolve));
        assert.equal(financialCalls, 3, 'direct entry fetches fresh data');
        owner.setAccountDetail('CLIENT', unit, '2026-10-10T00:00:00', []);
        assert.equal(owner.takeAccountDetail('CLIENT', unit, '2026-10-11T00:00:00'), null, 'cannot reuse another date');
        owner.setAccountDetail('CLIENT', unit, '2026-10-11T00:00:00', []);
        owner.ensureAccountOrganization('OTHER');
        assert.equal(owner.takeAccountDetail('CLIENT', unit, '2026-10-11T00:00:00'), null);
    }
    // Real statement query must keep the midnight filter and separate PDF projection.
    const baseSource = fs.readFileSync(path.join(root, 'controller/BaseController.js'), 'utf8');
    function method(name, globals) {
        const start = baseSource.indexOf(name + ': function');
        const end = baseSource.indexOf('\n\t\t},', start);
        return vm.runInNewContext('(' + baseSource.slice(start + name.length + 2, end + 4) + ')', globals);
    }
    for (const local of [true, false]) {
        const urls = [];
        const globals = {
            jQuery: { sap: { getModulePath: () => '/app' } },
            Services: { getoDataERPSync: (_, url, done) => { urls.push(url); done({ iCode: 1, data: [] }); } },
            util: { response: { validateAjaxGetERPNotMessage: (r, events) => events.success(r) } }
        };
        const context = { local, route: 'ec', _getEstadoCuentaDate: () => '2026-10-11T00:00:00',
            _getEstadoCuentaListSelect: () => 'Monto,Condicion', getOwnerComponent: () => ({ getManifestObject: () => ({ resolveUri: u => u }) }) };
        const call = method('_getEstadoCuenta', globals);
        await call.call(context, 'CLIENT');
        await call.call(context, 'CLIENT', '1001', '1', 'EPdf');
        assert.ok(urls.every(url => url.includes("Datum eq datetime'2026-10-11T00:00:00'")));
        assert.ok(urls[0].includes('$select=Monto,Condicion'));
        assert.ok(urls[1].includes('$select=EPdf'));
        assert.equal(urls[0].startsWith('/app/S4HANA/'), !local);
    }
    console.log('PASS: EC sync/async pagination, errors/cycles, catalogs, copies, identity, all organizations, Main->Detail reuse, fresh reopening, direct entry and date/customer isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
