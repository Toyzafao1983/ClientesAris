const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const dirs = ['aris.com.clientes.controlstock.pe', 'aris.com.clientes.seguimiento.pe', 'com.aris.consultaestadocuenta.pe',
    ...['quimico', 'textil', 'ceramico'].map(unit => 'creacionpedido/' + unit + '/' + fs.readdirSync('creacionpedido/' + unit)[0])];
(async () => {
    for (const dir of dirs) for (const top of [undefined, 10000, 200]) for (const nextTop of [undefined, 5000]) {
        let http;
        const urls = [];
        vm.runInNewContext(fs.readFileSync(dir + '/webapp/util/utilHttp.js', 'utf8'), {
            URL, sap: { ui: { define: (deps, factory) => { http = factory(...deps.map(() => ({}))); } } },
            $: { ajax: options => {
                urls.push(options.url);
                const query = new URL(options.url, 'https://app.invalid').searchParams;
                // Reproduce a service that defaults to 100 rows when top is absent.
                const count = query.has('$top') ? Math.min(Number(query.get('$top')), 5000) : 100;
                const second = query.has('$skiptoken');
                options.success({ d: { results: Array.from({ length: count }, (_, i) => ({ Id: (second ? 5000 : 0) + i })),
                    __next: second ? undefined : 'https://internal/sap/Items?$skiptoken=5000' + (nextTop === undefined ? '' : '&$top=' + nextTop) } });
            } }
        });
        const result = await new Promise(resolve => http.ERPGetSync('/app/S4HANA/sap/Items?$filter=A' + (top === undefined ? '' : '&$top=' + top), resolve));
        assert.equal(result.iCode, 1);
        assert.equal(urls.length, top === 200 ? 1 : 2);
        assert.equal(result.data.length, top === 200 ? 200 : 10000);
        assert.equal(new URL(urls[0], 'https://app.invalid').searchParams.get('$top'), String(top ?? 2147483647));
        if (top !== 200) assert.equal(new URL(urls[1], 'https://app.invalid').searchParams.get('$top'), String(nextTop ?? top ?? 2147483647));
        assert.ok(urls.every(url => url.startsWith('/app/S4HANA/sap/Items?')));
    }
    console.log('PASS: six applications preserve top, avoid default 100-row pages, retain SAP remaining top and respect suggestion limits.');
})().catch(error => { console.error(error); process.exitCode = 1; });
