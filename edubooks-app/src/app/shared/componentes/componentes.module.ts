import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Importar módulos de auth
import { AuthModule } from './auth/auth.module';
import { UserDetailsComponent } from './user-details/user-details.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AuthModule
  ],
  declarations: [
    UserDetailsComponent
  ],
  exports: [
    AuthModule,
    UserDetailsComponent
  ]
})
export class ComponentesModule { }