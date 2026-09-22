// Execute the real request builders with a mocked transport; no SAP connection needed.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
process.chdir(path.join(__dirname, '..'));

(async () => {
    const paths = [
        'creacionpedido/textil/com.aris.registropedido.textiles.pe',
        'creacionpedido/quimico/com.aris.registropedido.quimico.pe',
        'creacionpedido/ceramico/com.aris.registropedido.ceramicos.pe'
    ].map(p => p + '/webapp/controller/BaseController.js');
    let count = 0;
    for (const path of paths) {
        const source = fs.readFileSync(path, 'utf8');
        for (const method of ['_getClientPet', '_getDatClient']) {
            const start = source.indexOf('\t\t' + method + ': function (');
            assert.ok(start >= 0, path + ': ' + method);
            const end = source.indexOf('\n\t\t},', start);
            const fn = source.slice(source.indexOf(': function', start) + ': function'.length, end + 4);
            for (const local of [true, false]) {
                for (const customer of [undefined, '', '0000123456', "A'B& C"]) {
                    let url;
                    const expectedRows = [{ Customer: customer }];
                    const context = {
                        that: { local, route: 'test', getOwnerComponent: () => ({
                            getManifestObject: () => ({ resolveUri: p => p })
                        }) },
                        jQuery: { sap: { getModulePath: () => '/app' } },
                        Services: { getoDataERPSync: (_, path, callback) => {
                            url = path;
                            callback({ data: expectedRows });
                        } },
                        util: { response: { validateAjaxGetERPNotMessage: (result, callbacks) => callbacks.success(result) } }
                    };
                    const call = vm.runInNewContext('(function' + fn + ')', context);
                    const result = await call(customer);
                    const query = new URL(url, 'https://example.test').searchParams;
                    const filter = query.get('$filter');
                    assert.match(filter, /SalesOrganization eq '11[123]0'/);
                    if (customer) {
                        assert.ok(filter.endsWith(" and Customer eq '" + customer.replace(/'/g, "''") + "'"));
                    } else {
                        assert.ok(!filter.includes('Customer eq'));
                    }
                    assert.equal(query.get('$format'), 'json');
                    assert.equal(url.startsWith('/app/S4HANA/'), !local);
                    assert.equal(result.sEstado, 'S');
                    assert.equal(result.oResults, expectedRows);
                    count++;
                }
            }
        }
    }
    assert.equal(paths.length, 3);
    console.log(`${count} checks passed: customer filtering, catalog compatibility, escaping, local and deployed routes.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
