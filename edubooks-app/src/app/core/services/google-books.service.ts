import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface GoogleBooksImageResponse {
  imagen_portada: string;
  fuente: string;
}

export interface GoogleBooksSearchResponse {
  libros: GoogleBookInfo[];
  total: number;
  categoria: string;
  fuente: string;
}

export interface GoogleBookInfo {
  titulo: string;
  autor: string;
  editorial: string;
  año_publicacion?: number;
  descripcion: string;
  imagen_portada: string;
  isbn?: string;
  categorias: string[];
  google_books_id: string;
  paginas: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleBooksService {

  constructor(private apiService: ApiService) {}

  /**
   * Obtener imagen de portada desde Google Books API
   * @param titulo Título del libro
   * @param autor Autor del libro (opcional)
   * @param categoria Categoría del libro (opcional)
   * @returns Observable con la URL de la imagen
   */
  obtenerImagenPortada(titulo: string, autor?: string, categoria?: string): Observable<GoogleBooksImageResponse> {
    const data: any = { titulo };
    
    if (autor) {
      data.autor = autor;
    }
    
    if (categoria) {
      data.categoria = categoria;
    }
    
    return this.apiService.post<GoogleBooksImageResponse>('/google-books/imagen/', data);
  }

  /**
   * Buscar libros por categoría en Google Books API
   * @param categoria Categoría a buscar
   * @param limite Número máximo de resultados (máximo 20)
   * @returns Observable con lista de libros
   */
  buscarLibrosPorCategoria(categoria: string, limite: number = 10): Observable<GoogleBooksSearchResponse> {
    const data = {
      categoria,
      limite: Math.min(limite, 20)
    };
    
    return this.apiService.post<GoogleBooksSearchResponse>('/google-books/buscar/', data);
  }

  /**
   * Buscar libro por ISBN
   * @param isbn ISBN del libro
   * @returns Observable con información del libro
   */
  buscarLibroPorISBN(isbn: string): Observable<GoogleBookInfo | null> {
    const data = { isbn: isbn.replace(/[\s\-]/g, '') };
    
    return this.apiService.post<any>('/google-books/buscar-isbn/', data)
      .pipe(
        map(response => response.libro || null),
        catchError(error => {
          console.warn('Error buscando por ISBN:', error);
          return of(null);
        })
      );
  }

  /**
   * Buscar libro por título
   * @param titulo Título del libro
   * @returns Observable con información del libro
   */
  buscarLibroPorTitulo(titulo: string): Observable<GoogleBookInfo | null> {
    const data = { titulo: titulo.trim() };
    
    return this.apiService.post<any>('/google-books/buscar-titulo/', data)
      .pipe(
        map(response => response.libro || null),
        catchError(error => {
          console.warn('Error buscando por título:', error);
          return of(null);
        })
      );
  }

  /**
   * Obtener imagen automáticamente basada en los datos del libro
   * @param libroData Datos del libro
   * @returns Observable con la URL de la imagen o null
   */
  obtenerImagenAutomatica(libroData: { titulo: string; autor?: string; categoria?: string }): Observable<string | null> {
    return new Observable(observer => {
      this.obtenerImagenPortada(libroData.titulo, libroData.autor, libroData.categoria)
        .subscribe({
          next: (response) => {
            observer.next(response.imagen_portada);
            observer.complete();
          },
          error: (error) => {
            console.warn('No se pudo obtener imagen de Google Books:', error);
            observer.next(null);
            observer.complete();
          }
        });
    });
  }

  /**
   * Validar si una URL de imagen es válida (simplificado para evitar CORS)
   * @param url URL de la imagen
   * @returns Promise<boolean>
   */
  async validarImagenUrl(url: string): Promise<boolean> {
    // Validación básica de URL sin petición HTTP para evitar CORS
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && 
             (urlObj.hostname.includes('googleusercontent.com') || 
              urlObj.hostname.includes('books.google.com'));
    } catch {
      return false;
    }
  }

  /**
   * Obtener imagen con fallback a imagen por defecto
   * @param titulo Título del libro
   * @param autor Autor del libro
   * @param categoria Categoría del libro
   * @param imagenPorDefecto URL de imagen por defecto
   * @returns Promise<string> URL de la imagen final
   */
  async obtenerImagenConFallback(
    titulo: string, 
    autor: string, 
    categoria: string, 
    imagenPorDefecto: string
  ): Promise<string> {
    try {
      const response = await this.obtenerImagenPortada(titulo, autor, categoria).toPromise();
      
      if (response?.imagen_portada) {
        // Validar formato básico de URL sin petición HTTP
        const esValida = await this.validarImagenUrl(response.imagen_portada);
        if (esValida) {
          return response.imagen_portada;
        }
      }
    } catch (error) {
      console.warn('Error obteniendo imagen de Google Books:', error);
    }
    
    // Retornar imagen por defecto si no se encuentra o hay error
    return imagenPorDefecto;
  }
}