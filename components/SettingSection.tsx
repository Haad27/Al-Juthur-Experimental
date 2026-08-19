import React from "react";

const SettingSection = ({
  title,
  description,
  control,
  icon,
}: {
  title: string;
  description: string;
  control: any;
  icon?: React.ReactNode;
}) => (
  <section className="p-3.5 sm:p-4 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl space-y-3 shadow-lg hover:border-zinc-700/60 transition-all duration-200 group w-full min-w-0 max-w-full overflow-x-hidden">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon && <div className="text-emerald-400 shrink-0">{icon}</div>}
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
          {title}
        </h2>
      </div>
    </div>
    <div className="pt-0.5">{control}</div>
    {description && (
      <p className="text-[11px] text-zinc-400 leading-relaxed">{description}</p>
    )}
  </section>
);

export default SettingSection;
