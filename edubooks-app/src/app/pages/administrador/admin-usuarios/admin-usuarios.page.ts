import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioService, UsuarioAdmin } from '../../../core/services/usuario.service';
import { Router } from '@angular/router';
import { FilterOption } from '../../../shared/componentes/filter-dropdown/filter-dropdown.component';

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
  usuarioActual: any = null;
  searchTerm: string = '';
  filtroRol: string = '';
  filtroEstado: string = '';

  // Opciones para los filtros desplegables
  rolOptions: FilterOption[] = [
    { value: '', label: 'Todos los roles', icon: 'people-outline' },
    { value: 'Administrador', label: 'Administradores', icon: 'shield-outline', color: 'danger' },
    { value: 'Docente', label: 'Docentes', icon: 'school-outline', color: 'warning' },
    { value: 'Estudiante', label: 'Estudiantes', icon: 'person-outline', color: 'primary' }
  ];

  estadoOptions: FilterOption[] = [
    { value: '', label: 'Todos los estados', icon: 'list-outline' },
    { value: 'activo', label: 'Usuarios Activos', icon: 'checkmark-circle-outline', color: 'success' },
    { value: 'inactivo', label: 'Usuarios Inactivos', icon: 'close-circle-outline', color: 'danger' }
  ];

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
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
      const usuarios = await this.usuarioService.getUsuarios().toPromise();
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
  get usuariosFiltrados() {
    return this.usuarios.filter(usuario => {
      const cumpleBusqueda = !this.searchTerm || 
        usuario.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        usuario.apellido.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        usuario.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const cumpleRol = !this.filtroRol || usuario.rol === this.filtroRol;
      
      const cumpleEstado = !this.filtroEstado || 
        (this.filtroEstado === 'activo' && usuario.is_active) ||
        (this.filtroEstado === 'inactivo' && !usuario.is_active);
      
      return cumpleBusqueda && cumpleRol && cumpleEstado;
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
      // Llamar al servicio real
      await this.usuarioService.cambiarEstadoUsuario(usuario.id).toPromise();
      
      // Actualizar estado local
      usuario.is_active = !usuario.is_active;
      
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
  async verDetallesUsuario(usuario: any) {
    const alert = await this.alertController.create({
      header: `${usuario.nombre} ${usuario.apellido}`,
      message: `
        <strong>Email:</strong> ${usuario.email}<br>
        <strong>Username:</strong> ${usuario.username}<br>
        <strong>Rol:</strong> ${usuario.rol}<br>
        ${usuario.matricula ? `<strong>Matrícula:</strong> ${usuario.matricula}<br>` : ''}
        ${usuario.carrera ? `<strong>Carrera:</strong> ${usuario.carrera}<br>` : ''}
        ${usuario.departamento ? `<strong>Departamento:</strong> ${usuario.departamento}<br>` : ''}
        <strong>Estado:</strong> ${usuario.is_active ? 'Activo' : 'Inactivo'}
      `,
      buttons: ['Cerrar']
    });

    await alert.present();
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
    switch (rol) {
      case 'Administrador': return 'danger';
      case 'Docente': return 'warning';
      case 'Estudiante': return 'primary';
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
   * Manejar cambio en filtro de rol
   */
  onRolFilterChange(value: string | string[]) {
    this.filtroRol = Array.isArray(value) ? value[0] || '' : value;
  }

  /**
   * Manejar cambio en filtro de estado
   */
  onEstadoFilterChange(value: string | string[]) {
    this.filtroEstado = Array.isArray(value) ? value[0] || '' : value;
  }

  /**
   * Obtener icono del rol
   */
  getRolIcon(rol: string): string {
    switch (rol) {
      case 'Administrador': return 'shield-outline';
      case 'Docente': return 'school-outline';
      case 'Estudiante': return 'person-outline';
      default: return 'person-outline';
    }
  }
}
