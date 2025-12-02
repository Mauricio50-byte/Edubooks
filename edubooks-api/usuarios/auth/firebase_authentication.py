from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from edubooks.firebase_client import verify_token

User = get_user_model()


class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None
        token = parts[1]
        try:
            decoded = verify_token(token)
        except Exception:
            return None
        uid = decoded.get('uid')
        email = decoded.get('email')
        if not email:
            raise AuthenticationFailed('Token Firebase sin email')
        try:
            user = User.objects.filter(email=email).first()
        except Exception:
            user = None
        if user and not user.is_active:
            raise AuthenticationFailed('Cuenta de usuario desactivada')
        if user:
            return (user, token)
        class TokenUser:
            def __init__(self, uid, email):
                self.id = uid
                self.uid = uid
                self.email = email
                self.username = (email.split('@')[0] or 'usuario').strip()
                self.rol = 'estudiante'
                self.nombre = ''
                self.apellido = ''
                self.is_active = True
            @property
            def is_authenticated(self):
                return True
        return (TokenUser(uid, email), token)
