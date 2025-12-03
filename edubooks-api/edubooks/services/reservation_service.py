"""
Servicio de gestión de reservas
Maneja las operaciones de reservas de libros
"""
from edubooks.firebase_config import get_tenant_ref
from edubooks.services.book_service import BookService
from edubooks.services.user_service import UserService
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger('edubooks.services.reservation')


class ReservationService:
    """
    Servicio para gestionar reservas de libros.
    """
    
    @staticmethod
    def create_reservation(tenant_id, user_uid, book_id):
        """
        Crea una reserva para un libro.
        
        Args:
            tenant_id (str): ID de la institución
            user_uid (str): UID del usuario
            book_id (str): ID del libro
        
        Returns:
            dict: Datos de la reserva creada
        """
        try:
            # Validar usuario
            user = UserService.get_user(tenant_id, user_uid)
            
            # Verificar sanciones
            if user.get('sancionado_hasta'):
                sancion_timestamp = user['sancionado_hasta']
                if sancion_timestamp > int(datetime.now().timestamp() * 1000):
                    raise ValueError("El usuario está sancionado y no puede reservar libros")
            
            if user.get('multas_pendientes', 0) > 0:
                raise ValueError("El usuario tiene multas pendientes y no puede reservar libros")
            
            # Validar libro
            book = BookService.get_book(tenant_id, book_id)
            
            # Verificar si ya tiene una reserva activa para este libro
            reservations_ref = get_tenant_ref(tenant_id, 'transactions/reservations')
            existing_reservations = reservations_ref.get()
            
            if existing_reservations:
                for res_id, res_data in existing_reservations.items():
                    if (res_data.get('user_uid') == user_uid and 
                        res_data.get('book_id') == book_id and 
                        res_data.get('status') == 'active'):
                        raise ValueError("Ya tienes una reserva activa para este libro")
            
            # Generar ID
            reservation_id = f"res_{uuid.uuid4().hex[:12]}"
            
            # Calcular expiración (3 días por defecto)
            config_ref = get_tenant_ref(tenant_id, 'config')
            config = config_ref.get() or {}
            reservation_days = config.get('reservation_days', 3)
            expiration_date = datetime.now() + timedelta(days=reservation_days)
            
            reservation_data = {
                'id': reservation_id,
                'book_id': book_id,
                'user_uid': user_uid,
                'status': 'active',
                'created_at': {'.sv': 'timestamp'},
                'expiration_date': int(expiration_date.timestamp() * 1000),
                'book_title': book.get('titulo', 'Desconocido'), # Denormalización útil
                'user_name': f"{user.get('nombre', '')} {user.get('apellido', '')}".strip()
            }
            
            # Guardar reserva
            res_ref = get_tenant_ref(tenant_id, f'transactions/reservations/{reservation_id}')
            res_ref.set(reservation_data)
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(tenant_id, 'stats/active_reservations')
            current = stats_ref.get() or 0
            stats_ref.set(current + 1)
            
            logger.info(f"Reserva creada: {reservation_id}")
            return reservation_data
            
        except Exception as e:
            logger.error(f"Error al crear reserva: {str(e)}")
            raise
    
    @staticmethod
    def cancel_reservation(tenant_id, reservation_id, user_uid=None, is_admin=False):
        """
        Cancela una reserva.
        
        Args:
            tenant_id (str): ID de la institución
            reservation_id (str): ID de la reserva
            user_uid (str): UID del usuario que cancela (opcional si es admin)
            is_admin (bool): Si es administrador
        """
        try:
            res_ref = get_tenant_ref(tenant_id, f'transactions/reservations/{reservation_id}')
            reservation = res_ref.get()
            
            if not reservation:
                raise ValueError(f"Reserva no encontrada: {reservation_id}")
            
            if reservation['status'] != 'active':
                raise ValueError("La reserva no está activa")
            
            # Verificar permisos
            if not is_admin and user_uid and reservation['user_uid'] != user_uid:
                raise ValueError("No tienes permiso para cancelar esta reserva")
            
            updates = {
                'status': 'cancelled',
                'cancelled_at': {'.sv': 'timestamp'},
                'cancelled_by': user_uid if user_uid else 'system'
            }
            
            res_ref.update(updates)
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(tenant_id, 'stats/active_reservations')
            current = stats_ref.get() or 0
            if current > 0:
                stats_ref.set(current - 1)
            
            logger.info(f"Reserva cancelada: {reservation_id}")
            return res_ref.get()
            
        except Exception as e:
            logger.error(f"Error al cancelar reserva: {str(e)}")
            raise
    
    @staticmethod
    def list_reservations(tenant_id, user_uid=None, status=None):
        """
        Lista reservas con filtros.
        """
        try:
            reservations_ref = get_tenant_ref(tenant_id, 'transactions/reservations')
            reservations = reservations_ref.get()
            
            if not reservations:
                return []
            
            res_list = []
            for res_id, data in reservations.items():
                if user_uid and data.get('user_uid') != user_uid:
                    continue
                if status and data.get('status') != status:
                    continue
                
                res_list.append({**data, 'id': res_id})
            
            return res_list
            
        except Exception as e:
            logger.error(f"Error al listar reservas: {str(e)}")
            raise
    
    @staticmethod
    def check_expired_reservations(tenant_id):
        """
        Verifica y cancela reservas expiradas.
        """
        try:
            reservations = ReservationService.list_reservations(tenant_id, status='active')
            now_ts = int(datetime.now().timestamp() * 1000)
            
            expired_count = 0
            for res in reservations:
                if res.get('expiration_date') and res['expiration_date'] < now_ts:
                    ReservationService.cancel_reservation(tenant_id, res['id'], is_admin=True)
                    expired_count += 1
            
            if expired_count > 0:
                logger.info(f"Se cancelaron {expired_count} reservas expiradas en tenant {tenant_id}")
                
        except Exception as e:
            logger.error(f"Error al verificar reservas expiradas: {str(e)}")
