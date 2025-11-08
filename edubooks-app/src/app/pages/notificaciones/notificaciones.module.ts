import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NotificacionesPageRoutingModule } from './notificaciones-routing.module';

import { NotificacionesPage } from './notificaciones.page';
import { FilterSelectComponent } from '../../shared/componentes/filter-select/filter-select.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NotificacionesPageRoutingModule,
    FilterSelectComponent
  ],
  declarations: [NotificacionesPage]
})
export class NotificacionesPageModule {}
