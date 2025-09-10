# libros/views.py
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from .models import Libro, Prestamo, Reserva, Bibliografia, Sancion
from .serializers import (
    LibroSerializer, LibroDetalleSerializer, LibroListSerializer,
    PrestamoSerializer, PrestamoListSerializer,
    ReservaSerializer, ReservaListSerializer,
    BibliografiaSerializer, SancionSerializer
)
from usuarios.permissions import IsAdministrador, IsDocente, IsEstudiante

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

# ============ VISTAS DE LIBROS ============

class LibroListView(generics.ListAPIView):
    """Lista y búsqueda de libros en el catálogo"""
    serializer_class = LibroListSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Libro.objects.all()
        
        # Filtros de búsqueda
        titulo = self.request.query_params.get('titulo', None)
        autor = self.request.query_params.get('autor', None)
        categoria = self.request.query_params.get('categoria', None)
        isbn = self.request.query_params.get('isbn', None)
        disponible = self.request.query_params.get('disponible', None)
        
        if titulo:
            queryset = queryset.filter(titulo__icontains=titulo)
        if autor:
            queryset = queryset.filter(autor__icontains=autor)
        if categoria:
            queryset = queryset.filter(categoria__icontains=categoria)
        if isbn:
            queryset = queryset.filter(isbn__icontains=isbn)
        if disponible == 'true':
            queryset = queryset.filter(cantidad_disponible__gt=0)
        
        return queryset.order_by('titulo')

class LibroDetailView(generics.RetrieveAPIView):
    """Detalle de un libro específico"""
    queryset = Libro.objects.all()
    serializer_class = LibroDetalleSerializer
    permission_classes = [permissions.IsAuthenticated]

class LibroCreateView(generics.CreateAPIView):
    """Registro de nuevos libros (solo administradores)"""
    queryset = Libro.objects.all()
    serializer_class = LibroSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrador]

class LibroUpdateView(generics.UpdateAPIView):
    """Actualización de libros (solo administradores)"""
    queryset = Libro.objects.all()
    serializer_class = LibroSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrador]

class LibroDeleteView(generics.DestroyAPIView):
    """Eliminación de libros (solo administradores)"""
    queryset = Libro.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdministrador]

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def obtener_categorias(request):
    """Obtiene todas las categorías disponibles"""
    categorias = Libro.objects.values_list('categoria', flat=True).distinct().order_by('categoria')
    return Response({'categorias': list(categorias)})

# ============ VISTAS DE PRÉSTAMOS ============

class PrestamoListView(generics.ListAPIView):
    """Lista de préstamos (filtrada por usuario o todos para admin)"""
    serializer_class = PrestamoListSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.rol == 'Administrador':
            queryset = Prestamo.objects.all()
        else:
            queryset = Prestamo.objects.filter(usuario=user)
        
        # Filtros adicionales
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        return queryset.order_by('-fecha_prestamo')

class PrestamoCreateView(generics.CreateAPIView):
    """Solicitar préstamo de libro"""
    queryset = Prestamo.objects.all()
    serializer_class = PrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        from rest_framework import serializers
        # Verificar si el usuario tiene sanciones activas
        sanciones_activas = Sancion.objects.filter(
            usuario=self.request.user,
            estado='Activa'
        )
        
        if sanciones_activas.exists():
            raise serializers.ValidationError("No puedes solicitar préstamos mientras tengas sanciones activas.")
        
        serializer.save()

class PrestamoDetailView(generics.RetrieveAPIView):
    """Detalle de un préstamo específico"""
    serializer_class = PrestamoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.rol == 'Administrador':
            return Prestamo.objects.all()
        else:
            return Prestamo.objects.filter(usuario=user)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
def devolver_libro(request, prestamo_id):
    """Procesar devolución de libro (solo administradores)"""
    try:
        prestamo = Prestamo.objects.get(id=prestamo_id)
        
        if prestamo.estado != 'Activo':
            return Response(
                {'error': 'Este préstamo no está activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        prestamo.estado = 'Devuelto'
        prestamo.fecha_devolucion_real = timezone.now().date()
        prestamo.save()
        
        # Verificar si hay retraso y aplicar sanción si es necesario
        if prestamo.fecha_devolucion_real > prestamo.fecha_devolucion_esperada:
            dias_retraso = (prestamo.fecha_devolucion_real - prestamo.fecha_devolucion_esperada).days
            monto_multa = dias_retraso * 5000  # $5000 por día de retraso
            
            Sancion.objects.create(
                usuario=prestamo.usuario,
                prestamo=prestamo,
                tipo='Multa',
                descripcion=f'Multa por devolución tardía ({dias_retraso} días)',
                monto=monto_multa,
                estado='Activa'
            )
        
        serializer = PrestamoSerializer(prestamo)
        return Response(serializer.data)
        
    except Prestamo.DoesNotExist:
        return Response(
            {'error': 'Préstamo no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def renovar_prestamo(request, prestamo_id):
    """Renovar préstamo (si es posible)"""
    try:
        prestamo = Prestamo.objects.get(id=prestamo_id, usuario=request.user)
        
        if prestamo.estado != 'Activo':
            return Response(
                {'error': 'Este préstamo no está activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if prestamo.renovaciones >= 2:
            return Response(
                {'error': 'Ya has alcanzado el máximo de renovaciones (2)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar si hay reservas pendientes para este libro
        reservas_pendientes = Reserva.objects.filter(
            libro=prestamo.libro,
            estado='Activa'
        ).exclude(usuario=request.user)
        
        if reservas_pendientes.exists():
            return Response(
                {'error': 'No se puede renovar porque hay reservas pendientes para este libro'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Renovar préstamo
        prestamo.renovaciones += 1
        prestamo.fecha_devolucion_esperada += timedelta(days=15)
        prestamo.save()
        
        serializer = PrestamoSerializer(prestamo)
        return Response(serializer.data)
        
    except Prestamo.DoesNotExist:
        return Response(
            {'error': 'Préstamo no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )

# ============ VISTAS DE RESERVAS ============

class ReservaListView(generics.ListAPIView):
    """Lista de reservas (filtrada por usuario o todas para admin)"""
    serializer_class = ReservaListSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.rol == 'Administrador':
            queryset = Reserva.objects.all()
        else:
            queryset = Reserva.objects.filter(usuario=user)
        
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        return queryset.order_by('-fecha_reserva')

class ReservaCreateView(generics.CreateAPIView):
    """Crear nueva reserva"""
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    permission_classes = [permissions.IsAuthenticated]

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancelar_reserva(request, reserva_id):
    """Cancelar una reserva"""
    try:
        reserva = Reserva.objects.get(id=reserva_id, usuario=request.user)
        
        if reserva.estado != 'Activa':
            return Response(
                {'error': 'Esta reserva no está activa'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reserva.estado = 'Cancelada'
        reserva.save()
        
        serializer = ReservaSerializer(reserva)
        return Response(serializer.data)
        
    except Reserva.DoesNotExist:
        return Response(
            {'error': 'Reserva no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )

# ============ VISTAS DE BIBLIOGRAFÍA ============

class BibliografiaListView(generics.ListAPIView):
    """Lista de bibliografías (propias para docentes, filtradas por programa para estudiantes)"""
    serializer_class = BibliografiaSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Bibliografia.objects.none()
        
        if user.rol == 'Docente':
            queryset = Bibliografia.objects.filter(docente=user)
        elif user.rol == 'Estudiante':
            # Filtrar por programa del estudiante
            if user.carrera:
                queryset = Bibliografia.objects.filter(
                    es_publica=True,
                    activa=True,
                    programa=user.carrera
                )
        elif user.rol == 'Administrador':
            queryset = Bibliografia.objects.all()
        
        # Filtros adicionales
        programa = self.request.query_params.get('programa', None)
        curso = self.request.query_params.get('curso', None)
        activa = self.request.query_params.get('activa', None)
        
        if programa:
            queryset = queryset.filter(programa__icontains=programa)
        if curso:
            queryset = queryset.filter(curso__icontains=curso)
        if activa is not None:
            queryset = queryset.filter(activa=activa.lower() == 'true')
        
        return queryset.order_by('-fecha_creacion')

class BibliografiaCreateView(generics.CreateAPIView):
    """Crear nueva bibliografía (solo docentes)"""
    queryset = Bibliografia.objects.all()
    serializer_class = BibliografiaSerializer
    permission_classes = [permissions.IsAuthenticated, IsDocente]

class BibliografiaUpdateView(generics.UpdateAPIView):
    """Actualizar bibliografía (solo el docente propietario)"""
    serializer_class = BibliografiaSerializer
    permission_classes = [permissions.IsAuthenticated, IsDocente]
    
    def get_queryset(self):
        return Bibliografia.objects.filter(docente=self.request.user)

class BibliografiaDetailView(generics.RetrieveAPIView):
    """Detalle de una bibliografía"""
    serializer_class = BibliografiaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.rol == 'Docente':
            return Bibliografia.objects.filter(docente=user)
        elif user.rol == 'Estudiante':
            # Solo bibliografías públicas y activas de su programa
            if user.carrera:
                return Bibliografia.objects.filter(
                    es_publica=True,
                    activa=True,
                    programa=user.carrera
                )
            return Bibliografia.objects.none()
        elif user.rol == 'Administrador':
            return Bibliografia.objects.all()
        return Bibliografia.objects.none()

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsDocente])
def agregar_libro_bibliografia(request, bibliografia_id):
    """Agregar libro a una bibliografía (solo docente propietario)"""
    try:
        bibliografia = Bibliografia.objects.get(id=bibliografia_id, docente=request.user)
        libro_id = request.data.get('libro_id')
        
        if not libro_id:
            return Response(
                {'error': 'El ID del libro es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            libro = Libro.objects.get(id=libro_id)
        except Libro.DoesNotExist:
            return Response(
                {'error': 'El libro no existe'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar si el libro ya está en la bibliografía
        if bibliografia.libros.filter(id=libro_id).exists():
            return Response(
                {'error': 'El libro ya está en esta bibliografía'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bibliografia.libros.add(libro)
        serializer = BibliografiaSerializer(bibliografia)
        return Response({
            'message': 'Libro agregado exitosamente',
            'bibliografia': serializer.data
        })
        
    except Bibliografia.DoesNotExist:
        return Response(
            {'error': 'Bibliografía no encontrada o no tienes permisos'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated, IsDocente])
def remover_libro_bibliografia(request, bibliografia_id, libro_id):
    """Remover libro de una bibliografía (solo docente propietario)"""
    try:
        bibliografia = Bibliografia.objects.get(id=bibliografia_id, docente=request.user)
        
        try:
            libro = Libro.objects.get(id=libro_id)
        except Libro.DoesNotExist:
            return Response(
                {'error': 'El libro no existe'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar si el libro está en la bibliografía
        if not bibliografia.libros.filter(id=libro_id).exists():
            return Response(
                {'error': 'El libro no está en esta bibliografía'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bibliografia.libros.remove(libro)
        serializer = BibliografiaSerializer(bibliografia)
        return Response({
            'message': 'Libro removido exitosamente',
            'bibliografia': serializer.data
        })
        
    except Bibliografia.DoesNotExist:
        return Response(
            {'error': 'Bibliografía no encontrada o no tienes permisos'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def obtener_programas(request):
    """Obtener lista de programas académicos disponibles"""
    from usuarios.models import Usuario
    
    # Obtener programas únicos de estudiantes
    programas = Usuario.objects.filter(
        rol='Estudiante',
        carrera__isnull=False
    ).values_list('carrera', flat=True).distinct().order_by('carrera')
    
    return Response({'programas': list(programas)})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def bibliografias_por_programa(request, programa):
    """Obtener bibliografías de un programa específico"""
    user = request.user
    
    if user.rol == 'Estudiante':
        # Solo bibliografías públicas y activas
        bibliografias = Bibliografia.objects.filter(
            programa=programa,
            es_publica=True,
            activa=True
        )
    elif user.rol in ['Docente', 'Administrador']:
        # Todas las bibliografías del programa
        bibliografias = Bibliografia.objects.filter(programa=programa)
    else:
        bibliografias = Bibliografia.objects.none()
    
    serializer = BibliografiaSerializer(bibliografias, many=True)
    return Response(serializer.data)

# ============ VISTAS DE SANCIONES ============

class SancionListView(generics.ListAPIView):
    """Lista de sanciones (propias o todas para admin)"""
    serializer_class = SancionSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.rol == 'Administrador':
            queryset = Sancion.objects.all()
        else:
            queryset = Sancion.objects.filter(usuario=user)
        
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        return queryset.order_by('-fecha_inicio')

class SancionCreateView(generics.CreateAPIView):
    """Aplicar nueva sanción (solo administradores)"""
    queryset = Sancion.objects.all()
    serializer_class = SancionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrador]

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def pagar_multa(request, sancion_id):
    """Pagar multa"""
    try:
        sancion = Sancion.objects.get(id=sancion_id, usuario=request.user)
        
        if sancion.tipo != 'Multa':
            return Response(
                {'error': 'Esta sanción no es una multa'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if sancion.estado != 'Activa':
            return Response(
                {'error': 'Esta multa no está activa'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sancion.estado = 'Pagada'
        sancion.fecha_fin = timezone.now().date()
        sancion.save()
        
        serializer = SancionSerializer(sancion)
        return Response(serializer.data)
        
    except Sancion.DoesNotExist:
        return Response(
            {'error': 'Sanción no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )

# ============ VISTAS DE ESTADÍSTICAS ============

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
def estadisticas_biblioteca(request):
    """Obtener estadísticas generales de la biblioteca"""
    total_libros = Libro.objects.count()
    libros_disponibles = Libro.objects.filter(cantidad_disponible__gt=0).count()
    prestamos_activos = Prestamo.objects.filter(estado='Activo').count()
    reservas_activas = Reserva.objects.filter(estado='Activa').count()
    sanciones_activas = Sancion.objects.filter(estado='Activa').count()
    
    # Préstamos vencidos
    prestamos_vencidos = Prestamo.objects.filter(
        estado='Activo',
        fecha_devolucion_esperada__lt=timezone.now().date()
    ).count()
    
    # Libros más prestados
    libros_populares = Libro.objects.annotate(
        total_prestamos=Count('prestamos')
    ).order_by('-total_prestamos')[:5]
    
    libros_populares_data = [
        {
            'titulo': libro.titulo,
            'autor': libro.autor,
            'total_prestamos': libro.total_prestamos
        }
        for libro in libros_populares
    ]
    
    return Response({
        'total_libros': total_libros,
        'libros_disponibles': libros_disponibles,
        'prestamos_activos': prestamos_activos,
        'prestamos_vencidos': prestamos_vencidos,
        'reservas_activas': reservas_activas,
        'sanciones_activas': sanciones_activas,
        'libros_populares': libros_populares_data
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
def prestamos_vencidos(request):
    """Obtener lista de préstamos vencidos"""
    prestamos = Prestamo.objects.filter(
        estado='Activo',
        fecha_devolucion_esperada__lt=timezone.now().date()
    ).order_by('fecha_devolucion_esperada')
    
    serializer = PrestamoListSerializer(prestamos, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
def procesar_prestamos_vencidos(request):
    """Procesar automáticamente préstamos vencidos y generar sanciones"""
    from django.core.management import call_command
    from io import StringIO
    import sys
    
    try:
        # Capturar la salida del comando
        old_stdout = sys.stdout
        sys.stdout = captured_output = StringIO()
        
        # Ejecutar el comando de procesamiento
        call_command('procesar_prestamos_vencidos')
        
        # Restaurar stdout
        sys.stdout = old_stdout
        output = captured_output.getvalue()
        
        return Response({
            'message': 'Procesamiento completado exitosamente',
            'output': output,
            'success': True
        })
        
    except Exception as e:
        sys.stdout = old_stdout
        return Response({
            'error': f'Error durante el procesamiento: {str(e)}',
            'success': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
def sanciones_pendientes(request):
    """Obtener sanciones pendientes de revisión"""
    sanciones = Sancion.objects.filter(
        estado='Activa'
    ).select_related('usuario', 'prestamo__libro').order_by('-fecha_inicio')
    
    serializer = SancionSerializer(sanciones, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
def aprobar_sancion(request, sancion_id):
    """Aprobar una sanción propuesta"""
    try:
        sancion = Sancion.objects.get(id=sancion_id)
        
        # Aquí se podría agregar lógica adicional de aprobación
        # Por ahora, simplemente confirmamos que está activa
        if sancion.estado != 'Activa':
            sancion.estado = 'Activa'
            sancion.save()
        
        serializer = SancionSerializer(sancion)
        return Response({
            'message': 'Sanción aprobada exitosamente',
            'sancion': serializer.data
        })
        
    except Sancion.DoesNotExist:
        return Response(
            {'error': 'Sanción no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
def rechazar_sancion(request, sancion_id):
    """Rechazar una sanción propuesta"""
    try:
        sancion = Sancion.objects.get(id=sancion_id)
        
        # Marcar como completada (rechazada)
        sancion.estado = 'Completada'
        sancion.fecha_fin = timezone.now().date()
        sancion.save()
        
        serializer = SancionSerializer(sancion)
        return Response({
            'message': 'Sanción rechazada exitosamente',
            'sancion': serializer.data
        })
        
    except Sancion.DoesNotExist:
        return Response(
            {'error': 'Sanción no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdministrador])
def dashboard_sanciones(request):
    """Dashboard con estadísticas de sanciones"""
    from django.db.models import Count, Sum
    
    # Estadísticas generales
    total_sanciones = Sancion.objects.count()
    sanciones_activas = Sancion.objects.filter(estado='Activa').count()
    sanciones_pagadas = Sancion.objects.filter(estado='Pagada').count()
    
    # Monto total de multas activas
    monto_multas_activas = Sancion.objects.filter(
        tipo='Multa',
        estado='Activa'
    ).aggregate(total=Sum('monto'))['total'] or 0
    
    # Préstamos vencidos sin sanción
    prestamos_vencidos_sin_sancion = Prestamo.objects.filter(
        estado='Activo',
        fecha_devolucion_esperada__lt=timezone.now().date()
    ).exclude(
        sanciones__isnull=False
    ).count()
    
    # Usuarios con más sanciones
    usuarios_con_sanciones = Sancion.objects.filter(
        estado='Activa'
    ).values(
        'usuario__nombre', 'usuario__apellido', 'usuario__email'
    ).annotate(
        total_sanciones=Count('id'),
        total_monto=Sum('monto')
    ).order_by('-total_sanciones')[:5]
    
    return Response({
        'estadisticas': {
            'total_sanciones': total_sanciones,
            'sanciones_activas': sanciones_activas,
            'sanciones_pagadas': sanciones_pagadas,
            'monto_multas_activas': float(monto_multas_activas),
            'prestamos_vencidos_sin_sancion': prestamos_vencidos_sin_sancion
        },
        'usuarios_con_sanciones': list(usuarios_con_sanciones)
    })
