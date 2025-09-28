import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-callback',
  templateUrl: './callback.page.html',
  styleUrls: ['./callback.page.scss'],
  standalone: false
})
export class CallbackPage implements OnInit {

  constructor(
    private supabaseService: SupabaseService,
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
      console.log('Iniciando procesamiento del callback OAuth');
      console.log('URL actual:', window.location.href);
      console.log('Hash:', window.location.hash);
      console.log('Search params:', window.location.search);
      
      // Usar el nuevo método handleAuthCallback
      await this.supabaseService.handleAuthCallback();
      
      // Verificar si hay una sesión activa después del callback
      const session = await this.supabaseService.getSession();
      
      if (session && session.user) {
        console.log('Usuario autenticado:', session.user);
        
        // Sincronizar con Django
        await this.syncWithDjango(session.user);
        
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: '¡Autenticación exitosa!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        // Redirigir al home
        this.router.navigate(['/home']);
      } else {
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: 'Error en la autenticación. No se pudo establecer la sesión.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();

        // Redirigir al login
        this.router.navigate(['/login']);
      }
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

  private async syncWithDjango(supabaseUser: any) {
    try {
      const token = await this.supabaseService.getAccessToken();
      if (token) {
        // La sincronización se manejará automáticamente en AuthService
        console.log('Token de Supabase obtenido para sincronización');
      }
    } catch (error) {
      console.error('Error sincronizando con Django:', error);
    }
  }
}