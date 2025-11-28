import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController, ModalController, AlertController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioService, UsuarioAdmin } from '../../../core/services/usuario.service';
import { Router } from '@angular/router';
import { FilterOption } from '../../../shared/componentes/filter-dropdown/filter-dropdown.component';
import { UserDetailsComponent } from '../../../shared/componentes/user-details/user-details.component';
import { firstValueFrom } from 'rxjs';
import { Usuario } from '../../../core/models/usuario.model';

@Component({
  selector: 'app-admin-usuarios',
  templateUrl: './admin-usuarios.page.html',
  styleUrls: ['./admin-usuarios.page.scss'],
  standalone: false
})
export class AdminUsuariosPage implements OnInit {
  usuarios: UsuarioAdmin[] = [];
  isLoading = true;
  error: string = '';
  usuarioActual: Usuario | null = null;
  searchTerm: string = '';
  filtroRol: string = '';
  filtroEstado: string = '';
  filtroGenero: string = '';

  // Opciones para los filtros desplegables
  rolOptions: FilterOption[] = [
    { value: '', label: 'Todos los roles', icon: 'people-outline' },
    { value: 'administrador', label: 'Administradores', icon: 'shield-outline', color: 'danger' },
    { value: 'docente', label: 'Docentes', icon: 'school-outline', color: 'secondary' },
    { value: 'estudiante', label: 'Estudiantes', icon: 'person-outline', color: 'primary' }
  ];

  estadoOptions: FilterOption[] = [
    { value: '', label: 'Todos los estados', icon: 'list-outline' },
    { value: 'activo', label: 'Usuarios Activos', icon: 'checkmark-circle-outline', color: 'success' },
    { value: 'inactivo', label: 'Usuarios Inactivos', icon: 'close-circle-outline', color: 'danger' }
  ];

  generoOptions: FilterOption[] = [
    { value: '', label: 'Todos los géneros', icon: 'transgender-outline' },
    { value: 'M', label: 'Masculino', icon: 'male-outline', color: 'primary' },
    { value: 'F', label: 'Femenino', icon: 'female-outline', color: 'secondary' },
    { value: 'O', label: 'Otro', icon: 'ellipse-outline', color: 'medium' },
    { value: 'N', label: 'Prefiero no decir', icon: 'remove-outline', color: 'tertiary' }
  ];

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private modalController: ModalController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    
    // Verificar que el usuario sea administrador
    if (!this.esAdministrador) {
      this.router.navigate(['/home']);
      return;
    }
    
    this.cargarUsuarios();
  }

  /**
   * Cargar lista de usuarios
   */
  async cargarUsuarios() {
    this.isLoading = true;
    this.error = '';

    try {
      // Llamar al servicio real para obtener usuarios
      const usuarios = await firstValueFrom(this.usuarioService.getUsuarios());
      this.usuarios = usuarios || [];
      
    } catch (error: any) {
      this.error = error.message || 'Error al cargar los usuarios';
      console.error('Error cargando usuarios:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Filtrar usuarios
   */
  get usuariosFiltrados(): UsuarioAdmin[] {
    return this.usuarios.filter(usuario => {
      const cumpleBusqueda = !this.searchTerm || 
        usuario.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        usuario.apellido.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        usuario.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const rolUsuario = (usuario.rol || '').toLowerCase();
      const rolFiltro = (this.filtroRol || '').toLowerCase();
      const cumpleRol = !rolFiltro || rolUsuario === rolFiltro;
      
      const cumpleEstado = !this.filtroEstado || 
        (this.filtroEstado === 'activo' && usuario.is_active) ||
        (this.filtroEstado === 'inactivo' && !usuario.is_active);

      const cumpleGenero = !this.filtroGenero || (usuario.genero || '') === this.filtroGenero;
      
      return cumpleBusqueda && cumpleRol && cumpleEstado && cumpleGenero;
    });
  }

  /**
   * Cambiar estado de usuario
   */
  async toggleEstadoUsuario(usuario: UsuarioAdmin) {
    const alert = await this.alertController.create({
      header: 'Cambiar Estado',
      message: `¿Deseas ${usuario.is_active ? 'desactivar' : 'activar'} al usuario ${usuario.nombre} ${usuario.apellido}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: usuario.is_active ? 'Desactivar' : 'Activar',
          handler: async () => {
            await this.procesarCambioEstado(usuario);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesar cambio de estado
   */
  private async procesarCambioEstado(usuario: UsuarioAdmin) {
    const loading = await this.loadingController.create({
      message: 'Actualizando usuario...'
    });
    await loading.present();

    try {
      // Calcular el nuevo estado (opuesto al actual)
      const nuevoEstado = !usuario.is_active;
      
      // Llamar al servicio real con el nuevo estado
      await firstValueFrom(this.usuarioService.cambiarEstadoUsuario(usuario.id, nuevoEstado));
      
      // Actualizar estado local
      usuario.is_active = nuevoEstado;
      
      await loading.dismiss();
      await this.mostrarToast(`Usuario ${usuario.is_active ? 'activado' : 'desactivado'} exitosamente`, 'success');

    } catch (error: any) {
      await loading.dismiss();
      await this.mostrarToast(error.message || 'Error al actualizar el usuario', 'danger');
    }
  }

  /**
   * Ver detalles del usuario
   */
  async verDetallesUsuario(usuario: UsuarioAdmin) {
    const modal = await this.modalController.create({
      component: UserDetailsComponent,
      componentProps: { usuario },
      cssClass: 'user-details-modal'
    });

    await modal.present();
  }

  /**
   * Refrescar datos
   */
  async doRefresh(event: any) {
    await this.cargarUsuarios();
    event.target.complete();
  }

  /**
   * Mostrar toast
   */
  private async mostrarToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Verificar si el usuario es administrador
   */
  get esAdministrador(): boolean {
    return this.usuarioActual?.rol === 'administrador';
  }

  /**
   * Obtener color del estado
   */
  getEstadoColor(activo: boolean): string {
    return activo ? 'success' : 'danger';
  }

  /**
   * Obtener color del rol
   */
  getRolColor(rol: string): string {
    const r = (rol || '').toLowerCase();
    switch (r) {
      case 'administrador': return 'danger';
      case 'docente': return 'secondary';
      case 'estudiante': return 'primary';
      default: return 'medium';
    }
  }

  /**
   * Obtener cantidad de usuarios activos
   */
  getUsuariosActivos(): number {
    return this.usuarios.filter(u => u && u.is_active === true).length;
  }

  /**
   * Obtener cantidad de usuarios inactivos
   */
  getUsuariosInactivos(): number {
    return this.usuarios.filter(u => u && u.is_active === false).length;
  }


  /**
   * Obtener icono del rol
   */
  getRolIcon(rol: string): string {
    const r = (rol || '').toLowerCase();
    switch (r) {
      case 'administrador': return 'shield-outline';
      case 'docente': return 'school-outline';
      case 'estudiante': return 'person-outline';
      default: return 'person-outline';
    }
  }

  getGeneroLabel(genero?: string): string {
    switch (genero) {
      case 'M': return 'Masculino';
      case 'F': return 'Femenino';
      case 'O': return 'Otro';
      case 'N': return 'Prefiero no decir';
      default: return 'Sin especificar';
    }
  }

  getGeneroColor(genero?: string): string {
    switch (genero) {
      case 'M': return 'primary';
      case 'F': return 'secondary';
      case 'O': return 'medium';
      case 'N': return 'tertiary';
      default: return 'medium';
    }
  }

  getGeneroIcon(genero?: string): string {
    switch (genero) {
      case 'M': return 'male-outline';
      case 'F': return 'female-outline';
      case 'O': return 'ellipse-outline';
      case 'N': return 'remove-outline';
      default: return 'transgender-outline';
    }
  }

  /**
   * Inicial para avatar de usuario
   */
  getInicialUsuario(usuario: UsuarioAdmin): string {
    const base = usuario.nombre || usuario.username || usuario.email || '';
    return base ? base.charAt(0).toUpperCase() : 'U';
  }

  /**
   * Clase de color para avatar según rol
   */
  getRolAvatarClass(rol: string): string {
    const r = (rol || '').toLowerCase();
    switch (r) {
      case 'administrador': return 'rol-admin';
      case 'docente': return 'rol-docente';
      case 'estudiante': return 'rol-estudiante';
      default: return 'rol-default';
    }
  }

  // Filtros de rol y estado ahora se actualizan vía two-way binding

  selectGenero(value: string) {
    this.filtroGenero = value;
  }

  // Nueva acción: limpiar filtros globales
  onLimpiarFiltros() {
    this.searchTerm = '';
    this.filtroRol = '';
    this.filtroEstado = '';
    this.filtroGenero = '';
  }
}
