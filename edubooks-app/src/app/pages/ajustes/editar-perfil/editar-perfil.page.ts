import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-ajustes-editar-perfil',
  templateUrl: './editar-perfil.page.html',
  styleUrls: ['./editar-perfil.page.scss'],
  standalone: false,
})
export class EditarPerfilPage {
  perfilForm: FormGroup;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController
  ) {
    this.perfilForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  async guardarCambios() {
    if (this.perfilForm.invalid) return;
    this.isSaving = true;
    // TODO: Integrar con servicio de usuarios para persistir cambios
    const toast = await this.toastController.create({
      message: 'Cambios guardados (demo)',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
    this.isSaving = false;
  }
}