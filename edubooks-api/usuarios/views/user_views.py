from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.db import transaction
from django.db import IntegrityError
from ..models import Usuario
from ..serializers import UsuarioPerfilSerializer, UsuarioRegistroSerializer
import logging
from django.core.exceptions import ValidationError
from edubooks.firebase_client import verify_token as verify_firebase_token

logger = logging.getLogger(__name__)

# Eliminados endpoints tradicionales de registro y login



@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_sync(request):
    try:
        id_token = request.data.get('firebase_token')
        user_data = request.data.get('user_data', {})
        if not id_token:
            return Response({'message': 'Token de Firebase requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            decoded = verify_firebase_token(id_token)
        except Exception:
            return Response({'message': 'Token de Firebase inválido'}, status=status.HTTP_401_UNAUTHORIZED)
        email = decoded.get('email')
        if not email:
            return Response({'message': 'Email no encontrado en token de Firebase'}, status=status.HTTP_400_BAD_REQUEST)
        nombre_raw = (user_data.get('nombre') or decoded.get('name') or '')
        import re
        nombre = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]', '', str(nombre_raw)).strip() if nombre_raw else ''
        return Response({
            'message': 'Sincronización exitosa',
            'firebase': {
                'uid': decoded.get('uid'),
                'email': email,
                'nombre': nombre
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error en sincronización con Firebase: {str(e)}")
        return Response({'message': 'Error interno del servidor', 'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
