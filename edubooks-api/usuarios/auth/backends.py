# usuarios/backends.py
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.conf import settings
from edubooks.supabase_client import get_supabase_client
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class SupabaseAuthBackend(BaseBackend):
    """
    Backend de autenticación híbrido que integra Supabase Auth con Django.
    
    Este backend permite:
    1. Autenticación usando tokens de Supabase
    2. Sincronización automática de usuarios entre Supabase y Django
    3. Manejo de roles y permisos usando la lógica de Django
    """
    
    def authenticate(self, request, supabase_token=None, **kwargs):
        """
        Autentica un usuario usando un token de Supabase.
        
        Args:
            request: HttpRequest object
            supabase_token: Token JWT de Supabase
            
        Returns:
            Usuario autenticado o None si falla la autenticación
        """
        if not supabase_token:
            return None
            
        try:
            supabase = get_supabase_client()
            
            # Verificar el token con Supabase
            response = supabase.auth.get_user(supabase_token)
            
            if not response.user:
                logger.warning("Token de Supabase inválido o expirado")
                return None
                
            supabase_user = response.user
            
            # Buscar o crear el usuario en Django
            try:
                user = User.objects.get(email=supabase_user.email)
                
                # Actualizar información del usuario si es necesario
                self._sync_user_data(user, supabase_user)
                
            except User.DoesNotExist:
                # Crear nuevo usuario basado en datos de Supabase
                user = self._create_user_from_supabase(supabase_user)
                
            return user if user.is_active else None
            
        except Exception as e:
            logger.error(f"Error en autenticación Supabase: {str(e)}")
            return None
    
    def get_user(self, user_id):
        """
        Obtiene un usuario por su ID.
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Usuario o None si no existe
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
    
    def _sync_user_data(self, django_user, supabase_user):
        """
        Sincroniza datos del usuario entre Supabase y Django.
        
        Args:
            django_user: Instancia del usuario en Django
            supabase_user: Datos del usuario de Supabase
        """
        updated = False
        
        # Sincronizar email si cambió
        if django_user.email != supabase_user.email:
            django_user.email = supabase_user.email
            updated = True
            
        # Sincronizar metadatos si existen
        if hasattr(supabase_user, 'user_metadata') and supabase_user.user_metadata:
            metadata = supabase_user.user_metadata
            
            if 'nombre' in metadata and django_user.nombre != metadata['nombre']:
                django_user.nombre = metadata['nombre']
                updated = True
                
            if 'apellido' in metadata and django_user.apellido != metadata['apellido']:
                django_user.apellido = metadata['apellido']
                updated = True
        
        if updated:
            django_user.save()
            logger.info(f"Usuario {django_user.email} sincronizado con Supabase")
    
    def _create_user_from_supabase(self, supabase_user):
        """
        Crea un nuevo usuario en Django basado en datos de Supabase.
        
        Args:
            supabase_user: Datos del usuario de Supabase
            
        Returns:
            Nueva instancia de Usuario
        """
        try:
            # Extraer datos del usuario de Supabase
            email = supabase_user.email
            metadata = getattr(supabase_user, 'user_metadata', {}) or {}
            
            # Datos básicos con valores por defecto
            user_data = {
                'email': email,
                'username': email.split('@')[0],  # Usar parte del email como username
                'nombre': metadata.get('nombre', ''),
                'apellido': metadata.get('apellido', ''),
                'rol': metadata.get('rol', 'Estudiante'),  # Rol por defecto
                'is_active': True,
            }
            
            # Campos específicos según el rol
            rol = user_data['rol']
            if rol == 'Estudiante':
                user_data['matricula'] = metadata.get('matricula', '')
                user_data['carrera'] = metadata.get('carrera', '')
            elif rol == 'Docente':
                user_data['numero_empleado'] = metadata.get('numero_empleado', '')
                user_data['departamento'] = metadata.get('departamento', '')
            elif rol == 'Administrador':
                user_data['area'] = metadata.get('area', '')
                user_data['is_staff'] = True
            
            # Crear el usuario
            user = User.objects.create_user(**user_data)
            
            logger.info(f"Nuevo usuario creado desde Supabase: {email}")
            return user
            
        except Exception as e:
            logger.error(f"Error creando usuario desde Supabase: {str(e)}")
            return None
    
    def has_perm(self, user_obj, perm, obj=None):
        """
        Verifica si el usuario tiene un permiso específico.
        Delega a la lógica de permisos de Django.
        """
        return user_obj.has_perm(perm, obj)
    
    def has_module_perms(self, user_obj, app_label):
        """
        Verifica si el usuario tiene permisos para un módulo específico.
        Delega a la lógica de permisos de Django.
        """
        return user_obj.has_module_perms(app_label)