import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { UsuarioService, UsuarioAdmin } from '../../../../core/services/usuario.service';
import { SancionService } from '../../../../core/services/sancion.service';

@Component({
  selector: 'app-crear-sancion',
  templateUrl: './crear-sancion.page.html',
  styleUrls: ['./crear-sancion.page.scss'],
  standalone: false
})
export class CrearSancionPage implements OnInit {
  form!: FormGroup;
  usuarios: UsuarioAdmin[] = [];
  isLoadingUsuarios = false;
  selectedUsuario: UsuarioAdmin | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private usuarioService: UsuarioService,
    private sancionService: SancionService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      usuario_id: [null, Validators.required],
      tipo: ['Multa', Validators.required],
      monto: [null],
      dias_suspension: [null],
      descripcion: ['', [Validators.required, Validators.minLength(10)]]
    });

    // Cargar usuarios iniciales
    this.buscarUsuarios('');
  }

  async buscarUsuarios(term: string) {
    this.isLoadingUsuarios = true;
    try {
      const filtros: any = {};
      if (term && term.trim().length > 0) {
        filtros.search = term.trim();
      }
      // Obtener usuarios (administrador)
      this.usuarioService.getUsuarios(filtros).subscribe({
        next: (lista) => {
          this.usuarios = lista || [];
        },
        error: (err) => {
          console.error('Error al obtener usuarios', err);
          this.usuarios = [];
        },
        complete: () => {
          this.isLoadingUsuarios = false;
        }
      });
    } catch (e) {
      console.error(e);
      this.isLoadingUsuarios = false;
    }
  }

  seleccionarUsuario(usuario: UsuarioAdmin) {
    this.selectedUsuario = usuario;
    this.form.patchValue({ usuario_id: usuario.id });
  }

  onTipoChange(tipo: string) {
    if (tipo === 'Multa') {
      this.form.get('dias_suspension')?.setValue(null);
    } else {
      this.form.get('monto')?.setValue(null);
    }
  }

  async crear() {
    if (this.form.invalid) {
      await this.mostrarToast('Completa los campos requeridos', 'danger');
      return;
    }

    const loading = await this.loadingController.create({ message: 'Creando sanción...' });
    await loading.present();
    try {
      const value = this.form.value;
      const payload: any = {
        usuario_id: Number(value.usuario_id),
        tipo: value.tipo,
        monto: value.tipo === 'Multa' && value.monto ? Number(value.monto) : undefined,
        dias_suspension: value.tipo === 'Suspensión' && value.dias_suspension ? Number(value.dias_suspension) : undefined,
        descripcion: value.descripcion
      };
      await this.sancionService.crearSancion(payload).toPromise();
      await this.mostrarToast('Sanción creada correctamente', 'success');
      this.router.navigate(['/admin-sanciones']);
    } catch (error: any) {
      console.error('Error creando sanción:', error);
      await this.mostrarToast(error?.message || 'Error al crear sanción', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  cancelar() {
    this.router.navigate(['/admin-sanciones']);
  }

  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, color, duration: 2000 });
    await toast.present();
  }
}