import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { AuthService } from '../../core/services/auth.service';
import { Bibliografia, Libro } from '../../core/models/libro.model';

@Component({
  selector: 'app-bibliografia-estudiante',
  templateUrl: './bibliografia-estudiante.page.html',
  styleUrls: ['./bibliografia-estudiante.page.scss'],
  standalone: false
})
export class BibliografiaEstudiantePage implements OnInit {
  bibliografias: Bibliografia[] = [];
  bibliografiasFiltradas: Bibliografia[] = [];
  programas: string[] = [];
  isLoading = true;
  error: string = '';
  usuarioActual: any = null;
  filtroPrograma: string = '';
  filtroCurso: string = '';
  mostrarFiltros = false;

  constructor(
    private bibliotecaService: BibliotecaService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.currentUserValue;
    this.cargarDatos();
  }

  /**
   * Cargar datos iniciales
   */
  async cargarDatos() {
    await Promise.all([
      this.cargarBibliografias(),
      this.cargarProgramas()
    ]);
    
    // Si el usuario es estudiante, filtrar automáticamente por su programa
    if (this.usuarioActual?.rol === 'Estudiante' && this.usuarioActual?.carrera) {
      this.filtroPrograma = this.usuarioActual.carrera;
      this.aplicarFiltros();
    }
  }

  /**
   * Cargar bibliografías disponibles
   */
  async cargarBibliografias() {
    this.isLoading = true;
    this.error = '';

    try {
      const response = await this.bibliotecaService.obtenerBibliografias().toPromise();
      
      if (response?.results && Array.isArray(response.results)) {
        this.bibliografias = response.results;
        this.bibliografiasFiltradas = [...this.bibliografias];
      } else {
        this.bibliografias = [];
        this.bibliografiasFiltradas = [];
      }
    } catch (error: any) {
      this.error = error.message || 'Error al cargar las bibliografías';
      console.error('Error cargando bibliografías:', error);
      const toast = await this.toastController.create({
        message: 'Error al cargar las bibliografías. Verifica tu conexión.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Cargar programas académicos disponibles
   */
  async cargarProgramas() {
    try {
      const response = await this.bibliotecaService.obtenerProgramas().toPromise();
      this.programas = response?.programas || [];
    } catch (error: any) {
      console.error('Error cargando programas:', error);
    }
  }

  /**
   * Aplicar filtros a las bibliografías
   */
  aplicarFiltros() {
    this.bibliografiasFiltradas = this.bibliografias.filter(bibliografia => {
      const cumplePrograma = !this.filtroPrograma || 
        bibliografia.programa.toLowerCase().includes(this.filtroPrograma.toLowerCase());
      
      const cumpleCurso = !this.filtroCurso || 
        bibliografia.curso.toLowerCase().includes(this.filtroCurso.toLowerCase());
      
      return cumplePrograma && cumpleCurso;
    });
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros() {
    this.filtroPrograma = '';
    this.filtroCurso = '';
    this.bibliografiasFiltradas = [...this.bibliografias];
    
    // Si es estudiante, mantener el filtro de su programa
    if (this.usuarioActual?.rol === 'Estudiante' && this.usuarioActual?.carrera) {
      this.filtroPrograma = this.usuarioActual.carrera;
      this.aplicarFiltros();
    }
  }

  /**
   * Alternar visibilidad de filtros
   */
  toggleFiltros() {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  /**
   * Ver detalle de un libro
   */
  verDetalleLibro(libro: Libro) {
    // TODO: Navegar a la página de detalle del libro
    console.log('Ver detalle del libro:', libro);
  }

  /**
   * Refrescar datos
   */
  async doRefresh(event: any) {
    await this.cargarDatos();
    event.target.complete();
  }

  /**
   * Verificar si el usuario es estudiante
   */
  get esEstudiante(): boolean {
    return this.usuarioActual?.rol === 'Estudiante';
  }

  /**
   * Obtener el programa del estudiante
   */
  get programaEstudiante(): string {
    return this.usuarioActual?.carrera || '';
  }
}
