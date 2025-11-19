#!/usr/bin/env python
import os
import sys
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edubooks.settings')
django.setup()

from usuarios.models import Usuario, Administrador

def run():
    email = 'mauro@edubooks.com'
    username = 'mauro'
    password = 'mauro0109'
    try:
        Usuario.objects.filter(email=email).delete()
        usuario = Usuario.objects.create_user(
            email=email,
            username=username,
            password=password,
            nombre='Super',
            apellido='Administrador',
            rol='administrador',
            is_active=True,
            is_staff=True,
            is_superuser=True
        )
        Administrador.objects.create(
            usuario=usuario,
            area='general',
            cargo='Super Administrador',
            nivel_acceso=4,
            fecha_nombramiento=date.today(),
            puede_crear_usuarios=True,
            puede_modificar_usuarios=True,
            puede_eliminar_usuarios=True,
            puede_gestionar_libros=True,
            puede_gestionar_prestamos=True,
            puede_aplicar_sanciones=True,
            puede_generar_reportes=True,
            puede_configurar_sistema=True
        )
        print('OK')
        sys.exit(0)
    except Exception as e:
        print(f'ERROR: {e}')
        sys.exit(1)

if __name__ == '__main__':
    run()