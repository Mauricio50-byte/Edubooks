// src/app/pages/admin-libros/admin-libros.page.ts
import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController, ActionSheetController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';
import { Libro, LibroRegistro } from '../../core/models/libro.model';
import { Router } from '@angular/router';

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
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private router: Router
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    
    // Verificar que el usuario sea administrador
    if (!this.esAdministrador) {
      this.router.navigate(['/home']);
      return;
    }
    
    this.cargarDatos();
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatos() {
    await Promise.all([
      this.cargarLibros(),
      this.cargarCategorias()
    ]);
  }

  /**
   * Cargar libros con filtros
   */
  async cargarLibros(loadMore: boolean = false) {
    if (!loadMore) {
      this.isLoading = true;
      this.currentPage = 1;
      this.libros = [];
    }

    this.error = '';

    try {
      const filtros: any = {
        page: this.currentPage,
        page_size: 20
      };

      if (this.searchTerm.trim()) {
        filtros.query = this.searchTerm.trim();
      }

      if (this.selectedCategory) {
        filtros.categoria = this.selectedCategory;
      }

      // const response = await this.bibliotecaService.buscarLibros(filtros).toPromise(); // TODO: Implementar método
      const response = { results: [], count: 0 }; // Simulación temporal
      
      if (response?.results) {
        if (loadMore) {
          this.libros = [...this.libros, ...response.results];
        } else {
          this.libros = response.results;
        }
        
        this.totalPages = Math.ceil((response.count || 0) / 20);
        this.hasMoreData = this.currentPage < this.totalPages;
      }
    } catch (error: any) {
      this.error = error.message || 'Error al cargar los libros';
      console.error('Error cargando libros:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Cargar categorías disponibles
   */
  async cargarCategorias() {
    try {
      // const response = await this.bibliotecaService.obtenerCategorias().toPromise(); // TODO: Implementar método
      const response = { data: [] }; // Simulación temporal
      if (response?.data) {
        this.categorias = response.data;
      }
    } catch (error: any) {
      console.error('Error cargando categorías:', error);
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
   * Crear nuevo libro
   */
  async crearLibro() {
    const alert = await this.alertController.create({
      header: 'Registrar Nuevo Libro',
      inputs: [
        {
          name: 'titulo',
          type: 'text',
          placeholder: 'Título del libro',
          attributes: { required: true }
        },
        {
          name: 'autor',
          type: 'text',
          placeholder: 'Autor',
          attributes: { required: true }
        },
        {
          name: 'isbn',
          type: 'text',
          placeholder: 'ISBN',
          attributes: { required: true }
        },
        {
          name: 'categoria',
          type: 'text',
          placeholder: 'Categoría',
          attributes: { required: true }
        },
        {
          name: 'editorial',
          type: 'text',
          placeholder: 'Editorial'
        },
        {
          name: 'año_publicacion',
          type: 'number',
          placeholder: 'Año de publicación',
          min: 1900,
          max: new Date().getFullYear()
        },
        {
          name: 'cantidad_total',
          type: 'number',
          placeholder: 'Cantidad total',
          min: 1,
          value: 1
        },
        {
          name: 'descripcion',
          type: 'textarea',
          placeholder: 'Descripción (opcional)'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Registrar',
          handler: async (data) => {
            if (this.validarDatosLibro(data)) {
              await this.procesarCreacionLibro(data);
              return true;
            } else {
              this.mostrarToast('Por favor completa todos los campos requeridos', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Validar datos del libro
   */
  private validarDatosLibro(data: any): boolean {
    return data.titulo?.trim() && 
           data.autor?.trim() && 
           data.isbn?.trim() && 
           data.categoria?.trim() &&
           data.cantidad_total > 0;
  }

  /**
   * Procesar creación de libro
   */
  private async procesarCreacionLibro(data: any) {
    const loading = await this.loadingController.create({
      message: 'Registrando libro...'
    });
    await loading.present();

    try {
      const libroData: LibroRegistro = {
        titulo: data.titulo.trim(),
        autor: data.autor.trim(),
        isbn: data.isbn.trim(),
        categoria: data.categoria.trim(),
        editorial: data.editorial?.trim() || '',
        año_publicacion: data.año_publicacion || null,
        cantidad_total: parseInt(data.cantidad_total) || 1,
        descripcion: data.descripcion?.trim() || '',
        estado: 'Disponible'
      };

      // await this.bibliotecaService.registrarLibro(libroData).toPromise(); // TODO: Implementar método
      
      await loading.dismiss();
      await this.mostrarToast('Libro registrado exitosamente', 'success');
      this.cargarLibros();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al registrar el libro', 'danger');
    }
  }

  /**
   * Mostrar opciones para un libro
   */
  async mostrarOpcionesLibro(libro: Libro) {
    const actionSheet = await this.actionSheetController.create({
      header: libro.titulo,
      buttons: [
        {
          text: 'Editar',
          icon: 'create',
          handler: () => {
            this.editarLibro(libro);
          }
        },
        {
          text: 'Ver Detalles',
          icon: 'eye',
          handler: () => {
            this.router.navigate(['/detalle-libro', libro.id]);
          }
        },
        {
          text: 'Eliminar',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.confirmarEliminacion(libro);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Editar libro
   */
  async editarLibro(libro: Libro) {
    const alert = await this.alertController.create({
      header: 'Editar Libro',
      inputs: [
        {
          name: 'titulo',
          type: 'text',
          value: libro.titulo,
          placeholder: 'Título del libro'
        },
        {
          name: 'autor',
          type: 'text',
          value: libro.autor,
          placeholder: 'Autor'
        },
        {
          name: 'isbn',
          type: 'text',
          value: libro.isbn,
          placeholder: 'ISBN'
        },
        {
          name: 'categoria',
          type: 'text',
          value: libro.categoria,
          placeholder: 'Categoría'
        },
        {
          name: 'editorial',
          type: 'text',
          value: libro.editorial || '',
          placeholder: 'Editorial'
        },
        {
          name: 'año_publicacion',
          type: 'number',
          value: libro.año_publicacion,
          placeholder: 'Año de publicación'
        },
        {
          name: 'cantidad_total',
          type: 'number',
          value: libro.cantidad_total,
          placeholder: 'Cantidad total'
        },
        {
          name: 'descripcion',
          type: 'textarea',
          value: libro.descripcion || '',
          placeholder: 'Descripción'
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
            if (this.validarDatosLibro(data)) {
              await this.procesarEdicionLibro(libro.id, data);
              return true;
            } else {
              this.mostrarToast('Por favor completa todos los campos requeridos', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar edición de libro
   */
  private async procesarEdicionLibro(id: number, data: any) {
    const loading = await this.loadingController.create({
      message: 'Actualizando libro...'
    });
    await loading.present();

    try {
      const libroData = {
        titulo: data.titulo.trim(),
        autor: data.autor.trim(),
        isbn: data.isbn.trim(),
        categoria: data.categoria.trim(),
        editorial: data.editorial?.trim() || '',
        año_publicacion: data.año_publicacion || null,
        cantidad_total: parseInt(data.cantidad_total) || 1,
        descripcion: data.descripcion?.trim() || ''
      };

      // await this.bibliotecaService.actualizarLibro(id, libroData).toPromise(); // TODO: Implementar método
      
      await loading.dismiss();
      await this.mostrarToast('Libro actualizado exitosamente', 'success');
      this.cargarLibros();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al actualizar el libro', 'danger');
    }
  }

  /**
   * Confirmar eliminación de libro
   */
  async confirmarEliminacion(libro: Libro) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que deseas eliminar "${libro.titulo}"? Esta acción no se puede deshacer.`,
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
      // await this.bibliotecaService.eliminarLibro(id).toPromise(); // TODO: Implementar método
      
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
   * Verificar si el usuario es administrador
   */
  get esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'Administrador';
  }

  /**
   * Obtener color del estado del libro
   */
  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'No Disponible': return 'danger';
      case 'En Mantenimiento': return 'warning';
      default: return 'medium';
    }
  }
}
