import PastPanel from "@/components/PastPanel";
import CsvUploadPanel from "@/components/CsvUploadPanel";
import TransactionsPanel from "@/components/TransactionsPanel";

export default function PastPage() {
  return (
    <div className="grid gap-4">
      <CsvUploadPanel />
      <PastPanel />
      <TransactionsPanel />
    </div>
  );
}
