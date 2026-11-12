import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses, type ButtonVariant } from "./driver/Button";

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

/** Navigation (a link) that looks like a button. Use Button for actions, this for going to a page. */
export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
    return <Link className={buttonClasses(variant, className)} {...props} />;
}
