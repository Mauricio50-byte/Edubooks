from django.urls import path
from ..views import invitation_views as views_invitaciones

app_name = 'invitaciones'

urlpatterns = [
    # Gestión de invitaciones (solo administradores)
    path('crear/', views_invitaciones.InvitacionCreateView.as_view(), name='crear_invitacion'),
    path('listar/', views_invitaciones.InvitacionListView.as_view(), name='listar_invitaciones'),
    path('detalle/<uuid:token>/', views_invitaciones.InvitacionDetailView.as_view(), name='detalle_invitacion'),
    path('cancelar/<uuid:token>/', views_invitaciones.cancelar_invitacion, name='cancelar_invitacion'),
    path('extender/<uuid:token>/', views_invitaciones.extender_invitacion, name='extender_invitacion'),
    path('reenviar/<uuid:token>/', views_invitaciones.reenviar_invitacion, name='reenviar_invitacion'),
    path('estadisticas/', views_invitaciones.estadisticas_invitaciones, name='estadisticas_invitaciones'),
    
    # Endpoints públicos para registro
    path('validar-token/', views_invitaciones.validar_token_invitacion, name='validar_token'),
    path('registro/', views_invitaciones.registro_con_invitacion, name='registro_con_invitacion'),
]