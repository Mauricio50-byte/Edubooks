# serializers/__init__.py
from .user_serializers import *
from .invitation_serializers import *

# Definir explícitamente los serializadores disponibles
__all__ = [
    # User serializers
    'UsuarioRegistroSerializer',
    'UsuarioLoginSerializer', 
    'UsuarioPerfilSerializer',
    'UsuarioListSerializer',
    'UsuarioAdminSerializer',
    'SancionSerializer',
    'MultaSerializer',
    'PagoMultaSerializer',
    # Invitation serializers
    'InvitacionCrearSerializer',
    'InvitacionListaSerializer',
    'InvitacionValidarSerializer',
    'RegistroConInvitacionSerializer',
    'InvitacionDetalleSerializer',
]