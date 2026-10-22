import { lazy, Suspense, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import './pdf-document-viewer.css'
const PdfDocumentViewer = lazy(() => import('./PdfDocumentViewer'))
export function PdfPreviewButton({ url, name }: { url: string; name: string }) {
  const [open, setOpen] = useState(false)
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button" className="ai-pdf-open"><FileText size={16}/><span>Read {name}</span></button></DialogTrigger>
    <DialogContent className="ai-pdf-dialog">
      <DialogTitle>{name}</DialogTitle>
      <DialogDescription>Read the attachment in your workspace. Document text stays in this browser.</DialogDescription>
      <a className="ai-pdf-original" href={url} target="_blank" rel="noopener noreferrer">Open original <ExternalLink size={14}/></a>
      {open && <Suspense fallback={<p role="status">Loading document viewer…</p>}><PdfDocumentViewer url={url} name={name}/></Suspense>}
    </DialogContent>
  </Dialog>
}
