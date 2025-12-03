"""
Servicio de gestión de usuarios
Maneja las operaciones CRUD de usuarios dentro de un tenant
"""
from edubooks.firebase_config import get_tenant_ref, create_firebase_user, set_custom_user_claims, delete_firebase_user
from datetime import datetime, timedelta
import logging

logger = logging.getLogger('edubooks.services.user')


class UserService:
    """
    Servicio para gestionar usuarios dentro de una institución.
    """
    
    @staticmethod
    def create_user(tenant_id, email, password, nombre, apellido, role, **extra_fields):
        """
        Crea un nuevo usuario en una institución.
        
        Args:
            tenant_id (str): ID de la institución
            email (str): Email del usuario
            password (str): Contraseña
            nombre (str): Nombre
            apellido (str): Apellido
            role (str): Rol ('estudiante', 'docente', 'administrador')
            **extra_fields: Campos adicionales según el rol
        
        Returns:
            dict: Datos del usuario creado
        """
        try:
            # Validar rol
            valid_roles = ['estudiante', 'docente', 'administrador']
            if role not in valid_roles:
                raise ValueError(f"Rol inválido. Debe ser uno de: {', '.join(valid_roles)}")
            
            # Crear usuario en Firebase Auth
            user = create_firebase_user(email, password, display_name=f"{nombre} {apellido}")
            
            # Establecer claims personalizados
            set_custom_user_claims(user.uid, {
                'role': role,
                'tenant_id': tenant_id
            })
            
            # Datos base del usuario
            user_data = {
                'uid': user.uid,
                'email': email,
                'nombre': nombre,
                'apellido': apellido,
                'role': role,
                'tenant_id': tenant_id,
                'created_at': {'.sv': 'timestamp'},
                'updated_at': {'.sv': 'timestamp'},
                'active': True,
                'estado': 'activo',
                
                # Campos de control de préstamos
                'prestamos_activos': 0,
                'max_prestamos_permitidos': 3 if role == 'estudiante' else 5,
                'multas_pendientes': 0.0,
                'sancionado_hasta': None,
            }
            
            # Agregar campos específicos del rol
            if role == 'estudiante':
                user_data['perfil_estudiante'] = {
                    'carrera': extra_fields.get('carrera', ''),
                    'matricula': extra_fields.get('matricula', ''),
                    'semestre_actual': extra_fields.get('semestre_actual', 1),
                    'turno': extra_fields.get('turno', 'matutino')
                }
            elif role == 'docente':
                user_data['perfil_docente'] = {
                    'numero_empleado': extra_fields.get('numero_empleado', ''),
                    'departamento': extra_fields.get('departamento', ''),
                    'especialidad': extra_fields.get('especialidad', ''),
                    'grado_academico': extra_fields.get('grado_academico', 'licenciatura')
                }
            elif role == 'administrador':
                user_data['perfil_administrador'] = {
                    'area': extra_fields.get('area', 'biblioteca'),
                    'cargo': extra_fields.get('cargo', 'Administrador'),
                    'nivel_acceso': extra_fields.get('nivel_acceso', 2),
                    'permisos': {
                        'puede_crear_usuarios': extra_fields.get('puede_crear_usuarios', False),
                        'puede_modificar_usuarios': extra_fields.get('puede_modificar_usuarios', False),
                        'puede_eliminar_usuarios': extra_fields.get('puede_eliminar_usuarios', False),
                        'puede_gestionar_libros': True,
                        'puede_gestionar_prestamos': True,
                        'puede_aplicar_sanciones': extra_fields.get('puede_aplicar_sanciones', False),
                        'puede_generar_reportes': True
                    }
                }
            
            # Guardar en Firebase
            user_ref = get_tenant_ref(tenant_id, f'users/{user.uid}')
            user_ref.set(user_data)
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(tenant_id, 'stats/total_users')
            current_total = stats_ref.get() or 0
            stats_ref.set(current_total + 1)
            
            logger.info(f"Usuario creado en tenant {tenant_id}: {email} ({role})")
            return user_data
            
        except Exception as e:
            logger.error(f"Error al crear usuario: {str(e)}")
            raise
    
    @staticmethod
    def get_user(tenant_id, user_uid):
        """
        Obtiene los datos de un usuario.
        
        Args:
            tenant_id (str): ID de la institución
            user_uid (str): UID del usuario
        
        Returns:
            dict: Datos del usuario
        """
        try:
            user_ref = get_tenant_ref(tenant_id, f'users/{user_uid}')
            user_data = user_ref.get()
            
            if not user_data:
                raise ValueError(f"Usuario no encontrado: {user_uid}")
            
            return user_data
            
        except Exception as e:
            logger.error(f"Error al obtener usuario: {str(e)}")
            raise
    
    @staticmethod
    def list_users(tenant_id, role=None, estado=None):
        """
        Lista usuarios de una institución con filtros opcionales.
        
        Args:
            tenant_id (str): ID de la institución
            role (str): Filtrar por rol (opcional)
            estado (str): Filtrar por estado (opcional)
        
        Returns:
            list: Lista de usuarios
        """
        try:
            users_ref = get_tenant_ref(tenant_id, 'users')
            users = users_ref.get()
            
            if not users:
                return []
            
            user_list = []
            for uid, data in users.items():
                # Aplicar filtros
                if role and data.get('role') != role:
                    continue
                if estado and data.get('estado') != estado:
                    continue
                
                user_list.append({**data, 'uid': uid})
            
            return user_list
            
        except Exception as e:
            logger.error(f"Error al listar usuarios: {str(e)}")
            raise
    
    @staticmethod
    def update_user(tenant_id, user_uid, updates):
        """
        Actualiza los datos de un usuario.
        
        Args:
            tenant_id (str): ID de la institución
            user_uid (str): UID del usuario
            updates (dict): Datos a actualizar
        
        Returns:
            dict: Datos actualizados
        """
        try:
            user_ref = get_tenant_ref(tenant_id, f'users/{user_uid}')
            
            # Verificar que existe
            if not user_ref.get():
                raise ValueError(f"Usuario no encontrado: {user_uid}")
            
            # Agregar timestamp de actualización
            updates['updated_at'] = {'.sv': 'timestamp'}
            
            # Actualizar
            user_ref.update(updates)
            
            logger.info(f"Usuario actualizado: {user_uid}")
            return user_ref.get()
            
        except Exception as e:
            logger.error(f"Error al actualizar usuario: {str(e)}")
            raise
    
    @staticmethod
    def delete_user(tenant_id, user_uid):
        """
        Elimina un usuario (hard delete).
        
        Args:
            tenant_id (str): ID de la institución
            user_uid (str): UID del usuario
        """
        try:
            # Eliminar de Firebase Auth
            delete_firebase_user(user_uid)
            
            # Eliminar de la base de datos
            user_ref = get_tenant_ref(tenant_id, f'users/{user_uid}')
            user_ref.delete()
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(tenant_id, 'stats/total_users')
            current_total = stats_ref.get() or 0
            if current_total > 0:
                stats_ref.set(current_total - 1)
            
            logger.info(f"Usuario eliminado: {user_uid}")
            
        except Exception as e:
            logger.error(f"Error al eliminar usuario: {str(e)}")
            raise
    
    @staticmethod
    def aplicar_sancion(tenant_id, user_uid, dias, motivo=""):
        """
        Aplica una sanción a un usuario.
        
        Args:
            tenant_id (str): ID de la institución
            user_uid (str): UID del usuario
            dias (int): Días de sanción
            motivo (str): Motivo de la sanción
        """
        try:
            sancionado_hasta = datetime.now() + timedelta(days=dias)
            
            updates = {
                'sancionado_hasta': int(sancionado_hasta.timestamp() * 1000),
                'estado': 'suspendido',
                'fecha_ultima_sancion': {'.sv': 'timestamp'}
            }
            
            UserService.update_user(tenant_id, user_uid, updates)
            
            # Registrar la sanción
            sancion_ref = get_tenant_ref(tenant_id, f'transactions/sanctions/{user_uid}_{int(datetime.now().timestamp())}')
            sancion_ref.set({
                'user_uid': user_uid,
                'tipo': 'suspension',
                'dias': dias,
                'motivo': motivo,
                'fecha_inicio': {'.sv': 'timestamp'},
                'fecha_fin': int(sancionado_hasta.timestamp() * 1000),
                'estado': 'activa'
            })
            
            logger.info(f"Sanción aplicada a usuario {user_uid}: {dias} días")
            
        except Exception as e:
            logger.error(f"Error al aplicar sanción: {str(e)}")
            raise
    
    @staticmethod
    def agregar_multa(tenant_id, user_uid, cantidad, concepto=""):
        """
        Agrega una multa a un usuario.
        
        Args:
            tenant_id (str): ID de la institución
            user_uid (str): UID del usuario
            cantidad (float): Cantidad de la multa
            concepto (str): Concepto de la multa
        """
        try:
            user = UserService.get_user(tenant_id, user_uid)
            multas_actuales = user.get('multas_pendientes', 0.0)
            
            updates = {
                'multas_pendientes': multas_actuales + cantidad
            }
            
            UserService.update_user(tenant_id, user_uid, updates)
            
            # Registrar la multa
            multa_ref = get_tenant_ref(tenant_id, f'transactions/sanctions/{user_uid}_{int(datetime.now().timestamp())}')
            multa_ref.set({
                'user_uid': user_uid,
                'tipo': 'multa',
                'monto': cantidad,
                'concepto': concepto,
                'fecha_inicio': {'.sv': 'timestamp'},
                'estado': 'activa'
            })
            
            logger.info(f"Multa agregada a usuario {user_uid}: ${cantidad}")
            
        except Exception as e:
            logger.error(f"Error al agregar multa: {str(e)}")
            raise
