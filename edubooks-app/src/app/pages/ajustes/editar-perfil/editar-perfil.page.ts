import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { Usuario } from '../../../core/models/usuario.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-ajustes-editar-perfil',
  templateUrl: './editar-perfil.page.html',
  styleUrls: ['./editar-perfil.page.scss'],
  standalone: false,
})
export class EditarPerfilPage implements OnInit, OnDestroy {
  perfilForm: FormGroup;
  isSaving = false;
  usuarioActual: Usuario | null = null;
  passwordForm: FormGroup;
  isChangingPassword = false;
  destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController,
    private authService: AuthService,
    private usuarioService: UsuarioService
  ) {
    this.perfilForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      telefono: [''],
      numero_identificacion: [''],
      genero: [''],
      datos_estudiante: this.fb.group({
        carrera: [''],
        matricula: [''],
        semestre_actual: [''],
      }),
      datos_docente: this.fb.group({
        departamento: [''],
        numero_empleado: [''],
        especialidad: [''],
      }),
      datos_administrador: this.fb.group({
        area: [''],
        nivel_acceso: [''],
        fecha_nombramiento: [''],
      })
    });

    this.passwordForm = this.fb.group({
      password_actual: ['', [Validators.required, Validators.minLength(8)]],
      password_nueva: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        this.usuarioActual = u;
        if (u) {
          this.patchUserToForm(u);
          this.applyRoleValidators();
        } else {
          this.usuarioService.obtenerPerfil().subscribe({
            next: data => {
              this.usuarioActual = data;
              this.patchUserToForm(data);
              this.applyRoleValidators();
            }
          });
        }
      });
  }

  async guardarCambios() {
    if (this.perfilForm.invalid) return;
    this.isSaving = true;
    const payload = this.buildPayload();
    this.usuarioService.actualizarPerfil(payload).subscribe({
      next: async () => {
        const toast = await this.toastController.create({
          message: 'Perfil actualizado',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        this.isSaving = false;
      },
      error: async (err) => {
        const toast = await this.toastController.create({
          message: err?.message || 'Error al actualizar',
          duration: 2500,
          color: 'danger'
        });
        await toast.present();
        this.isSaving = false;
      }
    });
  }

  get rol(): string | undefined {
    const r = this.usuarioActual?.rol;
    return r ? r.toLowerCase() : undefined;
  }

  private buildPayload(): any {
    const value = this.perfilForm.value;
    const base: any = {
      nombre: value.nombre,
      apellido: value.apellido,
      username: value.username,
      telefono: value.telefono,
      numero_identificacion: value.numero_identificacion,
      genero: value.genero,
    };
    if (this.rol === 'estudiante') {
      base.datos_estudiante = value.datos_estudiante;
    } else if (this.rol === 'docente') {
      base.datos_docente = value.datos_docente;
    } else if (this.rol === 'administrador') {
      base.datos_administrador = value.datos_administrador;
    }
    return base;
  }

  private applyRoleValidators(): void {
    const role = this.rol;
    const estudianteGroup = this.perfilForm.get('datos_estudiante') as FormGroup;
    const docenteGroup = this.perfilForm.get('datos_docente') as FormGroup;
    const adminGroup = this.perfilForm.get('datos_administrador') as FormGroup;

    if (role === 'estudiante') {
      estudianteGroup.get('carrera')?.setValidators([Validators.required]);
      estudianteGroup.get('matricula')?.setValidators([Validators.required]);
      estudianteGroup.get('semestre_actual')?.setValidators([]);
      estudianteGroup.updateValueAndValidity({ onlySelf: true });
    } else if (role === 'docente') {
      docenteGroup.get('departamento')?.setValidators([Validators.required]);
      docenteGroup.get('numero_empleado')?.setValidators([Validators.required]);
      docenteGroup.get('especialidad')?.setValidators([]);
      docenteGroup.get('grado_academico')?.setValidators([]);
      docenteGroup.updateValueAndValidity({ onlySelf: true });
    } else if (role === 'administrador') {
      adminGroup.get('area')?.setValidators([Validators.required]);
      adminGroup.get('nivel_acceso')?.setValidators([]);
      adminGroup.get('fecha_nombramiento')?.setValidators([]);
      adminGroup.updateValueAndValidity({ onlySelf: true });
    }
  }

  private passwordMatchValidator(form: FormGroup) {
    const p1 = form.get('password_nueva');
    const p2 = form.get('password_confirm');
    if (p1 && p2 && p1.value !== p2.value) {
      p2.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    if (p2?.hasError('passwordMismatch')) {
      const errors = { ...p2.errors };
      delete (errors as any)['passwordMismatch'];
      if (!Object.keys(errors).length) {
        p2.setErrors(null);
      } else {
        p2.setErrors(errors);
      }
    }
    return null;
  }

  async cambiarPassword() {
    if (this.passwordForm.invalid) return;
    this.isChangingPassword = true;
    const { password_actual, password_nueva } = this.passwordForm.value;
    this.usuarioService.cambiarPassword(password_actual, password_nueva).subscribe({
      next: async () => {
        const toast = await this.toastController.create({
          message: 'Contraseña actualizada',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        this.isChangingPassword = false;
        this.passwordForm.reset();
      },
      error: async (err) => {
        const toast = await this.toastController.create({
          message: err?.message || 'Error al actualizar contraseña',
          duration: 2500,
          color: 'danger'
        });
        await toast.present();
        this.isChangingPassword = false;
      }
    });
  }

  private patchUserToForm(u: Usuario): void {
    this.perfilForm.patchValue({
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      username: u.username || '',
      telefono: u.telefono || '',
      numero_identificacion: u.numero_identificacion || '',
      genero: u.genero || '',
    });

    const estudiante = u.datos_estudiante || {} as any;
    const docente = u.datos_docente || {} as any;
    const admin = u.datos_administrador || {} as any;

    (this.perfilForm.get('datos_estudiante') as FormGroup)?.patchValue({
      carrera: estudiante.carrera || '',
      matricula: estudiante.matricula || '',
      semestre_actual: estudiante.semestre_actual || '',
    });

    (this.perfilForm.get('datos_docente') as FormGroup)?.patchValue({
      departamento: docente.departamento || '',
      numero_empleado: docente.numero_empleado || '',
      especialidad: docente.especialidad || '',
    });

    (this.perfilForm.get('datos_administrador') as FormGroup)?.patchValue({
      area: admin.area || '',
      nivel_acceso: admin.nivel_acceso || '',
      fecha_nombramiento: admin.fecha_nombramiento || '',
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
