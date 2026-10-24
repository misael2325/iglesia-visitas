import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header, NavTab } from './components/Header';
import { AttendeeList } from './components/AttendeeList';
import { ConferenceManager } from './components/ConferenceManager';
import { EventReportsView } from './components/EventReportsView';
import { WeeklyStatsView } from './components/WeeklyStatsView';
import { RegisterModal } from './components/RegisterModal';
import { EditAttendeeModal } from './components/EditAttendeeModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { BackupSyncModal } from './components/BackupSyncModal';
import { INITIAL_ATTENDEES, INITIAL_EVENTS, INITIAL_ZONES } from './data/seedData';
import { Attendee, ChurchEvent } from './types';
import { getWeekDays, formatLocalDate } from './utils/dateUtils';
import { 
  getSupabaseConfig, 
  pushDataToSupabase, 
  ChurchDataPayload 
} from './services/supabaseClient';
import { 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  Cloud, 
  Download, 
  Sparkles,
  UserPlus,
  Plus
} from 'lucide-react';

const STORAGE_KEYS = {
  ATTENDEES: 'eclesia_attendees_v2',
  EVENTS: 'eclesia_events_v2',
  ZONES: 'eclesia_zones_v2',
  ACTIVE_EVENT: 'eclesia_active_event_v2',
  INITIALIZED: 'eclesia_has_initialized_v2',
};

const DEFAULT_BLANK_ZONES = [
  'Zona Central',
  'Zona Norte',
  'Zona Sur',
  'Sector Este',
  'Sector Oeste',
];

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('asistencia');

  // Persistence State - starts empty/blank as requested
  const [attendees, setAttendees] = useState<Attendee[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDEES);
      if (stored !== null) return JSON.parse(stored);
      // Blank slate by default so the user inserts their real church data
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

  // Week offset state
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Active event object
  const activeEvent = useMemo(() => {
    if (!events.length) return null;
    return events.find((e) => e.id === activeEventId) || events[0] || null;
  }, [events, activeEventId]);

  // Selected event for reports
  const [reportEventId, setReportEventId] = useState<string | null>(null);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [whatsAppAttendee, setWhatsAppAttendee] = useState<Attendee | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Sync to localStorage
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
    if (activeEventId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT, activeEventId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT);
    }
  }, [activeEventId]);

  // Cloud Auto-Sync with debounce
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
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
      };
      await pushDataToSupabase(payload);
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [attendees, events, zones]);

  // Compute days for current week offset
  const weekDays = useMemo(() => {
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + weekOffset * 7);
    return getWeekDays(refDate);
  }, [weekOffset]);

  // Handlers for attendance toggling
  const handleToggleDayAttendance = (attendeeId: string, dateString: string) => {
    setAttendees((prev) =>
      prev.map((person) => {
        if (person.id !== attendeeId) return person;
        const currentVal = !!person.attendance[dateString];
        const nextAttendance = {
          ...person.attendance,
          [dateString]: !currentVal,
        };

        const todayStr = formatLocalDate(new Date());
        if (dateString === todayStr && activeEvent) {
          if (!currentVal) {
            if (!activeEvent.attendees.includes(attendeeId)) {
              setEvents((prevEvts) =>
                prevEvts.map((evt) =>
                  evt.id === activeEvent.id
                    ? { ...evt, attendees: [...evt.attendees, attendeeId] }
                    : evt
                )
              );
            }
          }
        }

        return {
          ...person,
          attendance: nextAttendance,
        };
      })
    );

    const person = attendees.find((a) => a.id === attendeeId);
    if (person) {
      const willBeAttended = !person.attendance[dateString];
      showToast(
        willBeAttended
          ? `Asistencia tachada y guardada para ${person.firstName}`
          : `Asistencia desmarcada para ${person.firstName}`
      );
    }
  };

  const handleToggleEventAttendance = (attendeeId: string, eventId: string) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const alreadyAttending = evt.attendees.includes(attendeeId);
        const nextAttendees = alreadyAttending
          ? evt.attendees.filter((id) => id !== attendeeId)
          : [...evt.attendees, attendeeId];

        if (!alreadyAttending && evt.date) {
          setAttendees((prevAtt) =>
            prevAtt.map((a) => {
              if (a.id !== attendeeId) return a;
              return {
                ...a,
                attendance: { ...a.attendance, [evt.date]: true },
              };
            })
          );
        }

        return {
          ...evt,
          attendees: nextAttendees,
        };
      })
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

  // Restore from JSON payload
  const handleRestoreData = (payload: ChurchDataPayload, mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setAttendees(payload.attendees || []);
      setEvents(payload.events || []);
      setZones(payload.zones && payload.zones.length ? payload.zones : DEFAULT_BLANK_ZONES);
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
      showToast(`Datos combinados con éxito.`);
    }
  };

  // Clear everything to clean blank state
  const handleClearAllData = () => {
    setAttendees([]);
    setEvents([]);
    setZones(DEFAULT_BLANK_ZONES);
    setActiveEventId(null);
    setReportEventId(null);
    localStorage.removeItem(STORAGE_KEYS.ATTENDEES);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT);
  };

  // Load demo seed data if requested
  const handleLoadDemoData = () => {
    setAttendees(INITIAL_ATTENDEES);
    setEvents(INITIAL_EVENTS);
    setZones(INITIAL_ZONES);
    setActiveEventId(INITIAL_EVENTS[0]?.id || null);
    showToast('Datos de demostración cargados');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenBackupModal={() => setIsBackupOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            onOpenWhatsApp={(attendee) => setWhatsAppAttendee(attendee)}
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
            onOpenWhatsApp={(attendee) => setWhatsAppAttendee(attendee)}
          />
        )}

        {currentTab === 'estadisticas' && (
          <WeeklyStatsView
            attendees={attendees}
            events={events}
            weekDays={weekDays}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Eclesia</span>
            <span>·</span>
            <span>Página en blanco lista para insertar datos</span>
            <span>·</span>
            <span className="text-emerald-700 font-medium">Respaldo JSON y Supabase Nube</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 font-semibold"
            >
              <Cloud className="w-3.5 h-3.5" />
              Sincronizar Supabase / JSON
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Deseas vaciar la página y dejarla completamente en blanco?')) {
                  handleClearAllData();
                  showToast('Página en blanco lista para tus datos');
                }
              }}
              className="text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Dejar en Blanco
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={handleLoadDemoData}
              className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1"
              title="Cargar datos de ejemplo sólo para prueba"
            >
              <RotateCcw className="w-3 h-3" />
              Ver Ejemplos
            </button>
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
      />

      <BackupSyncModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        attendees={attendees}
        events={events}
        zones={zones}
        onRestoreData={handleRestoreData}
        onClearAllData={handleClearAllData}
        onNotify={showToast}
      />
    </div>
  );
}
