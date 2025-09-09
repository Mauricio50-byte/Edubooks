// src/app/pages/catalogo/catalogo.page.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController, LoadingController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';
import { Libro, BusquedaLibros } from '../../core/models/libro.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.page.html',
  styleUrls: ['./catalogo.page.scss'],
  standalone: false,
})
export class CatalogoPage implements OnInit {
  libros: Libro[] = [];
  categorias: string[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  isLoadingMore: boolean = false;
  hasMorePages: boolean = false;
  
  filtros: BusquedaLibros = {
    page: 1,
    page_size: 20
  };

  private searchSubject = new Subject<string>();

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    // Configurar búsqueda con debounce
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(query => {
      this.filtros.query = query;
      this.buscarLibros(true);
    });
  }

  ngOnInit() {
    this.cargarCategorias();
    this.buscarLibros(true);
  }

  ionViewWillEnter() {
    // Recargar datos cuando se vuelve a la página
    this.buscarLibros(true);
  }

  /**
   * Cargar categorías disponibles
   */
  async cargarCategorias() {
    try {
      const response = await this.bibliotecaService.obtenerCategorias().toPromise();
      if (response?.data) {
        this.categorias = response.data;
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }

  /**
   * Buscar libros con filtros actuales
   */
  async buscarLibros(reset: boolean = false) {
    if (reset) {
      this.filtros.page = 1;
      this.libros = [];
    }

    this.isLoading = reset;
    this.isLoadingMore = !reset;

    try {
      const response = await this.bibliotecaService.buscarLibros(this.filtros).toPromise();
      
      if (response) {
        if (reset) {
          this.libros = response.results;
        } else {
          this.libros = [...this.libros, ...response.results];
        }
        
        this.hasMorePages = !!response.next;
      }
    } catch (error) {
      console.error('Error buscando libros:', error);
      const toast = await this.toastController.create({
        message: 'Error al cargar los libros. Intenta nuevamente.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
      this.isLoadingMore = false;
    }
  }

  /**
   * Manejar input de búsqueda
   */
  onSearchInput(event: any) {
    const query = event.target.value?.trim() || '';
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  /**
   * Limpiar búsqueda
   */
  limpiarBusqueda() {
    this.searchQuery = '';
    this.filtros.query = '';
    this.filtros.categoria = '';
    this.buscarLibros(true);
  }

  /**
   * Toggle categoría
   */
  toggleCategoria(categoria: string) {
    if (this.filtros.categoria === categoria) {
      this.filtros.categoria = '';
    } else {
      this.filtros.categoria = categoria;
    }
    this.buscarLibros(true);
  }

  /**
   * Cargar más libros (paginación)
   */
  cargarMasLibros() {
    if (this.hasMorePages && !this.isLoadingMore) {
      this.filtros.page = (this.filtros.page || 1) + 1;
      this.buscarLibros(false);
    }
  }

  /**
   * Ver detalle de un libro
   */
  verDetalleLibro(libro: Libro, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/libro', libro.id]);
  }

  /**
   * Solicitar préstamo de un libro
   */
  async solicitarPrestamo(libro: Libro, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Confirmar Préstamo',
      message: `¿Deseas solicitar el préstamo de "${libro.titulo}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Solicitar',
          handler: async () => {
            await this.procesarSolicitudPrestamo(libro);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar solicitud de préstamo
   */
  private async procesarSolicitudPrestamo(libro: Libro) {
    const loading = await this.loadingController.create({
      message: 'Solicitando préstamo...'
    });
    await loading.present();

    try {
      const response = await this.bibliotecaService.solicitarPrestamo({ 
        libro_id: libro.id 
      }).toPromise();

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: `Préstamo solicitado exitosamente. ${response?.message || ''}`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Actualizar estado del libro
      this.buscarLibros(true);

    } catch (error: any) {
      await loading.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Error en Préstamo',
        message: error.message || 'No se pudo procesar la solicitud de préstamo.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  /**
   * Crear reserva de un libro
   */
  async crearReserva(libro: Libro, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Confirmar Reserva',
      message: `¿Deseas reservar "${libro.titulo}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Reservar',
          handler: async () => {
            await this.procesarReserva(libro);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar reserva
   */
  private async procesarReserva(libro: Libro) {
    const loading = await this.loadingController.create({
      message: 'Creando reserva...'
    });
    await loading.present();

    try {
      const response = await this.bibliotecaService.crearReserva({ 
        libro_id: libro.id 
      }).toPromise();

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: `Reserva creada exitosamente. ${response?.message || ''}`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Actualizar lista de libros
      this.buscarLibros(true);

    } catch (error: any) {
      await loading.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Error en Reserva',
        message: error.message || 'No se pudo crear la reserva.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  /**
   * Abrir modal de filtros
   */
  async presentFilterModal() {
    // TODO: Implementar modal de filtros avanzados
    const alert = await this.alertController.create({
      header: 'Filtros',
      message: 'Funcionalidad de filtros avanzados en desarrollo',
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Agregar nuevo libro (solo Administradores)
   */
  agregarLibro() {
    this.router.navigate(['/admin/libro/nuevo']);
  }

  /**
   * Obtener color según el estado del libro
   */
  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible':
        return 'success';
      case 'Prestado':
        return 'warning';
      case 'Reservado':
        return 'primary';
      case 'Mantenimiento':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Verificar si el usuario es administrador
   */
  isAdministrador(): boolean {
    return this.authService.isAdministrador();
  }
}