type DirtyRoomSignalProps = {
  veryDirty?: boolean;
};

export default function DirtyRoomSignal({ veryDirty = false }: DirtyRoomSignalProps) {
  return (
    <div className={`dirty-room-signal ${veryDirty ? "dirty-room-signal-very" : ""}`} aria-hidden="true">
      <span className="dirty-room-signal-stink dirty-room-signal-stink-1" />
      <span className="dirty-room-signal-stink dirty-room-signal-stink-2" />
      <span className="dirty-room-signal-stink dirty-room-signal-stink-3" />
      <span className="dirty-room-signal-pile dirty-room-signal-pile-top" />
      <span className="dirty-room-signal-pile dirty-room-signal-pile-mid" />
      <span className="dirty-room-signal-pile dirty-room-signal-pile-base" />
      <span className="dirty-room-signal-pile-shine" />
      <span className="dirty-room-signal-dirt dirty-room-signal-dirt-1" />
      <span className="dirty-room-signal-dirt dirty-room-signal-dirt-2" />
      <span className="dirty-room-signal-dirt dirty-room-signal-dirt-3" />
      {veryDirty ? (
        <>
          <span className="dirty-room-signal-dirt dirty-room-signal-dirt-4" />
          <span className="dirty-room-signal-dirt dirty-room-signal-dirt-5" />
        </>
      ) : null}
    </div>
  );
}
