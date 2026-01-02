import React from "react";
export default function Card({ className="", children }: React.PropsWithChildren<{className?:string}>) {
  return <div className={`card ${className}`}>{children}</div>;
}
