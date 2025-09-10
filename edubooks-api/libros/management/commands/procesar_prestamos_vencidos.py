from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from libros.models import Prestamo, Sancion
from django.db import transaction


class Command(BaseCommand):
    help = 'Detecta préstamos vencidos y genera sanciones automáticamente'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecuta en modo simulación sin aplicar cambios',
        )
        parser.add_argument(
            '--dias-gracia',
            type=int,
            default=0,
            help='Días de gracia antes de aplicar sanción (default: 0)',
        )
        parser.add_argument(
            '--monto-multa-diaria',
            type=float,
            default=5000.0,
            help='Monto de multa por día de retraso (default: 5000)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        dias_gracia = options['dias_gracia']
        monto_multa_diaria = options['monto_multa_diaria']
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Iniciando procesamiento de préstamos vencidos...'
            )
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('MODO SIMULACIÓN - No se aplicarán cambios')
            )
        
        # Obtener préstamos vencidos
        fecha_limite = date.today() - timedelta(days=dias_gracia)
        prestamos_vencidos = Prestamo.objects.filter(
            estado='Activo',
            fecha_devolucion_esperada__lt=fecha_limite
        ).select_related('usuario', 'libro')
        
        total_prestamos = prestamos_vencidos.count()
        self.stdout.write(f'Préstamos vencidos encontrados: {total_prestamos}')
        
        if total_prestamos == 0:
            self.stdout.write(
                self.style.SUCCESS('No hay préstamos vencidos para procesar')
            )
            return
        
        sanciones_creadas = 0
        prestamos_actualizados = 0
        
        with transaction.atomic():
            for prestamo in prestamos_vencidos:
                try:
                    # Verificar si ya existe una sanción para este préstamo
                    sancion_existente = Sancion.objects.filter(
                        prestamo=prestamo,
                        usuario=prestamo.usuario
                    ).exists()
                    
                    if sancion_existente:
                        self.stdout.write(
                            f'Sanción ya existe para préstamo {prestamo.id}'
                        )
                        continue
                    
                    # Calcular días de retraso
                    dias_retraso = (date.today() - prestamo.fecha_devolucion_esperada).days
                    monto_total = dias_retraso * monto_multa_diaria
                    
                    # Actualizar estado del préstamo
                    if not dry_run:
                        prestamo.estado = 'Vencido'
                        prestamo.save()
                        prestamos_actualizados += 1
                    
                    # Crear sanción
                    if not dry_run:
                        sancion = Sancion.objects.create(
                            usuario=prestamo.usuario,
                            prestamo=prestamo,
                            tipo='Multa',
                            monto=monto_total,
                            descripcion=f'Multa por devolución tardía de "{prestamo.libro.titulo}". '
                                       f'Días de retraso: {dias_retraso}. '
                                       f'Monto por día: ${monto_multa_diaria:,.0f}',
                            estado='Activa'
                        )
                        sanciones_creadas += 1
                    
                    self.stdout.write(
                        f'Procesado préstamo {prestamo.id}: '
                        f'{prestamo.libro.titulo} - {prestamo.usuario.nombre} {prestamo.usuario.apellido} '
                        f'({dias_retraso} días, ${monto_total:,.0f})'
                    )
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Error procesando préstamo {prestamo.id}: {str(e)}'
                        )
                    )
                    continue
        
        # Resumen de resultados
        self.stdout.write('\n' + '='*50)
        self.stdout.write('RESUMEN DE PROCESAMIENTO:')
        self.stdout.write(f'Préstamos vencidos encontrados: {total_prestamos}')
        
        if not dry_run:
            self.stdout.write(f'Préstamos actualizados a "Vencido": {prestamos_actualizados}')
            self.stdout.write(f'Sanciones creadas: {sanciones_creadas}')
            self.stdout.write(
                self.style.SUCCESS(
                    f'Procesamiento completado exitosamente'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    'Simulación completada. Use --dry-run=False para aplicar cambios.'
                )
            )
        
        # Mostrar próximos préstamos a vencer
        self.mostrar_proximos_vencimientos()
    
    def mostrar_proximos_vencimientos(self):
        """Muestra préstamos que vencerán en los próximos días"""
        fecha_limite = date.today() + timedelta(days=3)
        proximos_vencimientos = Prestamo.objects.filter(
            estado='Activo',
            fecha_devolucion_esperada__lte=fecha_limite,
            fecha_devolucion_esperada__gte=date.today()
        ).select_related('usuario', 'libro')
        
        if proximos_vencimientos.exists():
            self.stdout.write('\n' + '='*50)
            self.stdout.write('PRÓXIMOS VENCIMIENTOS (3 días):')
            for prestamo in proximos_vencimientos:
                dias_restantes = (prestamo.fecha_devolucion_esperada - date.today()).days
                self.stdout.write(
                    f'- {prestamo.libro.titulo} ({prestamo.usuario.nombre} {prestamo.usuario.apellido}) '
                    f'- Vence en {dias_restantes} día(s)'
                )