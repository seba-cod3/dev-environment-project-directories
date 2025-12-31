import { useState } from 'react'
import { FolderOpen, BookOpen, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface NodeVersionInfo {
  nvmrc: string | null
  npmrc: string | null
  engines: Record<string, string> | null
  strictness: string | null
}

interface ProjectInfo {
  name: string
  version: string
  description: string | null
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  nodeVersionInfo: NodeVersionInfo
  hasReadme: boolean
  readmeFile: string | null
}

interface DirectoryData {
  directoryName: string
  isProject: boolean
  projectInfo?: ProjectInfo
  hasSubDirectories?: boolean
}

function App() {
  const [rootDirectory, setRootDirectory] = useState('')
  const [directories, setDirectories] = useState<DirectoryData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readmeContent, setReadmeContent] = useState<string | null>(null)
  const [readmeOpen, setReadmeOpen] = useState(false)
  const [readmeTitle, setReadmeTitle] = useState('')

  const handleScan = async () => {
    if (!rootDirectory.trim()) {
      setError('Please enter a directory path')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/scan-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rootDirectory }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to scan directory')
      }

      const data = await response.json()
      setDirectories(data.directories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenReadme = async (directoryName: string, readmeFile: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/read-readme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rootDirectory, directoryName, readmeFile }),
      })

      if (!response.ok) {
        throw new Error('Failed to read README')
      }

      const data = await response.json()
      setReadmeContent(data.content)
      setReadmeTitle(`${directoryName} - ${readmeFile}`)
      setReadmeOpen(true)
    } catch (err) {
      console.error('Error reading README:', err)
    }
  }

  const renderDependencies = (deps: Record<string, string>, title: string) => {
    const entries = Object.entries(deps)
    if (entries.length === 0) return null

    return (
      <div className="mb-3">
        <h4 className="font-semibold text-sm mb-2 text-primary">{title}</h4>
        <div className="space-y-1">
          {entries.map(([name, version]) => (
            <div key={name} className="flex justify-between items-center text-xs pl-3">
              <span className="text-foreground/90">{name}</span>
              <span className="text-muted-foreground">{version}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderNodeVersionInfo = (info: NodeVersionInfo) => {
    if (!info.nvmrc && !info.engines && !info.strictness) return null

    return (
      <div className="bg-muted/30 rounded-md p-3 space-y-2">
        <h4 className="font-semibold text-sm text-secondary">Node Version Info</h4>
        {info.engines && (
          <div className="text-xs">
            <span className="text-muted-foreground">Engines: </span>
            <span className="text-foreground">{JSON.stringify(info.engines)}</span>
          </div>
        )}
        {info.nvmrc && (
          <div className="text-xs">
            <span className="text-muted-foreground">.nvmrc: </span>
            <span className="text-foreground">{info.nvmrc}</span>
          </div>
        )}
        {info.strictness && (
          <div className="text-xs">
            <span className="text-muted-foreground">Strictness: </span>
            <span className={info.strictness === 'strict' ? 'text-primary' : 'text-muted-foreground'}>
              {info.strictness}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-primary flex items-center gap-3">
            <FolderOpen className="w-10 h-10" />
            Dev Environment Explorer
          </h1>
          <p className="text-muted-foreground">Scan and explore your development projects</p>
        </div>

        <div className="flex gap-3 mb-8">
          <Input
            type="text"
            name="rootDirectory"
            placeholder="Enter directory path (e.g., ~/development)"
            value={rootDirectory}
            onChange={(e) => setRootDirectory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            className="flex-1 text-base"
          />
          <Button onClick={handleScan} disabled={loading} size="lg">
            {loading ? 'Scanning...' : 'Scan Directory'}
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {directories.length > 0 && (
          <div className="space-y-3">
            {directories.map((dir) => (
              <div key={dir.directoryName}>
                {dir.isProject && dir.projectInfo ? (
                  <Accordion type="single" collapsible className="bg-card rounded-lg border">
                    <AccordionItem value={dir.directoryName} className="border-none">
                      <AccordionTrigger className="px-6 hover:bg-accent/50">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="w-5 h-5 text-primary" />
                            <div className="text-left">
                              <div className="font-bold text-base">{dir.directoryName}</div>
                              <div className="text-sm text-muted-foreground">{dir.projectInfo.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              v{dir.projectInfo.version}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4 pt-2">
                          {dir.projectInfo.description && (
                            <p className="text-sm text-muted-foreground italic">
                              {dir.projectInfo.description}
                            </p>
                          )}

                          {renderNodeVersionInfo(dir.projectInfo.nodeVersionInfo)}

                          {dir.projectInfo.hasReadme && dir.projectInfo.readmeFile && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReadme(dir.directoryName, dir.projectInfo!.readmeFile!)}
                              className="w-full justify-start"
                            >
                              <BookOpen className="w-4 h-4 mr-2" />
                              Open README
                            </Button>
                          )}

                          <Accordion type="single" collapsible>
                            <AccordionItem value="dependencies" className="border-none">
                              <AccordionTrigger className="text-sm font-semibold py-2 px-3 bg-muted/50 rounded">
                                Dependencies
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pt-3">
                                {renderDependencies(dir.projectInfo.dependencies, 'Dependencies')}
                                {renderDependencies(dir.projectInfo.devDependencies, 'Dev Dependencies')}
                                {renderDependencies(dir.projectInfo.peerDependencies, 'Peer Dependencies')}
                                {Object.keys(dir.projectInfo.dependencies).length === 0 &&
                                  Object.keys(dir.projectInfo.devDependencies).length === 0 &&
                                  Object.keys(dir.projectInfo.peerDependencies).length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">No dependencies found</p>
                                  )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  <div className="bg-card/50 border border-dashed rounded-lg px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{dir.directoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {dir.hasSubDirectories && (
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">NOT A PROJECT</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && directories.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Enter a directory path and click "Scan Directory" to explore your projects</p>
          </div>
        )}
      </div>

      <Dialog open={readmeOpen} onOpenChange={setReadmeOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{readmeTitle}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-invert prose-sm max-w-none">
            {readmeContent && <ReactMarkdown remarkPlugins={[remarkGfm]}>{readmeContent}</ReactMarkdown>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
