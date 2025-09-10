import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { LIBROS_MUESTRA, LibroData, CATEGORIAS, ESTADOS_LIBRO } from '../data/libros-data';
import { Libro, Prestamo, Reserva } from '../models/libro.model';
import { AuthService } from './auth.service';

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

  constructor(private authService: AuthService) {
    this.initializeData();
  }

  private initializeData() {
    // Convertir datos de muestra a formato del modelo
    this.libros = LIBROS_MUESTRA.map(libro => ({
      id: libro.id,
      titulo: libro.titulo,
      autor: libro.autor,
      isbn: libro.isbn,
      editorial: libro.editorial,
      año_publicacion: libro.año_publicacion,
      categoria: libro.categoria,
      ubicacion: libro.ubicacion,
      estado: libro.estado as any,
      cantidad_total: libro.cantidad_total,
      cantidad_disponible: libro.cantidad_disponible,
      descripcion: libro.descripcion,
      imagen_portada: libro.imagen_portada,
      fecha_registro: new Date().toISOString()
    }));

    this.librosSubject.next(this.libros);
  }

  // Métodos para libros
  getLibros(): Observable<Libro[]> {
    return of(this.libros).pipe(delay(500)); // Simular latencia de red
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
    return of(CATEGORIAS);
  }

  getEstados(): Observable<string[]> {
    return of(ESTADOS_LIBRO);
  }

  // Métodos para préstamos
  prestarLibro(libroId: number): Observable<any> {
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

    // Crear nuevo préstamo
    const fechaDevolucion = new Date();
    fechaDevolucion.setDate(fechaDevolucion.getDate() + 15); // 15 días

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
    
    // Actualizar disponibilidad del libro
    libro.cantidad_disponible--;
    if (libro.cantidad_disponible === 0) {
      libro.estado = 'Prestado';
    }

    this.librosSubject.next([...this.libros]);
    this.prestamosSubject.next([...this.prestamos]);

    return of({ success: true, prestamo: nuevoPrestamo }).pipe(delay(500));
  }

  devolverLibro(prestamoId: number): Observable<any> {
    const prestamo = this.prestamos.find(p => p.id === prestamoId);
    if (!prestamo) {
      return throwError(() => new Error('Préstamo no encontrado'));
    }

    if (prestamo.estado !== 'Activo') {
      return throwError(() => new Error('Este préstamo ya fue devuelto'));
    }

    // Actualizar préstamo
    prestamo.estado = 'Devuelto';
    prestamo.fecha_devolucion_real = new Date().toISOString();

    // Actualizar disponibilidad del libro
    const libro = this.libros.find(l => l.id === prestamo.libro.id);
    if (libro) {
      libro.cantidad_disponible++;
      if (libro.cantidad_disponible > 0 && libro.estado === 'Prestado') {
        libro.estado = 'Disponible';
      }
    }

    this.librosSubject.next([...this.libros]);
    this.prestamosSubject.next([...this.prestamos]);

    return of({ success: true }).pipe(delay(500));
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
}