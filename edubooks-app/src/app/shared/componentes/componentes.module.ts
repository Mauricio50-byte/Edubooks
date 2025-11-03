import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Importar módulos de auth
import { AuthModule } from './auth/auth.module';
import { UserDetailsComponent } from './user-details/user-details.component';
import { CompactStatsComponent } from './compact-stats/compact-stats.component';
import { InvitacionFormComponent } from './invitacion-form/invitacion-form.component';
import { InvitacionesListComponent } from './invitaciones-list/invitaciones-list.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AuthModule
  ],
  declarations: [
    UserDetailsComponent,
    CompactStatsComponent,
    InvitacionFormComponent,
    InvitacionesListComponent
  ],
  exports: [
    AuthModule,
    UserDetailsComponent,
    CompactStatsComponent,
    InvitacionFormComponent,
    InvitacionesListComponent
  ]
})
export class ComponentesModule { }