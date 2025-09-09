import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../../edubooks-app/src/app/core/guards/auth-guard';
import { NoAuthGuard } from '../../../edubooks-app/src/app/core/guards/no-auth-guard';

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
    path: '**',
    redirectTo: 'login' // Ruta por defecto para páginas no encontradas
  },
  {
    path: 'catalogo',
    loadChildren: () => import('./pages/catalogo/catalogo.module').then( m => m.CatalogoPageModule)
  },
  {
    path: 'detalle-libro',
    loadChildren: () => import('./pages/detalle-libro/detalle-libro.module').then( m => m.DetalleLibroPageModule)
  },
  {
    path: 'bibliografia',
    loadChildren: () => import('./pages/bibliografia/bibliografia.module').then( m => m.BibliografiaPageModule)
  },
  {
    path: 'admin-libros',
    loadChildren: () => import('./pages/admin-libros/admin-libros.module').then( m => m.AdminLibrosPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }