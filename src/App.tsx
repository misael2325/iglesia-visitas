import React, { useState, useEffect, useMemo } from 'react';
import { Header, NavTab } from './components/Header';
import { AttendeeList } from './components/AttendeeList';
import { ConferenceManager } from './components/ConferenceManager';
import { EventReportsView } from './components/EventReportsView';
import { WeeklyStatsView } from './components/WeeklyStatsView';
import { RegisterModal } from './components/RegisterModal';
import { EditAttendeeModal } from './components/EditAttendeeModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { INITIAL_ATTENDEES, INITIAL_EVENTS, INITIAL_ZONES } from './data/seedData';
import { Attendee, ChurchEvent } from './types';
import { getWeekDays, formatLocalDate } from './utils/dateUtils';
import { CheckCircle2, RotateCcw } from 'lucide-react';

const STORAGE_KEYS = {
  ATTENDEES: 'eclesia_attendees_v1',
  EVENTS: 'eclesia_events_v1',
  ZONES: 'eclesia_zones_v1',
  ACTIVE_EVENT: 'eclesia_active_event_v1',
};

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('asistencia');

  // Persistence State
  const [attendees, setAttendees] = useState<Attendee[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDEES);
      return stored ? JSON.parse(stored) : INITIAL_ATTENDEES;
    } catch {
      return INITIAL_ATTENDEES;
    }
  });

  const [events, setEvents] = useState<ChurchEvent[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EVENTS);
      return stored ? JSON.parse(stored) : INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  });

  const [zones, setZones] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ZONES);
      return stored ? JSON.parse(stored) : INITIAL_ZONES;
    } catch {
      return INITIAL_ZONES;
    }
  });

  const [activeEventId, setActiveEventId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT);
      return stored || (INITIAL_EVENTS[0] ? INITIAL_EVENTS[0].id : null);
    } catch {
      return INITIAL_EVENTS[0] ? INITIAL_EVENTS[0].id : null;
    }
  });

  // Week offset state
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Active event object
  const activeEvent = useMemo(() => {
    return events.find((e) => e.id === activeEventId) || null;
  }, [events, activeEventId]);

  // Selected event for reports
  const [reportEventId, setReportEventId] = useState<string | null>(null);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [whatsAppAttendee, setWhatsAppAttendee] = useState<Attendee | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDEES, JSON.stringify(attendees));
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
    }
  }, [activeEventId]);

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

        // Also if we toggled today and an active event matches today's date, update event attendance
        const todayStr = formatLocalDate(new Date());
        if (dateString === todayStr && activeEvent) {
          if (!currentVal) {
            // marked attended
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

        // Also ensure date attendance is marked for this person on event date
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
    // Add zone to available zones if new
    if (newAttendee.zone && !zones.includes(newAttendee.zone)) {
      setZones((prev) => [...prev, newAttendee.zone]);
    }

    // If markCurrentEvent and activeEvent exists, add to event attendees
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
    // Also remove from events
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
    showToast(`Conferencia "${newEvent.title}" programada y activa`);
  };

  // Reset demo data
  const handleResetData = () => {
    if (window.confirm('¿Deseas restaurar los datos de ejemplo iniciales de la iglesia?')) {
      localStorage.removeItem(STORAGE_KEYS.ATTENDEES);
      localStorage.removeItem(STORAGE_KEYS.EVENTS);
      localStorage.removeItem(STORAGE_KEYS.ZONES);
      setAttendees(INITIAL_ATTENDEES);
      setEvents(INITIAL_EVENTS);
      setZones(INITIAL_ZONES);
      setActiveEventId(INITIAL_EVENTS[0]?.id || null);
      showToast('Datos de ejemplo restaurados');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onOpenRegister={() => setIsRegisterOpen(true)}
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
            <span>Sistema Integral de Asistencia y Visitas Eclesiásticas</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleResetData}
              className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 font-medium"
              title="Restaurar datos de prueba"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Datos de Demostración
            </button>
            <span>·</span>
            <span>Tiempo Real · 2026</span>
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
    </div>
  );
}
