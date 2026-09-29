const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '../creacionpedido/textil/com.aris.registropedido.textiles.pe');
class Filter {
    constructor(path, operator, value) {
        Object.assign(this, typeof path === 'object' ? path : { path, operator, value });
    }
    matches(row) {
        if (this.filters) return this.and ? this.filters.every(f => f.matches(row)) : this.filters.some(f => f.matches(row));
        if (this.test) return this.test(row[this.path]);
        return this.operator === 'Contains' ? String(row[this.path] || '').includes(this.value) : row[this.path] === this.value;
    }
}
let controller, hidden = 0;
const errors = [], messages = [];
vm.runInNewContext(fs.readFileSync(path.join(root, 'webapp/controller/Main.controller.js'), 'utf8'), {
    console: { error: (...args) => errors.push(args) },
    sap: { ui: {
        model: { Filter, FilterOperator: { EQ: 'EQ', Contains: 'Contains' } },
        core: { BusyIndicator: { show() {}, hide() { hidden++; } } },
        define(deps, factory) {
            controller = factory(...deps.map(dep => dep.endsWith('/BaseController') ? { extend: (_, obj) => obj } : {}));
        }
    } }
});
(async () => {
    const customer = '1000007258', seller = 'EE00071069';
    let rows, filtered;
    Object.assign(controller, {
        _syncSearchFiltersFromTokens() {},
        oModelProyect: {
            getProperty: () => ({ fSeller: [seller], fCodClient: [customer] }),
            setProperty: (_, value) => { rows = value; }
        },
        byId: () => ({ getBinding: () => ({ filter: filters => {
            filtered = rows.filter(row => filters.every(f => f.matches(row)));
        } }) }),
        getMessageBox: (_, message) => messages.push(message),
        _initialCustomerData: {
            customers: { sEstado: 'S', oResults: [{ Customer: customer }, { Customer: 'other' }] },
            customerData: { sEstado: 'S', oResults: [
                { Customer: customer, kunn2: 'another', Seller: 'Otro vendedor' },
                { Customer: customer, kunn2: seller, Seller: 'Vendedor elegido' },
                { Customer: 'other', kunn2: seller, Seller: 'Vendedor elegido' }
            ] }
        }
    });
    await controller._onPressExecute();
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].Customer, customer);
    assert.equal(messages.length, 0);
    controller.byId = () => ({ getBinding: () => ({ filter() { throw new Error('binding failed'); } }) });
    await controller._onPressExecute();
    assert.match(errors[0][1].message, /binding failed/);
    controller._initialCustomerData.customers.sEstado = 'E';
    await controller._onPressExecute();
    assert.equal(errors.length, 2);
    assert.equal(messages.length, 2);
    assert.equal(hidden, 3);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'webapp/manifest.json')));
    const routes = JSON.parse(fs.readFileSync(path.join(root, 'xs-app.json'))).routes;
    const uri = manifest['sap.app'].dataSources.S4HANA_Materials.uri + '$metadata';
    const route = routes.find(r => new RegExp(r.source).test(uri));
    assert.equal(route.destination, 'S4H_DEV_110_CLIENTE');
    assert.equal(uri.replace(new RegExp(route.source), route.target), uri);
    console.log('Textil: filtro vendedor/cliente, múltiples vendedores, errores, BusyIndicator y ruta metadata verificados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
