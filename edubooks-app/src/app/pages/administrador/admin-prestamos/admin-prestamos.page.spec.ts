import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPrestamosPage } from './admin-prestamos.page';

describe('AdminPrestamosPage', () => {
  let component: AdminPrestamosPage;
  let fixture: ComponentFixture<AdminPrestamosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPrestamosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
