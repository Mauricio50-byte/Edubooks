import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BibliografiaEstudiantePage } from './bibliografia-estudiante.page';

const routes: Routes = [
  {
    path: '',
    component: BibliografiaEstudiantePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BibliografiaEstudiantePageRoutingModule {}
