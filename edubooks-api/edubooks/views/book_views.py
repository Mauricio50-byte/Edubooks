from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from edubooks.services.book_service import BookService
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_book(request):
    """
    Crea un nuevo libro en el inventario.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    
    if not target_tenant_id:
        target_tenant_id = tenant_id

    if not target_tenant_id:
         return Response({'error': 'Se requiere tenant_id'}, status=400)

    if not is_super_admin and target_tenant_id != tenant_id:
        return Response({'error': 'No autorizado'}, status=403)
        
    # Validar permisos
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role not in ['administrador']:
             return Response({'error': 'No autorizado. Solo administradores pueden crear libros.'}, status=403)

    try:
        data = request.data
        if not data.get('titulo') or not data.get('autor'):
            return Response({'error': 'Título y Autor son requeridos'}, status=400)

        book = BookService.create_book(
            tenant_id=target_tenant_id,
            titulo=data.get('titulo'),
            autor=data.get('autor'),
            isbn=data.get('isbn'),
            **data
        )
        return Response(book, status=201)
    except Exception as e:
        logger.error(f"Error creating book: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_books(request):
    """
    Lista libros del inventario.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    
    if not target_tenant_id:
         target_tenant_id = tenant_id

    if not target_tenant_id:
        return Response({'error': 'Se requiere tenant_id'}, status=400)

    if not is_super_admin and target_tenant_id != tenant_id:
        return Response({'error': 'No autorizado'}, status=403)
        
    try:
        categoria = request.query_params.get('categoria')
        estado = request.query_params.get('estado')
        search = request.query_params.get('search')
        books = BookService.list_books(target_tenant_id, categoria, estado, search)
        return Response(books)
    except Exception as e:
        logger.error(f"Error listing books: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_book(request, book_id):
    """
    Obtiene un libro por ID.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    
    if not target_tenant_id:
         target_tenant_id = tenant_id

    if not target_tenant_id:
        return Response({'error': 'Se requiere tenant_id'}, status=400)

    if not is_super_admin and target_tenant_id != tenant_id:
        return Response({'error': 'No autorizado'}, status=403)
        
    try:
        book = BookService.get_book(target_tenant_id, book_id)
        return Response(book)
    except ValueError as e:
        return Response({'error': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Error getting book: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_external_books(request):
    """
    Busca libros en Google Books API.
    """
    try:
        query = request.query_params.get('q')
        if not query:
            return Response({'error': 'Se requiere parámetro q'}, status=400)
            
        books = BookService.search_external_books(query)
        return Response(books)
    except Exception as e:
        logger.error(f"Error searching external books: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_book(request, book_id):
    """
    Actualiza un libro.
    Solo administradores.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    if not is_super_admin:
        if target_tenant_id != tenant_id:
            return Response({'error': 'No autorizado'}, status=403)
        
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'Solo administradores pueden actualizar libros'}, status=403)
    
    try:
        updates = {}
        
        # Campos permitidos para actualizar
        allowed_fields = [
            'titulo', 'autor', 'isbn', 'editorial', 'año_publicacion',
            'categoria', 'ubicacion', 'descripcion', 'imagen_portada',
            'cantidad_total', 'cantidad_disponible', 'estado'
        ]
        
        for field in allowed_fields:
            if field in request.data:
                updates[field] = request.data[field]
        
        if not updates:
            return Response({'error': 'No hay campos para actualizar'}, status=400)
        
        book = BookService.update_book(target_tenant_id, book_id, updates)
        return Response(book)
        
    except ValueError as e:
        return Response({'error': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Error updating book: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_book(request, book_id):
    """
    Elimina un libro.
    Solo administradores.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    if not is_super_admin:
        if target_tenant_id != tenant_id:
            return Response({'error': 'No autorizado'}, status=403)
        
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'Solo administradores pueden eliminar libros'}, status=403)
    
    try:
        BookService.delete_book(target_tenant_id, book_id)
        return Response({'message': 'Libro eliminado exitosamente'}, status=200)
        
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error deleting book: {e}")
        return Response({'error': str(e)}, status=500)
