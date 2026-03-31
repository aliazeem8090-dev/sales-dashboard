'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProposalPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/board') }, [])
  return null
}
