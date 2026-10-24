import { Attendee, ChurchEvent } from '../types';
import { formatLocalDate } from '../utils/dateUtils';

// Helper to get dates relative to today
const today = new Date();
const todayStr = formatLocalDate(today);

// Get Monday of current week
const currentDay = today.getDay();
const diffToMonday = today.getDate() - (currentDay === 0 ? 6 : currentDay - 1);
const mondayDate = new Date(today);
mondayDate.setDate(diffToMonday);

const getDateForDay = (offsetDays: number) => {
  const d = new Date(mondayDate);
  d.setDate(mondayDate.getDate() + offsetDays);
  return formatLocalDate(d);
};

export const INITIAL_ZONES = [
  'Zona Central',
  'Zona Norte',
  'Zona Sur',
  'Barrio San José',
  'Sector Los Pinos',
  'Colonia Mirador',
  'Villa Esperanza',
  'Sector Este',
];

export const INITIAL_EVENTS: ChurchEvent[] = [
  {
    id: 'evt-1',
    title: 'Gran Conferencia: Familias Restauradas y Bendecidas',
    category: 'conferencia',
    date: getDateForDay(4), // Friday
    time: '19:30',
    location: 'Auditorio Principal',
    description: 'Conferencia especial de fin de semana con invitados pastorales sobre principios bíblicos para el hogar y la crianza.',
    speaker: 'Pastor Samuel Morales & Pastora Ruth',
    attendees: ['att-1', 'att-2', 'att-3', 'att-4', 'att-6', 'att-8', 'att-9', 'att-11'],
  },
  {
    id: 'evt-2',
    title: 'Culto Dominical de Celebración y Palabra',
    category: 'culto',
    date: getDateForDay(6), // Sunday
    time: '10:00',
    location: 'Santuario Mayor',
    description: 'Servicio general dominical, adoración congregacional, bienvenida de nuevos amigos y mensaje evangelístico.',
    speaker: 'Equipo Pastoral',
    attendees: ['att-1', 'att-2', 'att-5', 'att-7', 'att-8', 'att-10', 'att-12', 'att-14'],
  },
  {
    id: 'evt-3',
    title: 'Noche de Jóvenes: Generación con Propósito',
    category: 'jovenes',
    date: getDateForDay(5), // Saturday
    time: '18:00',
    location: 'Salón Juvenil',
    description: 'Encuentro dinámico para jóvenes y universitarios con música en vivo, dinámicas de integración y refrigerio.',
    speaker: 'Líder David Gómez',
    attendees: ['att-2', 'att-4', 'att-10', 'att-13'],
  },
  {
    id: 'evt-4',
    title: 'Vigilia de Oración e Intercesión por las Familias',
    category: 'oracion',
    date: getDateForDay(2), // Wednesday
    time: '20:00',
    location: 'Capilla de Oración',
    description: 'Tiempo especial para orar por sanidad, restauración y los motivos de las visitas registradas.',
    speaker: 'Comité de Intercesión',
    attendees: ['att-3', 'att-6', 'att-7', 'att-8', 'att-11'],
  },
];

export const INITIAL_ATTENDEES: Attendee[] = [
  {
    id: 'att-1',
    firstName: 'Carlos',
    lastName: 'Mendoza Pérez',
    phone: '5541238901',
    zone: 'Zona Norte',
    type: 'visitante',
    registeredDate: getDateForDay(0),
    notes: 'Fue invitado por la familia Ramírez. Desea conocer más sobre las actividades para niños.',
    prayerRequest: 'Oración por trabajo y bienestar familiar.',
    attendance: {
      [getDateForDay(0)]: true, // Monday
      [getDateForDay(2)]: false,
      [getDateForDay(4)]: true, // Friday
    },
  },
  {
    id: 'att-2',
    firstName: 'Mariana',
    lastName: 'López Aguilar',
    phone: '5519876543',
    zone: 'Barrio San José',
    type: 'visitante',
    registeredDate: getDateForDay(1),
    notes: 'Primera vez que asiste a una conferencia cristiana. Le gustó mucho la bienvenida.',
    prayerRequest: 'Paz y dirección en sus estudios universitarios.',
    attendance: {
      [getDateForDay(1)]: true, // Tuesday
      [getDateForDay(4)]: true, // Friday
      [getDateForDay(5)]: true, // Saturday
    },
  },
  {
    id: 'att-3',
    firstName: 'Roberto',
    lastName: 'García Silva',
    phone: '5587654321',
    zone: 'Sector Los Pinos',
    type: 'recurrente',
    registeredDate: getDateForDay(-14),
    notes: 'Ha asistido las últimas 3 semanas seguidas. Interesado en el grupo de varones.',
    prayerRequest: 'Sanidad para su madre en el hospital.',
    attendance: {
      [getDateForDay(0)]: true,
      [getDateForDay(2)]: true,
      [getDateForDay(4)]: true,
    },
  },
  {
    id: 'att-4',
    firstName: 'Valeria',
    lastName: 'Castillo Cruz',
    phone: '5598761234',
    zone: 'Zona Central',
    type: 'visitante',
    registeredDate: getDateForDay(2),
    notes: 'Llegó por el folleto entregado en la plaza comercial.',
    prayerRequest: 'Restauración matrimonial.',
    attendance: {
      [getDateForDay(2)]: true,
      [getDateForDay(4)]: true,
    },
  },
  {
    id: 'att-5',
    firstName: 'Juan Pablo',
    lastName: 'Reyes Morales',
    phone: '5533445566',
    zone: 'Colonia Mirador',
    type: 'miembro',
    registeredDate: getDateForDay(-60),
    notes: 'Servidor en el área de sonido y bienvenida.',
    prayerRequest: 'Provisión para su negocio.',
    attendance: {
      [getDateForDay(0)]: true,
      [getDateForDay(2)]: true,
      [getDateForDay(4)]: true,
      [getDateForDay(6)]: true,
    },
  },
  {
    id: 'att-6',
    firstName: 'Ana Sofía',
    lastName: 'Torres Herrera',
    phone: '5577889900',
    zone: 'Villa Esperanza',
    type: 'visitante',
    registeredDate: getDateForDay(3),
    notes: 'Vecina de Villa Esperanza. Pide visita pastoral en su casa.',
    prayerRequest: 'Salud física y protección de sus hijos.',
    attendance: {
      [getDateForDay(3)]: true,
      [getDateForDay(4)]: true,
    },
  },
  {
    id: 'att-7',
    firstName: 'Fernando',
    lastName: 'Morales Ortiz',
    phone: '5522334411',
    zone: 'Sector Este',
    type: 'recurrente',
    registeredDate: getDateForDay(-20),
    notes: 'Asiste a los miércoles de oración.',
    prayerRequest: 'Dirección espiritual.',
    attendance: {
      [getDateForDay(2)]: true,
      [getDateForDay(6)]: true,
    },
  },
  {
    id: 'att-8',
    firstName: 'Lucía',
    lastName: 'Benítez Domínguez',
    phone: '5566778811',
    zone: 'Zona Norte',
    type: 'visitante',
    registeredDate: getDateForDay(4),
    notes: 'Asistió a la conferencia de familias. Muy receptiva.',
    prayerRequest: 'Por su esposo que aún no asiste a la iglesia.',
    attendance: {
      [getDateForDay(4)]: true,
    },
  },
  {
    id: 'att-9',
    firstName: 'Gabriel',
    lastName: 'Navarro Estrada',
    phone: '5588990022',
    zone: 'Barrio San José',
    type: 'recurrente',
    registeredDate: getDateForDay(-30),
    notes: 'Toca guitarra y está interesado en unirse al grupo de alabanza.',
    prayerRequest: 'Fortaleza espiritual.',
    attendance: {
      [getDateForDay(1)]: true,
      [getDateForDay(4)]: true,
    },
  },
  {
    id: 'att-10',
    firstName: 'Estefanía',
    lastName: 'Vargas Romero',
    phone: '5511223388',
    zone: 'Zona Central',
    type: 'visitante',
    registeredDate: getDateForDay(1),
    notes: 'Vino con una amiga de la universidad a la actividad.',
    prayerRequest: 'Por exámenes finales y paz interior.',
    attendance: {
      [getDateForDay(1)]: true,
      [getDateForDay(5)]: true,
    },
  },
  {
    id: 'att-11',
    firstName: 'Héctor',
    lastName: 'Salazar Fuentes',
    phone: '5544332211',
    zone: 'Sector Los Pinos',
    type: 'miembro',
    registeredDate: getDateForDay(-90),
    notes: 'Maestro de escuela dominical.',
    prayerRequest: 'Sabiduría para enseñar.',
    attendance: {
      [getDateForDay(0)]: true,
      [getDateForDay(2)]: true,
      [getDateForDay(4)]: true,
      [getDateForDay(6)]: true,
    },
  },
  {
    id: 'att-12',
    firstName: 'Gloria',
    lastName: 'Paredes León',
    phone: '5599887744',
    zone: 'Zona Sur',
    type: 'visitante',
    registeredDate: getDateForDay(4),
    notes: 'Primera visita en busca de congregación tras mudarse de ciudad.',
    prayerRequest: 'Adaptación a la nueva ciudad.',
    attendance: {
      [getDateForDay(4)]: true,
      [getDateForDay(6)]: true,
    },
  },
];
