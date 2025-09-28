# usuarios/authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.conf import settings
from edubooks.supabase_client import get_supabase_client
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class SupabaseAuthentication(BaseAuthentication):
    """
    Autenticación personalizada para REST Framework que maneja tokens de Supabase.
    
    Esta clase permite autenticar usuarios usando tokens JWT de Supabase
    y los sincroniza automáticamente con el sistema de usuarios de Django.
    """
    
    def authenticate(self, request):
        """
        Autentica una request usando el token de Supabase en el header Authorization.
        
        Args:
            request: HttpRequest object
            
        Returns:
            Tupla (user, token) si la autenticación es exitosa, None en caso contrario
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None
            
        try:
            # Extraer el token del header
            auth_parts = auth_header.split()
            
            if len(auth_parts) != 2:
                return None
                
            auth_type, token = auth_parts
            
            # Verificar que sea un token Bearer
            if auth_type.lower() != 'bearer':
                return None
                
            # Verificar si es un token de Supabase (formato específico)
            if not self._is_supabase_token(token):
                return None
                
            return self._authenticate_supabase_token(token)
            
        except Exception as e:
            logger.error(f"Error en autenticación Supabase: {str(e)}")
            return None
    
    def _is_supabase_token(self, token):
        """
        Verifica si el token tiene el formato de un token de Supabase.
        
        Args:
            token: Token a verificar
            
        Returns:
            True si parece ser un token de Supabase, False en caso contrario
        """
        try:
            # Los tokens de Supabase son JWT con estructura específica
            import jwt
            
            # Decodificar sin verificar para inspeccionar el payload
            payload = jwt.decode(token, options={"verify_signature": False})
            
            # Verificar que tenga campos típicos de Supabase
            return 'iss' in payload and 'supabase' in payload.get('iss', '').lower()
            
        except:
            return False
    
    def _authenticate_supabase_token(self, token):
        """
        Autentica un token de Supabase y retorna el usuario correspondiente.
        
        Args:
            token: Token JWT de Supabase
            
        Returns:
            Tupla (user, token) si la autenticación es exitosa
            
        Raises:
            AuthenticationFailed: Si la autenticación falla
        """
        try:
            supabase = get_supabase_client()
            
            # Verificar el token con Supabase
            response = supabase.auth.get_user(token)
            
            if not response.user:
                raise AuthenticationFailed('Token de Supabase inválido o expirado')
                
            supabase_user = response.user
            
            # Buscar o crear el usuario en Django
            try:
                user = User.objects.get(email=supabase_user.email)
                
                # Actualizar última actividad
                self._update_user_activity(user, supabase_user)
                
            except User.DoesNotExist:
                # Crear nuevo usuario si no existe
                user = self._create_user_from_supabase(supabase_user)
                
                if not user:
                    raise AuthenticationFailed('Error creando usuario desde Supabase')
            
            # Verificar que el usuario esté activo
            if not user.is_active:
                raise AuthenticationFailed('Cuenta de usuario desactivada')
                
            return (user, token)
            
        except AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f"Error autenticando token Supabase: {str(e)}")
            raise AuthenticationFailed('Error de autenticación')
    
    def _update_user_activity(self, user, supabase_user):
        """
        Actualiza la actividad del usuario y sincroniza datos si es necesario.
        
        Args:
            user: Usuario de Django
            supabase_user: Datos del usuario de Supabase
        """
        from django.utils import timezone
        
        # Actualizar última actividad
        user.last_login = timezone.now()
        
        # Sincronizar datos básicos si han cambiado
        updated = False
        
        if hasattr(supabase_user, 'user_metadata') and supabase_user.user_metadata:
            metadata = supabase_user.user_metadata
            
            # Actualizar nombre y apellido si están en los metadatos
            if 'nombre' in metadata and user.nombre != metadata['nombre']:
                user.nombre = metadata['nombre']
                updated = True
                
            if 'apellido' in metadata and user.apellido != metadata['apellido']:
                user.apellido = metadata['apellido']
                updated = True
        
        if updated:
            user.save()
            logger.info(f"Datos del usuario {user.email} actualizados desde Supabase")
        else:
            user.save(update_fields=['last_login'])
    
    def _create_user_from_supabase(self, supabase_user):
        """
        Crea un nuevo usuario en Django basado en datos de Supabase.
        
        Args:
            supabase_user: Datos del usuario de Supabase
            
        Returns:
            Nueva instancia de Usuario o None si falla
        """
        try:
            email = supabase_user.email
            metadata = getattr(supabase_user, 'user_metadata', {}) or {}
            
            # Generar username único basado en email
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Datos básicos del usuario
            user_data = {
                'email': email,
                'username': username,
                'nombre': metadata.get('nombre', ''),
                'apellido': metadata.get('apellido', ''),
                'rol': metadata.get('rol', 'Estudiante'),
                'is_active': True,
            }
            
            # Campos específicos según el rol
            rol = user_data['rol']
            if rol == 'Estudiante':
                user_data['matricula'] = metadata.get('matricula')
                user_data['carrera'] = metadata.get('carrera')
            elif rol == 'Docente':
                user_data['numero_empleado'] = metadata.get('numero_empleado')
                user_data['departamento'] = metadata.get('departamento')
            elif rol == 'Administrador':
                user_data['area'] = metadata.get('area')
                user_data['is_staff'] = True
            
            # Crear el usuario
            user = User.objects.create_user(**user_data)
            
            logger.info(f"Usuario creado desde Supabase: {email} con rol {rol}")
            return user
            
        except Exception as e:
            logger.error(f"Error creando usuario desde Supabase: {str(e)}")
            return None
    
    def authenticate_header(self, request):
        """
        Retorna el header de autenticación que debe usar el cliente.
        """
        return 'Bearer'