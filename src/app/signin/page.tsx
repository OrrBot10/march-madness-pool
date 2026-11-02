import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentPerson } from "@/lib/session";
import Loading from "@/app/loading";
import { hasInvite } from "@/lib/invite";
import { SITE } from "@/lib/site";
import { SignInForm } from "./SignInForm";

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl">Sign in</h1>
      <Suspense fallback={<Loading />}>
        <SignInBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SignInBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const badLink = (await searchParams).invite === "invalid";
  if (await getCurrentPerson()) redirect("/picks");
  if (!(await hasInvite())) {
    return (
      <div className="mt-4 space-y-2 rounded-lg border border-line bg-surface p-4 text-sm">
        <p className="font-semibold">
          {badLink ? "That invite link isn’t current." : `This is ${SITE.owner}’s private, invite-only pool.`}
        </p>
        <p className="text-muted">
          To join or sign in, open the link from Josh’s invite email. Want in? Ask Josh for the latest link.
        </p>
        <details className="pt-2">
          <summary className="cursor-pointer text-xs text-muted">Organizer sign-in</summary>
          <SignInForm />
        </details>
      </div>
    );
  }
  return (
    <>
      <p className="mt-1 text-sm text-muted">
        Enter your email. If you’re new, we’ll ask your name and you’re in. No password needed.
      </p>
      <SignInForm />
    </>
  );
}
