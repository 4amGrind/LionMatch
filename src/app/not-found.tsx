import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <EmptyState>We could not find that page.</EmptyState>
      <Link href="/" className="block rounded-xl bg-ct-navy py-3 text-center text-sm font-bold text-white">
        Back to swiping
      </Link>
    </div>
  );
}
