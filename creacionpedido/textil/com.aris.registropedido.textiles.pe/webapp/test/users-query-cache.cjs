const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let Cache;
vm.runInNewContext(fs.readFileSync(path.join(root, 'services/CustomerQueryCache.js'), 'utf8'), {
    sap: { ui: { define: (_, factory) => { Cache = factory(); } } }
});
const source = fs.readFileSync(path.join(root, 'controller/BaseController.js'), 'utf8');
const start = source.indexOf('_getUsers: function');
const end = source.indexOf('\n\t\t},', start);
let calls = 0, fail = false;
const getUsers = vm.runInNewContext('(' + source.slice(start + '_getUsers: '.length, end + 4) + ')', {
    sap: { ui: { model: { json: { JSONModel: class {
        async loadData() { calls++; if (fail) throw Error('network'); }
        getData() { return { Resources: [{ id: 'user' }] }; }
    } } } } },
    jQuery: { sap: { getModulePath: () => '/app' } }
});
(async () => {
    const cache = new Cache();
    const owner = { getCustomerQuery: (url, load) => cache.read(url, load) };
    const controllers = Array.from({ length: 3 }, () => ({
        local: false, route: 'chemical', getUserLoged: () => 'user@example.com',
        getOwnerComponent: () => owner
    }));
    const results = await Promise.all(controllers.map(c => getUsers.call(c)));
    assert.equal(calls, 1);
    results[0].Resources[0].id = 'edited';
    assert.equal(results[1].Resources[0].id, 'user');
    assert.equal((await getUsers.call(controllers[2])).Resources[0].id, 'user');
    assert.equal(calls, 1);
    cache.clear();
    fail = true;
    await assert.rejects(getUsers.call(controllers[0]), /network/);
    fail = false;
    await getUsers.call(controllers[0]);
    assert.equal(calls, 3);
    controllers[1].getUserLoged = () => 'another@example.com';
    await getUsers.call(controllers[1]);
    assert.equal(calls, 4);
    console.log('PASS: Users shared across views, independent copies, flow reset, retry and email isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
