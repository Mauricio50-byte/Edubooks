# usuarios/models/user_models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import uuid
import logging

# Importar modelos de notificaciones y auditoría
from .notification_models import *
from .audit_models import *

class UsuarioManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('El usuario debe tener un email')
        if not username:
            raise ValueError('El usuario debe tener un username')
        
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('rol', 'administrador')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True.')
        
        return self.create_user(email, username, password, **extra_fields)

class Usuario(AbstractBaseUser, PermissionsMixin):
    """
    Modelo base de Usuario normalizado.
    Contiene solo los campos comunes a todos los roles.
    """
    ROLES_CHOICES = [
        ('estudiante', 'Estudiante'),
        ('docente', 'Docente'),
        ('administrador', 'Administrador'),
    ]
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('suspendido', 'Suspendido'),
        ('graduado', 'Graduado'),
        ('retirado', 'Retirado'),
    ]
    
    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
        ('N', 'Prefiero no decir'),
    ]
    
    # Campos básicos de identificación
    email = models.EmailField(unique=True, max_length=150)
    username = models.CharField(unique=True, max_length=50)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    rol = models.CharField(max_length=15, choices=ROLES_CHOICES)
    
    
    # Campos de contacto y datos personales
    telefono = models.CharField(max_length=20, blank=True, null=True)
    numero_identificacion = models.CharField(max_length=20, unique=True, blank=True, null=True)
    genero = models.CharField(max_length=1, choices=GENERO_CHOICES, blank=True, null=True)
    
    # Campos de estado y control
    fecha_registro = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='activo')
    activo = models.BooleanField(default=True)
    
    # Campos para control de préstamos y sanciones
    prestamos_activos = models.PositiveIntegerField(default=0)
    max_prestamos_permitidos = models.PositiveIntegerField(default=3)
    multas_pendientes = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    fecha_ultima_sancion = models.DateTimeField(blank=True, null=True)
    sancionado_hasta = models.DateTimeField(blank=True, null=True)
    
    # Campos para notificaciones y preferencias
    notificaciones_email = models.BooleanField(default=True)
    notificaciones_push = models.BooleanField(default=True)
    
    # Campos de auditoría
    fecha_ultima_actualizacion = models.DateTimeField(auto_now=True)
    actualizado_por = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios_actualizados')
    
    # Campos requeridos por Django
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    objects = UsuarioManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nombre', 'apellido', 'rol']
    
    class Meta:
        db_table = 'usuarios'
        indexes = [
            # Índices para búsquedas frecuentes
            models.Index(fields=['email'], name='idx_usuario_email'),
            models.Index(fields=['username'], name='idx_usuario_username'),
            models.Index(fields=['rol'], name='idx_usuario_rol'),
            models.Index(fields=['estado'], name='idx_usuario_estado'),
            models.Index(fields=['numero_identificacion'], name='idx_usuario_identificacion'),
            
            # Índices para filtros comunes
            models.Index(fields=['activo'], name='idx_usuario_activo'),
            models.Index(fields=['is_active'], name='idx_usuario_is_active'),
            models.Index(fields=['is_staff'], name='idx_usuario_is_staff'),
            models.Index(fields=['is_superuser'], name='idx_usuario_is_superuser'),
            
            # Índices para fechas (útiles para reportes y filtros temporales)
            models.Index(fields=['fecha_registro'], name='idx_usuario_fecha_registro'),
            models.Index(fields=['date_joined'], name='idx_usuario_date_joined'),
            models.Index(fields=['sancionado_hasta'], name='idx_usuario_sancionado_hasta'),
            
            # Índices compuestos para consultas complejas
            models.Index(fields=['rol', 'estado'], name='idx_usuario_rol_estado'),
            models.Index(fields=['activo', 'estado'], name='idx_usuario_activo_estado'),
            models.Index(fields=['prestamos_activos', 'max_prestamos_permitidos'], name='idx_usuario_prestamos'),
            
            
        ]
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        
    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.email})"
    
    def clean(self):
        """Validaciones personalizadas del modelo Usuario."""
        import re
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        
        errors = {}
        
        # Validación de email
        if self.email:
            try:
                validate_email(self.email)
                # Validar formato de email institucional (opcional)
                if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', self.email):
                    errors['email'] = 'El formato del email no es válido.'
            except ValidationError:
                errors['email'] = 'El email no tiene un formato válido.'
        
        # Validación de username
        if self.username:
            if len(self.username) < 3:
                errors['username'] = 'El nombre de usuario debe tener al menos 3 caracteres.'
            # Permitir cualquier carácter excepto caracteres de control
            if any(ord(char) < 32 for char in self.username):
                errors['username'] = 'El nombre de usuario no puede contener caracteres de control.'
        
        # Validación de nombres
        if self.nombre:
            if len(self.nombre.strip()) < 2:
                errors['nombre'] = 'El nombre debe tener al menos 2 caracteres.'
            if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$', self.nombre):
                errors['nombre'] = 'El nombre solo puede contener letras y espacios.'
        
        if self.apellido:
            if len(self.apellido.strip()) < 2:
                errors['apellido'] = 'El apellido debe tener al menos 2 caracteres.'
            if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$', self.apellido):
                errors['apellido'] = 'El apellido solo puede contener letras y espacios.'
        
        # Validación de teléfono
        if self.telefono:
            # Remover espacios y caracteres especiales para validación
            telefono_limpio = re.sub(r'[\s\-\(\)]+', '', self.telefono)
            if not re.match(r'^\+?[0-9]{7,15}$', telefono_limpio):
                errors['telefono'] = 'El teléfono debe tener entre 7 y 15 dígitos.'
        
        # Validación de número de identificación
        if self.numero_identificacion:
            if len(self.numero_identificacion) < 5:
                errors['numero_identificacion'] = 'El número de identificación debe tener al menos 5 caracteres.'
            if not re.match(r'^[a-zA-Z0-9\-]+$', self.numero_identificacion):
                errors['numero_identificacion'] = 'El número de identificación solo puede contener letras, números y guiones.'
        
        # Validaciones de préstamos y multas
        if self.multas_pendientes and self.multas_pendientes < 0:
            self.multas_pendientes = 0
        
        if self.prestamos_activos < 0:
            self.prestamos_activos = 0
        
        if self.max_prestamos_permitidos < 1:
            errors['max_prestamos_permitidos'] = 'El máximo de préstamos permitidos debe ser al menos 1.'
        
        if self.prestamos_activos > self.max_prestamos_permitidos:
            errors['prestamos_activos'] = f'Los préstamos activos ({self.prestamos_activos}) no pueden exceder el máximo permitido ({self.max_prestamos_permitidos}).'
        
        # Validación de fechas de sanción
        if self.sancionado_hasta and self.fecha_ultima_sancion:
            if self.sancionado_hasta <= self.fecha_ultima_sancion:
                errors['sancionado_hasta'] = 'La fecha de fin de sanción debe ser posterior a la fecha de la última sanción.'
        
        # Validación de coherencia de estado
        if self.estado == 'activo' and not self.activo:
            errors['estado'] = 'Un usuario con estado "activo" debe tener el campo "activo" marcado como True.'
        
        if self.estado in ['suspendido', 'inactivo'] and self.activo:
            errors['activo'] = f'Un usuario con estado "{self.estado}" no puede tener el campo "activo" marcado como True.'
        
        # Validación de rol y perfiles
        if self.rol == 'estudiante' and hasattr(self, 'perfil_docente'):
            errors['rol'] = 'Un usuario con rol "estudiante" no puede tener perfil de docente.'
        
        if self.rol == 'docente' and hasattr(self, 'perfil_estudiante'):
            errors['rol'] = 'Un usuario con rol "docente" no puede tener perfil de estudiante.'
        
        # Validación de superusuario
        if self.is_superuser and self.rol != 'administrador':
            errors['rol'] = 'Solo los usuarios con rol "administrador" pueden ser superusuarios.'
        
        if errors:
            raise ValidationError(errors)
    
    @property
    def nombre_completo(self):
        """Retorna el nombre completo del usuario."""
        return f"{self.nombre} {self.apellido}".strip()
    
    @property
    def puede_prestar(self):
        """Verifica si el usuario puede realizar préstamos."""
        if not self.activo or self.estado != 'activo':
            return False
        
        if self.sancionado_hasta and self.sancionado_hasta > timezone.now():
            return False
        
        if self.multas_pendientes > 0:
            return False
        
        if self.prestamos_activos >= self.max_prestamos_permitidos:
            return False
        
        return True
    
    @property
    def dias_sancion_restantes(self):
        """Retorna los días restantes de sanción."""
        if not self.sancionado_hasta:
            return 0
        
        delta = self.sancionado_hasta - timezone.now()
        return max(0, delta.days)
    
    def aplicar_sancion(self, dias, motivo="", usuario_aplicador=None):
        """Aplica una sanción al usuario."""
        self.fecha_ultima_sancion = timezone.now()
        self.sancionado_hasta = timezone.now() + timedelta(days=dias)
        self.estado = 'suspendido'
        
        if usuario_aplicador:
            self.actualizado_por = usuario_aplicador
        
        self.save()
        
        logger = logging.getLogger('usuarios')
        logger.info(f"Sanción aplicada a {self.email}: {dias} días. Motivo: {motivo}")
    
    def quitar_sancion(self, usuario_aplicador=None):
        """Quita la sanción del usuario."""
        self.sancionado_hasta = None
        self.estado = 'activo'
        
        if usuario_aplicador:
            self.actualizado_por = usuario_aplicador
        
        self.save()
        
        logger = logging.getLogger('usuarios')
        logger.info(f"Sanción removida de {self.email}")
    
    def agregar_multa(self, cantidad, concepto="", usuario_aplicador=None):
        """Agrega una multa al usuario."""
        self.multas_pendientes += cantidad
        
        if usuario_aplicador:
            self.actualizado_por = usuario_aplicador
        
        self.save()
        
        logger = logging.getLogger('usuarios')
        logger.info(f"Multa agregada a {self.email}: ${cantidad}. Concepto: {concepto}")
    
    def pagar_multa(self, cantidad, usuario_aplicador=None):
        """Registra el pago de una multa."""
        if cantidad > self.multas_pendientes:
            cantidad = self.multas_pendientes
        
        self.multas_pendientes -= cantidad
        
        if usuario_aplicador:
            self.actualizado_por = usuario_aplicador
        
        self.save()
        
        logger = logging.getLogger('usuarios')
        logger.info(f"Pago de multa registrado para {self.email}: ${cantidad}")
        
        return cantidad
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Estudiante(models.Model):
    """
    Modelo especializado para información específica de estudiantes.
    """
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_estudiante')
    
    # Información académica
    carrera = models.CharField(max_length=100)
    matricula = models.CharField(max_length=20, unique=True)
    semestre_actual = models.PositiveIntegerField()
    fecha_ingreso = models.DateField()
    fecha_graduacion_esperada = models.DateField(blank=True, null=True)
    
    # Estado académico
    promedio_acumulado = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True)
    creditos_completados = models.PositiveIntegerField(default=0)
    creditos_requeridos = models.PositiveIntegerField(default=0)
    
    # Información adicional
    turno = models.CharField(max_length=20, choices=[
        ('matutino', 'Matutino'),
        ('vespertino', 'Vespertino'),
        ('nocturno', 'Nocturno'),
        ('mixto', 'Mixto'),
    ], default='matutino')
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'estudiantes'
        verbose_name = 'Estudiante'
        verbose_name_plural = 'Estudiantes'
    
    def __str__(self):
        return f"{self.usuario.nombre_completo} - {self.matricula}"
    
    def clean(self):
        if self.usuario.rol != 'estudiante':
            raise ValidationError('El usuario debe tener rol de estudiante')
        
        if self.semestre_actual < 1:
            raise ValidationError('El semestre actual debe ser mayor a 0')
        
        if self.promedio_acumulado and (self.promedio_acumulado < 0 or self.promedio_acumulado > 10):
            raise ValidationError('El promedio debe estar entre 0 y 10')
    
    @property
    def porcentaje_avance(self):
        """Calcula el porcentaje de avance en la carrera."""
        if self.creditos_requeridos == 0:
            return 0
        return min(100, (self.creditos_completados / self.creditos_requeridos) * 100)
    
    @property
    def puede_graduarse(self):
        """Verifica si el estudiante puede graduarse."""
        return self.creditos_completados >= self.creditos_requeridos


class Docente(models.Model):
    """
    Modelo especializado para información específica de docentes.
    """
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_docente')
    
    # Información laboral
    numero_empleado = models.CharField(max_length=20, unique=True)
    departamento = models.CharField(max_length=100)
    especialidad = models.CharField(max_length=150)
    grado_academico = models.CharField(max_length=100, choices=[
        ('licenciatura', 'Licenciatura'),
        ('maestria', 'Maestría'),
        ('doctorado', 'Doctorado'),
        ('posdoctorado', 'Posdoctorado'),
    ])
    
    # Información contractual
    tipo_contrato = models.CharField(max_length=30, choices=[
        ('tiempo_completo', 'Tiempo Completo'),
        ('medio_tiempo', 'Medio Tiempo'),
        ('por_horas', 'Por Horas'),
        ('temporal', 'Temporal'),
    ], default='tiempo_completo')
    
    # Información académica
    materias_impartidas = models.TextField(blank=True, help_text="Lista de materias separadas por comas")
    investigaciones_activas = models.TextField(blank=True, help_text="Investigaciones en curso")
    publicaciones = models.TextField(blank=True, help_text="Lista de publicaciones relevantes")
    
    # Estado laboral
    activo_docencia = models.BooleanField(default=True)
    fecha_ultima_evaluacion = models.DateField(blank=True, null=True)
    calificacion_evaluacion = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'docentes'
        verbose_name = 'Docente'
        verbose_name_plural = 'Docentes'
    
    def __str__(self):
        return f"Dr./Prof. {self.usuario.nombre_completo} - {self.numero_empleado}"
    
    def clean(self):
        if self.usuario.rol != 'docente':
            raise ValidationError('El usuario debe tener rol de docente')
        
        if self.calificacion_evaluacion and (self.calificacion_evaluacion < 0 or self.calificacion_evaluacion > 10):
            raise ValidationError('La calificación de evaluación debe estar entre 0 y 10')
    
    @property
    def años_servicio(self):
        """Calcula los años de servicio del docente."""
        from datetime import date
        return (date.today() - self.fecha_contratacion).days // 365
    
    @property
    def materias_lista(self):
        """Retorna las materias como lista."""
        if not self.materias_impartidas:
            return []
        return [materia.strip() for materia in self.materias_impartidas.split(',')]


class Administrador(models.Model):
    """
    Modelo especializado para información específica de administradores.
    """
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_administrador')
    
    # Información del cargo
    area = models.CharField(max_length=100, choices=[
        ('biblioteca', 'Biblioteca'),
        ('sistemas', 'Sistemas'),
        ('academica', 'Académica'),
        ('recursos_humanos', 'Recursos Humanos'),
        ('finanzas', 'Finanzas'),
        ('general', 'Administración General'),
    ])
    
    cargo = models.CharField(max_length=100)
    nivel_acceso = models.PositiveIntegerField(default=1, choices=[
        (1, 'Básico'),
        (2, 'Intermedio'),
        (3, 'Avanzado'),
        (4, 'Super Administrador'),
    ])
    
    # Permisos específicos
    puede_crear_usuarios = models.BooleanField(default=False)
    puede_modificar_usuarios = models.BooleanField(default=False)
    puede_eliminar_usuarios = models.BooleanField(default=False)
    puede_gestionar_libros = models.BooleanField(default=True)
    puede_gestionar_prestamos = models.BooleanField(default=True)
    puede_aplicar_sanciones = models.BooleanField(default=False)
    puede_generar_reportes = models.BooleanField(default=True)
    puede_configurar_sistema = models.BooleanField(default=False)
    
    # Información laboral
    fecha_nombramiento = models.DateField()
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinados')
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    ultima_actividad = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'administradores'
        verbose_name = 'Administrador'
        verbose_name_plural = 'Administradores'
    
    def __str__(self):
        return f"{self.usuario.nombre_completo} - {self.cargo} ({self.area})"
    
    def clean(self):
        if self.usuario.rol != 'administrador':
            raise ValidationError('El usuario debe tener rol de administrador')
        
        # Super administradores tienen todos los permisos
        if self.nivel_acceso == 4:
            self.puede_crear_usuarios = True
            self.puede_modificar_usuarios = True
            self.puede_eliminar_usuarios = True
            self.puede_gestionar_libros = True
            self.puede_gestionar_prestamos = True
            self.puede_aplicar_sanciones = True
            self.puede_generar_reportes = True
            self.puede_configurar_sistema = True
    
    @property
    def es_super_admin(self):
        """Verifica si es super administrador."""
        return self.nivel_acceso == 4
    
    @property
    def permisos_activos(self):
        """Retorna una lista de permisos activos."""
        permisos = []
        if self.puede_crear_usuarios:
            permisos.append('crear_usuarios')
        if self.puede_modificar_usuarios:
            permisos.append('modificar_usuarios')
        if self.puede_eliminar_usuarios:
            permisos.append('eliminar_usuarios')
        if self.puede_gestionar_libros:
            permisos.append('gestionar_libros')
        if self.puede_gestionar_prestamos:
            permisos.append('gestionar_prestamos')
        if self.puede_aplicar_sanciones:
            permisos.append('aplicar_sanciones')
        if self.puede_generar_reportes:
            permisos.append('generar_reportes')
        if self.puede_configurar_sistema:
            permisos.append('configurar_sistema')
        return permisos
