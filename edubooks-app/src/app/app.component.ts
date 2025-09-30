import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AuthService } from './core/services/auth.service';
import { LockManagerService } from './core/services/lock-manager.service';

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
    private lockManager: LockManagerService
  ) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      // Limpiar locks al iniciar la aplicación
      this.lockManager.clearAllLocks();
      
      // Inicializar servicios de autenticación
      this.authService.initializeAuth();
    });
  }
}
