import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminSancionesPage } from './admin-sanciones.page';

const routes: Routes = [
  {
    path: '',
    component: AdminSancionesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminSancionesPageRoutingModule {}