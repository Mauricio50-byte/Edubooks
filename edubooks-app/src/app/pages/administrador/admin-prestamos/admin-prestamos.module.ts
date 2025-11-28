import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { DetallePrestamoComponent } from './detalle-pestamo/detalle-prestamo.component';

import { AdminPrestamosPageRoutingModule } from './admin-prestamos-routing.module';

import { AdminPrestamosPage } from './admin-prestamos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminPrestamosPageRoutingModule
  ],
  declarations: [AdminPrestamosPage, DetallePrestamoComponent]
})
export class AdminPrestamosPageModule {}
