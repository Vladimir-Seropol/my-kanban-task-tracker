import styles from "./Button.module.css";
import clsx from "clsx";
import type { ButtonProps } from "./Button.types";

export const Button: React.FC<ButtonProps> = ({
  children,
  disabled,
  variant = "secondary",
  size = "md",
  className,
  ...rest
}) => {
  return (
    <button
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        {
          [styles.disabled]: disabled,
        },
        className,
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};
