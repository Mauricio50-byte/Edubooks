import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Prestamo } from '../../../../core/models/libro.model';

@Component({
  selector: 'app-detalle-prestamo',
  templateUrl: './detalle-prestamo.component.html',
  styleUrls: ['./detalle-prestamo.component.scss'],
  standalone: false
})
export class DetallePrestamoComponent {
  @Input() prestamo!: Prestamo;
  constructor(private modalController: ModalController) {}

  get valido(): boolean {
    return !!(this.prestamo && this.prestamo.usuario && this.prestamo.libro);
  }

  getUsuarioNombre(): string {
    const u = this.prestamo?.usuario as any;
    const nombre = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim();
    return nombre || 'Usuario desconocido';
  }

  getEmail(): string {
    return (this.prestamo?.usuario as any)?.email || 'N/A';
  }

  getLibroTitulo(): string {
    return this.prestamo?.libro?.titulo || 'Título no disponible';
  }

  getLibroAutor(): string {
    return this.prestamo?.libro?.autor || 'Autor no disponible';
  }

  getEstadoColor(estado?: string): string {
    switch (estado) {
      case 'Activo': return 'primary';
      case 'Devuelto': return 'success';
      case 'Vencido': return 'danger';
      default: return 'medium';
    }
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  async close() {
    await this.modalController.dismiss();
  }
}
