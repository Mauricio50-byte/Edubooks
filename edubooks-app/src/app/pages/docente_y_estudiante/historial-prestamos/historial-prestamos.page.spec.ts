import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistorialPrestamosPage } from './historial-prestamos.page';

describe('HistorialPrestamosPage', () => {
  let component: HistorialPrestamosPage;
  let fixture: ComponentFixture<HistorialPrestamosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HistorialPrestamosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
