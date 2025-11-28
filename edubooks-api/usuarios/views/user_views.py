from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db import transaction
from django.db import IntegrityError
from ..models import Usuario
from ..serializers import UsuarioPerfilSerializer, UsuarioRegistroSerializer
import jwt
import requests
from django.conf import settings
import logging
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def registro(request):
    """Registro de nuevos usuarios (solo estudiantes)"""
    try:
        rol = request.data.get('rol', 'estudiante')
        if rol != 'estudiante':
            return Response({
                'message': 'Registro manual no permitido para este rol.',
                'detail': 'Solo estudiantes pueden registrarse manualmente. Los docentes deben registrarse mediante invitación.',
                'next': {
                    'invitacion_registro_url': '/api/auth/invitaciones/registro/'
                }
            }, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data.copy()
        data['rol'] = 'estudiante'
        serializer = UsuarioRegistroSerializer(data=data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    usuario = serializer.save()
                    return Response({
                        'message': 'Usuario registrado exitosamente. Por favor, inicia sesión.',
                        'user': UsuarioPerfilSerializer(usuario).data
                    }, status=status.HTTP_201_CREATED)
            except IntegrityError as ie:
                logger.error(f"Error de integridad en registro: {str(ie)}")
                return Response({
                    'message': 'Datos duplicados o inválidos',
                    'detail': str(ie)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': 'Datos inválidos',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error en registro: {str(e)}")
        return Response({
            'message': 'Error interno del servidor',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Inicio de sesión tradicional"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'message': 'Email y contraseña son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=email, password=password)
    
    if user:
        if not user.activo:
            return Response({
                'message': 'Cuenta desactivada'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Inicio de sesión exitoso',
            'user': UsuarioPerfilSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_200_OK)
    
    return Response({
        'message': 'Credenciales inválidas'
    }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def supabase_sync(request):
    """Sincronización de usuario autenticado con Supabase"""
    try:
        supabase_token = request.data.get('supabase_token')
        user_data = request.data.get('user_data', {})
        
        if not supabase_token:
            return Response({
                'message': 'Token de Supabase requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar token de Supabase
        supabase_user = verify_supabase_token(supabase_token)
        if not supabase_user:
            return Response({
                'message': 'Token de Supabase inválido'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Buscar o crear usuario en Django
        email = supabase_user.get('email')
        if not email:
            return Response({
                'message': 'Email no encontrado en token de Supabase'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            try:
                # Intentar encontrar usuario existente
                usuario = Usuario.objects.get(email=email)
                
                # Actualizar supabase_id si no existe
                if not usuario.supabase_id:
                    usuario.supabase_id = supabase_user.get('id')
                    usuario.save()
                    
            except Usuario.DoesNotExist:
                base_username = (user_data.get('username') or email.split('@')[0] or '').strip()
                if not base_username:
                    base_username = 'usuario'
                username = base_username
                suffix = 1
                while Usuario.objects.filter(username=username).exists():
                    username = f"{base_username}{suffix}"
                    suffix += 1

                raw_nombre = (user_data.get('nombre') or supabase_user.get('user_metadata', {}).get('nombre') or 'Usuario')
                raw_apellido = (user_data.get('apellido') or supabase_user.get('user_metadata', {}).get('apellido') or 'Supabase')

                import re
                nombre = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]', '', str(raw_nombre)).strip() or 'Usuario'
                apellido = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]', '', str(raw_apellido)).strip() or 'Supabase'

                usuario_data = {
                    'email': email,
                    'username': username,
                    'nombre': nombre,
                    'apellido': apellido,
                    'rol': 'estudiante',
                    'supabase_id': supabase_user.get('id'),
                    'activo': True
                }

                usuario = Usuario(**usuario_data)
                usuario.set_unusable_password()
                try:
                    usuario.full_clean()
                    usuario.save()
                except (ValidationError, IntegrityError) as e:
                    logger.error(f"Error validando/guardando usuario desde Supabase: {e}")
                    return Response({
                        'message': 'Datos de usuario inválidos',
                        'detail': str(e)
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generar tokens JWT para Django
        refresh = RefreshToken.for_user(usuario)
        
        return Response({
            'message': 'Sincronización exitosa',
            'user': UsuarioPerfilSerializer(usuario).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error en sincronización con Supabase: {str(e)}")
        return Response({
            'message': 'Error interno del servidor',
            'errors': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def verify_supabase_token(token):
    """Verificar token de Supabase con la API"""
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'apikey': settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY
        }
        
        response = requests.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        logger.error(f"Error verificando token Supabase: {response.status_code} {response.text}")
        return None
            
    except Exception as e:
        logger.error(f"Error en verificación de token: {str(e)}")
        return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil(request):
    """Obtener perfil del usuario autenticado"""
    return Response({
        'user': UsuarioPerfilSerializer(request.user).data
    }, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def actualizar_perfil(request):
    """Actualizar perfil del usuario autenticado"""
    serializer = UsuarioPerfilSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Perfil actualizado exitosamente',
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    return Response({
        'message': 'Datos inválidos',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def usuario_me(request):
    """Compatibilidad: GET/PUT en /usuarios/me/ devolviendo solo el objeto usuario"""
    if request.method == 'GET':
        data = UsuarioPerfilSerializer(request.user).data
        return Response(data, status=status.HTTP_200_OK)
    if request.method == 'PUT':
        serializer = UsuarioPerfilSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cambiar_password(request):
    """Cambiar contraseña del usuario autenticado"""
    password_actual = request.data.get('password_actual')
    password_nueva = request.data.get('password_nueva')
    password_confirm = request.data.get('password_confirm')

    if not password_nueva:
        return Response({'message': 'La nueva contraseña es requerida'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password_nueva) < 8:
        return Response({'message': 'La nueva contraseña debe tener al menos 8 caracteres'}, status=status.HTTP_400_BAD_REQUEST)
    if password_confirm is not None and password_nueva != password_confirm:
        return Response({'message': 'La confirmación no coincide'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if user.has_usable_password():
        if not password_actual:
            return Response({'message': 'La contraseña actual es requerida'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(password_actual):
            return Response({'message': 'La contraseña actual no es correcta'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password_nueva)
    user.save()
    return Response({'message': 'Contraseña actualizada'}, status=status.HTTP_200_OK)
