import PastPanel from "@/components/PastPanel";
import CsvUploadPanel from "@/components/CsvUploadPanel";

export default function PastPage() {
  return (
    <div className="grid gap-4">
      <CsvUploadPanel />
      <PastPanel />
    </div>
  );
}
