#!/usr/bin/env python
"""
Script de prueba para verificar el funcionamiento básico de la API de EduBooks
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edubooks.settings')
django.setup()

from usuarios.models import Usuario
from libros.models import Libro, Prestamo

class APITester:
    def __init__(self, base_url='http://localhost:8000/api'):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        
    def test_connection(self):
        """Probar conexión básica al servidor"""
        try:
            response = requests.get(f'{self.base_url}/', timeout=5)
            print(f"✅ Conexión al servidor: OK (Status: {response.status_code})")
            return True
        except requests.exceptions.ConnectionError:
            print("❌ Error: No se puede conectar al servidor. ¿Está ejecutándose?")
            return False
        except Exception as e:
            print(f"❌ Error de conexión: {e}")
            return False
    
    def test_database_connection(self):
        """Probar conexión a la base de datos"""
        try:
            # Intentar hacer una consulta simple
            count = Usuario.objects.count()
            print(f"✅ Conexión a base de datos: OK ({count} usuarios registrados)")
            return True
        except Exception as e:
            print(f"❌ Error de base de datos: {e}")
            return False
    
    def test_user_registration(self):
        """Probar registro de usuario"""
        test_user = {
            'email': 'test@edubooks.com',
            'username': 'testuser',
            'nombre': 'Usuario',
            'apellido': 'Prueba',
            'rol': 'Estudiante',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'carrera': 'Ingeniería de Sistemas',
            'matricula': 'TEST001'
        }
        
        try:
            # Eliminar usuario de prueba si existe
            Usuario.objects.filter(email=test_user['email']).delete()
            
            response = requests.post(
                f'{self.base_url}/auth/registro/',
                json=test_user,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 201:
                print("✅ Registro de usuario: OK")
                return True
            else:
                print(f"❌ Error en registro: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error en registro: {e}")
            return False
    
    def test_user_login(self):
        """Probar inicio de sesión"""
        login_data = {
            'email': 'test@edubooks.com',
            'password': 'testpass123'
        }
        
        try:
            response = requests.post(
                f'{self.base_url}/auth/login/',
                json=login_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get('tokens', {}).get('access')
                print("✅ Inicio de sesión: OK")
                return True
            else:
                print(f"❌ Error en login: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error en login: {e}")
            return False
    
    def test_authenticated_request(self):
        """Probar request autenticado"""
        if not self.access_token:
            print("❌ No hay token de acceso para probar")
            return False
            
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f'{self.base_url}/libros/',
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                count = data.get('count', 0)
                print(f"✅ Request autenticado: OK ({count} libros encontrados)")
                return True
            else:
                print(f"❌ Error en request autenticado: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error en request autenticado: {e}")
            return False
    
    def test_cors_headers(self):
        """Probar configuración CORS"""
        try:
            response = requests.options(
                f'{self.base_url}/libros/',
                headers={
                    'Origin': 'http://localhost:8100',
                    'Access-Control-Request-Method': 'GET'
                }
            )
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if any(cors_headers.values()):
                print("✅ Configuración CORS: OK")
                return True
            else:
                print("❌ Configuración CORS: No configurado")
                return False
                
        except Exception as e:
            print(f"❌ Error probando CORS: {e}")
            return False
    
    def cleanup(self):
        """Limpiar datos de prueba"""
        try:
            Usuario.objects.filter(email='test@edubooks.com').delete()
            print("🧹 Limpieza completada")
        except Exception as e:
            print(f"⚠️ Error en limpieza: {e}")
    
    def run_all_tests(self):
        """Ejecutar todas las pruebas"""
        print("🚀 Iniciando pruebas de la API EduBooks...\n")
        
        tests = [
            ('Conexión al servidor', self.test_connection),
            ('Conexión a base de datos', self.test_database_connection),
            ('Registro de usuario', self.test_user_registration),
            ('Inicio de sesión', self.test_user_login),
            ('Request autenticado', self.test_authenticated_request),
            ('Configuración CORS', self.test_cors_headers)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🔍 Probando: {test_name}")
            if test_func():
                passed += 1
            
        print(f"\n📊 Resultados: {passed}/{total} pruebas pasaron")
        
        if passed == total:
            print("🎉 ¡Todas las pruebas pasaron! El sistema está funcionando correctamente.")
        else:
            print("⚠️ Algunas pruebas fallaron. Revisa la configuración.")
        
        self.cleanup()
        return passed == total

if __name__ == '__main__':
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)