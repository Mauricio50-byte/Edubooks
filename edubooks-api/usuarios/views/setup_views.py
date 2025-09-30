"""
Vistas para el sistema de inicialización de superusuarios.
Permite crear el primer administrador del sistema de forma segura.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from usuarios.models.user_models import Administrador
from usuarios.serializers.user_serializers import UsuarioRegistroSerializer
import re
import logging

Usuario = get_user_model()
logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def inicializar_sistema(request):
    """
    Endpoint para inicializar el sistema creando el primer superusuario.
    Solo funciona si no existen superusuarios en el sistema.
    
    POST /api/setup/inicializar/
    {
        "email": "admin@institucion.edu",
        "username": "admin",
        "password": "MiPassword123!",
        "nombre": "Administrador Principal",
        "institucion": "Mi Institución"
    }
    """
    try:
        # Log de datos recibidos para debugging
        logger.info(f"Datos recibidos en inicializar_sistema: {request.data}")
        
        # Verificar si ya existen superusuarios
        if Usuario.objects.filter(is_superuser=True).exists():
            logger.warning("Intento de inicialización con superusuarios existentes")
            return Response({
                'error': 'El sistema ya ha sido inicializado',
                'message': 'Ya existen administradores en el sistema',
                'code': 'SYSTEM_ALREADY_INITIALIZED'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validar datos requeridos
        required_fields = ['email', 'username', 'password', 'nombre', 'institucion']
        missing_fields = [field for field in required_fields if not request.data.get(field)]
        
        if missing_fields:
            return Response({
                'error': 'Campos requeridos faltantes',
                'missing_fields': missing_fields,
                'code': 'MISSING_REQUIRED_FIELDS'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extraer datos
        email = request.data.get('email').strip().lower()
        username = request.data.get('username').strip()
        password = request.data.get('password')
        password_confirm = request.data.get('password_confirm', password)
        nombre = request.data.get('nombre').strip()
        apellido = request.data.get('apellido', 'Sistema')
        institucion = request.data.get('institucion').strip()
        
        # Validar que las contraseñas coincidan
        if password != password_confirm:
            return Response({
                'error': 'Las contraseñas no coinciden',
                'code': 'PASSWORD_MISMATCH'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validaciones
        validation_errors = []
        
        # Validar email
        try:
            _validar_email(email)
        except ValidationError as e:
            validation_errors.append(f"Email: {str(e)}")

        # Validar password
        try:
            _validar_password(password)
        except ValidationError as e:
            validation_errors.append(f"Contraseña: {str(e)}")

        # Validar username
        try:
            _validar_username(username)
        except ValidationError as e:
            validation_errors.append(f"Username: {str(e)}")

        # Validar nombre
        if len(nombre) < 2:
            validation_errors.append("Nombre: Debe tener al menos 2 caracteres")

        # Validar institución
        if len(institucion) < 2:
            validation_errors.append("Institución: Debe tener al menos 2 caracteres")

        if validation_errors:
            return Response({
                'error': 'Errores de validación',
                'validation_errors': validation_errors,
                'code': 'VALIDATION_ERRORS'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que no existan usuarios con el mismo email o username
        if Usuario.objects.filter(email=email).exists():
            return Response({
                'error': 'Ya existe un usuario con este email',
                'code': 'EMAIL_ALREADY_EXISTS'
            }, status=status.HTTP_400_BAD_REQUEST)

        if Usuario.objects.filter(username=username).exists():
            return Response({
                'error': 'Ya existe un usuario con este username',
                'code': 'USERNAME_ALREADY_EXISTS'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Crear superusuario
        with transaction.atomic():
            # Preparar datos para el serializer
            user_data = {
                'email': email,
                'username': username,
                'password': password,
                'password_confirm': password,  # Requerido por el serializer
                'nombre': nombre,
                'apellido': apellido,  # Usar el apellido del formulario
                'rol': 'administrador',
                'datos_administrador': {
                    'area': institucion,  # Mapear institucion a area que es lo que requiere el serializer
                    'cargo': 'Super Administrador',
                    'nivel_acceso': 4,
                    'puede_crear_usuarios': True,
                    'puede_modificar_usuarios': True,
                    'puede_eliminar_usuarios': True,
                    'puede_gestionar_libros': True,
                    'puede_gestionar_prestamos': True,
                    'puede_aplicar_sanciones': True,
                    'puede_generar_reportes': True,
                    'puede_configurar_sistema': True,
                    'fecha_nombramiento': timezone.now().date().isoformat(),
                }
            }
            
            # Usar el serializer para crear el usuario
            serializer = UsuarioRegistroSerializer(data=user_data)
            if not serializer.is_valid():
                logger.error(f"Error de validación del serializer: {serializer.errors}")
                logger.error(f"Datos enviados al serializer: {user_data}")
                return Response({
                    'error': 'Error de validación',
                    'validation_errors': serializer.errors,
                    'code': 'SERIALIZER_VALIDATION_ERROR'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Crear el usuario
            usuario = serializer.save()
            
            # Establecer permisos de superusuario
            usuario.is_staff = True
            usuario.is_superuser = True
            usuario.save()
            
            # Obtener el perfil de administrador creado
            administrador = usuario.perfil_administrador

            logger.info(f"Sistema inicializado exitosamente. Superusuario creado: {email}")

            return Response({
                'success': True,
                'message': 'Sistema inicializado exitosamente',
                'data': {
                    'usuario': {
                        'id': usuario.id,
                        'email': usuario.email,
                        'username': usuario.username,
                        'nombre': usuario.nombre,
                        'apellido': usuario.apellido,
                        'rol': usuario.rol,
                        'is_superuser': usuario.is_superuser,
                    },
                    'administrador': {
                        'area': administrador.area,
                        'cargo': administrador.cargo,
                        'nivel_acceso': administrador.nivel_acceso,
                        'fecha_nombramiento': administrador.fecha_nombramiento.isoformat(),
                    }
                },
                'instructions': {
                    'admin_panel': '/admin/',
                    'api_access': '/api/',
                    'next_steps': [
                        'Inicie sesión con las credenciales creadas',
                        'Cambie la contraseña después del primer login',
                        'Configure los ajustes adicionales del sistema'
                    ]
                }
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error al inicializar sistema: {str(e)}")
        return Response({
            'error': 'Error interno del servidor',
            'message': 'Ocurrió un error al inicializar el sistema',
            'code': 'INTERNAL_SERVER_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def verificar_inicializacion(request):
    """
    Endpoint para verificar si el sistema ya ha sido inicializado.
    
    GET /api/setup/verificar/
    """
    try:
        superusers_count = Usuario.objects.filter(is_superuser=True).count()
        total_users_count = Usuario.objects.count()
        
        is_initialized = superusers_count > 0
        
        return Response({
            'is_initialized': is_initialized,
            'superusers_count': superusers_count,
            'total_users_count': total_users_count,
            'message': 'Sistema ya inicializado' if is_initialized else 'Sistema requiere inicialización',
            'status': 'INITIALIZED' if is_initialized else 'NEEDS_INITIALIZATION'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error al verificar inicialización: {str(e)}")
        return Response({
            'error': 'Error interno del servidor',
            'message': 'Ocurrió un error al verificar el estado del sistema',
            'code': 'INTERNAL_SERVER_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def estado_sistema(request):
    """
    Endpoint para obtener información general del estado del sistema.
    
    GET /api/setup/estado/
    """
    try:
        from django.apps import apps
        from libros.models import Libro, Prestamo
        
        # Contar usuarios por rol
        usuarios_stats = {
            'total': Usuario.objects.count(),
            'administradores': Usuario.objects.filter(rol='administrador').count(),
            'bibliotecarios': Usuario.objects.filter(rol='bibliotecario').count(),
            'docentes': Usuario.objects.filter(rol='docente').count(),
            'estudiantes': Usuario.objects.filter(rol='estudiante').count(),
            'superusuarios': Usuario.objects.filter(is_superuser=True).count(),
        }
        
        # Contar libros y préstamos
        libros_stats = {
            'total_libros': Libro.objects.count(),
            'libros_disponibles': Libro.objects.filter(estado='disponible').count(),
            'libros_prestados': Libro.objects.filter(estado='prestado').count(),
            'total_prestamos': Prestamo.objects.count(),
            'prestamos_activos': Prestamo.objects.filter(estado='activo').count(),
        }
        
        # Estado general del sistema
        is_initialized = usuarios_stats['superusuarios'] > 0
        
        return Response({
            'system_status': {
                'is_initialized': is_initialized,
                'status': 'OPERATIONAL' if is_initialized else 'NEEDS_SETUP',
                'version': '1.0.0',
                'database_connected': True,
            },
            'statistics': {
                'usuarios': usuarios_stats,
                'libros': libros_stats,
            },
            'message': 'Sistema operativo' if is_initialized else 'Sistema requiere configuración inicial'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error al obtener estado del sistema: {str(e)}")
        return Response({
            'system_status': {
                'is_initialized': False,
                'status': 'ERROR',
                'database_connected': False,
            },
            'error': 'Error al obtener estadísticas del sistema',
            'code': 'SYSTEM_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Funciones de validación auxiliares
def _validar_email(email):
    """Valida que el email tenga formato correcto"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise ValidationError('El email no tiene un formato válido')


def _validar_password(password):
    """Valida que la contraseña cumpla con los requisitos mínimos"""
    if len(password) < 8:
        raise ValidationError('Debe tener al menos 8 caracteres')
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError('Debe contener al menos una letra mayúscula')
    
    if not re.search(r'[a-z]', password):
        raise ValidationError('Debe contener al menos una letra minúscula')
    
    if not re.search(r'\d', password):
        raise ValidationError('Debe contener al menos un número')
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValidationError('Debe contener al menos un carácter especial')


def _validar_username(username):
    """Valida que el username tenga formato correcto"""
    if len(username) < 3:
        raise ValidationError('Debe tener al menos 3 caracteres')
    
    # Permitir cualquier carácter excepto caracteres de control
    if any(ord(char) < 32 for char in username):
        raise ValidationError('No puede contener caracteres de control')