from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from edubooks.services.invitation_service import InvitationService
from edubooks.services.user_service import UserService
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invitation(request):
    """
    Crea una invitación para un nuevo docente o administrador.
    Solo administradores de la institución.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    # Validar permisos
    if not is_super_admin:
        if target_tenant_id != tenant_id:
            return Response({'error': 'No autorizado'}, status=403)
        
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'Solo administradores pueden crear invitaciones'}, status=403)
    
    try:
        email = request.data.get('email')
        role = request.data.get('role')
        
        if not email or not role:
            return Response({'error': 'email y role son requeridos'}, status=400)
        
        created_by_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else 'system'
        
        # Datos extra opcionales
        extra_data = {
            'departamento': request.data.get('departamento'),
            'area': request.data.get('area'),
            'especialidad': request.data.get('especialidad'),
            'cargo': request.data.get('cargo'),
        }
        # Limpiar None values
        extra_data = {k: v for k, v in extra_data.items() if v is not None}
        
        invitation = InvitationService.create_invitation(
            target_tenant_id, 
            email, 
            role, 
            created_by_uid,
            **extra_data
        )
        
        return Response(invitation, status=201)
        
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error creating invitation: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def validate_invitation_token(request):
    """
    Valida un token de invitación.
    Endpoint público para que usuarios puedan verificar su invitación.
    """
    try:
        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'Se requiere token'}, status=400)
        
        invitation = InvitationService.get_invitation_by_token(token)
        
        # No retornar el token en la respuesta
        invitation_safe = {
            'email': invitation.get('email'),
            'role': invitation.get('role'),
            'tenant_id': invitation.get('tenant_id'),
            'extra_data': invitation.get('extra_data', {}),
            'valid': True
        }
        
        return Response(invitation_safe)
        
    except ValueError as e:
        return Response({'error': str(e), 'valid': False}, status=400)
    except Exception as e:
        logger.error(f"Error validating invitation: {e}")
        return Response({'error': str(e), 'valid': False}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def accept_invitation(request):
    """
    Acepta una invitación y crea el usuario.
    Endpoint público para registro con invitación.
    """
    try:
        token = request.data.get('token')
        password = request.data.get('password')
        nombre = request.data.get('nombre')
        apellido = request.data.get('apellido')
        
        if not all([token, password, nombre, apellido]):
            return Response({'error': 'token, password, nombre y apellido son requeridos'}, status=400)
        
        # Obtener invitación
        invitation = InvitationService.get_invitation_by_token(token)
        
        # Crear usuario
        user_data = UserService.create_user(
            tenant_id=invitation['tenant_id'],
            email=invitation['email'],
            password=password,
            nombre=nombre,
            apellido=apellido,
            role=invitation['role'],
            **(invitation.get('extra_data', {}))
        )
        
        # Marcar invitación como aceptada
        InvitationService.accept_invitation(token, user_data['uid'])
        
        return Response({
            'message': 'Usuario creado exitosamente',
            'user': {
                'uid': user_data['uid'],
                'email': user_data['email'],
                'nombre': user_data['nombre'],
                'apellido': user_data['apellido'],
                'role': user_data['role']
            }
        }, status=201)
        
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error accepting invitation: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invitations(request):
    """
    Lista invitaciones de la institución.
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
            return Response({'error': 'No autorizado'}, status=403)
    
    try:
        status = request.query_params.get('status')
        invitations = InvitationService.list_invitations(target_tenant_id, status)
        
        # Ocultar tokens en la respuesta
        for inv in invitations:
            inv.pop('token', None)
        
        return Response(invitations)
        
    except Exception as e:
        logger.error(f"Error listing invitations: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_invitation(request, invitation_id):
    """
    Cancela una invitación pendiente.
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
            return Response({'error': 'No autorizado'}, status=403)
    
    try:
        invitation = InvitationService.cancel_invitation(target_tenant_id, invitation_id)
        invitation.pop('token', None)
        return Response(invitation)
        
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error cancelling invitation: {e}")
        return Response({'error': str(e)}, status=500)
