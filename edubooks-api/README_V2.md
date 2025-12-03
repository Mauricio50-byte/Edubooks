# Edubooks API v2 - Firebase Multi-Tenant

Sistema de gestión de biblioteca virtual con arquitectura multi-inquilino basada en Firebase Realtime Database.

## 🏗️ Arquitectura

### Multi-Tenant (Multi-Inquilino)
El sistema permite que múltiples instituciones (universidades, colegios, institutos) utilicen la plataforma de forma independiente, con **aislamiento total de datos** entre ellas.

### Jerarquía de Entidades
```
Super Admin (Dueño del Software)
    └── Institución 1 (Cliente)
        ├── Administrador
        ├── Docentes
        └── Estudiantes
    └── Institución 2 (Cliente)
        ├── Administrador
        ├── Docentes
        └── Estudiantes
```

## 🚀 Tecnologías

- **Backend**: Django 5.2 + Django REST Framework
- **Base de Datos**: Firebase Realtime Database (NoSQL)
- **Autenticación**: Firebase Authentication
- **Lenguaje**: Python 3.x

## 📁 Estructura del Proyecto

```
edubooks-api/
├── edubooks/
│   ├── __init__.py                    # Inicialización de Firebase
│   ├── settings.py                    # Configuración de Django
│   ├── urls.py                        # Rutas principales
│   ├── firebase_config.py             # Configuración de Firebase
│   ├── firebase_middleware.py         # Middlewares de autenticación
│   ├── services/                      # Capa de servicios
│   │   ├── __init__.py
│   │   ├── institution_service.py     # Gestión de instituciones
│   │   ├── user_service.py            # Gestión de usuarios
│   │   ├── book_service.py            # Gestión de libros
│   │   └── loan_service.py            # Gestión de préstamos
│   ├── views_example.py               # Vistas de ejemplo
│   └── urls_example.py                # URLs de ejemplo
├── setup_firebase.py                  # Script de inicialización
├── FIREBASE_DATA_STRUCTURE.md         # Documentación de estructura de datos
├── MIGRATION_SUMMARY.md               # Resumen de migración
└── requirements.txt
```

## ⚙️ Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd edubooks-api
```

### 2. Crear entorno virtual
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar Firebase

#### 4.1 Crear proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita **Realtime Database**
4. Habilita **Authentication** (Email/Password)

#### 4.2 Descargar credenciales
1. En Firebase Console, ve a **Configuración del proyecto** > **Cuentas de servicio**
2. Haz clic en **Generar nueva clave privada**
3. Guarda el archivo JSON en un lugar seguro

#### 4.3 Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto:

```env
# Django
SECRET_KEY=tu-secret-key-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Firebase
FIREBASE_SERVICE_ACCOUNT=/ruta/completa/al/serviceAccountKey.json
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:8100,http://localhost:4200
CORS_ALLOW_ALL_ORIGINS=True
```

### 5. Inicializar Firebase
```bash
python setup_firebase.py
```

Este script:
- Crea la estructura base de la base de datos
- Te permite crear el primer Super Administrador

### 6. Ejecutar el servidor
```bash
python manage.py runserver
```

## 📚 Uso

### Crear una Institución (Super Admin)

```bash
POST /sys/institutions/
Authorization: Bearer <super_admin_token>

{
  "name": "Universidad Nacional",
  "plan": "premium",
  "config": {
    "max_loans_per_student": 3,
    "loan_days": 15
  }
}
```

### Crear Administrador de Institución (Super Admin)

```bash
POST /sys/institutions/create-admin/
Authorization: Bearer <super_admin_token>

{
  "inst_id": "inst_abc123",
  "email": "admin@universidad.edu",
  "password": "password123",
  "nombre": "Carlos",
  "apellido": "López"
}
```

### Crear Usuario (Administrador de Institución)

```bash
POST /api/users/
Authorization: Bearer <admin_token>

{
  "email": "estudiante@universidad.edu",
  "password": "password123",
  "nombre": "Juan",
  "apellido": "Pérez",
  "role": "estudiante",
  "carrera": "Ingeniería de Sistemas",
  "matricula": "2024001"
}
```

### Crear Libro (Administrador)

```bash
POST /api/books/
Authorization: Bearer <admin_token>

{
  "titulo": "Clean Code",
  "autor": "Robert C. Martin",
  "isbn": "9780132350884",
  "categoria": "Programación",
  "cantidad_total": 5
}
```

### Solicitar Préstamo (Estudiante/Docente)

```bash
POST /api/loans/request/
Authorization: Bearer <user_token>

{
  "book_id": "book_xyz789"
}
```

### Aprobar Préstamo (Administrador)

```bash
POST /api/loans/{loan_id}/approve/
Authorization: Bearer <admin_token>
```

## 🔐 Autenticación

El sistema usa **Firebase Authentication** con tokens JWT.

### Flujo de Autenticación

1. El usuario se autentica con Firebase Auth (frontend)
2. Firebase devuelve un token JWT
3. El frontend envía el token en el header `Authorization: Bearer <token>`
4. El middleware `FirebaseAuthMiddleware` verifica el token
5. El middleware `TenantIsolationMiddleware` asegura el aislamiento de datos

### Custom Claims

Cada usuario tiene claims personalizados:
```json
{
  "role": "estudiante",
  "tenant_id": "inst_abc123"
}
```

## 🔒 Roles y Permisos

### Super Admin (Sistema)
- Crear y gestionar instituciones
- Crear administradores de instituciones
- Acceso global a todos los datos

### Administrador (Institución)
- Gestionar usuarios de su institución
- Gestionar inventario de libros
- Aprobar/rechazar préstamos
- Aplicar sanciones y multas
- Generar reportes

### Docente
- Solicitar préstamos (hasta 5 libros)
- Ver su historial de préstamos
- Crear bibliografías (futuro)

### Estudiante
- Solicitar préstamos (hasta 3 libros)
- Ver su historial de préstamos
- Renovar préstamos (máximo 2 veces)

## 📊 Estructura de Datos

Ver [FIREBASE_DATA_STRUCTURE.md](./FIREBASE_DATA_STRUCTURE.md) para la documentación completa de la estructura de datos en Firebase.

## 🔄 Migración desde SQL

Si tienes datos en la versión anterior (SQL), consulta [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) para instrucciones de migración.

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
python manage.py test
```

## 📝 Logging

Los logs se configuran en `settings.py`. Por defecto:
- **Desarrollo**: Logs en consola (nivel DEBUG)
- **Producción**: Logs en archivo (nivel INFO)

## 🚨 Reglas de Seguridad Firebase

Asegúrate de configurar las reglas de seguridad en Firebase Console:

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

## 📈 Próximas Funcionalidades

- [ ] Sistema de reservas
- [ ] Notificaciones en tiempo real
- [ ] Reportes y estadísticas
- [ ] Bibliografías por curso
- [ ] Integración con Google Books API
- [ ] Sistema de recomendaciones
- [ ] App móvil

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 📧 Contacto

Para preguntas o soporte, contacta a: [tu-email@ejemplo.com]

---

**Nota**: Este es un sistema en desarrollo activo. Algunas funcionalidades pueden estar en progreso.
