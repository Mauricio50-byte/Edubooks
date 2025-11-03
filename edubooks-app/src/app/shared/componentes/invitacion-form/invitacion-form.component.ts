import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-invitacion-form',
  templateUrl: './invitacion-form.component.html',
  styleUrls: ['./invitacion-form.component.scss'],
  standalone: false
})
export class InvitacionFormComponent {
  @Input() form!: FormGroup;
  @Input() roles: Array<{ value: string; label: string }> = [];
  @Input() fechaMinima: string | Date | undefined;
  @Input() isCreating = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() rolChange = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  private rolIconMap: Record<string, string> = {
    estudiante: 'school-outline',
    docente: 'person-outline',
    bibliotecario: 'library-outline',
    administrador: 'shield-outline'
  };

  get email_invitado() { return this.form?.get('email_invitado'); }
  get rol_asignado() { return this.form?.get('rol_asignado'); }
  get fecha_expiracion() { return this.form?.get('fecha_expiracion'); }

  get isIncomplete(): boolean {
    return !this.form || this.form.invalid;
  }

  getRolIcon(value: string | null | undefined): string {
    if (!value) return 'person-outline';
    return this.rolIconMap[value] ?? 'person-outline';
  }

  getRolLabel(value: string | null | undefined): string {
    if (!value) return '';
    const rol = this.roles.find(r => r.value === value);
    return rol?.label ?? value;
  }
}