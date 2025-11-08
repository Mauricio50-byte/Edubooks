import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Usuario } from '../../core/models/usuario.model';
import { AlertController, ActionSheetController, ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  currentUser: Usuario | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Suscribirse al usuario actual para refrescar automáticamente
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Verificar autenticación de forma reactiva
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (!isAuth) {
          this.router.navigate(['/login']);
        }
      });

    // Mostrar aviso si fue redirigido por falta de permisos
    this.route.queryParamMap.subscribe(params => {
      const deniedUrl = params.get('denied');
      if (deniedUrl) {
        this.showDeniedToast(deniedUrl);
      }
    });
  }

  async openSettings() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Ajustes',
      cssClass: 'settings-action-sheet',
      buttons: [
        {
          text: 'Editar mis datos',
          icon: 'create-outline',
          cssClass: 'settings-option',
          handler: () => this.navigateTo('/ajustes/editar-perfil')
        },
        {
          text: 'Ayuda',
          icon: 'help-circle-outline',
          cssClass: 'settings-option',
          handler: () => this.navigateTo('/ajustes/ayuda')
        },
        {
          text: 'Comentarios',
          icon: 'chatbox-ellipses-outline',
          cssClass: 'settings-option',
          handler: () => this.navigateTo('/ajustes/comentarios')
        },
        {
          text: 'Cerrar sesión',
          role: 'destructive',
          icon: 'log-out-outline',
          cssClass: 'settings-destructive',
          handler: () => this.logout()
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close-outline',
          cssClass: 'settings-cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  // Eliminado: showComingSoon – ahora navega a páginas reales

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      cssClass: 'logout-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-cancel'
        },
        {
          text: 'Sí, cerrar sesión',
          cssClass: 'alert-destructive',
          handler: () => {
            this.authService.logout();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Navegar a una ruta específica
   */
  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  /**
   * Verificar si el usuario es Administrador
   */
  isAdministrador(): boolean {
    return this.currentUser?.rol === 'administrador';
  }

  /**
   * Verificar si el usuario es Estudiante o Docente
   */
  isEstudianteOrDocente(): boolean {
    return this.currentUser?.rol === 'estudiante' || this.currentUser?.rol === 'docente';
  }

  /**
   * Verificar si el usuario es Estudiante
   */
  isEstudiante(): boolean {
    return this.currentUser?.rol === 'estudiante';
  }

  /**
   * Verificar si el usuario es Docente
   */
  isDocente(): boolean {
    return this.currentUser?.rol === 'docente';
  }

  private async showDeniedToast(deniedUrl: string) {
    const toast = await this.toastController.create({
      message: `No tienes permisos para acceder a: ${deniedUrl}`,
      duration: 2500,
      color: 'warning',
      position: 'bottom'
    });
    await toast.present();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}