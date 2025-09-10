import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { Prestamo } from '../../core/models/libro.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-prestamos',
  templateUrl: './admin-prestamos.page.html',
  styleUrls: ['./admin-prestamos.page.scss'],
  standalone: false
})
export class AdminPrestamosPage implements OnInit {
  prestamos: Prestamo[] = [];
  isLoading = true;
  error: string = '';
  usuarioActual: any = null;
  searchTerm: string = '';
  filtroEstado: string = '';

  constructor(
    private authService: AuthService,
    private bibliotecaService: BibliotecaService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    
    // Verificar que el usuario sea administrador
    if (!this.esAdministrador) {
      this.router.navigate(['/home']);
      return;
    }
    
    this.cargarPrestamos();
  }

  /**
   * Cargar lista de préstamos
   */
  async cargarPrestamos() {
    this.isLoading = true;
    this.error = '';

    try {
      // Llamar al servicio real para obtener préstamos
      const prestamos = await this.bibliotecaService.getPrestamos().toPromise();
      this.prestamos = prestamos || [];
      
    } catch (error: any) {
      this.error = error.message || 'Error al cargar los préstamos';
      console.error('Error cargando préstamos:', error);
      
      // Fallback a datos simulados en caso de error
      this.prestamos = [
        {
          id: 1,
          usuario: {
            id: 1,
            nombre: 'Juan',
            apellido: 'Pérez',
            email: 'juan.perez@universidad.edu',
            rol: 'Estudiante'
          },
          libro: {
            id: 1,
            titulo: 'Introducción a la Programación',
            autor: 'John Smith',
            isbn: '978-1234567890',
            editorial: 'Editorial Tech',
            anio_publicacion: 2023,
            categoria: 'Programación',
            ubicacion: 'A1-001',
            estado: 'Prestado',
            cantidad_total: 5,
            cantidad_disponible: 4,
            descripcion: 'Libro básico de programación',
            imagen_portada: '',
            fecha_registro: '2024-01-01T00:00:00Z'
          },
          fecha_prestamo: '2024-01-15',
          fecha_devolucion_esperada: '2024-01-29',
          fecha_devolucion_real: undefined,
          estado: 'Activo',
          renovaciones: 0
        },
        {
          id: 2,
          usuario: {
            id: 2,
            nombre: 'María',
            apellido: 'García',
            email: 'maria.garcia@universidad.edu',
            rol: 'Estudiante'
          },
          libro: {
            id: 2,
            titulo: 'Algoritmos y Estructuras de Datos',
            autor: 'Jane Doe',
            isbn: '978-0987654321',
            editorial: 'Editorial Data',
            anio_publicacion: 2022,
            categoria: 'Algoritmos',
            ubicacion: 'B2-002',
            estado: 'Disponible',
            cantidad_total: 3,
            cantidad_disponible: 3,
            descripcion: 'Libro avanzado de algoritmos',
            imagen_portada: '',
            fecha_registro: '2024-01-01T00:00:00Z'
          },
          fecha_prestamo: '2024-01-10',
          fecha_devolucion_esperada: '2024-01-24',
          fecha_devolucion_real: '2024-01-23',
          estado: 'Devuelto',
          renovaciones: 1
        },
        {
          id: 3,
          usuario: {
            id: 3,
            nombre: 'Carlos',
            apellido: 'López',
            email: 'carlos.lopez@universidad.edu',
            rol: 'Docente'
          },
          libro: {
            id: 3,
            titulo: 'Base de Datos Avanzadas',
            autor: 'Bob Wilson',
            isbn: '978-1122334455',
            editorial: 'Editorial DB',
            anio_publicacion: 2021,
            categoria: 'Base de Datos',
            ubicacion: 'C3-003',
            estado: 'Prestado',
            cantidad_total: 2,
            cantidad_disponible: 1,
            descripcion: 'Libro especializado en bases de datos',
            imagen_portada: '',
            fecha_registro: '2024-01-01T00:00:00Z'
          },
          fecha_prestamo: '2024-01-05',
          fecha_devolucion_esperada: '2024-01-19',
          fecha_devolucion_real: undefined,
          estado: 'Vencido',
          renovaciones: 2
        }
      ];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Filtrar préstamos
   */
  get prestamosFiltrados(): Prestamo[] {
    if (!this.prestamos || !Array.isArray(this.prestamos)) {
      return [];
    }
    
    return this.prestamos.filter(prestamo => {
      const cumpleBusqueda = !this.searchTerm || 
        prestamo.usuario.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prestamo.usuario.apellido.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prestamo.libro.titulo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prestamo.libro.autor.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const cumpleEstado = !this.filtroEstado || prestamo.estado === this.filtroEstado;
      
      return cumpleBusqueda && cumpleEstado;
    });
  }

  /**
   * Contar préstamos por estado
   */
  contarPrestamosPorEstado(estado: 'Activo' | 'Devuelto' | 'Vencido'): number {
    if (!this.prestamos || !Array.isArray(this.prestamos)) {
      return 0;
    }
    return this.prestamos.filter(p => p && p.estado === estado).length;
  }

  /**
   * Marcar como devuelto
   */
  async marcarComoDevuelto(prestamo: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Devolución',
      message: `¿Confirmas que ${prestamo.usuario.nombre} ${prestamo.usuario.apellido} ha devuelto "${prestamo.libro.titulo}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            await this.procesarDevolucion(prestamo);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar devolución
   */
  private async procesarDevolucion(prestamo: any) {
    const loading = await this.loadingController.create({
      message: 'Procesando devolución...'
    });
    await loading.present();

    try {
      // TODO: Implementar llamada al servicio
      // await this.prestamoService.marcarDevuelto(prestamo.id).toPromise();
      
      prestamo.estado = 'Devuelto';
      prestamo.fecha_devolucion_real = new Date().toISOString().split('T')[0];
      
      await loading.dismiss();
      await this.mostrarToast('Devolución registrada exitosamente', 'success');

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al procesar la devolución', 'danger');
    }
  }

  /**
   * Ver detalles del préstamo
   */
  async verDetallesPrestamo(prestamo: any) {
    const alert = await this.alertController.create({
      header: 'Detalles del Préstamo',
      message: `
        <strong>Usuario:</strong> ${prestamo.usuario.nombre} ${prestamo.usuario.apellido}<br>
        <strong>Email:</strong> ${prestamo.usuario.email}<br><br>
        <strong>Libro:</strong> ${prestamo.libro.titulo}<br>
        <strong>Autor:</strong> ${prestamo.libro.autor}<br>
        <strong>ISBN:</strong> ${prestamo.libro.isbn}<br><br>
        <strong>Fecha de préstamo:</strong> ${this.formatearFecha(prestamo.fecha_prestamo)}<br>
        <strong>Fecha de devolución esperada:</strong> ${this.formatearFecha(prestamo.fecha_devolucion_esperada)}<br>
        ${prestamo.fecha_devolucion_real ? `<strong>Fecha de devolución real:</strong> ${this.formatearFecha(prestamo.fecha_devolucion_real)}<br>` : ''}
        <strong>Renovaciones:</strong> ${prestamo.renovaciones}/2<br>
        <strong>Estado:</strong> ${prestamo.estado}
      `,
      buttons: ['Cerrar']
    });

    await alert.present();
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Calcular días de retraso
   */
  getDiasRetraso(prestamo: any): number {
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
    await this.cargarPrestamos();
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
   * Verificar si el usuario es administrador
   */
  get esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'Administrador';
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
}
