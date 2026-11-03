import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <EmptyState title="Page not found." body="The page you're looking for doesn't exist." action={{ href: "/", label: "Back to home" }} />
    </div>
  );
}
