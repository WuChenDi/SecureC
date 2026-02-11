'use client'

import { Lock, Unlock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModeEnum } from '@/types'

interface SCEncryptDecryptTabsProps {
  activeTab: ModeEnum
  onTabChange: (value: ModeEnum) => void
  className?: string
}

export function SCEncryptDecryptTabs({
  activeTab,
  onTabChange,
  className,
}: SCEncryptDecryptTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as ModeEnum)}
      className={className}
    >
      <TabsList className="w-full h-9! mb-6">
        <TabsTrigger value={ModeEnum.ENCRYPT}>
          <Lock />
          Encrypt
        </TabsTrigger>
        <TabsTrigger value={ModeEnum.DECRYPT}>
          <Unlock />
          Decrypt
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
