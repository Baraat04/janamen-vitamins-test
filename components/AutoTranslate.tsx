"use client";
// Казахский и английский на всех страницах. Когда выбран KZ или EN, русские тексты на странице заменяются переводом из словаря
// (lib/i18n/kk.ts, en.ts): текст, подсказки в полях, подписи кнопок для экранных читалок, всплывающие сообщения,
// заголовок вкладки и окна подтверждения. Всё, что React дорисует потом, переводится сразу же.
// Обратно на RU (или на другой язык) — сначала возвращаются исходные тексты. Не трогаем: поля ввода и всё внутри [translate="no"].
import { useLayoutEffect } from "react";
import { tr, type Lang } from "@/lib/i18n";

type Rec = { ru: string; kk: string }; // kk — перевод на текущий язык (казахский или английский)
let cur: Lang = "ru";
const trCur = (s: string | null | undefined) => tr(cur, s);
const TEXT = new WeakMap<Text, Rec>();
const ATTR = new WeakMap<Element, Map<string, Rec>>();
const ATTRS = ["placeholder", "aria-label", "title", "alt", "data-l"]; // data-l — подписи столбцов на телефоне (через CSS ::before)
const SKIP = 'script, style, textarea, code, pre, noscript, [translate="no"], [data-no-tr]';
const seen = new Set<Text>(); // переведённые узлы — чтобы вернуть русский при переключении на RU
const seenEl = new Set<Element>();

function doText(n: Text) {
  const el = n.parentElement;
  if (!el || el.closest(SKIP)) return;
  const v = n.nodeValue || "";
  const rec = TEXT.get(n);
  if (rec && v === rec.kk) return; // это наш же перевод
  const kk = trCur(v);
  if (kk == null) return void TEXT.delete(n);
  TEXT.set(n, { ru: v, kk });
  seen.add(n);
  n.nodeValue = kk;
}

function doAttr(el: Element, a: string) {
  if (el.closest(SKIP) && !(el.matches("textarea") && a !== "value")) return;
  const v = el.getAttribute(a);
  if (v == null) return;
  const map = ATTR.get(el) || new Map<string, Rec>();
  const rec = map.get(a);
  if (rec && v === rec.kk) return;
  const kk = trCur(v);
  if (kk == null) return void map.delete(a);
  map.set(a, { ru: v, kk });
  ATTR.set(el, map);
  seenEl.add(el);
  el.setAttribute(a, kk);
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  for (const a of ATTRS) if (el.hasAttribute(a)) doAttr(el, a);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else for (const a of ATTRS) if ((n as Element).hasAttribute(a)) doAttr(n as Element, a);
  }
}

function restore() {
  for (const n of seen) {
    const r = TEXT.get(n);
    if (r && n.nodeValue === r.kk) n.nodeValue = r.ru;
  }
  for (const el of seenEl)
    for (const [a, r] of ATTR.get(el) || []) if (el.getAttribute(a) === r.kk) el.setAttribute(a, r.ru);
  seen.clear();
  seenEl.clear();
}

export function AutoTranslate({ lang }: { lang: Lang }) {
  useLayoutEffect(() => {
    restore(); // смена языка: сначала вернуть русский, потом перевести заново
    cur = lang;
    if (lang === "ru") return;
    walk(document.body);
    // заголовок вкладки
    let titleRu = document.title;
    const doTitle = () => {
      const kk = trCur(document.title);
      if (kk) (titleRu = document.title), (document.title = kk);
    };
    doTitle();
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes" && m.attributeName) doAttr(m.target as Element, m.attributeName);
        else m.addedNodes.forEach(walk);
      }
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    // Next.js при переходе между страницами меняет <title> целиком — следим за всей шапкой документа
    const head = new MutationObserver(doTitle);
    head.observe(document.head, { childList: true, characterData: true, subtree: true });
    // окна подтверждения («Удалить это взвешивание?») — тоже по-казахски
    const confirm0 = window.confirm;
    const alert0 = window.alert;
    window.confirm = (msg?: string) => confirm0.call(window, trCur(msg) ?? msg);
    window.alert = (msg?: string) => alert0.call(window, trCur(msg) ?? msg);
    return () => {
      mo.disconnect();
      head.disconnect();
      window.confirm = confirm0;
      window.alert = alert0;
      if (titleRu && tr(lang, titleRu) === document.title) document.title = titleRu;
    };
  }, [lang]);
  return null;
}
