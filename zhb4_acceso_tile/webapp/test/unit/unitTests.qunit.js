/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zhb4/zhb4_acceso_tile/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
