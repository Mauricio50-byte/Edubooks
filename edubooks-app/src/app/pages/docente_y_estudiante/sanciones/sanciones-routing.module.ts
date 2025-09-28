import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SancionesPage } from './sanciones.page';

const routes: Routes = [
  {
    path: '',
    component: SancionesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SancionesPageRoutingModule {}