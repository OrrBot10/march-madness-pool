import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Use the email Josh sends pool updates to.</p>
      <SignInForm />
      <p className="mt-6 rounded-md bg-chip p-3 text-xs text-muted">
        Local test version: there’s no email check yet. The real site will email you a one-click sign-in link.
      </p>
    </div>
  );
}
