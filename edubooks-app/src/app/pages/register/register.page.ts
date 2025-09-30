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
    // El registro libre ya no está disponible, pero no mostrar el modal
    // La información se muestra directamente en la página
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
      
      // Campos específicos por rol - Docente (sin fecha_contratacion)
      departamento: [''],
      numero_empleado: [''],
      especialidad: [''],
      grado_academico: [''],
      
      // Campos específicos por rol - Administrador (sin fecha_nombramiento)
      area: [''],
      nivel_acceso: ['']
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('password_confirm');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
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
      'departamento', 'numero_empleado', 'especialidad', 'grado_academico',
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
        especialidad: formValue.especialidad || undefined,
        grado_academico: formValue.grado_academico || undefined
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
    // Este método ya no debería ejecutarse debido a la redirección
    const alert = await this.alertController.create({
      header: 'Registro No Disponible',
      message: 'El registro libre ha sido deshabilitado. Solo puedes registrarte mediante invitación.',
      buttons: ['OK']
    });
    await alert.present();
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
}