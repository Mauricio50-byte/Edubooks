"""
Servicio de gestión de préstamos
Maneja las operaciones de préstamos, devoluciones y renovaciones
"""
from edubooks.firebase_config import get_tenant_ref
from edubooks.services.book_service import BookService
from edubooks.services.user_service import UserService
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger('edubooks.services.loan')


class LoanService:
    """
    Servicio para gestionar préstamos de libros.
    """
    
    @staticmethod
    def create_loan_request(tenant_id, user_uid, book_id):
        """
        Crea una solicitud de préstamo (estado: Pendiente).
        
        Args:
            tenant_id (str): ID de la institución
            user_uid (str): UID del usuario solicitante
            book_id (str): ID del libro
        
        Returns:
            dict: Datos del préstamo creado
        """
        try:
            # Validar que el usuario puede prestar
            user = UserService.get_user(tenant_id, user_uid)
            
            # Verificar sanciones
            if user.get('sancionado_hasta'):
                sancion_timestamp = user['sancionado_hasta']
                if sancion_timestamp > int(datetime.now().timestamp() * 1000):
                    raise ValueError("El usuario está sancionado y no puede solicitar préstamos")
            
            # Verificar multas
            if user.get('multas_pendientes', 0) > 0:
                raise ValueError("El usuario tiene multas pendientes y no puede solicitar préstamos")
            
            # Verificar límite de préstamos
            prestamos_activos = user.get('prestamos_activos', 0)
            max_prestamos = user.get('max_prestamos_permitidos', 3)
            if prestamos_activos >= max_prestamos:
                raise ValueError(f"El usuario ya tiene {prestamos_activos} préstamos activos (máximo: {max_prestamos})")
            
            # Validar disponibilidad del libro
            book = BookService.get_book(tenant_id, book_id)
            if book['cantidad_disponible'] <= 0:
                raise ValueError("No hay ejemplares disponibles de este libro")
            
            if book['estado'] == 'Mantenimiento':
                raise ValueError("Este libro está en mantenimiento y no se puede prestar")
            
            # Verificar que no tenga ya un préstamo activo del mismo libro
            loans_ref = get_tenant_ref(tenant_id, 'transactions/loans')
            existing_loans = loans_ref.get()
            
            if existing_loans:
                for loan_id, loan_data in existing_loans.items():
                    if (loan_data.get('user_uid') == user_uid and 
                        loan_data.get('book_id') == book_id and 
                        loan_data.get('status') in ['pending', 'active']):
                        raise ValueError("Ya tienes un préstamo pendiente o activo de este libro")
            
            # Generar ID del préstamo
            loan_id = f"loan_{uuid.uuid4().hex[:12]}"
            
            # Crear el préstamo
            loan_data = {
                'id': loan_id,
                'book_id': book_id,
                'user_uid': user_uid,
                'status': 'pending',
                'created_at': {'.sv': 'timestamp'},
                'updated_at': {'.sv': 'timestamp'},
                'fecha_devolucion_esperada': None,
                'fecha_devolucion_real': None,
                'renovaciones': 0,
                'aprobado_por': None,
                'fecha_aprobacion': None,
                'observaciones': ''
            }
            
            # Guardar el préstamo
            loan_ref = get_tenant_ref(tenant_id, f'transactions/loans/{loan_id}')
            loan_ref.set(loan_data)
            
            logger.info(f"Solicitud de préstamo creada: {loan_id}")
            return loan_data
            
        except Exception as e:
            logger.error(f"Error al crear solicitud de préstamo: {str(e)}")
            raise
    
    @staticmethod
    def approve_loan(tenant_id, loan_id, admin_uid, loan_days=15):
        """
        Aprueba una solicitud de préstamo.
        
        Args:
            tenant_id (str): ID de la institución
            loan_id (str): ID del préstamo
            admin_uid (str): UID del administrador que aprueba
            loan_days (int): Días de préstamo (por defecto 15)
        
        Returns:
            dict: Datos del préstamo actualizado
        """
        try:
            # Obtener el préstamo
            loan_ref = get_tenant_ref(tenant_id, f'transactions/loans/{loan_id}')
            loan = loan_ref.get()
            
            if not loan:
                raise ValueError(f"Préstamo no encontrado: {loan_id}")
            
            if loan['status'] != 'pending':
                raise ValueError(f"El préstamo no está en estado pendiente (estado actual: {loan['status']})")
            
            # Obtener configuración del tenant
            config_ref = get_tenant_ref(tenant_id, 'config')
            config = config_ref.get() or {}
            loan_days = config.get('loan_days', loan_days)
            
            # Calcular fecha de devolución
            fecha_devolucion = datetime.now() + timedelta(days=loan_days)
            
            # Actualizar el préstamo
            updates = {
                'status': 'active',
                'aprobado_por': admin_uid,
                'fecha_aprobacion': {'.sv': 'timestamp'},
                'fecha_devolucion_esperada': int(fecha_devolucion.timestamp() * 1000),
                'updated_at': {'.sv': 'timestamp'}
            }
            
            loan_ref.update(updates)
            
            # Reducir stock del libro (transacción atómica)
            book_id = loan['book_id']
            BookService.adjust_stock(tenant_id, book_id, -1)
            
            # Incrementar préstamos activos del usuario
            user_uid = loan['user_uid']
            user_ref = get_tenant_ref(tenant_id, f'users/{user_uid}')
            user = user_ref.get()
            user_ref.update({
                'prestamos_activos': user.get('prestamos_activos', 0) + 1
            })
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(tenant_id, 'stats/active_loans')
            current_active = stats_ref.get() or 0
            stats_ref.set(current_active + 1)
            
            logger.info(f"Préstamo aprobado: {loan_id}")
            return loan_ref.get()
            
        except Exception as e:
            logger.error(f"Error al aprobar préstamo: {str(e)}")
            raise
    
    @staticmethod
    def reject_loan(tenant_id, loan_id, admin_uid, motivo):
        """
        Rechaza una solicitud de préstamo.
        
        Args:
            tenant_id (str): ID de la institución
            loan_id (str): ID del préstamo
            admin_uid (str): UID del administrador que rechaza
            motivo (str): Motivo del rechazo
        
        Returns:
            dict: Datos del préstamo actualizado
        """
        try:
            loan_ref = get_tenant_ref(tenant_id, f'transactions/loans/{loan_id}')
            loan = loan_ref.get()
            
            if not loan:
                raise ValueError(f"Préstamo no encontrado: {loan_id}")
            
            if loan['status'] != 'pending':
                raise ValueError(f"El préstamo no está en estado pendiente")
            
            updates = {
                'status': 'rejected',
                'aprobado_por': admin_uid,
                'motivo_rechazo': motivo,
                'updated_at': {'.sv': 'timestamp'}
            }
            
            loan_ref.update(updates)
            
            logger.info(f"Préstamo rechazado: {loan_id}")
            return loan_ref.get()
            
        except Exception as e:
            logger.error(f"Error al rechazar préstamo: {str(e)}")
            raise
    
    @staticmethod
    def return_loan(tenant_id, loan_id, admin_uid):
        """
        Registra la devolución de un libro.
        
        Args:
            tenant_id (str): ID de la institución
            loan_id (str): ID del préstamo
            admin_uid (str): UID del administrador que registra la devolución
        
        Returns:
            dict: Datos del préstamo actualizado
        """
        try:
            loan_ref = get_tenant_ref(tenant_id, f'transactions/loans/{loan_id}')
            loan = loan_ref.get()
            
            if not loan:
                raise ValueError(f"Préstamo no encontrado: {loan_id}")
            
            if loan['status'] not in ['active', 'overdue']:
                raise ValueError(f"El préstamo no está activo")
            
            now = datetime.now()
            fecha_devolucion_esperada = datetime.fromtimestamp(loan['fecha_devolucion_esperada'] / 1000)
            
            # Verificar si hay retraso
            dias_retraso = 0
            if now > fecha_devolucion_esperada:
                dias_retraso = (now - fecha_devolucion_esperada).days
            
            # Actualizar el préstamo
            updates = {
                'status': 'returned',
                'fecha_devolucion_real': {'.sv': 'timestamp'},
                'updated_at': {'.sv': 'timestamp'},
                'dias_retraso': dias_retraso
            }
            
            loan_ref.update(updates)
            
            # Aumentar stock del libro
            book_id = loan['book_id']
            BookService.adjust_stock(tenant_id, book_id, 1)
            
            # Decrementar préstamos activos del usuario
            user_uid = loan['user_uid']
            user_ref = get_tenant_ref(tenant_id, f'users/{user_uid}')
            user = user_ref.get()
            prestamos_activos = max(0, user.get('prestamos_activos', 0) - 1)
            user_ref.update({'prestamos_activos': prestamos_activos})
            
            # Si hay retraso, aplicar multa
            if dias_retraso > 0:
                config_ref = get_tenant_ref(tenant_id, 'config')
                config = config_ref.get() or {}
                fine_per_day = config.get('fine_per_day', 5.0)
                total_fine = dias_retraso * fine_per_day
                
                UserService.agregar_multa(
                    tenant_id, 
                    user_uid, 
                    total_fine, 
                    f"Retraso de {dias_retraso} días en devolución de libro"
                )
                
                logger.info(f"Multa aplicada por retraso: ${total_fine}")
            
            # Actualizar estadísticas
            stats_ref = get_tenant_ref(tenant_id, 'stats/active_loans')
            current_active = stats_ref.get() or 0
            if current_active > 0:
                stats_ref.set(current_active - 1)
            
            logger.info(f"Préstamo devuelto: {loan_id}")
            return loan_ref.get()
            
        except Exception as e:
            logger.error(f"Error al devolver préstamo: {str(e)}")
            raise
    
    @staticmethod
    def renew_loan(tenant_id, loan_id, user_uid):
        """
        Renueva un préstamo activo.
        
        Args:
            tenant_id (str): ID de la institución
            loan_id (str): ID del préstamo
            user_uid (str): UID del usuario
        
        Returns:
            dict: Datos del préstamo actualizado
        """
        try:
            loan_ref = get_tenant_ref(tenant_id, f'transactions/loans/{loan_id}')
            loan = loan_ref.get()
            
            if not loan:
                raise ValueError(f"Préstamo no encontrado: {loan_id}")
            
            if loan['status'] != 'active':
                raise ValueError("Solo se pueden renovar préstamos activos")
            
            if loan['user_uid'] != user_uid:
                raise ValueError("No tienes permiso para renovar este préstamo")
            
            # Obtener configuración
            config_ref = get_tenant_ref(tenant_id, 'config')
            config = config_ref.get() or {}
            max_renewals = config.get('max_renewals', 2)
            loan_days = config.get('loan_days', 15)
            
            # Verificar límite de renovaciones
            renovaciones = loan.get('renovaciones', 0)
            if renovaciones >= max_renewals:
                raise ValueError(f"Se ha alcanzado el límite de renovaciones ({max_renewals})")
            
            # Calcular nueva fecha de devolución
            fecha_actual = datetime.fromtimestamp(loan['fecha_devolucion_esperada'] / 1000)
            nueva_fecha = fecha_actual + timedelta(days=loan_days)
            
            updates = {
                'fecha_devolucion_esperada': int(nueva_fecha.timestamp() * 1000),
                'renovaciones': renovaciones + 1,
                'updated_at': {'.sv': 'timestamp'}
            }
            
            loan_ref.update(updates)
            
            logger.info(f"Préstamo renovado: {loan_id}")
            return loan_ref.get()
            
        except Exception as e:
            logger.error(f"Error al renovar préstamo: {str(e)}")
            raise
    
    @staticmethod
    def list_loans(tenant_id, user_uid=None, status=None):
        """
        Lista préstamos con filtros opcionales.
        
        Args:
            tenant_id (str): ID de la institución
            user_uid (str): Filtrar por usuario (opcional)
            status (str): Filtrar por estado (opcional)
        
        Returns:
            list: Lista de préstamos
        """
        try:
            loans_ref = get_tenant_ref(tenant_id, 'transactions/loans')
            loans = loans_ref.get()
            
            if not loans:
                return []
            
            loan_list = []
            for loan_id, data in loans.items():
                # Aplicar filtros
                if user_uid and data.get('user_uid') != user_uid:
                    continue
                if status and data.get('status') != status:
                    continue
                
                loan_list.append({**data, 'id': loan_id})
            
            return loan_list
            
        except Exception as e:
            logger.error(f"Error al listar préstamos: {str(e)}")
            raise
