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
                var oModel = {
                    Main: {
                        filter: {
                            cbMaterialGroup: [],
                            cbCodMaterial: [],      // miMaterial
                            cbDescMaterial: [],       // miDescMaterial
                            cbBrand: [],            // miBrand
                            cbTextileArticle: [],   // miTextileArticle
                            cbOrillo: [],           // miOrillo
                            iMinimumFootage: "",    // Input en XML (antes iMinFootage)
                            iGreaterFootage: "",    // Input en XML (antes iMaxFootage)
                            cbFormat: [],           // miFormat
                            miQuality: [],          // cbQuality (MultiComboBox)
                            cbStyle: [],            // miOrilloStyle
                            rbTipo: "TODOS",   
                            iTipoIndex: 2
                        },
                        showTipoFilter: false
                    },
                    oReporte: [],
                    oTreeCerBase: [],
                    oReporteCeraCliBase: [],
                    oDetalle: {},
                    oCabecera: {},
                    sIdioma: "esp"
                };
                return oModel;
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
            JsonGrupMat: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "Grupo 1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "Grupo 2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "Grupo 3")
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonCodigo: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtCodi1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtCodi2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtCodi3")
                            },
                            {
                                "sKey": "4",
                                "sText": this.getI18nText(context, "TxtCodi4")
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonMarca: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtMarca1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtMarca2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtMarca3")
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonArtTextil: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtArtTextil1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtArtTextil2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtArtTextil3")
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonReporteTextil: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "11111-450",
                                "txt2": "Barrington",
                                "txt3": 20,
                                "txt4": 80,
                                "txt5": 20,
                                "txt6": 30,
                                "txt7": 10,
                                "txt8": "MT",
                                "txt9": "Prueba"


                            },
                            {
                                "txt1": "11111-452",
                                "txt2": "Barrington",
                                "txt3": 0,
                                "txt4": 20,
                                "txt5": 0,
                                "txt6": 15,
                                "txt7": 5,
                                "txt8": "MT",
                                "txt9": "Prueba"

                            },
                            {
                                "txt1": "11111-489",
                                "txt2": "Lafayette",
                                "txt3": 40,
                                "txt4": 70,
                                "txt5": 10,
                                "txt6": 20,
                                "txt7": 15,
                                "txt8": "MT",
                                "txt9": "Prueba"

                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "Lafayette",
                                "txt3": 60,
                                "txt4": 100,
                                "txt5": 0,
                                "txt6": 30,
                                "txt7": 50,
                                "txt8": "MT",
                                "txt9": "Prueba"

                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonReporteQuimico: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "AAA",
                                "txt2": "PRODUCTO1",
                                "txt3": "L-001",
                                "txt4": 100,
                                "txt5": 90,
                                "txt6": "UN"
                            },
                            {
                                "txt1": "AAA",
                                "txt2": "PRODUCTO1",
                                "txt3": "L-002",
                                "txt4": 80,
                                "txt5": 75,
                                "txt6": "UN"

                            },
                            {
                                "txt1": "AAA",
                                "txt2": "PRODUCTO2",
                                "txt3": "X-013",
                                "txt4": 95,
                                "txt5": 90,
                                "txt6": "CJA"

                            },
                            {
                                "txt1": "BBB",
                                "txt2": "PRODUCTO2",
                                "txt3": "X-011",
                                "txt4": 50,
                                "txt5": 50,
                                "txt6": "UN"

                            },
                            {
                                "txt1": "BBB",
                                "txt2": "PRODUCTO2",
                                "txt3": "X-012",
                                "txt4": 100,
                                "txt5": 85,
                                "txt6": "CJA"

                            },

                            {
                                "txt1": "CCC",
                                "txt2": "PRODUCTO3",
                                "txt3": "X-001",
                                "txt4": 10,
                                "txt5": 0,
                                "txt6": "CJA"

                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonReporteCeramicos: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "901081",
                                "txt2": "REV MAD FORESTA MARRON 30X60 PRIM 1.44",
                                "txt3": "11",
                                "txt4": "300",
                                "txt5": "M2",
                                "txt6": 288.00,
                                "txt7": 5,
                                "txt8": 0
                            },
                            {
                                "txt1": "901081",
                                "txt2": "REV MAD FORESTA MARRON 30X60 PRIM 1.44",
                                "txt3": "12",
                                "txt4": "300",
                                "txt5": "M2",
                                "txt6": 1900.00,
                                "txt7": 33,
                                "txt8": 0

                            },
                            {
                                "txt1": "901081",
                                "txt2": "REV MAD FORESTA MARRON 30X60 PRIM 1.44",
                                "txt3": "13",
                                "txt4": "300",
                                "txt5": "M2",
                                "txt6": 345.60,
                                "txt7": 6,
                                "txt8": 0

                            },
                            {
                                "txt1": "901081",
                                "txt2": "REV MAD FORESTA MARRON 30X60 PRIM 1.44",
                                "txt3": "14",
                                "txt4": "300",
                                "txt5": "M2",
                                "txt6": 115.20,
                                "txt7": 0,
                                "txt8": 2

                            },
                            {
                                "txt1": "901252",
                                "txt2": "REV MAD FORESTA GRIS 30X60 PRIM 1.44",
                                "txt3": "11",
                                "txt4": "300",
                                "txt5": "M2",
                                "txt6": 40.50,
                                "txt7": 0,
                                "txt8": 2

                            },
                            {
                                "txt1": "901252",
                                "txt2": "REV MAD FORESTA GRIS 30X60 PRIM 1.44",
                                "txt3": "12",
                                "txt4": "300",
                                "txt5": "M2",
                                "txt6": 54.50,
                                "txt7": 0,
                                "txt8": 2

                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonReporteCeramicosImagen: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "901081",
                                "txt2": "901081.jpeg"
                            },
                            {
                                "txt1": "901252",
                                "txt2": "901252.jpeg"
                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonReporteTextilPieza: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "11111-450",
                                "txt2": "DetallePieza",
                                "txt3": "9911466-0",
                                "txt4": 53.2,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "311520",
                                "txt10": "SASTRERIA OLIVOS"
                            },
                            {
                                "txt1": "11111-450",
                                "txt2": "DetallePieza",
                                "txt3": "9911466-1",
                                "txt4": 51.9,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "210650",
                                "txt10": "T-5020 CAVALLO"

                            },
                            {
                                "txt1": "11111-452",
                                "txt2": "DetallePieza",
                                "txt3": "9914154-0",
                                "txt4": 50.6,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "120110",
                                "txt10": "STOCK"

                            },
                            {
                                "txt1": "11111-452",
                                "txt2": "DetallePieza",
                                "txt3": "9914154-1",
                                "txt4": 50.1,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "111510",
                                "txt10": "STOCK"

                            },
                            {
                                "txt1": "11111-489",
                                "txt2": "DetallePieza",
                                "txt3": "9511230-0",
                                "txt4": 13,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "*",
                                "txt8": "03/10/2024",
                                "txt9": "171358",
                                "txt10": "PZATIPO-HRP"
                            },
                            {
                                "txt1": "11111-489",
                                "txt2": "DetallePieza",
                                "txt3": "9511230-1",
                                "txt4": 25.9,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "189658",
                                "txt10": "CABALLEROS SA"

                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "DetallePieza",
                                "txt3": "9698563-0",
                                "txt4": 105.6,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "259868",
                                "txt10": "JULIOS SPORT"

                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "DetallePieza",
                                "txt3": "9698563-1",
                                "txt4": 115.9,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "256969",
                                "txt10": "CABALLERO SA"

                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonReporteTextilSContratado: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "11111-450",
                                "txt2": "DetallePieza",
                                "txt3": "9911466-0",
                                "txt4": 53.2,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "311520",
                                "txt10": "SASTRERIA OLIVOS"
                            },
                            {
                                "txt1": "11111-452",
                                "txt2": "DetallePieza",
                                "txt3": "9914154-0",
                                "txt4": 50.6,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "120110",
                                "txt10": "STOCK"

                            },
                            {
                                "txt1": "11111-452",
                                "txt2": "DetallePieza",
                                "txt3": "9914154-1",
                                "txt4": 50.1,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "111510",
                                "txt10": "STOCK"

                            },
                            {
                                "txt1": "11111-489",
                                "txt2": "DetallePieza",
                                "txt3": "9511230-0",
                                "txt4": 13,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "*",
                                "txt8": "03/10/2024",
                                "txt9": "171358",
                                "txt10": "PZATIPO-HRP"
                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "DetallePieza",
                                "txt3": "9698563-0",
                                "txt4": 105.6,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "259868",
                                "txt10": "JULIOS SPORT"

                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "DetallePieza",
                                "txt3": "9698563-1",
                                "txt4": 115.9,
                                "txt5": "1 Primera",
                                "txt6": "Nacional",
                                "txt7": "",
                                "txt8": "03/10/2024",
                                "txt9": "256969",
                                "txt10": "CABALLERO SA"

                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonReporteTextilSPendiente: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "11111-450",
                                "txt2": "7500447850",
                                "txt3": "HOMECENTERS PERUANOS S.A.",
                                "txt4": "26/01/2025",
                                "txt5": "M2",
                                "txt6": 1503.36,
                                "txt7": 207.36,
                                "txt8": 1296,
                                "txt9": "Despacho Parcial"
                            },
                            {
                                "txt1": "11111-450",
                                "txt2": "750045742",
                                "txt3": "CAMERON INDUSTRIES JOINERY LTD",
                                "txt4": "28/03/2025",
                                "txt5": "M2",
                                "txt6": 777.6,
                                "txt7": 0,
                                "txt8": 777.6,
                                "txt9": "No Aprobado",

                            },
                            {
                                "txt1": "11111-452",
                                "txt2": "750045654",
                                "txt3": "INVERSIONES CYS S.A.",
                                "txt4": "25/04/2025",
                                "txt5": "M2",
                                "txt6": 362.88,
                                "txt7": 0,
                                "txt8": 362.88,
                                "txt9": "No Aprobado"
                            },
                            {
                                "txt1": "11111-489",
                                "txt2": "750048912",
                                "txt3": "MERCADO Y BODEGA DE AZULEJOS Y BAÑO",
                                "txt4": "19/08/2025",
                                "txt5": "M2",
                                "txt6": 8398.08,
                                "txt7": 0,
                                "txt8": 8398.08,
                                "txt9": "No Aprobado"
                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "750069821",
                                "txt3": "CAVIFACOM CIA. LTDA",
                                "txt4": "26/05/2025",
                                "txt5": "M2",
                                "txt6": 1399.68,
                                "txt7": 0,
                                "txt8": 1399.68,
                                "txt9": "Aprobado"

                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "750089657",
                                "txt3": "TRANSFAR SUPPLIER S.A.",
                                "txt4": "17/04/2025",
                                "txt5": "M2",
                                "txt6": 2685.40,
                                "txt7": 0,
                                "txt8": 2685.40,
                                "txt9": "Aprobado"

                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonReporteTextilSSeparacion: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt1": "11111-450",
                                "txt2": "4000155",
                                "txt3": "MINISTERIO DE DEFENSA",
                                "txt4": "29200-325",
                                "txt5": 200,
                                "txt6": 300,
                                "txt7": "22/10/2024",
                                "txt8": "30/03/2025",
                                "txt9": 33,
                                "txt10": "CONVOCATORIA 001"
                            },
                            {
                                "txt1": "11111-450",
                                "txt2": "4000155",
                                "txt3": "MINISTERIO DE DEFENSA",
                                "txt4": "190201-320",
                                "txt5": 80,
                                "txt6": 3.2,
                                "txt7": "22/10/2024",
                                "txt8": "30/03/2025",
                                "txt9": 33,
                                "txt10": "CONVOCATORIA 001"

                            },
                            {
                                "txt1": "11111-452",
                                "txt2": "4000155",
                                "txt3": "MINISTERIO DE DEFENSA",
                                "txt4": "190201-360",
                                "txt5": 100,
                                "txt6": 29.80,
                                "txt7": "22/10/2024",
                                "txt8": "30/03/2025",
                                "txt9": 33,
                                "txt10": "CONVOCATORIA 001"
                            },
                            {
                                "txt1": "11111-489",
                                "txt2": "4000156",
                                "txt3": "SUNARP HUANCAYO",
                                "txt4": "280070-150",
                                "txt5": 60,
                                "txt6": 8,
                                "txt7": "24/10/2024",
                                "txt8": "10/03/2025",
                                "txt9": 53,
                                "txt10": "PROCESO 300"
                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "4000156",
                                "txt3": "SUNARP HUANCAYO",
                                "txt4": "121414-150",
                                "txt5": 75,
                                "txt6": 7,
                                "txt7": "24/10/2024",
                                "txt8": "10/03/2025",
                                "txt9": 53,
                                "txt10": "PROCESO 300"

                            },
                            {
                                "txt1": "11111-458",
                                "txt2": "4000156",
                                "txt3": "MINISTERIO DE DEFENSA",
                                "txt4": "141589-150",
                                "txt5": 90,
                                "txt6": 30,
                                "txt7": "24/10/2024",
                                "txt8": "10/03/2025",
                                "txt9": 53,
                                "txt10": "PROCESO 300"

                            }
                        ]
                    }
                };
                return oModel;
            },
            JsonOrillo: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtOrillo1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtOrillo2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtOrillo3")
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
                                "txt1": "1000985",
                                "txt2": "00080663146",
                                "txt3": "30/05/2025",
                                "txt4": "AV. TAHUANTINSUYO 1119 URB VALLE DEL SOL",
                                "txt5": "09-T141-0001580",
                                "txt6": "8",
                                "txt7": 12836.090,
                                "txt8": 12638.470,
                                "txt9": "8"
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
                                "txt6": "12",
                                "txt7": 48965.070,
                                "txt8": 48569.445,
                                "txt9": "12"
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
                                "txt1": "1000985",
                                "txt2": "01-FF48-00096555",
                                "txt3": "",
                                "txt4": "PEN",
                                "txt5": 7204.50,
                                "txt6": -1152.72,
                                "txt7": 1174.68,
                                "txt8": 7700.700,
                                "txt9": "30/05/2025",
                                "txt10": "FN03-Factura Negociable 60 días"
                            },
                            {
                                "txt1": "1000985",
                                "txt2": "01-FF48-00096554",
                                "txt3": "",
                                "txt4": "PEN",
                                "txt5": 7354.67,
                                "txt6": -1176.75,
                                "txt7": 1197.39,
                                "txt8": 7849.550,
                                "txt9": "30/05/2025",
                                "txt10": "FN17-Factura Negociable 53 días"
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
                                "txt3": "",
                                "txt4": "PEN",
                                "txt5": 1789.69,
                                "txt6": -175.24,
                                "txt7": 256.25,
                                "txt8": 1870.700,
                                "txt9": "01/06/2025",
                                "txt10": "FN09-Factura Negociable 30 días"

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
