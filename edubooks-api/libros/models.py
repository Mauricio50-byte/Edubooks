# libros/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import date, timedelta
from django.utils import timezone

User = get_user_model()

class Libro(models.Model):
    ESTADOS_CHOICES = [
        ('Disponible', 'Disponible'),
        ('Prestado', 'Prestado'),
        ('Reservado', 'Reservado'),
        ('Mantenimiento', 'Mantenimiento'),
    ]
    
    titulo = models.CharField(max_length=200)
    autor = models.CharField(max_length=200)
    isbn = models.CharField(max_length=20, unique=True, null=True, blank=True)
    editorial = models.CharField(max_length=100, null=True, blank=True)
    año_publicacion = models.IntegerField(
        validators=[MinValueValidator(1000), MaxValueValidator(2030)],
        null=True, blank=True
    )
    categoria = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=100)
    estado = models.CharField(max_length=15, choices=ESTADOS_CHOICES, default='Disponible')
    cantidad_total = models.PositiveIntegerField(default=1)
    cantidad_disponible = models.PositiveIntegerField(default=1)
    descripcion = models.TextField(null=True, blank=True)
    imagen_portada = models.URLField(null=True, blank=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'libros'
        ordering = ['titulo']
    
    def __str__(self):
        return f"{self.titulo} - {self.autor}"
    
    def save(self, *args, **kwargs):
        # Actualizar estado basado en disponibilidad
        if self.cantidad_disponible == 0 and self.estado == 'Disponible':
            self.estado = 'Prestado'
        elif self.cantidad_disponible > 0 and self.estado == 'Prestado':
            self.estado = 'Disponible'
        super().save(*args, **kwargs)

class Prestamo(models.Model):
    ESTADOS_CHOICES = [
        ('Activo', 'Activo'),
        ('Devuelto', 'Devuelto'),
        ('Vencido', 'Vencido'),
    ]
    
    libro = models.ForeignKey(Libro, on_delete=models.CASCADE, related_name='prestamos')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prestamos')
    fecha_prestamo = models.DateTimeField(auto_now_add=True)
    fecha_devolucion_esperada = models.DateField()
    fecha_devolucion_real = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADOS_CHOICES, default='Activo')
    observaciones = models.TextField(null=True, blank=True)
    renovaciones = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'prestamos'
        ordering = ['-fecha_prestamo']
    
    def __str__(self):
        return f"{self.libro.titulo} - {self.usuario.nombre} {self.usuario.apellido}"
    
    def save(self, *args, **kwargs):
        # Establecer fecha de devolución esperada (15 días por defecto)
        if not self.fecha_devolucion_esperada:
            self.fecha_devolucion_esperada = date.today() + timedelta(days=15)
        
        # Actualizar estado si está vencido
        if self.estado == 'Activo' and date.today() > self.fecha_devolucion_esperada:
            self.estado = 'Vencido'
        
        super().save(*args, **kwargs)
        
        # Actualizar disponibilidad del libro
        if self.estado == 'Activo' and not self.pk:
            self.libro.cantidad_disponible -= 1
            self.libro.save()
        elif self.estado == 'Devuelto' and self.fecha_devolucion_real:
            self.libro.cantidad_disponible += 1
            self.libro.save()

class Reserva(models.Model):
    ESTADOS_CHOICES = [
        ('Activa', 'Activa'),
        ('Completada', 'Completada'),
        ('Cancelada', 'Cancelada'),
    ]
    
    libro = models.ForeignKey(Libro, on_delete=models.CASCADE, related_name='reservas')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservas')
    fecha_reserva = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=12, choices=ESTADOS_CHOICES, default='Activa')
    fecha_expiracion = models.DateTimeField()
    
    class Meta:
        db_table = 'reservas'
        ordering = ['-fecha_reserva']
        unique_together = ['libro', 'usuario', 'estado']
    
    def __str__(self):
        return f"Reserva: {self.libro.titulo} - {self.usuario.nombre} {self.usuario.apellido}"
    
    def save(self, *args, **kwargs):
        # Establecer fecha de expiración (3 días por defecto)
        if not self.fecha_expiracion:
            self.fecha_expiracion = timezone.now() + timedelta(days=3)
        super().save(*args, **kwargs)

class Bibliografia(models.Model):
    docente = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='bibliografias',
        limit_choices_to={'rol': 'Docente'}
    )
    curso = models.CharField(max_length=200)
    descripcion = models.TextField(null=True, blank=True)
    libros = models.ManyToManyField(Libro, related_name='bibliografias', blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activa = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'bibliografias'
        ordering = ['-fecha_creacion']
        unique_together = ['docente', 'curso']
    
    def __str__(self):
        return f"{self.curso} - {self.docente.nombre} {self.docente.apellido}"

class Sancion(models.Model):
    TIPOS_CHOICES = [
        ('Multa', 'Multa'),
        ('Suspensión', 'Suspensión'),
    ]
    
    ESTADOS_CHOICES = [
        ('Activa', 'Activa'),
        ('Pagada', 'Pagada'),
        ('Completada', 'Completada'),
    ]
    
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sanciones')
    tipo = models.CharField(max_length=12, choices=TIPOS_CHOICES)
    monto = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dias_suspension = models.PositiveIntegerField(null=True, blank=True)
    descripcion = models.TextField()
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS_CHOICES, default='Activa')
    prestamo = models.ForeignKey(
        Prestamo, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='sanciones'
    )
    
    class Meta:
        db_table = 'sanciones'
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        return f"{self.tipo} - {self.usuario.nombre} {self.usuario.apellido}"
    
    def save(self, *args, **kwargs):
        # Establecer fecha fin para suspensiones
        if self.tipo == 'Suspensión' and self.dias_suspension and not self.fecha_fin:
            self.fecha_fin = timezone.now() + timedelta(days=self.dias_suspension)
        super().save(*args, **kwargs)
