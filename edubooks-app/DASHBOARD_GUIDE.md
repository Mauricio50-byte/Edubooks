# Dashboard de Administrador - Edubooks

## 📊 Vista General

El Dashboard de Administrador es la página principal para los administradores de la institución, proporcionando una vista completa y en tiempo real de las estadísticas y actividad del sistema de biblioteca.

---

## 🎨 Características del Dashboard

### 1. **Tarjetas de Estadísticas Principales**

Muestra métricas clave en tarjetas visuales con gradientes modernos:

- **Total Usuarios**: Número total de usuarios registrados
- **Total Libros**: Cantidad total de libros en el inventario
- **Libros Disponibles**: Libros actualmente disponibles para préstamo
- **Préstamos Activos**: Préstamos en curso
- **Préstamos Pendientes**: Solicitudes esperando aprobación
- **Préstamos Vencidos**: Préstamos que superaron la fecha de devolución (con alerta visual)

### 2. **Distribución de Usuarios por Rol**

Visualización con barras de progreso que muestra:
- Cantidad de estudiantes
- Cantidad de docentes
- Cantidad de administradores

Cada barra tiene un color distintivo y muestra el porcentaje del total.

### 3. **Top 5 Libros Más Prestados**

Lista ordenada de los libros más populares con:
- Posición en el ranking (#1, #2, #3...)
- Imagen de portada
- Título y autor
- Categoría
- Número total de préstamos

### 4. **Actividad Reciente de Usuarios**

Muestra los usuarios más activos en los últimos 7 días con:
- Avatar con iniciales
- Nombre completo y email
- Rol del usuario
- Métricas de actividad:
  - Solicitudes de préstamo
  - Préstamos activos
  - Libros devueltos

### 5. **Acciones Rápidas**

Botones de acceso rápido a funciones importantes:
- Ver solicitudes pendientes (con contador)
- Gestionar préstamos vencidos (solo si hay)
- Agregar nuevo libro
- Gestionar usuarios

---

## 🔄 Funcionalidades

### Actualización Automática
- Pull-to-refresh para actualizar datos
- Botón de refresh en el header
- Timestamp de última actualización

### Diseño Responsivo
- Adaptable a diferentes tamaños de pantalla
- Grid flexible para tarjetas de estadísticas
- Optimizado para móvil y tablet

### Animaciones
- Transiciones suaves al cargar
- Hover effects en tarjetas
- Animación de pulso en alertas (préstamos vencidos)

---

## 🎯 Uso

### Navegación
```
Menú → Dashboard
```

### Actualizar Datos
1. **Pull-to-refresh**: Desliza hacia abajo en la pantalla
2. **Botón refresh**: Toca el ícono de refresh en el header

### Acceder a Detalles
- Toca cualquier tarjeta de acción rápida para navegar a la sección correspondiente
- Los números en las tarjetas son informativos

---

## 🛠️ Implementación Técnica

### Servicios Utilizados

```typescript
// StatsService
getDashboard(): Observable<DashboardStats>
getPopularBooks(limit: number): Observable<PopularBook[]>
getUserActivity(days: number): Observable<UserActivityResponse>
```

### Estructura de Datos

```typescript
interface DashboardStats {
  total_users: number;
  total_books: number;
  available_books: number;
  active_loans: number;
  pending_loans: number;
  overdue_loans: number;
  active_reservations: number;
  users_by_role: {
    estudiante: number;
    docente: number;
    administrador: number;
  };
  timestamp: number;
}
```

### Endpoints API

```
GET /api/stats/dashboard/
GET /api/stats/popular-books/?limit=5
GET /api/stats/user-activity/?days=7
```

---

## 🎨 Paleta de Colores

### Gradientes de Tarjetas
- **Usuarios**: `#667eea → #764ba2` (Púrpura)
- **Libros**: `#f093fb → #f5576c` (Rosa)
- **Disponibles**: `#4facfe → #00f2fe` (Azul)
- **Activos**: `#43e97b → #38f9d7` (Verde)
- **Pendientes**: `#fa709a → #fee140` (Amarillo)
- **Vencidos**: `#ff6b6b → #ee5a6f` (Rojo)

### Roles
- **Estudiante**: Azul primario
- **Docente**: Morado secundario
- **Administrador**: Azul terciario

---

## 📱 Responsive Breakpoints

```scss
// Tablet
@media (max-width: 768px) {
  - Grid de 2 columnas
  - Iconos más pequeños
}

// Móvil
@media (max-width: 480px) {
  - Grid de 1 columna
  - Padding reducido
}
```

---

## ⚡ Optimizaciones

### Performance
- Carga asíncrona de datos
- Loading states
- Error handling con alertas

### UX
- Estados vacíos informativos
- Feedback visual en acciones
- Indicadores de carga

---

## 🔐 Permisos Requeridos

- **Rol**: Administrador
- **Endpoint**: Autenticado con token Firebase
- **Tenant**: Solo datos de la institución del administrador

---

## 📝 Notas de Desarrollo

### Agregar al Routing

```typescript
// app-routing.module.ts
{
  path: 'admin-dashboard',
  loadChildren: () => import('./pages/administrador/admin-dashboard/admin-dashboard.module')
    .then(m => m.AdminDashboardPageModule),
  canActivate: [AuthGuard, AdminGuard]
}
```

### Agregar al Menú

```html
<!-- Menu lateral -->
<ion-item routerLink="/admin-dashboard" *ngIf="isAdmin">
  <ion-icon slot="start" name="stats-chart-outline"></ion-icon>
  <ion-label>Dashboard</ion-label>
</ion-item>
```

---

## 🚀 Mejoras Futuras

### Gráficos Interactivos
- Integrar Chart.js o ng2-charts
- Gráficos de línea para tendencias
- Gráficos de dona para distribuciones

### Filtros Temporales
- Selector de rango de fechas
- Comparación con períodos anteriores
- Exportar reportes

### Notificaciones
- Alertas en tiempo real
- Push notifications para eventos críticos
- Badge con contador de pendientes

### Widgets Personalizables
- Drag & drop para reorganizar
- Mostrar/ocultar widgets
- Guardar preferencias de usuario

---

## 📚 Recursos Adicionales

- [API Endpoints Documentation](../../../edubooks-api/API_ENDPOINTS.md)
- [Permissions Guide](../../../edubooks-api/PERMISSIONS_GUIDE.md)
- [Ionic Components](https://ionicframework.com/docs/components)
- [Angular Best Practices](https://angular.io/guide/styleguide)
