// Run the actual controller authorization branches with IAS/SAP responses simulated.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
process.chdir(path.join(__dirname, '..'));
function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        ['.git', 'node_modules', 'dist'].includes(e.name) ? [] :
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
function blockEnd(source, start) {
    let depth = 0;
    for (let i = source.indexOf('{', start); i < source.length; i++) {
        if (source[i] === '{') depth++;
        if (source[i] === '}' && --depth === 0) return i + 1;
    }
    throw Error('Unclosed block');
}
(async () => {
    let count = 0;
    const files = walk('.').filter(p => p.endsWith('.controller.js'));
    const authorizers = files.filter(p => fs.readFileSync(p, 'utf8').includes('if (sBPCliente && !sBPVendedor)'));
    assert.equal(authorizers.length, 12);
    for (const file of authorizers) {
        const source = fs.readFileSync(file, 'utf8');
        const start = source.indexOf('let oAttr6 =');
        const branch = source.indexOf('if (sBPInterno) {', start) >= 0
            ? source.indexOf('if (sBPInterno) {', start)
            : source.indexOf('if (sBPVendedor) {', start);
        const code = source.slice(start, blockEnd(source, branch));
        for (const scenario of ['seller', 'coordinator', 'missing', 'wrongOrg', 'wrongProfile', 'client', 'blank7', 'only7', 'none', 'allAttributes', 'legacyOnly']) {
            const props = {}, routes = [], clientCalls = [];
            const model = { setProperty: (k,v) => { props[k] = v; }, getData: () => props };
            const denied = () => routes.push('AccessDenied');
            const profile = scenario === 'coordinator' ? ['CD','Coordinador'] : scenario === 'wrongProfile' ? ['XX','Otro'] : ['VD','Vendedor'];
            const row = { usuario: 'INTERNAL', orgventas: scenario === 'wrongOrg' ? '1120' : '1110', perfil: profile[0], DscPerfil: profile[1] };
            const rows = scenario === 'missing' ? [] : [
                { usuario: 'INTERNAL', orgventas: '1130', perfil: 'CD', DscPerfil: 'Coordinador' }, row
            ];
            const aAttr = [
                { name: 'customAttribute6', value: ['only7', 'none', 'legacyOnly'].includes(scenario) ? '' : 'CLIENT' },
                { name: 'customAttribute7', value: ['client','none','legacyOnly'].includes(scenario) ? '' : scenario === 'blank7' ? '  ' : ' INTERNAL ' },
                // Obsolete attributes must never authorize a user, even with a valid SAP code.
                ...[1, 2, 3].map(n => ({ name: 'customAttribute' + n, value: 'INTERNAL' }))
            ];
            const that = {
                getModel: () => model,
                _getSalesOrgByBP: async bp => { clientCalls.push(bp); return ['1110']; },
                _getBPVendedor: async () => ({ oResults: rows }),
                _loadClientData: async () => {},
                _getClient: async () => ({ oResults: [{ Customer: 'CLIENT' }] }),
                _navigateDetailForCustomer: async () => routes.push('Detail')
            };
            const context = {
                aAttr, that, oModelUser: model, tSalesOrg: '1110', tUniNeg: 'CERAMICOS', sFullName: 'Test',
                values: Array.from({length: 20}, () => ({oResults: rows})),
                oRouter: { navTo: r => routes.push(r) },
                localStorage: { setItem: () => {} },
                sap: { ui: { core: { BusyIndicator: {show() {}, hide() {}} } }, m: { MessageBox: { error: denied } } },
                window: { location: {} }
            };
            await vm.runInNewContext('(async function () {' + code + '}).call(that)', context);
            const label = file + ': ' + scenario;
            if (['missing','wrongOrg','wrongProfile'].includes(scenario)) {
                assert.ok(routes.includes('AccessDenied'), label);
                assert.notEqual(props['/bIsInterno'], true, label);
                assert.equal(clientCalls.length, 0, label + ': no client fallback');
            } else if (['client','blank7'].includes(scenario)) {
                assert.equal(props['/bIsCliente'], true, label);
                assert.deepEqual(clientCalls, ['CLIENT'], label);
            } else if (['none', 'legacyOnly'].includes(scenario)) {
                assert.notEqual(props['/bIsCliente'], true, label);
                assert.notEqual(props['/bIsInterno'], true, label);
            } else {
                assert.equal(props['/bIsInterno'], true, label);
                assert.equal(props['/bIsCliente'], false, label);
                assert.equal(props['/bIsVendedor'], scenario !== 'coordinator', label);
                assert.equal(clientCalls.length, 0, label);
                if (props['/customAttribute']) assert.equal(props['/customAttribute'], 'customAttribute7', label);
            }
            count++;
        }
    }
    for (const file of files.filter(p => /(?:controlstock|seguimiento).*\/(?:View|Detail)\.controller\.js$/.test(p))) {
        const source = fs.readFileSync(file, 'utf8');
        const start = source.indexOf('if (oAttr && Array.isArray(oAttr.attributes))');
        if (start < 0) continue;
        const code = source.slice(start, blockEnd(source, start));
        for (const [one,two,expected] of [['CLIENT','INTERNAL','INTERNAL'],['CLIENT','','CLIENT'],['CLIENT','  ','CLIENT'],['','INTERNAL','INTERNAL'],['','','']]) {
            const result = vm.runInNewContext('let oBPUser="", tipoBP="", sCustomAttribute="";' + code + ';oBPUser', {
                oAttr: { attributes: [{name:'customAttribute6',value:one},{name:'customAttribute7',value:two}, ...[1,2,3].map(n => ({name:'customAttribute'+n,value:'INTERNAL'}))] }
            });
            assert.equal(result, expected, file);
            count++;
        }
    }
    for (const app of ['controlstock', 'seguimiento']) {
        const file = `aris.com.clientes.${app}.pe/webapp/controller/View.controller.js`;
        const source = fs.readFileSync(file, 'utf8');
        const start = source.indexOf('let oBPUser = "";');
        const lastGuard = source.indexOf('if (!accesoPermitido) {', start);
        const code = source.slice(start, blockEnd(source, lastGuard));
        for (const perfil of ['Vendedor', 'Coordinador', 'Otro', '']) {
            const errors = [], clientCalls = [], lookups = [];
            const model = { setProperty() {} };
            const that = {
                sSalesOrg: '1110', oModelUser: model, oModelProyect: model,
                _getSalesOrgByBP: async bp => { clientCalls.push(bp); return ['1110']; },
                _getPerfilByUsuario: async (bp, org) => {
                    lookups.push([bp, org]);
                    return { autorizado: !!perfil, perfil };
                }
            };
            const context = {
                that, tUniNeg: 'CERAMICOS', tRol: '', oUser: {},
                oAttr: { attributes: [{name:'customAttribute6', value:'CLIENT'}, {name:'customAttribute7', value:'INTERNAL'}] },
                sap: { ui: { core: { BusyIndicator: { hide() {} } } }, m: { MessageBox: { error: msg => errors.push(msg) } } },
                window: { location: {} }
            };
            const result = await vm.runInNewContext('(async function () {' + code + ';return tRol;}).call(that)', context);
            assert.deepEqual(lookups, [['INTERNAL', '1110']], file);
            assert.equal(clientCalls.length, 0, file + ': no fallback to customer');
            if (perfil === 'Vendedor' || perfil === 'Coordinador') {
                assert.equal(result, perfil === 'Vendedor' ? 'VENDEDOR' : 'SUPERVISOR', file);
                assert.equal(errors.length, 0, file);
            } else {
                assert.equal(result, undefined, file);
                assert.equal(errors.length, 1, file);
            }
            count++;
        }
    }
    console.log(`${count} IAS priority and SAP authorization scenarios passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
