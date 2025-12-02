import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError, concat } from 'rxjs';
import { map, delay, catchError } from 'rxjs/operators';

import { Libro, Prestamo, Reserva } from '../models/libro.model';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { Database, ref, set, onValue } from '@angular/fire/database';

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
  private entidadId = 'default';
  setEntidadId(id: string) { this.entidadId = String(id || 'default'); }
  getEntidadId(): string { return this.entidadId; }
  private rtLibroIdMap = new Map<number, string>();
  private rtLibroIdReverse = new Map<string, number>();

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private db: Database
  ) {
    this.initializeData();
  }

  // Acceso a Firebase Realtime Database
  async crearLibroFirebase(id: string, data: any) {
    await set(ref(this.db, `libros/${id}`), data);
  }

  onLibrosFirebase(callback: (val: any) => void) {
    onValue(ref(this.db, 'libros'), snapshot => callback(snapshot.val()));
  }

  private initializeData() {
    // Inicializar con array vacío - los datos se cargan desde el backend
    this.libros = [];

    this.librosSubject.next(this.libros);
  }

  // Métodos para libros
  getLibros(): Observable<Libro[]> {
    return this.apiService.get('/libros/rt/libros/').pipe(
      map((response: any) => {
        const librosBackend = response.results || response;
        // Convertir datos del backend al formato del modelo
        let counter = 1;
        const libros = librosBackend.map((libro: any) => {
          const rtId = String(libro.id);
          let numId = this.rtLibroIdReverse.get(rtId);
          if (!numId) {
            numId = counter++;
            this.rtLibroIdMap.set(numId, rtId);
            this.rtLibroIdReverse.set(rtId, numId);
          }
          return {
          id: numId,
          titulo: libro.titulo,
          autor: libro.autor,
          isbn: libro.isbn,
          editorial: libro.editorial,
          anio_publicacion: libro.año_publicacion ?? libro.anio_publicacion ?? undefined,
          categoria: libro.categoria,
          ubicacion: libro.ubicacion,
          estado: libro.estado,
          cantidad_total: libro.cantidad_total,
          cantidad_disponible: libro.cantidad_disponible,
          descripcion: libro.descripcion,
          imagen_portada: libro.imagen_portada,
          fecha_registro: libro.fecha_registro,
          usuario_tiene_prestamo: libro.usuario_tiene_prestamo ?? false,
          prestamo_estado_usuario: libro.prestamo_estado_usuario
        }});
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

  getLibroById(id: string | number): Observable<Libro | undefined> {
    const cached = this.libros.find(l => l.id === id);

    // Helper para detectar si el objeto en caché está incompleto (campos de detalle faltantes)
    const isDetalleIncompleto = (libro: Libro): boolean => {
      return (
        libro.fecha_registro === undefined ||
        libro.editorial === undefined ||
        libro.isbn === undefined ||
        libro.cantidad_total === undefined ||
        libro.ubicacion === undefined ||
        libro.descripcion === undefined ||
        libro.anio_publicacion === undefined
      );
    };

    const api$ = this.apiService.get('/libros/rt/libros/').pipe(
      map((libro: any) => {
        if (!libro) return undefined;

        const mapped: Libro = {
          id: libro.id,
          titulo: libro.titulo,
          autor: libro.autor,
          isbn: libro.isbn,
          editorial: libro.editorial,
          anio_publicacion: libro.año_publicacion ?? libro.anio_publicacion ?? undefined,
          categoria: libro.categoria,
          ubicacion: libro.ubicacion,
          estado: libro.estado,
          cantidad_total: libro.cantidad_total,
          cantidad_disponible: libro.cantidad_disponible,
          descripcion: libro.descripcion,
          imagen_portada: libro.imagen_portada,
          fecha_registro: libro.fecha_registro,
          usuario_tiene_prestamo: libro.usuario_tiene_prestamo ?? undefined,
          prestamo_estado_usuario: libro.prestamo_estado_usuario
        };

        const idx = this.libros.findIndex(l => l.id === mapped.id);
        if (idx >= 0) {
          this.libros[idx] = mapped;
        } else {
          this.libros.push(mapped);
        }
        this.librosSubject.next([...this.libros]);
        return mapped;
      }),
      catchError(error => {
        console.error('Error obteniendo libro por ID:', error);
        return of(undefined);
      })
    );

    // Política de emisión: evitar estados intermedios incompletos
    // - Si hay caché completo: emitirlo (una sola vez)
    // - Si hay caché incompleto: NO emitirlo; obtener detalle del backend y emitir una sola vez
    // - Si no hay caché: obtener del backend y emitir una sola vez
    if (cached) {
      if (!isDetalleIncompleto(cached)) {
        return of(cached).pipe(delay(100));
      }
      // Caché incompleto: forzar detalle del backend
      return api$;
    }

    // Sin caché: obtener del backend
    return api$;
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
    const categoriasUnicas = [...new Set(this.libros.map(libro => libro.categoria))];
    return of(categoriasUnicas);
  }

  getEstados(): Observable<string[]> {
    const estados = ['Disponible', 'Prestado', 'Reservado', 'Mantenimiento'];
    return of(estados);
  }

  // Métodos para préstamos
  prestarLibro(libroId: number, extra?: { observaciones?: string }): Observable<any> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    // Llamar al backend real
    const rtId = this.rtLibroIdMap.get(libroId) || String(libroId);
    const payload: any = { libroId: rtId };
    if (extra?.observaciones) payload.observaciones = String(extra.observaciones).trim();
    return this.apiService.post('/libros/rt/prestamos/crear/', payload)
      .pipe(
        map(response => {
          this.actualizarDatosLocalesDespuesPrestamo(libroId);
          return response;
        }),
        catchError(error => {
          // Si es fallo de conexión (status 0), usar simulación; si es validación 400/409, propagar mensaje claro
          const msg = (error?.message || '').toLowerCase();
          const isConn = msg.includes('no se pudo conectar');
          if (isConn) {
            return this.prestarLibroSimulado(libroId);
          }
          return throwError(() => new Error(error?.message || 'No se pudo crear el préstamo'));
        })
      );
  }

  /**
   * Método de fallback para préstamo simulado
   */
  private prestarLibroSimulado(libroId: string | number, extra?: { observaciones?: string }): Observable<any> {
    const usuario = this.authService.currentUserValue;
    if (!usuario) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    const libro = this.libros.find(l => l.id === Number(libroId));
    if (!libro) {
      return throwError(() => new Error('Libro no encontrado'));
    }

    if (libro.cantidad_disponible <= 0) {
      return throwError(() => new Error('No hay ejemplares disponibles'));
    }

    // Verificar si el usuario ya tiene este libro prestado
    const prestamoExistente = this.prestamos.find(p => 
      p.libro.id === Number(libroId) && p.usuario.id === usuario.id && p.estado === 'Activo'
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
      observaciones: extra?.observaciones || undefined
    };

    this.prestamos.push(nuevoPrestamo);
    this.actualizarDatosLocalesDespuesPrestamo(Number(libroId));

    return of({ success: true, prestamo: nuevoPrestamo }).pipe(delay(500));
  }

  /**
   * Actualizar datos locales después de un préstamo exitoso
   */
  private actualizarDatosLocalesDespuesPrestamo(libroId: string | number): void {
    const libro = this.libros.find(l => l.id === Number(libroId));
    if (libro) {
      libro.cantidad_disponible--;
      if (libro.cantidad_disponible === 0) {
        libro.estado = 'Prestado';
      }
      this.librosSubject.next([...this.libros]);
    }
    this.prestamosSubject.next([...this.prestamos]);
  }

  devolverLibro(prestamoId: string | number, data?: { fecha_devolucion_real?: string; observaciones?: string }): Observable<any> {
    // Llamar al backend real
    const payload: any = {};
    if (data?.fecha_devolucion_real) payload.fecha_devolucion_real = data.fecha_devolucion_real;
    if (data?.observaciones) payload.observaciones = String(data.observaciones).trim();
    return this.apiService.post(`/libros/rt/prestamos/${String(prestamoId)}/devolver/`, payload)
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
  private devolverLibroSimulado(prestamoId: string | number, data?: { fecha_devolucion_real?: string; observaciones?: string }): Observable<any> {
    const prestamo = this.prestamos.find(p => p.id === Number(prestamoId));
    if (!prestamo) {
      return throwError(() => new Error('Préstamo no encontrado'));
    }

    if (prestamo.estado !== 'Activo') {
      return throwError(() => new Error('Este préstamo ya fue devuelto'));
    }

    // Actualizar préstamo simulado
    prestamo.estado = 'Devuelto';
    prestamo.fecha_devolucion_real = data?.fecha_devolucion_real || new Date().toISOString();
    if (data?.observaciones) prestamo.observaciones = String(data.observaciones).trim();
    
    this.actualizarDatosLocalesDespuesDevolucion(Number(prestamoId));
    return of({ success: true }).pipe(delay(500));
  }

  /**
   * Actualizar datos locales después de una devolución exitosa
   */
  private actualizarDatosLocalesDespuesDevolucion(prestamoId: string | number): void {
    const prestamo = this.prestamos.find(p => p.id === Number(prestamoId));
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
    return this.apiService.get<{results: any[]}>('/libros/rt/prestamos/')
      .pipe(
        map(response => {
          const raw = response.results || [];
          const usuario = this.authService.currentUserValue;
          const uidOrEmail = usuario?.email || '';
          const list = raw.filter(p => String(p.usuarioId) === uidOrEmail);
          let i = 1;
          return list.map(p => ({
            id: i++,
            libro: this.libros.find(l => String(l.id) === String(p.libroId)) as any,
            usuario: {
              id: 0,
              nombre: usuario?.nombre || '',
              apellido: usuario?.apellido || '',
              email: usuario?.email || '',
              rol: usuario?.rol || 'estudiante'
            },
            fecha_prestamo: p.fecha_prestamo,
            fecha_devolucion_esperada: p.fecha_devolucion_esperada || '',
            estado: p.estado,
            observaciones: p.observaciones
          }));
        }),
        catchError(error => {
          console.error('Error obteniendo préstamos del usuario:', error);
          return of([]);
        })
      );
  }

  getPrestamosActivos(): Observable<Prestamo[]> {
    return this.apiService.get<{results: any[]}>('/libros/rt/prestamos/?estado=Activo')
      .pipe(
        map(response => {
          const raw = response.results || [];
          let i = 1;
          return raw.map(p => ({
            id: i++,
            libro: this.libros.find(l => String(l.id) === String(p.libroId)) as any,
            usuario: {
              id: 0,
              nombre: '',
              apellido: '',
              email: String(p.usuarioId),
              rol: 'estudiante'
            },
            fecha_prestamo: p.fecha_prestamo,
            fecha_devolucion_esperada: p.fecha_devolucion_esperada || '',
            estado: p.estado,
            observaciones: p.observaciones
          }));
        }),
        catchError(error => {
          console.error('Error obteniendo préstamos activos:', error);
          return of([]);
        })
      );
  }

  /**
   * Obtener todos los préstamos (para administradores) o del usuario actual
   */
  getPrestamos(): Observable<Prestamo[]> {
    return this.apiService.get<{results: any[]}>('/libros/rt/prestamos/')
      .pipe(
        map(response => {
          const raw = response.results || [];
          let i = 1;
          return raw.map(p => ({
            id: i++,
            libro: this.libros.find(l => String(l.id) === String(p.libroId)) as any,
            usuario: {
              id: 0,
              nombre: '',
              apellido: '',
              email: String(p.usuarioId),
              rol: 'estudiante'
            },
            fecha_prestamo: p.fecha_prestamo,
            fecha_devolucion_esperada: p.fecha_devolucion_esperada || '',
            estado: p.estado,
            observaciones: p.observaciones
          }));
        }),
        catchError(error => {
          console.error('Error obteniendo préstamos:', error);
          // Fallback a datos simulados en caso de error
          const usuario = this.authService.currentUserValue;
          if (usuario?.rol === 'administrador') {
            return of(this.prestamos);
          } else {
            return of(this.prestamos.filter(p => p.usuario.id === usuario?.id));
          }
        })
      );
  }

  /**
   * Eliminar libro (solo administradores)
   */
  eliminarLibro(id: string | number): Observable<any> {
    const rtId = this.rtLibroIdMap.get(Number(id)) || String(id);
    return this.apiService.delete(`/libros/rt/libros/${rtId}/eliminar/`).pipe(
      map(response => {
        // Actualizar lista local de libros
        this.libros = this.libros.filter(libro => libro.id !== id);
        this.librosSubject.next([...this.libros]);
        return response;
      }),
      catchError(error => {
        console.error('Error eliminando libro:', error);
        throw error;
      })
    );
  }

  /**
   * Actualizar libro (solo administradores)
   */
  actualizarLibro(id: string | number, data: Partial<Libro>): Observable<any> {
    // Normalizar solo los campos permitidos y limpiar datos
    const payload: any = {};
    if (data.titulo !== undefined) payload.titulo = String(data.titulo).trim();
    if (data.autor !== undefined) payload.autor = String(data.autor).trim();
    if (data.isbn !== undefined) payload.isbn = String(data.isbn).trim();
    if (data.categoria !== undefined) payload.categoria = String(data.categoria).trim();
    if (data.editorial !== undefined) payload.editorial = String(data.editorial).trim();
    // El backend usa "año_publicacion"; el modelo usa "anio_publicacion"
    if (data['anio_publicacion'] !== undefined) payload['año_publicacion'] = data['anio_publicacion'];
    if (data.ubicacion !== undefined) payload.ubicacion = String(data.ubicacion).trim();
    if (data.cantidad_total !== undefined) payload.cantidad_total = Number(data.cantidad_total);
    if (data.descripcion !== undefined) payload.descripcion = String(data.descripcion).trim();
    if (data.imagen_portada !== undefined) payload.imagen_portada = data.imagen_portada;
    if (data.estado !== undefined) payload.estado = String(data.estado).trim();

    const rtId = this.rtLibroIdMap.get(Number(id)) || String(id);
    return this.apiService.put(`/libros/rt/libros/${rtId}/actualizar/`, payload).pipe(
      map(response => {
        // Refrescar datos desde backend para mantener coherencia
        this.cargarLibros();
        return response;
      }),
      catchError(error => {
        console.error('Error actualizando libro:', error);
        throw error;
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
      imagen_portada: libroData.imagen_portada || null,
      estado: 'Disponible'
    };
    
    // Solo agregar año_publicacion si tiene valor válido (acepta "anio_publicacion" o "año_publicacion")
    const yearValue = libroData.anio_publicacion ?? libroData.año_publicacion;
    if (yearValue && yearValue >= 1000 && yearValue <= 2030) {
      datosLimpios['año_publicacion'] = parseInt(yearValue);
    }
    
    console.log('Datos enviados al backend:', datosLimpios);
    
    const rtPayload: any = {
      titulo: datosLimpios.titulo,
      autor: datosLimpios.autor,
      categoria: datosLimpios.categoria,
      estado: 'Disponible',
      cantidad_total: datosLimpios.cantidad_total,
      cantidad_disponible: datosLimpios.cantidad_disponible,
      imagen_portada: datosLimpios.imagen_portada || null
    };
    return this.apiService.post('/libros/rt/libros/crear/', rtPayload)
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
    this.apiService.get('/libros/rt/libros/').subscribe({
      next: (response: any) => {
        const librosBackend = response.results || response;
        // Convertir datos del backend al formato del modelo
        let counter = 1;
        this.libros = librosBackend.map((libro: any) => {
          const rtId = String(libro.id);
          let numId = this.rtLibroIdReverse.get(rtId);
          if (!numId) {
            numId = counter++;
            this.rtLibroIdMap.set(numId, rtId);
            this.rtLibroIdReverse.set(rtId, numId);
          }
          return {
          id: numId,
          titulo: libro.titulo,
          autor: libro.autor,
          isbn: libro.isbn,
          editorial: libro.editorial,
          anio_publicacion: libro.año_publicacion,
          categoria: libro.categoria,
          ubicacion: libro.ubicacion,
          estado: libro.estado,
          cantidad_total: libro.cantidad_total,
          cantidad_disponible: libro.cantidad_disponible,
          descripcion: libro.descripcion,
          imagen_portada: libro.imagen_portada,
          fecha_registro: libro.fecha_registro
        }});
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
    return this.apiService.get(`/libros/rt/entidades/${this.entidadId}/estadisticas/`);
  }

  // ============ MÉTODOS DE BIBLIOGRAFÍA ============

  /**
   * Obtener bibliografías del usuario actual
   */
  obtenerBibliografias(filtros?: any): Observable<any> {
    const params = new URLSearchParams(filtros || {}).toString();
    return this.apiService.get(`/libros/rt/entidades/${this.entidadId}/bibliografias/${params ? '?' + params : ''}`);
  }

  /**
   * Crear nueva bibliografía
   */
  crearBibliografia(data: any): Observable<any> {
    return this.apiService.post(`/libros/rt/entidades/${this.entidadId}/bibliografias/crear/`, data)
      .pipe(
        map(response => {
          // Actualizar lista local de bibliografías
          this.cargarBibliografias();
          return response;
        }),
        catchError(error => {
          console.error('Error creando bibliografía:', error);
          throw error;
        })
      );
  }

  /**
   * Actualizar bibliografía
   */
  actualizarBibliografia(id: number, data: any): Observable<any> {
    return this.apiService.put(`/libros/rt/entidades/${this.entidadId}/bibliografias/${id}/actualizar/`, data);
  }

  /**
   * Obtener detalle de una bibliografía
   */
  obtenerBibliografia(id: number): Observable<any> {
    return this.apiService.get(`/libros/rt/entidades/${this.entidadId}/bibliografias/${id}/`);
  }

  /**
   * Agregar libro a bibliografía
   */
  agregarLibroABibliografia(bibliografiaId: number, libroId: number): Observable<any> {
    return this.apiService.post(`/libros/rt/entidades/${this.entidadId}/bibliografias/${bibliografiaId}/agregar-libro/`, { libroId: String(libroId) });
  }

  /**
   * Remover libro de bibliografía
   */
  removerLibroDeBibliografia(bibliografiaId: number, libroId: number): Observable<any> {
    return this.apiService.delete(`/libros/rt/entidades/${this.entidadId}/bibliografias/${bibliografiaId}/remover-libro/${libroId}/`);
  }

  /**
   * Obtener programas académicos disponibles
   */
  obtenerProgramas(): Observable<any> {
    return this.apiService.get(`/libros/rt/entidades/${this.entidadId}/programas/`);
  }

  /**
   * Obtener bibliografías por programa
   */
  obtenerBibliografiasPorPrograma(programa: string): Observable<any> {
    return this.obtenerBibliografias({ programa });
  }

  /**
   * Buscar libros para agregar a bibliografía
   */
  buscarLibrosParaBibliografia(termino: string): Observable<Libro[]> {
    return this.searchLibros(termino);
  }

  // Métodos para gestión de solicitudes de préstamo
  obtenerSolicitudesPendientes(): Observable<any> {
    return this.apiService.get('/prestamos/solicitudes-pendientes/');
  }

  aprobarPrestamo(prestamoId: number): Observable<any> {
    return this.apiService.post(`/prestamos/${prestamoId}/aprobar/`, {});
  }

  rechazarPrestamo(prestamoId: number, motivo: string): Observable<any> {
    return this.apiService.post(`/prestamos/${prestamoId}/rechazar/`, { motivo_rechazo: String(motivo).trim() });
  }

  obtenerMisSolicitudes(): Observable<any> {
    return this.apiService.get('/prestamos/').pipe(
      map((response: any) => {
        const prestamos = response.results || response;
        return prestamos.filter((prestamo: any) => 
          ['Pendiente', 'Rechazado'].includes(prestamo.estado)
        );
      })
    );
  }

  // Métodos para notificaciones
  obtenerNotificaciones(leidas?: boolean, limit?: number): Observable<any> {
    let params = '';
    if (leidas !== undefined) {
      params += `?leidas=${leidas}`;
    }
    if (limit) {
      params += params ? `&limit=${limit}` : `?limit=${limit}`;
    }
    return this.apiService.get(`/notificaciones/${params}`);
  }

  marcarNotificacionLeida(notificacionId: number): Observable<any> {
    return this.apiService.post(`/notificaciones/${notificacionId}/marcar-leida/`, {});
  }

  marcarTodasNotificacionesLeidas(): Observable<any> {
    return this.apiService.post('/notificaciones/marcar-todas-leidas/', {});
  }
}
