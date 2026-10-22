import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, BadgeCheck, Bookmark, Heart, MessageCircle, MoreHorizontal, Play, Share2, Users } from 'lucide-react'
import { useState } from 'react'
import './vision-profile.css'

export const Route = createFileRoute('/vision-profile')({
  head: () => ({ meta: [{title: 'Alex Carter | Aetheris Intros'}] }),
  component: VisionProfile,
})
function VisionProfile(){
  const [connected,setConnected]=useState(false)
  const [following,setFollowing]=useState(false)
  const [liked,setLiked]=useState(false)
  const [tab,setTab]=useState('About')
  const [message,setMessage]=useState('')
  return <div className="vprofile-page">
    <div className="vprofile-shell">
      <div className="vprofile-cover"><Link to="/vision" aria-label="Return to dashboard" className="vprofile-back"><ArrowLeft size={20}/></Link><span className="vprofile-moon"/></div>
      <div className="vprofile-content">
        <div className="vprofile-identity"><div className="vprofile-avatar">AC</div><button onClick={()=>setFollowing(!following)} aria-label="Follow profile" className="vprofile-icon"><Bookmark size={17} fill={following?'currentColor':'none'}/></button><button onClick={()=>setMessage('Profile actions are available in the connected app.')} className="vprofile-icon" aria-label="More profile actions"><MoreHorizontal size={20}/></button></div>
        <h1>Alex Carter <BadgeCheck size={19} fill="#f87934" color="#f87934"/></h1>
        <p className="vprofile-role">CEO · Horizon Partners</p><p className="vprofile-location">San Francisco, CA</p>
        <p className="vprofile-bio">Building a more connected world through people, ideas and opportunity.</p>
        <div className="vprofile-metrics"><div><strong>248</strong><span>Connections</span></div><div><strong>12</strong><span>Introductions</span></div><div><strong className="vprofile-score">92</strong><span>Influence Score</span></div></div>
        <div className="vprofile-actions"><button className="vprofile-connect" onClick={()=>setConnected(!connected)}>{connected?'Connected':'Connect'}</button><button onClick={()=>setMessage('Messaging opens in your Ask Intros workspace.')} className="vprofile-message">Message</button></div>
        {message&&<div className="vprofile-message-note" role="status">{message}<button onClick={()=>setMessage('')}>×</button></div>}
        <nav className="vprofile-tabs">{['About','Posts','Media','Network'].map(t=><button onClick={()=>setTab(t)} className={t===tab?'active':''} key={t}>{t}</button>)}</nav>
        {tab==='About'||tab==='Media'? <section><div className="vprofile-heading"><h2>Featured</h2><span>See all</span></div><button className="vprofile-feature" onClick={()=>setMessage('Featured video is a design-preview placeholder.')}><span className="vprofile-play"><Play size={23} fill="white"/></span><small>5:28</small></button><h3>A Brighter, More Connected World</h3><p className="vprofile-dim">My vision for a more collaborative global economy.</p></section>:null}
        {tab==='About'||tab==='Posts'?<section><div className="vprofile-heading"><h2>Recent Posts</h2></div><div className="vprofile-post"><div className="vprofile-smallavatar">AC</div><div><strong>Alex Carter <small>· 2d</small></strong><p>The most valuable currency in business is trust. Technology helps us scale it, but people create it.</p><div className="vprofile-engagement"><button onClick={()=>setLiked(!liked)}><Heart size={16} fill={liked?'#f87934':'none'}/>{liked?'482':'481'}</button><button onClick={()=>setMessage('Comments are available in the connected platform.')}><MessageCircle size={16}/>102</button><button onClick={()=>setMessage('Share options are available in the connected platform.')}><Share2 size={16}/> Share</button></div></div></div></section>:null}
        {tab==='Network'?<section><div className="vprofile-heading"><h2>Network</h2></div><div className="vprofile-network"><Users size={23}/><p>248 strategic connections and 12 introductions.</p><Link to="/vision">Explore network →</Link></div></section>:null}
      </div>
    </div>
  </div>
}