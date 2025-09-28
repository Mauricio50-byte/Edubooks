# usuarios/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import Usuario

class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = Usuario
        fields = [
            'email', 'username', 'nombre', 'apellido', 'rol', 
            'password', 'password_confirm', 'telefono', 'fecha_nacimiento', 'genero', 'direccion',
            # Campos específicos por rol
            'carrera', 'matricula', 'semestre_actual', 'fecha_ingreso', 'fecha_graduacion_esperada',
            'departamento', 'numero_empleado', 'especialidad', 'grado_academico', 'fecha_contratacion',
            'area', 'nivel_acceso',
            # Preferencias
            'notificaciones_email', 'notificaciones_push', 'idioma_preferido'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'nivel_acceso': {'read_only': True},  # Solo administradores pueden modificar esto
        }
    
    def validate_fecha_nacimiento(self, value):
        """Validar que la fecha de nacimiento sea válida."""
        if value:
            from datetime import date
            today = date.today()
            age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
            if age < 16:
                raise serializers.ValidationError("Debe tener al menos 16 años")
            if age > 100:
                raise serializers.ValidationError("Fecha de nacimiento no válida")
        return value
    
    def validate_telefono(self, value):
        """Validar formato de teléfono."""
        if value:
            import re
            # Permitir números con o sin espacios, guiones, paréntesis
            pattern = r'^[\d\s\-\(\)\+]{10,20}$'
            if not re.match(pattern, value):
                raise serializers.ValidationError("Formato de teléfono no válido")
        return value
    
    def validate(self, attrs):
        # Validar que las contraseñas coincidan
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        
        # Validaciones específicas por rol
        rol = attrs.get('rol')
        
        if rol == 'Estudiante':
            if not attrs.get('matricula'):
                raise serializers.ValidationError("Los estudiantes deben proporcionar matrícula")
            if not attrs.get('carrera'):
                raise serializers.ValidationError("Los estudiantes deben proporcionar carrera")
            
            # Validar fechas para estudiantes
            fecha_ingreso = attrs.get('fecha_ingreso')
            fecha_graduacion = attrs.get('fecha_graduacion_esperada')
            if fecha_ingreso and fecha_graduacion:
                if fecha_graduacion <= fecha_ingreso:
                    raise serializers.ValidationError("La fecha de graduación debe ser posterior a la fecha de ingreso")
        
        elif rol == 'Docente':
            if not attrs.get('numero_empleado'):
                raise serializers.ValidationError("Los docentes deben proporcionar número de empleado")
            if not attrs.get('departamento'):
                raise serializers.ValidationError("Los docentes deben proporcionar departamento")
            
            # Validar fecha de contratación
            fecha_contratacion = attrs.get('fecha_contratacion')
            if fecha_contratacion and fecha_contratacion > timezone.now().date():
                raise serializers.ValidationError("La fecha de contratación no puede ser futura")
        
        elif rol == 'Administrador':
            if not attrs.get('area'):
                raise serializers.ValidationError("Los administradores deben proporcionar área")
        
        return attrs
    
    def create(self, validated_data):
        # Remover password_confirm antes de crear el usuario
        validated_data.pop('password_confirm', None)
        
        # Crear usuario
        usuario = Usuario.objects.create_user(**validated_data)
        return usuario

class UsuarioLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            
            if not user:
                raise serializers.ValidationError('Credenciales inválidas')
            
            if not user.is_active:
                raise serializers.ValidationError('Cuenta desactivada')
            
            # Verificar si el usuario está sancionado
            if user.sancionado_hasta and user.sancionado_hasta > timezone.now():
                dias_restantes = user.dias_sancion_restantes
                raise serializers.ValidationError(f'Usuario sancionado. Días restantes: {dias_restantes}')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Debe incluir email y contraseña')

class UsuarioPerfilSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    puede_prestar = serializers.ReadOnlyField()
    dias_sancion_restantes = serializers.ReadOnlyField()
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre', 'apellido', 'nombre_completo', 'rol',
            'fecha_registro', 'estado', 'telefono', 'fecha_nacimiento', 'genero', 'direccion',
            # Campos de préstamos y sanciones (solo lectura)
            'prestamos_activos', 'max_prestamos_permitidos', 'multas_pendientes', 
            'puede_prestar', 'dias_sancion_restantes', 'fecha_ultima_sancion', 'sancionado_hasta',
            # Campos específicos por rol
            'carrera', 'matricula', 'semestre_actual', 'fecha_ingreso', 'fecha_graduacion_esperada',
            'departamento', 'numero_empleado', 'especialidad', 'grado_academico', 'fecha_contratacion',
            'area', 'nivel_acceso',
            # Preferencias
            'notificaciones_email', 'notificaciones_push', 'idioma_preferido',
            # Auditoría
            'fecha_ultima_actualizacion'
        ]
        read_only_fields = [
            'id', 'fecha_registro', 'prestamos_activos', 'multas_pendientes',
            'fecha_ultima_sancion', 'sancionado_hasta', 'nivel_acceso', 'fecha_ultima_actualizacion'
        ]

class UsuarioListSerializer(serializers.ModelSerializer):
    """Serializer para lista de usuarios en administración"""
    nombre_completo = serializers.ReadOnlyField()
    puede_prestar = serializers.ReadOnlyField()
    fecha_registro = serializers.DateField(format='%Y-%m-%d', read_only=True)
    is_active = serializers.BooleanField(source='activo', read_only=True)
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre', 'apellido', 'nombre_completo', 'rol',
            'is_active', 'estado', 'fecha_registro', 'prestamos_activos', 'multas_pendientes',
            'puede_prestar', 'telefono',
            'carrera', 'matricula', 'departamento', 'numero_empleado', 'area'
        ]
        read_only_fields = ['id', 'fecha_registro']

class UsuarioAdminSerializer(serializers.ModelSerializer):
    """Serializer completo para administradores"""
    nombre_completo = serializers.ReadOnlyField()
    puede_prestar = serializers.ReadOnlyField()
    dias_sancion_restantes = serializers.ReadOnlyField()
    
    class Meta:
        model = Usuario
        fields = '__all__'
        read_only_fields = ['id', 'fecha_registro', 'date_joined', 'fecha_ultima_actualizacion']
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def update(self, instance, validated_data):
        # Si se proporciona una nueva contraseña, encriptarla
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        # Actualizar el resto de campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Establecer quién actualizó el usuario
        request = self.context.get('request')
        if request and request.user:
            instance.actualizado_por = request.user
        
        instance.save()
        return instance

class SancionSerializer(serializers.Serializer):
    """Serializer para aplicar sanciones"""
    usuario_id = serializers.IntegerField()
    dias = serializers.IntegerField(min_value=1, max_value=365)
    motivo = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_usuario_id(self, value):
        try:
            usuario = Usuario.objects.get(id=value)
            return value
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")

class MultaSerializer(serializers.Serializer):
    """Serializer para aplicar multas"""
    usuario_id = serializers.IntegerField()
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    concepto = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_usuario_id(self, value):
        try:
            usuario = Usuario.objects.get(id=value)
            return value
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")

class PagoMultaSerializer(serializers.Serializer):
    """Serializer para registrar pagos de multas"""
    usuario_id = serializers.IntegerField()
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    
    def validate_usuario_id(self, value):
        try:
            usuario = Usuario.objects.get(id=value)
            return value
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")
    
    def validate(self, attrs):
        usuario_id = attrs.get('usuario_id')
        cantidad = attrs.get('cantidad')
        
        try:
            usuario = Usuario.objects.get(id=usuario_id)
            if cantidad > usuario.multas_pendientes:
                raise serializers.ValidationError(f"La cantidad no puede ser mayor a las multas pendientes (${usuario.multas_pendientes})")
        except Usuario.DoesNotExist:
            pass  # Ya se validó en validate_usuario_id
        
        return attrs