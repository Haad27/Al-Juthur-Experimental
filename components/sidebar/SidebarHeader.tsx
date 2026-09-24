import Link from "next/link";
import MenuIcon from "../svg/icons/MenuIcon";
import LogoIcon from "../svg/icons/LogoIcon";
import { cn } from "@/lib/utils";
import { Sparkles, Crown } from "lucide-react";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";

const SidebarHeader = ({ toggleSidebar, isCollapsed }: SidebarHeaderProps) => {
  const { openPricingModal, tier } = useSubscriptionStore();

  return (
    <div
      className={cn(
        "text-foreground flex w-full h-14 px-3 items-center border-b border-border transition-all duration-300 shrink-0",
        isCollapsed ? "justify-center" : "justify-between"
      )}
    >
      {!isCollapsed && (
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/home`}
            className="group flex items-center gap-2 cursor-pointer min-w-0"
            title="Al-Juthur"
          >
            <LogoIcon size={24} className="text-accent group-hover:scale-105 transition-transform shrink-0" />
            <span className="text-lg font-bold tracking-tight text-foreground truncate">
              Al-Juthur
            </span>
          </Link>
        </div>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        <MenuIcon onClick={toggleSidebar} />
      </div>
    </div>
  );
};

export default SidebarHeader;
