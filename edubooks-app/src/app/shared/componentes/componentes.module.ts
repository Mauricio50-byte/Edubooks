import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Importar módulos de auth
import { AuthModule } from './auth/auth.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AuthModule
  ],
  exports: [
    AuthModule
  ]
})
export class ComponentesModule { }