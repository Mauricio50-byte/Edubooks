import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonicModule, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { GoogleBooksService } from '../../../../core/services/google-books.service';
import { BibliotecaService } from '../../../../core/services/biblioteca.service';
import { LibroPreviewPageComponent } from './libro-preview/libro-preview.page';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-libro-form-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './libro-form.modal.html',
  styleUrls: ['./libro-form.modal.scss']
})
export class LibroFormModalComponent implements OnInit {

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private googleBooksService: GoogleBooksService,
    private bibliotecaService: BibliotecaService,
  ) {}

  ngOnInit(): void {
    // Flujo legacy: búsqueda (ISBN/Título), cantidad y ubicación
    this.form = this.fb.group({
      busqueda: ['', [Validators.required, Validators.minLength(2)]],
      cantidad_total: [1, [Validators.required, Validators.min(1)]],
      ubicacion: ['A1-001', [Validators.required, Validators.pattern(/^[A-Z][0-9]-[0-9]{3}$/)]]
    });
  }

  cancelar() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async confirmar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.presentAlert(
        'Formulario incompleto',
        'Por favor completa todos los campos correctamente antes de continuar.',
        'warning'
      );
      return;
    }
    const datos = this.form.value;
    await this.buscarYRegistrarLibro(datos);
  }

  private async buscarYRegistrarLibro(datos: { busqueda: string; cantidad_total: number; ubicacion: string }) {
    const loading = await this.loadingCtrl.create({ 
      message: 'Buscando libro...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    await loading.present();

    try {
      const termino = datos.busqueda.trim();
      const esISBN = /^[0-9Xx-]{10,17}$/.test(termino.replace(/\s+/g, ''));
      let libroInfo: any | null = null;

      if (esISBN) {
        libroInfo = await firstValueFrom(this.googleBooksService.buscarLibroPorISBN(termino));
      } else {
        libroInfo = await firstValueFrom(this.googleBooksService.buscarLibroPorTitulo(termino));
      }

      await loading.dismiss();

      if (!libroInfo) {
        await this.presentAlert(
          'Libro no encontrado',
          'No se encontró el libro con el término de búsqueda proporcionado. Intenta con otro ISBN o título.',
          'warning'
        );
        return;
      }

      await this.mostrarVistaPrevia(libroInfo, datos);
    } catch (error) {
      await loading.dismiss();
      await this.presentAlert(
        'Error de conexión',
        'No se pudo buscar el libro. Verifica tu conexión a internet e intenta nuevamente.',
        'danger'
      );
    }
  }

  private async mostrarVistaPrevia(libroInfo: any, datos: { cantidad_total: number; ubicacion: string }) {
    // Resolver categoría (Google Books retorna array "categorias")
    const categoriaResuelta: string = Array.isArray(libroInfo.categorias) && libroInfo.categorias.length > 0
      ? libroInfo.categorias[0]
      : (libroInfo.categoria || 'General');

    // Resolver año de publicación (puede venir como "año_publicacion" o "anio_publicacion")
    const anioPublicacionResuelto: number | string = (libroInfo['año_publicacion'] ?? libroInfo['anio_publicacion'] ?? 'N/A');

    // Resolver imagen (si no hay, intentar obtener desde backend con fallback)
    let imagenFinal: string = libroInfo.imagen_portada || '';
    if (!imagenFinal) {
      imagenFinal = await this.googleBooksService.obtenerImagenConFallback(
        libroInfo.titulo || '',
        libroInfo.autor || '',
        categoriaResuelta || 'General',
        this.obtenerImagenPorDefecto()
      );
    }

    const modal = await this.modalCtrl.create({
      component: LibroPreviewPageComponent,
      componentProps: {
        libro: {
          titulo: libroInfo.titulo || 'Sin título',
          autor: libroInfo.autor || 'Desconocido',
          isbn: libroInfo.isbn || 'N/A',
          editorial: libroInfo.editorial || 'N/A',
          anio_publicacion: anioPublicacionResuelto,
          descripcion: libroInfo.descripcion || '',
          imagen_portada: imagenFinal,
          categoria: categoriaResuelta
        },
        cantidad_total: datos.cantidad_total,
        ubicacion: datos.ubicacion,
      },
      cssClass: 'custom-modal'
    });

    await modal.present();
    const { role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      await this.registrarLibroDesdeGoogleBooks({...libroInfo, categoria: categoriaResuelta, imagen_portada: imagenFinal, anio_publicacion: anioPublicacionResuelto}, datos);
    }
  }

  private async registrarLibroDesdeGoogleBooks(libroInfo: any, datos: { cantidad_total: number; ubicacion: string }) {
    const loading = await this.loadingCtrl.create({ 
      message: 'Registrando libro en la biblioteca...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    await loading.present();

    try {
      const imagen = libroInfo.imagen_portada || this.obtenerImagenPorDefecto();
      // Usar categoría resuelta y asegurar envío del año con la clave correcta
      const categoriaResuelta: string = Array.isArray(libroInfo.categorias) && libroInfo.categorias.length > 0
        ? libroInfo.categorias[0]
        : (libroInfo.categoria || 'General');
      const payload = {
        titulo: libroInfo.titulo || 'Sin título',
        autor: libroInfo.autor || 'Desconocido',
        isbn: libroInfo.isbn || '',
        categoria: categoriaResuelta,
        editorial: libroInfo.editorial || '',
        anio_publicacion: (libroInfo['anio_publicacion'] ?? libroInfo['año_publicacion'] ?? null),
        ubicacion: datos.ubicacion,
        cantidad_total: datos.cantidad_total,
        descripcion: libroInfo.descripcion || '',
        imagen_portada: imagen
      };

      await firstValueFrom(this.bibliotecaService.registrarLibro(payload));
      await loading.dismiss();
      await this.presentToast('✓ Libro registrado correctamente en la biblioteca', 'success');
      this.modalCtrl.dismiss(payload, 'confirm');
    } catch (error) {
      await loading.dismiss();
      await this.presentAlert(
        'Error al registrar',
        'No se pudo registrar el libro en la biblioteca. Intenta nuevamente.',
        'danger'
      );
    }
  }

  private obtenerImagenPorDefecto() {
    return 'https://via.placeholder.com/400x600?text=Portada+No+Disponible';
  }

  private async presentAlert(header: string, message: string, type: 'success' | 'warning' | 'danger') {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: 'Entendido',
          role: 'confirm',
          cssClass: 'alert-button-confirm'
        }
      ],
      cssClass: `custom-alert alert-${type}`
    });
    await alert.present();
  }

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({ 
      message, 
      duration: 3000, 
      color, 
      position: 'bottom',
      cssClass: 'custom-toast',
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}