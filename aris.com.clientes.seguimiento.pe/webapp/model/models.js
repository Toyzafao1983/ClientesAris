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
            createModelProyect: function () {
                var oData = {
                    Main: {
                        filter: {
                            dStartDate: null,
                            dEndDate: null,
                            sDateOrder: [],
                            iOrder: [],
                            cbSeller: [],
                            cbState: [],
                            cbCustomer: [],
                            cbOrderClass: [],
                            cbDocumento: [],
                            cbCliente: [],
                            cbVendor: []
                        },
                        ui: {
                            bEnableClientFilters: true,
                            bEnableExecuteSearch: true
                        }
                    },
                    oReporte: [],
                    oDetalle: [],
                    oCabecera: [],
                    sIdioma: "esp"
                };
                return new JSONModel(oData);
            },
            oModelUser: function () {
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
                                "givenName": "Usuario",
                                "familyName": "Externo"
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
            oModelUserExt: function () {
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
                                "givenName": "Usuario",
                                "familyName": "Interno"
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
            oModelPrueba: function () {
                let oModel = {}
                return oModel;
            },
            JsonCustomer: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtCustomer1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtCustomer2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtCustomer3")
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonEstado: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtState1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtState2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtState3")
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonVendedor: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtSeller1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtSeller2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtSeller3")
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonClase: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtClass1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtClass2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtClass3")
                            },
                            {
                                "sKey": "4",
                                "sText": this.getI18nText(context, "TxtClass4")
                            },
                            {
                                "sKey": "5",
                                "sText": this.getI18nText(context, "TxtClass5")
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonReporte: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "1000888",
                                "txt2": "C0001",
                                "txt3": "San Hilario",
                                "txt4": "Ventas",
                                "txt5": "300333",
                                "txt6": "Ventas",
                                "txt7": "PEN",
                                "txt8": 2220.30,
                                "txt9": "13/06/2025",
                                "txt10": "18/06/2025",
                                "txt11": "Finalizado",
                                "txt12": false,
                                "txt13": "CVera"
                            },
                            {
                                "txt1": "1000985",
                                "txt2": "C0001",
                                "txt3": "San Hilario",
                                "txt4": "Ventas",
                                "txt5": "300510",
                                "txt6": "Cotización",
                                "txt7": "PEN",
                                "txt8": 1450.50,
                                "txt9": "01/06/2025",
                                "txt10": "",
                                "txt11": "Aprobado",
                                "txt12": false,
                                "txt13": "CVera"
                            },
                            {
                                "txt1": "30900",
                                "txt2": "C0002",
                                "txt3": "San Vicente",
                                "txt4": "Cotización",
                                "txt5": "",
                                "txt6": "",
                                "txt7": "PEN",
                                "txt8": 2350.15,
                                "txt9": "02/06/2025",
                                "txt10": "",
                                "txt11": "",
                                "txt12": false,
                                "txt13": "ALiendo"
                            },
                            {
                                "txt1": "159785",
                                "txt2": "C0002",
                                "txt3": "San Vicente",
                                "txt4": "Ventas",
                                "txt5": "300510",
                                "txt6": "Separacion",
                                "txt7": "PEN",
                                "txt8": 1500.00,
                                "txt9": "17/08/2025",
                                "txt10": "22/08/2025",
                                "txt11": "En Preparacion",
                                "txt12": false,
                                "txt13": "ALiendo"
                            },
                            {
                                "txt1": "1000795",
                                "txt2": "C0003",
                                "txt3": "San German",
                                "txt4": "Ventas",
                                "txt5": "",
                                "txt6": "",
                                "txt7": "PEN",
                                "txt8": 3000.00,
                                "txt9": "03/06/2025",
                                "txt10": "",
                                "txt11": "Pendiente Aprobar",
                                "txt12": true,
                                "txt13": "EYalan"
                            },
                            {
                                "txt1": "208895",
                                "txt2": "C0002",
                                "txt3": "San Vicente",
                                "txt4": "Ventas",
                                "txt5": "300568",
                                "txt6": "Cotización",
                                "txt7": "PEN",
                                "txt8": 2890.53,
                                "txt9": "06/06/2025",
                                "txt10": "08/06/2025",
                                "txt11": "Facturado",
                                "txt12": false,
                                "txt13": "Aliendo"
                            },
                            {
                                "txt1": "5896874",
                                "txt2": "C0003",
                                "txt3": "San Jeronimo",
                                "txt4": "Ventas",
                                "txt5": "300568",
                                "txt6": "Cotización",
                                "txt7": "PEN",
                                "txt8": 1896.53,
                                "txt9": "03/03/2025",
                                "txt10": "03/03/2025",
                                "txt11": "Rechazado",
                                "txt12": false,
                                "txt13": "CVera"
                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonDetalle: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "1000888",
                                "txt2": "1",
                                "txt3": "901997",
                                "txt4": "Material 1",
                                "txt5": "M2",
                                "txt6": 197.6,
                                "txt7": 197.6,
                                "txt8": 0,
                                "txt9": "Cerrado",
                                "txt10": 2,
                                "txt11": 0,
                                "txt12": ""

                            },
                            {
                                "txt1": "1000888",
                                "txt2": "2",
                                "txt3": "901966",
                                "txt4": "Material 2",
                                "txt5": "M2",
                                "txt6": 592.8,
                                "txt7": 550.8,
                                "txt8": 42,
                                "txt9": "Cerrado",
                                "txt10": 6,
                                "txt11": 0,
                                "txt12": ""

                            },
                            {
                                "txt1": "1000985",
                                "txt2": "1",
                                "txt3": "902051",
                                "txt4": "",
                                "txt5": "M2",
                                "txt6": 592.8,
                                "txt7": 0,
                                "txt8": 0,
                                "txt9": "Pendiente",
                                "txt10": 6,
                                "txt11": 0,
                                "txt12": ""

                            },
                            {
                                "txt1": "1000795",
                                "txt2": "",
                                "txt3": "",
                                "txt4": "",
                                "txt5": "",
                                "txt6": 0,
                                "txt7": 0,
                                "txt8": 0,
                                "txt9": "",
                                "txt10": 0,
                                "txt11": 0,
                                "txt12": ""
                            },
                            {
                                "txt1": "208895",
                                "txt2": "1",
                                "txt3": "906523",
                                "txt4": "",
                                "txt5": "M2",
                                "txt6": 398.5,
                                "txt7": 398.5,
                                "txt8": 0,
                                "txt9": "Cerrado",
                                "txt10": 4,
                                "txt11": 0,
                                "txt12": ""


                            },
                            {
                                "txt1": "208895",
                                "txt2": "2",
                                "txt3": "9608965",
                                "txt4": "",
                                "txt5": "M2",
                                "txt6": 106.8,
                                "txt7": 100.0,
                                "txt8": 6.8,
                                "txt9": "Cerrado",
                                "txt10": 8,
                                "txt11": 0,
                                "txt12": ""


                            },
                            {
                                "txt1": "5896874",
                                "txt2": "1",
                                "txt3": "78695785",
                                "txt4": "",
                                "txt5": "M2",
                                "txt6": 106.8,
                                "txt7": 0,
                                "txt8": 0,
                                "txt9": 0,
                                "txt10": 0,
                                "txt11": 0,
                                "txt12": ""


                            },
                            {
                                "txt1": "5896874",
                                "txt2": "2",
                                "txt3": "8962358",
                                "txt4": "",
                                "txt5": "M2",
                                "txt6": 220.5,
                                "txt7": 0,
                                "txt8": 0,
                                "txt9": 0,
                                "txt10": 0,
                                "txt11": 0,
                                "txt12": ""


                            },
                            {
                                "txt1": "159785",
                                "txt2": "1",
                                "txt3": "9605986",
                                "txt4": "",
                                "txt5": "M2",
                                "txt6": 300.4,
                                "txt7": 300.4,
                                "txt8": 0,
                                "txt9": "cerrado",
                                "txt10": 8,
                                "txt11": 0,
                                "txt12": ""


                            },
                            {
                                "txt1": "159785",
                                "txt2": "2",
                                "txt3": "7865896",
                                "txt4": "",
                                "txt5": "M2",
                                "txt6": 200.8,
                                "txt7": 200.8,
                                "txt8": 0,
                                "txt9": "cerrado",
                                "txt10": 0,
                                "txt11": 0,
                                "txt12": ""


                            },
                            {
                                "txt1": "159785",
                                "txt2": "3",
                                "txt3": "8958974",
                                "txt4": "",
                                "txt5": "M2",
                                "txt6": 220.5,
                                "txt7": 0,
                                "txt8": 220.5,
                                "txt9": "pendiente",
                                "txt10": 0,
                                "txt11": 0,
                                "txt12": ""


                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonListDespacho: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "1000888",
                                "txt2": "00080663146",
                                "txt3": "30/05/2025",
                                "txt4": "AV. TAHUANTINSUYO 1119 URB VALLE DEL SOL",
                                "txt5": "09-T141-0001580",
                                "txt6": 12836.090,
                                "txt7": 12638.470,
                                "txt8": "8",
                                "txt9": "8",
                            },
                            {
                                "txt1": "1000795",
                                "txt2": "",
                                "txt3": "",
                                "txt4": "",
                                "txt5": "",
                                "txt6": "",
                                "txt7": "",
                                "txt8": "",
                                "txt9": ""
                            },
                            {
                                "txt1": "208895",
                                "txt2": "00080659856",
                                "txt3": "01/06/2025",
                                "txt4": "AV. ARGENTINA 3190 CALLAO",
                                "txt5": "09-T141-0001736",
                                "txt6": 48965.070,
                                "txt7": 48569.445,
                                "txt8": "12",
                                "txt9": "12",
                            },
                            {
                                "txt1": "159785",
                                "txt2": "00080651234",
                                "txt3": "15/06/2025",
                                "txt4": "AV. EL SOL 124 - VMT",
                                "txt5": "09-T141-0001758",
                                "txt6": 800.00,
                                "txt7": 760.35,
                                "txt8": "12",
                                "txt9": "12",
                            }


                        ]
                    }
                };
                return oModel;
            },
            JsonListFacturas: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "1000888",
                                "txt2": "01-FF48-00096555",
                                "txt3": "PEN",
                                "txt4": 2300.00,
                                "txt5": -418.39,
                                "txt6": 338.69,
                                "txt7": 2220.30,
                                "txt8": "30/05/2025",
                                "txt9": "FN03-Factura Negociable 60 días",
                                "txt10": ""
                            },

                            {
                                "txt1": "1000795",
                                "txt2": "",
                                "txt3": "",
                                "txt4": "",
                                "txt5": "",
                                "txt6": "",
                                "txt7": "",
                                "txt8": "",
                                "txt9": "",
                                "txt10": "",
                            },
                            {
                                "txt1": "208895",
                                "txt2": "01-FF48-00097000",
                                "txt3": "PEN",
                                "txt4": 1789.69,
                                "txt5": -175.24,
                                "txt6": 256.25,
                                "txt7": 2890.53,
                                "txt8": "20/07/2025",
                                "txt9": "FN09-Factura Negociable 60 días",
                                "txt10": "07-F999-000000422"

                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonEstadoPedido: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "1000888",
                                "txt2": "1",
                                "txt3": "1",
                                "txt4": "1",
                                "txt5": "1",
                                "txt6": "1"
                            },
                            {
                                "txt1": "1000985",
                                "txt2": "1",
                                "txt3": "1",
                                "txt4": "0",
                                "txt5": "0",
                                "txt6": "0"
                            },
                            {
                                "txt1": "159785",
                                "txt2": "1",
                                "txt3": "1",
                                "txt4": "2",
                                "txt5": "0",
                                "txt6": "0"
                            },
                            {
                                "txt1": "208895",
                                "txt2": "1",
                                "txt3": "1",
                                "txt4": "1",
                                "txt5": "1",
                                "txt6": "0"
                            },
                            {
                                "txt1": "1000795",
                                "txt2": "1",
                                "txt3": "0",
                                "txt4": "0",
                                "txt5": "0",
                                "txt6": "0"
                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonDetSeguimiento: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "30900",
                                "txt2": "1",
                                "txt3": "901997",
                                "txt4": "Matrial Prueba 123",
                                "txt5": "M2",
                                "txt6": 1757.35,
                                "txt7": ""
                            },
                            {
                                "txt1": "30900",
                                "txt2": "2",
                                "txt3": "902051",
                                "txt4": "Material Prueba Ejemplo",
                                "txt5": "M2",
                                "txt6": 592.8,
                                "txt7": ""

                            }
                        ]
                    }
                };
                return oModel;
            },
            getI18nText: function (context, sText) {
                return context.oView.getModel("i18n") === undefined ? false : context.oView.getModel("i18n").getResourceBundle().getText(sText);
            },

        };

    });