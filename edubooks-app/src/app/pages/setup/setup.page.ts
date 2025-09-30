import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { SetupService, SetupData } from '../../core/services/setup.service';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.page.html',
  styleUrls: ['./setup.page.scss'],
  standalone: false
})
export class SetupPage implements OnInit {

  setupForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private setupService: SetupService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.setupForm = this.fb.group({
      institucion: ['', [Validators.required, Validators.minLength(2)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3), this.usernameValidator]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
      password_confirm: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Verificar si el sistema ya está inicializado
    this.verificarEstadoSistema();
  }

  /**
   * Validador personalizado para contraseñas
   */
  passwordValidator(control: any) {
    const password = control.value;
    if (!password) return null;

    const errors: any = {};
    
    if (password.length < 8) {
      errors.minLength = true;
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.uppercase = true;
    }
    
    if (!/[a-z]/.test(password)) {
      errors.lowercase = true;
    }
    
    if (!/\d/.test(password)) {
      errors.number = true;
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.specialChar = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

  /**
   * Validador personalizado para username
   */
  usernameValidator(control: any) {
    const username = control.value;
    if (!username) return null;

    const errors: any = {};
    
    if (username.length < 3) {
      errors.minLength = true;
    }
    
    // Permitir cualquier carácter excepto caracteres de control
    if (/[\x00-\x1F\x7F]/.test(username)) {
      errors.invalidFormat = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

  /**
   * Validador para confirmar que las contraseñas coincidan
   */
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('password_confirm');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      return null;
    }
  }

  /**
   * Verifica si el sistema ya está inicializado
   */
  async verificarEstadoSistema() {
    try {
      const response = await this.setupService.verificarSistema().toPromise();
      
      if (response?.is_initialized) {
        // Si ya está inicializado, redirigir al login
        await this.mostrarMensaje('Sistema ya inicializado', 'El sistema ya ha sido configurado. Serás redirigido al login.');
        this.router.navigate(['/login']);
      }
    } catch (error: any) {
      console.error('Error verificando estado del sistema:', error);
      // Si hay error verificando, permitir continuar con la configuración
    }
  }

  /**
   * Inicializa el sistema con los datos del formulario
   */
  async inicializarSistema() {
    if (this.setupForm.valid && !this.isLoading) {
      const loading = await this.loadingController.create({
        message: 'Inicializando sistema...',
        spinner: 'crescent'
      });
      
      await loading.present();
      this.isLoading = true;

      try {
        const setupData: SetupData = this.setupForm.value;
        const response = await this.setupService.inicializarSistema(setupData).toPromise();
        
        await loading.dismiss();
        
        // Mostrar mensaje de éxito
        await this.mostrarAlertaExito(response);
        
        // Redirigir al login
        this.router.navigate(['/login']);
        
      } catch (error: any) {
        await loading.dismiss();
        console.error('Error inicializando sistema:', error);
        
        // Manejar errores específicos del backend
        let errorMessage = 'Error al inicializar el sistema';
        
        if (error.error) {
          if (error.error.validation_errors) {
            // Mostrar errores de validación específicos
            errorMessage = 'Errores de validación:\n' + error.error.validation_errors.join('\n');
          } else if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        await this.mostrarError(errorMessage);
      } finally {
        this.isLoading = false;
      }
    } else {
      await this.mostrarError('Por favor completa todos los campos correctamente');
    }
  }

  /**
   * Muestra una alerta de éxito con los datos del usuario creado
   */
  async mostrarAlertaExito(response: any) {
    const usuario = response.data?.usuario;
    const administrador = response.data?.administrador;
    
    const alert = await this.alertController.create({
      header: '¡Sistema Inicializado!',
      message: `
        <p>El sistema ha sido configurado exitosamente.</p>
        <p><strong>Usuario administrador creado:</strong></p>
        <p>• Email: ${usuario?.email || 'No disponible'}</p>
        <p>• Username: ${usuario?.username || 'No disponible'}</p>
        <p>• Nombre: ${usuario?.nombre || ''} ${usuario?.apellido || ''}</p>
        <p>• Área: ${administrador?.area || 'No especificada'}</p>
        <p>• Cargo: ${administrador?.cargo || 'No especificado'}</p>
        <br>
        <p><strong>¡Guarda estas credenciales de forma segura!</strong></p>
      `,
      buttons: ['Continuar']
    });
    
    await alert.present();
  }

  /**
   * Muestra un mensaje de error
   */
  async mostrarError(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 4000,
      color: 'danger',
      position: 'top'
    });
    
    await toast.present();
  }

  /**
   * Muestra un mensaje informativo
   */
  async mostrarMensaje(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });
    
    await alert.present();
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getErrorMessage(fieldName: string): string {
    const field = this.setupForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Este campo es requerido';
      }
      if (field.errors['email']) {
        return 'Ingresa un email válido';
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['passwordMismatch']) {
        return 'Las contraseñas no coinciden';
      }
      // Errores de validación de contraseña
      if (field.errors['uppercase']) {
        return 'Agrega una letra MAYÚSCULA (A, B, C...)';
      }
      if (field.errors['lowercase']) {
        return 'Agrega una letra minúscula (a, b, c...)';
      }
      if (field.errors['number']) {
        return 'Agrega un número (0, 1, 2...)';
      }
      if (field.errors['specialChar']) {
        return 'Agrega un símbolo especial como: ! @ # $ % & *';
      }
      // Errores de validación de username
      if (field.errors['invalidFormat']) {
        return 'El nombre de usuario no puede contener caracteres de control';
      }
    }
    
    return '';
  }

  /**
   * Verifica si un campo tiene errores
   */
  hasError(fieldName: string): boolean {
    const field = this.setupForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  /**
   * Métodos para verificar características de la contraseña
   */
  passwordHasMinLength(): boolean {
    const password = this.setupForm.get('password')?.value || '';
    return password.length >= 8;
  }

  passwordHasUppercase(): boolean {
    const password = this.setupForm.get('password')?.value || '';
    return /[A-Z]/.test(password);
  }

  passwordHasLowercase(): boolean {
    const password = this.setupForm.get('password')?.value || '';
    return /[a-z]/.test(password);
  }

  passwordHasNumber(): boolean {
    const password = this.setupForm.get('password')?.value || '';
    return /\d/.test(password);
  }

  passwordHasSpecialChar(): boolean {
    const password = this.setupForm.get('password')?.value || '';
    return /[!@#$%^&*(),.?":{}|<>]/.test(password);
  }
}
