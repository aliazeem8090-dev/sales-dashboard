// frontend/src/components/Dashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function Dashboard() {
  const [teamData, setTeamData] = useState<{ totalProposals: number; hireRate: number; replyRate: number } | null>(null)
  const [repsData, setRepsData] = useState<any[]>([])

  useEffect(() => {
    // Fetch dashboard data
    fetchTeamData()
    fetchRepsData()
  }, [])

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/dashboard/team-overview')
      const data = await response.json()
      setTeamData(data)
    } catch (error) {
      console.error('Error fetching team data:', error)
    }
  }

  const fetchRepsData = async () => {
    try {
      const response = await fetch('/api/dashboard/reps-performance')
      const data = await response.json()
      setRepsData(data)
    } catch (error) {
      console.error('Error fetching reps data:', error)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Sales Performance Intelligence Platform</h1>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Team Overview</TabsTrigger>
          <TabsTrigger value="reps">Rep Performance</TabsTrigger>
          <TabsTrigger value="proposals">Proposal Review</TabsTrigger>
          <TabsTrigger value="chat">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamData?.totalProposals || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hire Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamData?.hireRate || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamData?.replyRate || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Reps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{repsData.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rep Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={repsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalProposals" fill="#8884d8" name="Proposals" />
                  <Bar dataKey="hires" fill="#82ca9d" name="Hires" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reps">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repsData.map((rep) => (
              <Card key={rep.repId}>
                <CardHeader>
                  <CardTitle>{rep.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Proposals:</span>
                      <span className="font-semibold">{rep.totalProposals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hires:</span>
                      <span className="font-semibold">{rep.hires}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hire Rate:</span>
                      <span className="font-semibold">{rep.hireRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reply Rate:</span>
                      <span className="font-semibold">{rep.replyRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="proposals">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Review Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Paste your proposal text below to get AI-powered feedback and scoring.
              </p>
              <Button>Submit for Review</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Upwork Intelligence Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Ask questions about proposals, job fits, or sales strategy.
              </p>
              <Button>Start Chat</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}