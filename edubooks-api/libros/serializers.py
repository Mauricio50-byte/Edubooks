# libros/serializers.py
from rest_framework import serializers
from .models import Libro, Prestamo, Reserva, Bibliografia, Sancion
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
    
    class Meta:
        model = Bibliografia
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'docente']
    
    def validate_libros_ids(self, value):
        if value:
            existing_ids = Libro.objects.filter(id__in=value).values_list('id', flat=True)
            invalid_ids = set(value) - set(existing_ids)
            if invalid_ids:
                raise serializers.ValidationError(f"Los siguientes IDs de libros no existen: {list(invalid_ids)}")
        return value
    
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
    class Meta:
        model = Libro
        fields = ['id', 'titulo', 'autor', 'categoria', 'estado', 'cantidad_disponible', 'imagen_portada']

class PrestamoListSerializer(serializers.ModelSerializer):
    libro = LibroListSerializer(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_apellido = serializers.CharField(source='usuario.apellido', read_only=True)
    
    class Meta:
        model = Prestamo
        fields = ['id', 'libro', 'usuario_nombre', 'usuario_apellido', 'fecha_prestamo', 'fecha_devolucion_esperada', 'estado']

class ReservaListSerializer(serializers.ModelSerializer):
    libro = LibroListSerializer(read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.nombre', read_only=True)
    usuario_apellido = serializers.CharField(source='usuario.apellido', read_only=True)
    
    class Meta:
        model = Reserva
        fields = ['id', 'libro', 'usuario_nombre', 'usuario_apellido', 'fecha_reserva', 'estado', 'fecha_expiracion']