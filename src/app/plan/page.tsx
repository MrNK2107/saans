import type { Metadata } from "next";
import { PlanApp } from "@/ui/plan/PlanApp";

export const metadata: Metadata = { title: "Your plan" };

export default function Page() {
  return <PlanApp />;
}
