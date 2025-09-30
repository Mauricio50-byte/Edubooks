# libros/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import date, timedelta
from django.utils import timezone
from edubooks.supabase_adapter import SupabaseModelMixin

User = get_user_model()

class Libro(models.Model, SupabaseModelMixin):
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
        indexes = [
            # Índices para búsquedas frecuentes
            models.Index(fields=['titulo'], name='idx_libro_titulo'),
            models.Index(fields=['autor'], name='idx_libro_autor'),
            models.Index(fields=['isbn'], name='idx_libro_isbn'),
            models.Index(fields=['categoria'], name='idx_libro_categoria'),
            models.Index(fields=['editorial'], name='idx_libro_editorial'),
            
            # Índices para filtros comunes
            models.Index(fields=['estado'], name='idx_libro_estado'),
            models.Index(fields=['ubicacion'], name='idx_libro_ubicacion'),
            models.Index(fields=['año_publicacion'], name='idx_libro_año_publicacion'),
            
            # Índices para disponibilidad y gestión de inventario
            models.Index(fields=['cantidad_disponible'], name='idx_libro_cantidad_disponible'),
            models.Index(fields=['cantidad_total'], name='idx_libro_cantidad_total'),
            
            # Índices para fechas (útiles para reportes y filtros temporales)
            models.Index(fields=['fecha_registro'], name='idx_libro_fecha_registro'),
            
            # Índices compuestos para consultas complejas
            models.Index(fields=['categoria', 'estado'], name='idx_libro_categoria_estado'),
            models.Index(fields=['estado', 'cantidad_disponible'], name='idx_libro_estado_disponible'),
            models.Index(fields=['autor', 'categoria'], name='idx_libro_autor_categoria'),
            
            # Índice para búsquedas de texto (título y autor juntos)
            models.Index(fields=['titulo', 'autor'], name='idx_libro_titulo_autor'),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.autor}"
    
    def clean(self):
        """Validaciones personalizadas del modelo Libro."""
        import re
        from django.core.exceptions import ValidationError
        from django.core.validators import URLValidator
        
        errors = {}
        
        # Validación de título
        if self.titulo:
            if len(self.titulo.strip()) < 2:
                errors['titulo'] = 'El título debe tener al menos 2 caracteres.'
            if len(self.titulo) > 200:
                errors['titulo'] = 'El título no puede exceder 200 caracteres.'
        
        # Validación de autor
        if self.autor:
            if len(self.autor.strip()) < 2:
                errors['autor'] = 'El autor debe tener al menos 2 caracteres.'
            if len(self.autor) > 200:
                errors['autor'] = 'El autor no puede exceder 200 caracteres.'
            # Validar que contenga solo letras, espacios, puntos, comas y guiones
            if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.,\-]+$', self.autor):
                errors['autor'] = 'El autor solo puede contener letras, espacios, puntos, comas y guiones.'
        
        # Validación de ISBN
        if self.isbn:
            # Remover guiones y espacios para validación
            isbn_limpio = re.sub(r'[\s\-]+', '', self.isbn)
            # Validar formato ISBN-10 o ISBN-13
            if not re.match(r'^(?:97[89])?\d{9}[\dX]$', isbn_limpio):
                errors['isbn'] = 'El ISBN debe tener formato válido (10 o 13 dígitos).'
        
        # Validación de editorial
        if self.editorial and len(self.editorial.strip()) < 2:
            errors['editorial'] = 'La editorial debe tener al menos 2 caracteres.'
        
        # Validación de año de publicación
        if self.año_publicacion:
            from datetime import datetime
            año_actual = datetime.now().year
            if self.año_publicacion < 1000:
                errors['año_publicacion'] = 'El año de publicación debe ser mayor a 1000.'
            if self.año_publicacion > año_actual + 1:
                errors['año_publicacion'] = f'El año de publicación no puede ser mayor a {año_actual + 1}.'
        
        # Validación de categoría
        if self.categoria:
            if len(self.categoria.strip()) < 2:
                errors['categoria'] = 'La categoría debe tener al menos 2 caracteres.'
            if not re.match(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-]+$', self.categoria):
                errors['categoria'] = 'La categoría solo puede contener letras, espacios y guiones.'
        
        # Validación de ubicación
        if self.ubicacion:
            if len(self.ubicacion.strip()) < 2:
                errors['ubicacion'] = 'La ubicación debe tener al menos 2 caracteres.'
            # Validar formato de ubicación (ej: A1-001, B2-015)
            if not re.match(r'^[A-Z]\d+\-\d{3}$', self.ubicacion.strip()):
                errors['ubicacion'] = 'La ubicación debe tener formato válido (ej: A1-001).'
        
        # Validación de cantidades
        if self.cantidad_total < 1:
            errors['cantidad_total'] = 'La cantidad total debe ser al menos 1.'
        
        if self.cantidad_disponible < 0:
            errors['cantidad_disponible'] = 'La cantidad disponible no puede ser negativa.'
        
        if self.cantidad_disponible > self.cantidad_total:
            errors['cantidad_disponible'] = 'La cantidad disponible no puede ser mayor a la cantidad total.'
        
        # Validación de coherencia entre estado y cantidad disponible
        if self.estado == 'Disponible' and self.cantidad_disponible == 0:
            errors['estado'] = 'Un libro con cantidad disponible 0 no puede tener estado "Disponible".'
        
        if self.estado == 'Prestado' and self.cantidad_disponible == self.cantidad_total:
            errors['estado'] = 'Un libro con toda la cantidad disponible no puede tener estado "Prestado".'
        
        # Validación de imagen de portada
        if self.imagen_portada:
            try:
                validator = URLValidator()
                validator(self.imagen_portada)
            except ValidationError:
                errors['imagen_portada'] = 'La URL de la imagen de portada no es válida.'
        
        # Validación de descripción
        if self.descripcion and len(self.descripcion) > 2000:
            errors['descripcion'] = 'La descripción no puede exceder 2000 caracteres.'
        
        if errors:
            raise ValidationError(errors)
    
    def save(self, *args, **kwargs):
        # Actualizar estado basado en disponibilidad
        if self.cantidad_disponible == 0 and self.estado == 'Disponible':
            self.estado = 'Prestado'
        elif self.cantidad_disponible > 0 and self.estado == 'Prestado':
            self.estado = 'Disponible'
        super().save(*args, **kwargs)

class Prestamo(models.Model, SupabaseModelMixin):
    ESTADOS_CHOICES = [
        ('Pendiente', 'Pendiente'),
        ('Activo', 'Activo'),
        ('Devuelto', 'Devuelto'),
        ('Vencido', 'Vencido'),
        ('Rechazado', 'Rechazado'),
    ]
    
    libro = models.ForeignKey(Libro, on_delete=models.CASCADE, related_name='prestamos')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='prestamos')
    fecha_prestamo = models.DateTimeField(auto_now_add=True)
    fecha_devolucion_esperada = models.DateField(null=True, blank=True)
    fecha_devolucion_real = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=10, choices=ESTADOS_CHOICES, default='Pendiente')
    observaciones = models.TextField(null=True, blank=True)
    renovaciones = models.PositiveIntegerField(default=0)
    
    # Campos para sistema de aprobación
    aprobado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='prestamos_aprobados')
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    motivo_rechazo = models.TextField(null=True, blank=True)
    notificado = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'prestamos'
        ordering = ['-fecha_prestamo']
    
    def __str__(self):
        return f"{self.libro.titulo} - {self.usuario.nombre} {self.usuario.apellido}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        from datetime import date, timedelta
        
        errors = {}
        
        # Validación de fechas
        if self.fecha_devolucion_esperada and self.fecha_devolucion_real:
            if self.fecha_devolucion_real.date() < self.fecha_prestamo.date():
                errors['fecha_devolucion_real'] = 'La fecha de devolución real no puede ser anterior a la fecha de préstamo.'
        
        if self.fecha_devolucion_esperada:
            if self.fecha_devolucion_esperada < self.fecha_prestamo.date():
                errors['fecha_devolucion_esperada'] = 'La fecha de devolución esperada no puede ser anterior a la fecha de préstamo.'
            
            # Validar que no sea más de 30 días en el futuro
            max_fecha = self.fecha_prestamo.date() + timedelta(days=30)
            if self.fecha_devolucion_esperada > max_fecha:
                errors['fecha_devolucion_esperada'] = 'El período de préstamo no puede exceder 30 días.'
        
        # Validación de estado y fechas relacionadas
        if self.estado == 'Activo':
            if not self.fecha_devolucion_esperada:
                errors['fecha_devolucion_esperada'] = 'Un préstamo activo debe tener fecha de devolución esperada.'
            if not self.aprobado_por:
                errors['aprobado_por'] = 'Un préstamo activo debe tener un usuario que lo aprobó.'
        
        if self.estado == 'Devuelto':
            if not self.fecha_devolucion_real:
                errors['fecha_devolucion_real'] = 'Un préstamo devuelto debe tener fecha de devolución real.'
        
        if self.estado == 'Rechazado':
            if not self.motivo_rechazo or len(self.motivo_rechazo.strip()) < 10:
                errors['motivo_rechazo'] = 'Un préstamo rechazado debe tener un motivo de al menos 10 caracteres.'
        
        # Validación de renovaciones
        if self.renovaciones < 0:
            errors['renovaciones'] = 'El número de renovaciones no puede ser negativo.'
        
        if self.renovaciones > 3:
            errors['renovaciones'] = 'No se pueden realizar más de 3 renovaciones por préstamo.'
        
        # Validación de observaciones
        if self.observaciones and len(self.observaciones) > 1000:
            errors['observaciones'] = 'Las observaciones no pueden exceder 1000 caracteres.'
        
        # Validación de disponibilidad del libro
        if self.estado == 'Pendiente' and self.libro:
            if self.libro.cantidad_disponible <= 0:
                errors['libro'] = 'No hay ejemplares disponibles de este libro.'
            
            if self.libro.estado == 'Mantenimiento':
                errors['libro'] = 'Este libro está en mantenimiento y no se puede prestar.'
        
        # Validación de usuario sancionado
        if self.usuario and hasattr(self.usuario, 'sancionado_hasta'):
            if self.usuario.sancionado_hasta and self.usuario.sancionado_hasta > date.today():
                if self.estado == 'Pendiente':
                    errors['usuario'] = f'El usuario está sancionado hasta {self.usuario.sancionado_hasta}.'
        
        # Validación de límite de préstamos activos
        if self.usuario and self.estado in ['Pendiente', 'Activo']:
            prestamos_activos = Prestamo.objects.filter(
                usuario=self.usuario,
                estado__in=['Pendiente', 'Activo']
            ).exclude(pk=self.pk).count()
            
            max_prestamos = getattr(self.usuario, 'max_prestamos_permitidos', 3)
            if prestamos_activos >= max_prestamos:
                errors['usuario'] = f'El usuario ya tiene {prestamos_activos} préstamos activos. Máximo permitido: {max_prestamos}.'
        
        # Validación de préstamo duplicado
        if self.estado == 'Pendiente' and self.libro and self.usuario:
            prestamo_existente = Prestamo.objects.filter(
                libro=self.libro,
                usuario=self.usuario,
                estado__in=['Pendiente', 'Activo']
            ).exclude(pk=self.pk).exists()
            
            if prestamo_existente:
                errors['libro'] = 'Ya tienes un préstamo pendiente o activo de este libro.'
        
        # Validación de aprobador
        if self.aprobado_por:
            if not hasattr(self.aprobado_por, 'rol') or self.aprobado_por.rol not in ['Administrador', 'Bibliotecario']:
                errors['aprobado_por'] = 'Solo administradores y bibliotecarios pueden aprobar préstamos.'
        
        if errors:
            raise ValidationError(errors)
    
    def save(self, *args, **kwargs):
        # Establecer fecha de devolución esperada solo cuando se aprueba
        if self.estado == 'Activo' and not self.fecha_devolucion_esperada:
            self.fecha_devolucion_esperada = date.today() + timedelta(days=15)
        
        # Establecer fecha de aprobación cuando cambia a Activo
        if self.estado == 'Activo' and not self.fecha_aprobacion:
            self.fecha_aprobacion = timezone.now()
        
        # Actualizar estado si está vencido
        if self.estado == 'Activo' and self.fecha_devolucion_esperada and date.today() > self.fecha_devolucion_esperada:
            self.estado = 'Vencido'
        
        # Verificar si es una actualización de estado para disponibilidad
        es_actualizacion = self.pk is not None
        estado_anterior = None
        if es_actualizacion:
            try:
                estado_anterior = Prestamo.objects.get(pk=self.pk).estado
            except Prestamo.DoesNotExist:
                estado_anterior = None
        
        super().save(*args, **kwargs)
        
        # Actualizar disponibilidad del libro solo cuando cambia el estado
        if es_actualizacion and estado_anterior != self.estado:
            if estado_anterior == 'Pendiente' and self.estado == 'Activo':
                # Préstamo aprobado: reducir disponibilidad
                if self.libro.cantidad_disponible > 0:
                    self.libro.cantidad_disponible -= 1
                    if self.libro.cantidad_disponible == 0:
                        self.libro.estado = 'Prestado'
                    self.libro.save()
            elif estado_anterior == 'Activo' and self.estado in ['Devuelto', 'Rechazado', 'Vencido']:
                # Préstamo devuelto/rechazado: aumentar disponibilidad
                self.libro.cantidad_disponible += 1
                if self.libro.estado == 'Prestado':
                    self.libro.estado = 'Disponible'
                self.libro.save()
        
        # Crear notificación cuando cambia el estado
        if es_actualizacion and estado_anterior != self.estado and self.estado in ['Activo', 'Rechazado'] and not self.notificado:
            mensaje = f"Tu solicitud de préstamo para '{self.libro.titulo}' ha sido "
            if self.estado == 'Activo':
                mensaje += "aprobada. Puedes recoger el libro."
            else:
                mensaje += f"rechazada. Motivo: {self.motivo_rechazo or 'No especificado'}"
            
            Notificacion.objects.create(
                usuario=self.usuario,
                titulo="Solicitud de Préstamo",
                mensaje=mensaje,
                tipo='prestamo',
                relacionado_id=self.id
            )
            self.notificado = True
            Prestamo.objects.filter(pk=self.pk).update(notificado=True)
        
        # Actualizar disponibilidad del libro
        if es_actualizacion and estado_anterior != self.estado:
            if estado_anterior == 'Pendiente' and self.estado == 'Activo':
                # Préstamo aprobado: reducir disponibilidad
                if self.libro.cantidad_disponible > 0:
                    self.libro.cantidad_disponible -= 1
                    self.libro.save()
            elif estado_anterior == 'Activo' and self.estado == 'Devuelto':
                # Libro devuelto: aumentar disponibilidad
                self.libro.cantidad_disponible += 1
                self.libro.save()
            elif estado_anterior == 'Activo' and self.estado in ['Rechazado', 'Vencido']:
                # Préstamo rechazado o vencido: aumentar disponibilidad
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
        # Establecer fecha de expiración (3 días desde la reserva)
        if not self.fecha_expiracion:
            self.fecha_expiracion = timezone.now() + timedelta(days=3)
        
        # Verificar si la reserva ha expirado
        if self.estado == 'Activa' and timezone.now() > self.fecha_expiracion:
            self.estado = 'Cancelada'
        
        super().save(*args, **kwargs)

class Bibliografia(models.Model):
    docente = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='bibliografias',
        limit_choices_to={'rol': 'Docente'}
    )
    curso = models.CharField(max_length=200)
    programa = models.CharField(max_length=100, default='General', help_text="Programa académico al que pertenece la bibliografía")
    descripcion = models.TextField(null=True, blank=True)
    libros = models.ManyToManyField(Libro, related_name='bibliografias', blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activa = models.BooleanField(default=True)
    es_publica = models.BooleanField(default=True, help_text="Si es visible para estudiantes del programa")
    
    class Meta:
        db_table = 'bibliografias'
        ordering = ['-fecha_creacion']
        unique_together = ['docente', 'curso', 'programa']
    
    def __str__(self):
        return f"{self.curso} - {self.programa} - {self.docente.nombre} {self.docente.apellido}"

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
        # Calcular fecha de fin para suspensiones
        if self.tipo == 'Suspensión' and self.dias_suspension and not self.fecha_fin:
            self.fecha_fin = self.fecha_inicio + timedelta(days=self.dias_suspension)
        super().save(*args, **kwargs)

class Notificacion(models.Model):
    TIPOS_CHOICES = [
        ('prestamo', 'Préstamo'),
        ('devolucion', 'Devolución'),
        ('sancion', 'Sanción'),
        ('general', 'General'),
    ]
    
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones_libros')
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPOS_CHOICES, default='general')
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    relacionado_id = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'notificaciones'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.titulo} - {self.usuario.nombre} {self.usuario.apellido}"
