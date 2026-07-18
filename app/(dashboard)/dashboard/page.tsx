export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm">Total Plants</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-semibold tabular-nums">1,234</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm">Healthy</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-semibold tabular-nums text-[var(--status-healthy)]">980</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm">Needs Attention</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-semibold tabular-nums text-[var(--status-watching)]">120</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm">Sick</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-semibold tabular-nums text-[var(--status-sick)]">34</div>
          </div>
        </div>
      </div>
    </div>
  );
}
