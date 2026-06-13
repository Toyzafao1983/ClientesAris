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
			const aDocuments = this.getOwnerComponent().getModel("oModelData").getProperty("/oTipDocumentData");
			if (!aDocuments) return sKey;
			const oDoc = aDocuments.find(doc => doc.key === sKey);
			return oDoc ? oDoc.text : sKey; // Devuelve el texto si existe, si no, el key
		},
		_formatDateForSAP: function (sDate) {
			if (!sDate) return null;

			try {
				if (typeof sDate === "string" && /^\/Date\(\d+\)\/$/.test(sDate)) {
					return sDate;
				}
				if (sDate instanceof Date) {
					const time = Date.UTC(
						sDate.getFullYear(),
						sDate.getMonth(),
						sDate.getDate()
					);
					return "/Date(" + time + ")/";
				}
				if (typeof sDate !== "string") {
					sDate = String(sDate);
				}
				if (sDate.includes("-")) {
					const s = sDate.substring(0, 10);
					const [year, month, day] = s.split("-");
					const time = Date.UTC(+year, +month - 1, +day);
					return "/Date(" + time + ")/";
				}
				if (sDate.includes("/")) {
					const [day, month, year] = sDate.split("/");
					const time = Date.UTC(+year, +month - 1, +day);
					return "/Date(" + time + ")/";
				}
				if (/^\d{8}$/.test(sDate)) {
					const year = sDate.slice(0, 4);
					const month = sDate.slice(4, 6);
					const day = sDate.slice(6, 8);
					const time = Date.UTC(+year, +month - 1, +day);
					return "/Date(" + time + ")/";
				}
				return null;

			} catch (e) {
				return null;
			}
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

		formatMaterialWithDesc: function (sMaterial, sDesc) {
			if (!sMaterial && !sDesc) { return ""; }
			if (!sMaterial) { return sDesc || ""; }
			if (!sDesc) { return sMaterial || ""; }
			return sMaterial + " - " + sDesc;
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
		formatPesoKg: function (vPeso) {
			if (vPeso === null || vPeso === undefined || vPeso === "") {
				return "";
			}

			var nPeso = parseFloat(String(vPeso).replace(/,/g, ""));
			if (isNaN(nPeso) || nPeso === 0) {
				return "";
			}

			return nPeso.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
				useGrouping: true
			});
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
		visibleNoClienteYVendedor: function (bIsCliente, bIsVendedor) {
			return !bIsCliente && !!bIsVendedor;
		},

		// Visible solo si NO es cliente y ES coordinador
		visibleNoClienteYCoord: function (bIsCliente, bIsCoord) {
			return !bIsCliente && !!bIsCoord;
		},
		formatPct: function (v) {
			const n = parseFloat(v);
			if (isNaN(n) || n <= 0) {
				return "0%";
			}
			return n.toString().replace(/\.0+$/, "") + "%";
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