import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Importar módulo de callback
import { CallbackPageModule } from './callback/callback.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CallbackPageModule
  ],
  exports: [
    CallbackPageModule
  ]
})
export class AuthModule { }