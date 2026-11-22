import type { Metadata, Viewport } from "next";
import "./styles/fonts.css";
import "./styles/fonts-brand.css";
import "./styles/styles.css";
import "./styles/landing.css";
import "./styles/app.css";
import "./styles/team.css";
import "./styles/jj.css";
import "./styles/feed.css";
import "./styles/program.css";
import "./styles/rating.css";
import "./styles/partners.css";
import "./styles/team-rating.css";
import "./styles/media.css";
import "./styles/fonts-compacta.css"; // Compacta — крупные заголовки (последним, как на основном сайте)
import "./styles/v3d.css";
import { IconSprite } from "@/components/Icons";
import { Providers } from "@/components/Providers";

// Демо новой витрины витаминов Jana Men (3D-банки). Поисковикам не показываем — это тест.
export const metadata: Metadata = {
  title: "Витамины Jana Men — 3D (демо)",
  description: "Тестовая витрина витаминов Jana Men Health с 3D-банками.",
  icons: { icon: "/brand/janamen-logo.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#ff8a00", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preload" href="/fonts/Onest-cyrillic.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <IconSprite />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
