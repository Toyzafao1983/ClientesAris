const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const apps = ['aris.com.clientes.controlstock.pe', 'aris.com.clientes.seguimiento.pe', 'com.aris.consultaestadocuenta.pe', ...['textil/com.aris.registropedido.textiles.pe', 'quimico/com.aris.registropedido.quimico.pe', 'ceramico/com.aris.registropedido.ceramicos.pe'].map(p => 'creacionpedido/' + p)];
(async () => {
for (const app of apps) {
    const source = fs.readFileSync(path.join(app, 'webapp/controller/BaseController.js'), 'utf8');
    let email = ' user@example.com ', calls = 0, messages = 0, sent;
    const sap = { ushell: { Container: { getService: () => ({ getUser: () => ({ getEmail: () => email }) }) } },
        m: { MessageBox: { error: () => { messages++; } } },
        ui: { core: { BusyIndicator: { hide() {} } }, model: { json: { JSONModel: class {
            async loadData(url) { calls++; assert.equal(new URL(url, 'https://test').searchParams.get('filter'), 'emails eq ' + JSON.stringify(email.trim())); }
            getData() { return { Resources: [{ id: 'authenticated' }] }; }
        } } } } };
    function method(name) {
        const a = source.indexOf(name + ': function'), b = source.indexOf('\n\t\t},', a);
        return vm.runInNewContext('(' + source.slice(a + name.length + 2, b + 4) + ')', { sap, jQuery: { sap: { getModulePath: () => '/app' } } });
    }
    const c = { route: 'test', local: true, getOwnerComponent: () => ({ getCustomerQuery: (_, load) => load() }), getUserLoged: method('getUserLoged') };
    const fn = method('_getUsers');
    assert.equal((await fn.call(c)).Resources[0].id, 'authenticated', 'local flag cannot activate mock identity');
    const before = calls;
    for (const value of ['', '   ', null]) { email = value; await assert.rejects(fn.call(c), /usuario autenticado/); }
    email = 'user@example.com'; sap.ushell = undefined; await assert.rejects(fn.call(c), /usuario autenticado/);
    assert.equal(calls, before, 'missing identity must never query IAS'); assert.equal(messages, 4);
    // Post2 must preserve caller data instead of substituting an identity.
    const httpSource = fs.readFileSync(path.join(app, 'webapp/util/utilHttp.js'), 'utf8');
    const a = httpSource.indexOf('Post2: function'), b = httpSource.indexOf('\n\t\t},', a);
    const post = vm.runInNewContext('(' + httpSource.slice(a + 'Post2: '.length, b + 4) + ')', { $: { ajax: args => { sent = JSON.parse(args.data); } } });
    const payload = { name: 'Authenticated user', email: 'user@example.com', extra: 123 };
    post.call({ serviceRootpath: () => '/api/', generarHeaders: () => ({}) }, 'users', payload, () => {}, {});
    assert.deepEqual(sent, payload);
}
console.log('PASS: six apps require authenticated email, reject missing identity without requests, bypass user mocks and preserve Post2 payloads.');
})().catch(e => { console.error(e); process.exitCode = 1; });
