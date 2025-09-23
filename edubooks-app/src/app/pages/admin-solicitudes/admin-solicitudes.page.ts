import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-solicitudes',
  templateUrl: './admin-solicitudes.page.html',
  styleUrls: ['./admin-solicitudes.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class AdminSolicitudesPage implements OnInit {
  solicitudes: any[] = [];
  isLoading = true;
  error = '';

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.cargarSolicitudes();
  }

  ionViewWillEnter() {
    this.cargarSolicitudes();
  }

  async cargarSolicitudes() {
    this.isLoading = true;
    this.error = '';

    try {
      this.bibliotecaService.obtenerSolicitudesPendientes().subscribe({
        next: (response) => {
          this.solicitudes = response.solicitudes || [];
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Error al cargar las solicitudes pendientes';
          this.isLoading = false;
          console.error('Error cargando solicitudes:', error);
        }
      });
    } catch (error) {
      this.error = 'Error al conectar con el servidor';
      this.isLoading = false;
      console.error('Error:', error);
    }
  }

  async aprobarSolicitud(solicitud: any) {
    const alert = await this.alertController.create({
      header: 'Aprobar Solicitud',
      message: `¿Estás seguro de aprobar el préstamo de "${solicitud.libro.titulo}" para ${solicitud.usuario.nombre} ${solicitud.usuario.apellido}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aprobar',
          handler: async () => {
            await this.procesarAprobacion(solicitud.id);
          }
        }
      ]
    });
    await alert.present();
  }

  async rechazarSolicitud(solicitud: any) {
    const alert = await this.alertController.create({
      header: 'Rechazar Solicitud',
      message: `¿Por qué rechazas el préstamo de "${solicitud.libro.titulo}"?`,
      inputs: [
        {
          name: 'motivo',
          type: 'textarea',
          placeholder: 'Motivo del rechazo...',
          attributes: {
            required: true
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Rechazar',
          handler: async (data) => {
            if (data.motivo && data.motivo.trim()) {
              await this.procesarRechazo(solicitud.id, data.motivo.trim());
              return true;
            } else {
              this.mostrarToast('Debes proporcionar un motivo para el rechazo', 'warning');
              return false;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async procesarAprobacion(solicitudId: number) {
    const loading = await this.loadingController.create({
      message: 'Aprobando solicitud...'
    });
    await loading.present();

    this.bibliotecaService.aprobarPrestamo(solicitudId).subscribe({
      next: async (response) => {
        await loading.dismiss();
        await this.mostrarToast('Solicitud aprobada exitosamente', 'success');
        this.cargarSolicitudes();
      },
      error: async (error) => {
        await loading.dismiss();
        await this.mostrarToast('Error al aprobar la solicitud', 'danger');
        console.error('Error:', error);
      }
    });
  }

  private async procesarRechazo(solicitudId: number, motivo: string) {
    const loading = await this.loadingController.create({
      message: 'Rechazando solicitud...'
    });
    await loading.present();

    this.bibliotecaService.rechazarPrestamo(solicitudId, motivo).subscribe({
      next: async (response) => {
        await loading.dismiss();
        await this.mostrarToast('Solicitud rechazada', 'warning');
        this.cargarSolicitudes();
      },
      error: async (error) => {
        await loading.dismiss();
        await this.mostrarToast('Error al rechazar la solicitud', 'danger');
        console.error('Error:', error);
      }
    });
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  async doRefresh(event: any) {
    await this.cargarSolicitudes();
    event.target.complete();
  }

  get esAdministrador(): boolean {
    const usuario = this.authService.currentUserValue;
    return !!(usuario && usuario.rol === 'Administrador');
  }

}
