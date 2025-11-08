import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CatalogoPageRoutingModule } from './catalogo-routing.module';

import { CatalogoPage } from './catalogo.page';
import { FilterSelectComponent } from '../../shared/componentes/filter-select/filter-select.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CatalogoPageRoutingModule,
    FilterSelectComponent
  ],
  declarations: [CatalogoPage]
})
export class CatalogoPageModule {}
