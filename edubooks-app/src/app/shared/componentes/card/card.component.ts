import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { BibliotecaService } from '../../../core/services/biblioteca.service';
import { Libro } from '../../../core/models/libro.model';

@Component({
  selector: 'app-libro-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: false
})
export class CardComponent implements OnChanges {
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

  constructor(private bibliotecaService: BibliotecaService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['libro'] && this.libro && this.needsCompletion(this.libro)) {
      this.bibliotecaService.getLibroById(this.libro.id).subscribe((l) => {
        if (l) {
          this.libro = { ...this.libro, ...l };
        }
      });
    }
  }

  private needsCompletion(l: Libro): boolean {
    const ubic = (l.ubicacion ?? '').trim();
    const total = l.cantidad_total as number | undefined;
    return !ubic || total === undefined || Number.isNaN(total as number);
  }

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

  formatUbicacion(ubicacion?: string | null): string {
    const val = (ubicacion ?? '').trim();
    if (!val) return 'Sin ubicación';
    const m = val.match(/^([A-Z])(\d)-(\d{3})$/);
    if (m) {
      return `Estante ${m[1]}${m[2]}, Sección ${m[3]}`;
    }
    return val;
  }

  formatDisponibles(cantidad_disponible?: number | null): string {
    const n = Number.isFinite(cantidad_disponible as number) ? Number(cantidad_disponible) : 0;
    const safe = n < 0 ? 0 : n;
    return `${safe} disponibles`;
  }
}
