import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface Invitacion {
  token: string;
  email_invitado: string;
  rol_asignado: string;
  estado: string;
  fecha_creacion: string;
  fecha_expiracion: string;
  fecha_uso?: string;
  invitado_por: {
    nombre: string;
    apellido: string;
    email: string;
  };
  datos_adicionales?: any;
}

@Component({
  selector: 'app-invitaciones-list',
  templateUrl: './invitaciones-list.component.html',
  styleUrls: ['./invitaciones-list.component.scss'],
  standalone: false
})
export class InvitacionesListComponent {
  @Input() invitaciones: Invitacion[] = [];
  @Input() isLoading = false;
  @Input() error: string | null = null;

  @Output() reenviarInvitacion = new EventEmitter<Invitacion>();
  @Output() extenderInvitacion = new EventEmitter<Invitacion>();
  @Output() cancelarInvitacion = new EventEmitter<Invitacion>();
  @Output() eliminarInvitacion = new EventEmitter<Invitacion>();

  // Exponer Object para el template
  Object = Object;

  private rolIconMap: Record<string, string> = {
    estudiante: 'school-outline',
    docente: 'person-outline',
    bibliotecario: 'library-outline',
    administrador: 'shield-outline'
  };

  private rolLabelMap: Record<string, string> = {
    estudiante: 'Estudiante',
    docente: 'Docente',
    bibliotecario: 'Bibliotecario',
    administrador: 'Administrador'
  };

  private estadoColorMap: Record<string, string> = {
    pendiente: 'warning',
    usado: 'success',
    expirado: 'danger',
    cancelado: 'medium'
  };

  private estadoIconMap: Record<string, string> = {
    pendiente: 'time-outline',
    usado: 'checkmark-circle-outline',
    expirado: 'close-circle-outline',
    cancelado: 'ban-outline'
  };

  private estadoLabelMap: Record<string, string> = {
    pendiente: 'Pendiente',
    usado: 'Usado',
    expirado: 'Expirado',
    cancelado: 'Cancelado'
  };

  trackByInvitacion(index: number, invitacion: Invitacion): string {
    return invitacion.token;
  }

  getRolIcon(rol: string): string {
    return this.rolIconMap[rol] || 'person-outline';
  }

  getRolLabel(rol: string): string {
    return this.rolLabelMap[rol] || rol;
  }

  getEstadoColor(estado: string): string {
    return this.estadoColorMap[estado] || 'medium';
  }

  getEstadoIcon(estado: string): string {
    return this.estadoIconMap[estado] || 'help-outline';
  }

  getEstadoLabel(estado: string): string {
    return this.estadoLabelMap[estado] || estado;
  }

  getFormattedAdditionalData(datos: any): string {
    if (!datos || typeof datos !== 'object') return '';
    
    return Object.entries(datos)
      .map(([key, value]) => `<strong>${this.formatKey(key)}:</strong> ${value}`)
      .join('<br>');
  }

  private formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  onReenviarInvitacion(invitacion: Invitacion): void {
    this.reenviarInvitacion.emit(invitacion);
  }

  onExtenderInvitacion(invitacion: Invitacion): void {
    this.extenderInvitacion.emit(invitacion);
  }

  onCancelarInvitacion(invitacion: Invitacion): void {
    this.cancelarInvitacion.emit(invitacion);
  }

  onEliminarInvitacion(invitacion: Invitacion): void {
    this.eliminarInvitacion.emit(invitacion);
  }
}