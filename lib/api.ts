// Обращения к бэкенду (Express). Куки сессии — httpOnly, ходят сами.
export const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4120").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  field?: string;
  constructor(message: string, status: number, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      credentials: "include",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Нет связи с сервером. Проверь интернет и попробуй ещё раз.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Что-то пошло не так", res.status, data.field);
  return data as T;
}

/** Загрузка файлов с прогрессом (fetch прогресс отправки не умеет). */
export function uploadFiles(kind: "video" | "photo" | "doc", files: File[], onProgress: (p: number) => void): Promise<{ files: FileInfo[] }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/api/application/files/${kind}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data.error || "Не удалось загрузить файл", xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Нет связи с сервером", 0));
    xhr.send(fd);
  });
}

export const fileUrl = (id: number) => `${API}/api/files/${id}`;

export function liveUrl(lang: string) {
  const base = API || window.location.origin;
  return base.replace(/^http/, "ws") + `/api/live?lang=${lang}`;
}

// ---------------------------------------------------------------- типы

export type User = { id: number; email: string; role: "applicant" | "team"; name?: string; title?: string; admin?: boolean; mustChange?: boolean };

/** Куда вести после входа: сотрудника — в очередь заявок, заявителя — в его кабинет. Вошёл по временному паролю — сначала в профиль. */
export const homeOf = (u: User) => (u.mustChange ? "/profile" : u.role === "team" ? "/team" : "/status");

/** Как назвать роль человеку, а не программисту. */
export const roleOf = (u: Pick<User, "role" | "admin">) => (u.role !== "team" ? "Участник" : u.admin ? "Супер-админ" : "Модератор");

export type Member = {
  id: number; email: string; name: string | null; title: string | null; admin: boolean; disabled: boolean;
  mustChange: boolean; lastLogin: string | null; createdAt: string;
};

/** Итог проверки файла ИИ (видит только команда): pending — ещё смотрит, ok — чисто, flagged — сомнительно, error — не удалось. */
export type FileCheck = "pending" | "ok" | "flagged" | "error";
export type FileInfo = {
  id: number; kind: "video" | "photo" | "doc"; name: string; mime?: string; size: number; duration?: number | null; created_at?: string;
  check?: FileCheck; checkNote?: string | null;
};

export type FormData_ = {
  fname?: string; lname?: string; age?: number | null; city?: string; country?: string; phone?: string;
  weight?: number | null; height?: number | null; diagnoses?: string[]; meds?: string; since?: string;
  story?: string; tried?: string; why?: string; move?: string; extra?: string;
  /** подробности, которые ИИ-Айтым записал из разговора: тема и факт словами человека */
  talk?: { topic: string; text: string }[];
};

export type Message = { id: number; sender: "team" | "applicant"; author?: string; text: string; read_at?: string | null; created_at: string };

export type MyApp = {
  id: number; code: string; status: string; data: FormData_; aiFields: string[]; via: string; usedAvatar: boolean;
  analysisDone: boolean; submittedAt: string | null; decidedAt: string | null; updatedAt: string;
  files: FileInfo[]; messages: Message[]; unread: number;
};

export type QueueRow = {
  id: number; code: string; name: string; age: number | null; city: string; country?: string | null; weight: number | null; height: number | null;
  bmi: number | null; diagnoses: string[]; urgency: number | null; level: Level | null; why: string | null; status: string;
  via: "avatar" | "form" | "mixed"; video: { id: number; duration: number | null; check?: FileCheck } | null; submittedAt: string | null;
  /** предупреждения от ИИ: попытка повлиять на разбор, недопустимое содержимое, помеченные файлы */
  alerts: string[];
  analysisStatus: string; demo: boolean; facts: [string, string][]; detailsCount: number;
  summary: string | null; recap: string | null; chapters: Chapter[];
};

/** Часть видео в пересказе ИИ: секунда начала, короткий заголовок и что в этой части происходит. */
export type Chapter = { t: number | null; title: string; text: string };

export type Level = "critical" | "high" | "medium" | "low";

export type Analysis = {
  urgency: number; urgencyWhy: string; summary: string; facts: [string, string][];
  details: { text: string; source: string; t: number | null }[]; risks: string[]; quote: string;
  videoSeen: boolean; videoNotes: string; missing: string[]; model?: string; at?: string;
  videoRecap?: string; videoChapters?: Chapter[]; videoPart?: number | null;
  manipulation?: string; contentIssue?: string;
};

/** Файл можно показывать сразу: проверка ИИ прошла чисто или не удалась (тогда рядом будет пометка). */
export const fileSafe = (f: { check?: FileCheck } | null | undefined) => !f || !f.check || f.check === "ok" || f.check === "error";

/** Почему файл скрыт за заглушкой. */
export const checkText = (f: { check?: FileCheck; checkNote?: string | null }) =>
  f.check === "pending" ? "ИИ ещё проверяет этот файл" : f.checkNote || "ИИ пометил файл как сомнительный";

export type Person = QueueRow & {
  email: string | null; data: FormData_; aiFields: string[]; analysis: Analysis | null; analysisError: string | null;
  files: FileInfo[]; notes: { id: number; author: string; text: string; created_at: string }[];
  messages: Message[]; events: { id: number; text: string; created_at: string }[];
  chat: { role: string; text: string; created_at: string }[]; prev: QueueRow | null; next: QueueRow | null;
};
