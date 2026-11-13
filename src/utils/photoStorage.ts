import { ChurchPhoto, PhotoAlbum } from '../types';

const DB_NAME = 'eclesia_church_photos_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const ALBUMS_STORE = 'albums';

// Initial default albums
export const DEFAULT_PHOTO_ALBUMS: PhotoAlbum[] = [
  {
    id: 'album-cultos',
    name: 'Culto de Adoración',
    description: 'Servicios de adoración sabáticos, alabanza y predicación',
    color: 'blue',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01',
  },
  {
    id: 'album-jovenes',
    name: 'Sociedad de Jóvenes (JA)',
    description: 'Programas de jóvenes, actividades misioneras y campamentos juveniles',
    color: 'indigo',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01',
  },
  {
    id: 'album-conquistadores',
    name: 'Conquistadores y Aventureros',
    description: 'Camporíes, ferias, desfiles, investiduras y nudos',
    color: 'amber',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01',
  },
  {
    id: 'album-bautismos',
    name: 'Bautismos y Santa Cena',
    description: 'Celebraciones de entrega a Cristo y comunión eclesiástica',
    color: 'emerald',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01',
  },
  {
    id: 'album-infantil',
    name: 'Ministerio Infantil',
    description: 'Escuela Sabática de cuna, infantes, primarios y Escuela Cristiana de Vacaciones',
    color: 'rose',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01',
  },
  {
    id: 'album-general',
    name: 'Actividades Generales',
    description: 'Almuerzos fraternales, aniversarios y momentos de iglesia',
    color: 'purple',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01',
  },
];

// Initial seed photos so user immediately sees a rich church gallery
export const SEED_PHOTOS: ChurchPhoto[] = [
  {
    id: 'photo-seed-1',
    title: 'Servicio de Adoración Sabático',
    album: 'Culto de Adoración',
    date: '2026-10-24',
    imageUrl: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=1600&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=500&auto=format&fit=crop&q=80',
    uploadedBy: 'Comisión de Medios',
    uploadedAt: '2026-10-24T18:30:00.000Z',
    description: 'Momento de canto congregacional y alabanza durante el culto matutino del Sábado.',
    tags: ['adoracion', 'sabado', 'alabanza'],
  },
  {
    id: 'photo-seed-2',
    title: 'Encuentro de Jóvenes JA - Comunión Fraternal',
    album: 'Sociedad de Jóvenes (JA)',
    date: '2026-10-24',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1600&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&auto=format&fit=crop&q=80',
    uploadedBy: 'Liderazgo JA',
    uploadedAt: '2026-10-24T22:15:00.000Z',
    description: 'Dinámicas y testimonios en el programa especial de la tarde con los jóvenes.',
    tags: ['jovenes', 'ja', 'amistad'],
  },
  {
    id: 'photo-seed-3',
    title: 'Campamento y Caminata del Club de Conquistadores',
    album: 'Conquistadores y Aventureros',
    date: '2026-10-18',
    imageUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1600&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=500&auto=format&fit=crop&q=80',
    uploadedBy: 'Director de Conquistadores',
    uploadedAt: '2026-10-18T16:00:00.000Z',
    description: 'Paseo al aire libre, especialidades de naturaleza y fogata espiritual.',
    tags: ['conquistadores', 'campamento', 'naturaleza'],
  },
  {
    id: 'photo-seed-4',
    title: 'Celebración de Bautismo',
    album: 'Bautismos y Santa Cena',
    date: '2026-10-17',
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=80',
    uploadedBy: 'Secretaría de Iglesia',
    uploadedAt: '2026-10-17T17:45:00.000Z',
    description: 'Nuevos hermanos entregando sus vidas a Cristo en las aguas bautismales.',
    tags: ['bautismo', 'fiesta', 'salvacion'],
  },
  {
    id: 'photo-seed-5',
    title: 'Clase de Escuela Sabática Infantil',
    album: 'Ministerio Infantil',
    date: '2026-10-10',
    imageUrl: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=1600&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=500&auto=format&fit=crop&q=80',
    uploadedBy: 'Maestras de Niños',
    uploadedAt: '2026-10-10T14:20:00.000Z',
    description: 'Manualidades bíblicas, versículos de memoria y cantos con los niños.',
    tags: ['ninos', 'escuela-sabatica', 'manualidades'],
  },
  {
    id: 'photo-seed-6',
    title: 'Almuerzo y Confraternidad Eclesiástica',
    album: 'Actividades Generales',
    date: '2026-10-03',
    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1600&auto=format&fit=crop&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&auto=format&fit=crop&q=80',
    uploadedBy: 'Comisión Social',
    uploadedAt: '2026-10-03T19:00:00.000Z',
    description: 'Almuerzo conjunto y bienvenida a los nuevos visitantes de la iglesia.',
    tags: ['confraternidad', 'almuerzo', 'comunidad'],
  },
];

/**
 * Initialize IndexedDB for high-capacity local photo storage
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ALBUMS_STORE)) {
        db.createObjectStore(ALBUMS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load all photos from IndexedDB with fallback to localStorage and Seed Data
 */
export async function loadAllPhotos(): Promise<ChurchPhoto[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const storedPhotos = request.result as ChurchPhoto[];
        if (storedPhotos && storedPhotos.length > 0) {
          resolve(storedPhotos);
        } else {
          // If empty, initialize with seed photos
          saveAllPhotos(SEED_PHOTOS).catch(console.error);
          resolve(SEED_PHOTOS);
        }
      };

      request.onerror = () => {
        resolve(getFallbackPhotos());
      };
    });
  } catch {
    return getFallbackPhotos();
  }
}

/**
 * Save array of photos into IndexedDB
 */
export async function saveAllPhotos(photos: ChurchPhoto[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      photos.forEach((photo) => store.put(photo));
      tx.oncomplete = () => {
        saveFallbackPhotos(photos);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    saveFallbackPhotos(photos);
  }
}

/**
 * Add or update single photo
 */
export async function saveSinglePhoto(photo: ChurchPhoto): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(photo);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const current = getFallbackPhotos();
    const updated = [photo, ...current.filter((p) => p.id !== photo.id)];
    saveFallbackPhotos(updated);
  }
}

/**
 * Delete a photo by ID
 */
export async function deleteSinglePhoto(photoId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(photoId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const current = getFallbackPhotos();
    saveFallbackPhotos(current.filter((p) => p.id !== photoId));
  }
}

// Fallback to localStorage (stores lightweight metadata or URLs)
const FALLBACK_KEY = 'eclesia_photos_meta';

function getFallbackPhotos(): ChurchPhoto[] {
  try {
    const data = localStorage.getItem(FALLBACK_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return SEED_PHOTOS;
  } catch {
    return SEED_PHOTOS;
  }
}

function saveFallbackPhotos(photos: ChurchPhoto[]): void {
  try {
    // Only store first 20 photos in localStorage to avoid quota overflow
    const safeList = photos.slice(0, 20).map((p) => ({
      ...p,
      // If image is a massive data URL, truncate in localStorage fallback
      imageUrl: p.imageUrl.startsWith('data:') && p.imageUrl.length > 500000 
        ? p.thumbnailUrl || p.imageUrl.slice(0, 50000) 
        : p.imageUrl,
    }));
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(safeList));
  } catch {
    // ignore quota exceeded on fallback
  }
}

/**
 * Compress an image file to standard full-res web size (max 1920px) with high visual clarity
 */
export async function optimizePhotoFile(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<{ dataUrl: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: e.target?.result as string, sizeBytes: file.size });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        resolve({ dataUrl, sizeBytes: approxBytes });
      };
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
    reader.readAsDataURL(file);
  });
}

// Export alias for file compression
export const compressImageFile = optimizePhotoFile;

/**
 * Generate a lightweight thumbnail (max 400px)
 */
export async function generateThumbnail(dataUrl: string, maxDimension = 400): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Trigger immediate browser download of an image
 */
export function downloadPhotoFile(imageUrl: string, filename: string): void {
  // If data URL or same-origin
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // If remote URL, fetch as blob then download to bypass CORS attribute restrictions
  fetch(imageUrl)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    })
    .catch(() => {
      // Fallback
      const a = document.createElement('a');
      a.href = imageUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
}
