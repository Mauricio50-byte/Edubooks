import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RegisterInvitationPageRoutingModule } from './register-invitation-routing.module';

import { RegisterInvitationPage } from './register-invitation.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RegisterInvitationPageRoutingModule
  ],
  declarations: [RegisterInvitationPage]
})
export class RegisterInvitationPageModule {}