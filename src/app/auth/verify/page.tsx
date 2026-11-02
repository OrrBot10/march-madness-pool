import { Suspense } from "react";
import Loading from "@/app/loading";
import { SITE } from "@/lib/site";
import { FinishSignIn } from "./FinishSignIn";

/**
 * Where the emailed link lands. Signing in takes a button press because some mail services
 * (including Outlook/Hotmail) open links automatically to scan them, which would use up a one-time link.
 */
export default function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl">Welcome to {SITE.titleLead} pool</h1>
      <Suspense fallback={<Loading />}>
        <Token searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Token({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token;
  if (typeof token !== "string" || !token) {
    return <p className="mt-4 text-sm text-loss">This sign-in link is incomplete. Request a new one from the sign-in page.</p>;
  }
  return <FinishSignIn token={token} />;
}
