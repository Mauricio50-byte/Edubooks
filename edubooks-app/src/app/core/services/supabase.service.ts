import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, User, AuthError } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { LockManagerService } from './lock-manager.service';
import { Capacitor } from '@capacitor/core';

export interface SupabaseAuthResult {
  success: boolean;
  data?: any;
  error?: string | AuthError | null;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase!: SupabaseClient;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  public session$ = this.sessionSubject.asObservable();
  
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private lockManager: LockManagerService) {
    // Inicialización diferida: se realizará bajo demanda
  }

  private async initializeSupabase(): Promise<void> {
    if (this.initialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Evitar limpiar locks justo antes de inicializar para no competir con Navigator Locks
      // this.lockManager.clearSupabaseLocks();
      
      this.supabase = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: window.localStorage,
            storageKey: 'sb-auth-token',
            debug: false
          }
        }
      );

      // Configurar listener de cambios de autenticación
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          console.log('Auth state change:', event, session?.user?.email);
          
          this.sessionSubject.next(session);
          this.userSubject.next(session?.user || null);
          
          switch (event) {
            case 'SIGNED_IN':
              console.log('Usuario autenticado:', session?.user?.email);
              break;
            case 'SIGNED_OUT':
              console.log('Usuario desconectado');
              // No limpiar locks aquí para evitar conflictos con el LockManager
              // this.lockManager.clearSupabaseLocks();
              break;
            case 'TOKEN_REFRESHED':
              console.log('Token renovado para:', session?.user?.email);
              break;
            case 'PASSWORD_RECOVERY':
              console.log('Recuperación de contraseña iniciada');
              break;
            default:
              console.log('Evento de autenticación:', event);
          }
        } catch (error) {
          console.error('Error en onAuthStateChange:', error);
          // Evitar limpiar locks en el catch para no competir con Navigator Locks
          // this.lockManager.clearSupabaseLocks();
        }
      });

      this.initialized = true;
      console.log('Supabase inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando Supabase:', error);
      // Evitar limpiar locks en errores de inicialización
      // this.lockManager.clearSupabaseLocks();
      throw error;
    }
  }

  async loadSession(): Promise<void> {
    try {
      await this.initializeSupabase();
      
      // No limpiar locks antes de cargar sesión para evitar competir por el lock
      // this.lockManager.clearSupabaseLocks();
      
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('Error cargando sesión:', error);
        // this.lockManager.clearSupabaseLocks();
        return;
      }
      
      this.sessionSubject.next(session);
      this.userSubject.next(session?.user || null);
      
      if (session) {
        console.log('Sesión cargada para:', session.user.email);
      } else {
        console.log('No hay sesión activa');
      }
    } catch (error) {
      console.error('Error en loadSession:', error);
      // this.lockManager.clearSupabaseLocks();
    }
  }

  // Esperar a que Supabase esté inicializado
  private async waitForInitialization(): Promise<void> {
    return this.initializeSupabase();
  }

  // Autenticación con Google
  async signInWithGoogle(): Promise<SupabaseAuthResult> {
    await this.waitForInitialization();
    
    try {
      // Limpiar cualquier sesión anterior
      await this.supabase.auth.signOut();
      const redirectUrl = Capacitor.getPlatform() === 'web'
        ? `${window.location.origin}/auth/callback`
        : 'io.ionic.starter://auth/callback';
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }
      // Entornos nativos: abrir navegador y escuchar deep link (sin Browser plugin)
      if (Capacitor.getPlatform() !== 'web' && data?.url) {
        try {
          const { App } = await import('@capacitor/app');
          window.location.href = data.url;
          const listener = await App.addListener('appUrlOpen', async ({ url }) => {
            try {
              const parsed = new URL(url);
              const code = parsed.searchParams.get('code');
              const errorDescription = parsed.searchParams.get('error_description');
              if (errorDescription) {
                console.error('OAuth error:', errorDescription);
                return;
              }
              if (code) {
                const { data: sessionData, error: exchangeError } = await this.supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) {
                  console.error('Error exchanging code for session:', exchangeError);
                  return;
                }
                if (sessionData?.session) {
                  this.sessionSubject.next(sessionData.session);
                  this.userSubject.next(sessionData.session.user);
                }
              }
            } catch (e) {
              console.error('Error procesando appUrlOpen:', e);
            } finally {
              listener.remove();
            }
          });
          return { success: true };
        } catch (e) {
          // Si el plugin Browser no está disponible, redirigir directamente
          window.location.href = data.url;
          return { success: true };
        }
      }
      // En web, Supabase gestionará el redireccionamiento
      return { success: true, data };
    } catch (error) {
      console.error('Error en signInWithGoogle:', error);
      return { success: false, error: 'Error inesperado en autenticación con Google' };
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

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error en signUp:', error);
      return { success: false, error: 'Error inesperado en registro' };
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

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error en signIn:', error);
      return { success: false, error: 'Error inesperado en inicio de sesión' };
    }
  }

  // Cerrar sesión
  async signOut(): Promise<SupabaseAuthResult> {
    try {
      await this.initializeSupabase();
      
      // Evitar limpiar locks antes del sign out
      // this.lockManager.clearSupabaseLocks();
      
      const { error } = await this.supabase.auth.signOut();
      
      // Limpiar locks después del sign out
      this.lockManager.clearSupabaseLocks();
      
      if (error) {
        console.error('Error cerrando sesión:', error);
        return { success: false, error: error.message };
      }
      
      this.sessionSubject.next(null);
      this.userSubject.next(null);
      
      console.log('Sesión cerrada exitosamente');
      return { success: true };
    } catch (error) {
      console.error('Error en signOut:', error);
      // this.lockManager.clearSupabaseLocks();
      return { success: false, error: 'Error inesperado al cerrar sesión' };
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
    return this.userSubject.value;
  }

  // Verificar si está autenticado
  get isAuthenticated(): boolean {
    return this.userSubject.value !== null;
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
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error refrescando token:', error);
      return { success: false, error: 'Error inesperado al refrescar token' };
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
      // Con flujo PKCE, el callback contiene el código de autorización
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
      const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Error intercambiando código por sesión:', error);
          throw error;
        }
        if (data?.session) {
          this.sessionSubject.next(data.session);
          this.userSubject.next(data.session.user);
          return;
        }
      }
      // Fallback: intentar obtener sesión actual si ya fue procesada por Supabase
      const { data: sessionData, error: getError } = await this.supabase.auth.getSession();
      if (getError) {
        console.error('Error obteniendo sesión en callback:', getError);
        throw getError;
      }
      if (sessionData.session) {
        this.sessionSubject.next(sessionData.session);
        this.userSubject.next(sessionData.session.user);
        return;
      }
      console.warn('Callback de autenticación sin sesión ni código');
    } catch (error) {
      console.error('Error manejando callback de auth:', error);
      throw error;
    }
  }
}