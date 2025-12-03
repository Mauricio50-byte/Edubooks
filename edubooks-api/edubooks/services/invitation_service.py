"""
Servicio de gestión de invitaciones
Maneja las invitaciones para que administradores creen usuarios en sus instituciones
"""
from edubooks.firebase_config import get_tenant_ref, get_database_ref
from datetime import datetime, timedelta
import uuid
import logging
import secrets

logger = logging.getLogger('edubooks.services.invitation')


class InvitationService:
    """
    Servicio para gestionar invitaciones a docentes y administradores.
    """
    
    @staticmethod
    def create_invitation(tenant_id, email, role, created_by_uid, **extra_data):
        """
        Crea una invitación para un nuevo usuario.
        
        Args:
            tenant_id (str): ID de la institución
            email (str): Email del usuario invitado
            role (str): Rol ('docente', 'administrador')
            created_by_uid (str): UID del usuario que crea la invitación
            **extra_data: Datos adicionales para pre-llenar el perfil
        
        Returns:
            dict: Datos de la invitación creada
        """
        try:
            # Validar rol
            valid_roles = ['docente', 'administrador']
            if role not in valid_roles:
                raise ValueError(f"Rol inválido. Solo se pueden invitar: {', '.join(valid_roles)}")
            
            # Verificar si ya existe una invitación activa para este email
            invitations_ref = get_tenant_ref(tenant_id, 'invitations')
            existing_invitations = invitations_ref.get()
            
            if existing_invitations:
                for inv_id, inv_data in existing_invitations.items():
                    if (inv_data.get('email') == email and 
                        inv_data.get('status') == 'pending'):
                        raise ValueError(f"Ya existe una invitación pendiente para {email}")
            
            # Generar token único
            invitation_token = secrets.token_urlsafe(32)
            invitation_id = f"inv_{uuid.uuid4().hex[:12]}"
            
            # Calcular expiración (7 días por defecto)
            config_ref = get_tenant_ref(tenant_id, 'config')
            config = config_ref.get() or {}
            expiration_days = config.get('invitation_expiration_days', 7)
            expiration_date = datetime.now() + timedelta(days=expiration_days)
            
            invitation_data = {
                'id': invitation_id,
                'tenant_id': tenant_id,
                'email': email,
                'role': role,
                'token': invitation_token,
                'status': 'pending',
                'created_by': created_by_uid,
                'created_at': {'.sv': 'timestamp'},
                'expiration_date': int(expiration_date.timestamp() * 1000),
                'accepted_at': None,
                'user_uid': None,
                'extra_data': extra_data  # Datos como departamento, área, etc.
            }
            
            # Guardar invitación
            inv_ref = get_tenant_ref(tenant_id, f'invitations/{invitation_id}')
            inv_ref.set(invitation_data)
            
            logger.info(f"Invitación creada: {invitation_id} para {email} ({role})")
            
            # Retornar con URL de invitación
            invitation_data['invitation_url'] = f"/register?token={invitation_token}"
            return invitation_data
            
        except Exception as e:
            logger.error(f"Error al crear invitación: {str(e)}")
            raise
    
    @staticmethod
    def get_invitation_by_token(token):
        """
        Obtiene una invitación por su token.
        
        Args:
            token (str): Token de invitación
        
        Returns:
            dict: Datos de la invitación con tenant_id incluido
        """
        try:
            # Buscar en todos los tenants (necesario porque no sabemos el tenant_id)
            tenants_ref = get_database_ref('tenants')
            tenants = tenants_ref.get()
            
            if not tenants:
                raise ValueError("Token de invitación inválido")
            
            for tenant_id, tenant_data in tenants.items():
                invitations = tenant_data.get('invitations', {})
                for inv_id, inv_data in invitations.items():
                    if inv_data.get('token') == token:
                        # Verificar estado y expiración
                        if inv_data.get('status') != 'pending':
                            raise ValueError("Esta invitación ya ha sido utilizada")
                        
                        expiration = inv_data.get('expiration_date')
                        if expiration and expiration < int(datetime.now().timestamp() * 1000):
                            raise ValueError("Esta invitación ha expirado")
                        
                        return {**inv_data, 'tenant_id': tenant_id, 'id': inv_id}
            
            raise ValueError("Token de invitación inválido")
            
        except Exception as e:
            logger.error(f"Error al obtener invitación por token: {str(e)}")
            raise
    
    @staticmethod
    def accept_invitation(token, user_uid):
        """
        Acepta una invitación y la marca como usada.
        
        Args:
            token (str): Token de invitación
            user_uid (str): UID del usuario que acepta
        
        Returns:
            dict: Datos de la invitación actualizada
        """
        try:
            invitation = InvitationService.get_invitation_by_token(token)
            tenant_id = invitation['tenant_id']
            invitation_id = invitation['id']
            
            # Actualizar invitación
            inv_ref = get_tenant_ref(tenant_id, f'invitations/{invitation_id}')
            updates = {
                'status': 'accepted',
                'accepted_at': {'.sv': 'timestamp'},
                'user_uid': user_uid
            }
            inv_ref.update(updates)
            
            logger.info(f"Invitación aceptada: {invitation_id} por usuario {user_uid}")
            return inv_ref.get()
            
        except Exception as e:
            logger.error(f"Error al aceptar invitación: {str(e)}")
            raise
    
    @staticmethod
    def cancel_invitation(tenant_id, invitation_id):
        """
        Cancela una invitación pendiente.
        """
        try:
            inv_ref = get_tenant_ref(tenant_id, f'invitations/{invitation_id}')
            invitation = inv_ref.get()
            
            if not invitation:
                raise ValueError(f"Invitación no encontrada: {invitation_id}")
            
            if invitation['status'] != 'pending':
                raise ValueError("Solo se pueden cancelar invitaciones pendientes")
            
            updates = {
                'status': 'cancelled',
                'cancelled_at': {'.sv': 'timestamp'}
            }
            inv_ref.update(updates)
            
            logger.info(f"Invitación cancelada: {invitation_id}")
            return inv_ref.get()
            
        except Exception as e:
            logger.error(f"Error al cancelar invitación: {str(e)}")
            raise
    
    @staticmethod
    def list_invitations(tenant_id, status=None):
        """
        Lista invitaciones de una institución.
        """
        try:
            invitations_ref = get_tenant_ref(tenant_id, 'invitations')
            invitations = invitations_ref.get()
            
            if not invitations:
                return []
            
            inv_list = []
            for inv_id, data in invitations.items():
                if status and data.get('status') != status:
                    continue
                
                inv_list.append({**data, 'id': inv_id})
            
            return inv_list
            
        except Exception as e:
            logger.error(f"Error al listar invitaciones: {str(e)}")
            raise
    
    @staticmethod
    def check_expired_invitations(tenant_id):
        """
        Verifica y marca como expiradas las invitaciones vencidas.
        """
        try:
            invitations = InvitationService.list_invitations(tenant_id, status='pending')
            now_ts = int(datetime.now().timestamp() * 1000)
            
            expired_count = 0
            for inv in invitations:
                if inv.get('expiration_date') and inv['expiration_date'] < now_ts:
                    inv_ref = get_tenant_ref(tenant_id, f'invitations/{inv["id"]}')
                    inv_ref.update({
                        'status': 'expired',
                        'expired_at': {'.sv': 'timestamp'}
                    })
                    expired_count += 1
            
            if expired_count > 0:
                logger.info(f"Se marcaron {expired_count} invitaciones como expiradas en tenant {tenant_id}")
                
        except Exception as e:
            logger.error(f"Error al verificar invitaciones expiradas: {str(e)}")
