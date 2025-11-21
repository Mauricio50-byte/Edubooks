"""
URLs para el sistema de inicialización de superusuarios.
"""

from django.urls import path
from usuarios.views.setup_views import (
    inicializar_sistema,
    verificar_inicializacion,
    estado_sistema
)

urlpatterns = [
    # Endpoint para inicializar el sistema (crear primer superusuario)
    path('inicializar/', inicializar_sistema, name='inicializar_sistema'),
    
    # Endpoint para verificar si el sistema ya fue inicializado
    path('verificar/', verificar_inicializacion, name='verificar_inicializacion'),
    
    # Endpoint para obtener el estado general del sistema
    path('estado/', estado_sistema, name='estado_sistema'),

    
]
