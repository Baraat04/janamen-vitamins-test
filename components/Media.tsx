"use client";
// Видео и фото заявки в стиле платформы — одинаково у заявителя в анкете и у команды в карточке.
// VideoPlayer: своя панель (пуск, время, звук, полный экран), ползунок плавно идёт за пальцем или курсором,
// при наведении — кадр-предпросмотр (только мышью, без лагов: один запрос кадра за раз).
// PhotoViewer: фото открываются поверх страницы, листаются стрелками и свайпом, никуда не уводят.
import { useCallback, useEffect, useRef, useState } from "react";
import { I } from "@/components/Icons";
import { dur } from "@/lib/format";

export type PlayerHandle = { seek: (t: number, play?: boolean) => void; toggle: () => void; el: HTMLDivElement | null };
export type Marker = { t: number; label: string };

type FsDoc = Document & { webkitFullscreenElement?: Element };
type FsVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitDisplayingFullscreen?: boolean };
const fsElement = () => document.fullscreenElement || (document as FsDoc).webkitFullscreenElement || null;

export function VideoPlayer({
  src, duration, markers, label = "Видео", handle, className,
}: {
  src: string;
  /** длительность с сервера — показываем сразу, до загрузки видео */
  duration?: number | null;
  markers?: Marker[];
  label?: string;
  handle?: React.MutableRefObject<PlayerHandle | null>;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(duration || 0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [idle, setIdle] = useState(false);
  const [scrub, setScrub] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ wasPlaying: boolean; t: number; raf: number } | null>(null);
  const total = length || duration || 0;

  /** Положение ползунка рисуем напрямую (без перерисовки React) — так он идёт за пальцем плавно. */
  const paint = useCallback((t: number) => {
    const p = total ? Math.min(1, Math.max(0, t / total)) : 0;
    if (fill.current) fill.current.style.transform = `scaleX(${p})`;
    if (knob.current) knob.current.style.left = `${p * 100}%`;
  }, [total]);

  // пока играет — ползунок обновляется каждый кадр, а не 4 раза в секунду
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      const v = video.current;
      if (v && !drag.current) paint(v.currentTime);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, paint]);
  useEffect(() => paint(time), [time, paint]);

  // панель прячется, пока видео играет и никто не трогает
  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2600);
  }, []);
  useEffect(() => () => void (idleTimer.current && clearTimeout(idleTimer.current)), []);

  useEffect(() => {
    const on = () => setFull(fsElement() === box.current);
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      document.removeEventListener("webkitfullscreenchange", on);
    };
  }, []);

  const play = () => {
    const v = video.current;
    if (!v) return;
    setStarted(true);
    v.play().catch(() => {});
  };
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) play();
    else v.pause();
    wake();
  };
  const seekTo = (t: number) => {
    const v = video.current;
    if (!v) return;
    const max = (Number.isFinite(v.duration) ? v.duration : total) || 0;
    const x = Math.max(0, Math.min(t, max ? max - 0.05 : t));
    v.currentTime = x;
    setTime(x);
    paint(x);
  };

  if (handle) {
    handle.current = {
      el: box.current,
      toggle,
      seek: (t, andPlay = true) => {
        seekTo(t);
        if (andPlay) play();
        wake();
      },
    };
  }

  const fullscreen = async () => {
    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = video.current as FsVideo | null;
    if (!el || !v) return;
    if (fsElement()) {
      await (document.exitFullscreen?.() || Promise.resolve()).catch(() => {});
      return;
    }
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" }).catch(() => v.webkitEnterFullscreen?.());
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v.webkitEnterFullscreen?.(); // iPhone: полный экран есть только у самого видео
  };

  // ---- ползунок: тянуть пальцем или мышью, отпустил — продолжает с этого места
  const tAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return total * Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".vp__mark")) return;
    const v = video.current;
    if (!v || !total) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = tAt(e.clientX);
    drag.current = { wasPlaying: !v.paused, t, raf: 0 };
    v.pause();
    setScrub(true);
    setStarted(true);
    paint(t);
    setTime(t);
    v.currentTime = t;
    wake();
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) {
      const t = tAt(e.clientX);
      d.t = t;
      paint(t);
      setTime(t);
      // кадр под пальцем: не чаще одного раза за кадр экрана и только когда прошлый уже показан
      if (!d.raf)
        d.raf = requestAnimationFrame(() => {
          const v = video.current;
          if (drag.current) drag.current.raf = 0;
          if (!v || v.seeking) return;
          const fv = v as HTMLVideoElement & { fastSeek?: (t: number) => void };
          if (fv.fastSeek) fv.fastSeek(d.t);
          else v.currentTime = d.t;
        });
    }
    if (e.pointerType === "mouse") {
      const r = track.current!.getBoundingClientRect();
      setHover({ x: Math.min(r.width, Math.max(0, e.clientX - r.left)), t: tAt(e.clientX) });
    }
  };
  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    if (d.raf) cancelAnimationFrame(d.raf);
    drag.current = null;
    setScrub(false);
    seekTo(d.t);
    if (d.wasPlaying) play();
    wake();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const v = video.current;
    if (!v) return;
    const k = e.key;
    if (k === " " || k === "k" || k === "K") toggle();
    else if (k === "ArrowRight") seekTo(v.currentTime + 5);
    else if (k === "ArrowLeft") seekTo(v.currentTime - 5);
    else if (k === "f" || k === "F") void fullscreen();
    else if (k === "m" || k === "M") (v.muted = !v.muted), setMuted(v.muted);
    else return;
    e.preventDefault();
    wake();
  };

  const showBar = !playing || !idle || scrub || !!hover;
  return (
    <div
      ref={box}
      className={`vp${full ? " is-full" : ""}${showBar ? "" : " is-idle"}${scrub ? " is-scrub" : ""}${className ? " " + className : ""}`}
      onPointerMove={(e) => e.pointerType === "mouse" && wake()}
      onTouchStart={wake}
      onKeyDown={onKey}
      tabIndex={-1}
      role="group"
      aria-label={label}
    >
      <video
        ref={video}
        // #t=0.1 — iPhone без этого до нажатия показывает чёрный экран вместо первого кадра
        src={`${src}#t=0.1`}
        preload="metadata"
        playsInline
        onClick={toggle}
        onPlay={() => (setPlaying(true), setStarted(true), wake())}
        onPause={() => (setPlaying(false), setIdle(false))}
        onEnded={() => (setPlaying(false), setIdle(false))}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onTimeUpdate={(e) => !drag.current && setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setLength(e.currentTarget.duration)}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setLength(e.currentTarget.duration)}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (v.buffered.length && Number.isFinite(v.duration)) setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration);
        }}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        onError={() => setFailed(true)}
      />

      {failed ? (
        <div className="vp__fail"><I n="alert" /><b>Видео не открылось</b><span>Обнови страницу. Если не поможет — загрузи видео ещё раз.</span></div>
      ) : (
        !playing && !scrub && (
          <button type="button" className={`vp__big${started ? " vp__big--small" : ""}`} onClick={toggle} aria-label={`Смотреть: ${label}`}>
            <I n="play" fill />
          </button>
        )
      )}
      {waiting && playing && <span className="vp__spin" aria-hidden="true" />}

      <div className="vp__bar" onPointerDown={(e) => e.stopPropagation()}>
        <div
          className="vp__track"
          ref={track}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
          role="slider"
          tabIndex={0}
          aria-label="Перемотка"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${dur(time)} / ${dur(total)}`}
        >
          <span className="vp__rail">
            <span className="vp__buf" style={{ transform: `scaleX(${buffered})` }} />
            <span className="vp__fill" ref={fill} />
          </span>
          {total > 0 && markers?.map((m, i) => (
            <button
              key={i} type="button" className="vp__mark" style={{ left: `${(m.t / total) * 100}%` }}
              title={`${dur(m.t)} — ${m.label}`} aria-label={`Перейти к ${dur(m.t)}: ${m.label}`}
              onClick={() => (seekTo(m.t), play())}
            />
          ))}
          <span className="vp__knob" ref={knob} />
          {hover && total > 0 && !scrub && <Preview src={src} t={hover.t} x={hover.x} width={track.current?.clientWidth || 0} />}
        </div>
        <div className="vp__row">
          <button type="button" className="vp__btn" onClick={toggle} aria-label={playing ? "Пауза" : "Смотреть"}>
            <I n={playing ? "pause" : "play"} fill />
          </button>
          <span className="vp__time num">{dur(time)} <i>/</i> {dur(total)}</span>
          <span className="vp__gap" />
          <button
            type="button" className="vp__btn" aria-label={muted ? "Включить звук" : "Выключить звук"}
            onClick={() => {
              const v = video.current;
              if (v) (v.muted = !v.muted), setMuted(v.muted);
            }}
          >
            <I n={muted ? "volume-off" : "volume"} />
          </button>
          <button type="button" className="vp__btn" onClick={fullscreen} aria-label={full ? "Выйти из полного экрана" : "На весь экран"}>
            <I n={full ? "shrink" : "expand"} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Кадр над ползунком при наведении мышью. Отдельное скрытое видео: просим следующий кадр, только когда прошлый уже пришёл,
 * — поэтому ничего не копится и не тормозит. Время показываем сразу, картинка догоняет.
 */
function Preview({ src, t, x, width }: { src: string; t: number; x: number; width: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pv = useRef<HTMLVideoElement | null>(null);
  const want = useRef(t);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  want.current = t;

  useEffect(() => {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "metadata";
    v.playsInline = true;
    v.src = src;
    pv.current = v;
    const draw = () => {
      const c = canvas.current;
      if (c && v.videoWidth) {
        const h = 90, w = Math.round((v.videoWidth / v.videoHeight) * h) || 160;
        if (c.width !== w) (c.width = w), (c.height = h);
        c.getContext("2d")?.drawImage(v, 0, 0, w, h);
        setReady(true);
      }
      busy.current = false;
      if (Math.abs(v.currentTime - want.current) > 0.4) ask();
    };
    const ask = () => {
      if (busy.current || !v.duration) return;
      busy.current = true;
      v.currentTime = want.current;
    };
    v.addEventListener("seeked", draw);
    v.addEventListener("loadedmetadata", ask);
    return () => {
      v.removeEventListener("seeked", draw);
      v.removeAttribute("src");
      v.load();
      pv.current = null;
    };
  }, [src]);

  useEffect(() => {
    const v = pv.current;
    if (v && !busy.current && v.duration && Math.abs(v.currentTime - t) > 0.4) {
      busy.current = true;
      v.currentTime = t;
    }
  }, [t]);

  const half = 80;
  const left = Math.min(Math.max(x, half), Math.max(half, width - half));
  return (
    <span className={`vp__pv${ready ? " has-img" : ""}`} style={{ left }} aria-hidden="true">
      <canvas ref={canvas} width={160} height={90} />
      <b className="num">{dur(t)}</b>
    </span>
  );
}

// ---------------------------------------------------------------- фото

export type Photo = { src: string; name: string };

/** Просмотр фото поверх страницы: стрелки, свайп, Esc. Если браузер не умеет формат (HEIC в Chrome) — предложим скачать. */
export function PhotoViewer({ photos, index, onClose, onIndex }: { photos: Photo[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const touch = useRef<{ x: number; y: number } | null>(null);
  const open = index != null && !!photos[index];
  const n = photos.length;
  const go = useCallback((d: number) => index != null && n > 1 && onIndex((index + d + n) % n), [index, n, onIndex]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const b = document.body.style;
    const prev = { position: b.position, top: b.top, left: b.left, right: b.right, overflow: b.overflow };
    Object.assign(b, { position: "fixed", top: `-${y}px`, left: "0", right: "0", overflow: "hidden" });
    return () => {
      Object.assign(b, prev);
      const html = document.documentElement;
      const sb = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      html.style.scrollBehavior = sb;
    };
  }, [open]);

  const p = open ? photos[index!] : null;
  return (
    <dialog
      ref={ref}
      className="pv"
      aria-label={p ? `Фото: ${p.name}` : "Фото"}
      onCancel={(e) => (e.preventDefault(), onClose())}
      onClose={() => open && onClose()}
      onKeyDown={(e) => (e.key === "ArrowRight" ? go(1) : e.key === "ArrowLeft" ? go(-1) : null)}
    >
      {p && (
        <div
          className="pv__stage"
          onClick={(e) => e.target === e.currentTarget && onClose()}
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const s = touch.current;
            touch.current = null;
            if (!s) return;
            const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
            else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) onClose();
          }}
        >
          {broken[p.src] ? (
            <div className="pv__fail">
              <I n="image" />
              <b>Браузер не показывает этот формат</b>
              <span>Скорее всего это HEIC с iPhone. Его можно скачать и открыть на телефоне или компьютере.</span>
              <a className="btn btn--orange btn--sm" href={p.src} download={p.name}><I n="upload" className="pv__down" /><span>Скачать фото</span></a>
            </div>
          ) : (
            <img key={p.src} className="pv__img" src={p.src} alt={p.name} onError={() => setBroken((b) => ({ ...b, [p.src]: true }))} />
          )}
          <header className="pv__top">
            <span className="pv__name">{p.name}</span>
            {n > 1 && <span className="pv__n num">{index! + 1} / {n}</span>}
            <a className="pv__icon" href={p.src} target="_blank" rel="noreferrer" aria-label="Открыть оригинал в новой вкладке"><I n="external" /></a>
            <button type="button" className="pv__icon" onClick={onClose} aria-label="Закрыть"><I n="x" /></button>
          </header>
          {n > 1 && (
            <>
              <button type="button" className="pv__nav pv__nav--prev" onClick={() => go(-1)} aria-label="Предыдущее фото"><I n="left" /></button>
              <button type="button" className="pv__nav pv__nav--next" onClick={() => go(1)} aria-label="Следующее фото"><I n="right" /></button>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}

/** Миниатюры фото: нажал — открылось крупно поверх страницы. */
export function PhotoThumbs({ photos, onOpen, extra }: { photos: Photo[]; onOpen: (i: number) => void; extra?: (i: number) => React.ReactNode }) {
  const [bad, setBad] = useState<Record<string, boolean>>({});
  return (
    <ul className="pthumbs">
      {photos.map((p, i) => (
        <li key={p.src}>
          <button type="button" className="pthumbs__btn" onClick={() => onOpen(i)} aria-label={`Открыть фото: ${p.name}`}>
            {bad[p.src] ? (
              <span className="pthumbs__ph"><I n="image" /><small>{p.name.split(".").pop()?.toUpperCase()}</small></span>
            ) : (
              <img src={p.src} alt="" loading="lazy" onError={() => setBad((b) => ({ ...b, [p.src]: true }))} />
            )}
            <span className="pthumbs__zoom" aria-hidden="true"><I n="expand" /></span>
          </button>
          {extra?.(i)}
        </li>
      ))}
    </ul>
  );
}
