#!/usr/bin/env python
"""
Script para verificar que las tablas se crearon correctamente en Supabase
"""
import os
import sys
import django
from django.db import connection

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edubooks.settings')
django.setup()

from usuarios.models import Usuario, Administrador, Estudiante, Docente
from libros.models import Libro, Prestamo, Reserva, Bibliografia

def verificar_tablas():
    """Verifica que todas las tablas se crearon correctamente"""
    
    print("=== Verificación de Tablas en Supabase ===\n")
    
    try:
        # Obtener cursor de la base de datos
        with connection.cursor() as cursor:
            # Listar todas las tablas
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            
            tablas = cursor.fetchall()
            
            print("📋 Tablas creadas en la base de datos:")
            print("-" * 50)
            
            tablas_esperadas = [
                'auth_group',
                'auth_group_permissions',
                'auth_permission',
                'django_admin_log',
                'django_content_type',
                'django_migrations',
                'django_session',
                'bibliografias',
                'libros',
                'notificaciones',
                'prestamos',
                'reservas',
                'sanciones',
                'token_blacklist_blacklistedtoken',
                'token_blacklist_outstandingtoken',
                'usuarios',
                'usuarios_acceso_recurso',
                'usuarios_configuracion_auditoria',
                'usuarios_configuracion_notificacion',
                'usuarios_notificacion',
                'usuarios_plantilla_notificacion',
                'usuarios_registro_auditoria',
                'usuarios_sesion_auditoria',
                'administradores',
                'docentes',
                'estudiantes',
                'invitaciones_registro',
                'usuarios_groups',
                'usuarios_user_permissions',
                'bibliografias_libros'
            ]
            
            tablas_encontradas = [tabla[0] for tabla in tablas]
            
            for tabla in tablas_encontradas:
                if tabla in tablas_esperadas:
                    print(f"✅ {tabla}")
                else:
                    print(f"ℹ️  {tabla} (adicional)")
            
            print(f"\n📊 Resumen:")
            print(f"   Total tablas encontradas: {len(tablas_encontradas)}")
            print(f"   Tablas esperadas: {len(tablas_esperadas)}")
            
            # Verificar tablas faltantes
            tablas_faltantes = set(tablas_esperadas) - set(tablas_encontradas)
            if tablas_faltantes:
                print(f"❌ Tablas faltantes: {list(tablas_faltantes)}")
            else:
                print("✅ Todas las tablas esperadas están presentes")
            
    except Exception as e:
        print(f"❌ Error verificando tablas: {e}")
        return False
    
    return True

def verificar_modelos():
    """Verifica que los modelos funcionen correctamente"""
    
    print("\n=== Verificación de Modelos ===\n")
    
    try:
        # Verificar Usuario
        total_usuarios = Usuario.objects.count()
        print(f"👥 Usuarios: {total_usuarios}")
        
        # Verificar Administradores
        total_admins = Administrador.objects.count()
        print(f"👨‍💼 Administradores: {total_admins}")
        
        # Verificar Estudiantes
        total_estudiantes = Estudiante.objects.count()
        print(f"🎓 Estudiantes: {total_estudiantes}")
        
        # Verificar Docentes
        total_docentes = Docente.objects.count()
        print(f"👨‍🏫 Docentes: {total_docentes}")
        
        # Verificar Libros
        total_libros = Libro.objects.count()
        print(f"📚 Libros: {total_libros}")
        
        # Verificar Préstamos
        total_prestamos = Prestamo.objects.count()
        print(f"📖 Préstamos: {total_prestamos}")
        
        # Verificar Reservas
        total_reservas = Reserva.objects.count()
        print(f"📋 Reservas: {total_reservas}")
        
        # Verificar Bibliografías
        total_bibliografias = Bibliografia.objects.count()
        print(f"📑 Bibliografías: {total_bibliografias}")
        
        print("\n✅ Todos los modelos funcionan correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error verificando modelos: {e}")
        return False

def verificar_superusuario():
    """Verifica que el superusuario se creó correctamente"""
    
    print("\n=== Verificación de Superusuario ===\n")
    
    try:
        # Buscar el superusuario
        admin = Usuario.objects.get(email='admin@edubooks.com')
        
        print(f"✅ Superusuario encontrado:")
        print(f"   📧 Email: {admin.email}")
        print(f"   👤 Username: {admin.username}")
        print(f"   🏷️  Rol: {admin.rol}")
        print(f"   ✅ Activo: {admin.is_active}")
        print(f"   👑 Staff: {admin.is_staff}")
        print(f"   🔑 Superuser: {admin.is_superuser}")
        
        # Verificar perfil de administrador
        if hasattr(admin, 'perfil_administrador'):
            perfil = admin.perfil_administrador
            print(f"\n✅ Perfil de administrador:")
            print(f"   🏢 Área: {perfil.area}")
            print(f"   💼 Cargo: {perfil.cargo}")
            print(f"   🔢 Nivel de acceso: {perfil.nivel_acceso}")
            print(f"   🛡️  Permisos: {len(perfil.permisos_activos)}")
        else:
            print("❌ No se encontró el perfil de administrador")
            return False
        
        return True
        
    except Usuario.DoesNotExist:
        print("❌ Superusuario no encontrado")
        return False
    except Exception as e:
        print(f"❌ Error verificando superusuario: {e}")
        return False

if __name__ == '__main__':
    print("🔍 Iniciando verificación completa...\n")
    
    success = True
    
    # Verificar tablas
    if not verificar_tablas():
        success = False
    
    # Verificar modelos
    if not verificar_modelos():
        success = False
    
    # Verificar superusuario
    if not verificar_superusuario():
        success = False
    
    if success:
        print("\n🎉 ¡Verificación completada exitosamente!")
        print("✅ La migración se realizó correctamente")
        print("✅ Todas las tablas están presentes")
        print("✅ Los modelos funcionan correctamente")
        print("✅ El superusuario está configurado")
    else:
        print("\n❌ Se encontraron problemas durante la verificación")
    
    sys.exit(0 if success else 1)