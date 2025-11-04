# Prompt Granular de Colorimetría para Aplicación Móvil (Ionic/Angular)

## Objetivo del Prompt

Este prompt está diseñado para guiar a una Inteligencia Artificial (IA) en la refactorización completa y granular de la **colorimetría** de la aplicación móvil `Edubooks` (Ionic/Angular), asegurando una coherencia visual estricta con el diseño de referencia de **Finanzas** proporcionado.

El objetivo es migrar el esquema de colores actual a la paleta de colores vibrante y oscura del diseño de referencia, aplicando los colores de manera semántica a cada componente de la interfaz de usuario (UI) para mantener la uniformidad en todas las páginas.

## Paleta de Colores de Referencia

La paleta de colores ha sido extraída y mapeada a roles semánticos para su uso en el *Ionic Theming*.

| Rol de Color | Código Hexadecimal | Uso Semántico y Mapeo a Ionic |
| :--- | :--- | :--- |
| **Fondo Principal** | `#1E1E3F` | **Base Oscura:** Color de fondo para `ion-content`, `ion-card`, y `ion-toolbar`. Mapear a `--ion-color-dark`. |
| **Color Primario (Acento)** | `#FF4B6B` | **Acento Principal:** Botones de acción primaria, texto de estado activo, indicadores de progreso. Mapear a `--ion-color-primary`. |
| **Color Secundario (Gradiente)** | `#FF8C4B` | **Acento Secundario:** Parte del gradiente, elementos de datos positivos o de énfasis. Mapear a `--ion-color-secondary`. |
| **Color Terciario (Contraste)** | `#4B6BFF` | **Contraste Frío:** Elementos de navegación inactivos, iconos secundarios, gráficos. Mapear a `--ion-color-tertiary`. |
| **Texto Principal** | `#FFFFFF` | **Texto Claro:** Títulos, etiquetas, texto principal sobre fondo oscuro. Mapear a `--ion-color-light`. |
| **Texto Secundario** | `#AAAAAA` | **Texto Suave:** Subtítulos, placeholders, texto de ayuda. Mapear a `--ion-color-medium`. |
| **Color de Éxito** | `#4CAF50` | **Estado Positivo:** Iconos de éxito, indicadores de saldo positivo. Mapear a `--ion-color-success`. |
| **Color de Error** | `#F44336` | **Estado Negativo:** Iconos de error, indicadores de saldo negativo. Mapear a `--ion-color-danger`. |

## Directrices de Implementación Granular para la IA

La IA debe realizar las siguientes acciones en el código del frontend (`edubooks-app/src/`):

### 1. Configuración del Tema Global (`edubooks-app/src/theme/variables.scss`)

La IA debe reescribir completamente el archivo `variables.scss` para definir la paleta de colores de Ionic utilizando los códigos hexadecimales de la tabla anterior.

*   **Asegurar el Tema Oscuro:** El tema oscuro debe ser el esquema de color por defecto, ya que el diseño de referencia es un *dark theme*.
*   **Mapeo de Variables:**
    *   `--ion-color-dark`: `#1E1E3F`
    *   `--ion-color-primary`: `#FF4B6B`
    *   `--ion-color-secondary`: `#FF8C4B`
    *   `--ion-color-tertiary`: `#4B6BFF`
    *   `--ion-color-light`: `#FFFFFF`
    *   `--ion-color-medium`: `#AAAAAA`
    *   `--ion-color-success`: `#4CAF50`
    *   `--ion-color-danger`: `#F44336`

### 2. Estilos Globales y Gradientes (`edubooks-app/src/global.scss`)

La IA debe añadir clases de utilidad para el gradiente principal, que es un elemento visual clave en el diseño de referencia.

*   **Clase de Gradiente Principal:** Crear una clase CSS llamada `.gradient-primary` en `global.scss` que aplique el gradiente de `#FF4B6B` a `#FF8C4B`.
    ```css
    .gradient-primary {
      /* Aplicar a botones, tarjetas destacadas, y fondos de bienvenida */
      background: linear-gradient(to right, #FF4B6B, #FF8C4B);
      color: #FFFFFF; /* Asegurar que el texto sea blanco sobre el gradiente */
    }
    ```

### 3. Aplicación por Componente (Mapeo Semántico)

La IA debe revisar los archivos SCSS de los componentes identificados (ej. `login.page.scss`, `home.page.scss`, etc.) y aplicar las variables de color de Ionic de la siguiente manera:

| Elemento de UI | Color a Aplicar | Archivos a Revisar (Ejemplos) |
| :--- | :--- | :--- |
| **Fondo de Pantalla** | `--ion-color-dark` (`#1E1E3F`) | `*.page.scss` (para `ion-content`) |
| **Botones de Acción Principal** | `.gradient-primary` (Clase) | `login.page.scss`, `detalle-libro.page.scss` |
| **Texto de Título/Principal** | `--ion-color-light` (`#FFFFFF`) | Todos los `*.page.scss` |
| **Texto de Placeholder/Secundario** | `--ion-color-medium` (`#AAAAAA`) | `login.page.scss` (para `ion-input`) |
| **Iconos Inactivos (Tabs)** | `--ion-color-tertiary` (`#4B6BFF`) | `tabs.page.scss` (si existe), `home.page.scss` |
| **Iconos Activos (Tabs)** | `--ion-color-primary` (`#FF4B6B`) | `tabs.page.scss` (si existe), `home.page.scss` |
| **Indicadores de Progreso (Gráficos)** | Gradientes y `--ion-color-primary` | `catalogo.page.scss`, `historial-prestamos.page.scss` |
| **Tarjetas/Contenedores Secundarios** | Un tono ligeramente más claro que `--ion-color-dark` (ej. `#2A2A50`) para dar profundidad, o directamente `--ion-color-dark`. | `*.page.scss` (para `ion-card`) |
| **Barra de Navegación (Header)** | `--ion-color-dark` (`#1E1E3F`) | `*.page.scss` (para `ion-header`) |

### 4. Lista de Archivos a Refactorizar

La IA debe enfocarse en refactorizar los estilos de las siguientes páginas, asegurando que se utilicen las variables de Ionic y la clase de gradiente:

*   `edubooks-app/src/app/pages/home/home.page.scss`
*   `edubooks-app/src/app/pages/login/login.page.scss`
*   `edubooks-app/src/app/pages/register/register.page.scss`
*   `edubooks-app/src/app/pages/docente_y_estudiante/catalogo/catalogo.page.scss`
*   `edubooks-app/src/app/pages/docente_y_estudiante/detalle-libro/detalle-libro.page.scss`
*   `edubooks-app/src/app/pages/docente_y_estudiante/historial-prestamos/historial-prestamos.page.scss`
*   `edubooks-app/src/app/pages/docente_y_estudiante/mis-solicitudes/mis-solicitudes.page.scss`
*   `edubooks-app/src/app/pages/docente_y_estudiante/notificaciones/notificaciones.page.scss`
*   **Y cualquier otro archivo `.page.scss` o `.component.scss` que contenga colores codificados.**

## Criterios de Éxito

La refactorización será exitosa si:
1.  El archivo `variables.scss` está actualizado con la paleta de colores de referencia.
2.  El archivo `global.scss` contiene la clase `.gradient-primary`.
3.  Todos los archivos `.page.scss` y `.component.scss` utilizan las variables de Ionic (ej. `var(--ion-color-primary)`) o la clase `.gradient-primary` en lugar de colores codificados.
4.  La aplicación, al ser visualizada, presenta la estética oscura y vibrante del diseño de referencia, con el fondo `#1E1E3F` y los acentos en gradiente.
