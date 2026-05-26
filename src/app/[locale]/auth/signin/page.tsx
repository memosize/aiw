import SignForm from "@/components/sign/form";
import { customAuth } from "@/lib/auth";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function normalizeCallbackUrl(value?: string) {
  if (!value) {
    return "/";
  }

  try {
    const parsedUrl = new URL(value, "http://localhost");
    const nextUrl = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

    if (
      !nextUrl.startsWith("/") ||
      /^\/([a-z]{2}(?:-[A-Z]{2})?)?\/?auth\/signin(?:[/?#]|$)/.test(nextUrl)
    ) {
      return "/";
    }

    return nextUrl;
  } catch {
    return "/";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl: string | undefined }>;
}) {
  noStore();
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = normalizeCallbackUrl(callbackUrl);

  // Get session using custom auth (matches the session created by /api/auth/login)
  const session = await customAuth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    return redirect(safeCallbackUrl);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border text-primary-foreground">
            <img src="/logo.png" alt="logo" className="size-4" />
          </div>
          {process.env.NEXT_PUBLIC_PROJECT_NAME}
        </a>
        <SignForm callbackUrl={safeCallbackUrl} />
      </div>
    </div>
  );
}
