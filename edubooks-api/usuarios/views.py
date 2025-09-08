from django.shortcuts import render
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login
from .serializers import (
    UsuarioRegistroSerializer, 
    UsuarioLoginSerializer, 
    UsuarioPerfilSerializer
)
from .models import Usuario

def get_tokens_for_user(user):
    """Generar tokens JWT para un usuario"""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegistroView(generics.CreateAPIView):
    """Vista para registro de usuarios"""
    queryset = Usuario.objects.all()
    serializer_class = UsuarioRegistroSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            usuario = serializer.save()
            tokens = get_tokens_for_user(usuario)
            
            return Response({
                'message': 'Usuario registrado exitosamente',
                'user': UsuarioPerfilSerializer(usuario).data,
                'tokens': tokens
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'message': 'Error en el registro',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Vista para inicio de sesión"""
    serializer = UsuarioLoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        
        return Response({
            'message': 'Inicio de sesión exitoso',
            'user': UsuarioPerfilSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_200_OK)
    
    return Response({
        'message': 'Error en el inicio de sesión',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Vista para cerrar sesión"""
    try:
        refresh_token = request.data["refresh_token"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        return Response({
            'message': 'Sesión cerrada exitosamente'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'message': 'Error al cerrar sesión',
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil_view(request):
    """Vista para obtener perfil del usuario"""
    serializer = UsuarioPerfilSerializer(request.user)
    return Response({
        'message': 'Perfil obtenido exitosamente',
        'user': serializer.data
    }, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def actualizar_perfil_view(request):
    """Vista para actualizar perfil del usuario"""
    serializer = UsuarioPerfilSerializer(request.user, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Perfil actualizado exitosamente',
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    
    return Response({
        'message': 'Error al actualizar perfil',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)