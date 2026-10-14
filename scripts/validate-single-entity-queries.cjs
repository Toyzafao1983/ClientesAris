const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const projects = ['aris.com.clientes.controlstock.pe', 'aris.com.clientes.seguimiento.pe', 'com.aris.consultaestadocuenta.pe',
    ...['quimico', 'textil', 'ceramico'].map(unit => 'creacionpedido/' + unit + '/' + fs.readdirSync('creacionpedido/' + unit)[0])];
(async () => {
    for (const project of projects) {
        let http, requested;
        vm.runInNewContext(fs.readFileSync(project + '/webapp/util/utilHttp.js', 'utf8'), {
            URL, sap: { ui: { define: (names, factory) => { http = factory(...names.map(() => ({}))); } } },
            $: { ajax: options => { requested = options.url; options.success({ d: { Country: 'PE', ExchRate: '3.75' } }); } }
        });
        const paths = ["iDireccionesSet(Businesspartner='1000000122')?$format=json",
            "iTipoCambioSet(RateType='M',FromCurr='USD',ToCurrncy='PEN',Date=datetime'2026-10-14T00:00:00')",
            "iDireccionesSet%28Businesspartner='1000000122'%29?$format=json"];
        for (const path of paths) for (const method of http._ERPGetPages ? ['ERPGetSync', 'ERPGetAsync'] : ['ERPGetSync']) {
            const url = '/app/S4HANA/sap/opu/odata/sap/ZSDWS_PORTAL_CLIENTES_SRV/' + path;
            const result = await new Promise(resolve => http[method](url, resolve));
            assert.equal(requested, url, project + ': keyed reads must not acquire paging options');
            assert.equal(result.iCode, 1);
            assert.equal(result.data.Country, 'PE');
        }
    }
    console.log('PASS: keyed address/exchange-rate reads preserve the URI without automatic top in all six applications.');
})().catch(error => { console.error(error); process.exitCode = 1; });
