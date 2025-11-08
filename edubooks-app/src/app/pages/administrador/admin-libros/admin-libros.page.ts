// src/app/pages/admin-libros/admin-libros.page.ts
import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { BibliotecaService } from '../../../core/services/biblioteca.service';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleBooksService } from '../../../core/services/google-books.service';
import { Libro } from '../../../core/models/libro.model';
@Component({
  selector: 'app-admin-libros',
  templateUrl: './admin-libros.page.html',
  styleUrls: ['./admin-libros.page.scss'],
  standalone: false
})
export class AdminLibrosPage implements OnInit {
  libros: Libro[] = [];
  categorias: string[] = [];
  isLoading = true;
  error: string = '';
  usuarioActual: any = null;
  searchTerm: string = '';
  selectedCategory: string = '';
  currentPage = 1;
  totalPages = 1;
  hasMoreData = true;

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private googleBooksService: GoogleBooksService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    public router: Router
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    if (this.usuarioActual) {
      this.cargarDatos();
    } else {
      this.error = 'Usuario no autenticado';
      this.isLoading = false;
    }
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatos() {
    await Promise.all([this.cargarLibros(), this.cargarCategorias()]);
  }

  /**
   * Cargar libros desde el servicio
   */
  async cargarLibros(loadMore: boolean = false) {
    if (!loadMore) {
      this.isLoading = true;
      this.currentPage = 1;
    }

    try {
       // Usar getLibros y aplicar filtros localmente
       const response = await this.bibliotecaService.getLibros().toPromise();
       let filteredBooks = response || [];
       
       // Aplicar filtros localmente
       if (this.searchTerm) {
         filteredBooks = filteredBooks.filter((libro: any) => 
           libro.titulo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
           libro.autor.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
           libro.isbn.includes(this.searchTerm)
         );
       }
       
       if (this.selectedCategory) {
         filteredBooks = filteredBooks.filter((libro: any) => libro.categoria === this.selectedCategory);
       }
       
       if (loadMore) {
         this.libros = [...this.libros, ...filteredBooks];
       } else {
         this.libros = filteredBooks;
       }
       
       this.totalPages = Math.ceil(filteredBooks.length / 10);
       this.hasMoreData = this.currentPage < this.totalPages;
      
    } catch (error: any) {
      console.error('Error cargando libros:', error);
      if (!loadMore) {
        // En caso de error, cargar libros locales como fallback
        try {
          const librosLocales = await this.bibliotecaService.getLibros().toPromise();
          this.libros = librosLocales || [];
        } catch (localError) {
          this.error = 'Error al cargar los libros';
          this.libros = [];
        }
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
    * Cargar categorías disponibles
    */
   async cargarCategorias() {
     try {
       const categorias = await this.bibliotecaService.getCategorias().toPromise();
       this.categorias = categorias || [];
     } catch (error) {
       console.error('Error cargando categorías:', error);
       this.categorias = [];
     }
   }

  /**
   * Buscar libros
   */
  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.cargarLibros();
  }

  /**
   * Filtrar por categoría
   */
  onCategoryChange(event: any) {
    this.selectedCategory = event.detail.value;
    this.cargarLibros();
  }

  /**
   * Cargar más libros (infinite scroll)
   */
  async loadMoreData(event: any) {
    if (this.hasMoreData) {
      this.currentPage++;
      await this.cargarLibros(true);
    }
    event.target.complete();
  }

  /**
   * Crear nuevo libro (abre modal con formulario)
   */
  async crearLibro() {
    const { LibroFormModalComponent } = await import('./libro-form/libro-form.modal');
    const modal = await this.modalController.create({
      component: LibroFormModalComponent
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      // Si el modal confirma, refrescar el listado
      await this.cargarLibros();
    }
  }

  /**
    * Obtener imagen placeholder genérica
    */
   private obtenerImagenPorDefecto(categoria?: string): string {
     // Solo usar placeholder genérico, sin imágenes por categoría
     return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxpYnJvPC90ZXh0Pjwvc3ZnPg==';
   }


  // La lógica de búsqueda, preview y registro ahora vive en LibroFormModalComponent

  /**
   * Editar libro existente (solo cantidad_total)
   */
  async editarLibro(libro: Libro) {
    const alert = await this.alertController.create({
      header: 'Actualizar cantidad de ejemplares',
      inputs: [
        {
          name: 'cantidad_total',
          type: 'number',
          placeholder: 'Cantidad total',
          value: String((libro.cantidad_total ?? libro.cantidad_disponible ?? 1)),
          min: 1
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            const nuevaCantidad = parseInt(data.cantidad_total, 10);
            if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
              await this.mostrarToast('Cantidad inválida. Debe ser un número mayor a 0.', 'warning');
              return false;
            }
            await this.actualizarCantidadLibro(libro.id, nuevaCantidad);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Actualizar cantidad_total de un libro y refrescar listado
   */
  private async actualizarCantidadLibro(id: number, cantidad_total: number) {
    const loading = await this.loadingController.create({
      message: 'Actualizando cantidad...'
    });
    await loading.present();

    try {
      await this.bibliotecaService.actualizarLibro(id, { cantidad_total }).toPromise();
      await loading.dismiss();
      await this.mostrarToast('Cantidad actualizada exitosamente', 'success');
      this.cargarLibros();
    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al actualizar la cantidad', 'danger');
    }
  }

  /**
   * Confirmar eliminación de libro
   */
  async confirmarEliminacion(libro: Libro) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar el libro "${libro.titulo}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.eliminarLibro(libro.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Eliminar libro
   */
  private async eliminarLibro(id: number) {
    const loading = await this.loadingController.create({
      message: 'Eliminando libro...'
    });
    await loading.present();

    try {
      await this.bibliotecaService.eliminarLibro(id).toPromise();
      
      await loading.dismiss();
      await this.mostrarToast('Libro eliminado exitosamente', 'success');
      this.cargarLibros();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al eliminar el libro', 'danger');
    }
  }

  /**
   * Refrescar datos
   */
  async doRefresh(event: any) {
    await this.cargarDatos();
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
   * Obtener número de libros disponibles
   */
  getLibrosDisponibles(): number {
    return this.libros.filter(libro => libro.estado === 'Disponible').length;
  }

  /**
   * Obtener número de libros prestados
   */
  getLibrosPrestados(): number {
    return this.libros.filter(libro => libro.estado === 'Prestado').length;
  }

}
