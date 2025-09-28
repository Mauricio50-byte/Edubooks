import requests
import sys
import random
import string

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Generar datos únicos para evitar conflictos
random_suffix = generate_random_string()

data = {
    "email": f"test{random_suffix}@example.com",
    "username": f"testuser{random_suffix}",
    "password": "testpassword123",
    "password_confirm": "testpassword123",
    "nombre": "Test",
    "apellido": "User",
    "rol": "Estudiante",
    "carrera": "Ingenieria",
    "matricula": f"MAT{random_suffix.upper()}"
}

print("Probando endpoint de registro con datos únicos...", flush=True)
print(f"Datos a enviar: {data}", flush=True)
sys.stdout.flush()

print("Enviando solicitud...", flush=True)
sys.stdout.flush()

try:
    response = requests.post(
        'http://127.0.0.1:8000/api/auth/registro/',
        json=data,
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    
    print(f"Status Code: {response.status_code}", flush=True)
    print(f"Response: {response.text}", flush=True)
    sys.stdout.flush()
    
except Exception as e:
    print(f"Error en la solicitud: {e}", flush=True)
    sys.stdout.flush()

print("Prueba completada.", flush=True)
sys.stdout.flush()