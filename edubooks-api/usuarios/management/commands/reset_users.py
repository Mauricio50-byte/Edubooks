from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date

from usuarios.models import Usuario, Administrador


class Command(BaseCommand):
    help = "Elimina TODOS los usuarios (incluidos administradores) y crea un nuevo administrador"

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='admin@edubooks.com', help='Email del nuevo admin')
        parser.add_argument('--username', type=str, default='admin', help='Username del nuevo admin')
        parser.add_argument('--password', type=str, default='Admin123!', help='Password del nuevo admin')
        parser.add_argument('--yes', action='store_true', help='Confirmación para proceder sin preguntar')

    def handle(self, *args, **options):
        email = options['email']
        username = options['username']
        password = options['password']
        confirmed = options['yes']

        if not confirmed:
            self.stderr.write(self.style.ERROR(
                'Debe confirmar con --yes para proceder (esta acción elimina TODOS los usuarios).'
            ))
            return

        try:
            with transaction.atomic():
                total_usuarios = Usuario.objects.count()
                self.stdout.write(self.style.WARNING(f"Eliminando {total_usuarios} usuarios..."))

                # Eliminar todos los usuarios (cascade en perfiles y relaciones)
                Usuario.objects.all().delete()
                self.stdout.write(self.style.SUCCESS("Usuarios eliminados"))

                # Crear usuario administrador
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

                self.stdout.write(self.style.SUCCESS("Nuevo administrador creado"))
                self.stdout.write(f"📧 Email: {email}")
                self.stdout.write(f"👤 Username: {username}")
                self.stdout.write(f"🔑 Password: {password}")

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error durante el reseteo y creación de admin: {e}"))
            raise