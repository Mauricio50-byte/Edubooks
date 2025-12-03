from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from edubooks.services.loan_service import LoanService
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_loan_request(request):
    """
    Crea una solicitud de préstamo.
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
        
    try:
        data = request.data
        book_id = data.get('book_id')
        user_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else None
        
        # Si es admin, puede crear solicitud para otro usuario
        if is_super_admin or (hasattr(request, 'firebase_user') and request.firebase_user.get('role') == 'administrador'):
             user_uid = data.get('user_uid', user_uid)

        if not book_id or not user_uid:
             return Response({'error': 'book_id y user_uid son requeridos'}, status=400)

        loan = LoanService.create_loan_request(target_tenant_id, user_uid, book_id)
        return Response(loan, status=201)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error creating loan request: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_loan(request, loan_id):
    """
    Aprueba un préstamo. Solo administradores.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    if not is_super_admin and target_tenant_id != tenant_id: return Response({'error': 'No autorizado'}, status=403)

    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'No autorizado'}, status=403)

    try:
        admin_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else 'system'
        loan_days = request.data.get('loan_days', 15)
        loan = LoanService.approve_loan(target_tenant_id, loan_id, admin_uid, loan_days)
        return Response(loan)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error approving loan: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_loan(request, loan_id):
    """
    Rechaza un préstamo. Solo administradores.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    if not is_super_admin and target_tenant_id != tenant_id: return Response({'error': 'No autorizado'}, status=403)
    
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'No autorizado'}, status=403)

    try:
        admin_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else 'system'
        motivo = request.data.get('motivo', '')
        loan = LoanService.reject_loan(target_tenant_id, loan_id, admin_uid, motivo)
        return Response(loan)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error rejecting loan: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def return_loan(request, loan_id):
    """
    Registra devolución de préstamo. Solo administradores.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    if not is_super_admin and target_tenant_id != tenant_id: return Response({'error': 'No autorizado'}, status=403)
    
    if not is_super_admin:
        user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
        if user_role != 'administrador':
            return Response({'error': 'No autorizado'}, status=403)

    try:
        admin_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else 'system'
        loan = LoanService.return_loan(target_tenant_id, loan_id, admin_uid)
        return Response(loan)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error returning loan: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_loans(request):
    """
    Lista préstamos.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    target_tenant_id = request.query_params.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    if not is_super_admin and target_tenant_id != tenant_id: return Response({'error': 'No autorizado'}, status=403)
    
    try:
        user_uid = request.query_params.get('user_uid')
        status = request.query_params.get('status')
        
        # Si es usuario normal, solo ve sus préstamos
        if not is_super_admin:
             user_role = request.firebase_user.get('role') if hasattr(request, 'firebase_user') else None
             current_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else None
             if user_role != 'administrador':
                 if user_uid and user_uid != current_uid:
                      return Response({'error': 'No autorizado para ver préstamos de otros usuarios'}, status=403)
                 user_uid = current_uid # Forzar filtro por su propio uid

        loans = LoanService.list_loans(target_tenant_id, user_uid, status)
        return Response(loans)
    except Exception as e:
        logger.error(f"Error listing loans: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def renew_loan(request, loan_id):
    """
    Renueva un préstamo.
    El usuario puede renovar sus propios préstamos.
    """
    tenant_id = getattr(request, 'tenant_id', None)
    is_super_admin = getattr(request, 'is_super_admin', False)
    
    target_tenant_id = request.data.get('tenant_id') if is_super_admin else tenant_id
    if not target_tenant_id: target_tenant_id = tenant_id
    if not target_tenant_id: return Response({'error': 'Se requiere tenant_id'}, status=400)
    
    try:
        user_uid = request.firebase_user.get('uid') if hasattr(request, 'firebase_user') else None
        
        loan = LoanService.renew_loan(target_tenant_id, loan_id, user_uid)
        return Response(loan)
        
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error renewing loan: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_overdue_loans(request):
    """
    Lista préstamos vencidos.
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
        from datetime import datetime
        from edubooks.firebase_config import get_tenant_ref
        
        # Obtener todos los préstamos activos
        loans_ref = get_tenant_ref(target_tenant_id, 'transactions/loans')
        loans = loans_ref.get()
        
        if not loans:
            return Response([])
        
        overdue_loans = []
        now_ts = int(datetime.now().timestamp() * 1000)
        
        for loan_id, loan_data in loans.items():
            if loan_data.get('status') == 'active':
                due_date = loan_data.get('fecha_devolucion_esperada')
                if due_date and due_date < now_ts:
                    # Calcular días de retraso
                    days_overdue = (now_ts - due_date) / (1000 * 60 * 60 * 24)
                    loan_data['days_overdue'] = int(days_overdue)
                    loan_data['id'] = loan_id
                    overdue_loans.append(loan_data)
        
        # Ordenar por días de retraso (mayor a menor)
        overdue_loans.sort(key=lambda x: x.get('days_overdue', 0), reverse=True)
        
        return Response(overdue_loans)
        
    except Exception as e:
        logger.error(f"Error listing overdue loans: {e}")
        return Response({'error': str(e)}, status=500)
