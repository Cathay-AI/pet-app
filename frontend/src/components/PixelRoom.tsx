import { HOME_ROOM_BACKGROUND } from "@/lib/homeAssets";

type PixelRoomProps = {
  cleanliness: number;
  hunger: number;
  mood: number;
};

export default function PixelRoom({ cleanliness, hunger, mood }: PixelRoomProps) {
  const dirty = cleanliness < 50;
  const veryDirty = cleanliness < 25;
  const lowMood = mood < 40;
  const lowHunger = hunger < 35;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#D9A56B]" aria-hidden="true">
      <img
        src={HOME_ROOM_BACKGROUND}
        alt=""
        className={`home-scene-background h-full w-full object-cover ${lowMood ? "brightness-[.82] saturate-[.82]" : ""}`}
        draggable={false}
      />
      {lowMood ? <div className="absolute inset-0 bg-[#5B4A75]/15" /> : null}
      {lowHunger ? <div className="absolute bottom-10 left-8 h-4 w-24 rounded-full bg-[#3D2B1F]/20 blur-sm" /> : null}
      {dirty ? <DirtyFloor veryDirty={veryDirty} /> : null}
    </div>
  );
}

function DirtyFloor({ veryDirty }: { veryDirty: boolean }) {
  return (
    <div className="absolute bottom-[7.2rem] left-[18%] h-14 w-24">
      <span className="absolute bottom-4 left-2 h-3 w-10 rounded-full bg-[#6F452D]/70" />
      <span className="poop-stink-line poop-stink-line-1 absolute bottom-7 left-5 h-8 w-1 bg-[#8B7D61]" />
      <span className="poop-stink-line poop-stink-line-2 absolute bottom-8 left-10 h-9 w-1 bg-[#8B7D61]" />
      <span className="poop-stink-line poop-stink-line-3 absolute bottom-7 left-16 h-7 w-1 bg-[#8B7D61]" />
      {veryDirty ? (
        <>
          <span className="absolute bottom-1 left-12 h-2 w-8 rounded-full bg-[#5E4A3C]/70" />
          <span className="absolute bottom-5 right-2 h-2 w-5 rounded-full bg-[#5E4A3C]/70" />
        </>
      ) : null}
    </div>
  );
}
