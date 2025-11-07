import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Libro } from '../../../core/models/libro.model';

@Component({
  selector: 'app-libro-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() libro!: Libro;
  @Input() modo: 'catalogo' | 'admin' = 'catalogo';
  @Input() puedePrestar: boolean = false;
  @Input() puedeReservar: boolean = false;
  @Input() usuario_tiene_prestamo: boolean = false;

  @Output() verDetalle = new EventEmitter<Libro>();
  @Output() prestar = new EventEmitter<Libro>();
  @Output() reservar = new EventEmitter<Libro>();
  @Output() editar = new EventEmitter<Libro>();
  @Output() eliminar = new EventEmitter<Libro>();

  onVerDetalle(event: Event) {
    event.stopPropagation();
    this.verDetalle.emit(this.libro);
  }

  onPrestar(event: Event) {
    event.stopPropagation();
    this.prestar.emit(this.libro);
  }

  onReservar(event: Event) {
    event.stopPropagation();
    this.reservar.emit(this.libro);
  }

  onEditar(event: Event) {
    event.stopPropagation();
    this.editar.emit(this.libro);
  }

  onEliminar(event: Event) {
    event.stopPropagation();
    this.eliminar.emit(this.libro);
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'Prestado': return 'danger';
      case 'Reservado': return 'warning';
      case 'Mantenimiento': return 'medium';
      default: return 'medium';
    }
  }
}