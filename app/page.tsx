"use client";
// ТЕСТ новой витрины витаминов: 3D-банки, которые листаются с анимацией, огромные слова за банкой,
// внизу — кнопка, мини-банки для переключения и рекламный ролик справа: по нажатию он плавно раскрывается,
// а всё остальное темнеет и отъезжает влево. Ниже — всё, что есть на нынешней странице /vitamins:
// цитата Айтыма, карточки продуктов с составом, как принимать, доставка, где купить, и футер сайта.
// На основную страницу /vitamins пока ничего не ставим.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SiteHeader, SiteFooter } from "@/components/Headers";
import { I } from "@/components/Icons";
import { Jar, type JarId } from "@/components/Jar";
import { Jars3D, type JarSpec, type JarsControl } from "@/components/Jars3D";
import { VideoPlayer, type PlayerHandle } from "@/components/Media";

const SHOP = "https://janamenhealth.kz/";
/**
 * Рекламный ролик Jana Men Health — фрагмент выпуска Айтыма на YouTube (47:03.1–47:49.4), сжат для сайта.
 * Два размера: 1080p для больших и чётких экранов, 720p для телефонов и обычных ноутбуков (вдвое легче).
 */
const AD = { hd: "/vitamins3d/ad.mp4", sd: "/vitamins3d/ad-720.mp4", poster: "/vitamins3d/ad-poster.webp", length: "0:46", seconds: 46.3 };
const adSrc = () => (Math.min(1120, window.innerWidth) * (window.devicePixelRatio || 1) > 1400 ? AD.hd : AD.sd);
const PHONE = "+7 747 5000 333";
const WA = "https://wa.me/77475000333";
const IG = "https://www.instagram.com/janamen.health/";

type P = {
  id: JarId; words: [string, string]; ring: string; lead: string; name: string; count: string; url: string;
  glow: string;
  /** для карточки в каталоге — как на нынешней странице /vitamins (данные janamenhealth.kz) */
  full: string; about: string; tags: string[]; parts: [string, string][];
};
const PRODUCTS: P[] = [
  {
    id: "men", words: ["Энергия", "Тонус"], ring: "для мужчин", name: "Комплекс для мужчин", count: "30 таблеток",
    lead: "Витамины и минералы, подобранные для мужчин: энергия на весь день, иммунитет и выносливость.",
    url: "https://janamenhealth.kz/lp/men", glow: "255 138 0",
    full: "Комплекс витаминов для мужчин",
    about: "Витамины и минералы, подобранные для мужчин: чтобы организм был в тонусе.",
    tags: ["Энергия", "Мужское здоровье", "Иммунитет", "Выносливость"],
    parts: [["A", "зрение, кожа, иммунитет"], ["Zn", "уровень тестостерона"], ["I", "работа щитовидной железы"], ["D3", "кости и сердце"], ["C", "иммунитет и коллаген"], ["B", "обмен веществ и нервная система"], ["E", "антиоксидант"], ["Cr", "защита клеток"]],
  },
  {
    id: "women", words: ["Баланс", "Красота"], ring: "для женщин", name: "Комплекс для женщин", count: "30 капсул",
    lead: "Витамины и минералы для женщин: гормональный баланс, здоровая кожа и энергия.",
    url: "https://janamenhealth.kz/lp/women", glow: "214 70 140",
    full: "Комплекс витаминов для женщин",
    about: "Витамины и минералы для женщин: чтобы поддерживать гормональный баланс.",
    tags: ["Энергия", "Женское здоровье", "Иммунитет", "Здоровая кожа"],
    parts: [["A", "зрение, кожа, иммунитет"], ["Zn", "гормональный баланс"], ["I", "работа щитовидной железы"], ["Cr", "меньше тяги к сладкому"], ["D3", "кости и сердце"], ["C", "иммунитет и коллаген"], ["B", "обмен веществ и нервная система"], ["E", "антиоксидант"]],
  },
  {
    id: "omega", words: ["Фокус", "Сердце"], ring: "50 капсул", name: "Омега-3", count: "50 капсул",
    lead: "Незаменимые жирные кислоты для мозга, сердца, суставов и концентрации.",
    url: "https://janamenhealth.kz/lp/omega", glow: "40 120 230",
    full: "Омега-3",
    about: "Незаменимые жирные кислоты для сердца, мозга и иммунитета.",
    tags: ["Работа мозга", "Здоровые суставы", "Концентрация", "Иммунитет"],
    parts: [["EPA", "снижает воспаление"], ["DHA", "мозг, зрение, нервная система"], ["E", "антиоксидант"]],
  },
];
// пропорции развёрнутых этикеток (высота / ширина текстуры) и где этикетка по высоте банки
const JARS: JarSpec[] = [
  { id: "men", label: "/vitamins3d/label-men.webp", labelAspect: 652 / 2048, labelY: 1.33, glow: "#ff8a00" },
  { id: "women", label: "/vitamins3d/label-women.webp", labelAspect: 678 / 2048, labelY: 1.33, glow: "#d6468c" },
  { id: "omega", label: "/vitamins3d/label-omega.webp", labelAspect: 717 / 2048, labelY: 1.37, glow: "#2878e6" },
];

export default function Vitamins3DPage() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const jars = useRef<JarsControl | null>(null);
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState(false);
  const p = PRODUCTS[i];
  // слова и кольцо с подписью меняются вместе: кольцо привязано к словам и всегда стоит над ними, не на буквах
  const words = useSwap(p.id, { words: p.words, ring: p.ring }, 700);
  const [swapped, setSwapped] = useState(false); // первый показ — без ожидания, дальше новые слова ждут старые
  useEffect(() => {
    if (i !== 0 || swapped) setSwapped(true);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const leads = useSwap(p.id, p.lead, 450);
  const names = useSwap(p.id, `${p.name} · ${p.count}`, 400);

  const go = useCallback((n: number, d?: number) => {
    const next = (n + PRODUCTS.length) % PRODUCTS.length;
    setI((cur) => {
      if (next === cur) return cur;
      setDir(d ?? (next > cur ? 1 : -1));
      return next;
    });
  }, []);

  // стрелки на клавиатуре
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (video || (e.target instanceof Element && e.target.closest("input, textarea, select"))) return;
      if (e.key === "ArrowRight") go(i + 1, 1);
      if (e.key === "ArrowLeft") go(i - 1, -1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [i, go, video]);

  // свайп по сцене: банка идёт ровно за пальцем (без перерисовки страницы — напрямую в 3D),
  // отпустил дальше 60px или резко смахнул — банка улетает с той же скоростью, новая прилетает с другой стороны;
  // короткий свайп — банка мягко возвращается на место
  const sw = useRef<{ x: number; y: number; id: number; on: boolean; pts: [number, number][] } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (video || (e.target as HTMLElement).closest("a, button")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    sw.current = { x: e.clientX, y: e.clientY, id: e.pointerId, on: false, pts: [[e.clientX, e.timeStamp]] };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = sw.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.on) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) return void (sw.current = null); // это прокрутка страницы
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        s.on = true;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    }
    if (!s.on) return;
    s.pts.push([e.clientX, e.timeStamp]);
    if (s.pts.length > 8) s.pts.shift();
    jars.current?.drag(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    const s = sw.current;
    sw.current = null;
    if (!s?.on) return;
    const dx = e.clientX - s.x;
    // скорость за последние ~100 мс движения; если браузер склеил события (одно время у всех) — средняя за весь жест
    const last = s.pts[s.pts.length - 1];
    const first = s.pts.find((q) => last[1] - q[1] <= 100) ?? s.pts[0];
    const span = last[1] - first[1], total = e.timeStamp - s.pts[0][1];
    const v = span >= 30 ? (last[0] - first[0]) / span : total > 0 ? dx / total : 0;
    const next = dx < -60 || (dx < -20 && v < -0.45);
    const prev = dx > 60 || (dx > 20 && v > 0.45);
    if (e.type === "pointercancel" || (!next && !prev)) return jars.current?.release(null);
    jars.current?.release(v);
    if (next) go(i + 1, 1);
    else go(i - 1, -1);
  };

  return (
    <>
      <SiteHeader here="vitamins" />
      <main id="main" className="v3page">
      <div className={`v3${video ? " is-video" : ""}${ready ? " is-ready" : ""}`}>
        {/* свечение цвета банки: три слоя, плавно сменяют друг друга (градиент сам по себе плавно не меняется) */}
        <div className="v3__glows" aria-hidden="true">
          {PRODUCTS.map((x, n) => <span key={x.id} className={`v3__glow${n === i ? " is-on" : ""}`} style={{ ["--glow" as string]: x.glow }} />)}
        </div>
        <section
          className="v3__stage"
          aria-roledescription="карусель"
          aria-label="Витамины Jana Men"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="v3__scene">
            <p className="v3__top"><span className="v3__stars" aria-hidden="true">★★★★★</span>Japan quality</p>

            <h1 className={`v3__words${swapped ? " is-swapping" : ""}`} aria-live="polite">
              <span className="sr-only">{p.name}: </span>
              {words.map((it) => (
                <span key={it.key} className={`v3__set${it.out ? " is-out" : ""}`} aria-hidden={it.out || undefined}>
                  {it.value.words.map((w, n) => <Word key={n} text={w} line={n} />)}
                  <Ring text={it.value.ring} />
                </span>
              ))}
            </h1>

            <Jars3D jars={JARS} index={i} dir={dir} control={jars} className="v3__canvas" onReady={() => setReady(true)} />

            {leads.map((it) => <p key={it.key} className={`v3__lead${it.out ? " is-out" : ""}`} aria-hidden={it.out || undefined}>{it.value}</p>)}

            <div className="v3__bar">
              <div className="v3__buy">
                <a className="btn btn--orange btn--lg" href={p.url} target="_blank" rel="noopener noreferrer"><span>Купить</span><I n="external" /></a>
                <span className="v3__note"><b>Бесплатно</b>доставка по Казахстану</span>
              </div>

              <div className="v3__pick" role="tablist" aria-label="Выбрать витамины">
                <div className="v3__thumbs">
                  {PRODUCTS.map((x, n) => (
                    <button
                      key={x.id} type="button" role="tab" aria-selected={n === i} aria-label={x.name}
                      className={`v3__thumb${n === i ? " is-on" : ""}`} onClick={() => go(n)}
                    >
                      <Jar id={x.id} className="v3__mini" />
                    </button>
                  ))}
                </div>
                <span className="v3__names">
                  {names.map((it) => <span key={it.key} className={`v3__name${it.out ? " is-out" : ""}`} aria-hidden={it.out || undefined}>{it.value}</span>)}
                </span>
              </div>

              <VideoCard open={video} onOpen={() => setVideo(true)} onClose={() => setVideo(false)} />
            </div>

            <button type="button" className="v3__arrow v3__arrow--prev" onClick={() => go(i - 1, -1)} aria-label="Предыдущие витамины"><I n="left" /></button>
            <button type="button" className="v3__arrow v3__arrow--next" onClick={() => go(i + 1, 1)} aria-label="Следующие витамины"><I n="right" /></button>
          </div>
        </section>
      </div>
      {/* косой край тёмной витрины — переход к светлому каталогу, как косые плоскости на других страницах */}
      <div className="v3__edge" aria-hidden="true" />

      <Catalog
        current={i}
        onShow={(n) => {
          go(n);
          window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        }}
      />
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Под 3D-витриной — всё, что есть на нынешней странице витаминов: цитата Айтыма, карточки продуктов
 * с составом, как принимать, доставка и где купить. «Смотреть в 3D» поднимает к витрине и показывает эту банку.
 */
function Catalog({ current, onShow }: { current: number; onShow: (n: number) => void }) {
  return (
    <section className="section section--tight v3cat" aria-labelledby="v3cat-title">
      <div className="wrap">
        <figure className="vquote">
          <blockquote>
            Как тренер, я видел, как усталость и стресс мешают людям раскрыть свой потенциал. Поэтому и появился JANAMEN — чтобы возвращать энергию и уверенность.
          </blockquote>
          <figcaption>Айтым Жакупов, основатель бренда</figcaption>
        </figure>

        <h2 className="h2 v3cat__title" id="v3cat-title">Что есть в каталоге</h2>
        <ul className="vgrid">
          {PRODUCTS.map((x, n) => (
            <li key={x.id} className={`vcard vcard--${x.id}${n === current ? " is-current" : ""}`}>
              <div className="vcard__img">
                <Jar id={x.id} alt={x.full} lazy className="vcard__jar" />
                <button type="button" className="v3cat__3d" onClick={() => onShow(n)}><I n="sparkle" /><span>Смотреть в 3D</span></button>
              </div>
              <div className="vcard__body">
                <h3>{x.full}</h3>
                <p>{x.about}</p>
                <ul className="vtags">{x.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                <dl className="vparts">
                  {x.parts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
                <a className="btn btn--orange btn--sm" href={x.url} target="_blank" rel="noopener noreferrer"><span>Подробнее и купить</span><I n="external" /></a>
              </div>
            </li>
          ))}
        </ul>

        <div className="vinfo">
          <div>
            <h3><I n="clock" />Как принимать</h3>
            <p>По одной таблетке в день, сразу после еды, запивая водой — лучше в одно и то же время. Курс — от 30 дней, повторять можно через 2–3 месяца.</p>
          </div>
          <div>
            <h3><I n="send" />Доставка</h3>
            <p>По Казахстану — бесплатно. Отправляют и в СНГ, и в другие страны: цену и сроки называет менеджер при заказе. Заказ собирают за один рабочий день.</p>
          </div>
          <div>
            <h3><I n="alert" />Важно</h3>
            <p>БАД не является лекарственным средством. Если у тебя диабет, гипертония, болезни сердца или ты принимаешь лекарства — сначала посоветуйся с врачом.</p>
          </div>
        </div>

        <div className="vbuy">
          <div>
            <h2 className="h2">Купить или задать вопрос</h2>
            <p>Заказ оформляется на сайте бренда. Там же цены, полный состав и акции — например, скидка 10% на два комплекса для пары.</p>
          </div>
          <div className="vbuy__acts">
            <a className="btn btn--lg" href={SHOP} target="_blank" rel="noopener noreferrer"><span>janamenhealth.kz</span><I n="external" /></a>
            <a className="btn btn--paper" href={WA} target="_blank" rel="noopener noreferrer"><I n="message" /><span>WhatsApp {PHONE}</span></a>
            <a className="btn btn--paper" href={IG} target="_blank" rel="noopener noreferrer"><I n="camera" /><span>@janamen.health</span></a>
          </div>
        </div>

        <p className="rfine">
          Описание продуктов — с сайта janamenhealth.kz. Jana Jol не продаёт витамины и не принимает оплату: покупка и доставка — на сайте бренда.
        </p>
      </div>
    </section>
  );
}

/**
 * Плавная смена: пока новое появляется, старое ещё на месте и уходит своей анимацией (класс is-out),
 * потом убирается. Так слова и подписи не «прыгают».
 */
function useSwap<T>(key: string, value: T, ms: number) {
  const [items, setItems] = useState<{ key: string; value: T; out: boolean }[]>([{ key, value, out: false }]);
  const last = useRef(key);
  useEffect(() => {
    if (last.current === key) return;
    last.current = key;
    setItems((list) => [...list.filter((x) => x.key !== key).map((x) => ({ ...x, out: true })), { key, value, out: false }]);
    const t = setTimeout(() => setItems((list) => list.filter((x) => !x.out)), ms);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

/** Слово за банкой: буквы выезжают снизу по очереди (как в референсе), при смене — уезжают вверх. */
function Word({ text, line }: { text: string; line: number }) {
  return (
    <span className={`v3__line v3__line--${line}`} aria-hidden="false">
      {[...text.toUpperCase()].map((ch, k) => (
        <span key={k} className="v3__ch" style={{ ["--d" as string]: `${line * 60 + k * 30}ms` }}>{ch}</span>
      ))}
    </span>
  );
}

/** «Нарисованное от руки» кольцо с надписью — рисуется заново при каждой смене банки. */
function Ring({ text }: { text: string }) {
  return (
    <span className="v3__ring" aria-hidden="true">
      <svg viewBox="0 0 200 110">
        <path d="M150 14 C 110 0, 30 8, 14 46 C 2 78, 60 104, 118 98 C 170 92, 196 64, 186 38 C 178 18, 140 8, 96 12" pathLength={1} />
      </svg>
      <span>{text}</span>
    </span>
  );
}

/**
 * Карточка ролика справа внизу. По нажатию раскрывается из своего места в большой плеер по центру (FLIP),
 * сцена за ним темнеет и отъезжает влево. Место карточки меряем в момент нажатия — до того, как сцена
 * начала сдвигаться, поэтому окно стартует ровно с карточки и ничего не «прыгает». Закрывается туда же.
 * Форма тоже перетекает: у карточки косые края, у плеера прямые — скос плавно растёт и убывает вместе
 * с размером (clip-path), поэтому в конце закрытия плеер уже точно такой же формы, как карточка.
 */
function VideoCard({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  const card = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const from = useRef<DOMRect | null>(null);
  const player = useRef<PlayerHandle | null>(null);
  const src = useRef(AD.sd); // размер ролика выбираем один раз при открытии (поворот экрана не перезагружает видео)
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  // live — видео уже играет и видно; до этого (и при закрытии) виден тот же кадр, что на карточке
  const [live, setLive] = useState(false);
  // settled — плеер уже раскрылся: только тогда показываем панель управления (во время роста она бы мелькала)
  const [settled, setSettled] = useState(false);
  const vid = () => box.current?.querySelector("video") ?? null;
  const MS = 700;
  const SLANT = 14; // скос краёв карточки, px (как в CSS .v3__vcard)

  const start = () => {
    from.current = card.current?.getBoundingClientRect() || null;
    src.current = adSrc();
    setPhase("open");
    onOpen();
  };
  const stop = useCallback(() => {
    setPhase((ph) => (ph === "open" ? "closing" : ph));
    onClose();
  }, [onClose]);

  // снаружи закрыли (например, Esc на странице) — тоже уезжаем на место
  useEffect(() => {
    if (!open && phase === "open") setPhase("closing");
  }, [open, phase]);

  /** положение и форма карточки в координатах плеера: сдвиг + масштаб и скос краёв (у карточки он SLANT px) */
  const flip = (b: HTMLDivElement) => {
    const f = from.current;
    if (!f) return { transform: "", clip: "" };
    const to = b.getBoundingClientRect();
    const k = to.width / f.width; // скос в пикселях плеера, который после уменьшения станет SLANT px
    return {
      transform: `translate(${f.left - to.left}px, ${f.top - to.top}px) scale(${f.width / to.width}, ${f.height / to.height})`,
      clip: `polygon(${SLANT * k}px 0, 100% 0, calc(100% - ${SLANT * k}px) 100%, 0 100%)`,
    };
  };

  useLayoutEffect(() => {
    const b = box.current;
    const c = b?.querySelector<HTMLElement>(".v3v__clip");
    if (!b || !c) return;
    if (phase === "open") {
      const st = flip(b);
      b.style.transition = c.style.transition = "none";
      b.style.transform = st.transform;
      c.style.clipPath = st.clip;
      void b.offsetWidth; // зафиксировать стартовое положение до анимации
      b.style.transition = c.style.transition = "";
      b.style.transform = "";
      c.style.clipPath = "";
      // запускаем ролик сразу, ещё в обработчике нажатия: так браузер (и iPhone) разрешает звук.
      // Пока окно растёт, виден кадр с карточки, видео проявляется поверх, как только пошли кадры.
      const v = vid();
      const onPlaying = () => setLive(true);
      v?.addEventListener("playing", onPlaying);
      player.current?.seek(0, true);
      const t = setTimeout(() => setSettled(true), MS);
      return () => {
        clearTimeout(t);
        v?.removeEventListener("playing", onPlaying);
      };
    } else if (phase === "closing") {
      // ролик на паузу и плавно уходит в тот же кадр, что на карточке, — окно садится на место карточки
      vid()?.pause();
      setLive(false);
      setSettled(false);
      const st = flip(b);
      b.style.transform = st.transform;
      c.style.clipPath = st.clip;
      // убираем окно ровно когда оно село на карточку (конец анимации), таймер — на всякий случай
      const done = () => setPhase("closed");
      const onEnd = (e: TransitionEvent) => e.target === b && e.propertyName === "transform" && done();
      b.addEventListener("transitionend", onEnd);
      const t = setTimeout(done, MS + 300);
      return () => {
        clearTimeout(t);
        b.removeEventListener("transitionend", onEnd);
      };
    }
  }, [phase]);

  // пока ролик открыт: Esc закрывает, страница под ним не листается
  useEffect(() => {
    if (phase !== "open") return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && stop();
    window.addEventListener("keydown", on);
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    box.current?.querySelector<HTMLButtonElement>(".v3v__x")?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", on);
      html.style.overflow = prev;
    };
  }, [phase, stop]);

  return (
    <div className="v3__video">
      <button ref={card} type="button" className={`v3__vcard${phase !== "closed" ? " is-hidden" : ""}`} onClick={start} aria-label={`Смотреть рекламный ролик Jana Men Health, ${AD.length}`}>
        <img className="v3__still" src={AD.poster} alt="" />
        <span className="v3__play" aria-hidden="true"><I n="play" fill /></span>
        <span className="v3__len" aria-hidden="true">{AD.length}</span>
      </button>
      <span className="v3__vcap">Смотреть ролик</span>

      {phase !== "closed" && createPortal(
        <div className={`v3v${phase === "open" ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Рекламный ролик Jana Men Health">
          <div className="v3v__dim" onClick={stop} />
          <div className="v3v__box" ref={box}>
            {/* тень отдельно: clip-path обрезал бы её вместе с краями */}
            <span className="v3v__shadow" aria-hidden="true" />
            <div className="v3v__clip">
              <img className="v3__still" src={AD.poster} alt="" />
              <VideoPlayer
                src={src.current} duration={AD.seconds} handle={player} label="Рекламный ролик Jana Men Health"
                className={`v3v__vp${live ? " is-live" : ""}${settled ? " is-settled" : ""}`}
              />
              <button type="button" className="v3v__x" onClick={stop} aria-label="Закрыть ролик"><I n="x" /></button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
