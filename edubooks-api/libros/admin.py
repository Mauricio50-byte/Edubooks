# libros/admin.py
from django.contrib import admin
from .models import Libro, Prestamo, Reserva, Bibliografia, Sancion

@admin.register(Libro)
class LibroAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'autor', 'categoria', 'estado', 'cantidad_disponible', 'cantidad_total']
    list_filter = ['estado', 'categoria', 'fecha_registro']
    search_fields = ['titulo', 'autor', 'isbn']
    readonly_fields = ['fecha_registro']
    
@admin.register(Prestamo)
class PrestamoAdmin(admin.ModelAdmin):
    list_display = ['libro', 'usuario', 'fecha_prestamo', 'fecha_devolucion_esperada', 'estado']
    list_filter = ['estado', 'fecha_prestamo']
    search_fields = ['libro__titulo', 'usuario__nombre', 'usuario__apellido']
    readonly_fields = ['fecha_prestamo']
    
@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ['libro', 'usuario', 'fecha_reserva', 'estado', 'fecha_expiracion']
    list_filter = ['estado', 'fecha_reserva']
    search_fields = ['libro__titulo', 'usuario__nombre', 'usuario__apellido']
    readonly_fields = ['fecha_reserva']
    
@admin.register(Bibliografia)
class BibliografiaAdmin(admin.ModelAdmin):
    list_display = ['curso', 'docente', 'fecha_creacion', 'activa']
    list_filter = ['activa', 'fecha_creacion']
    search_fields = ['curso', 'docente__nombre', 'docente__apellido']
    readonly_fields = ['fecha_creacion']
    filter_horizontal = ['libros']
    
@admin.register(Sancion)
class SancionAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'tipo', 'estado', 'monto', 'fecha_inicio', 'fecha_fin']
    list_filter = ['tipo', 'estado', 'fecha_inicio']
    search_fields = ['usuario__nombre', 'usuario__apellido']
    readonly_fields = ['fecha_inicio']
