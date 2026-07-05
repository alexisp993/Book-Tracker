import { Suspense } from "react";
import { LibraryView } from "@/components/LibraryView";

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryView />
    </Suspense>
  );
}
