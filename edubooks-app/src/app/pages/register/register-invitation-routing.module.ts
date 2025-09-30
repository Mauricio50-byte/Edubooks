import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RegisterInvitationPage } from './register-invitation.page';

const routes: Routes = [
  {
    path: '',
    component: RegisterInvitationPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegisterInvitationPageRoutingModule {}