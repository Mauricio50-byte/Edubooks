// src/app/core/models/user.model.ts
export interface Usuario {
    id?: number;
    email: string;
    username: string;
    nombre: string;
    apellido: string;
    rol: 'estudiante' | 'docente' | 'administrador';
    fecha_registro?: string;
    activo?: boolean;
    
    // Nuevos campos del modelo híbrido
    telefono?: string;
    numero_identificacion?: string;
    genero?: 'M' | 'F' | 'O' | 'N';
    
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
    
    // Datos específicos por rol (estructura anidada)
    datos_estudiante?: {
        carrera?: string;
        matricula?: string;
        semestre_actual?: number;
        fecha_ingreso?: string;
        fecha_graduacion_esperada?: string;
    };
    datos_docente?: {
        departamento?: string;
        numero_empleado?: string;
        especialidad?: string;
        grado_academico?: string;
        fecha_contratacion?: string;
    };
    datos_administrador?: {
        area?: string;
        nivel_acceso?: string;
        fecha_nombramiento?: string;
    };
}

export interface UsuarioRegistro {
    email: string;
    username: string;
    nombre: string;
    apellido: string;
    rol: 'estudiante' | 'docente' | 'administrador';
    password: string;
    password_confirm: string;
    
    // Campos adicionales opcionales
    telefono?: string;
    numero_identificacion?: string;
    genero?: 'M' | 'F' | 'O' | 'N';
    
    // Preferencias
    notificaciones_email?: boolean;
    notificaciones_push?: boolean;
    idioma_preferido?: string;
    
    // Datos específicos por rol (estructura anidada)
    datos_estudiante?: {
        carrera: string;
        matricula: string;
        semestre_actual?: number;
        fecha_ingreso?: string;
        fecha_graduacion_esperada?: string;
    };
    datos_docente?: {
        departamento: string;
        numero_empleado: string;
        especialidad?: string;
        grado_academico?: string;
        fecha_contratacion?: string;
    };
    datos_administrador?: {
        area: string;
        nivel_acceso?: string;
        fecha_nombramiento?: string;
    };
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