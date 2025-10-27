import { Injectable } from '@angular/core';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { Platform } from '@ionic/angular';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FocusManagementService {
  private hiddenPagesObserver?: MutationObserver;

  constructor(
    private router: Router,
    private platform: Platform
  ) {
    this.initializeFocusManagement();
  }

  private initializeFocusManagement(): void {
    // Limpiar foco justo al iniciar la navegación para evitar elementos ocultos con foco
    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(() => {
        this.blurActiveElement();
      });

    // Ajustar foco cuando la navegación termina
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.handleNavigationFocus();
      });

    // Observar cambios de aria-hidden y aplicar inert automáticamente
    this.enableInertOnHiddenPages();
  }

  private enableInertOnHiddenPages(): void {
    // Inicial: aplicar inert a todo lo que ya esté oculto
    document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
      (el as HTMLElement).setAttribute('inert', '');
    });

    // Observer que reacciona cuando Ionic cambia aria-hidden en páginas/outlets
    this.hiddenPagesObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target as HTMLElement;
          const isHidden = target.getAttribute('aria-hidden') === 'true';

          if (isHidden) {
            target.setAttribute('inert', '');
            // Si el foco actual está dentro del elemento ahora oculto, soltarlo
            const active = document.activeElement as HTMLElement | null;
            if (active && target.contains(active)) {
              active.blur();
            }
          } else {
            // Al volver a visible, retirar inert
            target.removeAttribute('inert');
          }
        }
      });
    });

    // Observar todo el árbol del documento para cambios de aria-hidden
    this.hiddenPagesObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-hidden'],
      subtree: true,
    });
  }

  private handleNavigationFocus(): void {
    // Esperar a que la navegación se complete
    setTimeout(() => {
      this.clearFocusFromHiddenElements();
      this.setFocusToNewPage();
    }, 100);
  }

  private blurActiveElement(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      active.blur();
    }
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
      // Asegurar que la página pueda recibir foco
      (activePage as HTMLElement).setAttribute('tabindex', '-1');

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