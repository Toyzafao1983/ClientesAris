const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const projects = [
  ['aris.com.clientes.controlstock.pe', 'materialsFolder'],
  ['creacionpedido/quimico/com.aris.registropedido.quimico.pe', 'documentsFolder'],
  ['creacionpedido/ceramico/com.aris.registropedido.ceramicos.pe', 'documentsFolder'],
  ['creacionpedido/textil/com.aris.registropedido.textiles.pe', 'documentsFolder']
];
function load(project, key) {
  const webapp = path.join(root, project, 'webapp');
  const source = fs.readFileSync(path.join(webapp, 'controller/BaseController.js'), 'utf8');
  const config = fs.readFileSync(path.join(webapp, 'config/sharepoint.properties'), 'utf8');
  let folder = config.split('\n').find(line => line.startsWith(key + '=')).slice(key.length + 1);
  let loads = 0, fail = false;
  const requests = [];
  const services = {
    sharePointUploadProgressSync(url, file, progress, callback) { requests.push(url); callback({iCode: 1, data: {name: file.name}}); },
    getSharepointSync(url, callback) { requests.push(url); callback({}); }
  };
  const resourceBundle = { create(options) {
    loads++;
    assert.equal(options.async, true);
    assert.equal(options.locale, '');
    assert.equal(options.url.endsWith('/config/sharepoint.properties'), true);
    if (fail) { fail = false; return Promise.reject(new Error('load failed')); }
    return Promise.resolve({hasText: k => k === key && folder !== null, getText: () => folder});
  }};
  const context = {
    window: {location: {href: 'launchpad'}},
    jQuery: {sap: {getModulePath: route => '/app/' + route}},
    $: {ajax(options) {requests.push(options.url); options.success({value: []});}},
    sap: {ui: {require: {toUrl: url => '/resources/' + url}, define(deps, factory) {
      context.controller = factory(...deps.map(dep => {
        if (dep === 'sap/ui/core/mvc/Controller') return {extend: (_, methods) => methods};
        if (dep === 'sap/base/i18n/ResourceBundle') return resourceBundle;
        if (dep.endsWith('/services/Services')) return services;
        if (dep.endsWith('/util/util')) return {response: {validateAjaxGetERPNotMessage: (_, handlers) => handlers.success({data: []})}};
        return {};
      }));
    }}}
  };
  vm.runInNewContext(source, context);
  const c = context.controller;
  c.getOwnerComponent = () => ({getManifestObject: () => ({resolveUri: url => '/local' + url})});
  c.driveId = 'drive';
  return {c, requests, get loads() {return loads;}, setFolder: value => {folder = value;}, failNext: () => {fail = true;}, folder};
}
(async () => {
  for (const [project, key] of projects) {
    const state = load(project, key), c = state.c;
    const expected = state.folder;
    await Promise.all([c._getSharePointFolder(key), c._getSharePointFolder(key)]);
    assert.equal(state.loads, 1, 'concurrent loads must share config');
    if (key === 'documentsFolder') {
      for (const local of [false, true]) {
        c.local = local;
        assert.equal((await c._uploadSharepoint({name: 'test (1).pdf'}, () => {})).sEstado, 'S');
        const url = state.requests.at(-1);
        assert(url.includes(expected.split('/').map(encodeURIComponent).join('/')));
        assert(url.endsWith('/test%20%281%29.pdf:/content'));
        assert.equal(url.startsWith('/local'), local);
      }
    } else {
      await c._listarArchivos('site', 'drive');
      assert(state.requests.at(-1).includes('/Pruebas%20BTP/Clientes/materiales:/children'));
      for (const local of [false, true]) {
        c.local = local;
        await c._getSharepoint();
        assert(state.requests.at(-1).endsWith('/Pruebas%20BTP/Clientes/materiales:/children'));
        assert.equal(state.requests.at(-1).startsWith('/local'), local);
      }
    }
    // Vacío/inexistente falla, luego permite recargar; no hace llamadas con una ruta arbitraria.
    const broken = load(project, key);
    broken.setFolder(null);
    const operation = key === 'documentsFolder' ? () => broken.c._uploadSharepoint({name: 'x.pdf'}) : () => broken.c._listarArchivos('site','drive');
    await assert.rejects(operation, /Configuración SharePoint inválida/);
    assert.equal(broken.requests.length, 0);
    broken.setFolder(expected);
    assert.equal(await broken.c._getSharePointFolder(key), expected);
    const retry = load(project, key);
    retry.failNext();
    await assert.rejects(() => retry.c._getSharePointFolder(key), /load failed/);
    assert.equal(await retry.c._getSharePointFolder(key), expected);
    assert.equal(retry.loads, 2);
    console.log('OK ' + project);
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
