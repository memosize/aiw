import { getUsers, getUsersTotal } from "@/models/user";
import { getUserQuotaSummary, ServiceType } from "@/models/service-quota";
import { getSiteSetting } from "@/models/site-settings";
import UsersManagement from "./components/users-management";

const PAGE_SIZE = 10;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = (resolvedSearchParams?.q || "").trim().slice(0, 100);
  const requestedPage = Number(resolvedSearchParams?.page || "1");
  const totalUsers = (await getUsersTotal(searchQuery)) || 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const currentPage = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    totalPages
  );
  const users = await getUsers(currentPage, PAGE_SIZE, searchQuery);

  const quotasMap: Record<string, Record<ServiceType, number>> = {};
  if (users && users.length > 0) {
    await Promise.all(
      users.map(async (user: any) => {
        if (user.uuid) {
          quotasMap[user.uuid] = await getUserQuotaSummary(user.uuid);
        }
      })
    );
  }

  const envAdmins = (process.env.ADMIN_EMAILS?.split(",") || []).map((e: string) => e.trim()).filter(Boolean);
  const dbValue = await getSiteSetting("admin_emails");
  const dbAdmins = dbValue ? dbValue.split(",").map((e: string) => e.trim()).filter(Boolean) : [];
  const adminEmails = [...new Set([...envAdmins, ...dbAdmins])];

  return (
    <UsersManagement
      users={users || []}
      userQuotasMap={quotasMap}
      adminEmails={adminEmails}
      currentPage={currentPage}
      pageSize={PAGE_SIZE}
      totalUsers={totalUsers}
      totalPages={totalPages}
      searchQuery={searchQuery}
    />
  );
}
