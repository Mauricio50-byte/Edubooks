import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminLibrosPage } from './admin-libros.page';

describe('AdminLibrosPage', () => {
  let component: AdminLibrosPage;
  let fixture: ComponentFixture<AdminLibrosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminLibrosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
