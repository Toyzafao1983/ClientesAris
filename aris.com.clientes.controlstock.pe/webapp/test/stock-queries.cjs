const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
function load(file, deps = {}, globals = {}) {
    let module;
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
        URL, ...globals, sap: { ui: { define: (names, factory) => { module = factory(...names.map(n => deps[n] || {})); } } }
    });
    return module;
}
const Cache = load('services/StockQueryCache.js');
const base = '/app/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/';
(async () => {
    for (const async of [false, true]) {
        for (const mode of ['pages', 'single', 'fail', 'cycle', 'suggestion', 'object']) {
            const urls = [];
            const http = load('util/utilHttp.js', {}, { $: { ajax: options => {
                urls.push(options.url); assert.equal(options.async, async);
                const respond = () => {
                    const second = options.url.includes('$skiptoken');
                    if (mode === 'fail' && second) return options.error({}, 'error', 'SAP unavailable');
                    options.success({ d: mode === 'object' ? { Value: 42, __metadata: {} } : {
                        results: second ? [{ Material: 'LAST' }] : Array.from({ length: mode === 'single' ? 3 : 5000 }, (_, i) => ({ Material: 'M' + i, __metadata: {} })),
                        __next: ['pages', 'fail', 'cycle', 'suggestion'].includes(mode) && (!second || mode === 'cycle')
                            ? 'https://sap.internal/sap/MaterialsConsultation?$filter=A&$skiptoken=5000' : undefined
                    } });
                };
                if (async) Promise.resolve().then(respond); else respond();
            } } });
            const result = await new Promise(resolve => http[async ? 'ERPGetAsync' : 'ERPGetSync'](
                base + 'MaterialsConsultation?$filter=A&$top=' + (mode === 'suggestion' ? 200 : 900000000), resolve));
            assert.equal(result.iCode, ['fail', 'cycle'].includes(mode) ? -1 : 1);
            assert.equal(urls.length, ['pages', 'fail', 'cycle'].includes(mode) ? 2 : 1);
            assert.ok(urls.every(url => url.startsWith(base)));
            if (mode === 'pages') { assert.equal(result.data.length, 5001); assert.equal(result.data.at(-1).Material, 'LAST'); assert.equal(result.data[0].__metadata, undefined); }
            if (mode === 'object') { assert.equal(result.data.Value, 42); assert.equal(result.data.__metadata, undefined); }
            if (mode === 'suggestion') assert.ok(urls[0].includes('$top=200'));
            else assert.ok(urls[0].includes('$top=900000000'));
        }
    }
    // Reproduce SAP's default of 100 without top and detect non-advancing data.
    for (const async of [false, true]) {
        for (const mode of ['default-size', 'same-page', 'same-cursor']) {
            const urls = [];
            const http = load('util/utilHttp.js', {}, { $: { ajax: options => {
                urls.push(options.url);
                const respond = () => {
                    const q = new URL(options.url, 'https://test').searchParams;
                    const second = q.has('$skiptoken');
                    const count = q.has('$top') ? 5000 : 100;
                    const start = second && mode !== 'same-page' ? 5000 : 0;
                    options.success({ d: {
                        results: Array.from({ length: second && mode === 'default-size' ? 1 : count }, (_, i) => ({ Material: 'M' + (start + i) })),
                        __next: second && mode === 'default-size' ? undefined :
                            'https://sap.internal/sap/MaterialsConsultation?$filter=A&$top=' + (900000000 - urls.length * 5000) +
                            '&$skiptoken=' + (second && mode !== 'same-cursor' ? 10000 : 5000)
                    } });
                };
                if (async) Promise.resolve().then(respond); else respond();
            } } });
            const result = await new Promise(resolve => http[async ? 'ERPGetAsync' : 'ERPGetSync'](base + 'MaterialsConsultation?$filter=A', resolve));
            assert.equal(urls.length, 2);
            assert.equal(result.iCode, mode === 'default-size' ? 1 : -1);
            if (mode === 'default-size') assert.equal(result.data.length, 5001);
        }
    }
    const component = load('Component.js', {
        'sap/ui/core/UIComponent': { extend: (_, methods) => methods },
        'aris/com/clientes/controlstock/pe/services/StockQueryCache': Cache
    });
    const owner = Object.assign({}, component);
    let requests = 0, fail = false;
    const services = load('services/Services.js', { '../util/utilHttp': {
        ERPGetSync: (_, done) => { requests++; done({ iCode: 1, data: [{ Value: requests }] }); },
        ERPGetAsync: (_, done) => { requests++; Promise.resolve().then(() => done({ iCode: fail ? -1 : 1, data: [{ Value: requests }] })); }
    } });
    const controller = { sSalesOrg: '1110', getOwnerComponent: () => owner };
    const read = (entity, async = true, suffix = '') => new Promise(resolve => services[async ? 'getoDataERPAsync' : 'getoDataERPSync'](
        controller, base + entity + '?$filter=SalesOrganization%20eq%20%271110%27' + suffix, resolve));
    const [first, second] = await Promise.all([read('MaterialsConsultation'), read('MaterialsConsultation')]);
    assert.equal(requests, 1, 'share pending requests');
    first.data[0].Value = 999;
    assert.equal(second.data[0].Value, 1);
    await read('MaterialsConsultation', false); assert.equal(requests, 1, 'sync and async share completed catalogs');
    await read('MaterialsConsultation', true, '&$filter=OTHER'); assert.equal(requests, 2, 'different filters query SAP');
    await read('MaterialsConsultation', true, '&$top=200'); assert.equal(requests, 3, 'limited suggestion cannot satisfy full catalog');
    for (const entity of ['I_StockDisponibleSet', 'UsOrve', 'EcreditosSet']) {
        const before = requests;
        await read(entity); await read(entity);
        assert.equal(requests, before + 2, entity + ' must stay fresh');
    }
    fail = true; const before = requests;
    await read('MarMat'); await read('MarMat'); assert.equal(requests, before + 2, 'errors retry');
    fail = false; await read('MarMat'); await read('MarMat'); assert.equal(requests, before + 3);
    controller.sSalesOrg = '1130'; await read('MaterialsConsultation'); assert.equal(requests, before + 4, 'organization change resets cache');
    // Run real batching with >5000 materials and verify no missing final batch.
    let view;
    const viewSource = fs.readFileSync(path.join(root, 'controller/View.controller.js'), 'utf8');
    let stockCalls = 0, failStock = false;
    const mockServices = { getoDataERPAsync: (context, url, done) => {
        stockCalls++;
        if (failStock) return done({ iCode: -1 });
        const query = new URL(url, 'https://test').searchParams.get('$filter');
        const materials = [...query.matchAll(/Materialnumber eq '([^']+)'/g)].map(m => ({ Materialnumber: m[1], Salesorganization: context.sSalesOrg, Plant: '1000' }));
        done({ iCode: 1, data: materials });
    } };
    vm.runInNewContext(viewSource, { sap: { ui: { define: (names, factory) => factory(...names.map(n =>
        n.endsWith('/BaseController') ? { extend: (_, methods) => { view = methods; } } :
        n.endsWith('/Services') ? mockServices : n.endsWith('/util/util') ? { response: { validateAjaxGetERPNotMessage: (r, events) => r.iCode === 1 ? events.success(r) : events.error(r) } } : {})) } },
        jQuery: { sap: { getModulePath: () => '/app' } } });
    const controllerView = { sSalesOrg: '1110', local: false, route: 'stock', _yieldToBrowser: async () => {}, getModel: () => ({ setProperty() {} }) };
    const materials = Array.from({ length: 5001 }, (_, i) => 'M' + i);
    for (const [org, size] of [['1110', 50], ['1120', 30], ['1130', 10]]) {
        controllerView.sSalesOrg = org;
        const before = stockCalls;
        const stock = await view._fetchStockForMaterials.call(controllerView, materials);
        assert.equal(stockCalls - before, Math.ceil(5001 / size));
        assert.equal(stock.length, 5001);
        assert.equal(stock.at(-1).Materialnumber, 'M5000');
    }
    failStock = true;
    await assert.rejects(view._fetchStockForMaterials.call(controllerView, materials), /completar/);
    console.log('PASS: stock sync/async pagination, >5000 rows, proxy, cycles, failures, suggestions, catalog deduplication, organization isolation, fresh stock/permissions and complete batching.');
})().catch(error => { console.error(error); process.exitCode = 1; });
