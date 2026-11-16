import React, { useState, useMemo, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Images, 
  Share2, 
  ArrowLeft, 
  FolderHeart, 
  Plus, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Calendar, 
  Sparkles, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  MessageSquare, 
  Copy,
  ArrowRight,
  Eye,
  CheckCircle2,
  FolderPlus,
  ArrowDownToLine,
  Image as ImageIcon
} from 'lucide-react';
import { ChurchPhoto, PhotoAlbum, AppUser, hasAnyUserRole } from '../types';
import { 
  downloadPhotoFile, 
  optimizePhotoFile, 
  generateThumbnail, 
  DEFAULT_PHOTO_ALBUMS 
} from '../utils/photoStorage';
import { ShareGalleryModal } from './ShareGalleryModal';

export type PhotoTab = 'todas' | 'albumes' | 'subir' | 'compartir';

interface PhotoGalleryManagerProps {
  photos: ChurchPhoto[];
  albums: PhotoAlbum[];
  onAddPhotos: (newPhotos: ChurchPhoto[]) => void;
  onDeletePhoto: (photoId: string) => void;
  onAddAlbum: (newAlbum: PhotoAlbum) => void;
  onBackToPortal: () => void;
  currentUser: AppUser;
}

export const PhotoGalleryManager: React.FC<PhotoGalleryManagerProps> = ({
  photos,
  albums,
  onAddPhotos,
  onDeletePhoto,
  onAddAlbum,
  onBackToPortal,
  currentUser,
}) => {
  const [currentTab, setCurrentTab] = useState<PhotoTab>('todas');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lightboxPhoto, setLightboxPhoto] = useState<ChurchPhoto | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadAlbum, setUploadAlbum] = useState<string>(albums[0]?.name || 'Culto de Adoración');
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [uploadTitlePrefix, setUploadTitlePrefix] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // New Album Modal state
  const [isNewAlbumModalOpen, setIsNewAlbumModalOpen] = useState<boolean>(false);
  const [newAlbumName, setNewAlbumName] = useState<string>('');
  const [newAlbumDesc, setNewAlbumDesc] = useState<string>('');

  const isAdmin = hasAnyUserRole(currentUser, ['administrador', 'admin', 'pastor', 'anciano']);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

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

  // Handle files selected for upload
  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setPendingFiles((prev) => [...prev, ...newFiles]);
    setCurrentTab('subir');
  };

  // Process and save pending files
  const handleProcessUpload = async () => {
    if (pendingFiles.length === 0) return;
    setIsOptimizing(true);

    try {
      const newPhotoRecords: ChurchPhoto[] = [];

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const { dataUrl, sizeBytes } = await optimizePhotoFile(file, 1920, 0.85);
        const thumbnailUrl = await generateThumbnail(dataUrl, 400);

        const title = uploadTitlePrefix.trim() 
          ? (pendingFiles.length > 1 ? `${uploadTitlePrefix.trim()} (${i + 1})` : uploadTitlePrefix.trim())
          : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        newPhotoRecords.push({
          id: `photo-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          album: uploadAlbum,
          date: uploadDate,
          imageUrl: dataUrl,
          thumbnailUrl,
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString(),
          description: uploadDescription.trim() || undefined,
          sizeBytes,
        });
      }

      onAddPhotos(newPhotoRecords);
      setPendingFiles([]);
      setUploadTitlePrefix('');
      setUploadDescription('');
      setIsOptimizing(false);
      setCurrentTab('todas');
      showToast(`¡${newPhotoRecords.length} foto(s) subida(s) exitosamente!`);
    } catch (err) {
      console.error(err);
      setIsOptimizing(false);
      showToast('Error al procesar las imágenes. Por favor intenta de nuevo.');
    }
  };

  // Download handler
  const handleDownload = (photo: ChurchPhoto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanTitle = (photo.title || 'foto-iglesia').toLowerCase().replace(/[^a-z0-9]/gi, '_');
    const filename = `${cleanTitle}-${photo.date}.jpg`;
    downloadPhotoFile(photo.imageUrl, filename);
    showToast(`Descargando "${photo.title}"...`);
  };

  // Create new album
  const handleCreateAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    const newAlbum: PhotoAlbum = {
      id: `album-${Date.now()}`,
      name: newAlbumName.trim(),
      description: newAlbumDesc.trim() || undefined,
      color: 'violet',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddAlbum(newAlbum);
    setUploadAlbum(newAlbum.name);
    setNewAlbumName('');
    setNewAlbumDesc('');
    setIsNewAlbumModalOpen(false);
    showToast(`Álbum "${newAlbum.name}" creado con éxito.`);
  };

  // URL for public sharing
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const publicShareUrl = `${origin}${pathname}?galeria=publica`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden file inputs for uploading */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFilesChosen}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFilesChosen}
        className="hidden"
      />

      {/* 1. SECCIÓN SUPERIOR: TÍTULO FOTOS + BOTÓN VOLVER + ACCIONES */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onBackToPortal}
              className="min-h-[40px] flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border-2 border-slate-300 dark:border-slate-700 rounded-xl transition-all shadow-xs shrink-0"
              title="Volver al Menú Principal con los 3 módulos generales"
            >
              <ArrowLeft className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span className="hidden xs:inline">Menú</span>
              <span className="hidden sm:inline">Principal</span>
            </button>

            <div className="h-7 w-[2px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-black tracking-wider text-violet-800 dark:text-violet-200 bg-violet-100 dark:bg-violet-950 px-2 py-0.5 rounded-md border border-violet-300 dark:border-violet-800">
                  Módulo General
                </span>
                <h1 className="text-base sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight truncate">
                  Fotos de la Iglesia
                </h1>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5 hidden sm:block">
                Sube fotos de cultos y programas, y comparte el enlace público para que los miembros descarguen sus fotos
              </p>
            </div>
          </div>

          {/* Acciones principales: Compartir Enlace y Subir Fotos */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="min-h-[42px] px-3 py-2 text-xs font-extrabold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/80 border border-violet-300 dark:border-violet-800 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 shrink-0 text-violet-600 dark:text-violet-400" />
              <span>Compartir</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="min-h-[42px] px-3.5 py-2 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-98"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>Subir Fotos</span>
            </button>
          </div>
        </div>

        {/* 2. CINTA HORIZONTAL DEBAJO DEL TÍTULO (4 PESTAÑAS DISTRIBUIDAS) */}
        <div className="mt-4">
          <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-inner">
            {/* Tab 1: Todas las fotos */}
            <button
              type="button"
              onClick={() => setCurrentTab('todas')}
              className={`flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-xl transition-all text-left ${
                currentTab === 'todas'
                  ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-500/40 translate-y-[-1px]'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${
                  currentTab === 'todas' 
                    ? 'bg-violet-700/60 text-white' 
                    : 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900'
                }`}>
                  <Images className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs sm:text-sm font-extrabold truncate ${
                    currentTab === 'todas' ? 'text-white' : 'text-slate-950 dark:text-white'
                  }`}>
                    Todas las Fotos
                  </span>
                  <span className={`block text-[11px] font-medium truncate ${
                    currentTab === 'todas' ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    Galería completa
                  </span>
                </div>
              </div>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-lg font-black shrink-0 ${
                currentTab === 'todas' ? 'bg-white text-violet-700 shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}>
                {photos.length}
              </span>
            </button>

            {/* Tab 2: Álbumes temáticos */}
            <button
              type="button"
              onClick={() => setCurrentTab('albumes')}
              className={`flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-xl transition-all text-left ${
                currentTab === 'albumes'
                  ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-500/40 translate-y-[-1px]'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${
                  currentTab === 'albumes' 
                    ? 'bg-violet-700/60 text-white' 
                    : 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900'
                }`}>
                  <FolderHeart className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs sm:text-sm font-extrabold truncate ${
                    currentTab === 'albumes' ? 'text-white' : 'text-slate-950 dark:text-white'
                  }`}>
                    Álbumes y Eventos
                  </span>
                  <span className={`block text-[11px] font-medium truncate ${
                    currentTab === 'albumes' ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    Carpetas temáticas
                  </span>
                </div>
              </div>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-lg font-black shrink-0 ${
                currentTab === 'albumes' ? 'bg-white text-violet-700 shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}>
                {albums.length}
              </span>
            </button>

            {/* Tab 3: Subir Fotos */}
            <button
              type="button"
              onClick={() => setCurrentTab('subir')}
              className={`flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-xl transition-all text-left ${
                currentTab === 'subir'
                  ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-500/40 translate-y-[-1px]'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${
                  currentTab === 'subir' 
                    ? 'bg-violet-700/60 text-white' 
                    : 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900'
                }`}>
                  <Upload className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs sm:text-sm font-extrabold truncate ${
                    currentTab === 'subir' ? 'text-white' : 'text-slate-950 dark:text-white'
                  }`}>
                    Subir Fotos
                  </span>
                  <span className={`block text-[11px] font-medium truncate ${
                    currentTab === 'subir' ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    Cámara o archivos
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-extrabold shrink-0 uppercase tracking-wider ${
                currentTab === 'subir' ? 'bg-violet-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {pendingFiles.length > 0 ? `${pendingFiles.length} sel.` : 'Nuevo'}
              </span>
            </button>

            {/* Tab 4: Compartir Enlace */}
            <button
              type="button"
              onClick={() => setCurrentTab('compartir')}
              className={`flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-xl transition-all text-left ${
                currentTab === 'compartir'
                  ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-500/40 translate-y-[-1px]'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-300 dark:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${
                  currentTab === 'compartir' 
                    ? 'bg-violet-700/60 text-white' 
                    : 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900'
                }`}>
                  <Share2 className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs sm:text-sm font-extrabold truncate ${
                    currentTab === 'compartir' ? 'text-white' : 'text-slate-950 dark:text-white'
                  }`}>
                    Enlace de Descarga
                  </span>
                  <span className={`block text-[11px] font-medium truncate ${
                    currentTab === 'compartir' ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    Compartir WhatsApp
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-extrabold shrink-0 uppercase tracking-wider ${
                currentTab === 'compartir' ? 'bg-violet-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                Público
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. VISTA SEGÚN LA PESTAÑA ACTIVA */}

      {/* PESTAÑA 1: TODAS LAS FOTOS */}
      {currentTab === 'todas' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar fotos por nombre, álbum o etiquetas..."
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-3 py-2 text-xs font-extrabold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800 rounded-xl flex items-center gap-1.5 hover:bg-violet-100"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartir Galería</span>
                </button>

                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {filteredPhotos.length} fotos
                </div>
              </div>
            </div>

            {/* Album selector pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedAlbum('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  selectedAlbum === 'all'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700'
                }`}
              >
                Todas ({photos.length})
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
                        ? 'bg-violet-600 text-white shadow-xs'
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

          {/* Photo Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <ImageIcon className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                No hay fotos en esta selección
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Puedes subir fotos tomadas en los cultos, bautismos o actividades directamente desde aquí.
              </p>
              <button
                type="button"
                onClick={() => setCurrentTab('subir')}
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-extrabold hover:bg-violet-500 transition-colors inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>+ Subir Fotos Ahora</span>
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
                  <div className="relative aspect-4/3 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={photo.thumbnailUrl || photo.imageUrl}
                      alt={photo.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Badge Top Left */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-xs text-white border border-white/20">
                        {photo.album}
                      </span>
                    </div>

                    {/* Quick Download & Delete Actions */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleDownload(photo, e)}
                        className="p-2 rounded-xl bg-white/95 hover:bg-white text-slate-900 shadow-md hover:scale-110 active:scale-95 transition-all"
                        title="Descargar Foto"
                      >
                        <Download className="w-4 h-4 text-violet-700" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Estás seguro de eliminar la foto "${photo.title}"?`)) {
                              onDeletePhoto(photo.id);
                              showToast(`Foto eliminada.`);
                            }
                          }}
                          className="p-2 rounded-xl bg-white/95 hover:bg-rose-600 text-rose-600 hover:text-white shadow-md hover:scale-110 active:scale-95 transition-all"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

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
        </div>
      )}

      {/* PESTAÑA 2: ÁLBUMES Y CATEGORÍAS */}
      {currentTab === 'albumes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                Álbumes Temáticos de la Iglesia
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Organiza las fotos por departamentos, ministerios y eventos especiales
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsNewAlbumModalOpen(true)}
              className="px-3.5 py-2 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Álbum</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => {
              const albumPhotos = photos.filter((p) => p.album.toLowerCase() === album.name.toLowerCase());
              const coverUrl = albumPhotos[0]?.imageUrl || album.coverPhotoUrl || 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800';

              return (
                <div
                  key={album.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="relative aspect-16/9 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={coverUrl}
                      alt={album.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-black bg-white/90 text-slate-900 shadow-xs">
                        {albumPhotos.length} fotos
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAlbum(album.name);
                          setIsShareModalOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-900/80 text-white hover:bg-slate-900 transition-colors"
                        title="Compartir enlace de este álbum"
                      >
                        <Share2 className="w-4 h-4 text-violet-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                        {album.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {album.description || 'Álbum oficial de actividades.'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAlbum(album.name);
                          setCurrentTab('todas');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Ver Fotos ({albumPhotos.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUploadAlbum(album.name);
                          setCurrentTab('subir');
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
                        title="Subir fotos a este álbum"
                      >
                        <Upload className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: SUBIR FOTOS */}
      {currentTab === 'subir' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8 shadow-md max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center text-violet-600 dark:text-violet-400 mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Subir Fotos de la Iglesia
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Selecciona múltiples fotos desde tu teléfono o computadora, o toma una foto directamente con la cámara.
            </p>
          </div>

          {/* Action trigger buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/60 border-2 border-dashed border-violet-300 dark:border-violet-700 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Images className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                Explorar Archivos / Galería
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Selecciona múltiples imágenes
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (cameraInputRef.current) cameraInputRef.current.click();
              }}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                Tomar Foto con la Cámara
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Captura en vivo desde el móvil
              </span>
            </button>
          </div>

          {/* Form details */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  Álbum o Actividad de Destino *
                </label>
                <select
                  value={uploadAlbum}
                  onChange={(e) => setUploadAlbum(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {albums.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  Fecha de la Actividad *
                </label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">
                Título o Tema (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Culto de Santa Cena, Investidura, etc."
                value={uploadTitlePrefix}
                onChange={(e) => setUploadTitlePrefix(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">
                Descripción o Notas (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Breve reseña sobre este momento especial..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Pending files list */}
          {pendingFiles.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Archivos listos para subir: <strong>{pendingFiles.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPendingFiles([])}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Limpiar lista
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-left text-xs">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="truncate max-w-[280px] font-medium text-slate-800 dark:text-slate-200">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Submit Button */}
          <div>
            <button
              type="button"
              disabled={pendingFiles.length === 0 || isOptimizing}
              onClick={handleProcessUpload}
              className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                pendingFiles.length > 0 && !isOptimizing
                  ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer active:scale-98'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              {isOptimizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Optimizando y Guardando Fotos...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Guardar {pendingFiles.length > 0 ? `(${pendingFiles.length}) Fotos` : ''} en la Galería</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: COMPARTIR ENLACE Y DESCARGAS */}
      {currentTab === 'compartir' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8 shadow-md max-w-3xl mx-auto space-y-6 text-left">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enlace Directo de Descarga</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
              Comparte la Galería con la Hermandad
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Copia este enlace o envíalo directamente por WhatsApp al grupo de la iglesia. Las personas que abran el enlace podrán <strong>ver todas las fotos y descargarlas en alta calidad</strong> directamente en su celular sin requerir contraseña.
            </p>
          </div>

          {/* Enlace Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-700 space-y-3">
            <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Enlace Web Público Oficial:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicShareUrl}
                className="flex-1 px-3.5 py-2.5 min-h-[42px] rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(publicShareUrl);
                  showToast('¡Enlace público copiado al portapapeles!');
                }}
                className="min-h-[42px] px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
              >
                <Copy className="w-4 h-4 text-violet-300" />
                <span>Copiar Enlace</span>
              </button>
            </div>
          </div>

          {/* Botón WhatsApp */}
          <div>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `📸 *¡Hola familia de la iglesia!* Ya están disponibles las fotos de nuestras actividades y cultos. Puedes verlas y descargarlas gratis en alta calidad aquí:\n\n👉 ${publicShareUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/30 transition-all text-center"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Enviar Enlace por Grupo de WhatsApp</span>
            </a>
          </div>

          {/* Botón Abrir Vista Pública */}
          <div className="pt-2 text-center">
            <a
              href={publicShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              <span>Abrir vista previa pública (como la verán las visitas)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* MODAL: CREAR NUEVO ÁLBUM */}
      {isNewAlbumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden text-left">
            <div className="px-6 py-4 bg-violet-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                <h3 className="text-base font-extrabold">Crear Nuevo Álbum</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewAlbumModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAlbumSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  Nombre del Álbum o Ministerio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ministerio de Música, Retiro Espiritual..."
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1 uppercase tracking-wider">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Breve detalle sobre este álbum..."
                  value={newAlbumDesc}
                  onChange={(e) => setNewAlbumDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAlbumModalOpen(false)}
                  className="px-4 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-xs"
                >
                  Crear Álbum
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LIGHTBOX FULLSCREEN */}
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

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar definitivamente la foto "${lightboxPhoto.title}"?`)) {
                        onDeletePhoto(lightboxPhoto.id);
                        setLightboxPhoto(null);
                        showToast('Foto eliminada.');
                      }
                    }}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-rose-400 hover:text-white hover:bg-rose-600/40 transition-colors"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

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

      {/* SHARE MODAL */}
      <ShareGalleryModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        albums={albums}
        selectedAlbum={selectedAlbum !== 'all' ? selectedAlbum : undefined}
        totalPhotosCount={photos.length}
      />
    </div>
  );
};
