import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminInvitacionesPage } from './admin-invitaciones.page';

describe('AdminInvitacionesPage', () => {
  let component: AdminInvitacionesPage;
  let fixture: ComponentFixture<AdminInvitacionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminInvitacionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});