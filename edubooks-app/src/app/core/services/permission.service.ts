import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Usuario } from '../models/usuario.model';

export interface Permission {
  action: string; // 'create', 'read', 'update', 'delete'
  resource: string; // 'libro', 'prestamo', 'usuario', 'sancion', etc.
}

export interface RolePermissions {
  [key: string]: {
    [resource: string]: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  
  // Definición de permisos por rol
  private rolePermissions: RolePermissions = {
    'administrador': {
      'libro': ['create', 'read', 'update', 'delete'],
      'prestamo': ['create', 'read', 'update', 'delete'],
      'usuario': ['create', 'read', 'update', 'delete'],
      'sancion': ['create', 'read', 'update', 'delete'],
      'multa': ['create', 'read', 'update', 'delete'],
      'notificacion': ['create', 'read', 'update', 'delete'],
      'reporte': ['create', 'read', 'update', 'delete']
    },
    'docente': {
      'libro': ['create', 'read', 'update'],
      'prestamo': ['read', 'update'],
      'usuario': ['read'],
      'sancion': ['read'],
      'multa': ['read'],
      'notificacion': ['read'],
      'reporte': ['read']
    },
    'estudiante': {
      'libro': ['read'],
      'prestamo': ['create', 'read'],
      'usuario': ['read'], // Solo su propio perfil
      'sancion': ['read'], // Solo sus propias sanciones
      'multa': ['read'], // Solo sus propias multas
      'notificacion': ['read'] // Solo sus propias notificaciones
    }
  };

  constructor(private authService: AuthService) {}

  /**
   * Verifica si el usuario actual tiene un permiso específico
   */
  hasPermission(permission: Permission): boolean {
    const user = this.authService.currentUserValue;
    if (!user) {
      return false;
    }

    return this.userHasPermission(user, permission);
  }

  /**
   * Verifica si un usuario específico tiene un permiso
   */
  userHasPermission(user: Usuario, permission: Permission): boolean {
    const { action, resource } = permission;
    const userRole = user.rol;

    // Verificar si el rol existe en la configuración
    if (!this.rolePermissions[userRole]) {
      return false;
    }

    // Verificar si el recurso existe para el rol
    const roleResourcePermissions = this.rolePermissions[userRole][resource];
    if (!roleResourcePermissions) {
      return false;
    }

    // Verificar si la acción está permitida
    return roleResourcePermissions.includes(action);
  }

  /**
   * Verifica si el usuario actual tiene alguno de los roles especificados
   */
  hasRole(roles: string | string[]): boolean {
    const user = this.authService.currentUserValue;
    if (!user) {
      return false;
    }

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return requiredRoles.includes(user.rol);
  }

  /**
   * Verifica si el usuario actual es administrador
   */
  isAdmin(): boolean {
    return this.hasRole('administrador');
  }

  /**
   * Verifica si el usuario actual es docente
   */
  isTeacher(): boolean {
    return this.hasRole('docente');
  }

  /**
   * Verifica si el usuario actual es estudiante
   */
  isStudent(): boolean {
    return this.hasRole('estudiante');
  }

  /**
   * Obtiene todos los permisos de un rol específico
   */
  getRolePermissions(role: string): { [resource: string]: string[] } {
    return this.rolePermissions[role] || {};
  }

  /**
   * Verifica si el usuario puede acceder a un recurso específico (cualquier acción)
   */
  canAccessResource(resource: string): boolean {
    const user = this.authService.currentUserValue;
    if (!user) {
      return false;
    }

    const roleResourcePermissions = this.rolePermissions[user.rol]?.[resource];
    return roleResourcePermissions && roleResourcePermissions.length > 0;
  }

  /**
   * Obtiene las acciones permitidas para un recurso específico
   */
  getAllowedActions(resource: string): string[] {
    const user = this.authService.currentUserValue;
    if (!user) {
      return [];
    }

    return this.rolePermissions[user.rol]?.[resource] || [];
  }

  /**
   * Verifica permisos múltiples (AND lógico)
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Verifica permisos múltiples (OR lógico)
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }
}