import { useState } from 'preact/hooks'
import { useAction, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { ElementSvg } from '../components/ElementSvg'

type DescriptionCandidate = {
  elementId: Id<'elements'>
  name: string
  svgUrl: string
  description: string
  approved: boolean
}

export function DescriptionsPage() {
  const [candidates, setCandidates] = useState<DescriptionCandidate[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [savingIds, setSavingIds] = useState<Id<'elements'>[]>([])
  const generateDescriptions = useAction(api.admin.generateDescriptions)
  const setElementDescription = useMutation(api.admin.setElementDescription)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const results = await generateDescriptions({})
      setCandidates(
        results.map((result) => ({ ...result, approved: false }))
      )
    } catch (error) {
      console.error('Failed to generate descriptions:', error)
      alert('Failed to generate descriptions. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateUnapproved = async () => {
    if (!candidates) return
    const unapprovedIds = candidates
      .filter((candidate) => !candidate.approved)
      .map((candidate) => candidate.elementId)
    if (unapprovedIds.length === 0) return

    setIsGenerating(true)
    try {
      const results = await generateDescriptions({ elementIds: unapprovedIds })
      const newDescriptions = new Map(
        results.map((result) => [result.elementId, result.description])
      )
      setCandidates((previous) =>
        previous
          ? previous.map((candidate) =>
              candidate.approved
                ? candidate
                : {
                    ...candidate,
                    description: newDescriptions.get(candidate.elementId) ?? candidate.description,
                  }
            )
          : previous
      )
    } catch (error) {
      console.error('Failed to regenerate descriptions:', error)
      alert('Failed to regenerate descriptions. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEditDescription = (elementId: Id<'elements'>, description: string) => {
    setCandidates((previous) =>
      previous
        ? previous.map((candidate) =>
            candidate.elementId === elementId ? { ...candidate, description } : candidate
          )
        : previous
    )
  }

  const handleApprove = async (candidate: DescriptionCandidate) => {
    if (!candidate.description.trim()) {
      alert('Description cannot be empty')
      return
    }

    setSavingIds((previous) => [...previous, candidate.elementId])
    try {
      await setElementDescription({
        elementId: candidate.elementId,
        description: candidate.description.trim(),
      })
      setCandidates((previous) =>
        previous
          ? previous.map((other) =>
              other.elementId === candidate.elementId ? { ...other, approved: true } : other
            )
          : previous
      )
    } catch (error) {
      console.error('Failed to save description:', error)
      alert('Failed to save description. Please try again.')
    } finally {
      setSavingIds((previous) => previous.filter((id) => id !== candidate.elementId))
    }
  }

  const unapprovedCount = candidates?.filter((candidate) => !candidate.approved).length ?? 0

  return (
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-semibold mb-2 text-gray-900">Generate Descriptions</h2>
        <p class="text-gray-600 mb-4">
          Picks 10 elements without a description and generates a witty one for each. Approve them
          as-is or tweak the text first.
        </p>
        <div class="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating && candidates === null
              ? 'Generating...'
              : candidates === null
                ? 'Generate Descriptions'
                : 'Pick 10 New Elements'}
          </button>
          {candidates !== null && unapprovedCount > 0 && (
            <button
              onClick={handleRegenerateUnapproved}
              disabled={isGenerating}
              class="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Regenerating...' : `Regenerate Unapproved (${unapprovedCount})`}
            </button>
          )}
        </div>
      </div>

      {candidates !== null && candidates.length === 0 && (
        <div class="bg-white rounded-lg shadow-md p-6 text-gray-600">
          All elements already have a description. Nothing to do!
        </div>
      )}

      {candidates !== null && candidates.length > 0 && (
        <div class="space-y-4">
          {candidates.map((candidate) => (
            <div
              key={candidate.elementId}
              class={`bg-white rounded-lg shadow-md p-4 flex items-start gap-4 ${candidate.approved ? 'opacity-75' : ''}`}
            >
              <div class="w-20 h-20 border border-gray-300 rounded flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                <ElementSvg
                  name={candidate.name}
                  svgUrl={candidate.svgUrl}
                  class="w-full h-full"
                />
              </div>
              <div class="flex-1 min-w-0">
                <a
                  href={`/admin/elements/${candidate.elementId}`}
                  class="text-lg font-semibold text-gray-900 hover:text-blue-600"
                >
                  {candidate.name}
                </a>
                <textarea
                  value={candidate.description}
                  onInput={(e) =>
                    handleEditDescription(
                      candidate.elementId,
                      (e.target as HTMLTextAreaElement).value
                    )
                  }
                  disabled={candidate.approved}
                  rows={2}
                  class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div class="flex-shrink-0 self-center">
                {candidate.approved ? (
                  <span class="text-green-600 font-medium">✓ Approved</span>
                ) : (
                  <button
                    onClick={() => handleApprove(candidate)}
                    disabled={savingIds.includes(candidate.elementId) || isGenerating}
                    class="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingIds.includes(candidate.elementId) ? 'Saving...' : 'Approve'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
