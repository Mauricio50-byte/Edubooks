# usuarios/models/invitation_models.py
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import uuid
import logging


class InvitacionRegistro(models.Model):
    """
    Modelo para gestionar invitaciones de registro con tokens seguros.
    """
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('usado', 'Usado'),
        ('expirado', 'Expirado'),
        ('cancelado', 'Cancelado'),
    ]
    
    # Información del token
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    email_invitado = models.EmailField()
    rol_asignado = models.CharField(max_length=15, choices=[
        ('estudiante', 'Estudiante'),
        ('docente', 'Docente'),
        ('administrador', 'Administrador'),
    ])
    
    # Información del invitador
    creado_por = models.ForeignKey('Usuario', on_delete=models.CASCADE, related_name='invitaciones_creadas')
    
    # Estado y fechas
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='pendiente')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_expiracion = models.DateTimeField()
    fecha_uso = models.DateTimeField(blank=True, null=True)
    
    # Usuario registrado (cuando se usa la invitación)
    usuario_registrado = models.ForeignKey('Usuario', on_delete=models.SET_NULL, null=True, blank=True, related_name='invitacion_origen')
    
    # Información adicional
    mensaje_personalizado = models.TextField(blank=True, help_text="Mensaje opcional para el invitado")
    datos_adicionales = models.JSONField(default=dict, blank=True, help_text="Datos específicos según el rol")
    
    # Campos de auditoría
    ip_creacion = models.GenericIPAddressField(blank=True, null=True)
    ip_uso = models.GenericIPAddressField(blank=True, null=True)
    intentos_uso = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'invitaciones_registro'
        verbose_name = 'Invitación de Registro'
        verbose_name_plural = 'Invitaciones de Registro'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email_invitado']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_expiracion']),
        ]
    
    def __str__(self):
        return f"Invitación para {self.email_invitado} ({self.rol_asignado}) - {self.estado}"
    
    def clean(self):
        # Validar que solo administradores puedan crear invitaciones
        if self.creado_por and self.creado_por.rol != 'administrador':
            raise ValidationError('Solo los administradores pueden crear invitaciones')

        # Restringir invitaciones únicamente a docentes y administradores
        if self.rol_asignado not in ['docente', 'administrador']:
            raise ValidationError('Solo se pueden crear invitaciones para docentes o administradores')
        
        # Validar que la fecha de expiración sea futura
        if self.fecha_expiracion and self.fecha_expiracion <= timezone.now():
            raise ValidationError('La fecha de expiración debe ser futura')
        
        # Validar que no exista una invitación pendiente para el mismo email
        if self.pk is None:  # Solo para nuevas invitaciones
            invitacion_existente = InvitacionRegistro.objects.filter(
                email_invitado=self.email_invitado,
                estado='pendiente'
            ).exists()
            if invitacion_existente:
                raise ValidationError(f'Ya existe una invitación pendiente para {self.email_invitado}')
    
    @property
    def esta_expirada(self):
        """Verifica si la invitación ha expirado."""
        return timezone.now() > self.fecha_expiracion
    
    @property
    def es_valida(self):
        """Verifica si la invitación es válida para uso."""
        return (
            self.estado == 'pendiente' and
            not self.esta_expirada and
            self.intentos_uso < 5  # Máximo 5 intentos
        )
    
    @property
    def dias_para_expirar(self):
        """Retorna los días restantes antes de expirar."""
        if self.esta_expirada:
            return 0
        delta = self.fecha_expiracion - timezone.now()
        return max(0, delta.days)
    
    def marcar_como_usado(self, usuario_registrado, ip_address=None):
        """Marca la invitación como usada."""
        if not self.es_valida:
            raise ValidationError('La invitación no es válida para uso')
        
        self.estado = 'usado'
        self.fecha_uso = timezone.now()
        self.usuario_registrado = usuario_registrado
        if ip_address:
            self.ip_uso = ip_address
        
        self.save()
        
        logger = logging.getLogger('invitaciones')
        logger.info(f"Invitación {self.token} usada por {usuario_registrado.email}")
    
    def cancelar(self, motivo=""):
        """Cancela la invitación."""
        if self.estado != 'pendiente':
            raise ValidationError('Solo se pueden cancelar invitaciones pendientes')
        
        self.estado = 'cancelado'
        self.save()
        
        logger = logging.getLogger('invitaciones')
        logger.info(f"Invitación {self.token} cancelada. Motivo: {motivo}")
    
    def incrementar_intento(self, ip_address=None):
        """Incrementa el contador de intentos de uso."""
        self.intentos_uso += 1
        if ip_address and not self.ip_uso:
            self.ip_uso = ip_address
        
        # Si excede los intentos, marcar como expirada
        if self.intentos_uso >= 5:
            self.estado = 'expirado'
        
        self.save()
    
    def extender_expiracion(self, dias_adicionales=7):
        """Extiende la fecha de expiración."""
        if self.estado != 'pendiente':
            raise ValidationError('Solo se puede extender invitaciones pendientes')
        
        self.fecha_expiracion += timedelta(days=dias_adicionales)
        self.save()
        
        logger = logging.getLogger('invitaciones')
        logger.info(f"Invitación {self.token} extendida por {dias_adicionales} días")
    
    @classmethod
    def limpiar_expiradas(cls):
        """Método de clase para marcar invitaciones expiradas."""
        invitaciones_expiradas = cls.objects.filter(
            estado='pendiente',
            fecha_expiracion__lt=timezone.now()
        )
        
        count = invitaciones_expiradas.update(estado='expirado')
        
        logger = logging.getLogger('invitaciones')
        logger.info(f"Se marcaron {count} invitaciones como expiradas")
        
        return count
    
    def save(self, *args, **kwargs):
        # Auto-expirar si es necesario
        if self.estado == 'pendiente' and self.esta_expirada:
            self.estado = 'expirado'
        
        self.full_clean()
        super().save(*args, **kwargs)