import { AnalyzeTable } from "@/components/analyze-table";

export default function AnalyzePage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Financial Analysis</h1>
        <p className="text-slate-400">Customizable data table and charts</p>
      </div>
      <AnalyzeTable />
    </div>
  );
}

