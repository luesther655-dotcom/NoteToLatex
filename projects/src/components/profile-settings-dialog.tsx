"use client"

import { useState, useRef } from "react"
import { X, Upload, User as UserIcon } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface ProfileSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileSettingsDialog({ isOpen, onClose }: ProfileSettingsDialogProps) {
  const { user, username, updateProfile } = useAuth()
  const [newUsername, setNewUsername] = useState(username || "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentAvatarUrl = user?.user_metadata?.avatar_url

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("头像大小不能超过 2MB")
        return
      }
      setAvatarFile(file)
      setError("")
      
      // 创建预览
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      const updates: { username?: string; avatarUrl?: string } = {}

      // 更新用户名
      if (newUsername.trim() && newUsername.trim() !== username) {
        if (newUsername.trim().length < 2) {
          setError("用户名至少需要 2 个字符")
          setIsSaving(false)
          return
        }
        updates.username = newUsername.trim()
      }

      // 更新头像
      if (avatarFile) {
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result as string
          updates.avatarUrl = base64

          const result = await updateProfile(updates)
          if (result.success) {
            setSuccess("设置已保存")
            setAvatarFile(null)
            setAvatarPreview(null)
            setTimeout(() => {
              onClose()
              setSuccess("")
            }, 1500)
          } else {
            setError(result.error || "保存失败")
          }
          setIsSaving(false)
        }
        reader.readAsDataURL(avatarFile)
        return
      }

      // 只更新用户名
      if (Object.keys(updates).length > 0) {
        const result = await updateProfile(updates)
        if (result.success) {
          setSuccess("设置已保存")
          setTimeout(() => {
            onClose()
            setSuccess("")
          }, 1500)
        } else {
          setError(result.error || "保存失败")
        }
      } else {
        setSuccess("没有需要保存的更改")
        setTimeout(() => setSuccess(""), 1500)
      }
    } catch (err) {
      setError("保存失败，请重试")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setNewUsername(username || "")
    setAvatarFile(null)
    setAvatarPreview(null)
    setError("")
    setSuccess("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl">
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">个性设置</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 头像 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">头像</label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#B8956A]"
                  />
                ) : currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt="Current avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#B8956A] flex items-center justify-center border-2 border-border">
                    <UserIcon className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-[#F5F3EE] dark:bg-[#141620] border border-[#E8E3D8] dark:border-[#2A2F40] rounded-lg hover:border-[#B8956A] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  上传头像
                </button>
                <p className="mt-1 text-xs text-muted-foreground">支持 JPG、PNG，最大 2MB</p>
              </div>
            </div>
          </div>

          {/* 用户名 */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="输入用户名"
              className="w-full px-4 py-2 bg-[#F5F3EE] dark:bg-[#141620] border border-[#E8E3D8] dark:border-[#2A2F40] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8956A] focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground">至少 2 个字符</p>
          </div>

          {/* 错误/成功提示 */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-foreground bg-[#F5F3EE] dark:bg-[#141620] border border-[#E8E3D8] dark:border-[#2A2F40] rounded-lg hover:border-[#B8956A] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-white bg-[#B8956A] rounded-lg hover:bg-[#A07D5A] transition-colors disabled:opacity-50"
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}
