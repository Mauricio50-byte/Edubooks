import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AuthService } from './core/services/auth.service';
import { LockManagerService } from './core/services/lock-manager.service';
import { SupabaseService } from './core/services/supabase.service';
import { FocusManagementService } from './core/services/focus-management.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private platform: Platform,
    private authService: AuthService,
    private lockManager: LockManagerService,
    private supabaseService: SupabaseService,
    private focusManagementService: FocusManagementService
  ) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      // Limpiar locks al iniciar la aplicación (una sola vez)
      this.lockManager.clearAllLocks();
      
      // Inicializar servicios de autenticación
      this.authService.initializeAuth();
      
      // Evitar inicializar Supabase automáticamente para prevenir contención de locks al arranque
      // this.supabaseService.loadSession().catch(err => {
      //   console.warn('No se pudo cargar sesión de Supabase al inicio:', err);
      // });
    });
  }
}
