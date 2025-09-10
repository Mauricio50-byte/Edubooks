import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ActionSheetController } from '@ionic/angular';
import { NotificacionesService, Notificacion } from '../../core/services/notificaciones.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.page.html',
  styleUrls: ['./notificaciones.page.scss'],
  standalone: false
})
export class NotificacionesPage implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  notificacionesNoLeidas = 0;
  filtroTipo: string = '';
  mostrarSoloNoLeidas = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private notificacionesService: NotificacionesService,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController
  ) {}

  ngOnInit() {
    this.cargarNotificaciones();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Cargar notificaciones
   */
  cargarNotificaciones() {
    this.subscription.add(
      this.notificacionesService.notificaciones$.subscribe(notificaciones => {
        this.notificaciones = this.aplicarFiltros(notificaciones);
      })
    );

    this.subscription.add(
      this.notificacionesService.getNotificacionesNoLeidas().subscribe(count => {
        this.notificacionesNoLeidas = count;
      })
    );
  }

  /**
   * Aplicar filtros a las notificaciones
   */
  aplicarFiltros(notificaciones: Notificacion[]): Notificacion[] {
    let filtradas = [...notificaciones];

    // Filtro por tipo
    if (this.filtroTipo) {
      filtradas = filtradas.filter(n => n.tipo === this.filtroTipo);
    }

    // Filtro por leídas/no leídas
    if (this.mostrarSoloNoLeidas) {
      filtradas = filtradas.filter(n => !n.leida);
    }

    return filtradas;
  }

  /**
   * Cambiar filtro de tipo
   */
  onFiltroTipoChange(event: any) {
    this.filtroTipo = event.detail.value;
    this.cargarNotificaciones();
  }

  /**
   * Alternar filtro de no leídas
   */
  toggleSoloNoLeidas() {
    this.mostrarSoloNoLeidas = !this.mostrarSoloNoLeidas;
    this.cargarNotificaciones();
  }

  /**
   * Marcar notificación como leída
   */
  marcarComoLeida(notificacion: Notificacion) {
    if (!notificacion.leida) {
      this.notificacionesService.marcarComoLeida(notificacion.id);
    }
  }

  /**
   * Ejecutar acción de notificación
   */
  ejecutarAccion(notificacion: Notificacion) {
    if (notificacion.accion) {
      notificacion.accion.callback();
      this.marcarComoLeida(notificacion);
    }
  }

  /**
   * Mostrar opciones de notificación
   */
  async mostrarOpciones(notificacion: Notificacion) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Opciones de Notificación',
      buttons: [
        {
          text: notificacion.leida ? 'Marcar como no leída' : 'Marcar como leída',
          icon: notificacion.leida ? 'mail' : 'mail-open',
          handler: () => {
            if (notificacion.leida) {
              // TODO: Implementar marcar como no leída
              console.log('Marcar como no leída');
            } else {
              this.marcarComoLeida(notificacion);
            }
          }
        },
        {
          text: 'Eliminar',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.confirmarEliminacion(notificacion);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Confirmar eliminación de notificación
   */
  async confirmarEliminacion(notificacion: Notificacion) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de que deseas eliminar esta notificación?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.notificacionesService.eliminarNotificacion(notificacion.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Marcar todas como leídas
   */
  async marcarTodasComoLeidas() {
    const alert = await this.alertController.create({
      header: 'Marcar Todas como Leídas',
      message: '¿Deseas marcar todas las notificaciones como leídas?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: () => {
            this.notificacionesService.marcarTodasComoLeidas();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Limpiar todas las notificaciones
   */
  async limpiarNotificaciones() {
    const alert = await this.alertController.create({
      header: 'Limpiar Notificaciones',
      message: '¿Estás seguro de que deseas eliminar todas las notificaciones? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar Todas',
          role: 'destructive',
          handler: () => {
            this.notificacionesService.limpiarNotificaciones();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Generar notificaciones de prueba (solo para desarrollo)
   */
  generarNotificacionesPrueba() {
    this.notificacionesService.generarNotificacionesPrueba();
  }

  /**
   * Obtener icono según el tipo de notificación
   */
  getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'success': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'error': return 'alert-circle';
      case 'info':
      default: return 'information-circle';
    }
  }

  /**
   * Obtener color según el tipo de notificación
   */
  getColorTipo(tipo: string): string {
    switch (tipo) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'danger';
      case 'info':
      default: return 'primary';
    }
  }

  /**
   * Formatear fecha de notificación
   */
  formatearFecha(fecha: Date): string {
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    if (minutos < 1) {
      return 'Ahora';
    } else if (minutos < 60) {
      return `Hace ${minutos} min`;
    } else if (horas < 24) {
      return `Hace ${horas} h`;
    } else if (dias < 7) {
      return `Hace ${dias} días`;
    } else {
      return fecha.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: fecha.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  /**
   * Refrescar notificaciones
   */
  doRefresh(event: any) {
    // En una implementación real, aquí se consultarían las notificaciones del servidor
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }
}
