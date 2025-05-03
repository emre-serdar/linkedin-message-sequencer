import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function UploadForm() {
  return (
    <div className="space-y-4">
      <Label htmlFor="csv">Upload Prospects CSV</Label>
      <Input id="csv" type="file" accept=".csv" />
      <Button className="w-full">Upload CSV</Button>
    </div>
  )
}
