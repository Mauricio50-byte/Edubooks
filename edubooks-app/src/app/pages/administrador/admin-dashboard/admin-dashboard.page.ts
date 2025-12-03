import { Component, OnInit } from '@angular/core';
import { StatsService, DashboardStats, PopularBook, UserActivity } from 'src/app/core/services/stats.service';
import { LoadingController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: false
})
export class AdminDashboardPage implements OnInit {
  stats: DashboardStats | null = null;
  popularBooks: PopularBook[] = [];
  userActivity: UserActivity[] = [];
  activityPeriodDays = 7;
  totalActiveUsers = 0;

  // Para gráficos
  usersChartData: any;
  loansChartData: any;
  booksChartData: any;

  loading = false;
  lastUpdate: Date | null = null;

  constructor(
    private statsService: StatsService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    const loading = await this.loadingController.create({
      message: 'Cargando estadísticas...'
    });
    await loading.present();

    try {
      // Cargar estadísticas generales
      const stats = await this.statsService.getDashboard().toPromise();
      this.stats = stats || null;

      // Cargar libros populares
      const books = await this.statsService.getPopularBooks(5).toPromise();
      this.popularBooks = books || [];

      // Cargar actividad de usuarios
      const activityData = await this.statsService.getUserActivity(this.activityPeriodDays).toPromise();
      if (activityData) {
        this.userActivity = activityData.users ? activityData.users.slice(0, 10) : [];
        this.totalActiveUsers = activityData.total_active_users || 0;
      } else {
        this.userActivity = [];
        this.totalActiveUsers = 0;
      }

      this.lastUpdate = new Date();
      this.prepareChartData();
    } catch (error) {
      console.error('Error loading dashboard:', error);
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se pudieron cargar las estadísticas',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      await loading.dismiss();
    }
  }

  prepareChartData() {
    if (!this.stats) return;

    // Datos para gráfico de usuarios por rol
    this.usersChartData = {
      labels: ['Estudiantes', 'Docentes', 'Administradores'],
      datasets: [{
        data: [
          this.stats.users_by_role.estudiante,
          this.stats.users_by_role.docente,
          this.stats.users_by_role.administrador
        ],
        backgroundColor: [
          '#3880ff',
          '#5260ff',
          '#7044ff'
        ]
      }]
    };

    // Datos para gráfico de préstamos
    this.loansChartData = {
      labels: ['Activos', 'Pendientes', 'Vencidos'],
      datasets: [{
        data: [
          this.stats.active_loans,
          this.stats.pending_loans,
          this.stats.overdue_loans
        ],
        backgroundColor: [
          '#2dd36f',
          '#ffc409',
          '#eb445a'
        ]
      }]
    };

    // Datos para gráfico de libros
    this.booksChartData = {
      labels: ['Disponibles', 'Prestados'],
      datasets: [{
        data: [
          this.stats.available_books,
          this.stats.total_books - this.stats.available_books
        ],
        backgroundColor: [
          '#2dd36f',
          '#3880ff'
        ]
      }]
    };
  }

  async doRefresh(event: any) {
    await this.loadDashboardData();
    event.target.complete();
  }

  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  getStatusColor(status: string): string {
    const colors: any = {
      'success': 'success',
      'warning': 'warning',
      'danger': 'danger',
      'primary': 'primary'
    };
    return colors[status] || 'medium';
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('es-ES');
  }
}
