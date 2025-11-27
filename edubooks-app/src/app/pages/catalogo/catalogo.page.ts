import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { NotificacionesService, Notificacion } from '../../core/services/notificaciones.service';
import { Libro } from '../../core/models/libro.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.page.html',
  styleUrls: ['./catalogo.page.scss'],
  standalone: false,
})
export class CatalogoPage implements OnInit {
  libros: Libro[] = [];
  librosFiltrados: Libro[] = [];
  categorias: string[] = [];
  categoriaOptions: { value: string; label: string; icon?: string }[] = [];
  searchQuery: string = '';
  categoriaSeleccionada: string = 'Todas';
  estadoSeleccionado: string = 'Todos';
  estadoOptions: { value: string; label: string; icon?: string }[] = [
    { value: 'Todos', label: 'Todos los Estados', icon: '📋' },
    { value: 'Disponible', label: 'Disponible', icon: '✅' },
    { value: 'Prestado', label: 'Prestado', icon: '📤' },
    { value: 'Reservado', label: 'Reservado', icon: '📝' },
    { value: 'Mantenimiento', label: 'Mantenimiento', icon: '🔧' }
  ];
  isLoading: boolean = false;
  private pendientes = new Set<number>();

  private searchSubject = new Subject<string>();
  private notifPoll: any;

  constructor(
    private bibliotecaService: BibliotecaService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private notificacionesService: NotificacionesService
  ) {
    // Configurar búsqueda con debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.buscarLibros(query);
    });
  }

  ngOnInit() {
    this.cargarDatos();
    this.cargarPendientesDesdeStorage();
    this.notificacionesService.notificaciones$.pipe(
      debounceTime(300)
    ).subscribe(_ => {
      this.actualizarPendientesDesdeBackend();
    });
  }

  ionViewWillEnter() {
    // Recargar datos cuando se vuelve a la página
    this.cargarDatos();
    // Iniciar polling de notificaciones para reflejar rechazos
    this.notifPoll = setInterval(() => {
      this.notificacionesService.cargarNotificaciones().subscribe();
    }, 6000);
  }

  async cargarDatos() {
    this.isLoading = true;

    try {
      // Cargar libros
      this.bibliotecaService.getLibros().subscribe({
        next: (libros) => {
          this.libros = libros;
          this.librosFiltrados = libros;
          this.isLoading = false;
          // Sincronizar estados pendientes con la lista
          this.sincronizarPendientesConLibros();
          this.completarDetallesLibros(this.libros);
          this.actualizarPendientesDesdeBackend();
        },
        error: (error) => {
          console.error('Error cargando libros:', error);
          this.isLoading = false;
        }
      });

      // Cargar categorías
      this.bibliotecaService.getCategorias().subscribe({
        next: (categorias) => {
          this.categorias = ['Todas', ...categorias];
          this.categoriaOptions = this.categorias.map(cat => ({
            value: cat,
            label: cat,
            icon: this.getCategoriaIcon(cat)
          }));
        }
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.isLoading = false;
    }
  }

  onSearchInput(event: any) {
    const query = event.target.value;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  buscarLibros(query: string) {
    if (!query || query.trim() === '') {
      this.aplicarFiltros();
      return;
    }

    this.bibliotecaService.searchLibros(query).subscribe({
      next: (resultados) => {
        this.librosFiltrados = resultados;
        this.completarDetallesLibros(this.librosFiltrados);
      },
      error: (error) => {
        console.error('Error en búsqueda:', error);
      }
    });
  }

  // Handlers para componente compartido
  onCategoriaSelected(value: string) {
    this.categoriaSeleccionada = value;
    this.aplicarFiltros();
  }

  onEstadoSelected(value: string) {
    this.estadoSeleccionado = value;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let librosFiltrados = [...this.libros];

    // Filtrar por categoría
    if (this.categoriaSeleccionada && this.categoriaSeleccionada !== 'Todas') {
      librosFiltrados = librosFiltrados.filter(libro =>
        libro.categoria === this.categoriaSeleccionada
      );
    }

    // Filtrar por estado
    if (this.estadoSeleccionado && this.estadoSeleccionado !== 'Todos') {
      if (this.estadoSeleccionado === 'Disponible') {
        librosFiltrados = librosFiltrados.filter(libro =>
          libro.cantidad_disponible > 0
        );
      } else {
        librosFiltrados = librosFiltrados.filter(libro =>
          libro.estado === this.estadoSeleccionado
        );
      }
    }

    this.librosFiltrados = librosFiltrados;
    this.completarDetallesLibros(this.librosFiltrados);
  }

  limpiarFiltros() {
    this.searchQuery = '';
    this.categoriaSeleccionada = 'Todas';
    this.estadoSeleccionado = 'Todos';
    this.librosFiltrados = [...this.libros];
  }

  refrescar() {
    // Reinicia filtros y recarga datos desde el servicio
    this.searchQuery = '';
    this.categoriaSeleccionada = 'Todas';
    this.estadoSeleccionado = 'Todos';
    this.cargarDatos();
  }

  filtrarPorCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
    this.aplicarFiltros();
  }

  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'Todas': '📚',
      'Literatura': '📖',
      'Programación': '💻',
      'Matemáticas': '📊',
      'Ciencias': '🔬',
      'Ingeniería': '⚙️',
      'Negocios': '💼'
    };
    return iconos[categoria] || '📚';
  }

  async prestarLibro(libro: Libro) {
    const loading = await this.loadingController.create({
      message: 'Procesando préstamo...',
    });
    await loading.present();

    this.bibliotecaService.prestarLibro(libro.id).subscribe({
      next: async (response) => {
        await loading.dismiss();

        const toast = await this.toastController.create({
          message: `¡Solicitud enviada! Tu petición de préstamo para "${libro.titulo}" está pendiente de aprobación.`,
          duration: 4000,
          color: 'warning',
          position: 'top'
        });
        await toast.present();

        // Marcar como pendiente en UI
        this.marcarPendiente(libro.id);
        // Refrescar datos opcionalmente
        this.cargarDatos();
      },
      error: async (error) => {
        await loading.dismiss();
        const toast = await this.toastController.create({
          message: error.message || 'No se pudo procesar el préstamo.',
          duration: 4000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    });
  }

  async reservarLibro(libro: Libro) {
    const loading = await this.loadingController.create({
      message: 'Procesando reserva...',
    });
    await loading.present();

    this.bibliotecaService.reservarLibro(libro.id).subscribe({
      next: async (response) => {
        await loading.dismiss();

        const toast = await this.toastController.create({
          message: `¡Reserva exitosa! Te notificaremos cuando "${libro.titulo}" esté disponible.`,
          duration: 4000,
          color: 'success',
          position: 'top'
        });
        await toast.present();

        // Actualizar la lista
        this.cargarDatos();
      },
      error: async (error) => {
        await loading.dismiss();

        const alert = await this.alertController.create({
          header: 'Error en Reserva',
          message: error.message || 'No se pudo procesar la reserva.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  verDetalle(libro: Libro) {
    this.router.navigate(['detalle-libro', libro.id]);
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'success';
      case 'Prestado': return 'danger';
      case 'Reservado': return 'warning';
      case 'Mantenimiento': return 'medium';
      default: return 'medium';
    }
  }

  puedePrestar(libro: Libro): boolean {
    // No puede prestar si ya tiene un préstamo activo de este libro
    if (this.isPendiente(libro)) {
      return false;
    }
    // Puede prestar si hay copias disponibles y el libro no está en mantenimiento
    return libro.cantidad_disponible > 0 && libro.estado !== 'Mantenimiento';
  }

  puedeReservar(libro: Libro): boolean {
    // No puede reservar si ya tiene un préstamo activo de este libro
    if (this.isPendiente(libro)) {
      return false;
    }
    // Puede reservar si no hay copias disponibles y el libro no está en mantenimiento
    return libro.cantidad_disponible === 0 && libro.estado !== 'Mantenimiento';
  }

  // ===== Gestión de estado pendiente en UI =====
  private cargarPendientesDesdeStorage(): void {
    try {
      const raw = localStorage.getItem('pendientes_prestamo');
      if (raw) {
        const arr: number[] = JSON.parse(raw);
        this.pendientes = new Set(arr);
      }
    } catch { }
  }

  private guardarPendientesEnStorage(): void {
    try {
      localStorage.setItem('pendientes_prestamo', JSON.stringify(Array.from(this.pendientes)));
    } catch { }
  }

  private sincronizarPendientesConLibros(): void {
    // Opcional: marcar flag en objetos si existe
    this.libros.forEach(l => {
      if (this.pendientes.has(l.id)) {
        l.usuario_tiene_prestamo = true;
      } else {
        delete l.usuario_tiene_prestamo;
      }
    });
  }

  private completarDetallesLibros(arr: Libro[]): void {
    const incompletos = arr.filter(l => {
      const ubic = (l.ubicacion ?? '').trim();
      const total = l.cantidad_total as number | undefined;
      return !ubic || total === undefined || Number.isNaN(total as number);
    });
    incompletos.forEach(l => {
      this.bibliotecaService.getLibroById(l.id).subscribe(det => {
        if (!det) return;
        const replace = (list: Libro[]) => {
          const idx = list.findIndex(x => x.id === det.id);
          if (idx >= 0) list[idx] = det;
        };
        replace(this.libros);
        replace(this.librosFiltrados);
      });
    });
  }

  isPendiente(libro: Libro): boolean {
    if (this.pendientes.has(libro.id)) return true;
    return libro.prestamo_estado_usuario === 'Pendiente';
  }

  isPrestadoActivo(libro: Libro): boolean {
    return libro.prestamo_estado_usuario === 'Activo';
  }

  private marcarPendiente(libroId: number): void {
    this.pendientes.add(libroId);
    this.guardarPendientesEnStorage();
    this.sincronizarPendientesConLibros();
  }

  private desmarcarPendiente(libroId: number): void {
    this.pendientes.delete(libroId);
    this.guardarPendientesEnStorage();
    this.sincronizarPendientesConLibros();
  }

  private actualizarPendientesDesdeBackend(): void {
    this.bibliotecaService.obtenerMisSolicitudes().subscribe({
      next: (solicitudes: any[]) => {
        const pendientesIds = new Set<number>();
        const rechazadosIds = new Set<number>();
        const activosIds = new Set<number>();

        solicitudes.forEach((p: any) => {
          const libroId = p?.libro?.id ?? p?.libro_id;
          if (!libroId) return;
          if (p.estado === 'Pendiente') pendientesIds.add(libroId);
          if (p.estado === 'Rechazado') rechazadosIds.add(libroId);
          if (p.estado === 'Activo') activosIds.add(libroId);
        });

        // Mantener pendientes actuales solo si siguen pendientes en backend
        this.pendientes.forEach(id => { if (!pendientesIds.has(id)) this.pendientes.delete(id); });
        // Remover rechazos explícitos y activos (ya no son pendientes)
        rechazadosIds.forEach(id => this.pendientes.delete(id));
        activosIds.forEach(id => this.pendientes.delete(id));

        this.guardarPendientesEnStorage();
        this.sincronizarPendientesConLibros();
        this.actualizarEstadoActivoEnLibros(activosIds);
      },
      error: _ => {
        // Silencio: no cambiar estado si falla
      }
    });
  }

  private actualizarEstadoActivoEnLibros(activosIds: Set<number>): void {
    this.libros.forEach(l => {
      if (activosIds.has(l.id)) {
        l.prestamo_estado_usuario = 'Activo';
      } else if (l.prestamo_estado_usuario === 'Activo') {
        // Si estaba activo pero ya no aparece en la lista de activos, limpiamos el estado
        delete l.prestamo_estado_usuario;
      }
    });
  }
  ionViewWillLeave() {
    if (this.notifPoll) {
      clearInterval(this.notifPoll);
      this.notifPoll = null;
    }
  }
}
