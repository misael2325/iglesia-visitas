import { DayInfo } from '../types';

export function getWeekDays(referenceDate: Date = new Date()): DayInfo[] {
  const current = new Date(referenceDate);
  // Get day of week: Sunday = 0, Monday = 1, ..., Saturday = 6
  const day = current.getDay();
  // We want Monday to be index 0
  const diffToMonday = current.getDate() - (day === 0 ? 6 : day - 1);
  
  const monday = new Date(current);
  monday.setDate(diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const todayStr = formatLocalDate(new Date());

  const dayLabels = [
    { label: 'L', fullName: 'Lunes' },
    { label: 'M', fullName: 'Martes' },
    { label: 'Mi', fullName: 'Miércoles' },
    { label: 'J', fullName: 'Jueves' },
    { label: 'V', fullName: 'Viernes' },
    { label: 'S', fullName: 'Sábado' },
    { label: 'D', fullName: 'Domingo' },
  ];

  return dayLabels.map((item, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    const dateString = formatLocalDate(d);
    return {
      label: item.label,
      fullName: item.fullName,
      dateString,
      isToday: dateString === todayStr,
    };
  });
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatSpanishDate(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatSpanishDateLong(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getCleanPhoneNumber(phone: string): string {
  // Strip non-numeric characters
  return phone.replace(/\D/g, '');
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = getCleanPhoneNumber(phone);
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
}
