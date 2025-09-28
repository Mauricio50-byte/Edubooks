import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, AuthError } from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SupabaseAuthResult {
  data: any;
  error: AuthError | null;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase!: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isInitialized = false;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    try {
      this.supabase = createClient(environment.supabase.url, environment.supabase.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        }
      });
      
      // Escuchar cambios de autenticación
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session);
        this.currentUserSubject.next(session?.user ?? null);
        
        // Manejar el callback de OAuth
        if (event === 'SIGNED_IN' && session) {
          console.log('Usuario autenticado exitosamente');
        }
      });

      // Cargar sesión actual con manejo de errores
      await this.loadSession();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error inicializando Supabase:', error);
      this.isInitialized = true; // Marcar como inicializado aunque haya error
    }
  }

  private async loadSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) {
        console.warn('Error cargando sesión:', error);
        return;
      }
      this.currentUserSubject.next(session?.user ?? null);
    } catch (error) {
      console.warn('Error al cargar sesión:', error);
    }
  }

  // Esperar a que Supabase esté inicializado
  private async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return;
    
    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkInitialized, 100);
        }
      };
      checkInitialized();
    });
  }

  // Autenticación con Google
  async signInWithGoogle(): Promise<SupabaseAuthResult> {
    await this.waitForInitialization();
    
    try {
      // Limpiar cualquier sesión anterior
      await this.supabase.auth.signOut();
      
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      return { data, error };
    } catch (error) {
      console.error('Error en signInWithGoogle:', error);
      return { data: null, error: error as AuthError };
    }
  }

  // Registro con email y contraseña
  async signUp(email: string, password: string, metadata?: any): Promise<SupabaseAuthResult> {
    await this.waitForInitialization();
    
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      return { data, error };
    } catch (error) {
      console.error('Error en signUp:', error);
      return { data: null, error: error as AuthError };
    }
  }

  // Inicio de sesión con email y contraseña
  async signIn(email: string, password: string): Promise<SupabaseAuthResult> {
    await this.waitForInitialization();
    
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      return { data, error };
    } catch (error) {
      console.error('Error en signIn:', error);
      return { data: null, error: error as AuthError };
    }
  }

  // Cerrar sesión
  async signOut(): Promise<void> {
    await this.waitForInitialization();
    
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.warn('Error cerrando sesión:', error);
      }
      this.currentUserSubject.next(null);
    } catch (error) {
      console.error('Error en signOut:', error);
      this.currentUserSubject.next(null);
    }
  }

  // Obtener sesión actual
  async getSession() {
    await this.waitForInitialization();
    
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) {
        console.warn('Error obteniendo sesión:', error);
        return null;
      }
      return session;
    } catch (error) {
      console.error('Error en getSession:', error);
      return null;
    }
  }

  // Obtener usuario actual
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Verificar si está autenticado
  get isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // Obtener token de acceso
  async getAccessToken(): Promise<string | null> {
    try {
      const session = await this.getSession();
      return session?.access_token ?? null;
    } catch (error) {
      console.error('Error obteniendo access token:', error);
      return null;
    }
  }

  // Refrescar token
  async refreshToken(): Promise<SupabaseAuthResult> {
    await this.waitForInitialization();
    
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      return { data, error };
    } catch (error) {
      console.error('Error refrescando token:', error);
      return { data: null, error: error as AuthError };
    }
  }

  // Obtener cliente de Supabase para operaciones avanzadas
  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Método para manejar el callback de OAuth
  async handleAuthCallback(): Promise<void> {
    await this.waitForInitialization();
    
    try {
      // Procesar los parámetros de la URL del callback
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('Error en callback de auth:', error);
        throw error;
      }
      
      if (data.session) {
        console.log('Sesión establecida exitosamente en callback');
        this.currentUserSubject.next(data.session.user);
        return;
      }

      // Si no hay sesión, intentar procesar el hash de la URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken) {
        console.log('Procesando tokens del callback OAuth');
        // Establecer la sesión con los tokens obtenidos
        const { data: sessionData, error: sessionError } = await this.supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });
        
        if (sessionError) {
          console.error('Error estableciendo sesión:', sessionError);
          throw sessionError;
        }
        
        if (sessionData.session) {
          console.log('Sesión establecida con tokens del callback');
          this.currentUserSubject.next(sessionData.session.user);
        }
      } else {
        console.warn('No se encontraron tokens en el callback');
      }
    } catch (error) {
      console.error('Error manejando callback de auth:', error);
      throw error;
    }
  }
}