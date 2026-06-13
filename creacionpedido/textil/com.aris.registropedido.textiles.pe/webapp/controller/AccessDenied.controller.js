sap.ui.define([
    "com/aris/registropedido/textiles/pe/controller/BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("com.aris.registropedido.textiles.pe.controller.AccessDenied", {

        onInit: function () {
            console.log("🚫 Vista AccessDenied iniciada");
        },

        onLogoutPress: function () {
            // 👉 Redirige al logout IAS o página principal
            const sLogoutURL =
                "https://ahwfveyj3.accounts.ondemand.com/logout?post_logout_redirect_uri=" +
                encodeURIComponent("https://cenit-dev-g1-ed8uyt5p.dt.launchpad.cfapps.us10.hana.ondemand.com");
            window.location.href = sLogoutURL;
        }
    });
});