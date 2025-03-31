import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { PomodoroService, PomodoroSession } from '../services/pomodoro.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.page.html',
  styleUrls: ['./historial.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    RouterLink
  ]
})
export class HistorialPage implements OnInit {
  sessionsByDay: { date: string; sessions: PomodoroSession[] }[] = [];
  
  constructor(
    private pomodoroService: PomodoroService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadSessions();
  }

  // Cargar las sesiones agrupadas por día
  loadSessions() {
    this.sessionsByDay = this.pomodoroService.getSessionsByDay();
  }

  // Formatear una fecha para mostrarla
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    
    // Verificar si es hoy
    const today = new Date();
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Hoy';
    }
    
    // Verificar si es ayer
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Ayer';
    }
    
    // Formatear la fecha
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  // Formatear una hora para mostrarla
  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Formatear la duración para mostrarla
  formatDuration(durationMs: number): string {
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Calcular el tiempo total para un grupo de sesiones
  getTotalTime(sessions: PomodoroSession[]): string {
    const totalMs = sessions.reduce((total, session) => total + session.duration, 0);
    return this.formatDuration(totalMs);
  }

  // Borrar todo el historial
  async clearHistory() {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: '¿Estás seguro de que quieres borrar todo el historial?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          handler: () => {
            this.pomodoroService.clearAllSessions();
            this.sessionsByDay = [];
          }
        }
      ]
    });

    await alert.present();
  }
}