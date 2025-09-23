#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edubooks.settings')
django.setup()

from libros.models import Prestamo
from datetime import date, timedelta
from django.utils import timezone

def fix_prestamos():
    print("Corrigiendo préstamos...")
    
    # Obtener todos los préstamos
    prestamos = Prestamo.objects.all()
    print(f"Total de préstamos encontrados: {prestamos.count()}")
    
    for prestamo in prestamos:
        print(f"\nPréstamo ID: {prestamo.id}")
        print(f"Estado: {prestamo.estado}")
        print(f"Fecha devolución esperada: {prestamo.fecha_devolucion_esperada}")
        print(f"Usuario: {prestamo.usuario.nombre if prestamo.usuario else 'N/A'}")
        print(f"Libro: {prestamo.libro.titulo if prestamo.libro else 'N/A'}")
        
        # Si es un préstamo activo sin fecha de devolución esperada, establecerla
        if prestamo.estado == 'Activo' and not prestamo.fecha_devolucion_esperada:
            prestamo.fecha_devolucion_esperada = date.today() + timedelta(days=15)
            prestamo.save()
            print(f"✅ Fecha de devolución establecida: {prestamo.fecha_devolucion_esperada}")
        
        # Si es un préstamo activo sin fecha de aprobación, establecerla
        if prestamo.estado == 'Activo' and not prestamo.fecha_aprobacion:
            prestamo.fecha_aprobacion = timezone.now()
            prestamo.save()
            print(f"✅ Fecha de aprobación establecida: {prestamo.fecha_aprobacion}")
    
    print("\n=== Resumen final ===")
    pendientes = Prestamo.objects.filter(estado='Pendiente').count()
    activos = Prestamo.objects.filter(estado='Activo').count()
    devueltos = Prestamo.objects.filter(estado='Devuelto').count()
    vencidos = Prestamo.objects.filter(estado='Vencido').count()
    rechazados = Prestamo.objects.filter(estado='Rechazado').count()
    
    print(f"Pendientes: {pendientes}")
    print(f"Activos: {activos}")
    print(f"Devueltos: {devueltos}")
    print(f"Vencidos: {vencidos}")
    print(f"Rechazados: {rechazados}")
    
    print("\n=== Préstamos pendientes (para administrador) ===")
    solicitudes_pendientes = Prestamo.objects.filter(estado='Pendiente')
    for solicitud in solicitudes_pendientes:
        print(f"ID: {solicitud.id} - {solicitud.usuario.nombre} {solicitud.usuario.apellido} - {solicitud.libro.titulo}")

if __name__ == '__main__':
    fix_prestamos()