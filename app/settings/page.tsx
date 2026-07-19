import SettingsPanel from "@/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="grid gap-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold">Account settings</h1>
      <SettingsPanel />
    </div>
  );
}
