import { fetchDashboardData } from "@/lib/api";
import { DashboardClient } from "@/components/DashboardClient";
import { PageError } from "@/components/ui/skeleton";

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let data;
  try {
    data = await fetchDashboardData();
  } catch (error) {
    console.error("Dashboard server-side fetch failed:", error);
    return (
      <div className="flex h-screen items-center justify-center">
        <PageError
          title="無法連接後端"
          description="請確認 FastAPI 伺服器已啟動於 127.0.0.1:8000，或 INTERNAL_API_URL 設定正確。"
        />
      </div>
    );
  }

  return <DashboardClient data={data} />;
}
