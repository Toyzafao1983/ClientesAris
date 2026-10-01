const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let Cache;
vm.runInNewContext(fs.readFileSync(path.join(root, 'services/CustomerQueryCache.js'), 'utf8'), { sap: { ui: { define: (_, f) => { Cache = f(); } } } });
const source = fs.readFileSync(path.join(root, 'controller/BaseController.js'), 'utf8');
(async () => {
for (const local of [true, false]) for (const name of ['_getReason', '_getPrincipalSeller', '_getPortEmbarkation']) {
    const cache = new Cache(), urls = []; let fail = false;
    const owner = { getCustomerQuery: (u, f) => cache.read(u, f), getManifestObject: () => ({ resolveUri: u => u }) };
    const form = { local, route: 'textile', getOwnerComponent: () => owner }, detail = { ...form };
    const a = source.indexOf(name + ': function'), b = source.indexOf('\n\t\t},', a);
    const fn = vm.runInNewContext('(' + source.slice(a + name.length + 2, b + 4) + ')', {
        jQuery: { sap: { getModulePath: () => '/app' } },
        Services: { getoDataERPSync: (_, url, cb) => {
            urls.push(url); assert.equal(url.startsWith('/app/S4HANA/'), !local);
            cb({ data: [{ Customer: '0001', ReasonRequest: 'Z01', LocNo: 'P1', Description: 'original' }, { ReasonRequest: 'ZT4' }] });
        } },
        util: { response: { validateAjaxGetERPNotMessage: (r, c) => fail ? c.error() : c.success(r) } }
    });
    const arg = name === '_getPrincipalSeller' ? '0001' : undefined;
    const [first, second] = await Promise.all([fn.call(form, arg), fn.call(detail, arg)]);
    assert.equal(urls.length, 1);
    const row = r => name === '_getPrincipalSeller' ? r.oResults : r.oResults[0];
    row(first).Description = 'edited'; assert.equal(row(second).Description, 'original');
    await fn.call(detail, arg); assert.equal(urls.length, 1);
    if (name === '_getReason') {
        assert.equal(first.oResults.length, 1, 'ZT4 excluded');
        await fn.call(form, 'ZPES'); await fn.call(detail, 'ZPES'); await fn.call(detail);
        assert.equal(urls.length, 2, 'general, filtered, general sequence only sends two requests');
        assert.equal(new URL(urls[1], 'https://test').searchParams.get('$filter'), "SalesDocumentClass eq 'ZPES'");
        await fn.call(detail, 'ZCNA'); assert.equal(urls.length, 3);
    }
    if (name === '_getPrincipalSeller') {
        await fn.call(detail, '0002'); assert.equal(urls.length, 2);
    }
    if (name === '_getPortEmbarkation') {
        assert.equal(second.oResults.length, 1); assert.equal(second.oResults[0].sKey, 'P1');
    }
    cache.clear(); const count = urls.length; fail = true;
    assert.equal((await fn.call(form, arg)).sEstado, 'E'); fail = false;
    assert.equal((await fn.call(detail, arg)).sEstado, 'S'); assert.equal(urls.length, count + 2);
}
console.log('PASS: Reason filters and ZT4, seller per customer, port normalization, concurrent reuse, copies, reset and retries in local/S4HANA.');
})().catch(e => { console.error(e); process.exitCode = 1; });
