import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SancionService } from '../../../core/services/sancion.service';
import { Sancion } from '../../../core/models/libro.model';

@Component({
  selector: 'app-admin-sanciones',
  templateUrl: './admin-sanciones.page.html',
  styleUrls: ['./admin-sanciones.page.scss'],
  standalone: false
})
export class AdminSancionesPage implements OnInit {
  sanciones: Sancion[] = [];
  sancionesPendientes: Sancion[] = [];
  isLoading = true;
  error: string = '';
  usuarioActual: any = null;
  filtroEstado: string = '';
  filtroTipo: string = '';

  // Estadísticas simples
  stats: any = null;

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
    // Solo administradores
    if (!this.esAdministrador) {
      this.router.navigate(['/home']);
      return;
    }
    this.cargarDatos();
  }

  get esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'administrador';
  }

  async cargarDatos() {
    this.isLoading = true;
    this.error = '';

    try {
      const [todas, pendientes, stats] = await Promise.all([
        this.sancionService.obtenerTodasLasSanciones().toPromise(),
        this.sancionService.obtenerSancionesPendientes().toPromise(),
        this.sancionService.obtenerEstadisticasSanciones().toPromise()
      ]);
      this.sanciones = todas || [];
      this.sancionesPendientes = pendientes || [];
      this.stats = stats || null;
    } catch (error: any) {
      console.error('Error cargando datos de sanciones:', error);
      this.error = error.message || 'Error al cargar sanciones';
      await this.mostrarToast('Error al cargar sanciones', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  get sancionesFiltradas(): Sancion[] {
    let res = this.sanciones;
    if (this.filtroEstado) {
      res = res.filter(s => s.estado === this.filtroEstado);
    }
    if (this.filtroTipo) {
      res = res.filter(s => s.tipo === this.filtroTipo);
    }
    return res;
  }

  async crearSancion() {
    // Navegar a la nueva página profesional de creación de sanciones
    this.router.navigate(['/admin-sanciones/crear']);
  }

  async pagarMulta(sancion: Sancion) {
    if (sancion.tipo !== 'Multa' || sancion.estado !== 'Activa') {
      await this.mostrarToast('Esta sanción no se puede pagar', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Pago',
      message: `¿Pagar multa de $${sancion.monto?.toLocaleString()}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Pagar', handler: () => this.procesarPagoMulta(sancion) }
      ]
    });
    await alert.present();
  }

  private async procesarPagoMulta(sancion: Sancion) {
    const loading = await this.loadingController.create({ message: 'Procesando pago...' });
    await loading.present();
    try {
      await this.sancionService.pagarMulta(sancion.id).toPromise();
      await this.mostrarToast('Multa pagada', 'success');
      await this.cargarDatos();
    } catch (error: any) {
      console.error('Error pagando multa:', error);
      await this.mostrarToast(error.message || 'Error al procesar pago', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async aprobarSancion(sancion: Sancion) {
    const loading = await this.loadingController.create({ message: 'Aprobando sanción...' });
    await loading.present();
    try {
      await this.sancionService.aprobarSancion(sancion.id).toPromise();
      await this.mostrarToast('Sanción aprobada', 'success');
      await this.cargarDatos();
    } catch (error: any) {
      console.error('Error aprobando sanción:', error);
      await this.mostrarToast(error.message || 'Error al aprobar sanción', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async rechazarSancion(sancion: Sancion) {
    const alert = await this.alertController.create({
      header: 'Rechazar Sanción',
      message: '¿Estás seguro de rechazar esta sanción?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Rechazar', handler: async () => {
          const loading = await this.loadingController.create({ message: 'Rechazando sanción...' });
          await loading.present();
          try {
            await this.sancionService.rechazarSancion(sancion.id).toPromise();
            await this.mostrarToast('Sanción rechazada', 'success');
            await this.cargarDatos();
          } catch (error: any) {
            console.error('Error rechazando sanción:', error);
            await this.mostrarToast(error.message || 'Error al rechazar sanción', 'danger');
          } finally {
            await loading.dismiss();
          }
        }}
      ]
    });
    await alert.present();
  }

  async verDetallesSancion(sancion: Sancion) {
    const alert = await this.alertController.create({
      header: 'Detalles de la Sanción',
      message: `
        <strong>Usuario:</strong> ${sancion.usuario?.nombre || ''} ${sancion.usuario?.apellido || ''}<br>
        <strong>Tipo:</strong> ${sancion.tipo}<br>
        <strong>Estado:</strong> ${sancion.estado}<br>
        <strong>Descripción:</strong> ${sancion.descripcion}<br>
        ${sancion.monto ? `<strong>Monto:</strong> $${sancion.monto.toLocaleString()}<br>` : ''}
        ${sancion.dias_suspension ? `<strong>Días de suspensión:</strong> ${sancion.dias_suspension}<br>` : ''}
        <strong>Fecha inicio:</strong> ${this.formatearFecha(sancion.fecha_inicio)}<br>
        ${sancion.fecha_fin ? `<strong>Fecha fin:</strong> ${this.formatearFecha(sancion.fecha_fin)}<br>` : ''}
        ${sancion.prestamo ? `<strong>Préstamo:</strong> ${sancion.prestamo.libro?.titulo || 'N/A'}` : ''}
      `,
      buttons: ['Cerrar']
    });
    await alert.present();
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Activa': return 'danger';
      case 'Pagada': return 'success';
      case 'Completada': return 'medium';
      default: return 'medium';
    }
  }

  getTipoColor(tipo: string): string {
    switch (tipo) {
      case 'Multa': return 'secondary';
      case 'Suspensión': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Contar sanciones por estado (resumen)
   */
  contarPorEstado(estado: 'Activa' | 'Pagada' | 'Completada'): number {
    return (this.sanciones || []).filter(s => s.estado === estado).length;
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
      position: 'bottom'
    });
    await toast.present();
  }
}
