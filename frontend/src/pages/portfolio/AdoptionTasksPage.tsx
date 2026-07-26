import DataTablePage from "@/components/ui/DataTablePage";
export default function AdoptionTasksPage() {
  return <DataTablePage title="Portfolio — Adoption Tasks" subtitle="Technology Adoption Task Report" endpoint="/portfolio/adoption-tasks" queryKey={["portfolio-adoption-tasks"]} maxCols={12} />;
}
