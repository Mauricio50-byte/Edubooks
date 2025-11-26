# libros/serializers.py
from rest_framework import serializers
from .models import Libro, Prestamo, Reserva, Bibliografia, Sancion, Notificacion
from usuarios.serializers import UsuarioPerfilSerializer

class LibroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Libro
        fields = '__all__'
        read_only_fields = ['fecha_registro']

class LibroDetalleSerializer(serializers.ModelSerializer):
    prestamos_activos = serializers.SerializerMethodField()
    reservas_activas = serializers.SerializerMethodField()
    
    class Meta:
        model = Libro
        fields = '__all__'
        read_only_fields = ['fecha_registro']
    
    def get_prestamos_activos(self, obj):
        return obj.prestamos.filter(estado='Activo').count()
    
    def get_reservas_activas(self, obj):
        return obj.reservas.filter(estado='Activa').count()

class PrestamoSerializer(serializers.ModelSerializer):
    libro = LibroSerializer(read_only=True)
    usuario = UsuarioPerfilSerializer(read_only=True)
    libro_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Prestamo
        fields = '__all__'
        read_only_fields = ['fecha_prestamo', 'usuario']
    
    def validate_libro_id(self, value):
        try:
            libro = Libro.objects.get(id=value)
            if libro.cantidad_disponible <= 0:
                raise serializers.ValidationError("El libro no está disponible para préstamo.")
            return value
        except Libro.DoesNotExist:
            raise serializers.ValidationError("El libro no existe.")
    
    def validate(self, data):
        libro_id = data.get('libro_id')
        usuario = self.context['request'].user
        
        # Verificar si el usuario ya tiene un préstamo activo o pendiente de este libro
        prestamo_existente = Prestamo.objects.filter(
            libro_id=libro_id,
            usuario=usuario,
            estado__in=['Activo', 'Pendiente']
        ).exists()
        
        if prestamo_existente:
            raise serializers.ValidationError("Ya tienes una solicitud de préstamo activa o pendiente de este libro.")
        
        return data
    
    def create(self, validated_data):
        libro_id = validated_data.pop('libro_id')
        libro = Libro.objects.get(id=libro_id)
        validated_data['libro'] = libro
        validated_data['usuario'] = self.context['request'].user
        return super().create(validated_data)

class ReservaSerializer(serializers.ModelSerializer):
    libro = LibroSerializer(read_only=True)
    usuario = UsuarioPerfilSerializer(read_only=True)
    libro_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Reserva
        fields = '__all__'
        read_only_fields = ['fecha_reserva', 'usuario', 'fecha_expiracion']
    
    def validate_libro_id(self, value):
        try:
            libro = Libro.objects.get(id=value)
            usuario = self.context['request'].user
            
            # Verificar si ya tiene una reserva activa para este libro
            if Reserva.objects.filter(libro=libro, usuario=usuario, estado='Activa').exists():
                raise serializers.ValidationError("Ya tienes una reserva activa para este libro.")
            
            return value
        except Libro.DoesNotExist:
            raise serializers.ValidationError("El libro no existe.")
    
    def create(self, validated_data):
        libro_id = validated_data.pop('libro_id')
        libro = Libro.objects.get(id=libro_id)
        validated_data['libro'] = libro
        validated_data['usuario'] = self.context['request'].user
        return super().create(validated_data)

class BibliografiaSerializer(serializers.ModelSerializer):
    docente = UsuarioPerfilSerializer(read_only=True)
    libros = LibroSerializer(many=True, read_only=True)
    libros_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    total_libros = serializers.SerializerMethodField()
    
    class Meta:
        model = Bibliografia
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'docente']
    
    def get_total_libros(self, obj):
        return obj.libros.count()
    
    def validate_programa(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El programa académico es requerido.")
        return value.strip()
    
    def validate_curso(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre del curso es requerido.")
        return value.strip()
    
    def validate_libros_ids(self, value):
        if value:
            existing_ids = Libro.objects.filter(id__in=value).values_list('id', flat=True)
            invalid_ids = set(value) - set(existing_ids)
            if invalid_ids:
                raise serializers.ValidationError(f"Los siguientes IDs de libros no existen: {list(invalid_ids)}")
        return value
    
    def validate(self, data):
        # Validar unicidad de curso + programa para el docente
        docente = self.context['request'].user
        curso = data.get('curso')
        programa = data.get('programa')
        
        if curso and programa:
            queryset = Bibliografia.objects.filter(
                docente=docente,
                curso=curso,
                programa=programa
            )
            
            # Si estamos actualizando, excluir la instancia actual
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            
            if queryset.exists():
                raise serializers.ValidationError(
                    f"Ya existe una bibliografía para el curso '{curso}' en el programa '{programa}'."
                )
        
        return data
    
    def create(self, validated_data):
        libros_ids = validated_data.pop('libros_ids', [])
        validated_data['docente'] = self.context['request'].user
        bibliografia = super().create(validated_data)
        
        if libros_ids:
            libros = Libro.objects.filter(id__in=libros_ids)
            bibliografia.libros.set(libros)
        
        return bibliografia
    
    def update(self, instance, validated_data):
        libros_ids = validated_data.pop('libros_ids', None)
        bibliografia = super().update(instance, validated_data)
        
        if libros_ids is not None:
            libros = Libro.objects.filter(id__in=libros_ids)
            bibliografia.libros.set(libros)
        
        return bibliografia

class SancionSerializer(serializers.ModelSerializer):
    usuario = UsuarioPerfilSerializer(read_only=True)
    prestamo = PrestamoSerializer(read_only=True)
    usuario_id = serializers.IntegerField(write_only=True, required=False)
    prestamo_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Sancion
        fields = '__all__'
        read_only_fields = ['fecha_inicio']
    
    def validate(self, data):
        if data['tipo'] == 'Multa' and not data.get('monto'):
            raise serializers.ValidationError("Las multas deben tener un monto especificado.")
        
        if data['tipo'] == 'Suspensión' and not data.get('dias_suspension'):
            raise serializers.ValidationError("Las suspensiones deben tener días especificados.")
        
        return data
    
    def create(self, validated_data):
        usuario_id = validated_data.pop('usuario_id', None)
        prestamo_id = validated_data.pop('prestamo_id', None)
        
        if usuario_id:
            from usuarios.models import Usuario
            validated_data['usuario'] = Usuario.objects.get(id=usuario_id)
        
        if prestamo_id:
            validated_data['prestamo'] = Prestamo.objects.get(id=prestamo_id)
            if not validated_data.get('usuario'):
                validated_data['usuario'] = validated_data['prestamo'].usuario
        
        return super().create(validated_data)

# Serializers para respuestas paginadas
class LibroListSerializer(serializers.ModelSerializer):
    usuario_tiene_prestamo = serializers.SerializerMethodField()
    prestamo_estado_usuario = serializers.SerializerMethodField()
    
    class Meta:
        model = Libro
        fields = ['id', 'titulo', 'autor', 'categoria', 'estado', 'cantidad_disponible', 'imagen_portada', 'usuario_tiene_prestamo', 'prestamo_estado_usuario']
    
    def get_usuario_tiene_prestamo(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Prestamo.objects.filter(
                libro=obj,
                usuario=request.user,
                estado__in=['Activo', 'Pendiente']
            ).exists()
        return False

    def get_prestamo_estado_usuario(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            prestamo = Prestamo.objects.filter(
                libro=obj,
                usuario=request.user,
                estado__in=['Activo', 'Pendiente']
            ).order_by('-fecha_prestamo').first()
            return prestamo.estado if prestamo else None
        return None

class PrestamoListSerializer(serializers.ModelSerializer):
    libro = LibroListSerializer(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_apellido = serializers.CharField(source='usuario.apellido', read_only=True)
    fecha_devolucion_esperada_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Prestamo
        fields = ['id', 'libro', 'usuario_nombre', 'usuario_apellido', 'fecha_prestamo', 'fecha_devolucion_esperada', 'fecha_devolucion_esperada_formatted', 'estado', 'observaciones', 'renovaciones']
    
    def get_fecha_devolucion_esperada_formatted(self, obj):
        if obj.fecha_devolucion_esperada:
            return obj.fecha_devolucion_esperada.strftime('%Y-%m-%d')
        elif obj.estado == 'Pendiente':
            return 'Pendiente de aprobación'
        else:
            return 'No establecida'

class ReservaListSerializer(serializers.ModelSerializer):
    libro = LibroListSerializer(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_apellido = serializers.CharField(source='usuario.apellido', read_only=True)
    
    class Meta:
        model = Reserva
        fields = ['id', 'libro', 'usuario_nombre', 'usuario_apellido', 'fecha_reserva', 'estado', 'fecha_expiracion']

class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'usuario']
