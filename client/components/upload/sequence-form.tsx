import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export function SequenceForm() {
  return (
    <div className="space-y-4">
      <Label>Sequence Step (JSON or Text)</Label>
      <Textarea placeholder='[{ "stepOrder": 1, "messageTemplate": "Hello {{firstName}}", "delayHours": 0 }]' rows={5} />
      <Button className="w-full">Save Sequence Steps</Button>
    </div>
  )
}
