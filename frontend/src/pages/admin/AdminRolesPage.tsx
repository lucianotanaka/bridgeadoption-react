import DataTablePage from "@/components/ui/DataTablePage";
export default function AdminRolesPage() {
  return <DataTablePage title="Admin — Roles & Auth" subtitle="Authorization Roles Management" endpoint="/admin/roles" queryKey={["admin-roles-list"]} maxCols={8} />;
}
