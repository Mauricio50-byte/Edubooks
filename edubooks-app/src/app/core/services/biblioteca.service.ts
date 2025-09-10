import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, delay, catchError } from 'rxjs/operators';

import { Libro, Prestamo, Reserva } from '../models/libro.model';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class BibliotecaService {
  private librosSubject = new BehaviorSubject<Libro[]>([]);
  public libros$ = this.librosSubject.asObservable();
  
  private prestamosSubject = new BehaviorSubject<Prestamo[]>([]);
  public prestamos$ = this.prestamosSubject.asObservable();
  
  private reservasSubject = new BehaviorSubject<Reserva[]>([]);
  public reservas$ = this.reservasSubject.asObservable();

  private libros: Libro[] = [];
  private prestamos: Prestamo[] = [];
  private reservas: Reserva[] = [];

  constructor(
    private authService: AuthService,
    private apiService: ApiService
  ) {
    this.initializeData();
  }

  private initializeData() {
    // Inicializar con array vacío - los datos se cargan desde el backend
    this.libros = [];

    this.librosSubject.next(this.libros);
  }

  // Métodos para libros
  getLibros(): Observable<Libro[]> {
    return this.apiService.get('/libros/').pipe(
      map((response: any) => {
        const librosBackend = response.results || response;
        // Convertir datos del backend al formato del modelo
        const libros = librosBackend.map((libro: any) => ({
          id: libro.id,
          titulo: libro.titulo,
          autor: libro.autor,
          isbn: libro.isbn,
          editorial: libro.editorial,
          año_publicacion: libro.año_publicacion,
          categoria: libro.categoria,
          ubicacion: libro.ubicacion,
          estado: libro.estado,
          cantidad_total: libro.cantidad_total,
          cantidad_disponible: libro.cantidad_disponible,
          descripcion: libro.descripcion,
          imagen_portada: libro.imagen_portada,
          fecha_registro: libro.fecha_registro
        }));
        // Actualizar datos locales
        this.libros = libros;
        this.librosSubject.next([...this.libros]);
        return libros;
      }),
      catchError(error => {
        console.error('Error obteniendo libros:', error);
        // En caso de error, devolver datos locales
        return of(this.libros);
      })
    );
  }

  getLibroById(id: number): Observable<Libro | undefined> {
    const libro = this.libros.find(l => l.id === id);
    return of(libro).pipe(delay(300));
  }

  searchLibros(termino: string): Observable<Libro[]> {
    const terminoLower = termino.toLowerCase();
    const resultados = this.libros.filter(libro => 
      libro.titulo.toLowerCase().includes(terminoLower) ||
      libro.autor.toLowerCase().includes(terminoLower) ||
      libro.categoria.toLowerCase().includes(terminoLower) ||
      libro.isbn?.includes(termino)
    );
    return of(resultados).pipe(delay(400));
  }

  filterLibrosByCategoria(categoria: string): Observable<Libro[]> {
    if (!categoria || categoria === 'Todas') {
      return this.getLibros();
    }
    const filtrados = this.libros.filter(libro => libro.categoria === categoria);
    return of(filtrados).pipe(delay(300));
  }

  filterLibrosByEstado(estado: string): Observable<Libro[]> {
    if (!estado || estado === 'Todos') {
      return this.getLibros();
    }
    const filtrados = this.libros.filter(libro => libro.estado === estado);
    return of(filtrados).pipe(delay(300));
  }

  getCategorias(): Observable<string[]> {
    return this.apiService.get('/categorias/').pipe(
      map((response: any) => response.categorias || []),
      catchError(error => {
        console.error('Error obteniendo categorías:', error);
        // Fallback a categorías extraídas de los libros locales
        const categoriasUnicas = [...new Set(this.libros.map(libro => libro.categoria))];
        return of(categoriasUnicas);
      })
    );
  }

  getEstados(): Observable<string[]> {
    const estados = ['Disponible', 'Prestado', 'Reservado', 'Mantenimiento'];
    return of(estados);
  }

  // Métodos para préstamos
  prestarLibro(libroId: number): Observable<any> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    // Llamar al backend real
    return this.apiService.post('/prestamos/crear/', { libro_id: libroId })
      .pipe(
        map(response => {
          // Actualizar datos locales si es exitoso
          this.actualizarDatosLocalesDespuesPrestamo(libroId);
          return response;
        }),
        catchError(error => {
          console.error('Error creando préstamo:', error);
          // Fallback a lógica simulada en caso de error de conexión
          return this.prestarLibroSimulado(libroId);
        })
      );
  }

  /**
   * Método de fallback para préstamo simulado
   */
  private prestarLibroSimulado(libroId: number): Observable<any> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const libro = this.libros.find(l => l.id === libroId);
    if (!libro) {
      return throwError(() => new Error('Libro no encontrado'));
    }

    if (libro.cantidad_disponible <= 0) {
      return throwError(() => new Error('No hay ejemplares disponibles'));
    }

    // Verificar si el usuario ya tiene este libro prestado
    const prestamoExistente = this.prestamos.find(p => 
      p.libro.id === libroId && p.usuario.id === usuario.id && p.estado === 'Activo'
    );
    
    if (prestamoExistente) {
      return throwError(() => new Error('Ya tienes este libro prestado'));
    }

    // Crear nuevo préstamo simulado
    const fechaDevolucion = new Date();
    fechaDevolucion.setDate(fechaDevolucion.getDate() + 15);

    const nuevoPrestamo: Prestamo = {
      id: this.prestamos.length + 1,
      libro: libro,
      usuario: {
        id: usuario.id ?? 0,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol
      },
      fecha_prestamo: new Date().toISOString(),
      fecha_devolucion_esperada: fechaDevolucion.toISOString().split('T')[0],
      fecha_devolucion_real: undefined,
      estado: 'Activo',
      observaciones: undefined
    };

    this.prestamos.push(nuevoPrestamo);
    this.actualizarDatosLocalesDespuesPrestamo(libroId);

    return of({ success: true, prestamo: nuevoPrestamo }).pipe(delay(500));
  }

  /**
   * Actualizar datos locales después de un préstamo exitoso
   */
  private actualizarDatosLocalesDespuesPrestamo(libroId: number): void {
    const libro = this.libros.find(l => l.id === libroId);
    if (libro) {
      libro.cantidad_disponible--;
      if (libro.cantidad_disponible === 0) {
        libro.estado = 'Prestado';
      }
      this.librosSubject.next([...this.libros]);
    }
    this.prestamosSubject.next([...this.prestamos]);
  }

  devolverLibro(prestamoId: number): Observable<any> {
    // Llamar al backend real
    return this.apiService.post(`/prestamos/${prestamoId}/devolver/`, {})
      .pipe(
        map(response => {
          // Actualizar datos locales si es exitoso
          this.actualizarDatosLocalesDespuesDevolucion(prestamoId);
          return response;
        }),
        catchError(error => {
          console.error('Error devolviendo libro:', error);
          // Fallback a lógica simulada en caso de error de conexión
          return this.devolverLibroSimulado(prestamoId);
        })
      );
  }

  /**
   * Método de fallback para devolución simulada
   */
  private devolverLibroSimulado(prestamoId: number): Observable<any> {
    const prestamo = this.prestamos.find(p => p.id === prestamoId);
    if (!prestamo) {
      return throwError(() => new Error('Préstamo no encontrado'));
    }

    if (prestamo.estado !== 'Activo') {
      return throwError(() => new Error('Este préstamo ya fue devuelto'));
    }

    // Actualizar préstamo simulado
    prestamo.estado = 'Devuelto';
    prestamo.fecha_devolucion_real = new Date().toISOString();
    
    this.actualizarDatosLocalesDespuesDevolucion(prestamoId);
    return of({ success: true }).pipe(delay(500));
  }

  /**
   * Actualizar datos locales después de una devolución exitosa
   */
  private actualizarDatosLocalesDespuesDevolucion(prestamoId: number): void {
    const prestamo = this.prestamos.find(p => p.id === prestamoId);
    if (prestamo) {
      // Actualizar disponibilidad del libro
      const libro = this.libros.find(l => l.id === prestamo.libro.id);
      if (libro) {
        libro.cantidad_disponible++;
        if (libro.cantidad_disponible > 0 && libro.estado === 'Prestado') {
          libro.estado = 'Disponible';
        }
        this.librosSubject.next([...this.libros]);
      }
      this.prestamosSubject.next([...this.prestamos]);
    }
  }

  getPrestamosUsuario(): Observable<Prestamo[]> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return of([]);
    }

    const prestamosUsuario = this.prestamos.filter(p => p.usuario.id === usuario.id);
    return of(prestamosUsuario).pipe(delay(400));
  }

  getPrestamosActivos(): Observable<Prestamo[]> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return of([]);
    }

    const prestamosActivos = this.prestamos.filter(p => 
      p.usuario.id === usuario.id && p.estado === 'Activo'
    );
    return of(prestamosActivos).pipe(delay(400));
  }

  /**
   * Obtener todos los préstamos (para administradores) o del usuario actual
   */
  getPrestamos(): Observable<Prestamo[]> {
    return this.apiService.get<{results: Prestamo[]}>('/prestamos/')
      .pipe(
        map(response => response.results || response as any),
        catchError(error => {
          console.error('Error obteniendo préstamos:', error);
          // Fallback a datos simulados en caso de error
          const usuario = this.authService.currentUserValue;
          if (usuario?.rol === 'Administrador') {
            return of(this.prestamos);
          } else {
            return of(this.prestamos.filter(p => p.usuario.id === usuario?.id));
          }
        })
      );
  }

  /**
   * Registrar nuevo libro (solo administradores)
   */
  registrarLibro(libroData: any): Observable<any> {
    // Limpiar y normalizar los datos antes de enviar
    const datosLimpios: any = {
      titulo: libroData.titulo?.trim() || '',
      autor: libroData.autor?.trim() || '',
      isbn: libroData.isbn?.trim() || '',
      categoria: libroData.categoria?.trim() || '',
      editorial: libroData.editorial?.trim() || '',
      ubicacion: libroData.ubicacion?.trim() || 'A1-001',
      cantidad_total: parseInt(libroData.cantidad_total) || 1,
      cantidad_disponible: parseInt(libroData.cantidad_total) || 1,
      descripcion: libroData.descripcion?.trim() || '',
      estado: 'Disponible'
    };
    
    // Solo agregar año_publicacion si tiene valor válido
    if (libroData.año_publicacion && libroData.año_publicacion >= 1000 && libroData.año_publicacion <= 2030) {
      datosLimpios['año_publicacion'] = parseInt(libroData.año_publicacion);
    }
    
    console.log('Datos enviados al backend:', datosLimpios);
    
    return this.apiService.post('/libros/crear/', datosLimpios)
      .pipe(
        map(response => {
          console.log('Libro registrado exitosamente:', response);
          // Actualizar lista local de libros
          this.cargarLibros();
          return response;
        }),
        catchError(error => {
          console.error('Error registrando libro:', error);
          console.error('Datos que causaron el error:', datosLimpios);
          throw error;
        })
      );
  }

  /**
   * Cargar libros desde el backend
   */
  private cargarLibros(): void {
    this.apiService.get('/libros/').subscribe({
      next: (response: any) => {
        const librosBackend = response.results || response;
        // Convertir datos del backend al formato del modelo
        this.libros = librosBackend.map((libro: any) => ({
          id: libro.id,
          titulo: libro.titulo,
          autor: libro.autor,
          isbn: libro.isbn,
          editorial: libro.editorial,
          año_publicacion: libro.año_publicacion,
          categoria: libro.categoria,
          ubicacion: libro.ubicacion,
          estado: libro.estado,
          cantidad_total: libro.cantidad_total,
          cantidad_disponible: libro.cantidad_disponible,
          descripcion: libro.descripcion,
          imagen_portada: libro.imagen_portada,
          fecha_registro: libro.fecha_registro
        }));
        this.librosSubject.next([...this.libros]);
        console.log('Libros cargados desde backend:', this.libros.length);
      },
      error: (error) => {
        console.error('Error cargando libros desde backend:', error);
        // En caso de error, mantener los datos locales
      }
    });
  }

  /**
   * Cargar bibliografías desde el backend
   */
  private cargarBibliografias(): void {
    this.obtenerBibliografias().subscribe({
      next: (response: any) => {
        // Actualizar lista local si existe
        const bibliografias = response?.results || [];
        console.log('Bibliografías actualizadas:', bibliografias.length);
      },
      error: (error: any) => console.error('Error cargando bibliografías:', error)
    });
  }

  // Métodos para reservas
  reservarLibro(libroId: number): Observable<any> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const libro = this.libros.find(l => l.id === libroId);
    if (!libro) {
      return throwError(() => new Error('Libro no encontrado'));
    }

    if (libro.cantidad_disponible > 0) {
      return throwError(() => new Error('El libro está disponible, puedes prestarlo directamente'));
    }

    // Verificar si el usuario ya tiene una reserva activa para este libro
    const reservaExistente = this.reservas.find(r => 
      r.libro.id === libroId && r.usuario.id === usuario.id && r.estado === 'Activa'
    );
    
    if (reservaExistente) {
      return throwError(() => new Error('Ya tienes una reserva activa para este libro'));
    }

    // Crear nueva reserva
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 3); // 3 días

    const nuevaReserva: Reserva = {
      id: this.reservas.length + 1,
      libro: libro,
      usuario: {
        id: usuario.id ?? 0,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email
      },
      fecha_reserva: new Date().toISOString(),
      estado: 'Activa',
      fecha_expiracion: fechaExpiracion.toISOString()
    };

    this.reservas.push(nuevaReserva);
    
    // Actualizar estado del libro si es necesario
    if (libro.estado === 'Disponible') {
      libro.estado = 'Reservado';
    }

    this.librosSubject.next([...this.libros]);
    this.reservasSubject.next([...this.reservas]);

    return of({ success: true, reserva: nuevaReserva }).pipe(delay(500));
  }

  cancelarReserva(reservaId: number): Observable<any> {
    const reserva = this.reservas.find(r => r.id === reservaId);
    if (!reserva) {
      return throwError(() => new Error('Reserva no encontrada'));
    }

    if (reserva.estado !== 'Activa') {
      return throwError(() => new Error('Esta reserva ya fue procesada'));
    }

    // Actualizar reserva
    reserva.estado = 'Cancelada';

    // Verificar si hay otras reservas activas para este libro
    const otrasReservas = this.reservas.filter(r => 
      r.libro.id === reserva.libro.id && r.estado === 'Activa' && r.id !== reservaId
    );

    // Si no hay otras reservas y el libro no está prestado, marcarlo como disponible
    const libro = this.libros.find(l => l.id === reserva.libro.id);
    if (libro && otrasReservas.length === 0 && libro.cantidad_disponible > 0) {
      libro.estado = 'Disponible';
    }

    this.librosSubject.next([...this.libros]);
    this.reservasSubject.next([...this.reservas]);

    return of({ success: true }).pipe(delay(500));
  }

  getReservasUsuario(): Observable<Reserva[]> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return of([]);
    }

    const reservasUsuario = this.reservas.filter(r => r.usuario.id === usuario.id);
    return of(reservasUsuario).pipe(delay(400));
  }

  getReservasActivas(): Observable<Reserva[]> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return of([]);
    }

    const reservasActivas = this.reservas.filter(r => 
      r.usuario.id === usuario.id && r.estado === 'Activa'
    );
    return of(reservasActivas).pipe(delay(400));
  }

  // Métodos de utilidad
  puedePrestar(libroId: number): Observable<boolean> {
    const libro = this.libros.find(l => l.id === libroId);
    return of(libro ? libro.cantidad_disponible > 0 : false);
  }

  puedeReservar(libroId: number): Observable<boolean> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return of(false);
    }

    const libro = this.libros.find(l => l.id === libroId);
    if (!libro || libro.cantidad_disponible > 0) {
      return of(false);
    }

    const reservaExistente = this.reservas.find(r => 
      r.libro.id === libroId && r.usuario.id === usuario.id && r.estado === 'Activa'
    );

    return of(!reservaExistente);
  }

  getEstadisticas(): Observable<any> {
    const totalLibros = this.libros.length;
    const librosDisponibles = this.libros.filter(l => l.cantidad_disponible > 0).length;
    const librosPrestados = this.libros.filter(l => l.estado === 'Prestado').length;
    const librosReservados = this.libros.filter(l => l.estado === 'Reservado').length;

    const usuario = this.authService.currentUserValue;
    let prestamosActivos = 0;
    let reservasActivas = 0;

    if (usuario) {
      prestamosActivos = this.prestamos.filter(p => 
        p.usuario.id === usuario.id && p.estado === 'Activo'
      ).length;
      
      reservasActivas = this.reservas.filter(r => 
        r.usuario.id === usuario.id && r.estado === 'Activa'
      ).length;
    }

    return of({
      totalLibros,
      librosDisponibles,
      librosPrestados,
      librosReservados,
      prestamosActivos,
      reservasActivas
    }).pipe(delay(300));
  }

  // ============ MÉTODOS DE BIBLIOGRAFÍA ============

  /**
   * Obtener bibliografías del usuario actual
   */
  obtenerBibliografias(filtros?: any): Observable<any> {
    // TODO: Implementar llamada real a la API
    // return this.http.get(`${this.apiUrl}/bibliografias/`, { params: filtros });
    
    // Simulación temporal
    const bibliografiasMuestra = [
      {
        id: 1,
        curso: 'Programación I',
        programa: 'Ingeniería de Sistemas',
        descripcion: 'Bibliografía básica para el curso de programación',
        libros: this.libros.slice(0, 3),
        fecha_creacion: new Date().toISOString(),
        activa: true,
        es_publica: true,
        docente: {
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez'
        }
      }
    ];
    
    return of({ results: bibliografiasMuestra }).pipe(delay(500));
  }

  /**
   * Crear nueva bibliografía
   */
  crearBibliografia(data: any): Observable<any> {
    return this.apiService.post('/bibliografias/crear/', data)
      .pipe(
        map(response => {
          // Actualizar lista local de bibliografías
          this.cargarBibliografias();
          return response;
        }),
        catchError(error => {
          console.error('Error creando bibliografía:', error);
          // Fallback a simulación en caso de error
          return of({ success: true, message: 'Bibliografía creada exitosamente (simulado)' }).pipe(delay(1000));
        })
      );
  }

  /**
   * Actualizar bibliografía
   */
  actualizarBibliografia(id: number, data: any): Observable<any> {
    // TODO: Implementar llamada real a la API
    // return this.http.put(`${this.apiUrl}/bibliografias/${id}/actualizar/`, data);
    
    // Simulación temporal
    return of({ success: true, message: 'Bibliografía actualizada exitosamente' }).pipe(delay(1000));
  }

  /**
   * Obtener detalle de una bibliografía
   */
  obtenerBibliografia(id: number): Observable<any> {
    // TODO: Implementar llamada real a la API
    // return this.http.get(`${this.apiUrl}/bibliografias/${id}/`);
    
    // Simulación temporal
    const bibliografia = {
      id: id,
      curso: 'Programación I',
      programa: 'Ingeniería de Sistemas',
      descripcion: 'Bibliografía básica para el curso de programación',
      libros: this.libros.slice(0, 3),
      fecha_creacion: new Date().toISOString(),
      activa: true,
      es_publica: true,
      docente: {
        id: 1,
        nombre: 'Juan',
        apellido: 'Pérez'
      }
    };
    
    return of(bibliografia).pipe(delay(500));
  }

  /**
   * Agregar libro a bibliografía
   */
  agregarLibroABibliografia(bibliografiaId: number, libroId: number): Observable<any> {
    // TODO: Implementar llamada real a la API
    // return this.http.post(`${this.apiUrl}/bibliografias/${bibliografiaId}/agregar-libro/`, { libro_id: libroId });
    
    // Simulación temporal
    return of({ success: true, message: 'Libro agregado exitosamente' }).pipe(delay(800));
  }

  /**
   * Remover libro de bibliografía
   */
  removerLibroDeBibliografia(bibliografiaId: number, libroId: number): Observable<any> {
    // TODO: Implementar llamada real a la API
    // return this.http.delete(`${this.apiUrl}/bibliografias/${bibliografiaId}/remover-libro/${libroId}/`);
    
    // Simulación temporal
    return of({ success: true, message: 'Libro removido exitosamente' }).pipe(delay(800));
  }

  /**
   * Obtener programas académicos disponibles
   */
  obtenerProgramas(): Observable<any> {
    // TODO: Implementar llamada real a la API
    // return this.http.get(`${this.apiUrl}/programas/`);
    
    // Simulación temporal
    const programas = [
      'Ingeniería de Sistemas',
      'Ingeniería Industrial',
      'Administración de Empresas',
      'Contaduría Pública',
      'Derecho',
      'Medicina',
      'Psicología'
    ];
    
    return of({ programas }).pipe(delay(300));
  }

  /**
   * Obtener bibliografías por programa
   */
  obtenerBibliografiasPorPrograma(programa: string): Observable<any> {
    // TODO: Implementar llamada real a la API
    // return this.http.get(`${this.apiUrl}/bibliografias/programa/${programa}/`);
    
    // Simulación temporal
    const bibliografias = [
      {
        id: 1,
        curso: 'Programación I',
        programa: programa,
        descripcion: 'Bibliografía básica para el curso de programación',
        libros: this.libros.slice(0, 3),
        fecha_creacion: new Date().toISOString(),
        activa: true,
        es_publica: true,
        docente: {
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez'
        }
      }
    ];
    
    return of(bibliografias).pipe(delay(500));
  }

  /**
   * Buscar libros para agregar a bibliografía
   */
  buscarLibrosParaBibliografia(termino: string): Observable<Libro[]> {
    return this.searchLibros(termino);
  }
}