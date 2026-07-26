import DataTablePage from "@/components/ui/DataTablePage";
export default function FarolPage() {
  return <DataTablePage title="Portfolio — Farol" subtitle="Traffic Light — Client Health Status" endpoint="/portfolio/farol" queryKey={["portfolio-farol"]} maxCols={12} />;
}
