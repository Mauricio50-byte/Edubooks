import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminPrestamosPageRoutingModule } from './admin-prestamos-routing.module';

import { AdminPrestamosPage } from './admin-prestamos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminPrestamosPageRoutingModule
  ],
  declarations: [AdminPrestamosPage]
})
export class AdminPrestamosPageModule {}
