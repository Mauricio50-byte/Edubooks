// src/app/pages/bibliografia/bibliografia.page.ts
import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';
import { Bibliografia, Libro } from '../../core/models/libro.model';

@Component({
  selector: 'app-bibliografia',
  templateUrl: './bibliografia.page.html',
  styleUrls: ['./bibliografia.page.scss'],
  standalone: false
})
export class BibliografiaPage implements OnInit {
  bibliografias: Bibliografia[] = [];
  librosDisponibles: Libro[] = [];
  isLoading = true;
  error: string = '';
  usuarioActual: any = null;

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    this.cargarBibliografias();
    this.cargarLibrosDisponibles();
  }

  /**
   * Cargar bibliografías del docente
   */
  async cargarBibliografias() {
    this.isLoading = true;
    this.error = '';

    try {
      // const response = await this.bibliotecaService.obtenerMisBibliografias().toPromise(); // TODO: Implementar método
      const response = { data: [] }; // Simulación temporal
      
      if (response?.data && Array.isArray(response.data)) {
        this.bibliografias = response.data;
      } else {
        this.bibliografias = [];
      }
    } catch (error: any) {
      this.error = error.message || 'Error al cargar las bibliografías';
      console.error('Error cargando bibliografías:', error);
      const toast = await this.toastController.create({
        message: 'Error al cargar las bibliografías. Verifica tu conexión.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Cargar libros disponibles para agregar a bibliografías
   */
  async cargarLibrosDisponibles() {
    try {
      // const response = await this.bibliotecaService.buscarLibros({ // TODO: Implementar método
      const response = { results: [] }; // Simulación temporal
      /*
        page: 1,
        page_size: 100
      }).toPromise();
      */
      
      if (response?.results) {
        this.librosDisponibles = response.results;
      }
    } catch (error: any) {
      console.error('Error cargando libros:', error);
    }
  }

  /**
   * Crear nueva bibliografía
   */
  async crearBibliografia() {
    const alert = await this.alertController.create({
      header: 'Nueva Bibliografía',
      inputs: [
        {
          name: 'curso',
          type: 'text',
          placeholder: 'Nombre del curso',
          attributes: {
            required: true
          }
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
          text: 'Crear',
          handler: async (data) => {
            if (data.curso && data.curso.trim()) {
              await this.procesarCreacionBibliografia(data);
              return true;
            } else {
              this.mostrarToast('El nombre del curso es requerido', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar creación de bibliografía
   */
  private async procesarCreacionBibliografia(data: any) {
    const loading = await this.loadingController.create({
      message: 'Creando bibliografía...'
    });
    await loading.present();

    try {
      // const response = await this.bibliotecaService.crearBibliografia({ // TODO: Implementar método
      const response = { success: true }; // Simulación temporal
      /*
        curso: data.curso.trim(),
        descripcion: data.descripcion?.trim() || '',
        es_publica: true
      }).toPromise();
      */

      await loading.dismiss();
      await this.mostrarToast('Bibliografía creada exitosamente', 'success');
      this.cargarBibliografias();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al crear la bibliografía', 'danger');
    }
  }

  /**
   * Editar bibliografía
   */
  async editarBibliografia(bibliografia: Bibliografia) {
    const alert = await this.alertController.create({
      header: 'Editar Bibliografía',
      inputs: [
        {
          name: 'curso',
          type: 'text',
          value: bibliografia.curso,
          placeholder: 'Nombre del curso'
        },
        {
          name: 'descripcion',
          type: 'textarea',
          value: bibliografia.descripcion || '',
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
            if (data.curso && data.curso.trim()) {
              await this.procesarEdicionBibliografia(bibliografia.id, data);
              return true;
            } else {
              this.mostrarToast('El nombre del curso es requerido', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar edición de bibliografía
   */
  private async procesarEdicionBibliografia(id: number, data: any) {
    const loading = await this.loadingController.create({
      message: 'Actualizando bibliografía...'
    });
    await loading.present();

    try {
      // await this.bibliotecaService.actualizarBibliografia(id, { // TODO: Implementar método
      /*
        curso: data.curso.trim(),
        descripcion: data.descripcion?.trim() || ''
      }).toPromise();
      */

      await loading.dismiss();
      await this.mostrarToast('Bibliografía actualizada exitosamente', 'success');
      this.cargarBibliografias();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al actualizar la bibliografía', 'danger');
    }
  }

  /**
   * Agregar libro a bibliografía
   */
  async agregarLibro(bibliografia: Bibliografia) {
    const alert = await this.alertController.create({
      header: 'Agregar Libro',
      message: `Selecciona un libro para agregar a "${bibliografia.curso}"`,
      inputs: this.librosDisponibles.map(libro => ({
        type: 'radio',
        label: `${libro.titulo} - ${libro.autor}`,
        value: libro.id
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Agregar',
          handler: async (libroId) => {
            if (libroId) {
              await this.procesarAgregarLibro(bibliografia.id, libroId);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar agregar libro a bibliografía
   */
  private async procesarAgregarLibro(bibliografiaId: number, libroId: number) {
    const loading = await this.loadingController.create({
      message: 'Agregando libro...'
    });
    await loading.present();

    try {
      // await this.bibliotecaService.agregarLibroABibliografia(bibliografiaId, libroId).toPromise(); // TODO: Implementar método
      
      await loading.dismiss();
      await this.mostrarToast('Libro agregado exitosamente', 'success');
      this.cargarBibliografias();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al agregar el libro', 'danger');
    }
  }

  /**
   * Remover libro de bibliografía
   */
  async removerLibro(bibliografia: Bibliografia, libro: Libro) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Deseas remover "${libro.titulo}" de la bibliografía "${bibliografia.curso}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Remover',
          handler: async () => {
            await this.procesarRemoverLibro(bibliografia.id, libro.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar remover libro de bibliografía
   */
  private async procesarRemoverLibro(bibliografiaId: number, libroId: number) {
    const loading = await this.loadingController.create({
      message: 'Removiendo libro...'
    });
    await loading.present();

    try {
      // await this.bibliotecaService.removerLibroDeBibliografia(bibliografiaId, libroId).toPromise(); // TODO: Implementar método
      
      await loading.dismiss();
      await this.mostrarToast('Libro removido exitosamente', 'success');
      this.cargarBibliografias();

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al remover el libro', 'danger');
    }
  }

  /**
   * Refrescar datos
   */
  async doRefresh(event: any) {
    await this.cargarBibliografias();
    await this.cargarLibrosDisponibles();
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
   * Verificar si el usuario es docente
   */
  get esDocente(): boolean {
    return this.usuarioActual?.rol === 'Docente';
  }
}
