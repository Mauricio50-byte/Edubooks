# usuarios/models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

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

class Usuario(AbstractBaseUser, PermissionsMixin):
    ROLES_CHOICES = [
        ('Estudiante', 'Estudiante'),
        ('Docente', 'Docente'),
        ('Administrador', 'Administrador'),
    ]
    
    # Campos básicos
    email = models.EmailField(unique=True, max_length=150)
    username = models.CharField(unique=True, max_length=50)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    rol = models.CharField(max_length=15, choices=ROLES_CHOICES)
    fecha_registro = models.DateField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    
    # Campos específicos para Estudiantes
    carrera = models.CharField(max_length=100, null=True, blank=True)
    matricula = models.CharField(max_length=20, unique=True, null=True, blank=True)
    
    # Campos específicos para Docentes
    departamento = models.CharField(max_length=100, null=True, blank=True)
    numero_empleado = models.CharField(max_length=20, unique=True, null=True, blank=True)
    
    # Campos específicos para Administradores
    area = models.CharField(max_length=100, null=True, blank=True)
    
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
        # Validaciones específicas según el rol
        if self.rol == 'Estudiante' and not self.matricula:
            from django.core.exceptions import ValidationError
            raise ValidationError('Los estudiantes deben tener matrícula')
        elif self.rol == 'Docente' and not self.numero_empleado:
            from django.core.exceptions import ValidationError
            raise ValidationError('Los docentes deben tener número de empleado')
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)