import { useState, useEffect } from 'react'
import { FolderOpen, BookOpen, ChevronRight, ChevronDown, Moon, Sun, Filter, Package, Folder } from 'lucide-react'
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
  expanded?: boolean
  subdirectories?: DirectoryData[]
  parentPath?: string
}

function App() {
  const [rootDirectory, setRootDirectory] = useState('')
  const [directories, setDirectories] = useState<DirectoryData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readmeContent, setReadmeContent] = useState<string | null>(null)
  const [readmeOpen, setReadmeOpen] = useState(false)
  const [readmeTitle, setReadmeTitle] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [filterMode, setFilterMode] = useState<'all' | 'projects' | 'non-projects'>('all')

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

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
      setDirectories(data.directories.map((dir: DirectoryData) => ({ ...dir, expanded: false, subdirectories: [] })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleExpandDirectory = async (directoryName: string, index: number) => {
    const dir = directories[index]

    if (dir.expanded && dir.subdirectories && dir.subdirectories.length > 0) {
      // Collapse
      const newDirs = [...directories]
      newDirs[index] = { ...dir, expanded: false }
      setDirectories(newDirs)
      return
    }

    // Expand
    try {
      const response = await fetch('http://localhost:3001/api/expand-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rootDirectory, directoryName }),
      })

      if (!response.ok) {
        throw new Error('Failed to expand directory')
      }

      const data = await response.json()
      const newDirs = [...directories]
      newDirs[index] = {
        ...dir,
        expanded: true,
        subdirectories: data.directories.map((subdir: DirectoryData) => ({
          ...subdir,
          parentPath: directoryName
        }))
      }
      setDirectories(newDirs)
    } catch (err) {
      console.error('Error expanding directory:', err)
    }
  }

  const handleOpenReadme = async (directoryName: string, readmeFile: string, parentPath?: string) => {
    try {
      const fullPath = parentPath ? `${parentPath}/${directoryName}` : directoryName
      const response = await fetch('http://localhost:3001/api/read-readme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rootDirectory, directoryName: fullPath, readmeFile }),
      })

      if (!response.ok) {
        throw new Error('Failed to read README')
      }

      const data = await response.json()
      setReadmeContent(data.content)
      setReadmeTitle(`${fullPath} - ${readmeFile}`)
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
        <h4 className="font-semibold text-sm mb-2 text-primary flex items-center gap-2">
          <Package className="w-4 h-4" />
          {title}
        </h4>
        <div className="space-y-1 bg-muted/30 rounded-md p-3">
          {entries.map(([name, version]) => (
            <div key={name} className="flex justify-between items-center text-xs">
              <span className="text-foreground/90 font-mono">{name}</span>
              <span className="text-muted-foreground font-mono bg-background px-2 py-0.5 rounded">{version}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderNodeVersionInfo = (info: NodeVersionInfo) => {
    if (!info.nvmrc && !info.engines && !info.strictness) return null

    return (
      <div className="border-2 border-primary/20 rounded-lg p-4 space-y-3 bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h4 className="font-bold text-sm text-primary uppercase tracking-wide">Node Environment</h4>
        </div>

        {info.engines && (
          <div className="bg-background/50 rounded-md p-3 border border-border">
            <div className="flex items-start gap-2 mb-2">
              <Package className="w-4 h-4 text-primary mt-0.5" />
              <span className="font-semibold text-xs text-foreground">Required Engines</span>
            </div>
            <div className="space-y-1 pl-6">
              {Object.entries(info.engines).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-mono">{key}:</span>
                  <code className="bg-muted px-2 py-0.5 rounded text-primary font-bold">{value}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {info.nvmrc && (
          <div className="bg-background/50 rounded-md p-3 border border-border">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="font-semibold text-xs text-foreground">.nvmrc</span>
              <code className="bg-muted px-2 py-1 rounded text-primary font-bold ml-auto">{info.nvmrc}</code>
            </div>
          </div>
        )}

        {info.strictness && (
          <div className="bg-background/50 rounded-md p-3 border border-border">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${info.strictness === 'strict' ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <span className="font-semibold text-xs text-foreground">Engine Strictness</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ml-auto ${
                info.strictness === 'strict'
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                  : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
              }`}>
                {info.strictness.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDirectory = (dir: DirectoryData, index: number, isSubdirectory = false) => {
    if (dir.isProject && dir.projectInfo) {
      return (
        <Accordion key={`${dir.directoryName}-${index}`} type="single" collapsible className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
          <AccordionItem value={dir.directoryName} className="border-none">
            <AccordionTrigger className="px-6 hover:bg-accent/50 rounded-t-lg transition-colors">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="font-bold text-base">{dir.directoryName}</div>
                    <div className="text-sm text-muted-foreground">{dir.projectInfo.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                    v{dir.projectInfo.version}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4 pt-2">
                {dir.projectInfo.description && (
                  <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-md border-l-4 border-primary/50">
                    {dir.projectInfo.description}
                  </p>
                )}

                {renderNodeVersionInfo(dir.projectInfo.nodeVersionInfo)}

                {dir.projectInfo.hasReadme && dir.projectInfo.readmeFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenReadme(dir.directoryName, dir.projectInfo!.readmeFile!, dir.parentPath)}
                    className="w-full justify-start hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Open README
                  </Button>
                )}

                <Accordion type="single" collapsible>
                  <AccordionItem value="dependencies" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="text-sm font-semibold py-3 px-4 bg-muted/50 hover:bg-muted transition-colors [&[data-state=open]]:bg-primary/10 [&[data-state=open]]:text-primary">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>Dependencies</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({Object.keys(dir.projectInfo.dependencies).length +
                            Object.keys(dir.projectInfo.devDependencies).length +
                            Object.keys(dir.projectInfo.peerDependencies).length} total)
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-3 pb-4 bg-card">
                      {renderDependencies(dir.projectInfo.dependencies, 'Dependencies')}
                      {renderDependencies(dir.projectInfo.devDependencies, 'Dev Dependencies')}
                      {renderDependencies(dir.projectInfo.peerDependencies, 'Peer Dependencies')}
                      {Object.keys(dir.projectInfo.dependencies).length === 0 &&
                        Object.keys(dir.projectInfo.devDependencies).length === 0 &&
                        Object.keys(dir.projectInfo.peerDependencies).length === 0 && (
                          <p className="text-xs text-muted-foreground italic text-center py-4">No dependencies found</p>
                        )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )
    } else {
      return (
        <div key={`${dir.directoryName}-${index}`} className={isSubdirectory ? 'ml-6' : ''}>
          <div
            className={`bg-card/50 border border-dashed rounded-lg px-6 py-4 flex items-center justify-between transition-all ${
              dir.hasSubDirectories ? 'cursor-pointer hover:bg-accent/30 hover:border-solid' : ''
            }`}
            onClick={() => dir.hasSubDirectories && handleExpandDirectory(dir.directoryName, index)}
          >
            <div className="flex items-center gap-3">
              <Folder className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{dir.directoryName}</span>
            </div>
            <div className="flex items-center gap-2">
              {dir.hasSubDirectories && (
                dir.expanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )
              )}
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">NOT A PROJECT</span>
            </div>
          </div>
          {dir.expanded && dir.subdirectories && dir.subdirectories.length > 0 && (
            <div className="mt-2 space-y-2 ml-4 pl-4 border-l-2 border-dashed border-muted">
              {dir.subdirectories.map((subdir, subIndex) => renderDirectory(subdir, subIndex, true))}
            </div>
          )}
        </div>
      )
    }
  }

  const filteredDirectories = directories.filter(dir => {
    if (filterMode === 'all') return true
    if (filterMode === 'projects') return dir.isProject
    if (filterMode === 'non-projects') return !dir.isProject
    return true
  })

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-primary flex items-center gap-3">
              <FolderOpen className="w-10 h-10" />
              Dev Environment Explorer
            </h1>
            <p className="text-muted-foreground">Scan and explore your development projects</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="transition-all hover:scale-110"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>

        <div className="flex gap-3 mb-6">
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

        {directories.length > 0 && (
          <div className="mb-6 flex items-center gap-2 bg-card rounded-lg p-4 border">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground mr-2">Filter:</span>
            <div className="flex gap-2">
              <Button
                variant={filterMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('all')}
              >
                All ({directories.length})
              </Button>
              <Button
                variant={filterMode === 'projects' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('projects')}
              >
                Projects ({directories.filter(d => d.isProject).length})
              </Button>
              <Button
                variant={filterMode === 'non-projects' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMode('non-projects')}
              >
                Non-Projects ({directories.filter(d => !d.isProject).length})
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        )}

        {filteredDirectories.length > 0 && (
          <div className="space-y-3">
            {filteredDirectories.map((dir, index) => renderDirectory(dir, index))}
          </div>
        )}

        {!loading && directories.length > 0 && filteredDirectories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Filter className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No directories match the current filter</p>
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
