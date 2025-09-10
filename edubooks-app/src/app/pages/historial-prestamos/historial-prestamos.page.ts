import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';
import { Prestamo } from '../../core/models/libro.model';

@Component({
  selector: 'app-historial-prestamos',
  templateUrl: './historial-prestamos.page.html',
  styleUrls: ['./historial-prestamos.page.scss'],
  standalone: false
})
export class HistorialPrestamosPage implements OnInit {
  prestamos: Prestamo[] = [];
  prestamosFiltrados: Prestamo[] = [];
  isLoading = true;
  error: string = '';
  usuarioActual: any = null;
  filtroEstado: string = '';
  terminoBusqueda: string = '';
  mostrarFiltros = false;

  // Estadísticas
  totalPrestamos = 0;
  prestamosActivos = 0;
  prestamosDevueltos = 0;
  prestamosVencidos = 0;

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    this.cargarHistorialPrestamos();
  }

  /**
   * Cargar historial de préstamos del usuario
   */
  async cargarHistorialPrestamos() {
    this.isLoading = true;
    this.error = '';

    try {
      const prestamos = await this.bibliotecaService.getPrestamosUsuario().toPromise();
      this.prestamos = prestamos || [];
      this.prestamosFiltrados = [...this.prestamos];
      this.calcularEstadisticas();
    } catch (error: any) {
      this.error = error.message || 'Error al cargar el historial de préstamos';
      console.error('Error cargando historial:', error);
      const toast = await this.toastController.create({
        message: 'Error al cargar el historial. Verifica tu conexión.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Calcular estadísticas del historial
   */
  calcularEstadisticas() {
    this.totalPrestamos = this.prestamos.length;
    this.prestamosActivos = this.prestamos.filter(p => p.estado === 'Activo').length;
    this.prestamosDevueltos = this.prestamos.filter(p => p.estado === 'Devuelto').length;
    this.prestamosVencidos = this.prestamos.filter(p => p.estado === 'Vencido').length;
  }

  /**
   * Aplicar filtros
   */
  aplicarFiltros() {
    this.prestamosFiltrados = this.prestamos.filter(prestamo => {
      // Filtro por estado
      const cumpleEstado = !this.filtroEstado || prestamo.estado === this.filtroEstado;
      
      // Filtro por búsqueda
      const cumpleBusqueda = !this.terminoBusqueda || 
        prestamo.libro.titulo.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        prestamo.libro.autor.toLowerCase().includes(this.terminoBusqueda.toLowerCase());
      
      return cumpleEstado && cumpleBusqueda;
    });
  }

  /**
   * Buscar préstamos
   */
  onSearchChange(event: any) {
    this.terminoBusqueda = event.detail.value;
    this.aplicarFiltros();
  }

  /**
   * Cambiar filtro de estado
   */
  onEstadoChange(event: any) {
    this.filtroEstado = event.detail.value;
    this.aplicarFiltros();
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros() {
    this.filtroEstado = '';
    this.terminoBusqueda = '';
    this.prestamosFiltrados = [...this.prestamos];
  }

  /**
   * Alternar visibilidad de filtros
   */
  toggleFiltros() {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  /**
   * Renovar préstamo
   */
  async renovarPrestamo(prestamo: Prestamo) {
    const alert = await this.alertController.create({
      header: 'Renovar Préstamo',
      message: `¿Deseas renovar el préstamo de "${prestamo.libro.titulo}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Renovar',
          handler: async () => {
            await this.procesarRenovacion(prestamo.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar renovación de préstamo
   */
  private async procesarRenovacion(prestamoId: number) {
    const loading = await this.loadingController.create({
      message: 'Renovando préstamo...'
    });
    await loading.present();

    try {
      // await this.bibliotecaService.renovarPrestamo(prestamoId).toPromise();
      
      await loading.dismiss();
      await this.mostrarToast('Préstamo renovado exitosamente', 'success');
      this.cargarHistorialPrestamos();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al renovar el préstamo', 'danger');
    }
  }

  /**
   * Ver detalles del préstamo
   */
  async verDetallesPrestamo(prestamo: Prestamo) {
    const alert = await this.alertController.create({
      header: prestamo.libro.titulo,
      message: `
        <strong>Autor:</strong> ${prestamo.libro.autor}<br>
        <strong>Estado:</strong> ${prestamo.estado}<br>
        <strong>Fecha de préstamo:</strong> ${this.formatearFecha(prestamo.fecha_prestamo)}<br>
        <strong>Fecha de devolución esperada:</strong> ${this.formatearFecha(prestamo.fecha_devolucion_esperada)}<br>
        ${prestamo.fecha_devolucion_real ? `<strong>Fecha de devolución real:</strong> ${this.formatearFecha(prestamo.fecha_devolucion_real)}<br>` : ''}
        ${prestamo.observaciones ? `<strong>Observaciones:</strong> ${prestamo.observaciones}` : ''}
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
   * Obtener color del estado
   */
  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Activo': return 'primary';
      case 'Devuelto': return 'success';
      case 'Vencido': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Verificar si un préstamo puede ser renovado
   */
  puedeRenovar(prestamo: Prestamo): boolean {
    return prestamo.estado === 'Activo' && (prestamo.renovaciones || 0) < 2;
  }

  /**
   * Calcular días de retraso
   */
  getDiasRetraso(prestamo: Prestamo): number {
    if (prestamo.estado !== 'Vencido') return 0;
    
    const fechaEsperada = new Date(prestamo.fecha_devolucion_esperada);
    const hoy = new Date();
    const diferencia = hoy.getTime() - fechaEsperada.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  /**
   * Refrescar datos
   */
  async doRefresh(event: any) {
    await this.cargarHistorialPrestamos();
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
}
