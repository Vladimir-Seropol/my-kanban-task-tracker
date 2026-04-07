import { useState } from "react";
import styles from "./UserAvatar.module.css";

/** Лежит в `public/`. Можно заменить на свой `icons_user.webp` и поменять путь здесь. */
export const DEFAULT_USER_AVATAR = "/icons_user.svg";

type UserAvatarProps = {
  src?: string;
  alt: string;
  className?: string;
};

export const UserAvatar = ({ src, alt, className }: UserAvatarProps) => {
  const [attemptIndex, setAttemptIndex] = useState(0);
  const sources = [src, DEFAULT_USER_AVATAR].filter(Boolean) as string[];
  const effective = sources[attemptIndex];
  const initials = alt
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (!effective) {
    return (
      <div className={[styles.avatar, styles.fallback, className].filter(Boolean).join(" ")}>
        {initials || "U"}
      </div>
    );
  }

  return (
    <img
      className={[styles.avatar, className].filter(Boolean).join(" ")}
      src={effective}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setAttemptIndex((idx) => idx + 1)}
    />
  );
};
