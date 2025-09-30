import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SetupData {
  institucion: string;
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  nombre: string;
  apellido: string;
}

export interface SetupResponse {
  message: string;
  usuario: {
    id: number;
    email: string;
    username: string;
    nombre: string;
    apellido: string;
    is_superuser: boolean;
    administrador: {
      id: number;
      institucion: string;
      fecha_nombramiento: string;
    };
  };
}

export interface SystemStatusResponse {
  is_initialized: boolean;
  superusers_count: number;
  total_users_count: number;
  message: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class SetupService {

  constructor(private apiService: ApiService) { }

  /**
   * Verifica si el sistema ya está inicializado
   */
  verificarSistema(): Observable<SystemStatusResponse> {
    return this.apiService.get<SystemStatusResponse>('/setup/verificar/');
  }

  /**
   * Inicializa el sistema con los datos del administrador
   */
  inicializarSistema(setupData: SetupData): Observable<SetupResponse> {
    return this.apiService.post<SetupResponse>('/setup/inicializar/', setupData);
  }
}