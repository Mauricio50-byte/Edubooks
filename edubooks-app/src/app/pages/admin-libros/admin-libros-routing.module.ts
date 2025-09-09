import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminLibrosPage } from './admin-libros.page';

const routes: Routes = [
  {
    path: '',
    component: AdminLibrosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminLibrosPageRoutingModule {}
