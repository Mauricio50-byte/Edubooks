from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from edubooks.services.reservation_service import ReservationService
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_reservation(request):
    """
    Crea una reserva de libro.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    try:
        book_id = request.data.get('book_id')
        user_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else None
        
        # Admin puede reservar para otros
        if is_super_admin or (hasattr(request, 'firebase_user') and request.firebase_user.get('role') == 'administrador'):
             user_uid = request.data.get('user_uid', user_uid)
             
        if not book_id or not user_uid:
             return Response({'error': 'book_id y user_uid son requeridos'}, status=400)

        reservation = ReservationService.create_reservation(target_tenant_id, user_uid, book_id)
        return Response(reservation, status=201)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error creating reservation: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_reservation(request, reservation_id):
    """
    Cancela una reserva.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)

    try:
        user_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else None
        is_admin = is_super_admin or (hasattr(request, 'firebase_user') and request.firebase_user.get('role') == 'administrador')
        
        reservation = ReservationService.cancel_reservation(target_tenant_id, reservation_id, user_uid, is_admin)
        return Response(reservation)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error cancelling reservation: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_reservations(request):
    """
    Lista reservas.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    try:
        user_uid = request.query_params.get('user_uid')
        status = request.query_params.get('status')
        
        if not is_super_admin:
             user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
             current_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else None
             if user_role != 'administrador':
                 if user_uid and user_uid != current_uid:
                      return Response({'error': 'No autorizado'}, status=403)
                 user_uid = current_uid

        reservations = ReservationService.list_reservations(target_tenant_id, user_uid, status)
        return Response(reservations)
    except Exception as e:
        logger.error(f"Error listing reservations: {e}")
        return Response({'error': str(e)}, status=500)
