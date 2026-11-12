"use client";

import { useId, useState, type ComponentProps } from "react";
import { Icon } from "./Icon";

type PasswordFieldProps = Omit<ComponentProps<"input">, "type"> & {
    label: string;
};

/** A password input with an eye button: open eye = password shown, slashed eye = hidden. */
export function PasswordField({ label, ...inputProps }: PasswordFieldProps) {
    const id = useId();
    const [visible, setVisible] = useState(false);

    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-xs font-medium tracking-wider text-muted uppercase">
                {label}
            </label>
            <div className="relative">
                <input
                    {...inputProps}
                    id={id}
                    type={visible ? "text" : "password"}
                    className="min-h-12 w-full rounded-[10px] border border-line-strong bg-surface pr-12 pl-3.5 text-[15px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-ink"
                />
                <button
                    type="button"
                    onClick={() => setVisible((shown) => !shown)}
                    aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
                    aria-pressed={visible}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[10px] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                >
                    <Icon name={visible ? "eye" : "eyeOff"} size={20} />
                </button>
            </div>
        </div>
    );
}
