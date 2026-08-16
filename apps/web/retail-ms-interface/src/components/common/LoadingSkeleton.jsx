export default function LoadingSkeleton({ rows = 4, type = 'card' }) {
  if (type === 'metrics') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 animate-pulse">
            <div className="h-3 w-24 bg-white/[0.06] rounded mb-3" />
            <div className="h-8 w-20 bg-white/[0.06] rounded mb-2" />
            <div className="h-3 w-16 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="glass rounded-xl animate-pulse">
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <div className="h-4 w-32 bg-white/[0.06] rounded" />
        </div>
        <div className="p-4 h-64 flex items-end gap-2 px-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-white/[0.04] rounded-t"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="h-10 w-10 bg-white/[0.06] rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-white/[0.06] rounded" />
              <div className="h-3 w-1/2 bg-white/[0.06] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
