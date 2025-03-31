import { Injectable } from '@angular/core';
import { Platform, ToastController, AlertController } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';

// Definimos una interfaz extendida para manejar el problema de actionButtons
interface ExtendedNotificationSchema {
  id: number;
  title: string;
  body: string;
  actionTypeId?: string;
  actionButtons?: Array<{ id: string; title: string }>;
  schedule?: { at: Date };
  sound?: string;
  autoCancel?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  constructor(
    private platform: Platform,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  // Request permission for notifications using Capacitor
  async requestPermission(): Promise<void> {
    if (this.platform.is('capacitor')) {
      const { display } = await LocalNotifications.checkPermissions();
      
      if (display !== 'granted') {
        const { display } = await LocalNotifications.requestPermissions();
        console.log('Notification permission status:', display);
      }
    } else {
      console.log('Capacitor not available, using fallback notifications');
    }
  }

  // Show notification with timer info and controls
  async showNotification(title: string, body: string, timeRemaining?: string, timerId?: number): Promise<void> {
    console.log('Mostrando notificación:', title, body);
    
    // Add time remaining if provided
    let message = body;
    if (timeRemaining) {
      message = `${body} - Tiempo restante: ${timeRemaining}`;
    }

    if (this.platform.is('capacitor')) {
      await this.showSystemNotification(title, message, timerId);
    } else if (!document.hidden) {
      // In-app notification
      await this.showToast(title, message);
    } else {
      // For background in web, store pending notification
      localStorage.setItem('pending_notification', JSON.stringify({
        title,
        body: message,
        timestamp: Date.now()
      }));
    }
  }

  // Show system notification using Capacitor
  private async showSystemNotification(title: string, body: string, timerId?: number): Promise<void> {
    try {
      // Create action buttons if we have a timer ID
      const actionButtons = timerId ? [
        { id: 'pause', title: 'Pausar' },
        { id: 'skip', title: 'Saltar' }
      ] : [];

      // Creamos un objeto de notificación con nuestra interfaz extendida
      const notificationObj: ExtendedNotificationSchema = {
        id: timerId || Math.floor(Math.random() * 10000),
        title: title,
        body: body,
        actionTypeId: 'TIMER_CONTROLS',
        actionButtons: actionButtons,
        schedule: { at: new Date(Date.now() + 1000) },
        sound: 'assets/sounds/alert.mp3',
        autoCancel: true
      };

      // Usamos type assertion para que TypeScript no se queje
      await LocalNotifications.schedule({
        notifications: [notificationObj as any]
      });
    } catch (error) {
      console.error('Error showing system notification:', error);
      // Fallback to toast
      this.showToast(title, body);
    }
  }

  // Show a toast notification
  private async showToast(title: string, body: string): Promise<void> {
    const toast = await this.toastController.create({
      header: title,
      message: body,
      position: 'top',
      duration: 5000,
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ],
      color: 'primary'
    });
        
    await toast.present();
    
    // Also play sound
    this.playSound();
  }

  // Checks for pending notifications on app resume
  checkPendingNotifications(): void {
    const pendingNotificationJson = localStorage.getItem('pending_notification');
    if (pendingNotificationJson) {
      try {
        const notification = JSON.parse(pendingNotificationJson);
        // Only show if it's relatively recent (last 5 minutes)
        if (Date.now() - notification.timestamp < 5 * 60 * 1000) {
          this.showAlert(notification.title, notification.body);
        }
        localStorage.removeItem('pending_notification');
      } catch (e) {
        console.error('Error parsing pending notification', e);
        localStorage.removeItem('pending_notification');
      }
    }
  }

  // Show a more prominent alert dialog
  private async showAlert(title: string, body: string): Promise<void> {
    const alert = await this.alertController.create({
      header: title,
      message: body,
      buttons: ['OK'],
      cssClass: 'notification-alert'
    });
    
    await alert.present();
    this.playSound();
  }

  // Play a sound for notification
  private playSound(): void {
    try {
      const audio = new Audio('assets/sounds/alert.mp3');
      audio.play().catch(error => {
        console.error('Error al reproducir el sonido:', error);
      });
    } catch (error) {
      console.error('Error al crear el objeto de audio:', error);
    }
  }

  // Setup notification action handlers (call this in your app initialization)
  setupNotificationListeners(callbacks: {
    onPause?: () => void;
    onSkip?: () => void;
  }): void {
    if (this.platform.is('capacitor')) {
      LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'TIMER_CONTROLS',
            actions: [
              { id: 'pause', title: 'Pausar' },
              { id: 'skip', title: 'Saltar' }
            ]
          }
        ]
      });

      // Listen for notification actions
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const { actionId } = notificationAction;
        
        if (actionId === 'pause' && callbacks.onPause) {
          callbacks.onPause();
        } else if (actionId === 'skip' && callbacks.onSkip) {
          callbacks.onSkip();
        }
      });
    }
  }
}