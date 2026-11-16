import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  Flame,
  Gamepad2,
  Maximize2,
  Monitor,
  Play,
  QrCode,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Sparkles,
  Square,
  Timer,
  Trophy,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  YouthGamePlayMode,
  YouthGamePlayer,
  YouthGameSession,
} from '../types';
import {
  createPublicGameUrl,
  fetchGamePlayers,
  fetchGameSessionById,
  fetchGameSessionByRoom,
  GameRoomSignal,
  saveGamePlayerOnline,
  saveGameSessionOnline,
  subscribeToGameRoom,
} from '../services/supabaseClient';

export type LiveRoomViewMode = 'host' | 'screen' | 'player';

interface YouthGameLiveRoomProps {
  initialMode: LiveRoomViewMode;
  initialSession?: YouthGameSession | null;
  initialRoomCode?: string;
  onExit?: () => void;
  onNotify?: (msg: string) => void;
  darkMode?: boolean;
}

const AVATAR_CHOICES = ['🦁', '🔥', '⚡', '🌟', '👑', '🎯', '🎵', '📖', '🕊️', '🚀'];

const QUIZIZZ_TILE_STYLES = [
  {
    bg: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 border-rose-400/50',
    shape: '◆',
    label: 'A',
  },
  {
    bg: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border-blue-400/50',
    shape: '●',
    label: 'B',
  },
  {
    bg: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 border-amber-300/60',
    shape: '★',
    label: 'C',
  },
  {
    bg: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border-emerald-400/50',
    shape: '■',
    label: 'D',
  },
];

function sortPlayersLeaderboard(list: YouthGamePlayer[]): YouthGamePlayer[] {
  return [...list].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.correctCount || 0) !== (a.correctCount || 0)) {
      return (b.correctCount || 0) - (a.correctCount || 0);
    }
    if ((b.bestStreak || 0) !== (a.bestStreak || 0)) {
      return (b.bestStreak || 0) - (a.bestStreak || 0);
    }
    return (a.joinedAt || '').localeCompare(b.joinedAt || '');
  });
}

const STATUS_RANK: Record<YouthGameSession['status'], number> = {
  lobby: 0,
  playing: 1,
  finished: 2,
};

function mergeMonotonicSession(
  prev: YouthGameSession | null,
  incoming: YouthGameSession | null
): YouthGameSession | null {
  if (!incoming) return prev;
  if (!prev) return incoming;

  // Different session ID (e.g., host restarted with a new match ID)
  if (incoming.id !== prev.id) {
    return (incoming.updatedAt || '') >= (prev.updatedAt || '') ? incoming : prev;
  }

  // Same session ID: NEVER revert status backwards (e.g., playing -> lobby "Esperando partida")
  const prevRank = STATUS_RANK[prev.status] ?? 0;
  const nextRank = STATUS_RANK[incoming.status] ?? 0;
  if (nextRank < prevRank) {
    return prev;
  }

  // Reject stale timestamps unless status strictly moved forward
  if (nextRank === prevRank && (incoming.updatedAt || '') < (prev.updatedAt || '')) {
    return prev;
  }

  // In host_paced playing mode, never step backwards on currentQuestionIndex
  if (
    nextRank === 1 &&
    prevRank === 1 &&
    incoming.playMode === 'host_paced' &&
    prev.playMode === 'host_paced' &&
    (incoming.currentQuestionIndex || 0) < (prev.currentQuestionIndex || 0)
  ) {
    return prev;
  }

  // Avoid creating a new object reference if nothing meaningful changed
  if (
    incoming.updatedAt === prev.updatedAt &&
    incoming.status === prev.status &&
    incoming.currentQuestionIndex === prev.currentQuestionIndex &&
    incoming.playMode === prev.playMode
  ) {
    return prev;
  }

  return incoming;
}

function pickMoreRecentPlayer(a: YouthGamePlayer, b: YouthGamePlayer): YouthGamePlayer {
  const aAns = a.answeredCount || 0;
  const bAns = b.answeredCount || 0;
  if (bAns !== aAns) return bAns > aAns ? b : a;

  const aScore = a.score || 0;
  const bScore = b.score || 0;
  if (bScore !== aScore) return bScore > aScore ? b : a;

  if (b.finished !== a.finished) return b.finished ? b : a;

  return (b.updatedAt || '') >= (a.updatedAt || '') ? b : a;
}

function arePlayerListsEquivalent(a: YouthGamePlayer[], b: YouthGamePlayer[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p1 = a[i];
    const p2 = b[i];
    if (
      p1.id !== p2.id ||
      p1.updatedAt !== p2.updatedAt ||
      p1.score !== p2.score ||
      p1.answeredCount !== p2.answeredCount ||
      p1.finished !== p2.finished
    ) {
      return false;
    }
  }
  return true;
}

function mergeMonotonicPlayers(
  prev: YouthGamePlayer[],
  incoming: YouthGamePlayer[],
  activeSessionId: string
): YouthGamePlayer[] {
  const merged = new Map<string, YouthGamePlayer>();

  for (const p of prev) {
    if (!p || !p.id) continue;
    if (p.sessionId && p.sessionId !== activeSessionId) continue;
    merged.set(p.id, p);
  }

  for (const p of incoming) {
    if (!p || !p.id) continue;
    if (p.sessionId && p.sessionId !== activeSessionId) continue;
    const existing = merged.get(p.id);
    merged.set(p.id, existing ? pickMoreRecentPlayer(existing, p) : p);
  }

  const nextSorted = sortPlayersLeaderboard(Array.from(merged.values()));
  return arePlayerListsEquivalent(prev, nextSorted) ? prev : nextSorted;
}

const MemoizedQRCode = React.memo(({ value, size }: { value: string; size: number }) => (
  <QRCodeSVG value={value} size={size} />
));

export const YouthGameLiveRoom: React.FC<YouthGameLiveRoomProps> = ({
  initialMode,
  initialSession = null,
  initialRoomCode = '',
  onExit,
  onNotify,
}) => {
  const [viewMode, setViewMode] = useState<LiveRoomViewMode>(initialMode);
  const [session, setSession] = useState<YouthGameSession | null>(initialSession);
  const [players, setPlayers] = useState<YouthGamePlayer[]>([]);
  const [roomInput, setRoomInput] = useState(
    (initialSession?.roomCode || initialRoomCode || '').toUpperCase()
  );
  const [isLoadingRoom, setIsLoadingRoom] = useState(!initialSession && !!initialRoomCode);
  const [roomError, setRoomError] = useState('');
  const [localToast, setLocalToast] = useState('');

  // Player state (saved in sessionStorage per room so accidental refresh preserves player!)
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState('⚡');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Active question timing & instant feedback for Player view (scoped to questionId to avoid 0s timeout cascades)
  const [timerState, setTimerState] = useState<{ questionId: string; secondsLeft: number }>({
    questionId: '',
    secondsLeft: 20,
  });
  const [isHostUpdating, setIsHostUpdating] = useState(false);
  const questionShownAtRef = useRef<number>(Date.now());
  const submittingQuestionIdRef = useRef<string | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);
  const lastSessionIdRef = useRef<string | null>(initialSession?.id || null);

  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
  }, [myPlayerId]);

  const [lastFeedback, setLastFeedback] = useState<{
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
    pointsAwarded: number;
    correctAnswerText: string;
    explanation?: string;
  } | null>(null);

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
    setLocalToast(msg);
    setTimeout(() => setLocalToast(''), 2800);
  };

  // Restore saved player ID for this exact room + session ID if present
  useEffect(() => {
    const code = (session?.roomCode || roomInput || '').trim().toUpperCase();
    const sid = session?.id;
    if (!code || !sid) return;
    try {
      const saved = sessionStorage.getItem(`eclesia_game_player_${code}_${sid}`);
      if (saved) {
        setMyPlayerId(saved);
      } else {
        setMyPlayerId(null);
      }
    } catch {}
  }, [session?.roomCode, session?.id, roomInput]);

  // Reset player/feedback lists cleanly if host launches a brand-new session ID on the same PIN
  useEffect(() => {
    if (!session?.id) return;
    if (lastSessionIdRef.current && lastSessionIdRef.current !== session.id) {
      setPlayers((prev) => prev.filter((p) => p.sessionId === session.id));
      setLastFeedback(null);
      submittingQuestionIdRef.current = null;
    }
    lastSessionIdRef.current = session.id;
  }, [session?.id]);

  // Initial room lookup if opened via link (?view=jovenes_games&room=...)
  useEffect(() => {
    if (initialSession) return;
    if (!initialRoomCode) return;

    let active = true;
    setIsLoadingRoom(true);
    fetchGameSessionByRoom(initialRoomCode)
      .then(async (found) => {
        if (!active) return;
        if (found) {
          setSession((prev) => mergeMonotonicSession(prev, found));
          setRoomError('');
          const list = await fetchGamePlayers(found.id);
          if (active && Array.isArray(list)) {
            setPlayers((prev) => mergeMonotonicPlayers(prev, list, found.id));
          }
        } else {
          setRoomError('No se encontró una partida activa con ese código.');
        }
      })
      .finally(() => {
        if (active) setIsLoadingRoom(false);
      });

    return () => {
      active = false;
    };
  }, [initialSession, initialRoomCode]);

  // Real-time WebSocket subscription + deduplicated, debounced DB sync + 4.5s backup polling
  useEffect(() => {
    if (!session?.id || !session?.roomCode) return;

    const currentSessionId = session.id;
    const currentRoomCode = session.roomCode;
    let isDisposed = false;
    let isRefreshing = false;
    let hasPendingRefresh = false;
    let dbRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshAll = async () => {
      if (isDisposed) return;
      if (isRefreshing) {
        hasPendingRefresh = true;
        return;
      }
      isRefreshing = true;
      try {
        const [latestSession, latestPlayers] = await Promise.all([
          fetchGameSessionById(currentSessionId),
          fetchGamePlayers(currentSessionId),
        ]);
        if (isDisposed) return;

        if (latestSession) {
          setSession((prev) => mergeMonotonicSession(prev, latestSession));
        }
        if (Array.isArray(latestPlayers)) {
          setPlayers((prev) => mergeMonotonicPlayers(prev, latestPlayers, currentSessionId));
        }
      } catch {} finally {
        isRefreshing = false;
        if (hasPendingRefresh && !isDisposed) {
          hasPendingRefresh = false;
          refreshAll();
        }
      }
    };

    const scheduleDebouncedDbRefresh = () => {
      if (isDisposed) return;
      if (dbRefreshTimer) clearTimeout(dbRefreshTimer);
      dbRefreshTimer = setTimeout(() => {
        dbRefreshTimer = null;
        refreshAll();
      }, 450);
    };

    refreshAll();

    const unsubscribe = subscribeToGameRoom(
      currentRoomCode,
      currentSessionId,
      (signal: GameRoomSignal) => {
        if (isDisposed) return;
        if (signal.type === 'session_update' && signal.session) {
          setSession((prev) => mergeMonotonicSession(prev, signal.session!));
        } else if (signal.type === 'player_update' && signal.player) {
          const incoming = signal.player;
          if (incoming.sessionId && incoming.sessionId !== currentSessionId) return;
          setPlayers((prev) => mergeMonotonicPlayers(prev, [incoming], currentSessionId));
        }
      },
      scheduleDebouncedDbRefresh
    );

    const handleResumeSync = () => {
      if (!isDisposed && document.visibilityState !== 'hidden') {
        refreshAll();
      }
    };
    window.addEventListener('focus', handleResumeSync);
    window.addEventListener('pageshow', handleResumeSync);
    window.addEventListener('online', handleResumeSync);
    document.addEventListener('visibilitychange', handleResumeSync);

    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        refreshAll();
      }
    }, 4500);

    return () => {
      isDisposed = true;
      if (dbRefreshTimer) clearTimeout(dbRefreshTimer);
      unsubscribe();
      window.removeEventListener('focus', handleResumeSync);
      window.removeEventListener('pageshow', handleResumeSync);
      window.removeEventListener('online', handleResumeSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
      clearInterval(interval);
    };
  }, [session?.id, session?.roomCode]);

  const sortedPlayers = useMemo(() => sortPlayersLeaderboard(players), [players]);
  const myPlayer = useMemo(
    () => sortedPlayers.find((p) => p.id === myPlayerId) || null,
    [sortedPlayers, myPlayerId]
  );
  const myRank = useMemo(() => {
    if (!myPlayerId) return null;
    const idx = sortedPlayers.findIndex((p) => p.id === myPlayerId);
    return idx >= 0 ? idx + 1 : null;
  }, [sortedPlayers, myPlayerId]);

  // Determine which question the Player is currently viewing
  const activePlayerQuestionIndex = useMemo(() => {
    if (!session) return 0;
    if (session.playMode === 'host_paced') {
      return session.currentQuestionIndex || 0;
    }
    return myPlayer?.currentQuestionIndex || 0;
  }, [session, myPlayer?.currentQuestionIndex]);

  const activePlayerQuestion = useMemo(() => {
    if (!session) return null;
    return session.questions[activePlayerQuestionIndex] || null;
  }, [session, activePlayerQuestionIndex]);

  const secondsLeft = useMemo(() => {
    if (!activePlayerQuestion) return 20;
    const limit = Math.max(5, Number(activePlayerQuestion.timeLimitSeconds) || 20);
    if (timerState.questionId === activePlayerQuestion.id) {
      return timerState.secondsLeft;
    }
    return limit;
  }, [activePlayerQuestion, timerState]);

  // Countdown timer for Player View (updates only when integer second changes, paused while feedback is shown)
  useEffect(() => {
    if (viewMode !== 'player' || !session || session.status !== 'playing' || !activePlayerQuestion) {
      return;
    }
    if (myPlayer?.finished) return;
    if (myPlayer?.answers?.[activePlayerQuestion.id]) return;
    if (lastFeedback) return;

    const qId = activePlayerQuestion.id;
    const limit = Math.max(5, Number(activePlayerQuestion.timeLimitSeconds) || 20);
    questionShownAtRef.current = Date.now();
    setTimerState({ questionId: qId, secondsLeft: limit });

    const timer = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - questionShownAtRef.current) / 1000);
      const rem = Math.max(0, limit - elapsedSec);
      setTimerState((prev) =>
        prev.questionId === qId && prev.secondsLeft === rem
          ? prev
          : { questionId: qId, secondsLeft: rem }
      );
    }, 250);

    return () => clearInterval(timer);
  }, [
    viewMode,
    session?.status,
    session?.playMode,
    activePlayerQuestion?.id,
    myPlayer?.finished,
    lastFeedback,
  ]);

  // Reset feedback only in host_paced mode when the host moves everyone to a new question
  useEffect(() => {
    if (!activePlayerQuestion || session?.playMode !== 'host_paced') return;
    if (lastFeedback && lastFeedback.questionId !== activePlayerQuestion.id) {
      setLastFeedback(null);
    }
  }, [activePlayerQuestion?.id, session?.playMode, lastFeedback]);

  // Host Action Helpers
  const updateHostSession = async (next: YouthGameSession) => {
    setIsHostUpdating(true);
    setSession((prev) => mergeMonotonicSession(prev, next));
    try {
      await saveGameSessionOnline(next);
    } finally {
      setIsHostUpdating(false);
    }
  };

  const handleHostStartGame = async () => {
    if (!session || isHostUpdating) return;
    await updateHostSession({
      ...session,
      status: 'playing',
      currentQuestionIndex: 0,
      questionStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    notify('🚀 ¡Juego iniciado! Los jóvenes ya pueden responder en vivo.');
  };

  const handleHostTogglePlayMode = async (mode: YouthGamePlayMode) => {
    if (!session || isHostUpdating) return;
    await updateHostSession({
      ...session,
      playMode: mode,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleHostNextQuestion = async () => {
    if (!session || isHostUpdating) return;
    const nextIdx = session.currentQuestionIndex + 1;
    if (nextIdx >= session.questions.length) {
      await updateHostSession({
        ...session,
        status: 'finished',
        updatedAt: new Date().toISOString(),
      });
      notify('🏆 ¡Partida finalizada! Mostrando podio.');
    } else {
      await updateHostSession({
        ...session,
        currentQuestionIndex: nextIdx,
        questionStartedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleHostFinishGame = async () => {
    if (!session || isHostUpdating) return;
    await updateHostSession({
      ...session,
      status: 'finished',
      updatedAt: new Date().toISOString(),
    });
    notify('🏁 Partida finalizada. ¡Felicidades a los ganadores!');
  };

  const handleHostRestartGame = async () => {
    if (!session || isHostUpdating) return;
    const resetSession: YouthGameSession = {
      ...session,
      id: `gs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'lobby',
      currentQuestionIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPlayers([]);
    await updateHostSession(resetSession);
    notify('🔄 Nueva sala lista con el mismo código PIN.');
  };

  // Player Action Helpers
  const handleLookupRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    setIsLoadingRoom(true);
    setRoomError('');
    try {
      const found = await fetchGameSessionByRoom(roomInput);
      if (!found) {
        setRoomError('No encontramos ninguna partida con ese código PIN.');
      } else {
        setSession((prev) => mergeMonotonicSession(prev, found));
        const list = await fetchGamePlayers(found.id);
        if (Array.isArray(list)) {
          setPlayers((prev) => mergeMonotonicPlayers(prev, list, found.id));
        }
      }
    } finally {
      setIsLoadingRoom(false);
    }
  };

  const handleJoinAsPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || isJoining) return;
    const cleanName = playerNameInput.trim();
    if (!cleanName) {
      notify('Escribe tu nombre o apodo para entrar.');
      return;
    }

    setIsJoining(true);
    try {
      const newPlayerId = `ply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nowIso = new Date().toISOString();
      const newPlayer: YouthGamePlayer = {
        id: newPlayerId,
        sessionId: session.id,
        name: cleanName,
        avatarEmoji: playerAvatar,
        score: 0,
        streak: 0,
        bestStreak: 0,
        correctCount: 0,
        answeredCount: 0,
        currentQuestionIndex:
          session.status === 'playing' && session.playMode === 'host_paced'
            ? session.currentQuestionIndex
            : 0,
        finished: false,
        answers: {},
        joinedAt: nowIso,
        updatedAt: nowIso,
      };

      try {
        sessionStorage.setItem(`eclesia_game_player_${session.roomCode}_${session.id}`, newPlayerId);
      } catch {}

      setMyPlayerId(newPlayerId);
      setPlayers((prev) => mergeMonotonicPlayers(prev, [newPlayer], session.id));
      await saveGamePlayerOnline(session.id, session.roomCode, newPlayer);
      notify(`¡Bienvenido al juego, ${cleanName}!`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleAnswerSubmit = async (selectedIndex: number) => {
    if (!session || !myPlayer || !activePlayerQuestion) return;
    if (myPlayer.answers?.[activePlayerQuestion.id]) return;
    if (submittingQuestionIdRef.current === activePlayerQuestion.id) return;

    submittingQuestionIdRef.current = activePlayerQuestion.id;

    try {
      const now = Date.now();
      const responseMs = Math.max(200, now - questionShownAtRef.current);
      const limitMs = Math.max(5000, (Number(activePlayerQuestion.timeLimitSeconds) || 20) * 1000);
      const speedRatio = Math.max(0, Math.min(1, 1 - responseMs / limitMs));

      const correctIdx = activePlayerQuestion.correctIndex ?? 0;
      const isCorrect = selectedIndex === correctIdx;
      const nextStreak = isCorrect ? (myPlayer.streak || 0) + 1 : 0;
      const basePts = Number(activePlayerQuestion.points) || 1000;
      const pointsAwarded = isCorrect
        ? Math.round(basePts * (0.55 + 0.45 * speedRatio)) + Math.min((nextStreak - 1) * 100, 400)
        : 0;

      const updatedAnswers = {
        ...(myPlayer.answers || {}),
        [activePlayerQuestion.id]: {
          questionId: activePlayerQuestion.id,
          selectedIndex,
          isCorrect,
          pointsAwarded,
          responseMs,
          answeredAt: new Date().toISOString(),
        },
      };

      const nextQIdx =
        session.playMode === 'self_paced'
          ? Math.min(session.questions.length, (myPlayer.currentQuestionIndex || 0) + 1)
          : myPlayer.currentQuestionIndex;
      const isNowFinished =
        session.playMode === 'self_paced' && nextQIdx >= session.questions.length;

      const updatedPlayer: YouthGamePlayer = {
        ...myPlayer,
        score: (myPlayer.score || 0) + pointsAwarded,
        streak: nextStreak,
        bestStreak: Math.max(myPlayer.bestStreak || 0, nextStreak),
        correctCount: (myPlayer.correctCount || 0) + (isCorrect ? 1 : 0),
        answeredCount: Object.keys(updatedAnswers).length,
        currentQuestionIndex: nextQIdx,
        finished: isNowFinished,
        answers: updatedAnswers,
        updatedAt: new Date().toISOString(),
      };

      setLastFeedback({
        questionId: activePlayerQuestion.id,
        selectedIndex,
        isCorrect,
        pointsAwarded,
        correctAnswerText: activePlayerQuestion.options[correctIdx] || '',
        explanation: activePlayerQuestion.explanation,
      });

      setPlayers((prev) => mergeMonotonicPlayers(prev, [updatedPlayer], session.id));

      await saveGamePlayerOnline(session.id, session.roomCode, updatedPlayer);
    } finally {
      // Release lock only if we moved past that question or save finished
      if (submittingQuestionIdRef.current === activePlayerQuestion.id) {
        submittingQuestionIdRef.current = null;
      }
    }
  };

  // Auto-timeout when timer reaches 0 on Player view (strictly for the question whose timer hit 0)
  useEffect(() => {
    if (
      viewMode === 'player' &&
      session?.status === 'playing' &&
      activePlayerQuestion &&
      myPlayer &&
      !myPlayer.finished &&
      !myPlayer.answers?.[activePlayerQuestion.id] &&
      !lastFeedback &&
      timerState.questionId === activePlayerQuestion.id &&
      timerState.secondsLeft === 0
    ) {
      handleAnswerSubmit(-1);
    }
  }, [timerState, viewMode, session?.status, activePlayerQuestion?.id, myPlayer?.id, lastFeedback]);

  // Self-paced auto advance after short feedback pause
  useEffect(() => {
    if (
      viewMode === 'player' &&
      session?.playMode === 'self_paced' &&
      lastFeedback
    ) {
      const t = setTimeout(() => {
        setLastFeedback(null);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [viewMode, session?.playMode, lastFeedback]);

  const playerUrl = session ? createPublicGameUrl(session.roomCode, 'player') : '';
  const screenUrl = session ? createPublicGameUrl(session.roomCode, 'screen') : '';

  const copyLink = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify(`¡${label} copiado al portapapeles!`);
    } catch {
      notify('No se pudo copiar automáticamente.');
    }
  };

  // ============================================================
  // 1. RENDER: ROOM LOOKUP IF NO SESSION YET (Direct Player/Screen URL)
  // ============================================================
  if (!session) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-br from-[#2d0f3a] via-[#1c082b] to-slate-950 rounded-3xl text-white">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500 to-amber-500 flex items-center justify-center shadow-lg">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-300">
              Sociedad de Jóvenes Games
            </span>
            <h2 className="text-2xl font-black mt-1">Unirse a una Partida en Vivo</h2>
            <p className="text-xs text-purple-200 mt-1">
              Ingresa el código PIN que aparece en la pantalla del salón.
            </p>
          </div>

          {isLoadingRoom ? (
            <div className="py-6 text-sm font-bold text-purple-200 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Buscando sala en tiempo real...</span>
            </div>
          ) : (
            <form onSubmit={handleLookupRoom} className="space-y-3">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="Código PIN (ej. 482910)"
                className="w-full px-4 py-3.5 rounded-2xl bg-white text-slate-950 font-mono font-black text-center text-xl tracking-widest focus:outline-none focus:ring-4 focus:ring-amber-400"
              />
              {roomError && (
                <p className="text-xs font-bold text-rose-300">{roomError}</p>
              )}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-lg cursor-pointer"
              >
                Buscar Sala
              </button>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-purple-100 cursor-pointer"
                >
                  Volver a Sociedad de Jóvenes Games
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // 2. RENDER: OTRA PANTALLA (LIVE LEADERBOARD / PROJECTOR DISPLAY)
  // ============================================================
  if (viewMode === 'screen') {
    const currentQ = session.questions[session.currentQuestionIndex];
    const totalQ = session.questions.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2d0b3f] via-[#1a0728] to-[#0f0518] text-white p-4 sm:p-8 flex flex-col gap-6">
        {localToast && (
          <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl">
            {localToast}
          </div>
        )}

        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl px-5 py-4">
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                type="button"
                onClick={() => (initialMode === 'host' ? setViewMode('host') : onExit())}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                title="Volver al panel de control"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Pantalla en Vivo · Lugares en Tiempo Real
                </span>
                <span className="text-xs font-bold text-purple-200">
                  {totalQ} preguntas
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight mt-0.5">
                {session.gameTitle}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-amber-400 text-slate-950 font-mono font-black text-lg sm:text-2xl tracking-wider shadow-lg">
              PIN: {session.roomCode}
            </div>
            <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-center">
              <span className="block text-xl font-black font-mono leading-none">
                {sortedPlayers.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-purple-200">Jugadores</span>
            </div>
            {initialMode === 'host' && (
              <button
                type="button"
                onClick={() => setViewMode('host')}
                className="px-4 py-2.5 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Volver al Control Anfitrión</span>
              </button>
            )}
          </div>
        </div>

        {/* LOBBY ON PROJECTOR SCREEN */}
        {session.status === 'lobby' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-6 sm:p-8 text-center space-y-5">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase">
                Escanea o ingresa con el código PIN
              </span>
              <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl">
                <MemoizedQRCode value={playerUrl} size={220} />
              </div>
              <div>
                <p className="text-xs text-purple-200 font-semibold">Código de Sala:</p>
                <p className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-amber-300 mt-1">
                  {session.roomCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyLink(playerUrl, 'Enlace para jugadores')}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Enlace de Jugadores</span>
              </button>
            </div>

            <div className="lg:col-span-7 bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-6 sm:p-8 space-y-5 self-stretch flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                  <Users className="w-6 h-6 text-emerald-400" />
                  <span>Jugadores Conectados ({sortedPlayers.length})</span>
                </h2>
                <span className="text-xs font-bold text-purple-200 animate-pulse">
                  Esperando inicio del anfitrión...
                </span>
              </div>

              {sortedPlayers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-purple-200/80 space-y-3 border-2 border-dashed border-white/15 rounded-2xl">
                  <Gamepad2 className="w-12 h-12 text-amber-300/80" />
                  <p className="text-sm font-bold">
                    Los jóvenes aparecerán aquí automáticamente al entrar desde su teléfono...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sortedPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/15 border border-white/20 animate-in zoom-in-95 duration-200"
                    >
                      <span className="text-2xl">{p.avatarEmoji}</span>
                      <span className="font-extrabold text-sm truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLAYING STATE: LIVE REAL-TIME RANKING BY SCORE */}
        {session.status === 'playing' && (
          <div className="flex-1 flex flex-col gap-5">
            {session.playMode === 'host_paced' && currentQ && (
              <div className="bg-white/10 border border-white/20 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-black uppercase text-amber-300">
                    Pregunta Activa {session.currentQuestionIndex + 1} de {totalQ}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black mt-1">{currentQ.prompt}</h2>
                </div>
                <div className="text-xs font-bold text-purple-200 shrink-0">
                  {sortedPlayers.filter((p) => p.answers?.[currentQ.id]).length} / {sortedPlayers.length} respondieron
                </div>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-5 sm:p-7 flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <h2 className="text-lg sm:text-2xl font-black flex items-center gap-2.5">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <span>Tabla de Posiciones en Vivo</span>
                </h2>
                <span className="text-xs font-bold text-purple-200">
                  Se actualiza al instante según cada respuesta
                </span>
              </div>

              {sortedPlayers.length === 0 ? (
                <div className="py-12 text-center text-purple-200 font-bold">
                  Aún no hay jugadores en la partida...
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sortedPlayers.map((p, idx) => {
                    const place = idx + 1;
                    const progressPct = totalQ > 0 ? Math.round(((p.answeredCount || 0) / totalQ) * 100) : 0;
                    const rowStyle =
                      place === 1
                        ? 'bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/10 border-2 border-amber-400 shadow-lg'
                        : place === 2
                        ? 'bg-gradient-to-r from-slate-300/25 to-slate-400/10 border-2 border-slate-300/70'
                        : place === 3
                        ? 'bg-gradient-to-r from-orange-500/25 to-amber-700/10 border-2 border-orange-400/70'
                        : 'bg-white/10 border border-white/15';

                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl p-3.5 sm:p-4 transition-all duration-300 flex items-center justify-between gap-4 ${rowStyle}`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-2xl bg-black/30 flex items-center justify-center font-mono font-black text-lg shrink-0">
                            {place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : `#${place}`}
                          </div>
                          <span className="text-2xl sm:text-3xl shrink-0">{p.avatarEmoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-base sm:text-lg truncate">
                                {p.name}
                              </span>
                              {(p.streak || 0) >= 2 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-orange-500 text-white">
                                  <Flame className="w-3 h-3" />
                                  x{p.streak}
                                </span>
                              )}
                              {p.finished && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white uppercase">
                                  Terminó
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-purple-200">
                              <div className="flex-1 max-w-xs h-2 rounded-full bg-black/30 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-500"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold">
                                {p.answeredCount || 0}/{totalQ} · ✓ {p.correctCount || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block text-2xl sm:text-3xl font-black font-mono text-amber-300 leading-none">
                            {(p.score || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase text-purple-200">
                            puntos
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FINISHED PODIUM ON SCREEN */}
        {session.status === 'finished' && (
          <div className="flex-1 flex flex-col gap-6 items-center justify-center py-4">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase">
                <Crown className="w-4 h-4" />
                Resultados Finales
              </span>
              <h2 className="text-3xl sm:text-5xl font-black">🏆 Podio de Ganadores</h2>
            </div>

            {sortedPlayers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl items-end">
                {/* 2nd Place */}
                {sortedPlayers[1] && (
                  <div className="order-2 sm:order-1 bg-gradient-to-b from-slate-400/30 to-slate-700/30 border-2 border-slate-300 rounded-3xl p-5 text-center space-y-2 sm:min-h-[200px] flex flex-col justify-center">
                    <div className="text-4xl">🥈</div>
                    <div className="text-xs font-black uppercase text-slate-200">2.º Lugar</div>
                    <div className="text-3xl">{sortedPlayers[1].avatarEmoji}</div>
                    <div className="text-lg font-black truncate">{sortedPlayers[1].name}</div>
                    <div className="text-2xl font-black font-mono text-amber-300">
                      {sortedPlayers[1].score.toLocaleString()} pts
                    </div>
                    <div className="text-xs text-purple-200">
                      {sortedPlayers[1].correctCount}/{totalQ} correctas
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {sortedPlayers[0] && (
                  <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-400/40 to-amber-700/30 border-2 border-amber-300 rounded-3xl p-6 text-center space-y-2 sm:min-h-[245px] flex flex-col justify-center shadow-2xl">
                    <div className="text-5xl">🥇</div>
                    <div className="text-xs font-black uppercase text-amber-200">1.º Lugar · Campeón</div>
                    <div className="text-4xl">{sortedPlayers[0].avatarEmoji}</div>
                    <div className="text-2xl font-black truncate">{sortedPlayers[0].name}</div>
                    <div className="text-3xl font-black font-mono text-amber-300">
                      {sortedPlayers[0].score.toLocaleString()} pts
                    </div>
                    <div className="text-xs text-amber-100 font-bold">
                      {sortedPlayers[0].correctCount}/{totalQ} correctas · Racha máx x{sortedPlayers[0].bestStreak || 0}
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {sortedPlayers[2] && (
                  <div className="order-3 bg-gradient-to-b from-orange-500/30 to-amber-900/30 border-2 border-orange-400 rounded-3xl p-5 text-center space-y-2 sm:min-h-[180px] flex flex-col justify-center">
                    <div className="text-4xl">🥉</div>
                    <div className="text-xs font-black uppercase text-orange-200">3.º Lugar</div>
                    <div className="text-3xl">{sortedPlayers[2].avatarEmoji}</div>
                    <div className="text-lg font-black truncate">{sortedPlayers[2].name}</div>
                    <div className="text-2xl font-black font-mono text-amber-300">
                      {sortedPlayers[2].score.toLocaleString()} pts
                    </div>
                    <div className="text-xs text-purple-200">
                      {sortedPlayers[2].correctCount}/{totalQ} correctas
                    </div>
                  </div>
                )}
              </div>
            )}

            {sortedPlayers.length > 3 && (
              <div className="w-full max-w-3xl bg-white/10 border border-white/15 rounded-3xl p-4 space-y-2">
                {sortedPlayers.slice(3).map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-black text-purple-200 w-8">#{i + 4}</span>
                      <span className="text-xl">{p.avatarEmoji}</span>
                      <span className="font-bold truncate">{p.name}</span>
                    </div>
                    <span className="font-mono font-black text-amber-300">
                      {p.score.toLocaleString()} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // 3. RENDER: HOST CONTROL PANEL
  // ============================================================
  if (viewMode === 'host') {
    const currentQ = session.questions[session.currentQuestionIndex];
    const totalQ = session.questions.length;

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {localToast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{localToast}</span>
          </div>
        )}

        {/* Top Host Header */}
        <div className="bg-gradient-to-r from-[#3a1252] via-[#4a1665] to-indigo-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-purple-400/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                {onExit && (
                  <button
                    type="button"
                    onClick={onExit}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-amber-400 text-slate-950">
                  Sala en Vivo · PIN {session.roomCode}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/15">
                  {sortedPlayers.length} conectados
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black">{session.gameTitle}</h1>
              <p className="text-xs text-purple-200">
                Comparte el enlace o QR para que los jóvenes respondan en su celular y abre la{' '}
                <strong>Otra Pantalla</strong> para proyectar los lugares en vivo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={screenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-md transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Otra Pantalla (Lugares)</span>
              </a>

              <button
                type="button"
                onClick={() => setViewMode('screen')}
                className="min-h-[42px] px-4 py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Ver Pantalla Aquí</span>
              </button>

              <button
                type="button"
                onClick={() => copyLink(screenUrl, 'Enlace de Otra Pantalla')}
                className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Copiar Pantalla</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: QR, Links & Game Controls */}
          <div className="lg:col-span-5 space-y-5">
            {/* QR & Join Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-purple-200 dark:border-purple-900/50 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-purple-600" />
                  <span>Acceso para Jugadores</span>
                </h3>
                <span className="font-mono font-black text-lg text-purple-700 dark:text-purple-300">
                  {session.roomCode}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs shrink-0">
                  <MemoizedQRCode value={playerUrl} size={132} />
                </div>
                <div className="space-y-2.5 flex-1 w-full">
                  <button
                    type="button"
                    onClick={() => copyLink(playerUrl, 'Enlace para Jugadores')}
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Enlace Jugadores</span>
                  </button>
                  <a
                    href={playerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs inline-flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Probar Vista Jugador</span>
                  </a>
                </div>
              </div>

              {/* Play Mode Selector */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">
                  Modalidad de Juego:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleHostTogglePlayMode('self_paced')}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      session.playMode === 'self_paced'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block font-black">⚡ Ritmo Quizizz</span>
                    <span className="text-[10px] opacity-80">Cada joven avanza al responder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHostTogglePlayMode('host_paced')}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      session.playMode === 'host_paced'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block font-black">🎙️ Guiado</span>
                    <span className="text-[10px] opacity-80">Anfitrión pasa cada pregunta</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Host Live Playback Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Controles de Partida</span>
              </h3>

              {session.status === 'lobby' && (
                <button
                  type="button"
                  disabled={isHostUpdating}
                  onClick={handleHostStartGame}
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm inline-flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{isHostUpdating ? 'Iniciando partida...' : '¡Iniciar Juego Ahora!'}</span>
                </button>
              )}

              {session.status === 'playing' && (
                <div className="space-y-3">
                  {session.playMode === 'host_paced' && currentQ && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                      <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                        Pregunta {session.currentQuestionIndex + 1} de {totalQ}
                      </span>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {currentQ.prompt}
                      </p>
                      <button
                        type="button"
                        disabled={isHostUpdating}
                        onClick={handleHostNextQuestion}
                        className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <SkipForward className="w-4 h-4" />
                        <span>
                          {session.currentQuestionIndex + 1 >= totalQ
                            ? 'Finalizar y Ver Podio'
                            : 'Siguiente Pregunta'}
                        </span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isHostUpdating}
                    onClick={handleHostFinishGame}
                    className="w-full min-h-[42px] px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Finalizar Juego y Mostrar Podio</span>
                  </button>
                </div>
              )}

              {session.status === 'finished' && (
                <button
                  type="button"
                  disabled={isHostUpdating}
                  onClick={handleHostRestartGame}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reiniciar Nueva Partida</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Live Ranking Preview */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span>Posiciones en Tiempo Real ({sortedPlayers.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mismos lugares que se proyectan en la Otra Pantalla.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {session.status === 'lobby'
                  ? 'En Sala de Espera'
                  : session.status === 'playing'
                  ? 'En Curso'
                  : 'Finalizado'}
              </span>
            </div>

            {sortedPlayers.length === 0 ? (
              <div className="flex-1 py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Users className="w-8 h-8 mx-auto text-slate-400" />
                <p className="font-bold">Esperando que los jóvenes se unan con el enlace o código QR...</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedPlayers.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-mono font-black text-xs shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span className="text-2xl shrink-0">{p.avatarEmoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                          {p.answeredCount}/{totalQ} respondidas · ✓ {p.correctCount} aciertos
                          {(p.streak || 0) >= 2 ? ` · 🔥 Racha x${p.streak}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-black text-base text-purple-700 dark:text-purple-300 shrink-0">
                      {(p.score || 0).toLocaleString()} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 4. RENDER: PLAYER SCREEN (SMARTPHONE / WEB QUIZIZZ ARENA)
  // ============================================================
  if (!myPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#350d49] via-[#210930] to-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="text-center space-y-1">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-xs">
              SALA {session.roomCode}
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-2">{session.gameTitle}</h1>
            <p className="text-xs text-purple-200">
              Elige tu avatar y escribe tu nombre para jugar en vivo.
            </p>
          </div>

          <form onSubmit={handleJoinAsPlayer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-purple-200 mb-2">
                Elige tu Avatar:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_CHOICES.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => setPlayerAvatar(emo)}
                    className={`min-h-[46px] rounded-2xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                      playerAvatar === emo
                        ? 'bg-amber-400 text-slate-950 scale-105 ring-2 ring-white shadow-lg'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-200 mb-1.5">
                Tu Nombre o Equipo:
              </label>
              <input
                type="text"
                required
                maxLength={28}
                placeholder="Ej. Caleb Martínez"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-white text-slate-950 font-extrabold text-sm focus:outline-none focus:ring-4 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-base shadow-xl cursor-pointer disabled:opacity-60"
            >
              {isJoining ? 'Entrando...' : '¡Entrar al Juego!'}
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-purple-100 cursor-pointer"
              >
                Volver
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Player Joined -> Waiting Lobby
  if (session.status === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#350d49] via-[#210930] to-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="text-5xl animate-bounce">{myPlayer.avatarEmoji}</div>
          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black">
              ¡Ya estás dentro!
            </span>
            <h2 className="text-2xl font-black mt-2">{myPlayer.name}</h2>
            <p className="text-xs text-purple-200 mt-1">
              Mira la pantalla principal. El juego comenzará en unos segundos...
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 text-xs font-bold text-purple-100">
            Jugadores en sala: <span className="font-mono text-amber-300">{sortedPlayers.length}</span>
          </div>
        </div>
      </div>
    );
  }

  // Player Finished -> Personal Summary + Top 5
  if (session.status === 'finished' || myPlayer.finished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#350d49] via-[#210930] to-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="text-5xl">{myPlayer.avatarEmoji}</div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase">
              {session.status === 'finished' ? 'Juego Finalizado' : '¡Completaste todas las preguntas!'}
            </span>
            <h2 className="text-2xl font-black">{myPlayer.name}</h2>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-white/15">
              <span className="block text-2xl font-black font-mono text-amber-300">
                #{myRank || '-'}
              </span>
              <span className="text-[10px] uppercase font-bold text-purple-200">Tu Lugar</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/15">
              <span className="block text-2xl font-black font-mono text-emerald-300">
                {myPlayer.score.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase font-bold text-purple-200">Puntos</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/15">
              <span className="block text-2xl font-black font-mono text-sky-300">
                {myPlayer.correctCount}/{session.questions.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-purple-200">Aciertos</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase text-purple-200 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Clasificación Actual en Vivo</span>
            </h3>
            <div className="space-y-1.5">
              {sortedPlayers.slice(0, 5).map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs ${
                    p.id === myPlayer.id
                      ? 'bg-amber-400/25 border border-amber-300'
                      : 'bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-black w-6">#{idx + 1}</span>
                    <span>{p.avatarEmoji}</span>
                    <span className="font-bold truncate">{p.name}</span>
                  </div>
                  <span className="font-mono font-black text-amber-300">
                    {p.score.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="w-full py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-xs font-extrabold cursor-pointer"
            >
              Volver al Menú de Juegos
            </button>
          )}
        </div>
      </div>
    );
  }

  // Player Active Question View
  const totalQuestions = session.questions.length;
  const alreadyAnsweredHostPaced =
    activePlayerQuestion && Boolean(myPlayer.answers?.[activePlayerQuestion.id]);
  const showingFeedback =
    lastFeedback ||
    (alreadyAnsweredHostPaced && activePlayerQuestion
      ? {
          questionId: activePlayerQuestion.id,
          selectedIndex: myPlayer.answers[activePlayerQuestion.id].selectedIndex,
          isCorrect: myPlayer.answers[activePlayerQuestion.id].isCorrect,
          pointsAwarded: myPlayer.answers[activePlayerQuestion.id].pointsAwarded,
          correctAnswerText:
            activePlayerQuestion.options[activePlayerQuestion.correctIndex ?? 0] || '',
          explanation: activePlayerQuestion.explanation,
        }
      : null);

  const timeLimit = Math.max(5, Number(activePlayerQuestion?.timeLimitSeconds) || 20);
  const timerPct = Math.round((secondsLeft / timeLimit) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d0b3f] via-[#1c072b] to-slate-950 text-white p-3 sm:p-6 flex flex-col gap-4">
      {/* Player HUD */}
      <div className="max-w-3xl w-full mx-auto bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl">{myPlayer.avatarEmoji}</span>
          <div className="min-w-0">
            <span className="block text-xs font-black truncate">{myPlayer.name}</span>
            <span className="text-[11px] font-bold text-purple-200">
              Pregunta {Math.min(activePlayerQuestionIndex + 1, totalQuestions)}/{totalQuestions}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {(myPlayer.streak || 0) >= 2 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500 text-white text-xs font-black">
              <Flame className="w-3.5 h-3.5" />
              x{myPlayer.streak}
            </span>
          )}
          <div className="px-3 py-1 rounded-xl bg-white/15 text-center">
            <span className="block text-xs font-mono font-black text-amber-300">
              Lugar #{myRank || '-'}
            </span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 text-center">
            <span className="block text-xs sm:text-sm font-mono font-black">
              {myPlayer.score.toLocaleString()} pts
            </span>
          </div>
        </div>
      </div>

      {/* Countdown Timer Bar */}
      {!showingFeedback && activePlayerQuestion && (
        <div className="max-w-3xl w-full mx-auto space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-purple-200 px-1">
            <span className="inline-flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-amber-300" />
              <span>Tiempo restante</span>
            </span>
            <span className="font-mono font-black text-amber-300">{secondsLeft}s</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                secondsLeft <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-400 to-amber-300'
              }`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Question Card & Quizizz Answer Tiles */}
      {(activePlayerQuestion || showingFeedback) && (
        <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-center gap-4">
          {!showingFeedback && activePlayerQuestion && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
              <h2 className="text-lg sm:text-2xl font-black leading-snug">
                {activePlayerQuestion.prompt}
              </h2>
            </div>
          )}

          {showingFeedback ? (
            <div
              className={`rounded-3xl p-6 sm:p-8 text-center space-y-3 border-2 shadow-2xl animate-in zoom-in-95 duration-200 ${
                showingFeedback.isCorrect
                  ? 'bg-emerald-600/30 border-emerald-400'
                  : 'bg-rose-600/30 border-rose-400'
              }`}
            >
              <div className="flex justify-center">
                {showingFeedback.isCorrect ? (
                  <CheckCircle2 className="w-14 h-14 text-emerald-300" />
                ) : (
                  <XCircle className="w-14 h-14 text-rose-300" />
                )}
              </div>
              <h3 className="text-2xl font-black">
                {showingFeedback.isCorrect
                  ? `¡Correcto! +${showingFeedback.pointsAwarded} pts`
                  : showingFeedback.selectedIndex === -1
                  ? '¡Se acabó el tiempo!'
                  : 'Respuesta incorrecta'}
              </h3>
              {!showingFeedback.isCorrect && showingFeedback.correctAnswerText && (
                <p className="text-sm font-bold text-amber-200">
                  Respuesta correcta: <span className="underline">{showingFeedback.correctAnswerText}</span>
                </p>
              )}
              {showingFeedback.explanation && (
                <p className="text-xs text-purple-100 bg-black/25 rounded-2xl p-3">
                  📖 {showingFeedback.explanation}
                </p>
              )}
              {session.playMode === 'self_paced' ? (
                <button
                  type="button"
                  onClick={() => setLastFeedback(null)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Siguiente Pregunta</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              ) : (
                <p className="text-xs text-purple-200 animate-pulse pt-2">
                  Esperando que el anfitrión avance a la siguiente pregunta...
                </p>
              )}
            </div>
          ) : activePlayerQuestion ? (
            <div
              className={`grid gap-3 sm:gap-4 ${
                activePlayerQuestion.options.length <= 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              {activePlayerQuestion.options.map((optText, optIdx) => {
                const style = QUIZIZZ_TILE_STYLES[optIdx % QUIZIZZ_TILE_STYLES.length];
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleAnswerSubmit(optIdx)}
                    className={`min-h-[74px] sm:min-h-[96px] p-4 rounded-2xl border-2 text-left text-white font-extrabold text-sm sm:text-base shadow-lg transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer ${style.bg}`}
                  >
                    <span className="w-9 h-9 rounded-xl bg-black/25 flex items-center justify-center text-base font-black shrink-0">
                      {style.shape}
                    </span>
                    <span className="flex-1 leading-snug">
                      {optText || `Opción ${style.label}`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
