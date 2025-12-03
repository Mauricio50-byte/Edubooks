from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from edubooks.firebase_config import get_tenant_ref
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard(request):
    """
    Obtiene estadísticas generales del dashboard.
    Solo administradores.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'No autorizado'}, status=403)
    
    try:
        # Obtener estadísticas almacenadas
        stats_ref = get_tenant_ref(target_tenant_id, 'stats')
        stats = stats_ref.get() or {}
        
        # Obtener datos adicionales
        users_ref = get_tenant_ref(target_tenant_id, 'users')
        users = users_ref.get() or {}
        
        books_ref = get_tenant_ref(target_tenant_id, 'inventory')
        books = books_ref.get() or {}
        
        loans_ref = get_tenant_ref(target_tenant_id, 'transactions/loans')
        loans = loans_ref.get() or {}
        
        reservations_ref = get_tenant_ref(target_tenant_id, 'transactions/reservations')
        reservations = reservations_ref.get() or {}
        
        # Calcular estadísticas
        total_users = len(users)
        total_books = len(books)
        
        active_loans = sum(1 for loan in loans.values() if loan.get('status') == 'active')
        pending_loans = sum(1 for loan in loans.values() if loan.get('status') == 'pending')
        active_reservations = sum(1 for res in reservations.values() if res.get('status') == 'active')
        
        # Libros disponibles
        available_books = sum(1 for book in books.values() if book.get('cantidad_disponible', 0) > 0)
        
        # Préstamos vencidos
        now_ts = int(datetime.now().timestamp() * 1000)
        overdue_loans = sum(
            1 for loan in loans.values() 
            if loan.get('status') == 'active' and 
            loan.get('fecha_devolucion_esperada', 0) < now_ts
        )
        
        # Usuarios por rol
        users_by_role = {
            'estudiante': sum(1 for u in users.values() if u.get('role') == 'estudiante'),
            'docente': sum(1 for u in users.values() if u.get('role') == 'docente'),
            'administrador': sum(1 for u in users.values() if u.get('role') == 'administrador'),
        }
        
        dashboard_data = {
            'total_users': total_users,
            'total_books': total_books,
            'available_books': available_books,
            'active_loans': active_loans,
            'pending_loans': pending_loans,
            'overdue_loans': overdue_loans,
            'active_reservations': active_reservations,
            'users_by_role': users_by_role,
            'timestamp': int(datetime.now().timestamp() * 1000)
        }
        
        return Response(dashboard_data)
        
    except Exception as e:
        logger.error(f"Error getting dashboard: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_popular_books(request):
    """
    Obtiene los libros más prestados.
    Administradores y docentes.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role not in ['administrador', 'docente']:
            return Response({'error': 'No autorizado'}, status=403)
    
    try:
        limit = int(request.query_params.get('limit', 10))
        
        loans_ref = get_tenant_ref(target_tenant_id, 'transactions/loans')
        loans = loans_ref.get() or {}
        
        books_ref = get_tenant_ref(target_tenant_id, 'inventory')
        books = books_ref.get() or {}
        
        # Contar préstamos por libro
        book_loan_count = {}
        for loan in loans.values():
            book_id = loan.get('book_id')
            if book_id:
                book_loan_count[book_id] = book_loan_count.get(book_id, 0) + 1
        
        # Crear lista de libros con conteo
        popular_books = []
        for book_id, count in book_loan_count.items():
            book_data = books.get(book_id)
            if book_data:
                popular_books.append({
                    'id': book_id,
                    'titulo': book_data.get('titulo'),
                    'autor': book_data.get('autor'),
                    'categoria': book_data.get('categoria'),
                    'imagen_portada': book_data.get('imagen_portada'),
                    'total_loans': count
                })
        
        # Ordenar por número de préstamos
        popular_books.sort(key=lambda x: x['total_loans'], reverse=True)
        
        return Response(popular_books[:limit])
        
    except Exception as e:
        logger.error(f"Error getting popular books: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_activity(request):
    """
    Obtiene actividad reciente de usuarios.
    Solo administradores.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'No autorizado'}, status=403)
    
    try:
        days = int(request.query_params.get('days', 7))
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_ts = int(cutoff_date.timestamp() * 1000)
        
        loans_ref = get_tenant_ref(target_tenant_id, 'transactions/loans')
        loans = loans_ref.get() or {}
        
        users_ref = get_tenant_ref(target_tenant_id, 'users')
        users = users_ref.get() or {}
        
        # Actividad por usuario
        user_activity = {}
        
        for loan_id, loan in loans.items():
            created_at = loan.get('created_at', 0)
            if isinstance(created_at, dict):  # Server timestamp
                continue
            
            if created_at >= cutoff_ts:
                user_uid = loan.get('user_uid')
                if user_uid:
                    if user_uid not in user_activity:
                        user_data = users.get(user_uid, {})
                        user_activity[user_uid] = {
                            'user_uid': user_uid,
                            'nombre': user_data.get('nombre', 'Desconocido'),
                            'apellido': user_data.get('apellido', ''),
                            'email': user_data.get('email', ''),
                            'role': user_data.get('role', ''),
                            'loan_requests': 0,
                            'active_loans': 0,
                            'returned_loans': 0
                        }
                    
                    user_activity[user_uid]['loan_requests'] += 1
                    
                    if loan.get('status') == 'active':
                        user_activity[user_uid]['active_loans'] += 1
                    elif loan.get('status') == 'returned':
                        user_activity[user_uid]['returned_loans'] += 1
        
        # Convertir a lista y ordenar por actividad
        activity_list = list(user_activity.values())
        activity_list.sort(key=lambda x: x['loan_requests'], reverse=True)
        
        return Response({
            'period_days': days,
            'total_active_users': len(activity_list),
            'users': activity_list
        })
        
    except Exception as e:
        logger.error(f"Error getting user activity: {e}")
        return Response({'error': str(e)}, status=500)
