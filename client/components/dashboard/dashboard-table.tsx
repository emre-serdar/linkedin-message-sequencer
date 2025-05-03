import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const mockData = [
  {
    id: 1,
    firstName: "Emre",
    lastName: "Serdar",
    stepOrder: 1,
    scheduledTime: "2025-04-30 23:48",
    remainingMinutes: 120,
    status: "PENDING",
  },
  {
    id: 2,
    firstName: "Talha",
    lastName: "Unsel",
    stepOrder: 1,
    scheduledTime: "2025-04-30 23:49",
    remainingMinutes: 125,
    status: "SENT",
  },
]

export function DashboardTable() {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Pending Deliveries</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prospect</TableHead>
            <TableHead>Step</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Time Left</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockData.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.firstName} {row.lastName}</TableCell>
              <TableCell>{row.stepOrder}</TableCell>
              <TableCell>{row.scheduledTime}</TableCell>
              <TableCell>{row.remainingMinutes} min</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
