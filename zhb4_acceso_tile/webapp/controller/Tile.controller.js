sap.ui.define([
	"sap/ui/core/mvc/Controller"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller) {
		"use strict";

        var oController;
		return Controller.extend("zhb4.zhb4accesotile.controller.Tile", {
			onInit: function () {
                oController = this;
            },
            
            onPressTile: function (oEvent) {
                oController.oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
                var oTarget = {};
                oTarget["semanticObject"] = "gestionAccesos";
                oTarget["action"] = "display";
                oController.oCrossAppNav.toExternal({
                    target: oTarget
                });
            }
		});
	});
