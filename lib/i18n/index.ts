// Перевод интерфейса: русский текст → казахский (kk.ts) или английский (en.ts) по словарю.
// Словари собираются из кода (tools/i18n-extract.mjs) и переводятся (tools/i18n-translate.mjs, для английского — с --lang en),
// поэтому новые страницы не нужно переписывать под ключи: достаточно пополнить словари. Даты и «N дней назад» — правилами ниже.
import { KK } from "./kk";
import { EN } from "./en";

export type Lang = "ru" | "kz" | "en";

const CYR = /[А-Яа-яЁё]/;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const RU_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const RU_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const KK_MONTH = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
const KK_SHORT = ["қаң", "ақп", "нау", "сәу", "мам", "мау", "шіл", "там", "қыр", "қаз", "қар", "жел"];
const EN_MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const M = RU_GEN.join("|");
const S = RU_SHORT.join("|");
const kkMon = (m: string) => KK_MONTH[RU_GEN.indexOf(m)];
const enMon = (m: string) => EN_MONTH[RU_GEN.indexOf(m)];
const plural = (n: string, one: string, many: string) => (n === "1" ? one : many);

type Rule = [RegExp, (m: RegExpMatchArray) => string];

/** Даты и время, которые собираются в коде из чисел: «1 декабря 2026», «сегодня, 10:19», «3 дня назад»… */
const RULES_KK: Rule[] = [
  [new RegExp(`^(\\d{1,2}) (${M}) (\\d{4})$`), (m) => `${m[3]} жылғы ${m[1]} ${kkMon(m[2])}`],
  [new RegExp(`^(\\d{1,2}) (${M}), (\\d{1,2}:\\d{2})$`), (m) => `${m[1]} ${kkMon(m[2])}, ${m[3]}`],
  [new RegExp(`^(\\d{1,2}) (${M})$`), (m) => `${m[1]} ${kkMon(m[2])}`],
  [new RegExp(`^(${S}) (\\d{4})$`), (m) => `${KK_SHORT[RU_SHORT.indexOf(m[1])]} ${m[2]}`],
  [new RegExp(`^(${S}) (\\d{4}): ([\\d.,]+) кг$`), (m) => `${KK_SHORT[RU_SHORT.indexOf(m[1])]} ${m[2]}: ${m[3]} кг`],
  [/^сегодня, (\d{1,2}:\d{2})$/, (m) => `бүгін, ${m[1]}`],
  [/^вчера, (\d{1,2}:\d{2})$/, (m) => `кеше, ${m[1]}`],
  [/^(\d+) мин назад$/, (m) => `${m[1]} мин бұрын`],
  [/^(\d+) ч назад$/, (m) => `${m[1]} сағ бұрын`],
  [/^(\d+) (?:дня|дней) назад$/, (m) => `${m[1]} күн бұрын`],
  [/^(\d+) недели назад$/, (m) => `${m[1]} апта бұрын`],
  [/^(\d+) (?:год|года|лет)$/, (m) => `${m[1]} жас`],
  [/^через (\d+) (?:день|дня|дней)$/, (m) => `${m[1]} күннен кейін`],
  [/^(\d+) (?:участник|участника|участников)$/, (m) => `${m[1]} қатысушы`],
  [/^(\d+) (?:человек|человека)$/, (m) => `${m[1]} адам`],
  [/^(\d+) сезон$/, (m) => `${m[1]}-маусым`],
  [/^(\d+) сезон, (\d{4}[–-]\d{4})$/, (m) => `${m[1]} маусым, ${m[2]}`],
  [new RegExp(`^(${S}) (\\d{4}): ([\\d.,]+)$`), (m) => `${KK_SHORT[RU_SHORT.indexOf(m[1])]} ${m[2]}: ${m[3]}`],
];

const RULES_EN: Rule[] = [
  [new RegExp(`^(\\d{1,2}) (${M}) (\\d{4})$`), (m) => `${m[1]} ${enMon(m[2])} ${m[3]}`],
  [new RegExp(`^(\\d{1,2}) (${M}), (\\d{1,2}:\\d{2})$`), (m) => `${m[1]} ${enMon(m[2])}, ${m[3]}`],
  [new RegExp(`^(\\d{1,2}) (${M})$`), (m) => `${m[1]} ${enMon(m[2])}`],
  [new RegExp(`^с (\\d{1,2}) (${M}) (\\d{4})$`), (m) => `since ${m[1]} ${enMon(m[2])} ${m[3]}`],
  [new RegExp(`^с (\\d{1,2}) (${M})$`), (m) => `since ${m[1]} ${enMon(m[2])}`],
  [new RegExp(`^(${S}) (\\d{4})$`), (m) => `${EN_SHORT[RU_SHORT.indexOf(m[1])]} ${m[2]}`],
  [new RegExp(`^(${S}) (\\d{4}): ([\\d.,]+) кг$`), (m) => `${EN_SHORT[RU_SHORT.indexOf(m[1])]} ${m[2]}: ${m[3]} kg`],
  [/^сегодня, (\d{1,2}:\d{2})$/, (m) => `today, ${m[1]}`],
  [/^вчера, (\d{1,2}:\d{2})$/, (m) => `yesterday, ${m[1]}`],
  [/^(\d+) мин назад$/, (m) => `${m[1]} min ago`],
  [/^(\d+) ч назад$/, (m) => `${m[1]} h ago`],
  [/^(\d+) (?:день|дня|дней) назад$/, (m) => `${m[1]} ${plural(m[1], "day", "days")} ago`],
  [/^(\d+) (?:неделю|недели|недель) назад$/, (m) => `${m[1]} ${plural(m[1], "week", "weeks")} ago`],
  [/^(\d+) (?:год|года|лет)$/, (m) => `${m[1]} ${plural(m[1], "year", "years")}`],
  [/^через (\d+) (?:день|дня|дней)$/, (m) => `in ${m[1]} ${plural(m[1], "day", "days")}`],
  [/^(\d+) (?:участник|участника|участников)$/, (m) => `${m[1]} ${plural(m[1], "participant", "participants")}`],
  [/^(\d+) (?:человек|человека)$/, (m) => `${m[1]} ${plural(m[1], "person", "people")}`],
  [/^(\d+) сезон$/, (m) => `Season ${m[1]}`],
  [/^(\d+) сезон, (\d{4}[–-]\d{4})$/, (m) => `Season ${m[1]}, ${m[2]}`],
  [/^(\d+) место\. (.+)\. Подробнее$/, (m) => `Place ${m[1]}. ${tr("en", m[2]) ?? m[2]}. Read more`],
  [/^([^.]+)\. Подробнее$/, (m) => `${tr("en", m[1]) ?? m[1]}. Read more`],
  [new RegExp(`^(${S}) (\\d{4}): ([\\d.,]+)$`), (m) => `${EN_SHORT[RU_SHORT.indexOf(m[1])]} ${m[2]}: ${m[3]}`],
];

/** Шаблоны из словаря («⟨tpl⟩ Задача к {0}: −{1} кг») → регулярные выражения. Длинные — раньше: они точнее. */
function templates(dict: Record<string, string>) {
  return Object.entries(dict)
    .filter(([k]) => k.startsWith("⟨tpl⟩ "))
    .map(([k, out]) => {
      const ru = k.slice(6);
      const parts = ru.split(/\{\d+\}|\{\}/);
      return { re: new RegExp("^" + parts.map(esc).join("(.+?)") + "$"), out, weight: parts.join("").length };
    })
    .filter((t) => t.weight >= 3)
    .sort((a, b) => b.weight - a.weight);
}

type Pack = { dict: Record<string, string>; rules: Rule[]; tpls: ReturnType<typeof templates> };
const PACKS: Record<"kz" | "en", Pack> = {
  kz: { dict: KK, rules: RULES_KK, tpls: templates(KK) },
  en: { dict: EN, rules: RULES_EN, tpls: templates(EN) },
};

/** Латиница для имён и названий, которых нет в словаре (участник, добавленный командой, город из анкеты). */
const LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", ә: "a", ғ: "g", қ: "q", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};
const translit = (s: string) =>
  s.replace(/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/g, (ch) => {
    const low = ch.toLowerCase();
    const t = LAT[low] ?? ch;
    return ch === low ? t : t.charAt(0).toUpperCase() + t.slice(1);
  });
/** Инициалы на аватарке: «АК», «КУ». */
const INITIALS = /^[А-ЯЁӘҒҚҢӨҰҮҺІ]{1,3}$/;
/** Похоже на имя или название: 1–4 слова, каждое с большой буквы («Алишер Толеубай», «Усть-Каменогорск», «Гриша (Григорий)»). */
const NAME_LIKE = /^[(«"]?[А-ЯЁӘҒҚҢӨҰҮҺІ][а-яёәғқңөұүһі'’-]*[)»"]?(?:[ -][(«"]?[А-ЯЁӘҒҚҢӨҰҮҺІ][а-яёәғқңөұүһі'’-]*[)»"]?){0,3}$/;

function lookup(p: Pack, key: string, depth = 0): string | null {
  const hit = p.dict[key];
  if (hit) return hit;
  for (const [re, fn] of p.rules) {
    const m = key.match(re);
    if (m) return fn(m);
  }
  if (depth < 2)
    for (const t of p.tpls) {
      const m = key.match(t.re);
      if (!m) continue;
      // Подставленные значения тоже переводим: в «Ближайшее: {0}» дата станет переведённой.
      // Значение без перевода годится, только если это короткое имя или название; длинная русская фраза значит,
      // что шаблон зацепился случайно («не выходит из дома» ≠ «{0} из {1}») — тогда пробуем следующий шаблон.
      let ok = true;
      const out = t.out.replace(/\{(\d+)\}/g, (_, i) => {
        const v = m[Number(i) + 1] ?? "";
        if (!CYR.test(v)) return v;
        const whole = lookup(p, norm(v), depth + 1);
        if (whole) return whole;
        // перечисление «имя, фамилию, телефон» — переводим по словам
        if (v.includes(", ")) {
          const parts = v.split(", ").map((x) => lookup(p, norm(x), depth + 1));
          if (parts.every(Boolean)) return parts.join(", ");
        }
        if (p === PACKS.kz && norm(v).split(" ").length <= 3) return v; // по-казахски имя остаётся как есть
        if (t.weight >= 8) return v; // у шаблона много своего текста («{0} — открыть в Instagram»): подпись поста остаётся как есть
        ok = false;
        return v;
      });
      if (ok) return out;
    }
  // составная строка «2 сезон · Жаркент», «почта · должность» — по частям, если переводится каждая часть
  if (key.includes(" · ")) {
    const parts = key.split(" · ").map((x) => (CYR.test(x) ? lookup(p, norm(x), depth + 1) : x));
    if (parts.every((x) => x != null)) return parts.join(" · ");
  }
  // «Текст:» или «Текст.» — в словаре без знака на конце
  const pm = key.match(/^(.*?)\s*([.:,!?…—–-]+)$/);
  if (pm && pm[1]) {
    const v = depth < 3 ? lookup(p, pm[1], depth + 1) : p.dict[pm[1]]; // «сен 2026:» — дата по правилу и двоеточие
    if (v) return v + pm[2];
  }
  const q = key.match(/^([«"(—–-]+)\s*(.*)$/);
  if (q && q[2] && p.dict[q[2]]) return q[1] + p.dict[q[2]];
  // по-английски имя или город без перевода — хотя бы латиницей
  if (p === PACKS.en && key.length <= 60 && (NAME_LIKE.test(key) || INITIALS.test(key))) return translit(key);
  return null;
}

/** Перевод строки на язык lang; null — переводить нечего (русский, нет кириллицы или нет в словаре). Пробелы по краям сохраняются. */
export function tr(lang: Lang, s: string | null | undefined): string | null {
  if (lang === "ru" || !s || !CYR.test(s)) return null;
  const key = norm(s);
  const out = lookup(PACKS[lang], key);
  if (out == null || out === key) return null;
  const lead = s.match(/^\s*/)![0];
  const trail = s.match(/\s*$/)![0];
  return lead + out + trail;
}

/** Перевод на казахский — как раньше (для старого кода). */
export const trKk = (s: string | null | undefined) => tr("kz", s);

/** Строка на текущем языке — для текстов, которые не попадают в разметку (confirm, title вкладки). */
export const trIf = (lang: string, s: string) => (lang === "kz" || lang === "en" ? tr(lang, s) ?? s : s);
