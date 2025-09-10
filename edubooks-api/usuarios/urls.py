# usuarios/urls.py
from django.urls import path
from . import views

app_name = 'usuarios'

urlpatterns = [
    # Autenticación
    path('registro/', views.RegistroView.as_view(), name='registro'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('perfil/', views.perfil_view, name='perfil'),
    path('actualizar-perfil/', views.actualizar_perfil_view, name='actualizar_perfil'),
    
    # Administración de usuarios
    path('usuarios/', views.UsuarioListView.as_view(), name='usuario-list'),
    path('usuarios/<int:usuario_id>/cambiar-estado/', views.cambiar_estado_usuario, name='cambiar-estado-usuario'),
    path('estadisticas/', views.estadisticas_usuarios, name='estadisticas-usuarios'),
]