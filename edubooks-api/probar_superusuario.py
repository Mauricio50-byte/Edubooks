#!/usr/bin/env python
"""
Script para probar el acceso del superusuario administrador
"""
import os
import sys
import django
import requests
import json

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edubooks.settings')
django.setup()

from django.contrib.auth import authenticate
from usuarios.models import Usuario, Administrador

def probar_autenticacion_local():
    """Probar autenticación local con Django"""
    print("=== Prueba de Autenticación Local ===")
    
    try:
        # Verificar que el usuario existe
        try:
            usuario = Usuario.objects.get(username='superadmin')
            print(f"✅ Usuario encontrado: {usuario.username}")
            print(f"   📧 Email: {usuario.email}")
            print(f"   🔑 Es superusuario: {usuario.is_superuser}")
            print(f"   👑 Es staff: {usuario.is_staff}")
            print(f"   ✅ Está activo: {usuario.is_active}")
        except Usuario.DoesNotExist:
            print("❌ Usuario 'superadmin' no encontrado")
            return
        
        # Intentar autenticar con las credenciales del superusuario
        user = authenticate(username='superadmin', password='Admin123!')
        
        if user:
            print("✅ Autenticación exitosa")
            
            # Verificar perfil de administrador
            try:
                admin_profile = Administrador.objects.get(usuario=user)
                print(f"   🏢 Área: {admin_profile.area}")
                print(f"   💼 Cargo: {admin_profile.cargo}")
                print(f"   🔢 Nivel de acceso: {admin_profile.nivel_acceso}")
                print(f"   🛡️  Permisos: {admin_profile.permisos}")
            except Administrador.DoesNotExist:
                print("   ❌ No se encontró perfil de administrador")
                
        else:
            print("❌ Autenticación fallida - verificar contraseña")
            # Intentar con email también
            user_email = authenticate(username='admin@edubooks.com', password='Admin123!')
            if user_email:
                print("✅ Autenticación exitosa con email")
            else:
                print("❌ Autenticación fallida también con email")
            
    except Exception as e:
        print(f"❌ Error en autenticación local: {e}")

def probar_api_login():
    """Probar login a través de la API"""
    print("\n=== Prueba de Login API ===")
    
    try:
        # URL del endpoint de login
        login_url = "http://127.0.0.1:8000/api/auth/login/"
        
        # Datos de login
        login_data = {
            "email": "admin@edubooks.com",
            "password": "Admin123!"
        }
        
        # Realizar petición POST
        response = requests.post(login_url, json=login_data)
        
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login API exitoso")
            
            # Mostrar estructura de respuesta para debug
            print(f"   📄 Estructura de respuesta: {list(data.keys())}")
            
            # Buscar tokens en diferentes posibles ubicaciones
            access_token = None
            refresh_token = None
            
            # Verificar si los tokens están en un objeto 'tokens'
            if 'tokens' in data and isinstance(data['tokens'], dict):
                tokens = data['tokens']
                access_token = tokens.get('access') or tokens.get('access_token') or tokens.get('token')
                refresh_token = tokens.get('refresh') or tokens.get('refresh_token')
            else:
                # Buscar directamente en la respuesta
                access_token = data.get('access') or data.get('access_token') or data.get('token')
                refresh_token = data.get('refresh') or data.get('refresh_token')
            
            if access_token:
                print(f"   🔑 Access Token: {access_token[:50]}...")
            else:
                print("   ❌ No se encontró access token en la respuesta")
                print(f"   📄 Respuesta completa: {json.dumps(data, indent=2)}")
                
            if refresh_token:
                print(f"   🔄 Refresh Token: {refresh_token[:50]}...")
            else:
                print("   ❌ No se encontró refresh token en la respuesta")
            
            # Guardar token para pruebas posteriores
            return access_token
            
        else:
            print("❌ Login API fallido")
            print(f"   📄 Respuesta: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error de conexión - Asegúrate de que el servidor esté ejecutándose")
    except Exception as e:
        print(f"❌ Error en login API: {e}")
        
    return None

def probar_endpoints_protegidos(token):
    """Probar acceso a endpoints protegidos"""
    if not token:
        print("\n❌ No hay token disponible para probar endpoints protegidos")
        return
        
    print("\n=== Prueba de Endpoints Protegidos ===")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Lista de endpoints para probar
    endpoints = [
        ("GET", "/api/usuarios/", "Lista de usuarios"),
        ("GET", "/api/usuarios/perfil/", "Perfil del usuario actual"),
        ("GET", "/api/libros/", "Lista de libros"),
        ("GET", "/api/admin/dashboard/", "Dashboard administrativo"),
    ]
    
    for method, endpoint, description in endpoints:
        try:
            url = f"http://127.0.0.1:8000{endpoint}"
            
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json={})
                
            print(f"📡 {method} {endpoint} ({description})")
            print(f"   📊 Status: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Acceso autorizado")
            elif response.status_code == 401:
                print("   🔒 No autorizado")
            elif response.status_code == 403:
                print("   🚫 Prohibido")
            elif response.status_code == 404:
                print("   🔍 Endpoint no encontrado")
            else:
                print(f"   ❓ Respuesta inesperada: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Error de conexión en {endpoint}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

def main():
    """Función principal"""
    print("🧪 PRUEBA DE SUPERUSUARIO ADMINISTRADOR")
    print("=" * 50)
    
    # 1. Probar autenticación local
    probar_autenticacion_local()
    
    # 2. Probar login API
    token = probar_api_login()
    
    # 3. Probar endpoints protegidos
    probar_endpoints_protegidos(token)
    
    print("\n" + "=" * 50)
    print("🎉 Pruebas completadas")
    
    if token:
        print("\n📋 CREDENCIALES DEL SUPERUSUARIO:")
        print("   📧 Email: admin@edubooks.com")
        print("   👤 Username: superadmin")
        print("   🔑 Password: Admin123!")
        print("\n🌐 ACCESOS DISPONIBLES:")
        print("   🖥️  Django Admin: http://127.0.0.1:8000/admin/")
        print("   🔗 API Base: http://127.0.0.1:8000/api/")
        print("   📚 Documentación API: http://127.0.0.1:8000/api/docs/")

if __name__ == "__main__":
    main()