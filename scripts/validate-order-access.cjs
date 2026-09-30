// Exercise real order controllers with simulated IAS/SAP and UI5 dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..', 'creacionpedido');
(async () => {
    let count = 0;
    for (const [folder, app, site, org] of [
        ['ceramico', 'ceramicos', 'ceramicos', '1130'],
        ['textil', 'textiles', 'textiles', '1110'],
        ['quimico', 'quimico', 'quimicos', '1120']
    ]) {
        const source = fs.readFileSync(path.join(root, folder, `com.aris.registropedido.${app}.pe/webapp/controller/Main.controller.js`), 'utf8');
        for (const scenario of ['noUser', 'noAttributes', 'legacyOnly', 'wrongOrg', 'wrongProfile', 'lookupError', 'client', 'seller', 'coordinator', 'loadError']) {
            let controller, visible = true;
            const errors = [], routes = [], writes = [];
            const model = { setProperty: (...args) => writes.push(args), getProperty() {}, setSizeLimit() {} };
            const router = { getTarget: () => ({ attachDisplay() {} }), navTo: r => routes.push(r) };
            const view = { setVisible: value => { visible = value; }, addEventDelegate() {} };
            const window = { parent: { location: { href: `https://example/site-${site}` } }, location: { href: 'app' } };
            const sap = {
                ui: { core: { UIComponent: { getRouterFor: () => router }, BusyIndicator: { show() {}, hide() {} } },
                    define: (_deps, factory) => factory({ extend: (_name, methods) => { controller = methods; } }) },
                m: { MessageBox: { error: (message, options) => errors.push({ message, options }) } }
            };
            vm.runInNewContext(source, { sap, window, localStorage: { setItem() {} }, jQuery: { proxy: f => f }, setTimeout });
            Object.assign(controller, {
                getView: () => view, getModel: () => model,
                getOwnerComponent: () => ({ clearCustomerQueries() {} }),
                _setLanguageModel() {}, _onClearDataFilter() {}, onClearFilters() {},
                _loadClientData: async () => {},
                _getSalesOrgByBP: async () => [org]
            });
            controller.onInit();
            const internal = !['client', 'noAttributes', 'legacyOnly'].includes(scenario);
            const attributes = [
                { name: 'customAttribute6', value: scenario === 'client' || internal ? 'CLIENT' : '' },
                { name: 'customAttribute7', value: internal ? 'INTERNAL' : '' },
                { name: 'customAttribute1', value: 'CLIENT' },
                { name: 'customAttribute2', value: 'INTERNAL' }
            ];
            const user = { name: {}, 'urn:sap:cloud:scim:schemas:extension:custom:2.0:User': { attributes } };
            const rows = [{ usuario: 'INTERNAL', orgventas: scenario === 'wrongOrg' ? '9999' : org,
                perfil: scenario === 'wrongProfile' ? 'XX' : scenario === 'coordinator' ? 'CD' : 'VD', DscPerfil: '' }];
            const users = { Resources: scenario === 'noUser' ? [] : [user] };
            controller._getBPVendedor = async () => {
                if (scenario === 'lookupError') throw Error('SAP unavailable');
                return { oResults: rows };
            };
            const values = Array.from({ length: 7 }, () => ({ oResults: rows }));
            values[0] = users;
            if (['client', 'seller', 'coordinator', 'lookupError'].includes(scenario)) {
                const allowed = await controller._validateAccessToPortal(values);
                assert.equal(allowed, ['seller', 'coordinator'].includes(scenario), `${app}: ${scenario}`);
                if (scenario === 'client') assert.deepEqual(routes, ['FormClient']);
            } else {
                controller._getUsers = async () => {
                    if (scenario === 'loadError') throw Error('IAS unavailable');
                    return users;
                };
                for (const method of ['_getPrueba', '_getTipDocument', '_getTipChangeData', '_getDatClient', '_getClientPet']) {
                    controller[method] = async () => ({ oResults: [] });
                }
                await controller.handleRouteMatched();
                assert.equal(writes.some(([key]) => key === '/oClienteFilter'), false, `${app}: must stop loading`);
            }
            if (!['client', 'seller', 'coordinator'].includes(scenario)) {
                assert.equal(visible, false, `${app}: rejected view hidden`);
                assert.equal(errors.length, 1, `${app}: one denial dialog`);
                assert.deepEqual(routes, [], `${app}: no broken AccessDenied route`);
                errors[0].options.onClose();
                assert.equal(window.location.href, '/');
            } else {
                assert.equal(errors.length, 0, `${app}: valid user accepted`);
            }
            count++;
        }
    }
    console.log(`${count} order access and rejection scenarios passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
