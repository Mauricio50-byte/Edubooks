import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminLibrosPageRoutingModule } from './admin-libros-routing.module';
import { SharedModule } from '../../../shared/shared.module';

import { AdminLibrosPage } from './admin-libros.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminLibrosPageRoutingModule,
    SharedModule
  ],
  declarations: [AdminLibrosPage]
})
export class AdminLibrosPageModule {}
