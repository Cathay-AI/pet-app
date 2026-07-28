import { getHomePetSprites, normalizeHomePetSpriteState } from "@/lib/homeAssets";
import type { PetAnimation, PetColorId, PetType } from "@/types";
import PetCanvas from "./PetCanvas";

type PetSpriteProps = {
  type: PetType;
  color: PetColorId;
  animation: PetAnimation;
  cleanliness?: number;
  size?: number;
};

export default function PetSprite({ type, color, animation, cleanliness = 100, size = 340 }: PetSpriteProps) {
  const sprites = getHomePetSprites(type, color, animation);
  const spriteState = normalizeHomePetSpriteState(animation);
  const hasFrames = Boolean(sprites && sprites.length > 1);
  const isDirty = cleanliness < 50;
  const veryDirty = cleanliness < 25;

  return (
    <span
      className={`home-pet-sprite home-pet-sprite-${spriteState} ${hasFrames ? "home-pet-sprite-framed" : ""}`}
      style={{ height: size, width: size }}
      role="img"
      aria-label={`${type === "cat" ? "貓咪" : "狗狗"}寵物`}
    >
      {sprites ? (
        <span className="home-pet-sprite-stage">
          {sprites.map((sprite, index) => (
            <img
              key={sprite}
              src={sprite}
              alt=""
              className={`home-pet-sprite-image ${hasFrames ? `home-pet-sprite-frame home-pet-sprite-frame-${index}` : ""}`}
              draggable={false}
            />
          ))}
        </span>
      ) : (
        <span className="home-pet-canvas-fallback">
          <PetCanvas type={type} color={color} animation={animation} cleanliness={cleanliness} size={Math.round(size * 0.72)} />
        </span>
      )}
      {isDirty ? <span className={`home-pet-dirt ${veryDirty ? "home-pet-dirt-heavy" : ""}`} /> : null}
    </span>
  );
}
