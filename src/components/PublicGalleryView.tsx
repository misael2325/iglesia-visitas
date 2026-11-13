import React, { useState, useMemo, useEffect } from 'react';
import { 
  Camera, 
  Download, 
  Search, 
  Filter, 
  Share2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Calendar, 
  Church, 
  LogIn, 
  Moon, 
  Sun,
  Check,
  Tag,
  ArrowDownToLine,
  Image as ImageIcon
} from 'lucide-react';
import { ChurchPhoto, PhotoAlbum } from '../types';
import { downloadPhotoFile, DEFAULT_PHOTO_ALBUMS } from '../utils/photoStorage';

interface PublicGalleryViewProps {
  photos: ChurchPhoto[];
  albums?: PhotoAlbum[];
  initialAlbum?: string | null;
  onGoToLogin: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const PublicGalleryView: React.FC<PublicGalleryViewProps> = ({
  photos,
  albums = DEFAULT_PHOTO_ALBUMS,
  initialAlbum,
  onGoToLogin,
  darkMode,
  onToggleDarkMode,
}) => {
  const [selectedAlbum, setSelectedAlbum] = useState<string>(initialAlbum || 'all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lightboxPhoto, setLightboxPhoto] = useState<ChurchPhoto | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      const matchAlbum = selectedAlbum === 'all' || photo.album.toLowerCase() === selectedAlbum.toLowerCase();
      const matchSearch = !searchTerm.trim() || 
        photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.album.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (photo.tags && photo.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
      return matchAlbum && matchSearch;
    });
  }, [photos, selectedAlbum, searchTerm]);

  // Handle lightbox keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxPhoto) return;
      if (e.key === 'Escape') {
        setLightboxPhoto(null);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id);
        if (currentIndex < filteredPhotos.length - 1) {
          setLightboxPhoto(filteredPhotos[currentIndex + 1]);
        }
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id);
        if (currentIndex > 0) {
          setLightboxPhoto(filteredPhotos[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxPhoto, filteredPhotos]);

  const handleDownload = (photo: ChurchPhoto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanTitle = (photo.title || 'foto-iglesia')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_');
    const filename = `${cleanTitle}-${photo.date}.jpg`;
    downloadPhotoFile(photo.imageUrl, filename);
    setDownloadFeedback(`Descargando "${photo.title}"...`);
    setTimeout(() => setDownloadFeedback(null), 2500);
  };

  return (
    <div className={`min-h-dvh pb-safe ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col transition-colors duration-200`}>
      {/* Toast Notification */}
      {downloadFeedback && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xl animate-in slide-in-from-bottom duration-200">
          <ArrowDownToLine className="w-4 h-4 shrink-0" />
          <span>{downloadFeedback}</span>
        </div>
      )}

      {/* Public Header */}
      <header className="sticky top-0 z-40 pt-safe bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Wordmark */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-xs">
                <Camera className="w-5 h-5 text-violet-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                    Eclesia
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-wider text-violet-300 bg-violet-950 px-2 py-0.5 rounded-md border border-violet-800">
                    Galería Oficial
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Fotos y recuerdos de nuestras actividades
                </p>
              </div>
            </div>

            {/* Actions: Dark mode + Login */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="p-2 text-xs font-extrabold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-xl transition-colors cursor-pointer"
                title={darkMode ? "Activar modo día" : "Activar modo noche"}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-300" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg text-left relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-violet-200" />
              <span>Descargas Gratuitas en Alta Calidad</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Galería de Fotos de la Iglesia
            </h1>
            <p className="text-xs sm:text-base text-violet-100 font-medium leading-relaxed">
              Encuentra y descarga libremente las fotos tomadas en nuestros cultos, programas de jóvenes, campamentos de conquistadores, bautismos y celebraciones. Haz clic en cualquier foto para verla y descargarla en su resolución original.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-4 shadow-xs space-y-3">
          {/* Top row: Search input + Results count */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar fotos por título o tema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
              Mostrando <strong className="text-slate-900 dark:text-white font-extrabold">{filteredPhotos.length}</strong> de {photos.length} fotos
            </div>
          </div>

          {/* Album pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedAlbum('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedAlbum === 'all'
                  ? 'bg-violet-600 text-white shadow-xs ring-2 ring-violet-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
              }`}
            >
              Todas las Fotos ({photos.length})
            </button>

            {albums.map((album) => {
              const count = photos.filter((p) => p.album.toLowerCase() === album.name.toLowerCase()).length;
              return (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => setSelectedAlbum(album.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedAlbum === album.name
                      ? 'bg-violet-600 text-white shadow-xs ring-2 ring-violet-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span>{album.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-black ${
                    selectedAlbum === album.name ? 'bg-violet-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Photos Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
              No se encontraron fotos en este álbum
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Prueba cambiando los filtros de búsqueda o seleccionando otro álbum para ver más fotos.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedAlbum('all');
                setSearchTerm('');
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-extrabold hover:bg-violet-500 transition-colors"
            >
              Ver todas las fotos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setLightboxPhoto(photo)}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 hover:border-violet-600 dark:hover:border-violet-500 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <img
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Album Pill on Top Left */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-xs text-white border border-white/20">
                      {photo.album}
                    </span>
                  </div>

                  {/* Direct Download Action on Top Right */}
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(photo, e)}
                      className="p-2 rounded-xl bg-white/90 hover:bg-white text-slate-900 shadow-md hover:scale-110 active:scale-95 transition-all"
                      title="Descargar Foto directamente"
                    >
                      <Download className="w-4 h-4 text-violet-700" />
                    </button>
                  </div>
                </div>

                {/* Footer details */}
                <div className="p-3.5 space-y-1.5 text-left">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {photo.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {photo.date}
                    </span>
                    <span className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1 group-hover:underline">
                      <ArrowDownToLine className="w-3 h-3" />
                      Descargar
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
          <div 
            className="relative max-w-5xl w-full bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Lightbox Bar */}
            <div className="px-3.5 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white shrink-0 gap-2">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-violet-400 bg-violet-950 px-2 py-0.5 rounded-md border border-violet-800">
                  {lightboxPhoto.album}
                </span>
                <h3 className="text-xs sm:text-base font-extrabold text-white truncate mt-0.5">
                  {lightboxPhoto.title}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(lightboxPhoto)}
                  className="min-h-[40px] px-3 sm:px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden xs:inline">Descargar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
                  title="Cerrar (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Image Display */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[350px] max-h-[68vh] p-2">
              <img
                src={lightboxPhoto.imageUrl}
                alt={lightboxPhoto.title}
                className="max-h-full max-w-full object-contain"
              />

              {/* Prev Button */}
              {filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id);
                    if (idx > 0) setLightboxPhoto(filteredPhotos[idx - 1]);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-xl hover:scale-110 transition-all border border-slate-700"
                  title="Foto anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Next Button */}
              {filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id) < filteredPhotos.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id);
                    if (idx < filteredPhotos.length - 1) setLightboxPhoto(filteredPhotos[idx + 1]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-xl hover:scale-110 transition-all border border-slate-700"
                  title="Siguiente foto"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Bottom Bar: Description & Date */}
            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
              <p className="line-clamp-2 text-slate-300 font-medium">
                {lightboxPhoto.description || 'Foto oficial de las actividades de la iglesia.'}
              </p>
              <div className="flex items-center gap-3 shrink-0 text-slate-400 font-bold">
                <span>Fecha: {lightboxPhoto.date}</span>
                {lightboxPhoto.uploadedBy && (
                  <span>· Por: {lightboxPhoto.uploadedBy}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400">
        <p>© Eclesia · Galería Oficial de Fotos de Iglesia. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
