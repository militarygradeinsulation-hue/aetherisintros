import { useEffect, useState } from 'react'
import { generateMeetingBrief, getLatestBrief } from '@/lib/meetingBrief.functions'

interface OpenNeed {
  need: string
  how_you_can_help: string
}

interface TalkingPoint {
  point: string
  why_relevant: string
}

interface MeetingBrief {
  id: string
  their_background: string
  their_current_focus: string
  open_needs: OpenNeed[]
  talking_points: TalkingPoint[]
  summary: string
  generated_at: string
}

interface Props {
  otherUserId: string
  otherName: string
}

export function MeetingBriefPanel({ otherUserId, otherName }: Props) {
  const [brief, setBrief] = useState<MeetingBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getLatestBrief({ data: { otherUserId } })
      .then(row => { if (row) setBrief(row as MeetingBrief) })
      .catch(() => {/* silently skip if not available */})
  }, [otherUserId])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const row = await generateMeetingBrief({ data: { otherUserId } })
      setBrief(row as MeetingBrief)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate brief')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="meeting-brief">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#F2EEE6]">Pre-meeting brief — {otherName}</p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-[11px] px-2.5 py-1 rounded-md bg-[#C78522] text-white font-medium disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Generating…' : brief ? 'Refresh' : 'Generate Brief'}
        </button>
      </div>

      {error && <p className="text-[11px] text-red-400 mb-2">{error}</p>}

      {loading && !brief && (
        <div className="flex items-center gap-2 py-4 text-[#9CA3AF] text-xs">
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
          Preparing your brief…
        </div>
      )}

      {brief && (
        <div>
          {brief.summary && (
            <div className="brief-section">
              <p className="text-sm text-[#F1EFE9] leading-relaxed">{brief.summary}</p>
            </div>
          )}

          {brief.their_background && (
            <div className="brief-section">
              <h4>Background</h4>
              <p className="text-sm text-[#D1CFC9]">{brief.their_background}</p>
            </div>
          )}

          {brief.their_current_focus && (
            <div className="brief-section">
              <h4>Current Focus</h4>
              <p className="text-sm text-[#D1CFC9]">{brief.their_current_focus}</p>
            </div>
          )}

          {brief.open_needs && brief.open_needs.length > 0 && (
            <div className="brief-section">
              <h4>Open Needs</h4>
              <ul className="space-y-1.5">
                {brief.open_needs.map((item, i) => (
                  <li key={i} className="text-sm text-[#D1CFC9]">
                    <span>{item.need}</span>
                    {item.how_you_can_help && (
                      <span className="block text-[11px] text-[#9CA3AF] mt-0.5">You can help: {item.how_you_can_help}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {brief.talking_points && brief.talking_points.length > 0 && (
            <div className="brief-section">
              <h4>Talking Points</h4>
              <ol className="space-y-1.5 list-none">
                {brief.talking_points.map((item, i) => (
                  <li key={i} className="brief-talking-point">
                    <span className="brief-num">{i + 1}</span>
                    <div>
                      <span className="text-sm text-[#D1CFC9]">{item.point}</span>
                      {item.why_relevant && (
                        <span className="block text-[11px] text-[#9CA3AF] mt-0.5">{item.why_relevant}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-[10px] text-[#9CA3AF] mt-2">
            Generated {new Date(brief.generated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
