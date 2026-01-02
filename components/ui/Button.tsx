import React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"ghost" };
export default function Button({ className="", variant="primary", ...rest }: Props) {
  const base = variant === "primary" ? "btn-primary" : "btn-ghost";
  return <button className={`${base} ${className}`} {...rest} />;
}
