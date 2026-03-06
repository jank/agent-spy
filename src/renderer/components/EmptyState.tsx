export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-400">
      <p className="text-lg font-medium mb-1">No file selected</p>
      <p className="text-sm">Select a file from the sidebar to view its contents</p>
    </div>
  );
}
