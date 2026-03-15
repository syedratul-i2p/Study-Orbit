import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, GraduationCap, MapPin, BookOpen, Target, Loader2, Camera, Users, Clock, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionShell } from "@/components/section-shell";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    username: user?.username || "",
    institution: user?.institution || "",
    country: user?.country || "",
    classLevel: user?.classLevel || "",
    department: user?.department || "",
    board: user?.board || "",
    dailyStudyHours: user?.dailyStudyHours || 4,
  });

  const { data: friends } = useQuery({ queryKey: ["/api/friends"] });

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const updated = await res.json();
      await updateProfile({ profilePicture: updated.profilePicture } as any);
      toast({ title: t.common.success });
    } catch (error: any) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile(form as any);
      toast({ title: t.common.success });
    } catch (error: any) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page-narrow space-y-6">
      <PageHeader
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {t.profile.title}
          </>
        }
        icon={<User className="h-6 w-6 text-primary" />}
        title={t.profile.title || "Profile"}
        description={t.profile.pageDescription}
      >
        <Button onClick={handleSave} disabled={loading} data-testid="button-save-profile" className="rounded-2xl px-5">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t.profile.save}
        </Button>
      </PageHeader>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="app-surface overflow-visible">
          <div className="relative h-32 sm:h-36 rounded-t-[1.6rem] bg-gradient-to-br from-primary/70 via-primary/50 to-primary/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.3),transparent_70%)]" />
          </div>

          <div className="px-5 sm:px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-avatar"
              >
                <div className="rounded-full p-1 bg-background shadow-md">
                  <Avatar className="w-24 h-24">
                    <AvatarImage
                      src={(user as any)?.profilePicture}
                      alt={user?.fullName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary/50 text-primary-foreground text-2xl font-bold">
                      {user?.fullName ? getInitials(user.fullName) : <User className="w-10 h-10" />}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute inset-1 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} data-testid="input-avatar-file" />
              </div>

              <div className="flex-1 text-center sm:text-left pb-1">
                <h2 className="text-xl font-bold" data-testid="text-user-name">{user?.fullName}</h2>
                <p className="text-sm text-muted-foreground">@{user?.username}</p>
              </div>

              {Array.isArray(friends) && (
                <div className="app-panel flex items-center gap-1.5 pb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground" data-testid="text-friend-count">{friends.length} {t.profile.friendCount}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {user?.classLevel && (
                <Badge variant="secondary" className="text-xs">
                  <GraduationCap className="w-3 h-3 mr-1" /> {user.classLevel}
                </Badge>
              )}
              {user?.department && (
                <Badge variant="secondary" className="text-xs">
                  <BookOpen className="w-3 h-3 mr-1" /> {user.department}
                </Badge>
              )}
              {user?.country && (
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" /> {user.country}
                </Badge>
              )}
              {user?.institution && (
                <Badge variant="secondary" className="text-xs">
                  <Target className="w-3 h-3 mr-1" /> {user.institution}
                </Badge>
              )}
            </div>

            {user?.publicStatus && (
              <div className="mt-4 rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-sm italic text-muted-foreground">{user.publicStatus}</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionShell
          icon={<User className="w-4 h-4 text-primary" />}
          title={<span data-testid="text-section-personal">{t.profile.personalInformation}</span>}
          className="sm:p-6"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">{t.auth.fullName}</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} data-testid="input-profile-name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t.auth.username}</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} data-testid="input-profile-username" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">{t.onboarding.institution}</Label>
                <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} data-testid="input-profile-institution" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t.onboarding.country}</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} data-testid="input-profile-country" />
              </div>
            </div>
          </div>
        </SectionShell>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SectionShell
          icon={<GraduationCap className="w-4 h-4 text-primary" />}
          title={<span data-testid="text-section-academic">{t.profile.academicInformation}</span>}
          className="sm:p-6"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">{t.onboarding.classLevel}</Label>
                <Select value={form.classLevel} onValueChange={(v) => setForm({ ...form, classLevel: v })}>
                  <SelectTrigger data-testid="select-profile-class">
                    <SelectValue placeholder={t.common.select} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class-9">Class 9</SelectItem>
                    <SelectItem value="class-10">Class 10 (SSC)</SelectItem>
                    <SelectItem value="class-11">Class 11 (HSC 1st Year)</SelectItem>
                    <SelectItem value="class-12">Class 12 (HSC 2nd Year)</SelectItem>
                    <SelectItem value="diploma">Diploma</SelectItem>
                    <SelectItem value="undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="graduate">Graduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t.onboarding.department}</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger data-testid="select-profile-dept">
                    <SelectValue placeholder={t.common.select} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="arts">Arts / Humanities</SelectItem>
                    <SelectItem value="commerce">Commerce / Business</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="cse">CSE / IT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                {t.onboarding.dailyHours}
              </Label>
              <Input
                type="number"
                min={1}
                max={16}
                value={form.dailyStudyHours}
                onChange={(e) => setForm({ ...form, dailyStudyHours: parseInt(e.target.value) || 4 })}
                className="w-28"
                data-testid="input-profile-hours"
              />
            </div>
          </div>
        </SectionShell>
      </motion.div>

    </div>
  );
}
