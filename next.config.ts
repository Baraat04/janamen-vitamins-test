import type { NextConfig } from "next";

// Демо — одна страница (витрина витаминов). Ссылки шапки и футера на другие разделы
// («Рейтинг», «Новости», «Войти»…) ведут на настоящий сайт Jana Jol.
const SITE = "https://janajol.online";
const PAGES = ["rating", "news", "partners", "status", "auth", "chat", "apply", "profile", "team"];

const nextConfig: NextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/vitamins", destination: "/", permanent: false },
      ...PAGES.flatMap((p) => [
        { source: `/${p}`, destination: `${SITE}/${p}`, permanent: false },
        { source: `/${p}/:rest+`, destination: `${SITE}/${p}/:rest+`, permanent: false },
      ]),
    ];
  },
};

export default nextConfig;
