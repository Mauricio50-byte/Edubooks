import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';
import { Libro } from '../../core/models/libro.model';

@Component({
  selector: 'app-detalle-libro',
  templateUrl: './detalle-libro.page.html',
  styleUrls: ['./detalle-libro.page.scss'],
  standalone: false
})
export class DetalleLibroPage implements OnInit {
  libro: Libro | null = null;
  librosRelacionados: Libro[] = [];
  isLoading = true;
  error: string = '';
  libroId: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Obtener ID del libro desde query params
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.libroId = +params['id'];
        this.cargarLibro();
      } else {
        this.error = 'ID de libro no válido';
        this.isLoading = false;
      }
    });
  }

  async cargarLibro() {
    this.isLoading = true;
    this.error = '';

    try {
      this.bibliotecaService.getLibroById(this.libroId).subscribe({
        next: (libro) => {
          if (libro) {
            this.libro = libro;
            this.cargarLibrosRelacionados();
          } else {
            this.error = 'Libro no encontrado';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando libro:', error);
          this.error = 'Error al cargar el libro';
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error:', error);
      this.error = 'Error al cargar el libro';
      this.isLoading = false;
    }
  }

  cargarLibrosRelacionados() {
    if (!this.libro) return;

    // Buscar libros de la misma categoría
    this.bibliotecaService.filterLibrosByCategoria(this.libro.categoria).subscribe({
      next: (libros) => {
        this.librosRelacionados = libros
          .filter(l => l.id !== this.libro!.id)
          .slice(0, 4); // Mostrar máximo 4 libros relacionados
      },
      error: (error) => {
        console.error('Error cargando libros relacionados:', error);
      }
    });
  }

  async prestarLibro() {
    if (!this.libro) return;

    const loading = await this.loadingController.create({
      message: 'Procesando préstamo...',
    });
    await loading.present();

    this.bibliotecaService.prestarLibro(this.libro.id).subscribe({
      next: async (response) => {
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: `¡Préstamo exitoso! Tienes 15 días para devolver "${this.libro!.titulo}".`,
          duration: 4000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        // Actualizar información del libro
        this.cargarLibro();
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

  async reservarLibro() {
    if (!this.libro) return;

    const loading = await this.loadingController.create({
      message: 'Procesando reserva...',
    });
    await loading.present();

    this.bibliotecaService.reservarLibro(this.libro.id).subscribe({
      next: async (response) => {
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: `¡Reserva exitosa! Te notificaremos cuando "${this.libro!.titulo}" esté disponible.`,
          duration: 4000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        // Actualizar información del libro
        this.cargarLibro();
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

  verLibroRelacionado(libro: Libro) {
    this.router.navigate(['/detalle-libro'], {
      queryParams: { id: libro.id }
    });
  }

  volverAlCatalogo() {
    this.router.navigate(['/catalogo']);
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

  puedePrestar(): boolean {
    return this.libro ? this.libro.cantidad_disponible > 0 : false;
  }

  puedeReservar(): boolean {
    return this.libro ? 
      this.libro.cantidad_disponible === 0 && this.libro.estado !== 'Mantenimiento' : 
      false;
  }

  isAdministrador(): boolean {
    return this.authService.isAdministrador();
  }

  isDocente(): boolean {
    return this.authService.isDocente();
  }

  async agregarABibliografia() {
    if (!this.libro) return;

    const alert = await this.alertController.create({
      header: 'Agregar a Bibliografía',
      message: 'Esta funcionalidad estará disponible próximamente.',
      buttons: ['OK']
    });
    await alert.present();
  }
}
