import DataTablePage from "@/components/ui/DataTablePage";
export default function RenewalsPage() {
  return <DataTablePage title="Renewals" subtitle="Cisco Subscription Renewals" endpoint="/renewals" queryKey={["renewals"]} maxCols={12} />;
}
