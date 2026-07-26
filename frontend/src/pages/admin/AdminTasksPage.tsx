import DataTablePage from "@/components/ui/DataTablePage";
export default function AdminTasksPage() {
  return <DataTablePage title="Admin — Tasks" subtitle="Task Administration & Bulk Operations" endpoint="/tasks/filter-options" queryKey={["admin-task-meta"]} maxCols={8} />;
}
