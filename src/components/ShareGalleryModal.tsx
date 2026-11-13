import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  Download, 
  Sparkles,
  Camera
} from 'lucide-react';
import { PhotoAlbum } from '../types';

interface ShareGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: PhotoAlbum[];
  selectedAlbum?: string;
  totalPhotosCount: number;
}

export const ShareGalleryModal: React.FC<ShareGalleryModalProps> = ({
  isOpen,
  onClose,
  albums,
  selectedAlbum,
  totalPhotosCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterAlbum, setFilterAlbum] = useState<string>(selectedAlbum || 'all');

  if (!isOpen) return null;

  // Build the public shareable link
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  let shareUrl = `${origin}${pathname}?galeria=publica`;
  if (filterAlbum && filterAlbum !== 'all') {
    shareUrl += `&album=${encodeURIComponent(filterAlbum)}`;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const albumNameText = filterAlbum === 'all' 
    ? 'todas las actividades y cultos' 
    : `las fotos de "${filterAlbum}"`;

  const whatsappMessage = `📸 *¡Hola familia de la iglesia!* Ya están disponibles ${albumNameText} de nuestra iglesia. Puedes ver la galería completa y descargar tus fotos gratis en alta calidad aquí:\n\n👉 ${shareUrl}`;

  const whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl max-w-lg w-full overflow-hidden text-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-violet-700 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
              <Share2 className="w-5 h-5 text-violet-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                Compartir Enlace de Fotos
              </h2>
              <p className="text-xs text-violet-100 font-medium">
                Enlace público de acceso libre para miembros y visitas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Information Notice */}
          <div className="p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white block font-extrabold mb-0.5">
                Acceso público sin contraseña
              </strong>
              Las personas que abran este enlace podrán ver la galería oficial y <strong>descargar sus fotos directamente a su teléfono o computador</strong> sin necesidad de registrarse ni iniciar sesión.
            </div>
          </div>

          {/* Filter by Album selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
              ¿Qué fotos deseas compartir?
            </label>
            <select
              value={filterAlbum}
              onChange={(e) => setFilterAlbum(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">Todas las Fotos de la Galería ({totalPhotosCount} fotos)</option>
              {albums.map((alb) => (
                <option key={alb.id} value={alb.name}>
                  Álbum: {alb.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shareable Link Box */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
              Enlace Web Generado:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-100 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-300" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Share to WhatsApp Button */}
          <div className="pt-2">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/30 transition-all text-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Compartir en Grupo de WhatsApp</span>
            </a>
          </div>

          {/* Test Link Button */}
          <div className="text-center pt-1">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              <span>Abrir vista previa pública en nueva pestaña</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
