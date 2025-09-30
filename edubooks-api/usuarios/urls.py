"""
URLs principales del módulo usuarios
"""
from django.urls import path, include

# Importar las URLs de cada módulo
from .urls.main_urls import urlpatterns as main_patterns
from .urls.admin_urls import urlpatterns as admin_patterns  
from .urls.invitation_urls import urlpatterns as invitation_patterns

# Combinar todas las URLs
urlpatterns = []
urlpatterns.extend(main_patterns)
urlpatterns.extend(admin_patterns)
urlpatterns.extend(invitation_patterns)