type RankChangeIndicatorProps = {
  rankChange?: number;
  previousRank?: number;
};

export default function RankChangeIndicator({ rankChange, previousRank }: RankChangeIndicatorProps) {
  if (rankChange === undefined || rankChange === null) {
    // New entry
    return (
      <span className="inline-block rounded bg-[#E8734A] px-1.5 py-0.5 text-[10px] font-black text-white" title="新進榜">
        NEW
      </span>
    );
  }

  if (rankChange === 0) {
    // No change
    return (
      <span className="text-xs text-[#8B6F5E]" title="排名持平">
        -
      </span>
    );
  }

  if (rankChange > 0) {
    // Rank improved (went up)
    return (
      <span
        className="inline-flex items-center gap-0.5 text-xs font-black text-[#4CAF50]"
        title={`從第 ${previousRank} 名上升`}
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        {rankChange}
      </span>
    );
  }

  // Rank dropped (went down)
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-black text-[#E24B4A]"
      title={`從第 ${previousRank} 名下降`}
    >
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      {Math.abs(rankChange)}
    </span>
  );
}
