// src/app/pages/detalle-libro/detalle-libro.page.ts
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
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.libroId = +params['id'];
        this.cargarLibro();
      }
    });
  }

  /**
   * Cargar información del libro
   */
  async cargarLibro() {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await this.bibliotecaService.obtenerLibro(this.libroId).toPromise();
      
      if (response?.data) {
        this.libro = response.data;
        this.cargarLibrosRelacionados();
      } else {
        this.error = 'No se encontró el libro solicitado';
      }
    } catch (error: any) {
      console.error('Error cargando libro:', error);
      this.error = error.message || 'Error al cargar el libro';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Cargar libros relacionados (misma categoría)
   */
  async cargarLibrosRelacionados() {
    if (!this.libro) return;

    try {
      const response = await this.bibliotecaService.buscarLibros({
        categoria: this.libro.categoria,
        page_size: 5
      }).toPromise();

      if (response?.results) {
        // Filtrar el libro actual
        this.librosRelacionados = response.results.filter(
          libro => libro.id !== this.libroId
        );
      }
    } catch (error) {
      console.error('Error cargando libros relacionados:', error);
    }
  }

  /**
   * Solicitar préstamo del libro
   */
  async solicitarPrestamo() {
    if (!this.libro) return;

    const alert = await this.alertController.create({
      header: 'Confirmar Préstamo',
      message: `¿Deseas solicitar el préstamo de "${this.libro.titulo}"?`,
      subHeader: 'El libro será reservado para ti por 24 horas.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Solicitar',
          handler: async () => {
            await this.procesarSolicitudPrestamo();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar solicitud de préstamo
   */
  private async procesarSolicitudPrestamo() {
    if (!this.libro) return;

    const loading = await this.loadingController.create({
      message: 'Solicitando préstamo...'
    });
    await loading.present();

    try {
      const response = await this.bibliotecaService.solicitarPrestamo({
        libro_id: this.libro.id
      }).toPromise();

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Préstamo solicitado exitosamente. Dirígete a la biblioteca para recoger el libro.',
        duration: 4000,
        color: 'success',
        buttons: [
          {
            text: 'Ver mis préstamos',
            handler: () => {
              this.router.navigate(['/prestamos']);
            }
          }
        ]
      });
      await toast.present();

      // Recargar información del libro
      this.cargarLibro();

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
   * Crear reserva del libro
   */
  async crearReserva() {
    if (!this.libro) return;

    const alert = await this.alertController.create({
      header: 'Confirmar Reserva',
      message: `¿Deseas reservar "${this.libro.titulo}"?`,
      subHeader: 'Te notificaremos cuando esté disponible.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Reservar',
          handler: async () => {
            await this.procesarReserva();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar reserva
   */
  private async procesarReserva() {
    if (!this.libro) return;

    const loading = await this.loadingController.create({
      message: 'Creando reserva...'
    });
    await loading.present();

    try {
      const response = await this.bibliotecaService.crearReserva({
        libro_id: this.libro.id
      }).toPromise();

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Reserva creada exitosamente. Te notificaremos cuando el libro esté disponible.',
        duration: 4000,
        color: 'success',
        buttons: [
          {
            text: 'Ver mis reservas',
            handler: () => {
              this.router.navigate(['/reservas']);
            }
          }
        ]
      });
      await toast.present();

      // Recargar información del libro
      this.cargarLibro();

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
   * Editar libro (solo administradores)
   */
  editarLibro() {
    if (this.libro) {
      this.router.navigate(['/admin/libro', this.libro.id, 'editar']);
    }
  }

  /**
   * Eliminar libro (solo administradores)
   */
  async eliminarLibro() {
    if (!this.libro) return;

    const alert = await this.alertController.create({
      header: '⚠️ Eliminar Libro',
      message: `¿Estás seguro que deseas eliminar "${this.libro.titulo}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.procesarEliminacion();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar eliminación del libro
   */
  private async procesarEliminacion() {
    if (!this.libro) return;

    const loading = await this.loadingController.create({
      message: 'Eliminando libro...'
    });
    await loading.present();

    try {
      await this.bibliotecaService.eliminarLibro(this.libro.id).toPromise();
      
      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Libro eliminado exitosamente.',
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      this.router.navigate(['/catalogo']);

    } catch (error: any) {
      await loading.dismiss();

      const alert = await this.alertController.create({
        header: 'Error al Eliminar',
        message: error.message || 'No se pudo eliminar el libro.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  /**
   * Ver libro relacionado
   */
  verLibroRelacionado(libro: Libro) {
    this.router.navigate(['/libro', libro.id]);
  }

  /**
   * Verificar si se puede prestar el libro
   */
  puedePrestar(): boolean {
    return this.libro?.estado === 'Disponible' && 
           (this.libro?.cantidad_disponible || 0) > 0;
  }

  /**
   * Verificar si se puede reservar el libro
   */
get puedeReservar(): boolean {
    return this.libro?.estado === 'Disponible' && 
           (this.libro?.cantidad_disponible || 0) > 0;
  }

  /**
   * Obtener color del badge según el estado del libro
   */
  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible':
        return 'success';
      case 'Prestado':
        return 'warning';
      case 'Reservado':
        return 'primary';
      case 'No disponible':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Verificar si el usuario actual es administrador
   */
  isAdministrador(): boolean {
    return this.authService.isAdministrador();
  }
}
