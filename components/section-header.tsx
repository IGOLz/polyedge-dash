interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
        {title}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-zinc-800/60 to-transparent" />
    </div>
  );
}
