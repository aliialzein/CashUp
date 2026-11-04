import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

/** Marks a page of a submitted cash-up: nothing on it can be changed. */
export function LockedBadge() {
    return (
        <Badge>
            <span className="inline-flex items-center gap-1">
                <Icon name="lock" size={12} />
                Locked
            </span>
        </Badge>
    );
}
