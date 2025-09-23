import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SancionesPageRoutingModule } from './sanciones-routing.module';
import { SancionesPage } from './sanciones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SancionesPageRoutingModule
  ],
  declarations: [SancionesPage]
})
export class SancionesPageModule {}