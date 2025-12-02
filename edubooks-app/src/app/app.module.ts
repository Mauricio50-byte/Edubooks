import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { LocationStrategy } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { environment } from '../environments/environment';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, // Habilitar animaciones de Angular
    IonicModule.forRoot({
      // Configuraciones de accesibilidad mejoradas
      mode: 'md', // Usar Material Design para mejor accesibilidad
      animated: true,
      rippleEffect: true
    }), 
    AppRoutingModule,
    HttpClientModule // Para hacer peticiones HTTP
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Usar PathLocationStrategy por defecto para URLs limpias sin hash
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideFirebaseApp(() => initializeApp(environment.firebase)) as any,
    provideAuth(() => getAuth()) as any,
    provideDatabase(() => getDatabase()) as any
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
