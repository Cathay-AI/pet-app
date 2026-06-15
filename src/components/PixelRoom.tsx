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
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#17172C]" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 h-[72%] bg-[#1A1A2E]">
        <PixelStars lowMood={lowMood} />
        <div className="absolute left-6 top-8 grid h-16 w-16 grid-cols-4 grid-rows-4 border-4 border-[#0E0E1E] bg-[#25345E] shadow-[4px_4px_0_#0E0E1E]">
          <span className="col-span-2 row-span-2 border-b-2 border-r-2 border-[#0E0E1E] bg-[#314A7E]" />
          <span className="col-span-2 row-span-2 border-b-2 border-[#0E0E1E] bg-[#25345E]" />
          <span className="col-span-2 row-span-2 border-r-2 border-[#0E0E1E] bg-[#1D294C]" />
          <span className="col-span-2 row-span-2 bg-[#314A7E]" />
        </div>
        <div className={`absolute left-16 top-28 h-2 w-28 ${lowMood ? "bg-[#2A2A46]" : "bg-[#5B6EA6]"} opacity-50`} />
        <div className={`absolute left-24 top-32 h-2 w-20 ${lowMood ? "bg-[#2A2A46]" : "bg-[#5B6EA6]"} opacity-40`} />

        <div className="absolute right-8 top-9 h-4 w-24 bg-[#0E0E1E]" />
        <div className="absolute right-10 top-5 h-6 w-6 border-2 border-[#0E0E1E] bg-[#D4A96A]" />
        <div className="absolute right-20 top-4 h-7 w-5 border-2 border-[#0E0E1E] bg-[#7F77DD]" />
        <div className="absolute right-28 top-7 h-4 w-4 border-2 border-[#0E0E1E] bg-[#5DCAA5]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[#2A2A46]">
        <div className="absolute inset-x-0 top-0 h-2 bg-[#0E0E1E]" />
        <div className="absolute inset-x-0 top-8 h-1 bg-[#343458]" />
        <div className="absolute inset-x-0 top-16 h-1 bg-[#22223D]" />

        <div className="absolute bottom-4 left-9 h-6 w-20 border-2 border-[#0E0E1E] bg-[#D4A96A] shadow-[3px_3px_0_#0E0E1E]" />
        <div className="absolute bottom-8 left-12 h-5 w-16 border-2 border-[#0E0E1E] bg-[#F5E6C8]" />
        <div className="absolute bottom-8 left-12 h-3 w-16 bg-[#E8734A]" />

        <div className="absolute bottom-5 right-12 h-4 w-12 border-2 border-[#0E0E1E] bg-[#F5E6C8] shadow-[2px_2px_0_#0E0E1E]" />
        <div className="absolute bottom-8 right-14 h-2 w-8 bg-[#D4A96A]" />
        {!lowHunger ? <div className="absolute bottom-9 right-16 h-2 w-4 bg-[#5DCAA5]" /> : null}

        {dirty ? <DirtyPixels veryDirty={veryDirty} /> : null}
      </div>
    </div>
  );
}

function PixelStars({ lowMood }: { lowMood: boolean }) {
  const color = lowMood ? "bg-[#3B3B5F]" : "bg-[#F7D46A]";
  return (
    <>
      <span className={`absolute right-24 top-20 h-1 w-1 ${color}`} />
      <span className={`absolute right-36 top-[3.75rem] h-1 w-1 ${color}`} />
      <span className={`absolute left-32 top-12 h-1 w-1 ${color}`} />
      <span className={`absolute left-40 top-24 h-1 w-1 ${color}`} />
    </>
  );
}

function DirtyPixels({ veryDirty }: { veryDirty: boolean }) {
  return (
    <>
      <span className="absolute bottom-[6.6rem] left-[25%] h-3 w-3 bg-[#5E3A26]" />
      <span className="absolute bottom-[6.1rem] left-[22%] h-4 w-8 bg-[#6F452D]" />
      <span className="absolute bottom-[5.55rem] left-[19%] h-5 w-14 border-2 border-[#0E0E1E] bg-[#8B5A3C] shadow-[3px_3px_0_#0E0E1E]" />
      <span className="poop-stink-line poop-stink-line-1 absolute bottom-[7.7rem] left-[21%] h-8 w-1 bg-[#82D8A8]" />
      <span className="poop-stink-line poop-stink-line-2 absolute bottom-[8.2rem] left-[27%] h-9 w-1 bg-[#82D8A8]" />
      <span className="poop-stink-line poop-stink-line-3 absolute bottom-[7.6rem] left-[34%] h-7 w-1 bg-[#82D8A8]" />
      <span className="absolute bottom-9 left-32 h-2 w-2 bg-[#8B6F5E]" />
      <span className="absolute bottom-6 left-40 h-1 w-3 bg-[#8B6F5E]" />
      <span className="absolute bottom-12 right-36 h-2 w-2 bg-[#8B6F5E]" />
      {veryDirty ? (
        <>
          <span className="absolute bottom-[5.2rem] left-[17%] h-3 w-4 bg-[#5E4A3C]" />
          <span className="absolute bottom-[4.9rem] left-[32%] h-2 w-5 bg-[#5E4A3C]" />
          <span className="absolute bottom-[7.7rem] left-[38%] h-3 w-3 bg-[#82D8A8]" />
          <span className="absolute bottom-14 left-24 h-2 w-3 bg-[#5E4A3C]" />
          <span className="absolute bottom-7 right-28 h-2 w-2 bg-[#5E4A3C]" />
          <span className="absolute bottom-16 right-20 h-1 w-3 bg-[#5E4A3C]" />
        </>
      ) : null}
    </>
  );
}
