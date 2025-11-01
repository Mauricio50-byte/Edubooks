import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UsuarioAdmin } from '../../../core/services/usuario.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss'],
  standalone: false,
})
export class UserDetailsComponent {
  @Input() usuario!: UsuarioAdmin;

  constructor(private modalController: ModalController) {}

  close() {
    this.modalController.dismiss();
  }

  getInitials(nombre?: string, apellido?: string): string {
    const firstInitial = nombre ? nombre.charAt(0).toUpperCase() : '';
    const lastInitial = apellido ? apellido.charAt(0).toUpperCase() : '';
    return `${firstInitial}${lastInitial}` || 'U';
  }

  getRolIcon(rol: string): string {
    switch (rol) {
      case 'Administrador': return 'shield-outline';
      case 'Docente': return 'school-outline';
      case 'Estudiante': return 'person-outline';
      default: return 'person-circle-outline';
    }
  }

  getRolColor(rol: string): string {
    switch (rol) {
      case 'Administrador': return 'danger';
      case 'Docente': return 'warning';
      case 'Estudiante': return 'primary';
      default: return 'medium';
    }
  }

  getEstadoColor(activo: boolean): string {
    return activo ? 'success' : 'danger';
  }
}