from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db import transaction
import threading
from django.conf import settings
from django.template.loader import render_to_string
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags
import logging

from ..models import InvitacionRegistro, Usuario
from ..serializers.invitation_serializers import (
    InvitacionCrearSerializer,
    InvitacionListaSerializer,
    InvitacionValidarSerializer,
    RegistroConInvitacionSerializer,
    InvitacionDetalleSerializer
)

logger = logging.getLogger('invitaciones')


class InvitacionCreateView(generics.CreateAPIView):
    """
    Vista para crear nuevas invitaciones.
    Solo administradores pueden crear invitaciones.
    """
    serializer_class = InvitacionCrearSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except ValidationError as e:
            return Response({'message': 'Ya existe una invitación pendiente para este email', 'errors': e.message_dict}, status=status.HTTP_409_CONFLICT)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        # Verificar que el usuario sea administrador
        if self.request.user.rol != 'administrador':
            raise permissions.PermissionDenied("Solo los administradores pueden crear invitaciones.")
        
        invitacion = serializer.save()
        threading.Thread(target=self._enviar_email_invitacion, args=(invitacion,), daemon=True).start()
        
        logger.info(f"Invitación creada por {self.request.user.email} para {invitacion.email_invitado}")
    
    def _enviar_email_invitacion(self, invitacion):
        """Enviar email de invitación al usuario."""
        try:
            base_url = getattr(settings, 'FRONTEND_PUBLIC_URL', None) or getattr(settings, 'FRONTEND_URL', '')
            registro_url = f"{base_url}/register-invitacion/{invitacion.token}"
            
            # Contexto para el template
            context = {
                'invitacion': invitacion,
                'registro_url': registro_url,
                'creado_por': invitacion.creado_por,
                'dias_expiracion': invitacion.dias_para_expirar,
                'rol_display': dict(Usuario.ROLES_CHOICES)[invitacion.rol_asignado]
            }
            
            try:
                html_message = render_to_string('emails/invitacion_registro.html', context)
                plain_message = strip_tags(html_message)
            except Exception:
                html_message = None
                plain_message = (
                    f"Has sido invitado a registrarte en EduBooks como {context['rol_display']}\n\n"
                    f"Usa este enlace para completar tu registro: {context['registro_url']}\n\n"
                    f"La invitación expira en {context['dias_expiracion']} día(s)."
                )

            timeout = getattr(settings, 'EMAIL_TIMEOUT', 15)
            connection = get_connection(timeout=timeout)
            subject = f"Invitación para registrarse en EduBooks como {context['rol_display']}"
            from_email = settings.DEFAULT_FROM_EMAIL
            to = [invitacion.email_invitado]
            email = EmailMultiAlternatives(subject, plain_message, from_email, to, connection=connection)
            if html_message:
                email.attach_alternative(html_message, "text/html")
            connection.send_messages([email])
            
            logger.info(f"Email de invitación enviado a {invitacion.email_invitado}")
            
        except Exception as e:
            logger.error(f"Error enviando email de invitación: {str(e)}")


class InvitacionListView(generics.ListAPIView):
    """
    Vista para listar invitaciones.
    Solo administradores pueden ver la lista completa.
    """
    serializer_class = InvitacionListaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.rol != 'administrador':
            raise permissions.PermissionDenied("Solo los administradores pueden ver las invitaciones.")
        
        queryset = InvitacionRegistro.objects.all().order_by('-fecha_creacion')
        
        # Filtros opcionales
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        
        rol = self.request.query_params.get('rol')
        if rol:
            queryset = queryset.filter(rol_asignado=rol)
        
        return queryset


class InvitacionDetailView(generics.RetrieveAPIView):
    """
    Vista para ver detalles de una invitación específica.
    """
    serializer_class = InvitacionDetalleSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'token'
    
    def get_queryset(self):
        if self.request.user.rol != 'administrador':
            raise permissions.PermissionDenied("Solo los administradores pueden ver detalles de invitaciones.")
        
        return InvitacionRegistro.objects.all()


@api_view(['POST'])
@permission_classes([AllowAny])
def validar_token_invitacion(request):
    """
    Endpoint para validar un token de invitación.
    Público para permitir validación antes del registro.
    """
    serializer = InvitacionValidarSerializer(data=request.data)
    
    if serializer.is_valid():
        token = serializer.validated_data['token']
        
        try:
            invitacion = InvitacionRegistro.objects.get(token=token)
            
            # Incrementar contador de intentos
            ip_address = request.META.get('REMOTE_ADDR')
            invitacion.incrementar_intento(ip_address)
            
            if invitacion.es_valida:
                rol_display = dict(Usuario.ROLES_CHOICES)[invitacion.rol_asignado]
                return Response({
                    'valido': True,
                    'invitacion': {
                        'token': str(invitacion.token),
                        'email_invitado': invitacion.email_invitado,
                        'rol': rol_display,
                        'datos_adicionales': invitacion.datos_adicionales,
                        'fecha_expiracion': invitacion.fecha_expiracion,
                        'invitado_por': {
                            'nombre': invitacion.creado_por.nombre,
                            'apellido': invitacion.creado_por.apellido,
                            'email': invitacion.creado_por.email
                        }
                    }
                })
            else:
                return Response({
                    'valido': False,
                    'mensaje': 'La invitación no es válida o ha expirado.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except InvitacionRegistro.DoesNotExist:
            return Response({
                'valido': False,
                'mensaje': 'Token de invitación no encontrado.'
            }, status=status.HTTP_404_NOT_FOUND)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def registro_con_invitacion(request):
    """
    Endpoint para registrarse usando un token de invitación.
    """
    serializer = RegistroConInvitacionSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        try:
            usuario = serializer.save()
            
            return Response({
                'mensaje': 'Usuario registrado exitosamente',
                'usuario': {
                    'id': usuario.id,
                    'email': usuario.email,
                    'nombre_completo': usuario.nombre_completo,
                    'rol': usuario.rol,
                    'username': usuario.username
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error en registro con invitación: {str(e)}")
            return Response({
                'error': 'Error interno del servidor durante el registro'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancelar_invitacion(request, token):
    """
    Endpoint para cancelar una invitación.
    Solo administradores pueden cancelar invitaciones.
    """
    if request.user.rol != 'administrador':
        return Response({
            'error': 'Solo los administradores pueden cancelar invitaciones.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    invitacion = get_object_or_404(InvitacionRegistro, token=token)
    
    if invitacion.estado != 'pendiente':
        return Response({
            'error': 'Solo se pueden cancelar invitaciones pendientes.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    motivo = request.data.get('motivo', 'Cancelada por administrador')
    
    try:
        invitacion.cancelar(motivo)
        
        return Response({
            'mensaje': 'Invitación cancelada exitosamente',
            'token': str(invitacion.token),
            'motivo': motivo
        })
        
    except Exception as e:
        logger.error(f"Error cancelando invitación {token}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def eliminar_invitacion(request, token):
    """
    Endpoint para eliminar una invitación de la base de datos.
    Solo administradores pueden eliminar invitaciones.
    """
    if request.user.rol != 'administrador':
        return Response({
            'error': 'Solo los administradores pueden eliminar invitaciones.'
        }, status=status.HTTP_403_FORBIDDEN)

    invitacion = get_object_or_404(InvitacionRegistro, token=token)

    try:
        invitacion.delete()
        logger.info(f"Invitación {token} eliminada por {request.user.email}")
        return Response({
            'mensaje': 'Invitación eliminada correctamente',
            'token': str(token)
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error eliminando invitación {token}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extender_invitacion(request, token):
    """
    Endpoint para extender la fecha de expiración de una invitación.
    Solo administradores pueden extender invitaciones.
    """
    if request.user.rol != 'administrador':
        return Response({
            'error': 'Solo los administradores pueden extender invitaciones.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    invitacion = get_object_or_404(InvitacionRegistro, token=token)
    
    if invitacion.estado != 'pendiente':
        return Response({
            'error': 'Solo se pueden extender invitaciones pendientes.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    dias_adicionales = request.data.get('dias_adicionales', 7)
    
    if not isinstance(dias_adicionales, int) or dias_adicionales < 1 or dias_adicionales > 30:
        return Response({
            'error': 'Los días adicionales deben ser un número entre 1 y 30.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        invitacion.extender_expiracion(dias_adicionales)
        
        return Response({
            'mensaje': f'Invitación extendida por {dias_adicionales} días',
            'token': str(invitacion.token),
            'nueva_fecha_expiracion': invitacion.fecha_expiracion,
            'dias_para_expirar': invitacion.dias_para_expirar
        })
        
    except Exception as e:
        logger.error(f"Error extendiendo invitación {token}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reenviar_invitacion(request, token):
    """
    Endpoint para reenviar el email de una invitación.
    Solo administradores pueden reenviar invitaciones.
    """
    if request.user.rol != 'administrador':
        return Response({
            'error': 'Solo los administradores pueden reenviar invitaciones.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    invitacion = get_object_or_404(InvitacionRegistro, token=token)
    
    if invitacion.estado != 'pendiente':
        return Response({
            'error': 'Solo se pueden reenviar invitaciones pendientes.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if invitacion.esta_expirada:
        return Response({
            'error': 'No se puede reenviar una invitación expirada. Extienda la fecha primero.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Usar el mismo método de envío de email
        view_instance = InvitacionCreateView()
        view_instance._enviar_email_invitacion(invitacion)
        
        return Response({
            'mensaje': 'Invitación reenviada exitosamente',
            'email_invitado': invitacion.email_invitado,
            'token': str(invitacion.token)
        })
        
    except Exception as e:
        logger.error(f"Error reenviando invitación {token}: {str(e)}")
        return Response({
            'error': 'Error enviando el email de invitación'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estadisticas_invitaciones(request):
    """
    Endpoint para obtener estadísticas de invitaciones.
    Solo administradores pueden ver estadísticas.
    """
    if request.user.rol != 'administrador':
        return Response({
            'error': 'Solo los administradores pueden ver estadísticas.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Limpiar invitaciones expiradas antes de calcular estadísticas
    InvitacionRegistro.limpiar_expiradas()
    
    # Calcular estadísticas
    total_invitaciones = InvitacionRegistro.objects.count()
    pendientes = InvitacionRegistro.objects.filter(estado='pendiente').count()
    usadas = InvitacionRegistro.objects.filter(estado='usado').count()
    expiradas = InvitacionRegistro.objects.filter(estado='expirado').count()
    canceladas = InvitacionRegistro.objects.filter(estado='cancelado').count()
    
    # Estadísticas por rol
    por_rol = {}
    for rol_code, rol_name in Usuario.ROLES_CHOICES:
        por_rol[rol_code] = {
            'nombre': rol_name,
            'total': InvitacionRegistro.objects.filter(rol_asignado=rol_code).count(),
            'pendientes': InvitacionRegistro.objects.filter(rol_asignado=rol_code, estado='pendiente').count(),
            'usadas': InvitacionRegistro.objects.filter(rol_asignado=rol_code, estado='usado').count()
        }
    
    return Response({
        'resumen': {
            'total_invitaciones': total_invitaciones,
            'pendientes': pendientes,
            'usadas': usadas,
            'expiradas': expiradas,
            'canceladas': canceladas,
            'tasa_uso': round((usadas / total_invitaciones * 100) if total_invitaciones > 0 else 0, 2)
        },
        'por_rol': por_rol,
        'fecha_actualizacion': timezone.now()
    })