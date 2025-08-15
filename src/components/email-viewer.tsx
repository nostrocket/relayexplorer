import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Reply, ReplyAll, Forward, Archive, Trash2 } from "lucide-react"
import type { MailItem } from "@/mock/data"

interface EmailViewerProps {
  email: MailItem | null
}

export function EmailViewer({ email }: EmailViewerProps) {
  if (!email) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">
            No email selected
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose an email from the sidebar to view its content
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Email Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://avatar.vercel.sh/${email.email}`} />
            <AvatarFallback>
              {email.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{email.subject}</h2>
            <p className="text-sm text-muted-foreground">
              From: {email.name} &lt;{email.email}&gt;
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">{email.date}</div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
        <Button variant="outline" size="sm">
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </Button>
        <Button variant="outline" size="sm">
          <ReplyAll className="h-4 w-4 mr-2" />
          Reply All
        </Button>
        <Button variant="outline" size="sm">
          <Forward className="h-4 w-4 mr-2" />
          Forward
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm">
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Email Content */}
      <div className="flex-1 p-6">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {email.teaser}
          </div>
        </div>
      </div>
    </div>
  )
}