import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SancionesPage } from './sanciones.page';

describe('SancionesPage', () => {
  let component: SancionesPage;
  let fixture: ComponentFixture<SancionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SancionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});