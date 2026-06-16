import type { PixelIconName } from "@/types";

type PixelIconProps = {
  name: PixelIconName;
  size?: "sm" | "md" | "lg";
};

const colors: Record<string, string> = {
  b: "#1A1A2E",
  c: "#E8734A",
  d: "#8B6F5E",
  g: "#5DCAA5",
  k: "#3D2B1F",
  l: "#D8F1FF",
  m: "#D4A96A",
  o: "#9A6844",
  p: "#7F77DD",
  r: "#E24B4A",
  s: "#C08A5D",
  w: "#FDF8F0",
  y: "#F7D46A"
};

const pixels: Record<PixelIconName, string[]> = {
  feed: [
    "..mmmm..",
    ".myyyym.",
    ".mccccm.",
    "kkkkkkkk",
    "kwwwwwkk",
    ".kkkkkk.",
    "........",
    "........"
  ],
  bath: [
    ".w..ww..",
    "..w..w..",
    ".llllll.",
    "llllllll",
    "lwwwwwll",
    ".kkkkkk.",
    "..k..k..",
    "........"
  ],
  poop: [
    "........",
    "...o....",
    "..ooo...",
    ".oosoo..",
    "..oooo..",
    ".oooooo.",
    "..kkkk..",
    "........"
  ],
  play: [
    "..gggg..",
    ".ggyygg.",
    "ggg.yygg",
    "gg.yyggg",
    "ggyygggg",
    ".ggggg..",
    "..gg....",
    "........"
  ],
  fish: [
    "........",
    "..llll..",
    ".lllllg.",
    "llllllgg",
    ".lllllg.",
    "..llll..",
    "........",
    "........"
  ],
  can: [
    "..kkkk..",
    ".crrrrc.",
    ".cwwwwc.",
    ".crrrrc.",
    ".crrrrc.",
    ".cwwwwc.",
    "..kkkk..",
    "........"
  ],
  bento: [
    ".kkkkkk.",
    "kwwccwwk",
    "kwmmmwwk",
    "kwmggmwk",
    "kwmmmwwk",
    "kwwccwwk",
    ".kkkkkk.",
    "........"
  ],
  snack: [
    "..yyyy..",
    ".ymmmmy.",
    "ymwmwmmy",
    "ymmmmwmy",
    "ymwmwmmy",
    ".ymmmmy.",
    "..yyyy..",
    "........"
  ],
  home: [
    "...y....",
    "..yyy...",
    ".yyyyy..",
    "yyyyyyy.",
    ".kwwwk..",
    ".kwwwk..",
    ".kkkkk..",
    "........"
  ],
  rank: [
    "..yyyy..",
    ".yyyyyy.",
    "..yyyy..",
    "...y....",
    "..yyy...",
    ".yyyyy..",
    "..kkk...",
    "........"
  ]
};

const sizeClass = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9"
};

export default function PixelIcon({ name, size = "md" }: PixelIconProps) {
  return (
    <span className={`pixel-icon ${sizeClass[size]}`} aria-hidden="true">
      {pixels[name].flatMap((row, y) =>
        row.split("").map((cell, x) => (
          <span
            key={`${name}-${x}-${y}`}
            className="pixel-icon-cell"
            style={{ backgroundColor: colors[cell] ?? "transparent" }}
          />
        ))
      )}
    </span>
  );
}
