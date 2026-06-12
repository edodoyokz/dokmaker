export default function WalletLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mb-6 rounded-lg border bg-white p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-10 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-10 w-24 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="divide-y p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between py-3">
              <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
