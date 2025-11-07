import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-ajustes-comentarios',
  templateUrl: './comentarios.page.html',
  styleUrls: ['./comentarios.page.scss'],
  standalone: false,
})
export class ComentariosPage {
  feedbackForm: FormGroup;
  isSending = false;

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController
  ) {
    this.feedbackForm = this.fb.group({
      asunto: ['', [Validators.required, Validators.minLength(4)]],
      mensaje: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  async enviar() {
    if (this.feedbackForm.invalid) return;
    this.isSending = true;
    // TODO: Integrar con endpoint de feedback
    const toast = await this.toastController.create({
      message: 'Comentario enviado (demo)',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
    this.isSending = false;
    this.feedbackForm.reset();
  }
}