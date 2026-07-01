import { BookDetailView } from "@/components/BookDetailView";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookDetailView id={id} />;
}
