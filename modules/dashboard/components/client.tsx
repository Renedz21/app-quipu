"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Header from "./header";

type Props = {
  preloaded: Preloaded<typeof api.payday.getDashboardData>;
};

export default function Client({ preloaded }: Props) {
  const data = usePreloadedQuery(preloaded);
  return (
    <>
      <Header name={data?.profile?.name} month={data?.month} />
    </>
  );
}
