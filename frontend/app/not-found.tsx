import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return <EmptyState title="Page not found." body="The page you're looking for doesn't exist." action={{ href: "/", label: "Back to overview" }} />;
}
