"use client";
// Язык KZ/RU/EN, тост и текущий пользователь — общие для всех страниц. По умолчанию — русский.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { KZ } from "@/lib/kz";
import { api, type User } from "@/lib/api";
import { I } from "./Icons";
import { AutoTranslate } from "./AutoTranslate";
import { tr, type Lang } from "@/lib/i18n";

const LANGS: Lang[] = ["kz", "ru", "en"];
const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);
export type ToastKind = "ok" | "error" | "info";
type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Текст по ключу: казахский (KZ) или английский (EN), если перевод есть, иначе русский вариант. */
  t: (key: string, ru: string) => string;
  /** Короткое сообщение внизу экрана. kind: ok — галочка, error — красный знак ошибки, info — без значка. */
  toast: (msg: string, kind?: ToastKind) => void;
  user: User | null | undefined; // undefined — ещё загружается
  setUser: (u: User | null) => void;
  refreshUser: () => Promise<User | null>;
};

const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<ToastKind>("ok");
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("jj-lang");
      if (saved === "kz" || saved === "en") setLangState(saved);
      // ?lang=kz или ?lang=en в адресе — открыть страницу сразу на этом языке (например, по ссылке из сообщения)
      const q = new URLSearchParams(window.location.search).get("lang");
      if (isLang(q)) setLang(q);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "kz" ? "kk" : lang === "en" ? "en" : "ru";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("jj-lang", l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, ru: string) => (lang === "kz" && KZ[key] ? KZ[key] : lang === "en" ? tr("en", ru) ?? ru : ru),
    [lang],
  );

  const toast = useCallback((m: string, k: ToastKind = "ok") => {
    setMsg(m);
    setKind(k);
    setOn(true);
    clearTimeout(timer.current);
    // ошибку держим дольше: её нужно успеть прочитать
    timer.current = setTimeout(() => setOn(false), k === "error" ? 5000 : 2800);
  }, []);

  const refreshUser = useCallback(async () => {
    // нет связи с сервером (перезапуск, мигнул интернет) — это не «не вошёл»: пробуем ещё раз
    for (let i = 0; i < 6; i++) {
      try {
        const r = await api<{ user: User | null }>("/api/auth/me");
        setUser(r.user);
        return r.user;
      } catch (e) {
        if ((e as { status?: number }).status !== 0) break;
        await new Promise((res) => setTimeout(res, 1500));
      }
    }
    setUser(null);
    return null;
  }, []);
  useEffect(() => {
    // демо без сервера Jana Jol: входа нет, сразу гость
    setUser(null);
  }, []);

  return (
    <C.Provider value={{ lang, setLang, t, toast, user, setUser, refreshUser }}>
      {children}
      {/* KZ — переводим все страницы целиком по словарю lib/i18n/kk.ts */}
      <AutoTranslate lang={lang} />
      <div className={`toast toast--${kind}${on ? " is-on" : ""}`} role={kind === "error" ? "alert" : "status"} aria-live={kind === "error" ? "assertive" : "polite"}>
        {msg && (
          <>
            {kind !== "info" && <I n={kind === "error" ? "alert" : "check"} />}
            <span>{msg}</span>
          </>
        )}
      </div>
    </C.Provider>
  );
}

/** Элемент с переводом: HTML из словаря (там бывают <br>). */
export function T({ k, children, as: Tag = "span", ...rest }: { k: string; children: string; as?: any; [p: string]: any }) {
  const { t } = useApp();
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: t(k, children) }} />;
}

export function LangSwitch() {
  const { lang, setLang } = useApp();
  return (
    <div className="lang" role="group" aria-label="Язык">
      <button type="button" aria-pressed={lang === "kz"} onClick={() => setLang("kz")} lang="kk" title="Қазақша">KZ</button>
      <button type="button" aria-pressed={lang === "ru"} onClick={() => setLang("ru")} lang="ru" title="Русский">RU</button>
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")} lang="en" title="English">EN</button>
    </div>
  );
}
