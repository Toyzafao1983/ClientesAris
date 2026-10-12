sap.ui.define([
	"../util/utilResponse",
	"../util/utilHttp",
	"../constantes",
	"../estructuras/Estructura"
], function(utilResponse, utilHttp, constantes,Estructura) {
	"use strict";
	return {
        readAllOData: function (model, path, parameters) {
            const rows = [];
            const visited = new Set();
            const readPage = function (pagePath, options) {
                if (visited.has(pagePath)) {
                    parameters.error({ message: "Continuación OData repetida" });
                    return;
                }
                visited.add(pagePath);
                model.read(pagePath, Object.assign({}, options, {
                    success: function (data) {
                        (data.results || []).forEach(row => rows.push(row));
                        if (!data.__next) {
                            parameters.success(Object.assign({}, data, { results: rows }));
                            return;
                        }
                        const queryIndex = String(data.__next).indexOf("?");
                        if (queryIndex < 0) {
                            parameters.error({ message: "Continuación OData inválida" });
                            return;
                        }
                        // Keep this model's service/destination; SAP supplies the query.
                        readPage(path.split("?")[0] + String(data.__next).slice(queryIndex), {});
                    },
                    error: parameters.error
                }));
            };
            readPage(path, parameters);
        },
		RegistrarAuditoriaSap: function (context, oResults, callback) {
			utilHttp.Post(constantes.services.RegistrarAuditoriaSap, oResults, callback, context);
		},
		getoDataVGenericaCampo: function (context,oFilter,callback) {
			utilHttp.getoData(context,'/VGenericaCampo',oFilter, callback);  //callback(modLocal) --> mockData
		},
		getoDataEstandar:function(context,oResults,callback){
			utilHttp.Post(constantes.services.getoDataEstandar, oResults, callback, context);
		},
		postoDataEstandar:function(context,oResults,callback){
			utilHttp.Post(constantes.services.postoDataEstandar, oResults, callback, context);
		},
		getoDataERPSync:function(context, url, callback){
			const owner = context.getOwnerComponent();
            const load = done => utilHttp.ERPGetSync(url, done);
            if (owner.getTrackingQuery) {
                return owner.getTrackingQuery(url, context.sSalesOrg, load, callback);
            }
            return load(callback);
		},
		getoDataERPSyncNotResult:function(context, url, callback){
			utilHttp.ERPGetSyncNotResult( url, callback);
		},
		getoDataERPAsync:function(context, url, callback){
			utilHttp.ERPGetAsync( url, callback);
		},
		postoDataERPSync:function(context, urlget, urlpost, data, callback){
			utilHttp.ERPPostTokenSync( urlget, urlpost, data, callback);
		},
		postoDataERPAsync:function(context, urlget, urlpost, data, callback){
			utilHttp.ERPPostTokenAsync( urlget, urlpost, data, callback);
		},
		postDigiFlowSync:function( urlget,payload, callback){
			utilHttp.DigiFlowGetSync( urlget,payload, callback);
		},
	};
});