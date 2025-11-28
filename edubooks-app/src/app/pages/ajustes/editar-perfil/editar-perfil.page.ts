import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
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
  isLoadingPerfil = false;
  loadError = '';

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController,
    private loadingController: LoadingController,
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
          const valid = this.validateUsuarioData(u);
          this.patchUserToForm(valid);
          this.applyRoleValidators();
        } else {
          this.cargarPerfil();
        }
      });
  }

  private async cargarPerfil() {
    this.isLoadingPerfil = true;
    this.loadError = '';
    this.perfilForm.disable({ emitEvent: false });
    const loading = await this.loadingController.create({ message: 'Cargando perfil...', cssClass: 'custom-loading' });
    await loading.present();
    this.usuarioService.obtenerPerfil()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async data => {
          const valid = this.validateUsuarioData(data);
          this.usuarioActual = valid;
          this.patchUserToForm(valid);
          this.applyRoleValidators();
          this.isLoadingPerfil = false;
          this.perfilForm.enable({ emitEvent: false });
          await loading.dismiss();
        },
        error: async (err) => {
          this.loadError = err?.message || 'No se pudo cargar el perfil';
          const toast = await this.toastController.create({
            message: this.loadError,
            duration: 2500,
            color: 'danger'
          });
          await toast.present();
          this.isLoadingPerfil = false;
          this.perfilForm.enable({ emitEvent: false });
          await loading.dismiss();
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

  private validateUsuarioData(data: any): Usuario {
    const out: any = {};
    const s = (v: any) => typeof v === 'string' ? v : v !== undefined && v !== null ? String(v) : '';
    const n = (v: any) => {
      const num = typeof v === 'number' ? v : parseInt(String(v), 10);
      return isNaN(num) ? undefined : num;
    };
    out.id = typeof data?.id === 'number' ? data.id : undefined;
    out.email = s(data?.email);
    out.username = s(data?.username);
    out.nombre = s(data?.nombre);
    out.apellido = s(data?.apellido);
    out.rol = String(data?.rol || '').toLowerCase() as any;
    out.telefono = data?.telefono ? s(data.telefono) : '';
    out.numero_identificacion = data?.numero_identificacion ? s(data.numero_identificacion) : '';
    out.genero = data?.genero ? String(data.genero) as any : undefined;
    const de = data?.datos_estudiante || {};
    const dd = data?.datos_docente || {};
    const da = data?.datos_administrador || {};
    const datos_estudiante: any = {};
    if (de?.carrera !== undefined) datos_estudiante.carrera = s(de.carrera);
    if (de?.matricula !== undefined) datos_estudiante.matricula = s(de.matricula);
    if (de?.semestre_actual !== undefined) datos_estudiante.semestre_actual = n(de.semestre_actual);
    const datos_docente: any = {};
    if (dd?.departamento !== undefined) datos_docente.departamento = s(dd.departamento);
    if (dd?.numero_empleado !== undefined) datos_docente.numero_empleado = s(dd.numero_empleado);
    if (dd?.especialidad !== undefined) datos_docente.especialidad = s(dd.especialidad);
    const datos_administrador: any = {};
    if (da?.area !== undefined) datos_administrador.area = s(da.area);
    if (da?.nivel_acceso !== undefined) datos_administrador.nivel_acceso = s(da.nivel_acceso);
    if (da?.fecha_nombramiento !== undefined) datos_administrador.fecha_nombramiento = s(da.fecha_nombramiento);
    if (Object.keys(datos_estudiante).length) out.datos_estudiante = datos_estudiante;
    if (Object.keys(datos_docente).length) out.datos_docente = datos_docente;
    if (Object.keys(datos_administrador).length) out.datos_administrador = datos_administrador;
    return out as Usuario;
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
