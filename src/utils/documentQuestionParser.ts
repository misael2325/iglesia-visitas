import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as mammoth from 'mammoth';
import { YouthGameKind, YouthQuizQuestion } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Extrae texto legible conservando saltos de línea desde archivos .pdf, .docx o .txt
 */
export async function extractTextFromDocumentFile(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines: Array<{ y: number; items: Array<{ x: number; str: string }> }> = [];

      for (const rawItem of textContent.items as any[]) {
        if (!rawItem || typeof rawItem.str !== 'string') continue;
        const str = rawItem.str;
        if (!str.trim()) continue;
        const transform = Array.isArray(rawItem.transform) ? rawItem.transform : [1, 0, 0, 1, 0, 0];
        const x = Number(transform[4]) || 0;
        const y = Number(transform[5]) || 0;

        let line = lines.find((l) => Math.abs(l.y - y) <= 4);
        if (!line) {
          line = { y, items: [] };
          lines.push(line);
        }
        line.items.push({ x, str });
      }

      lines.sort((a, b) => b.y - a.y);
      const formattedLines = lines.map((line) =>
        line.items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      );
      pageTexts.push(formattedLines.filter(Boolean).join('\n'));
    }

    return pageTexts.join('\n\n');
  }

  if (
    lowerName.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  }

  if (lowerName.endsWith('.doc')) {
    throw new Error(
      'El formato antiguo .doc no es compatible directamente. Por favor guárdalo como .docx (Word moderno) o .pdf e inténtalo nuevamente.'
    );
  }

  // Fallback for .txt / .md / plain text
  return await file.text();
}

const LETTER_TO_INDEX: Record<string, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
};

function cleanOptionMarker(raw: string): { text: string; isMarkedCorrect: boolean } {
  let text = raw.trim();
  let isMarkedCorrect = false;

  if (/^(\*|✓|✔|\[x\]|\(x\))\s*/i.test(text)) {
    isMarkedCorrect = true;
    text = text.replace(/^(\*|✓|✔|\[x\]|\(x\))\s*/i, '');
  }
  if (/\s*(\*|✓|✔|\(correcta\)|\[correcta\]|<-+\s*correcta)$/i.test(text)) {
    isMarkedCorrect = true;
    text = text.replace(/\s*(\*|✓|✔|\(correcta\)|\[correcta\]|<-+\s*correcta)$/i, '');
  }

  return { text: text.trim(), isMarkedCorrect };
}

/**
 * Separa opciones inline como: "A) David  B) Moisés  C) José  D) Samuel"
 */
function splitInlineOptions(line: string): Array<{ letter?: string; rawText: string }> | null {
  const inlineRegex = /(?:^|\s)(\*?[A-Da-d][\)\.\-:])\s+/g;
  const matches: Array<{ index: number; fullStart: number; letter: string }> = [];
  let m: RegExpExecArray | null;

  while ((m = inlineRegex.exec(line)) !== null) {
    const token = m[1];
    const letterChar = token.replace('*', '').charAt(0).toLowerCase();
    const tokenStart = m.index + (m[0].length - m[0].trimStart().length);
    matches.push({
      index: tokenStart + token.length,
      fullStart: tokenStart,
      letter: letterChar,
    });
  }

  if (matches.length >= 2) {
    const parts: Array<{ letter?: string; rawText: string }> = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].fullStart : line.length;
      const rawText = line.slice(start, end).trim();
      const hasLeadingStar = line.slice(matches[i].fullStart, matches[i].fullStart + 1) === '*';
      parts.push({
        letter: matches[i].letter,
        rawText: hasLeadingStar ? `* ${rawText}` : rawText,
      });
    }
    return parts;
  }

  return null;
}

/**
 * Parsea texto crudo extraído de PDF, Word o pegado manual en preguntas tipo Quizizz.
 */
export function parseQuestionsFromText(
  rawText: string,
  gameKind: YouthGameKind = 'quiz_preguntas'
): YouthQuizQuestion[] {
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t+/g, ' ');

  const rawLines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  // Detectar posible clave de respuestas al final del documento (ej: "1. B", "1) C", "Respuestas: 1-A 2-C")
  const answerKeyMap = new Map<number, number>();
  const answerKeyStartIdx = rawLines.findIndex((l) =>
    /^(clave\s+de\s+respuestas|respuestas\s+correctas|solucionario|hoja\s+de\s+respuestas)\b/i.test(l)
  );

  const contentLines = answerKeyStartIdx >= 0 ? rawLines.slice(0, answerKeyStartIdx) : rawLines;
  if (answerKeyStartIdx >= 0) {
    const keyLines = rawLines.slice(answerKeyStartIdx + 1).join(' ');
    const keyRegex = /(\d+)\s*[\)\.\-:\s]\s*([A-Da-d])\b/g;
    let km: RegExpExecArray | null;
    while ((km = keyRegex.exec(keyLines)) !== null) {
      const qNum = parseInt(km[1], 10);
      const letterIdx = LETTER_TO_INDEX[km[2].toLowerCase()];
      if (Number.isFinite(qNum) && letterIdx !== undefined) {
        answerKeyMap.set(qNum, letterIdx);
      }
    }
  }

  interface DraftQ {
    numberHint: number | null;
    promptParts: string[];
    options: string[];
    correctIndex: number | null;
    explanation?: string;
  }

  const drafts: DraftQ[] = [];
  let current: DraftQ | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const prompt = current.promptParts.join(' ').replace(/\s+/g, ' ').trim();
    if (!prompt) return;

    let options = current.options.filter(Boolean).slice(0, 4);
    let correctIndex = current.correctIndex;

    // Aplicar clave de respuestas al final del archivo si no se detectó inline
    if (correctIndex === null && current.numberHint !== null) {
      const mapped = answerKeyMap.get(current.numberHint);
      if (mapped !== undefined && mapped < options.length) {
        correctIndex = mapped;
      }
    }

    if (gameKind === 'verdadero_falso') {
      if (options.length === 0) {
        options = ['Verdadero', 'Falso'];
      }
    } else if (options.length === 0) {
      options = ['', '', '', ''];
    } else if (options.length === 1) {
      options = [options[0], '', '', ''];
    }

    drafts.push({
      numberHint: current.numberHint,
      promptParts: [prompt],
      options,
      correctIndex,
      explanation: current.explanation,
    });
  };

  for (const line of contentLines) {
    // Detectar línea de respuesta directa: "Respuesta: B" / "Correcta: A)" / "R/ C"
    const answerLineMatch = line.match(
      /^(?:respuesta(?:\s+correcta)?|correcta|soluci[oó]n|r\/)\s*[:\-]?\s*([A-Da-d])(?:[\)\.\s]|$)(.*)$/i
    );
    if (answerLineMatch && current) {
      const idx = LETTER_TO_INDEX[answerLineMatch[1].toLowerCase()];
      if (idx !== undefined) {
        current.correctIndex = idx;
      }
      if (answerLineMatch[2] && answerLineMatch[2].trim()) {
        current.explanation = answerLineMatch[2].trim();
      }
      continue;
    }

    // Detectar explicación / versículo de apoyo
    const expMatch = line.match(/^(?:cita|vers[ií]culo|explicaci[oó]n|referencia)\s*[:\-]\s*(.+)$/i);
    if (expMatch && current) {
      current.explanation = expMatch[1].trim();
      continue;
    }

    // Detectar opciones múltiples en una sola línea: "A) ... B) ..."
    const inlineOpts = splitInlineOptions(line);
    if (inlineOpts && current) {
      for (const opt of inlineOpts) {
        const cleaned = cleanOptionMarker(opt.rawText);
        const optIdx = current.options.length;
        current.options.push(cleaned.text);
        if (cleaned.isMarkedCorrect && current.correctIndex === null) {
          current.correctIndex = optIdx;
        }
      }
      continue;
    }

    // Detectar inicio explícito de pregunta numerada: "1. ¿...?" / "Pregunta 1:" / "P1)"
    const qHeaderMatch = line.match(
      /^(?:pregunta\s*|p\s*)?(\d{1,3})\s*[\)\.\-:]\s+(.+)$/i
    );

    // OJO: No confundir una sub-opción numerada cuando ya estamos leyendo opciones si es "1)" después de opciones? Usualmente las preguntas son 1., 2., 3. y opciones A), B), C), D)
    const isLetterOptionMatch = line.match(/^(\*?\s*[A-Da-d])\s*[\)\.\-:]\s+(.+)$/);
    const isBulletOptionMatch = line.match(/^([\-•●○])\s+(.+)$/);

    if (qHeaderMatch && !isLetterOptionMatch) {
      pushCurrent();
      current = {
        numberHint: parseInt(qHeaderMatch[1], 10),
        promptParts: [qHeaderMatch[2].trim()],
        options: [],
        correctIndex: null,
      };
      continue;
    }

    if (isLetterOptionMatch && current) {
      const rawOptionBody = isLetterOptionMatch[2];
      const hasStarOnPrefix = isLetterOptionMatch[1].includes('*');
      const cleaned = cleanOptionMarker((hasStarOnPrefix ? '* ' : '') + rawOptionBody);
      const optIdx = current.options.length;
      current.options.push(cleaned.text);
      if (cleaned.isMarkedCorrect && current.correctIndex === null) {
        current.correctIndex = optIdx;
      }
      continue;
    }

    if (isBulletOptionMatch && current) {
      const cleaned = cleanOptionMarker(isBulletOptionMatch[2]);
      const optIdx = current.options.length;
      current.options.push(cleaned.text);
      if (cleaned.isMarkedCorrect && current.correctIndex === null) {
        current.correctIndex = optIdx;
      }
      continue;
    }

    // Si es una pregunta abierta con signos ¿...? sin número y ya hay opciones previas, inicia nueva pregunta
    if (line.startsWith('¿') && (!current || current.options.length >= 2)) {
      pushCurrent();
      current = {
        numberHint: drafts.length + 1,
        promptParts: [line],
        options: [],
        correctIndex: null,
      };
      continue;
    }

    // Si aún no hay pregunta activa, empezar la primera
    if (!current) {
      current = {
        numberHint: 1,
        promptParts: [line],
        options: [],
        correctIndex: null,
      };
      continue;
    }

    // Si aún no hemos agregado opciones, probablemente es continuación de la pregunta
    if (current.options.length === 0) {
      current.promptParts.push(line);
    } else if (line.endsWith('?') || line.length > 85) {
      // Probablemente es una nueva pregunta sin número
      pushCurrent();
      current = {
        numberHint: drafts.length + 1,
        promptParts: [line],
        options: [],
        correctIndex: null,
      };
    } else {
      // Continuación de última opción
      const lastIdx = current.options.length - 1;
      current.options[lastIdx] = `${current.options[lastIdx]} ${line}`.trim();
    }
  }

  pushCurrent();

  return drafts.map((d, idx) => ({
    id: `yq-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    prompt: d.promptParts[0],
    options: d.options,
    correctIndex: d.correctIndex,
    timeLimitSeconds: 20,
    points: 1000,
    explanation: d.explanation,
  }));
}
