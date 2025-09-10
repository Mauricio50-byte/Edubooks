from django.core.management.base import BaseCommand
from libros.models import Libro

class Command(BaseCommand):
    help = 'Inserta libros reales en la base de datos con imágenes SVG según categoría'

    def handle(self, *args, **options):
        # Mapeo de categorías a imágenes SVG
        categoria_imagen_map = {
            'Literatura': 'assets/images/book-literature.svg',
            'Ciencias': 'assets/images/book-science.svg',
            'Matemáticas': 'assets/images/book-mathematics.svg',
            'Programación': 'assets/images/book-programming.svg',
            'Ingeniería': 'assets/images/book-engineering.svg',
            'Negocios': 'assets/images/book-business.svg',
            'Ficción': 'assets/images/book-literature.svg',
            'Historia': 'assets/images/book-literature.svg',
            'Filosofía': 'assets/images/book-literature.svg',
            'Arte': 'assets/images/book-literature.svg'
        }

        libros_reales = [
            {
                'titulo': 'Cien años de soledad',
                'autor': 'Gabriel García Márquez',
                'isbn': '9780307474728',
                'editorial': 'Vintage Español',
                'año_publicacion': 1967,
                'categoria': 'Literatura',
                'ubicacion': 'A1-001',
                'descripcion': 'Una obra maestra del realismo mágico que narra la historia de la familia Buendía a lo largo de siete generaciones.',
                'cantidad_total': 3,
                'cantidad_disponible': 3
            },
            {
                'titulo': 'El Quijote de la Mancha',
                'autor': 'Miguel de Cervantes',
                'isbn': '9788491050308',
                'editorial': 'Penguin Clásicos',
                'año_publicacion': 1605,
                'categoria': 'Literatura',
                'ubicacion': 'A1-002',
                'descripcion': 'La obra cumbre de la literatura española que narra las aventuras del ingenioso hidalgo Don Quijote.',
                'cantidad_total': 2,
                'cantidad_disponible': 2
            },
            {
                'titulo': 'Introducción a los Algoritmos',
                'autor': 'Thomas H. Cormen',
                'isbn': '9780262033848',
                'editorial': 'MIT Press',
                'año_publicacion': 2009,
                'categoria': 'Programación',
                'ubicacion': 'B2-001',
                'descripcion': 'Texto fundamental para el estudio de algoritmos y estructuras de datos.',
                'cantidad_total': 5,
                'cantidad_disponible': 5
            },
            {
                'titulo': 'Cálculo de una Variable',
                'autor': 'James Stewart',
                'isbn': '9781285740621',
                'editorial': 'Cengage Learning',
                'año_publicacion': 2015,
                'categoria': 'Matemáticas',
                'ubicacion': 'C1-001',
                'descripcion': 'Texto completo para el estudio del cálculo diferencial e integral.',
                'cantidad_total': 4,
                'cantidad_disponible': 4
            },
            {
                'titulo': 'Física Universitaria',
                'autor': 'Hugh D. Young',
                'isbn': '9780321973610',
                'editorial': 'Pearson',
                'año_publicacion': 2016,
                'categoria': 'Ciencias',
                'ubicacion': 'C2-001',
                'descripcion': 'Texto fundamental para el estudio de la física a nivel universitario.',
                'cantidad_total': 3,
                'cantidad_disponible': 3
            },
            {
                'titulo': 'Ingeniería de Software',
                'autor': 'Ian Sommerville',
                'isbn': '9780133943030',
                'editorial': 'Pearson',
                'año_publicacion': 2015,
                'categoria': 'Ingeniería',
                'ubicacion': 'B1-001',
                'descripcion': 'Guía completa sobre metodologías y prácticas de ingeniería de software.',
                'cantidad_total': 4,
                'cantidad_disponible': 4
            },
            {
                'titulo': 'Administración Estratégica',
                'autor': 'Fred R. David',
                'isbn': '9786073238663',
                'editorial': 'Pearson',
                'año_publicacion': 2017,
                'categoria': 'Negocios',
                'ubicacion': 'D1-001',
                'descripcion': 'Conceptos y casos de administración estratégica para organizaciones modernas.',
                'cantidad_total': 2,
                'cantidad_disponible': 2
            },
            {
                'titulo': 'Python Crash Course',
                'autor': 'Eric Matthes',
                'isbn': '9781593279288',
                'editorial': 'No Starch Press',
                'año_publicacion': 2019,
                'categoria': 'Programación',
                'ubicacion': 'B2-002',
                'descripcion': 'Introducción práctica a la programación en Python con proyectos reales.',
                'cantidad_total': 6,
                'cantidad_disponible': 6
            },
            {
                'titulo': 'La Casa de los Espíritus',
                'autor': 'Isabel Allende',
                'isbn': '9788401352836',
                'editorial': 'Plaza & Janés',
                'año_publicacion': 1982,
                'categoria': 'Literatura',
                'ubicacion': 'A1-003',
                'descripcion': 'Saga familiar que abarca cuatro generaciones marcadas por la violencia y el amor.',
                'cantidad_total': 2,
                'cantidad_disponible': 2
            },
            {
                'titulo': 'Química General',
                'autor': 'Raymond Chang',
                'isbn': '9786071513083',
                'editorial': 'McGraw-Hill',
                'año_publicacion': 2013,
                'categoria': 'Ciencias',
                'ubicacion': 'C2-002',
                'descripcion': 'Texto fundamental para el estudio de la química general.',
                'cantidad_total': 3,
                'cantidad_disponible': 3
            },
            {
                'titulo': 'Clean Code',
                'autor': 'Robert C. Martin',
                'isbn': '9780132350884',
                'editorial': 'Prentice Hall',
                'año_publicacion': 2008,
                'categoria': 'Programación',
                'ubicacion': 'B2-003',
                'descripcion': 'Manual de estilo para el desarrollo ágil de software.',
                'cantidad_total': 4,
                'cantidad_disponible': 4
            },
            {
                'titulo': 'El Principito',
                'autor': 'Antoine de Saint-Exupéry',
                'isbn': '9780156012195',
                'editorial': 'Harcourt Brace Jovanovich',
                'año_publicacion': 1943,
                'categoria': 'Literatura',
                'ubicacion': 'A1-004',
                'descripcion': 'Clásico de la literatura universal sobre la amistad y el amor.',
                'cantidad_total': 5,
                'cantidad_disponible': 5
            },
            {
                'titulo': 'Álgebra Lineal',
                'autor': 'Gilbert Strang',
                'isbn': '9780980232714',
                'editorial': 'Wellesley-Cambridge Press',
                'año_publicacion': 2016,
                'categoria': 'Matemáticas',
                'ubicacion': 'C1-002',
                'descripcion': 'Introducción completa al álgebra lineal y sus aplicaciones.',
                'cantidad_total': 3,
                'cantidad_disponible': 3
            },
            {
                'titulo': 'Biología de Campbell',
                'autor': 'Neil A. Campbell',
                'isbn': '9780134093413',
                'editorial': 'Pearson',
                'año_publicacion': 2016,
                'categoria': 'Ciencias',
                'ubicacion': 'C2-003',
                'descripcion': 'Texto fundamental para el estudio de la biología.',
                'cantidad_total': 2,
                'cantidad_disponible': 2
            },
            {
                'titulo': 'Estructuras de Datos y Algoritmos en Java',
                'autor': 'Michael T. Goodrich',
                'isbn': '9781118771334',
                'editorial': 'Wiley',
                'año_publicacion': 2014,
                'categoria': 'Programación',
                'ubicacion': 'B2-004',
                'descripcion': 'Guía completa de estructuras de datos y algoritmos en Java.',
                'cantidad_total': 4,
                'cantidad_disponible': 4
            },
            {
                'titulo': 'Crónica de una Muerte Anunciada',
                'autor': 'Gabriel García Márquez',
                'isbn': '9780307387387',
                'editorial': 'Vintage Español',
                'año_publicacion': 1981,
                'categoria': 'Literatura',
                'ubicacion': 'A1-005',
                'descripcion': 'Novela corta que narra un crimen anunciado en un pueblo caribeño.',
                'cantidad_total': 3,
                'cantidad_disponible': 3
            },
            {
                'titulo': 'Fundamentos de Economía',
                'autor': 'Paul Krugman',
                'isbn': '9781319098780',
                'editorial': 'Worth Publishers',
                'año_publicacion': 2017,
                'categoria': 'Negocios',
                'ubicacion': 'D1-002',
                'descripcion': 'Introducción a los principios fundamentales de la economía.',
                'cantidad_total': 3,
                'cantidad_disponible': 3
            },
            {
                'titulo': 'Mecánica Clásica',
                'autor': 'Herbert Goldstein',
                'isbn': '9780201657029',
                'editorial': 'Addison Wesley',
                'año_publicacion': 2001,
                'categoria': 'Ciencias',
                'ubicacion': 'C2-004',
                'descripcion': 'Texto avanzado de mecánica clásica para estudiantes de física.',
                'cantidad_total': 2,
                'cantidad_disponible': 2
            },
            {
                'titulo': 'Diseño de Sistemas Digitales',
                'autor': 'Morris Mano',
                'isbn': '9780132774208',
                'editorial': 'Pearson',
                'año_publicacion': 2013,
                'categoria': 'Ingeniería',
                'ubicacion': 'B1-002',
                'descripcion': 'Fundamentos del diseño de sistemas digitales y lógica.',
                'cantidad_total': 3,
                'cantidad_disponible': 3
            }
        ]

        # Limpiar libros existentes (opcional)
        if self.confirm_deletion():
            Libro.objects.all().delete()
            # Reiniciar la secuencia de IDs
            from django.db import connection
            with connection.cursor() as cursor:
                # Obtener el nombre correcto de la secuencia
                cursor.execute("""
                    SELECT pg_get_serial_sequence('libros', 'id');
                """)
                sequence_name = cursor.fetchone()[0]
                if sequence_name:
                    cursor.execute(f"ALTER SEQUENCE {sequence_name} RESTART WITH 1;")
                    self.stdout.write(self.style.SUCCESS(f'Secuencia {sequence_name} reiniciada.'))
                else:
                    self.stdout.write(self.style.WARNING('No se pudo encontrar la secuencia.'))
            self.stdout.write(self.style.WARNING('Libros existentes eliminados y secuencia de IDs reiniciada.'))

        # Insertar nuevos libros
        libros_creados = 0
        for libro_data in libros_reales:
            # Asignar imagen según categoría
            categoria = libro_data['categoria']
            imagen_portada = categoria_imagen_map.get(categoria, 'assets/images/book-placeholder.svg')
            libro_data['imagen_portada'] = imagen_portada
            
            # Crear libro
            libro, created = Libro.objects.get_or_create(
                isbn=libro_data['isbn'],
                defaults=libro_data
            )
            
            if created:
                libros_creados += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Creado: {libro.titulo} - {libro.autor}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'⚠ Ya existe: {libro.titulo} - {libro.autor}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\n🎉 Proceso completado: {libros_creados} libros nuevos insertados.')
        )
        self.stdout.write(
            self.style.SUCCESS(f'📚 Total de libros en la base de datos: {Libro.objects.count()}')
        )

    def confirm_deletion(self):
        """Confirma si se deben eliminar los libros existentes"""
        if Libro.objects.exists():
            response = input('¿Deseas eliminar todos los libros existentes? (s/N): ')
            return response.lower() in ['s', 'si', 'sí', 'y', 'yes']
        return False