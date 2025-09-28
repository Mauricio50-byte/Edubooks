import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BibliografiaEstudiantePage } from './bibliografia-estudiante.page';

describe('BibliografiaEstudiantePage', () => {
  let component: BibliografiaEstudiantePage;
  let fixture: ComponentFixture<BibliografiaEstudiantePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BibliografiaEstudiantePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
