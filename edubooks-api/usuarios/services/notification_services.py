from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from typing import Dict, List, Optional, Any
import logging
from ..models.notification_models import (
    Notificacion, PlantillaNotificacion, ConfiguracionNotificacion,
    TipoNotificacion, PrioridadNotificacion
)
from ..models import Usuario

logger = logging.getLogger(__name__)

class NotificationService:
    """Servicio principal para gestión de notificaciones"""
    
    @staticmethod
    def crear_notificacion(
        usuario: Usuario,
        tipo: str,
        titulo: str = None,
        mensaje: str = None,
        prioridad: str = PrioridadNotificacion.MEDIA,
        objeto_relacionado: Any = None,
        datos_adicionales: Dict = None,
        creada_por: Usuario = None,
        enviar_inmediatamente: bool = True
    ) -> Notificacion:
        """
        Crea una nueva notificación
        
        Args:
            usuario: Usuario destinatario
            tipo: Tipo de notificación (TipoNotificacion)
            titulo: Título personalizado (opcional, usa plantilla si no se proporciona)
            mensaje: Mensaje personalizado (opcional, usa plantilla si no se proporciona)
            prioridad: Prioridad de la notificación
            objeto_relacionado: Objeto relacionado con la notificación
            datos_adicionales: Datos adicionales en formato JSON
            creada_por: Usuario que crea la notificación
            enviar_inmediatamente: Si debe enviarse inmediatamente
        
        Returns:
            Notificacion: La notificación creada
        """
        try:
            with transaction.atomic():
                # Obtener plantilla si no se proporcionan título/mensaje
                plantilla = None
                if not titulo or not mensaje:
                    try:
                        plantilla = PlantillaNotificacion.objects.get(tipo=tipo, activa=True)
                    except PlantillaNotificacion.DoesNotExist:
                        logger.warning(f"No se encontró plantilla para tipo: {tipo}")
                
                # Usar plantilla o valores proporcionados
                if plantilla:
                    titulo_final = titulo or NotificationService._procesar_template(
                        plantilla.titulo_template, usuario, objeto_relacionado, datos_adicionales
                    )
                    mensaje_final = mensaje or NotificationService._procesar_template(
                        plantilla.mensaje_template, usuario, objeto_relacionado, datos_adicionales
                    )
                    prioridad_final = prioridad or plantilla.prioridad_default
                else:
                    titulo_final = titulo or f"Notificación {tipo}"
                    mensaje_final = mensaje or "Nueva notificación del sistema"
                    prioridad_final = prioridad
                
                # Crear la notificación
                notificacion = Notificacion.objects.create(
                    usuario=usuario,
                    tipo=tipo,
                    titulo=titulo_final,
                    mensaje=mensaje_final,
                    prioridad=prioridad_final,
                    objeto_relacionado=objeto_relacionado,
                    datos_adicionales=datos_adicionales or {},
                    creada_por=creada_por
                )
                
                # Enviar inmediatamente si se solicita
                if enviar_inmediatamente:
                    NotificationService.enviar_notificacion(notificacion)
                
                logger.info(f"Notificación creada: {notificacion.id} para usuario {usuario.id}")
                return notificacion
                
        except Exception as e:
            logger.error(f"Error creando notificación: {str(e)}")
            raise
    
    @staticmethod
    def enviar_notificacion(notificacion: Notificacion) -> Dict[str, bool]:
        """
        Envía una notificación por los canales configurados
        
        Args:
            notificacion: La notificación a enviar
        
        Returns:
            Dict con el resultado del envío por cada canal
        """
        resultado = {'email': False, 'push': False}
        
        try:
            # Obtener configuración del usuario
            config = NotificationService._get_user_config(notificacion.usuario)
            
            # Obtener plantilla para canales específicos
            plantilla = None
            try:
                plantilla = PlantillaNotificacion.objects.get(
                    tipo=notificacion.tipo, 
                    activa=True
                )
            except PlantillaNotificacion.DoesNotExist:
                pass
            
            # Enviar por email si está configurado
            if config.debe_enviar_email(notificacion.tipo):
                if plantilla and plantilla.enviar_email:
                    resultado['email'] = NotificationService._enviar_email(
                        notificacion, plantilla
                    )
            
            # Enviar por push si está configurado
            if config.debe_enviar_push(notificacion.tipo):
                if plantilla and plantilla.enviar_push:
                    resultado['push'] = NotificationService._enviar_push(
                        notificacion
                    )
            
            return resultado
            
        except Exception as e:
            logger.error(f"Error enviando notificación {notificacion.id}: {str(e)}")
            return resultado
    
    @staticmethod
    def _enviar_email(notificacion: Notificacion, plantilla: PlantillaNotificacion) -> bool:
        """Envía notificación por email"""
        try:
            # Procesar plantillas de email
            asunto = NotificationService._procesar_template(
                plantilla.asunto_email_template or notificacion.titulo,
                notificacion.usuario,
                notificacion.objeto_relacionado,
                notificacion.datos_adicionales
            )
            
            cuerpo = NotificationService._procesar_template(
                plantilla.cuerpo_email_template or notificacion.mensaje,
                notificacion.usuario,
                notificacion.objeto_relacionado,
                notificacion.datos_adicionales
            )
            
            # Enviar email
            send_mail(
                subject=asunto,
                message=cuerpo,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notificacion.usuario.email],
                fail_silently=False
            )
            
            # Marcar como enviada
            notificacion.marcar_enviada_email()
            
            logger.info(f"Email enviado para notificación {notificacion.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando email para notificación {notificacion.id}: {str(e)}")
            return False
    
    @staticmethod
    def _enviar_push(notificacion: Notificacion) -> bool:
        """Envía notificación push"""
        try:
            # Aquí se implementaría la lógica de push notifications
            # Por ejemplo, usando Firebase Cloud Messaging, OneSignal, etc.
            
            # Por ahora, solo marcamos como enviada
            notificacion.marcar_enviada_push()
            
            logger.info(f"Push enviado para notificación {notificacion.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando push para notificación {notificacion.id}: {str(e)}")
            return False
    
    @staticmethod
    def _procesar_template(template: str, usuario: Usuario, objeto: Any = None, datos: Dict = None) -> str:
        """Procesa una plantilla con variables dinámicas"""
        try:
            context = {
                'usuario': usuario,
                'nombre': usuario.nombre,
                'apellido': usuario.apellido,
                'nombre_completo': usuario.nombre_completo,
                'email': usuario.email,
                'objeto': objeto,
                'datos': datos or {},
                'fecha_actual': timezone.now(),
            }
            
            # Agregar datos específicos del objeto si existe
            if objeto:
                context['objeto_str'] = str(objeto)
                if hasattr(objeto, 'titulo'):
                    context['objeto_titulo'] = objeto.titulo
                if hasattr(objeto, 'nombre'):
                    context['objeto_nombre'] = objeto.nombre
            
            # Procesar template simple (reemplazar variables)
            resultado = template
            for key, value in context.items():
                placeholder = f"{{{key}}}"
                if placeholder in resultado:
                    resultado = resultado.replace(placeholder, str(value))
            
            return resultado
            
        except Exception as e:
            logger.error(f"Error procesando template: {str(e)}")
            return template
    
    @staticmethod
    def _get_user_config(usuario: Usuario) -> ConfiguracionNotificacion:
        """Obtiene la configuración de notificaciones del usuario"""
        config, created = ConfiguracionNotificacion.objects.get_or_create(
            usuario=usuario
        )
        return config
    
    @staticmethod
    def marcar_como_leidas(usuario: Usuario, notificacion_ids: List[int] = None) -> int:
        """
        Marca notificaciones como leídas
        
        Args:
            usuario: Usuario propietario de las notificaciones
            notificacion_ids: IDs específicos (opcional, si no se proporciona marca todas)
        
        Returns:
            Número de notificaciones marcadas
        """
        try:
            queryset = Notificacion.objects.filter(usuario=usuario, leida=False)
            
            if notificacion_ids:
                queryset = queryset.filter(id__in=notificacion_ids)
            
            count = queryset.update(
                leida=True,
                fecha_lectura=timezone.now()
            )
            
            logger.info(f"Marcadas {count} notificaciones como leídas para usuario {usuario.id}")
            return count
            
        except Exception as e:
            logger.error(f"Error marcando notificaciones como leídas: {str(e)}")
            return 0
    
    @staticmethod
    def obtener_notificaciones_usuario(
        usuario: Usuario,
        solo_no_leidas: bool = False,
        tipo: str = None,
        limite: int = 50
    ) -> List[Notificacion]:
        """
        Obtiene las notificaciones de un usuario
        
        Args:
            usuario: Usuario propietario
            solo_no_leidas: Si solo debe devolver no leídas
            tipo: Filtrar por tipo específico
            limite: Límite de resultados
        
        Returns:
            Lista de notificaciones
        """
        try:
            queryset = Notificacion.objects.filter(usuario=usuario)
            
            if solo_no_leidas:
                queryset = queryset.filter(leida=False)
            
            if tipo:
                queryset = queryset.filter(tipo=tipo)
            
            return list(queryset.order_by('-fecha_creacion')[:limite])
            
        except Exception as e:
            logger.error(f"Error obteniendo notificaciones: {str(e)}")
            return []
    
    @staticmethod
    def limpiar_notificaciones_antiguas(dias: int = 30) -> int:
        """
        Limpia notificaciones antiguas
        
        Args:
            dias: Días de antigüedad para considerar como antiguas
        
        Returns:
            Número de notificaciones eliminadas
        """
        try:
            fecha_limite = timezone.now() - timezone.timedelta(days=dias)
            
            count = Notificacion.objects.filter(
                fecha_creacion__lt=fecha_limite,
                leida=True
            ).delete()[0]
            
            logger.info(f"Eliminadas {count} notificaciones antiguas")
            return count
            
        except Exception as e:
            logger.error(f"Error limpiando notificaciones antiguas: {str(e)}")
            return 0

class NotificationTemplateService:
    """Servicio para gestión de plantillas de notificaciones"""
    
    @staticmethod
    def crear_plantillas_default():
        """Crea las plantillas por defecto del sistema"""
        plantillas_default = [
            {
                'tipo': TipoNotificacion.PRESTAMO_VENCIDO,
                'titulo_template': 'Préstamo Vencido - {objeto_titulo}',
                'mensaje_template': 'Hola {nombre_completo}, tu préstamo del libro "{objeto_titulo}" ha vencido. Por favor, devuélvelo lo antes posible.',
                'prioridad_default': PrioridadNotificacion.ALTA,
                'asunto_email_template': 'Préstamo Vencido - Biblioteca Edubooks',
                'cuerpo_email_template': 'Estimado/a {nombre_completo},\n\nTu préstamo del libro "{objeto_titulo}" ha vencido el {datos.fecha_vencimiento}.\n\nPor favor, devuélvelo lo antes posible para evitar multas adicionales.\n\nSaludos,\nBiblioteca Edubooks'
            },
            {
                'tipo': TipoNotificacion.PRESTAMO_PROXIMO_VENCER,
                'titulo_template': 'Préstamo Próximo a Vencer - {objeto_titulo}',
                'mensaje_template': 'Hola {nombre_completo}, tu préstamo del libro "{objeto_titulo}" vence en {datos.dias_restantes} días.',
                'prioridad_default': PrioridadNotificacion.MEDIA,
                'asunto_email_template': 'Recordatorio: Préstamo Próximo a Vencer',
                'cuerpo_email_template': 'Estimado/a {nombre_completo},\n\nTe recordamos que tu préstamo del libro "{objeto_titulo}" vence el {datos.fecha_vencimiento}.\n\nPuedes renovarlo o devolverlo antes de la fecha de vencimiento.\n\nSaludos,\nBiblioteca Edubooks'
            },
            {
                'tipo': TipoNotificacion.MULTA_APLICADA,
                'titulo_template': 'Multa Aplicada - ${datos.cantidad}',
                'mensaje_template': 'Se ha aplicado una multa de ${datos.cantidad} a tu cuenta. Motivo: {datos.motivo}',
                'prioridad_default': PrioridadNotificacion.ALTA,
                'asunto_email_template': 'Multa Aplicada - Biblioteca Edubooks',
                'cuerpo_email_template': 'Estimado/a {nombre_completo},\n\nSe ha aplicado una multa de ${datos.cantidad} a tu cuenta.\n\nMotivo: {datos.motivo}\n\nPuedes realizar el pago en línea o en las oficinas de la biblioteca.\n\nSaludos,\nBiblioteca Edubooks'
            },
            {
                'tipo': TipoNotificacion.SANCION_APLICADA,
                'titulo_template': 'Sanción Aplicada - {datos.dias} días',
                'mensaje_template': 'Se ha aplicado una sanción de {datos.dias} días a tu cuenta. No podrás realizar préstamos hasta {datos.fecha_fin}.',
                'prioridad_default': PrioridadNotificacion.CRITICA,
                'asunto_email_template': 'Sanción Aplicada - Biblioteca Edubooks',
                'cuerpo_email_template': 'Estimado/a {nombre_completo},\n\nSe ha aplicado una sanción de {datos.dias} días a tu cuenta.\n\nMotivo: {datos.motivo}\n\nNo podrás realizar préstamos hasta el {datos.fecha_fin}.\n\nSaludos,\nBiblioteca Edubooks'
            },
            {
                'tipo': TipoNotificacion.INVITACION_RECIBIDA,
                'titulo_template': 'Invitación para Registrarse',
                'mensaje_template': 'Has recibido una invitación para registrarte en la Biblioteca Edubooks como {datos.rol}.',
                'prioridad_default': PrioridadNotificacion.MEDIA,
                'asunto_email_template': 'Invitación - Biblioteca Edubooks',
                'cuerpo_email_template': 'Estimado/a {nombre_completo},\n\nHas recibido una invitación para registrarte en la Biblioteca Edubooks como {datos.rol}.\n\nUsa el siguiente enlace para completar tu registro:\n{datos.enlace_registro}\n\nEsta invitación expira el {datos.fecha_expiracion}.\n\nSaludos,\nBiblioteca Edubooks'
            },
            {
                'tipo': TipoNotificacion.BIENVENIDA,
                'titulo_template': '¡Bienvenido/a a Biblioteca Edubooks!',
                'mensaje_template': 'Bienvenido/a {nombre_completo}. Tu cuenta ha sido creada exitosamente.',
                'prioridad_default': PrioridadNotificacion.BAJA,
                'asunto_email_template': '¡Bienvenido/a a Biblioteca Edubooks!',
                'cuerpo_email_template': 'Estimado/a {nombre_completo},\n\n¡Bienvenido/a a la Biblioteca Edubooks!\n\nTu cuenta ha sido creada exitosamente. Ya puedes comenzar a explorar nuestro catálogo y realizar préstamos.\n\nSaludos,\nEquipo de Biblioteca Edubooks'
            }
        ]
        
        for plantilla_data in plantillas_default:
            PlantillaNotificacion.objects.get_or_create(
                tipo=plantilla_data['tipo'],
                defaults=plantilla_data
            )
        
        logger.info("Plantillas de notificación por defecto creadas/actualizadas")