# usuarios/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from ..models import Usuario, Estudiante, Docente, Administrador
from decimal import Decimal

class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    # Campos específicos por rol
    datos_estudiante = serializers.JSONField(required=False, allow_null=True)
    datos_docente = serializers.JSONField(required=False, allow_null=True)
    datos_administrador = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = Usuario
        fields = [
            'email', 'username', 'nombre', 'apellido', 'rol', 
            'password', 'password_confirm', 'telefono', 'numero_identificacion', 'genero',
            # Preferencias
            'notificaciones_email', 'notificaciones_push', 'idioma_preferido',
            # Datos específicos por rol
            'datos_estudiante', 'datos_docente', 'datos_administrador'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def validate_numero_identificacion(self, value):
        """Validar formato del número de identificación."""
        if value:
            import re
            # Permitir números, letras y algunos caracteres especiales
            pattern = r'^[A-Za-z0-9\-]{5,20}$'
            if not re.match(pattern, value):
                raise serializers.ValidationError("Formato de número de identificación no válido")
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
        
        if rol == 'estudiante':
            datos_estudiante = attrs.get('datos_estudiante', {})
            if not datos_estudiante.get('matricula'):
                raise serializers.ValidationError("Los estudiantes deben proporcionar matrícula")
            if not datos_estudiante.get('carrera'):
                raise serializers.ValidationError("Los estudiantes deben proporcionar carrera")
            
            # Validar fechas para estudiantes
            fecha_ingreso = datos_estudiante.get('fecha_ingreso')
            fecha_graduacion = datos_estudiante.get('fecha_graduacion_esperada')
            if fecha_ingreso and fecha_graduacion:
                from datetime import datetime
                if isinstance(fecha_ingreso, str):
                    fecha_ingreso = datetime.strptime(fecha_ingreso, '%Y-%m-%d').date()
                if isinstance(fecha_graduacion, str):
                    fecha_graduacion = datetime.strptime(fecha_graduacion, '%Y-%m-%d').date()
                if fecha_graduacion <= fecha_ingreso:
                    raise serializers.ValidationError("La fecha de graduación debe ser posterior a la fecha de ingreso")
        
        elif rol == 'docente':
            datos_docente = attrs.get('datos_docente', {})
            if not datos_docente.get('numero_empleado'):
                raise serializers.ValidationError("Los docentes deben proporcionar número de empleado")
            if not datos_docente.get('departamento'):
                raise serializers.ValidationError("Los docentes deben proporcionar departamento")
            
            # Validar fecha de contratación
            fecha_contratacion = datos_docente.get('fecha_contratacion')
            if fecha_contratacion:
                from datetime import datetime
                if isinstance(fecha_contratacion, str):
                    fecha_contratacion = datetime.strptime(fecha_contratacion, '%Y-%m-%d').date()
                if fecha_contratacion > timezone.now().date():
                    raise serializers.ValidationError("La fecha de contratación no puede ser futura")
        
        elif rol == 'administrador':
            datos_administrador = attrs.get('datos_administrador', {})
            if not datos_administrador.get('area'):
                raise serializers.ValidationError("Los administradores deben proporcionar área")
        
        return attrs
    
    def create(self, validated_data):
        # Extraer datos específicos por rol
        datos_estudiante = validated_data.pop('datos_estudiante', None)
        datos_docente = validated_data.pop('datos_docente', None)
        datos_administrador = validated_data.pop('datos_administrador', None)
        
        # Remover password_confirm antes de crear el usuario
        validated_data.pop('password_confirm', None)
        
        # Crear usuario base
        usuario = Usuario.objects.create_user(**validated_data)
        
        # Crear perfil específico según el rol
        rol = usuario.rol
        
        if rol == 'estudiante':
            # Asegurar estructura y defaults requeridos por el modelo
            if datos_estudiante is None:
                datos_estudiante = {}
            if not datos_estudiante.get('semestre_actual'):
                datos_estudiante['semestre_actual'] = 1
            if not datos_estudiante.get('fecha_ingreso'):
                from django.utils import timezone
                datos_estudiante['fecha_ingreso'] = timezone.now().date()
            # Convertir fecha_graduacion_esperada si viene como string
            if 'fecha_graduacion_esperada' in datos_estudiante and isinstance(datos_estudiante['fecha_graduacion_esperada'], str):
                from datetime import datetime
                datos_estudiante['fecha_graduacion_esperada'] = datetime.strptime(datos_estudiante['fecha_graduacion_esperada'], '%Y-%m-%d').date()
            # Convertir promedio_acumulado si viene como string
            if 'promedio_acumulado' in datos_estudiante and isinstance(datos_estudiante['promedio_acumulado'], str):
                from decimal import Decimal
                try:
                    datos_estudiante['promedio_acumulado'] = Decimal(datos_estudiante['promedio_acumulado'])
                except Exception:
                    datos_estudiante['promedio_acumulado'] = None
            # Filtrar solo campos permitidos del modelo Estudiante
            campos_permitidos = {
                'carrera', 'matricula', 'semestre_actual', 'fecha_ingreso',
                'fecha_graduacion_esperada', 'promedio_acumulado',
                'creditos_completados', 'creditos_requeridos', 'turno'
            }
            datos_estudiante = {k: v for k, v in (datos_estudiante or {}).items() if k in campos_permitidos}
            Estudiante.objects.create(usuario=usuario, **datos_estudiante)
        elif rol == 'docente' and datos_docente:
            Docente.objects.create(usuario=usuario, **datos_docente)
        elif rol == 'administrador' and datos_administrador:
            # Convertir fecha_nombramiento de string a date si es necesario
            if 'fecha_nombramiento' in datos_administrador:
                fecha_nombramiento = datos_administrador['fecha_nombramiento']
                if isinstance(fecha_nombramiento, str):
                    from datetime import datetime
                    datos_administrador['fecha_nombramiento'] = datetime.strptime(fecha_nombramiento, '%Y-%m-%d').date()
            
            Administrador.objects.create(usuario=usuario, **datos_administrador)
        
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
    
    # Campos específicos por rol (serializados desde modelos relacionados)
    datos_estudiante = serializers.SerializerMethodField()
    datos_docente = serializers.SerializerMethodField()
    datos_administrador = serializers.SerializerMethodField()
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre', 'apellido', 'nombre_completo', 'rol',
            'telefono', 'numero_identificacion', 'genero',
            # Datos específicos por rol
            'datos_estudiante', 'datos_docente', 'datos_administrador',
            # Preferencias mínimas
            'idioma_preferido',
            # Campos calculados de estado
            'puede_prestar', 'dias_sancion_restantes'
        ]
        read_only_fields = [
            'id', 'nombre_completo', 'puede_prestar', 'dias_sancion_restantes'
        ]
    
    def get_datos_estudiante(self, obj):
        if obj.rol == 'estudiante' and hasattr(obj, 'estudiante'):
            return {
                'carrera': obj.estudiante.carrera,
                'matricula': obj.estudiante.matricula,
                'semestre_actual': obj.estudiante.semestre_actual,
                'fecha_ingreso': obj.estudiante.fecha_ingreso,
                'fecha_graduacion_esperada': obj.estudiante.fecha_graduacion_esperada,
            }
        return None
    
    def get_datos_docente(self, obj):
        if obj.rol == 'docente' and hasattr(obj, 'docente'):
            return {
                'departamento': obj.docente.departamento,
                'numero_empleado': obj.docente.numero_empleado,
                'especialidad': obj.docente.especialidad,
            }
        return None
    
    def get_datos_administrador(self, obj):
        if obj.rol == 'administrador' and hasattr(obj, 'administrador'):
            return {
                'area': obj.administrador.area,
                'nivel_acceso': obj.administrador.nivel_acceso,
            }
        return None

class UsuarioListSerializer(serializers.ModelSerializer):
    """Serializer para lista de usuarios en administración"""
    nombre_completo = serializers.ReadOnlyField()
    puede_prestar = serializers.ReadOnlyField()
    fecha_registro = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)
    is_active = serializers.BooleanField(source='activo', read_only=True)
    
    # Campos específicos por rol (serializados desde modelos relacionados)
    datos_rol = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre', 'apellido', 'nombre_completo', 'rol', 'genero',
            'is_active', 'fecha_registro', 'telefono', 'datos_rol', 'puede_prestar'
        ]
        read_only_fields = ['id', 'fecha_registro']
    
    def get_datos_rol(self, obj):
        """Obtiene datos específicos según el rol del usuario"""
        if obj.rol == 'estudiante' and hasattr(obj, 'estudiante'):
            return {
                'carrera': obj.estudiante.carrera,
                'matricula': obj.estudiante.matricula,
            }
        elif obj.rol == 'docente' and hasattr(obj, 'docente'):
            return {
                'departamento': obj.docente.departamento,
                'numero_empleado': obj.docente.numero_empleado,
            }
        elif obj.rol == 'administrador' and hasattr(obj, 'administrador'):
            return {
                'area': obj.administrador.area,
            }
        return None

class UsuarioAdminSerializer(serializers.ModelSerializer):
    """Serializer completo para administradores"""
    nombre_completo = serializers.ReadOnlyField()
    puede_prestar = serializers.ReadOnlyField()
    dias_sancion_restantes = serializers.ReadOnlyField()
    
    # Campos específicos por rol para actualización
    datos_estudiante = serializers.JSONField(required=False, allow_null=True)
    datos_docente = serializers.JSONField(required=False, allow_null=True)
    datos_administrador = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = Usuario
        fields = '__all__'
        read_only_fields = ['id', 'fecha_registro', 'date_joined', 'fecha_ultima_actualizacion']
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def update(self, instance, validated_data):
        # Extraer datos específicos por rol
        datos_estudiante = validated_data.pop('datos_estudiante', None)
        datos_docente = validated_data.pop('datos_docente', None)
        datos_administrador = validated_data.pop('datos_administrador', None)
        
        # Si se proporciona una nueva contraseña, encriptarla
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        # Actualizar el resto de campos del usuario base
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Actualizar perfil específico según el rol
        rol = instance.rol
        
        if rol == 'estudiante' and datos_estudiante is not None:
            estudiante, created = Estudiante.objects.get_or_create(usuario=instance)
            for attr, value in datos_estudiante.items():
                setattr(estudiante, attr, value)
            estudiante.save()
        elif rol == 'docente' and datos_docente is not None:
            docente, created = Docente.objects.get_or_create(usuario=instance)
            for attr, value in datos_docente.items():
                setattr(docente, attr, value)
            docente.save()
        elif rol == 'administrador' and datos_administrador is not None:
            administrador, created = Administrador.objects.get_or_create(usuario=instance)
            for attr, value in datos_administrador.items():
                setattr(administrador, attr, value)
            administrador.save()
        
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
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
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
    cantidad = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    
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
