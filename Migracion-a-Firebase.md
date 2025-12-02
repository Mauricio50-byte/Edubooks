# Migración de Supabase (Postgres) a Firebase Realtime Database y Autenticación con Google

## Resumen
- Objetivo: reemplazar el backend relacional (Supabase/Postgres) por una base no relacional (`Firebase Realtime Database`) y usar autenticación con Google de Firebase.
- Alcance: backend Django (`edubooks-api`) y frontend Ionic/Angular (`edubooks-app`).
- Entregables: estructura de datos en Firebase, reglas de seguridad, guías de migración de datos, cambios de autenticación y referencias en el código.

## Consideraciones clave
- Modelo de datos: pasar de tablas y relaciones a documentos/árbol JSON denormalizado. Se aceptan duplicaciones para optimizar lecturas.
- Consultas: Firebase RTDB usa `orderBy*`, `equalTo`, `startAt`, `endAt`. No hay `JOIN`; se modela para la consulta dominante.
- Transacciones: RTDB admite operaciones atómicas simples, pero no transacciones complejas entre múltiples rutas.
- Seguridad: definir reglas por ruta basadas en `auth.uid` y roles.
- Coste: lecturas/escuchas en tiempo real; optimizar rutas y filtros.

## Preparación
- Hacer backup completo de Supabase/Postgres (CSV/JSON por tabla).
- Identificar entidades y accesos frecuentes: `usuarios`, `libros`, `prestamos`, `reservas`, `bibliografias`, `sanciones`.
- Crear proyecto en Firebase y obtener credenciales: `Project ID`, `Web API key`, `Service Account`.

## Configuración de Firebase
- Habilitar `Authentication` y proveedor `Google`.
- Crear `Realtime Database` en modo bloqueado y definir reglas.
- Registrar app Web para el frontend y generar configuración (`apiKey`, `authDomain`, `databaseURL`).

### Configuración del proyecto (Web)
Usar la siguiente configuración en el frontend para inicializar Firebase:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB2Q_bqmcwYQPmUwpCqNI5IfeKc8Tggfcc",
  authDomain: "edubooks-94c14.firebaseapp.com",
  databaseURL: "https://edubooks-94c14-default-rtdb.firebaseio.com",
  projectId: "edubooks-94c14",
  storageBucket: "edubooks-94c14.firebasestorage.app",
  messagingSenderId: "425633503294",
  appId: "1:425633503294:web:b0e5c88fc3e1d4d44b996f",
  measurementId: "G-HZF9Q3LCW4"
};
```

Ejemplo de uso en Angular (en `environment.ts`):

```ts
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyB2Q_bqmcwYQPmUwpCqNI5IfeKc8Tggfcc",
    authDomain: "edubooks-94c14.firebaseapp.com",
    databaseURL: "https://edubooks-94c14-default-rtdb.firebaseio.com",
    projectId: "edubooks-94c14",
    storageBucket: "edubooks-94c14.firebasestorage.app",
    messagingSenderId: "425633503294",
    appId: "1:425633503294:web:b0e5c88fc3e1d4d44b996f",
    measurementId: "G-HZF9Q3LCW4"
  }
};
```


### Reglas iniciales de Realtime Database
```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "usuarios": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "roles": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "libros": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('roles/'+auth.uid).val() === 'administrador'"
    },
    "prestamos": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('roles/'+auth.uid).val() === 'administrador'"
    },
    "reservas": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "sanciones": {
      ".read": "auth != null && root.child('roles/'+auth.uid).val() === 'administrador'",
      ".write": "auth != null && root.child('roles/'+auth.uid).val() === 'administrador'"
    }
  }
}
```

## Mapeo de datos: propuesta de estructura
```
/usuarios/{uid}
  nombre
  apellido
  email
  rol: administrador | docente | estudiante
  estado

/roles/{uid}: rol

/libros/{libroId}
  titulo
  autor
  categoria
  estado
  cantidad_total
  cantidad_disponible
  imagen_portada

/prestamos/{prestamoId}
  usuarioId
  libroId
  fecha_prestamo
  fecha_devolucion_esperada
  estado: Pendiente | Activo | Vencido | Devuelto

/reservas/{reservaId}
  usuarioId
  libroId
  fecha_reserva
  estado

/bibliografias/{bibliografiaId}
  curso
  docenteId
  libros: { libroId: true, ... }

/sanciones/{sancionId}
  usuarioId
  tipo
  estado
  monto
  fecha_inicio
  fecha_fin
```
- Índices de consulta: usar claves derivadas (`estado`, `categoria`, `usuarioId`) y filtros `orderByChild('estado').equalTo('Disponible')`.
- Denormalización: por ejemplo, mantener `/usuarios/{uid}/prestamos/{prestamoId}: true` para listados rápidos por usuario.

## Migración de datos (offline)
### Exportar desde Postgres/Supabase
- Exportar tablas a CSV/JSON (desde Supabase console o `psql`).
- Alternativa: script con `psycopg2` o cliente de Supabase para leer datos.

### Importar a Firebase con script Python
- Requisitos: `pip install firebase-admin psycopg2-binary`.
- Preparar `serviceAccountKey.json` (cuenta de servicio) y `databaseURL`.

```python
import json
import psycopg2
import firebase_admin
from firebase_admin import credentials, db

cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://<tu-project-id>.firebaseio.com'
})

conn = psycopg2.connect(
    host='localhost', dbname='edubooks', user='postgres', password='***'
)
cur = conn.cursor()

cur.execute('SELECT id, titulo, autor, categoria, estado, cantidad_total, cantidad_disponible, imagen_portada FROM libros')
for row in cur.fetchall():
    libro = {
        'titulo': row[1], 'autor': row[2], 'categoria': row[3], 'estado': row[4],
        'cantidad_total': row[5], 'cantidad_disponible': row[6], 'imagen_portada': row[7]
    }
    db.reference(f'libros/{row[0]}').set(libro)

cur.execute('SELECT id, usuario_id, libro_id, fecha_prestamo, fecha_devolucion_esperada, estado FROM prestamos')
for row in cur.fetchall():
    prestamo = {
        'usuarioId': row[1], 'libroId': row[2], 'fecha_prestamo': row[3].isoformat() if row[3] else None,
        'fecha_devolucion_esperada': row[4].isoformat() if row[4] else None, 'estado': row[5]
    }
    db.reference(f'prestamos/{row[0]}').set(prestamo)
```
- Validar volúmenes grandes con lotes o colas.
- Auditoría: registrar conteos y diferencias.

## Cambios en el backend (Django)
- Instalar SDK: `pip install firebase-admin`.
- Inicializar cliente Firebase (service account) y reemplazar acceso Supabase.
- Referencias del código a migrar:
  - Cliente Supabase en `edubooks-api/edubooks/supabase_client.py:8` y mixin en `edubooks-api/edubooks/supabase_adapter.py:11`.
  - Autenticación basada en Supabase en `edubooks-api/usuarios/auth/authentication.py:121`.
  - Endpoints de sincronización `supabase_sync` en `edubooks-api/usuarios/urls/main_urls.py:12`.

### Inicialización de Firebase en Django
```python
# edubooks/firebase_client.py
import firebase_admin
from firebase_admin import credentials, db
from django.conf import settings

if not firebase_admin._apps:
    cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT)
    firebase_admin.initialize_app(cred, {
        'databaseURL': settings.FIREBASE_DATABASE_URL
    })

def get_db():
    return db
```
- Uso: `from edubooks.firebase_client import get_db; ref = get_db().reference('libros')`.
- Verificación de ID Token (si el backend valida sesiones):
```python
from firebase_admin import auth

def verify_token(id_token: str):
    return auth.verify_id_token(id_token)
```

## Cambios en el frontend (Ionic/Angular)
- Instalación de dependencias:

```bash
npm install firebase
```

- Opcional recomendado para Angular: `npm i @angular/fire` (proveedores y utilidades integradas).
- Inicializar AngularFire:
```ts
// app.module.ts
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideDatabase, getDatabase } from '@angular/fire/database';

@NgModule({
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideDatabase(() => getDatabase())
  ]
})
export class AppModule {}
```

### Autenticación con Google (reemplazo de Supabase)
- En `edubooks-app/src/app/core/services/auth.service.ts:189` migrar `loginWithGoogle()` a Firebase:
```ts
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';

constructor(private auth: Auth) {}

async loginWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(this.auth, provider);
}
```
- Listener de usuario y guardas: usar `onAuthStateChanged` o `authState` de AngularFire.

### Acceso a Realtime Database
```ts
import { Database, ref, set, get, child, onValue } from '@angular/fire/database';

constructor(private db: Database) {}

async crearLibro(id: string, data: any) {
  await set(ref(this.db, `libros/${id}`), data);
}

onLibros(callback: (val: any) => void) {
  onValue(ref(this.db, 'libros'), snapshot => callback(snapshot.val()));
}
```

## Funcionalidad requerida (multi-entidad)
- Página principal para registrar las entidades que usarán la biblioteca virtual (colegios, institutos, universidades, fundaciones, etc.).
- Cada entidad registrada tendrá su propio sistema de administración con:
  - Administradores específicos de la entidad
  - Módulos para docentes
  - Accesos para estudiantes
  - Funcionalidades adicionales requeridas por la aplicación

### Diseño recomendado en Realtime Database
Estructura multi-tenant separando datos por `entidadId`:

```
/entidades/{entidadId}
  nombre
  tipo: colegio | instituto | universidad | fundacion
  estado

/entidadesIndex/{entidadId}
  nombre: <para listados rápidos>

/entidadUsuarios/{entidadId}/{uid}
  rol: administrador | docente | estudiante
  perfil: { nombre, apellido, email }

/entidadLibros/{entidadId}/{libroId}
  titulo, autor, categoria, estado, cantidad_total, cantidad_disponible

/entidadPrestamos/{entidadId}/{prestamoId}
  usuarioId, libroId, fecha_prestamo, fecha_devolucion_esperada, estado

/entidadReservas/{entidadId}/{reservaId}
  usuarioId, libroId, fecha_reserva, estado

/entidadSanciones/{entidadId}/{sancionId}
  usuarioId, tipo, estado, monto, fecha_inicio, fecha_fin
```

### Reglas base multi-tenant
Controlar acceso por entidad y rol asociado:

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "entidades": {
      ".read": "auth != null",
      ".write": "auth != null" 
    },

    "entidadUsuarios": {
      "$entidadId": {
        "$uid": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    },

    "entidadLibros": {
      "$entidadId": {
        ".read": "auth != null",
        ".write": "auth != null && root.child('entidadUsuarios/'+$entidadId+'/'+auth.uid+'/rol').val() === 'administrador'"
      }
    },

    "entidadPrestamos": {
      "$entidadId": {
        ".read": "auth != null",
        ".write": "auth != null && root.child('entidadUsuarios/'+$entidadId+'/'+auth.uid+'/rol').val() === 'administrador'"
      }
    },

    "entidadReservas": {
      "$entidadId": {
        ".read": "auth != null",
        ".write": "auth != null" 
      }
    },

    "entidadSanciones": {
      "$entidadId": {
        ".read": "auth != null && root.child('entidadUsuarios/'+$entidadId+'/'+auth.uid+'/rol').val() === 'administrador'",
        ".write": "auth != null && root.child('entidadUsuarios/'+$entidadId+'/'+auth.uid+'/rol').val() === 'administrador'"
      }
    }
  }
}
```

### UI y flujos
- Registro de entidad: formulario que crea `/entidades/{entidadId}` y el primer administrador en `/entidadUsuarios/{entidadId}/{uid}`.
- Inicio de sesión con Google: tras autenticación, elegir/crear entidad asociada al usuario.
- Panel por rol:
  - Administrador: gestión de usuarios, libros, préstamos, sanciones de su entidad.
  - Docente: bibliografías y reservas asociadas a su entidad.
  - Estudiante: catálogo, reservas y préstamos propios.

## Referencias útiles
- Consola de Firebase: `https://console.firebase.google.com/u/0/project/edubooks-94c14/database/edubooks-94c14-default-rtdb/data/~2F?hl=es-419`
- Documentación general de Firebase: `https://firebase.google.com/docs?hl=es-419`
- Realtime Database: `https://firebase.google.com/docs/database?hl=es-419`
- Autenticación con Google (Web): `https://firebase.google.com/docs/auth/web/google-signin?hl=es-419`

## Entornos y secretos
- Backend: `settings.py` debe contener `FIREBASE_SERVICE_ACCOUNT` (ruta segura al JSON) y `FIREBASE_DATABASE_URL`.
- Frontend: `environment.ts` con `firebase: { apiKey, authDomain, databaseURL, projectId, appId }`.
- No subir llaves al repositorio. Usar variables de entorno y almacenes seguros.

## Plan de corte
- Paralelizar lectura/escritura durante validación.
- Ejecutar migración en ventana de mantenimiento.
- Validar conteos y accesos críticos (login, catálogo, préstamos, reservas).
- Cambiar endpoints del backend y servicios del frontend a Firebase.
- Monitorear y ajustar reglas/índices.

## Verificación
- Pruebas de integración en flujos:
  - Login con Google.
  - Listado y búsqueda de libros por `categoria` y `estado`.
  - Crear préstamo y actualizar disponibilidad.
  - Crear reserva y cancelación.
- Revisar errores de autorización por reglas.

## Referencias en el código (para orientar el cambio)
- Backend:
  - `edubooks-api/edubooks/supabase_client.py:8` (cliente Supabase).
  - `edubooks-api/edubooks/supabase_adapter.py:11` (mixin Supabase en modelos).
  - `edubooks-api/libros/models.py:11` (modelos con lógica de negocio).
  - `edubooks-api/usuarios/auth/authentication.py:121` (autenticación).
- Frontend:
  - `edubooks-app/src/app/core/services/supabase.service.ts:17` (servicio Supabase).
  - `edubooks-app/src/app/core/services/auth.service.ts:189` (login Google vía Supabase).
  - `edubooks-app/src/app/core/services/biblioteca.service.ts:1` (accesos principales a datos).

## Notas finales
- Algunas consultas complejas en SQL requieren rediseño en RTDB.
- Mantener trazabilidad y auditoría con rutas dedicadas o Cloud Functions.
- Considerar Cloud Firestore si se necesitan consultas más expresivas y escalabilidad diferente.
