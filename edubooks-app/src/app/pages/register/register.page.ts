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
    // Verificar si ya está autenticado
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/home']);
    }

    // Escuchar cambios en el rol para mostrar/ocultar campos específicos
    this.registerForm.get('rol')?.valueChanges.subscribe(rol => {
      this.updateValidationsByRole(rol);
    });
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      // Campos básicos
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      rol: ['Estudiante', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]],
      
      // Campos específicos por rol
      carrera: [''],
      matricula: [''],
      departamento: [''],
      numero_empleado: [''],
      area: ['']
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

  private updateValidationsByRole(rol: string) {
    // Limpiar validadores anteriores
    this.registerForm.get('carrera')?.clearValidators();
    this.registerForm.get('matricula')?.clearValidators();
    this.registerForm.get('departamento')?.clearValidators();
    this.registerForm.get('numero_empleado')?.clearValidators();
    this.registerForm.get('area')?.clearValidators();

    // Establecer validadores según el rol
    switch (rol) {
      case 'Estudiante':
        this.registerForm.get('carrera')?.setValidators([Validators.required]);
        this.registerForm.get('matricula')?.setValidators([Validators.required]);
        break;
      case 'Docente':
        this.registerForm.get('departamento')?.setValidators([Validators.required]);
        this.registerForm.get('numero_empleado')?.setValidators([Validators.required]);
        break;
      case 'Administrador':
        this.registerForm.get('area')?.setValidators([Validators.required]);
        break;
    }

    // Actualizar validaciones
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.updateValueAndValidity();
    });
  }

  // Método para verificar si las contraseñas coinciden
  checkPasswordsMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const passwordConfirm = this.registerForm.get('password_confirm')?.value;
    return password === passwordConfirm;
  }

  async onSubmit() {
    // Validar manualmente las contraseñas
    if (!this.checkPasswordsMatch()) {
      const alert = await this.alertController.create({
        header: 'Error de Validación',
        message: 'Las contraseñas no coinciden.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (this.registerForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Registrando usuario...',
      });
      await loading.present();

      const userData: UsuarioRegistro = this.registerForm.value;

      this.authService.registro(userData).subscribe({
        next: async (response) => {
          await loading.dismiss();
          
          const toast = await this.toastController.create({
            message: '¡Registro exitoso! Bienvenido a EduBooks',
            duration: 3000,
            color: 'success',
            position: 'top'
          });
          await toast.present();

          this.router.navigate(['/home']);
        },
        error: async (error) => {
          await loading.dismiss();
          
          let errorMessage = 'Error en el registro. Por favor, intenta nuevamente.';
          
          if (error.message.includes('email')) {
            errorMessage = 'El email ya está registrado.';
          } else if (error.message.includes('username')) {
            errorMessage = 'El nombre de usuario ya existe.';
          } else if (error.message.includes('matricula')) {
            errorMessage = 'La matrícula ya está registrada.';
          } else if (error.message.includes('numero_empleado')) {
            errorMessage = 'El número de empleado ya está registrado.';
          }

          const alert = await this.alertController.create({
            header: 'Error de Registro',
            message: errorMessage,
            buttons: ['OK']
          });
          await alert.present();
        }
      });
    } else {
      const alert = await this.alertController.create({
        header: 'Formulario Inválido',
        message: 'Por favor, completa todos los campos correctamente.',
        buttons: ['OK']
      });
      await alert.present();
    }
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
  get email() { return this.registerForm.get('email'); }
  get username() { return this.registerForm.get('username'); }
  get nombre() { return this.registerForm.get('nombre'); }
  get apellido() { return this.registerForm.get('apellido'); }
  get rol() { return this.registerForm.get('rol'); }
  get password() { return this.registerForm.get('password'); }
  get password_confirm() { return this.registerForm.get('password_confirm'); }
  get carrera() { return this.registerForm.get('carrera'); }
  get matricula() { return this.registerForm.get('matricula'); }
  get departamento() { return this.registerForm.get('departamento'); }
  get numero_empleado() { return this.registerForm.get('numero_empleado'); }
  get area() { return this.registerForm.get('area'); }

  // Métodos auxiliares para la vista
  shouldShowEstudianteFields(): boolean {
    return this.rol?.value === 'Estudiante';
  }

  shouldShowDocenteFields(): boolean {
    return this.rol?.value === 'Docente';
  }

  shouldShowAdminFields(): boolean {
    return this.rol?.value === 'Administrador';
  }
}