"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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
}


export function CampaignForm() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [sequenceSteps, setSequenceSteps] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")
  const [jobs, setJobs] = useState<Job[]>([])

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs")
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (err) {
      console.error("Error fetching jobs", err)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setMessageType("")
    setLoading(true)

    if (!csvFile) {
      setMessage("Please upload a CSV file.")
      setMessageType("error")
      setLoading(false)
      return
    }

    let parsedSteps
    try {
      parsedSteps = JSON.parse(sequenceSteps)
      if (!Array.isArray(parsedSteps)) throw new Error("Invalid steps format")
    } catch {
      setMessage("Invalid JSON in sequence steps.")
      setMessageType("error")
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append("campaignName", "Untitled Campaign")
    formData.append("prospectsCsv", csvFile)
    formData.append("sequenceSteps", JSON.stringify(parsedSteps))

    try {
      const res = await fetch("/api/create-campaign", {
        method: "POST",
        body: formData,
      })

      const result = await res.json()

      if (res.ok) {
        setMessage(`✅ Campaign created with ID: ${result.campaignId}`)
        setMessageType("success")
        setCsvFile(null)
        setSequenceSteps("")
        fetchJobs()
      } else {
        setMessage(result.message || "Something went wrong.")
        setMessageType("error")
      }
    } catch (err) {
      console.error("Submit failed", err)
      setMessage("Server error.")
      setMessageType("error")
    }

    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold">Create New Campaign</h2>

        {/* CSV Upload */}
        <div>
          <Label>Prospects CSV</Label>
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* Sequence JSON Input */}
        <div>
          <Label>Sequence Steps (JSON)</Label>
          <Textarea
            placeholder={`[
  { "stepOrder": 1, "messageTemplate": "Hello {{firstName}}", "delayHours": 0 },
  { "stepOrder": 2, "messageTemplate": "Follow up later", "delayHours": 48 }
]`}
            rows={6}
            value={sequenceSteps}
            onChange={(e) => setSequenceSteps(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Submit Campaign"}
        </Button>

        {message && (
          <div
            className={`text-sm px-4 py-2 rounded-md ${
              messageType === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
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
                <TableCell className="text-center">{job.remainingMinutes} min</TableCell>
                <TableCell>{new Date(job.scheduledExecution).toLocaleString()}</TableCell>
                <TableCell className="text-center font-medium">
                  <span
                    className={
                      job.status === "PENDING"
                        ? "text-yellow-600"
                        : job.status === "SENT"
                        ? "text-green-600"
                        : "text-gray-500 line-through"
                    }
                  >
                    {job.status}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs text-gray-600">{job.campaignId}</TableCell>
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
