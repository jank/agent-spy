interface Props {
  dataUrl: string;
  fileName: string;
}

export function ImageViewer({ dataUrl, fileName }: Props) {
  return (
    <div className="h-full overflow-auto flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 p-4">
      <img
        src={dataUrl}
        alt={fileName}
        className="max-w-full max-h-full object-contain rounded shadow-lg"
      />
    </div>
  );
}
