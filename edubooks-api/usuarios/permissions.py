# usuarios/permissions.py
from rest_framework import permissions

class IsAdministrador(permissions.BasePermission):
    """
    Permiso personalizado para permitir solo a usuarios con rol de Administrador.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.rol == 'Administrador'
        )

class IsDocente(permissions.BasePermission):
    """
    Permiso personalizado para permitir solo a usuarios con rol de Docente.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.rol == 'Docente'
        )

class IsEstudiante(permissions.BasePermission):
    """
    Permiso personalizado para permitir solo a usuarios con rol de Estudiante.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.rol == 'Estudiante'
        )

class IsDocenteOrAdministrador(permissions.BasePermission):
    """
    Permiso personalizado para permitir solo a Docentes y Administradores.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.rol in ['Docente', 'Administrador']
        )

class IsEstudianteOrDocente(permissions.BasePermission):
    """
    Permiso personalizado para permitir solo a Estudiantes y Docentes.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.rol in ['Estudiante', 'Docente']
        )

class IsOwnerOrAdministrador(permissions.BasePermission):
    """
    Permiso personalizado para permitir solo al propietario del objeto o a administradores.
    """
    
    def has_object_permission(self, request, view, obj):
        # Administradores pueden acceder a todo
        if request.user.rol == 'Administrador':
            return True
        
        # Verificar si el objeto tiene un campo 'usuario' y si coincide con el usuario actual
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        
        # Verificar si el objeto tiene un campo 'docente' y si coincide con el usuario actual
        if hasattr(obj, 'docente'):
            return obj.docente == request.user
        
        return False

class IsDocenteOwnerOrAdministrador(permissions.BasePermission):
    """
    Permiso personalizado para permitir solo al docente propietario o a administradores.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.rol in ['Docente', 'Administrador']
        )
    
    def has_object_permission(self, request, view, obj):
        # Administradores pueden acceder a todo
        if request.user.rol == 'Administrador':
            return True
        
        # Solo el docente propietario puede acceder
        if request.user.rol == 'Docente' and hasattr(obj, 'docente'):
            return obj.docente == request.user
        
        return False