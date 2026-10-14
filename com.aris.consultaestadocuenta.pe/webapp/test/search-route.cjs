const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../controller/Main.controller.js'), 'utf8');
(async () => {
    for (const [site, organization] of [['textiles', '1110'], ['quimicos', '1120'], ['ceramicos', '1130']]) {
        for (const local of [true, false]) for (const fail of [false, true]) {
            let controller;
            const urls = [];
            const deps = {
                'com/aris/consultaestadocuenta/pe/controller/BaseController': { extend: (_, methods) => methods },
                'com/aris/consultaestadocuenta/pe/services/Services': { getoDataERPSync: (_, url, done) => { urls.push(url); done({ fail, data: [{ Customer: 'A' }] }); } },
                'com/aris/consultaestadocuenta/pe/util/util': { response: { validateAjaxGetERPNotMessage: (response, handlers) => response.fail ? handlers.error('failed') : handlers.success(response) } }
            };
            vm.runInNewContext(source, {
                window: { parent: { location: { href: 'https://launchpad/site-' + site } } },
                jQuery: { proxy: fn => fn, sap: { getModulePath: name => { assert.equal(name, 'com.aris.consultaestadocuenta.pe'); return '/account'; } } },
                sap: { ui: { core: { UIComponent: { getRouterFor: () => ({ getTarget: () => ({ attachDisplay() {} }) }) } },
                    define: (names, factory) => { controller = factory(...names.map(name => deps[name] || {})); } } }
            });
            const context = Object.assign({}, controller, { local, route: 'com.aris.consultaestadocuenta.pe',
                getModel: () => ({ setProperty() {} }), getOwnerComponent: () => ({ getManifestObject: () => ({ resolveUri: uri => '/local' + uri }) }) });
            controller.onInit.call(context);
            const result = await controller._getData.call(context);
            assert.equal(urls.length, 1);
            const url = new URL(urls[0], 'https://account.invalid');
            assert.equal(url.pathname, (local ? '/local' : '/account/S4HANA') + '/sap/opu/odata/sap/ZSDB_PORTALCLIENTES/Customer');
            assert.ok(url.searchParams.get('$filter').includes("SalesOrganization eq '" + organization + "'"));
            assert.equal(result.sEstado, fail ? 'E' : 'S');
            assert.equal(result.oResults.length, fail ? 0 : 1);
        }
    }
    console.log('PASS: account search uses its own Customer route and business unit in local/production; errors return empty results.');
})().catch(error => { console.error(error); process.exitCode = 1; });
