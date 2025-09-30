"""
Servicios especializados por rol para manejar la lógica de negocio específica
"""
from django.core.exceptions import ValidationError
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import logging

from ..models import Usuario, Estudiante, Docente, Administrador, InvitacionRegistro

logger = logging.getLogger(__name__)
# Usuario = get_user_model()  # Comentado para evitar circular imports


class BaseUserService:
    """Servicio base con funcionalidades comunes para todos los roles"""
    
    @staticmethod
    def crear_usuario_base(email, username, nombre, apellido, rol, **kwargs):
        """Crea un usuario base con validaciones comunes"""
        try:
            with transaction.atomic():
                usuario = Usuario.objects.create_user(
                    email=email,
                    username=username,
                    nombre=nombre,
                    apellido=apellido,
                    rol=rol,
                    **kwargs
                )
                return usuario
        except Exception as e:
            logger.error(f"Error creando usuario base: {str(e)}")
            raise ValidationError(f"Error al crear usuario: {str(e)}")
    
    @staticmethod
    def validar_datos_comunes(email, username):
        """Valida datos comunes para todos los usuarios"""
        if Usuario.objects.filter(email=email).exists():
            raise ValidationError("Ya existe un usuario con este email")
        
        if Usuario.objects.filter(username=username).exists():
            raise ValidationError("Ya existe un usuario con este nombre de usuario")


class StudentService(BaseUserService):
    """Servicio especializado para estudiantes"""
    
    @classmethod
    def crear_estudiante(cls, datos_usuario, datos_estudiante):
        """Crea un estudiante completo con sus datos específicos"""
        try:
            with transaction.atomic():
                # Validar datos comunes
                cls.validar_datos_comunes(datos_usuario['email'], datos_usuario['username'])
                
                # Validar datos específicos de estudiante
                cls.validar_datos_estudiante(datos_estudiante)
                
                # Crear usuario base
                usuario = cls.crear_usuario_base(
                    rol='estudiante',
                    **datos_usuario
                )
                
                # Crear perfil de estudiante
                estudiante = Estudiante.objects.create(
                    usuario=usuario,
                    **datos_estudiante
                )
                
                logger.info(f"Estudiante creado exitosamente: {usuario.email}")
                return estudiante
                
        except Exception as e:
            logger.error(f"Error creando estudiante: {str(e)}")
            raise ValidationError(f"Error al crear estudiante: {str(e)}")
    
    @staticmethod
    def validar_datos_estudiante(datos):
        """Valida datos específicos de estudiante"""
        required_fields = ['grado', 'seccion']
        for field in required_fields:
            if not datos.get(field):
                raise ValidationError(f"El campo {field} es requerido para estudiantes")
        
        # Validar grado
        grado = datos.get('grado')
        if grado and (grado < 1 or grado > 12):
            raise ValidationError("El grado debe estar entre 1 y 12")
    
    @staticmethod
    def actualizar_estudiante(estudiante, datos_usuario=None, datos_estudiante=None):
        """Actualiza los datos de un estudiante"""
        try:
            with transaction.atomic():
                if datos_usuario:
                    for key, value in datos_usuario.items():
                        if hasattr(estudiante.usuario, key):
                            setattr(estudiante.usuario, key, value)
                    estudiante.usuario.save()
                
                if datos_estudiante:
                    for key, value in datos_estudiante.items():
                        if hasattr(estudiante, key):
                            setattr(estudiante, key, value)
                    estudiante.save()
                
                return estudiante
        except Exception as e:
            logger.error(f"Error actualizando estudiante: {str(e)}")
            raise ValidationError(f"Error al actualizar estudiante: {str(e)}")
    
    @staticmethod
    def obtener_estadisticas_estudiante(estudiante):
        """Obtiene estadísticas específicas del estudiante"""
        return {
            'prestamos_activos': estudiante.usuario.prestamos_activos,
            'multas_pendientes': estudiante.usuario.multas_pendientes,
            'dias_sancion_restantes': estudiante.usuario.dias_sancion_restantes,
            'puede_prestar': estudiante.usuario.puede_prestar(),
            'grado': estudiante.grado,
            'seccion': estudiante.seccion,
            'fecha_registro': estudiante.usuario.fecha_registro,
        }


class TeacherService(BaseUserService):
    """Servicio especializado para docentes"""
    
    @classmethod
    def crear_docente(cls, datos_usuario, datos_docente):
        """Crea un docente completo con sus datos específicos"""
        try:
            with transaction.atomic():
                # Validar datos comunes
                cls.validar_datos_comunes(datos_usuario['email'], datos_usuario['username'])
                
                # Validar datos específicos de docente
                cls.validar_datos_docente(datos_docente)
                
                # Crear usuario base
                usuario = cls.crear_usuario_base(
                    rol='docente',
                    **datos_usuario
                )
                
                # Crear perfil de docente
                docente = Docente.objects.create(
                    usuario=usuario,
                    **datos_docente
                )
                
                logger.info(f"Docente creado exitosamente: {usuario.email}")
                return docente
                
        except Exception as e:
            logger.error(f"Error creando docente: {str(e)}")
            raise ValidationError(f"Error al crear docente: {str(e)}")
    
    @staticmethod
    def validar_datos_docente(datos):
        """Valida datos específicos de docente"""
        required_fields = ['especialidad', 'departamento']
        for field in required_fields:
            if not datos.get(field):
                raise ValidationError(f"El campo {field} es requerido para docentes")
    
    @staticmethod
    def actualizar_docente(docente, datos_usuario=None, datos_docente=None):
        """Actualiza los datos de un docente"""
        try:
            with transaction.atomic():
                if datos_usuario:
                    for key, value in datos_usuario.items():
                        if hasattr(docente.usuario, key):
                            setattr(docente.usuario, key, value)
                    docente.usuario.save()
                
                if datos_docente:
                    for key, value in datos_docente.items():
                        if hasattr(docente, key):
                            setattr(docente, key, value)
                    docente.save()
                
                return docente
        except Exception as e:
            logger.error(f"Error actualizando docente: {str(e)}")
            raise ValidationError(f"Error al actualizar docente: {str(e)}")
    
    @staticmethod
    def obtener_estadisticas_docente(docente):
        """Obtiene estadísticas específicas del docente"""
        return {
            'prestamos_activos': docente.usuario.prestamos_activos,
            'multas_pendientes': docente.usuario.multas_pendientes,
            'puede_prestar': docente.usuario.puede_prestar(),
            'especialidad': docente.especialidad,
            'departamento': docente.departamento,
            'fecha_contratacion': docente.fecha_contratacion,
            'fecha_registro': docente.usuario.fecha_registro,
        }


class AdminService(BaseUserService):
    """Servicio especializado para administradores"""
    
    @classmethod
    def crear_administrador(cls, datos_usuario, datos_admin):
        """Crea un administrador completo con sus datos específicos"""
        try:
            with transaction.atomic():
                # Validar datos comunes
                cls.validar_datos_comunes(datos_usuario['email'], datos_usuario['username'])
                
                # Validar datos específicos de administrador
                cls.validar_datos_administrador(datos_admin)
                
                # Crear usuario base
                usuario = cls.crear_usuario_base(
                    rol='administrador',
                    **datos_usuario
                )
                
                # Crear perfil de administrador
                administrador = Administrador.objects.create(
                    usuario=usuario,
                    **datos_admin
                )
                
                logger.info(f"Administrador creado exitosamente: {usuario.email}")
                return administrador
                
        except Exception as e:
            logger.error(f"Error creando administrador: {str(e)}")
            raise ValidationError(f"Error al crear administrador: {str(e)}")
    
    @staticmethod
    def validar_datos_administrador(datos):
        """Valida datos específicos de administrador"""
        required_fields = ['cargo', 'nivel_acceso']
        for field in required_fields:
            if not datos.get(field):
                raise ValidationError(f"El campo {field} es requerido para administradores")
        
        # Validar nivel de acceso
        nivel_acceso = datos.get('nivel_acceso')
        if nivel_acceso and nivel_acceso not in [1, 2, 3, 4]:
            raise ValidationError("Nivel de acceso no válido")
    
    @staticmethod
    def aplicar_sancion(usuario, dias, motivo, aplicada_por):
        """Aplica una sanción a un usuario"""
        try:
            from libros.models import Sancion
            from django.utils import timezone
            from datetime import timedelta
            
            # Verificar que el aplicador sea administrador
            if aplicada_por.rol != 'administrador':
                return {'success': False, 'error': 'Solo los administradores pueden aplicar sanciones'}
            
            # Verificar permisos específicos
            if hasattr(aplicada_por, 'perfil_administrador'):
                if not aplicada_por.perfil_administrador.puede_aplicar_sanciones:
                    return {'success': False, 'error': 'No tiene permisos para aplicar sanciones'}
            
            # Aplicar sanción al usuario
            fecha_fin = timezone.now() + timedelta(days=dias)
            usuario.sancionado_hasta = fecha_fin
            usuario.estado = 'suspendido'
            usuario.fecha_ultima_sancion = timezone.now()
            usuario.actualizado_por = aplicada_por
            usuario.save()
            
            # Crear registro de sanción
            sancion = Sancion.objects.create(
                usuario=usuario,
                tipo='Suspensión',
                descripcion=motivo,
                dias_suspension=dias,
                fecha_inicio=timezone.now().date(),
                fecha_fin=fecha_fin.date(),
                estado='Activa'
            )
            
            logger.info(f"Sanción aplicada a {usuario.email} por {aplicada_por.email}: {dias} días")
            
            return {
                'success': True,
                'message': f'Sanción aplicada exitosamente por {dias} días',
                'sancion_id': sancion.id,
                'fecha_fin': fecha_fin
            }
            
        except Exception as e:
            logger.error(f"Error aplicando sanción: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def aplicar_multa(usuario, cantidad, concepto, aplicada_por):
        """Aplica una multa a un usuario"""
        try:
            from libros.models import Sancion
            from django.utils import timezone
            
            # Verificar que el aplicador sea administrador
            if aplicada_por.rol != 'administrador':
                return {'success': False, 'error': 'Solo los administradores pueden aplicar multas'}
            
            # Verificar permisos específicos
            if hasattr(aplicada_por, 'perfil_administrador'):
                if not aplicada_por.perfil_administrador.puede_aplicar_sanciones:
                    return {'success': False, 'error': 'No tiene permisos para aplicar multas'}
            
            # Actualizar multas pendientes del usuario
            usuario.multas_pendientes += cantidad
            usuario.actualizado_por = aplicada_por
            usuario.save()
            
            # Crear registro de multa
            multa = Sancion.objects.create(
                usuario=usuario,
                tipo='Multa',
                monto=cantidad,
                descripcion=concepto,
                fecha_inicio=timezone.now(),
                estado='Activa'
            )
            
            logger.info(f"Multa aplicada a {usuario.email} por {aplicada_por.email}: ${cantidad}")
            
            return {
                'success': True,
                'message': f'Multa aplicada exitosamente por ${cantidad}',
                'multa_id': multa.id,
                'total_multas_pendientes': usuario.multas_pendientes
            }
            
        except Exception as e:
            logger.error(f"Error aplicando multa: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def registrar_pago_multa(usuario, cantidad, registrado_por):
        """Registra el pago de una multa"""
        try:
            from libros.models import Sancion
            from django.utils import timezone
            
            # Verificar que el registrador sea administrador
            if registrado_por.rol != 'administrador':
                return {'success': False, 'error': 'Solo los administradores pueden registrar pagos'}
            
            # Verificar que hay multas pendientes
            if usuario.multas_pendientes < cantidad:
                return {'success': False, 'error': 'La cantidad excede las multas pendientes'}
            
            # Buscar multas activas del usuario
            multas_activas = Sancion.objects.filter(
                usuario=usuario,
                tipo='Multa',
                estado='Activa'
            ).order_by('fecha_inicio')
            
            cantidad_restante = cantidad
            multas_pagadas = []
            
            # Pagar multas en orden de antigüedad
            for multa in multas_activas:
                if cantidad_restante <= 0:
                    break
                    
                if multa.monto <= cantidad_restante:
                    # Pagar multa completa
                    multa.estado = 'Pagada'
                    multa.fecha_fin = timezone.now()
                    multa.save()
                    cantidad_restante -= multa.monto
                    multas_pagadas.append(multa.id)
                else:
                    # Pago parcial - crear nueva multa con el saldo restante
                    saldo_restante = multa.monto - cantidad_restante
                    multa.estado = 'Pagada'
                    multa.fecha_fin = timezone.now()
                    multa.save()
                    
                    # Crear nueva multa con el saldo
                    Sancion.objects.create(
                        usuario=usuario,
                        tipo='Multa',
                        monto=saldo_restante,
                        descripcion=f"Saldo restante de multa #{multa.id}",
                        estado='Activa'
                    )
                    
                    cantidad_restante = 0
                    multas_pagadas.append(multa.id)
            
            # Actualizar multas pendientes del usuario
            usuario.multas_pendientes -= cantidad
            usuario.actualizado_por = registrado_por
            usuario.save()
            
            logger.info(f"Pago de multa registrado para {usuario.email}: ${cantidad}")
            
            return {
                'success': True,
                'message': f'Pago registrado exitosamente: ${cantidad}',
                'multas_pagadas': multas_pagadas,
                'multas_restantes': usuario.multas_pendientes
            }
            
        except Exception as e:
            logger.error(f"Error registrando pago de multa: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def actualizar_administrador(administrador, datos_usuario=None, datos_admin=None):
        """Actualiza los datos de un administrador"""
        try:
            with transaction.atomic():
                if datos_usuario:
                    for key, value in datos_usuario.items():
                        if hasattr(administrador.usuario, key):
                            setattr(administrador.usuario, key, value)
                    administrador.usuario.save()
                
                if datos_admin:
                    for key, value in datos_admin.items():
                        if hasattr(administrador, key):
                            setattr(administrador, key, value)
                    administrador.save()
                
                return administrador
        except Exception as e:
            logger.error(f"Error actualizando administrador: {str(e)}")
            raise ValidationError(f"Error al actualizar administrador: {str(e)}")
    
    @staticmethod
    def obtener_estadisticas_administrador(administrador):
        """Obtiene estadísticas específicas del administrador"""
        return {
            'cargo': administrador.cargo,
            'nivel_acceso': administrador.nivel_acceso,
            'fecha_nombramiento': administrador.fecha_nombramiento,
            'area': administrador.area,
            'fecha_registro': administrador.usuario.fecha_registro,
        }


class InvitationService:
    """Servicio para manejar el sistema de invitaciones"""
    
    @staticmethod
    def crear_invitacion(invitador, email_invitado, rol, datos_adicionales=None):
        """Crea una nueva invitación"""
        try:
            with transaction.atomic():
                # Validar que el invitador sea administrador
                if invitador.rol != 'administrador':
                    raise ValidationError("Solo los administradores pueden crear invitaciones")
                
                # Verificar que no exista un usuario con ese email
                if Usuario.objects.filter(email=email_invitado).exists():
                    raise ValidationError("Ya existe un usuario con este email")
                
                # Verificar que no haya una invitación pendiente para este email
                if InvitacionRegistro.objects.filter(
                    email_invitado=email_invitado,
                    estado='pendiente'
                ).exists():
                    raise ValidationError("Ya existe una invitación pendiente para este email")
                
                # Crear la invitación
                invitacion = InvitacionRegistro.objects.create(
                    email_invitado=email_invitado,
                    rol=rol,
                    invitado_por=invitador,
                    datos_adicionales=datos_adicionales or {}
                )
                
                logger.info(f"Invitación creada para {email_invitado} por {invitador.email}")
                return invitacion
                
        except Exception as e:
            logger.error(f"Error creando invitación: {str(e)}")
            raise ValidationError(f"Error al crear invitación: {str(e)}")
    
    @staticmethod
    def validar_token(token):
        """Valida un token de invitación"""
        try:
            invitacion = InvitacionRegistro.objects.get(token=token)
            
            if not invitacion.es_valida():
                raise ValidationError("La invitación ha expirado o no es válida")
            
            return invitacion
            
        except InvitacionRegistro.DoesNotExist:
            raise ValidationError("Token de invitación no válido")
    
    @staticmethod
    def registrar_con_invitacion(token, datos_usuario):
        """Registra un usuario usando una invitación"""
        try:
            with transaction.atomic():
                # Validar token
                invitacion = InvitationService.validar_token(token)
                
                # Crear usuario según el rol
                if invitacion.rol == 'estudiante':
                    datos_estudiante = invitacion.datos_adicionales
                    estudiante = StudentService.crear_estudiante(datos_usuario, datos_estudiante)
                    usuario_creado = estudiante.usuario
                    
                elif invitacion.rol == 'docente':
                    datos_docente = invitacion.datos_adicionales
                    docente = TeacherService.crear_docente(datos_usuario, datos_docente)
                    usuario_creado = docente.usuario
                    
                elif invitacion.rol == 'administrador':
                    datos_admin = invitacion.datos_adicionales
                    administrador = AdminService.crear_administrador(datos_usuario, datos_admin)
                    usuario_creado = administrador.usuario
                
                # Marcar invitación como usada
                invitacion.marcar_como_usada(usuario_creado)
                
                logger.info(f"Usuario registrado exitosamente con invitación: {usuario_creado.email}")
                return usuario_creado
                
        except Exception as e:
            logger.error(f"Error registrando con invitación: {str(e)}")
            raise ValidationError(f"Error al registrar con invitación: {str(e)}")
    
    @staticmethod
    def cancelar_invitacion(token, cancelado_por):
        """Cancela una invitación"""
        try:
            invitacion = InvitacionRegistro.objects.get(token=token)
            
            if cancelado_por.rol != 'administrador':
                raise ValidationError("Solo los administradores pueden cancelar invitaciones")
            
            invitacion.cancelar()
            logger.info(f"Invitación cancelada: {token} por {cancelado_por.email}")
            return invitacion
            
        except InvitacionRegistro.DoesNotExist:
            raise ValidationError("Invitación no encontrada")
    
    @staticmethod
    def extender_invitacion(token, dias_adicionales, extendido_por):
        """Extiende la fecha de expiración de una invitación"""
        try:
            invitacion = InvitacionRegistro.objects.get(token=token)
            
            if extendido_por.rol != 'administrador':
                raise ValidationError("Solo los administradores pueden extender invitaciones")
            
            invitacion.extender_expiracion(dias_adicionales)
            logger.info(f"Invitación extendida: {token} por {extendido_por.email}")
            return invitacion
            
        except InvitacionRegistro.DoesNotExist:
            raise ValidationError("Invitación no encontrada")
    
    @staticmethod
    def obtener_estadisticas():
        """Obtiene estadísticas del sistema de invitaciones"""
        # Limpiar invitaciones expiradas
        InvitacionRegistro.limpiar_expiradas()
        
        total = InvitacionRegistro.objects.count()
        pendientes = InvitacionRegistro.objects.filter(estado='pendiente').count()
        usadas = InvitacionRegistro.objects.filter(estado='usada').count()
        canceladas = InvitacionRegistro.objects.filter(estado='cancelada').count()
        expiradas = InvitacionRegistro.objects.filter(estado='expirada').count()
        
        return {
            'total': total,
            'pendientes': pendientes,
            'usadas': usadas,
            'canceladas': canceladas,
            'expiradas': expiradas,
            'tasa_uso': (usadas / total * 100) if total > 0 else 0
        }