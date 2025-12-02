import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-callback',
  templateUrl: './callback.page.html',
  styleUrls: ['./callback.page.scss'],
  standalone: false
})
export class CallbackPage implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Completando autenticación...',
    });
    await loading.present();

    try {
      const sub = this.authService.isAuthenticated$.subscribe(async (isAuth) => {
        if (!isAuth) return;
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: '¡Autenticación exitosa!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
        this.router.navigate(['/home']);
        sub.unsubscribe();
      });
    } catch (error) {
      await loading.dismiss();
      console.error('Error en callback:', error);
      
      const toast = await this.toastController.create({
        message: `Error procesando la autenticación: ${error}`,
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();

      this.router.navigate(['/login']);
    }
  }

  private async syncWithDjango(): Promise<void> {}
}
