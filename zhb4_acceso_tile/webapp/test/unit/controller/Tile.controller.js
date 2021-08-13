/*global QUnit*/

sap.ui.define([
	"zhb4/zhb4_acceso_tile/controller/Tile.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Tile Controller");

	QUnit.test("I should test the Tile controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
