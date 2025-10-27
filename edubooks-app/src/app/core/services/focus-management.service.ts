import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Platform } from '@ionic/angular';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FocusManagementService {

  constructor(
    private router: Router,
    private platform: Platform
  ) {
    this.initializeFocusManagement();
  }

  private initializeFocusManagement(): void {
    // Escuchar eventos de navegación
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.handleNavigationFocus();
      });
  }

  private handleNavigationFocus(): void {
    // Esperar a que la navegación se complete
    setTimeout(() => {
      this.clearFocusFromHiddenElements();
      this.setFocusToNewPage();
    }, 100);
  }

  private clearFocusFromHiddenElements(): void {
    // Buscar elementos con aria-hidden="true" que tengan foco
    const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
    
    hiddenElements.forEach(element => {
      // Buscar elementos focusables dentro del elemento oculto
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      focusableElements.forEach(focusableElement => {
        if (document.activeElement === focusableElement) {
          // Quitar el foco del elemento
          (focusableElement as HTMLElement).blur();
        }
      });
    });
  }

  private setFocusToNewPage(): void {
    // Buscar la página activa (sin aria-hidden)
    const activePage = document.querySelector('ion-page:not([aria-hidden="true"])');
    
    if (activePage) {
      // Buscar el primer elemento focusable en la página activa
      const firstFocusable = activePage.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        // Establecer foco en el primer elemento focusable
        firstFocusable.focus();
      } else {
        // Si no hay elementos focusables, establecer foco en la página misma
        (activePage as HTMLElement).focus();
      }
    }
  }

  /**
   * Método público para limpiar foco manualmente
   */
  public clearFocusFromHidden(): void {
    this.clearFocusFromHiddenElements();
  }

  /**
   * Método público para establecer foco en página activa
   */
  public focusActivePage(): void {
    this.setFocusToNewPage();
  }
}