sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../model/formatter",
    "sap/m/MessageBox"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
    function (Controller, formatter, MessageBox) {
        "use strict";

        return Controller.extend("zhb4.zhb4acceso.controller.Main", {
            formatter: formatter,
            onInit: function () {
                this.oTextos = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            onFavorito: function (oEvent) {
                var sPath = this.getView().getModel().createKey("/bpsAsociadosSet", {
                    Bp: oEvent.getSource().getBindingContext().getObject().Bp
                });

                this.getView().setBusy(true);
                var oEntry = {
                    Bp: oEvent.getSource().getBindingContext().getObject().Bp,
                    Email: "",
                    Perfil: "",
                    Cuit: "",
                    RazonSocial: "",
                    Favorito: ""
                };

                this.getView().getModel().update(sPath, oEntry, {
                    success: function (resultado) {
                        sap.m.MessageToast.show(this.oTextos.getText("mensaje_success_agregar_favorito"));
                        this.getView().setBusy(false);
                    }.bind(this),
                    error: function (error) {
                        sap.m.MessageToast.show("No se pudo settear Favorito");
                        this.getView().setBusy(false);
                    }
                });
            },

            onSeleccionar: function (oEvent) {
                var mensaje;
                var titulo = this.oTextos.getText("seleccionar_titulo");
                var vBP = oEvent.getSource().getBindingContext().getObject().Bp;
                var vNombre = oEvent.getSource().getBindingContext().getObject().RazonSocial;

                sap._sesionHB4 = { Bp: vBP, RazonSocial: vNombre };

                // setear el ID de cliente en header from
                var o = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function () {
                    var r = o.apply(this, arguments);
                    if (arguments[1].indexOf("sap/opu/odata/sap") > 0) {
                        this.setRequestHeader("from", sap._sesionHB4.Bp);
                    }
                    return r;
                };



                mensaje = this.oTextos.getText("seleccionar_mensaje", [vNombre, vBP]);

                MessageBox.success(mensaje, {
                    title: titulo,
                    onClose: this.onCloseMensaje
                });

                // disparar evento profertil/clienteSeleccionado
                //var oEventBus = sap.ui.getCore().getEventBus();
                //oEventBus.publish("profertil", "clienteSeleccionado", oEvent.getSource().getBindingContext().getObject());
            },
        });
    });
