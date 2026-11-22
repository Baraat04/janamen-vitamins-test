"use client";
// Меню на телефоне — одно и то же для команды и для заявителей: кнопка «Меню» в шапке открывает экран
// с карточкой профиля сверху и крупными строками разделов. Выхода здесь нет: выйти можно только из профиля.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { homeOf, roleOf } from "@/lib/api";
import { initials } from "@/lib/format";
import { useApp, LangSwitch } from "./Providers";
import { Brand } from "./Headers";
import { I } from "./Icons";

/**
 * Переход к разделу главной («/#faq»). Если мы уже на главной — прокручиваем сами: иначе при адресе,
 * который уже заканчивается на #faq, браузер не прокрутит второй раз. С других страниц — обычный переход.
 */
export function jumpTo(e: React.MouseEvent, href: string, delay = 0) {
  if (!href.startsWith("/#") || window.location.pathname !== "/") return;
  const el = document.getElementById(href.slice(2));
  if (!el) return;
  e.preventDefault();
  const go = () => {
    scrollToY(el.getBoundingClientRect().top + window.scrollY);
    if (window.location.hash !== href.slice(1)) history.replaceState(history.state, "", href);
  };
  if (delay) setTimeout(go, delay);
  else go();
}

let scrollAnim = 0;
/**
 * Плавная прокрутка страницы к y. Сами двигаем страницу по кадрам: встроенная «smooth»-прокрутка обрывается,
 * если страница ещё катится после пальца или колеса, — и тогда переход срабатывал только со второго нажатия.
 * Если человек сам начал крутить — анимация уступает ему.
 */
export function scrollToY(target: number) {
  cancelAnimationFrame(scrollAnim);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const to = Math.max(0, Math.min(Math.round(target), max));
  const from = window.scrollY;
  const dist = to - from;
  if (Math.abs(dist) < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: to, behavior: "instant" as ScrollBehavior });
    return;
  }
  const dur = Math.min(900, 320 + Math.abs(dist) / 6);
  const t0 = performance.now();
  let stopped = false;
  const stop = () => (stopped = true);
  const opts: AddEventListenerOptions = { passive: true, once: true };
  window.addEventListener("wheel", stop, opts);
  window.addEventListener("touchstart", stop, opts);
  window.addEventListener("keydown", stop, opts);
  const step = (t: number) => {
    if (stopped) return;
    const k = Math.min(1, (t - t0) / dur);
    const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    window.scrollTo({ top: from + dist * ease, behavior: "instant" as ScrollBehavior });
    if (k < 1) scrollAnim = requestAnimationFrame(step);
    else {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    }
  };
  scrollAnim = requestAnimationFrame(step);
}

export type MenuItem = { href: string; label: string; hint: string; n?: number; current?: boolean; icon?: string };

/** Закрытие по Esc, фокус внутрь окна при открытии и обратно на кнопку при закрытии. */
export function useOverlay(open: boolean, close: () => void, box: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden"; // страница под меню не листается
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = was;
      back?.focus?.({ preventScroll: true }); // вернуть фокус на кнопку, но не дёргать прокрутку
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

/** Имя и роль человека: «Айтым · Супер-админ». */
export function whoOf(u: { name?: string | null; email: string; role: "applicant" | "team"; admin?: boolean; title?: string | null }) {
  return { name: u.name || u.email, role: [roleOf(u), u.role === "team" ? u.title : null].filter(Boolean).join(" · ") };
}

/** Кнопка профиля в шапке на компьютере: инициалы, имя и роль. Ведёт на страницу профиля. */
export function ProfileChip({ here, dark }: { here?: boolean; dark?: boolean }) {
  const { user } = useApp();
  if (!user) return null;
  const w = whoOf(user);
  return (
    <Link className={`pchip${dark ? " pchip--dark" : ""}`} href="/profile" aria-current={here ? "page" : undefined} title="Профиль, смена пароля и выход">
      <i>{initials(user.name || user.email)}</i>
      <span><b>{w.name}</b><small>{here ? "ты в профиле" : "Мой профиль"}</small></span>
    </Link>
  );
}

/**
 * site — меню открытых страниц сайта (главная, рейтинг, новости, витамины): открывается и без входа.
 * Гостю сверху «Войти или создать аккаунт», вошедшему — «Личный кабинет».
 */
export function MenuButton({ items, label = "Меню", site }: { items: MenuItem[]; label?: string; site?: boolean }) {
  const { user } = useApp();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => setOpen(false);
  useOverlay(open, close, box);
  if (!user && !site) return null;
  const w = user ? whoOf(user) : null;
  const inProfile = path === "/profile";

  return (
    <>
      <button className="tburger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}>
        <I n="menu" /><span>{label}</span>
      </button>
      {open && createPortal(
        <div className="tmenu" id={id} role="dialog" aria-modal="true" aria-label="Меню" ref={box}>
          <div className="tmenu__top">
            <Brand dark />
            <button className="tburger" type="button" onClick={close} data-autofocus>
              <I n="x" /><span>Закрыть</span>
            </button>
          </div>

          {user && w ? (
            <Link className="tmenu__me" href={site ? homeOf(user) : "/profile"} onClick={close} aria-current={!site && inProfile ? "page" : undefined}>
              <i>{initials(user.name || user.email)}</i>
              <span><b>{w.name}</b><small>{w.role}</small></span>
              <em>{site ? "Личный кабинет" : "Профиль"}<I n="right" /></em>
            </Link>
          ) : (
            <Link className="tmenu__me tmenu__me--guest" href="/auth#login" onClick={close}>
              <i><I n="user" /></i>
              <span><b>Войти</b><small>или создать аккаунт, чтобы подать заявку</small></span>
              <em><I n="right" /></em>
            </Link>
          )}

          <nav className="tmenu__nav" aria-label="Разделы">
            {items.map((it) => (
              <Link key={it.href} href={it.href} aria-current={it.current ? "page" : undefined} onClick={(e) => (close(), jumpTo(e, it.href, 60))}>
                {it.icon && <span className="tmenu__ico"><I n={it.icon} /></span>}
                <span className="tmenu__txt"><b>{it.label}</b><small>{it.hint}</small></span>
                {it.n != null && <span className="tmenu__n">{it.n}</span>}
              </Link>
            ))}
          </nav>

          <div className="tmenu__lang"><span>Язык · Тіл</span><LangSwitch /></div>
          {user && <p className="tmenu__foot"><I n="lock" />Выйти из аккаунта и сменить пароль можно в профиле.</p>}
        </div>,
        document.body, // шапка «липкая» и держит свой слой: меню должно лежать поверх всей страницы
      )}
    </>
  );
}
