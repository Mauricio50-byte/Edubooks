// src/app/core/models/user.model.ts
export interface Usuario {
    id?: number;
    email: string;
    username: string;
    nombre: string;
    apellido: string;
    rol: 'Estudiante' | 'Docente' | 'Administrador';
    fecha_registro?: string;
    activo?: boolean;
    
    // Campos específicos para Estudiantes
    carrera?: string;
    matricula?: string;
    
    // Campos específicos para Docentes
    departamento?: string;
    numero_empleado?: string;
    
    // Campos específicos para Administradores
    area?: string;
    
    // Nuevos campos del modelo híbrido
    telefono?: string;
    direccion?: string;
    fecha_nacimiento?: string;
    genero?: 'M' | 'F' | 'Otro';
    
    // Campos de gestión académica
    sancionado?: boolean;
    fecha_fin_sancion?: string;
    multa_pendiente?: number;
    puede_prestar?: boolean;
    
    // Campos de auditoría
    fecha_creacion?: string;
    fecha_actualizacion?: string;
    creado_por?: number;
    actualizado_por?: number;
    
    // Campos de Supabase
    supabase_id?: string;
}

export interface UsuarioRegistro {
    email: string;
    username: string;
    nombre: string;
    apellido: string;
    rol: 'Estudiante' | 'Docente' | 'Administrador';
    password: string;
    password_confirm: string;
    
    // Campos opcionales según el rol
    carrera?: string;
    matricula?: string;
    departamento?: string;
    numero_empleado?: string;
    area?: string;
    
    // Campos adicionales opcionales
    telefono?: string;
    direccion?: string;
    fecha_nacimiento?: string;
    genero?: 'M' | 'F' | 'Otro';
}

export interface UsuarioLogin {
    email: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    user: Usuario;
    tokens: {
    access: string;
    refresh: string;
    };
}

export interface ApiError {
    message: string;
    errors?: any;
}