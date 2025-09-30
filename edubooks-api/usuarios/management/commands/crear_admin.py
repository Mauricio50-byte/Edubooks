"""
Comando de gestión personalizado para crear superusuarios administradores.
Este comando permite crear superusuarios de forma segura sin hardcodear credenciales.

Uso:
    python manage.py crear_admin --email admin@institucion.edu --username admin --password MiPassword123! --nombre "Administrador Principal" --institucion "Mi Institución"
    
    O de forma interactiva:
    python manage.py crear_admin
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.db import transaction
from usuarios.models.user_models import Administrador
import getpass
import re

Usuario = get_user_model()


class Command(BaseCommand):
    help = 'Crea un superusuario administrador para el sistema Edubooks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email del administrador (debe ser institucional)',
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Nombre de usuario del administrador',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Contraseña del administrador',
        )
        parser.add_argument(
            '--nombre',
            type=str,
            help='Nombre completo del administrador',
        )
        parser.add_argument(
            '--institucion',
            type=str,
            help='Nombre de la institución',
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='No solicitar entrada interactiva',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== Creador de Superusuario Administrador ===\n')
        )

        # Obtener datos del usuario
        email = options.get('email')
        username = options.get('username')
        password = options.get('password')
        nombre = options.get('nombre')
        institucion = options.get('institucion')
        no_input = options.get('no_input', False)

        # Si no se proporcionaron argumentos, solicitar entrada interactiva
        if not no_input and not all([email, username, password, nombre, institucion]):
            self.stdout.write('Ingrese los datos del administrador:\n')
            
            if not email:
                email = input('Email institucional: ').strip()
            
            if not username:
                username = input('Nombre de usuario: ').strip()
            
            if not password:
                password = getpass.getpass('Contraseña: ')
                password_confirm = getpass.getpass('Confirmar contraseña: ')
                if password != password_confirm:
                    raise CommandError('Las contraseñas no coinciden')
            
            if not nombre:
                nombre = input('Nombre completo: ').strip()
            
            if not institucion:
                institucion = input('Nombre de la institución: ').strip()

        # Validar datos requeridos
        if not all([email, username, password, nombre, institucion]):
            raise CommandError('Todos los campos son requeridos')

        # Validaciones
        self._validar_email(email)
        self._validar_password(password)
        self._validar_username(username)

        # Verificar si ya existe un usuario con ese email o username
        if Usuario.objects.filter(email=email).exists():
            if no_input:
                raise CommandError(f'Ya existe un usuario con el email: {email}')
            
            respuesta = input(f'Ya existe un usuario con el email {email}. ¿Desea actualizarlo? (s/N): ')
            if respuesta.lower() not in ['s', 'si', 'sí', 'y', 'yes']:
                self.stdout.write(self.style.WARNING('Operación cancelada'))
                return

        if Usuario.objects.filter(username=username).exists() and not Usuario.objects.filter(email=email).exists():
            raise CommandError(f'Ya existe un usuario con el username: {username}')

        try:
            with transaction.atomic():
                # Crear o actualizar usuario
                usuario, created = Usuario.objects.get_or_create(
                    email=email,
                    defaults={
                        'username': username,
                        'nombre': nombre,
                        'rol': 'administrador',
                        'is_active': True,
                        'is_staff': True,
                        'is_superuser': True,
                        'institucion': institucion,
                    }
                )

                if not created:
                    # Actualizar usuario existente
                    usuario.username = username
                    usuario.nombre = nombre
                    usuario.rol = 'administrador'
                    usuario.is_active = True
                    usuario.is_staff = True
                    usuario.is_superuser = True
                    usuario.institucion = institucion

                # Establecer contraseña
                usuario.set_password(password)
                usuario.save()

                # Crear o actualizar perfil de administrador
                administrador, admin_created = Administrador.objects.get_or_create(
                    usuario=usuario,
                    defaults={
                        'nivel_acceso': 10,  # Máximo nivel de acceso
                        'permisos_especiales': {
                            'puede_crear_usuarios': True,
                            'puede_eliminar_usuarios': True,
                            'puede_modificar_configuracion': True,
                            'puede_ver_reportes_completos': True,
                            'puede_gestionar_sanciones': True,
                            'puede_gestionar_inventario': True,
                        }
                    }
                )

                if not admin_created:
                    administrador.nivel_acceso = 10
                    administrador.permisos_especiales = {
                        'puede_crear_usuarios': True,
                        'puede_eliminar_usuarios': True,
                        'puede_modificar_configuracion': True,
                        'puede_ver_reportes_completos': True,
                        'puede_gestionar_sanciones': True,
                        'puede_gestionar_inventario': True,
                    }
                    administrador.save()

                # Mensaje de éxito
                action = 'creado' if created else 'actualizado'
                self.stdout.write(
                    self.style.SUCCESS(f'\n✅ Superusuario administrador {action} exitosamente!')
                )
                self.stdout.write(f'📧 Email: {email}')
                self.stdout.write(f'👤 Username: {username}')
                self.stdout.write(f'🏢 Institución: {institucion}')
                self.stdout.write(f'🔑 Nivel de acceso: {administrador.nivel_acceso}')
                
                self.stdout.write(
                    self.style.WARNING('\n⚠️  IMPORTANTE:')
                )
                self.stdout.write('• Guarde estas credenciales en un lugar seguro')
                self.stdout.write('• Cambie la contraseña después del primer login')
                self.stdout.write('• Este usuario tiene acceso completo al sistema')
                
                self.stdout.write(
                    self.style.SUCCESS('\n🚀 El administrador puede acceder a:')
                )
                self.stdout.write('• Panel de administración de Django: /admin/')
                self.stdout.write('• API REST: /api/')
                self.stdout.write('• Todas las funcionalidades del sistema')

        except Exception as e:
            raise CommandError(f'Error al crear el superusuario: {str(e)}')

    def _validar_email(self, email):
        """Valida que el email tenga formato correcto y sea institucional"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise CommandError('El email no tiene un formato válido')
        
        # Verificar que sea un email institucional (común .edu, .edu.co, .ac, etc.)
        institutional_domains = ['.edu', '.edu.co', '.ac.', '.gov', '.gob']
        if not any(domain in email.lower() for domain in institutional_domains):
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  Advertencia: {email} no parece ser un email institucional'
                )
            )

    def _validar_password(self, password):
        """Valida que la contraseña cumpla con los requisitos mínimos"""
        if len(password) < 8:
            raise CommandError('La contraseña debe tener al menos 8 caracteres')
        
        if not re.search(r'[A-Z]', password):
            raise CommandError('La contraseña debe contener al menos una letra mayúscula')
        
        if not re.search(r'[a-z]', password):
            raise CommandError('La contraseña debe contener al menos una letra minúscula')
        
        if not re.search(r'\d', password):
            raise CommandError('La contraseña debe contener al menos un número')
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise CommandError('La contraseña debe contener al menos un carácter especial')

    def _validar_username(self, username):
        """Valida que el username tenga formato correcto"""
        if len(username) < 3:
            raise CommandError('El nombre de usuario debe tener al menos 3 caracteres')
        
        # Permitir cualquier carácter excepto caracteres de control
        if any(ord(char) < 32 for char in username):
            raise CommandError('El nombre de usuario no puede contener caracteres de control')