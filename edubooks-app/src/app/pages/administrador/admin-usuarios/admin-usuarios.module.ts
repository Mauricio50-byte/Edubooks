import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminUsuariosPageRoutingModule } from './admin-usuarios-routing.module';
import { SharedModule } from '../../../shared/shared.module';
import { FilterDropdownComponent } from '../../../shared/componentes/filter-dropdown/filter-dropdown.component';
import { ComponentesModule } from '../../../shared/componentes/componentes.module';

import { AdminUsuariosPage } from './admin-usuarios.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminUsuariosPageRoutingModule,
    FilterDropdownComponent,
    SharedModule,
    ComponentesModule
  ],
  declarations: [AdminUsuariosPage]
})
export class AdminUsuariosPageModule {}
