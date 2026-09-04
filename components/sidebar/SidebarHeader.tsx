import Link from "next/link";
import MenuIcon from "../svg/icons/MenuIcon";
import { Sparkles, Crown } from "lucide-react";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";

const SidebarHeader = ({ toggleSidebar, isCollapsed }: SidebarHeaderProps) => {
  const { openPricingModal, tier } = useSubscriptionStore();

  return (
    <div className="text-foreground flex w-full h-[57px] dark:h-14 px-4 justify-between items-center border-b border-border transition-all duration-300 hide-on-scroll">
      <div className="flex items-center gap-4">
        <Link
          href={`/home`}
          className={`text-xl font-bold cursor-pointer ${
            isCollapsed && "hidden"
          }`}
          title="Al-Juthur - Home"
        >
          Al-Juthur
        </Link>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Link
              href="/lexicon"
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-foreground border border-border hover:bg-card transition-all"
            >
              Lexicon
            </Link>
            <Link
              href="/tafsir"
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-foreground border border-border hover:bg-card transition-all"
            >
              Tafsir
            </Link>
          </div>
        )}
      </div>
      <MenuIcon onClick={toggleSidebar} />
    </div>
  );
};

export default SidebarHeader;
