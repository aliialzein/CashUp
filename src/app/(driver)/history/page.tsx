import { HistoryList } from "@/components/history/HistoryList";
import { mockHistory } from "@/lib/mock/history";

export default function HistoryPage() {
    return (
        <div className="space-y-5">
            <h1 className="font-heading text-2xl font-bold tracking-tight">History</h1>
            <HistoryList items={mockHistory} />
        </div>
    );
}
