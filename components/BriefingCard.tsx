'use client'

interface BriefingCardProps {
  content: string
  generatedAt: Date | null
  streaming: boolean
}

interface Section {
  title: string
  body: string
  isPriority: boolean
}

function parseSections(content: string): Section[] {
  const sections: Section[] = []
  const lines = content.split('\n')
  let currentTitle = ''
  let currentLines: string[] = []

  function flush() {
    if (!currentTitle) return
    sections.push({
      title: currentTitle,
      body: currentLines.join('\n').trim(),
      isPriority: currentTitle.toLowerCase().includes('priority'),
    })
    currentLines = []
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush()
      currentTitle = line.replace('## ', '').trim()
    } else {
      currentLines.push(line)
    }
  }
  flush()

  return sections
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold**
    .replace(/\*(.+?)\*/g, '$1')       // *italic*
    .replace(/`(.+?)`/g, '$1')         // `code`
}

function renderBody(body: string) {
  const lines = body.split('\n')
  return lines.map((line, i) => {
    const trimmed = line.trim()
    // Skip horizontal rules and stray # headers (model preamble)
    if (trimmed === '---' || trimmed === '***' || trimmed.startsWith('# ')) {
      return null
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <li key={i} className="ml-4 list-disc text-[#E8E6E1]">
          {stripMarkdown(trimmed.slice(2))}
        </li>
      )
    }
    if (/^\d+\./.test(trimmed)) {
      return (
        <li key={i} className="ml-4 list-decimal text-[#E8E6E1]">
          {stripMarkdown(trimmed.replace(/^\d+\.\s*/, ''))}
        </li>
      )
    }
    if (trimmed === '') return <div key={i} className="h-2" />
    return (
      <p key={i} className="text-[#E8E6E1]">
        {stripMarkdown(trimmed)}
      </p>
    )
  })
}

export default function BriefingCard({
  content,
  generatedAt,
  streaming,
}: BriefingCardProps) {
  if (!content && !streaming) return null

  const sections = parseSections(content)

  function copyToClipboard() {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="rounded border border-[#1E1E21] bg-[#111113]">
      {sections.length === 0 && streaming && (
        <div className="p-6">
          <span className="inline-block w-1.5 h-4 bg-[#C8920A] animate-pulse" />
        </div>
      )}

      {sections.map((section, i) => (
        <div
          key={i}
          className={`px-6 py-5 border-b border-[#1E1E21] last:border-b-0 ${
            section.isPriority ? 'border-l-2 border-l-[#8B0000]' : ''
          }`}
        >
          <h2 className="text-[#C8920A] text-[10px] font-semibold tracking-widest uppercase mb-3">
            {section.title}
          </h2>
          <div className="text-sm leading-relaxed space-y-1">
            {renderBody(section.body)}
          </div>
          {streaming && i === sections.length - 1 && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#C8920A] animate-pulse align-middle mt-1" />
          )}
        </div>
      ))}

      {!streaming && generatedAt && (
        <div className="px-6 py-3 flex items-center justify-between">
          <span className="text-[#6B6868] text-[10px]">
            Generated{' '}
            {generatedAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            at{' '}
            {generatedAt.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <button
            onClick={copyToClipboard}
            className="text-[#6B6868] hover:text-[#E8E6E1] text-[10px] transition-colors"
          >
            Copy briefing
          </button>
        </div>
      )}
    </div>
  )
}
