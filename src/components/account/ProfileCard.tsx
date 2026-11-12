import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type ProfileCardProps = {
    fullName: string;
    email: string;
    role: string;
};

export function ProfileCard({ fullName, email, role }: ProfileCardProps) {
    return (
        <Card className="flex flex-col items-center gap-2.5 px-6 py-7 text-center">
            <span
                aria-hidden="true"
                className="flex size-18 items-center justify-center rounded-full bg-ink font-heading text-[26px] font-bold text-white"
            >
                {fullName.trim().charAt(0).toUpperCase()}
            </span>
            <span className="font-heading text-xl font-bold">{fullName}</span>
            <span className="text-sm text-muted">{email}</span>
            <Badge tone="neutral">{role}</Badge>
        </Card>
    );
}
