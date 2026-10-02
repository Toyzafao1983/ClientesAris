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
                    ? Array.from({ length: 100000 }, (_, i) => ({ Customer: 'OTHER' + i }))
                    : [{ Customer: '0001', Channel: 'C1' }, { Customer: '0001', Channel: 'C2' }];
                const http = moduleFrom('util/utilHttp.js', {}, { $: { ajax: options => {
                    urls.push(options.url);
                    const query = new URL(options.url, 'https://test').searchParams;
                    assert.equal(query.get('$top'), '100000');
                    assert.equal(query.has('$skiptoken'), false, 'no automatic pagination');
                    if (fail) return options.error({}, 'error', 'SAP unavailable');
                    const filtered = query.get('$filter').includes('Customer eq');
                    options.success({ d: {
                        results: filtered ? [{ Customer: 'DIRECT' }] : rows,
                        __next: !filtered && mode === 'continuation' ? '?$skiptoken=page2' : undefined
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
                assert.equal(urls.length, 1, 'exactly one initial request even with continuation');
                assert.equal(catalog.complete, mode === 'complete');
                assert.equal(urls[0].startsWith('/app/S4HANA/'), !local);
                const [first, second] = await Promise.all([call.call(controller, '0001'), call.call(controller, '0001')]);
                assert.equal(urls.length, mode === 'complete' ? 1 : 2);
                assert.deepEqual(plain(first.oResults), mode === 'complete' ? rows : [{ Customer: 'DIRECT' }]);
                first.oResults[0].Customer = 'edited';
                assert.notEqual(second.oResults[0].Customer, 'edited');
                await call.call(controller, '0001');
                assert.equal(urls.length, mode === 'complete' ? 1 : 2, 'reuse local or fallback result');
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
                assert.equal(urls.length, before + 3, 'failed requests can be retried');
            }
        }
    }
    console.log('PASS: one initial block with top=100000, no continuation requests, local filtering, copies, incomplete catalog fallback, direct entry, reset and retries in local/S4HANA routes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
