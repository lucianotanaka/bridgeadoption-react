import DataTablePage from "@/components/ui/DataTablePage";
export default function AdminTeamGoalsPage() {
  return <DataTablePage title="Admin — Team Goals" subtitle="Team Performance Targets" endpoint="/admin/team-goals" queryKey={["admin-team-goals"]} maxCols={10} />;
}
