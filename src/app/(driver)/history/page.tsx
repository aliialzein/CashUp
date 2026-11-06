import { HistoryList } from "@/components/history/HistoryList";
import { mockHistory } from "@/lib/mock/history";

export default function HistoryPage() {
    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">History</h1>
            <HistoryList items={mockHistory} />
        </div>
    );
}
