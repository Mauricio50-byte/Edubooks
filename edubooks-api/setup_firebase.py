"""
Script de inicialización de Firebase Realtime Database
Este script crea la estructura base de datos necesaria para el sistema multi-tenant
"""
import sys
import os
from pathlib import Path

# Agregar el directorio raíz al path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from edubooks.firebase_config import get_database_ref, initialize_firebase
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def setup_database_structure():
    """
    Crea la estructura base de la base de datos Firebase si no existe.
    """
    try:
        # Inicializar Firebase
        initialize_firebase()
        logger.info("Firebase inicializado correctamente")
        
        # Obtener referencia a la raíz
        root_ref = get_database_ref()
        
        # Verificar si ya existe la estructura
        existing_data = root_ref.get()
        
        if existing_data is None:
            logger.info("Creando estructura base de la base de datos...")
            
            # Estructura base
            base_structure = {
                "sys_admin": {
                    "users": {},
                    "instituciones_registry": {}
                },
                "tenants": {}
            }
            
            root_ref.set(base_structure)
            logger.info("✓ Estructura base creada exitosamente")
        else:
            logger.info("La estructura base ya existe")
            
            # Verificar y crear nodos faltantes
            if 'sys_admin' not in existing_data:
                root_ref.child('sys_admin').set({
                    "users": {},
                    "instituciones_registry": {}
                })
                logger.info("✓ Nodo sys_admin creado")
            
            if 'tenants' not in existing_data:
                root_ref.child('tenants').set({})
                logger.info("✓ Nodo tenants creado")
        
        logger.info("Configuración de base de datos completada")
        return True
        
    except Exception as e:
        logger.error(f"Error al configurar la base de datos: {str(e)}")
        return False


def create_super_admin(email, password, name="Super Admin"):
    """
    Crea el primer super administrador del sistema.
    
    Args:
        email (str): Email del super admin
        password (str): Contraseña del super admin
        name (str): Nombre del super admin
    """
    from edubooks.firebase_config import create_firebase_user, set_custom_user_claims
    
    try:
        # Crear usuario en Firebase Auth
        user = create_firebase_user(email, password, display_name=name)
        
        # Establecer claims personalizados
        set_custom_user_claims(user.uid, {
            'role': 'super_sys_admin',
            'tenant_id': None
        })
        
        # Guardar en la base de datos
        sys_admin_ref = get_database_ref('sys_admin/users')
        sys_admin_ref.child(user.uid).set({
            'email': email,
            'name': name,
            'role': 'super_sys_admin',
            'created_at': {'.sv': 'timestamp'},
            'active': True
        })
        
        logger.info(f"✓ Super Admin creado exitosamente: {email} (UID: {user.uid})")
        return user.uid
        
    except Exception as e:
        logger.error(f"Error al crear super admin: {str(e)}")
        raise


if __name__ == "__main__":
    print("=" * 60)
    print("INICIALIZACIÓN DE FIREBASE - EDUBOOKS API V2")
    print("=" * 60)
    print()
    
    # Configurar estructura base
    print("1. Configurando estructura de base de datos...")
    if setup_database_structure():
        print("   ✓ Estructura configurada correctamente")
    else:
        print("   ✗ Error al configurar estructura")
        sys.exit(1)
    
    print()
    
    # Preguntar si desea crear un super admin
    create_admin = input("¿Desea crear un Super Administrador? (s/n): ").lower().strip()
    
    if create_admin == 's':
        print()
        print("Ingrese los datos del Super Administrador:")
        email = input("  Email: ").strip()
        password = input("  Contraseña: ").strip()
        name = input("  Nombre (opcional, presione Enter para usar 'Super Admin'): ").strip() or "Super Admin"
        
        try:
            uid = create_super_admin(email, password, name)
            print()
            print(f"✓ Super Administrador creado exitosamente")
            print(f"  UID: {uid}")
            print(f"  Email: {email}")
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            sys.exit(1)
    
    print()
    print("=" * 60)
    print("INICIALIZACIÓN COMPLETADA")
    print("=" * 60)
