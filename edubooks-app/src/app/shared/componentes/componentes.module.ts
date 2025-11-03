import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Importar módulos de auth
import { AuthModule } from './auth/auth.module';
import { UserDetailsComponent } from './user-details/user-details.component';
import { CompactStatsComponent } from './compact-stats/compact-stats.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AuthModule
  ],
  declarations: [
    UserDetailsComponent,
    CompactStatsComponent
  ],
  exports: [
    AuthModule,
    UserDetailsComponent,
    CompactStatsComponent
  ]
})
export class ComponentesModule { }