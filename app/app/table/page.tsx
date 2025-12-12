import { TableView } from "@/components/table-view";

export default function TablePage() {
  return (
    <div className="container mx-auto py-6 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Data Table</h1>
        <p className="text-slate-400">Fully customizable table with all columns from your Google Sheets</p>
      </div>
      <TableView />
    </div>
  );
}

