import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AlertController, LoadingController, ToastController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { FilterOption } from '../../../shared/componentes/filter-dropdown/filter-dropdown.component';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';

interface Invitacion {
  token: string;
  email_invitado: string;
  rol_asignado: string;
  estado: string;
  fecha_creacion: string;
  fecha_expiracion: string;
  fecha_uso?: string;
  invitado_por: {
    nombre: string;
    apellido: string;
    email: string;
  };
  datos_adicionales?: any;
}

@Component({
  selector: 'app-admin-invitaciones',
  templateUrl: './admin-invitaciones.page.html',
  styleUrls: ['./admin-invitaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  animations: [
    trigger('slideInUp', [
      transition(':enter', [
        style({ transform: 'translateY(50px)', opacity: 0 }),
        animate('0.6s cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.4s ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('staggerCards', [
      transition('* => *', [
        query(':enter', [
          style({ transform: 'translateY(30px)', opacity: 0 }),
          stagger(100, [
            animate('0.5s cubic-bezier(0.4, 0, 0.2, 1)', 
              style({ transform: 'translateY(0)', opacity: 1 }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class AdminInvitacionesPage implements OnInit {
  invitaciones: Invitacion[] = [];
  invitacionesOriginales: Invitacion[] = []; // Nueva propiedad para almacenar datos originales
  invitacionesFiltradas: Invitacion[] = []; // Nueva propiedad para datos filtrados
  estadisticas: any = null;
  isLoading = true;
  isCreatingInvitation = false;
  error = '';
  
  // Exponer Object para el template
  Object = Object;
  
  // Propiedad para la fecha actual
  currentDate = new Date();
  // Texto en tiempo real para "Última actualización"
  timeAgoText = '';
  private timeAgoInterval: any;
  
  // Formulario para crear invitación
  crearInvitacionForm: FormGroup;
  showCrearForm = false;
  
  // Filtros
  filtroEstado = '';
  filtroRol = '';
  filtroTexto = ''; // Nuevo filtro de texto
  
  // Fecha mínima para el datetime picker - se establece una sola vez
  fechaMinima: string;
  
  // Opciones para los filtros desplegables
  estadoOptions: FilterOption[] = [
    { value: '', label: 'Todos los Estados', icon: 'list-outline', color: 'medium' },
    { value: 'pendiente', label: 'Pendiente', icon: 'time-outline', color: 'warning' },
    { value: 'usado', label: 'Usado', icon: 'checkmark-circle-outline', color: 'success' },
    { value: 'expirado', label: 'Expirado', icon: 'close-circle-outline', color: 'danger' },
    { value: 'cancelado', label: 'Cancelado', icon: 'ban-outline', color: 'dark' }
  ];
  
  rolFilterOptions: FilterOption[] = [
    { value: '', label: 'Todos los Roles', icon: 'people-outline', color: 'medium' },
    { value: 'estudiante', label: 'Estudiante', icon: 'school-outline', color: 'primary' },
    { value: 'docente', label: 'Docente', icon: 'library-outline', color: 'secondary' },
    { value: 'administrador', label: 'Administrador', icon: 'settings-outline', color: 'tertiary' }
  ];
  
  // Configuración de roles
  roles = [
    { value: 'docente', label: 'Docente' },
    { value: 'administrador', label: 'Administrador' }
  ];
  
  estados = [
    { value: '', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'usado', label: 'Usado' },
    { value: 'expirado', label: 'Expirado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {
    // Establecer la fecha mínima una sola vez en el constructor
    this.fechaMinima = new Date().toISOString();
    
    this.crearInvitacionForm = this.formBuilder.group({
      email_invitado: ['', [Validators.required, Validators.email]],
      rol_asignado: ['', Validators.required],
      fecha_expiracion: ['', Validators.required],
      // Campos adicionales según el rol
      especialidad: [''],
      departamento: [''],
      fecha_contratacion: [''],
      numero_empleado: [''],
      carrera: [''],
      semestre: [''],
      numero_estudiante: [''],
      codigo_estudiante: [''],
      cargo: [''],
      area: [''],
      nivel_acceso: [''],
      fecha_nombramiento: ['']
    });
  }

  ngOnInit() {
    this.cargarDatos();
    this.startTimeAgoTimer();
  }

  ngOnDestroy() {
    if (this.timeAgoInterval) {
      clearInterval(this.timeAgoInterval);
    }
  }

  async cargarDatos() {
    this.isLoading = true;
    this.error = '';
    
    try {
      await Promise.all([
        this.cargarInvitaciones(),
        this.cargarEstadisticas()
      ]);
      // Actualizar la fecha cuando se cargan los datos
      this.currentDate = new Date();
      this.updateTimeAgoText();
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.error = 'Error al cargar los datos';
    } finally {
      this.isLoading = false;
    }
  }

  private startTimeAgoTimer() {
    this.updateTimeAgoText();
    this.timeAgoInterval = setInterval(() => {
      this.updateTimeAgoText();
    }, 1000);
  }

  private updateTimeAgoText() {
    if (!this.currentDate) {
      this.timeAgoText = '';
      return;
    }
    const now = new Date().getTime();
    const updated = new Date(this.currentDate).getTime();
    const diffMs = Math.max(0, now - updated);
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      this.timeAgoText = `hace ${days} día${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      this.timeAgoText = `hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      this.timeAgoText = `hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    } else {
      this.timeAgoText = `hace ${seconds} segundo${seconds !== 1 ? 's' : ''}`;
    }
  }

  async cargarInvitaciones() {
    try {
      // Cargar todas las invitaciones sin filtros del servidor
      const response = await this.authService.listarInvitaciones({}).toPromise();
      this.invitacionesOriginales = response.results || response;
      this.invitaciones = [...this.invitacionesOriginales];
      
      // Aplicar filtros
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error cargando invitaciones:', error);
      throw error;
    }
  }

  async cargarEstadisticas() {
    try {
      this.estadisticas = await this.authService.obtenerEstadisticasInvitaciones().toPromise();
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // No lanzar error para que no bloquee la carga de invitaciones
    }
  }

  async aplicarFiltros() {
    let invitacionesFiltradas = [...this.invitacionesOriginales];

    // Filtro por estado
    if (this.filtroEstado && this.filtroEstado !== '') {
      invitacionesFiltradas = invitacionesFiltradas.filter(invitacion => 
        invitacion.estado === this.filtroEstado
      );
    }

    // Filtro por rol
    if (this.filtroRol && this.filtroRol !== '') {
      invitacionesFiltradas = invitacionesFiltradas.filter(invitacion => 
        invitacion.rol_asignado === this.filtroRol
      );
    }

    // Filtro por texto (busca en email, nombre del invitador, etc.)
    if (this.filtroTexto && this.filtroTexto.trim() !== '') {
      const textoFiltro = this.filtroTexto.toLowerCase().trim();
      invitacionesFiltradas = invitacionesFiltradas.filter(invitacion => 
        invitacion.email_invitado.toLowerCase().includes(textoFiltro) ||
        invitacion.invitado_por.nombre.toLowerCase().includes(textoFiltro) ||
        invitacion.invitado_por.apellido.toLowerCase().includes(textoFiltro) ||
        invitacion.invitado_por.email.toLowerCase().includes(textoFiltro) ||
        this.getRolLabel(invitacion.rol_asignado).toLowerCase().includes(textoFiltro) ||
        this.getEstadoLabel(invitacion.estado).toLowerCase().includes(textoFiltro)
      );
    }

    this.invitaciones = invitacionesFiltradas;
    this.invitacionesFiltradas = invitacionesFiltradas;
  }

  async limpiarFiltros() {
    this.filtroEstado = '';
    this.filtroRol = '';
    this.filtroTexto = '';
    this.aplicarFiltros();
  }

  toggleCrearForm() {
    this.showCrearForm = !this.showCrearForm;
    if (!this.showCrearForm) {
      this.crearInvitacionForm.reset();
    }
  }

  onRolChange() {
    const rol = this.crearInvitacionForm.get('rol_asignado')?.value;
    
    // Limpiar campos específicos de rol
    const camposRol = ['especialidad', 'departamento', 'fecha_contratacion', 'numero_empleado',
                       'carrera', 'semestre', 'numero_estudiante', 'codigo_estudiante', 'cargo', 'area', 'nivel_acceso', 'fecha_nombramiento'];
    
    camposRol.forEach(campo => {
      this.crearInvitacionForm.get(campo)?.setValue('');
      this.crearInvitacionForm.get(campo)?.clearValidators();
    });

    // Agregar validadores según el rol
    if (rol === 'docente') {
      this.crearInvitacionForm.get('especialidad')?.setValidators([Validators.required]);
      this.crearInvitacionForm.get('departamento')?.setValidators([Validators.required]);
    } else if (rol === 'estudiante') {
      this.crearInvitacionForm.get('carrera')?.setValidators([Validators.required]);
      this.crearInvitacionForm.get('semestre')?.setValidators([Validators.required]);
    } else if (rol === 'administrador') {
      this.crearInvitacionForm.get('cargo')?.setValidators([Validators.required]);
      this.crearInvitacionForm.get('nivel_acceso')?.setValidators([Validators.required]);
    }

    // Actualizar validadores
    camposRol.forEach(campo => {
      this.crearInvitacionForm.get(campo)?.updateValueAndValidity();
    });
  }

  async crearInvitacion() {
    // Marcar todos los campos como tocados para mostrar errores de validación
    this.crearInvitacionForm.markAllAsTouched();
    
    if (this.crearInvitacionForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Creando invitación...'
      });
      await loading.present();

      try {
        const formData = this.crearInvitacionForm.value;
        const rol = formData.rol_asignado;
        
        // Validar campos requeridos según el rol
        if (rol === 'docente') {
          if (!formData.especialidad || !formData.departamento) {
            const toast = await this.toastController.create({
              message: 'Para docentes, la especialidad y departamento son requeridos',
              duration: 3000,
              color: 'warning'
            });
            await toast.present();
            await loading.dismiss();
            return;
          }
        } else if (rol === 'estudiante') {
          if (!formData.carrera || !formData.semestre) {
            const toast = await this.toastController.create({
              message: 'Para estudiantes, la carrera y semestre son requeridos',
              duration: 3000,
              color: 'warning'
            });
            await toast.present();
            await loading.dismiss();
            return;
          }
        } else if (rol === 'administrador') {
          if (!formData.cargo || !formData.nivel_acceso) {
            const toast = await this.toastController.create({
              message: 'Para administradores, el cargo y nivel de acceso son requeridos',
              duration: 3000,
              color: 'warning'
            });
            await toast.present();
            await loading.dismiss();
            return;
          }
        }
        
        // Preparar datos adicionales según el rol
        const datosAdicionales: any = {};
        
        if (rol === 'docente') {
          if (formData.especialidad) datosAdicionales.especialidad = formData.especialidad;
          if (formData.departamento) datosAdicionales.departamento = formData.departamento;
          if (formData.fecha_contratacion) datosAdicionales.fecha_contratacion = formData.fecha_contratacion;
          if (formData.numero_empleado) datosAdicionales.numero_empleado = formData.numero_empleado;
        } else if (rol === 'estudiante') {
          if (formData.carrera) datosAdicionales.carrera = formData.carrera;
          if (formData.semestre) datosAdicionales.semestre_actual = formData.semestre;
          if (formData.numero_estudiante) datosAdicionales.numero_estudiante = formData.numero_estudiante;
          if (formData.codigo_estudiante) datosAdicionales.codigo_estudiante = formData.codigo_estudiante;
        } else if (rol === 'administrador') {
          if (formData.cargo) datosAdicionales.cargo = formData.cargo;
          if (formData.area) datosAdicionales.area = formData.area;
          if (formData.nivel_acceso) datosAdicionales.nivel_acceso = formData.nivel_acceso;
          if (formData.fecha_nombramiento) datosAdicionales.fecha_nombramiento = formData.fecha_nombramiento;
        }

        const invitacionData = {
          email_invitado: formData.email_invitado,
          rol_asignado: rol,
          fecha_expiracion: formData.fecha_expiracion,
          datos_adicionales: datosAdicionales
        };

        console.log('Datos de invitación a enviar:', invitacionData);

        await this.authService.crearInvitacion(invitacionData).toPromise();
        
        const toast = await this.toastController.create({
          message: 'Invitación creada exitosamente',
          duration: 3000,
          color: 'success'
        });
        await toast.present();

        this.crearInvitacionForm.reset();
        this.showCrearForm = false;
        await this.cargarDatos();

      } catch (error: any) {
        console.error('Error creando invitación:', error);
        let errorMessage = 'Error al crear la invitación';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.status === 400) {
          errorMessage = 'Datos de invitación inválidos. Verifica los campos requeridos.';
        } else if (error.status === 409) {
          errorMessage = 'Ya existe una invitación pendiente para este email.';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Intenta nuevamente.';
        }
        
        const toast = await this.toastController.create({
          message: errorMessage,
          duration: 4000,
          color: 'danger'
        });
        await toast.present();
      } finally {
        await loading.dismiss();
      }
    } else {
      // Mostrar errores de validación específicos
      const errores = [];
      
      if (this.email_invitado?.invalid) {
        errores.push('Email es requerido y debe ser válido');
      }
      
      if (this.rol_asignado?.invalid) {
        errores.push('Rol es requerido');
      }
      
      const rol = this.rol_asignado?.value;
      if (rol === 'docente') {
        if (this.especialidad?.invalid) errores.push('Especialidad es requerida para docentes');
        if (this.departamento?.invalid) errores.push('Departamento es requerido para docentes');
      } else if (rol === 'estudiante') {
        if (this.carrera?.invalid) errores.push('Carrera es requerida para estudiantes');
        if (this.semestre?.invalid) errores.push('Semestre es requerido para estudiantes');
      } else if (rol === 'administrador') {
        if (this.cargo?.invalid) errores.push('Cargo es requerido para administradores');
        if (this.nivel_acceso?.invalid) errores.push('Nivel de acceso es requerido para administradores');
      }
      
      const toast = await this.toastController.create({
        message: `Por favor corrige los siguientes errores:\n• ${errores.join('\n• ')}`,
        duration: 5000,
        color: 'warning'
      });
      await toast.present();
    }
  }

  async cancelarInvitacion(invitacion: Invitacion) {
    const alert = await this.alertController.create({
      header: 'Cancelar Invitación',
      message: `¿Estás seguro de que deseas cancelar la invitación para ${invitacion.email_invitado}?`,
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: 'Motivo de cancelación (opcional)'
        }
      ],
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Sí, cancelar',
          handler: async (data) => {
            const loading = await this.loadingController.create({
              message: 'Cancelando invitación...'
            });
            await loading.present();

            try {
              await this.authService.cancelarInvitacion(invitacion.token).toPromise();
              
              const toast = await this.toastController.create({
                message: 'Invitación cancelada exitosamente',
                duration: 3000,
                color: 'success'
              });
              await toast.present();

              await this.cargarDatos();
            } catch (error: any) {
              console.error('Error cancelando invitación:', error);
              const toast = await this.toastController.create({
                message: error.error?.message || 'Error al cancelar la invitación',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async eliminarInvitacion(invitacion: Invitacion) {
    const alert = await this.alertController.create({
      header: 'Eliminar invitación',
      message: `¿Seguro que deseas eliminar la invitación para <strong>${invitacion.email_invitado}</strong>? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Eliminando invitación...'
            });
            await loading.present();

            try {
              await this.authService.eliminarInvitacion(invitacion.token).toPromise();

              const toast = await this.toastController.create({
                message: 'Invitación eliminada correctamente',
                duration: 3000,
                color: 'success'
              });
              await toast.present();

              await this.cargarInvitaciones();
              await this.aplicarFiltros();
            } catch (error: any) {
              const toast = await this.toastController.create({
                message: error?.message || 'No se pudo eliminar la invitación',
                duration: 4000,
                color: 'danger'
              });
              await toast.present();
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async extenderInvitacion(invitacion: Invitacion) {
    const alert = await this.alertController.create({
      header: 'Extender Invitación',
      message: `Extender la fecha de expiración para ${invitacion.email_invitado}`,
      inputs: [
        {
          name: 'dias',
          type: 'number',
          placeholder: 'Días adicionales',
          value: 7,
          min: 1,
          max: 30
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Extender',
          handler: async (data) => {
            const diasAdicionales = parseInt(data.dias);
            if (diasAdicionales < 1 || diasAdicionales > 30) {
              const toast = await this.toastController.create({
                message: 'Los días adicionales deben estar entre 1 y 30',
                duration: 3000,
                color: 'warning'
              });
              await toast.present();
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Extendiendo invitación...'
            });
            await loading.present();

            try {
              await this.authService.extenderInvitacion(invitacion.token, diasAdicionales).toPromise();
              
              const toast = await this.toastController.create({
                message: `Invitación extendida por ${diasAdicionales} días`,
                duration: 3000,
                color: 'success'
              });
              await toast.present();

              await this.cargarDatos();
              return true;
            } catch (error: any) {
              console.error('Error extendiendo invitación:', error);
              const toast = await this.toastController.create({
                message: error.error?.message || 'Error al extender la invitación',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
              return false;
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async reenviarInvitacion(invitacion: Invitacion) {
    const loading = await this.loadingController.create({
      message: 'Reenviando invitación...'
    });
    await loading.present();

    try {
      await this.authService.reenviarInvitacion(invitacion.token).toPromise();
      
      const toast = await this.toastController.create({
        message: 'Invitación reenviada exitosamente',
        duration: 3000,
        color: 'success'
      });
      await toast.present();

    } catch (error: any) {
      console.error('Error reenviando invitación:', error);
      const toast = await this.toastController.create({
        message: error.error?.message || 'Error al reenviar la invitación',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'warning';
      case 'usado': return 'success';
      case 'expirado': return 'danger';
      case 'cancelado': return 'medium';
      default: return 'primary';
    }
  }

  // Getters para validaciones del formulario
  get email_invitado() { return this.crearInvitacionForm.get('email_invitado'); }
  get rol_asignado() { return this.crearInvitacionForm.get('rol_asignado'); }
  get fecha_expiracion() { return this.crearInvitacionForm.get('fecha_expiracion'); }
  get especialidad() { return this.crearInvitacionForm.get('especialidad'); }
  get departamento() { return this.crearInvitacionForm.get('departamento'); }
  get carrera() { return this.crearInvitacionForm.get('carrera'); }
  get semestre() { return this.crearInvitacionForm.get('semestre'); }
  get codigo_estudiante() { return this.crearInvitacionForm.get('codigo_estudiante'); }
  get cargo() { return this.crearInvitacionForm.get('cargo'); }
  get area() { return this.crearInvitacionForm.get('area'); }
  get nivel_acceso() { return this.crearInvitacionForm.get('nivel_acceso'); }

  // Métodos auxiliares para obtener etiquetas legibles
  getRolLabel(rol: string): string {
    const rolOption = this.rolFilterOptions.find(option => option.value === rol);
    return rolOption ? rolOption.label : rol;
  }

  // Métodos para obtener iconos y colores
  getRolIcon(rol: string): string {
    switch (rol) {
      case 'estudiante': return 'school-outline';
      case 'docente': return 'library-outline';
      case 'administrador': return 'settings-outline';
      default: return 'person-outline';
    }
  }

  getRolColor(rol: string): string {
    switch (rol) {
      case 'estudiante': return 'primary';
      case 'docente': return 'secondary';
      case 'administrador': return 'tertiary';
      default: return 'medium';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'pendiente': return 'time-outline';
      case 'usado': return 'checkmark-circle-outline';
      case 'expirado': return 'close-circle-outline';
      case 'cancelado': return 'ban-outline';
      default: return 'help-circle-outline';
    }
  }

  // Método para formatear datos adicionales
  getFormattedAdditionalData(datosAdicionales: any): { label: string, value: string }[] {
    if (!datosAdicionales) return [];
    
    const formatted: { label: string, value: string }[] = [];
    
    Object.keys(datosAdicionales).forEach(key => {
      let label = key;
      let value = datosAdicionales[key];
      
      // Formatear etiquetas más amigables
      switch (key) {
        case 'especialidad': label = 'Especialidad'; break;
        case 'departamento': label = 'Departamento'; break;
        case 'fecha_contratacion': label = 'Fecha de Contratación'; break;
        case 'numero_empleado': label = 'Número de Empleado'; break;
        case 'carrera': label = 'Carrera'; break;
        case 'semestre': label = 'Semestre'; break;
        case 'numero_estudiante': label = 'Número de Estudiante'; break;
        case 'cargo': label = 'Cargo'; break;
        case 'nivel_acceso': label = 'Nivel de Acceso'; break;
        case 'fecha_nombramiento': label = 'Fecha de Nombramiento'; break;
      }
      
      // Formatear fechas
      if (key.includes('fecha') && value) {
        value = new Date(value).toLocaleDateString('es-ES');
      }
      
      formatted.push({ label, value });
    });
    
    return formatted;
  }

  // Método para obtener la etiqueta del estado
  getEstadoLabel(estado: string): string {
    const estadoOption = this.estadoOptions.find(option => option.value === estado);
    return estadoOption ? estadoOption.label : estado;
  }

  // Selección mediante chips (como admin usuarios)
  selectRolFilter(value: string) {
    this.filtroRol = (value || '').toLowerCase();
    this.aplicarFiltros();
  }

  selectEstadoFilter(value: string) {
    this.filtroEstado = value || '';
    this.aplicarFiltros();
  }

  // Función de seguimiento para optimizar el rendimiento del *ngFor
  trackByInvitacion(index: number, invitacion: Invitacion): string {
    return invitacion.token;
  }
}