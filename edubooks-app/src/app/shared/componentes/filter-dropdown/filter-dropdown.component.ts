import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

@Component({
  selector: 'app-filter-dropdown',
  templateUrl: './filter-dropdown.component.html',
  styleUrls: ['./filter-dropdown.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class FilterDropdownComponent {
  // Título y placeholders
  @Input() title: string = 'Filtros y Búsqueda';
  @Input() placeholderBusqueda: string = 'Buscar por email o nombre...';

  // Conteo para resumen
  @Input() totalCount: number = 0;
  @Input() filteredCount: number = 0;

  // Opciones de chips
  @Input() rolOptions: FilterOption[] = [];
  @Input() estadoOptions: FilterOption[] = [];

  // Valores seleccionados (two-way binding compatibles)
  @Input() filtroTexto: string = '';
  @Output() filtroTextoChange = new EventEmitter<string>();

  @Input() filtroRol: string = '';
  @Output() filtroRolChange = new EventEmitter<string>();

  @Input() filtroEstado: string = '';
  @Output() filtroEstadoChange = new EventEmitter<string>();

  // Acciones
  @Output() limpiarFiltros = new EventEmitter<void>();

  // Handlers
  onSearchInput(event: any) {
    this.filtroTexto = (event?.detail?.value ?? '').toString();
    this.filtroTextoChange.emit(this.filtroTexto);
  }

  selectRol(value: string) {
    this.filtroRol = (value || '').toLowerCase();
    this.filtroRolChange.emit(this.filtroRol);
  }

  selectEstado(value: string) {
    this.filtroEstado = value || '';
    this.filtroEstadoChange.emit(this.filtroEstado);
  }

  clearAll() {
    this.filtroTexto = '';
    this.filtroRol = '';
    this.filtroEstado = '';
    this.filtroTextoChange.emit(this.filtroTexto);
    this.filtroRolChange.emit(this.filtroRol);
    this.filtroEstadoChange.emit(this.filtroEstado);
    this.limpiarFiltros.emit();
  }

  // Utilidades
  getFirstLabel(options: FilterOption[], defaultLabel: string): string {
    return (Array.isArray(options) && options.length > 0 && options[0] && options[0].label)
      ? options[0].label
      : defaultLabel;
  }
}