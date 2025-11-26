import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CardComponent } from './card.component';
import { Libro } from '../../../core/models/libro.model';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, IonicModule.forRoot()],
      declarations: [CardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
  });

  function setLibro(partial: Partial<Libro>) {
    const base: Libro = {
      id: 1,
      titulo: 'Cien años de soledad',
      autor: 'Gabriel García Márquez',
      categoria: 'FICTION',
      ubicacion: 'A1-001',
      estado: 'Disponible',
      cantidad_total: 10,
      cantidad_disponible: 5,
      fecha_registro: new Date().toISOString(),
      isbn: '', editorial: '', anio_publicacion: undefined, descripcion: '', imagen_portada: ''
    };
    component.libro = { ...base, ...partial } as Libro;
    fixture.detectChanges();
  }

  it('muestra la ubicación en formato "Estante X, Sección Y" cuando coincide patrón A1-001', () => {
    setLibro({ ubicacion: 'A1-001' });
    const labels = fixture.nativeElement.querySelectorAll('ion-chip ion-label');
    const ubicacionText = labels[0]?.textContent?.trim();
    expect(ubicacionText).toBe('Estante A1, Sección 001');
  });

  it('muestra "Sin ubicación" cuando ubicacion está vacía o nula', () => {
    setLibro({ ubicacion: '' });
    let labels = fixture.nativeElement.querySelectorAll('ion-chip ion-label');
    expect(labels[0]?.textContent?.trim()).toBe('Sin ubicación');

    setLibro({ ubicacion: null as any });
    labels = fixture.nativeElement.querySelectorAll('ion-chip ion-label');
    expect(labels[0]?.textContent?.trim()).toBe('Sin ubicación');
  });

  it('muestra cantidad disponible como "X disponibles"', () => {
    setLibro({ cantidad_disponible: 5 });
    const labels = fixture.nativeElement.querySelectorAll('ion-chip ion-label');
    const cantidadText = labels[1]?.textContent?.trim();
    expect(cantidadText).toBe('5 disponibles');
  });

  it('muestra "0 disponibles" cuando cantidad_disponible es nula o negativa', () => {
    setLibro({ cantidad_disponible: null as any });
    let labels = fixture.nativeElement.querySelectorAll('ion-chip ion-label');
    expect(labels[1]?.textContent?.trim()).toBe('0 disponibles');

    setLibro({ cantidad_disponible: -3 });
    labels = fixture.nativeElement.querySelectorAll('ion-chip ion-label');
    expect(labels[1]?.textContent?.trim()).toBe('0 disponibles');
  });
});

