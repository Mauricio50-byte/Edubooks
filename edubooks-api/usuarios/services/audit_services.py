from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.conf import settings
from typing import Dict, List, Optional, Any, Union
import logging
import json
import time
from ..models.audit_models import (
    RegistroAuditoria, SesionUsuario, AccesoRecurso, ConfiguracionAuditoria,
    TipoAccion, NivelRiesgo
)
from ..models import Usuario

logger = logging.getLogger(__name__)

class AuditService:
    """Servicio principal para auditoría del sistema"""
    
    @staticmethod
    def registrar_accion(
        usuario: Usuario = None,
        accion: str = TipoAccion.LEER,
        descripcion: str = "",
        objeto_afectado: Any = None,
        datos_anteriores: Dict = None,
        datos_nuevos: Dict = None,
        nivel_riesgo: str = NivelRiesgo.BAJO,
        ip_address: str = None,
        user_agent: str = None,
        session_key: str = None,
        exitosa: bool = True,
        mensaje_error: str = "",
        metadatos: Dict = None,
        duracion_ms: int = None
    ) -> RegistroAuditoria:
        """
        Registra una acción en el sistema de auditoría
        
        Args:
            usuario: Usuario que realiza la acción
            accion: Tipo de acción (TipoAccion)
            descripcion: Descripción de la acción
            objeto_afectado: Objeto relacionado con la acción
            datos_anteriores: Estado anterior del objeto
            datos_nuevos: Estado nuevo del objeto
            nivel_riesgo: Nivel de riesgo de la acción
            ip_address: Dirección IP del usuario
            user_agent: User agent del navegador
            session_key: Clave de sesión
            exitosa: Si la acción fue exitosa
            mensaje_error: Mensaje de error si la acción falló
            metadatos: Datos adicionales
            duracion_ms: Duración de la acción en milisegundos
        
        Returns:
            RegistroAuditoria: El registro creado
        """
        try:
            with transaction.atomic():
                registro = RegistroAuditoria.objects.create(
                    usuario=usuario,
                    accion=accion,
                    descripcion=descripcion,
                    nivel_riesgo=nivel_riesgo,
                    objeto_afectado=objeto_afectado,
                    datos_anteriores=datos_anteriores or {},
                    datos_nuevos=datos_nuevos or {},
                    ip_address=ip_address,
                    user_agent=user_agent or "",
                    session_key=session_key or "",
                    exitosa=exitosa,
                    mensaje_error=mensaje_error,
                    metadatos=metadatos or {},
                    duracion_ms=duracion_ms
                )
                
                # Actualizar contador de acciones en la sesión si existe
                if session_key and usuario:
                    try:
                        sesion = SesionUsuario.objects.get(
                            session_key=session_key,
                            usuario=usuario,
                            activa=True
                        )
                        sesion.total_acciones += 1
                        sesion.save(update_fields=['total_acciones', 'fecha_ultimo_acceso'])
                    except SesionUsuario.DoesNotExist:
                        pass
                
                logger.debug(f"Acción registrada: {accion} - Usuario: {usuario}")
                return registro
                
        except Exception as e:
            logger.error(f"Error registrando acción en auditoría: {str(e)}")
            # En caso de error, no fallar la operación principal
            return None
    
    @staticmethod
    def iniciar_sesion_usuario(
        usuario: Usuario,
        session_key: str,
        ip_address: str,
        user_agent: str,
        pais: str = "",
        ciudad: str = ""
    ) -> SesionUsuario:
        """
        Registra el inicio de una sesión de usuario
        
        Args:
            usuario: Usuario que inicia sesión
            session_key: Clave de sesión
            ip_address: Dirección IP
            user_agent: User agent del navegador
            pais: País (opcional)
            ciudad: Ciudad (opcional)
        
        Returns:
            SesionUsuario: La sesión creada
        """
        try:
            # Cerrar sesiones anteriores del mismo usuario si existen
            SesionUsuario.objects.filter(
                usuario=usuario,
                activa=True
            ).update(
                activa=False,
                fecha_fin=timezone.now()
            )
            
            # Crear nueva sesión
            sesion = SesionUsuario.objects.create(
                usuario=usuario,
                session_key=session_key,
                ip_address=ip_address,
                user_agent=user_agent,
                pais=pais,
                ciudad=ciudad
            )
            
            # Registrar acción de login
            AuditService.registrar_accion(
                usuario=usuario,
                accion=TipoAccion.LOGIN,
                descripcion=f"Inicio de sesión desde {ip_address}",
                nivel_riesgo=NivelRiesgo.BAJO,
                ip_address=ip_address,
                user_agent=user_agent,
                session_key=session_key,
                metadatos={
                    'pais': pais,
                    'ciudad': ciudad,
                    'sesion_id': sesion.id
                }
            )
            
            logger.info(f"Sesión iniciada para usuario {usuario.id} desde {ip_address}")
            return sesion
            
        except Exception as e:
            logger.error(f"Error iniciando sesión de usuario: {str(e)}")
            raise
    
    @staticmethod
    def cerrar_sesion_usuario(
        session_key: str,
        por_inactividad: bool = False,
        por_admin: bool = False
    ) -> bool:
        """
        Cierra una sesión de usuario
        
        Args:
            session_key: Clave de sesión a cerrar
            por_inactividad: Si se cerró por inactividad
            por_admin: Si se cerró por un administrador
        
        Returns:
            bool: True si se cerró exitosamente
        """
        try:
            sesion = SesionUsuario.objects.get(
                session_key=session_key,
                activa=True
            )
            
            sesion.cerrar_sesion(por_inactividad, por_admin)
            
            # Registrar acción de logout
            AuditService.registrar_accion(
                usuario=sesion.usuario,
                accion=TipoAccion.LOGOUT,
                descripcion=f"Cierre de sesión {'por inactividad' if por_inactividad else 'por administrador' if por_admin else 'normal'}",
                nivel_riesgo=NivelRiesgo.BAJO,
                ip_address=sesion.ip_address,
                session_key=session_key,
                metadatos={
                    'duracion_sesion': str(sesion.duracion),
                    'total_acciones': sesion.total_acciones,
                    'por_inactividad': por_inactividad,
                    'por_admin': por_admin
                }
            )
            
            logger.info(f"Sesión cerrada: {session_key}")
            return True
            
        except SesionUsuario.DoesNotExist:
            logger.warning(f"Sesión no encontrada: {session_key}")
            return False
        except Exception as e:
            logger.error(f"Error cerrando sesión: {str(e)}")
            return False
    
    @staticmethod
    def registrar_acceso_recurso(
        usuario: Usuario,
        recurso_tipo: str,
        recurso_id: str,
        recurso_nombre: str,
        tipo_acceso: str = TipoAccion.LEER,
        ip_address: str = None,
        user_agent: str = "",
        referer: str = "",
        acceso_autorizado: bool = True,
        motivo_denegacion: str = ""
    ) -> AccesoRecurso:
        """
        Registra el acceso a un recurso específico
        
        Args:
            usuario: Usuario que accede al recurso
            recurso_tipo: Tipo de recurso ('libro', 'usuario', 'reporte', etc.)
            recurso_id: ID del recurso
            recurso_nombre: Nombre del recurso
            tipo_acceso: Tipo de acceso (TipoAccion)
            ip_address: Dirección IP
            user_agent: User agent del navegador
            referer: URL de referencia
            acceso_autorizado: Si el acceso fue autorizado
            motivo_denegacion: Motivo si el acceso fue denegado
        
        Returns:
            AccesoRecurso: El registro de acceso creado
        """
        try:
            acceso = AccesoRecurso.objects.create(
                usuario=usuario,
                recurso_tipo=recurso_tipo,
                recurso_id=str(recurso_id),
                recurso_nombre=recurso_nombre,
                tipo_acceso=tipo_acceso,
                ip_address=ip_address,
                user_agent=user_agent,
                referer=referer,
                acceso_autorizado=acceso_autorizado,
                motivo_denegacion=motivo_denegacion
            )
            
            logger.debug(f"Acceso registrado: {recurso_tipo}:{recurso_id} - Usuario: {usuario.id}")
            return acceso
            
        except Exception as e:
            logger.error(f"Error registrando acceso a recurso: {str(e)}")
            return None
    
    @staticmethod
    def obtener_actividad_usuario(
        usuario: Usuario,
        fecha_inicio: timezone.datetime = None,
        fecha_fin: timezone.datetime = None,
        tipos_accion: List[str] = None,
        limite: int = 100
    ) -> List[RegistroAuditoria]:
        """
        Obtiene la actividad de un usuario específico
        
        Args:
            usuario: Usuario a consultar
            fecha_inicio: Fecha de inicio del rango
            fecha_fin: Fecha de fin del rango
            tipos_accion: Tipos de acción a filtrar
            limite: Límite de resultados
        
        Returns:
            Lista de registros de auditoría
        """
        try:
            queryset = RegistroAuditoria.objects.filter(usuario=usuario)
            
            if fecha_inicio:
                queryset = queryset.filter(fecha_accion__gte=fecha_inicio)
            
            if fecha_fin:
                queryset = queryset.filter(fecha_accion__lte=fecha_fin)
            
            if tipos_accion:
                queryset = queryset.filter(accion__in=tipos_accion)
            
            return list(queryset.order_by('-fecha_accion')[:limite])
            
        except Exception as e:
            logger.error(f"Error obteniendo actividad de usuario: {str(e)}")
            return []
    
    @staticmethod
    def obtener_acciones_criticas(
        fecha_inicio: timezone.datetime = None,
        fecha_fin: timezone.datetime = None,
        limite: int = 50
    ) -> List[RegistroAuditoria]:
        """
        Obtiene las acciones críticas del sistema
        
        Args:
            fecha_inicio: Fecha de inicio del rango
            fecha_fin: Fecha de fin del rango
            limite: Límite de resultados
        
        Returns:
            Lista de registros críticos
        """
        try:
            queryset = RegistroAuditoria.objects.filter(
                nivel_riesgo__in=[NivelRiesgo.ALTO, NivelRiesgo.CRITICO]
            )
            
            if fecha_inicio:
                queryset = queryset.filter(fecha_accion__gte=fecha_inicio)
            
            if fecha_fin:
                queryset = queryset.filter(fecha_accion__lte=fecha_fin)
            
            return list(queryset.order_by('-fecha_accion')[:limite])
            
        except Exception as e:
            logger.error(f"Error obteniendo acciones críticas: {str(e)}")
            return []
    
    @staticmethod
    def generar_reporte_actividad(
        fecha_inicio: timezone.datetime,
        fecha_fin: timezone.datetime,
        incluir_usuarios: List[int] = None,
        incluir_acciones: List[str] = None
    ) -> Dict:
        """
        Genera un reporte de actividad del sistema
        
        Args:
            fecha_inicio: Fecha de inicio del reporte
            fecha_fin: Fecha de fin del reporte
            incluir_usuarios: IDs de usuarios a incluir (opcional)
            incluir_acciones: Tipos de acción a incluir (opcional)
        
        Returns:
            Diccionario con el reporte de actividad
        """
        try:
            queryset = RegistroAuditoria.objects.filter(
                fecha_accion__range=[fecha_inicio, fecha_fin]
            )
            
            if incluir_usuarios:
                queryset = queryset.filter(usuario_id__in=incluir_usuarios)
            
            if incluir_acciones:
                queryset = queryset.filter(accion__in=incluir_acciones)
            
            # Estadísticas generales
            total_acciones = queryset.count()
            acciones_exitosas = queryset.filter(exitosa=True).count()
            acciones_fallidas = queryset.filter(exitosa=False).count()
            
            # Acciones por tipo
            acciones_por_tipo = {}
            for accion in TipoAccion.choices:
                count = queryset.filter(accion=accion[0]).count()
                if count > 0:
                    acciones_por_tipo[accion[1]] = count
            
            # Usuarios más activos
            usuarios_activos = (
                queryset.values('usuario__nombre', 'usuario__apellido', 'usuario__email')
                .annotate(total=models.Count('id'))
                .order_by('-total')[:10]
            )
            
            # Acciones por nivel de riesgo
            riesgo_stats = {}
            for nivel in NivelRiesgo.choices:
                count = queryset.filter(nivel_riesgo=nivel[0]).count()
                if count > 0:
                    riesgo_stats[nivel[1]] = count
            
            reporte = {
                'periodo': {
                    'inicio': fecha_inicio.isoformat(),
                    'fin': fecha_fin.isoformat()
                },
                'estadisticas_generales': {
                    'total_acciones': total_acciones,
                    'acciones_exitosas': acciones_exitosas,
                    'acciones_fallidas': acciones_fallidas,
                    'tasa_exito': round((acciones_exitosas / total_acciones * 100), 2) if total_acciones > 0 else 0
                },
                'acciones_por_tipo': acciones_por_tipo,
                'usuarios_mas_activos': list(usuarios_activos),
                'acciones_por_riesgo': riesgo_stats,
                'fecha_generacion': timezone.now().isoformat()
            }
            
            logger.info(f"Reporte de actividad generado: {total_acciones} acciones")
            return reporte
            
        except Exception as e:
            logger.error(f"Error generando reporte de actividad: {str(e)}")
            return {}
    
    @staticmethod
    def limpiar_registros_antiguos(dias_retencion: int = None) -> Dict[str, int]:
        """
        Limpia registros de auditoría antiguos
        
        Args:
            dias_retencion: Días de retención (usa configuración si no se especifica)
        
        Returns:
            Diccionario con el número de registros eliminados por tipo
        """
        try:
            config = ConfiguracionAuditoria.get_config()
            
            if dias_retencion is None:
                dias_retencion = config.dias_retencion_logs
            
            fecha_limite = timezone.now() - timezone.timedelta(days=dias_retencion)
            
            # Limpiar registros de auditoría
            registros_eliminados = RegistroAuditoria.objects.filter(
                fecha_accion__lt=fecha_limite
            ).delete()[0]
            
            # Limpiar sesiones antiguas
            sesiones_eliminadas = SesionUsuario.objects.filter(
                fecha_inicio__lt=timezone.now() - timezone.timedelta(days=config.dias_retencion_sesiones),
                activa=False
            ).delete()[0]
            
            # Limpiar accesos antiguos
            accesos_eliminados = AccesoRecurso.objects.filter(
                fecha_acceso__lt=timezone.now() - timezone.timedelta(days=config.dias_retencion_accesos)
            ).delete()[0]
            
            resultado = {
                'registros_auditoria': registros_eliminados,
                'sesiones': sesiones_eliminadas,
                'accesos_recursos': accesos_eliminados
            }
            
            logger.info(f"Limpieza de auditoría completada: {resultado}")
            return resultado
            
        except Exception as e:
            logger.error(f"Error limpiando registros antiguos: {str(e)}")
            return {}

class AuditDecorator:
    """Decorador para auditar automáticamente funciones"""
    
    def __init__(
        self,
        accion: str,
        descripcion: str = "",
        nivel_riesgo: str = NivelRiesgo.BAJO,
        auditar_parametros: bool = False,
        auditar_resultado: bool = False
    ):
        self.accion = accion
        self.descripcion = descripcion
        self.nivel_riesgo = nivel_riesgo
        self.auditar_parametros = auditar_parametros
        self.auditar_resultado = auditar_resultado
    
    def __call__(self, func):
        def wrapper(*args, **kwargs):
            inicio = time.time()
            usuario = None
            request = None
            
            # Intentar obtener usuario y request de los argumentos
            for arg in args:
                if hasattr(arg, 'user'):
                    request = arg
                    usuario = getattr(arg, 'user', None)
                    break
                elif hasattr(arg, '__class__') and 'User' in str(arg.__class__):
                    usuario = arg
                    break
            
            # Obtener información de la request si está disponible
            ip_address = None
            user_agent = ""
            session_key = ""
            
            if request:
                ip_address = request.META.get('REMOTE_ADDR')
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                session_key = request.session.session_key or ""
            
            metadatos = {}
            if self.auditar_parametros:
                metadatos['parametros'] = {
                    'args': str(args),
                    'kwargs': str(kwargs)
                }
            
            try:
                resultado = func(*args, **kwargs)
                
                if self.auditar_resultado:
                    metadatos['resultado'] = str(resultado)
                
                # Registrar acción exitosa
                AuditService.registrar_accion(
                    usuario=usuario,
                    accion=self.accion,
                    descripcion=self.descripcion or f"Ejecución de {func.__name__}",
                    nivel_riesgo=self.nivel_riesgo,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    session_key=session_key,
                    exitosa=True,
                    metadatos=metadatos,
                    duracion_ms=int((time.time() - inicio) * 1000)
                )
                
                return resultado
                
            except Exception as e:
                # Registrar acción fallida
                AuditService.registrar_accion(
                    usuario=usuario,
                    accion=self.accion,
                    descripcion=self.descripcion or f"Error en {func.__name__}",
                    nivel_riesgo=NivelRiesgo.ALTO,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    session_key=session_key,
                    exitosa=False,
                    mensaje_error=str(e),
                    metadatos=metadatos,
                    duracion_ms=int((time.time() - inicio) * 1000)
                )
                
                raise
        
        return wrapper

# Decorador de conveniencia
def auditar(accion: str, descripcion: str = "", nivel_riesgo: str = NivelRiesgo.BAJO):
    """Decorador simple para auditar funciones"""
    return AuditDecorator(accion, descripcion, nivel_riesgo)