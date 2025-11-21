import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';

interface InvitacionInfo {
  token: string;
  email_invitado: string;
  rol: string;
  datos_adicionales: any;
  fecha_expiracion: string;
  invitado_por: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

@Component({
  selector: 'app-register-invitation',
  templateUrl: './register-invitation.page.html',
  styleUrls: ['./register-invitation.page.scss'],
  standalone: false
})
export class RegisterInvitationPage implements OnInit {
  registerForm: FormGroup;
  invitacionInfo: InvitacionInfo | null = null;
  isLoading = false;
  showPassword = false;
  showPasswordConfirm = false;
  token: string | null = '';
  validatingToken = true;

  // Configuración de campos dinámicos por rol
  roleFieldsConfig = {
    'Estudiante': {
      required: ['grado', 'seccion'],
      optional: ['carrera', 'matricula'],
      labels: {
        grado: 'Grado',
        seccion: 'Sección',
        carrera: 'Carrera',
        matricula: 'Matrícula'
      },
      placeholders: {
        grado: 'Ej: 10',
        seccion: 'Ej: A',
        carrera: 'Ej: Bachillerato en Ciencias',
        matricula: 'Ej: EST2024001'
      }
    },
    'Docente': {
      required: ['especialidad', 'departamento'],
      optional: ['fecha_contratacion', 'numero_empleado'],
      labels: {
        especialidad: 'Especialidad',
        departamento: 'Departamento',
        fecha_contratacion: 'Fecha de Contratación',
        numero_empleado: 'Número de Empleado'
      },
      placeholders: {
        especialidad: 'Ej: Matemáticas',
        departamento: 'Ej: Ciencias Exactas',
        fecha_contratacion: '',
        numero_empleado: 'Ej: DOC2024001'
      }
    },
    'Administrador': {
      required: ['cargo', 'nivel_acceso'],
      optional: ['fecha_nombramiento', 'permisos_especiales'],
      labels: {
        cargo: 'Cargo',
        nivel_acceso: 'Nivel de Acceso',
        fecha_nombramiento: 'Fecha de Nombramiento',
        permisos_especiales: 'Permisos Especiales'
      },
      placeholders: {
        cargo: 'Ej: Director Académico',
        nivel_acceso: '',
        fecha_nombramiento: '',
        permisos_especiales: 'Ej: Gestión de usuarios'
      }
    }
  };

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.registerForm = this.createBaseForm();
  }

  ngOnInit() {
    // Obtener token de la URL (parámetro de ruta)
    this.token = this.route.snapshot.paramMap.get('token');
    
    if (this.token) {
      this.validateToken();
    } else {
      this.validatingToken = false;
    }
  }

  private createBaseForm(): FormGroup {
    return this.formBuilder.group({
      // Campos básicos requeridos
      username: ['', [Validators.required, Validators.minLength(3)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]],
      
      // Campos adicionales opcionales
      telefono: [''],
      numero_identificacion: [''],
      genero: [''],
      
      // Token de invitación
      token_invitacion: [this.token || '', [Validators.required, this.uuidValidator]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const passwordConfirm = form.get('password_confirm');
    
    if (password && passwordConfirm && password.value !== passwordConfirm.value) {
      passwordConfirm.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (passwordConfirm?.hasError('passwordMismatch')) {
      delete passwordConfirm.errors!['passwordMismatch'];
      if (Object.keys(passwordConfirm.errors!).length === 0) {
        passwordConfirm.setErrors(null);
      }
    }
    
    return null;
  }

  private uuidValidator(control: AbstractControl) {
    const v = String(control.value || '').trim();
    const re = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    return v && re.test(v) ? null : { uuidFormat: true };
  }

  async validateToken() {
    this.validatingToken = true;
    
    try {
      const raw = this.token || this.registerForm.get('token_invitacion')?.value;
      const tokenValue = String(raw || '').trim();
      this.registerForm.get('token_invitacion')?.setValue(tokenValue);
      const response = await this.authService.validarTokenInvitacion(tokenValue).toPromise();
      this.invitacionInfo = response.invitacion;
      this.setupDynamicFields();
      this.validatingToken = false;
    } catch (error: any) {
      this.validatingToken = false;
      this.invitacionInfo = null;
      await this.showError('Token de invitación no válido. Verifica y vuelve a intentar.');
    }
  }

  async onValidateTokenInput() {
    const tokenCtrl = this.registerForm.get('token_invitacion');
    if (!tokenCtrl || !tokenCtrl.value) {
      await this.showError('Ingresa un token de invitación');
      return;
    }
    if (tokenCtrl.invalid) {
      await this.showError('Formato de token inválido');
      tokenCtrl.markAsTouched();
      return;
    }
    this.token = String(tokenCtrl.value).trim();
    this.registerForm.get('token_invitacion')?.setValue(this.token);
    await this.validateToken();
  }

  private setupDynamicFields() {
    if (!this.invitacionInfo) return;

    const rol = this.invitacionInfo.rol;
    const config = this.roleFieldsConfig[rol as keyof typeof this.roleFieldsConfig];
    
    if (!config) return;

    // Agregar campos requeridos
    config.required.forEach(fieldName => {
      this.registerForm.addControl(fieldName, this.formBuilder.control('', [Validators.required]));
    });

    // Agregar campos opcionales
    config.optional.forEach(fieldName => {
      this.registerForm.addControl(fieldName, this.formBuilder.control(''));
    });

    // Configurar validadores especiales
    this.setupSpecialValidators(rol);

    // Pre-llenar con datos de la invitación si existen
    if (this.invitacionInfo.datos_adicionales) {
      Object.keys(this.invitacionInfo.datos_adicionales).forEach(key => {
        if (this.registerForm.get(key)) {
          this.registerForm.get(key)?.setValue(this.invitacionInfo!.datos_adicionales[key]);
        }
      });
    }
  }

  private setupSpecialValidators(rol: string) {
    switch (rol) {
      case 'Estudiante':
        // Validar grado entre 1 y 12
        const gradoControl = this.registerForm.get('grado');
        if (gradoControl) {
          gradoControl.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(12)
          ]);
        }
        break;
        
      case 'Administrador':
        // Validar nivel de acceso
        const nivelAccesoControl = this.registerForm.get('nivel_acceso');
        if (nivelAccesoControl) {
          nivelAccesoControl.setValidators([
            Validators.required
          ]);
        }
        break;
    }
  }

  // Métodos para obtener configuración de campos dinámicos
  getRoleFields(): string[] {
    if (!this.invitacionInfo) return [];
    
    const config = this.roleFieldsConfig[this.invitacionInfo.rol as keyof typeof this.roleFieldsConfig];
    return config ? [...config.required, ...config.optional] : [];
  }

  getFieldLabel(fieldName: string): string {
    if (!this.invitacionInfo) return fieldName;
    
    const config = this.roleFieldsConfig[this.invitacionInfo.rol as keyof typeof this.roleFieldsConfig];
    return config?.labels[fieldName as keyof typeof config.labels] || fieldName;
  }

  getFieldPlaceholder(fieldName: string): string {
    if (!this.invitacionInfo) return '';
    
    const config = this.roleFieldsConfig[this.invitacionInfo.rol as keyof typeof this.roleFieldsConfig];
    return config?.placeholders[fieldName as keyof typeof config.placeholders] || '';
  }

  isFieldRequired(fieldName: string): boolean {
    if (!this.invitacionInfo) return false;
    
    const config = this.roleFieldsConfig[this.invitacionInfo.rol as keyof typeof this.roleFieldsConfig];
    return config?.required.includes(fieldName) || false;
  }

  getFieldType(fieldName: string): string {
    // Determinar el tipo de input basado en el nombre del campo
    if (fieldName.includes('fecha')) return 'date';
    if (fieldName === 'grado') return 'number';
    if (fieldName === 'nivel_acceso') return 'select';
    return 'text';
  }

  getSelectOptions(fieldName: string): string[] {
    switch (fieldName) {
      case 'nivel_acceso':
        return ['basico', 'intermedio', 'avanzado', 'super_admin'];
      case 'genero':
        return ['M', 'F', 'O', 'N'];
      default:
        return [];
    }
  }

  async onSubmit() {
    if (!this.checkPasswordsMatch()) {
      await this.showError('Las contraseñas no coinciden');
      return;
    }

    if (this.registerForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Registrando usuario...',
      });
      await loading.present();

      // Preparar datos para envío
      const formData = { ...this.registerForm.value, token_invitacion: String(this.registerForm.get('token_invitacion')?.value || '').trim() };
      
      // Separar datos específicos del rol
      const roleFields = this.getRoleFields();
      const roleData: any = {};
      
      roleFields.forEach(field => {
        if (formData[field] !== undefined && formData[field] !== '') {
          roleData[field] = formData[field];
          delete formData[field];
        }
      });

      // Agregar datos específicos del rol según corresponda
      if (this.invitacionInfo?.rol === 'Estudiante') {
        formData.datos_estudiante = roleData;
      } else if (this.invitacionInfo?.rol === 'Docente') {
        formData.datos_docente = roleData;
      } else if (this.invitacionInfo?.rol === 'Administrador') {
        formData.datos_administrador = roleData;
      }

      try {
        const response = await this.authService.registroConInvitacion(formData).toPromise();
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: '¡Registro exitoso! Ya puedes iniciar sesión',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        this.router.navigate(['/login']);
      } catch (error: any) {
        await loading.dismiss();
        this.showError(error.message || 'Error en el registro. Por favor, intenta nuevamente.');
      }
    } else {
      await this.showError('Por favor, completa todos los campos requeridos correctamente.');
    }
  }

  private checkPasswordsMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const passwordConfirm = this.registerForm.get('password_confirm')?.value;
    return password === passwordConfirm;
  }

  private async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirmVisibility() {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  // Getters para validaciones
  get username() { return this.registerForm.get('username'); }
  get nombre() { return this.registerForm.get('nombre'); }
  get apellido() { return this.registerForm.get('apellido'); }
  get password() { return this.registerForm.get('password'); }
  get password_confirm() { return this.registerForm.get('password_confirm'); }
  get telefono() { return this.registerForm.get('telefono'); }
  get numero_identificacion() { return this.registerForm.get('numero_identificacion'); }
  get genero() { return this.registerForm.get('genero'); }
}
