import { DRTableView } from "@/components/dr-table-view";

export default function DRTablePage() {
  return (
    <div className="container mx-auto py-6 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">DR Table</h1>
        <p className="text-slate-400">Time-series financial data across companies and quarters</p>
      </div>
      <DRTableView />
    </div>
  );
}

