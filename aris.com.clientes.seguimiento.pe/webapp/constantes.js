/* global moment:true */
sap.ui.define([
], function () {
	"use strict";
	return {
		idProyecto: "aris.com.clientes.seguimiento.pe",
		PaginaHome: "View",
		IdApp: "Seguimiento_clientes",
		modelOdata: "modelOdata",
		root: "/",
		userApi: "API-USER-IAS",
		services: {
			//////////////////////////////////////////////////////////////////////
			//////////////////////////////////////////////////////////////////////
			RegistrarAuditoriaSap:"/Service/RegistrarAuditoriaSap/",
			getoDataEstandar:"/General/Estandar/ConsultarEstandarSimple/",
			postoDataEstandar:"/General/Estandar/InsertarEstandarSimple/"
		}
	};
});