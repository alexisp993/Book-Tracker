import { SearchResultsView } from "@/components/SearchResultsView";

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <SearchResultsView initialQ={q ?? ""} />;
}
