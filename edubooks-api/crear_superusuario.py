#!/usr/bin/env python
"""
Script para crear un superusuario administrador con todos los permisos
"""
import os
import sys
import django
from datetime import date
import argparse

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edubooks.settings')
django.setup()

from usuarios.models import Usuario, Administrador

def crear_superusuario(email: str, username: str, password: str, force: bool = False):
    """Crea un superusuario administrador con todos los permisos.

    Args:
        email: correo del usuario a crear.
        username: nombre de usuario.
        password: contraseña.
        force: si existe, lo elimina y recrea sin pedir confirmación.
    """
    print("=== Creación de Superusuario Administrador ===\n")
    
    try:
        # Verificar si ya existe
        if Usuario.objects.filter(email=email).exists():
            if not force:
                print(f"⚠️  El usuario {email} ya existe. Use --force para reemplazarlo.")
                return False
            # Eliminar usuario existente
            Usuario.objects.filter(email=email).delete()
            print("✅ Usuario existente eliminado (modo --force)")
        
        # Crear el usuario base
        usuario = Usuario.objects.create_user(
            email=email,
            username=username,
            password=password,
            nombre="Super",
            apellido="Administrador",
            rol="administrador",
            is_active=True,
            is_staff=True,
            is_superuser=True
        )
        
        print(f"✅ Usuario creado: {usuario.email}")
        
        # Crear el perfil de administrador con todos los permisos
        perfil_admin = Administrador.objects.create(
            usuario=usuario,
            area="general",
            cargo="Super Administrador",
            nivel_acceso=4,  # Nivel máximo
            fecha_nombramiento=date.today(),
            
            # Todos los permisos habilitados
            puede_crear_usuarios=True,
            puede_modificar_usuarios=True,
            puede_eliminar_usuarios=True,
            puede_gestionar_libros=True,
            puede_gestionar_prestamos=True,
            puede_aplicar_sanciones=True,
            puede_generar_reportes=True,
            puede_configurar_sistema=True
        )
        
        print(f"✅ Perfil de administrador creado")
        print(f"   - Área: {perfil_admin.area}")
        print(f"   - Cargo: {perfil_admin.cargo}")
        print(f"   - Nivel de acceso: {perfil_admin.nivel_acceso}")
        print(f"   - Permisos activos: {perfil_admin.permisos_activos}")
        
        print(f"\n🎉 Superusuario creado exitosamente!")
        print(f"📧 Email: {email}")
        print(f"👤 Username: {username}")
        print(f"🔑 Password: {password}")
        print(f"\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creando superusuario: {e}")
        return False

def mostrar_instrucciones():
    """Muestra las instrucciones para usar el superusuario"""
    print("\n" + "="*60)
    print("📋 INSTRUCCIONES DE USO")
    print("="*60)
    print("1. Inicia el servidor Django:")
    print("   python manage.py runserver")
    print()
    print("2. Accede al panel de administración:")
    print("   http://localhost:8000/admin/")
    print()
    print("3. Usa las credenciales:")
    print("   Email: mauricio@edubooks.com")
    print("   Password: Admin123!")
    print()
    print("4. Para la API, obtén un token JWT:")
    print("   POST http://localhost:8000/api/auth/login/")
    print("   Body: {")
    print('     "email": "admin@edubooks.com",')
    print('     "password": "Admin123!"')
    print("   }")
    print()
    print("5. Usa el token en las peticiones:")
    print("   Authorization: Bearer <tu_token>")
    print("="*60)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Crear superusuario administrador')
    parser.add_argument('--email', default='admin@edubooks.com')
    parser.add_argument('--username', default='superadmin')
    parser.add_argument('--password', default='Admin123!')
    parser.add_argument('--force', action='store_true', help='Reemplaza usuario existente sin preguntar')
    args = parser.parse_args()

    success = crear_superusuario(args.email, args.username, args.password, args.force)
    if success:
        mostrar_instrucciones()
    sys.exit(0 if success else 1)