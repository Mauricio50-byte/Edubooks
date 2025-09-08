# usuarios/urls.py
from django.urls import path
from . import views

app_name = 'usuarios'

urlpatterns = [
    path('registro/', views.RegistroView.as_view(), name='registro'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('perfil/', views.perfil_view, name='perfil'),
    path('actualizar-perfil/', views.actualizar_perfil_view, name='actualizar_perfil'),
]

# edubooks/urls.py (URLs principales)
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
]