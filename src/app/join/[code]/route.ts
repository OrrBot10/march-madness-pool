import { redirect } from "next/navigation";
import { isValidInvite, rememberInvite } from "@/lib/invite";
import { getCurrentPerson } from "@/lib/session";

/** The invite link from Josh's email. Works forever (until he resets it); doubles as a "log in" bookmark. */
export async function GET(_: Request, { params }: RouteContext<"/join/[code]">) {
  const { code } = await params;
  if (!(await isValidInvite(code))) redirect("/signin?invite=invalid");
  await rememberInvite(code);
  redirect((await getCurrentPerson()) ? "/picks" : "/signin");
}
