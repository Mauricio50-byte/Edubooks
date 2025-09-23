import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminSolicitudesPageRoutingModule } from './admin-solicitudes-routing.module';

import { AdminSolicitudesPage } from './admin-solicitudes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminSolicitudesPageRoutingModule,
    AdminSolicitudesPage
  ]
})
export class AdminSolicitudesPageModule {}
