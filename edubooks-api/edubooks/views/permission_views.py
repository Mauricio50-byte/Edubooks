from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from edubooks.services.permission_service import PermissionService
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_permissions(request):
    """
    Obtiene los permisos del usuario autenticado.
    Útil para el frontend para mostrar/ocultar opciones de UI.
    """
    try:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        
        if not user_role:
            return Response({'error': 'No se pudo determinar el rol del usuario'}, status=400)
        
        permissions = PermissionService.get_user_permissions(user_role)
        
        # Agregar información adicional del usuario
        permissions['user_info'] = {
            'uid': request.firebase_user.get('uid'),
            'email': request.firebase_user.get('email'),
            'role': user_role,
            'tenant_id': request.firebase_user.get('tenant_id'),
            'is_super_admin': getattr(request, 'is_super_admin', False),
        }
        
        return Response(permissions)
        
    except Exception as e:
        logger.error(f"Error getting permissions: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_permission(request):
    """
    Verifica si el usuario tiene un permiso específico.
    
    Body:
    {
        "module": "books",
        "action": "create"
    }
    """
    try:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        
        if not user_role:
            return Response({'error': 'No se pudo determinar el rol del usuario'}, status=400)
        
        module = request.data.get('module')
        action = request.data.get('action')
        
        if not module or not action:
            return Response({'error': 'module y action son requeridos'}, status=400)
        
        has_permission = PermissionService.check_permission(user_role, module, action)
        
        return Response({
            'has_permission': has_permission,
            'role': user_role,
            'module': module,
            'action': action
        })
        
    except Exception as e:
        logger.error(f"Error checking permission: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role_info(request):
    """
    Obtiene información detallada del rol del usuario.
    Incluye límites y configuraciones específicas.
    """
    try:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        
        if not user_role:
            return Response({'error': 'No se pudo determinar el rol del usuario'}, status=400)
        
        role_info = {
            'role': user_role,
            'max_loans': PermissionService.get_max_loans(user_role),
            'loan_duration_days': PermissionService.get_loan_duration(user_role),
            'special_permissions': PermissionService.ROLE_PERMISSIONS.get(user_role, {}),
        }
        
        return Response(role_info)
        
    except Exception as e:
        logger.error(f"Error getting role info: {e}")
        return Response({'error': str(e)}, status=500)
