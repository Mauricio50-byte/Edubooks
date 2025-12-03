# GUÍA MAESTRA DE REESTRUCTURACIÓN: Edubooks API v2 (Firebase Multi-Tenant)

## 1. Contexto y Justificación del Cambio
Este documento sirve como la **única fuente de verdad** para la reingeniería total del backend `edubooks-api`.
**Situación Actual:** El sistema opera sobre una base de datos relacional (SQL) con una arquitectura monolítica de un solo nivel.
**Nueva Visión:** Migrar a una arquitectura **Multi-Inquilino (Multi-Tenant)** basada en **Firebase Realtime Database**.
**Argumentos para el cambio:**
- **Escalabilidad Horizontal:** Permitir que múltiples instituciones (universidades, colegios) usen el software como servicio (SaaS) sin mezclar sus datos.
- **Reactividad:** Aprovechar la naturaleza de tiempo real de Firebase para actualizaciones instantáneas en préstamos y reservas.
- **Simplicidad Operativa:** Eliminar la gestión de migraciones de esquema SQL y servidores de base de datos tradicionales.

---

## 2. Arquitectura de Datos (Multi-Tenant)
La jerarquía de datos cambia radicalmente. Ya no existe una tabla plana de usuarios. Ahora todo pende de una **Institución**.

### Jerarquía de Entidades
1.  **Super Admin (Dueño del Software):**
    - Tiene control global.
    - Su única función es **crear y gestionar Instituciones**.
    - No interactúa con libros ni préstamos directamente.
2.  **Institución (Dueño del Servicio / Cliente):**
    - Es la entidad que paga por el servicio (ej. "Universidad Nacional").
    - Tiene su propia configuración, logo, y límites.
    - **Aislamiento Total:** Los datos de la Institución A son invisibles para la Institución B.
3.  **Usuarios de Institución:**
    - **Administrador:** El bibliotecario jefe de *esa* institución.
    - **Docente:** Profesor de *esa* institución.
    - **Estudiante:** Alumno de *esa* institución.

### Esquema JSON Propuesto (Firebase Realtime Database)
El diseño de la base de datos debe seguir este patrón estricto para garantizar el aislamiento:

```json
{
  "sys_admin": {
    "users": { "uid_superadmin": { "email": "admin@edubooks.com", "role": "super_sys_admin" } },
    "instituciones_registry": {
      "inst_id_1": { "name": "Universidad X", "plan": "premium", "active": true }
    }
  },
  "tenants": {
    "inst_id_1": {
      "config": { "max_loans_per_student": 3, "loan_days": 15 },
      "users": {
        "user_uid_1": { "role": "estudiante", "nombre": "Juan", "email": "juan@univ.edu" },
        "user_uid_2": { "role": "docente", "nombre": "Prof. Ana", "email": "ana@univ.edu" }
      },
      "inventory": {
        "book_id_1": {
          "titulo": "Clean Code",
          "stock_total": 5,
          "stock_disponible": 4,
          "ubicacion": "A1"
        }
      },
      "transactions": {
        "loans": {
          "loan_id_1": { "book_id": "book_id_1", "user_id": "user_uid_1", "status": "active", "due_date": 1709856000000 }
        },
        "reservations": { ... },
        "sanctions": { ... }
      }
    }
  }
}
```

---

## 3. Instrucciones de "Borrado de Raíz" y Limpieza
El objetivo es que el código resultante sea **nativo de Firebase**. No queremos un híbrido.

### Acciones Destructivas Obligatorias:
1.  **Eliminar Modelos Django:** Borrar o vaciar todos los archivos `models.py`. No debe quedar ninguna clase que herede de `models.Model`.
2.  **Eliminar Migraciones:** Borrar todas las carpetas `migrations/` dentro de cada aplicación.
3.  **Eliminar Admin Django:** Borrar `admin.py` y cualquier referencia a `django.contrib.admin` en `INSTALLED_APPS` y `urls.py`. El panel de administración de Django ya no sirve porque no hay SQL.
4.  **Limpiar Dependencias:** Eliminar de `requirements.txt`: `psycopg2`, `dj-database-url` (si existe), y cualquier librería específica de SQL. Mantener solo Django (para el manejo de HTTP/Rutas) y `firebase-admin`.

### Qué Preservar (Lógica de Negocio):
Aunque cambiamos la base de datos, las **reglas del negocio** son sagradas y deben reimplementarse con lógica pura de Python + Firebase:
- **Validaciones:**
  - Estudiantes no pueden tener más de X libros (configurable por institución).
  - No se puede prestar si hay multas pendientes.
  - Reservas expiran automáticamente a los 3 días.
- **Roles:** Mantener la distinción estricta de permisos entre Estudiante, Docente y Administrador.

---

## 4. Requerimientos Funcionales Detallados

### A. Autenticación y Seguridad
- Usar **Firebase Authentication** para el manejo de identidades.
- Implementar un **Middleware Personalizado** en Django que:
  1.  Verifique el token JWT de Firebase en cada petición.
  2.  Extraiga el `uid` y determine a qué `tenant_id` (institución) pertenece el usuario.
  3.  Inyecte el contexto del tenant en la request para que las vistas solo consulten `tenants/{tenant_id}/...`.

### B. Gestión de "Dueños de Servicio" (Nuevo)
- Crear endpoints exclusivos para el **Super Admin**:
  - `POST /api/sys/institutions/`: Crear una nueva universidad/instituto. Esto debe inicializar su nodo en Firebase.
  - `POST /api/sys/create-admin/`: Crear el primer usuario Administrador para esa institución.

### C. Operaciones de Biblioteca (Por Institución)
Todas las rutas deben ser relativas a la institución del usuario logueado.
- **Préstamos:** Al crear un préstamo, disminuir atómicamente `stock_disponible`. Usar transacciones de Firebase para evitar condiciones de carrera.
- **Devoluciones:** Aumentar `stock_disponible`. Si hay retraso, generar automáticamente el registro en `transactions/sanctions`.

---

## 5. Entregables de la Reestructuración
Al finalizar, el proyecto debe tener:
1.  Un archivo `firebase_config.py` robusto para la conexión.
2.  Una capa de **Servicios** (`services/`) que reemplace a los antiguos modelos, encargada de hablar con Firebase.
3.  Un script `setup_firebase.py` que inicialice la estructura base de la base de datos (crear nodos raíz si no existen).
4.  **Cero** archivos `.sqlite3` o configuraciones de bases de datos relacionales en `settings.py`.
