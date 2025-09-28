# edubooks/supabase_adapter.py
from django.db import models
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from .supabase_client import get_supabase_client
import logging
from typing import Any, Dict, List, Optional
import json

logger = logging.getLogger(__name__)

class SupabaseModelMixin:
    """
    Mixin que permite a los modelos de Django usar Supabase como backend
    manteniendo la sintaxis familiar del ORM de Django
    """
    
    @classmethod
    def get_table_name(cls):
        """Obtiene el nombre de la tabla en Supabase"""
        return cls._meta.db_table
    
    @classmethod
    def get_supabase_client(cls):
        """Obtiene el cliente de Supabase"""
        return get_supabase_client()
    
    def to_dict(self):
        """Convierte el modelo a diccionario para Supabase"""
        data = {}
        for field in self._meta.fields:
            value = getattr(self, field.name)
            if value is not None:
                # Convertir tipos especiales
                if isinstance(field, models.DateTimeField):
                    data[field.name] = value.isoformat() if value else None
                elif isinstance(field, models.DateField):
                    data[field.name] = value.isoformat() if value else None
                elif isinstance(field, models.JSONField):
                    data[field.name] = value if isinstance(value, (dict, list)) else json.loads(value) if value else None
                else:
                    data[field.name] = value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Crea una instancia del modelo desde un diccionario de Supabase"""
        instance = cls()
        for field in cls._meta.fields:
            if field.name in data:
                value = data[field.name]
                if value is not None:
                    # Convertir tipos especiales
                    if isinstance(field, models.DateTimeField):
                        from django.utils.dateparse import parse_datetime
                        value = parse_datetime(value) if isinstance(value, str) else value
                    elif isinstance(field, models.DateField):
                        from django.utils.dateparse import parse_date
                        value = parse_date(value) if isinstance(value, str) else value
                setattr(instance, field.name, value)
        return instance
    
    def save_to_supabase(self, **kwargs):
        """Guarda el modelo en Supabase"""
        try:
            client = self.get_supabase_client()
            table_name = self.get_table_name()
            data = self.to_dict()
            
            # Si tiene ID, es una actualización
            if hasattr(self, 'id') and self.id:
                result = client.table(table_name).update(data).eq('id', self.id).execute()
                logger.info(f"Modelo {self.__class__.__name__} actualizado en Supabase: ID {self.id}")
            else:
                # Es una inserción nueva
                result = client.table(table_name).insert(data).execute()
                if result.data and len(result.data) > 0:
                    self.id = result.data[0]['id']
                logger.info(f"Modelo {self.__class__.__name__} creado en Supabase: ID {self.id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error al guardar {self.__class__.__name__} en Supabase: {e}")
            raise
    
    def delete_from_supabase(self):
        """Elimina el modelo de Supabase"""
        try:
            if not hasattr(self, 'id') or not self.id:
                raise ValueError("No se puede eliminar un objeto sin ID")
            
            client = self.get_supabase_client()
            table_name = self.get_table_name()
            
            result = client.table(table_name).delete().eq('id', self.id).execute()
            logger.info(f"Modelo {self.__class__.__name__} eliminado de Supabase: ID {self.id}")
            return result
            
        except Exception as e:
            logger.error(f"Error al eliminar {self.__class__.__name__} de Supabase: {e}")
            raise
    
    @classmethod
    def get_from_supabase(cls, **filters):
        """Obtiene registros de Supabase con filtros"""
        try:
            client = cls.get_supabase_client()
            table_name = cls.get_table_name()
            
            query = client.table(table_name).select('*')
            
            # Aplicar filtros
            for field, value in filters.items():
                query = query.eq(field, value)
            
            result = query.execute()
            
            # Convertir a instancias del modelo
            instances = []
            for item in result.data:
                instances.append(cls.from_dict(item))
            
            return instances
            
        except Exception as e:
            logger.error(f"Error al obtener {cls.__name__} de Supabase: {e}")
            raise
    
    @classmethod
    def get_by_id_from_supabase(cls, id: int):
        """Obtiene un registro por ID de Supabase"""
        try:
            instances = cls.get_from_supabase(id=id)
            if not instances:
                raise ObjectDoesNotExist(f"{cls.__name__} con ID {id} no existe")
            if len(instances) > 1:
                raise MultipleObjectsReturned(f"Múltiples {cls.__name__} con ID {id}")
            return instances[0]
            
        except Exception as e:
            logger.error(f"Error al obtener {cls.__name__} por ID de Supabase: {e}")
            raise
    
    @classmethod
    def all_from_supabase(cls):
        """Obtiene todos los registros de Supabase"""
        try:
            client = cls.get_supabase_client()
            table_name = cls.get_table_name()
            
            result = client.table(table_name).select('*').execute()
            
            # Convertir a instancias del modelo
            instances = []
            for item in result.data:
                instances.append(cls.from_dict(item))
            
            return instances
            
        except Exception as e:
            logger.error(f"Error al obtener todos los {cls.__name__} de Supabase: {e}")
            raise
    
    @classmethod
    def count_from_supabase(cls):
        """Cuenta los registros en Supabase"""
        try:
            client = cls.get_supabase_client()
            table_name = cls.get_table_name()
            
            result = client.table(table_name).select('*', count='exact').execute()
            return result.count
            
        except Exception as e:
            logger.error(f"Error al contar {cls.__name__} en Supabase: {e}")
            raise