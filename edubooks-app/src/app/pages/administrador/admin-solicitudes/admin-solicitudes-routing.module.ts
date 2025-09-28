import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminSolicitudesPage } from './admin-solicitudes.page';

const routes: Routes = [
  {
    path: '',
    component: AdminSolicitudesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminSolicitudesPageRoutingModule {}
