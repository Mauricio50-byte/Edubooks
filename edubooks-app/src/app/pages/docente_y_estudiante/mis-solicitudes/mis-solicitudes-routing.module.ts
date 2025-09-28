import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MisSolicitudesPage } from './mis-solicitudes.page';

const routes: Routes = [
  {
    path: '',
    component: MisSolicitudesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MisSolicitudesPageRoutingModule {}
