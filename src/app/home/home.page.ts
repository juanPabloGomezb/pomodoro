import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { Platform } from '@ionic/angular';
import { PomodoroService } from '../services/pomodoro.service';
import { NotificationsService } from '../services/notifications.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterLink
  ]
})
export class HomePage implements OnInit, OnDestroy {
  // Variables para el temporizador
  taskName: string = '';
  timerRunning: boolean = false;
  timerPaused: boolean = false;
  displayTime: string = '25:00';
  timeLeft: number = 25 * 60; // 25 minutos en segundos
  timerId: any;
  currentPhase: 'work' | 'shortBreak' | 'longBreak' = 'work';
  currentPhaseLabel: string = 'Trabajo';
  currentCycle: number = 1;
  completedSessions: number = 0;
  longBreakDuration: number = 15; // Duración por defecto en minutos

  // Variables para la sesión
  sessionStartTime: Date | null = null;
  
  // Subscripciones
  private backButtonSubscription!: Subscription;

  constructor(
    private platform: Platform,
    private pomodoroService: PomodoroService,
    private notificationsService: NotificationsService,
    private ngZone: NgZone // Añadimos NgZone para asegurar que los cambios se detecten
  ) {}

  ngOnInit() {
    // Solicitar permisos para notificaciones
    this.notificationsService.requestPermission();
    
    // Cargar la preferencia del descanso largo
    this.loadLongBreakPreference();
    
    // Manejar la app en segundo plano
    this.handleBackgroundMode();
    
    // Cargar las sesiones completadas de hoy
    this.loadCompletedSessions();
  }

  ngOnDestroy() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
    
    // Detener el temporizador si está en ejecución
    if (this.timerRunning || this.timerPaused) {
      this.stopTimer();
    }
  }

  handleBackgroundMode() {
    // Manejar eventos para cuando la app está en segundo plano
    this.platform.pause.subscribe(() => {
      // La app ha pasado a segundo plano, pero el temporizador continúa
      console.log('App en segundo plano');
      // Guardar el tiempo actual cuando la app entra en segundo plano
      if (this.timerRunning) {
        localStorage.setItem('pomodoro_background_time', Date.now().toString());
      }
    });

    this.platform.resume.subscribe(() => {
      // La app ha vuelto a primer plano
      console.log('App en primer plano');
      // Ajustar el tiempo si el temporizador estaba corriendo
      if (this.timerRunning) {
        const backgroundTime = localStorage.getItem('pomodoro_background_time');
        if (backgroundTime) {
          const elapsedSeconds = Math.floor((Date.now() - parseInt(backgroundTime)) / 1000);
          this.ngZone.run(() => {
            this.timeLeft = Math.max(0, this.timeLeft - elapsedSeconds);
            if (this.timeLeft <= 0) {
              this.phaseComplete();
            } else {
              this.updateDisplayTime();
            }
          });
        }
      }
    });
    
    // Evitar que el botón de retroceso cierre la app
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      // No hacer nada, evita que se cierre la app
    });
  }

  // Cargar la preferencia de duración del descanso largo
  loadLongBreakPreference() {
    const savedDuration = localStorage.getItem('longBreakDuration');
    if (savedDuration) {
      this.longBreakDuration = parseInt(savedDuration);
    }
  }

  // Guardar la preferencia de duración del descanso largo
  saveLongBreakPreference() {
    localStorage.setItem('longBreakDuration', this.longBreakDuration.toString());
  }

  // Cargar las sesiones completadas hoy
  loadCompletedSessions() {
    this.completedSessions = this.pomodoroService.getCompletedSessionsToday();
  }

  // Iniciar el temporizador
  startTimer() {
    console.log('startTimer llamado, taskName:', this.taskName);
    if (!this.taskName || this.taskName.trim() === '') {
      console.log('No se puede iniciar sin nombre de tarea');
      return; // No iniciar si no hay tarea
    }
    
    this.timerRunning = true;
    this.timerPaused = false;
    
    // Registrar la hora de inicio si estamos iniciando una nueva sesión de trabajo
    if (this.currentPhase === 'work' && this.timeLeft === 25 * 60) {
      this.sessionStartTime = new Date();
    }
    
    clearInterval(this.timerId); // Limpiamos cualquier intervalo existente
    
    this.timerId = setInterval(() => {
      this.ngZone.run(() => {
        this.timeLeft--;
        this.updateDisplayTime();
        
        if (this.timeLeft <= 0) {
          this.phaseComplete();
        }
      });
    }, 1000);
  }

  // Pausar el temporizador
  pauseTimer() {
    console.log('pauseTimer llamado');
    if (this.timerRunning) {
      clearInterval(this.timerId);
      this.timerRunning = false;
      this.timerPaused = true;
    }
  }
  addOneMinute() {
    if (this.timerRunning || this.timerPaused) {
      // Añadir 60 segundos al tiempo restante
      this.timeLeft += 60;
      this.updateDisplayTime();
      console.log('Añadido un minuto al temporizador');
    }
  }

  // Reanudar el temporizador
  resumeTimer() {
    console.log('resumeTimer llamado');
    if (this.timerPaused) {
      this.startTimer();
    }
  }

  // Detener el temporizador
  stopTimer() {
    console.log('stopTimer llamado');
    clearInterval(this.timerId);
    this.timerRunning = false;
    this.timerPaused = false;
    
    // Guardar la sesión si estábamos en una fase de trabajo y no estamos al inicio
    if (this.currentPhase === 'work' && this.timeLeft !== 25 * 60 && this.sessionStartTime) {
      this.saveSession();
    }
    
    // Reiniciar el temporizador
    this.resetTimer();
  }

  // Saltar a la siguiente fase
  skipToNextPhase() {
    console.log('skipToNextPhase llamado');
    // Si estamos en una fase de trabajo, guardar la sesión
    if (this.currentPhase === 'work' && this.sessionStartTime) {
      this.saveSession();
    }
    
    clearInterval(this.timerId);
    this.phaseComplete();
  }

  // Cuando se completa una fase
  phaseComplete() {
    console.log('phaseComplete llamado');
    clearInterval(this.timerId);
    
    // Determinar la siguiente fase
    if (this.currentPhase === 'work') {
      // Si estamos completando trabajo, guardar la sesión
      if(this.sessionStartTime) {
        this.saveSession();
      }
      
      // Incrementar el ciclo o resetear después del cuarto
      if (this.currentCycle < 4) {
        this.currentCycle++;
        this.currentPhase = 'shortBreak';
        this.currentPhaseLabel = 'Descanso Corto';
        this.timeLeft = 5 * 60; // 5 minutos
      } else {
        this.currentCycle = 1;
        this.currentPhase = 'longBreak';
        this.currentPhaseLabel = 'Descanso Largo';
        this.timeLeft = this.longBreakDuration * 60; // 15 o 30 minutos
      }
    } else {
      // Si estamos completando un descanso, volver al trabajo
      this.currentPhase = 'work';
      this.currentPhaseLabel = 'Trabajo';
      this.timeLeft = 25 * 60; // 25 minutos
      
      // Reiniciar la hora de inicio para la próxima sesión
      this.sessionStartTime = new Date();
    }
    
    // Actualizar el display
    this.updateDisplayTime();
    
    // Notificar al usuario
    this.notifyPhaseChange();
    
    // Continuar automáticamente
    this.startTimer();
  }

  // Actualizar el tiempo mostrado
  updateDisplayTime() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Reiniciar el temporizador
  resetTimer() {
    this.timeLeft = 25 * 60; // 25 minutos
    this.currentPhase = 'work';
    this.currentPhaseLabel = 'Trabajo';
    this.sessionStartTime = null;
    this.updateDisplayTime();
  }

  // Notificar al usuario sobre el cambio de fase
  notifyPhaseChange() {
    let message = '';
    
    if (this.currentPhase === 'work') {
      message = '¡Tiempo de trabajo! Concéntrate en tu tarea.';
    } else if (this.currentPhase === 'shortBreak') {
      message = '¡Toma un descanso corto de 5 minutos!';
    } else {
      message = `¡Toma un descanso largo de ${this.longBreakDuration} minutos!`;
    }
    
    // Mostrar notificación
    this.notificationsService.showNotification('Pomodoro Timer', message);
    
    // Además reproducir un sonido
    this.playAlertSound();
  }

  // Reproducir sonido de alerta
  playAlertSound() {
    try {
      const audio = new Audio('assets/sounds/alert.mp3');
      audio.play().catch(error => {
        console.error('Error al reproducir el sonido:', error);
      });
    } catch (error) {
      console.error('Error al crear el objeto de audio:', error);
    }
  }

  // Guardar la sesión completada
  saveSession() {
    if (!this.sessionStartTime) {
      console.log('No hay hora de inicio para guardar la sesión');
      return;
    }
    
    const endTime = new Date();
    const durationMs = endTime.getTime() - this.sessionStartTime.getTime();
    
    const sessionData = {
      taskName: this.taskName,
      startTime: this.sessionStartTime,
      endTime: endTime,
      duration: durationMs, // duración en milisegundos
    };
    
    console.log('Guardando sesión:', sessionData);
    this.pomodoroService.saveSession(sessionData);
    this.sessionStartTime = null;
    
    // Actualizar el contador de sesiones completadas
    this.loadCompletedSessions();
  }
}