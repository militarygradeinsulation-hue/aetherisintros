export interface PublicProductPage {
  path: '/how-it-works' | '/warm-introductions' | '/active-memory'
  title: string
  heading: string
  description: string
  summary: string
  sections: Array<{ heading: string; paragraphs: string[] }>
  questions: Array<{ question: string; answer: string }>
}

export const publicProductPages: PublicProductPage[] = [
  {
    path: '/how-it-works',
    title: 'How Ask Intros Works | Business Networking with Context',
    heading: 'Business networking with a reason to connect.',
    description: 'Learn how Ask Intros connects a specific business need with relevant people, mutual consent, and a clear next step. Explore Social and Business views.',
    summary: 'Ask Intros is a business relationship platform. Describe what you need, explain what you can offer, review relevant people, and request an introduction that both sides can choose to accept.',
    sections: [
      { heading: 'Start with a specific business need', paragraphs: [
        'A useful request names an outcome. You might need an operator who has solved a delivery bottleneck, a potential partner with complementary expertise, or someone who understands a new market. Your profile and the context you choose to share help explain why a conversation could be useful.',
        'For example, a founder looking for advice on customer onboarding can describe the specific problem and offer experience in another area. This is an illustration of a request, not a claim that a particular expert is available. Relevant connections depend on the people who have joined and what they choose to share.',
      ] },
      { heading: 'Review why the connection makes sense', paragraphs: [
        'Ask Intros uses three questions to frame a relationship: Why me? Why them? Why now? Look at the person, the reason for meeting, and the timing before requesting an introduction. A match or suggestion is a starting point for your judgment, not a guarantee of fit, a verified endorsement, or a promised business result.',
      ] },
      { heading: 'Ask permission and agree on the next step', paragraphs: [
        'An introduction should give both people enough context to decide whether they want it. Mutual consent comes before the conversation. Once connected, members can continue the discussion, arrange a meeting, and record an agreed next step in their workspace.',
      ] },
      { heading: 'One workspace, two visual views', paragraphs: [
        'Social View emphasizes the feed, people, and conversations. Business View presents the same account through a business workspace. Switching views changes the presentation; it does not create a second membership or turn private information into public content.',
        'The Ask Intros Butler helps explain the interface and navigate supported workflows. Treat suggestions as assistance and review important actions. The public demo contains illustrative people and activity. Create your own account to work with your profile and permitted records.',
      ] },
    ],
    questions: [
      { question: 'Who is Ask Intros for?', answer: 'Ask Intros is designed for purposeful professional connections among founders, CEOs, operators, and other business professionals. Basic account creation and reviewed Executive access are separate membership paths; current requirements are explained on the membership page.' },
      { question: 'Does Ask Intros guarantee introductions or customers?', answer: 'No. Availability, mutual interest, member participation, and consent determine whether an introduction happens. Joining does not guarantee access to a particular person, a sale, funding, or another outcome.' },
      { question: 'Can I look before creating an account?', answer: 'Yes. The guided demo shows the interface with illustrative accounts and activity. Demo interactions are not messages to real members and should not be treated as evidence of network size or business results.' },
    ],
  },
  {
    path: '/warm-introductions',
    title: 'Warm Introductions with Mutual Consent | Ask Intros',
    heading: 'Make a warm introduction worth accepting.',
    description: 'Learn a practical double opt in introduction workflow, what to include in a request, and how Ask Intros supports relevant business connections with mutual consent.',
    summary: 'A warm introduction connects two people through someone who can explain why they should meet. A double opt in introduction adds a permission step: both people agree before they are connected.',
    sections: [
      { heading: 'What makes an introduction warm?', paragraphs: [
        'The value comes from relevant context and a credible relationship, not simply having a contact in a list. Explain how you know the people, what the requester hopes to accomplish, and why the conversation could help both sides. If you do not know someone well, say so rather than implying a stronger endorsement.',
        'Ask Intros frames this context as Why me, Why them, and Why now. Review profiles and the purpose of the request before deciding whether to ask for, offer, or accept an introduction.',
      ] },
      { heading: 'A practical double opt in workflow', paragraphs: [
        'First, describe one specific need and the person or type of expertise that could help. Second, give the connector a short explanation they can pass on. Third, ask each person privately whether the conversation is welcome. Only connect them after both agree. If either person declines, respect that decision and do not treat silence as consent.',
        'After the introduction, agree on a manageable next step. A short conversation, a relevant resource, or an answer to one question is clearer than an open ended request to explore synergies. Record the next step so the conversation has a purpose after the first message.',
      ] },
      { heading: 'A forwardable introduction request', paragraphs: [
        'Example request: “I am working on customer onboarding for a service business. I would value a short conversation with someone who has improved the handoff from sales to delivery. I can share what we have learned about measuring inquiry response times. Would you be comfortable asking whether this conversation would be useful?”',
        'Example permission check: “Someone in my network is working on an onboarding problem that overlaps with your experience. They are asking for a brief exchange of practical lessons. Would you like an introduction? No problem if the timing is not right.” These are writing examples, not messages sent by Ask Intros.',
      ] },
      { heading: 'Where Ask Intros fits', paragraphs: [
        'Use Ask Intros to describe a need, discover relevant member context, review introduction requests, and continue an accepted conversation. The available people and paths depend on the network and what members permit. A suggestion does not automatically contact someone or guarantee that they will accept.',
      ] },
    ],
    questions: [
      { question: 'What is a double opt in introduction?', answer: 'It is an introduction where both people are asked separately and agree before being connected. The connector explains the reason for the proposed conversation without assuming either person wants it.' },
      { question: 'Is an introduction the same as a referral?', answer: 'An introduction opens a conversation. A referral may also include a recommendation or a specific business opportunity. Do not imply an endorsement, referral fee, or promised result unless the people involved have explicitly agreed to it.' },
      { question: 'Should I share private notes in the request?', answer: 'Include only context you have permission to share and enough information to explain the purpose. Private relationship notes are not a substitute for consent to disclose someone else’s information.' },
    ],
  },
  {
    path: '/active-memory',
    title: 'Active Memory for Business Relationships | Ask Intros',
    heading: 'Remember the context behind the connection.',
    description: 'Understand Active Memory in Ask Intros: relationship notes, recorded context, sources, and sharing choices that support useful follow up without making private context public.',
    summary: 'Active Memory helps keep useful relationship context alongside the people and work it concerns. It starts with information you record or permit the system to use, rather than assuming that every contact, conversation, or outside account is available.',
    sections: [
      { heading: 'Remember more than a name and a title', paragraphs: [
        'A contact record can tell you who someone is. Relationship context explains what you discussed, what they are working on, what you offered, and why a follow up might be useful. Keeping that information connected to the right person makes it easier to prepare for the next conversation.',
        'For example, you might record that an operator is exploring a new market, that you promised to share a resource, and that you should check the timing before requesting an introduction. These are illustrative notes. They are not information collected about a real member.',
      ] },
      { heading: 'Separate recorded facts from suggestions', paragraphs: [
        'Review the source and scope of information before acting on it. A note you entered, a permitted workspace record, and an AI suggestion have different meanings. A suggestion can help you think through a next step, but it is not proof that someone has a need, endorses a service, or wants to be contacted.',
        'Ask Intros brings memory and relationship workflows into the same workspace. Use the Memory area and supported Butler actions to review recorded context and navigate your work. What is available depends on your account, the records present, and the integrations or permissions actually in place.',
      ] },
      { heading: 'Keep sharing decisions explicit', paragraphs: [
        'Private context should not be copied into an introduction just because it would make the request more persuasive. Review what you are sharing, who will receive it, and whether the person concerned has agreed. Mutual consent for an introduction and permission to disclose private notes are separate decisions.',
        'The public website and demo do not make member workspaces searchable. Switching between Social and Business views does not change the sharing scope of a record.',
      ] },
      { heading: 'Use memory to support a useful next step', paragraphs: [
        'Before following up, check what was actually agreed and whether the context is still current. Ask a specific question, share the promised resource, or confirm whether the timing is right. The aim is a relevant conversation, not an automated sequence based on assumptions.',
      ] },
    ],
    questions: [
      { question: 'Does Active Memory automatically read all my accounts?', answer: 'No. A feature name does not grant access to outside services. Available context depends on the information recorded in Ask Intros and the connections and permissions actually enabled for your account.' },
      { question: 'Does changing to Social View publish my private notes?', answer: 'No. Social and Business are visual presentations of the same workspace. Changing views is not a sharing action or permission grant.' },
      { question: 'Are AI suggestions verified facts?', answer: 'No. Review the supporting records and source context. An AI suggestion can be useful for deciding what to investigate or ask next, but it should not be presented as a confirmed fact about another person.' },
    ],
  },
]
