import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioRegistro } from '../../core/models/usuario.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showPasswordConfirm = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.registerForm = this.createForm();
  }

  ngOnInit() {
    // Forzar rol estudiante y configurar validaciones de estudiante
    this.registerForm.get('rol')?.setValue('estudiante');
    this.updateValidationsByRole('estudiante');
  }

  private async showRegistrationDisabledAlert() {
    const alert = await this.alertController.create({
      header: 'Registro No Disponible',
      message: 'El registro libre ha sido deshabilitado. Solo puedes registrarte mediante invitación de un administrador.',
      buttons: [
        {
          text: 'Ir a Login',
          handler: () => {
            this.router.navigate(['/login']);
          }
        },
        {
          text: '¿Tienes una invitación?',
          handler: () => {
            this.router.navigate(['/register-invitation']);
          }
        }
      ],
      backdropDismiss: false
    });
    await alert.present();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      // Campos básicos
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      rol: ['estudiante', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]],
      
      // Campos adicionales opcionales (sin dirección)
      numero_identificacion: [''],
      telefono: [''],
      genero: [''],
      
      // Preferencias
      notificaciones_email: [true],
      notificaciones_push: [true],
      idioma_preferido: ['es'],
      
      // Campos específicos por rol - Estudiante (sin fechas)
      carrera: [''],
      matricula: [''],
      semestre_actual: [''],
      
      // Campos específicos por rol - Docente
      departamento: [''],
      numero_empleado: [''],
      especialidad: [''],

      // Campos específicos por rol - Administrador
      area: [''],
      nivel_acceso: ['']
    }, {
      validators: this.passwordMatchValidator 
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('password_confirm');
    
    if (!password || !confirmPassword) {
      return null;
    }

    const mismatch = password.value !== confirmPassword.value;

    if (mismatch) {
      const currentErrors = confirmPassword.errors || {};
      confirmPassword.setErrors({ ...currentErrors, passwordMismatch: true });
    } else {
      // Clear only the passwordMismatch error, preserve others
      const { passwordMismatch, ...others } = confirmPassword.errors || {} as any;
      const newErrors = Object.keys(others).length ? others : null;
      confirmPassword.setErrors(newErrors);
    }

    confirmPassword.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    return mismatch ? { passwordMismatch: true } : null;
  }

  checkPasswordsMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('password_confirm')?.value;
    return password === confirmPassword;
  }

  updateValidationsByRole(rol: string) {
    // Limpiar validaciones previas
    this.clearRoleValidations();
    
    // Aplicar validaciones según el rol
    switch (rol) {
      case 'estudiante':
        this.registerForm.get('carrera')?.setValidators([Validators.required]);
        this.registerForm.get('matricula')?.setValidators([Validators.required]);
        break;
      case 'docente':
        this.registerForm.get('departamento')?.setValidators([Validators.required]);
        this.registerForm.get('especialidad')?.setValidators([Validators.required]);
        break;
      case 'administrador':
        this.registerForm.get('area')?.setValidators([Validators.required]);
        break;
    }
    
    // Actualizar validaciones
    this.registerForm.updateValueAndValidity();
  }

  private clearRoleValidations() {
    const roleFields = [
      'carrera', 'matricula', 'semestre_actual',
      'departamento', 'numero_empleado', 'especialidad',
      'area', 'nivel_acceso'
    ];
    
    roleFields.forEach(field => {
      this.registerForm.get(field)?.clearValidators();
      this.registerForm.get(field)?.updateValueAndValidity();
    });
  }

  buildUserData(): UsuarioRegistro {
    const formValue = this.registerForm.value;
    const rol = formValue.rol;
    
    const userData: UsuarioRegistro = {
      email: formValue.email,
      username: formValue.username,
      nombre: formValue.nombre,
      apellido: formValue.apellido,
      rol: rol,
      password: formValue.password,
      password_confirm: formValue.password_confirm,
      telefono: formValue.telefono || undefined,
      numero_identificacion: formValue.numero_identificacion || undefined,
      genero: formValue.genero || undefined,
      notificaciones_email: formValue.notificaciones_email,
      notificaciones_push: formValue.notificaciones_push,
      idioma_preferido: formValue.idioma_preferido
    };

    // Agregar datos específicos por rol (sin campos de fecha eliminados)
    if (rol === 'estudiante') {
      userData.datos_estudiante = {
        carrera: formValue.carrera,
        matricula: formValue.matricula,
        semestre_actual: formValue.semestre_actual || undefined
      };
    } else if (rol === 'docente') {
      userData.datos_docente = {
        departamento: formValue.departamento,
        numero_empleado: formValue.numero_empleado || undefined,
        especialidad: formValue.especialidad || undefined
      };
    } else if (rol === 'administrador') {
      userData.datos_administrador = {
        area: formValue.area,
        nivel_acceso: formValue.nivel_acceso || undefined
      };
    }

    return userData;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirmVisibility() {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  async onSubmit() {
    if (this.registerForm.invalid || !this.checkPasswordsMatch()) {
      const alert = await this.alertController.create({
        header: 'Formulario inválido',
        message: 'Revisa los campos requeridos y que las contraseñas coincidan.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({ message: 'Registrando...' });
    await loading.present();

    const userData: UsuarioRegistro = this.buildUserData();
    // Asegurar rol estudiante
    userData.rol = 'estudiante';

    this.authService.registro(userData).subscribe({
      next: async (response) => {
        await loading.dismiss();
        this.isLoading = false;
        const toast = await this.toastController.create({
          message: 'Registro exitoso. Ahora inicia sesión.',
          duration: 2500,
          color: 'success'
        });
        await toast.present();
        this.router.navigate(['/login']);
      },
      error: async (error) => {
        await loading.dismiss();
        this.isLoading = false;
        const backend = error?.error;
        let msg = error?.message || backend?.detail || 'No se pudo completar el registro.';
        if (backend?.errors) {
          msg = this.extractFirstErrorMessage(backend.errors) || msg;
        }
        const alert = await this.alertController.create({
          header: 'Error de registro',
          message: msg,
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  shouldShowEstudianteFields(): boolean {
    return this.registerForm.get('rol')?.value === 'estudiante';
  }

  shouldShowDocenteFields(): boolean {
    return this.registerForm.get('rol')?.value === 'docente';
  }

  shouldShowAdminFields(): boolean {
    return this.registerForm.get('rol')?.value === 'administrador';
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  // Getters para facilitar el acceso a los controles del formulario en el template
  get email() { return this.registerForm.get('email'); }
  get username() { return this.registerForm.get('username'); }
  get nombre() { return this.registerForm.get('nombre'); }
  get apellido() { return this.registerForm.get('apellido'); }
  get rol() { return this.registerForm.get('rol'); }
  get password() { return this.registerForm.get('password'); }
  get password_confirm() { return this.registerForm.get('password_confirm'); }
  get numero_identificacion() { return this.registerForm.get('numero_identificacion'); }
  get telefono() { return this.registerForm.get('telefono'); }
  get genero() { return this.registerForm.get('genero'); }
  get carrera() { return this.registerForm.get('carrera'); }
  get matricula() { return this.registerForm.get('matricula'); }
  get departamento() { return this.registerForm.get('departamento'); }

  private extractFirstErrorMessage(errors: any): string | null {
    if (!errors) return null;
    const tryGetMsg = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      if (Array.isArray(val) && val.length) {
        const first = val[0];
        return typeof first === 'string' ? first : tryGetMsg(first);
      }
      if (typeof val === 'object') {
        const keys = Object.keys(val);
        if (keys.length) {
          return tryGetMsg(val[keys[0]]);
        }
      }
      return null;
    };
    return tryGetMsg(errors);
  }
}
