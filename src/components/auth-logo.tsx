import Image from "next/image";
import Link from "next/link";

export function AuthLogo() {
  return (
    <Link
      href="/"
      aria-label="ThinkPin home"
      className="inline-flex items-center gap-2 rounded-sm text-[15px] font-semibold tracking-[-0.02em] text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <Image
        src="/icon-light.svg"
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        className="size-8 dark:hidden"
        loading="eager"
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        className="hidden size-8 dark:block"
        loading="eager"
      />
      <span>ThinkPin</span>
    </Link>
  );
}
