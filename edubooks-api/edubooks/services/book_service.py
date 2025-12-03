"""
Servicio de gestión de libros (Inventario)
Maneja las operaciones CRUD de libros dentro de un tenant y la integración con Google Books
"""
from edubooks.firebase_config import get_tenant_ref
import uuid
import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger('edubooks.services.book')


class BookService:
    """
    Servicio para gestionar el inventario de libros de una institución.
    Incluye integración con Google Books API.
    """
    
    GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes"
    
    # Mapeo de categorías locales a términos de búsqueda de Google Books
    CATEGORIA_MAPPING = {
        'Literatura': 'literature',
        'Programación': 'programming computers',
        'Matemáticas': 'mathematics',
        'Ciencias': 'science',
        'Ingeniería': 'engineering',
        'Negocios': 'business',
        'Historia': 'history',
        'Arte': 'art',
        'Psicología': 'psychology',
        'Filosofía': 'philosophy',
        'Medicina': 'medicine',
        'Derecho': 'law',
        'Ficción': 'fiction',
        'Biografía': 'biography',
        'Educación': 'education',
    }
    
    @staticmethod
    def create_book(tenant_id, titulo, autor, isbn=None, **extra_fields):
        """
        Crea un nuevo libro en el inventario.
        Intenta enriquecer los datos con Google Books si es posible.
        """
        try:
            # Intentar obtener imagen de portada si no se proporciona
            imagen_portada = extra_fields.get('imagen_portada', '')
            descripcion = extra_fields.get('descripcion', '')
            año_publicacion = extra_fields.get('año_publicacion')
            editorial = extra_fields.get('editorial', '')
            categoria = extra_fields.get('categoria', 'General')
            
            # Si falta información importante, intentar buscar en Google Books
            if not imagen_portada or not descripcion or not año_publicacion:
                try:
                    google_data = None
                    if isbn:
                        google_data = BookService.search_google_book_by_isbn(isbn)
                    
                    if not google_data:
                        google_data = BookService.search_google_book_by_data(titulo, autor)
                    
                    if google_data:
                        if not imagen_portada:
                            imagen_portada = google_data.get('imagen_portada', '')
                        if not descripcion:
                            descripcion = google_data.get('descripcion', '')
                        if not año_publicacion:
                            año_publicacion = google_data.get('año_publicacion')
                        if not editorial and google_data.get('editorial'):
                            editorial = google_data.get('editorial')
                        if not isbn and google_data.get('isbn'):
                            isbn = google_data.get('isbn')
                            
                except Exception as e:
                    logger.warning(f"No se pudo enriquecer datos con Google Books: {e}")

            # Generar ID único para el libro
            book_id = f"book_{uuid.uuid4().hex[:12]}"
            
            # Datos del libro
            book_data = {
                'id': book_id,
                'titulo': titulo,
                'autor': autor,
                'isbn': isbn or '',
                'editorial': editorial,
                'año_publicacion': año_publicacion,
                'categoria': categoria,
                'ubicacion': extra_fields.get('ubicacion', ''),
                'descripcion': descripcion,
                'imagen_portada': imagen_portada,
                
                # Control de inventario
                'cantidad_total': int(extra_fields.get('cantidad_total', 1)),
                'cantidad_disponible': int(extra_fields.get('cantidad_disponible', 1)),
                'estado': 'Disponible',
                
                # Metadata
                'created_at': {'.sv': 'timestamp'},
                'updated_at': {'.sv': 'timestamp'}
            }
            
            # Validar cantidades
            if book_data['cantidad_disponible'] > book_data['cantidad_total']:
                book_data['cantidad_disponible'] = book_data['cantidad_total']
            
            # Actualizar estado según disponibilidad
            if book_data['cantidad_disponible'] == 0:
                book_data['estado'] = 'Prestado'
            
            # Guardar en Firebase
            book_ref = get_tenant_ref(tenant_id, f'inventory/{book_id}')
            book_ref.set(book_data)
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(tenant_id, 'stats/total_books')
            current_total = stats_ref.get() or 0
            stats_ref.set(current_total + 1)
            
            logger.info(f"Libro creado en tenant {tenant_id}: {titulo}")
            return book_data
            
        except Exception as e:
            logger.error(f"Error al crear libro: {str(e)}")
            raise
    
    @staticmethod
    def get_book(tenant_id, book_id):
        """Obtiene los datos de un libro."""
        try:
            book_ref = get_tenant_ref(tenant_id, f'inventory/{book_id}')
            book_data = book_ref.get()
            
            if not book_data:
                raise ValueError(f"Libro no encontrado: {book_id}")
            
            return book_data
        except Exception as e:
            logger.error(f"Error al obtener libro: {str(e)}")
            raise
    
    @staticmethod
    def list_books(tenant_id, categoria=None, estado=None, search=None):
        """Lista libros del inventario con filtros opcionales."""
        try:
            books_ref = get_tenant_ref(tenant_id, 'inventory')
            books = books_ref.get()
            
            if not books:
                return []
            
            book_list = []
            for book_id, data in books.items():
                # Aplicar filtros
                if categoria and data.get('categoria') != categoria:
                    continue
                if estado and data.get('estado') != estado:
                    continue
                if search:
                    search_lower = search.lower()
                    titulo = data.get('titulo', '').lower()
                    autor = data.get('autor', '').lower()
                    isbn = data.get('isbn', '').lower()
                    if search_lower not in titulo and search_lower not in autor and search_lower not in isbn:
                        continue
                
                book_list.append({**data, 'id': book_id})
            
            return book_list
        except Exception as e:
            logger.error(f"Error al listar libros: {str(e)}")
            raise
    
    @staticmethod
    def update_book(tenant_id, book_id, updates):
        """Actualiza los datos de un libro."""
        try:
            book_ref = get_tenant_ref(tenant_id, f'inventory/{book_id}')
            
            # Verificar que existe
            book_data = book_ref.get()
            if not book_data:
                raise ValueError(f"Libro no encontrado: {book_id}")
            
            # Agregar timestamp de actualización
            updates['updated_at'] = {'.sv': 'timestamp'}
            
            # Si se actualiza la disponibilidad, actualizar el estado
            if 'cantidad_disponible' in updates:
                if updates['cantidad_disponible'] == 0:
                    updates['estado'] = 'Prestado'
                elif updates['cantidad_disponible'] > 0 and book_data.get('estado') == 'Prestado':
                    updates['estado'] = 'Disponible'
            
            # Actualizar
            book_ref.update(updates)
            
            logger.info(f"Libro actualizado: {book_id}")
            return book_ref.get()
        except Exception as e:
            logger.error(f"Error al actualizar libro: {str(e)}")
            raise
    
    @staticmethod
    def delete_book(tenant_id, book_id):
        """Elimina un libro del inventario."""
        try:
            # Verificar que no tenga préstamos activos
            loans_ref = get_tenant_ref(tenant_id, 'transactions/loans')
            loans = loans_ref.get()
            
            if loans:
                for loan_id, loan_data in loans.items():
                    if loan_data.get('book_id') == book_id and loan_data.get('status') in ['pending', 'active']:
                        raise ValueError("No se puede eliminar un libro con préstamos activos")
            
            # Eliminar el libro
            book_ref = get_tenant_ref(tenant_id, f'inventory/{book_id}')
            book_ref.delete()
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(tenant_id, 'stats/total_books')
            current_total = stats_ref.get() or 0
            if current_total > 0:
                stats_ref.set(current_total - 1)
            
            logger.info(f"Libro eliminado: {book_id}")
        except Exception as e:
            logger.error(f"Error al eliminar libro: {str(e)}")
            raise
    
    @staticmethod
    def adjust_stock(tenant_id, book_id, delta):
        """Ajusta el stock disponible de un libro."""
        try:
            book = BookService.get_book(tenant_id, book_id)
            
            nueva_cantidad = book['cantidad_disponible'] + delta
            
            if nueva_cantidad < 0:
                raise ValueError("No hay suficientes ejemplares disponibles")
            if nueva_cantidad > book['cantidad_total']:
                nueva_cantidad = book['cantidad_total']
            
            updates = {'cantidad_disponible': nueva_cantidad}
            
            return BookService.update_book(tenant_id, book_id, updates)
        except Exception as e:
            logger.error(f"Error al ajustar stock: {str(e)}")
            raise

    # -------------------------------------------------------------------------
    # Google Books Integration Methods
    # -------------------------------------------------------------------------

    @classmethod
    def search_google_book_by_data(cls, titulo: str, autor: str = None, categoria: str = None) -> Optional[Dict[str, Any]]:
        """Busca un libro en Google Books por datos."""
        try:
            query_parts = []
            if titulo: query_parts.append(f'intitle:"{titulo}"')
            if autor: query_parts.append(f'inauthor:"{autor}"')
            if categoria and categoria in cls.CATEGORIA_MAPPING:
                query_parts.append(f'subject:{cls.CATEGORIA_MAPPING[categoria]}')
            
            query = ' '.join(query_parts)
            params = {'q': query, 'maxResults': 5, 'printType': 'books', 'langRestrict': 'es'}
            
            response = requests.get(cls.GOOGLE_BOOKS_BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('totalItems', 0) > 0:
                for item in data.get('items', []):
                    # Retornar el primero que tenga imagen, o el primero si ninguno tiene
                    info = cls._extract_book_info(item)
                    if info.get('imagen_portada'):
                        return info
                # Si ninguno tiene imagen, retornar el primero
                return cls._extract_book_info(data['items'][0])
            return None
        except Exception as e:
            logger.error(f"Error searching Google Books: {e}")
            return None

    @classmethod
    def search_google_book_by_isbn(cls, isbn: str) -> Optional[Dict[str, Any]]:
        """Busca un libro en Google Books por ISBN."""
        try:
            isbn_clean = isbn.replace('-', '').replace(' ', '')
            params = {'q': f'isbn:{isbn_clean}', 'maxResults': 1, 'printType': 'books'}
            
            response = requests.get(cls.GOOGLE_BOOKS_BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('totalItems', 0) > 0:
                return cls._extract_book_info(data['items'][0])
            return None
        except Exception as e:
            logger.error(f"Error searching Google Books by ISBN: {e}")
            return None

    @classmethod
    def search_external_books(cls, query: str) -> list:
        """Busca libros en Google Books por query general."""
        try:
            params = {'q': query, 'maxResults': 20, 'printType': 'books', 'langRestrict': 'es'}
            response = requests.get(cls.GOOGLE_BOOKS_BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            if data.get('items'):
                for item in data['items']:
                    results.append(cls._extract_book_info(item))
            return results
        except Exception as e:
            logger.error(f"Error searching external books: {e}")
            return []

    @classmethod
    def _extract_book_info(cls, item: Dict[str, Any]) -> Dict[str, Any]:
        """Extrae información relevante de un item de Google Books."""
        volume_info = item.get('volumeInfo', {})
        image_links = volume_info.get('imageLinks', {})
        
        imagen_portada = None
        for size in ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail']:
            if size in image_links:
                imagen_portada = image_links[size]
                if imagen_portada.startswith('http://'):
                    imagen_portada = imagen_portada.replace('http://', 'https://')
                break
        
        # Extraer ISBN
        isbn = None
        for identifier in volume_info.get('industryIdentifiers', []):
            if identifier.get('type') in ['ISBN_13', 'ISBN_10']:
                isbn = identifier.get('identifier')
                break

        # Extraer año
        año = None
        fecha = volume_info.get('publishedDate', '')
        if fecha:
            año_str = ''.join(filter(str.isdigit, fecha))[:4]
            if len(año_str) == 4:
                año = int(año_str)

        return {
            'titulo': volume_info.get('title', ''),
            'autor': ', '.join(volume_info.get('authors', [])),
            'editorial': volume_info.get('publisher', ''),
            'año_publicacion': año,
            'descripcion': volume_info.get('description', ''),
            'imagen_portada': imagen_portada,
            'isbn': isbn,
            'categorias': volume_info.get('categories', []),
            'google_books_id': item.get('id', ''),
            'paginas': volume_info.get('pageCount', 0)
        }
