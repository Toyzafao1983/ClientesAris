sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },
        createModelProyect: function(){
            var oModel = {
                Main: {
                    filter: {
                        fSeller: "",
                        fCodClient: "",
                        fRazSocial: "",
                        fDocument: "",
                    }
                },
                oReporte:[],
                oCliente:[],
                oDetalle:[],
                oCabecera:{},
                oConsultaCuenta:[], 
                oLoanedProducts:[],
            };
            return oModel;
        },
          oModelUser: function(){
            let oModel = {
                "schemas": [
                    "urn:ietf:params:scim:api:messages:2.0:ListResponse"
                ],
                "totalResults": 1,
                "itemsPerPage": 100,
                "Resources": [
                    {
                        "id": "P000178",
                        "userUuid": "1da90deb-d81a-4684-855a-90714c179f89",
                        "userName": "latencio",
                        "displayName": "mestefo",
                        "userType": "public",
                        "sourceSystem": "15",
                        "passwordStatus": "enabled",
                        "mailVerified": "TRUE",
                        "passwordPolicy": "https://accounts.sap.com/policy/passwords/sap/enterprise/1.0",
                        "passwordFailedLoginAttempts": "0",
                        "passwordLoginTime": "2025-05-21T02:20:07Z",
                        "loginTime": "2025-05-21T02:20:07Z",
                        "passwordSetTime": "2025-01-29T23:18:31Z",
                        "schemas": [
                            "urn:ietf:params:scim:schemas:core:2.0:User",
                            "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
                            "urn:sap:cloud:scim:schemas:extension:custom:2.0:User"
                        ],
                        "active": true,
                        "meta": {
                            "location": "https://azb1ikez3.accounts.ondemand.com/service/scim/Users/P000178",
                            "resourceType": "User",
                            "version": "1.0",
                            "created": "2025-01-29T22:44:19Z",
                            "lastModified": "2025-04-25T16:32:27Z"
                        },
                        "emails": [
                            {
                                "value": "kestefo@ravaconsulting.com.pe",
                                "primary": true
                            }
                        ],
                        "name": {
                            "givenName": "Hugo",
                            "familyName": "Soler"
                        },
                        "groups": [
                            {
                                "value": "LAYT_INT_ADM",
                                "$ref": "https://azb1ikez3.accounts.ondemand.com/service/scim/Groups/680c41e7ee8f9025895c5aab",
                                "display": "LAYT_INT_ADM"
                            }
                        ],
                        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {}
                    }
                ]
            }
            return oModel;
        },
        oModelUserExt: function(){
            let oModel = {
                "schemas": [
                    "urn:ietf:params:scim:api:messages:2.0:ListResponse"
                ],
                "totalResults": 1,
                "itemsPerPage": 100,
                "Resources": [
                    {
                        "id": "P000178",
                        "userUuid": "1da90deb-d81a-4684-855a-90714c179f89",
                        "userName": "latencio",
                        "displayName": "msoler",
                        "userType": "public",
                        "sourceSystem": "15",
                        "passwordStatus": "enabled",
                        "mailVerified": "TRUE",
                        "passwordPolicy": "https://accounts.sap.com/policy/passwords/sap/enterprise/1.0",
                        "passwordFailedLoginAttempts": "0",
                        "passwordLoginTime": "2025-05-21T02:20:07Z",
                        "loginTime": "2025-05-21T02:20:07Z",
                        "passwordSetTime": "2025-01-29T23:18:31Z",
                        "schemas": [
                            "urn:ietf:params:scim:schemas:core:2.0:User",
                            "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
                            "urn:sap:cloud:scim:schemas:extension:custom:2.0:User"
                        ],
                        "active": true,
                        "meta": {
                            "location": "https://azb1ikez3.accounts.ondemand.com/service/scim/Users/P000178",
                            "resourceType": "User",
                            "version": "1.0",
                            "created": "2025-01-29T22:44:19Z",
                            "lastModified": "2025-04-25T16:32:27Z"
                        },
                        "emails": [
                            {
                                "value": "kestefo@ravaconsulting.com.pe",
                                "primary": true
                            }
                        ],
                        "name": {
                            "givenName": "",
                            "familyName": ""
                        },
                        "groups": [
                            {
                                "value": "LAYT_INT_EXT",
                                "$ref": "https://azb1ikez3.accounts.ondemand.com/service/scim/Groups/680c41e7ee8f9025895c5aab",
                                "display": "LAYT_INT_EXT"
                            }
                        ],
                        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {}
                    }
                ]
            }
            return oModel;
        },
        oModelPrueba: function(){
            let oModel = { }
            return oModel;
        },
        // JsonDocument: function(context){
        //     var oModel = {
        //         "d":{
        //             "results": [
        //                 {
        //                     "sKey": "1",
        //                     "sText": this.getI18nText(context,"TxtTipDocument1")
        //                 },
        //                 {
        //                     "sKey": "2",
        //                     "sText": this.getI18nText(context,"TxtTipDocument2")
        //                 },
        //                 {
        //                     "sKey": "3",
        //                     "sText": this.getI18nText(context,"TxtTipDocument3")
        //                 },
        //                 {
        //                     "sKey": "4",
        //                     "sText": this.getI18nText(context,"TxtTipDocument4")
        //                 },
        //                 {
        //                     "sKey": "5",
        //                     "sText": this.getI18nText(context,"TxtTipDocument5")
        //                 }
            
            
        //             ]
        //         }
        //     };
        //     return oModel;
        // },

        // JsonMoneda: function(context){
        //     var oModel = {
        //         "d":{
        //             "results": [
        //                 {
        //                     "sKey": "1",
        //                     "sText": this.getI18nText(context,"TxtTipMoney1")
        //                 },
        //                 {
        //                     "sKey": "2",
        //                     "sText": this.getI18nText(context,"TxtTipMoney2")
        //                 },
        //             ]
        //         }
        //     };
        //     return oModel;
        // },
        JsonReporte: function(){
            var oModel = {
                "d":{
                    "results":[
                        {
                            "txt0": "100001234",
                            "txt1": "Karmont S.A.C",
                            "txt2": "20000322",
                            "txt3": "Distribuidor",
                            "txt4": "FK02-Factura Negociable",
                            "txt5": "v. Prueba 001",
                            "txt6": "Hugo Soler",
                        },
                        {
                            "txt0": "100001235",
                            "txt1": "Alicorp S.A",
                            "txt2": "20000323",
                            "txt3": "Distribuidor",
                            "txt4": "FK03-Factura Cuotas",
                            "txt5": "v. Prueba 002",
                            "txt6": "Hugo Soler",
 
                        },
                        {
                            "txt0": "100001236",
                            "txt1": "Ladrilleria Lark S.A.C",
                            "txt2": "20000324",
                            "txt3": "Distribuidor",
                            "txt4": "FK02-Factura Negociable",
                            "txt5": "v. Prueba 003",
                            "txt6": "Marlon Estefo", 
                        }
                       
                    ]
                }
            };
            return oModel;
        },
        JsonCuenta: function(){
            var oModel = {
                "d":{
                    "results":[
                        {
                            "txt0": "Factura",
                            "txt1": "Karmont S.A.C",
                            "txt2": "No",
                            "txt3": "Banco de Crédito",
                            "txt4": "FAC-2025-001",
                            "txt5": "15-08-2025",
                            "txt6": "15-09-2025",
                            "txt7": "USD",
                            "txt8": "1500.75", 
                            "txt9": "30 días", 
                            "status": 1

                        },
                        {
                            "txt0": "Recibo",
                            "txt1": "Karmont S.A.C",
                            "txt2": "Sí",
                            "txt3": "Banco Interbank",
                            "txt4": "REC-2025-020",
                            "txt5": "10-08-2025",
                            "txt6": "30-08-2025",
                            "txt7": "USD",
                            "txt8": "1500.75", 
                            "txt9": "Contado", 
                            "status": 2


                        },
                        {
                            "txt0": "Letra de Cambio",
                            "txt1": "Alicorp S.A",
                            "txt2": "No",
                            "txt3": "BBVA",
                            "txt4": "LDC-2025-115",
                            "txt5": "01-07-2025",
                            "txt6": "01-12-2025",
                            "txt7": "USD",
                            "txt8": "1500.75", 
                            "txt9": "90 días", 
                            "status": 1

                        },
                                                {
                            "txt0": "Letra de Cambio",
                            "txt1": "Alicorp S.A",
                            "txt2": "No",
                            "txt3": "BBVA",
                            "txt4": "LDC-2025-115",
                            "txt5": "01-07-2025",
                            "txt6": "01-12-2025",
                            "txt7": "USD",
                            "txt8": "1500.75", 
                            "txt9": "90 días", 
                            "status": 1

                        },
                         {
                            "txt0": "Factura",
                            "txt1": "Ladrilleria Lark S.A.C",
                            "txt2": "No",
                            "txt3": "Banco de Crédito",
                            "txt4": "FAC-2025-001",
                            "txt5": "15-08-2025",
                            "txt6": "15-09-2025",
                            "txt7": "USD",
                            "txt8": "1500.75", 
                            "txt9": "30 días", 
                            "status": 1

                        },
                    ]
                }
            }
            return oModel
        },

         JsonPrestamo: function(){
            var oModel = {
                "d":{
                    "results":[
                        {
                            "txt0": "Pellets",
                            "txt1": "3",
                            "txt2": "USD",
                            "txt3": "150",
                            "txt4": "Karmont S.A.C",


                        },
                        {
                            "txt0": "Pellets",
                            "txt1": "2",
                            "txt2": "USD",
                            "txt3": "100",
                            "txt4": "Alicorp S.A",


                        },
                        {
                            "txt0": "Pellets",
                            "txt1": "4",
                            "txt2": "PEN",
                            "txt3": "300",
                            "txt4": "Alicorp S.A",

                        },
                    ]
                }
            }
            return oModel
        },

                        
        getI18nText: function (context,sText) {
			return context.oView.getModel("i18n") === undefined ? false : context.oView.getModel("i18n").getResourceBundle().getText(sText);
		},
        
    };

});