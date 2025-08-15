import { ArchiveX, File, Inbox, Send, Trash2, type LucideIcon } from "lucide-react"
import userData from "./user.json"
import navigationData from "./navigation.json"
import mailsData from "./mails.json"

// Icon mapping for navigation items
const iconMap: Record<string, LucideIcon> = {
  Inbox,
  File,
  Send,
  ArchiveX,
  Trash2,
}

// Transform navigation data to include actual icon components
const navMain = navigationData.map(item => ({
  ...item,
  icon: iconMap[item.icon] || Inbox,
}))

export const mockData = {
  user: userData,
  navMain,
  mails: mailsData,
}

export type MockData = typeof mockData
export type NavItem = typeof navMain[0]
export type MailItem = typeof mailsData[0]
export type UserData = typeof userData