import DataTablePage from "@/components/ui/DataTablePage";
export default function UseCasesPage() {
  return <DataTablePage title="Use Cases" subtitle="Customer Use Case Applicability & Exit Criteria" endpoint="/adoption/use-cases" queryKey={["use-cases"]} searchField="customer_name" maxCols={10} />;
}
