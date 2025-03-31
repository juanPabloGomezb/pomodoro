import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private hasPermission = false;

  constructor(private platform: Platform) {}

  // Solicitar permiso para mostrar notificaciones
  async requestPermission(): Promise<void> {
    // Solo solicitar permiso en navegadores web
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        this.hasPermission = true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.hasPermission = permission === 'granted';
      }
    }
  }

  // Mostrar una notificación
  showNotification(title: string, body: string): void {
    // Si la app está en primer plano, mostrar una alerta
    if (!document.hidden) {
      // Aquí podrías usar un componente de alerta de Ionic
      // o simplemente usar un sonido como en la implementación actual
      console.log('Alerta en primer plano:', title, body);
      
      // También podrías usar ToastController o AlertController de Ionic
    } 
    // Si la app está en segundo plano o el navegador lo soporta, mostrar una notificación
    else if (this.hasPermission && typeof Notification !== 'undefined') {
      const notification = new Notification(title, {
        body,
        icon: 'assets/icon/favicon.png'
      });
      
      // Cerrar la notificación después de 5 segundos
      setTimeout(() => notification.close(), 5000);
    }
    
    // Para aplicaciones móviles, deberías usar un plugin como Local Notifications
    // Cordova o Capacitor para enviar notificaciones nativas
    if (this.platform.is('cordova') || this.platform.is('capacitor')) {
      // Aquí iría la implementación con el plugin nativo
      console.log('Debería enviar notificación nativa:', title, body);
    }
  }
}