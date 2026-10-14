const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let rows = [];
function load(file, dependencies = {}) {
    let module;
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
        Date, window: { location: { href: 'https://launchpad/' } }, jQuery: { sap: { getModulePath: () => '/app' } },
        sap: { ui: { define: (names, factory) => { module = factory(...names.map(name => dependencies[name] || {})); } } }
    });
    return module;
}
const base = load('controller/BaseController.js', { 'sap/ui/core/mvc/Controller': { extend: (_, methods) => methods } });
const prefix = 'aris/com/clientes/seguimiento/pe/';
const controller = load('controller/View.controller.js', {
    [prefix + 'controller/BaseController']: { extend: (_, methods) => Object.assign({}, base, methods) },
    [prefix + 'services/Services']: { getoDataERPSync: (_, url, callback) => callback({ data: rows }) },
    [prefix + 'util/util']: { response: { validateAjaxGetERPNotMessage: (result, handlers) => handlers.success(result) } }
});
const order = (doc, customer, date, vendor = 'V1') => ({ SalesDocument: doc, Customer: customer,
    SalesDocumentDate: '/Date(' + Date.parse(date + 'T00:00:00Z') + ')/', VendorID: vendor });
rows = [order('START', 'A', '2026-09-14'), order('END', 'A', '2026-10-14'),
    order('BEFORE', 'A', '2026-09-13'), order('AFTER', 'A', '2026-10-15'), order('OTHER', 'B', '2026-10-14', 'V2')];
(async () => {
    for (const organization of ['1110', '1120', '1130']) {
        let filters;
        const context = Object.assign({}, controller, {
            sSalesOrg: organization, route: 'tracking',
            formatDate: date => date ? date.toISOString().slice(0, 10) : '',
            getModel: () => ({ getProperty: () => filters }),
            // Searches must preserve selections, including ones with no results.
            byId: () => { throw new Error('Search attempted to alter selected tokens'); },
            _canShowModificarPedido: () => false,
            _getEstadoGeneral: async () => ({ sEstado: 'S', oResults: [] })
        });
        const search = async (criteria, expected) => {
            filters = Object.assign({ dStartDate: new Date(2026, 8, 14), dEndDate: new Date(2026, 9, 14),
                cbCliente: [], cbDocumento: [], cbVendor: [] }, criteria);
            const result = await controller._getData.call(context);
            assert.equal(result.sEstado, 'S');
            assert.deepEqual(Array.from(result.oResults, row => row.SalesDocument), expected);
        };
        await search({ cbCliente: ['1000000122'] }, []);
        await search({ cbCliente: ['A'] }, ['START', 'END']);
        await search({ cbCliente: ['A', 'MISSING'] }, ['START', 'END']);
        await search({ cbCliente: ['A', 'B'] }, ['START', 'END', 'OTHER']);
        await search({ cbCliente: ['A'], cbDocumento: ['MISSING'] }, []);
        await search({ cbCliente: ['A'], cbDocumento: ['OTHER'] }, []);
        await search({ cbCliente: ['A'], cbVendor: ['V2'] }, []);
        await search({ cbCliente: ['A'], cbDocumento: ['START'] }, ['START']);
        await search({}, ['START', 'END', 'OTHER']);
        // A real customer whose orders fall outside the interval also yields no matches.
        await search({ cbCliente: ['A'], dStartDate: new Date(2026, 9, 1), dEndDate: new Date(2026, 9, 13) }, []);
    }
    console.log('PASS: tracking keeps customer/document/vendor criteria restrictive, inclusive dates, empty results and selected tokens across all organizations.');
})().catch(error => { console.error(error); process.exitCode = 1; });
