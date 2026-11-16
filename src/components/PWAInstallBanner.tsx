import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  X,
  CheckCircle2,
  Apple,
} from 'lucide-react';

interface PWAInstallBannerProps {
  visible: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  onInstall: () => Promise<boolean>;
  onDismiss: () => void;
  showGuideModal: boolean;
  onOpenGuideModal: () => void;
  onCloseGuideModal: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  visible,
  isInstalled,
  isInstallable,
  isIOS,
  isAndroid,
  onInstall,
  onDismiss,
  showGuideModal,
  onOpenGuideModal,
  onCloseGuideModal,
}) => {
  const [guideTab, setGuideTab] = useState<'android' | 'ios'>(() =>
    isIOS ? 'ios' : 'android'
  );
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handlePrimaryAction = async () => {
    if (isInstallable) {
      setInstalling(true);
      const accepted = await onInstall();
      setInstalling(false);
      if (!accepted && !isAndroid) {
        setGuideTab(isIOS ? 'ios' : 'android');
        onOpenGuideModal();
      }
      return;
    }
    setGuideTab(isIOS ? 'ios' : 'android');
    onOpenGuideModal();
  };

  return (
    <>
      {visible && (
        <div
          role="region"
          aria-label="Instalar aplicación"
          className="no-print bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white border-b border-blue-500/40 shadow-md"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-black border border-white/25 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src="/assets/aistudio/a_clean_modern_app_icon_style_graphic_with_a_roun_45278ae7.png"
                  alt="Eclesia"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain scale-[1.06]"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold tracking-tight text-white leading-snug">
                  Instalar esta aplicación en tu dispositivo
                </p>
                <p className="text-[11px] sm:text-xs text-blue-100 font-medium leading-snug">
                  {isIOS
                    ? 'Disponible para iPhone y iPad (iOS): agrégala a tu pantalla de inicio en 2 pasos.'
                    : isInstallable
                    ? 'Disponible para Android y PC: instala Eclesia para acceder directo como app.'
                    : 'Compatible con Android e iOS: instala Eclesia en tu pantalla de inicio.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={installing}
                className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-xs shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-70"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {installing
                    ? 'Instalando...'
                    : isInstallable
                    ? 'Instalar aplicación'
                    : isIOS
                    ? 'Instalar en iOS'
                    : 'Instalar aplicación'}
                </span>
              </button>

              {!isInstallable && (
                <button
                  type="button"
                  onClick={() => {
                    setGuideTab(isIOS ? 'ios' : 'android');
                    onOpenGuideModal();
                  }}
                  className="hidden md:inline-flex px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-colors whitespace-nowrap"
                >
                  Ver pasos Android / iOS
                </button>
              )}

              <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/15 transition-colors"
                aria-label="Cerrar alerta de instalación"
                title="Ocultar por ahora"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Instalar Eclesia</h3>
                  <p className="text-[11px] text-slate-300">
                    Disponible para Android e iPhone / iPad (iOS)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseGuideModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Cerrar guía"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Platform Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => setGuideTab('android')}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                    guideTab === 'android'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('ios')}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                    guideTab === 'ios'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>iPhone / iPad (iOS)</span>
                </button>
              </div>

              {guideTab === 'android' ? (
                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  {isInstallable && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await onInstall();
                        if (ok) onCloseGuideModal();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Instalar directamente ahora</span>
                    </button>
                  )}

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p>
                        Abre esta página en <strong>Google Chrome</strong> y toca el menú de tres puntos{' '}
                        <MoreVertical className="inline w-3.5 h-3.5 text-slate-900 dark:text-white" /> arriba a la derecha.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p>
                        Selecciona <strong>&ldquo;Instalar aplicación&rdquo;</strong> o{' '}
                        <strong>&ldquo;Añadir a pantalla de inicio&rdquo;</strong>.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <p>
                        Confirma tocando <strong>Instalar</strong> y el ícono de <strong>Eclesia</strong> aparecerá junto a tus apps.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p>
                        Abre esta aplicación desde el navegador <strong>Safari</strong> en tu iPhone o iPad.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p>
                        Toca el botón <strong>Compartir</strong>{' '}
                        <Share className="inline w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> en la barra inferior de Safari.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <p>
                        Desliza hacia abajo, toca{' '}
                        <PlusSquare className="inline w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />{' '}
                        <strong>&ldquo;Agregar a inicio&rdquo;</strong> y luego pulsa <strong>Agregar</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Funciona en pantalla completa sin barra
                </span>
                <button
                  type="button"
                  onClick={onCloseGuideModal}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
