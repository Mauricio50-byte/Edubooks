import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisSolicitudesPage } from './mis-solicitudes.page';

describe('MisSolicitudesPage', () => {
  let component: MisSolicitudesPage;
  let fixture: ComponentFixture<MisSolicitudesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisSolicitudesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
