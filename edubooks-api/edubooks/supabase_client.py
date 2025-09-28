# edubooks/supabase_client.py
from supabase import create_client, Client
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    """
    Cliente singleton de Supabase para Django
    """
    _instance = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            try:
                url = settings.SUPABASE_URL
                key = settings.SUPABASE_KEY
                
                if not url or not key:
                    raise ValueError("SUPABASE_URL y SUPABASE_KEY deben estar configurados en settings")
                
                self._client = create_client(url, key)
                logger.info("Cliente de Supabase inicializado correctamente")
                
            except Exception as e:
                logger.error(f"Error al inicializar cliente de Supabase: {e}")
                raise
    
    @property
    def client(self) -> Client:
        """Retorna la instancia del cliente de Supabase"""
        if self._client is None:
            self.__init__()
        return self._client
    
    def test_connection(self):
        """Prueba la conexión con Supabase"""
        try:
            # Hacer una consulta simple para probar la conexión
            result = self.client.table('usuarios').select('id').limit(1).execute()
            logger.info("Conexión con Supabase exitosa")
            return True
        except Exception as e:
            logger.error(f"Error de conexión con Supabase: {e}")
            return False

# Instancia global del cliente
supabase_client = SupabaseClient()

def get_supabase_client() -> Client:
    """
    Función helper para obtener el cliente de Supabase
    """
    return supabase_client.client