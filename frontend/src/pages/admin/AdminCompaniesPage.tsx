import DataTablePage from "@/components/ui/DataTablePage";
export default function AdminCompaniesPage() {
  return <DataTablePage title="Admin — Companies" subtitle="Company & Customer Management" endpoint="/admin/companies" queryKey={["admin-companies"]} searchField="company_name" maxCols={10} />;
}
