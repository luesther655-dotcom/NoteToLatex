"use client"

import { useState, useEffect } from "react"
import { X, Save, Key, Server } from "lucide-react"

interface ApiConfigDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface ApiConfig {
  ocr: {
    provider: string
    model: string
    apiKey: string
    baseUrl: string
  }
  validate: {
    provider: string
    model: string
    apiKey: string
    baseUrl: string
  }
}

const defaultConfig: ApiConfig = {
  ocr: {
    provider: "coze",
    model: "doubao-seed-2-0-pro-260215",
    apiKey: "",
    baseUrl: "",
  },
  validate: {
    provider: "coze",
    model: "doubao-seed-2-0-pro-260215",
    apiKey: "",
    baseUrl: "",
  },
}

export function ApiConfigDialog({ isOpen, onClose }: ApiConfigDialogProps) {
  const [config, setConfig] = useState<ApiConfig>(defaultConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // 加载保存的配置
  useEffect(() => {
    if (isOpen) {
      const savedConfig = localStorage.getItem("apiConfig")
      if (savedConfig) {
        try {
          setConfig(JSON.parse(savedConfig))
        } catch {
          setConfig(defaultConfig)
        }
      }
    }
  }, [isOpen])

  const handleSave = () => {
    setIsSaving(true)
    setMessage(null)

    try {
      // 保存到 localStorage
      localStorage.setItem("apiConfig", JSON.stringify(config))
      setMessage({ type: "success", text: "配置已保存" })
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      setMessage({ type: "error", text: "保存失败" })
    } finally {
      setIsSaving(false)
    }
  }

  const updateOcrConfig = (key: keyof ApiConfig["ocr"], value: string) => {
    setConfig(prev => ({
      ...prev,
      ocr: { ...prev.ocr, [key]: value },
    }))
  }

  const updateValidateConfig = (key: keyof ApiConfig["validate"], value: string) => {
    setConfig(prev => ({
      ...prev,
      validate: { ...prev.validate, [key]: value },
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">API 配置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* OCR 配置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Server className="w-4 h-4 text-[#B8956A]" />
              OCR 模型配置
            </div>
            
            <div className="space-y-3 pl-6">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">服务商</label>
                <input
                  type="text"
                  value={config.ocr.provider}
                  onChange={(e) => updateOcrConfig("provider", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-[#B8956A]"
                  placeholder="coze"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">模型名称</label>
                <input
                  type="text"
                  value={config.ocr.model}
                  onChange={(e) => updateOcrConfig("model", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-[#B8956A]"
                  placeholder="doubao-seed-2-0-pro-260215"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    API Key
                  </span>
                </label>
                <input
                  type="password"
                  value={config.ocr.apiKey}
                  onChange={(e) => updateOcrConfig("apiKey", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-[#B8956A]"
                  placeholder="输入 API Key"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Base URL (可选)</label>
                <input
                  type="text"
                  value={config.ocr.baseUrl}
                  onChange={(e) => updateOcrConfig("baseUrl", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-[#B8956A]"
                  placeholder="https://api.coze.cn/v3"
                />
              </div>
            </div>
          </div>

          {/* 校验 LLM 配置 */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Server className="w-4 h-4 text-[#B8956A]" />
              校验 LLM 模型配置
            </div>
            
            <div className="space-y-3 pl-6">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">服务商</label>
                <input
                  type="text"
                  value={config.validate.provider}
                  onChange={(e) => updateValidateConfig("provider", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-[#B8956A]"
                  placeholder="coze"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">模型名称</label>
                <input
                  type="text"
                  value={config.validate.model}
                  onChange={(e) => updateValidateConfig("model", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-[#B8956A]"
                  placeholder="doubao-seed-2-0-pro-260215"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    API Key
                  </span>
                </label>
                <input
                  type="password"
                  value={config.validate.apiKey}
                  onChange={(e) => updateValidateConfig("apiKey", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-[#B8956A]"
                  placeholder="输入 API Key"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Base URL (可选)</label>
                <input
                  type="text"
                  value={config.validate.baseUrl}
                  onChange={(e) => updateValidateConfig("baseUrl", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-[#B8956A]"
                  placeholder="https://api.coze.cn/v3"
                />
              </div>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <p>• 配置保存在本地浏览器中，仅对当前浏览器生效</p>
            <p>• 留空则使用系统默认配置</p>
            <p>• API Key 不会上传到服务器</p>
          </div>

          {/* 消息提示 */}
          {message && (
            <div className={`text-sm p-3 rounded-lg ${
              message.type === "success" 
                ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" 
                : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#B8956A] text-white rounded-lg hover:bg-[#A6845C] disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>
    </div>
  )
}
