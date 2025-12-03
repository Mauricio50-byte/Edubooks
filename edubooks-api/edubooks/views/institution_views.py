from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from edubooks.services.institution_service import InstitutionService
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_institution(request):
    """
    Crea una nueva institución.
    Solo accesible para Super Administradores.
    """
    if not getattr(request, 'is_super_admin', False):
        return Response({'error': 'No autorizado. Se requieren permisos de Super Administrador.'}, status=403)
    
    name = request.data.get('name')
    plan = request.data.get('plan', 'basic')
    
    if not name:
        return Response({'error': 'El nombre de la institución es requerido'}, status=400)
    
    try:
        institution = InstitutionService.create_institution(name, plan)
        return Response(institution, status=201)
    except Exception as e:
        logger.error(f"Error creando institución: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_institutions(request):
    """
    Lista todas las instituciones.
    Solo accesible para Super Administradores.
    """
    if not getattr(request, 'is_super_admin', False):
        return Response({'error': 'No autorizado. Se requieren permisos de Super Administrador.'}, status=403)
    
    try:
        institutions = InstitutionService.list_institutions()
        return Response(institutions)
    except Exception as e:
        logger.error(f"Error listando instituciones: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_institution(request, institution_id):
    """
    Obtiene detalles de una institución específica.
    Solo accesible para Super Administradores o usuarios de esa institución (si se implementa esa lógica).
    """
    if not getattr(request, 'is_super_admin', False):
        # Aquí podríamos permitir si el usuario pertenece a la institución
        # Por ahora restringimos a super admin
        return Response({'error': 'No autorizado'}, status=403)
        
    try:
        institution = InstitutionService.get_institution(institution_id)
        if not institution:
            return Response({'error': 'Institución no encontrada'}, status=404)
        return Response(institution)
    except Exception as e:
        logger.error(f"Error obteniendo institución {institution_id}: {str(e)}")
        return Response({'error': str(e)}, status=500)
