# libros/urls.py
from django.urls import path
from . import views

app_name = 'libros'

urlpatterns = [
    # URLs de Libros
    path('libros/', views.LibroListView.as_view(), name='libro-list'),
    path('libros/<int:pk>/', views.LibroDetailView.as_view(), name='libro-detail'),
    path('libros/crear/', views.LibroCreateView.as_view(), name='libro-create'),
    path('libros/<int:pk>/actualizar/', views.LibroUpdateView.as_view(), name='libro-update'),
    path('libros/<int:pk>/eliminar/', views.LibroDeleteView.as_view(), name='libro-delete'),
    path('categorias/', views.obtener_categorias, name='categorias'),
    
    # URLs de Préstamos
    path('prestamos/', views.PrestamoListView.as_view(), name='prestamo-list'),
    path('prestamos/crear/', views.PrestamoCreateView.as_view(), name='prestamo-create'),
    path('prestamos/<int:pk>/', views.PrestamoDetailView.as_view(), name='prestamo-detail'),
    path('prestamos/<int:prestamo_id>/devolver/', views.devolver_libro, name='devolver-libro'),
    path('prestamos/<int:prestamo_id>/renovar/', views.renovar_prestamo, name='renovar-prestamo'),
    
    # URLs de Reservas
    path('reservas/', views.ReservaListView.as_view(), name='reserva-list'),
    path('reservas/crear/', views.ReservaCreateView.as_view(), name='reserva-create'),
    path('reservas/<int:reserva_id>/cancelar/', views.cancelar_reserva, name='cancelar-reserva'),
    
    # URLs de Bibliografía
    path('bibliografias/', views.BibliografiaListView.as_view(), name='bibliografia-list'),
    path('bibliografias/crear/', views.BibliografiaCreateView.as_view(), name='bibliografia-create'),
    path('bibliografias/<int:pk>/', views.BibliografiaDetailView.as_view(), name='bibliografia-detail'),
    path('bibliografias/<int:pk>/actualizar/', views.BibliografiaUpdateView.as_view(), name='bibliografia-update'),
    path('bibliografias/<int:bibliografia_id>/agregar-libro/', views.agregar_libro_bibliografia, name='agregar-libro-bibliografia'),
    path('bibliografias/<int:bibliografia_id>/remover-libro/<int:libro_id>/', views.remover_libro_bibliografia, name='remover-libro-bibliografia'),
    path('programas/', views.obtener_programas, name='obtener-programas'),
    path('bibliografias/programa/<str:programa>/', views.bibliografias_por_programa, name='bibliografias-por-programa'),
    
    # URLs de Sanciones
    path('sanciones/', views.SancionListView.as_view(), name='sancion-list'),
    path('sanciones/crear/', views.SancionCreateView.as_view(), name='sancion-create'),
    path('sanciones/<int:sancion_id>/pagar/', views.pagar_multa, name='pagar-multa'),
    
    # URLs de Estadísticas y Reportes
    path('estadisticas/', views.estadisticas_biblioteca, name='estadisticas'),
    path('prestamos-vencidos/', views.prestamos_vencidos, name='prestamos-vencidos'),
    
    # URLs de Gestión de Sanciones
    path('procesar-prestamos-vencidos/', views.procesar_prestamos_vencidos, name='procesar-prestamos-vencidos'),
    path('sanciones-pendientes/', views.sanciones_pendientes, name='sanciones-pendientes'),
    path('sanciones/<int:sancion_id>/aprobar/', views.aprobar_sancion, name='aprobar-sancion'),
    path('sanciones/<int:sancion_id>/rechazar/', views.rechazar_sancion, name='rechazar-sancion'),
    path('dashboard-sanciones/', views.dashboard_sanciones, name='dashboard-sanciones'),
]