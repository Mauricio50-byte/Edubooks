import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AyudaPageRoutingModule } from './ayuda-routing.module';
import { AyudaPage } from './ayuda.page';

@NgModule({
  imports: [CommonModule, IonicModule, AyudaPageRoutingModule],
  declarations: [AyudaPage]
})
export class AyudaPageModule {}