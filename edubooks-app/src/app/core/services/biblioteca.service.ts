// src/app/core/services/biblioteca.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { 
  Libro, 
  LibroResponse, 
  Prestamo, 
  PrestamoResponse, 
  Reserva, 
  Bibliografia, 
  Sancion,
  PrestamoRequest,
  ReservaRequest,
  BusquedaLibros,
  LibroRegistro,
  ApiResponse 
} from '../models/libro.model';

@Injectable({
  providedIn: 'root'
})
export class BibliotecaService {
  
  constructor(private apiService: ApiService) {}

  // ==================== GESTIÓN DE LIBROS ====================
  
  /**
   * Buscar libros en el catálogo
   */
  buscarLibros(filtros: BusquedaLibros): Observable<LibroResponse> {
    const params = new URLSearchParams();
    
    if (filtros.query) params.append('titulo', filtros.query);
    if (filtros.categoria) params.append('categoria', filtros.categoria);
    if (filtros.autor) params.append('autor', filtros.autor);
    if (filtros.estado) params.append('disponible', filtros.estado === 'Disponible' ? 'true' : 'false');
    if (filtros.page) params.append('page', filtros.page.toString());
    if (filtros.page_size) params.append('page_size', filtros.page_size.toString());

    const queryString = params.toString();
    return this.apiService.get<LibroResponse>(`/libros/?${queryString}`);
  }

  /**
   * Obtener detalles de un libro específico
   */
  obtenerLibro(id: number): Observable<ApiResponse<Libro>> {
    return this.apiService.get<ApiResponse<Libro>>(`/libros/${id}/`);
  }

  /**
   * Obtener categorías disponibles
   */
  obtenerCategorias(): Observable<ApiResponse<string[]>> {
    return this.apiService.get<ApiResponse<string[]>>('/categorias/');
  }

  /**
   * Registrar nuevo libro (solo Administradores)
   */
  registrarLibro(libroData: LibroRegistro): Observable<ApiResponse<Libro>> {
    return this.apiService.post<ApiResponse<Libro>>('/libros/crear/', libroData);
  }

  /**
   * Actualizar libro (solo Administradores)
   */
  actualizarLibro(id: number, libroData: Partial<LibroRegistro>): Observable<ApiResponse<Libro>> {
    return this.apiService.put<ApiResponse<Libro>>(`/libros/${id}/actualizar/`, libroData);
  }

  /**
   * Eliminar libro (solo Administradores)
   */
  eliminarLibro(id: number): Observable<ApiResponse<any>> {
    return this.apiService.delete<ApiResponse<any>>(`/libros/${id}/eliminar/`);
  }

  // ==================== GESTIÓN DE PRÉSTAMOS ====================

  /**
   * Solicitar préstamo de un libro
   */
  solicitarPrestamo(prestamoData: PrestamoRequest): Observable<ApiResponse<Prestamo>> {
    return this.apiService.post<ApiResponse<Prestamo>>('/prestamos/crear/', prestamoData);
  }

  /**
   * Obtener préstamos del usuario actual
   */
  obtenerMisPrestamos(page: number = 1): Observable<PrestamoResponse> {
    return this.apiService.get<PrestamoResponse>(`/prestamos/?page=${page}`);
  }

  /**
   * Obtener historial completo de préstamos del usuario
   */
  obtenerHistorialPrestamos(page: number = 1): Observable<PrestamoResponse> {
    return this.apiService.get<PrestamoResponse>(`/prestamos/?page=${page}`);
  }

  /**
   * Obtener todos los préstamos (solo Administradores)
   */
  obtenerTodosPrestamos(page: number = 1, filtros?: any): Observable<PrestamoResponse> {
    let query = `page=${page}`;
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          query += `&${key}=${filtros[key]}`;
        }
      });
    }
    return this.apiService.get<PrestamoResponse>(`/prestamos/?${query}`);
  }

  /**
   * Devolver libro (Administradores)
   */
  devolverLibro(prestamoId: number, observaciones?: string): Observable<ApiResponse<Prestamo>> {
    return this.apiService.post<ApiResponse<Prestamo>>(`/prestamos/${prestamoId}/devolver/`, {
      observaciones
    });
  }

  /**
   * Renovar préstamo
   */
  renovarPrestamo(prestamoId: number): Observable<ApiResponse<Prestamo>> {
    return this.apiService.post<ApiResponse<Prestamo>>(`/prestamos/${prestamoId}/renovar/`, {});
  }

  // ==================== GESTIÓN DE RESERVAS ====================

  /**
   * Crear reserva de un libro
   */
  crearReserva(reservaData: ReservaRequest): Observable<ApiResponse<Reserva>> {
    return this.apiService.post<ApiResponse<Reserva>>('/reservas/crear/', reservaData);
  }

  /**
   * Obtener reservas del usuario actual
   */
  obtenerMisReservas(page: number = 1): Observable<any> {
    return this.apiService.get(`/reservas/?page=${page}`);
  }

  /**
   * Cancelar reserva
   */
  cancelarReserva(reservaId: number): Observable<ApiResponse<any>> {
    return this.apiService.post<ApiResponse<any>>(`/reservas/${reservaId}/cancelar/`, {});
  }

  /**
   * Obtener todas las reservas (solo Administradores)
   */
  obtenerTodasReservas(page: number = 1): Observable<any> {
    return this.apiService.get(`/reservas/?page=${page}`);
  }

  // ==================== GESTIÓN DE BIBLIOGRAFÍA (DOCENTES) ====================

  /**
   * Obtener bibliografías del docente
   */
  obtenerMisBibliografias(): Observable<ApiResponse<Bibliografia[]>> {
    return this.apiService.get<ApiResponse<Bibliografia[]>>('/bibliografias/');
  }

  /**
   * Crear nueva bibliografía
   */
  crearBibliografia(bibliografiaData: { curso: string; descripcion?: string; libros?: number[] }): Observable<ApiResponse<Bibliografia>> {
    return this.apiService.post<ApiResponse<Bibliografia>>('/bibliografias/crear/', bibliografiaData);
  }

  /**
   * Actualizar bibliografía
   */
  actualizarBibliografia(id: number, bibliografiaData: any): Observable<ApiResponse<Bibliografia>> {
    return this.apiService.put<ApiResponse<Bibliografia>>(`/bibliografias/${id}/actualizar/`, bibliografiaData);
  }

  /**
   * Agregar libro a bibliografía
   */
  agregarLibroABibliografia(bibliografiaId: number, libroId: number): Observable<ApiResponse<any>> {
    return this.apiService.post<ApiResponse<any>>(`/bibliografias/${bibliografiaId}/agregar-libro/`, {
      libro_id: libroId
    });
  }

  /**
   * Remover libro de bibliografía
   */
  removerLibroDeBibliografia(bibliografiaId: number, libroId: number): Observable<ApiResponse<any>> {
    return this.apiService.post<ApiResponse<any>>(`/bibliografias/${bibliografiaId}/remover-libro/`, {
      libro_id: libroId
    });
  }

  /**
   * Obtener bibliografías públicas
   */
  obtenerBibliografiasPublicas(curso?: string): Observable<ApiResponse<Bibliografia[]>> {
    const query = curso ? `?curso=${curso}` : '';
    return this.apiService.get<ApiResponse<Bibliografia[]>>(`/bibliografias/${query}`);
  }

  // ==================== GESTIÓN DE SANCIONES (ADMINISTRADORES) ====================

  /**
   * Obtener sanciones del usuario actual
   */
  obtenerMisSanciones(): Observable<ApiResponse<Sancion[]>> {
    return this.apiService.get<ApiResponse<Sancion[]>>('/sanciones/');
  }

  /**
   * Obtener todas las sanciones (solo Administradores)
   */
  obtenerTodasSanciones(page: number = 1): Observable<any> {
    return this.apiService.get(`/sanciones/?page=${page}`);
  }

  /**
   * Aplicar sanción (solo Administradores)
   */
  aplicarSancion(sancionData: any): Observable<ApiResponse<Sancion>> {
    return this.apiService.post<ApiResponse<Sancion>>('/sanciones/crear/', sancionData);
  }

  /**
   * Actualizar sanción (solo Administradores)
   */
  actualizarSancion(id: number, sancionData: any): Observable<ApiResponse<Sancion>> {
    return this.apiService.put<ApiResponse<Sancion>>(`/sanciones/${id}/`, sancionData);
  }

  /**
   * Pagar multa
   */
  pagarMulta(sancionId: number, metodoPago: string): Observable<ApiResponse<any>> {
    return this.apiService.post<ApiResponse<any>>(`/sanciones/${sancionId}/pagar/`, {
      metodo_pago: metodoPago
    });
  }

  // ==================== ESTADÍSTICAS Y REPORTES ====================

  /**
   * Obtener estadísticas del sistema (solo Administradores)
   */
  obtenerEstadisticas(): Observable<ApiResponse<any>> {
    return this.apiService.get<ApiResponse<any>>('/estadisticas/');
  }

  /**
   * Obtener préstamos vencidos (solo Administradores)
   */
  obtenerPrestamosVencidos(): Observable<ApiResponse<Prestamo[]>> {
    return this.apiService.get<ApiResponse<Prestamo[]>>('/prestamos-vencidos/');
  }

  /**
   * Generar reporte de actividad (solo Administradores)
   */
  generarReporteActividad(fechaInicio: string, fechaFin: string): Observable<ApiResponse<any>> {
    return this.apiService.get<ApiResponse<any>>(`/reportes/actividad/?inicio=${fechaInicio}&fin=${fechaFin}`);
  }
}