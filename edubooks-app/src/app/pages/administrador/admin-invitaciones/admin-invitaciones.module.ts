import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminInvitacionesPageRoutingModule } from './admin-invitaciones-routing.module';

import { AdminInvitacionesPage } from './admin-invitaciones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AdminInvitacionesPageRoutingModule,
    AdminInvitacionesPage
  ]
})
export class AdminInvitacionesPageModule {}