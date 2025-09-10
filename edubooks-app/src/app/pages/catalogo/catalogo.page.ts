import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';
import { Libro } from '../../core/models/libro.model';
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
  librosFiltrados: Libro[] = [];
  categorias: string[] = [];
  searchQuery: string = '';
  categoriaSeleccionada: string = 'Todas';
  estadoSeleccionado: string = 'Todos';
  isLoading: boolean = false;
  
  private searchSubject = new Subject<string>();

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    // Configurar búsqueda con debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.buscarLibros(query);
    });
  }

  ngOnInit() {
    this.cargarDatos();
  }

  ionViewWillEnter() {
    // Recargar datos cuando se vuelve a la página
    this.cargarDatos();
  }

  async cargarDatos() {
    this.isLoading = true;
    
    try {
      // Cargar libros
      this.bibliotecaService.getLibros().subscribe({
        next: (libros) => {
          this.libros = libros;
          this.librosFiltrados = libros;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando libros:', error);
          this.isLoading = false;
        }
      });

      // Cargar categorías
      this.bibliotecaService.getCategorias().subscribe({
        next: (categorias) => {
          this.categorias = ['Todas', ...categorias];
        }
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.isLoading = false;
    }
  }

  onSearchInput(event: any) {
    const query = event.target.value;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  buscarLibros(query: string) {
    if (!query || query.trim() === '') {
      this.aplicarFiltros();
      return;
    }

    this.bibliotecaService.searchLibros(query).subscribe({
      next: (resultados) => {
        this.librosFiltrados = resultados;
      },
      error: (error) => {
        console.error('Error en búsqueda:', error);
      }
    });
  }

  onCategoriaChange(event: any) {
    this.categoriaSeleccionada = event.detail.value;
    this.aplicarFiltros();
  }

  onEstadoChange(event: any) {
    this.estadoSeleccionado = event.detail.value;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let librosFiltrados = [...this.libros];

    // Filtrar por categoría
    if (this.categoriaSeleccionada && this.categoriaSeleccionada !== 'Todas') {
      librosFiltrados = librosFiltrados.filter(libro => 
        libro.categoria === this.categoriaSeleccionada
      );
    }

    // Filtrar por estado
    if (this.estadoSeleccionado && this.estadoSeleccionado !== 'Todos') {
      if (this.estadoSeleccionado === 'Disponible') {
        librosFiltrados = librosFiltrados.filter(libro => 
          libro.cantidad_disponible > 0
        );
      } else {
        librosFiltrados = librosFiltrados.filter(libro => 
          libro.estado === this.estadoSeleccionado
        );
      }
    }

    this.librosFiltrados = librosFiltrados;
  }

  limpiarFiltros() {
    this.searchQuery = '';
    this.categoriaSeleccionada = 'Todas';
    this.estadoSeleccionado = 'Todos';
    this.librosFiltrados = [...this.libros];
  }

  filtrarPorCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
    this.aplicarFiltros();
  }

  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'Todas': '📚',
      'Literatura': '📖',
      'Programación': '💻',
      'Matemáticas': '📊',
      'Ciencias': '🔬',
      'Ingeniería': '⚙️',
      'Negocios': '💼'
    };
    return iconos[categoria] || '📚';
  }

  async prestarLibro(libro: Libro) {
    const loading = await this.loadingController.create({
      message: 'Procesando préstamo...',
    });
    await loading.present();

    this.bibliotecaService.prestarLibro(libro.id).subscribe({
      next: async (response) => {
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: `¡Préstamo exitoso! Tienes 15 días para devolver "${libro.titulo}".`,
          duration: 4000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        // Actualizar la lista
        this.cargarDatos();
      },
      error: async (error) => {
        await loading.dismiss();
        
        const alert = await this.alertController.create({
          header: 'Error en Préstamo',
          message: error.message || 'No se pudo procesar el préstamo.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  async reservarLibro(libro: Libro) {
    const loading = await this.loadingController.create({
      message: 'Procesando reserva...',
    });
    await loading.present();

    this.bibliotecaService.reservarLibro(libro.id).subscribe({
      next: async (response) => {
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: `¡Reserva exitosa! Te notificaremos cuando "${libro.titulo}" esté disponible.`,
          duration: 4000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        // Actualizar la lista
        this.cargarDatos();
      },
      error: async (error) => {
        await loading.dismiss();
        
        const alert = await this.alertController.create({
          header: 'Error en Reserva',
          message: error.message || 'No se pudo procesar la reserva.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  verDetalle(libro: Libro) {
    this.router.navigate(['/detalle-libro'], {
      queryParams: { id: libro.id }
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'Prestado': return 'danger';
      case 'Reservado': return 'warning';
      case 'Mantenimiento': return 'medium';
      default: return 'medium';
    }
  }

  puedePrestar(libro: Libro): boolean {
    return libro.cantidad_disponible > 0;
  }

  puedeReservar(libro: Libro): boolean {
    return libro.cantidad_disponible === 0 && libro.estado !== 'Mantenimiento';
  }
}