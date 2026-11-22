"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, homeOf, type User } from "@/lib/api";
import { useApp, LangSwitch } from "./Providers";
import { MenuButton, ProfileChip, jumpTo, scrollToY, type MenuItem } from "./Menu";
import { I } from "./Icons";
import { Socials } from "./Socials";

/** Логотип. Всегда ведёт на главную страницу сайта — и у заявителей, и у команды — и открывает её с самого верха. */
export function Brand({ dark }: { dark?: boolean }) {
  return (
    <Link
      className="brand"
      href="/"
      aria-label="Jana Men — на главную страницу сайта"
      scroll={false} // сами ставим страницу наверх: прокрутка Next уводила шапку под верхний край на ~76 px
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (window.location.pathname === "/") {
          // уже на главной (например, на /#faq) — просто наверх и без якоря в адресе
          e.preventDefault();
          if (window.location.hash) history.replaceState(history.state, "", "/");
          scrollToY(0);
        } else {
          try {
            sessionStorage.setItem("jj-top", "1");
          } catch {}
        }
      }}
    >
      <img src={dark ? "/brand/janamen-logo-on-dark.svg" : "/brand/janamen-logo.svg"} alt="Jana Men" width={101} height={59} />
    </Link>
  );
}

/** Разделы кабинета заявителя — одинаковые в шапке на компьютере и в меню на телефоне. */
export function applicantItems(path: string): MenuItem[] {
  return [
    { href: "/status", label: "Моя заявка", hint: "статус и сообщения от команды", icon: "file", current: path === "/status" },
    { href: "/chat", label: "Разговор с Айтымом", hint: "рассказать о себе голосом", icon: "mic", current: path === "/chat" },
    { href: "/apply", label: "Анкета", hint: "заполнить или поправить ответы", icon: "pen", current: path === "/apply" },
    { href: "/", label: "О программе", hint: "главная страница сайта", icon: "right", current: path === "/" },
  ];
}

/**
 * Шапка страниц заявителя. Вошёл — справа «Моя заявка» и карточка профиля (на телефоне — одна кнопка «Меню»).
 * Выхода в шапке нет: он в профиле, чтобы не нажать случайно.
 */
export function AppHeader({ save, right, wide }: { save?: string | null; right?: React.ReactNode; wide?: boolean }) {
  const { user } = useApp();
  const path = usePathname();
  const team = user?.role === "team";
  return (
    <header className="site-header app-header">
      <div className="wrap site-header__in" style={wide ? { maxWidth: "none" } : undefined}>
        <Brand />
        {save && (
          <span className="save-state">
            <I n="check" />
            <span>{save}</span>
          </span>
        )}
        <div className="header-actions">
          <LangSwitch />
          {right}
          {user && (
            <>
              {path !== "/status" && path !== "/team" && (
                <Link className="app-home" href={homeOf(user)}>
                  <I n={team ? "list" : "file"} /><span>{team ? "Заявки" : "Моя заявка"}</span>
                </Link>
              )}
              <ProfileChip here={path === "/profile"} />
              <MenuButton items={team ? [{ href: "/team", label: "Очередь заявок", hint: "вернуться к работе", icon: "list" }] : applicantItems(path)} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export type SitePage = "home" | "rating" | "news" | "vitamins" | "partners";

/** Разделы открытой части сайта — один и тот же набор на главной, в рейтинге, новостях и витаминах. */
function siteItems(here: SitePage | undefined, t: (k: string, ru: string) => string): MenuItem[] {
  return [
    { href: "https://janajol.online/#how", label: t("nav.how", "Как подать заявку"), hint: t("nav.how.hint", "два пути: разговор с Айтымом или анкета"), icon: "pen" },
    { href: "https://janajol.online/#program", label: t("nav.program", "О программе"), hint: t("nav.program.hint", "что такое Jana Men"), icon: "users" },
    { href: "/rating", label: t("nav.rating", "Рейтинг"), hint: t("nav.rating.hint", "кто сколько сбросил"), icon: "trophy", current: here === "rating" },
    { href: "/news", label: t("nav.news", "Новости"), hint: t("nav.news.hint", "посты проекта из Instagram"), icon: "camera", current: here === "news" },
    { href: "/vitamins", label: t("nav.vitamins", "Витамины"), hint: t("nav.vitamins.hint", "витамины Jana Men Health"), icon: "sparkle", current: here === "vitamins" },
    { href: "/partners", label: t("nav.partners", "Партнёры"), hint: t("nav.partners.hint", "кто поддерживает проект и как стать партнёром"), icon: "users", current: here === "partners" },
    { href: "https://janajol.online/#faq", label: t("nav.faq", "Вопросы"), hint: t("nav.faq.hint", "ответы на частые вопросы"), icon: "message" },
  ];
}

/**
 * Шапка открытых страниц: главная, рейтинг, новости, витамины. Разделы одни и те же на всех этих страницах
 * и не прыгают; текущий подчёркнут. Справа язык и «Личный кабинет» (гостю «Войти»).
 * На телефоне и узком ноутбуке разделы уходят в «Меню», оно открывается и без входа.
 */
export function SiteHeader({ here }: { here?: SitePage }) {
  const { user, t } = useApp();
  const cabinet = user ? homeOf(user) : "/auth#login";
  const items = siteItems(here, t);
  return (
    <header className="site-header site-header--site">
      <div className="wrap site-header__in">
        <Brand />
        <nav className="nav" aria-label="Разделы">
          {items.map((it) => (
            <Link key={it.href} href={it.href} aria-current={it.current ? "page" : undefined} onClick={(e) => jumpTo(e, it.href)}>{it.label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <LangSwitch />
          <Link className={`btn ${user ? "btn--orange" : "btn--concrete"} btn--sm keep site-cabinet`} href={cabinet}>
            {user && <I n="user" />}
            <span>{user ? t("nav.cabinet", "Личный кабинет") : t("login", "Войти")}</span>
          </Link>
          <MenuButton items={items} site />
        </div>
      </div>
    </header>
  );
}

/** Ссылки «Рейтинг · Новости» для телефона, где пункты .nav спрятаны. */
export function SubNav({ here }: { here: "rating" | "news" | "vitamins" | "partners" }) {
  return (
    <nav className="subnav wrap" aria-label="Разделы о проекте">
      <Link href="/rating" aria-current={here === "rating" ? "page" : undefined}><I n="trophy" />Рейтинг</Link>
      <Link href="/news" aria-current={here === "news" ? "page" : undefined}><I n="camera" />Новости</Link>
      <Link href="/vitamins" aria-current={here === "vitamins" ? "page" : undefined}><I n="sparkle" />Витамины</Link>
      <Link href="/partners" aria-current={here === "partners" ? "page" : undefined}><I n="users" />Партнёры</Link>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__in">
        <img src="/brand/janamen-logo-on-dark.svg" alt="Jana Men" width={101} height={59} loading="lazy" />
        <p style={{ maxWidth: "44ch", margin: 0 }}>
          Jana Jol — платформа заявок программы Jana Men. Здесь люди рассказывают свою историю, а команда видит, кому помощь нужна в первую очередь.
        </p>
        <nav aria-label="Ссылки">
          <Link href="/rating">Рейтинг участников</Link>
          <Link href="/news">Новости</Link>
          <Link href="/vitamins">Витамины Jana Men</Link>
          <Link href="/partners">Партнёры</Link>
          <Link href="/status">Статус заявки</Link>
          <Link href="/auth?team=1#login">Вход для команды</Link>
        </nav>
        <div className="site-footer__social">
          <p className="site-footer__h">Официальные аккаунты</p>
          <Socials className="socials--footer" />
        </div>
      </div>
    </footer>
  );
}

/** Выход из аккаунта (только со страницы профиля). */
export function useLogout() {
  return async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    try {
      sessionStorage.removeItem("jj-feed-place");
    } catch {}
    // полная загрузка главной: охрана страницы профиля не успеет отправить на «Вход»
    window.location.assign("/");
  };
}

/**
 * Охрана страниц: без входа — на страницу входа, чужая роль — в свой кабинет.
 * Вошёл по временному паролю — сначала в профиль придумать свой.
 */
export function useGuard(role: "applicant" | "team" | "any", next?: string): User | null {
  const { user } = useApp();
  const router = useRouter();
  const path = usePathname();
  const wrong = !!user && role !== "any" && user.role !== role;
  const locked = !!user && !!user.mustChange && path !== "/profile";
  useEffect(() => {
    if (user === undefined) return;
    if (!user) router.replace(role === "team" ? "/auth?team=1#login" : `/auth${next ? `?next=${next}` : role === "any" ? "#login" : ""}`);
    else if (locked || wrong) router.replace(homeOf(user));
  }, [user, role, next, router, locked, wrong]);
  return user && !wrong && !locked ? user : null;
}

export function Loading({ text = "Загружаем…" }: { text?: string }) {
  return <div className="loading-page">{text}</div>;
}
