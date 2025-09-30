import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminInvitacionesPage } from './admin-invitaciones.page';

const routes: Routes = [
  {
    path: '',
    component: AdminInvitacionesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminInvitacionesPageRoutingModule {}