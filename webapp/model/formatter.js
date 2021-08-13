sap.ui.define([], function () {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		visibleFavorito: function (pFavorito) {
			if (pFavorito === "X") {
				return true;
			}else{
                return false;
            }
        },
        
        puedeAgregarTexto: function (sPuedeAgregar) {
			if (sPuedeAgregar === "X") {
				return "Si Puede Agregar";
			}else{
                return "No Puede Agregar";
            }
		}

	};

});