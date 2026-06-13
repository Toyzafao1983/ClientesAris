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
                            fCodClient: [],      // Código de Cliente -> Customer
                            fRazSocial: [],      // Razón Social -> CustomerFullName
                            fDocument: [],       // Documento -> CustomerDni o CustomerRuc
                            fSeller: [],
                            purchaseOrder: "",
                            adjuntoOC: "",
                            ocExpDate: "",              // Fecha de expiración de la O
                            moneda: "",                 // Moneda
                            cbCondPago: "",             // Código de condición de pago (clave)
                            grupoMaterial: "",          // Grupo de material
                            tipoCambio: "",             // Tipo de cambio (puede ser solo visual)
                            motivo: "",                 // Motivo del pedido
                            destinoTextil: "",          // Input Textil/Cerámicos
                            destinoQuimicos: "",        // Input Químicos
                            destinoFinalFlag: false,    // Flag para mostrar destino final
                            destinoFinal: "",           // Input destino final
                            obsPedido: "",              // Observaciones del pedido
                            obsDelivery: "",            // Observaciones de entrega
                            separationHiring: "",       // Texto visual contratación
                            fechInicio: "",             // DatePicker inicio
                            fechFin: "",                // DatePicker fin
                            condicionEntrega: "",         // Condición de entrega seleccionada
                            emitGuia: "",                 // Input: guía de remisión
                            transporte: "",               // Input: transporte
                            direccionAgencia: "",         // Input: dirección de agencia
                            tipoEntrega: "",
                            vendedorSeleccionado: "",   // nuevo campo para guardar selección
                            oReporte: [],
                        }
                    },
                    inputForm: {
                        tipDocument: "",
                        igv: "",
                        showSeparationDates: false,
                        showCondPago: true,
                        bClienteExteriorZPEF: false,
                        showCondEntregaNormal: true,
                        showCourierEntrega: false,
                        showMotivo: true,
                        showObsDelivery: true,
                        showExportBultos: true,
                        showExportInstrucciones: true,
                        isTipoEmbarqueEnabled: true,
                        labelPuertoEmbarque: "Puerto Embarque",

                        PedExport: false,
                        fechInicio: "",
                        fechFin: "",

                        tipoEmbarque: "05",
                        tipoEmbarqueText: "",
                        puertoEmbarque: "",
                        puertoEmbarqueText: "",

                        bultos: "",
                        obsPedido: "",
                        obsDelivery: "",

                        courier: "",
                        courierText: "",

                        tipoCambio: "",
                    },
                    oDatCalculo: {},
                    oFormCliente: {},
                    oClienteSeleccionado: {},
                    oCliente: [],
                    oDetalle: {},
                    oSelecTableDetalle: {},
                    oCabecera: {},
                    sIdioma: "esp",
                    oSelectDetail: {}
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
            oModelPrueba: function () {
                let oModel = {}
                return oModel;
            },
            JsonDocument: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtTipDocument1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtTipDocument2")
                            },
                            {
                                "sKey": "3",
                                "sText": this.getI18nText(context, "TxtTipDocument3")
                            },
                            {
                                "sKey": "4",
                                "sText": this.getI18nText(context, "TxtTipDocument4")
                            },
                            {
                                "sKey": "5",
                                "sText": this.getI18nText(context, "TxtTipDocument5")
                            },
                            {
                                "sKey": "6",
                                "sText": this.getI18nText(context, "TxtTipDocument6")
                            }


                        ]
                    }
                };
                return oModel;
            },

            JsonMoneda: function (context) {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "sKey": "1",
                                "sText": this.getI18nText(context, "TxtTipMoney1")
                            },
                            {
                                "sKey": "2",
                                "sText": this.getI18nText(context, "TxtTipMoney2")
                            },
                        ]
                    }
                };
                return oModel;
            },
            JsonMaterial: function (context) {
                var oModel = {
                    "d": {
                        "results": [



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
                                "txt0": "P0001",
                                "txt1": "4500000514",
                                "txt2": "10",
                                "txt3": "Tela",
                                "txt4": "IN001",
                                "txt5": "10",
                                "txt6": "30",
                                "txt7": "USD",
                                "txt8": "610",
                                "txt9": "C1",
                                "txt10": "18%",
                                "txt11": "109,8",
                                "txt12": "109,8",
                                "txt13": "Tela-2",
                            },
                            {
                                "txt0": "P0002",
                                "txt1": "4500000514",
                                "txt2": "20",
                                "txt3": "Quimico",
                                "txt4": "IN001",
                                "txt5": "30",
                                "txt6": "30",
                                "txt7": "USD",
                                "txt8": "450",
                                "txt9": "C1",
                                "txt10": "18%",
                                "txt11": "109,8"
                            },
                            {
                                "txt0": "P0003",
                                "txt1": "4500000514",
                                "txt2": "20",
                                "txt3": "Textil",
                                "txt4": "IN001",
                                "txt5": "30",
                                "txt6": "30",
                                "txt7": "USD",
                                "txt8": "450",
                                "txt9": "C1",
                                "txt10": "18%",
                                "txt11": "109,8"
                            }

                        ]
                    }
                };
                return oModel;
            },
            JsonCliente: function () {
                var oModel = {
                    "d": {
                        "results": [
                            {
                                "txt0": "1000000103",
                                "txt1": "DISTRIBUIDORA CUMMINS PERU S.A.C",
                                "txt2": "20543725821",
                                "txt3": "Distribuidor",
                                "txt4": "FK02-Factura Negociable",
                                "txt5": "AV. ARGENTINA NRO. 4453 (CRUCE CON, CALLAO, CALLAO. PE",
                                "txt6": "044-2321312",
                                "txt7": "h@gmail.com",
                                "txt8": "8,000 USD",
                                "txt9": "6,000 USD",
                                "txt10": "Segmento 1",
                                "txt11": "Hugo Soler",
                                "txt12": "Tela",
                                "txt13": "P0001",
                                "txt14": "Tela-2",

                            },
                            {
                                "txt0": "1000000272",
                                "txt1": "SAN JORGE TRANSPORTES E INVERSIONES  SAC",
                                "txt2": "20503744245",
                                "txt3": "Distribuidor",
                                "txt4": "FK02-Factura Negociable",
                                "txt5": "LAS FABRICAS 239, SAN BORJA, LIMA,LIMA, PE",
                                "txt6": "044-2321312",
                                "txt7": "f@gmail.com",
                                "txt8": "8,000 USD",
                                "txt9": "6,000 USD",
                                "txt10": "Segmento 1",
                                "txt11": "Angel Soler",
                                "txt12": "Quimico",
                                "txt13": "P0002",
                                "txt14": "Quimico-2",


                            },
                            {
                                "txt0": "81000002",
                                "txt1": "TALMA S.A.C",
                                "txt2": "204322456744",
                                "txt3": "Distribuidor",
                                "txt4": "FK02-Factura Negociable",
                                "txt5": "v. Prueba 003",
                                "txt6": "044-2321312",
                                "txt7": "g@gmail.com",
                                "txt8": "8,000 USD",
                                "txt9": "6,000 USD",
                                "txt10": "Segmento 1",
                                "txt11": "Marlon Estefo",
                                "txt12": "Ceramico",
                                "txt13": "P0003",
                                "txt14": "Ceramico-2",

                            },
                        ]
                    }
                }
                return oModel
            },


            getI18nText: function (context, sText) {
                return context.oView.getModel("i18n") === undefined ? false : context.oView.getModel("i18n").getResourceBundle().getText(sText);
            },


        };

    });