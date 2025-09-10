# usuarios/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Usuario

class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = Usuario
        fields = [
            'email', 'username', 'nombre', 'apellido', 'rol', 
            'password', 'password_confirm', 'carrera', 'matricula',
            'departamento', 'numero_empleado', 'area'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
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
        
        elif rol == 'Docente':
            if not attrs.get('numero_empleado'):
                raise serializers.ValidationError("Los docentes deben proporcionar número de empleado")
            if not attrs.get('departamento'):
                raise serializers.ValidationError("Los docentes deben proporcionar departamento")
        
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
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Debe incluir email y contraseña')

class UsuarioPerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre', 'apellido', 'rol',
            'fecha_registro', 'carrera', 'matricula', 'departamento',
            'numero_empleado', 'area'
        ]
        read_only_fields = ['id', 'fecha_registro']

class UsuarioListSerializer(serializers.ModelSerializer):
    """Serializer para lista de usuarios en administración"""
    fecha_registro = serializers.DateField(format='%Y-%m-%d', read_only=True)
    is_active = serializers.BooleanField(source='activo', read_only=True)
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre', 'apellido', 'rol',
            'is_active', 'fecha_registro',
            'carrera', 'matricula', 'departamento', 'numero_empleado', 'area'
        ]
        read_only_fields = ['id', 'fecha_registro']