const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
function moduleFrom(file, deps = {}, globals = {}) {
    let result;
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
        URL, ...globals,
        sap: { ui: { define: (names, factory) => { result = factory(...names.map(name => deps[name] || {})); } } }
    });
    return result;
}
const Cache = moduleFrom('services/CustomerQueryCache.js');
const source = fs.readFileSync(path.join(root, 'controller/BaseController.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
(async () => {
    for (const local of [true, false]) {
        for (const method of ['_getClientPet', '_getDatClient']) {
            for (const mode of ['complete', 'continuation', 'limit']) {
                const urls = [];
                let fail = false;
                const rows = mode === 'limit'
                    ? Array.from({ length: 100001 }, (_, i) => ({ Customer: '0001', Row: i }))
                    : [{ Customer: '0001', Channel: 'C1' }, { Customer: '0001', Channel: 'C2' }];
                const http = moduleFrom('util/utilHttp.js', {}, { $: { ajax: options => {
                    urls.push(options.url);
                    const query = new URL(options.url, 'https://test').searchParams;
                    assert.ok(Number(query.get('$top')) > 200);
                    assert.equal(options.url.startsWith('/app/S4HANA/'), !local, 'continuations preserve proxy');
                    if (fail) return options.error({}, 'error', 'SAP unavailable');
                    const filtered = (query.get('$filter') || '').includes('Customer eq');
                    options.success({ d: {
                        results: filtered ? [{ Customer: 'DIRECT' }] : query.has('$skiptoken') ? [{ Customer: 'PAGE2', Seller: 'Vendedor segunda pagina' }] : rows,
                        __next: !filtered && !query.has('$skiptoken') && mode === 'continuation' ? 'https://sap.internal/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/DataCustomer?$skiptoken=page2' : undefined
                    } });
                } } });
                const component = moduleFrom('Component.js', {
                    'sap/ui/core/UIComponent': { extend: (_, methods) => methods },
                    'com/aris/registropedido/ceramicos/pe/services/CustomerQueryCache': Cache
                });
                const owner = Object.assign({}, component, {
                    _customerQueryCache: new Cache(),
                    getManifestObject: () => ({ resolveUri: url => url })
                });
                const controller = { local, route: 'ceramic', getOwnerComponent: () => owner };
                const start = source.indexOf('\t\t' + method + ': function (');
                const end = source.indexOf('\n\t\t},', start);
                const call = vm.runInNewContext('(function' + source.slice(source.indexOf(': function', start) + 10, end + 4) + ')', {
                    jQuery: { sap: { getModulePath: () => '/app' } },
                    Services: { getoDataERPSync: (_, url, callback) => http.ERPGetSync(url, callback) },
                    util: { response: { validateAjaxGetERPNotMessage: (result, events) =>
                        result.iCode === 1 ? events.success(result) : events.error(result) } }
                });
                const catalog = await call.call(controller);
                const pages = mode === 'continuation' ? 2 : 1;
                assert.equal(urls.length, pages);
                assert.equal(catalog.oResults.length, rows.length + pages - 1);
                if (pages === 2) assert.equal(catalog.oResults.at(-1).Seller, 'Vendedor segunda pagina');
                assert.equal(catalog.complete, true);
                assert.equal(urls[0].startsWith('/app/S4HANA/'), !local);
                const [first, second] = await Promise.all([call.call(controller, '0001'), call.call(controller, '0001')]);
                assert.equal(urls.length, pages);
                assert.deepEqual(plain(first.oResults), rows);
                first.oResults[0].Customer = 'edited';
                assert.notEqual(second.oResults[0].Customer, 'edited');
                await call.call(controller, '0001');
                assert.equal(urls.length, pages, 'reuse local or fallback result');
                if (mode === 'complete') {
                    assert.equal((await call.call(controller, 'MISSING')).oResults.length, 0);
                    assert.equal(urls.length, 1);
                }
                owner.clearCustomerQueries();
                const before = urls.length;
                assert.equal((await call.call(controller, 'DIRECT')).oResults[0].Customer, 'DIRECT');
                assert.equal(urls.length, before + 1, 'direct entry only loads its customer');
                owner.clearCustomerQueries();
                fail = true;
                assert.equal((await call.call(controller)).sEstado, 'E');
                fail = false;
                assert.equal((await call.call(controller)).sEstado, 'S');
                assert.equal(urls.length, before + 2 + pages, 'failed requests can be retried');
            }
        }
    }
    // A failed later page must discard partial rows and allow a full retry.
    const cache = new Cache();
    const initial = '/app/S4HANA/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer?$format=json';
    let broken = true;
    const load = async url => url.includes('$skiptoken')
        ? (broken ? { sEstado: 'E', oResults: [] } : { sEstado: 'S', oResults: [{ Customer: 'SECOND' }] })
        : { sEstado: 'S', oResults: [{ Customer: 'FIRST' }], next: '?$skiptoken=2' };
    assert.equal((await cache.readCatalog(initial, initial, null, load)).sEstado, 'E');
    broken = false;
    assert.equal((await cache.readCatalog(initial, initial, null, load)).oResults.length, 2);
    const looping = new Cache();
    const cycle = await looping.readCatalog(initial, initial, null, async () => ({
        sEstado: 'S', oResults: [{ Customer: 'PARTIAL' }], next: '?$skiptoken=2'
    }));
    assert.equal(cycle.sEstado, 'E');
    assert.equal(cycle.oResults.length, 0);
    console.log('PASS: complete pagination preserving top, proxy preservation, local filtering, copies, direct entry, reset and retries in local/S4HANA routes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
