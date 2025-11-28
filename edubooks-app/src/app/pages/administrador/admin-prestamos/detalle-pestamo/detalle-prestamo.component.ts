import { Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Prestamo } from '../../../../core/models/libro.model';

@Component({
  selector: 'app-detalle-prestamo',
  templateUrl: './detalle-prestamo.component.html',
  styleUrls: ['./detalle-prestamo.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetallePrestamoComponent implements OnChanges {
  @Input() prestamo!: Prestamo;
  constructor(private modalController: ModalController) {}

  get valido(): boolean {
    return !!(this.prestamo && this.prestamo.usuario && this.prestamo.libro);
  }

  usuarioNombre = 'Usuario desconocido';
  email = 'N/A';
  libroTitulo = 'Título no disponible';
  libroAutor = 'Autor no disponible';
  estadoColor = 'medium';
  fechaPrestamoFmt = 'N/A';
  fechaDevolucionEsperadaFmt = 'N/A';
  fechaDevolucionRealFmt = 'N/A';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prestamo'] && this.prestamo) {
      const u = this.prestamo.usuario as any;
      this.usuarioNombre = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim() || 'Usuario desconocido';
      this.email = u?.email || 'N/A';
      this.libroTitulo = this.prestamo.libro?.titulo || 'Título no disponible';
      this.libroAutor = this.prestamo.libro?.autor || 'Autor no disponible';
      this.estadoColor = this.getEstadoColorInternal(this.prestamo.estado);
      this.fechaPrestamoFmt = this.formatDate(this.prestamo.fecha_prestamo);
      this.fechaDevolucionEsperadaFmt = this.formatDate(this.prestamo.fecha_devolucion_esperada);
      this.fechaDevolucionRealFmt = this.formatDate(this.prestamo.fecha_devolucion_real);
    }
  }

  private getEstadoColorInternal(estado?: string): string {
    switch (estado) {
      case 'Activo': return 'primary';
      case 'Devuelto': return 'success';
      case 'Vencido': return 'danger';
      default: return 'medium';
    }
  }

  private formatDate(fecha?: string): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  async close() {
    await this.modalController.dismiss();
  }
}
