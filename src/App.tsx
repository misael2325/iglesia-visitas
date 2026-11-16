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
import { YouthGamesManager, DEFAULT_STARTER_YOUTH_GAMES } from './components/YouthGamesManager';
import { YouthGameLiveRoom, LiveRoomViewMode } from './components/YouthGameLiveRoom';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { usePWAInstall } from './hooks/usePWAInstall';
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
  YouthGame,
  canUserAccessConfig,
  getAllowedModulesForUser,
  isSecretariaRestrictedUser,
  normalizeAppUser
} from './types';
import { getWeekDays, formatLocalDate } from './utils/dateUtils';
import { 
  getSupabaseConfig, 
  getSupabaseClient,
  pushDataToSupabase, 
  pullDataFromSupabase,
  ChurchDataPayload,
  autoLinkSupabaseFromUrl,
  registerBiblicalCharacterOnline,
  updateBiblicalCharacterOnline,
  deleteBiblicalCharacterOnline,
  fetchBiblicalCharactersOnline,
  deleteRecordOnline,
  deleteClubCascadeOnline,
  deleteActivityCascadeOnline,
  saveClubOnline,
  saveClubActivityOnline,
  saveClubTransactionOnline,
  saveCamporeeShirtOnline,
  saveClubEnrollmentOnline,
  saveAttendeeOnline,
  saveEventOnline,
  savePhotosOnline,
  saveUserOnline,
  saveYouthGameOnline,
  deleteYouthGameOnline,
  subscribeLiveSyncBroadcast,
  fetchCloudLastUpdated,
  getLastKnownCloudUpdatedAt,
  LiveSyncSignal,
  getLocalDeletedIds,
  recordLocalDeletedIds
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
  YOUTH_GAMES: 'eclesia_youth_games_v2',
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
  roles: ['administrador'],
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

  // Top-Level Module Navigation: 'portal' vs 'visitas' vs 'clubes' vs 'fotos' vs 'personaje_biblico' vs 'jovenes_games'
  const [activeModule, setActiveModule] = useState<AppModule>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_MODULE);
      if (
        stored === 'clubes' ||
        stored === 'visitas' ||
        stored === 'portal' ||
        stored === 'fotos' ||
        stored === 'personaje_biblico' ||
        stored === 'jovenes_games'
      ) {
        return stored;
      }
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

  // Public Youth Games URL detection (?view=jovenes_games&room=PIN&mode=player|screen)
  const [publicGameParams, setPublicGameParams] = useState<{
    roomCode: string;
    mode: LiveRoomViewMode;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'jovenes_games') {
      const m = params.get('mode');
      return {
        roomCode: (params.get('room') || '').toUpperCase(),
        mode: m === 'screen' ? 'screen' : 'player',
      };
    }
    return null;
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

  // Sociedad de Jóvenes Games State
  const [youthGames, setYouthGames] = useState<YouthGame[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.YOUTH_GAMES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_STARTER_YOUTH_GAMES;
    } catch {
      return DEFAULT_STARTER_YOUTH_GAMES;
    }
  });

  // Users State
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        const parsed: AppUser[] = JSON.parse(stored).map(normalizeAppUser);
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
            roles: ['administrador'],
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
      if (stored) return normalizeAppUser(JSON.parse(stored));
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

  // PWA install alert & guide modal
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Enforce role-based restrictions dynamically (supporting multi-role users & Directiva de Clubes / Jóvenes)
  useEffect(() => {
    if (!currentUser) return;
    if (isSecretariaRestrictedUser(currentUser)) {
      if (currentTab === 'conferencias' || currentTab === 'estadisticas') {
        setCurrentTab('asistencia');
      }
    }
    const allowed = getAllowedModulesForUser(currentUser);
    if (allowed.length === 1) {
      if (activeModule !== allowed[0]) {
        setActiveModule(allowed[0]);
      }
    } else if (allowed.length > 1) {
      if (activeModule !== 'portal' && !allowed.includes(activeModule)) {
        setActiveModule('portal');
      }
    }
  }, [currentUser, currentTab, activeModule]);

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
    try {
      localStorage.setItem(STORAGE_KEYS.YOUTH_GAMES, JSON.stringify(youthGames));
    } catch (e) {
      console.error(e);
    }
  }, [youthGames]);

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

  // 1. Initial Cloud Sync + Real-Time Sync across any PC/Device
  const hasCompletedInitialPullRef = useRef(false);
  const isPullingCloudRef = useRef(false);
  const recentlyDeletedIdsRef = useRef<Map<string, number>>(new Map());
  const pendingSaveIdsRef = useRef<Set<string>>(new Set());
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());
  const localMutationVersionRef = useRef(0);
  const lastPushedVersionRef = useRef(0);

  const markLocalMutation = () => {
    localMutationVersionRef.current += 1;
  };

  const markDeletedId = (id: string) => {
    recentlyDeletedIdsRef.current.set(id, Date.now());
    recordLocalDeletedIds([id]);
  };

  const pruneDeletedIds = () => {
    const now = Date.now();
    for (const [id, ts] of recentlyDeletedIdsRef.current.entries()) {
      if (now - ts > 30000) recentlyDeletedIdsRef.current.delete(id);
    }
  };

  const mergeCloudArray = <T extends { id: string }>(
    cloudArr: T[] | undefined,
    localPrev: T[]
  ): T[] | null => {
    if (!Array.isArray(cloudArr)) return null;
    pruneDeletedIds();
    const persistedDeleted = getLocalDeletedIds();
    const filteredCloud = cloudArr.filter(
      (item) =>
        !recentlyDeletedIdsRef.current.has(item.id) &&
        !pendingDeleteIdsRef.current.has(item.id) &&
        !persistedDeleted[item.id]
    );
    const map = new Map<string, T>();
    filteredCloud.forEach((item) => map.set(item.id, item));
    localPrev.forEach((item) => {
      if (pendingSaveIdsRef.current.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  };

  const applyCloudSnapshot = (cloudData: ChurchDataPayload, showSummaryToast = false) => {
    const summary: string[] = [];

    if (Array.isArray(cloudData.attendees)) {
      setAttendees((prev) => mergeCloudArray(cloudData.attendees, prev) ?? prev);
      if (cloudData.attendees.length > 0) summary.push(`${cloudData.attendees.length} asistentes`);
    }
    if (Array.isArray(cloudData.events)) {
      setEvents((prev) => mergeCloudArray(cloudData.events, prev) ?? prev);
      if (cloudData.events.length > 0) summary.push(`${cloudData.events.length} cultos`);
    }
    if (Array.isArray(cloudData.clubs)) {
      setClubs((prev) => mergeCloudArray(cloudData.clubs, prev) ?? prev);
    }
    if (Array.isArray(cloudData.clubActivities)) {
      setClubActivities((prev) => mergeCloudArray(cloudData.clubActivities, prev) ?? prev);
    }
    if (Array.isArray(cloudData.clubTransactions)) {
      setClubTransactions((prev) => mergeCloudArray(cloudData.clubTransactions, prev) ?? prev);
    }
    if (Array.isArray(cloudData.camporeeShirts)) {
      setCamporeeShirts((prev) => mergeCloudArray(cloudData.camporeeShirts, prev) ?? prev);
      if (cloudData.camporeeShirts.length > 0) summary.push(`${cloudData.camporeeShirts.length} camisetas`);
    }
    if (Array.isArray(cloudData.clubEnrollments)) {
      setClubEnrollments((prev) => mergeCloudArray(cloudData.clubEnrollments, prev) ?? prev);
      if (cloudData.clubEnrollments.length > 0) summary.push(`${cloudData.clubEnrollments.length} matrículas`);
    }
    if (Array.isArray(cloudData.zones) && cloudData.zones.length > 0) {
      setZones(cloudData.zones);
    }
    if (Array.isArray(cloudData.users) && cloudData.users.length > 0) {
      const normalizedCloudUsers = cloudData.users.map(normalizeAppUser);
      setUsers((prev) => mergeCloudArray(normalizedCloudUsers, prev) ?? prev);
      setCurrentUser((prev) => {
        if (!prev) return null;
        const fresh = normalizedCloudUsers.find((u) => u.id === prev.id);
        return fresh ? normalizeAppUser({ ...prev, role: fresh.role, roles: fresh.roles, name: fresh.name, password: fresh.password }) : prev;
      });
    }
    if (Array.isArray(cloudData.photoAlbums) && cloudData.photoAlbums.length > 0) {
      setPhotoAlbums(cloudData.photoAlbums);
    }
    if (Array.isArray(cloudData.photos)) {
      setPhotos((prev) => {
        const merged = mergeCloudArray(cloudData.photos, prev) ?? prev;
        saveAllPhotos(merged).catch(console.error);
        return merged;
      });
      if (cloudData.photos.length > 0) summary.push(`${cloudData.photos.length} fotos`);
    }
    if (Array.isArray(cloudData.biblicalCharacters)) {
      setBiblicalCharacters((prev) => {
        const merged = mergeCloudArray(cloudData.biblicalCharacters, prev) ?? prev;
        return merged.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      });
      if (cloudData.biblicalCharacters.length > 0) {
        summary.push(`${cloudData.biblicalCharacters.length} personajes bíblicos`);
      }
    }
    if (cloudData.contestConfig) {
      setContestConfig(cloudData.contestConfig);
    }
    if (Array.isArray(cloudData.youthGames) && cloudData.youthGames.length > 0) {
      setYouthGames((prev) => mergeCloudArray(cloudData.youthGames, prev) ?? prev);
    }

    if (showSummaryToast && summary.length > 0) {
      showToast(`☁️ Base de datos sincronizada (${summary.join(', ')})`);
    }
  };

  const syncFromCloudNow = async (showSummaryToast = false) => {
    if (isPullingCloudRef.current) return;
    isPullingCloudRef.current = true;
    try {
      const res = await pullDataFromSupabase();
      if (res.success && res.data) {
        applyCloudSnapshot(res.data, showSummaryToast);
      }
    } catch (err) {
      console.error('Cloud sync pull error:', err);
    } finally {
      isPullingCloudRef.current = false;
    }
  };

  const applyRemoteLiveSignal = (signal: LiveSyncSignal) => {
    if (!hasCompletedInitialPullRef.current) return;

    if (signal.action === 'delete' && Array.isArray(signal.deletedIds) && signal.deletedIds.length > 0) {
      const delSet = new Set(signal.deletedIds);
      const now = Date.now();
      signal.deletedIds.forEach((id) => recentlyDeletedIdsRef.current.set(id, now));
      recordLocalDeletedIds(signal.deletedIds);

      setAttendees((prev) => prev.filter((a) => !delSet.has(a.id)));
      setEvents((prev) =>
        prev
          .filter((e) => !delSet.has(e.id))
          .map((e) => ({ ...e, attendees: (e.attendees || []).filter((id) => !delSet.has(id)) }))
      );
      setClubs((prev) => prev.filter((c) => !delSet.has(c.id)));
      setClubActivities((prev) => prev.filter((a) => !delSet.has(a.id)));
      setClubTransactions((prev) => prev.filter((t) => !delSet.has(t.id)));
      setCamporeeShirts((prev) => prev.filter((s) => !delSet.has(s.id)));
      setClubEnrollments((prev) => prev.filter((e) => !delSet.has(e.id)));
      setBiblicalCharacters((prev) => prev.filter((b) => !delSet.has(b.id)));
      setYouthGames((prev) => prev.filter((g) => !delSet.has(g.id)));
      setUsers((prev) => prev.filter((u) => !delSet.has(u.id)));
      setPhotos((prev) => {
        const next = prev.filter((p) => !delSet.has(p.id));
        if (next.length !== prev.length) {
          saveAllPhotos(next).catch(console.error);
        }
        return next;
      });
    } else if (signal.action === 'upsert' && signal.entity && signal.record?.id) {
      const rec = signal.record;
      const persistedDeleted = getLocalDeletedIds();
      if (
        !recentlyDeletedIdsRef.current.has(rec.id) &&
        !pendingDeleteIdsRef.current.has(rec.id) &&
        !pendingSaveIdsRef.current.has(rec.id) &&
        !persistedDeleted[rec.id]
      ) {
        const upsertItem = <T extends { id: string }>(prev: T[], item: T): T[] => [
          item,
          ...prev.filter((x) => x.id !== item.id),
        ];

        switch (signal.entity) {
          case 'attendees':
            setAttendees((prev) => upsertItem(prev, rec));
            break;
          case 'events':
            setEvents((prev) => upsertItem(prev, rec));
            break;
          case 'clubs':
            setClubs((prev) => upsertItem(prev, rec));
            break;
          case 'clubActivities':
            setClubActivities((prev) => upsertItem(prev, rec));
            break;
          case 'clubTransactions':
            setClubTransactions((prev) => upsertItem(prev, rec));
            break;
          case 'camporeeShirts':
            setCamporeeShirts((prev) => upsertItem(prev, rec));
            break;
          case 'clubEnrollments':
            setClubEnrollments((prev) => upsertItem(prev, rec));
            break;
          case 'biblicalCharacters':
            setBiblicalCharacters((prev) =>
              upsertItem(prev, rec).sort(
                (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
              )
            );
            break;
          case 'users': {
            const normUser = normalizeAppUser(rec);
            setUsers((prev) => upsertItem(prev, normUser));
            setCurrentUser((prev) =>
              prev && prev.id === normUser.id
                ? normalizeAppUser({ ...prev, role: normUser.role, roles: normUser.roles, name: normUser.name, password: normUser.password })
                : prev
            );
            break;
          }
          case 'youthGames':
            setYouthGames((prev) => upsertItem(prev, rec));
            break;
        }
      }
    }

    if (pendingSaveIdsRef.current.size === 0 && pendingDeleteIdsRef.current.size === 0) {
      syncFromCloudNow(false);
    }
  };

  const isPublicGameView = Boolean(publicGameParams);
  const activeModuleRef = useRef<AppModule>(activeModule);
  useEffect(() => {
    activeModuleRef.current = activeModule;
  }, [activeModule]);

  useEffect(() => {
    // Public Youth Games player/screen views manage their own lightweight single-room channel
    // and must NEVER download or subscribe to all 12 admin church tables.
    if (isPublicGameView) return;

    let isMounted = true;
    syncFromCloudNow(true).finally(() => {
      if (isMounted) {
        hasCompletedInitialPullRef.current = true;
      }
    });

    // 1. Instant WebSocket Broadcast listener across Web + Mobile PWA
    const unsubscribeBroadcast = subscribeLiveSyncBroadcast(applyRemoteLiveSignal);

    // 2. Real-time Postgres Changes subscription across all core tables
    const client = getSupabaseClient();
    const realtimeTables = [
      'church_store',
      'attendees',
      'church_events',
      'clubs',
      'club_activities',
      'club_transactions',
      'camporee_shirts',
      'club_enrollments',
      'biblical_characters',
      'church_photos',
      'app_users',
      'youth_games',
    ];

    let channel = client ? client.channel('eclesia-realtime-sync') : null;
    if (channel) {
      for (const tbl of realtimeTables) {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tbl },
          (payload: any) => {
            // Live multiplayer game rows live in church_store under game_session_*, game_room_*, game_player_*.
            // Ignore them here so player joins/answers never trigger full-app cloud pulls or IndexedDB writes.
            if (tbl === 'church_store') {
              const changedId = String(payload?.new?.id || payload?.old?.id || '');
              if (
                changedId.startsWith('game_session_') ||
                changedId.startsWith('game_room_') ||
                changedId.startsWith('game_player_')
              ) {
                return;
              }
            }
            if (
              hasCompletedInitialPullRef.current &&
              pendingSaveIdsRef.current.size === 0 &&
              pendingDeleteIdsRef.current.size === 0
            ) {
              if (tbl === 'biblical_characters') {
                handleRefreshCharacters();
              } else {
                syncFromCloudNow(false);
              }
            }
          }
        );
      }
      channel.subscribe();
    }

    // 3. Immediate sync when returning to the browser tab or reopening mobile PWA from background
    const handleFocusSync = () => {
      if (
        hasCompletedInitialPullRef.current &&
        document.visibilityState !== 'hidden' &&
        pendingSaveIdsRef.current.size === 0 &&
        pendingDeleteIdsRef.current.size === 0 &&
        activeModuleRef.current !== 'jovenes_games'
      ) {
        syncFromCloudNow(false);
      }
    };
    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('pageshow', handleFocusSync);
    window.addEventListener('online', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    // 4. Lightweight 4s timestamp check fallback (skipped during live Youth Games to keep UI lag-free)
    const interval = setInterval(async () => {
      if (
        hasCompletedInitialPullRef.current &&
        document.visibilityState !== 'hidden' &&
        pendingSaveIdsRef.current.size === 0 &&
        pendingDeleteIdsRef.current.size === 0 &&
        !isPullingCloudRef.current &&
        activeModuleRef.current !== 'jovenes_games'
      ) {
        const cloudTs = await fetchCloudLastUpdated();
        const localTs = getLastKnownCloudUpdatedAt();
        if (cloudTs && cloudTs !== localTs) {
          syncFromCloudNow(false);
        }
      }
    }, 4000);

    return () => {
      isMounted = false;
      unsubscribeBroadcast();
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('pageshow', handleFocusSync);
      window.removeEventListener('online', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
      clearInterval(interval);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [isPublicGameView]);

  // 2. Cloud Auto-Sync with fast debounce (600ms): ONLY pushes on real local mutations, never after cloud pulls
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isPublicGameView) return;
    if (!hasCompletedInitialPullRef.current) return;
    if (localMutationVersionRef.current === lastPushedVersionRef.current) return;

    const config = getSupabaseConfig();
    if (!config.autoSync || !config.anonKey) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      if (isPullingCloudRef.current || pendingDeleteIdsRef.current.size > 0) return;
      const targetVersion = localMutationVersionRef.current;
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
        youthGames,
        deletedIds: getLocalDeletedIds(),
      };
      const res = await pushDataToSupabase(payload);
      if (res.success) {
        lastPushedVersionRef.current = targetVersion;
      }
    }, 600);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [attendees, events, zones, users, clubs, clubActivities, clubTransactions, photos, photoAlbums, camporeeShirts, clubEnrollments, biblicalCharacters, contestConfig, youthGames]);

  // Compute days for current week offset
  const weekDays = useMemo(() => {
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + weekOffset * 7);
    return getWeekDays(refDate);
  }, [weekOffset]);

  // Synchronized Attendance Handler: Attendance Matrix <-> Conferences <-> Reports <-> Stats
  const handleToggleDayAttendance = (attendeeId: string, dateString: string) => {
    markLocalMutation();
    const targetPerson = attendees.find((a) => a.id === attendeeId);
    const willBeAttended = targetPerson ? !targetPerson.attendance[dateString] : true;

    let updatedPerson: Attendee | null = null;
    if (targetPerson) {
      updatedPerson = {
        ...targetPerson,
        attendance: {
          ...targetPerson.attendance,
          [dateString]: willBeAttended,
        },
      };
      pendingSaveIdsRef.current.add(attendeeId);
    }

    setAttendees((prev) =>
      prev.map((person) => {
        if (person.id !== attendeeId) return person;
        return {
          ...person,
          attendance: {
            ...person.attendance,
            [dateString]: willBeAttended,
          },
        };
      })
    );

    const changedEvents: ChurchEvent[] = [];
    const todayStr = formatLocalDate(new Date());

    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
        const isEventOnDate = evt.date === dateString || (activeEventId === evt.id && dateString === todayStr);
        if (!isEventOnDate) return evt;

        const currentAttendees = evt.attendees || [];
        let nextEvt = evt;
        if (willBeAttended) {
          if (!currentAttendees.includes(attendeeId)) {
            nextEvt = { ...evt, attendees: [...currentAttendees, attendeeId] };
          }
        } else if (currentAttendees.includes(attendeeId)) {
          nextEvt = { ...evt, attendees: currentAttendees.filter((id) => id !== attendeeId) };
        }
        if (nextEvt !== evt) {
          changedEvents.push(nextEvt);
        }
        return nextEvt;
      })
    );

    if (updatedPerson) {
      saveAttendeeOnline(updatedPerson)
        .catch(console.error)
        .finally(() => pendingSaveIdsRef.current.delete(attendeeId));
    }
    changedEvents.forEach((evt) => {
      pendingSaveIdsRef.current.add(evt.id);
      saveEventOnline(evt)
        .catch(console.error)
        .finally(() => pendingSaveIdsRef.current.delete(evt.id));
    });

    if (targetPerson) {
      showToast(
        willBeAttended
          ? `Asistencia tachada y guardada para ${targetPerson.firstName}`
          : `Asistencia desmarcada para ${targetPerson.firstName}`
      );
    }
  };

  const handleToggleEventAttendance = (attendeeId: string, eventId: string) => {
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) return;

    markLocalMutation();
    const alreadyAttending = targetEvent.attendees && targetEvent.attendees.includes(attendeeId);
    const updatedEvent: ChurchEvent = {
      ...targetEvent,
      attendees: alreadyAttending
        ? (targetEvent.attendees || []).filter((id) => id !== attendeeId)
        : [...(targetEvent.attendees || []), attendeeId],
    };

    pendingSaveIdsRef.current.add(eventId);
    setEvents((prev) => prev.map((evt) => (evt.id === eventId ? updatedEvent : evt)));
    saveEventOnline(updatedEvent)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(eventId));

    // Sync back to attendee calendar if the event has a date
    const targetPerson = attendees.find((a) => a.id === attendeeId);
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

      if (targetPerson) {
        const updatedPerson: Attendee = {
          ...targetPerson,
          attendance: {
            ...targetPerson.attendance,
            [targetEvent.date]: !alreadyAttending,
          },
        };
        pendingSaveIdsRef.current.add(attendeeId);
        saveAttendeeOnline(updatedPerson)
          .catch(console.error)
          .finally(() => pendingSaveIdsRef.current.delete(attendeeId));
      }
    }

    showToast(
      alreadyAttending
        ? `Asistencia desmarcada para ${targetPerson ? targetPerson.firstName : 'asistente'}`
        : `Asistencia registrada para ${targetPerson ? targetPerson.firstName : 'asistente'}`
    );
  };

  // Add new attendee
  const handleAddAttendee = (newAttendee: Attendee, markCurrentEvent?: boolean) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(newAttendee.id);
    if (newAttendee.zone && !zones.includes(newAttendee.zone)) {
      setZones((prev) => [...prev, newAttendee.zone]);
    }

    if (markCurrentEvent && activeEvent && !activeEvent.attendees.includes(newAttendee.id)) {
      const updatedEvt: ChurchEvent = {
        ...activeEvent,
        attendees: [...activeEvent.attendees, newAttendee.id],
      };
      pendingSaveIdsRef.current.add(updatedEvt.id);
      setEvents((prev) => prev.map((evt) => (evt.id === updatedEvt.id ? updatedEvt : evt)));
      saveEventOnline(updatedEvt)
        .catch(console.error)
        .finally(() => pendingSaveIdsRef.current.delete(updatedEvt.id));
    }

    setAttendees((prev) => [newAttendee, ...prev]);
    saveAttendeeOnline(newAttendee)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(newAttendee.id));
    showToast(`¡${newAttendee.firstName} ${newAttendee.lastName} registrado con éxito!`);
  };

  // Update attendee
  const handleUpdateAttendee = (updated: Attendee) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(updated.id);
    if (updated.zone && !zones.includes(updated.zone)) {
      setZones((prev) => [...prev, updated.zone]);
    }
    setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    saveAttendeeOnline(updated)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(updated.id));
    showToast(`Datos actualizados en tiempo real`);
  };

  // Delete attendee (real-time relational + store)
  const handleDeleteAttendee = (id: string) => {
    markDeletedId(id);
    pendingDeleteIdsRef.current.add(id);
    setAttendees((prev) => prev.filter((a) => a.id !== id));
    setEvents((prev) =>
      prev.map((evt) => ({
        ...evt,
        attendees: evt.attendees.filter((attId) => attId !== id),
      }))
    );
    deleteRecordOnline('attendees', id, 'attendees')
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(id));
    showToast(`Registro eliminado de la base de datos`);
  };

  // Add event
  const handleAddEvent = (newEvent: ChurchEvent) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(newEvent.id);
    setEvents((prev) => [newEvent, ...prev]);
    setActiveEventId(newEvent.id);
    saveEventOnline(newEvent)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(newEvent.id));
    showToast(`Actividad "${newEvent.title}" creada y activada`);
  };

  // Delete event (real-time relational + store)
  const handleDeleteEvent = (eventId: string) => {
    markDeletedId(eventId);
    pendingDeleteIdsRef.current.add(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    if (activeEventId === eventId) setActiveEventId(null);
    if (reportEventId === eventId) setReportEventId(null);
    deleteRecordOnline('church_events', eventId, 'events')
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(eventId));
    showToast(`Conferencia eliminada de la base de datos`);
  };

  // Open WhatsApp with specific template
  const handleOpenWhatsAppModal = (attendee: Attendee, template: 'reminder' | 'welcome' | 'prayer' = 'reminder') => {
    setWhatsAppAttendee(attendee);
    setWhatsAppTemplate(template);
  };

  // Club Handlers
  const handleAddClub = (newClub: Club) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(newClub.id);
    setClubs((prev) => [...prev, newClub]);
    saveClubOnline(newClub)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(newClub.id));
    showToast(`Club "${newClub.name}" creado y guardado en tiempo real.`);
  };

  const handleUpdateClub = (updated: Club) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(updated.id);
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
    saveClubOnline(updated)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(updated.id));
    showToast(`Club "${updated.name}" actualizado.`);
  };

  const handleDeleteClub = (clubId: string) => {
    markDeletedId(clubId);
    pendingDeleteIdsRef.current.add(clubId);
    setClubs((prev) => prev.filter((c) => c.id !== clubId));
    setClubActivities((prev) => prev.filter((a) => a.clubId !== clubId));
    setClubTransactions((prev) => prev.filter((t) => t.clubId !== clubId));
    setCamporeeShirts((prev) => prev.filter((s) => s.clubId !== clubId));
    setClubEnrollments((prev) => prev.filter((e) => e.clubId !== clubId));
    deleteClubCascadeOnline(clubId)
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(clubId));
    showToast(`Club y sus registros eliminados en tiempo real.`);
  };

  const handleAddClubActivity = (newAct: ClubActivity) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(newAct.id);
    setClubActivities((prev) => [newAct, ...prev]);
    saveClubActivityOnline(newAct)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(newAct.id));
    showToast(`Actividad "${newAct.name}" registrada en tiempo real.`);
  };

  const handleAddClubTransaction = (newTx: ClubTransaction) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(newTx.id);
    setClubTransactions((prev) => [newTx, ...prev]);
    saveClubTransactionOnline(newTx)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(newTx.id));
    showToast(
      newTx.type === 'ingreso'
        ? `Ingreso de $${newTx.amount} registrado en ${newTx.activityName}`
        : `Egreso de $${newTx.amount} registrado en ${newTx.activityName}`
    );
  };

  const handleDeleteClubTransaction = (txId: string) => {
    markDeletedId(txId);
    pendingDeleteIdsRef.current.add(txId);
    setClubTransactions((prev) => prev.filter((t) => t.id !== txId));
    deleteRecordOnline('club_transactions', txId, 'clubTransactions')
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(txId));
    showToast(`Movimiento eliminado en tiempo real.`);
  };

  const handleDeleteClubActivity = (actId: string) => {
    markDeletedId(actId);
    pendingDeleteIdsRef.current.add(actId);
    setClubActivities((prev) => prev.filter((a) => a.id !== actId));
    setClubTransactions((prev) => prev.filter((t) => t.activityId !== actId));
    deleteActivityCascadeOnline(actId)
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(actId));
    showToast(`Actividad y sus movimientos eliminados en tiempo real.`);
  };

  // Camporee T-Shirt Handlers
  const handleAddCamporeeShirt = (newShirt: CamporeeShirtPayment) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(newShirt.id);
    setCamporeeShirts((prev) => [newShirt, ...prev]);
    saveCamporeeShirtOnline(newShirt)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(newShirt.id));
    showToast(`T-Shirt registrada para ${newShirt.personName}.`);
  };

  const handleUpdateCamporeeShirt = (updated: CamporeeShirtPayment) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(updated.id);
    setCamporeeShirts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    saveCamporeeShirtOnline(updated)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(updated.id));
    showToast(updated.isPaid ? `T-Shirt de ${updated.personName} marcada como PAGADA.` : `T-Shirt actualizada.`);
  };

  const handleDeleteCamporeeShirt = (id: string) => {
    markDeletedId(id);
    pendingDeleteIdsRef.current.add(id);
    setCamporeeShirts((prev) => prev.filter((s) => s.id !== id));
    deleteRecordOnline('camporee_shirts', id, 'camporeeShirts')
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(id));
    showToast(`Pedido de T-Shirt eliminado en tiempo real.`);
  };

  // Club Enrollment Handlers
  const handleAddClubEnrollment = (newEnrollment: ClubEnrollment) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(newEnrollment.id);
    setClubEnrollments((prev) => [newEnrollment, ...prev]);
    saveClubEnrollmentOnline(newEnrollment)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(newEnrollment.id));
    showToast(`Matrícula registrada y guardada para ${newEnrollment.memberName}.`);
  };

  const handleUpdateClubEnrollment = (updated: ClubEnrollment) => {
    markLocalMutation();
    pendingSaveIdsRef.current.add(updated.id);
    setClubEnrollments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    saveClubEnrollmentOnline(updated)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(updated.id));
    showToast(updated.isPaid ? `Matrícula de ${updated.memberName} marcada como PAGADA.` : `Matrícula actualizada.`);
  };

  const handleDeleteClubEnrollment = (id: string) => {
    markDeletedId(id);
    pendingDeleteIdsRef.current.add(id);
    setClubEnrollments((prev) => prev.filter((e) => e.id !== id));
    deleteRecordOnline('club_enrollments', id, 'clubEnrollments')
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(id));
    showToast(`Matrícula eliminada en tiempo real.`);
  };

  // Photos Handlers
  const handleAddPhotos = (newPhotos: ChurchPhoto[]) => {
    markLocalMutation();
    newPhotos.forEach((p) => pendingSaveIdsRef.current.add(p.id));
    setPhotos((prev) => {
      const updated = [...newPhotos, ...prev];
      saveAllPhotos(updated).catch(console.error);
      return updated;
    });
    savePhotosOnline(newPhotos)
      .catch(console.error)
      .finally(() => {
        newPhotos.forEach((p) => pendingSaveIdsRef.current.delete(p.id));
      });
    showToast(`¡${newPhotos.length} foto(s) guardadas en la galería!`);
  };

  const handleDeletePhoto = (photoId: string) => {
    markDeletedId(photoId);
    pendingDeleteIdsRef.current.add(photoId);
    setPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== photoId);
      saveAllPhotos(updated).catch(console.error);
      return updated;
    });
    deleteRecordOnline('church_photos', photoId, 'photos')
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(photoId));
    showToast(`Foto eliminada de la nube.`);
  };

  const handleAddAlbum = (newAlbum: PhotoAlbum) => {
    markLocalMutation();
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

  // Biblical Characters Contest Handlers (Real-time Save, Edit, Delete)
  const handleAddCharacterRegistration = async (newReg: BiblicalCharacterRegistration) => {
    recentlyDeletedIdsRef.current.delete(newReg.id);
    pendingSaveIdsRef.current.add(newReg.id);
    setBiblicalCharacters((prev) => [newReg, ...prev.filter((c) => c.id !== newReg.id)]);
    showToast(`¡Inscripción de ${newReg.nombre} guardada con éxito!`);
    try {
      const res = await registerBiblicalCharacterOnline(newReg);
      if (!res.success) {
        console.warn('Registro en línea advertencia:', res.message);
        markLocalMutation();
      }
    } catch (e) {
      console.warn('Auto-save to Supabase warning:', e);
      markLocalMutation();
    } finally {
      pendingSaveIdsRef.current.delete(newReg.id);
    }
    return true;
  };

  const handleRefreshCharacters = async () => {
    try {
      const result = await fetchBiblicalCharactersOnline();
      if (result.success && result.characters) {
        pruneDeletedIds();
        const persistedDeleted = getLocalDeletedIds();
        setBiblicalCharacters((prev) => {
          const map = new Map<string, BiblicalCharacterRegistration>();
          result.characters!.forEach((c) => {
            if (
              !recentlyDeletedIdsRef.current.has(c.id) &&
              !pendingDeleteIdsRef.current.has(c.id) &&
              !persistedDeleted[c.id]
            ) {
              map.set(c.id, c);
            }
          });
          // Only keep items that are actively saving right now; deleted items on server stay deleted!
          prev.forEach((c) => {
            if (pendingSaveIdsRef.current.has(c.id) && !map.has(c.id)) {
              map.set(c.id, c);
            }
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

  const handleUpdateCharacterRegistration = async (updated: BiblicalCharacterRegistration) => {
    pendingSaveIdsRef.current.add(updated.id);
    setBiblicalCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    try {
      const res = await updateBiblicalCharacterOnline(updated);
      if (!res.success) {
        markLocalMutation();
        showToast('Advertencia: no se pudo confirmar actualización en la nube.');
      }
    } catch (e) {
      console.error('Error updating biblical character:', e);
      markLocalMutation();
    } finally {
      pendingSaveIdsRef.current.delete(updated.id);
    }
  };

  const handleDeleteCharacterRegistration = async (id: string) => {
    markDeletedId(id);
    pendingDeleteIdsRef.current.add(id);
    pendingSaveIdsRef.current.delete(id);
    setBiblicalCharacters((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await deleteBiblicalCharacterOnline(id);
      if (res.success) {
        showToast('Inscripción eliminada permanentemente de la base de datos.');
      } else {
        showToast(`Aviso al eliminar en nube: ${res.message}`);
      }
    } catch (e) {
      console.error('Error deleting biblical character:', e);
      showToast('Inscripción eliminada localmente.');
    } finally {
      pendingDeleteIdsRef.current.delete(id);
    }
  };

  const handleUpdateContestConfig = (nextConfig: ContestCustomConfig) => {
    markLocalMutation();
    setContestConfig(nextConfig);
  };

  // Sociedad de Jóvenes Games Handlers
  const handleSaveYouthGame = async (game: YouthGame) => {
    markLocalMutation();
    recentlyDeletedIdsRef.current.delete(game.id);
    pendingSaveIdsRef.current.add(game.id);
    setYouthGames((prev) => {
      const exists = prev.some((g) => g.id === game.id);
      return exists ? prev.map((g) => (g.id === game.id ? game : g)) : [game, ...prev];
    });
    try {
      await saveYouthGameOnline(game);
    } finally {
      pendingSaveIdsRef.current.delete(game.id);
    }
  };

  const handleDeleteYouthGame = async (gameId: string) => {
    markDeletedId(gameId);
    pendingDeleteIdsRef.current.add(gameId);
    setYouthGames((prev) => prev.filter((g) => g.id !== gameId));
    try {
      await deleteYouthGameOnline(gameId);
    } finally {
      pendingDeleteIdsRef.current.delete(gameId);
    }
  };

  // User Authentication & Management Handlers
  const handleRegisterUser = (newUser: AppUser) => {
    const normUser = normalizeAppUser(newUser);
    markLocalMutation();
    pendingSaveIdsRef.current.add(normUser.id);
    setUsers((prev) => [...prev, normUser]);
    saveUserOnline(normUser)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(normUser.id));
    showToast(`Usuario "${normUser.name}" registrado.`);
    return { success: true, message: 'Usuario creado exitosamente', user: normUser };
  };

  const handleAddUserFromAdmin = (newUser: AppUser) => {
    const normUser = normalizeAppUser(newUser);
    markLocalMutation();
    pendingSaveIdsRef.current.add(normUser.id);
    setUsers((prev) => [...prev, normUser]);
    saveUserOnline(normUser)
      .catch(console.error)
      .finally(() => pendingSaveIdsRef.current.delete(normUser.id));
    showToast(`Usuario "${normUser.name}" añadido al equipo.`);
  };

  const handleDeleteUser = (userId: string) => {
    markDeletedId(userId);
    pendingDeleteIdsRef.current.add(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    deleteRecordOnline('app_users', userId, 'users')
      .catch(console.error)
      .finally(() => pendingDeleteIdsRef.current.delete(userId));
    showToast(`Usuario eliminado del sistema y de la nube.`);
  };

  const handleUpdateUserRoles = (userId: string, newRoles: UserRole[]) => {
    const cleanRoles: UserRole[] = newRoles.length > 0 ? newRoles : ['secretaria'];
    const primaryRole = cleanRoles[0];
    markLocalMutation();
    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: primaryRole, roles: cleanRoles } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, role: primaryRole, roles: cleanRoles } : null));
    }
    if (targetUser) {
      pendingSaveIdsRef.current.add(userId);
      saveUserOnline({ ...targetUser, role: primaryRole, roles: cleanRoles })
        .catch(console.error)
        .finally(() => pendingSaveIdsRef.current.delete(userId));
    }
    showToast(`Perfiles de usuario actualizados (${cleanRoles.length})`);
  };

  const handleResetPassword = (userId: string, newPass: string) => {
    markLocalMutation();
    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, password: newPass } : null));
    }
    if (targetUser) {
      pendingSaveIdsRef.current.add(userId);
      saveUserOnline({ ...targetUser, password: newPass })
        .catch(console.error)
        .finally(() => pendingSaveIdsRef.current.delete(userId));
    }
    showToast(`Contraseña actualizada con éxito.`);
  };

  const handleLoginSuccess = (user: AppUser) => {
    const normUser = normalizeAppUser(user);
    setCurrentUser(normUser);
    const allowed = getAllowedModulesForUser(normUser);
    setActiveModule(allowed.length === 1 ? allowed[0] : 'portal');
    setShowInstallBanner(true);
    setUsers((prev) =>
      prev.map((u) => (u.id === normUser.id ? { ...normUser, lastLogin: normUser.lastLogin } : u))
    );
    showToast(`¡Bienvenido/a, ${normUser.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowInstallBanner(true);
    setShowInstallGuideModal(false);
    showToast(`Sesión cerrada.`);
  };

  // Restore from JSON payload
  const handleRestoreData = (payload: ChurchDataPayload, mode: 'replace' | 'merge') => {
    markLocalMutation();
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
      if (payload.youthGames) setYouthGames(payload.youthGames);

      if (payload.users && payload.users.length) {
        const normalizedPayloadUsers = payload.users.map(normalizeAppUser);
        const hasAdmin = normalizedPayloadUsers.some(
          (u) => u.email.toLowerCase() === DEFAULT_ADMIN_USER.email.toLowerCase()
        );
        setUsers(hasAdmin ? normalizedPayloadUsers : [DEFAULT_ADMIN_USER, ...normalizedPayloadUsers]);
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
        const normalizedPayloadUsers = payload.users.map(normalizeAppUser);
        setUsers((prev) => {
          const existingEmails = new Set(prev.map((u) => u.email.toLowerCase()));
          const newUsers = normalizedPayloadUsers.filter((u) => !existingEmails.has(u.email.toLowerCase()));
          return [...prev, ...newUsers];
        });
      }
      if (payload.youthGames) {
        setYouthGames((prev) => {
          const ids = new Set(prev.map((g) => g.id));
          return [...prev, ...payload.youthGames!.filter((g) => !ids.has(g.id))];
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

  // Public Youth Games Player or "Otra Pantalla" Leaderboard View (no login required)
  if (publicGameParams) {
    return (
      <YouthGameLiveRoom
        initialMode={publicGameParams.mode}
        initialRoomCode={publicGameParams.roomCode}
        onExit={() => {
          window.history.pushState({}, '', window.location.pathname);
          setPublicGameParams(null);
        }}
        darkMode={darkMode}
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

  const allowedModules = getAllowedModulesForUser(currentUser);
  const hasMultipleModules = allowedModules.length > 1;
  const canConfig = canUserAccessConfig(currentUser);
  const effectiveModule: AppModule =
    allowedModules.length === 1
      ? allowedModules[0]
      : activeModule === 'portal' || allowedModules.includes(activeModule as Exclude<AppModule, 'portal'>)
      ? activeModule
      : 'portal';

  return (
    <div className={`min-h-dvh ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col transition-colors duration-200`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Install App Alert (shown upon login on Android, iOS & Desktop unless already installed) */}
      <PWAInstallBanner
        visible={showInstallBanner}
        isInstalled={isInstalled}
        isInstallable={isInstallable}
        isIOS={isIOS}
        isAndroid={isAndroid}
        onInstall={async () => {
          const accepted = await install();
          if (accepted) {
            setShowInstallBanner(false);
            showToast('¡Aplicación instalada en tu dispositivo!');
          }
          return accepted;
        }}
        onDismiss={() => setShowInstallBanner(false)}
        showGuideModal={showInstallGuideModal}
        onOpenGuideModal={() => setShowInstallGuideModal(true)}
        onCloseGuideModal={() => setShowInstallGuideModal(false)}
      />

      {/* Header with Top-Level Module Switcher & User Profile */}
      <Header
        activeModule={effectiveModule}
        onChangeModule={(mod) => {
          if (allowedModules.length === 1) {
            setActiveModule(allowedModules[0]);
            return;
          }
          if (mod === 'portal' || allowedModules.includes(mod as Exclude<AppModule, 'portal'>)) {
            setActiveModule(mod);
          }
        }}
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenBackupModal={() => {
          if (canConfig) {
            setBackupInitialTab('tables');
            setIsBackupOpen(true);
          }
        }}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        canInstallApp={!isInstalled}
        onOpenInstallApp={() => {
          if (isInstallable) {
            install().then((accepted) => {
              if (accepted) {
                setShowInstallBanner(false);
                showToast('¡Aplicación instalada en tu dispositivo!');
              }
            });
          } else {
            setShowInstallGuideModal(true);
          }
        }}
      />

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 ${hasMultipleModules ? 'pb-24 md:pb-6' : 'pb-6'}`}>
        {/* PORTAL DE ENTRADA */}
        {effectiveModule === 'portal' && (
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
              if (!allowedModules.includes(mod)) return;
              setActiveModule(mod);
              if (mod === 'visitas' && isSecretariaRestrictedUser(currentUser)) {
                setCurrentTab('asistencia');
              }
            }}
          />
        )}

        {/* MODULE: CONCURSO IMITA TU PERSONAJE BÍBLICO (28 Nov 2026) */}
        {effectiveModule === 'personaje_biblico' && (
          <BiblicalCharacterManager
            registrations={biblicalCharacters}
            onAddRegistration={handleAddCharacterRegistration}
            onUpdateRegistration={handleUpdateCharacterRegistration}
            onDeleteRegistration={handleDeleteCharacterRegistration}
            onBackToPortal={() => setActiveModule('portal')}
            currentUser={currentUser}
            contestConfig={contestConfig}
            onUpdateContestConfig={handleUpdateContestConfig}
            onRefreshRegistrations={handleRefreshCharacters}
          />
        )}

        {/* MODULE 1: REGISTRO VISITAS (Attendance, Conferences, Reports, Stats) */}
        {effectiveModule === 'visitas' && (
          <>
            {/* Prominent Framed Sub-Menu Recuadro */}
            <SubMenuVisitas
              currentTab={currentTab}
              onChangeTab={setCurrentTab}
              onBackToPortal={() => setActiveModule('portal')}
              onOpenRegister={() => setIsRegisterOpen(true)}
              userRole={currentUser?.role}
              currentUser={currentUser}
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
        {effectiveModule === 'clubes' && (
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
            onBackToPortal={hasMultipleModules ? () => setActiveModule('portal') : undefined}
          />
        )}

        {/* MODULE 3: FOTOS Y GALERÍA DE LA IGLESIA */}
        {effectiveModule === 'fotos' && (
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

        {/* MODULE 4: SOCIEDAD DE JÓVENES GAMES */}
        {effectiveModule === 'jovenes_games' && (
          <YouthGamesManager
            games={youthGames}
            onSaveGame={handleSaveYouthGame}
            onDeleteGame={handleDeleteYouthGame}
            onBackToPortal={hasMultipleModules ? () => setActiveModule('portal') : undefined}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className={`mt-auto border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 ${hasMultipleModules ? 'hidden md:block' : ''} no-print transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 dark:text-white">Eclesia</span>
            <span>·</span>
            <span>Sistema Integral de Gestión Eclesiástica, Finanzas y Fotos</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Módulo actual:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold border border-slate-300 dark:border-slate-700">
              {effectiveModule === 'portal'
                ? 'Portal Principal'
                : effectiveModule === 'visitas'
                ? 'Registro Visitas'
                : effectiveModule === 'clubes'
                ? 'Gestión de Clubes'
                : effectiveModule === 'fotos'
                ? 'Fotos de la Iglesia'
                : effectiveModule === 'jovenes_games'
                ? 'Sociedad de Jóvenes Games'
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
        youthGames={youthGames}
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
        onUpdateUserRoles={handleUpdateUserRoles}
        onResetPassword={handleResetPassword}
      />
    </div>
  );
}
