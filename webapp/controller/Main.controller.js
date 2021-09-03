sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/History",
    "sap/ui/core/EventBus"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
    function (Controller, formatter, MessageBox, MessageToast, Fragment, JSONModel, Filter, FilterOperator, History, EventBus) {
        "use strict";

        var oController;
        return Controller.extend("zhb4.zhb4acceso.controller.Main", {
            formatter: formatter,
            onInit: function () {
                oController = this;
                this.oTextos = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                //-------------------Inicio JOLU1----------------------
                this.getView().setModel(this.getOwnerComponent().getModel("landingMDL"), "landingMdl");
                this.getView().setModel(this.getOwnerComponent().getModel("nosisMDL"), "nosisMDL");
                this._cargarModelos();
                //-------------------Fin JOLU1----------------------
            },

            onFavorito: function (oEvent) {
                var that= this;
                var oObject = oEvent.getSource().getBindingContext("ModelCuentas").getObject();
                var msg = that.oTextos.getText("mensaje_guardar_favorito");
                var tit = that.oTextos.getText("mensaje_confirmar");
                MessageBox.show(
                    msg, {
                    icon: MessageBox.Icon.INFORMATION,
                    title: tit,
                    actions: [MessageBox.Action.CANCEL, MessageBox.Action.OK],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction == 'OK') {
                            this._onSetearFavorito(oObject);
                        }

                    }.bind(this)
                }
                )

            },

            _onSetearFavorito: function (oObject) {
                var that = this;
                var sPath = this.getView().getModel().createKey("/bpsAsociadosSet", {
                    Bp: oObject.Bp
                });

                this.getView().setBusy(true);
                var oEntry = {
                    Bp: oObject.Bp,
                    Email: "",
                    Perfil: "",
                    Cuit: "",
                    RazonSocial: "",
                    Favorito: ""
                };

                this.getView().getModel().update(sPath, oEntry, {
                    success: function (resultado) {
                        // sap.m.MessageToast.show(that.oTextos.getText("mensaje_success_agregar_favorito"), {
                        //     onClose: window.location.reload(true)
                        // });
                        var tit = that.oTextos.getText("mensaje_mod_success");
                        this.getView().setBusy(false);
                        MessageBox.success(that.oTextos.getText("mensaje_success_agregar_favorito"), {
                            title: tit,
                            onClose: function () {
                                var oCrossAppNav = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("CrossApplicationNavigation");
                                var href_display = (oCrossAppNav && oCrossAppNav.toExternal({
                                    target: {
                                        semanticObject: "Shell",
                                        action: "home"
                                    }
                                })) || "";
                            }
                        });
                    }.bind(this),
                    error: function (error) {
                        sap.m.MessageToast.show(that.oTextos.getText("mensaje_error_favorito"));
                        this.getView().setBusy(false);
                    }
                });
            },

            onSeleccionar: function (oEvent) {
                var mensaje;
                var titulo = this.oTextos.getText("seleccionar_titulo");
                var vBP = oEvent.getSource().getBindingContext("ModelCuentas").getObject().Bp;
                var vNombre = oEvent.getSource().getBindingContext("ModelCuentas").getObject().RazonSocial;

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

                // storage write
                var sStid = "BpLogueado";
                if (!jQuery.sap.storage.put(sStid, vBP)) {
                    var oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.session);
                    oStorage.put(sStid, vBP);
                }

                MessageBox.success(mensaje, {
                    title: titulo,
                    onClose: this.onCloseMensaje
                });

                // disparar evento profertil/clienteSeleccionado
                //var oEventBus = sap.ui.getCore().getEventBus();
                //oEventBus.publish("profertil", "clienteSeleccionado", oEvent.getSource().getBindingContext().getObject());
            },

            //-------------------Inicio JOLU1----------------------

            onAfterRendering: function () {
                this._traerCuentas();
                this._cargarFragments();
            },

            onUpdateFinished: function (oEvent) {
                var aItems = oEvent.getSource().getItems();
                if (aItems.length > 0) {
                    var oItem = aItems[0].getBindingContext("ModelCuentas").getObject();
                    var oViewModel = this.getView().getModel("viewModel");

                    if (oItem.EsInterno === "X") {
                        oViewModel.setProperty("/puedeAgregarCuenta", false);
                        oViewModel.setProperty("/puedeAgregarUsuario", false);
                        oViewModel.setProperty("/EsInterno", true);
                    } else {
                        oViewModel.setProperty("/EsInterno", false);
                        if (oItem.PuedeGenerarCuenta === "X") {
                            oViewModel.setProperty("/puedeAgregarCuenta", true);
                        } else {
                            oViewModel.setProperty("/puedeAgregarCuenta", false);
                        }

                        oViewModel.setProperty("/puedeAgregarUsuario", true);
                    }
                    // if (oItem.PuedeGenerarUsuario === "X") {
                    //     oViewModel.setProperty("/puedeAgregarUsuario", true);
                    // } else {
                    //     oViewModel.setProperty("/puedeAgregarUsuario", true);
                    // }
                }
            },

            onCloseMensaje: function () {
                //cuando cierra el mensaje reviso si realizo el onboarding
                oController.getView().getModel("onBoarding").read("/datosLandingSet(partner='1',cuit='1')", {
                    success: function (oResponse) {
                        if (oResponse.onBoardingCompleto) {
                            // console.log("Completó el onboarding");
                            // window.history.go(-1); //navega al launchpad
                            // var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                            // // // Nav al inicio
                            // oCrossAppNavigator.toExternal({
                            //     target: {
                            //         shellHash: "#/pluginOnboarding.hb4pluginOnboarding/~171220193709+0000~/"
                            //     }
                            // });
                            // window.location.reload(document.referrer);
                            // location.replace(document.referrer);
                            var oCrossAppNav = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("CrossApplicationNavigation");
                            var href_display = (oCrossAppNav && oCrossAppNav.toExternal({
                                target: {
                                    semanticObject: "Shell",
                                    action: "home"
                                }
                            })) || "";
                            // window.open('https://bioxqas.cpp.cfapps.us21.hana.ondemand.com/site?siteId=d6945a69-27cd-4675-af10-18d0ef6425ea#Shell-home', '_blank');
                            // window.location.reload(true);
                        } else {
                            // console.log("Aún no completó el onboarding");
                            oController.navtoOnboarding(); // si no lo hizo navega
                        }
                    },
                    error: function (oError) {
                        // console.log("Error al determinar si completó el onboarding");
                        oController.navtoOnboarding();
                    }
                });
            },

            navtoOnboarding: function () {
                //metodo para navegar al onboarding
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"),
                    hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                        target: {
                            semanticObject: "Onboarding",
                            action: "display"
                        }
                    })) || "";

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                });
            },

            onFiltrarCuentas: function () {
                //metodo de filtro
                var datos = oController.getView().byId("idTablaBPs").getBinding("items");

                var filtro = new Filter([], true);

                var sRazonSocial = this.getView().byId("_inpRS").getValue();

                var sCuit = this.getView().byId("_inpCuit").getValue();

                if (sRazonSocial) {
                    filtro.aFilters.push(new Filter("RazonSocial", FilterOperator.Contains, sRazonSocial));
                }

                if (sCuit) {
                    filtro.aFilters.push(new Filter("Cuit", FilterOperator.Contains, sCuit));
                }

                datos.filter(filtro, "Application");
            },

            //Agregar Usuario
            onAltaUsuario: function () {
                //cargo modelo vacío add user
                var oDataAdd = {
                    email: "",
                    valueStateMail: "None",
                    rol: false,
                    esApoderado: false,
                    mostrarEstatuto: false,
                    PuedeAgregar: true,
                    PuedeGenerarNF: true
                };
                this.getView().getModel("ModelAddUser").setData(oDataAdd);

                this._oDialogAddUser.open();
                this.getView().byId("fileUploaderAct").clear();
                this.getView().byId("fileUploaderEst").clear();
                this._setCuentaDefault();
            },

            onCancelarUser: function () {
                this._oDialogAddUser.close();
            },

            onSeleccionarCuenta: function (oEvent) {
                var sCuenta = oEvent.getSource().getSelectedItem().getBindingContext("ModelCuentas").getObject()
                this._validarSiPuedeAgregar(sCuenta);
            },

            _validarSiPuedeAgregar: function (oCuenta) {
                var oAddData = this.getView().getModel("ModelAddUser").getData();
                oAddData.PuedeAgregar = true;
                oAddData.PuedeGenerarNF = true;
                if (oCuenta.PuedeGenerarUsuario !== "X") {
                    oAddData.PuedeAgregar = false;
                }
                if (oCuenta.PuedeGenerarNF !== "X") {
                    oAddData.PuedeGenerarNF = false;
                }
                this.getView().getModel("ModelAddUser").refresh();
            },

            onValidarMail: function (oEvent) {
                //validar si ingreso un mail con la estructura correcta
                var sMail = oEvent.getSource().getValue();
                var bValidado = this._esMailValido(sMail);
                var oAddData = this.getView().getModel("ModelAddUser").getData();
                if (bValidado) {
                    oAddData.valueStateMail = "None";
                } else {
                    oAddData.valueStateMail = "Error";
                }
                this.getView().getModel("ModelAddUser").refresh();
            },

            onValidarRol: function (oEvent) {
                //validar que rol ingresó para mostrar la carga del estatuto
                // var sRol = oEvent.getSource().getSelectedKey();
                var sRol = oEvent.getSource().getState();
                var oAddData = this.getView().getModel("ModelAddUser").getData();
                oAddData.esApoderado = false;
                if (sRol) {
                    oAddData.mostrarEstatuto = true;
                } else {
                    oAddData.mostrarEstatuto = false;
                    this.getView().byId("fileUploaderAct").clear();
                    this.getView().byId("fileUploaderEst").clear();
                }
                this.getView().getModel("ModelAddUser").refresh();
            },

            onValidarApoderado: function (oEvent) {
                //validar si es apoderado
                var sCheck = oEvent.getSource().getState();
                var oAddData = this.getView().getModel("ModelAddUser").getData();
                this.getView().byId("fileUploaderAct").clear();
                if (sCheck) {
                    oAddData.esApoderado = true;
                } else {
                    oAddData.esApoderado = false;
                }
                this.getView().getModel("ModelAddUser").refresh();
            },

            onGuardarUser: function () {
                var oAddData = this.getView().getModel("ModelAddUser").getData();
                var bMailValidado = this._esMailValido(oAddData.email);
                //valido si selecciono cuenta
                if (!oAddData.bp) {
                    MessageToast.show(this.oTextos.getText("msj_sel_cuenta"));
                    return;
                }

                //valido si ingreso nombre
                if (!oAddData.nombre) {
                    MessageToast.show(this.oTextos.getText("msj_ing_nombre"));
                    return;
                }

                //valido si ingreso apellido
                if (!oAddData.apellido) {
                    MessageToast.show(this.oTextos.getText("msj_ing_apellido"));
                    return;
                }

                //valido si ingreso mail correcto
                if (!bMailValidado) {
                    MessageToast.show(this.oTextos.getText("msj_ing_mail"));
                    return;
                }
                var that = this;

                //realizo la carga de la solicitud
                this.getView().byId("dialogAddUser").setBusy(true);
                var oDatos = {};
                oDatos.Id = "1";
                oDatos.TipoSolicitud = "U";
                oDatos.UserBp = oAddData.bp;
                //saco la razon social del bp seleccionado
                if(this.getView().byId("cboCuenta").getSelectedItem()){
                    var oCuenta = this.getView().byId("cboCuenta").getSelectedItem().getBindingContext("ModelCuentas").getObject();
                    oDatos.BpRazonSocial = oCuenta.RazonSocial;
                }
                oDatos.UserNombre = oAddData.nombre;
                oDatos.UserApellido = oAddData.apellido;
                oDatos.UserMail = oAddData.email;
                if (oAddData.rol) {
                    oDatos.UserPerfil = "F";
                } else {
                    oDatos.UserPerfil = "N";
                    if (!oAddData.PuedeGenerarNF) {
                        MessageToast.show(this.oTextos.getText("msj_error_nf"));
                        this.getView().byId("dialogAddUser").setBusy(false);
                        return;
                    }
                }
                if (oAddData.rol) {
                    var that = this;
                    var aActaromise = this._obtenerActaAgregarUser();
                    if (oAddData.esApoderado) {
                        Promise.all([aActaromise]).then(function (aArchivos) {
                            //aArchivos[0]->acta
                            if (!aArchivos[0]) {
                                MessageToast.show(that.oTextos.getText("msj_ing_poder"));
                                that.getView().byId("dialogAddUser").setBusy(false);
                                return;
                            }

                            oDatos.UserActa = aArchivos[0];
                            that._crearSolicitudUser(oDatos);
                        });
                    } else {
                        var aEstatutoPromise = this._obtenerEstatutoAgregarUser();
                        Promise.all([aEstatutoPromise, aActaromise]).then(function (aArchivos) {
                            //aArchivos[0]->Estatuto  aArchivos[1]->acta
                            if (!aArchivos[0]) {
                                MessageToast.show(that.oTextos.getText("msj_ing_estatuto"));
                                that.getView().byId("dialogAddUser").setBusy(false);
                                return;
                            }
                            if (!aArchivos[1]) {
                                MessageToast.show(that.oTextos.getText("msj_ing_acta"));
                                that.getView().byId("dialogAddUser").setBusy(false);
                                return;
                            }

                            oDatos.UserEstatuto = aArchivos[0];
                            oDatos.UserActa = aArchivos[1];
                            that._crearSolicitudUser(oDatos);
                        });
                    }
                } else {
                    this._crearSolicitudUser(oDatos);
                }
            },

            //Agregar Bp
            onAltaCuenta: function () {
                //fragment agregar user
                if (!this._oDialogAddBp) {
                    var oView = this.getView();
                    Fragment.load({
                        id: oView.getId(),
                        name: "zhb4.zhb4acceso.view.fragments.AddBp",
                        controller: this
                    }).then(function (oDialog) {
                        this._oDialogAddBp = oDialog;
                        this.getView().addDependent(oDialog);
                        this._oDialogAddBp.open();
                    }.bind(this));
                } else {
                    this._oDialogAddBp.open();
                }

                //cargo modelo vacío add bp
                var oDataAdd = {
                    cuit: "",
                    valueStateCuit: "None",
                    cultivoCode: "",
                    cultivo: "",
                    mostrarProvincia: false,
                    provinciaCode: "",
                    provincia: "",
                    mostrarLocalidad: false,
                    localidadCode: "",
                    localidad: "",
                    mostrarVariedad: false,
                    variedadCode: "",
                    variedad: ""
                };
                this.getView().getModel("ModelAddBp").setData(oDataAdd);
            },

            onCancelarBp: function () {
                this._oDialogAddBp.close();
            },

            onValidarCuit: function (oEvent) {
                //validar si ingreso un cuit con la estructura correcta
                var sCuit = oEvent.getSource().getValue();
                var regObtenerCuit = /\-+/g;
                sCuit = sCuit.replace(regObtenerCuit, "");
                var bValidado = this._esCuitValido(sCuit);
                var oAddData = this.getView().getModel("ModelAddBp").getData();
                if (bValidado) {
                    oAddData.valueStateCuit = "None";
                } else {
                    oAddData.valueStateCuit = "Error";
                }
                this.getView().getModel("ModelAddBp").refresh();
            },

            onSeleccionarCultivo: function (oEvent) {
                //Al seleccionar un cultivo...cargo las provincias
                var oAddData = this.getView().getModel("ModelAddBp").getData();
                var aFilters = [];
                var sCultivo = oEvent.getSource().getSelectedKey();

                aFilters.push(new Filter("cultivo_ID", FilterOperator.EQ, sCultivo));

                //Agrego los filtros al binding del combo
                this.getView().byId("cboProvincia").setSelectedKey(null);
                // this.getView().byId("cboProvincia").getBinding("items").filter(aFilters);

                oAddData.mostrarProvincia = true;
                this.getView().getModel("ModelAddBp").refresh();

                var that = this;
                this.getView().byId("cboProvincia").setBusy(true);
                this.getView().getModel("landingMDL").read("/ProvinciasPorCultivo", {
                    filters: aFilters,
                    success: function (oData) {
                        that.getView().getModel("Provincias").setData(oData.results);
                        that.getView().byId("cboProvincia").setBusy(false);
                    },
                    error: function (oError) {
                        that.getView().getModel("Provincias").setData([]);
                        that.getView().byId("cboProvincia").setBusy(false);
                    }
                });
            },

            onSeleccionarProvincia: function (oEvent) {
                //Al seleccionar una provincia...cargo las localidades
                var oAddData = this.getView().getModel("ModelAddBp").getData();
                var aFilters = [];
                var sProvincia = oEvent.getSource().getSelectedKey();
                var sCultivo = this.getView().byId("cboCultivo").getSelectedKey();

                aFilters.push(new Filter("cultivo_ID", FilterOperator.EQ, sCultivo));
                aFilters.push(new Filter("provincia_ID", FilterOperator.EQ, sProvincia));

                //Agrego los filtros al binding del combo
                this.getView().byId("cboLocalidad").setSelectedKey(null);
                // this.getView().byId("cboLocalidad").getBinding("items").filter(aFilters);

                oAddData.mostrarLocalidad = true;
                this.getView().getModel("ModelAddBp").refresh();

                var that = this;
                this.getView().byId("cboLocalidad").setBusy(true);
                this.getView().getModel("landingMDL").read("/LocalidadesPorProvinciasYCultivo", {
                    filters: aFilters,
                    success: function (oData) {
                        that.getView().getModel("Localidades").setData(oData.results);
                        that.getView().byId("cboLocalidad").setBusy(false);
                    },
                    error: function (oError) {
                        that.getView().getModel("Localidades").setData([]);
                        that.getView().byId("cboLocalidad").setBusy(false);
                    }
                });
            },

            onSeleccionarLocalidad: function (oEvent) {
                //Al seleccionar una localidad...cargo las variedades
                var oAddData = this.getView().getModel("ModelAddBp").getData();
                var aFilters = [];
                var sLocalidad = oEvent.getSource().getSelectedKey();
                var sCultivo = this.getView().byId("cboCultivo").getSelectedKey();

                aFilters.push(new Filter("cultivo_ID", FilterOperator.EQ, sCultivo));
                aFilters.push(new Filter("localidad_ID", FilterOperator.EQ, sLocalidad));

                //Agrego los filtros al binding del combo
                this.getView().byId("cboVariedad").setSelectedKey(null);
                // this.getView().byId("cboVariedad").getBinding("items").filter(aFilters);

                oAddData.mostrarVariedad = true;
                this.getView().getModel("ModelAddBp").refresh();

                var that = this;
                this.getView().byId("cboVariedad").setBusy(true);
                this.getView().getModel("landingMDL").read("/VariedadesRecomendadas", {
                    filters: aFilters,
                    success: function (oData) {
                        that.getView().getModel("Variedades").setData(oData.results);
                        that.getView().byId("cboVariedad").setBusy(false);
                    },
                    error: function (oError) {
                        that.getView().getModel("Variedades").setData([]);
                        that.getView().byId("cboVariedad").setBusy(false);
                    }
                });
            },

            onGuardarBp: function () {
                var oAddData = this.getView().getModel("ModelAddBp").getData();
                var regObtenerCuit = /\-+/g;
                var sCuit = oAddData.cuit.replace(regObtenerCuit, "");
                var bCuitValidado = this._esCuitValido(sCuit);
                //valido si ingreso cuit
                if (!bCuitValidado) {
                    MessageToast.show(this.oTextos.getText("msj_ing_cuit"));
                    return;
                }

                if (!oAddData.cultivoCode) {
                    MessageToast.show(this.oTextos.getText("msj_sel_cultivo"));
                    return;
                }

                if (!oAddData.provinciaCode) {
                    MessageToast.show(this.oTextos.getText("msj_sel_provincia"));
                    return;
                }

                if (!oAddData.localidadCode) {
                    MessageToast.show(this.oTextos.getText("msj_sel_localidad"));
                    return;
                }

                if (!oAddData.variedadCode) {
                    MessageToast.show(this.oTextos.getText("msj_sel_variedad"));
                    return;
                }

                if (parseInt(oAddData.rindeEsperado) <= 0) {
                    MessageToast.show(this.oTextos.getText("msj_ing_rinde"));
                    return;
                }

                //primero verifico con nosis el estado crediticio del cuit ingresado
                var that = this;
                this.getView().byId("dialogAddBp").setBusy(true);
                var oDatos = {};

                //cargo los datos ingresados
                oDatos.Id = "1";
                oDatos.TipoSolicitud = "B";
                oDatos.BpCuit = sCuit;
                oDatos.BpCultivo = oAddData.cultivoCode;
                oDatos.BpProvincia = oAddData.provinciaCode;
                oDatos.BpDescProvincia = oAddData.provincia;
                oDatos.BpLocalidad = oAddData.localidadCode;
                oDatos.BpDescLocalidad = oAddData.descripcion;
                oDatos.BpVariedad = oAddData.variedadCode;
                oDatos.BpRindeEsperado = parseInt(oAddData.rindeEsperado).toString();

                //hago el chequeo de nosis
                var sPath = that.getView().getModel("nosisMDL").createKey("/CheckNosis", {
                    Cuit: sCuit
                });
                that.getView().getModel("nosisMDL").read(sPath, {
                    success: function (oData) {
                        oDatos.BpRazonSocial = oData.RazonSocial; // la saco de la respuesta del chequeo nosis
                        if (oData.PasoChequeo) {
                            oDatos.BpCheckCrediticio = "";
                        } else {
                            oDatos.BpCheckCrediticio = "X"; // no lo pasó
                        }

                        //mando solicitud de creación
                        that.getView().getModel().create("/solicitudAgregadoSet", oDatos, {
                            success: function (oData) {
                                that.getView().byId("dialogAddBp").setBusy(false);
                                if (oData.Error === "X") {
                                    MessageBox.error(oData.Mensaje);
                                } else {
                                    that._oDialogAddBp.close();
                                    MessageBox.success(oData.Mensaje);
                                }
                            },
                            error: function (oError) {
                                that.getView().byId("dialogAddBp").setBusy(false);
                                MessageBox.error(that.oTextos.getText("msj_error_crear_sol"));
                            }
                        });

                    },
                    error: function (oError) {
                        MessageBox.error(that.oTextos.getText("msj_error_crear_sol"));
                        that.getView().byId("dialogAddBp").setBusy(false);
                    }
                });
            },

            _cargarModelos: function () {
                //modelo para la vista
                var oModelView = new JSONModel({
                    puedeAgregarUsuario: false,
                    puedeAgregarCuenta: false,
                    EsInterno: true
                });
                this.getView().setModel(oModelView, "viewModel");

                //modelo cultivos
                var oModelCultivos = new JSONModel();
                this.getView().setModel(oModelCultivos, "ModelCultivos");

                //modelo cuentas
                var oModelCuentas = new JSONModel();
                oModelCuentas.setSizeLimit(10000);
                this.getView().setModel(oModelCuentas, "ModelCuentas");

                //modelo agregar usuario
                var oModelAddUser = new JSONModel();
                this.getView().setModel(oModelAddUser, "ModelAddUser");

                //modelo agregar cuenta
                var oModelAddBp = new JSONModel();
                this.getView().setModel(oModelAddBp, "ModelAddBp");

                //modelo productos de provincias
                var oModelProv = new JSONModel();
                oModelProv.setSizeLimit(1000);
                this.getView().setModel(oModelProv, "Provincias");

                //modelo productos de localidades
                var oModelLoc = new JSONModel();
                oModelLoc.setSizeLimit(1000);
                this.getView().setModel(oModelLoc, "Localidades");

                //modelo productos de variedades
                var oModelVar = new JSONModel();
                oModelVar.setSizeLimit(1000);
                this.getView().setModel(oModelVar, "Variedades");
            },

            _cargarFragments: function () {
                //fragment agregar user
                if (!this._oDialogAddUser) {
                    var oView = this.getView();
                    Fragment.load({
                        id: oView.getId(),
                        name: "zhb4.zhb4acceso.view.fragments.AddUser",
                        controller: this
                    }).then(function (oDialog) {
                        this._oDialogAddUser = oDialog;
                        this.getView().addDependent(oDialog);
                    }.bind(this));
                }

                //fragment agregar user
                if (!this._oDialogAddBp) {
                    var oView = this.getView();
                    Fragment.load({
                        id: oView.getId(),
                        name: "zhb4.zhb4acceso.view.fragments.AddBp",
                        controller: this
                    }).then(function (oDialog) {
                        this._oDialogAddBp = oDialog;
                        this.getView().addDependent(oDialog);
                        this._traerCultivos();
                    }.bind(this));
                }
            },

            _traerCuentas: function () {
                var that = this;
                this.getView().byId("page").setBusy(true);
                this.getView().getModel().read("/bpsAsociadosSet", {
                    success: function (oData) {
                        that.getView().getModel("ModelCuentas").setData(oData.results);
                        that.getView().byId("page").setBusy(false);
                    },
                    error: function (oError) {
                        that.getView().getModel("ModelCuentas").setData([]);
                        that.getView().byId("page").setBusy(false);
                    }
                });
            },

            _traerCultivos: function () {
                var that = this;
                this.getView().byId("cboCultivo").setBusy(true);
                this.getView().getModel("landingMDL").read("/Cultivos", {
                    success: function (oData) {
                        that.getView().getModel("ModelCultivos").setData(oData.results);
                        that.getView().byId("cboCultivo").setBusy(false);
                    },
                    error: function (oError) {
                        that.getView().getModel("ModelCultivos").setData([]);
                        that.getView().byId("cboCultivo").setBusy(false);
                    }
                });
            },

            _setCuentaDefault: function () {
                var aCuentas = this.getView().getModel("ModelCuentas").getData();
                this.getView().byId("cboCuenta").setEditable(true);
                if (aCuentas.length === 0) {
                    this.getView().byId("cboCuenta").setEditable(false);
                } else if (aCuentas.length === 1) {
                    var sCuenta = aCuentas[0].Bp;
                    this.getView().getModel("ModelAddUser").setProperty("/bp", sCuenta);
                    // this.getView().byId("cboCuenta").setSelectedKey(sCuenta);
                    this.getView().byId("cboCuenta").setEditable(false);
                    this._validarSiPuedeAgregar(aCuentas[0]);
                }
            },

            _obtenerEstatutoAgregarUser: function () {
                var that = this;
                return new Promise(function (resolve, reject) {
                    var oFileUploader = that.getView().byId("fileUploaderEst");
                    that._obtenerValorArchivo(oFileUploader).then(function (oResponse) {
                        resolve(oResponse);
                    });
                });
            },

            _obtenerActaAgregarUser: function () {
                var that = this;
                return new Promise(function (resolve, reject) {
                    var oFileUploader = that.getView().byId("fileUploaderAct");
                    that._obtenerValorArchivo(oFileUploader).then(function (oResponse) {
                        resolve(oResponse);
                    });
                });
            },

            _obtenerValorArchivo: function (oFileUploader) {
                var that = this;
                return new Promise(function (resolve, reject) {
                    oFileUploader.checkFileReadable().then(function () {
                        var oFileData = oFileUploader.oFileUpload.files[0];
                        var oReader = new FileReader();

                        if (oFileData) {
                            oReader.onload = function (e) {
                                var sContent = e.currentTarget.result;
                                if (sContent) {
                                    resolve(sContent.replace("data:application/pdf;base64,", ""));
                                }
                            }.bind(that);

                            oReader.readAsDataURL(oFileData);
                        } else {
                            resolve("");
                        }
                    }.bind(that), function (error) {
                        resolve("");
                    });
                });
            },

            _crearSolicitudUser: function (oDatos) {
                var that = this;
                this.getView().getModel().create("/solicitudAgregadoSet", oDatos, {
                    success: function (oData) {
                        that.getView().byId("dialogAddUser").setBusy(false);
                        if (oData.Error === "X") {
                            MessageBox.error(oData.Mensaje);
                        } else {
                            that._oDialogAddUser.close();
                            MessageBox.success(oData.Mensaje);
                        }
                    },
                    error: function (oError) {
                        that.getView().byId("dialogAddUser").setBusy(false);
                        MessageBox.error(that.oTextos.getText("msj_error_crear_sol"));
                    }
                });
            },

            _esMailValido: function (sMail) {
                var regexMail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
                return regexMail.test(sMail);
            },

            _esCuitValido: function (sCuit) {
                var regexCuit = /\b(20|23|24|27|30|33|34)[0-9]{8}[0-9]/g;
                return regexCuit.test(sCuit);
            }
            //-------------------Fin JOLU1----------------------
        });
    });
