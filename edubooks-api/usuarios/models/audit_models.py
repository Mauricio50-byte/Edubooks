from django.db import models
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.conf import settings
import json

class TipoAccion(models.TextChoices):
    """Tipos de acciones auditables"""
    CREAR = 'crear', 'Crear'
    LEER = 'leer', 'Leer'
    ACTUALIZAR = 'actualizar', 'Actualizar'
    ELIMINAR = 'eliminar', 'Eliminar'
    LOGIN = 'login', 'Inicio de Sesión'
    LOGOUT = 'logout', 'Cierre de Sesión'
    CAMBIO_PASSWORD = 'cambio_password', 'Cambio de Contraseña'
    PRESTAMO = 'prestamo', 'Préstamo'
    DEVOLUCION = 'devolucion', 'Devolución'
    MULTA = 'multa', 'Multa'
    SANCION = 'sancion', 'Sanción'
    INVITACION = 'invitacion', 'Invitación'
    EXPORTACION = 'exportacion', 'Exportación'
    IMPORTACION = 'importacion', 'Importación'

class NivelRiesgo(models.TextChoices):
    """Niveles de riesgo para acciones"""
    BAJO = 'bajo', 'Bajo'
    MEDIO = 'medio', 'Medio'
    ALTO = 'alto', 'Alto'
    CRITICO = 'critico', 'Crítico'

class RegistroAuditoria(models.Model):
    """Registro completo de auditoría del sistema"""
    
    # Información del usuario
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='acciones_auditoria'
    )
    usuario_email = models.EmailField(blank=True)  # Backup si se elimina el usuario
    usuario_nombre = models.CharField(max_length=200, blank=True)
    usuario_rol = models.CharField(max_length=50, blank=True)
    
    # Información de la acción
    accion = models.CharField(max_length=50, choices=TipoAccion.choices)
    descripcion = models.TextField()
    nivel_riesgo = models.CharField(
        max_length=20,
        choices=NivelRiesgo.choices,
        default=NivelRiesgo.BAJO
    )
    
    # Objeto afectado (relación genérica)
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    objeto_afectado = GenericForeignKey('content_type', 'object_id')
    objeto_representacion = models.CharField(max_length=500, blank=True)
    
    # Datos de la acción
    datos_anteriores = models.JSONField(default=dict, blank=True)
    datos_nuevos = models.JSONField(default=dict, blank=True)
    metadatos = models.JSONField(default=dict, blank=True)
    
    # Información técnica
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    
    # Información de tiempo
    fecha_accion = models.DateTimeField(auto_now_add=True)
    duracion_ms = models.PositiveIntegerField(null=True, blank=True)  # Duración en milisegundos
    
    # Estado
    exitosa = models.BooleanField(default=True)
    mensaje_error = models.TextField(blank=True)
    
    class Meta:
        db_table = 'usuarios_registro_auditoria'
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Registros de Auditoría'
        ordering = ['-fecha_accion']
        indexes = [
            models.Index(fields=['usuario', 'fecha_accion']),
            models.Index(fields=['accion', 'fecha_accion']),
            models.Index(fields=['nivel_riesgo', 'fecha_accion']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['ip_address', 'fecha_accion']),
        ]
    
    def __str__(self):
        return f"{self.accion} - {self.usuario_nombre} - {self.fecha_accion}"
    
    def save(self, *args, **kwargs):
        # Guardar información del usuario si existe
        if self.usuario:
            self.usuario_email = self.usuario.email
            self.usuario_nombre = self.usuario.nombre_completo
            self.usuario_rol = self.usuario.rol
        
        # Guardar representación del objeto si existe
        if self.objeto_afectado:
            self.objeto_representacion = str(self.objeto_afectado)
        
        super().save(*args, **kwargs)

class SesionUsuario(models.Model):
    """Registro de sesiones de usuario para auditoría"""
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='sesiones_auditoria'
    )
    
    # Información de la sesión
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    # Geolocalización (opcional)
    pais = models.CharField(max_length=100, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    
    # Tiempos
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_ultimo_acceso = models.DateTimeField(auto_now=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    
    # Estado
    activa = models.BooleanField(default=True)
    cerrada_por_inactividad = models.BooleanField(default=False)
    cerrada_por_admin = models.BooleanField(default=False)
    
    # Estadísticas
    total_acciones = models.PositiveIntegerField(default=0)
    paginas_visitadas = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'usuarios_sesion_auditoria'
        verbose_name = 'Sesión de Usuario'
        verbose_name_plural = 'Sesiones de Usuario'
        ordering = ['-fecha_inicio']
        indexes = [
            models.Index(fields=['usuario', 'activa']),
            models.Index(fields=['fecha_inicio', 'fecha_fin']),
            models.Index(fields=['ip_address', 'fecha_inicio']),
        ]
    
    def __str__(self):
        return f"Sesión {self.usuario.nombre_completo} - {self.fecha_inicio}"
    
    def cerrar_sesion(self, por_inactividad=False, por_admin=False):
        """Cierra la sesión de usuario"""
        self.activa = False
        self.fecha_fin = timezone.now()
        self.cerrada_por_inactividad = por_inactividad
        self.cerrada_por_admin = por_admin
        self.save()
    
    @property
    def duracion(self):
        """Duración de la sesión"""
        fin = self.fecha_fin or timezone.now()
        return fin - self.fecha_inicio

class AccesoRecurso(models.Model):
    """Registro de acceso a recursos específicos"""
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='accesos_recursos'
    )
    
    # Información del recurso
    recurso_tipo = models.CharField(max_length=100)  # 'libro', 'usuario', 'reporte', etc.
    recurso_id = models.CharField(max_length=100)
    recurso_nombre = models.CharField(max_length=500)
    
    # Tipo de acceso
    tipo_acceso = models.CharField(
        max_length=50,
        choices=TipoAccion.choices,
        default=TipoAccion.LEER
    )
    
    # Información técnica
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    referer = models.URLField(blank=True)
    
    # Tiempo
    fecha_acceso = models.DateTimeField(auto_now_add=True)
    tiempo_permanencia = models.PositiveIntegerField(null=True, blank=True)  # En segundos
    
    # Estado
    acceso_autorizado = models.BooleanField(default=True)
    motivo_denegacion = models.CharField(max_length=200, blank=True)
    
    class Meta:
        db_table = 'usuarios_acceso_recurso'
        verbose_name = 'Acceso a Recurso'
        verbose_name_plural = 'Accesos a Recursos'
        ordering = ['-fecha_acceso']
        indexes = [
            models.Index(fields=['usuario', 'fecha_acceso']),
            models.Index(fields=['recurso_tipo', 'recurso_id']),
            models.Index(fields=['tipo_acceso', 'fecha_acceso']),
            models.Index(fields=['acceso_autorizado', 'fecha_acceso']),
        ]
    
    def __str__(self):
        return f"{self.usuario.nombre_completo} - {self.recurso_tipo}:{self.recurso_id}"

class ConfiguracionAuditoria(models.Model):
    """Configuración del sistema de auditoría"""
    
    # Configuración de retención
    dias_retencion_logs = models.PositiveIntegerField(default=365)
    dias_retencion_sesiones = models.PositiveIntegerField(default=90)
    dias_retencion_accesos = models.PositiveIntegerField(default=180)
    
    # Configuración de alertas
    alertas_activas = models.BooleanField(default=True)
    umbral_intentos_fallidos = models.PositiveIntegerField(default=5)
    umbral_accesos_sospechosos = models.PositiveIntegerField(default=10)
    
    # Configuración de monitoreo
    monitorear_cambios_criticos = models.BooleanField(default=True)
    monitorear_accesos_admin = models.BooleanField(default=True)
    monitorear_exportaciones = models.BooleanField(default=True)
    
    # Configuración de reportes
    generar_reportes_automaticos = models.BooleanField(default=True)
    frecuencia_reportes = models.CharField(
        max_length=20,
        choices=[
            ('diario', 'Diario'),
            ('semanal', 'Semanal'),
            ('mensual', 'Mensual'),
        ],
        default='semanal'
    )
    
    # Metadatos
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    actualizada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    class Meta:
        db_table = 'usuarios_configuracion_auditoria'
        verbose_name = 'Configuración de Auditoría'
        verbose_name_plural = 'Configuraciones de Auditoría'
    
    def __str__(self):
        return f"Config. Auditoría - Actualizada: {self.fecha_actualizacion}"
    
    @classmethod
    def get_config(cls):
        """Obtiene la configuración actual o crea una por defecto"""
        config, created = cls.objects.get_or_create(pk=1)
        return config