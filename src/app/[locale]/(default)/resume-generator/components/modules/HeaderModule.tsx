"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  AlertCircle,
  Github,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Upload,
  User,
  X,
} from "lucide-react";
import { useResume } from "../ResumeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HeaderModule() {
  const { data, updateHeaderData } = useResume();
  const formData = data.header;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState({
    linkedin: false,
    github: false,
  });

  const toggleOptionalField = (field: "linkedin" | "github") => {
    setShowOptionalFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("请上传 JPG、PNG 或 WebP 格式的图片");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("图片大小不能超过 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "上传失败");
      }

      updateHeaderData({
        profilePicture: {
          url: result.data.url,
          key: result.data.key,
        },
      });

      toast.success("头像上传成功");
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error instanceof Error ? error.message : "上传失败，请重试");
      toast.error("头像上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!formData.profilePicture) return;

    try {
      const response = await fetch(
        `/api/upload/avatar?key=${encodeURIComponent(formData.profilePicture.key)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("删除失败");
      }

      updateHeaderData({ profilePicture: undefined });
      toast.success("头像已删除");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("删除失败，请重试");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          请使用英文/拼音填写基本信息，确保生成后的简历可直接用于英文申请或求职。姓名、城市、国家等固定信息请按英文简历格式填写。
        </p>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4 xl:p-6">
        <div className="flex flex-col items-center gap-4 xl:flex-row">
          <div className="flex-shrink-0">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted">
              {formData.profilePicture ? (
                <>
                  <Image
                    src={formData.profilePicture.url}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100" />
                </>
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="flex-1 text-center xl:text-left">
            <h4 className="mb-2 text-xs font-medium text-foreground">
              英文简历通常不建议添加照片。如申请要求或个人需要，可在此上传
            </h4>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1.5 h-3 w-3" />
                      {formData.profilePicture ? "更换照片" : "添加照片"}
                    </>
                  )}
                </Button>

                {formData.profilePicture && (
                  <Button
                    variant="destructive"
                    className="h-8 px-3 text-xs"
                    onClick={handleRemovePhoto}
                  >
                    <X className="mr-1.5 h-3 w-3" />
                    删除
                  </Button>
                )}
              </div>

              {uploadError && (
                <div className="flex items-center gap-1.5 text-[10px] text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {uploadError}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                支持 JPG、PNG、WebP 格式，最大 5MB
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4 xl:p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2 text-xs font-medium text-foreground">
              姓名（英文） <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="例如：Zhang San"
              value={formData.full_name}
              onChange={(e) => updateHeaderData({ full_name: e.target.value })}
              className="h-10 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2 text-xs font-medium text-foreground">
                <MapPin className="h-3 w-3" />
                所在城市 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                placeholder="例如：Beijing"
                value={formData.city}
                onChange={(e) => updateHeaderData({ city: e.target.value })}
                className="h-10 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                英文简历请直接输入英文城市 / 国家，例如 Melbourne, Australia
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2 text-xs font-medium text-foreground">
                <MapPin className="h-3 w-3" />
                所在国家 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="country"
                placeholder="例如：China"
                value={formData.country}
                onChange={(e) => updateHeaderData({ country: e.target.value })}
                className="h-10 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Mail className="h-3 w-3" />
                邮箱地址 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="例如：zhangsan@example.com"
                value={formData.email}
                onChange={(e) => updateHeaderData({ email: e.target.value })}
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Phone className="h-3 w-3" />
                手机号（国际格式） <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="例如：+86 138 1234 5678"
                value={formData.phone}
                onChange={(e) => updateHeaderData({ phone: e.target.value })}
                className="h-10 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block text-xs font-medium text-foreground">可选信息</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleOptionalField("linkedin")}
                className={`h-8 px-3 text-xs ${showOptionalFields.linkedin ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
                <Linkedin className="mr-1.5 h-3 w-3" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleOptionalField("github")}
                className={`h-8 px-3 text-xs ${showOptionalFields.github ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
                <Github className="mr-1.5 h-3 w-3" />
                GitHub
              </Button>
            </div>
          </div>

          {showOptionalFields.linkedin && (
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Linkedin className="h-3 w-3" />
                LinkedIn 链接
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                  <span className="text-[10px] text-muted-foreground">linkedin.com/in/</span>
                </div>
                <Input
                  id="linkedin"
                  placeholder="例如：username"
                  value={formData.linkedin ? formData.linkedin.replace("https://linkedin.com/in/", "") : ""}
                  onChange={(e) =>
                    updateHeaderData({
                      linkedin: e.target.value ? `https://linkedin.com/in/${e.target.value}` : "",
                    })
                  }
                  className="h-10 pl-24 text-xs"
                />
              </div>
            </div>
          )}

          {showOptionalFields.github && (
            <div className="space-y-2">
              <Label htmlFor="github" className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Github className="h-3 w-3" />
                GitHub 链接
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                  <span className="text-[10px] text-muted-foreground">github.com/</span>
                </div>
                <Input
                  id="github"
                  placeholder="例如：username"
                  value={formData.github ? formData.github.replace("https://github.com/", "") : ""}
                  onChange={(e) =>
                    updateHeaderData({
                      github: e.target.value ? `https://github.com/${e.target.value}` : "",
                    })
                  }
                  className="h-10 pl-20 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
