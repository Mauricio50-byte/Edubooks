# auth/__init__.py
from .firebase_authentication import FirebaseAuthentication
from .firebase_backends import FirebaseAuthBackend
from .permissions import IsAdministrador, IsDocente, IsEstudiante

__all__ = [
    'FirebaseAuthentication',
    'FirebaseAuthBackend',
    'IsAdministrador', 'IsDocente', 'IsEstudiante',
]
