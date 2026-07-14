sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";
	return {
		igv: 1.18,
		sinigv: 0.82,

		formatInteger: function (num) {
			if (num) {
				var x = parseInt(num);
				x = isNaN(x) ? '0' : x;
				return x.toString();
			}
		},

		currencyFormat: function (value) {
			try {
				if (value) {
					if (typeof (value) === 'string') {
						var sNumberReplace = value.replaceAll(",", "");
						var iNumber = parseFloat(sNumberReplace);
					} else if (typeof (value) === 'number') {
						var iNumber = parseFloat(value);
					}
					return iNumber.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
				} else {
					return "0.00";
				}
			}
			catch (ex) {
				return "0.00";
			}
		},
		currencyFormatTreeDig: function (value) {
			try {
				if (value) {
					if (typeof (value) === 'string') {
						var sNumberReplace = value.replaceAll(",", "");
						var iNumber = parseFloat(sNumberReplace);
					} else if (typeof (value) === 'number') {
						var iNumber = parseFloat(value);
					}
					return iNumber.toFixed(3).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
				} else {
					return "0.000";
				}
			}
			catch (ex) {
				return "0.000";
			}
		},
		currencyFormatIGV: function (value) {
			try {
				if (value) {
					if (typeof (value) === 'string') {
						var sNumberReplace = value.replaceAll(",", "");
						var iNumber = parseFloat(sNumberReplace) * this.igv;
					} else if (typeof (value) === 'number') {
						var iNumber = parseFloat(value) * this.igv;
					}
					return iNumber.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
				} else {
					return "0.00";
				}
			}
			catch (ex) {
				return "0.00";
			}
		},
		currencyFormatIGVTreeDig: function (value) {
			try {
				if (value) {
					if (typeof (value) === 'string') {
						var sNumberReplace = value.replaceAll(",", "");
						var iNumber = parseFloat(sNumberReplace) * this.igv;
					} else if (typeof (value) === 'number') {
						var iNumber = parseFloat(value) * this.igv;
					}
					return iNumber.toFixed(3).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
				} else {
					return "0.000";
				}
			}
			catch (ex) {
				return "0.000";
			}
		},
		formatMay: function (value) {
			if (value) { return value.toUpperCase(); }
			else { return ""; }
		},
		formatHour: function (oDate) {
			var aDate = oDate.toLocaleString().split(" ")[1].split(":");
			var sValue = "";
			sValue = this.completeZero(aDate[0]) + ":" + this.completeZero(aDate[1]) + ":" + this.completeZero(aDate[2]);
			return sValue;
		},
		formatDate: function (oDate) {
			var aDate = [];
			aDate[2] = String(oDate.getDate());
			aDate[1] = String(oDate.getMonth() + 1);
			aDate[0] = String(oDate.getFullYear());
			var sValue = "";
			sValue = this.completeZero(aDate[0]) + "-" + this.completeZero(aDate[1]) + "-" + this.completeZero(aDate[2]);
			return sValue;
		},
		completeZero: function (sValue) {
			if (sValue.length === 1) {
				sValue = "0" + sValue;
			}
			return sValue;
		},
		formatHourForSap: function (sTime) {
			var aValue = [];
			var sValue = "";
			if (sTime !== null && sTime !== "") {
				aValue = sTime.split(":");
				sValue = "PT" + aValue[0] + "H" + aValue[1] + "M" + aValue[2] + "S";
			} else {
				sValue = "PT00H00M00S";
			}
			return sValue;
		},
		formatDateForSap: function (sDate) {
			var sValue = "";
			if (sDate !== null && sDate !== "") {
				sValue = sDate + "T00:00:00";
			} else {
				sValue = null;
			}
			return sValue;
		},
		minDate: function (sDate) {
			var oDateInitial = new Date(sDate);
			var oDateFinal = new Date(oDateInitial.getFullYear(), oDateInitial.getMonth(), oDateInitial.getDate() + 1);
			return oDateFinal;
		},
		formatYYYYMMDDDateAbapDateSlash: function (e) {
			if (!this.isEmpty(e)) {
				var fecha = new Date(parseInt(e.replace("/Date(", "").replace(")/", "")));
				var fechaf = this.getYYYYMMDDHHMMSSSlash(fecha);
				return fechaf;
			} else { return ""; }
		},
		formatYYYYMMDDDateAbapDateHourSlash: function (e) {
			if (!this.isEmpty(e)) {
				var fecha = new Date(parseInt(e.replace("/Date(", "").replace(")/", "")));
				var fechaf = this.getYYYYMMDDHHMMSSSlash(fecha);
				return fechaf;
			} else { return ""; }
		},
		getYYYYMMDDHHMMSSSlash: function (e) {
			var t = e.getDate();
			var n = e.getMonth() + 1;
			var r = e.getFullYear();
			if (t < 10) { t = "0" + t; }
			if (n < 10) { n = "0" + n; }
			var o = r + "/" + n + "/" + t;
			var i = e.getHours();
			var u = e.getMinutes();
			var a = e.getSeconds();
			o = o + " " + this.zfill(i, 2) + ":" + this.zfill(u, 2) + ":" + this.zfill(a, 2);
			return o
		},
		zfill: function (number, width) {
			var numberOutput = Math.abs(number); /* Valor absoluto del número */
			var length = number.toString().length; /* Largo del número */
			var zero = "0"; /* String de cero */

			if (width <= length) {
				if (number < 0) {
					return ("-" + numberOutput.toString());
				} else {
					return numberOutput.toString();
				}
			} else {
				if (number < 0) {
					return ("-" + (zero.repeat(width - length)) + numberOutput.toString());
				} else {
					return ((zero.repeat(width - length)) + numberOutput.toString());
				}
			}
		},
		formatDayDateHana: function (e) {
			if (e) {
				var split = e.split("T");
				var date = split[0].replaceAll("-", "/");
				var fechaf = this.reverseStringForParameter(date, "/");;
				return fechaf;
			}
		},
		formatYYYYMMDDAbap: function (e) {
			if (!this.isEmpty(e)) {
				var fecha = new Date(e.substr(0, 4) + "/" + e.substr(4, 2) + "/" + e.substr(6, 2));
				var fechaf = this.onGetFormatDate(fecha);
				return fechaf;
			} else { return ""; }
		},
		formatHHMMSSAbap: function (e) {
			if (!this.isEmpty(e)) {
				var sHourf = e.substr(0, 2) + ":" + e.substr(2, 2) + ":" + e.substr(4, 2);
				return sHourf;
			} else { return ""; }
		},
		getYYYYMMDDHHMMSS: function (e) {
			var t = e.getDate();
			var n = e.getMonth() + 1;
			var r = e.getFullYear();
			if (t < 10) {
				t = "0" + t
			}
			if (n < 10) {
				n = "0" + n
			}
			var o = r + "-" + n + "-" + t;
			var i = e.getHours();
			var u = e.getMinutes();
			var a = e.getSeconds();
			o = o + " " + this.zfill(i, 2) + ":" + this.zfill(u, 2) + ":" + this.zfill(a, 2);
			return o
		},
		convertformatDateTotalAbapInDateTotal: function (sValueDate, sValueHour) {
			if (sValueDate != null && sValueDate != "") {
				var hour = "";
				if (sValueHour != null && sValueHour != "") {
					hour = this.convertformatHourAbapInHour(sValueHour);
				}
				var fecha = "";
				if (hour) {
					fecha = new Date(sValueDate.substr(0, 4) + "/" + sValueDate.substr(4, 2) + "/" + sValueDate.substr(6, 2) + " " + hour);
				} else {
					fecha = new Date(sValueDate.substr(0, 4) + "/" + sValueDate.substr(4, 2) + "/" + sValueDate.substr(6, 2));
				}
				return fecha;
			} else {
				return sValue;
			}
		},
		convertformatDateAbapInDate: function (sValue) {
			if (sValue != null && sValue != "") {
				var fecha = new Date(sValue.substr(0, 4) + "/" + sValue.substr(4, 2) + "/" + sValue.substr(6, 2));
				return fecha;
			} else {
				return sValue;
			}
		},
		convertformatHourAbapInHour: function (sValue) {
			if (sValue != null && sValue != "") {
				var hour = sValue.substr(0, 2) + ":" + sValue.substr(2, 2) + ":" + sValue.substr(4, 2);
				return hour;
			} else {
				return sValue;
			}
		},
		convertformatDateInAbap: function (sValue) {
			if (sValue != null && sValue != "") {
				var t = (sValue.getDate()).toString();
				var n = (sValue.getMonth() + 1).toString();
				var r = (sValue.getFullYear()).toString();
				if (t < 10) {
					t = "0" + t
				}
				if (n < 10) {
					n = "0" + n
				}
				var o = r + n + t;
				return o;
			} else {
				return sValue;
			}
		},
		reformatDateString: function (s) {
			var b = s.split(/\D/);
			return b.reverse().join('/');
		},
		formatDayRayDateSl: function (value) {
			if (value) {
				var date = value.replaceAll("-", "/");
				return date;
			} else {
				return "";
			}
		},
		formatDaySlDateRay: function (value) {
			if (value) {
				var date = value.replaceAll("/", "-");
				return date;
			} else {
				return "";
			}
		},
		isEmpty: function (inputStr) {
			var flag = false;
			if (inputStr === '') { flag = true; }
			if (inputStr === null) { flag = true; }
			if (inputStr === undefined) { flag = true; }
			if (inputStr == null) { flag = true; }
			return flag;
		},
		cleanCustomerFullName: function (sFullName) {
			if (!sFullName) {
				return "";
			}
			let sName = sFullName;
			sName = sName.replace(/(.+)\1+/, "$1");
			if (sName.includes("/")) {
				sName = sName.split("/")[0];
			}
			sName = sName.trim();

			return sName;
		},

		getDocumento: function (oContext) {
			if (!oContext) return "";

			return (
				oContext.TaxNumber1 ||
				oContext.TaxNumber2 ||
				oContext.TaxNumber3 ||
				oContext.TaxNumber4 ||
				oContext.TaxNumber5 ||
				oContext.TaxNumber6 ||
				""
			);
		},
		getDocumento: function (oContext) {
			if (!oContext) return "";

			return (
				oContext.TaxNumber1 ||
				oContext.TaxNumber2 ||
				oContext.TaxNumber3 ||
				oContext.TaxNumber4 ||
				oContext.TaxNumber5 ||
				oContext.TaxNumber6 ||
				""
			);
		},
		getFirstTaxNumber: function (oCliente) {
			if (!oCliente) return "";
			for (let i = 1; i <= 6; i++) {
				const tax = oCliente["TaxNumber" + i];
				if (tax && tax.trim() !== "") {
					return tax.trim();
				}
			}
			return "";
		},

		formatTipDocumentText: function (sKey) {
			if (!sKey) return "";

			// Obtener la lista de documentos desde el modelo
			const aDocuments = this.getOwnerComponent().getModel("oModelData").getProperty("/oTipDocumentData");
			if (!aDocuments) return sKey;

			// Buscar el texto del key seleccionado
			const oDoc = aDocuments.find(doc => doc.key === sKey);
			return oDoc ? oDoc.text : sKey; // Devuelve el texto si existe, si no, el key
		},
		_formatDateForSAP: function (sDate) {
			if (!sDate) return "";

			try {
				// Recibe en formato dd/MM/yyyy
				const [day, month, year] = sDate.split("/");
				const oDate = new Date(`${year}-${month}-${day}T00:00:00`);

				// Retorna en formato ISO que SAP entiende
				return oDate.toISOString().split("T")[0] + "T00:00:00";
			} catch (e) {
				void 0;
				return "";
			}
		},
		formatCreditUSD: function (vValue) {
			if (vValue === null || vValue === undefined || vValue === "") {
				return "00.00 USD";
			}

			// Aseguramos número
			var nValue = parseFloat(vValue);
			if (isNaN(nValue)) {
				return "00.00 USD";
			}

			// Formato con miles (,) y 2 decimales
			var sFormatted = nValue.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});

			return sFormatted + " USD";
		},
		formatMonto2Dec: function (vValue) {
			if (vValue === null || vValue === undefined || vValue === "") {
				return "0.00";
			}

			var nValue = parseFloat(vValue);
			if (isNaN(nValue)) {
				return "0.00";
			}

			return nValue.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
		},
		formatTotalMtsPedido: function (aMateriales) {
			if (!Array.isArray(aMateriales)) {
				return "0.000";
			}

			const fnParse = function (vValue) {
				if (vValue === null || vValue === undefined || vValue === "") {
					return 0;
				}

				if (typeof vValue === "number") {
					return Number.isFinite(vValue) ? vValue : 0;
				}

				let sValue = String(vValue).trim().replace(/\s/g, "");

				if (!sValue) {
					return 0;
				}

				if (sValue.indexOf(",") > -1 && sValue.indexOf(".") > -1) {
					sValue = sValue.replace(/,/g, "");
				} else {
					sValue = sValue.replace(",", ".");
				}

				const nValue = parseFloat(sValue);
				return isNaN(nValue) ? 0 : nValue;
			};

			let nTotal = 0;

			aMateriales.forEach(function (oItem) {
				if (!oItem || oItem.esBolsa) {
					return;
				}

				const sUM = String(
					oItem.UMV ||
					oItem.TargetQu ||
					oItem.Um ||
					oItem.Uom ||
					"MTS"
				).trim().toUpperCase();

				if (sUM && sUM !== "MTS") {
					return;
				}

				const nCantidad = fnParse(
					oItem.cantidad ||
					oItem.Cantidad ||
					oItem.ReqQty ||
					"0"
				);

				if (nCantidad > 0) {
					nTotal += nCantidad;
				}
			});

			return nTotal.toLocaleString("en-US", {
				minimumFractionDigits: 3,
				maximumFractionDigits: 3
			});
		},
		formatMaterialWithDesc: function (sMaterial, sDescription) {
			if (!sMaterial) {
				return "";
			}
			if (!sDescription) {
				return sMaterial;
			}
			return sMaterial + " - " + sDescription;
		},
		formatODataDateNoTZ: function (sODataDate) {
			if (!sODataDate) {
				return "";
			}
			var aMatch = /Date\((-?\d+)\)/.exec(sODataDate);
			if (!aMatch) {
				return sODataDate; // por si viene ya formateado
			}
			var iMillis = parseInt(aMatch[1], 10);
			if (isNaN(iMillis)) {
				return "";
			}
			var oDate = new Date(iMillis);
			var iYear = oDate.getUTCFullYear();
			var iMonth = oDate.getUTCMonth() + 1;  // 0-11
			var iDay = oDate.getUTCDate();
			var sDay = String(iDay).padStart(2, "0");
			var sMonth = String(iMonth).padStart(2, "0");
			return sDay + "." + sMonth + "." + iYear;
		},
		formatDateToODataNoTZ: function (oDate) {
			if (!oDate) {
				return "";
			}
			const pad = function (n) { return n < 10 ? "0" + n : String(n); };

			const year = oDate.getFullYear();
			const month = pad(oDate.getMonth() + 1);
			const day = pad(oDate.getDate());

			// Sin zona horaria, hora 00:00:00
			return year + "-" + month + "-" + day + "T00:00:00";
		},
		formatStockDialog: function (oDet) {
			if (!oDet) return "";
			const v = (oDet.StockDispoView !== undefined && oDet.StockDispoView !== null && oDet.StockDispoView !== "")
				? oDet.StockDispoView
				: oDet.StockDispo;

			// Reusa tu lógica de cantidad si quieres (entero vs decimal)
			const n = parseFloat(String(v).replace(",", "."));
			if (isNaN(n)) return "";
			return n.toFixed(3); // o tu formatCantidad si prefieres
		},
		stockState: function (v) {
			if (v === null || v === undefined || v === "") {
				return "Error";
			}

			let sValue = String(v).trim().replace(/\s/g, "");
			let bNegative = false;

			if (sValue.endsWith("-")) {
				bNegative = true;
				sValue = sValue.slice(0, -1);
			}

			if (sValue.startsWith("-")) {
				bNegative = true;
				sValue = sValue.slice(1);
			}

			if (sValue.includes(",") && sValue.includes(".")) {
				if (sValue.lastIndexOf(".") > sValue.lastIndexOf(",")) {
					sValue = sValue.replace(/,/g, "");
				} else {
					sValue = sValue.replace(/\./g, "").replace(",", ".");
				}
			} else if (sValue.includes(",")) {
				const aParts = sValue.split(",");
				const bLooksLikeThousands =
					aParts.length > 1 &&
					aParts.slice(1).every(function (sPart) {
						return /^\d{3}$/.test(sPart);
					});

				if (bLooksLikeThousands) {
					sValue = sValue.replace(/,/g, "");
				} else {
					sValue = sValue.replace(",", ".");
				}
			}

			let nValue = parseFloat(sValue);

			if (!Number.isFinite(nValue)) {
				return "Error";
			}

			if (bNegative) {
				nValue = -nValue;
			}

			return nValue <= 0 ? "Error" : "Success";
		},
		formatUMVTextil: function (sUMV, sGrupoMaterial) {
			const sUmv = (sUMV || "").trim().toUpperCase();
			const sGrupo = (sGrupoMaterial || "").trim();
			const bSerie80 = sGrupo === "02";
			const bBelfast = sGrupo === "03";
			if ((bSerie80 || bBelfast) && sUmv === "MTS") {
				return "Pzas";
			}

			return sUMV || "";
		},
		formatUnidadTotalTextil: function (sGrupoMaterial) {
			const sGrupo = (sGrupoMaterial || "").trim();
			return sGrupo === "02" || sGrupo === "03" ? "PZAS" : "MTS";
		},
		formatCreditWithCurrency: function (vValue, sCurrency) {
			if (vValue === null || vValue === undefined || vValue === "") {
				return "0.00" + (sCurrency ? " " + sCurrency : "");
			}

			var nValue = parseFloat(vValue);
			if (isNaN(nValue)) {
				return "0.00" + (sCurrency ? " " + sCurrency : "");
			}

			var sFormatted = nValue.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});

			return sFormatted + (sCurrency ? " " + sCurrency : "");
		},

		formatAssignedCreditByFlag: function (vValue, sCurrency, bFlagClc) {
			if (!bFlagClc) {
				return "SLC";
			}

			if (vValue === null || vValue === undefined || vValue === "") {
				return "0.00" + (sCurrency ? " " + sCurrency : "");
			}

			var nValue = parseFloat(vValue);
			if (isNaN(nValue)) {
				return "0.00" + (sCurrency ? " " + sCurrency : "");
			}

			var sFormatted = nValue.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});

			return sFormatted + (sCurrency ? " " + sCurrency : "");
		},
	};
});
