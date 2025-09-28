import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BibliografiaEstudiantePageRoutingModule } from './bibliografia-estudiante-routing.module';

import { BibliografiaEstudiantePage } from './bibliografia-estudiante.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BibliografiaEstudiantePageRoutingModule
  ],
  declarations: [BibliografiaEstudiantePage]
})
export class BibliografiaEstudiantePageModule {}
