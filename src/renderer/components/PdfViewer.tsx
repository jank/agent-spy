interface Props {
  dataUrl: string;
}

export function PdfViewer({ dataUrl }: Props) {
  return (
    <div className="h-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
      <iframe src={dataUrl} className="w-full h-full border-0" title="PDF viewer" />
    </div>
  );
}
