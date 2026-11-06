import { HistoryList } from "@/components/driver/history/HistoryList";
import { mockHistory } from "@/lib/driver/mock/history";

export default function HistoryPage() {
    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">History</h1>
            <HistoryList items={mockHistory} />
        </div>
    );
}
