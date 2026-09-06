export default function AgentLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8" aria-busy="true" aria-label="Loading agent">
      <div className="flex items-center gap-4">
        <div className="skeleton h-14 w-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-7 w-56" />
          <div className="skeleton h-4 w-80" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="panel space-y-3 p-5">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-28 w-full" />
          </div>
          <div className="panel space-y-3 p-5">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-20 w-full" />
          </div>
        </div>
        <div className="panel space-y-3 p-5">
          <div className="skeleton h-5 w-28" />
          <div className="skeleton h-60 w-full" />
        </div>
      </div>
    </div>
  );
}
