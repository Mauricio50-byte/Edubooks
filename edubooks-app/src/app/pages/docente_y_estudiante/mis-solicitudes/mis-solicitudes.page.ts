import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { BibliotecaService } from '../../../core/services/biblioteca.service';
import { AuthService } from '../../../core/services/auth.service';

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
  solicitudesFiltradas: any[] = [];
  prestamosActivosFiltrados: any[] = [];
  isLoading = true;
  error = '';
  segmentValue = 'solicitudes';
  Math = Math;
  mostrarFiltros = false;
  terminoBusqueda = '';
  filtroEstado = '';

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
          this.solicitudesFiltradas = [...this.solicitudes];
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
        this.prestamosActivosFiltrados = [...this.prestamosActivos];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando préstamos activos:', error);
        this.prestamosActivos = [];
        this.prestamosActivosFiltrados = [];
        this.isLoading = false;
      }
    });
  }

  onSegmentChange(event: any) {
    this.segmentValue = event.detail.value;
  }

  aplicarFiltros() {
    // Filtrar solicitudes
    this.solicitudesFiltradas = this.solicitudes.filter((solicitud: any) => {
      const cumpleEstado = !this.filtroEstado || solicitud.estado === this.filtroEstado;
      const cumpleBusqueda = !this.terminoBusqueda ||
        (solicitud.libro?.titulo || '').toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        (solicitud.libro?.autor || '').toLowerCase().includes(this.terminoBusqueda.toLowerCase());
      return cumpleEstado && cumpleBusqueda;
    });

    // Filtrar préstamos activos
    this.prestamosActivosFiltrados = this.prestamosActivos.filter((prestamo: any) => {
      const cumpleEstado = !this.filtroEstado || prestamo.estado === this.filtroEstado;
      const cumpleBusqueda = !this.terminoBusqueda ||
        (prestamo.libro?.titulo || '').toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        (prestamo.libro?.autor || '').toLowerCase().includes(this.terminoBusqueda.toLowerCase());
      return cumpleEstado && cumpleBusqueda;
    });
  }

  onSearchChange(event: any) {
    this.terminoBusqueda = event.detail.value;
    this.aplicarFiltros();
  }

  onEstadoChange(event: any) {
    this.filtroEstado = event.detail.value;
    this.aplicarFiltros();
  }

  limpiarFiltros() {
    this.filtroEstado = '';
    this.terminoBusqueda = '';
    this.solicitudesFiltradas = [...this.solicitudes];
    this.prestamosActivosFiltrados = [...this.prestamosActivos];
  }

  toggleFiltros() {
    this.mostrarFiltros = !this.mostrarFiltros;
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
