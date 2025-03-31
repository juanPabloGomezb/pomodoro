import { Injectable } from '@angular/core';
import { Platform, ToastController, AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  
  constructor(
    private platform: Platform,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  // No need for permission requests with this approach
  async requestPermission(): Promise<void> {
    // Just a placeholder for compatibility
    console.log('Notifications service initialized');
    return Promise.resolve();
  }

  // Show notification using Toast or Alert
  async showNotification(title: string, body: string): Promise<void> {
    console.log('Mostrando notificación:', title, body);
    
    // If app is in foreground
    if (!document.hidden) {
      await this.showToast(title, body);
    } else {
      // For background, we'll try to use a more prominent alert when they return
      localStorage.setItem('pending_notification', JSON.stringify({
        title,
        body,
        timestamp: Date.now()
      }));
    }
  }

  // Show a toast notification
  private async showToast(title: string, body: string): Promise<void> {
    const toast = await this.toastController.create({
      header: title,
      message: body,
      position: 'top',
      duration: 3000,
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
}