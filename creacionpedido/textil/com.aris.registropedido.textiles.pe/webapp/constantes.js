/* global moment:true */
sap.ui.define([

], function () {
	"use strict";
	return {
		idProyecto: "tomapedido",
		PaginaHome: "Main",
		IdApp: "Toma_Pedido",
		modelOdata: "modelOdata",
		root: "/",
		userApi: "API-USER-IAS",
		services: {
			//////////////////////////////////////////////////////////////////////
			//////////////////////////////////////////////////////////////////////
			RegistrarAuditoriaSap:"/FlujoAlmacen/Service/RegistrarAuditoriaSap/",
			getoDataEstandar:"/General/Estandar/ConsultarEstandarSimple/",
			postoDataEstandar:"/General/Estandar/InsertarEstandarSimple/"
		}
	};
});