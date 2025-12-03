from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from edubooks.services.user_service import UserService
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    """
    Crea un nuevo usuario en el tenant.
    Solo administradores del tenant o super admins.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    # Si es super admin, puede especificar el tenant_id en el body
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    
    if not target_tenant_id:
        # Si no hay tenant_id en el contexto ni en el body (para super admin)
        target_tenant_id = tenant_id # Fallback
        
    if not target_tenant_id:
         return Response({'error': 'Se requiere tenant_id'}, status=400)

    # Validar permisos
    if not is_super_admin:
        if target_tenant_id != tenant_id:
             return Response({'error': 'No autorizado para crear usuarios en otro tenant'}, status=403)
        
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'No autorizado. Solo administradores pueden crear usuarios.'}, status=403)

    try:
        data = request.data
        # Validar campos requeridos
        required_fields = ['email', 'password', 'nombre', 'apellido', 'role']
        for field in required_fields:
            if not data.get(field):
                return Response({'error': f'El campo {field} es requerido'}, status=400)

        user = UserService.create_user(
            tenant_id=target_tenant_id,
            email=data.get('email'),
            password=data.get('password'),
            nombre=data.get('nombre'),
            apellido=data.get('apellido'),
            role=data.get('role'),
            **data # Pasamos todo el data como extra_fields, el servicio sabrá qué usar o podemos filtrar
        )
        return Response(user, status=201)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """
    Lista usuarios del tenant.
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
        role = request.query_params.get('role')
        estado = request.query_params.get('estado')
        users = UserService.list_users(target_tenant_id, role, estado)
        return Response(users)
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request, user_uid):
    """
    Obtiene un usuario por UID.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    # Para get_user, necesitamos saber el tenant. 
    # Si es super admin, podría venir en query param, o asumimos que busca en todos (pero el servicio requiere tenant_id)
    # Por simplicidad, requerimos tenant_id si es super admin
    
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    
    if not target_tenant_id:
         target_tenant_id = tenant_id # Si el usuario normal consulta, usa su tenant

    if not target_tenant_id:
         return Response({'error': 'Se requiere tenant_id'}, status=400)

    if not is_super_admin and target_tenant_id != tenant_id:
         return Response({'error': 'No autorizado'}, status=403)

    try:
        user = UserService.get_user(target_tenant_id, user_uid)
        return Response(user)
    except ValueError as e:
        return Response({'error': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user(request, user_uid):
    """
    Actualiza un usuario.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    # Validar permisos
    current_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else None
    user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
    
    # Puede actualizar si es super admin, admin del tenant, o el mismo usuario
    can_update = (
        is_super_admin or 
        (user_role == 'administrador' and target_tenant_id == tenant_id) or
        (current_uid == user_uid)
    )
    
    if not can_update:
        return Response({'error': 'No autorizado'}, status=403)
    
    try:
        updates = {}
        
        # Campos permitidos para actualizar
        allowed_fields = ['nombre', 'apellido', 'estado']
        
        # Admin puede actualizar más campos
        if is_super_admin or user_role == 'administrador':
            allowed_fields.extend(['role', 'active', 'max_prestamos_permitidos'])
        
        for field in allowed_fields:
            if field in request.data:
                updates[field] = request.data[field]
        
        # Actualizar campos específicos del rol si se proporcionan
        if 'perfil_estudiante' in request.data:
            updates['perfil_estudiante'] = request.data['perfil_estudiante']
        if 'perfil_docente' in request.data:
            updates['perfil_docente'] = request.data['perfil_docente']
        if 'perfil_administrador' in request.data:
            updates['perfil_administrador'] = request.data['perfil_administrador']
        
        if not updates:
            return Response({'error': 'No hay campos para actualizar'}, status=400)
        
        user = UserService.update_user(target_tenant_id, user_uid, updates)
        return Response(user)
        
    except ValueError as e:
        return Response({'error': str(e)}, status=404)
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_uid):
    """
    Elimina un usuario.
    Solo super admin o administrador del tenant.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    # Solo admin puede eliminar
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador' or target_tenant_id != tenant_id:
            return Response({'error': 'No autorizado'}, status=403)
    
    try:
        UserService.delete_user(target_tenant_id, user_uid)
        return Response({'message': 'Usuario eliminado exitosamente'}, status=200)
        
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_sanction(request, user_uid):
    """
    Aplica una sanción a un usuario.
    Solo super admin o administrador.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador' or target_tenant_id != tenant_id:
            return Response({'error': 'No autorizado'}, status=403)
    
    try:
        dias = request.data.get('dias')
        motivo = request.data.get('motivo', '')
        
        if not dias:
            return Response({'error': 'Se requiere el número de días'}, status=400)
        
        UserService.aplicar_sancion(target_tenant_id, user_uid, int(dias), motivo)
        
        return Response({
            'message': 'Sanción aplicada exitosamente',
            'dias': dias,
            'motivo': motivo
        })
        
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error applying sanction: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_fine(request, user_uid):
    """
    Agrega una multa a un usuario.
    Solo super admin o administrador.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador' or target_tenant_id != tenant_id:
            return Response({'error': 'No autorizado'}, status=403)
    
    try:
        cantidad = request.data.get('cantidad')
        concepto = request.data.get('concepto', '')
        
        if not cantidad:
            return Response({'error': 'Se requiere la cantidad'}, status=400)
        
        UserService.agregar_multa(target_tenant_id, user_uid, float(cantidad), concepto)
        
        return Response({
            'message': 'Multa agregada exitosamente',
            'cantidad': cantidad,
            'concepto': concepto
        })
        
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error adding fine: {e}")
        return Response({'error': str(e)}, status=500)
