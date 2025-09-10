from django.shortcuts import render
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login
from .serializers import (
    UsuarioRegistroSerializer, 
    UsuarioLoginSerializer, 
    UsuarioPerfilSerializer,
    UsuarioListSerializer
)
from .models import Usuario
from .permissions import IsAdministrador

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

# ============ VISTAS DE ADMINISTRACIÓN ============

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class UsuarioListView(generics.ListAPIView):
    """Lista de usuarios para administradores"""
    serializer_class = UsuarioListSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticated, IsAdministrador]
    
    def get_queryset(self):
        queryset = Usuario.objects.all()
        
        # Filtros de búsqueda
        nombre = self.request.query_params.get('nombre', None)
        apellido = self.request.query_params.get('apellido', None)
        email = self.request.query_params.get('email', None)
        rol = self.request.query_params.get('rol', None)
        activo = self.request.query_params.get('activo', None)
        
        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)
        if apellido:
            queryset = queryset.filter(apellido__icontains=apellido)
        if email:
            queryset = queryset.filter(email__icontains=email)
        if rol:
            queryset = queryset.filter(rol=rol)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        
        return queryset.order_by('-fecha_registro')

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdministrador])
def cambiar_estado_usuario(request, usuario_id):
    """Activar o desactivar usuario"""
    try:
        usuario = Usuario.objects.get(id=usuario_id)
        
        # No permitir desactivar al propio administrador
        if usuario.id == request.user.id:
            return Response({
                'message': 'No puedes desactivar tu propia cuenta'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Cambiar estado
        usuario.activo = not usuario.activo
        usuario.save()
        
        estado = 'activado' if usuario.activo else 'desactivado'
        
        return Response({
            'message': f'Usuario {estado} exitosamente',
            'usuario': UsuarioListSerializer(usuario).data
        }, status=status.HTTP_200_OK)
        
    except Usuario.DoesNotExist:
        return Response({
            'message': 'Usuario no encontrado'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'message': 'Error al cambiar estado del usuario',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdministrador])
def estadisticas_usuarios(request):
    """Estadísticas de usuarios para el dashboard"""
    try:
        total_usuarios = Usuario.objects.count()
        usuarios_activos = Usuario.objects.filter(activo=True).count()
        usuarios_inactivos = Usuario.objects.filter(activo=False).count()
        
        # Contar por rol
        estudiantes = Usuario.objects.filter(rol='Estudiante').count()
        docentes = Usuario.objects.filter(rol='Docente').count()
        administradores = Usuario.objects.filter(rol='Administrador').count()
        
        return Response({
            'total_usuarios': total_usuarios,
            'usuarios_activos': usuarios_activos,
            'usuarios_inactivos': usuarios_inactivos,
            'por_rol': {
                'estudiantes': estudiantes,
                'docentes': docentes,
                'administradores': administradores
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'message': 'Error al obtener estadísticas',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)