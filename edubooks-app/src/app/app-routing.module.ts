import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../../edubooks-app/src/app/core/guards/auth-guard';
import { NoAuthGuard } from '../../../edubooks-app/src/app/core/guards/no-auth-guard';
import { RoleGuard } from '../../../edubooks-app/src/app/core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule),
    canActivate: [NoAuthGuard] // Solo accesible si NO está autenticado
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then( m => m.RegisterPageModule),
    canActivate: [NoAuthGuard] // Solo accesible si NO está autenticado
  },
  {
    path: 'auth/callback',
    loadChildren: () => import('./shared/componentes/auth/callback/callback.module').then( m => m.CallbackPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule),
    canActivate: [AuthGuard] // Solo accesible si está autenticado
  },
  {
    path: 'dashboard',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'catalogo',
    loadChildren: () => import('./pages/docente_y_estudiante/catalogo/catalogo.module').then( m => m.CatalogoPageModule),
    canActivate: [AuthGuard] // Solo accesible si está autenticado
  },
  {
    path: 'detalle-libro',
    loadChildren: () => import('./pages/docente_y_estudiante/detalle-libro/detalle-libro.module').then( m => m.DetalleLibroPageModule),
    canActivate: [AuthGuard] // Solo accesible si está autenticado
  },
  {
    path: 'bibliografia',
    loadChildren: () => import('./pages/docente_y_estudiante/bibliografia/bibliografia.module').then( m => m.BibliografiaPageModule),
    canActivate: [AuthGuard] // Solo accesible si está autenticado
  },
  {
    path: 'admin-libros',
    loadChildren: () => import('./pages/administrador/admin-libros/admin-libros.module').then( m => m.AdminLibrosPageModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Administrador', 'Docente'] }
  },
  {
    path: 'bibliografia-estudiante',
    loadChildren: () => import('./pages/docente_y_estudiante/bibliografia-estudiante/bibliografia-estudiante.module').then( m => m.BibliografiaEstudiantePageModule),
    canActivate: [AuthGuard] // Solo accesible si está autenticado
  },
  {
    path: 'historial-prestamos',
    loadChildren: () => import('./pages/docente_y_estudiante/historial-prestamos/historial-prestamos.module').then( m => m.HistorialPrestamosPageModule),
    canActivate: [AuthGuard] // Solo accesible si está autenticado
  },
  {
    path: 'notificaciones',
    loadChildren: () => import('./pages/docente_y_estudiante/notificaciones/notificaciones.module').then( m => m.NotificacionesPageModule),
    canActivate: [AuthGuard] // Solo accesible si está autenticado
  },
  {
    path: 'admin-usuarios',
    loadChildren: () => import('./pages/administrador/admin-usuarios/admin-usuarios.module').then( m => m.AdminUsuariosPageModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: 'admin-prestamos',
    loadChildren: () => import('./pages/administrador/admin-prestamos/admin-prestamos.module').then( m => m.AdminPrestamosPageModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Administrador', 'Docente'] }
  },
  {
    path: 'sanciones',
    loadChildren: () => import('./pages/docente_y_estudiante/sanciones/sanciones.module').then( m => m.SancionesPageModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: 'admin-solicitudes',
    loadChildren: () => import('./pages/administrador/admin-solicitudes/admin-solicitudes.module').then( m => m.AdminSolicitudesPageModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['Administrador', 'Docente'] }
  },
  {
    path: 'mis-solicitudes',
    loadChildren: () => import('./pages/docente_y_estudiante/mis-solicitudes/mis-solicitudes.module').then( m => m.MisSolicitudesPageModule),
    canActivate: [AuthGuard] // Solo accesible si está autenticado
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