import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header, NavTab } from './components/Header';
import { AttendeeList } from './components/AttendeeList';
import { ConferenceManager } from './components/ConferenceManager';
import { EventReportsView } from './components/EventReportsView';
import { WeeklyStatsView } from './components/WeeklyStatsView';
import { 
  ClubManager, 
  DEFAULT_CLUBS, 
  INITIAL_CLUB_ACTIVITIES, 
  INITIAL_CLUB_TRANSACTIONS 
} from './components/ClubManager';
import { RegisterModal } from './components/RegisterModal';
import { EditAttendeeModal } from './components/EditAttendeeModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { BackupSyncModal } from './components/BackupSyncModal';
import { AuthModal } from './components/AuthModal';
import { UserManagementModal } from './components/UserManagementModal';
import { LoginPage } from './components/LoginPage';
import { PortalEntry } from './components/PortalEntry';
import { SubMenuVisitas } from './components/SubMenuVisitas';
import { PhotoGalleryManager } from './components/PhotoGalleryManager';
import { PublicGalleryView } from './components/PublicGalleryView';
import { PublicCharacterRegistrationView } from './components/PublicCharacterRegistrationView';
import { BiblicalCharacterManager } from './components/BiblicalCharacterManager';
import { 
  Attendee, 
  ChurchEvent, 
  AppUser, 
  UserRole, 
  AppModule, 
  Club, 
  ClubActivity, 
  ClubTransaction,
  ChurchPhoto,
  PhotoAlbum,
  CamporeeShirtPayment,
  ClubEnrollment,
  BiblicalCharacterRegistration,
  ContestCustomConfig,
  isSecretariaRole 
} from './types';
import { getWeekDays, formatLocalDate } from './utils/dateUtils';
import { 
  getSupabaseConfig, 
  pushDataToSupabase, 
  pullDataFromSupabase,
  ChurchDataPayload,
  autoLinkSupabaseFromUrl,
  registerBiblicalCharacterOnline,
  fetchBiblicalCharactersOnline
} from './services/supabaseClient';
import { 
  loadAllPhotos, 
  saveAllPhotos, 
  DEFAULT_PHOTO_ALBUMS 
} from './utils/photoStorage';
import { 
  CheckCircle2, 
  Cloud, 
  TableProperties 
} from 'lucide-react';

const STORAGE_KEYS = {
  ATTENDEES: 'eclesia_attendees_v2',
  EVENTS: 'eclesia_events_v2',
  ZONES: 'eclesia_zones_v2',
  ACTIVE_EVENT: 'eclesia_active_event_v2',
  INITIALIZED: 'eclesia_has_initialized_v2',
  USERS: 'eclesia_users_v2',
  CURRENT_USER: 'eclesia_current_user_v2',
  ACTIVE_MODULE: 'eclesia_active_module_v2',
  CLUBS: 'eclesia_clubs_v2',
  CLUB_ACTIVITIES: 'eclesia_club_activities_v2',
  CLUB_TRANSACTIONS: 'eclesia_club_transactions_v2',
  PHOTO_ALBUMS: 'eclesia_photo_albums_v2',
  CAMP_SHIRTS: 'eclesia_camp_shirts_v2',
  CLUB_ENROLLMENTS: 'eclesia_club_enrollments_v2',
  BIBLICAL_CHARACTERS: 'eclesia_biblical_characters_v2',
  CONTEST_CONFIG: 'eclesia_contest_config_v2',
};

export const DEFAULT_CONTEST_CONFIG: ContestCustomConfig = {
  headerBannerUrl: '',
  thankYouFlyerUrl: '',
  primaryColor: '#8a5a2b',
  title: 'Inscripción – Imita tu Personaje Bíblico',
  subtitle: '¡Prepárate para dar vida a la historia sagrada!',
  eventDate: 'Sábado 28 de noviembre de 2026',
  thankYouMessage: '¡Muchas gracias por inscribirte en el concurso!',
};

export const DEFAULT_ADMIN_USER: AppUser = {
  id: 'usr-admin-misael',
  name: 'Misael De Los Santos',
  email: 'misaeldelossantosamador23@gmail.com',
  password: 'Misa2325*',
  role: 'administrador',
  createdAt: '2026-10-24T00:00:00Z',
  lastLogin: '2026-10-24T09:18:00Z',
};

const DEFAULT_BLANK_ZONES = [
  'Zona Central',
  'Zona Norte',
  'Zona Sur',
  'Sector Este',
  'Sector Oeste',
];

export default function App() {
  // Automatically configure Supabase if url has embedded sync token (?dbsync=...)
  autoLinkSupabaseFromUrl();

  // Top-Level Module Navigation: 'portal' vs 'visitas' vs 'clubes' vs 'fotos' vs 'personaje_biblico'
  const [activeModule, setActiveModule] = useState<AppModule>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_MODULE);
      if (stored === 'clubes' || stored === 'visitas' || stored === 'portal' || stored === 'fotos' || stored === 'personaje_biblico') return stored;
      return 'portal';
    } catch {
      return 'portal';
    }
  });

  // Photos & Albums State (IndexedDB + LocalStorage)
  const [photos, setPhotos] = useState<ChurchPhoto[]>([]);
  const [photoAlbums, setPhotoAlbums] = useState<PhotoAlbum[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PHOTO_ALBUMS);
      if (stored) return JSON.parse(stored);
      return DEFAULT_PHOTO_ALBUMS;
    } catch {
      return DEFAULT_PHOTO_ALBUMS;
    }
  });

  useEffect(() => {
    loadAllPhotos().then((loaded) => {
      setPhotos(loaded);
    }).catch(console.error);
  }, []);

  // Public Gallery URL detection (?galeria=publica or ?view=galeria)
  const [isPublicGallery, setIsPublicGallery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('galeria') === 'publica' || params.get('view') === 'galeria';
  });

  // Public Contest Registration URL detection (?view=personaje_biblico or ?evento=personaje_biblico)
  const [isPublicCharacterForm, setIsPublicCharacterForm] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'personaje_biblico' || params.get('evento') === 'personaje_biblico';
  });

  const initialPublicAlbum = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('album') || null;
  }, []);

  // Navigation sub-tabs inside 'visitas'
  const [currentTab, setCurrentTab] = useState<NavTab>('asistencia');

  // Persistence State - attendees & events (Strictly real data only, defaults to empty array)
  const [attendees, setAttendees] = useState<Attendee[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDEES);
      if (stored !== null) return JSON.parse(stored);
      return [];
    } catch {
      return [];
    }
  });

  const [events, setEvents] = useState<ChurchEvent[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (stored !== null) return JSON.parse(stored);
      return [];
    } catch {
      return [];
    }
  });

  const [zones, setZones] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ZONES);
      if (stored !== null) return JSON.parse(stored);
      return DEFAULT_BLANK_ZONES;
    } catch {
      return DEFAULT_BLANK_ZONES;
    }
  });

  const [activeEventId, setActiveEventId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT) || null;
    } catch {
      return null;
    }
  });

  // Persistence State - Clubes Module (Real data only, default empty activities & transactions)
  const [clubs, setClubs] = useState<Club[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLUBS);
      if (stored) return JSON.parse(stored);
      return DEFAULT_CLUBS;
    } catch {
      return DEFAULT_CLUBS;
    }
  });

  const [clubActivities, setClubActivities] = useState<ClubActivity[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLUB_ACTIVITIES);
      if (stored) return JSON.parse(stored);
      return INITIAL_CLUB_ACTIVITIES;
    } catch {
      return INITIAL_CLUB_ACTIVITIES;
    }
  });

  const [clubTransactions, setClubTransactions] = useState<ClubTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLUB_TRANSACTIONS);
      if (stored) return JSON.parse(stored);
      return INITIAL_CLUB_TRANSACTIONS;
    } catch {
      return INITIAL_CLUB_TRANSACTIONS;
    }
  });

  const totalClubBalance = useMemo(() => {
    const ingresos = clubTransactions
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const egresos = clubTransactions
      .filter((t) => t.type === 'egreso')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return ingresos - egresos;
  }, [clubTransactions]);

  // Camporee Shirts State
  const [camporeeShirts, setCamporeeShirts] = useState<CamporeeShirtPayment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CAMP_SHIRTS);
      if (stored) return JSON.parse(stored);
      return [];
    } catch {
      return [];
    }
  });

  // Club Enrollments (Matrículas) State
  const [clubEnrollments, setClubEnrollments] = useState<ClubEnrollment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLUB_ENROLLMENTS);
      if (stored) return JSON.parse(stored);
      return [];
    } catch {
      return [];
    }
  });

  // Biblical Characters Contest Registrations State (Imita tu Personaje Bíblico)
  const [biblicalCharacters, setBiblicalCharacters] = useState<BiblicalCharacterRegistration[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BIBLICAL_CHARACTERS);
      if (stored) return JSON.parse(stored);
      return [];
    } catch {
      return [];
    }
  });

  // Contest Custom Configuration State (Header horizontal cover, vertical thank you flyer, theme color)
  const [contestConfig, setContestConfig] = useState<ContestCustomConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONTEST_CONFIG);
      if (stored) return JSON.parse(stored);
      return DEFAULT_CONTEST_CONFIG;
    } catch {
      return DEFAULT_CONTEST_CONFIG;
    }
  });

  // Users State
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        const parsed: AppUser[] = JSON.parse(stored);
        const adminIndex = parsed.findIndex(
          (u) => u.email.toLowerCase() === DEFAULT_ADMIN_USER.email.toLowerCase()
        );
        if (adminIndex === -1) {
          return [DEFAULT_ADMIN_USER, ...parsed];
        } else {
          parsed[adminIndex] = {
            ...parsed[adminIndex],
            email: DEFAULT_ADMIN_USER.email,
            password: parsed[adminIndex].password || DEFAULT_ADMIN_USER.password,
            role: 'administrador',
          };
          return parsed;
        }
      }
      return [DEFAULT_ADMIN_USER];
    } catch {
      return [DEFAULT_ADMIN_USER];
    }
  });

  // Currently logged-in user - null by default so login is strictly required
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored) return JSON.parse(stored);
      return null;
    } catch {
      return null;
    }
  });

  // Week offset state
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Active event object
  const activeEvent = useMemo(() => {
    if (!events.length) return null;
    return events.find((e) => e.id === activeEventId) || events[0] || null;
  }, [events, activeEventId]);

  // Selected event for reports
  const [reportEventId, setReportEventId] = useState<string | null>(null);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('eclesia_dark_mode');
      if (stored !== null) return stored === 'true';
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('eclesia_dark_mode', darkMode ? 'true' : 'false');
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // fallback
    }
  }, [darkMode]);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [backupInitialTab, setBackupInitialTab] = useState<'tables' | 'supabase' | 'json'>('tables');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  
  // WhatsApp Modal state
  const [whatsAppAttendee, setWhatsAppAttendee] = useState<Attendee | null>(null);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<'reminder' | 'welcome' | 'prayer'>('reminder');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Enforce role-based restrictions for 'secretaria'
  useEffect(() => {
    if (isSecretariaRole(currentUser?.role)) {
      if (currentTab === 'conferencias' || currentTab === 'estadisticas') {
        setCurrentTab('asistencia');
      }
    }
  }, [currentUser, currentTab]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MODULE, activeModule);
  }, [activeModule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDEES, JSON.stringify(attendees));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }, [attendees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLUBS, JSON.stringify(clubs));
  }, [clubs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLUB_ACTIVITIES, JSON.stringify(clubActivities));
  }, [clubActivities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLUB_TRANSACTIONS, JSON.stringify(clubTransactions));
  }, [clubTransactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAMP_SHIRTS, JSON.stringify(camporeeShirts));
  }, [camporeeShirts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLUB_ENROLLMENTS, JSON.stringify(clubEnrollments));
  }, [clubEnrollments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BIBLICAL_CHARACTERS, JSON.stringify(biblicalCharacters));
  }, [biblicalCharacters]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONTEST_CONFIG, JSON.stringify(contestConfig));
    } catch (e) {
      console.error(e);
    }
  }, [contestConfig]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeEventId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT, activeEventId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT);
    }
  }, [activeEventId]);

  // 1. Initial Cloud Sync on Startup: When opening on another device or computer,
  // automatically pull existing church data and photos from Supabase.
  const hasPulledCloudOnStartup = useRef(false);

  useEffect(() => {
    if (hasPulledCloudOnStartup.current) return;
    const config = getSupabaseConfig();
    if (!config.anonKey) {
      hasPulledCloudOnStartup.current = true;
      return;
    }

    hasPulledCloudOnStartup.current = true;

    pullDataFromSupabase().then((res) => {
      if (res.success && res.data) {
        const cloudData = res.data;
        const summary: string[] = [];

        if (cloudData.attendees && cloudData.attendees.length > 0) {
          setAttendees(cloudData.attendees);
          summary.push(`${cloudData.attendees.length} asistentes`);
        }
        if (cloudData.events && cloudData.events.length > 0) {
          setEvents(cloudData.events);
          summary.push(`${cloudData.events.length} cultos`);
        }
        if (cloudData.clubs && cloudData.clubs.length > 0) {
          setClubs(cloudData.clubs);
        }
        if (cloudData.clubActivities && cloudData.clubActivities.length > 0) {
          setClubActivities(cloudData.clubActivities);
        }
        if (cloudData.clubTransactions && cloudData.clubTransactions.length > 0) {
          setClubTransactions(cloudData.clubTransactions);
        }
        if (cloudData.camporeeShirts && cloudData.camporeeShirts.length > 0) {
          setCamporeeShirts(cloudData.camporeeShirts);
          summary.push(`${cloudData.camporeeShirts.length} camisetas`);
        }
        if (cloudData.clubEnrollments && cloudData.clubEnrollments.length > 0) {
          setClubEnrollments(cloudData.clubEnrollments);
          summary.push(`${cloudData.clubEnrollments.length} matrículas`);
        }
        if (cloudData.zones && cloudData.zones.length > 0) {
          setZones(cloudData.zones);
        }
        if (cloudData.users && cloudData.users.length > 0) {
          setUsers(cloudData.users);
        }
        if (cloudData.photoAlbums && cloudData.photoAlbums.length > 0) {
          setPhotoAlbums(cloudData.photoAlbums);
        }
        if (cloudData.photos && cloudData.photos.length > 0) {
          setPhotos(cloudData.photos);
          saveAllPhotos(cloudData.photos).catch(console.error);
          summary.push(`${cloudData.photos.length} fotos`);
        }
        if (cloudData.biblicalCharacters && cloudData.biblicalCharacters.length > 0) {
          setBiblicalCharacters(cloudData.biblicalCharacters);
          summary.push(`${cloudData.biblicalCharacters.length} personajes bíblicos`);
        }
        if (cloudData.contestConfig) {
          setContestConfig(cloudData.contestConfig);
        }

        if (summary.length > 0) {
          showToast(`☁️ Base de datos Supabase sincronizada (${summary.join(', ')})`);
        }
      }
    }).catch(console.error);
  }, []);

  // 2. Cloud Auto-Sync with debounce: Pushes local changes to Supabase in the background
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!hasPulledCloudOnStartup.current) return;

    const config = getSupabaseConfig();
    if (!config.autoSync || !config.anonKey) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      const payload: ChurchDataPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        attendees,
        events,
        zones,
        users,
        clubs,
        clubActivities,
        clubTransactions,
        photos,
        photoAlbums,
        camporeeShirts,
        clubEnrollments,
        biblicalCharacters,
        contestConfig,
      };
      await pushDataToSupabase(payload);
    }, 2500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [attendees, events, zones, users, clubs, clubActivities, clubTransactions, photos, photoAlbums, camporeeShirts, clubEnrollments, biblicalCharacters, contestConfig]);

  // Compute days for current week offset
  const weekDays = useMemo(() => {
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + weekOffset * 7);
    return getWeekDays(refDate);
  }, [weekOffset]);

  // Synchronized Attendance Handler: Attendance Matrix <-> Conferences <-> Reports <-> Stats
  const handleToggleDayAttendance = (attendeeId: string, dateString: string) => {
    let willBeAttended = false;

    setAttendees((prev) =>
      prev.map((person) => {
        if (person.id !== attendeeId) return person;
        const currentVal = !!person.attendance[dateString];
        willBeAttended = !currentVal;
        return {
          ...person,
          attendance: {
            ...person.attendance,
            [dateString]: willBeAttended,
          },
        };
      })
    );

    // Synchronize two-way with conferences / events on that date or active event
    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
        const isEventOnDate = evt.date === dateString || (activeEventId === evt.id && dateString === formatLocalDate(new Date()));
        if (!isEventOnDate) return evt;

        const currentAttendees = evt.attendees || [];
        if (willBeAttended) {
          if (!currentAttendees.includes(attendeeId)) {
            return { ...evt, attendees: [...currentAttendees, attendeeId] };
          }
        } else {
          return { ...evt, attendees: currentAttendees.filter((id) => id !== attendeeId) };
        }
        return evt;
      })
    );

    const person = attendees.find((a) => a.id === attendeeId);
    if (person) {
      showToast(
        willBeAttended
          ? `Asistencia tachada y guardada para ${person.firstName}`
          : `Asistencia desmarcada para ${person.firstName}`
      );
    }
  };

  const handleToggleEventAttendance = (attendeeId: string, eventId: string) => {
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) return;

    const alreadyAttending = targetEvent.attendees && targetEvent.attendees.includes(attendeeId);

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const nextAttendees = alreadyAttending
          ? (evt.attendees || []).filter((id) => id !== attendeeId)
          : [...(evt.attendees || []), attendeeId];
        return {
          ...evt,
          attendees: nextAttendees,
        };
      })
    );

    // Sync back to attendee calendar if the event has a date
    if (targetEvent.date) {
      setAttendees((prevAtt) =>
        prevAtt.map((a) => {
          if (a.id !== attendeeId) return a;
          return {
            ...a,
            attendance: {
              ...a.attendance,
              [targetEvent.date]: !alreadyAttending,
            },
          };
        })
      );
    }

    const person = attendees.find((a) => a.id === attendeeId);
    showToast(
      alreadyAttending
        ? `Asistencia desmarcada para ${person ? person.firstName : 'asistente'}`
        : `Asistencia registrada para ${person ? person.firstName : 'asistente'}`
    );
  };

  // Add new attendee
  const handleAddAttendee = (newAttendee: Attendee, markCurrentEvent?: boolean) => {
    if (newAttendee.zone && !zones.includes(newAttendee.zone)) {
      setZones((prev) => [...prev, newAttendee.zone]);
    }

    if (markCurrentEvent && activeEvent) {
      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === activeEvent.id && !evt.attendees.includes(newAttendee.id)
            ? { ...evt, attendees: [...evt.attendees, newAttendee.id] }
            : evt
        )
      );
    }

    setAttendees((prev) => [newAttendee, ...prev]);
    showToast(`¡${newAttendee.firstName} ${newAttendee.lastName} registrado con éxito!`);
  };

  // Update attendee
  const handleUpdateAttendee = (updated: Attendee) => {
    if (updated.zone && !zones.includes(updated.zone)) {
      setZones((prev) => [...prev, updated.zone]);
    }
    setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    showToast(`Datos actualizados correctamente`);
  };

  // Delete attendee
  const handleDeleteAttendee = (id: string) => {
    setAttendees((prev) => prev.filter((a) => a.id !== id));
    setEvents((prev) =>
      prev.map((evt) => ({
        ...evt,
        attendees: evt.attendees.filter((attId) => attId !== id),
      }))
    );
    showToast(`Registro eliminado`);
  };

  // Add event
  const handleAddEvent = (newEvent: ChurchEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
    setActiveEventId(newEvent.id);
    showToast(`Actividad "${newEvent.title}" creada y activada`);
  };

  // Delete event
  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (activeEventId === eventId) setActiveEventId(null);
    if (reportEventId === eventId) setReportEventId(null);
    showToast(`Conferencia eliminada`);
  };

  // Open WhatsApp with specific template
  const handleOpenWhatsAppModal = (attendee: Attendee, template: 'reminder' | 'welcome' | 'prayer' = 'reminder') => {
    setWhatsAppAttendee(attendee);
    setWhatsAppTemplate(template);
  };

  // Club Handlers
  const handleAddClub = (newClub: Club) => {
    setClubs((prev) => [...prev, newClub]);
    showToast(`Club "${newClub.name}" creado con éxito.`);
  };

  const handleUpdateClub = (updated: Club) => {
    setClubs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setClubActivities((prev) =>
      prev.map((a) => (a.clubId === updated.id ? { ...a, clubName: updated.name } : a))
    );
    setClubTransactions((prev) =>
      prev.map((t) => (t.clubId === updated.id ? { ...t, clubName: updated.name } : t))
    );
    setCamporeeShirts((prev) =>
      prev.map((s) => (s.clubId === updated.id ? { ...s, clubName: updated.name } : s))
    );
    setClubEnrollments((prev) =>
      prev.map((e) => (e.clubId === updated.id ? { ...e, clubName: updated.name } : e))
    );
    showToast(`Club "${updated.name}" actualizado.`);
  };

  const handleDeleteClub = (clubId: string) => {
    setClubs((prev) => prev.filter((c) => c.id !== clubId));
    setClubActivities((prev) => prev.filter((a) => a.clubId !== clubId));
    setClubTransactions((prev) => prev.filter((t) => t.clubId !== clubId));
    setCamporeeShirts((prev) => prev.filter((s) => s.clubId !== clubId));
    setClubEnrollments((prev) => prev.filter((e) => e.clubId !== clubId));
    showToast(`Club y sus registros asociados eliminados.`);
  };

  const handleAddClubActivity = (newAct: ClubActivity) => {
    setClubActivities((prev) => [newAct, ...prev]);
    showToast(`Actividad "${newAct.name}" registrada.`);
  };

  const handleAddClubTransaction = (newTx: ClubTransaction) => {
    setClubTransactions((prev) => [newTx, ...prev]);
    showToast(
      newTx.type === 'ingreso'
        ? `Ingreso de $${newTx.amount} registrado en ${newTx.activityName}`
        : `Egreso de $${newTx.amount} registrado en ${newTx.activityName}`
    );
  };

  const handleDeleteClubTransaction = (txId: string) => {
    setClubTransactions((prev) => prev.filter((t) => t.id !== txId));
    showToast(`Movimiento eliminado.`);
  };

  const handleDeleteClubActivity = (actId: string) => {
    setClubActivities((prev) => prev.filter((a) => a.id !== actId));
    setClubTransactions((prev) => prev.filter((t) => t.activityId !== actId));
    showToast(`Actividad y sus movimientos eliminados.`);
  };

  // Camporee T-Shirt Handlers
  const handleAddCamporeeShirt = (newShirt: CamporeeShirtPayment) => {
    setCamporeeShirts((prev) => [newShirt, ...prev]);
    showToast(`T-Shirt registrada para ${newShirt.personName}.`);
  };

  const handleUpdateCamporeeShirt = (updated: CamporeeShirtPayment) => {
    setCamporeeShirts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    showToast(updated.isPaid ? `T-Shirt de ${updated.personName} marcada como PAGADA.` : `T-Shirt actualizada.`);
  };

  const handleDeleteCamporeeShirt = (id: string) => {
    setCamporeeShirts((prev) => prev.filter((s) => s.id !== id));
    showToast(`Pedido de T-Shirt eliminado.`);
  };

  // Club Enrollment Handlers
  const handleAddClubEnrollment = (newEnrollment: ClubEnrollment) => {
    setClubEnrollments((prev) => [newEnrollment, ...prev]);
    showToast(`Matrícula registrada para ${newEnrollment.memberName}.`);
  };

  const handleUpdateClubEnrollment = (updated: ClubEnrollment) => {
    setClubEnrollments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    showToast(updated.isPaid ? `Matrícula de ${updated.memberName} marcada como PAGADA.` : `Matrícula actualizada.`);
  };

  const handleDeleteClubEnrollment = (id: string) => {
    setClubEnrollments((prev) => prev.filter((e) => e.id !== id));
    showToast(`Matrícula eliminada.`);
  };

  // Photos Handlers
  const handleAddPhotos = (newPhotos: ChurchPhoto[]) => {
    setPhotos((prev) => {
      const updated = [...newPhotos, ...prev];
      saveAllPhotos(updated).catch(console.error);
      return updated;
    });
    showToast(`¡${newPhotos.length} foto(s) guardadas en la galería!`);
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== photoId);
      saveAllPhotos(updated).catch(console.error);
      return updated;
    });
    showToast(`Foto eliminada.`);
  };

  const handleAddAlbum = (newAlbum: PhotoAlbum) => {
    setPhotoAlbums((prev) => {
      const updated = [...prev, newAlbum];
      try {
        localStorage.setItem(STORAGE_KEYS.PHOTO_ALBUMS, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  // Biblical Characters Contest Handlers
  const handleAddCharacterRegistration = async (newReg: BiblicalCharacterRegistration) => {
    setBiblicalCharacters((prev) => [newReg, ...prev.filter((c) => c.id !== newReg.id)]);
    showToast(`¡Inscripción de ${newReg.nombre} guardada con éxito!`);
    try {
      const res = await registerBiblicalCharacterOnline(newReg);
      if (!res.success) {
        console.warn('Registro en línea advertencia:', res.message);
      }
    } catch (e) {
      console.warn('Auto-save to Supabase warning:', e);
    }
    return true;
  };

  const handleRefreshCharacters = async () => {
    try {
      const result = await fetchBiblicalCharactersOnline();
      if (result.success && result.characters) {
        setBiblicalCharacters((prev) => {
          const map = new Map<string, BiblicalCharacterRegistration>();
          result.characters!.forEach((c) => map.set(c.id, c));
          prev.forEach((c) => {
            if (!map.has(c.id)) map.set(c.id, c);
          });
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
        });
        if (result.contestConfig) {
          setContestConfig(result.contestConfig);
        }
      }
    } catch (e) {
      console.error('Error refreshing biblical characters:', e);
    }
  };

  const handleUpdateCharacterRegistration = (updated: BiblicalCharacterRegistration) => {
    setBiblicalCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCharacterRegistration = (id: string) => {
    setBiblicalCharacters((prev) => prev.filter((c) => c.id !== id));
    showToast('Inscripción eliminada.');
  };

  // User Authentication & Management Handlers
  const handleRegisterUser = (newUser: AppUser) => {
    setUsers((prev) => [...prev, newUser]);
    showToast(`Usuario "${newUser.name}" registrado.`);
    return { success: true, message: 'Usuario creado exitosamente', user: newUser };
  };

  const handleAddUserFromAdmin = (newUser: AppUser) => {
    setUsers((prev) => [...prev, newUser]);
    showToast(`Usuario "${newUser.name}" añadido al equipo.`);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast(`Usuario eliminado del sistema.`);
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
    }
    showToast(`Rol de usuario actualizado`);
  };

  const handleResetPassword = (userId: string, newPass: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, password: newPass } : null));
    }
    showToast(`Contraseña actualizada con éxito.`);
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    setActiveModule('portal'); // Entrada de Eclesia: los dos grandes menús generales
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, lastLogin: user.lastLogin } : u))
    );
    showToast(`¡Bienvenido/a, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast(`Sesión cerrada.`);
  };

  // Restore from JSON payload
  const handleRestoreData = (payload: ChurchDataPayload, mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setAttendees(payload.attendees || []);
      setEvents(payload.events || []);
      setZones(payload.zones && payload.zones.length ? payload.zones : DEFAULT_BLANK_ZONES);
      if (payload.clubs) setClubs(payload.clubs);
      if (payload.clubActivities) setClubActivities(payload.clubActivities);
      if (payload.clubTransactions) setClubTransactions(payload.clubTransactions);
      if (payload.camporeeShirts) setCamporeeShirts(payload.camporeeShirts);
      if (payload.clubEnrollments) setClubEnrollments(payload.clubEnrollments);
      if (payload.biblicalCharacters) setBiblicalCharacters(payload.biblicalCharacters);
      if (payload.contestConfig) setContestConfig(payload.contestConfig);

      if (payload.users && payload.users.length) {
        const hasAdmin = payload.users.some(
          (u) => u.email.toLowerCase() === DEFAULT_ADMIN_USER.email.toLowerCase()
        );
        setUsers(hasAdmin ? payload.users : [DEFAULT_ADMIN_USER, ...payload.users]);
      }
      setActiveEventId(payload.events?.[0]?.id || null);
      showToast(`¡Base de datos restaurada! ${payload.attendees.length} asistentes cargados.`);
    } else {
      // Merge
      setAttendees((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newOnes = payload.attendees.filter((a) => !existingIds.has(a.id));
        return [...prev, ...newOnes];
      });
      setEvents((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newOnes = payload.events.filter((e) => !existingIds.has(e.id));
        return [...prev, ...newOnes];
      });
      setZones((prev) => Array.from(new Set([...prev, ...(payload.zones || [])])));
      if (payload.clubs) {
        setClubs((prev) => {
          const ids = new Set(prev.map((c) => c.id));
          return [...prev, ...payload.clubs!.filter((c) => !ids.has(c.id))];
        });
      }
      if (payload.clubActivities) {
        setClubActivities((prev) => {
          const ids = new Set(prev.map((a) => a.id));
          return [...prev, ...payload.clubActivities!.filter((a) => !ids.has(a.id))];
        });
      }
      if (payload.clubTransactions) {
        setClubTransactions((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          return [...prev, ...payload.clubTransactions!.filter((t) => !ids.has(t.id))];
        });
      }
      if (payload.camporeeShirts) {
        setCamporeeShirts((prev) => {
          const ids = new Set(prev.map((s) => s.id));
          return [...prev, ...payload.camporeeShirts!.filter((s) => !ids.has(s.id))];
        });
      }
      if (payload.clubEnrollments) {
        setClubEnrollments((prev) => {
          const ids = new Set(prev.map((e) => e.id));
          return [...prev, ...payload.clubEnrollments!.filter((e) => !ids.has(e.id))];
        });
      }
      if (payload.biblicalCharacters) {
        setBiblicalCharacters((prev) => {
          const ids = new Set(prev.map((b) => b.id));
          return [...prev, ...payload.biblicalCharacters!.filter((b) => !ids.has(b.id))];
        });
      }
      if (payload.users) {
        setUsers((prev) => {
          const existingEmails = new Set(prev.map((u) => u.email.toLowerCase()));
          const newUsers = payload.users!.filter((u) => !existingEmails.has(u.email.toLowerCase()));
          return [...prev, ...newUsers];
        });
      }
      if (payload.photos) {
        setPhotos(payload.photos);
        saveAllPhotos(payload.photos).catch(console.error);
      }
      if (payload.photoAlbums) {
        setPhotoAlbums(payload.photoAlbums);
        try {
          localStorage.setItem(STORAGE_KEYS.PHOTO_ALBUMS, JSON.stringify(payload.photoAlbums));
        } catch (e) {
          console.error(e);
        }
      }
      if (payload.contestConfig) {
        setContestConfig(payload.contestConfig);
      }
      showToast(`Datos combinados con éxito.`);
    }
  };

  // Public Gallery View (Direct access without login for visitors and members via shared link)
  if (isPublicGallery) {
    return (
      <PublicGalleryView
        photos={photos}
        albums={photoAlbums}
        initialAlbum={initialPublicAlbum}
        onGoToLogin={() => {
          window.history.pushState({}, '', window.location.pathname);
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          setIsPublicGallery(false);
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />
    );
  }

  // Public Contest Registration View (Direct access without login for participants and parents)
  if (isPublicCharacterForm) {
    return (
      <PublicCharacterRegistrationView
        onSaveRegistration={handleAddCharacterRegistration}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        contestConfig={contestConfig}
      />
    );
  }

  // Require authentication: Nobody can see the app without logging in
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onRegisterUser={handleRegisterUser}
        allUsers={users}
      />
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col transition-colors duration-200`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Top-Level Module Switcher & User Profile */}
      <Header
        activeModule={activeModule}
        onChangeModule={setActiveModule}
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenBackupModal={() => {
          setBackupInitialTab('tables');
          setIsBackupOpen(true);
        }}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* PORTAL DE ENTRADA: 3 CUADROS RECTANGULARES GRANDES */}
        {activeModule === 'portal' && (
          <PortalEntry
            currentUser={currentUser}
            attendeesCount={attendees.length}
            eventsCount={events.length}
            zonesCount={zones.length}
            clubsCount={clubs.length}
            activitiesCount={clubActivities.length}
            totalClubBalance={totalClubBalance}
            photosCount={photos.length}
            albumsCount={photoAlbums.length}
            biblicalCharactersCount={biblicalCharacters.length}
            onSelectModule={(mod) => {
              setActiveModule(mod);
              if (mod === 'visitas' && isSecretariaRole(currentUser.role)) {
                setCurrentTab('asistencia');
              }
            }}
          />
        )}

        {/* MODULE: CONCURSO IMITA TU PERSONAJE BÍBLICO (28 Nov 2026) */}
        {activeModule === 'personaje_biblico' && (
          <BiblicalCharacterManager
            registrations={biblicalCharacters}
            onAddRegistration={handleAddCharacterRegistration}
            onUpdateRegistration={handleUpdateCharacterRegistration}
            onDeleteRegistration={handleDeleteCharacterRegistration}
            onBackToPortal={() => setActiveModule('portal')}
            currentUser={currentUser}
            contestConfig={contestConfig}
            onUpdateContestConfig={setContestConfig}
            onRefreshRegistrations={handleRefreshCharacters}
          />
        )}

        {/* MODULE 1: REGISTRO VISITAS (Attendance, Conferences, Reports, Stats) */}
        {activeModule === 'visitas' && (
          <>
            {/* Prominent Framed Sub-Menu Recuadro */}
            <SubMenuVisitas
              currentTab={currentTab}
              onChangeTab={setCurrentTab}
              onBackToPortal={() => setActiveModule('portal')}
              onOpenRegister={() => setIsRegisterOpen(true)}
              userRole={currentUser?.role}
              attendeesCount={attendees.length}
              eventsCount={events.length}
            />

            {currentTab === 'asistencia' && (
              <AttendeeList
                attendees={attendees}
                availableZones={zones}
                weekDays={weekDays}
                weekOffset={weekOffset}
                onPrevWeek={() => setWeekOffset((prev) => prev - 1)}
                onNextWeek={() => setWeekOffset((prev) => prev + 1)}
                onCurrentWeek={() => setWeekOffset(0)}
                onToggleDayAttendance={handleToggleDayAttendance}
                onToggleEventAttendance={handleToggleEventAttendance}
                onEditAttendee={(attendee) => setEditingAttendee(attendee)}
                onOpenRegister={() => setIsRegisterOpen(true)}
                onOpenWhatsApp={handleOpenWhatsAppModal}
                activeEvent={activeEvent}
              />
            )}

            {currentTab === 'conferencias' && (
              <ConferenceManager
                events={events}
                attendees={attendees}
                activeEventId={activeEventId}
                onSetActiveEvent={(id) => {
                  setActiveEventId(id);
                  showToast(`Evento activo cambiado`);
                }}
                onAddEvent={handleAddEvent}
                onDeleteEvent={handleDeleteEvent}
                onToggleEventAttendance={handleToggleEventAttendance}
                onSelectEventForReport={(evt) => {
                  setReportEventId(evt.id);
                  setCurrentTab('reportes');
                }}
              />
            )}

            {currentTab === 'reportes' && (
              <EventReportsView
                events={events}
                attendees={attendees}
                selectedEventId={reportEventId || activeEventId}
                onSelectEvent={(id) => setReportEventId(id)}
                onOpenWhatsApp={(attendee) => handleOpenWhatsAppModal(attendee, 'welcome')}
              />
            )}

            {currentTab === 'estadisticas' && (
              <WeeklyStatsView
                attendees={attendees}
                events={events}
                weekDays={weekDays}
              />
            )}
          </>
        )}

        {/* MODULE 2: CLUBES (Incomes, Expenses, Net Profit, Activities & Financial Analysis) */}
        {activeModule === 'clubes' && (
          <ClubManager
            clubs={clubs}
            activities={clubActivities}
            transactions={clubTransactions}
            camporeeShirts={camporeeShirts}
            clubEnrollments={clubEnrollments}
            onAddClub={handleAddClub}
            onUpdateClub={handleUpdateClub}
            onDeleteClub={handleDeleteClub}
            onAddActivity={handleAddClubActivity}
            onAddTransaction={handleAddClubTransaction}
            onDeleteTransaction={handleDeleteClubTransaction}
            onDeleteActivity={handleDeleteClubActivity}
            onAddCamporeeShirt={handleAddCamporeeShirt}
            onUpdateCamporeeShirt={handleUpdateCamporeeShirt}
            onDeleteCamporeeShirt={handleDeleteCamporeeShirt}
            onAddClubEnrollment={handleAddClubEnrollment}
            onUpdateClubEnrollment={handleUpdateClubEnrollment}
            onDeleteClubEnrollment={handleDeleteClubEnrollment}
            onBackToPortal={() => setActiveModule('portal')}
          />
        )}

        {/* MODULE 3: FOTOS Y GALERÍA DE LA IGLESIA */}
        {activeModule === 'fotos' && (
          <PhotoGalleryManager
            photos={photos}
            albums={photoAlbums}
            onAddPhotos={handleAddPhotos}
            onDeletePhoto={handleDeletePhoto}
            onAddAlbum={handleAddAlbum}
            onBackToPortal={() => setActiveModule('portal')}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 dark:text-white">Eclesia</span>
            <span>·</span>
            <span>Sistema Integral de Gestión Eclesiástica, Finanzas y Fotos</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Módulo actual:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold border border-slate-300 dark:border-slate-700">
              {activeModule === 'portal'
                ? 'Portal Principal'
                : activeModule === 'visitas'
                ? 'Registro Visitas'
                : activeModule === 'clubes'
                ? 'Gestión de Clubes'
                : activeModule === 'fotos'
                ? 'Fotos de la Iglesia'
                : 'Personaje Bíblico'}
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSave={handleAddAttendee}
        availableZones={zones}
        activeEvent={activeEvent}
      />

      <EditAttendeeModal
        isOpen={!!editingAttendee}
        attendee={editingAttendee}
        onClose={() => setEditingAttendee(null)}
        onUpdate={handleUpdateAttendee}
        onDelete={handleDeleteAttendee}
        availableZones={zones}
      />

      <WhatsAppModal
        isOpen={!!whatsAppAttendee}
        onClose={() => setWhatsAppAttendee(null)}
        attendee={whatsAppAttendee}
        activeEvent={activeEvent}
        initialTemplate={whatsAppTemplate}
      />

      <BackupSyncModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        attendees={attendees}
        events={events}
        zones={zones}
        users={users}
        clubs={clubs}
        clubActivities={clubActivities}
        clubTransactions={clubTransactions}
        photos={photos}
        photoAlbums={photoAlbums}
        camporeeShirts={camporeeShirts}
        clubEnrollments={clubEnrollments}
        biblicalCharacters={biblicalCharacters}
        contestConfig={contestConfig}
        onRestoreData={handleRestoreData}
        onNotify={showToast}
        initialTab={backupInitialTab}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegisterUser={handleRegisterUser}
        allUsers={users}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        users={users}
        currentUser={currentUser}
        onAddUser={handleAddUserFromAdmin}
        onDeleteUser={handleDeleteUser}
        onUpdateUserRole={handleUpdateUserRole}
        onResetPassword={handleResetPassword}
      />
    </div>
  );
}
