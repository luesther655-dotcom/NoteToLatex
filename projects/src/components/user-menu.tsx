"use client"

import { useEffect, useRef, useState } from "react"
import { User, Settings, HelpCircle, LogOut, Key } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface UserMenuProps {
  onOpenSettings: () => void
  onOpenApiConfig: () => void
}

export function UserMenu({ onOpenSettings, onOpenApiConfig }: UserMenuProps) {
  const { user, username, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  const handleOpenSettings = () => {
    onOpenSettings()
    setIsOpen(false)
  }

  const handleOpenApiConfig = () => {
    onOpenApiConfig()
    setIsOpen(false)
  }

  // 获取用户头像（如果有）
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div className="relative" ref={menuRef}>
      {/* 用户按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F5F3EE] dark:bg-[#141620] border border-[#E8E3D8] dark:border-[#2A2F40] hover:border-[#B8956A] transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#B8956A] flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {username?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
        )}
        <span className="text-sm text-foreground font-medium max-w-[100px] truncate">
          {username || "User"}
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium text-foreground truncate">{username}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>

          {/* 菜单项 */}
          <div className="py-1">
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
              个性设置
            </button>
            <button
              onClick={handleOpenApiConfig}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Key className="w-4 h-4" />
              API 配置
            </button>
            <a
              href="/help"
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              帮助文档
            </a>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
