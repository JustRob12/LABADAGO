import React from "react";
import Link from "next/link";
import { Waves } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  clickable?: boolean;
  href?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showSubtitle = false,
  clickable = true,
  href = "/customer",
  className = "",
}) => {
  const sizeClasses = {
    sm: {
      text: "text-lg",
      iconBox: "w-7 h-7 rounded-md",
      icon: 15,
      subText: "text-[10px]",
    },
    md: {
      text: "text-xl",
      iconBox: "w-8 h-8 rounded-lg",
      icon: 18,
      subText: "text-xs",
    },
    lg: {
      text: "text-2xl sm:text-3xl",
      iconBox: "w-10 h-10 rounded-lg",
      icon: 22,
      subText: "text-xs",
    },
    xl: {
      text: "text-3xl sm:text-4xl",
      iconBox: "w-12 h-12 rounded-xl",
      icon: 26,
      subText: "text-xs",
    },
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Clean shadcn icon container */}
      <div
        className={`${sizeClasses.iconBox} flex items-center justify-center bg-blue-600 text-white shadow-2xs shrink-0`}
      >
        <Waves size={sizeClasses.icon} />
      </div>

      <div className="flex flex-col">
        <div className={`font-bold tracking-tight ${sizeClasses.text} flex items-center`}>
          {/* Labada in Blue */}
          <span className="text-blue-600">Labada</span>
          {/* Go in Green */}
          <span className="text-emerald-500 ml-0.5">Go</span>
        </div>
        {showSubtitle && (
          <span className={`text-slate-400 font-medium tracking-wide uppercase ${sizeClasses.subText}`}>
            Fresh • Clean • On-the-Go
          </span>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
};
