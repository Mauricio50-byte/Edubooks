# auth/__init__.py
from .authentication import SupabaseAuthentication
from .backends import SupabaseAuthBackend
from .permissions import IsAdministrador, IsDocente, IsEstudiante

__all__ = [
    'SupabaseAuthentication',
    'SupabaseAuthBackend',
    'IsAdministrador', 'IsDocente', 'IsEstudiante',
]