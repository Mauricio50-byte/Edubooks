import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminSancionesPage } from './admin-sanciones.page';
import { CrearSancionPage } from './crear-sancion/crear-sancion.page';

const routes: Routes = [
  {
    path: '',
    component: AdminSancionesPage
  },
  {
    path: 'crear',
    component: CrearSancionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminSancionesPageRoutingModule {}