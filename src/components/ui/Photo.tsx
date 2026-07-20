"use client";

import { useState } from "react";

export default function Photo({
  src,
  alt,
  className = "",
  imgClassName = "",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-emerald-800 to-emerald-deep ${className}`}
    >
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-all duration-700 ${
            loaded ? "scale-100 opacity-100" : "scale-105 opacity-0"
          } ${imgClassName}`}
        />
      )}
      {failed && (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700 via-emerald-deep to-teal-deep">
          <span className="font-display text-sm text-gold-soft/70">
            AK BERMET
          </span>
        </div>
      )}
    </div>
  );
}
