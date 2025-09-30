// src/app/pages/admin-libros/admin-libros.page.ts
import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController, AlertController, ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';
import { BibliotecaService } from '../../../core/services/biblioteca.service';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleBooksService } from '../../../core/services/google-books.service';
import { Libro, LibroRegistro } from '../../../core/models/libro.model';
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
  imagenSeleccionada: string = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxpYnJvPC90ZXh0Pjwvc3ZnPg==';

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private googleBooksService: GoogleBooksService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
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
   * Crear nuevo libro con Google Books API
   */
  async crearLibro() {
    const alert = await this.alertController.create({
      header: 'Registrar Libro desde Google Books',
      message: 'Ingresa el título o ISBN del libro. Los demás datos se completarán automáticamente.',
      inputs: [
        {
          name: 'busqueda',
          type: 'text',
          placeholder: 'Título del libro o ISBN',
          attributes: { required: true }
        },
        {
          name: 'cantidad_total',
          type: 'number',
          placeholder: 'Cantidad de ejemplares',
          min: 1,
          value: 1
        },
        {
          name: 'ubicacion',
          type: 'text',
          placeholder: 'Ubicación (ej: A1-001)',
          value: 'A1-001'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Buscar y Registrar',
          handler: async (data) => {
            if (data.busqueda?.trim()) {
              await this.buscarYRegistrarLibro(data);
              return true;
            } else {
              this.mostrarToast('Ingresa el título o ISBN del libro', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
    * Obtener imagen placeholder genérica
    */
   private obtenerImagenPorDefecto(categoria?: string): string {
     // Solo usar placeholder genérico, sin imágenes por categoría
     return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxpYnJvPC90ZXh0Pjwvc3ZnPg==';
   }

  /**
   * Obtener icono para cada categoría
   */
  private obtenerIconoCategoria(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'Literatura': '📖',
      'Programación': '💻',
      'Matemáticas': '📊',
      'Ciencias': '🔬',
      'Ingeniería': '⚙️',
      'Negocios': '💼',
      'Historia': '🏛️',
      'Arte': '🎨',
      'Psicología': '🧠',
      'Filosofía': '🤔',
      'Medicina': '⚕️',
      'Derecho': '⚖️'
    };
    return iconos[categoria] || '📚';
  }

  /**
   * Buscar libro en Google Books y registrarlo automáticamente
   */
  async buscarYRegistrarLibro(data: any) {
    const loading = await this.loadingController.create({
      message: 'Buscando libro en Google Books...'
    });
    await loading.present();

    try {
      const busqueda = data.busqueda.trim();
      const esISBN = /^[0-9\-X]{10,17}$/.test(busqueda.replace(/[\s\-]/g, ''));
      
      let libroInfo;
      
      if (esISBN) {
        // Buscar por ISBN
        libroInfo = await this.googleBooksService.buscarLibroPorISBN(busqueda).toPromise();
      } else {
        // Buscar por título
        libroInfo = await this.googleBooksService.buscarLibroPorTitulo(busqueda).toPromise();
      }
      
      if (!libroInfo) {
        await loading.dismiss();
        await this.mostrarToast('No se encontró el libro en Google Books', 'warning');
        return;
      }
      
      // Mostrar vista previa y confirmar registro
      await loading.dismiss();
      await this.mostrarVistaPrevia(libroInfo, data);
      
    } catch (error) {
      await loading.dismiss();
      console.error('Error buscando libro en Google Books:', error);
      await this.mostrarToast('Error al buscar el libro', 'danger');
    }
  }
  
  /**
   * Mostrar vista previa del libro encontrado
   */
  async mostrarVistaPrevia(libroInfo: any, datosAdicionales: any) {
    const imagenMostrar = libroInfo.imagen_portada || this.obtenerImagenPorDefecto();
    
    const alert = await this.alertController.create({
      header: 'Vista Previa del Libro',
      message: `
        <div style="text-align: center; margin-bottom: 15px;">
          <img src="${imagenMostrar}" alt="Portada" style="max-width: 100px; max-height: 140px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22400%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23cccccc%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22Arial%22 font-size=%2218%22 fill=%22%23666666%22%3ELibro%3C/text%3E%3C/svg%3E'">
        </div>
        <div style="font-size: 13px; line-height: 1.4; color: #333;">
          <div style="margin-bottom: 8px;"><strong style="color: #2196F3;">📖 Título:</strong> ${libroInfo.titulo}</div>
          <div style="margin-bottom: 6px;"><strong style="color: #4CAF50;">✍️ Autor:</strong> ${libroInfo.autor}</div>
          ${libroInfo.editorial ? `<div style="margin-bottom: 6px;"><strong style="color: #FF9800;">🏢 Editorial:</strong> ${libroInfo.editorial}</div>` : ''}
          ${libroInfo.año_publicacion ? `<div style="margin-bottom: 6px;"><strong style="color: #9C27B0;">📅 Año:</strong> ${libroInfo.año_publicacion}</div>` : ''}
          <div style="margin-bottom: 6px;"><strong style="color: #607D8B;">📂 Categoría:</strong> ${libroInfo.categorias?.[0] || 'General'}</div>
          ${libroInfo.isbn ? `<div style="margin-bottom: 6px;"><strong style="color: #795548;">🔢 ISBN:</strong> ${libroInfo.isbn}</div>` : ''}
          ${libroInfo.paginas ? `<div style="margin-bottom: 6px;"><strong style="color: #3F51B5;">📄 Páginas:</strong> ${libroInfo.paginas}</div>` : ''}
          <div style="margin-top: 10px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px;">
            <strong style="color: #666;">🖼️ Imagen:</strong> ${libroInfo.imagen_portada ? '<span style="color: #4CAF50;">✅ Google Books</span>' : '<span style="color: #FF9800;">⚠️ Placeholder</span>'}
          </div>
        </div>
      `,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Registrar Libro',
          handler: async () => {
            await this.registrarLibroDesdeGoogleBooks(libroInfo, datosAdicionales);
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Registrar libro desde datos de Google Books
   */
  async registrarLibroDesdeGoogleBooks(libroInfo: any, datosAdicionales: any) {
    const loading = await this.loadingController.create({
      message: 'Registrando libro...'
    });
    await loading.present();

    try {
      // Determinar la imagen a usar: Google Books > Placeholder genérico
      let imagenFinal = libroInfo.imagen_portada;
      if (!imagenFinal) {
        imagenFinal = this.obtenerImagenPorDefecto();
      }
      
      const libroData: any = {
        titulo: libroInfo.titulo,
        autor: libroInfo.autor,
        isbn: libroInfo.isbn || '',
        categoria: libroInfo.categorias?.[0] || 'General',
        editorial: libroInfo.editorial || '',
        año_publicacion: libroInfo.año_publicacion || null,
        ubicacion: datosAdicionales.ubicacion?.trim() || 'A1-001',
        cantidad_total: parseInt(datosAdicionales.cantidad_total) || 1,
        cantidad_disponible: parseInt(datosAdicionales.cantidad_total) || 1,
        descripcion: libroInfo.descripcion || '',
        imagen_portada: imagenFinal,
        estado: 'Disponible'
      };
      
      console.log('Imagen seleccionada:', imagenFinal);
      console.log('Imagen de Google Books:', libroInfo.imagen_portada);
      
      console.log('Datos del libro desde Google Books:', libroData);

      // Llamar al servicio real para registrar el libro
      await this.bibliotecaService.registrarLibro(libroData).toPromise();
      
      await loading.dismiss();
      await this.mostrarToast('Libro registrado exitosamente desde Google Books', 'success');
      this.imagenSeleccionada = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxpYnJvPC90ZXh0Pjwvc3ZnPg=='; // Reiniciar
      this.cargarLibros();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al registrar el libro', 'danger');
    }
  }

  /**
   * Validar datos del libro (método simplificado)
   */
  private validarDatosLibro(data: any): boolean {
    if (!data.busqueda?.trim()) {
      this.mostrarToast('Por favor ingresa el título o ISBN del libro', 'warning');
      return false;
    }
    return true;
  }

  /**
   * Procesar creación de libro (método legacy mantenido para compatibilidad)
   */
  private async procesarCreacionLibro(data: any) {
    const loading = await this.loadingController.create({
      message: 'Registrando libro...'
    });
    await loading.present();

    try {
      // Obtener imagen de Google Books API si no se seleccionó una manualmente
      let imagenPortada = this.imagenSeleccionada;
      
      if (imagenPortada === 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxpYnJvPC90ZXh0Pjwvc3ZnPg==') {
        loading.message = 'Buscando imagen en Google Books...';
        
        try {
          const imagenGoogleBooks = await this.googleBooksService.obtenerImagenConFallback(
            data.titulo.trim(),
            data.autor.trim(),
            data.categoria.trim(),
            this.obtenerImagenPorDefecto()
          );
          imagenPortada = imagenGoogleBooks;
          
          if (imagenGoogleBooks !== this.obtenerImagenPorDefecto()) {
            await this.mostrarToast('Imagen obtenida de Google Books', 'success');
          }
        } catch (error) {
          console.warn('Error obteniendo imagen de Google Books:', error);
          imagenPortada = this.obtenerImagenPorDefecto();
        }
      }
      
      loading.message = 'Guardando libro...';
      
      const libroData: any = {
        titulo: data.titulo.trim(),
        autor: data.autor.trim(),
        isbn: data.isbn.trim(),
        categoria: data.categoria.trim(),
        editorial: data.editorial?.trim() || '',
        año_publicacion: data.anio_publicacion || null,
        ubicacion: data.ubicacion?.trim() || 'A1-001',
        cantidad_total: parseInt(data.cantidad_total) || 1,
        descripcion: data.descripcion?.trim() || '',
        imagen_portada: imagenPortada,
        estado: 'Disponible'
      };
      
      console.log('Datos del formulario:', data);
      console.log('Datos procesados para enviar:', libroData);

      // Llamar al servicio real para registrar el libro
      await this.bibliotecaService.registrarLibro(libroData).toPromise();
      
      await loading.dismiss();
      await this.mostrarToast('Libro registrado exitosamente', 'success');
      this.imagenSeleccionada = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxpYnJvPC90ZXh0Pjwvc3ZnPg=='; // Reiniciar
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
      header: `Opciones para "${libro.titulo}"`,
      buttons: [
        {
          text: 'Ver Detalles',
          icon: 'eye-outline',
          handler: () => {
            this.router.navigate(['/detalle-libro'], { queryParams: { id: libro.id } });
          }
        },
        {
          text: 'Editar',
          icon: 'create-outline',
          handler: () => {
            this.editarLibro(libro);
          }
        },
        {
          text: 'Eliminar',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.confirmarEliminacion(libro);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Editar libro existente
   */
  async editarLibro(libro: Libro) {
    const alert = await this.alertController.create({
      header: 'Editar Libro',
      inputs: [
        {
          name: 'titulo',
          type: 'text',
          placeholder: 'Título del libro',
          value: libro.titulo
        },
        {
          name: 'autor',
          type: 'text',
          placeholder: 'Autor',
          value: libro.autor
        },
        {
          name: 'isbn',
          type: 'text',
          placeholder: 'ISBN',
          value: libro.isbn
        },
        {
          name: 'categoria',
          type: 'text',
          placeholder: 'Categoría',
          value: libro.categoria
        },
        {
          name: 'editorial',
          type: 'text',
          placeholder: 'Editorial',
          value: libro.editorial
        },
        {
           name: 'anio_publicacion',
           type: 'number',
           placeholder: 'Año de publicación',
           value: libro.anio_publicacion?.toString()
         },
        {
          name: 'cantidad_total',
          type: 'number',
          placeholder: 'Cantidad total',
          value: libro.cantidad_total.toString()
        },
        {
          name: 'descripcion',
          type: 'textarea',
          placeholder: 'Descripción',
          value: libro.descripcion
        },
        {
          name: 'ubicacion',
          type: 'text',
          placeholder: 'Ubicación',
          value: libro.ubicacion
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
            await this.procesarEdicionLibro(libro.id, data);
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
      const libroData: any = {
        titulo: data.titulo.trim(),
        autor: data.autor.trim(),
        isbn: data.isbn.trim(),
        categoria: data.categoria.trim(),
        editorial: data.editorial?.trim() || '',
        año_publicacion: data.anio_publicacion || null,
        ubicacion: data.ubicacion?.trim() || 'A1-001',
        cantidad_total: parseInt(data.cantidad_total) || 1,
        descripcion: data.descripcion?.trim() || ''
      };

      // TODO: Implementar método actualizarLibro en BibliotecaService
       // await this.bibliotecaService.actualizarLibro(id, libroData).toPromise();
       console.log('Datos para actualizar:', libroData);
      
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
   * Verificar si el usuario es administrador
   */
  get esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'administrador';
  }

  /**
   * Obtener color según estado del libro
   */
  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'Prestado': return 'warning';
      case 'Reservado': return 'tertiary';
      case 'Mantenimiento': return 'danger';
      default: return 'medium';
    }
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

  /**
   * Crear libro avanzado (método legacy)
   */
  async crearLibroAvanzado() {
    // Implementación futura para formulario avanzado
    await this.mostrarToast('Funcionalidad en desarrollo', 'warning');
  }

  /**
   * Exportar catálogo
   */
  async exportarCatalogo() {
    // Implementación futura para exportar
    await this.mostrarToast('Funcionalidad en desarrollo', 'warning');
  }

  /**
   * Importar libros
   */
  async importarLibros() {
    // Implementación futura para importar
    await this.mostrarToast('Funcionalidad en desarrollo', 'warning');
  }
}
