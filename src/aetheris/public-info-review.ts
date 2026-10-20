import type { PublicSuggestion } from './public-info'
import type { ScanPatch } from './linkedin-scan-ui'

/** Apply only individually selected, supported suggestions; never map unsupported "building". */
export function reviewedPublicProfilePatch(items: readonly PublicSuggestion[], picked: ReadonlySet<number>): ScanPatch {
  const patch: ScanPatch = {}
  items.forEach((item, index) => {
    if (!picked.has(index)) return
    switch (item.field) {
      case 'title': patch.title = item.value; break
      case 'company': patch.company = item.value; break
      case 'location': patch.location = item.value; break
      case 'thesis': patch.headline = item.value; break
      case 'whatIDo': patch.about = item.value; break
      case 'building': break // Review-only, no profile field.
    }
  })
  return patch
}
