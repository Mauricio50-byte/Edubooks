# usuarios/models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from edubooks.supabase_adapter import SupabaseModelMixin

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
        extra_fields.setdefault('rol', 'Administrador')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True.')
        
        return self.create_user(email, username, password, **extra_fields)

class Usuario(AbstractBaseUser, PermissionsMixin, SupabaseModelMixin):
    ROLES_CHOICES = [
        ('Estudiante', 'Estudiante'),
        ('Docente', 'Docente'),
        ('Administrador', 'Administrador'),
    ]
    
    ESTADO_CHOICES = [
        ('Activo', 'Activo'),
        ('Inactivo', 'Inactivo'),
        ('Suspendido', 'Suspendido'),
        ('Graduado', 'Graduado'),  # Para estudiantes
        ('Retirado', 'Retirado'),
    ]
    
    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
        ('N', 'Prefiero no decir'),
    ]
    
    # Campos básicos
    email = models.EmailField(unique=True, max_length=150)
    username = models.CharField(unique=True, max_length=50)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    rol = models.CharField(max_length=15, choices=ROLES_CHOICES)
    fecha_registro = models.DateField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    
    # Campos adicionales para lógica de negocio
    estado = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='Activo')
    telefono = models.CharField(max_length=20, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    genero = models.CharField(max_length=1, choices=GENERO_CHOICES, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    
    # Campos para control de préstamos y sanciones
    prestamos_activos = models.PositiveIntegerField(default=0)
    max_prestamos_permitidos = models.PositiveIntegerField(default=3)
    multas_pendientes = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    fecha_ultima_sancion = models.DateTimeField(blank=True, null=True)
    sancionado_hasta = models.DateTimeField(blank=True, null=True)
    
    # Campos para notificaciones y preferencias
    notificaciones_email = models.BooleanField(default=True)
    notificaciones_push = models.BooleanField(default=True)
    idioma_preferido = models.CharField(max_length=5, default='es', choices=[
        ('es', 'Español'),
        ('en', 'English'),
    ])
    
    # Campos específicos para Estudiantes
    carrera = models.CharField(max_length=100, null=True, blank=True)
    matricula = models.CharField(max_length=20, unique=True, null=True, blank=True)
    semestre_actual = models.PositiveIntegerField(null=True, blank=True)
    fecha_ingreso = models.DateField(null=True, blank=True)
    fecha_graduacion_esperada = models.DateField(null=True, blank=True)
    
    # Campos específicos para Docentes
    departamento = models.CharField(max_length=100, null=True, blank=True)
    numero_empleado = models.CharField(max_length=20, unique=True, null=True, blank=True)
    especialidad = models.CharField(max_length=150, null=True, blank=True)
    grado_academico = models.CharField(max_length=100, null=True, blank=True)
    fecha_contratacion = models.DateField(null=True, blank=True)
    
    # Campos específicos para Administradores
    area = models.CharField(max_length=100, null=True, blank=True)
    nivel_acceso = models.PositiveIntegerField(default=1, choices=[
        (1, 'Básico'),
        (2, 'Intermedio'),
        (3, 'Avanzado'),
        (4, 'Super Administrador'),
    ])
    
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
        
    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.email})"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Limpiar campos según el rol
        if self.rol == 'Estudiante':
            if not self.matricula:
                raise ValidationError('Los estudiantes deben tener matrícula')
            # Limpiar campos que no corresponden a estudiantes
            self.numero_empleado = None
            self.departamento = None
            self.especialidad = None
            self.grado_academico = None
            self.fecha_contratacion = None
            self.area = None
            self.nivel_acceso = 1
            
            # Validar límites de préstamos para estudiantes
            if self.max_prestamos_permitidos > 5:
                self.max_prestamos_permitidos = 5
                
        elif self.rol == 'Docente':
            if not self.numero_empleado:
                raise ValidationError('Los docentes deben tener número de empleado')
            # Limpiar campos que no corresponden a docentes
            self.matricula = None
            self.carrera = None
            self.semestre_actual = None
            self.fecha_ingreso = None
            self.fecha_graduacion_esperada = None
            self.area = None
            self.nivel_acceso = 1
            
            # Los docentes pueden tener más préstamos
            if self.max_prestamos_permitidos < 5:
                self.max_prestamos_permitidos = 5
                
        elif self.rol == 'Administrador':
            # Limpiar campos que no corresponden a administradores
            self.matricula = None
            self.carrera = None
            self.semestre_actual = None
            self.fecha_ingreso = None
            self.fecha_graduacion_esperada = None
            self.numero_empleado = None
            self.departamento = None
            self.especialidad = None
            self.grado_academico = None
            self.fecha_contratacion = None
            
            # Los administradores tienen acceso completo a préstamos
            if self.max_prestamos_permitidos < 10:
                self.max_prestamos_permitidos = 10
        
        # Validaciones generales
        if self.fecha_nacimiento:
            from datetime import date
            today = date.today()
            age = today.year - self.fecha_nacimiento.year - ((today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day))
            if age < 16:
                raise ValidationError('El usuario debe tener al menos 16 años')
        
        # Validar que las multas no sean negativas
        if self.multas_pendientes < 0:
            self.multas_pendientes = 0
        
        # Validar que los préstamos activos no excedan el máximo
        if self.prestamos_activos > self.max_prestamos_permitidos:
            raise ValidationError(f'Los préstamos activos ({self.prestamos_activos}) no pueden exceder el máximo permitido ({self.max_prestamos_permitidos})')
    
    @property
    def nombre_completo(self):
        """Retorna el nombre completo del usuario."""
        return f"{self.nombre} {self.apellido}".strip()
    
    @property
    def puede_prestar(self):
        """Verifica si el usuario puede realizar préstamos."""
        from django.utils import timezone
        
        # Verificar si está activo
        if not self.activo or self.estado != 'Activo':
            return False
        
        # Verificar si está sancionado
        if self.sancionado_hasta and self.sancionado_hasta > timezone.now():
            return False
        
        # Verificar si tiene multas pendientes
        if self.multas_pendientes > 0:
            return False
        
        # Verificar si no ha excedido el límite de préstamos
        if self.prestamos_activos >= self.max_prestamos_permitidos:
            return False
        
        return True
    
    @property
    def dias_sancion_restantes(self):
        """Retorna los días restantes de sanción."""
        if not self.sancionado_hasta:
            return 0
        
        from django.utils import timezone
        delta = self.sancionado_hasta - timezone.now()
        return max(0, delta.days)
    
    def aplicar_sancion(self, dias, motivo="", usuario_aplicador=None):
        """Aplica una sanción al usuario."""
        from django.utils import timezone
        from datetime import timedelta
        
        self.fecha_ultima_sancion = timezone.now()
        self.sancionado_hasta = timezone.now() + timedelta(days=dias)
        self.estado = 'Suspendido'
        
        if usuario_aplicador:
            self.actualizado_por = usuario_aplicador
        
        self.save()
        
        # Log de la sanción
        import logging
        logger = logging.getLogger('usuarios')
        logger.info(f"Sanción aplicada a {self.email}: {dias} días. Motivo: {motivo}")
    
    def quitar_sancion(self, usuario_aplicador=None):
        """Quita la sanción del usuario."""
        self.sancionado_hasta = None
        self.estado = 'Activo'
        
        if usuario_aplicador:
            self.actualizado_por = usuario_aplicador
        
        self.save()
        
        # Log de la remoción de sanción
        import logging
        logger = logging.getLogger('usuarios')
        logger.info(f"Sanción removida de {self.email}")
    
    def agregar_multa(self, cantidad, concepto="", usuario_aplicador=None):
        """Agrega una multa al usuario."""
        self.multas_pendientes += cantidad
        
        if usuario_aplicador:
            self.actualizado_por = usuario_aplicador
        
        self.save()
        
        # Log de la multa
        import logging
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
        
        # Log del pago
        import logging
        logger = logging.getLogger('usuarios')
        logger.info(f"Pago de multa registrado para {self.email}: ${cantidad}")
        
        return cantidad
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)