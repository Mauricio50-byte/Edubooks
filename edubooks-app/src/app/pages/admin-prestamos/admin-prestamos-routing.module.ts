import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminPrestamosPage } from './admin-prestamos.page';

const routes: Routes = [
  {
    path: '',
    component: AdminPrestamosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminPrestamosPageRoutingModule {}
