import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BibliografiaPageRoutingModule } from './bibliografia-routing.module';

import { BibliografiaPage } from './bibliografia.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BibliografiaPageRoutingModule
  ],
  declarations: [BibliografiaPage]
})
export class BibliografiaPageModule {}
