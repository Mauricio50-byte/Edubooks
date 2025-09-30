from django.urls import path
from ..views import admin_views as views_admin

app_name = 'usuarios_admin'

urlpatterns = [
    # Gestión general de usuarios
    path('usuarios/', views_admin.UsuarioListCreateView.as_view(), name='usuario-list-create'),
    path('usuarios/<int:pk>/', views_admin.UsuarioDetailView.as_view(), name='usuario-detail'),
    
    # Acciones administrativas sobre usuarios
    path('usuarios/<int:usuario_id>/sancion/', views_admin.aplicar_sancion, name='aplicar-sancion'),
    path('usuarios/<int:usuario_id>/multa/', views_admin.aplicar_multa, name='aplicar-multa'),
    path('usuarios/<int:usuario_id>/pago-multa/', views_admin.registrar_pago_multa, name='pago-multa'),
    path('usuarios/<int:usuario_id>/estado/', views_admin.cambiar_estado_usuario, name='cambiar-estado'),
    
    # Consultas y reportes
    path('estadisticas/', views_admin.estadisticas_usuarios, name='estadisticas'),
    path('usuarios/rol/<str:rol>/', views_admin.usuarios_por_rol, name='usuarios-por-rol'),
    path('exportar/', views_admin.exportar_usuarios, name='exportar-usuarios'),
]