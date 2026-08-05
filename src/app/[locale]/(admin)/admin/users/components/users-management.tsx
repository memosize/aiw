"use client";

import { useState } from "react";
import moment from "moment";
import { Coins, KeyRound, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/dashboard/header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from "@/types/user";

type DialogType = "password" | "credits" | null;
type ServiceType =
  | "ps_sop"
  | "recommendation"
  | "cover_letter"
  | "resume"
  | "universal";

const SERVICE_LABELS: Record<ServiceType, string> = {
  ps_sop: "PS/SOP",
  recommendation: "推荐信",
  cover_letter: "Cover Letter",
  resume: "简历",
  universal: "通用",
};

const ALL_SERVICE_TYPES: ServiceType[] = [
  "ps_sop",
  "recommendation",
  "cover_letter",
  "resume",
  "universal",
];

const DEFAULT_QUOTAS: Record<ServiceType, number> = {
  ps_sop: 0,
  recommendation: 0,
  cover_letter: 0,
  resume: 0,
  universal: 0,
};

function QuotaSummary({ quotas }: { quotas: Record<ServiceType, number> }) {
  const hasAny = ALL_SERVICE_TYPES.some((type) => (quotas[type] || 0) > 0);

  if (!hasAny) {
    return <span className="text-muted-foreground text-xs">无</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {ALL_SERVICE_TYPES.map((type) => {
        const count = quotas[type] || 0;
        if (count <= 0) {
          return null;
        }

        return (
          <span
            key={type}
            className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium"
          >
            {SERVICE_LABELS[type]}:{count}
          </span>
        );
      })}
    </div>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_: unknown, index: number) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages] as const;
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ] as const;
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ] as const;
}

export default function UsersManagement({
  users,
  userQuotasMap,
  adminEmails: initialAdminEmails,
  currentPage,
  pageSize,
  totalUsers,
  totalPages,
}: {
  users: User[];
  userQuotasMap: Record<string, Record<ServiceType, number>>;
  adminEmails: string[];
  currentPage: number;
  pageSize: number;
  totalUsers: number;
  totalPages: number;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [newPassword, setNewPassword] = useState("");
  const [selectedServiceType, setSelectedServiceType] =
    useState<ServiceType>("ps_sop");
  const [quotaAmount, setQuotaAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotasMap, setQuotasMap] = useState(userQuotasMap);
  const [adminList, setAdminList] = useState<string[]>(initialAdminEmails);
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);

  const visiblePages = getVisiblePages(currentPage, totalPages);
  const startItem = totalUsers === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalUsers === 0 ? 0 : Math.min(currentPage * pageSize, totalUsers);

  const buildPageHref = (page: number) => `/admin/users?page=${page}`;

  const openDialog = (user: User, type: DialogType) => {
    setSelectedUser(user);
    setDialogType(type);
    setNewPassword("");
    setSelectedServiceType("ps_sop");
    setQuotaAmount("");
  };

  const closeDialog = () => {
    setSelectedUser(null);
    setDialogType(null);
  };

  const handleResetPassword = async () => {
    if (!selectedUser?.uuid || !newPassword) {
      return;
    }

    if (newPassword.length < 8) {
      toast.error("密码至少 8 位");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uuid: selectedUser.uuid,
          new_password: newPassword,
        }),
      });
      const result = await res.json();

      if (result.code === 0) {
        toast.success(`已重置 ${selectedUser.email} 的密码`);
        closeDialog();
      } else {
        toast.error(result.message || "重置失败");
      }
    } catch {
      toast.error("重置失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuota = async () => {
    if (!selectedUser?.uuid || !quotaAmount) {
      return;
    }

    const amount = Number(quotaAmount);
    if (Number.isNaN(amount) || amount === 0 || !Number.isInteger(amount)) {
      toast.error("请输入非零整数");
      return;
    }

    const currentQuota =
      quotasMap[selectedUser.uuid]?.[selectedServiceType] || 0;
    if (amount < 0 && Math.abs(amount) > currentQuota) {
      toast.error("减少次数不能超过当前可用次数");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/update-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uuid: selectedUser.uuid,
          service_type: selectedServiceType,
          amount,
        }),
      });
      const result = await res.json();

      if (result.code === 0) {
        const actionText = amount > 0 ? "增加" : "减少";
        toast.success(
          `已为 ${selectedUser.email} ${actionText} ${SERVICE_LABELS[selectedServiceType]} ${Math.abs(amount)} 次`
        );
        setQuotasMap((prev) => ({
          ...prev,
          [selectedUser.uuid!]: result.data.quotas,
        }));
        closeDialog();
      } else {
        toast.error(result.message || "修改失败");
      }
    } catch {
      toast.error("修改失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    if (!user.email) {
      return;
    }

    const isAdmin = adminList.includes(user.email);
    const action = isAdmin ? "remove" : "add";

    setTogglingAdmin(user.uuid || null);
    try {
      const res = await fetch("/api/admin/users/toggle-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, action }),
      });
      const result = await res.json();

      if (result.code === 0) {
        setAdminList(result.data.admin_emails);
        toast.success(
          isAdmin
            ? `已移除 ${user.email} 的管理员身份`
            : `已将 ${user.email} 设为管理员`
        );
      } else {
        toast.error(result.message || "操作失败");
      }
    } catch {
      toast.error("操作失败");
    } finally {
      setTogglingAdmin(null);
    }
  };

  return (
    <>
      <Header />
      <div className="w-full px-4 py-8 md:px-8">
        <h1 className="mb-2 text-2xl font-medium">All Users</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          共 {totalUsers} 个用户，第 {currentPage}/{totalPages} 页，每页 {pageSize} 条
        </p>

        <Card className="overflow-x-auto px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>UUID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Avatar</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>剩余次数</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex w-full items-center justify-center py-8 text-muted-foreground">
                      <p>暂无用户数据</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isAdmin = user.email
                    ? adminList.includes(user.email)
                    : false;

                  return (
                    <TableRow key={user.uuid}>
                      <TableCell className="max-w-[120px] truncate font-mono text-xs">
                        {user.uuid}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.nickname}</TableCell>
                      <TableCell>
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            className="h-10 w-10 rounded-full"
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200" />
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Badge className="bg-primary text-primary-foreground">
                            管理员
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            普通用户
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <QuotaSummary
                          quotas={quotasMap[user.uuid || ""] || DEFAULT_QUOTAS}
                        />
                      </TableCell>
                      <TableCell>
                        {user.created_at
                          ? moment
                              .utc(user.created_at)
                              .utcOffset(8)
                              .format("YYYY-MM-DD HH:mm:ss")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(user, "password")}
                          >
                            <KeyRound className="mr-1 h-3 w-3" />
                            重置密码
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(user, "credits")}
                          >
                            <Coins className="mr-1 h-3 w-3" />
                            修改次数
                          </Button>
                          <Button
                            size="sm"
                            variant={isAdmin ? "destructive" : "outline"}
                            onClick={() => handleToggleAdmin(user)}
                            disabled={togglingAdmin === user.uuid}
                          >
                            {togglingAdmin === user.uuid ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                处理中
                              </>
                            ) : isAdmin ? (
                              <>
                                <ShieldOff className="mr-1 h-3 w-3" />
                                移除管理
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                设为管理
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              当前展示 {startItem} - {endItem} / {totalUsers}
            </div>
            <Pagination className="mx-0 w-auto justify-start md:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildPageHref(Math.max(1, currentPage - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                {visiblePages.map((page, index) => (
                  <PaginationItem key={`${page}-${index}`}>
                    {typeof page === "string" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href={buildPageHref(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href={buildPageHref(Math.min(totalPages, currentPage + 1))}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Dialog
        open={dialogType === "password"}
        onOpenChange={(open: boolean) => {
          if (!open) {
            closeDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>重置用户密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">用户</Label>
              <p className="font-medium">{selectedUser?.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 8 位，包含字母和数字更稳妥"
              />
              <p className="text-muted-foreground text-xs">
                重置后该用户的现有会话会失效，需要重新登录。
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                取消
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={isSubmitting || !newPassword}
              >
                {isSubmitting ? "重置中..." : "确认重置"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogType === "credits"}
        onOpenChange={(open: boolean) => {
          if (!open) {
            closeDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>修改用户服务次数</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground">用户</Label>
              <p className="font-medium">{selectedUser?.email}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground">当前剩余次数</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {ALL_SERVICE_TYPES.map((type) => {
                  const userQuotas =
                    quotasMap[selectedUser?.uuid || ""] || DEFAULT_QUOTAS;

                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="text-muted-foreground text-sm">
                        {SERVICE_LABELS[type]}
                      </span>
                      <span className="text-sm font-bold">
                        {userQuotas[type] || 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>服务类型</Label>
              <Select
                value={selectedServiceType}
                onValueChange={(value: string) =>
                  setSelectedServiceType(value as ServiceType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SERVICE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quota-amount">变更次数</Label>
              <Input
                id="quota-amount"
                type="number"
                step="1"
                value={quotaAmount}
                onChange={(e) => setQuotaAmount(e.target.value)}
                placeholder="正数增加，负数减少，例如 -5"
              />
              <p className="text-muted-foreground text-xs">
                正整数增加次数，负整数减少次数；减少数量不能超过当前可用次数。
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialog}>
                取消
              </Button>
              <Button
                onClick={handleUpdateQuota}
                disabled={isSubmitting || !quotaAmount}
              >
                {isSubmitting ? "修改中..." : "确认修改"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
