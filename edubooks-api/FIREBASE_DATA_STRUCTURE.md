# Estructura de Datos Firebase - Edubooks API v2

Este documento describe la estructura de datos en Firebase Realtime Database para el sistema multi-tenant de Edubooks.

## Estructura General

```json
{
  "sys_admin": {
    "users": { ... },
    "instituciones_registry": { ... }
  },
  "tenants": {
    "inst_id_1": { ... },
    "inst_id_2": { ... }
  }
}
```

## 1. Nodo `sys_admin`

Contiene información del sistema global, accesible solo por Super Administradores.

### 1.1 `sys_admin/users`

Usuarios con rol de Super Administrador del sistema.

```json
{
  "sys_admin": {
    "users": {
      "uid_superadmin_1": {
        "email": "admin@edubooks.com",
        "name": "Super Admin",
        "role": "super_sys_admin",
        "created_at": 1234567890000,
        "active": true
      }
    }
  }
}
```

### 1.2 `sys_admin/instituciones_registry`

Registro de todas las instituciones (tenants) del sistema.

```json
{
  "sys_admin": {
    "instituciones_registry": {
      "inst_abc123": {
        "id": "inst_abc123",
        "name": "Universidad Nacional",
        "plan": "premium",
        "active": true,
        "created_at": 1234567890000,
        "updated_at": 1234567890000
      }
    }
  }
}
```

## 2. Nodo `tenants`

Cada institución tiene su propio nodo con datos completamente aislados.

### 2.1 Estructura de un Tenant

```json
{
  "tenants": {
    "inst_abc123": {
      "config": { ... },
      "profile": { ... },
      "users": { ... },
      "inventory": { ... },
      "transactions": {
        "loans": { ... },
        "reservations": { ... },
        "sanctions": { ... }
      },
      "stats": { ... }
    }
  }
}
```

### 2.2 `config` - Configuración del Tenant

```json
{
  "config": {
    "max_loans_per_student": 3,
    "max_loans_per_teacher": 5,
    "loan_days": 15,
    "max_renewals": 2,
    "fine_per_day": 5.0,
    "reservation_expiry_days": 3
  }
}
```

### 2.3 `profile` - Perfil de la Institución

```json
{
  "profile": {
    "name": "Universidad Nacional",
    "plan": "premium",
    "logo_url": "https://...",
    "contact_email": "biblioteca@universidad.edu",
    "contact_phone": "+57 123 456 7890"
  }
}
```

### 2.4 `users` - Usuarios del Tenant

```json
{
  "users": {
    "user_uid_1": {
      "uid": "user_uid_1",
      "email": "juan@universidad.edu",
      "nombre": "Juan",
      "apellido": "Pérez",
      "role": "estudiante",
      "tenant_id": "inst_abc123",
      "created_at": 1234567890000,
      "updated_at": 1234567890000,
      "active": true,
      "estado": "activo",
      
      "prestamos_activos": 2,
      "max_prestamos_permitidos": 3,
      "multas_pendientes": 0.0,
      "sancionado_hasta": null,
      
      "perfil_estudiante": {
        "carrera": "Ingeniería de Sistemas",
        "matricula": "2024001",
        "semestre_actual": 5,
        "turno": "matutino"
      }
    },
    "user_uid_2": {
      "uid": "user_uid_2",
      "email": "prof.ana@universidad.edu",
      "nombre": "Ana",
      "apellido": "García",
      "role": "docente",
      "tenant_id": "inst_abc123",
      "created_at": 1234567890000,
      "updated_at": 1234567890000,
      "active": true,
      "estado": "activo",
      
      "prestamos_activos": 1,
      "max_prestamos_permitidos": 5,
      "multas_pendientes": 0.0,
      "sancionado_hasta": null,
      
      "perfil_docente": {
        "numero_empleado": "DOC-001",
        "departamento": "Ciencias de la Computación",
        "especialidad": "Inteligencia Artificial",
        "grado_academico": "doctorado"
      }
    },
    "user_uid_3": {
      "uid": "user_uid_3",
      "email": "admin@universidad.edu",
      "nombre": "Carlos",
      "apellido": "López",
      "role": "administrador",
      "tenant_id": "inst_abc123",
      "created_at": 1234567890000,
      "updated_at": 1234567890000,
      "active": true,
      "estado": "activo",
      
      "prestamos_activos": 0,
      "max_prestamos_permitidos": 5,
      "multas_pendientes": 0.0,
      "sancionado_hasta": null,
      
      "perfil_administrador": {
        "area": "biblioteca",
        "cargo": "Jefe de Biblioteca",
        "nivel_acceso": 3,
        "permisos": {
          "puede_crear_usuarios": true,
          "puede_modificar_usuarios": true,
          "puede_eliminar_usuarios": false,
          "puede_gestionar_libros": true,
          "puede_gestionar_prestamos": true,
          "puede_aplicar_sanciones": true,
          "puede_generar_reportes": true
        }
      }
    }
  }
}
```

### 2.5 `inventory` - Inventario de Libros

```json
{
  "inventory": {
    "book_xyz789": {
      "id": "book_xyz789",
      "titulo": "Clean Code",
      "autor": "Robert C. Martin",
      "isbn": "9780132350884",
      "editorial": "Prentice Hall",
      "año_publicacion": 2008,
      "categoria": "Programación",
      "ubicacion": "A1-001",
      "descripcion": "A Handbook of Agile Software Craftsmanship",
      "imagen_portada": "https://...",
      
      "cantidad_total": 5,
      "cantidad_disponible": 3,
      "estado": "Disponible",
      
      "created_at": 1234567890000,
      "updated_at": 1234567890000
    }
  }
}
```

### 2.6 `transactions/loans` - Préstamos

```json
{
  "transactions": {
    "loans": {
      "loan_abc123": {
        "id": "loan_abc123",
        "book_id": "book_xyz789",
        "user_uid": "user_uid_1",
        "status": "active",
        "created_at": 1234567890000,
        "updated_at": 1234567890000,
        "fecha_devolucion_esperada": 1235000000000,
        "fecha_devolucion_real": null,
        "renovaciones": 0,
        "aprobado_por": "user_uid_3",
        "fecha_aprobacion": 1234567890000,
        "observaciones": ""
      },
      "loan_def456": {
        "id": "loan_def456",
        "book_id": "book_xyz789",
        "user_uid": "user_uid_2",
        "status": "pending",
        "created_at": 1234567890000,
        "updated_at": 1234567890000,
        "fecha_devolucion_esperada": null,
        "fecha_devolucion_real": null,
        "renovaciones": 0,
        "aprobado_por": null,
        "fecha_aprobacion": null,
        "observaciones": ""
      }
    }
  }
}
```

**Estados de préstamo:**
- `pending`: Solicitud pendiente de aprobación
- `active`: Préstamo activo
- `returned`: Libro devuelto
- `rejected`: Solicitud rechazada
- `overdue`: Préstamo vencido

### 2.7 `transactions/reservations` - Reservas

```json
{
  "transactions": {
    "reservations": {
      "res_abc123": {
        "id": "res_abc123",
        "book_id": "book_xyz789",
        "user_uid": "user_uid_1",
        "status": "active",
        "created_at": 1234567890000,
        "expiry_date": 1234800000000
      }
    }
  }
}
```

**Estados de reserva:**
- `active`: Reserva activa
- `completed`: Reserva completada (convertida en préstamo)
- `cancelled`: Reserva cancelada
- `expired`: Reserva expirada

### 2.8 `transactions/sanctions` - Sanciones y Multas

```json
{
  "transactions": {
    "sanctions": {
      "sanc_abc123": {
        "id": "sanc_abc123",
        "user_uid": "user_uid_1",
        "tipo": "suspension",
        "dias": 7,
        "motivo": "Retraso en devolución",
        "fecha_inicio": 1234567890000,
        "fecha_fin": 1235000000000,
        "estado": "activa"
      },
      "sanc_def456": {
        "id": "sanc_def456",
        "user_uid": "user_uid_1",
        "tipo": "multa",
        "monto": 35.0,
        "concepto": "Retraso de 7 días en devolución de libro",
        "fecha_inicio": 1234567890000,
        "estado": "activa"
      }
    }
  }
}
```

**Tipos de sanción:**
- `suspension`: Suspensión temporal del servicio
- `multa`: Multa económica

**Estados de sanción:**
- `activa`: Sanción vigente
- `pagada`: Multa pagada
- `completada`: Suspensión completada

### 2.9 `stats` - Estadísticas del Tenant

```json
{
  "stats": {
    "total_users": 150,
    "total_books": 500,
    "active_loans": 45,
    "total_loans_completed": 1200,
    "total_fines_collected": 5000.0
  }
}
```

## 3. Reglas de Seguridad Firebase

Las reglas de seguridad deben garantizar el aislamiento entre tenants:

```json
{
  "rules": {
    "sys_admin": {
      ".read": "auth.token.role == 'super_sys_admin'",
      ".write": "auth.token.role == 'super_sys_admin'"
    },
    "tenants": {
      "$tenant_id": {
        ".read": "auth.token.tenant_id == $tenant_id || auth.token.role == 'super_sys_admin'",
        ".write": "auth.token.tenant_id == $tenant_id || auth.token.role == 'super_sys_admin'"
      }
    }
  }
}
```

## 4. Custom Claims en Firebase Auth

Cada usuario tiene claims personalizados en Firebase Authentication:

```json
{
  "role": "estudiante",
  "tenant_id": "inst_abc123"
}
```

**Roles disponibles:**
- `super_sys_admin`: Super administrador del sistema
- `administrador`: Administrador de una institución
- `docente`: Docente de una institución
- `estudiante`: Estudiante de una institución
