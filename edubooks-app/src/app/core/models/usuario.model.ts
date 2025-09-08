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