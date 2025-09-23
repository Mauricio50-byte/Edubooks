import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { SancionService } from '../../core/services/sancion.service';
import { Sancion } from '../../core/models/libro.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sanciones',
  templateUrl: './sanciones.page.html',
  styleUrls: ['./sanciones.page.scss'],
  standalone: false
})
export class SancionesPage implements OnInit {
  sanciones: Sancion[] = [];
  isLoading = true;
  error: string = '';
  usuarioActual: any = null;
  filtroEstado: string = '';
  totalMultasActivas: number = 0;
  montoTotalMultas: number = 0;

  constructor(
    private authService: AuthService,
    private sancionService: SancionService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    this.cargarSanciones();
  }

  /**
   * Cargar lista de sanciones del usuario
   */
  async cargarSanciones() {
    this.isLoading = true;
    this.error = '';

    try {
      const sanciones = await this.sancionService.obtenerSancionesUsuario().toPromise();
      this.sanciones = sanciones || [];
      this.calcularEstadisticas();
    } catch (error: any) {
      console.error('Error cargando sanciones:', error);
      this.error = error.message || 'Error al cargar las sanciones';
      await this.mostrarToast('Error al cargar las sanciones', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Calcular estadísticas de sanciones
   */
  calcularEstadisticas() {
    const sancionesActivas = this.sanciones.filter(s => s.estado === 'Activa');
    this.totalMultasActivas = sancionesActivas.filter(s => s.tipo === 'Multa').length;
    this.montoTotalMultas = sancionesActivas
      .filter(s => s.tipo === 'Multa')
      .reduce((total, s) => total + (s.monto || 0), 0);
  }

  /**
   * Filtrar sanciones por estado
   */
  get sancionesFiltradas(): Sancion[] {
    if (!this.filtroEstado) {
      return this.sanciones;
    }
    return this.sanciones.filter(sancion => sancion.estado === this.filtroEstado);
  }

  /**
   * Pagar multa
   */
  async pagarMulta(sancion: Sancion) {
    if (sancion.tipo !== 'Multa' || sancion.estado !== 'Activa') {
      await this.mostrarToast('Esta sanción no se puede pagar', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Pago',
      message: `¿Estás seguro de que deseas pagar la multa de $${sancion.monto?.toLocaleString()}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Pagar',
          handler: () => {
            this.procesarPagoMulta(sancion);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar el pago de la multa
   */
  private async procesarPagoMulta(sancion: Sancion) {
    const loading = await this.loadingController.create({
      message: 'Procesando pago...'
    });
    await loading.present();

    try {
      await this.sancionService.pagarMulta(sancion.id).toPromise();
      await this.mostrarToast('Multa pagada exitosamente', 'success');
      await this.cargarSanciones(); // Recargar la lista
    } catch (error: any) {
      console.error('Error pagando multa:', error);
      await this.mostrarToast(error.message || 'Error al procesar el pago', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Ver detalles de una sanción
   */
  async verDetallesSancion(sancion: Sancion) {
    const alert = await this.alertController.create({
      header: 'Detalles de la Sanción',
      message: `
        <strong>Tipo:</strong> ${sancion.tipo}<br>
        <strong>Estado:</strong> ${sancion.estado}<br>
        <strong>Descripción:</strong> ${sancion.descripcion}<br>
        ${sancion.monto ? `<strong>Monto:</strong> $${sancion.monto.toLocaleString()}<br>` : ''}
        ${sancion.dias_suspension ? `<strong>Días de suspensión:</strong> ${sancion.dias_suspension}<br>` : ''}
        <strong>Fecha inicio:</strong> ${this.formatearFecha(sancion.fecha_inicio)}<br>
        ${sancion.fecha_fin ? `<strong>Fecha fin:</strong> ${this.formatearFecha(sancion.fecha_fin)}<br>` : ''}
        ${sancion.prestamo ? `<strong>Préstamo relacionado:</strong> ${sancion.prestamo.libro?.titulo || 'N/A'}` : ''}
      `,
      buttons: ['Cerrar']
    });

    await alert.present();
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Obtener color según el estado de la sanción
   */
  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Activa': return 'danger';
      case 'Pagada': return 'success';
      case 'Completada': return 'medium';
      default: return 'medium';
    }
  }

  /**
   * Obtener color según el tipo de sanción
   */
  getTipoColor(tipo: string): string {
    switch (tipo) {
      case 'Multa': return 'warning';
      case 'Suspensión': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Refrescar datos
   */
  async doRefresh(event: any) {
    await this.cargarSanciones();
    event.target.complete();
  }

  /**
   * Mostrar toast
   */
  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Contar sanciones por estado
   */
  contarSancionesPorEstado(estado: 'Activa' | 'Pagada' | 'Completada'): number {
    return this.sanciones.filter(s => s.estado === estado).length;
  }
}