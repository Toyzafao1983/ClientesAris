const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let Cache, now = 0;
vm.runInNewContext(fs.readFileSync(path.join(root, 'services/CustomerQueryCache.js'), 'utf8'), {
    Date: { now: () => now }, URL,
    sap: { ui: { define: (_, factory) => { Cache = factory(); } } }
});
const plain = value => JSON.parse(JSON.stringify(value));
(async () => {
    const cache = new Cache();
    let calls = 0;
    const load = () => { calls++; return { sEstado: 'S', oResults: [{ Customer: '0001' }] }; };
    const [first, second] = await Promise.all([cache.read('a', load), cache.read('a', load)]);
    assert.equal(calls, 1);
    first.oResults[0].Customer = 'changed';
    assert.equal(second.oResults[0].Customer, '0001');
    assert.equal((await cache.read('a', load)).oResults[0].Customer, '0001');
    assert.equal(calls, 1);
    await cache.read('b', load);
    assert.equal(calls, 2);
    now = 24 * 60 * 60 * 1000;
    await cache.read('a', load);
    assert.equal(calls, 2);
    cache.clear();
    await cache.read('a', load);
    assert.equal(calls, 3);
    await new Cache().read('a', load);
    assert.equal(calls, 4);
    for (let i = 0; i < 2; i++) {
        await cache.read('error', () => { calls++; return { sEstado: 'E', oResults: [] }; });
        await assert.rejects(cache.read('reject', () => { calls++; throw Error('network'); }), /network/);
    }
    assert.equal(calls, 8);
    let release;
    const pending = cache.read('pending', () => new Promise(resolve => { release = resolve; }));
    await Promise.resolve();
    cache.clear();
    release(load());
    await pending;
    await cache.read('pending', load);
    assert.equal(calls, 10, 'cleared pending requests must not repopulate cache');

    // Execute the real controller methods with the real cache shared by three controllers.
    const source = fs.readFileSync(path.join(root, 'controller/BaseController.js'), 'utf8');
    for (const local of [true, false]) {
        const shared = new Cache();
        const urls = [];
        const owner = {
            getManifestObject: () => ({ resolveUri: url => url }),
            getCustomerQuery: (url, loader) => shared.read(url, loader),
            getCustomerCatalog: (...args) => shared.readCatalog(...args)
        };
        const controllers = Array.from({ length: 3 }, () => ({ local, route: 'chemical', getOwnerComponent: () => owner }));
        for (const method of ['_getClientPet', '_getDatClient']) {
            const start = source.indexOf('\t\t' + method + ': function (');
            const end = source.indexOf('\n\t\t},', start);
            const fn = vm.runInNewContext('(function' + source.slice(source.indexOf(': function', start) + 10, end + 4) + ')', {
                jQuery: { sap: { getModulePath: () => '/app' } },
                Services: { getoDataERPSync: (controller, url, callback) => {
                    assert.ok(controllers.includes(controller));
                    urls.push(url);
                    callback({ data: [{ Customer: '0001' }] });
                } },
                util: { response: { validateAjaxGetERPNotMessage: (result, events) => events.success(result) } }
            });
            const before = urls.length;
            for (const customer of [undefined, '0001', "A'B& C"]) {
                const results = await Promise.all(controllers.map(controller => fn.call(controller, customer)));
                assert.equal(results[0].sEstado, 'S');
                assert.deepEqual(plain(results[0].oResults), customer && customer !== '0001' ? [] : [{ Customer: '0001' }]);
                results[0].oResults.length = 0;
                assert.equal(results[1].oResults.length, customer && customer !== '0001' ? 0 : 1);
                const filter = new URL(urls.at(-1), 'https://test').searchParams.get('$filter');
                assert.ok(!filter.includes('Customer eq'), 'filtered result must reuse the catalog');
                assert.equal(urls.at(-1).startsWith('/app/S4HANA/'), !local);
            }
            assert.equal(urls.length - before, 1, 'one catalog request across three controllers and customer filters');
        }
    }
    // FormClient -> Detail keeps the rate even across midnight; a new flow renews it.
    for (const local of [true, false]) {
        const shared = new Cache();
        let day = 1;
        const urls = [];
        const rate = { FromCurr: 'USD', ToCurrncy: 'PEN', ExchRate: '3.75', ExchRateV: '0.26667' };
        let component;
        vm.runInNewContext(fs.readFileSync(path.join(root, 'Component.js'), 'utf8'), {
            Date: class extends Date { constructor(...args) { super(...(args.length ? args : [2026, 8, day, 12])); } },
            sap: { ui: { define: (_, factory) => {
                component = factory({ extend: (_, methods) => methods }, {}, Cache);
            } } }
        });
        const owner = Object.assign({}, component, {
            _customerQueryCache: shared,
            getManifestObject: () => ({ resolveUri: url => url })
        });
        const start = source.indexOf('\t\t_getTipChangeData: function (');
        const end = source.indexOf('\n\t\t},', start);
        const fn = vm.runInNewContext('(function' + source.slice(source.indexOf(': function', start) + 10, end + 4) + ')', {
            Date: class extends Date { constructor() { super(2026, 8, day, 12); } },
            jQuery: { sap: { getModulePath: () => '/app' } },
            Services: { getoDataERPSync: (_, url, callback) => { urls.push(url); callback({ data: rate }); } },
            util: { response: { validateAjaxGetERPNotMessage: (result, events) => events.success(result) } }
        });
        const form = { local, route: 'chemical', getOwnerComponent: () => owner };
        const detail = { ...form };
        const results = await Promise.all([fn.call(form), fn.call(detail)]);
        assert.equal(urls.length, 1);
        assert.deepEqual(plain(results[1].oResults), rate);
        results[0].oResults.ExchRate = 'changed';
        assert.equal((await fn.call(detail)).oResults.ExchRate, '3.75');
        assert.equal(urls.length, 1);
        day++;
        await fn.call(detail);
        assert.equal(urls.length, 1, 'midnight does not refresh an active order');
        owner.clearCustomerQueries();
        await fn.call(detail);
        assert.equal(urls.length, 2);
        assert.ok(urls[1].includes("Date=datetime'2026-09-02T00:00:00'"));
        assert.equal(urls[1].startsWith('/app/S4HANA/'), !local);
        now += 300000;
        await fn.call(detail);
        assert.equal(urls.length, 2);
    }
    const main = fs.readFileSync(path.join(root, 'controller/Main.controller.js'), 'utf8');
    assert.ok(!main.includes('_getTipChangeData('), 'Main must not request the exchange rate');
    for (const local of [true, false]) {
        const shared = new Cache();
        const urls = [], properties = {};
        const owner = {
            getManifestObject: () => ({ resolveUri: url => url }),
            getCustomerQuery: (url, loader) => shared.read(url, loader)
        };
        const controllers = Array.from({ length: 3 }, () => ({
            local, route: 'chemical', getOwnerComponent: () => owner,
            getView: () => ({ getModel: () => ({ setProperty: (key, value) => { properties[key] = value; } }) })
        }));
        const vendors = [{ usuario: 'SELLER', orgventas: '1120', perfil: 'VD' }];
        const brands = [
            { Brand: 'Q', DscBrand: 'Chemical', org_ventas: '1120' },
            { Brand: 'Q', DscBrand: 'Duplicate', org_ventas: '1120' },
            { Brand: 'T', DscBrand: 'Textile', org_ventas: '1110' },
            { Brand: 'C', DscBrand: 'Ceramic', org_ventas: '1130' },
            { Brand: '', DscBrand: 'Empty', org_ventas: '1120' }
        ];
        for (const method of ['_getBPVendedor', '_getDescriptionMaterial']) {
            const start = source.indexOf('\t\t' + method + ': function (');
            const end = source.indexOf('\n\t\t},', start);
            const fn = vm.runInNewContext('(function' + source.slice(source.indexOf(': function', start) + 10, end + 4) + ')', {
                jQuery: { sap: { getModulePath: () => '/app' } },
                Services: { getoDataERPSync: (_, url, callback) => {
                    urls.push(url);
                    callback({ data: method === '_getBPVendedor' ? vendors : brands });
                } },
                util: { response: { validateAjaxGetERPNotMessage: (result, events) => events.success(result) } }
            });
            if (method === '_getBPVendedor') {
                const result = await Promise.all(controllers.map(controller => fn.call(controller)));
                assert.equal(urls.length, 1, 'UsOrve shared across Main, FormClient and Detail');
                assert.deepEqual(plain(result[2].oResults), vendors);
                await fn.call(controllers[0], 'SELLER');
                assert.equal(urls.length, 1, 'Main access lookup reuses catalog');
            } else {
                const result = await fn.call(controllers[2]);
                const query = new URL(urls.at(-1), 'https://test').searchParams;
                assert.equal(query.get('$filter'), "org_ventas eq '1120'");
                assert.equal(query.get('$top'), '10000');
                assert.deepEqual(plain(result.oResults), [brands[0]]);
                assert.deepEqual(plain(properties['/ListBrand']), [brands[0]]);
                assert.deepEqual(plain(properties['/ListBrandSug']), [brands[0]]);
            }
            assert.equal(urls.at(-1).startsWith('/app/S4HANA/'), !local);
        }
    }
    for (const local of [true, false]) {
        const shared = new Cache();
        const urls = [];
        let fail = false;
        const owner = {
            getManifestObject: () => ({ resolveUri: url => url }),
            getCustomerQuery: (url, loader) => shared.read(url, loader)
        };
        const rows = [{ Customer: '0001', Agencyname: 'Agency', Agencyaddress: 'Street',
            Carrier: 'C1', Destinationid: 'D1', Destination: 'Destination',
            Shippingdestinationid: 'D1', Shippingdestination: 'Duplicate',
            Finaldestinationid: 'F1', Finaldestination: 'Final' }];
        function controller() {
            const properties = {};
            const user = { '/bIsVendedor': true, '/bBPFinal': 'SELLER1' };
            return { local, route: 'chemical', properties, user,
                getOwnerComponent: () => owner,
                getModel: () => ({ getProperty: key => user[key] }),
                getView: () => ({ getModel: () => ({ setProperty: (key, value) => { properties[key] = value; } }) })
            };
        }
        const start = source.indexOf('\t\t_getAddresTravel: function (');
        const end = source.indexOf('\n\t\t},', start);
        const fn = vm.runInNewContext('(function' + source.slice(source.indexOf(': function', start) + 10, end + 4) + ')', {
            jQuery: { sap: { getModulePath: () => '/app' } },
            Services: { getoDataERPSync: (_, url, callback) => { urls.push(url); callback({ data: { results: rows } }); } },
            util: { response: { validateAjaxGetERPNotMessage: (result, events) => fail ? events.error() : events.success(result) } }
        });
        const form = controller(), detail = controller();
        const first = await fn.call(form, '0001');
        form.properties['/oAgenciasCliente'][0].Agencyaddress = 'edited';
        first.oResults[0].Destination = 'edited';
        const second = await fn.call(detail, '0001');
        assert.equal(urls.length, 1);
        assert.equal(second.oResults[0].Destination, 'Destination');
        assert.equal(detail.properties['/oAgenciasCliente'][0].Agencyaddress, 'Street');
        assert.equal(detail.properties['/oAgenciasCliente'][0].Carrier, 'C1');
        assert.equal(detail.properties['/oDestinosCliente'].length, 1);
        assert.equal(detail.properties['/oFinalDestinosCliente'][0].Id, 'F1');
        assert.equal(new URL(urls[0], 'https://test').searchParams.get('$filter'),
            "Customer eq '0001' and SalesOrganization eq '1120' and SalesPartner eq 'SELLER1'");
        assert.equal(urls[0].startsWith('/app/S4HANA/'), !local);
        await fn.call(detail, '0002');
        assert.equal(urls.length, 2);
        detail.user['/bBPFinal'] = "S'2&";
        await fn.call(detail, '0002');
        assert.equal(urls.length, 3);
        assert.ok(new URL(urls.at(-1), 'https://test').searchParams.get('$filter').endsWith("SalesPartner eq 'S''2&'"));
        detail.user['/bIsVendedor'] = false;
        await fn.call(detail, '0002');
        assert.equal(urls.length, 4);
        assert.ok(!new URL(urls.at(-1), 'https://test').searchParams.get('$filter').includes('SalesPartner'));
        assert.equal((await fn.call(detail, '')).sEstado, 'E');
        assert.equal(urls.length, 4);
        now += 300000;
        await fn.call(detail, '0002');
        assert.equal(urls.length, 4, 'elapsed time does not refresh addresses');
        shared.clear();
        fail = true;
        assert.equal((await fn.call(detail, '0002')).sEstado, 'E');
        fail = false;
        assert.equal((await fn.call(detail, '0002')).sEstado, 'S');
        assert.equal(urls.length, 6);
    }
    // Run Main's actual entry sequence up to the initial requests.
    const flowCache = new Cache();
    let flowLoads = 0;
    const loadFlow = () => { flowLoads++; return { sEstado: 'S', oResults: [] }; };
    await flowCache.read('catalog', loadFlow);
    const flowController = {
        getOwnerComponent: () => ({ clearCustomerQueries: () => flowCache.clear() }),
        getView: () => ({ setVisible() {} })
    };
    const entryStart = main.indexOf('handleRouteMatched: function (bInit) {');
    const entryBody = main.slice(main.indexOf('{', entryStart) + 1, main.indexOf('return Promise.all', entryStart));
    vm.runInNewContext('(function () {' + entryBody + '}).call(that)', {
        that: flowController, sap: { ui: { core: { BusyIndicator: { show() {} } } } }
    });
    await flowCache.read('catalog', loadFlow);
    assert.equal(flowLoads, 2, 'entering Main resets data before the new flow loads');
    await flowCache.read('catalog', loadFlow);
    assert.equal(flowLoads, 2, 'navigation inside the flow reuses data');
    console.log('PASS: deduplication, copies, no time expiry, flow reset, isolation, retries and real controller queries across local/deployed routes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
