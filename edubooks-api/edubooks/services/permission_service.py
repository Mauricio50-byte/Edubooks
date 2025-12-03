"""
Servicio de gestión de permisos
Define y valida permisos basados en roles de usuario
"""
import logging

logger = logging.getLogger('edubooks.services.permissions')


class PermissionService:
    """
    Servicio para gestionar permisos basados en roles.
    Define qué puede hacer cada tipo de usuario.
    """
    
    # Definición de permisos por módulo
    PERMISSIONS = {
        # Permisos de Instituciones
        'institutions': {
            'create': ['super_sys_admin'],
            'read': ['super_sys_admin'],
            'update': ['super_sys_admin'],
            'delete': ['super_sys_admin'],
            'list': ['super_sys_admin'],
        },
        
        # Permisos de Usuarios
        'users': {
            'create': ['super_sys_admin', 'administrador'],
            'read': ['super_sys_admin', 'administrador', 'docente'],
            'read_own': ['estudiante', 'docente', 'administrador'],
            'update': ['super_sys_admin', 'administrador'],
            'update_own': ['estudiante', 'docente', 'administrador'],
            'delete': ['super_sys_admin', 'administrador'],
            'list': ['super_sys_admin', 'administrador', 'docente'],
            'apply_sanction': ['super_sys_admin', 'administrador'],
            'add_fine': ['super_sys_admin', 'administrador'],
        },
        
        # Permisos de Libros
        'books': {
            'create': ['super_sys_admin', 'administrador'],
            'read': ['super_sys_admin', 'administrador', 'docente', 'estudiante'],
            'update': ['super_sys_admin', 'administrador'],
            'delete': ['super_sys_admin', 'administrador'],
            'list': ['super_sys_admin', 'administrador', 'docente', 'estudiante'],
            'search_external': ['super_sys_admin', 'administrador', 'docente', 'estudiante'],
        },
        
        # Permisos de Préstamos
        'loans': {
            'create': ['super_sys_admin', 'administrador', 'docente', 'estudiante'],
            'read': ['super_sys_admin', 'administrador', 'docente'],
            'read_own': ['estudiante', 'docente', 'administrador'],
            'approve': ['super_sys_admin', 'administrador'],
            'reject': ['super_sys_admin', 'administrador'],
            'return': ['super_sys_admin', 'administrador'],
            'renew': ['super_sys_admin', 'administrador', 'docente', 'estudiante'],
            'list': ['super_sys_admin', 'administrador', 'docente'],
            'list_own': ['estudiante', 'docente', 'administrador'],
            'list_overdue': ['super_sys_admin', 'administrador'],
        },
        
        # Permisos de Reservas
        'reservations': {
            'create': ['super_sys_admin', 'administrador', 'docente', 'estudiante'],
            'read': ['super_sys_admin', 'administrador', 'docente'],
            'read_own': ['estudiante', 'docente', 'administrador'],
            'cancel': ['super_sys_admin', 'administrador'],
            'cancel_own': ['estudiante', 'docente', 'administrador'],
            'list': ['super_sys_admin', 'administrador', 'docente'],
            'list_own': ['estudiante', 'docente', 'administrador'],
        },
        
        # Permisos de Invitaciones
        'invitations': {
            'create': ['super_sys_admin', 'administrador'],
            'read': ['super_sys_admin', 'administrador'],
            'validate': ['*'],  # Público
            'accept': ['*'],    # Público
            'cancel': ['super_sys_admin', 'administrador'],
            'list': ['super_sys_admin', 'administrador'],
        },
        
        # Permisos de Estadísticas
        'stats': {
            'dashboard': ['super_sys_admin', 'administrador'],
            'popular_books': ['super_sys_admin', 'administrador', 'docente'],
            'user_activity': ['super_sys_admin', 'administrador'],
            'loan_stats': ['super_sys_admin', 'administrador'],
        },
        
        # Permisos de Reportes
        'reports': {
            'generate': ['super_sys_admin', 'administrador'],
            'download': ['super_sys_admin', 'administrador'],
            'view': ['super_sys_admin', 'administrador', 'docente'],
        },
        
        # Permisos de Configuración
        'config': {
            'read': ['super_sys_admin', 'administrador'],
            'update': ['super_sys_admin', 'administrador'],
        },
    }
    
    # Permisos especiales por rol
    ROLE_PERMISSIONS = {
        'super_sys_admin': {
            'can_manage_institutions': True,
            'can_access_all_tenants': True,
            'can_create_super_admins': True,
            'can_view_system_logs': True,
            'can_configure_system': True,
        },
        'administrador': {
            'can_manage_users': True,
            'can_manage_books': True,
            'can_manage_loans': True,
            'can_apply_sanctions': True,
            'can_generate_reports': True,
            'can_configure_tenant': True,
            'can_send_invitations': True,
            'can_view_all_loans': True,
            'can_view_all_reservations': True,
        },
        'docente': {
            'can_request_loans': True,
            'can_create_reservations': True,
            'can_view_own_loans': True,
            'can_view_own_reservations': True,
            'can_search_books': True,
            'can_view_students': True,
            'can_renew_loans': True,
            'max_loans': 5,
            'loan_duration_days': 30,
        },
        'estudiante': {
            'can_request_loans': True,
            'can_create_reservations': True,
            'can_view_own_loans': True,
            'can_view_own_reservations': True,
            'can_search_books': True,
            'can_renew_loans': True,
            'max_loans': 3,
            'loan_duration_days': 15,
        },
    }
    
    @staticmethod
    def check_permission(role, module, action):
        """
        Verifica si un rol tiene permiso para realizar una acción en un módulo.
        
        Args:
            role (str): Rol del usuario
            module (str): Módulo (ej: 'books', 'loans')
            action (str): Acción (ej: 'create', 'read')
        
        Returns:
            bool: True si tiene permiso, False si no
        """
        try:
            if module not in PermissionService.PERMISSIONS:
                logger.warning(f"Módulo desconocido: {module}")
                return False
            
            if action not in PermissionService.PERMISSIONS[module]:
                logger.warning(f"Acción desconocida: {action} en módulo {module}")
                return False
            
            allowed_roles = PermissionService.PERMISSIONS[module][action]
            
            # Si el permiso es público (*)
            if '*' in allowed_roles:
                return True
            
            # Verificar si el rol está permitido
            return role in allowed_roles
            
        except Exception as e:
            logger.error(f"Error verificando permiso: {str(e)}")
            return False
    
    @staticmethod
    def get_user_permissions(role):
        """
        Obtiene todos los permisos de un rol.
        
        Args:
            role (str): Rol del usuario
        
        Returns:
            dict: Diccionario con permisos del rol
        """
        try:
            permissions = {
                'role': role,
                'modules': {},
                'special_permissions': PermissionService.ROLE_PERMISSIONS.get(role, {})
            }
            
            # Construir permisos por módulo
            for module, actions in PermissionService.PERMISSIONS.items():
                permissions['modules'][module] = {}
                for action, allowed_roles in actions.items():
                    if '*' in allowed_roles or role in allowed_roles:
                        permissions['modules'][module][action] = True
                    else:
                        permissions['modules'][module][action] = False
            
            return permissions
            
        except Exception as e:
            logger.error(f"Error obteniendo permisos: {str(e)}")
            return {'role': role, 'modules': {}, 'special_permissions': {}}
    
    @staticmethod
    def can_access_resource(user_role, user_uid, resource_owner_uid, action_type='read'):
        """
        Verifica si un usuario puede acceder a un recurso específico.
        
        Args:
            user_role (str): Rol del usuario que intenta acceder
            user_uid (str): UID del usuario que intenta acceder
            resource_owner_uid (str): UID del dueño del recurso
            action_type (str): Tipo de acción ('read', 'update', 'delete')
        
        Returns:
            bool: True si puede acceder, False si no
        """
        # Super admin puede acceder a todo
        if user_role == 'super_sys_admin':
            return True
        
        # Administrador puede acceder a recursos de su tenant
        if user_role == 'administrador':
            return True
        
        # Usuarios normales solo pueden acceder a sus propios recursos
        if action_type in ['read', 'read_own']:
            return user_uid == resource_owner_uid
        
        # Para update y delete, solo el dueño o admin
        if action_type in ['update', 'update_own', 'delete']:
            return user_uid == resource_owner_uid
        
        return False
    
    @staticmethod
    def get_max_loans(role):
        """
        Obtiene el número máximo de préstamos permitidos para un rol.
        """
        role_perms = PermissionService.ROLE_PERMISSIONS.get(role, {})
        return role_perms.get('max_loans', 3)
    
    @staticmethod
    def get_loan_duration(role):
        """
        Obtiene la duración de préstamo en días para un rol.
        """
        role_perms = PermissionService.ROLE_PERMISSIONS.get(role, {})
        return role_perms.get('loan_duration_days', 15)
    
    @staticmethod
    def validate_action(role, module, action):
        """
        Valida una acción y lanza excepción si no está permitida.
        
        Args:
            role (str): Rol del usuario
            module (str): Módulo
            action (str): Acción
        
        Raises:
            PermissionError: Si no tiene permiso
        """
        if not PermissionService.check_permission(role, module, action):
            raise PermissionError(
                f"El rol '{role}' no tiene permiso para '{action}' en '{module}'"
            )
