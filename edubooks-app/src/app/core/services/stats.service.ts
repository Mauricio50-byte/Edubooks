import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface DashboardStats {
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

export interface PopularBook {
  id: string;
  titulo: string;
  autor: string;
  categoria: string;
  imagen_portada?: string;
  total_loans: number;
}

export interface UserActivity {
  user_uid: string;
  nombre: string;
  apellido: string;
  email: string;
  role: string;
  loan_requests: number;
  active_loans: number;
  returned_loans: number;
}

export interface UserActivityResponse {
  period_days: number;
  total_active_users: number;
  users: UserActivity[];
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private apiUrl = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) { }

  getDashboard(tenantId?: string): Observable<DashboardStats> {
    const params: any = {};
    if (tenantId) {
      params.tenant_id = tenantId;
    }
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/`, { params });
  }

  getPopularBooks(limit: number = 10, tenantId?: string): Observable<PopularBook[]> {
    const params: any = { limit: limit.toString() };
    if (tenantId) {
      params.tenant_id = tenantId;
    }
    return this.http.get<PopularBook[]>(`${this.apiUrl}/popular-books/`, { params });
  }

  getUserActivity(days: number = 7, tenantId?: string): Observable<UserActivityResponse> {
    const params: any = { days: days.toString() };
    if (tenantId) {
      params.tenant_id = tenantId;
    }
    return this.http.get<UserActivityResponse>(`${this.apiUrl}/user-activity/`, { params });
  }
}
