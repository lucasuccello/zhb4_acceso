sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../model/formatter",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
    function (Controller, formatter, MessageBox, MessageToast, Fragment, JSONModel, Filter, FilterOperator) {
        "use strict";

        return Controller.extend("zhb4.zhb4acceso.controller.Main", {
            formatter: formatter,
            onInit: function () {
                this.oTextos = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                //-------------------Inicio JOLU1----------------------
                this.getView().setModel(this.getOwnerComponent().getModel("landingMDL"), "landingMdl");
                this.getView().setModel(this.getOwnerComponent().getModel("nosisMDL"), "nosisMDL");
                this._cargarModelos();
                //-------------------Fin JOLU1----------------------
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

            //-------------------Inicio JOLU1----------------------

            onUpdateFinished: function (oEvent) {
                var aItems = oEvent.getSource().getItems();
                if (aItems.length > 0) {
                    var oItem = aItems[0].getBindingContext().getObject();
                    var oViewModel = this.getView().getModel("viewModel");
                    if (oItem.PuedeGenerarCuenta === "X") {
                        oViewModel.setProperty("/puedeAgregarCuenta", true);
                    } else {
                        oViewModel.setProperty("/puedeAgregarCuenta", true);
                    }

                    if (oItem.PuedeGenerarUsuario === "X") {
                        oViewModel.setProperty("/puedeAgregarUsuario", true);
                    } else {
                        oViewModel.setProperty("/puedeAgregarUsuario", true);
                    }
                }
            },

            //Agregar Usuario
            onAltaUsuario: function () {
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
                        this.getView().byId("fileUploaderEst").clear();
                        this._oDialogAddUser.open();
                    }.bind(this));
                } else {
                    this.getView().byId("fileUploaderEst").clear();
                    this._oDialogAddUser.open();
                }

                //cargo modelo vacío add user
                var oDataAdd = {
                    email: "",
                    valueStateMail: "None",
                    rol: "N",
                    mostrarEstatuto: false
                };
                this.getView().getModel("ModelAddUser").setData(oDataAdd);
            },

            onCancelarUser: function () {
                this._oDialogAddUser.close();
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
                var sRol = oEvent.getSource().getSelectedKey();
                var oAddData = this.getView().getModel("ModelAddUser").getData();
                if (sRol === "F") {
                    oAddData.mostrarEstatuto = true;
                } else {
                    oAddData.mostrarEstatuto = false;
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
                oDatos.UserNombre = oAddData.nombre;
                oDatos.UserApellido = oAddData.apellido;
                oDatos.UserMail = oAddData.email;
                oDatos.UserPerfil = oAddData.rol;
                if (oDatos.UserPerfil === "F") {
                    var that = this;
                    var aEstatutoPromise = this._obtenerEstatutoAgregarUser();
                    var aActaromise = this._obtenerActaAgregarUser();
                    Promise.all([aEstatutoPromise, aActaromise]).then(function (aArchivos) {
                        //aArchivos[0]->Estatuto  aArchivos[1]->acta
                        if (!aArchivos[0]) {
                            MessageToast.show(this.oTextos.getText("msj_ing_estatuto"));
                            return;
                        }
                        if (!aArchivos[1]) {
                            MessageToast.show(this.oTextos.getText("msj_ing_acta"));
                            return;
                        }

                        oDatos.UserEstatuto = aArchivos[0];
                        oDatos.UserActa = aArchivos[1];
                        that._crearSolicitudUser(oDatos);
                    });
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
                var bCuitValidado = this._esCuitValido(oAddData.cuit);
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
                oDatos.BpCuit = oAddData.cuit;
                oDatos.BpCultivo = oAddData.cultivoCode;
                oDatos.BpProvincia = oAddData.provinciaCode;
                oDatos.BpDescProvincia = oAddData.provincia;
                oDatos.BpLocalidad = oAddData.localidadCode;
                oDatos.BpDescLocalidad = oAddData.provinciaCode;
                oDatos.BpVariedad = oAddData.variedadCode;
                oDatos.BpRindeEsperado = parseInt(oAddData.rindeEsperado).toString();

                //hago el chequeo de nosis
                var sPath = that.getView().getModel("nosisMDL").createKey("/CheckNosis", {
                        Cuit: oAddData.cuit
                    });
                that.getView().getModel("nosisMDL").read(sPath, {
                    success: function (oData) {
                        oDatos.BpRazonSocial = oData.RazonSocial; // la saco de la respuesta del chequeo nosis
                        if(oData.PasoChequeo){
                            oDatos.BpCheckCrediticio = "X";
                        } else {
                            oDatos.BpCheckCrediticio = ""; // no lo pasó
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
                                MessageBox.error(this.oTextos.getText("msj_error_crear_sol"));
                            }
                        });
                        
                    },
                    error: function (oError) {
                        MessageBox.error(this.oTextos.getText("msj_error_crear_sol"));
                        that.getView().byId("dialogAddBp").setBusy(false);
                    }
                });
            },

            _cargarModelos: function () {
                //modelo para la vista
                var oModelView = new JSONModel({
                    puedeAgregarUsuario: false,
                    puedeAgregarCuenta: false,
                });
                this.getView().setModel(oModelView, "viewModel");

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

            _crearSolicitudUser: function(oDatos){
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
                        MessageBox.error(this.oTextos.getText("msj_error_crear_sol"));
                    }
                });
            },

            _esMailValido: function (sMail) {
                var regexMail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
                return regexMail.test(sMail) ? true : false;
            },

            _esCuitValido: function (sCuit) {
                var regexCuit = /\b(20|23|24|27|30|33|34)[0-9]{8}[0-9]/g;
                return regexCuit.test(sCuit) ? true : false;
            }
            //-------------------Fin JOLU1----------------------
        });
    });
