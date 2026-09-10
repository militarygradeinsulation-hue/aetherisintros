/** Single source of truth for member portraits — one image per person, everywhere. */
import marcusPortrait from '@/assets/member-marcus.jpg'
import priyaPortrait from '@/assets/member-priya.jpg'
import sarahPortrait from '@/assets/member-sarah.jpg'
import elliotPortrait from '@/assets/member-elliot.jpg'
import portrait25Asset from '@/assets/portraits/portrait-25.jpg.asset.json'
import p01PortraitAsset from '@/assets/portraits/member-p1.jpg.asset.json'
import p02PortraitAsset from '@/assets/portraits/member-p2.jpg.asset.json'
import p03PortraitAsset from '@/assets/portraits/member-p3.jpg.asset.json'
import p04PortraitAsset from '@/assets/portraits/member-p4.jpg.asset.json'
import p05PortraitAsset from '@/assets/portraits/member-p5.jpg.asset.json'
import p06PortraitAsset from '@/assets/portraits/member-p6.jpg.asset.json'
import p09PortraitAsset from '@/assets/portraits/member-p9.jpg.asset.json'
import p10PortraitAsset from '@/assets/portraits/member-p10.jpg.asset.json'
import p12PortraitAsset from '@/assets/portraits/member-p12.jpg.asset.json'
import p13PortraitAsset from '@/assets/portraits/member-p13.jpg.asset.json'
import p15PortraitAsset from '@/assets/portraits/member-p15.jpg.asset.json'
import p16PortraitAsset from '@/assets/portraits/member-p16.jpg.asset.json'
import p17PortraitAsset from '@/assets/portraits/member-p17.jpg.asset.json'
import p18PortraitAsset from '@/assets/portraits/member-p18.jpg.asset.json'
import p19PortraitAsset from '@/assets/portraits/member-p19.jpg.asset.json'
import p20PortraitAsset from '@/assets/portraits/member-p20.jpg.asset.json'
import p21PortraitAsset from '@/assets/portraits/member-p21.jpg.asset.json'
import p22PortraitAsset from '@/assets/portraits/member-p22.jpg.asset.json'
import p23PortraitAsset from '@/assets/portraits/member-p23.jpg.asset.json'
import p24PortraitAsset from '@/assets/portraits/member-p24.jpg.asset.json'
import josephPortraitAsset from '@/assets/portraits/member-joseph.jpg.asset.json'

export const memberPortraits: Record<string, string> = {
  me: josephPortraitAsset.url,
  p1: p01PortraitAsset.url, p2: p02PortraitAsset.url, p3: p03PortraitAsset.url,
  p4: p04PortraitAsset.url, p5: p05PortraitAsset.url, p6: p06PortraitAsset.url,
  p7: sarahPortrait, p8: marcusPortrait, p9: p09PortraitAsset.url,
  p10: p10PortraitAsset.url, p11: priyaPortrait, p12: p12PortraitAsset.url,
  p13: p13PortraitAsset.url, p14: elliotPortrait, p15: p15PortraitAsset.url,
  p16: p16PortraitAsset.url, p17: p17PortraitAsset.url, p18: p18PortraitAsset.url,
  p19: p19PortraitAsset.url, p20: p20PortraitAsset.url, p21: p21PortraitAsset.url,
  p22: p22PortraitAsset.url, p23: p23PortraitAsset.url, p24: p24PortraitAsset.url,
}

export function portraitFor(id: string) {
  return memberPortraits[id] ?? portrait25Asset.url
}
