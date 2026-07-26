import DataTablePage from "@/components/ui/DataTablePage";
export default function AccountTeamPage() {
  return <DataTablePage title="Portfolio — Account Team" subtitle="Customer Account Team Members" endpoint="/portfolio/account-team" queryKey={["portfolio-account-team"]} maxCols={12} />;
}
