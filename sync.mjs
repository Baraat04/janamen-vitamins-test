// Обновить демо из основного проекта Jana Jol: копирует 3D-витрину витаминов и всё, что ей нужно
// (шапка, футер, иконки, шрифты, стили, этикетки банок). Запуск: npm run sync
// Путь к основному проекту можно передать: node sync.mjs "E:/WEB/Projects/Jana Jol/frontend/frontend"
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(process.argv[2] || path.join(here, "../frontend/frontend"));
const SITE = "https://janajol.online";
if (!fs.existsSync(path.join(SRC, "app/vitamins-3d/page.tsx"))) {
  console.error("Не нашёл основной проект: " + SRC);
  process.exit(1);
}

const copy = (from, to = from, patch) => {
  const a = path.join(SRC, from), b = path.join(here, to);
  fs.mkdirSync(path.dirname(b), { recursive: true });
  if (!patch) return fs.copyFileSync(a, b);
  fs.writeFileSync(b, patch(fs.readFileSync(a, "utf8")));
};
const must = (s, a, b) => {
  if (!s.includes(a)) throw new Error("В основном проекте поменялся код, правку для демо не применить: " + a.slice(0, 60));
  return s.split(a).join(b);
};

// страница: в демо это главная
copy("app/vitamins-3d/page.tsx", "app/page.tsx");
copy("app/vitamins-3d/v3d.css", "app/styles/v3d.css");
for (const f of fs.readdirSync(path.join(SRC, "app/styles"))) if (f.endsWith(".css")) copy(`app/styles/${f}`);

// компоненты и данные
for (const f of ["Menu", "Icons", "Socials", "Jar", "Jars3D", "AutoTranslate", "Media"]) copy(`components/${f}.tsx`);
for (const f of ["api", "format", "socials", "kz", "i18n/index", "i18n/kk", "i18n/en"]) copy(`lib/${f}.ts`);
// шапка: пункты «Как подать заявку», «О программе», «Вопросы» ведут на главную настоящего сайта
copy("components/Headers.tsx", undefined, (s) => must(s, 'href: "/#', `href: "${SITE}/#`));
// в демо нет сервера Jana Jol — не спрашиваем «кто вошёл», сразу гость (кнопка «Войти» ведёт на настоящий сайт)
copy("components/Providers.tsx", undefined, (s) =>
  must(s, "  useEffect(() => {\n    void refreshUser();\n  }, [refreshUser]);", "  useEffect(() => {\n    // демо без сервера Jana Jol: входа нет, сразу гость\n    setUser(null);\n  }, []);"),
);

// картинки и шрифты
for (const f of fs.readdirSync(path.join(SRC, "public/fonts"))) copy(`public/fonts/${f}`);
for (const f of fs.readdirSync(path.join(SRC, "public/vitamins3d"))) copy(`public/vitamins3d/${f}`);
for (const f of ["aitym.webp", "janamen-logo.svg", "janamen-logo-on-dark.svg"]) copy(`public/brand/${f}`);

console.log("Готово: демо обновлено из " + SRC);
