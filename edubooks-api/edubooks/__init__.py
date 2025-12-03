"""
Inicialización de la aplicación Edubooks
"""
# Inicializar Firebase al cargar la aplicación
from .firebase_config import initialize_firebase

# Inicializar Firebase
try:
    initialize_firebase()
except Exception as e:
    import logging
    logger = logging.getLogger('edubooks')
    logger.warning(f"No se pudo inicializar Firebase al inicio: {str(e)}")
    logger.warning("Firebase se inicializará en la primera petición")
