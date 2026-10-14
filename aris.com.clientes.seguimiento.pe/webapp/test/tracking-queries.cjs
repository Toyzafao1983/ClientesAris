const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
function moduleFrom(file, deps = {}, globals = {}) {
    let module;
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
        URL, ...globals, sap: { ui: { define: (names, factory) => { module = factory(...names.map(n => deps[n] || {})); } } }
    });
    return module;
}
const Cache = moduleFrom('services/TrackingQueryCache.js');
const clone = value => JSON.parse(JSON.stringify(value));
const base = '/app/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/';
const url = (entity, filter, extra = '') => base + entity + '?$top=8000&$filter=' + encodeURIComponent(filter) + '&$format=json&sap-language=ES' + extra;
(async () => {
    for (const org of ['1110', '1120', '1130']) {
        const cache = new Cache();
        let calls = 0;
        const rows = [{ SalesOrganization: org, SalesDocument: 'DOC', Amount: 12 }, { SalesOrganization: org, SalesDocument: 'OTHER' }];
        const load = done => { calls++; done({ iCode: 1, data: rows, next: null }); };
        const read = (query, loader = load) => new Promise(resolve => cache.read(query, org, loader, resolve));
        for (const entity of ['DocumentFlow2', 'OrderTracking']) {
            const query = url(entity, "SalesOrganization eq '" + org + "'", entity === 'OrderTracking' ? '&$orderby=SalesDocument desc' : '');
            const first = await read(query);
            first.data[0].Amount = 99;
            assert.equal((await read(query)).data[0].Amount, 12, 'cached rows are isolated');
            const count = calls;
            const detail = await read(url(entity, "SalesOrganization eq '" + org + "' and SalesDocument eq 'DOC'"));
            assert.equal(detail.data.length, 1);
            assert.equal(calls, count, 'detail reuses organization catalog');
            const docOnly = await read(url(entity, "SalesDocument eq 'DOC'"));
            assert.equal(docOnly.data.length, 1);
            assert.equal(calls, count);
            await read(url(entity, "SalesDocument eq 'MISSING'"));
            assert.equal(calls, count + 1, 'absent documents fall back to SAP');
            await read(url(entity, "SalesOrganization eq '9999' and SalesDocument eq 'DOC'"));
            assert.equal(calls, count + 2, 'never reuse a different organization');
            await read(url(entity, "SalesDocument eq 'DOC'", '&$select=SalesDocument'));
            assert.equal(calls, count + 3, 'projections have distinct queries');
        }
        const customer = url('Customer', "SalesOrganization eq '" + org + "'");
        await read(customer);
        const before = calls;
        cache.refreshData();
        await read(customer);
        assert.equal(calls, before, 'search retains static catalogs');
        await read(url('DocumentFlow2', "SalesOrganization eq '" + org + "'"));
        assert.equal(calls, before + 1, 'search renews operational states');
        cache.clear();
        await read(customer);
        assert.equal(calls, before + 2);
        let pending;
        const first = read(url('Pending', ''), done => { pending = done; });
        const second = read(url('Pending', ''), () => assert.fail('duplicate pending transport'));
        pending({ iCode: 1, data: [{ Value: 1 }] });
        const copies = await Promise.all([first, second]);
        copies[0].data[0].Value = 4;
        assert.equal(copies[1].data[0].Value, 1);
        let failedCalls = 0;
        const fail = done => { failedCalls++; done({ iCode: -1, data: [] }); };
        await read(url('Failure', ''), fail); await read(url('Failure', ''), fail);
        assert.equal(failedCalls, 2);
        let identityCalls = 0;
        const identityLoad = async () => { identityCalls++; return { sEstado: 'S', oResults: { Resources: [{ id: 'IAS' }] } }; };
        await Promise.all([cache.readIdentity('email1', identityLoad), cache.readIdentity('email1', identityLoad)]);
        assert.equal(identityCalls, 1);
        await cache.readIdentity('email2', identityLoad);
        assert.equal(identityCalls, 2, 'identity cache includes authenticated email URL');
        cache.clear(); await cache.readIdentity('email1', identityLoad); assert.equal(identityCalls, 3);
    }
    for (const mode of ['single', 'pages', 'fail', 'cycle', 'suggestion', 'object']) {
        const urls = [];
        const http = moduleFrom('util/utilHttp.js', {}, { $: { ajax: options => {
            urls.push(options.url);
            const next = options.url.includes('$skiptoken');
            if (mode === 'fail' && next) return options.error({}, 'error', 'SAP unavailable');
            options.success({ d: mode === 'object' ? { Value: 42, __metadata: {} } : {
                results: [{ Page: next ? 2 : 1, __metadata: {} }],
                __next: ['pages', 'fail', 'cycle', 'suggestion'].includes(mode) && (!next || mode === 'cycle')
                    ? 'https://internal/sap/Items?$filter=A&$skiptoken=100' : undefined
            } });
        } } });
        let result;
        http.ERPGetSync(base + 'Items?$filter=A&$top=' + (mode === 'suggestion' ? 200 : 8000), r => { result = r; });
        assert.equal(result.iCode, ['fail', 'cycle'].includes(mode) ? -1 : 1);
        assert.equal(urls.length, ['pages', 'fail', 'cycle'].includes(mode) ? 2 : 1);
        assert.ok(urls.every(u => u.includes('$top=' + (mode === 'suggestion' ? 200 : 8000))));
        assert.ok(urls.every(u => u.startsWith(base)), 'preserve application proxy on absolute next');
        if (mode === 'pages') { assert.equal(result.data.length, 2); assert.equal(result.data[0].__metadata, undefined); }
        if (mode === 'object') { assert.equal(result.data.Value, 42); assert.equal(result.data.__metadata, undefined); }
    }
    const listService = moduleFrom('services/Services.js');
    for (const mode of ['pages', 'fail', 'cycle']) {
        const calls = [];
        let result, error;
        listService.readAllOData({ read: (page, options) => {
            calls.push({ page, options });
            if (mode === 'fail' && calls.length === 2) return options.error({ message: 'SAP unavailable' });
            options.success({ results: [{ Page: calls.length }],
                __next: calls.length === 1 || mode === 'cycle'
                    ? 'https://internal/sap/MaterialsConsultation?$filter=Brand&$skiptoken=100' : null });
        } }, '/MaterialsConsultation', { filters: ['BRAND'], success: r => { result = r; }, error: e => { error = e; } });
        assert.equal(calls.length, 2);
        assert.equal(calls[0].options.filters[0], 'BRAND');
        assert.equal(calls[1].options.filters, undefined, 'continuation already contains filters');
        assert.equal(calls[0].options.urlParameters['$top'], '2147483647');
        assert.equal(calls[1].page, '/MaterialsConsultation?$filter=Brand&$skiptoken=100&$top=2147483647');
        if (mode === 'pages') assert.equal(result.results.length, 2);
        else { assert.ok(error); assert.equal(result, undefined); }
    }
    let beforeRoute;
    const component = moduleFrom('Component.js', {
        'sap/ui/core/UIComponent': { extend: (_, methods) => methods, prototype: { init() {} } },
        'aris/com/clientes/seguimiento/pe/services/TrackingQueryCache': Cache,
        'aris/com/clientes/seguimiento/pe/model/models': { createDeviceModel: () => ({}) }
    });
    const owner = Object.assign({}, component, { setModel() {}, getRouter: () => ({
        attachBeforeRouteMatched: fn => { beforeRoute = fn; }, initialize() {}
    }) });
    owner.init(); owner.ensureTrackingOrganization('1120');
    const services = moduleFrom('services/Services.js', { '../util/utilHttp': {
        ERPGetSync: (_, done) => done({ iCode: 1, data: [{ Value: 1 }] })
    } });
    const controller = { getOwnerComponent: () => owner, sSalesOrg: '1120' };
    let calls = 0;
    const load = done => { calls++; done({ iCode: 1, data: [] }); };
    const query = url('DocumentFlow2', "SalesOrganization eq '1120'");
    owner.getTrackingQuery(query, '1120', load, () => {});
    beforeRoute({ getParameter: () => 'Detail' });
    owner.getTrackingQuery(query, '1120', load, () => {});
    assert.equal(calls, 1, 'list/detail navigation preserves cache');
    beforeRoute({ getParameter: () => 'ModPedTextil' });
    owner.getTrackingQuery(query, '1120', load, () => {});
    owner.getTrackingQuery(query, '1120', load, () => {});
    assert.equal(calls, 3, 'editing bypasses cache');
    beforeRoute({ getParameter: () => 'View' });
    owner.getTrackingQuery(query, '1120', load, () => {});
    assert.equal(calls, 4, 'return from editing renews data');
    owner.ensureTrackingOrganization('1130');
    owner.getTrackingQuery(query, '1120', load, () => {});
    assert.equal(calls, 5);
    let result;
    services.getoDataERPSync(controller, url('Customer', ''), r => { result = r; });
    assert.equal(result.iCode, 1);
    console.log('PASS: tracking pagination, copies, exact/pending deduplication, catalog/detail reuse, organization isolation, identity, retries, refresh and editing lifecycle.');
})().catch(error => { console.error(error); process.exitCode = 1; });
