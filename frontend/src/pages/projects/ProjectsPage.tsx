import DataTablePage from "@/components/ui/DataTablePage";
export default function ProjectsPage() {
  return <DataTablePage title="Projects" subtitle="Customer Projects Portfolio" endpoint="/projects" queryKey={["projects"]} searchField="project_ov_name" maxCols={10} />;
}
