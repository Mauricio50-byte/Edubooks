-- =====================================================
-- ESQUEMA EDUBOOKS PARA SUPABASE
-- Basado en los modelos de Django
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: usuarios (Usuario personalizado de Django)
-- =====================================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMPTZ,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    email VARCHAR(150) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rol VARCHAR(15) NOT NULL CHECK (rol IN ('Estudiante', 'Docente', 'Administrador')),
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Campos específicos para Estudiantes
    carrera VARCHAR(100),
    matricula VARCHAR(20) UNIQUE,
    
    -- Campos específicos para Docentes
    departamento VARCHAR(100),
    numero_empleado VARCHAR(20) UNIQUE,
    
    -- Campos específicos para Administradores
    area VARCHAR(100),
    
    -- Campos requeridos por Django
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Índices
    CONSTRAINT usuarios_email_key UNIQUE (email),
    CONSTRAINT usuarios_username_key UNIQUE (username)
);

-- =====================================================
-- TABLA: libros
-- =====================================================
CREATE TABLE libros (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(200) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    editorial VARCHAR(100),
    año_publicacion INTEGER CHECK (año_publicacion >= 1000 AND año_publicacion <= 2030),
    categoria VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(100) NOT NULL,
    estado VARCHAR(15) NOT NULL DEFAULT 'Disponible' CHECK (estado IN ('Disponible', 'Prestado', 'Reservado', 'Mantenimiento')),
    cantidad_total INTEGER NOT NULL DEFAULT 1 CHECK (cantidad_total > 0),
    cantidad_disponible INTEGER NOT NULL DEFAULT 1 CHECK (cantidad_disponible >= 0),
    descripcion TEXT,
    imagen_portada TEXT, -- URL de la imagen en Supabase Storage
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLA: prestamos
-- =====================================================
CREATE TABLE prestamos (
    id SERIAL PRIMARY KEY,
    libro_id INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_prestamo TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_devolucion_esperada DATE,
    fecha_devolucion_real TIMESTAMPTZ,
    estado VARCHAR(10) NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Activo', 'Devuelto', 'Vencido', 'Rechazado')),
    observaciones TEXT,
    renovaciones INTEGER NOT NULL DEFAULT 0 CHECK (renovaciones >= 0),
    
    -- Campos para sistema de aprobación
    aprobado_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_aprobacion TIMESTAMPTZ,
    motivo_rechazo TEXT,
    notificado BOOLEAN NOT NULL DEFAULT FALSE
);

-- =====================================================
-- TABLA: reservas
-- =====================================================
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    libro_id INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_reserva TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado VARCHAR(12) NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Completada', 'Cancelada')),
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    
    -- Constraint para evitar reservas duplicadas
    UNIQUE(libro_id, usuario_id, estado)
);

-- =====================================================
-- TABLA: bibliografias
-- =====================================================
CREATE TABLE bibliografias (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    curso VARCHAR(200) NOT NULL,
    programa VARCHAR(100) NOT NULL DEFAULT 'General',
    descripcion TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    es_publica BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Constraint para evitar duplicados
    UNIQUE(docente_id, curso, programa)
);

-- =====================================================
-- TABLA: bibliografias_libros (Many-to-Many)
-- =====================================================
CREATE TABLE bibliografias_libros (
    id SERIAL PRIMARY KEY,
    bibliografia_id INTEGER NOT NULL REFERENCES bibliografias(id) ON DELETE CASCADE,
    libro_id INTEGER NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    
    UNIQUE(bibliografia_id, libro_id)
);

-- =====================================================
-- TABLA: sanciones
-- =====================================================
CREATE TABLE sanciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('Multa', 'Suspensión')),
    monto DECIMAL(10,2),
    dias_suspension INTEGER CHECK (dias_suspension > 0),
    descripcion TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    estado VARCHAR(12) NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Pagada', 'Completada')),
    prestamo_id INTEGER REFERENCES prestamos(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: notificaciones
-- =====================================================
CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (tipo IN ('prestamo', 'devolucion', 'sancion', 'general')),
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    relacionado_id INTEGER
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Usuarios
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- Libros
CREATE INDEX idx_libros_titulo ON libros(titulo);
CREATE INDEX idx_libros_autor ON libros(autor);
CREATE INDEX idx_libros_isbn ON libros(isbn);
CREATE INDEX idx_libros_categoria ON libros(categoria);
CREATE INDEX idx_libros_estado ON libros(estado);

-- Préstamos
CREATE INDEX idx_prestamos_usuario ON prestamos(usuario_id);
CREATE INDEX idx_prestamos_libro ON prestamos(libro_id);
CREATE INDEX idx_prestamos_estado ON prestamos(estado);
CREATE INDEX idx_prestamos_fecha ON prestamos(fecha_prestamo);

-- Reservas
CREATE INDEX idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX idx_reservas_libro ON reservas(libro_id);
CREATE INDEX idx_reservas_estado ON reservas(estado);

-- Notificaciones
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);

-- =====================================================
-- COMENTARIOS EN TABLAS
-- =====================================================
COMMENT ON TABLE usuarios IS 'Usuarios del sistema: Estudiantes, Docentes y Administradores';
COMMENT ON TABLE libros IS 'Catálogo de libros de la biblioteca';
COMMENT ON TABLE prestamos IS 'Registro de préstamos de libros';
COMMENT ON TABLE reservas IS 'Reservas de libros por parte de usuarios';
COMMENT ON TABLE bibliografias IS 'Bibliografías creadas por docentes para sus cursos';
COMMENT ON TABLE sanciones IS 'Multas y suspensiones aplicadas a usuarios';
COMMENT ON TABLE notificaciones IS 'Sistema de notificaciones para usuarios';