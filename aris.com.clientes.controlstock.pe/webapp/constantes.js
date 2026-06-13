/* global moment:true */
sap.ui.define([
], function () {
	"use strict";
	return {
		idProyecto: "aris.com.clientes.controlstock.pe",
		PaginaHome: "View",
		IdApp: "controlstock_clientes",
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