"use client";
// 3D-банки витаминов JANAMEN на three.js (тестовая страница /vitamins-3d).
// Банка собрана из геометрии: стекло (тёмный янтарь), этикетка (развёрнутое фото банки — public/vitamins3d/label-*.webp),
// золотая крышка с насечкой. Смена банки: текущая улетает в сторону с поворотом, новая прилетает с другой стороны.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type JarSpec = { id: string; label: string; labelAspect: number; labelY?: number; glow: string };

/** Управление жестом снаружи (страница ловит палец/мышь, банка двигается здесь без перерисовки React). */
export type JarsControl = {
  /** банка идёт за пальцем: сдвиг в пикселях экрана от точки касания */
  drag: (px: number) => void;
  /** палец отпущен: скорость в px/мс (если сейчас сменится банка — она улетит с этой скоростью), null — вернуть на место */
  release: (velocity: number | null) => void;
};

type Props = {
  jars: JarSpec[];
  index: number;
  /** направление последней смены: 1 — вперёд (новая справа), −1 — назад */
  dir: number;
  control?: React.RefObject<JarsControl | null>;
  className?: string;
  onReady?: () => void;
};

const R = 1; // радиус банки
const BODY_TOP = 2.6;
const NECK_Y = 2.98;
const CAP_Y0 = 2.9, CAP_H = 0.5, CAP_R = 0.75;

/** Стекло: профиль вращения — дно со скруглением, прямые стенки, плечо, горлышко. */
function glassGeometry() {
  const pts = [
    new THREE.Vector2(0, 0.04),
    new THREE.Vector2(0.62, 0.0),
    new THREE.Vector2(0.9, 0.025),
    new THREE.Vector2(0.985, 0.1),
    new THREE.Vector2(1, 0.22),
    new THREE.Vector2(1, BODY_TOP - 0.1),
    new THREE.Vector2(0.99, BODY_TOP + 0.04),
    new THREE.Vector2(0.95, BODY_TOP + 0.15),
    new THREE.Vector2(0.87, BODY_TOP + 0.25),
    new THREE.Vector2(0.79, NECK_Y - 0.06),
    new THREE.Vector2(0.745, NECK_Y),
    new THREE.Vector2(0.735, NECK_Y + 0.1),
  ];
  const curve = new THREE.SplineCurve(pts);
  return new THREE.LatheGeometry(curve.getPoints(90), 128);
}

/** Крышка: боковина с мелкой насечкой, нижний поясок и чуть выпуклый верх. */
function capGroup(gold: THREE.Material, goldTop: THREE.Material) {
  const g = new THREE.Group();
  const side = new THREE.CylinderGeometry(CAP_R, CAP_R, CAP_H * 0.8, 360, 1, true);
  const p = side.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const a = Math.atan2(x, z);
    const k = 1 + 0.012 * Math.pow(Math.abs(Math.cos(a * 60)), 0.6);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  side.computeVertexNormals();
  const sideMesh = new THREE.Mesh(side, gold);
  sideMesh.position.y = CAP_Y0 + CAP_H * 0.5;
  g.add(sideMesh);
  // нижний поясок (на фото — более широкий гладкий край)
  const band = new THREE.Mesh(new THREE.CylinderGeometry(CAP_R + 0.025, CAP_R + 0.03, CAP_H * 0.2, 128, 1, true), gold);
  band.position.y = CAP_Y0 + CAP_H * 0.1;
  g.add(band);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(CAP_R + 0.02, 0.022, 12, 128), gold);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = CAP_Y0 + CAP_H * 0.2;
  g.add(lip);
  // верх: скруглённый край и плоский диск
  const top = new THREE.LatheGeometry(
    new THREE.SplineCurve([
      new THREE.Vector2(CAP_R + 0.012, 0),
      new THREE.Vector2(CAP_R, 0.035),
      new THREE.Vector2(CAP_R - 0.05, 0.06),
      new THREE.Vector2(CAP_R - 0.12, 0.065),
      new THREE.Vector2(0, 0.075),
    ]).getPoints(24),
    128,
  );
  const topMesh = new THREE.Mesh(top, goldTop);
  topMesh.position.y = CAP_Y0 + CAP_H * 0.9;
  g.add(topMesh);
  return g;
}

/** Мягкая тень под банкой — радиальный градиент на плоскости. */
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(0,0,0,0.55)");
  gr.addColorStop(0.5, "rgba(0,0,0,0.22)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}


export function Jars3D({ jars, index, dir, control, className, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ show: (i: number, d: number) => void } | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const debug = new URLSearchParams(location.search).has("debug");
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    // телефон (палец, узкий экран): рисуем в 1.5× — глазом не отличить от 3×, а работы в 4 раза меньше
    const mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
    let ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    renderer.setPixelRatio(ratio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.9;

    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
    camera.position.set(0, 1.55, 17.5);
    camera.lookAt(0, 1.45, 0);

    // свет: ключевой слева сверху, тёплый контровой справа сзади (фирменный оранжевый блик по краю)
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-4, 6, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff9a3c, 3.2);
    rim.position.set(5, 3, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(3, -1, 5);
    scene.add(fill);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a0902, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
      specularIntensity: 1, ior: 1.5,
      // мягкий тёплый отлив стекла — дорогой эффект, на телефонах без него
      ...(mobile ? {} : { sheen: 0.25, sheenColor: new THREE.Color(0x8a3a0c), sheenRoughness: 0.45 }),
    });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd6b25e, metalness: 1, roughness: 0.3 });
    const goldTop = new THREE.MeshStandardMaterial({ color: 0xcfae62, metalness: 1, roughness: 0.38 });
    const glass = glassGeometry();
    const loader = new THREE.TextureLoader();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const shadowTex = shadowTexture();

    const groups: THREE.Group[] = [];
    let loaded = 0;
    for (const j of jars) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(glass, glassMat);
      g.add(body);
      const tex = loader.load(j.label, () => {
        loaded++;
        if (loaded === jars.length) readyRef.current?.();
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      const lh = 2 * Math.PI * (R + 0.006) * j.labelAspect;
      const labelGeo = new THREE.CylinderGeometry(R + 0.006, R + 0.006, lh, 160, 1, true, Math.PI, Math.PI * 2);
      const labelMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.25 });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.y = j.labelY ?? 1.3;
      g.add(label);
      g.add(capGroup(gold, goldTop));
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = -0.01;
      g.add(sh);
      g.visible = false;
      scene.add(g);
      groups.push(g);
    }

    // ---- анимация
    // Поза банки: сдвиг x, поворот вокруг оси (yaw), наклон (roll), высота (lift), масштаб.
    // Каждая смена стартует из той позы, в которой банка сейчас, — поэтому ничего не дёргается,
    // даже если нажать следующую посреди перехода. Улетает банка всегда за край экрана (считаем по ширине кадра).
    type Pose = { x: number; yaw: number; roll: number; lift: number; s: number };
    // v — скорость пальца при отпускании (мир/мс по x): тогда банка уходит сразу с этой скоростью, без разгона с нуля
    type Move = { g: number; t0: number; from: Pose; d: number; done?: boolean; v?: number; ms?: number };
    const IN_MS = reduce ? 1 : 1050, OUT_MS = reduce ? 1 : 820, IN_DELAY = reduce ? 0 : 90;
    const FLING_OUT = reduce ? 1 : 540, FLING_IN = reduce ? 1 : 900;
    let cur = index;
    let incoming: Move = { g: index, t0: performance.now(), from: { x: 0, yaw: 0.5, roll: -0.16, lift: -0.75, s: 0.88 }, d: 1 };
    let leaving: Move[] = [];
    let dragV = 0, dragS = 0, dragging = false;
    let fling: number | null = null; // скорость последнего отпускания, ждёт смены банки
    let fixedYaw: number | null = null; // ?debug: повернуть банку на заданный угол (проверка этикетки со всех сторон)
    if (debug) (window as unknown as { __v3yaw?: (y: number | null) => void }).__v3yaw = (y) => (fixedYaw = y);
    let px = 0, py = 0, sx = 0, sy = 0;
    const poses: Pose[] = jars.map(() => ({ x: 0, yaw: 0, roll: 0, lift: 0, s: 1 }));
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeIn = (t: number) => t * t * t;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const mix = (p: Pose, q: Pose, t: number): Pose => ({ x: lerp(p.x, q.x, t), yaw: lerp(p.yaw, q.yaw, t), roll: lerp(p.roll, q.roll, t), lift: lerp(p.lift, q.lift, t), s: lerp(p.s, q.s, t) });
    /** половина ширины кадра на глубине банки + запас, чтобы банка целиком ушла за край */
    const edge = () => Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect + 2.2;
    const offscreen = (side: number): Pose => ({ x: side * edge(), yaw: side * 0.85, roll: -0.16 - side * 0.32, lift: 0.15, s: 0.92 });
    /** сколько единиц мира в одном пикселе экрана на глубине банки — чтобы банка шла ровно за пальцем */
    const perPx = () => (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z) / Math.max(1, el.clientHeight);

    const place = (g: THREE.Group, p: Pose) => {
      g.position.set(p.x, p.lift, 0);
      g.rotation.set(0.12, p.yaw, p.roll);
      g.scale.setScalar(p.s);
    };

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      // на узком экране отодвигаем камеру, чтобы банка помещалась
      // на телефоне банка поменьше и чуть выше центра (снизу — кнопки и выбор банки)
      const phone = camera.aspect < 0.8;
      // на невысоком экране банку чуть уменьшаем (камера дальше), чтобы она не наезжала на описание под ней
      const short = phone ? Math.max(1, 1 + ((820 - h) / 820) * 1.6) : Math.max(1, 1 + (860 - h) / 860);
      camera.position.set(0, phone ? 0.95 : 1.55, (phone ? 22.5 : 17.5) * short);
      camera.lookAt(0, phone ? 0.85 : 1.45, 0);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(el);

    let raf = 0;
    // автоподстройка: средняя длительность кадра за ~1.5 с; медленно — снижаем разрешение (не ниже 1×), обратно не повышаем
    // первые 2.5 с не считаем (браузер готовит 3D — кадры медленные у всех), снижаем после двух медленных отрезков подряд
    let perfT = 0, perfN = 0, last = 0, slow = 0;
    const warmUntil = performance.now() + 2500;
    const adapt = (now: number) => {
      if (now < warmUntil) return void (last = now);
      if (last) { perfT += Math.min(100, now - last); perfN++; }
      last = now;
      if (perfN < 90) return;
      const avg = perfT / perfN;
      perfT = perfN = 0;
      slow = avg > 25 ? slow + 1 : 0;
      if (slow >= 2 && ratio > 1) {
        slow = 0;
        ratio = Math.max(1, ratio - 0.25);
        renderer.setPixelRatio(ratio);
        resize();
      }
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return void (last = 0);
      adapt(now);
      const time = now / 1000;
      sx += (px - sx) * 0.05;
      sy += (py - sy) * 0.05;
      // за пальцем — почти без задержки, а отпущенная без смены банка мягко возвращается на место
      dragS += (dragV - dragS) * (dragging ? 0.45 : 0.14);
      const dx = dragS * perPx();
      // спокойное состояние: банка парит, медленно поворачивается, чуть следует за курсором и пальцем
      const idle: Pose = {
        x: dx,
        yaw: fixedYaw ?? (reduce ? 0 : Math.sin(time * 0.45) * 0.32) + sx * 0.35 + dx * 0.13,
        roll: -0.16 - sx * 0.04 - dx * 0.035,
        lift: -0.05 + (reduce ? 0 : Math.sin(time * 1.1) * 0.06) - sy * 0.05,
        s: 1,
      };
      const seen = new Set<number>();
      // уходящие: разгоняются и улетают за край
      // последний кадр рисуем ровно за краем и только потом убираем — даже на медленном телефоне банка не пропадает на экране
      leaving = leaving.filter((m) => {
        if (m.done) return false;
        const k = Math.min(1, (now - m.t0) / (m.ms ?? OUT_MS));
        const to = offscreen(-m.d);
        let f = easeIn(k);
        if (m.v !== undefined) {
          // после свайпа: стартовая скорость = скорость пальца (s), дальше лёгкий разгон; f(0)=0, f(1)=1, f'(0)=s
          const D = to.x - m.from.x;
          const s = Math.min(2, Math.max(0.9, D ? (m.v * (m.ms ?? OUT_MS)) / D : 1));
          f = s * k + (1 - s) * k * k;
        }
        poses[m.g] = mix(m.from, to, f);
        seen.add(m.g);
        if (k >= 1) m.done = true;
        return true;
      });
      // новая: прилетает с другой стороны и мягко тормозит в спокойное состояние
      const k = Math.min(1, Math.max(0, (now - incoming.t0 - (incoming.v !== undefined ? 0 : IN_DELAY)) / (incoming.ms ?? IN_MS)));
      poses[cur] = mix(incoming.from, idle, easeOut(k));
      seen.add(cur);
      groups.forEach((g, i) => {
        g.visible = seen.has(i);
        if (g.visible) place(g, poses[i]);
      });
      // ?debug — для автотестов плавности: позы банок и граница кадра
      if (debug) (window as unknown as { __v3?: unknown }).__v3 = { t: now, cur, edge: edge() - 2.2, poses: poses.map((p, i) => ({ i, on: seen.has(i), ...p })), ratio };
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    api.current = {
      show: (i, dd) => {
        if (i === cur) return;
        const now = performance.now();
        const side = dd || 1;
        // свайп: банка уже сдвинута пальцем и летит дальше с его скоростью; кнопки — обычный разгон
        const v = fling === null ? undefined : fling * perPx();
        fling = null;
        // текущая улетает из той позы, где она сейчас
        leaving = leaving.filter((m) => m.g !== cur);
        // время вылета под скорость пальца: быстрый смах — банка уходит так же быстро, медленный — за FLING_OUT
        const D = Math.abs(offscreen(-side).x - poses[cur].x);
        const outMs = v === undefined ? undefined : reduce ? 1 : Math.min(FLING_OUT, Math.max(200, (1.3 * D) / Math.max(Math.abs(v), 1e-6)));
        leaving.push({ g: cur, t0: now, from: { ...poses[cur] }, d: side, v, ms: outMs });
        // новая банка встаёт ровно по центру, без остатка сдвига от пальца
        dragV = dragS = 0;
        // если новая ещё не успела улететь — подхватываем её с места, иначе — из-за края
        const wasFlying = leaving.find((m) => m.g === i);
        leaving = leaving.filter((m) => m.g !== i);
        incoming = { g: i, t0: wasFlying ? now - IN_DELAY : now, from: wasFlying ? { ...poses[i] } : offscreen(side), d: side, v, ms: v !== undefined ? FLING_IN : undefined };
        cur = i;
      },
    };
    if (control) control.current = {
      drag: (px) => {
        dragging = true;
        fling = null;
        dragV = px;
      },
      release: (vel) => {
        dragging = false;
        dragV = 0;
        fling = vel;
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
          (x as THREE.MeshStandardMaterial).map?.dispose();
          x.dispose();
        });
      });
      shadowTex.dispose();
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
      if (control) control.current = null;
    };
  }, [jars]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.current?.show(index, dir);
  }, [index, dir]);

  return <div ref={host} className={className} aria-hidden="true" />;
}
