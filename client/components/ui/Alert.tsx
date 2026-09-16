import React from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

interface AlertProps {
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  message,
  className = "",
}) => {
  const styles = {
    success: {
      bg: "bg-emerald-50/70",
      border: "border-emerald-200",
      text: "text-emerald-900",
      titleText: "text-emerald-950",
      icon: <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />,
    },
    error: {
      bg: "bg-red-50/70",
      border: "border-red-200",
      text: "text-red-900",
      titleText: "text-red-950",
      icon: <XCircle className="text-red-600 shrink-0" size={16} />,
    },
    warning: {
      bg: "bg-amber-50/70",
      border: "border-amber-200",
      text: "text-amber-900",
      titleText: "text-amber-950",
      icon: <AlertCircle className="text-amber-600 shrink-0" size={16} />,
    },
    info: {
      bg: "bg-blue-50/70",
      border: "border-blue-200",
      text: "text-blue-900",
      titleText: "text-blue-950",
      icon: <Info className="text-blue-600 shrink-0" size={16} />,
    },
  }[type];

  return (
    <div
      className={`flex items-start gap-3 px-3.5 py-3 rounded-lg border text-sm ${styles.bg} ${styles.border} ${styles.text} ${className}`}
      role="alert"
    >
      <div className="mt-0.5">{styles.icon}</div>
      <div className="flex-1">
        {title && <p className={`font-semibold text-xs ${styles.titleText}`}>{title}</p>}
        <p className="text-xs leading-relaxed">{message}</p>
      </div>
    </div>
  );
};
