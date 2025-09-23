import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-mis-solicitudes',
  templateUrl: './mis-solicitudes.page.html',
  styleUrls: ['./mis-solicitudes.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class MisSolicitudesPage implements OnInit {
  solicitudes: any[] = [];
  prestamosActivos: any[] = [];
  isLoading = true;
  error = '';
  segmentValue = 'solicitudes';
  Math = Math;

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.cargarDatos();
  }

  ionViewWillEnter() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.isLoading = true;
    this.error = '';
    
    try {
      // Cargar solicitudes pendientes y rechazadas
      this.bibliotecaService.obtenerMisSolicitudes().subscribe({
        next: (solicitudes) => {
          this.solicitudes = solicitudes || [];
          this.cargarPrestamosActivos();
        },
        error: (error) => {
          console.error('Error cargando solicitudes:', error);
          this.error = 'Error al cargar las solicitudes';
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error:', error);
      this.error = 'Error al cargar los datos';
      this.isLoading = false;
    }
  }

  private cargarPrestamosActivos() {
    this.bibliotecaService.getPrestamosUsuario().subscribe({
      next: (prestamos) => {
        this.prestamosActivos = prestamos.filter((p: any) => p.estado === 'Activo') || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando préstamos activos:', error);
        this.prestamosActivos = [];
        this.isLoading = false;
      }
    });
  }

  onSegmentChange(event: any) {
    this.segmentValue = event.detail.value;
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Pendiente':
        return 'warning';
      case 'Activo':
        return 'success';
      case 'Rechazado':
        return 'danger';
      case 'Vencido':
        return 'danger';
      case 'Devuelto':
        return 'medium';
      default:
        return 'medium';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'Pendiente':
        return 'time-outline';
      case 'Activo':
        return 'checkmark-circle-outline';
      case 'Rechazado':
        return 'close-circle-outline';
      case 'Vencido':
        return 'warning-outline';
      case 'Devuelto':
        return 'archive-outline';
      default:
        return 'help-circle-outline';
    }
  }

  calcularDiasRestantes(fechaDevolucion: string): number {
    const hoy = new Date();
    const fechaLimite = new Date(fechaDevolucion);
    const diferencia = fechaLimite.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  async doRefresh(event: any) {
    await this.cargarDatos();
    event.target.complete();
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

}
