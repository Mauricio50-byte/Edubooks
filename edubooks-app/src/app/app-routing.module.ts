import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../../edubooks-app/src/app/core/guards/auth-guard';
import { NoAuthGuard } from '../../../edubooks-app/src/app/core/guards/no-auth-guard';
import { RoleGuard } from '../../../edubooks-app/src/app/core/guards/role.guard';
import { SetupGuard } from '../../../edubooks-app/src/app/core/guards/setup.guard';
import { SystemInitGuard } from '../../../edubooks-app/src/app/core/guards/system-init.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'setup',
    loadChildren: () => import('./pages/setup/setup.module').then( m => m.SetupPageModule),
    canActivate: [SetupGuard] // Solo accesible si el sistema NO está inicializado
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule),
    canActivate: [SystemInitGuard, NoAuthGuard] // Verificar inicialización y que NO esté autenticado
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then( m => m.RegisterPageModule),
    canActivate: [SystemInitGuard, NoAuthGuard] // Verificar inicialización y que NO esté autenticado
  },
  {
    path: 'register-invitation/:token',
    loadChildren: () => import('./pages/register/register-invitation.module').then( m => m.RegisterInvitationPageModule),
    canActivate: [SystemInitGuard, NoAuthGuard] // Verificar inicialización y que NO esté autenticado
  },
  {
    path: 'auth/callback',
    loadChildren: () => import('./shared/componentes/auth/callback/callback.module').then( m => m.CallbackPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule),
    canActivate: [SystemInitGuard, AuthGuard] // Verificar inicialización y que esté autenticado
  },
  {
    path: 'dashboard',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'catalogo',
    loadChildren: () => import('./pages/catalogo/catalogo.module').then( m => m.CatalogoPageModule),
    canActivate: [SystemInitGuard, AuthGuard] // Verificar inicialización y que esté autenticado
  },
  {
    path: 'detalle-libro',
    loadChildren: () => import('./pages/detalle-libro/detalle-libro.module').then( m => m.DetalleLibroPageModule),
    canActivate: [SystemInitGuard, AuthGuard] // Verificar inicialización y que esté autenticado
  },
  {
    path: 'bibliografia',
    loadChildren: () => import('./pages/docente_y_estudiante/bibliografia/bibliografia.module').then( m => m.BibliografiaPageModule),
    canActivate: [SystemInitGuard, AuthGuard] // Verificar inicialización y que esté autenticado
  },
  {
    path: 'admin-libros',
    loadChildren: () => import('./pages/administrador/admin-libros/admin-libros.module').then( m => m.AdminLibrosPageModule),
    canActivate: [SystemInitGuard, AuthGuard, RoleGuard],
    data: { roles: ['administrador', 'docente'] }
  },
  {
    path: 'bibliografia-estudiante',
    loadChildren: () => import('./pages/docente_y_estudiante/bibliografia-estudiante/bibliografia-estudiante.module').then( m => m.BibliografiaEstudiantePageModule),
    canActivate: [SystemInitGuard, AuthGuard] // Verificar inicialización y que esté autenticado
  },
  {
    path: 'historial-prestamos',
    loadChildren: () => import('./pages/docente_y_estudiante/historial-prestamos/historial-prestamos.module').then( m => m.HistorialPrestamosPageModule),
    canActivate: [SystemInitGuard, AuthGuard] // Verificar inicialización y que esté autenticado
  },
  {
    path: 'notificaciones',
    loadChildren: () => import('./pages/notificaciones/notificaciones.module').then( m => m.NotificacionesPageModule),
    canActivate: [SystemInitGuard, AuthGuard] // Verificar inicialización y que esté autenticado
  },
  {
    path: 'admin-usuarios',
    loadChildren: () => import('./pages/administrador/admin-usuarios/admin-usuarios.module').then( m => m.AdminUsuariosPageModule),
    canActivate: [SystemInitGuard, AuthGuard, RoleGuard],
    data: { roles: ['administrador'] }
  },
  {
    path: 'admin-prestamos',
    loadChildren: () => import('./pages/administrador/admin-prestamos/admin-prestamos.module').then( m => m.AdminPrestamosPageModule),
    canActivate: [SystemInitGuard, AuthGuard, RoleGuard],
    data: { roles: ['administrador', 'docente'] }
  },
  {
    path: 'admin-sanciones',
    loadChildren: () => import('./pages/administrador/admin-sanciones/admin-sanciones.module').then( m => m.AdminSancionesPageModule),
    canActivate: [SystemInitGuard, AuthGuard, RoleGuard],
    data: { roles: ['administrador'] }
  },
  {
    path: 'sanciones',
    loadChildren: () => import('./pages/docente_y_estudiante/sanciones/sanciones.module').then( m => m.SancionesPageModule),
    canActivate: [SystemInitGuard, AuthGuard, RoleGuard],
    data: { roles: ['administrador', 'estudiante', 'docente'] }
  },
  {
    path: 'admin-solicitudes',
    loadChildren: () => import('./pages/administrador/admin-solicitudes/admin-solicitudes.module').then( m => m.AdminSolicitudesPageModule),
    canActivate: [SystemInitGuard, AuthGuard, RoleGuard],
    data: { roles: ['administrador', 'docente'] }
  },
  {
    path: 'admin-invitaciones',
    loadChildren: () => import('./pages/administrador/admin-invitaciones/admin-invitaciones.module').then( m => m.AdminInvitacionesPageModule),
    canActivate: [SystemInitGuard, AuthGuard, RoleGuard],
    data: { roles: ['administrador'] }
  },
  {
    path: 'mis-solicitudes',
    loadChildren: () => import('./pages/docente_y_estudiante/mis-solicitudes/mis-solicitudes.module').then( m => m.MisSolicitudesPageModule),
    canActivate: [SystemInitGuard, AuthGuard] // Verificar inicialización y que esté autenticado
  },
  {
    path: 'ajustes/editar-perfil',
    loadChildren: () => import('./pages/ajustes/editar-perfil/editar-perfil.module').then(m => m.EditarPerfilPageModule),
    canActivate: [SystemInitGuard, AuthGuard]
  },
  {
    path: 'ajustes/ayuda',
    loadChildren: () => import('./pages/ajustes/ayuda/ayuda.module').then(m => m.AyudaPageModule),
    canActivate: [SystemInitGuard, AuthGuard]
  },
  {
    path: 'ajustes/comentarios',
    loadChildren: () => import('./pages/ajustes/comentarios/comentarios.module').then(m => m.ComentariosPageModule),
    canActivate: [SystemInitGuard, AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'login' // Ruta por defecto para páginas no encontradas
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }