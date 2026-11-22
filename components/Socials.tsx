// Ссылки на официальные аккаунты: значок соцсети, название и ник. Открываются в новой вкладке.
import { I } from "./Icons";
import { SOCIALS } from "@/lib/socials";

export function Socials({ className = "", label = "Официальные аккаунты" }: { className?: string; label?: string }) {
  return (
    <ul className={`socials ${className}`} aria-label={label}>
      {SOCIALS.map((s) => (
        <li key={s.id}>
          <a className={`socials__a socials__a--${s.id}`} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} ${s.handle} — откроется в новой вкладке`}>
            <span className="socials__ic" aria-hidden="true"><I n={s.id} fill /></span>
            <span className="socials__txt">
              <b>{s.name}</b>
              <small translate="no">{s.handle}</small>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
