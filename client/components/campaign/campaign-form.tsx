"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

// Define Job type for job listing
type Job = {
  id: string
  prospectFirstName: string
  prospectLastName: string
  stepOrder: number
  remainingMinutes: number
  scheduledExecution: string
  status?: string
  profileUrl?: string
  campaignId?: number
  replied?: boolean // Track if replied
}

// Define Step type for cleaner form state
type Step = {
  stepOrder: number
  messageTemplate: string
  delayHours: number
}

export function CampaignForm() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [campaignName, setCampaignName] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [repliedIds, setRepliedIds] = useState<string[]>([])

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs")
      const data = await res.json()
      setJobs(data.jobs || [])

      // Automatically track replied jobs based on job.replied boolean from DB
      const replied = (data.jobs || []).filter((j: Job) => j.replied).map((j: Job) => j.id)
      setRepliedIds(replied)
    } catch (err) {
      console.error("Error fetching jobs", err)
    }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(() => fetchJobs(), 15000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!csvFile) {
      toast.error("Please upload a CSV file.")
      setLoading(false)
      return
    }

    if (steps.length === 0) {
      toast.error("Please add at least one sequence step.")
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append("campaignName", campaignName || "Untitled Campaign")
    formData.append("prospectsCsv", csvFile)
    formData.append("sequenceSteps", JSON.stringify(steps))

    try {
      const res = await fetch("/api/create-campaign", {
        method: "POST",
        body: formData,
      })

      const result = await res.json()

      if (res.ok) {
        toast.success(`✅ Campaign created (ID: ${result.campaignId})`)
        setCsvFile(null)
        setCampaignName("")
        setSteps([])
        setTimeout(() => {
          fetchJobs()
        }, 1000)
      } else {
        toast.error(result.message || "Something went wrong.")
      }
    } catch (err) {
      console.error("Submit failed", err)
      toast.error("Server error.")
    }

    setLoading(false)
  }

  const addStep = () => {
    setSteps([...steps, { stepOrder: steps.length + 1, messageTemplate: "", delayHours: 0 }])
  }

  const updateStep = <K extends keyof Step>(index: number, key: K, value: string) => {
    const newSteps = [...steps]
    if (key === 'delayHours' || key === 'stepOrder') {
      newSteps[index][key] = parseFloat(value) as Step[K]
    } else {
      newSteps[index][key] = value as Step[K]
    }
    setSteps(newSteps)
  }

  const handleReply = async (id: string) => {
    try {
      const res = await fetch(`/api/reply/${id}`, { method: "POST" });
      const result = await res.json();
  
      if (res.ok) {
        toast.success(result.message || "✅ Prospect replied. Remaining messages stopped.");
  
        setRepliedIds((prev) => [...prev, id]);
  
        // ✅ Update jobs state locally for UI
        setJobs((prevJobs) =>
          prevJobs.map((job) => {
            if (job.id === id) {
              return { ...job, replied: true };
            }
  
            // Mark other jobs of same prospect & campaign with higher stepOrder as STOPPED
            const currentJob = prevJobs.find((j) => j.id === id);
            if (
              currentJob &&
              job.prospectFirstName === currentJob.prospectFirstName &&
              job.prospectLastName === currentJob.prospectLastName &&
              job.campaignId === currentJob.campaignId &&
              job.stepOrder > currentJob.stepOrder &&
              job.status === "PENDING"
            ) {
              return { ...job, status: "STOPPED" };
            }
  
            return job;
          })
        );
      } else {
        toast.error(result.message || "❌ Failed to mark as replied.");
      }
    } catch (err) {
      console.error("Reply simulation failed", err);
      toast.error("❌ Reply simulation failed.");
    }
  };
  
  const getStatusStyle = (status: string | undefined) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs font-medium"
      case "SENT":
        return "bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium"
      case "STOPPED":
        return "bg-gray-300 text-gray-600 px-2 py-1 rounded-md text-xs font-medium line-through"
      default:
        return "bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs"
    }
  }

  const formatRemainingTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins === 0
      ? `${hours} hour${hours > 1 ? 's' : ''}`
      : `${hours}h ${mins}m`
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold">Create New Campaign</h2>

        {/* Campaign Name */}
        <div>
          <Label>Campaign Name</Label>
          <Input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Enter campaign name"
            className="cursor-pointer"
          />
        </div>

        {/* CSV Upload */}
        <div>
          <Label>Prospects CSV</Label>
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="cursor-pointer"
          />
        </div>

        {/* Sequence Steps Dynamic Inputs */}
        <div className="space-y-4">
          <Label>Sequence Steps</Label>
          {steps.map((step, index) => (
            <div key={index} className="grid grid-cols-3 gap-4 items-center">
              <Input
                type="number"
                value={step.stepOrder.toString()}
                onChange={(e) => updateStep(index, "stepOrder", e.target.value)}
                placeholder="Step Order"
                className="cursor-pointer"
              />
              <Textarea
                value={step.messageTemplate}
                onChange={(e) => updateStep(index, "messageTemplate", e.target.value)}
                placeholder="Message Template"
                className="cursor-pointer"
              />
              <Input
                type="number"
                step="0.01"
                value={step.delayHours.toString()}
                onChange={(e) => updateStep(index, "delayHours", e.target.value)}
                placeholder="Delay (hours)"
                className="cursor-pointer"
              />
            </div>
          ))}
          <Button type="button" onClick={addStep} variant="outline" className="cursor-pointer">+ Add Step</Button>
        </div>

        <Button type="submit" disabled={loading} className="w-full cursor-pointer">
          {loading ? "Submitting..." : "Submit Campaign"}
        </Button>
      </form>

      {/* Jobs Table */}
      {jobs.length > 0 && (
        <div className="pt-6">
          <h3 className="text-xl font-semibold mb-4">Pending, Sent & Stopped Deliveries</h3>
          <div className="overflow-x-auto">
            <Table className="min-w-full text-sm border border-gray-200 rounded-md">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Executes In</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-gray-50">
                    <TableCell>
                      <a
                        href={job.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {job.prospectFirstName} {job.prospectLastName}
                      </a>
                    </TableCell>
                    <TableCell className="text-center">{job.stepOrder}</TableCell>
                    <TableCell className="text-center">{formatRemainingTime(job.remainingMinutes)}</TableCell>
                    <TableCell>{new Date(job.scheduledExecution).toLocaleString()}</TableCell>
                    <TableCell className="text-center font-medium">
                      <span className={getStatusStyle(job.status)}>
                        {job.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-gray-600">{job.campaignId}</TableCell>
                    <TableCell className="text-center">
                      {job.status === "SENT" ? (
                        job.replied ? (
                          <span className="text-gray-500 text-xs font-medium">Replied</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => handleReply(job.id)}
                          >
                            Reply
                          </Button>
                        )
                      ) : null}
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
