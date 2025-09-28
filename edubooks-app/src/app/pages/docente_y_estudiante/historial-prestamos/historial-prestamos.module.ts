import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HistorialPrestamosPageRoutingModule } from './historial-prestamos-routing.module';

import { HistorialPrestamosPage } from './historial-prestamos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HistorialPrestamosPageRoutingModule
  ],
  declarations: [HistorialPrestamosPage]
})
export class HistorialPrestamosPageModule {}
