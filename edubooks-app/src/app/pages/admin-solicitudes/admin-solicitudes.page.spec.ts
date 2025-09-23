import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSolicitudesPage } from './admin-solicitudes.page';

describe('AdminSolicitudesPage', () => {
  let component: AdminSolicitudesPage;
  let fixture: ComponentFixture<AdminSolicitudesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminSolicitudesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
