import { Injectable } from '@angular/core';

export interface PomodoroSession {
  id: string;
  taskName: string;
  startTime: Date;
  endTime: Date;
  duration: number; // duración en milisegundos
}

@Injectable({
  providedIn: 'root'
})
export class PomodoroService {
  private readonly STORAGE_KEY = 'pomodoro_sessions';

  constructor() {}

  // Guardar una sesión
  saveSession(sessionData: Omit<PomodoroSession, 'id'>): void {
    const sessions = this.getAllSessions();
    
    // Generar un ID único
    const newSession: PomodoroSession = {
      ...sessionData,
      id: new Date().getTime().toString()
    };
    
    sessions.push(newSession);
    this.saveSessions(sessions);
  }

  // Obtener todas las sesiones
  getAllSessions(): PomodoroSession[] {
    const sessionsJson = localStorage.getItem(this.STORAGE_KEY);
    if (!sessionsJson) {
      return [];
    }
    
    try {
      // Convertir las fechas de string a objetos Date
      const sessions = JSON.parse(sessionsJson);
      return sessions.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime)
      }));
    } catch (error) {
      console.error('Error parsing sessions', error);
      return [];
    }
  }

  // Guardar la lista de sesiones
  private saveSessions(sessions: PomodoroSession[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  // Obtener sesiones agrupadas por día
  getSessionsByDay(): { date: string; sessions: PomodoroSession[] }[] {
    const sessions = this.getAllSessions();
    const sessionsByDay: { [key: string]: PomodoroSession[] } = {};
    
    sessions.forEach(session => {
      const dateString = session.startTime.toISOString().split('T')[0];
      
      if (!sessionsByDay[dateString]) {
        sessionsByDay[dateString] = [];
      }
      
      sessionsByDay[dateString].push(session);
    });
    
    // Convertir el objeto a un array y ordenar por fecha (más reciente primero)
    return Object.keys(sessionsByDay)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        sessions: sessionsByDay[date].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      }));
  }

  // Obtener el número de sesiones completadas hoy
  getCompletedSessionsToday(): number {
    const sessions = this.getAllSessions();
    const today = new Date().toISOString().split('T')[0];
    
    return sessions.filter(session => {
      const sessionDate = session.startTime.toISOString().split('T')[0];
      return sessionDate === today;
    }).length;
  }

  // Borrar todas las sesiones
  clearAllSessions(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}