import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HistorialPrestamosPage } from './historial-prestamos.page';

const routes: Routes = [
  {
    path: '',
    component: HistorialPrestamosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HistorialPrestamosPageRoutingModule {}
