// src/app/pages/auth/login/login.page.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from './../../core/services/auth.service';
import { UsuarioLogin } from '../../core/models/usuario.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit() {
    // Redirigir si ya está autenticado
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Iniciando sesión...',
      });
      await loading.present();

      const credentials: UsuarioLogin = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: async (response) => {
          await loading.dismiss();
          
          const toast = await this.toastController.create({
            message: '¡Bienvenido a EduBooks!',
            duration: 2000,
            color: 'success',
            position: 'top'
          });
          await toast.present();

          this.router.navigate(['/dashboard']);
        },
        error: async (error) => {
          await loading.dismiss();
          
          const alert = await this.alertController.create({
            header: 'Error de Inicio de Sesión',
            message: error.message || 'Credenciales inválidas. Por favor, verifica tu email y contraseña.',
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

  goToRegister() {
    this.router.navigate(['/register']);
  }

  // Getters para validaciones
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}