from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from ..models import InvitacionRegistro, Usuario, Estudiante, Docente, Administrador


class InvitacionCrearSerializer(serializers.ModelSerializer):
    """
    Serializer para crear nuevas invitaciones.
    """
    dias_expiracion = serializers.IntegerField(default=7, min_value=1, max_value=30)
    
    class Meta:
        model = InvitacionRegistro
        fields = [
            'email_invitado', 'rol_asignado', 'mensaje_personalizado', 
            'datos_adicionales', 'dias_expiracion'
        ]
    
    def validate_email_invitado(self, value):
        """Validar que el email no esté ya registrado."""
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return value
    
    def validate_rol_asignado(self, value):
        """Validar que el rol sea válido y permitido para invitaciones."""
        roles_permitidos = ['docente', 'administrador']
        if value not in roles_permitidos:
            raise serializers.ValidationError(
                "Solo se permiten invitaciones para docentes o administradores."
            )
        return value
    
    def validate_datos_adicionales(self, value):
        """Validar datos adicionales según el rol."""
        rol = self.initial_data.get('rol_asignado')
        
        if rol == 'estudiante':
            required_fields = ['carrera', 'semestre_actual']
            for field in required_fields:
                if field not in value:
                    raise serializers.ValidationError(f"Campo '{field}' requerido para estudiantes.")
        
        elif rol == 'docente':
            required_fields = ['departamento', 'especialidad']
            for field in required_fields:
                if field not in value:
                    raise serializers.ValidationError(f"Campo '{field}' requerido para docentes.")
        
        elif rol == 'administrador':
            required_fields = ['area', 'cargo']
            for field in required_fields:
                if field not in value:
                    raise serializers.ValidationError(f"Campo '{field}' requerido para administradores.")
        
        return value
    
    def create(self, validated_data):
        """Crear la invitación con fecha de expiración calculada."""
        dias_expiracion = validated_data.pop('dias_expiracion', 7)
        validated_data['fecha_expiracion'] = timezone.now() + timedelta(days=dias_expiracion)
        validated_data['creado_por'] = self.context['request'].user
        
        return super().create(validated_data)


class InvitacionListaSerializer(serializers.ModelSerializer):
    """
    Serializer para listar invitaciones existentes.
    """
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    usuario_registrado_nombre = serializers.CharField(source='usuario_registrado.nombre_completo', read_only=True)
    dias_para_expirar = serializers.ReadOnlyField()
    es_valida = serializers.ReadOnlyField()
    
    class Meta:
        model = InvitacionRegistro
        fields = [
            'id', 'token', 'email_invitado', 'rol_asignado', 'estado',
            'fecha_creacion', 'fecha_expiracion', 'fecha_uso',
            'creado_por_nombre', 'usuario_registrado_nombre',
            'mensaje_personalizado', 'dias_para_expirar', 'es_valida',
            'intentos_uso'
        ]


class InvitacionValidarSerializer(serializers.Serializer):
    """
    Serializer para validar un token de invitación.
    """
    token = serializers.UUIDField()
    
    def validate_token(self, value):
        """Validar que el token existe y es válido."""
        try:
            invitacion = InvitacionRegistro.objects.get(token=value)
        except InvitacionRegistro.DoesNotExist:
            raise serializers.ValidationError("Token de invitación no válido.")
        
        if not invitacion.es_valida:
            if invitacion.esta_expirada:
                raise serializers.ValidationError("La invitación ha expirado.")
            elif invitacion.estado == 'usado':
                raise serializers.ValidationError("La invitación ya ha sido utilizada.")
            elif invitacion.estado == 'cancelado':
                raise serializers.ValidationError("La invitación ha sido cancelada.")
            else:
                raise serializers.ValidationError("La invitación no es válida.")
        
        return value


class RegistroConInvitacionSerializer(serializers.ModelSerializer):
    """
    Serializer para registro usando token de invitación.
    """
    token_invitacion = serializers.UUIDField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    # Campos específicos según el rol
    datos_estudiante = serializers.JSONField(required=False, allow_null=True)
    datos_docente = serializers.JSONField(required=False, allow_null=True)
    datos_administrador = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = Usuario
        fields = [
            'username', 'nombre', 'apellido', 'telefono', 'numero_identificacion',
            'genero', 'password', 'password_confirm', 'token_invitacion',
            'datos_estudiante', 'datos_docente', 'datos_administrador'
        ]
    
    def validate(self, attrs):
        """Validaciones generales."""
        # Validar contraseñas
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        
        # Validar token de invitación
        try:
            invitacion = InvitacionRegistro.objects.get(token=attrs['token_invitacion'])
        except InvitacionRegistro.DoesNotExist:
            raise serializers.ValidationError("Token de invitación no válido.")
        
        if not invitacion.es_valida:
            raise serializers.ValidationError("La invitación no es válida o ha expirado.")
        
        # Almacenar la invitación para uso posterior
        attrs['_invitacion'] = invitacion
        
        return attrs
    
    def create(self, validated_data):
        """Crear usuario con perfil específico según el rol."""
        invitacion = validated_data.pop('_invitacion')
        password = validated_data.pop('password')
        validated_data.pop('password_confirm')
        validated_data.pop('token_invitacion', None)
        
        # Extraer datos específicos del rol
        datos_estudiante = validated_data.pop('datos_estudiante', None)
        datos_docente = validated_data.pop('datos_docente', None)
        datos_administrador = validated_data.pop('datos_administrador', None)
        
        # Configurar campos del usuario base
        validated_data['email'] = invitacion.email_invitado
        validated_data['rol'] = invitacion.rol_asignado
        validated_data['is_active'] = True
        
        # Crear usuario
        usuario = Usuario.objects.create_user(
            password=password,
            **validated_data
        )
        
        # Crear perfil específico según el rol
        if invitacion.rol_asignado == 'estudiante' and datos_estudiante:
            self._crear_perfil_estudiante(usuario, datos_estudiante, invitacion.datos_adicionales)
        elif invitacion.rol_asignado == 'docente' and datos_docente:
            self._crear_perfil_docente(usuario, datos_docente, invitacion.datos_adicionales)
        elif invitacion.rol_asignado == 'administrador' and datos_administrador:
            self._crear_perfil_administrador(usuario, datos_administrador, invitacion.datos_adicionales)
        
        # Marcar invitación como usada
        request = self.context.get('request')
        ip_address = None
        if request:
            ip_address = request.META.get('REMOTE_ADDR')
        
        invitacion.marcar_como_usado(usuario, ip_address)
        
        return usuario
    
    def _crear_perfil_estudiante(self, usuario, datos_usuario, datos_invitacion):
        """Crear perfil de estudiante."""
        datos_completos = {**datos_invitacion, **datos_usuario}
        
        Estudiante.objects.create(
            usuario=usuario,
            carrera=datos_completos.get('carrera'),
            matricula=datos_completos.get('matricula', f"EST{usuario.id:06d}"),
            semestre_actual=datos_completos.get('semestre_actual', 1),
            fecha_ingreso=datos_completos.get('fecha_ingreso', timezone.now().date()),
            fecha_graduacion_esperada=datos_completos.get('fecha_graduacion_esperada'),
            promedio_acumulado=datos_completos.get('promedio_acumulado'),
            creditos_completados=datos_completos.get('creditos_completados', 0),
            creditos_requeridos=datos_completos.get('creditos_requeridos', 240),
            turno=datos_completos.get('turno', 'matutino')
        )
    
    def _crear_perfil_docente(self, usuario, datos_usuario, datos_invitacion):
        """Crear perfil de docente."""
        datos_completos = {**datos_invitacion, **datos_usuario}
        
        Docente.objects.create(
            usuario=usuario,
            numero_empleado=datos_completos.get('numero_empleado', f"DOC{usuario.id:06d}"),
            departamento=datos_completos.get('departamento'),
            especialidad=datos_completos.get('especialidad'),
            grado_academico=datos_completos.get('grado_academico', 'licenciatura'),
            fecha_contratacion=datos_completos.get('fecha_contratacion', timezone.now().date()),
            tipo_contrato=datos_completos.get('tipo_contrato', 'tiempo_completo'),
            materias_impartidas=datos_completos.get('materias_impartidas', ''),
            investigaciones_activas=datos_completos.get('investigaciones_activas', ''),
            publicaciones=datos_completos.get('publicaciones', ''),
            activo_docencia=True
        )
    
    def _crear_perfil_administrador(self, usuario, datos_usuario, datos_invitacion):
        """Crear perfil de administrador."""
        datos_completos = {**datos_invitacion, **datos_usuario}
        
        Administrador.objects.create(
            usuario=usuario,
            area=datos_completos.get('area'),
            cargo=datos_completos.get('cargo'),
            nivel_acceso=datos_completos.get('nivel_acceso', 1),
            fecha_nombramiento=datos_completos.get('fecha_nombramiento', timezone.now().date()),
            puede_crear_usuarios=datos_completos.get('puede_crear_usuarios', False),
            puede_modificar_usuarios=datos_completos.get('puede_modificar_usuarios', False),
            puede_eliminar_usuarios=datos_completos.get('puede_eliminar_usuarios', False),
            puede_gestionar_libros=datos_completos.get('puede_gestionar_libros', True),
            puede_gestionar_prestamos=datos_completos.get('puede_gestionar_prestamos', True),
            puede_aplicar_sanciones=datos_completos.get('puede_aplicar_sanciones', False),
            puede_generar_reportes=datos_completos.get('puede_generar_reportes', True),
            puede_configurar_sistema=datos_completos.get('puede_configurar_sistema', False)
        )


class InvitacionDetalleSerializer(serializers.ModelSerializer):
    """
    Serializer para mostrar detalles completos de una invitación.
    """
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    usuario_registrado_nombre = serializers.CharField(source='usuario_registrado.nombre_completo', read_only=True)
    dias_para_expirar = serializers.ReadOnlyField()
    es_valida = serializers.ReadOnlyField()
    esta_expirada = serializers.ReadOnlyField()
    
    class Meta:
        model = InvitacionRegistro
        fields = '__all__'