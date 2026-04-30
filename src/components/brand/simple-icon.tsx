import * as icons from "simple-icons";

type SimpleIconProps = {
  slug: "reddit" | "x" | "ycombinator" | "github" | "googlechrome" | "resend";
  className?: string;
  title?: string;
};

const iconMap = {
  reddit: icons.siReddit,
  x: icons.siX,
  ycombinator: icons.siYcombinator,
  github: icons.siGithub,
  googlechrome: icons.siGooglechrome,
  resend: icons.siResend,
};

export function SimpleIcon({ slug, className, title }: SimpleIconProps) {
  const icon = iconMap[slug];

  return (
    <svg
      role="img"
      aria-label={title ?? icon.title}
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d={icon.path} />
    </svg>
  );
}
