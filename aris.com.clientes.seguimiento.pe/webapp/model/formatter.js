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
		formatUMVTextil: function (sUMV, sGrupoMaterial, sBrand) {
			const sUmv = (sUMV || "").trim().toUpperCase();
			const sGrupo = (sGrupoMaterial || "").trim();
			const sMarca = (sBrand || "").trim().toUpperCase();
			if (sUmv === "PQT") {
				return "PAQ";
			}
			const bSerie80 = sGrupo === "02";
			const bBelfast = sMarca.includes("BELFAST") || sMarca === "T01";
			if ((bSerie80 || bBelfast) && sUmv === "MTS") {
				return "Pzas";
			}

			return sUMV || "";
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
		_visibleNoCliente: function (bIsCliente) {
			return !bIsCliente;
		},
		_textSellerPrincipalSmart: function (bIsCliente, bpPrincipal, namePrincipal, bpSupport, nameSupport) {
			if (bIsCliente) return "";
			const a = (bpPrincipal || "").toString().trim();
			const b = (bpSupport || "").toString().trim();

			if (a && b && a === b) {
				return `${b} - ${(nameSupport || "").toString().trim()}`;
			}
			return `${a} - ${(namePrincipal || "").toString().trim()}`;
		},
		_visibleSupportSeller: function (bIsCliente, bpPrincipal, bpSupport) {
			if (bIsCliente) return false;
			const a = (bpPrincipal || "").toString().trim();
			const b = (bpSupport || "").toString().trim();
			if (!b) return false;
			return a !== b;
		},
		formatBultoEntero: function (vValue) {
			if (vValue === null || vValue === undefined || vValue === "") {
				return "0";
			}

			if (typeof vValue === "string") {
				vValue = vValue.replace(",", ".");
			}

			var nValue = parseFloat(vValue);

			if (isNaN(nValue)) {
				return "0";
			}

			return String(Math.round(nValue));
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
		formatUMVTextil: function (sUMV, sGrupoMaterial, sBrand) {
			const sUmv = (sUMV || "").trim().toUpperCase();
			const sGrupo = (sGrupoMaterial || "").trim();
			const sMarca = (sBrand || "").trim().toUpperCase();
			const bSerie80 = sGrupo === "02";
			const bBelfast = sMarca.includes("BELFAST") || sMarca === "T01";
			if ((bSerie80 || bBelfast) && sUmv === "MTS") {
				return "Pzas";
			}

			return sUMV || "";
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
		formatStockDialog: function (oDet) {
			if (!oDet) {
				return "";
			}

			const fnParse = function (value) {
				if (value === null || value === undefined || value === "") {
					return 0;
				}

				let sValue = String(value).trim().replace(/\s/g, "");
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

				const nValue = parseFloat(sValue);

				if (!Number.isFinite(nValue)) {
					return 0;
				}

				return bNegative ? -nValue : nValue;
			};

			const fnFormat = function (value) {
				const nValue = fnParse(value);
				const sAbs = Math.abs(nValue).toFixed(3);
				const aParts = sAbs.split(".");

				aParts[0] = aParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

				return (nValue < 0 ? "-" : "") + aParts.join(".");
			};

			const vValue = (oDet.StockDispoView !== undefined && oDet.StockDispoView !== null && oDet.StockDispoView !== "")
				? oDet.StockDispoView
				: oDet.StockDispo;

			return fnFormat(vValue);
		},
		formatCantidad: function (value) {
			if (value === null || value === undefined || value === "") {
				return "";
			}

			const n = parseFloat(String(value).replace(",", "."));

			if (isNaN(n)) {
				return value;
			}

			return Number.isInteger(n) ? n.toString() : n.toString();
		}

	};
});