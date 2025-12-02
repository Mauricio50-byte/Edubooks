# usuarios/urls/main_urls.py
from django.urls import path, include
from ..views import user_views as views

app_name = 'usuarios'

urlpatterns = [
    # Autenticación
    # Autenticación basada en Firebase
    path('firebase-sync/', views.firebase_sync, name='firebase-sync'),
    path('perfil/', views.perfil, name='perfil'),
    path('actualizar-perfil/', views.actualizar_perfil, name='actualizar_perfil'),
    path('usuarios/me/', views.usuario_me, name='usuario_me'),
    path('usuarios/me/password/', views.cambiar_password, name='cambiar_password'),
    
    # Sistema de invitaciones
    path('invitaciones/', include('usuarios.urls.invitation_urls')),
    
    # Administración de usuarios
    path('admin/', include('usuarios.urls.admin_urls')),
]
