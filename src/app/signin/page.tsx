import { SITE } from "@/lib/site";
import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        This is {SITE.owner}’s private March Madness pool. Enter your name and email and we’ll send you a link.
        No password needed.
      </p>
      <SignInForm />
    </div>
  );
}
