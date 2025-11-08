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
      return;
    }
    const datos = this.form.value;
    await this.buscarYRegistrarLibro(datos);
  }

  private async buscarYRegistrarLibro(datos: { busqueda: string; cantidad_total: number; ubicacion: string }) {
    const loading = await this.loadingCtrl.create({ message: 'Buscando libro...' });
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
        await this.presentToast('No se encontró el libro. Intenta con otro término.', 'warning');
        return;
      }

      await this.mostrarVistaPrevia(libroInfo, datos);
    } catch (error) {
      await loading.dismiss();
      await this.presentToast('Error al buscar libro. Revisa tu conexión.', 'danger');
    }
  }

  private async mostrarVistaPrevia(libroInfo: any, datos: { cantidad_total: number; ubicacion: string }) {
    const modal = await this.modalCtrl.create({
      component: LibroPreviewPageComponent,
      componentProps: {
        libro: {
          titulo: libroInfo.titulo || 'Sin título',
          autor: libroInfo.autor || 'Desconocido',
          isbn: libroInfo.isbn || 'N/A',
          editorial: libroInfo.editorial || 'N/A',
          anio_publicacion: libroInfo.anio_publicacion || 'N/A',
          descripcion: libroInfo.descripcion || '',
          imagen_portada: libroInfo.imagen_portada || this.obtenerImagenPorDefecto(),
        },
        cantidad_total: datos.cantidad_total,
        ubicacion: datos.ubicacion,
      }
    });

    await modal.present();
    const { role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      await this.registrarLibroDesdeGoogleBooks(libroInfo, datos);
    }
  }

  private async registrarLibroDesdeGoogleBooks(libroInfo: any, datos: { cantidad_total: number; ubicacion: string }) {
    const loading = await this.loadingCtrl.create({ message: 'Registrando libro...' });
    await loading.present();

    try {
      const imagen = libroInfo.imagen_portada || this.obtenerImagenPorDefecto();
      const payload = {
        titulo: libroInfo.titulo || 'Sin título',
        autor: libroInfo.autor || 'Desconocido',
        isbn: libroInfo.isbn || '',
        categoria: libroInfo.categoria || 'General',
        editorial: libroInfo.editorial || '',
        anio_publicacion: libroInfo.anio_publicacion || null,
        ubicacion: datos.ubicacion,
        cantidad_total: datos.cantidad_total,
        descripcion: libroInfo.descripcion || '',
        imagen_portada: imagen
      };

      await firstValueFrom(this.bibliotecaService.registrarLibro(payload));
      await loading.dismiss();
      await this.presentToast('Libro registrado correctamente.', 'success');
      this.modalCtrl.dismiss(payload, 'confirm');
    } catch (error) {
      await loading.dismiss();
      await this.presentToast('No se pudo registrar el libro.', 'danger');
    }
  }

  private obtenerImagenPorDefecto() {
    return 'https://via.placeholder.com/400x600?text=Portada+No+Disponible';
  }

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}