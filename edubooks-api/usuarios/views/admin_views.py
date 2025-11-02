from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import timedelta
from typing import Dict, Any

from ..models import Usuario, Estudiante, Docente, Administrador
from ..serializers import (
    UsuarioListSerializer, UsuarioAdminSerializer, UsuarioPerfilSerializer
)
from ..services import AdminService
from ..services.audit_services import AuditService, auditar, TipoAccion, NivelRiesgo
from ..services.notification_services import NotificationService
from ..models.notification_models import TipoNotificacion
from ..auth.permissions import IsAdministrador

class UsuarioPagination(PageNumberPagination):
    """Paginación personalizada para usuarios"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class UsuarioListCreateView(generics.ListCreateAPIView):
    """Vista para listar y crear usuarios (solo administradores)"""
    serializer_class = UsuarioListSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrador]
    pagination_class = UsuarioPagination
    
    def get_queryset(self):
        queryset = Usuario.objects.all()
        
        # Filtros
        rol = self.request.query_params.get('rol')
        estado = self.request.query_params.get('estado')
        search = self.request.query_params.get('search')
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        
        if rol:
            queryset = queryset.filter(rol=rol)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        
        if search:
            queryset = queryset.filter(
                Q(nombre__icontains=search) |
                Q(apellido__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(numero_identificacion__icontains=search)
            )
        
        if fecha_desde:
            queryset = queryset.filter(fecha_registro__gte=fecha_desde)
        
        if fecha_hasta:
            queryset = queryset.filter(fecha_registro__lte=fecha_hasta)
        
        return queryset.select_related().order_by('-fecha_registro')
    
    @auditar(TipoAccion.LEER, "Consulta lista de usuarios", NivelRiesgo.BAJO)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @auditar(TipoAccion.CREAR, "Creación de usuario por administrador", NivelRiesgo.ALTO)
    def post(self, request, *args, **kwargs):
        serializer = UsuarioAdminSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            usuario = serializer.save()
            
            # Enviar notificación de bienvenida
            NotificationService.crear_notificacion(
                usuario=usuario,
                tipo=TipoNotificacion.BIENVENIDA,
                creada_por=request.user
            )
            
            return Response(
                UsuarioPerfilSerializer(usuario).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UsuarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Vista para obtener, actualizar y eliminar un usuario específico"""
    queryset = Usuario.objects.all()
    serializer_class = UsuarioAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrador]
    
    @auditar(TipoAccion.LEER, "Consulta detalle de usuario", NivelRiesgo.BAJO)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @auditar(TipoAccion.ACTUALIZAR, "Actualización de usuario por administrador", NivelRiesgo.ALTO)
    def put(self, request, *args, **kwargs):
        usuario = self.get_object()
        datos_anteriores = UsuarioAdminSerializer(usuario).data
        
        response = super().put(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Registrar cambios en auditoría
            AuditService.registrar_accion(
                usuario=request.user,
                accion=TipoAccion.ACTUALIZAR,
                descripcion=f"Usuario {usuario.email} actualizado",
                objeto_afectado=usuario,
                datos_anteriores=datos_anteriores,
                datos_nuevos=response.data,
                nivel_riesgo=NivelRiesgo.ALTO
            )
        
        return response
    
    @auditar(TipoAccion.ACTUALIZAR, "Actualización parcial de usuario", NivelRiesgo.MEDIO)
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    @auditar(TipoAccion.ELIMINAR, "Eliminación de usuario", NivelRiesgo.CRITICO)
    def delete(self, request, *args, **kwargs):
        usuario = self.get_object()
        
        # No permitir eliminar administradores si es el último
        if usuario.rol == 'administrador':
            admin_count = Usuario.objects.filter(rol='administrador', activo=True).count()
            if admin_count <= 1:
                return Response(
                    {'error': 'No se puede eliminar el último administrador activo'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return super().delete(request, *args, **kwargs)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
@auditar(TipoAccion.SANCION, "Aplicación de sanción", NivelRiesgo.ALTO)
def aplicar_sancion(request, usuario_id):
    """Aplica una sanción a un usuario"""
    try:
        usuario = get_object_or_404(Usuario, id=usuario_id)
        dias = request.data.get('dias', 0)
        motivo = request.data.get('motivo', '')
        
        if dias <= 0:
            return Response(
                {'error': 'Los días de sanción deben ser mayor a 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Aplicar sanción usando el servicio
        resultado = AdminService.aplicar_sancion(usuario, dias, motivo, request.user)
        
        if resultado['success']:
            # Crear notificación
            NotificationService.crear_notificacion(
                usuario=usuario,
                tipo=TipoNotificacion.SANCION_APLICADA,
                datos_adicionales={
                    'dias': dias,
                    'motivo': motivo,
                    'fecha_fin': resultado['fecha_fin'].isoformat(),
                    'aplicada_por': request.user.nombre_completo
                },
                creada_por=request.user
            )
            
            return Response(resultado, status=status.HTTP_200_OK)
        else:
            return Response(resultado, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
@auditar(TipoAccion.MULTA, "Aplicación de multa", NivelRiesgo.ALTO)
def aplicar_multa(request, usuario_id):
    """Aplica una multa a un usuario"""
    try:
        usuario = get_object_or_404(Usuario, id=usuario_id)
        cantidad = request.data.get('cantidad', 0)
        concepto = request.data.get('concepto', '')
        
        if cantidad <= 0:
            return Response(
                {'error': 'La cantidad de la multa debe ser mayor a 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Aplicar multa usando el servicio
        resultado = AdminService.aplicar_multa(usuario, cantidad, concepto, request.user)
        
        if resultado['success']:
            # Crear notificación
            NotificationService.crear_notificacion(
                usuario=usuario,
                tipo=TipoNotificacion.MULTA_APLICADA,
                datos_adicionales={
                    'cantidad': str(cantidad),
                    'concepto': concepto,
                    'aplicada_por': request.user.nombre_completo
                },
                creada_por=request.user
            )
            
            return Response(resultado, status=status.HTTP_200_OK)
        else:
            return Response(resultado, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
@auditar(TipoAccion.ACTUALIZAR, "Pago de multa", NivelRiesgo.MEDIO)
def registrar_pago_multa(request, usuario_id):
    """Registra el pago de una multa"""
    try:
        usuario = get_object_or_404(Usuario, id=usuario_id)
        cantidad = request.data.get('cantidad', 0)
        
        if cantidad <= 0:
            return Response(
                {'error': 'La cantidad del pago debe ser mayor a 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if cantidad > usuario.multas_pendientes:
            return Response(
                {'error': f'La cantidad no puede ser mayor a las multas pendientes (${usuario.multas_pendientes})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Registrar pago usando el servicio
        resultado = AdminService.registrar_pago_multa(usuario, cantidad, request.user)
        
        return Response(resultado, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
@auditar(TipoAccion.ACTUALIZAR, "Cambio de estado de usuario", NivelRiesgo.ALTO)
def cambiar_estado_usuario(request, usuario_id):
    """Cambia el estado de un usuario (activo/inactivo)"""
    try:
        usuario = get_object_or_404(Usuario, id=usuario_id)
        nuevo_estado = request.data.get('activo')
        
        if nuevo_estado is None:
            return Response(
                {'error': 'Debe especificar el estado (activo: true/false)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # No permitir desactivar administradores si es el último
        if not nuevo_estado and usuario.rol == 'administrador':
            admin_count = Usuario.objects.filter(rol='administrador', activo=True).count()
            if admin_count <= 1:
                return Response(
                    {'error': 'No se puede desactivar el último administrador activo'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        estado_anterior = usuario.activo
        usuario.activo = nuevo_estado
        
        # Actualizar el campo 'estado' para mantener coherencia con la validación del modelo
        if nuevo_estado:
            usuario.estado = 'activo'
        else:
            usuario.estado = 'inactivo'
        
        # Verificar que request.user sea una instancia válida de Usuario
        if hasattr(request.user, 'id') and request.user.id:
            usuario.actualizado_por = request.user
        
        usuario.save()
        
        # Registrar en auditoría solo si AuditService está disponible
        try:
            AuditService.registrar_accion(
                usuario=request.user,
                accion=TipoAccion.ACTUALIZAR,
                descripcion=f"Usuario {usuario.email} {'activado' if nuevo_estado else 'desactivado'}",
                objeto_afectado=usuario,
                datos_anteriores={'activo': estado_anterior},
                datos_nuevos={'activo': nuevo_estado},
                nivel_riesgo=NivelRiesgo.ALTO
            )
        except Exception as audit_error:
            # Log audit error but don't fail the main operation
            print(f"Error en auditoría: {audit_error}")
        
        return Response({
            'success': True,
            'message': f'Usuario {"activado" if nuevo_estado else "desactivado"} exitosamente',
            'usuario': UsuarioPerfilSerializer(usuario).data
        })
        
    except Usuario.DoesNotExist:
        return Response(
            {'error': 'Usuario no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    except ValueError as ve:
        return Response(
            {'error': f'Error de valor: {str(ve)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"Error completo en cambiar_estado_usuario: {traceback.format_exc()}")
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
@auditar(TipoAccion.LEER, "Consulta estadísticas de usuarios", NivelRiesgo.BAJO)
def estadisticas_usuarios(request):
    """Obtiene estadísticas generales de usuarios"""
    try:
        # Estadísticas básicas
        total_usuarios = Usuario.objects.count()
        usuarios_activos = Usuario.objects.filter(activo=True).count()
        usuarios_inactivos = total_usuarios - usuarios_activos
        
        # Por rol
        stats_por_rol = {}
        for rol_code, rol_name in Usuario.ROLES_CHOICES:
            count = Usuario.objects.filter(rol=rol_code).count()
            stats_por_rol[rol_name] = count
        
        # Por estado
        stats_por_estado = {}
        for estado_code, estado_name in Usuario.ESTADO_CHOICES:
            count = Usuario.objects.filter(estado=estado_code).count()
            stats_por_estado[estado_name] = count
        
        # Registros recientes
        hoy = timezone.now().date()
        esta_semana = hoy - timedelta(days=7)
        este_mes = hoy - timedelta(days=30)
        
        registros_hoy = Usuario.objects.filter(fecha_registro__date=hoy).count()
        registros_semana = Usuario.objects.filter(fecha_registro__date__gte=esta_semana).count()
        registros_mes = Usuario.objects.filter(fecha_registro__date__gte=este_mes).count()
        
        # Usuarios con sanciones activas
        usuarios_sancionados = Usuario.objects.filter(
            sancionado_hasta__gt=timezone.now()
        ).count()
        
        # Usuarios con multas pendientes
        usuarios_con_multas = Usuario.objects.filter(multas_pendientes__gt=0).count()
        
        estadisticas = {
            'resumen_general': {
                'total_usuarios': total_usuarios,
                'usuarios_activos': usuarios_activos,
                'usuarios_inactivos': usuarios_inactivos,
                'usuarios_sancionados': usuarios_sancionados,
                'usuarios_con_multas': usuarios_con_multas
            },
            'por_rol': stats_por_rol,
            'por_estado': stats_por_estado,
            'registros_recientes': {
                'hoy': registros_hoy,
                'esta_semana': registros_semana,
                'este_mes': registros_mes
            },
            'fecha_consulta': timezone.now().isoformat()
        }
        
        return Response(estadisticas)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
@auditar(TipoAccion.LEER, "Consulta usuarios por rol", NivelRiesgo.BAJO)
def usuarios_por_rol(request, rol):
    """Obtiene usuarios filtrados por rol específico"""
    try:
        # Validar que el rol existe
        roles_validos = [choice[0] for choice in Usuario.ROLES_CHOICES]
        if rol not in roles_validos:
            return Response(
                {'error': f'Rol inválido. Roles válidos: {roles_validos}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        usuarios = Usuario.objects.filter(rol=rol).select_related()
        
        # Aplicar filtros adicionales
        activo = request.query_params.get('activo')
        if activo is not None:
            usuarios = usuarios.filter(activo=activo.lower() == 'true')
        
        # Serializar según el rol
        if rol == 'estudiante':
            usuarios = usuarios.prefetch_related('estudiante')
        elif rol == 'docente':
            usuarios = usuarios.prefetch_related('docente')
        elif rol == 'administrador':
            usuarios = usuarios.prefetch_related('administrador')
        
        serializer = UsuarioListSerializer(usuarios, many=True)
        
        return Response({
            'rol': rol,
            'total': usuarios.count(),
            'usuarios': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
@auditar(TipoAccion.EXPORTACION, "Exportación de datos de usuarios", NivelRiesgo.MEDIO)
def exportar_usuarios(request):
    """Exporta datos de usuarios en formato JSON"""
    try:
        formato = request.data.get('formato', 'json')
        incluir_roles = request.data.get('incluir_roles', [])
        incluir_inactivos = request.data.get('incluir_inactivos', False)
        
        queryset = Usuario.objects.all()
        
        if incluir_roles:
            queryset = queryset.filter(rol__in=incluir_roles)
        
        if not incluir_inactivos:
            queryset = queryset.filter(activo=True)
        
        usuarios = queryset.select_related()
        serializer = UsuarioListSerializer(usuarios, many=True)
        
        # Por ahora solo JSON, se puede extender para CSV, Excel, etc.
        if formato == 'json':
            return Response({
                'formato': formato,
                'total_registros': len(serializer.data),
                'fecha_exportacion': timezone.now().isoformat(),
                'exportado_por': request.user.nombre_completo,
                'datos': serializer.data
            })
        else:
            return Response(
                {'error': 'Formato no soportado. Formatos disponibles: json'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )