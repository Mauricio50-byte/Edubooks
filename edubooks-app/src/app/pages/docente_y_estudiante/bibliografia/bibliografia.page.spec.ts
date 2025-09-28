import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BibliografiaPage } from './bibliografia.page';

describe('BibliografiaPage', () => {
  let component: BibliografiaPage;
  let fixture: ComponentFixture<BibliografiaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BibliografiaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
