// src/app/core/models/libro.model.ts
export interface Libro {
    id: number;
    titulo: string;
    autor: string;
    isbn?: string;
    editorial?: string;
    año_publicacion?: number;
    categoria: string;
    ubicacion: string;
    estado: 'Disponible' | 'Prestado' | 'Reservado' | 'Mantenimiento';
    cantidad_total: number;
    cantidad_disponible: number;
    descripcion?: string;
    imagen_portada?: string;
    fecha_registro: string;
}

export interface Prestamo {
    id: number;
    libro: Libro;
    usuario: {
        id: number;
        nombre: string;
        apellido: string;
        email: string;
        rol: string;
    };
    fecha_prestamo: string;
    fecha_devolucion_esperada: string;
    fecha_devolucion_real?: string;
    estado: 'Activo' | 'Devuelto' | 'Vencido';
    observaciones?: string;
}

export interface Reserva {
    id: number;
    libro: Libro;
    usuario: {
        id: number;
        nombre: string;
        apellido: string;
        email: string;
    };
    fecha_reserva: string;
    estado: 'Activa' | 'Completada' | 'Cancelada';
    fecha_expiracion: string;
}

export interface Bibliografia {
    id: number;
    docente: {
        id: number;
        nombre: string;
        apellido: string;
    };
    curso: string;
    descripcion?: string;
    libros: Libro[];
    fecha_creacion: string;
    activa: boolean;
    es_publica: boolean;
}

export interface Sancion {
    id: number;
    usuario: {
        id: number;
        nombre: string;
        apellido: string;
        email: string;
    };
    tipo: 'Multa' | 'Suspensión';
    monto?: number;
    dias_suspension?: number;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin?: string;
    estado: 'Activa' | 'Pagada' | 'Completada';
    prestamo?: Prestamo;
}

// DTOs para requests
export interface PrestamoRequest {
    libro_id: number;
}

export interface ReservaRequest {
    libro_id: number;
}

export interface BusquedaLibros {
    query?: string;
    categoria?: string;
    autor?: string;
    estado?: string;
    page?: number;
    page_size?: number;
}

export interface LibroRegistro {
    titulo: string;
    autor: string;
    isbn?: string;
    editorial?: string;
    año_publicacion?: number;
    categoria: string;
    ubicacion?: string;
    cantidad_total: number;
    descripcion?: string;
    estado?: string;
}

// Response types
export interface LibroResponse {
    count: number;
    next?: string;
    previous?: string;
    results: Libro[];
}

export interface PrestamoResponse {
    count: number;
    next?: string;
    previous?: string;
    results: Prestamo[];
}

export interface ApiResponse<T> {
    message: string;
    data?: T;
    error?: string;
}