// Datos de libros de muestra para el catálogo
export interface LibroData {
  id: number;
  titulo: string;
  autor: string;
  isbn: string;
  editorial: string;
  año_publicacion: number;
  categoria: string;
  ubicacion: string;
  estado: 'Disponible' | 'Prestado' | 'Reservado' | 'Mantenimiento';
  cantidad_total: number;
  cantidad_disponible: number;
  descripcion: string;
  imagen_portada: string;
}

export const LIBROS_MUESTRA: LibroData[] = [
  // Programación y Desarrollo
  {
    id: 1,
    titulo: "Clean Code: A Handbook of Agile Software Craftsmanship",
    autor: "Robert C. Martin",
    isbn: "9780132350884",
    editorial: "Prentice Hall",
    año_publicacion: 2008,
    categoria: "Programación y Desarrollo",
    ubicacion: "Estante A1-001",
    estado: "Disponible",
    cantidad_total: 5,
    cantidad_disponible: 3,
    descripcion: "Una guía completa para escribir código limpio, legible y mantenible. Incluye principios, patrones y prácticas para mejorar la calidad del software.",
    imagen_portada: "assets/images/book-programming.svg"
  },
  {
    id: 2,
    titulo: "JavaScript: The Good Parts",
    autor: "Douglas Crockford",
    isbn: "9780596517748",
    editorial: "O'Reilly Media",
    año_publicacion: 2008,
    categoria: "Programación y Desarrollo",
    ubicacion: "Estante A1-002",
    estado: "Disponible",
    cantidad_total: 4,
    cantidad_disponible: 2,
    descripcion: "Explora las características más útiles y elegantes de JavaScript, evitando las partes problemáticas del lenguaje.",
    imagen_portada: "assets/images/book-programming.svg"
  },
  {
    id: 3,
    titulo: "Design Patterns: Elements of Reusable Object-Oriented Software",
    autor: "Gang of Four",
    isbn: "9780201633610",
    editorial: "Addison-Wesley",
    año_publicacion: 1994,
    categoria: "Programación y Desarrollo",
    ubicacion: "Estante A1-003",
    estado: "Prestado",
    cantidad_total: 3,
    cantidad_disponible: 0,
    descripcion: "El libro clásico sobre patrones de diseño en programación orientada a objetos. Fundamental para cualquier desarrollador.",
    imagen_portada: "assets/images/book-programming.svg"
  },
  {
    id: 4,
    titulo: "Angular: Up and Running",
    autor: "Shyam Seshadri",
    isbn: "9781491999820",
    editorial: "O'Reilly Media",
    año_publicacion: 2018,
    categoria: "Programación y Desarrollo",
    ubicacion: "Estante A1-004",
    estado: "Disponible",
    cantidad_total: 6,
    cantidad_disponible: 3,
    descripcion: "Guía práctica para aprender Angular desde cero, incluyendo TypeScript, componentes, servicios y más.",
    imagen_portada: "assets/images/book-programming.svg"
  },
  {
    id: 5,
    titulo: "Python Crash Course",
    autor: "Eric Matthes",
    isbn: "9781593279288",
    editorial: "No Starch Press",
    año_publicacion: 2019,
    categoria: "Programación y Desarrollo",
    ubicacion: "Estante A1-005",
    estado: "Disponible",
    cantidad_total: 5,
    cantidad_disponible: 4,
    descripcion: "Introducción práctica a la programación en Python con proyectos reales y ejercicios hands-on.",
    imagen_portada: "assets/images/book-programming.svg"
  },

  // Matemáticas y Estadística
  {
    id: 6,
    titulo: "Cálculo de Una Variable",
    autor: "James Stewart",
    isbn: "9786074817249",
    editorial: "Cengage Learning",
    año_publicacion: 2017,
    categoria: "Matemáticas y Estadística",
    ubicacion: "Estante B1-001",
    estado: "Disponible",
    cantidad_total: 7,
    cantidad_disponible: 5,
    descripcion: "Texto completo de cálculo diferencial e integral con aplicaciones prácticas y ejercicios resueltos.",
    imagen_portada: "assets/images/book-mathematics.svg"
  },
  {
    id: 7,
    titulo: "Álgebra Lineal y sus Aplicaciones",
    autor: "David C. Lay",
    isbn: "9786073238601",
    editorial: "Pearson",
    año_publicacion: 2016,
    categoria: "Matemáticas y Estadística",
    ubicacion: "Estante B1-002",
    estado: "Disponible",
    cantidad_total: 4,
    cantidad_disponible: 3,
    descripcion: "Introducción moderna al álgebra lineal con énfasis en aplicaciones en ciencias e ingeniería.",
    imagen_portada: "assets/images/book-mathematics.svg"
  },
  {
    id: 8,
    titulo: "Estadística para Administración y Economía",
    autor: "Richard I. Levin",
    isbn: "9786073214063",
    editorial: "Pearson",
    año_publicacion: 2014,
    categoria: "Matemáticas y Estadística",
    ubicacion: "Estante B1-003",
    estado: "Reservado",
    cantidad_total: 2,
    cantidad_disponible: 1,
    descripcion: "Conceptos fundamentales de estadística aplicados a problemas de administración y economía.",
    imagen_portada: "assets/images/book-mathematics.svg"
  },

  // Ciencias Naturales
  {
    id: 9,
    titulo: "Física Universitaria",
    autor: "Hugh D. Young",
    isbn: "9786073221177",
    editorial: "Pearson",
    año_publicacion: 2018,
    categoria: "Ciencias Naturales",
    ubicacion: "Estante C1-001",
    estado: "Disponible",
    cantidad_total: 5,
    cantidad_disponible: 4,
    descripcion: "Texto completo de física que cubre mecánica, termodinámica, electromagnetismo y física moderna.",
    imagen_portada: "assets/images/book-science.svg"
  },
  {
    id: 10,
    titulo: "Química General",
    autor: "Raymond Chang",
    isbn: "9786071513083",
    editorial: "McGraw-Hill",
    año_publicacion: 2016,
    categoria: "Ciencias Naturales",
    ubicacion: "Estante C1-002",
    estado: "Disponible",
    cantidad_total: 3,
    cantidad_disponible: 2,
    descripcion: "Fundamentos de química general con enfoque en la resolución de problemas y aplicaciones.",
    imagen_portada: "assets/images/book-science.svg"
  },
  {
    id: 11,
    titulo: "Biología de Campbell",
    autor: "Neil A. Campbell",
    isbn: "9786073244794",
    editorial: "Pearson",
    año_publicacion: 2017,
    categoria: "Ciencias Naturales",
    ubicacion: "Estante C1-003",
    estado: "Disponible",
    cantidad_total: 6,
    cantidad_disponible: 4,
    descripcion: "Texto integral de biología que abarca desde biología molecular hasta ecología y evolución.",
    imagen_portada: "assets/images/book-science.svg"
  },

  // Literatura y Humanidades
  {
    id: 12,
    titulo: "Cien Años de Soledad",
    autor: "Gabriel García Márquez",
    isbn: "9788437604947",
    editorial: "Cátedra",
    año_publicacion: 1967,
    categoria: "Literatura y Humanidades",
    ubicacion: "Estante D1-001",
    estado: "Disponible",
    cantidad_total: 8,
    cantidad_disponible: 5,
    descripcion: "Obra maestra del realismo mágico que narra la historia de la familia Buendía en Macondo.",
    imagen_portada: "assets/images/book-literature.svg"
  },
  {
    id: 13,
    titulo: "Don Quijote de la Mancha",
    autor: "Miguel de Cervantes",
    isbn: "9788491050308",
    editorial: "Espasa",
    año_publicacion: 1605,
    categoria: "Literatura y Humanidades",
    ubicacion: "Estante D1-002",
    estado: "Disponible",
    cantidad_total: 4,
    cantidad_disponible: 3,
    descripcion: "La obra cumbre de la literatura española que narra las aventuras del ingenioso hidalgo.",
    imagen_portada: "assets/images/book-literature.svg"
  },
  {
    id: 14,
    titulo: "Historia Universal Contemporánea",
    autor: "Javier Paredes",
    isbn: "9788434413542",
    editorial: "Ariel",
    año_publicacion: 2015,
    categoria: "Literatura y Humanidades",
    ubicacion: "Estante D1-003",
    estado: "Prestado",
    cantidad_total: 3,
    cantidad_disponible: 0,
    descripcion: "Análisis completo de la historia mundial desde el siglo XVIII hasta la actualidad.",
    imagen_portada: "assets/images/book-literature.svg"
  },

  // Ingeniería
  {
    id: 15,
    titulo: "Fundamentos de Ingeniería de Software",
    autor: "Ian Sommerville",
    isbn: "9786073221368",
    editorial: "Pearson",
    año_publicacion: 2016,
    categoria: "Ingeniería",
    ubicacion: "Estante E1-001",
    estado: "Disponible",
    cantidad_total: 5,
    cantidad_disponible: 3,
    descripcion: "Principios y prácticas de la ingeniería de software moderna, incluyendo metodologías ágiles.",
    imagen_portada: "assets/images/book-engineering.svg"
  },
  {
    id: 16,
    titulo: "Mecánica de Materiales",
    autor: "Ferdinand P. Beer",
    isbn: "9786071511447",
    editorial: "McGraw-Hill",
    año_publicacion: 2017,
    categoria: "Ingeniería",
    ubicacion: "Estante E1-002",
    estado: "Disponible",
    cantidad_total: 6,
    cantidad_disponible: 4,
    descripcion: "Análisis del comportamiento de materiales bajo diferentes tipos de cargas y esfuerzos.",
    imagen_portada: "assets/images/book-engineering.svg"
  },
  {
    id: 17,
    titulo: "Circuitos Eléctricos",
    autor: "James W. Nilsson",
    isbn: "9786073238915",
    editorial: "Pearson",
    año_publicacion: 2015,
    categoria: "Ingeniería",
    ubicacion: "Estante E1-003",
    estado: "Disponible",
    cantidad_total: 3,
    cantidad_disponible: 2,
    descripcion: "Fundamentos del análisis de circuitos eléctricos con aplicaciones prácticas.",
    imagen_portada: "assets/images/book-engineering.svg"
  },

  // Administración y Negocios
  {
    id: 18,
    titulo: "Administración: Una Perspectiva Global",
    autor: "Harold Koontz",
    isbn: "9786071511935",
    editorial: "McGraw-Hill",
    año_publicacion: 2016,
    categoria: "Administración y Negocios",
    ubicacion: "Estante F1-001",
    estado: "Disponible",
    cantidad_total: 7,
    cantidad_disponible: 5,
    descripcion: "Principios fundamentales de la administración moderna con enfoque global y casos prácticos.",
    imagen_portada: "assets/images/book-business.svg"
  },
  {
    id: 19,
    titulo: "Marketing: Conceptos y Estrategias",
    autor: "Philip Kotler",
    isbn: "9786073244411",
    editorial: "Pearson",
    año_publicacion: 2017,
    categoria: "Administración y Negocios",
    ubicacion: "Estante F1-002",
    estado: "Reservado",
    cantidad_total: 2,
    cantidad_disponible: 1,
    descripcion: "Fundamentos del marketing moderno con estrategias digitales y casos de estudio actuales.",
    imagen_portada: "assets/images/book-business.svg"
  },
  {
    id: 20,
    titulo: "Contabilidad Financiera",
    autor: "Gerardo Guajardo",
    isbn: "9786071511928",
    editorial: "McGraw-Hill",
    año_publicacion: 2014,
    categoria: "Administración y Negocios",
    ubicacion: "Estante F1-003",
    estado: "Disponible",
    cantidad_total: 5,
    cantidad_disponible: 4,
    descripcion: "Principios de contabilidad financiera con aplicaciones prácticas y ejercicios resueltos.",
    imagen_portada: "assets/images/book-business.svg"
  },

  // Libros adicionales para completar la colección
  {
    id: 21,
    titulo: "Inteligencia Artificial: Un Enfoque Moderno",
    autor: "Stuart Russell",
    isbn: "9786073244794",
    editorial: "Pearson",
    año_publicacion: 2016,
    categoria: "Programación y Desarrollo",
    ubicacion: "Estante A2-001",
    estado: "Disponible",
    cantidad_total: 4,
    cantidad_disponible: 2,
    descripcion: "Texto completo sobre inteligencia artificial, machine learning y sistemas inteligentes.",
    imagen_portada: "assets/images/book-programming.svg"
  },
  {
    id: 22,
    titulo: "Estructuras de Datos y Algoritmos",
    autor: "Michael T. Goodrich",
    isbn: "9786074817249",
    editorial: "Wiley",
    año_publicacion: 2015,
    categoria: "Programación y Desarrollo",
    ubicacion: "Estante A2-002",
    estado: "Disponible",
    cantidad_total: 5,
    cantidad_disponible: 3,
    descripcion: "Fundamentos de estructuras de datos y algoritmos con implementaciones en Java.",
    imagen_portada: "assets/images/book-programming.svg"
  },
  {
    id: 23,
    titulo: "Probabilidad y Estadística",
    autor: "Ronald E. Walpole",
    isbn: "9786073238601",
    editorial: "Pearson",
    año_publicacion: 2016,
    categoria: "Matemáticas y Estadística",
    ubicacion: "Estante B2-001",
    estado: "Prestado",
    cantidad_total: 3,
    cantidad_disponible: 0,
    descripcion: "Conceptos de probabilidad y estadística para ingenieros y científicos.",
    imagen_portada: "assets/images/book-mathematics.svg"
  },
  {
    id: 24,
    titulo: "Economía: Principios y Aplicaciones",
    autor: "N. Gregory Mankiw",
    isbn: "9786073244411",
    editorial: "Cengage Learning",
    año_publicacion: 2017,
    categoria: "Administración y Negocios",
    ubicacion: "Estante F2-001",
    estado: "Disponible",
    cantidad_total: 6,
    cantidad_disponible: 5,
    descripcion: "Principios fundamentales de microeconomía y macroeconomía con ejemplos actuales.",
    imagen_portada: "assets/images/book-business.svg"
  },
  {
    id: 25,
    titulo: "Filosofía: Una Introducción",
    autor: "Thomas Nagel",
    isbn: "9788434413542",
    editorial: "Fondo de Cultura Económica",
    año_publicacion: 2014,
    categoria: "Literatura y Humanidades",
    ubicacion: "Estante D2-001",
    estado: "Disponible",
    cantidad_total: 4,
    cantidad_disponible: 3,
    descripcion: "Introducción accesible a los principales problemas y métodos de la filosofía.",
    imagen_portada: "assets/images/book-literature.svg"
  }
];

// Categorías disponibles
export const CATEGORIAS = [
  'Programación y Desarrollo',
  'Matemáticas y Estadística',
  'Ciencias Naturales',
  'Literatura y Humanidades',
  'Ingeniería',
  'Administración y Negocios'
];

// Estados disponibles
export const ESTADOS_LIBRO = [
  'Disponible',
  'Prestado',
  'Reservado',
  'Mantenimiento'
];