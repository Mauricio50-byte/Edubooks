import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AdminSancionesPageRoutingModule } from './admin-sanciones-routing.module';
import { AdminSancionesPage } from './admin-sanciones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminSancionesPageRoutingModule
  ],
  declarations: [AdminSancionesPage]
})
export class AdminSancionesPageModule {}