// Банки витаминов JANAMEN — фото из каталога janamenhealth.kz.
// У этих фото прозрачные поля вокруг банки разные (у одной банка сдвинута влево, у другой полкартинки пустые),
// поэтому место под картинку считается по самой банке: рамка [x0, y0, x1, y1] — непрозрачная часть фото
// в пикселях исходника w×h. Прозрачные поля и мягкая тень на фото просто выходят за рамку, места не занимают.
// Так все банки одного роста и стоят точно по центру своего места.
export type JarId = "men" | "women" | "omega";

type Box = { img: string; w: number; h: number; box: [number, number, number, number] };

export const JARS: Record<JarId, Box> = {
  men: {
    img: "https://optim.tildacdn.pro/tild6633-3633-4334-b133-643166613839/-/format/webp/men.png.webp",
    w: 272, h: 306, box: [18, 37, 155, 291],
  },
  women: {
    img: "https://optim.tildacdn.pro/tild6565-3037-4432-b838-663835643338/-/resize/600x/-/format/webp/DSC_4081_4.png.webp",
    w: 600, h: 899, box: [131, 214, 468, 856],
  },
  omega: {
    img: "https://optim.tildacdn.pro/tild3265-6230-4662-b634-316366316430/-/format/webp/omega.png.webp",
    w: 273, h: 309, box: [16, 25, 155, 289],
  },
};

/** Банка без пустых полей. Высоту задаёт CSS (класс или --jar-h), ширина — по пропорциям самой банки. */
export function Jar({ id, alt = "", className = "", lazy = false, onError }: { id: JarId; alt?: string; className?: string; lazy?: boolean; onError?: () => void }) {
  const { img, w, box } = JARS[id];
  const [x0, y0, x1, y1] = box;
  const bw = x1 - x0;
  const bh = y1 - y0;
  return (
    <span className={`jar jar--${id} ${className}`} style={{ aspectRatio: `${bw} / ${bh}` }}>
      <img
        src={img} alt={alt} loading={lazy ? "lazy" : undefined} onError={onError}
        style={{ width: `${(w / bw) * 100}%`, left: `${(-x0 / bw) * 100}%`, top: `${(-y0 / bh) * 100}%` }}
      />
    </span>
  );
}
