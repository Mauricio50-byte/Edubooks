from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from edubooks.firebase_client import verify_token

User = get_user_model()


class FirebaseAuthBackend(BaseBackend):
    def authenticate(self, request, firebase_token=None, **kwargs):
        if not firebase_token:
            return None
        try:
            decoded = verify_token(firebase_token)
        except Exception:
            return None
        email = decoded.get('email')
        if not email:
            return None
        user = User.objects.filter(email=email).first()
        if not user:
            username = (email.split('@')[0] or 'usuario').strip()
            base = username
            i = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{i}"
                i += 1
            user = User.objects.create_user(
                email=email,
                username=username,
                rol='estudiante',
                is_active=True,
            )
        return user if user and user.is_active else None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

