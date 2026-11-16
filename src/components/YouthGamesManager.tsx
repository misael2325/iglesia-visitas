import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Edit3,
  FileText,
  FileUp,
  Gamepad2,
  HelpCircle,
  Loader2,
  Monitor,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  AppUser,
  YouthGame,
  YouthGameKind,
  YouthGameSession,
  YouthQuizQuestion,
} from '../types';
import {
  extractTextFromDocumentFile,
  parseQuestionsFromText,
} from '../utils/documentQuestionParser';
import { saveGameSessionOnline } from '../services/supabaseClient';
import { LiveRoomViewMode, YouthGameLiveRoom } from './YouthGameLiveRoom';

export const DEFAULT_STARTER_YOUTH_GAMES: YouthGame[] = [
  {
    id: 'yg-starter-cuestionario',
    title: 'Cuestionario: Preguntas y Respuestas',
    description:
      'Juego principal tipo Quizizz. Sube tu PDF o Word con preguntas o créalas manualmente y juega en tiempo real.',
    kind: 'quiz_preguntas',
    iconEmoji: '❓',
    colorTheme: 'purple',
    isDefaultStarter: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    questions: [
      {
        id: 'yq-st-1',
        prompt: '¿Quién venció al gigante Goliat con una honda y una piedra?',
        options: ['Saúl', 'David', 'Jonatán', 'Sansón'],
        correctIndex: 1,
        timeLimitSeconds: 20,
        points: 1000,
        explanation: '1 Samuel 17:49-50',
      },
      {
        id: 'yq-st-2',
        prompt: '¿Cuántos días y cuántas noches estuvo Jonás en el vientre del gran pez?',
        options: ['1 día y 1 noche', '3 días y 3 noches', '7 días y 7 noches', '40 días'],
        correctIndex: 1,
        timeLimitSeconds: 20,
        points: 1000,
        explanation: 'Jonás 1:17',
      },
      {
        id: 'yq-st-3',
        prompt: '¿Cuál es el primer libro del Nuevo Testamento?',
        options: ['Marcos', 'Lucas', 'Mateo', 'Hechos'],
        correctIndex: 2,
        timeLimitSeconds: 15,
        points: 1000,
      },
      {
        id: 'yq-st-4',
        prompt: '¿Qué reina arriesgó su vida para salvar al pueblo judío?',
        options: ['Rut', 'Ester', 'Débora', 'María'],
        correctIndex: 1,
        timeLimitSeconds: 20,
        points: 1000,
        explanation: 'Ester 4:16',
      },
    ],
  },
];

interface YouthGamesManagerProps {
  games: YouthGame[];
  onSaveGame: (game: YouthGame) => Promise<void> | void;
  onDeleteGame: (gameId: string) => Promise<void> | void;
  onBackToPortal?: () => void;
  currentUser?: AppUser | null;
}

const GAME_KIND_META: Record<
  YouthGameKind,
  { label: string; emoji: string; badgeClass: string; defaultTitle: string; desc: string }
> = {
  quiz_preguntas: {
    label: 'Cuestionario Preguntas y Respuestas',
    emoji: '❓',
    badgeClass: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-800',
    defaultTitle: 'Cuestionario Bíblico',
    desc: '4 opciones estilo Quizizz. Permite subir PDF/Word o agregar preguntas manuales.',
  },
  verdadero_falso: {
    label: 'Verdadero o Falso',
    emoji: '⚡',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
    defaultTitle: 'Verdadero o Falso Rápido',
    desc: 'Rondas veloces de Verdadero / Falso con bonificación por rapidez.',
  },
  adivinanza_biblica: {
    label: 'Adivinanza / Personaje / Versículo',
    emoji: '📖',
    badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800',
    defaultTitle: '¿Quién lo Dijo? / Adivinanza Bíblica',
    desc: 'Pistas de personajes o citas bíblicas para adivinar en tiempo real.',
  },
  personalizado: {
    label: 'Juego Personalizado',
    emoji: '🎮',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800',
    defaultTitle: 'Nuevo Juego Sociedad de Jóvenes',
    desc: 'Formato libre con tus propias preguntas y tiempos personalizados.',
  },
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const YouthGamesManager: React.FC<YouthGamesManagerProps> = ({
  games,
  onSaveGame,
  onDeleteGame,
  onBackToPortal,
  currentUser,
}) => {
  const [toastMsg, setToastMsg] = useState('');

  // Live Multiplayer Room State
  const [activeLiveRoom, setActiveLiveRoom] = useState<{
    mode: LiveRoomViewMode;
    session?: YouthGameSession | null;
    roomCode?: string;
  } | null>(null);
  const [isLaunchingRoom, setIsLaunchingRoom] = useState<string | null>(null);
  const [isJoinByPinModalOpen, setIsJoinByPinModalOpen] = useState(false);
  const [joinPinInput, setJoinPinInput] = useState('');
  const [joinTargetMode, setJoinTargetMode] = useState<'player' | 'screen'>('player');

  // Create "+" New Game Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGameKind, setNewGameKind] = useState<YouthGameKind>('quiz_preguntas');
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameDesc, setNewGameDesc] = useState('');
  const [newGameEmoji, setNewGameEmoji] = useState('🎮');

  // Editor Modal (PDF / Word Importer + Manual Questions + Select Correct Answer)
  const [editingGame, setEditingGame] = useState<YouthGame | null>(null);
  const [isImportingDoc, setIsImportingDoc] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [isSavingGame, setIsSavingGame] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<YouthGame | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  // Ensure "Cuestionario: Preguntas y Respuestas" is always shown first
  const orderedGames = [...games].sort((a, b) => {
    if (a.id === 'yg-starter-cuestionario' || a.isDefaultStarter) return -1;
    if (b.id === 'yg-starter-cuestionario' || b.isDefaultStarter) return 1;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  const handleLaunchGameLive = async (game: YouthGame) => {
    if (!game.questions || game.questions.length === 0) {
      showToast('Agrega o importa al menos 1 pregunta antes de iniciar.');
      setEditingGame(JSON.parse(JSON.stringify(game)));
      return;
    }

    const unanswered = game.questions.filter(
      (q) => q.correctIndex === null || q.correctIndex === undefined
    );
    if (unanswered.length > 0) {
      showToast(
        `Marca primero la respuesta correcta en ${unanswered.length} pregunta(s) antes de jugar.`
      );
      setEditingGame(JSON.parse(JSON.stringify(game)));
      return;
    }

    setIsLaunchingRoom(game.id);
    try {
      const randomPin = String(Math.floor(100000 + Math.random() * 899999));
      const nowIso = new Date().toISOString();
      const newSession: YouthGameSession = {
        id: `gs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomCode: randomPin,
        gameId: game.id,
        gameTitle: game.title,
        gameKind: game.kind,
        status: 'lobby',
        playMode: 'self_paced',
        currentQuestionIndex: 0,
        questions: game.questions,
        hostName: currentUser?.name || 'Sociedad de Jóvenes',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const res = await saveGameSessionOnline(newSession);
      if (!res.success) {
        showToast(`Aviso de nube: ${res.message}`);
      }
      setActiveLiveRoom({
        mode: 'host',
        session: newSession,
        roomCode: randomPin,
      });
    } finally {
      setIsLaunchingRoom(null);
    }
  };

  const handleCreateNewGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const meta = GAME_KIND_META[newGameKind];
    const nowIso = new Date().toISOString();
    const initialOptions =
      newGameKind === 'verdadero_falso' ? ['Verdadero', 'Falso'] : ['', '', '', ''];

    const created: YouthGame = {
      id: `yg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newGameTitle.trim() || meta.defaultTitle,
      description: newGameDesc.trim() || meta.desc,
      kind: newGameKind,
      iconEmoji: newGameEmoji || meta.emoji,
      colorTheme: 'purple',
      questions: [
        {
          id: `yq-${Date.now()}-0`,
          prompt: '',
          options: initialOptions,
          correctIndex: null,
          timeLimitSeconds: 20,
          points: 1000,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: currentUser?.name,
    };

    await onSaveGame(created);
    setIsCreateModalOpen(false);
    setNewGameTitle('');
    setNewGameDesc('');
    setEditingGame(JSON.parse(JSON.stringify(created)));
    showToast('¡Juego creado! Ahora sube tu PDF/Word o agrega las preguntas manualmente.');
  };

  // --- EDITOR ACTIONS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingGame) return;

    setIsImportingDoc(true);
    try {
      const rawText = await extractTextFromDocumentFile(file);
      const parsed = parseQuestionsFromText(rawText, editingGame.kind);

      if (parsed.length === 0) {
        showToast(
          'No se detectaron preguntas automáticamente en el archivo. Revisa el formato o pégalo manualmente.'
        );
        return;
      }

      setEditingGame((prev) => {
        if (!prev) return prev;
        const cleanExisting = prev.questions.filter((q) => q.prompt.trim().length > 0);
        const nextQuestions =
          importMode === 'replace' ? parsed : [...cleanExisting, ...parsed];
        return { ...prev, questions: nextQuestions };
      });

      const missingCorrect = parsed.filter((q) => q.correctIndex === null).length;
      showToast(
        missingCorrect > 0
          ? `📄 ¡${parsed.length} preguntas generadas! Ahora selecciona cuál es la respuesta correcta en cada una.`
          : `📄 ¡${parsed.length} preguntas importadas con sus respuestas correctas!`
      );
    } catch (err: any) {
      showToast(err?.message || 'Error leyendo el documento PDF o Word.');
    } finally {
      setIsImportingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleParsePastedText = () => {
    if (!editingGame || !pasteRawText.trim()) return;
    const parsed = parseQuestionsFromText(pasteRawText, editingGame.kind);
    if (parsed.length === 0) {
      showToast('No se pudieron identificar preguntas. Numéralas como 1., 2. y opciones A), B), C), D).');
      return;
    }
    setEditingGame((prev) => {
      if (!prev) return prev;
      const cleanExisting = prev.questions.filter((q) => q.prompt.trim().length > 0);
      return {
        ...prev,
        questions: importMode === 'replace' ? parsed : [...cleanExisting, ...parsed],
      };
    });
    setPasteRawText('');
    setShowPasteBox(false);
    showToast(`¡${parsed.length} preguntas generadas! Marca las respuestas correctas.`);
  };

  const handleAddManualQuestion = () => {
    if (!editingGame) return;
    const defaultOpts =
      editingGame.kind === 'verdadero_falso' ? ['Verdadero', 'Falso'] : ['', '', '', ''];
    const newQ: YouthQuizQuestion = {
      id: `yq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      prompt: '',
      options: defaultOpts,
      correctIndex: editingGame.kind === 'verdadero_falso' ? 0 : null,
      timeLimitSeconds: 20,
      points: 1000,
    };
    setEditingGame((prev) =>
      prev ? { ...prev, questions: [...prev.questions, newQ] } : prev
    );
  };

  const updateQuestionField = (
    qId: string,
    patch: Partial<YouthQuizQuestion>
  ) => {
    setEditingGame((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
      };
    });
  };

  const updateQuestionOption = (qId: string, optIdx: number, val: string) => {
    setEditingGame((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) => {
          if (q.id !== qId) return q;
          const nextOpts = [...q.options];
          nextOpts[optIdx] = val;
          return { ...q, options: nextOpts };
        }),
      };
    });
  };

  const removeQuestionFromEditor = (qId: string) => {
    setEditingGame((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.filter((q) => q.id !== qId),
      };
    });
  };

  const handleSaveEditedGame = async () => {
    if (!editingGame) return;
    if (!editingGame.title.trim()) {
      showToast('Escribe un título para el juego.');
      return;
    }

    const nonEmptyQuestions = editingGame.questions
      .filter((q) => q.prompt.trim().length > 0)
      .map((q) => {
        const cleanedOpts = q.options.map((o) => o.trim()).filter((o, i) => o.length > 0 || i < 2);
        return {
          ...q,
          prompt: q.prompt.trim(),
          options: cleanedOpts.length >= 2 ? cleanedOpts : ['Opción A', 'Opción B'],
          correctIndex:
            q.correctIndex !== null && q.correctIndex < cleanedOpts.length
              ? q.correctIndex
              : q.correctIndex,
        };
      });

    if (nonEmptyQuestions.length === 0) {
      showToast('Agrega al menos una pregunta con texto.');
      return;
    }

    setIsSavingGame(true);
    try {
      const updatedGame: YouthGame = {
        ...editingGame,
        title: editingGame.title.trim(),
        description: editingGame.description?.trim() || '',
        questions: nonEmptyQuestions,
        updatedAt: new Date().toISOString(),
      };
      await onSaveGame(updatedGame);
      setEditingGame(null);
      showToast(`✅ "${updatedGame.title}" guardado en tiempo real (${nonEmptyQuestions.length} preguntas).`);
    } finally {
      setIsSavingGame(false);
    }
  };

  // If currently inside a live multiplayer session
  if (activeLiveRoom) {
    return (
      <YouthGameLiveRoom
        initialMode={activeLiveRoom.mode}
        initialSession={activeLiveRoom.session}
        initialRoomCode={activeLiveRoom.roomCode}
        onExit={() => setActiveLiveRoom(null)}
        onNotify={showToast}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-purple-950 text-purple-50 text-xs font-bold rounded-2xl shadow-xl border border-purple-700 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HERO BANNER */}
      <div className="bg-gradient-to-br from-[#3d1155] via-[#2b0b3f] to-indigo-950 text-white rounded-3xl border-2 border-purple-400/30 p-5 sm:p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              {onBackToPortal && (
                <button
                  type="button"
                  onClick={onBackToPortal}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors cursor-pointer shrink-0"
                  title="Volver al Portal Principal"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Temática Interactiva · Tipo Quizizz</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <Gamepad2 className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 shrink-0" />
              <span>Sociedad de Jóvenes Games</span>
            </h1>

            <p className="text-xs sm:text-sm text-purple-200 max-w-2xl">
              Crea cuestionarios subiendo un <strong>PDF o Word</strong> o de forma <strong>manual</strong>, marca las respuestas correctas, inicia la partida y mira en <strong>otra pantalla</strong> cómo suben los lugares según el puntaje en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setJoinTargetMode('player');
                setJoinPinInput('');
                setIsJoinByPinModalOpen(true);
              }}
              className="min-h-[42px] px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-300" />
              <span>Entrar con PIN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setJoinTargetMode('screen');
                setJoinPinInput('');
                setIsJoinByPinModalOpen(true);
              }}
              className="min-h-[42px] px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Monitor className="w-4 h-4 text-amber-300" />
              <span>Otra Pantalla</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewGameKind('quiz_preguntas');
                setNewGameTitle('');
                setNewGameDesc('');
                setNewGameEmoji('🎮');
                setIsCreateModalOpen(true);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Crear Nuevo Juego</span>
            </button>
          </div>
        </div>
      </div>

      {/* GAMES CATALOG GRID + "+" ADD ANOTHER GAME CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {orderedGames.map((game) => {
          const meta = GAME_KIND_META[game.kind] || GAME_KIND_META.quiz_preguntas;
          const pendingCorrectCount = (game.questions || []).filter(
            (q) => q.correctIndex === null || q.correctIndex === undefined
          ).length;

          return (
            <div
              key={game.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 p-5 shadow-sm flex flex-col justify-between gap-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                      {game.iconEmoji || meta.emoji}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <h3 className="text-base font-black text-slate-950 dark:text-white leading-snug mt-1">
                        {game.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {game.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {game.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                    <span>{game.questions?.length || 0} preguntas</span>
                  </span>

                  {pendingCorrectCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold border border-amber-300 dark:border-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{pendingCorrectCount} por marcar respuesta</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  disabled={isLaunchingRoom === game.id}
                  onClick={() => handleLaunchGameLive(game)}
                  className="w-full min-h-[42px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white font-black text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {isLaunchingRoom === game.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>Iniciar Partida en Vivo (Quizizz)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingGame(JSON.parse(JSON.stringify(game)))}
                    className="flex-1 min-h-[38px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Editar / Subir PDF o Word</span>
                  </button>

                  {!game.isDefaultStarter && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(game)}
                      className="min-h-[38px] px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-xs cursor-pointer"
                      title="Eliminar juego"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* DEDICATED "+" CARD TO CREATE ANOTHER GAME */}
        <button
          type="button"
          onClick={() => {
            setNewGameKind('quiz_preguntas');
            setNewGameTitle('');
            setNewGameDesc('');
            setNewGameEmoji('🎮');
            setIsCreateModalOpen(true);
          }}
          className="min-h-[230px] rounded-3xl border-3 border-dashed border-purple-300 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-500 bg-purple-50/40 dark:bg-purple-950/15 hover:bg-purple-50 dark:hover:bg-purple-950/30 p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-600 group-hover:scale-110 transition-transform text-white flex items-center justify-center shadow-lg">
            <Plus className="w-9 h-9 stroke-[3]" />
          </div>
          <div>
            <h3 className="text-base font-black text-purple-950 dark:text-purple-100">
              + Crear Otro Juego
            </h3>
            <p className="text-xs text-purple-700/80 dark:text-purple-300/80 mt-1 max-w-xs">
              Agrega un nuevo cuestionario desde PDF/Word, Verdadero o Falso o juego bíblico personalizado.
            </p>
          </div>
        </button>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CREATE "+" NEW GAME */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-purple-400 dark:border-purple-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase text-purple-600 dark:text-purple-400">
                  Sociedad de Jóvenes Games
                </span>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">
                  + Crear Nuevo Juego
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewGame} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-900 dark:text-white mb-2">
                  Tipo de Juego:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(GAME_KIND_META) as YouthGameKind[]).map((kindKey) => {
                    const m = GAME_KIND_META[kindKey];
                    const selected = newGameKind === kindKey;
                    return (
                      <button
                        key={kindKey}
                        type="button"
                        onClick={() => {
                          setNewGameKind(kindKey);
                          setNewGameEmoji(m.emoji);
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50'
                            : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-black text-slate-950 dark:text-white">
                          <span className="text-lg">{m.emoji}</span>
                          <span>{m.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {m.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                  Nombre del Juego <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={GAME_KIND_META[newGameKind].defaultTitle}
                  value={newGameTitle}
                  onChange={(e) => setNewGameTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-900 dark:text-white">
                  Descripción corta (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Noche de Jóvenes · Libro de Daniel y Apocalipsis"
                  value={newGameDesc}
                  onChange={(e) => setNewGameDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black shadow-sm cursor-pointer"
                >
                  Crear y Configurar Preguntas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: JOIN BY PIN / OPEN OTRA PANTALLA */}
      {/* ============================================================ */}
      {isJoinByPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-purple-400 dark:border-purple-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-black uppercase text-purple-600 dark:text-purple-400">
                  {joinTargetMode === 'screen' ? 'Otra Pantalla (Proyector)' : 'Entrar a Jugar'}
                </span>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">
                  {joinTargetMode === 'screen'
                    ? 'Abrir Pantalla de Lugares'
                    : 'Unirse con Código PIN'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJoinByPinModalOpen(false)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = joinPinInput.trim().toUpperCase();
                if (!code) return;
                setIsJoinByPinModalOpen(false);
                setActiveLiveRoom({
                  mode: joinTargetMode,
                  roomCode: code,
                });
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                placeholder="Código PIN (ej. 482910)"
                value={joinPinInput}
                onChange={(e) => setJoinPinInput(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-black text-center text-lg tracking-widest text-slate-950 dark:text-white"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs cursor-pointer"
              >
                {joinTargetMode === 'screen' ? 'Conectar Otra Pantalla' : 'Entrar a la Sala'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDITOR DE CUESTIONARIO + IMPORTADOR PDF / WORD + MANUAL */}
      {/* ============================================================ */}
      {editingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white border-2 border-purple-400/50 dark:border-purple-800 rounded-3xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Editor Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{editingGame.iconEmoji || '❓'}</span>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400">
                    Editor de Cuestionario · PDF / Word / Manual
                  </span>
                  <input
                    type="text"
                    value={editingGame.title}
                    onChange={(e) =>
                      setEditingGame({ ...editingGame, title: e.target.value })
                    }
                    className="block w-full font-black text-base sm:text-lg bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGame(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingGame}
                  onClick={handleSaveEditedGame}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSavingGame ? 'Guardando...' : `Guardar Juego (${editingGame.questions.length})`}
                </button>
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* PDF / WORD UPLOAD PANEL */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-purple-300 dark:border-purple-800 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-2">
                      <FileUp className="w-4 h-4 text-purple-600" />
                      <span>Generar Preguntas desde PDF o Word (.docx)</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Sube un archivo con tus preguntas (ej: <code>1. ¿...? A) ... B) ... C) ... D) ...</code>). El sistema las extrae automáticamente para que marques cuál es la respuesta correcta.
                    </p>
                  </div>

                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-[11px] font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => setImportMode('append')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        importMode === 'append'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Agregar a la lista
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        importMode === 'replace'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Reemplazar actuales
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="min-h-[42px] px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer">
                    {isImportingDoc ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span>
                      {isImportingDoc
                        ? 'Leyendo documento...'
                        : 'Subir PDF o Word (.pdf / .docx / .txt)'}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={handleFileUpload}
                      disabled={isImportingDoc}
                      className="sr-only"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPasteBox((v) => !v)}
                    className="min-h-[42px] px-4 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ClipboardPaste className="w-4 h-4 text-indigo-500" />
                    <span>Pegar Texto de Preguntas</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddManualQuestion}
                    className="min-h-[42px] px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Pregunta Manual</span>
                  </button>
                </div>

                {showPasteBox && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <textarea
                      rows={5}
                      value={pasteRawText}
                      onChange={(e) => setPasteRawText(e.target.value)}
                      placeholder={`Pega aquí tu cuestionario, ejemplo:\n1. ¿Quién construyó el arca?\nA) Moisés\nB) Noé\nC) Abraham\nD) Jacob`}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(false)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        onClick={handleParsePastedText}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
                      >
                        Generar Preguntas del Texto
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* QUESTIONS LIST */}
              <div className="space-y-4">
                {editingGame.questions.map((q, qIdx) => {
                  const needsAnswer = q.correctIndex === null || q.correctIndex === undefined;

                  return (
                    <div
                      key={q.id}
                      className={`bg-white dark:bg-slate-900 rounded-3xl border-2 p-4 sm:p-5 space-y-3.5 shadow-xs ${
                        needsAnswer
                          ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-black text-xs">
                            Pregunta #{qIdx + 1}
                          </span>
                          {needsAnswer ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-black">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Haz clic en ✓ para marcar la respuesta correcta</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-black">
                              <Check className="w-3.5 h-3.5" />
                              <span>Correcta: Opción {OPTION_LETTERS[q.correctIndex!] || (q.correctIndex! + 1)}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={q.timeLimitSeconds}
                            onChange={(e) =>
                              updateQuestionField(q.id, {
                                timeLimitSeconds: Number(e.target.value) || 20,
                              })
                            }
                            className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                          >
                            <option value={10}>10 seg</option>
                            <option value={15}>15 seg</option>
                            <option value={20}>20 seg</option>
                            <option value={30}>30 seg</option>
                            <option value={45}>45 seg</option>
                            <option value={60}>60 seg</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => removeQuestionFromEditor(q.id)}
                            className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                            title="Eliminar pregunta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Escribe aquí la pregunta..."
                        value={q.prompt}
                        onChange={(e) => updateQuestionField(q.id, { prompt: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-950 dark:text-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((optVal, optIdx) => {
                          const isCorrect = q.correctIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded-2xl border-2 transition-all ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuestionField(q.id, { correctIndex: optIdx })
                                }
                                className={`min-w-[36px] min-h-[36px] rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-emerald-500'
                                }`}
                                title="Marcar esta opción como respuesta correcta"
                              >
                                {isCorrect ? <Check className="w-4 h-4" /> : OPTION_LETTERS[optIdx] || optIdx + 1}
                              </button>

                              <input
                                type="text"
                                placeholder={`Opción ${OPTION_LETTERS[optIdx] || optIdx + 1}`}
                                value={optVal}
                                onChange={(e) => updateQuestionOption(q.id, optIdx, e.target.value)}
                                className="flex-1 bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Cita bíblica o nota aclaratoria (opcional, ej: Juan 3:16)"
                          value={q.explanation || ''}
                          onChange={(e) =>
                            updateQuestionField(q.id, { explanation: e.target.value })
                          }
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                        />
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddManualQuestion}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Agregar Otra Pregunta Manual</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE GAME CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              ¿Eliminar "{deleteTarget.title}"?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Se eliminará este juego y todas sus preguntas en tiempo real.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteGame(deleteTarget.id);
                  setDeleteTarget(null);
                  showToast('Juego eliminado.');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
