#!/usr/bin/env python
"""
Script para verificar la configuración de Django y Supabase
"""

import os
import sys
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edubooks.settings')

try:
    django.setup()
    print("✅ Django configurado correctamente")
except Exception as e:
    print(f"❌ Error configurando Django: {e}")
    sys.exit(1)

# Verificar configuración de base de datos
from django.conf import settings

db_config = settings.DATABASES['default']
print(f"🔗 Host: {db_config['HOST']}")
print(f"📊 Base de datos: {db_config['NAME']}")
print(f"👤 Usuario: {db_config['USER']}")
print(f"🔌 Puerto: {db_config['PORT']}")

# Verificar importación de modelos
try:
    from usuarios.models import Usuario
    from libros.models import Libro, Prestamo, Reserva, Bibliografia, Sancion, Notificacion
    print("✅ Todos los modelos importados correctamente")
    
    # Mostrar información de los modelos
    print(f"📋 Modelo Usuario: {Usuario._meta.db_table}")
    print(f"📚 Modelo Libro: {Libro._meta.db_table}")
    print(f"📖 Modelo Prestamo: {Prestamo._meta.db_table}")
    print(f"📝 Modelo Reserva: {Reserva._meta.db_table}")
    print(f"📑 Modelo Bibliografia: {Bibliografia._meta.db_table}")
    print(f"⚠️ Modelo Sancion: {Sancion._meta.db_table}")
    print(f"🔔 Modelo Notificacion: {Notificacion._meta.db_table}")
    
except Exception as e:
    print(f"❌ Error importando modelos: {e}")
    sys.exit(1)

print("\n🎉 ¡Configuración verificada exitosamente!")
print("Tu aplicación está lista para conectarse a Supabase.")