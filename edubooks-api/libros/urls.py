# libros/urls.py
from django.urls import path
from django.conf import settings
from . import views

app_name = 'libros'

urlpatterns = []

# RTDB Firebase
urlpatterns += [
    path('rt/libros/', views.rt_libros_list, name='rt-libros-list'),
    path('rt/libros/crear/', views.rt_libros_create, name='rt-libros-create'),
    path('rt/libros/<str:libro_id>/actualizar/', views.rt_libros_update, name='rt-libros-update'),
    path('rt/libros/<str:libro_id>/eliminar/', views.rt_libros_delete, name='rt-libros-delete'),
    path('rt/prestamos/crear/', views.rt_prestamos_create, name='rt-prestamos-create'),
    path('rt/prestamos/', views.rt_prestamos_list, name='rt-prestamos-list'),
    path('rt/reservas/crear/', views.rt_reservas_create, name='rt-reservas-create'),
    path('rt/reservas/', views.rt_reservas_list, name='rt-reservas-list'),
    path('rt/prestamos/<str:prestamo_id>/devolver/', views.rt_prestamo_devolver, name='rt-prestamo-devolver'),
    path('rt/entidades/<str:entidad_id>/libros/', views.rt_entidad_libros_list, name='rt-entidad-libros-list'),
    path('rt/entidades/<str:entidad_id>/libros/crear/', views.rt_entidad_libros_create, name='rt-entidad-libros-create'),
    path('rt/entidades/<str:entidad_id>/libros/<str:libro_id>/actualizar/', views.rt_entidad_libros_update, name='rt-entidad-libros-update'),
    path('rt/entidades/<str:entidad_id>/libros/<str:libro_id>/eliminar/', views.rt_entidad_libros_delete, name='rt-entidad-libros-delete'),
    path('rt/entidades/<str:entidad_id>/prestamos/crear/', views.rt_entidad_prestamos_create, name='rt-entidad-prestamos-create'),
    path('rt/entidades/<str:entidad_id>/prestamos/<str:prestamo_id>/devolver/', views.rt_entidad_prestamo_devolver, name='rt-entidad-prestamo-devolver'),
    path('rt/entidades/<str:entidad_id>/reservas/crear/', views.rt_entidad_reservas_create, name='rt-entidad-reservas-create'),
    path('rt/entidades/<str:entidad_id>/sanciones/', views.rt_entidad_sanciones_list, name='rt-entidad-sanciones-list'),
    path('rt/entidades/<str:entidad_id>/bibliografias/', views.rt_entidad_bibliografias_list, name='rt-entidad-bibliografias-list'),
    path('rt/entidades/<str:entidad_id>/bibliografias/crear/', views.rt_entidad_bibliografias_create, name='rt-entidad-bibliografias-create'),
    path('rt/entidades/<str:entidad_id>/bibliografias/<str:bibliografia_id>/', views.rt_entidad_bibliografias_get, name='rt-entidad-bibliografias-get'),
    path('rt/entidades/<str:entidad_id>/bibliografias/<str:bibliografia_id>/actualizar/', views.rt_entidad_bibliografias_update, name='rt-entidad-bibliografias-update'),
    path('rt/entidades/<str:entidad_id>/bibliografias/<str:bibliografia_id>/agregar-libro/', views.rt_entidad_bibliografia_agregar_libro, name='rt-entidad-bibliografia-agregar-libro'),
    path('rt/entidades/<str:entidad_id>/bibliografias/<str:bibliografia_id>/remover-libro/<str:libro_id>/', views.rt_entidad_bibliografia_remover_libro, name='rt-entidad-bibliografia-remover-libro'),
    path('rt/entidades/<str:entidad_id>/programas/', views.rt_entidad_programas, name='rt-entidad-programas'),
    path('rt/entidades/<str:entidad_id>/estadisticas/', views.rt_entidad_estadisticas, name='rt-entidad-estadisticas'),
]

# Notificaciones (siguen disponibles)
urlpatterns += [
    path('notificaciones/', views.obtener_notificaciones, name='obtener-notificaciones'),
    path('notificaciones/<int:notificacion_id>/marcar-leida/', views.marcar_notificacion_leida, name='marcar-notificacion-leida'),
    path('notificaciones/marcar-todas-leidas/', views.marcar_todas_leidas, name='marcar-todas-leidas'),
]

# Endpoints basados en ORM togglables
if settings.USE_RELATIONAL_API:
    urlpatterns += [
        path('libros/', views.LibroListView.as_view(), name='libro-list'),
        path('libros/<int:pk>/', views.LibroDetailView.as_view(), name='libro-detail'),
        path('libros/crear/', views.LibroCreateView.as_view(), name='libro-create'),
        path('libros/<int:pk>/actualizar/', views.LibroUpdateView.as_view(), name='libro-update'),
        path('libros/<int:pk>/eliminar/', views.LibroDeleteView.as_view(), name='libro-delete'),
        path('categorias/', views.obtener_categorias, name='categorias'),
        path('google-books/imagen/', views.obtener_imagen_google_books, name='google-books-imagen'),
        path('google-books/buscar/', views.buscar_libros_google_books, name='google-books-buscar'),
        path('google-books/buscar-isbn/', views.buscar_libro_por_isbn, name='google-books-buscar-isbn'),
        path('google-books/buscar-titulo/', views.buscar_libro_por_titulo, name='google-books-buscar-titulo'),
        path('prestamos/', views.PrestamoListView.as_view(), name='prestamo-list'),
        path('prestamos/crear/', views.PrestamoCreateView.as_view(), name='prestamo-create'),
        path('prestamos/<int:pk>/', views.PrestamoDetailView.as_view(), name='prestamo-detail'),
        path('prestamos/<int:prestamo_id>/devolver/', views.devolver_libro, name='devolver-libro'),
        path('prestamos/<int:prestamo_id>/renovar/', views.renovar_prestamo, name='renovar-prestamo'),
        path('prestamos/solicitudes-pendientes/', views.solicitudes_pendientes, name='solicitudes-pendientes'),
        path('prestamos/<int:prestamo_id>/aprobar/', views.aprobar_prestamo, name='aprobar-prestamo'),
        path('prestamos/<int:prestamo_id>/rechazar/', views.rechazar_prestamo, name='rechazar-prestamo'),
        path('reservas/', views.ReservaListView.as_view(), name='reserva-list'),
        path('reservas/crear/', views.ReservaCreateView.as_view(), name='reserva-create'),
        path('reservas/<int:reserva_id>/cancelar/', views.cancelar_reserva, name='cancelar-reserva'),
        path('bibliografias/', views.BibliografiaListView.as_view(), name='bibliografia-list'),
        path('bibliografias/crear/', views.BibliografiaCreateView.as_view(), name='bibliografia-create'),
        path('bibliografias/<int:pk>/', views.BibliografiaDetailView.as_view(), name='bibliografia-detail'),
        path('bibliografias/<int:pk>/actualizar/', views.BibliografiaUpdateView.as_view(), name='bibliografia-update'),
        path('bibliografias/<int:bibliografia_id>/agregar-libro/', views.agregar_libro_bibliografia, name='agregar-libro-bibliografia'),
        path('bibliografias/<int:bibliografia_id>/remover-libro/<int:libro_id>/', views.remover_libro_bibliografia, name='remover-libro-bibliografia'),
        path('programas/', views.obtener_programas, name='obtener-programas'),
        path('bibliografias/programa/<str:programa>/', views.bibliografias_por_programa, name='bibliografias-por-programa'),
        path('sanciones/', views.SancionListView.as_view(), name='sancion-list'),
        path('sanciones/crear/', views.SancionCreateView.as_view(), name='sancion-create'),
        path('sanciones/<int:sancion_id>/pagar/', views.pagar_multa, name='pagar-multa'),
        path('estadisticas/', views.estadisticas_biblioteca, name='estadisticas'),
        path('prestamos-vencidos/', views.prestamos_vencidos, name='prestamos-vencidos'),
        path('procesar-prestamos-vencidos/', views.procesar_prestamos_vencidos, name='procesar-prestamos-vencidos'),
        path('sanciones-pendientes/', views.sanciones_pendientes, name='sanciones-pendientes'),
        path('sanciones/<int:sancion_id>/aprobar/', views.aprobar_sancion, name='aprobar-sancion'),
        path('sanciones/<int:sancion_id>/rechazar/', views.rechazar_sancion, name='rechazar-sancion'),
        path('dashboard-sanciones/', views.dashboard_sanciones, name='dashboard-sanciones'),
    ]
