"use client";

import { useEffect, useRef } from "react";
import { PET_COLORS } from "@/lib/constants";
import type { PetAnimation, PetColorId, PetType } from "@/types";

type PetCanvasProps = {
  type: PetType;
  color: PetColorId;
  animation: PetAnimation;
  hunger?: number;
  cleanliness?: number;
  size?: number;
};

type DrawOptions = {
  type: PetType;
  color: PetColorId;
  animation: PetAnimation;
  hunger: number;
  cleanliness: number;
  frame: number;
};

const CANVAS_SIZE = 32;

export default function PetCanvas({
  type,
  color,
  animation,
  hunger = 100,
  cleanliness = 100,
  size = 128
}: PetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let raf = 0;
    let last = 0;

    const render = (time: number) => {
      if (time - last > 140) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          ctx.imageSmoothingEnabled = false;
          drawPet(ctx, { type, color, animation, hunger, cleanliness, frame });
          frame = (frame + 1) % 16;
        }
        last = time;
      }
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [animation, cleanliness, color, hunger, type]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{ height: size, width: size }}
      aria-label={`${type === "cat" ? "貓咪" : "狗狗"}像素寵物`}
      role="img"
    />
  );
}

function drawPet(ctx: CanvasRenderingContext2D, options: DrawOptions) {
  const palette = PET_COLORS[options.color];
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const visualAnimation = options.animation === "walking" ? "idle" : options.animation;
  const bob = getBob(options.animation, options.frame);
  const isSick = options.animation === "sick";
  const isSad = options.animation === "sad";

  if (isSick) {
    drawSickPet(ctx, options, palette);
  } else if (options.type === "cat") {
    drawCat(ctx, palette, bob, isSad, visualAnimation, options.frame);
  } else {
    drawDog(ctx, palette, bob, isSad, visualAnimation, options.frame);
  }

  if (!isSick && options.cleanliness < 50) drawDust(ctx, options.frame);
  if (!isSick && options.hunger < 20) drawHungerMark(ctx, options.frame);
  if (!isSick && options.cleanliness < 20) drawSmellLines(ctx, options.frame);
  if (options.animation === "bathing") drawBubbles(ctx, options.frame);
  if (options.animation === "eating") drawCrumbs(ctx, options.frame);
  if (options.animation === "happy") drawHearts(ctx, options.frame);
  if (options.animation === "sleeping") drawSleep(ctx, options.frame);
}

function getBob(animation: PetAnimation, frame: number) {
  if (animation === "happy") return frame % 8 < 4 ? -3 : 1;
  if (animation === "walking") return 0;
  if (animation === "eating") return frame % 4 < 2 ? 1 : 0;
  if (animation === "bathing") return frame % 4 < 2 ? -1 : 1;
  if (animation === "sad") return frame % 8 === 0 ? 1 : 0;
  return frame % 8 < 4 ? 0 : -1;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawCat(
  ctx: CanvasRenderingContext2D,
  palette: { fur: string; shade: string; accent: string; blush: string },
  y: number,
  sad: boolean,
  animation: PetAnimation,
  frame: number
) {
  const blink = animation === "idle" && frame % 16 === 10;
  const happySquash = animation === "happy" && frame % 8 >= 4 ? 1 : 0;
  const earTwitch = !sad && animation === "idle" && frame % 16 === 6 ? -1 : 0;
  const tailLift = animation === "happy" ? -2 : sad ? 3 : frame % 8 < 4 ? -1 : 0;

  px(ctx, 9, 9 + y, 14, 13, palette.fur);
  px(ctx, 7, 12 + y + happySquash, 18, 8, palette.fur);
  px(ctx, 10, 6 + y + (sad ? 2 : earTwitch), 4, 5, sad ? palette.shade : palette.fur);
  px(ctx, 18, 6 + y + (sad ? 2 : 0), 4, 5, sad ? palette.shade : palette.fur);
  if (!sad) {
    px(ctx, 11, 7 + y + earTwitch, 2, 2, palette.accent);
    px(ctx, 19, 7 + y, 2, 2, palette.accent);
  }
  if (blink) {
    px(ctx, 11, 15 + y, 3, 1, "#251B18");
    px(ctx, 18, 15 + y, 3, 1, "#251B18");
  } else if (sad) {
    px(ctx, 11, 15 + y, 3, 1, "#251B18");
    px(ctx, 18, 15 + y, 3, 1, "#251B18");
  } else {
    px(ctx, 11, 14 + y, 3, 3, "#251B18");
    px(ctx, 18, 14 + y, 3, 3, "#251B18");
  }
  px(ctx, 15, 17 + y, 2, 1, "#251B18");
  if (animation === "eating") {
    const chewOpen = frame % 4 < 2;
    px(ctx, 13, 19 + y, 7, chewOpen ? 3 : 1, chewOpen ? "#FFFFFF" : palette.accent);
    if (chewOpen) px(ctx, 15, 20 + y, 2, 1, "#251B18");
  } else {
    px(ctx, 12, 19 + y, 8, 2, palette.accent);
  }
  px(ctx, 8, 20 + y, 4, 5, palette.fur);
  px(ctx, 20, 20 + y, 4, 5, palette.fur);
  px(ctx, 5, 15 + y, 3, 2, palette.shade);
  px(ctx, 24, 15 + y, 3, 2, palette.shade);
  px(ctx, 24, 20 + y + tailLift, 3, 2, palette.fur);
  px(ctx, 26, 18 + y + tailLift, 2, 2, palette.fur);
  if (animation === "happy" && frame % 8 >= 4) px(ctx, 10, 23 + y, 12, 1, palette.shade);
}

function drawDog(
  ctx: CanvasRenderingContext2D,
  palette: { fur: string; shade: string; accent: string; blush: string },
  y: number,
  sad: boolean,
  animation: PetAnimation,
  frame: number
) {
  const blink = animation === "idle" && frame % 16 === 11;
  const earWag = animation === "happy" ? frame % 4 < 2 ? -1 : 1 : 0;
  const tailWag = animation === "happy" ? frame % 4 < 2 ? -2 : 1 : sad ? 2 : frame % 8 < 4 ? -1 : 0;

  px(ctx, 8, 11 + y, 16, 12, palette.fur);
  px(ctx, 6, 14 + y, 20, 7, palette.fur);
  px(ctx, 6, 9 + y + (sad ? 2 : earWag), 5, 7, sad ? palette.shade : palette.fur);
  px(ctx, 21, 9 + y + (sad ? 2 : -earWag), 5, 7, sad ? palette.shade : palette.fur);
  if (blink) {
    px(ctx, 11, 16 + y, 3, 1, "#251B18");
    px(ctx, 18, 16 + y, 3, 1, "#251B18");
  } else if (sad) {
    px(ctx, 11, 16 + y, 3, 1, "#251B18");
    px(ctx, 18, 16 + y, 3, 1, "#251B18");
  } else {
    px(ctx, 11, 15 + y, 3, 3, "#251B18");
    px(ctx, 18, 15 + y, 3, 3, "#251B18");
  }
  px(ctx, 14, 18 + y, 4, 2, palette.shade);
  if (animation === "eating") {
    const chewOpen = frame % 4 < 2;
    px(ctx, 13, 20 + y, 6, chewOpen ? 3 : 1, chewOpen ? "#FFFFFF" : palette.accent);
    if (chewOpen) px(ctx, 15, 21 + y, 2, 1, "#251B18");
  } else {
    px(ctx, 13, 20 + y, 6, 2, palette.accent);
  }
  px(ctx, 7, 22 + y, 4, 4, palette.fur);
  px(ctx, 21, 22 + y, 4, 4, palette.fur);
  px(ctx, 25, 13 + y, 3, 3, palette.shade);
  px(ctx, 27, 10 + y + tailWag, 2, 4, palette.shade);
  if (animation === "happy" && frame % 8 >= 4) px(ctx, 9, 25 + y, 14, 1, palette.shade);
}

function drawSickPet(
  ctx: CanvasRenderingContext2D,
  options: DrawOptions,
  palette: { fur: string; shade: string; accent: string; blush: string }
) {
  const breath = options.frame % 8 < 4 ? 0 : 1;
  px(ctx, 8, 19 + breath, 17, 6, palette.fur);
  px(ctx, 6, 21 + breath, 20, 4, palette.fur);
  px(ctx, 10, 17, 4, 3, options.type === "cat" ? palette.fur : palette.shade);
  px(ctx, 19, 17, 4, 3, options.type === "cat" ? palette.fur : palette.shade);
  px(ctx, 12, 21 + breath, 4, 1, "#251B18");
  px(ctx, 19, 21 + breath, 4, 1, "#251B18");
  px(ctx, 16, 23 + breath, 3, 1, "#251B18");
  px(ctx, 9, 26, 16, 2, "#6D5B75");
  if (options.frame % 2 === 0) {
    px(ctx, 23, 13, 2, 2, "#FFFFFF");
    px(ctx, 25, 11, 2, 2, "#FFFFFF");
  }
}

function drawHungerMark(ctx: CanvasRenderingContext2D, frame: number) {
  px(ctx, 4, 4 + (frame % 2), 3, 5, "#F7D46A");
  px(ctx, 5, 10 + (frame % 2), 1, 1, "#F7D46A");
}

function drawSmellLines(ctx: CanvasRenderingContext2D, frame: number) {
  const y = frame % 2;
  px(ctx, 25, 4 + y, 1, 6, "#BCA894");
  px(ctx, 28, 6 - y, 1, 6, "#BCA894");
  px(ctx, 22, 6 - y, 1, 5, "#BCA894");
}

function drawBubbles(ctx: CanvasRenderingContext2D, frame: number) {
  px(ctx, 5, 20 - (frame % 5), 3, 3, "#DDF4FF");
  px(ctx, 23, 10 + (frame % 4), 4, 4, "#DDF4FF");
  px(ctx, 19, 5 + (frame % 2), 2, 2, "#FFFFFF");
  px(ctx, 9, 9 + (frame % 3), 2, 2, "#FFFFFF");
  px(ctx, 26, 22 - (frame % 5), 2, 2, "#DDF4FF");
}

function drawHearts(ctx: CanvasRenderingContext2D, frame: number) {
  const y = frame % 6;
  px(ctx, 5, 7 - y, 2, 2, "#F06F8F");
  px(ctx, 7, 7 - y, 2, 2, "#F06F8F");
  px(ctx, 6, 9 - y, 2, 2, "#F06F8F");
  px(ctx, 24, 6 + (y % 3), 2, 2, "#F06F8F");
  px(ctx, 26, 6 + (y % 3), 2, 2, "#F06F8F");
  px(ctx, 25, 8 + (y % 3), 2, 2, "#F06F8F");
  if (frame % 4 < 2) {
    px(ctx, 9, 4, 1, 1, "#F7D46A");
    px(ctx, 28, 13, 1, 1, "#F7D46A");
    px(ctx, 4, 18, 1, 1, "#FFFFFF");
  }
}

function drawSleep(ctx: CanvasRenderingContext2D, frame: number) {
  px(ctx, 23, 5 - (frame % 2), 4, 1, "#FFFFFF");
  px(ctx, 26, 6 - (frame % 2), 1, 2, "#FFFFFF");
  px(ctx, 23, 8 - (frame % 2), 4, 1, "#FFFFFF");
}

function drawCrumbs(ctx: CanvasRenderingContext2D, frame: number) {
  const drift = frame % 4;
  px(ctx, 13 - drift, 22, 1, 1, "#F7D46A");
  if (frame % 2 === 0) px(ctx, 21 + drift, 21, 1, 1, "#F7D46A");
  if (frame % 3 === 0) px(ctx, 16, 24, 1, 1, "#D4A96A");
}

function drawDust(ctx: CanvasRenderingContext2D, frame: number) {
  const flicker = frame % 4;
  px(ctx, 6 + flicker, 27, 1, 1, "#8B6F5E");
  px(ctx, 22 - flicker, 26, 1, 1, "#8B6F5E");
  if (frame % 2 === 0) px(ctx, 28, 25, 1, 1, "#8B6F5E");
}
