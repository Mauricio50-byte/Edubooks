"""
Servicio de gestión de instituciones (Tenants)
Maneja las operaciones CRUD de las instituciones en Firebase
"""
from edubooks.firebase_config import get_database_ref, get_tenant_ref, create_firebase_user, set_custom_user_claims
from datetime import datetime
import uuid
import logging

logger = logging.getLogger('edubooks.services.institution')


class InstitutionService:
    """
    Servicio para gestionar instituciones (tenants) en el sistema.
    Solo accesible por Super Administradores.
    """
    
    @staticmethod
    def create_institution(name, plan='basic', config=None):
        """
        Crea una nueva institución en el sistema.
        
        Args:
            name (str): Nombre de la institución
            plan (str): Plan de suscripción ('basic', 'premium', 'enterprise')
            config (dict): Configuración personalizada de la institución
        
        Returns:
            dict: Datos de la institución creada con su ID
        """
        try:
            # Generar ID único para la institución
            inst_id = f"inst_{uuid.uuid4().hex[:12]}"
            
            # Configuración por defecto
            default_config = {
                'max_loans_per_student': 3,
                'max_loans_per_teacher': 5,
                'loan_days': 15,
                'max_renewals': 2,
                'fine_per_day': 5.0,
                'reservation_expiry_days': 3
            }
            
            # Combinar con configuración personalizada
            if config:
                default_config.update(config)
            
            # Datos de la institución
            institution_data = {
                'id': inst_id,
                'name': name,
                'plan': plan,
                'active': True,
                'created_at': {'.sv': 'timestamp'},
                'updated_at': {'.sv': 'timestamp'}
            }
            
            # Guardar en el registro de instituciones
            registry_ref = get_database_ref('sys_admin/instituciones_registry')
            registry_ref.child(inst_id).set(institution_data)
            
            # Crear estructura del tenant
            tenant_ref = get_tenant_ref(inst_id)
            tenant_structure = {
                'config': default_config,
                'profile': {
                    'name': name,
                    'plan': plan,
                    'logo_url': '',
                    'contact_email': '',
                    'contact_phone': ''
                },
                'users': {},
                'inventory': {},
                'transactions': {
                    'loans': {},
                    'reservations': {},
                    'sanctions': {}
                },
                'stats': {
                    'total_users': 0,
                    'total_books': 0,
                    'active_loans': 0
                }
            }
            
            tenant_ref.set(tenant_structure)
            
            logger.info(f"Institución creada: {name} (ID: {inst_id})")
            return {
                'id': inst_id,
                'name': name,
                'plan': plan,
                'config': default_config
            }
            
        except Exception as e:
            logger.error(f"Error al crear institución: {str(e)}")
            raise
    
    @staticmethod
    def get_institution(inst_id):
        """
        Obtiene los datos de una institución.
        
        Args:
            inst_id (str): ID de la institución
        
        Returns:
            dict: Datos de la institución
        """
        try:
            registry_ref = get_database_ref(f'sys_admin/instituciones_registry/{inst_id}')
            institution_data = registry_ref.get()
            
            if not institution_data:
                raise ValueError(f"Institución no encontrada: {inst_id}")
            
            return institution_data
            
        except Exception as e:
            logger.error(f"Error al obtener institución: {str(e)}")
            raise
    
    @staticmethod
    def list_institutions():
        """
        Lista todas las instituciones del sistema.
        
        Returns:
            list: Lista de instituciones
        """
        try:
            registry_ref = get_database_ref('sys_admin/instituciones_registry')
            institutions = registry_ref.get()
            
            if not institutions:
                return []
            
            return [
                {**data, 'id': inst_id}
                for inst_id, data in institutions.items()
            ]
            
        except Exception as e:
            logger.error(f"Error al listar instituciones: {str(e)}")
            raise
    
    @staticmethod
    def update_institution(inst_id, updates):
        """
        Actualiza los datos de una institución.
        
        Args:
            inst_id (str): ID de la institución
            updates (dict): Datos a actualizar
        
        Returns:
            dict: Datos actualizados
        """
        try:
            registry_ref = get_database_ref(f'sys_admin/instituciones_registry/{inst_id}')
            
            # Verificar que existe
            if not registry_ref.get():
                raise ValueError(f"Institución no encontrada: {inst_id}")
            
            # Agregar timestamp de actualización
            updates['updated_at'] = {'.sv': 'timestamp'}
            
            # Actualizar
            registry_ref.update(updates)
            
            logger.info(f"Institución actualizada: {inst_id}")
            return registry_ref.get()
            
        except Exception as e:
            logger.error(f"Error al actualizar institución: {str(e)}")
            raise
    
    @staticmethod
    def deactivate_institution(inst_id):
        """
        Desactiva una institución (soft delete).
        
        Args:
            inst_id (str): ID de la institución
        """
        try:
            return InstitutionService.update_institution(inst_id, {'active': False})
        except Exception as e:
            logger.error(f"Error al desactivar institución: {str(e)}")
            raise
    
    @staticmethod
    def create_institution_admin(inst_id, email, password, name, apellido):
        """
        Crea el primer administrador para una institución.
        
        Args:
            inst_id (str): ID de la institución
            email (str): Email del administrador
            password (str): Contraseña
            name (str): Nombre
            apellido (str): Apellido
        
        Returns:
            dict: Datos del administrador creado
        """
        try:
            # Verificar que la institución existe
            InstitutionService.get_institution(inst_id)
            
            # Crear usuario en Firebase Auth
            user = create_firebase_user(email, password, display_name=f"{name} {apellido}")
            
            # Establecer claims personalizados
            set_custom_user_claims(user.uid, {
                'role': 'administrador',
                'tenant_id': inst_id
            })
            
            # Guardar en la base de datos del tenant
            user_ref = get_tenant_ref(inst_id, f'users/{user.uid}')
            user_data = {
                'uid': user.uid,
                'email': email,
                'nombre': name,
                'apellido': apellido,
                'role': 'administrador',
                'tenant_id': inst_id,
                'created_at': {'.sv': 'timestamp'},
                'active': True,
                'estado': 'activo'
            }
            
            user_ref.set(user_data)
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(inst_id, 'stats/total_users')
            current_total = stats_ref.get() or 0
            stats_ref.set(current_total + 1)
            
            logger.info(f"Administrador creado para institución {inst_id}: {email}")
            return user_data
            
        except Exception as e:
            logger.error(f"Error al crear administrador: {str(e)}")
            raise
