"""
Configuración de Firebase para Edubooks API v2
Este módulo maneja la inicialización y conexión con Firebase Realtime Database
"""
import firebase_admin
from firebase_admin import credentials, db, auth
from decouple import config
import json
import os
import logging

logger = logging.getLogger('edubooks.firebase')

# Variable global para el cliente de Firebase
_firebase_app = None
_database_ref = None


def initialize_firebase():
    """
    Inicializa la conexión con Firebase usando las credenciales del archivo de servicio.
    Esta función debe ser llamada una sola vez al inicio de la aplicación.
    """
    global _firebase_app, _database_ref
    
    if _firebase_app is not None:
        logger.info("Firebase ya está inicializado")
        return _firebase_app
    
    try:
        # Obtener la ruta del archivo de credenciales desde las variables de entorno
        service_account_path = config('FIREBASE_SERVICE_ACCOUNT', default='')
        database_url = config('FIREBASE_DATABASE_URL', default='')
        
        if not service_account_path:
            raise ValueError("FIREBASE_SERVICE_ACCOUNT no está configurado en las variables de entorno")
        
        if not database_url:
            raise ValueError("FIREBASE_DATABASE_URL no está configurado en las variables de entorno")
        
        # Verificar que el archivo existe
        if not os.path.exists(service_account_path):
            raise FileNotFoundError(f"No se encontró el archivo de credenciales: {service_account_path}")
        
        # Inicializar Firebase Admin SDK
        cred = credentials.Certificate(service_account_path)
        _firebase_app = firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
        
        # Obtener referencia a la base de datos
        _database_ref = db.reference()
        
        logger.info("Firebase inicializado correctamente")
        return _firebase_app
        
    except Exception as e:
        logger.error(f"Error al inicializar Firebase: {str(e)}")
        raise


def get_database_ref(path=''):
    """
    Obtiene una referencia a un nodo específico de la base de datos.
    
    Args:
        path (str): Ruta al nodo en la base de datos (ej: 'tenants/inst_001/users')
    
    Returns:
        Reference: Referencia al nodo de Firebase
    """
    global _database_ref
    
    if _database_ref is None:
        initialize_firebase()
    
    if path:
        return _database_ref.child(path)
    return _database_ref


def get_tenant_ref(tenant_id, subpath=''):
    """
    Obtiene una referencia al nodo de un tenant específico.
    
    Args:
        tenant_id (str): ID del tenant (institución)
        subpath (str): Subruta dentro del tenant (ej: 'users', 'inventory')
    
    Returns:
        Reference: Referencia al nodo del tenant
    """
    path = f'tenants/{tenant_id}'
    if subpath:
        path = f'{path}/{subpath}'
    return get_database_ref(path)


def verify_firebase_token(id_token):
    """
    Verifica un token de Firebase Authentication.
    
    Args:
        id_token (str): Token JWT de Firebase
    
    Returns:
        dict: Información del usuario decodificada del token
    
    Raises:
        ValueError: Si el token es inválido
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Error al verificar token: {str(e)}")
        raise ValueError(f"Token inválido: {str(e)}")


def create_firebase_user(email, password, display_name=None):
    """
    Crea un nuevo usuario en Firebase Authentication.
    
    Args:
        email (str): Email del usuario
        password (str): Contraseña del usuario
        display_name (str): Nombre para mostrar (opcional)
    
    Returns:
        UserRecord: Registro del usuario creado
    """
    try:
        user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name
        )
        logger.info(f"Usuario creado en Firebase Auth: {user.uid}")
        return user
    except Exception as e:
        logger.error(f"Error al crear usuario en Firebase: {str(e)}")
        raise


def delete_firebase_user(uid):
    """
    Elimina un usuario de Firebase Authentication.
    
    Args:
        uid (str): UID del usuario a eliminar
    """
    try:
        auth.delete_user(uid)
        logger.info(f"Usuario eliminado de Firebase Auth: {uid}")
    except Exception as e:
        logger.error(f"Error al eliminar usuario de Firebase: {str(e)}")
        raise


def set_custom_user_claims(uid, claims):
    """
    Establece claims personalizados para un usuario (ej: rol, tenant_id).
    
    Args:
        uid (str): UID del usuario
        claims (dict): Claims personalizados a establecer
    """
    try:
        auth.set_custom_user_claims(uid, claims)
        logger.info(f"Claims actualizados para usuario {uid}: {claims}")
    except Exception as e:
        logger.error(f"Error al establecer claims: {str(e)}")
        raise
