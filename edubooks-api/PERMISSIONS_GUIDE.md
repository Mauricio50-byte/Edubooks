# Sistema de Permisos - Edubooks API v2

## 📋 Descripción General

El sistema de permisos está basado en **roles** y define qué acciones puede realizar cada tipo de usuario en cada módulo del sistema.

## 🎭 Roles Disponibles

### 1. **Super Sys Admin** (`super_sys_admin`)
- Control total del sistema
- Puede gestionar múltiples instituciones
- Acceso a todos los tenants
- Puede crear otros super admins

### 2. **Administrador** (`administrador`)
- Administrador de una institución específica
- Gestiona usuarios, libros y préstamos de su institución
- Puede aplicar sanciones y multas
- Puede generar reportes
- Puede enviar invitaciones

### 3. **Docente** (`docente`)
- Puede solicitar préstamos (hasta 5 libros, 30 días)
- Puede crear reservas
- Puede renovar préstamos
- Puede ver información de estudiantes
- Acceso de solo lectura a la mayoría de módulos

### 4. **Estudiante** (`estudiante`)
- Puede solicitar préstamos (hasta 3 libros, 15 días)
- Puede crear reservas
- Puede renovar préstamos
- Solo puede ver sus propios préstamos y reservas

---

## 🔐 Endpoints de Permisos

### 1. Obtener Mis Permisos
```http
GET /api/permissions/me/
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "role": "administrador",
  "user_info": {
    "uid": "user123",
    "email": "admin@universidad.edu",
    "role": "administrador",
    "tenant_id": "inst_001",
    "is_super_admin": false
  },
  "modules": {
    "books": {
      "create": true,
      "read": true,
      "update": true,
      "delete": true,
      "list": true
    },
    "loans": {
      "create": true,
      "approve": true,
      "reject": true,
      "return": true,
      "list": true
    },
    // ... más módulos
  },
  "special_permissions": {
    "can_manage_users": true,
    "can_manage_books": true,
    "can_apply_sanctions": true,
    "can_generate_reports": true
  }
}
```

### 2. Verificar Permiso Específico
```http
POST /api/permissions/check/
Authorization: Bearer <token>
Content-Type: application/json

{
  "module": "books",
  "action": "create"
}
```

**Respuesta:**
```json
{
  "has_permission": true,
  "role": "administrador",
  "module": "books",
  "action": "create"
}
```

### 3. Obtener Información del Rol
```http
GET /api/permissions/role-info/
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "role": "estudiante",
  "max_loans": 3,
  "loan_duration_days": 15,
  "special_permissions": {
    "can_request_loans": true,
    "can_create_reservations": true,
    "can_view_own_loans": true,
    "can_renew_loans": true
  }
}
```

---

## 📊 Matriz de Permisos por Módulo

### Instituciones
| Acción | Super Admin | Admin | Docente | Estudiante |
|--------|-------------|-------|---------|------------|
| create | ✅ | ❌ | ❌ | ❌ |
| read   | ✅ | ❌ | ❌ | ❌ |
| update | ✅ | ❌ | ❌ | ❌ |
| delete | ✅ | ❌ | ❌ | ❌ |
| list   | ✅ | ❌ | ❌ | ❌ |

### Usuarios
| Acción | Super Admin | Admin | Docente | Estudiante |
|--------|-------------|-------|---------|------------|
| create | ✅ | ✅ | ❌ | ❌ |
| read   | ✅ | ✅ | ✅ | ❌ |
| read_own | ✅ | ✅ | ✅ | ✅ |
| update | ✅ | ✅ | ❌ | ❌ |
| update_own | ✅ | ✅ | ✅ | ✅ |
| delete | ✅ | ✅ | ❌ | ❌ |
| list   | ✅ | ✅ | ✅ | ❌ |
| apply_sanction | ✅ | ✅ | ❌ | ❌ |
| add_fine | ✅ | ✅ | ❌ | ❌ |

### Libros
| Acción | Super Admin | Admin | Docente | Estudiante |
|--------|-------------|-------|---------|------------|
| create | ✅ | ✅ | ❌ | ❌ |
| read   | ✅ | ✅ | ✅ | ✅ |
| update | ✅ | ✅ | ❌ | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ |
| list   | ✅ | ✅ | ✅ | ✅ |
| search_external | ✅ | ✅ | ✅ | ✅ |

### Préstamos
| Acción | Super Admin | Admin | Docente | Estudiante |
|--------|-------------|-------|---------|------------|
| create | ✅ | ✅ | ✅ | ✅ |
| read   | ✅ | ✅ | ✅ | ❌ |
| read_own | ✅ | ✅ | ✅ | ✅ |
| approve | ✅ | ✅ | ❌ | ❌ |
| reject | ✅ | ✅ | ❌ | ❌ |
| return | ✅ | ✅ | ❌ | ❌ |
| renew  | ✅ | ✅ | ✅ | ✅ |
| list   | ✅ | ✅ | ✅ | ❌ |
| list_own | ✅ | ✅ | ✅ | ✅ |
| list_overdue | ✅ | ✅ | ❌ | ❌ |

### Reservas
| Acción | Super Admin | Admin | Docente | Estudiante |
|--------|-------------|-------|---------|------------|
| create | ✅ | ✅ | ✅ | ✅ |
| read   | ✅ | ✅ | ✅ | ❌ |
| read_own | ✅ | ✅ | ✅ | ✅ |
| cancel | ✅ | ✅ | ❌ | ❌ |
| cancel_own | ✅ | ✅ | ✅ | ✅ |
| list   | ✅ | ✅ | ✅ | ❌ |
| list_own | ✅ | ✅ | ✅ | ✅ |

### Invitaciones
| Acción | Super Admin | Admin | Docente | Estudiante |
|--------|-------------|-------|---------|------------|
| create | ✅ | ✅ | ❌ | ❌ |
| read   | ✅ | ✅ | ❌ | ❌ |
| validate | 🌐 Público | 🌐 Público | 🌐 Público | 🌐 Público |
| accept | 🌐 Público | 🌐 Público | 🌐 Público | 🌐 Público |
| cancel | ✅ | ✅ | ❌ | ❌ |
| list   | ✅ | ✅ | ❌ | ❌ |

### Estadísticas
| Acción | Super Admin | Admin | Docente | Estudiante |
|--------|-------------|-------|---------|------------|
| dashboard | ✅ | ✅ | ❌ | ❌ |
| popular_books | ✅ | ✅ | ✅ | ❌ |
| user_activity | ✅ | ✅ | ❌ | ❌ |
| loan_stats | ✅ | ✅ | ❌ | ❌ |

---

## 💻 Uso en el Frontend (Angular/Ionic)

### 1. Servicio de Permisos (TypeScript)

```typescript
// services/permission.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface UserPermissions {
  role: string;
  user_info: {
    uid: string;
    email: string;
    role: string;
    tenant_id: string;
    is_super_admin: boolean;
  };
  modules: {
    [module: string]: {
      [action: string]: boolean;
    };
  };
  special_permissions: {
    [key: string]: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private permissions: UserPermissions | null = null;

  constructor(private http: HttpClient) {}

  loadPermissions(): Observable<UserPermissions> {
    return this.http.get<UserPermissions>('/api/permissions/me/').pipe(
      tap(perms => this.permissions = perms)
    );
  }

  can(module: string, action: string): boolean {
    if (!this.permissions) return false;
    return this.permissions.modules[module]?.[action] || false;
  }

  hasSpecialPermission(permission: string): boolean {
    if (!this.permissions) return false;
    return this.permissions.special_permissions[permission] || false;
  }

  getRole(): string {
    return this.permissions?.role || 'guest';
  }

  isSuperAdmin(): boolean {
    return this.permissions?.user_info.is_super_admin || false;
  }

  isAdmin(): boolean {
    return this.getRole() === 'administrador';
  }

  isTeacher(): boolean {
    return this.getRole() === 'docente';
  }

  isStudent(): boolean {
    return this.getRole() === 'estudiante';
  }

  getMaxLoans(): number {
    // Obtener de role-info endpoint si es necesario
    const role = this.getRole();
    if (role === 'estudiante') return 3;
    if (role === 'docente') return 5;
    return 10;
  }
}
```

### 2. Directiva de Permisos

```typescript
// directives/has-permission.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { PermissionService } from '../services/permission.service';

@Directive({
  selector: '[hasPermission]'
})
export class HasPermissionDirective implements OnInit {
  @Input() hasPermission!: { module: string; action: string };

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {
    const { module, action } = this.hasPermission;
    if (this.permissionService.can(module, action)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
```

### 3. Uso en Templates

```html
<!-- Mostrar botón solo si tiene permiso -->
<ion-button 
  *hasPermission="{ module: 'books', action: 'create' }"
  (click)="createBook()">
  Crear Libro
</ion-button>

<!-- Mostrar sección completa según rol -->
<div *ngIf="permissionService.isAdmin()">
  <h2>Panel de Administración</h2>
  <!-- Contenido solo para admins -->
</div>

<!-- Mostrar según permiso especial -->
<ion-button 
  *ngIf="permissionService.hasSpecialPermission('can_apply_sanctions')"
  (click)="applySanction()">
  Aplicar Sanción
</ion-button>
```

### 4. Guard de Rutas

```typescript
// guards/permission.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredPermission = route.data['permission'];
    
    if (!requiredPermission) return true;

    const { module, action } = requiredPermission;
    
    if (this.permissionService.can(module, action)) {
      return true;
    }

    this.router.navigate(['/unauthorized']);
    return false;
  }
}

// Uso en routing
{
  path: 'books/create',
  component: CreateBookPage,
  canActivate: [PermissionGuard],
  data: { permission: { module: 'books', action: 'create' } }
}
```

---

## 🔧 Configuración por Rol

### Límites de Préstamos
- **Estudiante**: 3 libros, 15 días
- **Docente**: 5 libros, 30 días
- **Administrador**: Sin límite (configurable)

### Permisos Especiales

#### Super Admin
- `can_manage_institutions`: Gestionar instituciones
- `can_access_all_tenants`: Acceso a todos los tenants
- `can_create_super_admins`: Crear otros super admins
- `can_view_system_logs`: Ver logs del sistema

#### Administrador
- `can_manage_users`: Gestionar usuarios
- `can_manage_books`: Gestionar libros
- `can_apply_sanctions`: Aplicar sanciones
- `can_generate_reports`: Generar reportes
- `can_send_invitations`: Enviar invitaciones

#### Docente
- `can_request_loans`: Solicitar préstamos
- `can_view_students`: Ver información de estudiantes
- `can_renew_loans`: Renovar préstamos

#### Estudiante
- `can_request_loans`: Solicitar préstamos
- `can_view_own_loans`: Ver solo sus préstamos
- `can_renew_loans`: Renovar préstamos

---

## 🚀 Mejores Prácticas

1. **Cargar permisos al login**: Llamar a `/api/permissions/me/` después de autenticarse
2. **Cachear permisos**: Guardar en memoria para evitar llamadas repetidas
3. **Validar en backend**: Siempre validar permisos en el servidor, no solo en el frontend
4. **UI adaptativa**: Ocultar/mostrar elementos según permisos
5. **Mensajes claros**: Informar al usuario por qué no puede realizar una acción
6. **Refresh de permisos**: Actualizar si el rol del usuario cambia

---

## ⚠️ Notas Importantes

1. Los permisos se validan tanto en **frontend** (UX) como en **backend** (seguridad)
2. El frontend usa permisos para mostrar/ocultar UI
3. El backend **siempre** valida permisos antes de ejecutar acciones
4. Los permisos `*_own` permiten acceso solo a recursos propios
5. Los endpoints públicos (`*`) no requieren autenticación
