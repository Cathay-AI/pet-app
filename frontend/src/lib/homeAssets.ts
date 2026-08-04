import type { PetAnimation, PetColorId, PetType } from "@/types";

export type HomePetSpriteState = Exclude<PetAnimation, "bathing">;

type HomePetSpriteSource = string | readonly string[];
type HomePetSpriteSet = Partial<Record<HomePetSpriteState, HomePetSpriteSource>>;
type HomePetColorSprites = Partial<Record<PetColorId, HomePetSpriteSet>>;
type HomePetSpriteRegistry = Partial<Record<PetType, HomePetColorSprites>>;

function homeFrames(name: string, state: HomePetSpriteState) {
  return [
    `/assets/home/${name}-${state}-0.png`,
    `/assets/home/${name}-${state}-1.png`,
    `/assets/home/${name}-${state}-2.png`,
    `/assets/home/${name}-${state}-3.png`
  ] as const;
}

export const HOME_ROOM_BACKGROUND = "/assets/home/room-bg-v1.png";

export const HOME_HIT_AREAS = {
  door: "absolute right-4 top-[15rem] z-20 h-52 w-28 rounded-t-full outline-none focus-visible:ring-4 focus-visible:ring-[#F7D46A]/80",
  foodBowl:
    "absolute bottom-5 left-4 z-30 h-28 w-36 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#F7D46A]/80",
  toy: "absolute bottom-5 right-4 z-30 h-28 w-36 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#F7D46A]/80"
} as const;

const HOME_PET_SPRITES: HomePetSpriteRegistry = {
  cat: {
    lavender: {
      idle: homeFrames("cat-lavender", "idle"),
      happy: homeFrames("cat-lavender", "happy")
    }
  },
  dog: {
    brown: {
      idle: homeFrames("dog-brown", "idle"),
      happy: homeFrames("dog-brown", "happy")
    },
    gray: {
      idle: homeFrames("dog-gray", "idle"),
      happy: homeFrames("dog-gray", "happy")
    },
    blue: {
      idle: homeFrames("dog-blue", "idle"),
      happy: homeFrames("dog-blue", "happy")
    },
    lavender: {
      idle: homeFrames("dog-lavender", "idle"),
      happy: homeFrames("dog-lavender", "happy")
    }
  }
};

export function normalizeHomePetSpriteState(animation: PetAnimation): HomePetSpriteState {
  if (animation === "bathing") return "happy";
  return animation;
}

export function getHomePetSprites(type: PetType, color: PetColorId, animation: PetAnimation) {
  const state = normalizeHomePetSpriteState(animation);
  const colorSprites = HOME_PET_SPRITES[type]?.[color];
  const fallbackSprites = getFallbackSprites(type);
  const source =
    colorSprites?.[state] ?? colorSprites?.idle ?? fallbackSprites?.[state] ?? fallbackSprites?.idle ?? null;

  if (!source) return null;
  return Array.isArray(source) ? [...source] : [source];
}

function getFallbackSprites(type: PetType) {
  if (type === "dog") return HOME_PET_SPRITES.dog?.brown;
  return HOME_PET_SPRITES.cat?.lavender;
}
