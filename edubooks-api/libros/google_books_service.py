# libros/google_books_service.py
import requests
import logging
from typing import Optional, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)

class GoogleBooksService:
    """
    Servicio para integrar con Google Books API y obtener información de libros
    incluyendo imágenes de portada según la categoría/género.
    """
    
    BASE_URL = "https://www.googleapis.com/books/v1/volumes"
    
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
    
    @classmethod
    def buscar_libro_por_datos(cls, titulo: str, autor: str = None, categoria: str = None) -> Optional[Dict[str, Any]]:
        """
        Busca un libro específico por título y autor en Google Books API.
        
        Args:
            titulo: Título del libro
            autor: Autor del libro (opcional)
            categoria: Categoría del libro (opcional)
            
        Returns:
            Diccionario con información del libro o None si no se encuentra
        """
        try:
            # Construir query de búsqueda
            query_parts = []
            
            if titulo:
                query_parts.append(f'intitle:"{titulo}"')
            
            if autor:
                query_parts.append(f'inauthor:"{autor}"')
                
            if categoria and categoria in cls.CATEGORIA_MAPPING:
                query_parts.append(f'subject:{cls.CATEGORIA_MAPPING[categoria]}')
            
            query = ' '.join(query_parts)
            
            # Realizar petición a Google Books API
            params = {
                'q': query,
                'maxResults': 5,
                'printType': 'books',
                'langRestrict': 'es'  # Priorizar libros en español
            }
            
            response = requests.get(cls.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('totalItems', 0) > 0:
                # Tomar el primer resultado que tenga imagen
                for item in data.get('items', []):
                    volume_info = item.get('volumeInfo', {})
                    image_links = volume_info.get('imageLinks', {})
                    
                    if image_links:
                        return cls._extraer_informacion_libro(item)
                        
            return None
            
        except requests.RequestException as e:
            logger.error(f"Error al consultar Google Books API: {e}")
            return None
        except Exception as e:
            logger.error(f"Error inesperado en búsqueda de libro: {e}")
            return None
    
    @classmethod
    def buscar_por_categoria(cls, categoria: str, limite: int = 10) -> list:
        """
        Busca libros por categoría/género en Google Books API.
        
        Args:
            categoria: Categoría a buscar
            limite: Número máximo de resultados
            
        Returns:
            Lista de diccionarios con información de libros
        """
        try:
            if categoria not in cls.CATEGORIA_MAPPING:
                return []
                
            subject = cls.CATEGORIA_MAPPING[categoria]
            
            params = {
                'q': f'subject:{subject}',
                'maxResults': min(limite, 40),  # Google Books limita a 40
                'printType': 'books',
                'langRestrict': 'es',
                'orderBy': 'relevance'
            }
            
            response = requests.get(cls.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            libros = []
            
            for item in data.get('items', []):
                libro_info = cls._extraer_informacion_libro(item)
                if libro_info and libro_info.get('imagen_portada'):
                    libros.append(libro_info)
                    
            return libros
            
        except requests.RequestException as e:
            logger.error(f"Error al buscar por categoría en Google Books API: {e}")
            return []
        except Exception as e:
            logger.error(f"Error inesperado en búsqueda por categoría: {e}")
            return []
    
    @classmethod
    def _extraer_informacion_libro(cls, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extrae información relevante de un item de Google Books API.
        
        Args:
            item: Item de respuesta de Google Books API
            
        Returns:
            Diccionario con información del libro
        """
        try:
            volume_info = item.get('volumeInfo', {})
            image_links = volume_info.get('imageLinks', {})
            
            # Priorizar imágenes de mayor calidad
            imagen_portada = None
            for size in ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail']:
                if size in image_links:
                    imagen_portada = image_links[size]
                    # Convertir a HTTPS si es necesario
                    if imagen_portada.startswith('http://'):
                        imagen_portada = imagen_portada.replace('http://', 'https://')
                    break
            
            # Retornar información del libro aunque no tenga imagen
            return {
                'titulo': volume_info.get('title', ''),
                'autor': ', '.join(volume_info.get('authors', [])),
                'editorial': volume_info.get('publisher', ''),
                'año_publicacion': cls._extraer_año_publicacion(volume_info.get('publishedDate', '')),
                'descripcion': volume_info.get('description', ''),
                'imagen_portada': imagen_portada,  # Puede ser None
                'isbn': cls._extraer_isbn(volume_info.get('industryIdentifiers', [])),
                'categorias': volume_info.get('categories', []),
                'google_books_id': item.get('id', ''),
                'paginas': volume_info.get('pageCount', 0)
            }
            
        except Exception as e:
            logger.error(f"Error extrayendo información del libro: {e}")
            return None
    
    @classmethod
    def _extraer_año_publicacion(cls, fecha_publicacion: str) -> Optional[int]:
        """
        Extrae el año de publicación de una fecha en formato string.
        """
        try:
            if fecha_publicacion:
                # Tomar los primeros 4 dígitos como año
                año_str = ''.join(filter(str.isdigit, fecha_publicacion))[:4]
                if len(año_str) == 4:
                    año = int(año_str)
                    if 1000 <= año <= 2030:
                        return año
            return None
        except (ValueError, TypeError):
            return None
    
    @classmethod
    def _extraer_isbn(cls, identifiers: list) -> Optional[str]:
        """
        Extrae el ISBN de la lista de identificadores.
        """
        try:
            for identifier in identifiers:
                if identifier.get('type') in ['ISBN_13', 'ISBN_10']:
                    return identifier.get('identifier')
            return None
        except (TypeError, AttributeError):
            return None
    
    @classmethod
    def buscar_libro_por_isbn(cls, isbn: str) -> Optional[Dict[str, Any]]:
        """
        Busca un libro específico por ISBN.
        
        Args:
            isbn: ISBN del libro
            
        Returns:
            Diccionario con información del libro o None
        """
        try:
            # Limpiar ISBN
            isbn_limpio = isbn.replace('-', '').replace(' ', '')
            
            params = {
                'q': f'isbn:{isbn_limpio}',
                'maxResults': 1,
                'printType': 'books'
            }
            
            response = requests.get(cls.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('totalItems', 0) > 0:
                item = data.get('items', [])[0]
                return cls._extraer_informacion_libro(item)
                
            return None
            
        except Exception as e:
            logger.error(f"Error buscando libro por ISBN {isbn}: {e}")
            return None
    
    @classmethod
    def buscar_libro_por_titulo(cls, titulo: str) -> Optional[Dict[str, Any]]:
        """
        Busca un libro específico por título.
        
        Args:
            titulo: Título del libro
            
        Returns:
            Diccionario con información del libro o None
        """
        try:
            params = {
                'q': f'intitle:"{titulo}"',
                'maxResults': 1,
                'printType': 'books',
                'langRestrict': 'es'
            }
            
            response = requests.get(cls.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('totalItems', 0) > 0:
                item = data.get('items', [])[0]
                return cls._extraer_informacion_libro(item)
                
            return None
            
        except Exception as e:
            logger.error(f"Error buscando libro por título {titulo}: {e}")
            return None

    @classmethod
    def obtener_imagen_por_categoria_y_titulo(cls, categoria: str, titulo: str, autor: str = None) -> Optional[str]:
        """
        Método específico para obtener solo la URL de imagen de portada.
        
        Args:
            categoria: Categoría del libro
            titulo: Título del libro
            autor: Autor del libro (opcional)
            
        Returns:
            URL de la imagen de portada o None
        """
        libro_info = cls.buscar_libro_por_datos(titulo, autor, categoria)
        if libro_info:
            return libro_info.get('imagen_portada')
        
        # Si no encuentra por título específico, buscar por categoría
        libros_categoria = cls.buscar_por_categoria(categoria, 5)
        if libros_categoria:
            # Retornar la primera imagen encontrada
            return libros_categoria[0].get('imagen_portada')
            
        return None