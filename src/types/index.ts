export type AttendeeType = 'visitante' | 'recurrente' | 'miembro';

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  zone: string;
  type: AttendeeType;
  registeredDate: string; // YYYY-MM-DD
  notes?: string;
  prayerRequest?: string;
  // Map of YYYY-MM-DD -> boolean
  attendance: Record<string, boolean>;
}

export type EventCategory = 'conferencia' | 'culto' | 'jovenes' | 'oracion' | 'mujeres' | 'varones' | 'ninos' | 'taller' | 'otro';

export interface ChurchEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  description: string;
  speaker?: string;
  // Specific attendee IDs recorded for this event
  attendees: string[];
}

export interface DayInfo {
  label: string; // 'L', 'M', 'Mi', 'J', 'V', 'S', 'D'
  fullName: string; // 'Lunes', 'Martes', etc.
  dateString: string; // 'YYYY-MM-DD'
  isToday: boolean;
}

export interface WeeklyStats {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  totalAttendees: number;
  newVisitors: number;
  members: number;
  growthPercentage: number;
}
