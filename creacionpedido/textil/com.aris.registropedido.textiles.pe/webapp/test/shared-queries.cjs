const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let Cache;
vm.runInNewContext(fs.readFileSync(path.join(root, 'services/CustomerQueryCache.js'), 'utf8'), { sap: { ui: { define: (_, f) => { Cache = f(); } } } });
const source = fs.readFileSync(path.join(root, 'controller/BaseController.js'), 'utf8');
(async () => {
for (const local of [true, false]) {
    const cache = new Cache(), urls = [], deliveries = [];
    let fail = false, day = 1, owner;
    vm.runInNewContext(fs.readFileSync(path.join(root, 'Component.js'), 'utf8'), {
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : [2026, 9, day])); } },
        sap: { ui: { define: (_, f) => { owner = f({ extend: (_, obj) => obj }, {}, Cache); } } }
    });
    Object.assign(owner, { _customerQueryCache: cache, getManifestObject: () => ({ resolveUri: u => u }) });
    function controller(type) { return { local, route: 'textile', getOwnerComponent: () => owner,
        getView: () => ({ getModel: () => ({ getProperty: () => type, setProperty() {} }) }),
        _setDeliveryAddressData: (rows, delivery) => deliveries.push({ rows, delivery }) }; }
    const form = controller('A'), detail = controller('B');
    form._getDatClient = detail._getDatClient = method('_getDatClient');
    function method(name) {
        const a = source.indexOf(name + ': function'), b = source.indexOf('\n\t\t},', a);
        return vm.runInNewContext('(' + source.slice(a + name.length + 2, b + 4) + ')', {
            jQuery: { sap: { getModulePath: () => '/app' } },
            Services: { getoDataERPSync: (_, url, cb) => {
                urls.push(url);
                assert.equal(url.startsWith('/app/S4HANA/'), !local);
                cb({ data: [{ Customer: '0001', marker: 'original' }] });
            } },
            util: { response: { validateAjaxGetERPNotMessage: (r, c) => fail ? c.error('failure') : c.success(r) } }
        });
    }
    for (const name of ['_getBPVendedor', '_getCOnditionPay', '_getDatClientView', '_getAddresTravel', '_getTipChangeData']) {
        owner.clearCustomerQueries();
        const fn = method(name), before = urls.length;
        const [a, b] = await Promise.all([fn.call(form, '0001'), fn.call(detail, '0001')]);
        assert.equal(urls.length, before + 1, name + ': simultaneous request shared');
        a.oResults[0].marker = 'edited';
        assert.equal(b.oResults[0].marker, 'original');
        assert.equal((await fn.call(detail, '0001')).oResults[0].marker, 'original');
        assert.equal(urls.length, before + 1);
        if (name === '_getDatClientView') {
            const query = new URL(urls.at(-1), 'https://test').searchParams;
            assert.equal(query.get('$top'), '100000');
            assert.ok(!query.get('$filter').includes('CustomerDni'));
            await fn.call(detail, '0002'); assert.equal(urls.length, before + 2);
        }
        if (name === '_getAddresTravel') {
            assert.equal(deliveries[0].delivery, 'A'); assert.equal(deliveries[1].delivery, 'B');
            assert.equal(deliveries[1].rows[0].marker, 'original');
            assert.ok(urls.at(-1).includes("SalesOrganization eq '1110'"));
        }
        if (name === '_getTipChangeData') {
            day = 2; await fn.call(detail); assert.equal(urls.length, before + 1);
        }
        owner.clearCustomerQueries(); fail = true;
        assert.equal((await fn.call(form, '0001')).sEstado, 'E');
        fail = false;
        assert.equal((await fn.call(detail, '0001')).sEstado, 'S');
        if (name === '_getTipChangeData') assert.ok(urls.at(-1).includes('2026-10-02'));
    }
    owner.clearCustomerQueries();
    const before = urls.length;
    await method('_getDatClient').call(form);
    await method('_getDatClientView').call(detail, '0001');
    assert.equal(urls.length, before + 1, 'customer view reuses the complete catalog');
    assert.ok(!new URL(urls[before], 'https://test').searchParams.get('$filter').includes('CustomerDni'));
    await method('_getDescriptionMaterial').call(detail);
    assert.equal(new URL(urls.at(-1), 'https://test').searchParams.get('$filter'), "org_ventas eq '1110'");
}
console.log('PASS: textile shared queries, delivery types, shared customer catalog, retries, copies, date reset and MarMat in local/S4HANA.');
})().catch(e => { console.error(e); process.exitCode = 1; });
