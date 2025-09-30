from django.db import models
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.conf import settings

class TipoNotificacion(models.TextChoices):
    """Tipos de notificaciones disponibles"""
    PRESTAMO_VENCIDO = 'prestamo_vencido', 'Préstamo Vencido'
    PRESTAMO_PROXIMO_VENCER = 'prestamo_proximo_vencer', 'Préstamo Próximo a Vencer'
    MULTA_APLICADA = 'multa_aplicada', 'Multa Aplicada'
    SANCION_APLICADA = 'sancion_aplicada', 'Sanción Aplicada'
    INVITACION_RECIBIDA = 'invitacion_recibida', 'Invitación Recibida'
    INVITACION_VENCIDA = 'invitacion_vencida', 'Invitación Vencida'
    LIBRO_DISPONIBLE = 'libro_disponible', 'Libro Disponible'
    RECORDATORIO_DEVOLUCION = 'recordatorio_devolucion', 'Recordatorio de Devolución'
    SISTEMA = 'sistema', 'Notificación del Sistema'
    BIENVENIDA = 'bienvenida', 'Bienvenida'

class PrioridadNotificacion(models.TextChoices):
    """Prioridades de notificaciones"""
    BAJA = 'baja', 'Baja'
    MEDIA = 'media', 'Media'
    ALTA = 'alta', 'Alta'
    CRITICA = 'critica', 'Crítica'

class Notificacion(models.Model):
    """Modelo para gestionar notificaciones del sistema"""
    
    # Destinatario
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notificaciones'
    )
    
    # Contenido de la notificación
    tipo = models.CharField(
        max_length=50, 
        choices=TipoNotificacion.choices,
        default=TipoNotificacion.SISTEMA
    )
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    prioridad = models.CharField(
        max_length=20,
        choices=PrioridadNotificacion.choices,
        default=PrioridadNotificacion.MEDIA
    )
    
    # Relación genérica para vincular con cualquier modelo
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    objeto_relacionado = GenericForeignKey('content_type', 'object_id')
    
    # Estado de la notificación
    leida = models.BooleanField(default=False)
    fecha_lectura = models.DateTimeField(null=True, blank=True)
    
    # Canales de envío
    enviada_email = models.BooleanField(default=False)
    enviada_push = models.BooleanField(default=False)
    fecha_envio_email = models.DateTimeField(null=True, blank=True)
    fecha_envio_push = models.DateTimeField(null=True, blank=True)
    
    # Metadatos
    datos_adicionales = models.JSONField(default=dict, blank=True)
    
    # Auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='notificaciones_creadas'
    )
    
    class Meta:
        db_table = 'usuarios_notificacion'
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['usuario', 'leida']),
            models.Index(fields=['tipo', 'fecha_creacion']),
            models.Index(fields=['prioridad', 'leida']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.usuario.nombre_completo}"
    
    def marcar_como_leida(self):
        """Marca la notificación como leída"""
        if not self.leida:
            self.leida = True
            self.fecha_lectura = timezone.now()
            self.save(update_fields=['leida', 'fecha_lectura'])
    
    def marcar_enviada_email(self):
        """Marca la notificación como enviada por email"""
        self.enviada_email = True
        self.fecha_envio_email = timezone.now()
        self.save(update_fields=['enviada_email', 'fecha_envio_email'])
    
    def marcar_enviada_push(self):
        """Marca la notificación como enviada por push"""
        self.enviada_push = True
        self.fecha_envio_push = timezone.now()
        self.save(update_fields=['enviada_push', 'fecha_envio_push'])

class PlantillaNotificacion(models.Model):
    """Plantillas para diferentes tipos de notificaciones"""
    
    tipo = models.CharField(
        max_length=50, 
        choices=TipoNotificacion.choices,
        unique=True
    )
    titulo_template = models.CharField(max_length=200)
    mensaje_template = models.TextField()
    prioridad_default = models.CharField(
        max_length=20,
        choices=PrioridadNotificacion.choices,
        default=PrioridadNotificacion.MEDIA
    )
    
    # Configuración de canales
    enviar_email = models.BooleanField(default=True)
    enviar_push = models.BooleanField(default=True)
    
    # Plantillas para email
    asunto_email_template = models.CharField(max_length=200, blank=True)
    cuerpo_email_template = models.TextField(blank=True)
    
    # Metadatos
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'usuarios_plantilla_notificacion'
        verbose_name = 'Plantilla de Notificación'
        verbose_name_plural = 'Plantillas de Notificaciones'
    
    def __str__(self):
        return f"Plantilla: {self.get_tipo_display()}"

class ConfiguracionNotificacion(models.Model):
    """Configuración personalizada de notificaciones por usuario"""
    
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='config_notificaciones'
    )
    
    # Configuración por tipo de notificación
    prestamos_email = models.BooleanField(default=True)
    prestamos_push = models.BooleanField(default=True)
    
    multas_email = models.BooleanField(default=True)
    multas_push = models.BooleanField(default=True)
    
    sanciones_email = models.BooleanField(default=True)
    sanciones_push = models.BooleanField(default=True)
    
    invitaciones_email = models.BooleanField(default=True)
    invitaciones_push = models.BooleanField(default=False)
    
    sistema_email = models.BooleanField(default=True)
    sistema_push = models.BooleanField(default=False)
    
    # Configuración de frecuencia
    recordatorios_activos = models.BooleanField(default=True)
    dias_antes_vencimiento = models.PositiveIntegerField(default=3)
    
    # Horarios de envío
    hora_inicio_envios = models.TimeField(default='08:00:00')
    hora_fin_envios = models.TimeField(default='20:00:00')
    
    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'usuarios_configuracion_notificacion'
        verbose_name = 'Configuración de Notificaciones'
        verbose_name_plural = 'Configuraciones de Notificaciones'
    
    def __str__(self):
        return f"Config. Notificaciones - {self.usuario.nombre_completo}"
    
    def debe_enviar_email(self, tipo_notificacion):
        """Determina si debe enviar email para un tipo de notificación"""
        mapping = {
            TipoNotificacion.PRESTAMO_VENCIDO: self.prestamos_email,
            TipoNotificacion.PRESTAMO_PROXIMO_VENCER: self.prestamos_email,
            TipoNotificacion.RECORDATORIO_DEVOLUCION: self.prestamos_email,
            TipoNotificacion.MULTA_APLICADA: self.multas_email,
            TipoNotificacion.SANCION_APLICADA: self.sanciones_email,
            TipoNotificacion.INVITACION_RECIBIDA: self.invitaciones_email,
            TipoNotificacion.INVITACION_VENCIDA: self.invitaciones_email,
            TipoNotificacion.LIBRO_DISPONIBLE: self.sistema_email,
            TipoNotificacion.SISTEMA: self.sistema_email,
            TipoNotificacion.BIENVENIDA: self.sistema_email,
        }
        return mapping.get(tipo_notificacion, True)
    
    def debe_enviar_push(self, tipo_notificacion):
        """Determina si debe enviar push para un tipo de notificación"""
        mapping = {
            TipoNotificacion.PRESTAMO_VENCIDO: self.prestamos_push,
            TipoNotificacion.PRESTAMO_PROXIMO_VENCER: self.prestamos_push,
            TipoNotificacion.RECORDATORIO_DEVOLUCION: self.prestamos_push,
            TipoNotificacion.MULTA_APLICADA: self.multas_push,
            TipoNotificacion.SANCION_APLICADA: self.sanciones_push,
            TipoNotificacion.INVITACION_RECIBIDA: self.invitaciones_push,
            TipoNotificacion.INVITACION_VENCIDA: self.invitaciones_push,
            TipoNotificacion.LIBRO_DISPONIBLE: self.sistema_push,
            TipoNotificacion.SISTEMA: self.sistema_push,
            TipoNotificacion.BIENVENIDA: self.sistema_push,
        }
        return mapping.get(tipo_notificacion, False)