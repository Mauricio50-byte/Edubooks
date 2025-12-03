"""
Middleware de autenticación Firebase para Edubooks API v2
Verifica tokens JWT de Firebase y extrae el contexto del tenant
"""
from django.http import JsonResponse
from edubooks.firebase_config import verify_firebase_token
import logging

logger = logging.getLogger('edubooks.middleware')


class FirebaseAuthMiddleware:
    """
    Middleware que verifica el token de Firebase en cada request
    y agrega el contexto del usuario y tenant a la request.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Rutas que no requieren autenticación
        self.exempt_paths = [
            '/api/health/',
            '/api/sys/login/',
            '/admin/',
        ]
    
    def __call__(self, request):
        # Verificar si la ruta está exenta de autenticación
        if any(request.path.startswith(path) for path in self.exempt_paths):
            return self.get_response(request)
        
        # Obtener el token del header Authorization
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return JsonResponse({
                'error': 'Token de autenticación no proporcionado',
                'detail': 'Se requiere un header Authorization con formato: Bearer <token>'
            }, status=401)
        
        token = auth_header.split('Bearer ')[1]
        
        try:
            # Verificar el token con Firebase
            decoded_token = verify_firebase_token(token)
            
            # Extraer información del usuario
            uid = decoded_token.get('uid')
            email = decoded_token.get('email')
            
            # Obtener claims personalizados
            role = decoded_token.get('role', 'estudiante')
            tenant_id = decoded_token.get('tenant_id')
            
            # Agregar información del usuario al request
            request.firebase_user = {
                'uid': uid,
                'email': email,
                'role': role,
                'tenant_id': tenant_id,
                'decoded_token': decoded_token
            }
            
            # Log de acceso
            logger.debug(f"Usuario autenticado: {email} (Tenant: {tenant_id}, Role: {role})")
            
        except ValueError as e:
            return JsonResponse({
                'error': 'Token inválido',
                'detail': str(e)
            }, status=401)
        except Exception as e:
            logger.error(f"Error en autenticación: {str(e)}")
            return JsonResponse({
                'error': 'Error de autenticación',
                'detail': 'Ocurrió un error al verificar el token'
            }, status=500)
        
        response = self.get_response(request)
        return response


class TenantIsolationMiddleware:
    """
    Middleware que asegura el aislamiento de datos entre tenants.
    Verifica que el usuario solo acceda a recursos de su tenant.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Solo aplicar a usuarios autenticados (después de FirebaseAuthMiddleware)
        if hasattr(request, 'firebase_user'):
            user = request.firebase_user
            tenant_id = user.get('tenant_id')
            role = user.get('role')
            
            # Super admins pueden acceder a cualquier tenant
            if role == 'super_sys_admin':
                request.is_super_admin = True
            else:
                # Usuarios normales solo pueden acceder a su tenant
                if not tenant_id:
                    return JsonResponse({
                        'error': 'Usuario sin tenant asignado',
                        'detail': 'Este usuario no está asociado a ninguna institución'
                    }, status=403)
                
                request.is_super_admin = False
                request.tenant_id = tenant_id
        
        response = self.get_response(request)
        return response
