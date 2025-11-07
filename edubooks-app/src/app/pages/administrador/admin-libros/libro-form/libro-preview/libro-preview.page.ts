import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-libro-preview-page',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './libro-preview.page.html',
  styleUrls: ['./libro-preview.page.scss']
})
export class LibroPreviewPageComponent {
  @Input() libro: any;
  @Input() cantidad_total!: number;
  @Input() ubicacion!: string;

  constructor(private modalCtrl: ModalController) {}

  cancelar() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  confirmar() {
    this.modalCtrl.dismiss({ confirmar: true }, 'confirm');
  }

  // Campos saneados para evitar HTML embebido desde Google Books
  get tituloLimpio(): string {
    return this.stripHtml(this.libro?.titulo) || 'Sin título';
  }

  get autorLimpio(): string {
    return this.stripHtml(this.libro?.autor) || 'Desconocido';
  }

  get isbnLimpio(): string {
    return this.stripHtml(this.libro?.isbn) || 'N/A';
  }

  get editorialLimpia(): string {
    return this.stripHtml(this.libro?.editorial) || 'N/A';
  }

  get anioLimpio(): string {
    return this.stripHtml(this.libro?.anio_publicacion) || 'N/A';
  }

  get descripcionLimpia(): string {
    return this.stripHtml(this.libro?.descripcion) || 'Sin descripción';
  }

  private stripHtml(value?: string | number): string {
    if (value === null || value === undefined) return '';
    const html = String(value);
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    // Asegura que se eliminen posibles restos de etiquetas
    return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}