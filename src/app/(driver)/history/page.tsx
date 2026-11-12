import { HistoryList } from "@/components/driver/history/HistoryList";
import { driverData } from "@/lib/driver/data/driverData";

export default async function HistoryPage() {
    // BACKEND: the driver's cash-up list. Real or mock is decided in src/lib/driver/data/driverData.ts.
    const history = await driverData.getHistory();

    return (
        <div className="flex flex-col gap-3 md:gap-5">
            <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">History</h1>
            <HistoryList items={history} />
        </div>
    );
}
