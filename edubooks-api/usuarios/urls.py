# usuarios/urls.py
from django.urls import path
from . import views

app_name = 'usuarios'

urlpatterns = [
    # Autenticación
    path('registro/', views.registro, name='registro'),
    path('login/', views.login, name='login'),
    path('supabase-sync/', views.supabase_sync, name='supabase-sync'),
    path('perfil/', views.perfil, name='perfil'),
    path('actualizar-perfil/', views.actualizar_perfil, name='actualizar_perfil'),
]