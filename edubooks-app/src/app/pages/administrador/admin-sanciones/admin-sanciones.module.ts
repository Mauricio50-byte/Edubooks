import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AdminSancionesPageRoutingModule } from './admin-sanciones-routing.module';
import { AdminSancionesPage } from './admin-sanciones.page';
import { CrearSancionPage } from './crear-sancion/crear-sancion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AdminSancionesPageRoutingModule
  ],
  declarations: [AdminSancionesPage, CrearSancionPage]
})
export class AdminSancionesPageModule {}