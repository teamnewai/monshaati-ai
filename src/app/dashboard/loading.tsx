export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white border-b border-gray-100 h-16" />
      <div className="max-w-7xl mx-auto px-6 py-8 animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-gray-200 rounded-lg" />
            <div className="h-4 w-72 bg-gray-100 rounded" />
          </div>
          <div className="h-12 w-36 bg-gray-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100">
              <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-3 w-72 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
