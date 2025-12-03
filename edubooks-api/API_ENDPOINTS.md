# API Endpoints - Edubooks API v2

## 📚 Documentación Completa de Endpoints

### Base URL
```
http://localhost:8000/api
```

---

## 🏢 Instituciones

### Crear Institución
```http
POST /api/institutions/create/
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Universidad Nacional",
  "plan": "premium"
}
```

### Listar Instituciones
```http
GET /api/institutions/
Authorization: Bearer <super_admin_token>
```

### Obtener Institución
```http
GET /api/institutions/<institution_id>/
Authorization: Bearer <super_admin_token>
```

---

## 👥 Usuarios

### Crear Usuario
```http
POST /api/users/create/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "usuario@universidad.edu",
  "password": "password123",
  "nombre": "Juan",
  "apellido": "Pérez",
  "role": "estudiante",
  "carrera": "Ingeniería",
  "matricula": "2024001"
}
```

### Listar Usuarios
```http
GET /api/users/?role=estudiante&estado=activo
Authorization: Bearer <token>
```

### Obtener Usuario
```http
GET /api/users/<user_uid>/
Authorization: Bearer <token>
```

### Actualizar Usuario
```http
PUT /api/users/<user_uid>/update/
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre": "Juan Carlos",
  "apellido": "Pérez López",
  "perfil_estudiante": {
    "semestre_actual": 3
  }
}
```

### Eliminar Usuario
```http
DELETE /api/users/<user_uid>/delete/
Authorization: Bearer <admin_token>
```

### Aplicar Sanción
```http
POST /api/users/<user_uid>/apply-sanction/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "dias": 7,
  "motivo": "Devolución tardía reiterada"
}
```

### Agregar Multa
```http
POST /api/users/<user_uid>/add-fine/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "cantidad": 50.00,
  "concepto": "Libro dañado"
}
```

---

## 📖 Libros

### Crear Libro
```http
POST /api/books/create/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "titulo": "Clean Code",
  "autor": "Robert C. Martin",
  "isbn": "978-0132350884",
  "categoria": "Programación",
  "cantidad_total": 5,
  "cantidad_disponible": 5,
  "ubicacion": "A1-23"
}
```

### Listar Libros
```http
GET /api/books/?categoria=Programación&search=clean
Authorization: Bearer <token>
```

### Obtener Libro
```http
GET /api/books/<book_id>/
Authorization: Bearer <token>
```

### Actualizar Libro
```http
PUT /api/books/<book_id>/update/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "cantidad_total": 7,
  "cantidad_disponible": 6,
  "ubicacion": "A1-24"
}
```

### Eliminar Libro
```http
DELETE /api/books/<book_id>/delete/
Authorization: Bearer <admin_token>
```

### Buscar en Google Books
```http
GET /api/books/external/search/?q=clean+code
Authorization: Bearer <token>
```

---

## 📋 Préstamos

### Solicitar Préstamo
```http
POST /api/loans/request/
Authorization: Bearer <token>
Content-Type: application/json

{
  "book_id": "book_abc123"
}
```

### Listar Préstamos
```http
GET /api/loans/?status=active&user_uid=<uid>
Authorization: Bearer <token>
```

### Aprobar Préstamo
```http
POST /api/loans/<loan_id>/approve/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "observaciones": "Préstamo aprobado"
}
```

### Rechazar Préstamo
```http
POST /api/loans/<loan_id>/reject/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "motivo": "Libro no disponible"
}
```

### Devolver Libro
```http
POST /api/loans/<loan_id>/return/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "observaciones": "Libro en buen estado"
}
```

### Renovar Préstamo
```http
POST /api/loans/<loan_id>/renew/
Authorization: Bearer <token>
```

### Listar Préstamos Vencidos
```http
GET /api/loans/overdue/
Authorization: Bearer <admin_token>
```

---

## 🔖 Reservas

### Crear Reserva
```http
POST /api/reservations/create/
Authorization: Bearer <token>
Content-Type: application/json

{
  "book_id": "book_abc123"
}
```

### Listar Reservas
```http
GET /api/reservations/?status=active
Authorization: Bearer <token>
```

### Cancelar Reserva
```http
POST /api/reservations/<reservation_id>/cancel/
Authorization: Bearer <token>
```

---

## 📧 Invitaciones

### Crear Invitación
```http
POST /api/invitations/create/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "profesor@universidad.edu",
  "role": "docente",
  "departamento": "Ingeniería"
}
```

### Validar Token de Invitación
```http
GET /api/invitations/validate/?token=<token>
```
**Público** - No requiere autenticación

### Aceptar Invitación
```http
POST /api/invitations/accept/
Content-Type: application/json

{
  "token": "<invitation_token>",
  "password": "password123",
  "nombre": "María",
  "apellido": "García"
}
```
**Público** - No requiere autenticación

### Listar Invitaciones
```http
GET /api/invitations/?status=pending
Authorization: Bearer <admin_token>
```

### Cancelar Invitación
```http
POST /api/invitations/<invitation_id>/cancel/
Authorization: Bearer <admin_token>
```

---

## 🔐 Permisos

### Obtener Mis Permisos
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
    "tenant_id": "inst_001"
  },
  "modules": {
    "books": {
      "create": true,
      "read": true,
      "update": true,
      "delete": true
    }
  },
  "special_permissions": {
    "can_manage_users": true,
    "can_apply_sanctions": true
  }
}
```

### Verificar Permiso
```http
POST /api/permissions/check/
Authorization: Bearer <token>
Content-Type: application/json

{
  "module": "books",
  "action": "create"
}
```

### Información del Rol
```http
GET /api/permissions/role-info/
Authorization: Bearer <token>
```

---

## 📊 Estadísticas

### Dashboard General
```http
GET /api/stats/dashboard/
Authorization: Bearer <admin_token>
```

**Respuesta:**
```json
{
  "total_users": 150,
  "total_books": 500,
  "available_books": 450,
  "active_loans": 45,
  "pending_loans": 5,
  "overdue_loans": 3,
  "active_reservations": 10,
  "users_by_role": {
    "estudiante": 120,
    "docente": 25,
    "administrador": 5
  }
}
```

### Libros Más Populares
```http
GET /api/stats/popular-books/?limit=10
Authorization: Bearer <admin_token>
```

**Respuesta:**
```json
[
  {
    "id": "book_123",
    "titulo": "Clean Code",
    "autor": "Robert C. Martin",
    "categoria": "Programación",
    "total_loans": 45
  }
]
```

### Actividad de Usuarios
```http
GET /api/stats/user-activity/?days=7
Authorization: Bearer <admin_token>
```

**Respuesta:**
```json
{
  "period_days": 7,
  "total_active_users": 35,
  "users": [
    {
      "user_uid": "user123",
      "nombre": "Juan",
      "apellido": "Pérez",
      "email": "juan@universidad.edu",
      "role": "estudiante",
      "loan_requests": 3,
      "active_loans": 2,
      "returned_loans": 1
    }
  ]
}
```

---

## 🔑 Autenticación

Todos los endpoints (excepto los marcados como **Público**) requieren autenticación mediante Firebase JWT token:

```http
Authorization: Bearer <firebase_jwt_token>
```

### Obtener Token
El token se obtiene mediante Firebase Authentication en el frontend:

```javascript
// Frontend (JavaScript)
const user = await firebase.auth().signInWithEmailAndPassword(email, password);
const token = await user.user.getIdToken();

// Usar en requests
fetch('/api/books/', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🎭 Roles y Permisos

### Super Admin (`super_sys_admin`)
- ✅ Acceso total al sistema
- ✅ Gestionar instituciones
- ✅ Acceso a todos los tenants

### Administrador (`administrador`)
- ✅ Gestionar usuarios de su institución
- ✅ Gestionar libros
- ✅ Aprobar/rechazar préstamos
- ✅ Aplicar sanciones y multas
- ✅ Ver estadísticas

### Docente (`docente`)
- ✅ Solicitar préstamos (hasta 5 libros, 30 días)
- ✅ Crear reservas
- ✅ Ver libros
- ✅ Renovar préstamos

### Estudiante (`estudiante`)
- ✅ Solicitar préstamos (hasta 3 libros, 15 días)
- ✅ Crear reservas
- ✅ Ver libros
- ✅ Renovar préstamos

---

## 🌐 Multi-Tenancy

Todos los datos están aislados por institución (`tenant_id`). Los usuarios solo pueden acceder a datos de su propia institución, excepto el Super Admin.

### Headers Opcionales
```http
X-Tenant-ID: inst_001
```

---

## ⚠️ Códigos de Respuesta

- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado
- `400 Bad Request` - Datos inválidos
- `401 Unauthorized` - No autenticado
- `403 Forbidden` - Sin permisos
- `404 Not Found` - Recurso no encontrado
- `500 Internal Server Error` - Error del servidor

---

## 📝 Notas Importantes

1. **Timestamps**: Todos los timestamps están en milisegundos (Unix timestamp * 1000)
2. **Paginación**: Actualmente no implementada, se retornan todos los resultados
3. **Filtros**: Soportados mediante query parameters
4. **CORS**: Configurado para desarrollo, ajustar para producción
5. **Rate Limiting**: No implementado, considerar para producción

---

## 🔗 Recursos Adicionales

- [Guía de Permisos](./PERMISSIONS_GUIDE.md)
- [Estructura de Datos Firebase](./FIREBASE_DATA_STRUCTURE.md)
- [Estado de Migración](./MIGRATION_STATUS.md)
