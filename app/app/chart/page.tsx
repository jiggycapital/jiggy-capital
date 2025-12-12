import { ChartView } from "@/components/chart-view";

export default function ChartPage() {
  return (
    <div className="container mx-auto py-6 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Charts & Graphs</h1>
        <p className="text-slate-400">Customizable financial charts and visualizations</p>
      </div>
      <ChartView />
    </div>
  );
}

