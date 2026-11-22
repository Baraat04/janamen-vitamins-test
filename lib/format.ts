export const LEVEL: Record<string, string> = { critical: "Критично", high: "Высокая", medium: "Средняя", low: "Низкая" };
export const STATUS: Record<string, string> = {
  draft: "Черновик", new: "Новая", review: "На разборе", more: "Запрошена информация",
  later: "Резерв", taken: "Берём", rejected: "Отказ",
};
export const VIA: Record<string, string> = { avatar: "через разговор с Айтымом", form: "анкета", mixed: "Айтым + анкета" };

export function age(n?: number | null) {
  if (n == null) return "возраст не указан";
  const m10 = n % 10;
  const m100 = n % 100;
  return `${n} ${m10 === 1 && m100 !== 11 ? "год" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "года" : "лет"}`;
}

export const num = (v: number | null | undefined, d = 1) => (v == null ? "—" : String(Math.round(v * 10 ** d) / 10 ** d).replace(".", ","));

export function bmiOf(w?: number | null, h?: number | null) {
  if (!w || !h) return null;
  return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
}

export const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1).replace(".", ",")} МБ`;

export function dur(sec?: number | null) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Время из SQLite (UTC, «YYYY-MM-DD HH:MM:SS»). */
export const parseTs = (s?: string | null) => (s ? new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z") : null);

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export function when(s?: string | null) {
  const d = parseTs(s);
  if (!d) return "";
  const now = new Date();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (day(now) - day(d)) / 86400000;
  if (diff === 0) return `сегодня, ${hm}`;
  if (diff === 1) return `вчера, ${hm}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hm}`;
}

export function ago(s?: string | null) {
  const d = parseTs(s);
  if (!d) return "";
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.round(h / 24);
  if (days === 1) return "вчера";
  if (days < 7) return `${days} ${days < 5 ? "дня" : "дней"} назад`;
  if (days < 14) return "неделю назад";
  return `${Math.round(days / 7)} недели назад`;
}

export const dayMonth = (s?: string | null) => {
  const d = parseTs(s);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : "";
};

export const initials = (name?: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
