import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BibliografiaPage } from './bibliografia.page';

const routes: Routes = [
  {
    path: '',
    component: BibliografiaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BibliografiaPageRoutingModule {}
