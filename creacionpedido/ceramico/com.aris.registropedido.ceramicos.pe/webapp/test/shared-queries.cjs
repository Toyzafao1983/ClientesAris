const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let Cache;
vm.runInNewContext(fs.readFileSync(path.join(root, 'services/CustomerQueryCache.js'), 'utf8'), { sap: { ui: { define: (_, f) => { Cache = f(); } } } });
const source = fs.readFileSync(path.join(root, 'controller/BaseController.js'), 'utf8');
(async () => {
for (const local of [true, false]) {
    const cache = new Cache(), urls = []; let fail = false, day = 1, owner;
    vm.runInNewContext(fs.readFileSync(path.join(root, 'Component.js'), 'utf8'), {
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : [2026, 9, day])); } },
        sap: { ui: { define: (_, f) => { owner = f({ extend: (_, obj) => obj }, {}, Cache); } } }
    });
    Object.assign(owner, { _customerQueryCache: cache, getManifestObject: () => ({ resolveUri: u => u }) });
    const rows = [{ Customer: '0001', Agencyname: 'Agency', Agencyaddress: 'Street', Destinationid: 'D1', Destination: 'Destination', Finaldestinationid: 'F1', Finaldestination: 'Final', ReasonRequest: 'Z01' }, { Customer: '0001', ReasonRequest: 'ZT4' }];
    const context = {
        jQuery: { sap: { getModulePath: () => '/app' } },
        Services: { getoDataERPSync: (_, url, cb) => {
            urls.push(url); assert.equal(url.startsWith('/app/S4HANA/'), !local);
            cb({ data: JSON.parse(JSON.stringify(rows)) });
        } },
        util: { response: { validateAjaxGetERPNotMessage: (r, c) => fail ? c.error() : c.success(r) } }
    };
    function method(name) {
        const a = source.indexOf(name + ': function'), b = source.indexOf('\n\t\t},', a);
        return vm.runInNewContext('(' + source.slice(a + name.length + 2, b + 4) + ')', context);
    }
    function controller() {
        const properties = {};
        return { local, route: 'ceramic', properties, getOwnerComponent: () => owner,
            _readOrderERP: method('_readOrderERP'), _getDatClient: method('_getDatClient'),
            getView: () => ({ getModel: () => ({ setProperty: (key, value) => { properties[key] = value; } }) }) };
    }
    const form = controller(), detail = controller();
    for (const name of ['_getBPVendedor', '_getCOnditionPay', '_getAddresTravel', '_getTipMaterialData', '_getDescriptionMaterial', '_getTipDocumentData', '_getPrincipalSeller', '_getReason', '_getTipChangeData']) {
        owner.clearCustomerQueries();
        const fn = method(name), arg = name === '_getReason' ? 'ZGNA' : '0001', before = urls.length;
        if (name === '_getReason') {
            assert.equal((await fn.call(form, 'ZPES')).oResults.length, 0);
            assert.equal((await fn.call(form)).oResults.length, 0); assert.equal(urls.length, before);
        }
        const [a, b] = await Promise.all([fn.call(form, arg), fn.call(detail, arg)]);
        assert.equal(urls.length, before + 1, name);
        const first = r => name === '_getPrincipalSeller' ? r.oResults : r.oResults[0];
        first(a).Customer = 'edited'; assert.equal(first(b).Customer, '0001');
        assert.equal(first(await fn.call(detail, arg)).Customer, '0001'); assert.equal(urls.length, before + 1);
        if (name === '_getReason') {
            assert.equal(a.oResults.length, 1);
            assert.equal(new URL(urls.at(-1), 'https://test').searchParams.get('$filter'), "SalesDocumentClass eq 'ZGNA'");
        }
        if (name === '_getAddresTravel') {
            form.properties['/oAgenciasCliente'][0].Agencyaddress = 'edited';
            await fn.call(detail, arg);
            assert.equal(detail.properties['/oAgenciasCliente'][0].Agencyaddress, 'Street');
            assert.equal(detail.properties['/oDestinosCliente'][0].Id, 'D1');
            assert.equal(detail.properties['/oFinalDestinosCliente'][0].Id, 'F1');
            await fn.call(detail, '0002'); assert.equal(urls.length, before + 2);
        }
        if (name === '_getTipChangeData') { day = 2; await fn.call(detail); assert.equal(urls.length, before + 1); }
        owner.clearCustomerQueries(); fail = true;
        assert.equal((await fn.call(form, arg)).sEstado, 'E'); fail = false;
        assert.equal((await fn.call(detail, arg)).sEstado, 'S');
        if (name === '_getTipChangeData') assert.ok(urls.at(-1).includes('2026-10-02'));
    }
    owner.clearCustomerQueries(); const count = urls.length;
    await form._getDatClient();
    const [a, b] = await Promise.all([detail._getDatClient('0001'), method('_getDatClientView').call(detail, '0001')]);
    assert.equal(urls.length, count + 1); assert.equal(a.oResults.length, 2); assert.equal(b.oResults.length, 2);
    const filter = new URL(urls.at(-1), 'https://test').searchParams.get('$filter');
    assert.ok(filter.includes("SalesOrganization eq '1130'")); assert.ok(filter.includes("DistributionChannel eq 'C1'")); assert.ok(filter.includes('CustomerDni'));
}
console.log('PASS: ceramic shared queries, customer aliases, independent address lists, ZGNA-only reasons, reset, retries and date retention in local/S4HANA.');
})().catch(e => { console.error(e); process.exitCode = 1; });
