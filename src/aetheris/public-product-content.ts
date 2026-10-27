export interface PublicProductPage {
  path: '/how-it-works' | '/warm-introductions' | '/active-memory' | '/executive-networking' | '/relationship-intelligence' | '/ai-networking-assistant' | '/business-relationship-crm' | '/social-business-views' | '/warm-introduction-playbook'
  title: string
  label?: string
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
  {
    "path": "/executive-networking",
    "label": "Executive networking",
    "title": "Executive Networking for CEOs and Founders | Ask Intros",
    "heading": "Executive networking built around a reason to connect.",
    "description": "Explore how Ask Intros helps CEOs, founders and business operators make purposeful connections, review fit and request mutually agreed introductions.",
    "summary": "Ask Intros is a business relationship network where people can explain a specific need, show what they can offer, discover relevant context and request introductions with permission. It is designed to make the reason for connecting clearer than a list of contacts.",
    "sections": [
      {
        "heading": "Start with the work, not a connection count",
        "paragraphs": [
          "A founder looking for a distribution partner and an operator looking for implementation experience have different reasons to meet. A useful professional profile says what someone is building, what they need now and what they can contribute. Ask Intros puts that context closer to the introduction request.",
          "Network participation depends on real members, their current profiles and their sharing choices. A suggested connection does not imply that someone is available, endorses a project or will accept a meeting."
        ]
      },
      {
        "heading": "Use Why me, Why them, Why now",
        "paragraphs": [
          "Why me explains the relevance of the requester. Why them explains the other person's experience or role. Why now explains why the timing makes sense. These three questions turn a vague networking request into something another executive can evaluate.",
          "For example, instead of asking to connect with any CEO, a company owner might request an introduction to someone who has already managed a handoff between sales and operations in a similar business. The example is a model for a request, not a claim about who is in the network."
        ]
      },
      {
        "heading": "Move from introduction to useful next step",
        "paragraphs": [
          "A warm introduction should ask permission and include enough context for both sides to decide. After an accepted introduction, members can keep the conversation and next step near their relationship records.",
          "Ask Intros offers two presentations of the same workspace. Social View emphasizes people and conversations; Business View emphasizes business context and work. The views do not create separate networks or change permissions."
        ]
      }
    ],
    "questions": [
      {
        "question": "Who can use Ask Intros for executive networking?",
        "answer": "Founders, CEOs, owners, operators and other business professionals can explore the platform. Basic account creation and reviewed Executive access are different membership paths, with current eligibility explained on the membership page."
      },
      {
        "question": "Does joining guarantee an introduction to an investor or CEO?",
        "answer": "No. A possible introduction depends on who participates, whether the context fits and whether both people agree. Ask Intros does not guarantee access, funding or sales."
      },
      {
        "question": "How is this different from collecting contacts?",
        "answer": "A contact list stores names. Ask Intros emphasizes the reason for a relationship, permission to connect and a concrete next step, while preserving private notes and sharing choices."
      }
    ]
  },
  {
    "path": "/relationship-intelligence",
    "label": "Relationship intelligence",
    "title": "Business Relationship Intelligence and Context | Ask Intros",
    "heading": "Business relationship intelligence begins with context.",
    "description": "Learn how Ask Intros organizes relationship context, needs, offers and follow up decisions without treating unverified AI suggestions as facts.",
    "summary": "Relationship intelligence means using recorded, permissioned context to decide who may be relevant, why a conversation could help and what to do next. Ask Intros combines relationship notes and member context with introductions and business workflows.",
    "sections": [
      {
        "heading": "Connect names with the reasons they matter",
        "paragraphs": [
          "A company name and job title are not enough to prepare for a useful conversation. Relevant context may include a known business need, a previous discussion, a resource promised or a next step agreed. Recording the source of that information matters as much as recording the information itself.",
          "In Ask Intros, Active Memory supports the context behind a relationship. Information may come from your own notes or permitted workspace records; the system should not be assumed to read private external accounts automatically."
        ]
      },
      {
        "heading": "Keep facts, judgments and suggestions separate",
        "paragraphs": [
          "A note entered after a meeting is different from an inference about what someone might want. Members should review what is known and what remains a suggestion before sending a request or taking action.",
          "Ask Intros uses Why me, Why them and Why now to focus a decision. It cannot certify that a person wants an introduction simply because their profile appears relevant."
        ]
      },
      {
        "heading": "Respect permission at each step",
        "paragraphs": [
          "Private research notes, public profile details and an introduction message can have different sharing scopes. Permission to connect two people is not the same as permission to disclose private details about either person.",
          "The useful outcome is a better next action: confirm timing, share an agreed resource, or request consent for a conversation. Relationship intelligence supports judgment; it does not replace it."
        ]
      }
    ],
    "questions": [
      {
        "question": "What is relationship intelligence software?",
        "answer": "It is software that helps organize and interpret the context around professional relationships, including conversations, relevant needs and agreed next steps. Its usefulness depends on accurate records and appropriate permissions."
      },
      {
        "question": "Is relationship intelligence the same as CRM?",
        "answer": "They overlap. A CRM tracks people, organizations and opportunities. Relationship intelligence emphasizes the context, relevance and timing that make a follow up useful."
      },
      {
        "question": "Does Ask Intros publish member notes or private relationship data?",
        "answer": "No. Public explanations and demonstrations are separate from private member workspaces. Sharing decisions and access controls still apply to individual records."
      }
    ]
  },
  {
    "path": "/ai-networking-assistant",
    "label": "Butler AI assistant",
    "title": "AI Networking Assistant and Butler | Ask Intros",
    "heading": "Meet Butler, the assistant for purposeful networking.",
    "description": "See how Butler helps members explore Ask Intros, understand relationship workflows and prepare better questions while keeping decisions and consent with people.",
    "summary": "Butler is Ask Intros' in-product assistant. Its role is to help people find their way through the workspace, understand supported tools and think through a relevant next step. An assistant suggestion is not an endorsement or permission to contact another member.",
    "sections": [
      {
        "heading": "Ask a better question before reaching out",
        "paragraphs": [
          "A useful introduction request begins with a specific problem or outcome. Butler can prompt members to explain their need, consider what they can offer and clarify the reason a meeting could be useful.",
          "For example, replacing 'I want to meet investors' with a specific question about an industry, stage or operating challenge makes it easier to evaluate whether a conversation is appropriate. This is guidance, not a guarantee of a match or capital."
        ]
      },
      {
        "heading": "Navigate one workspace with two views",
        "paragraphs": [
          "In Social View, members focus on people, posts and conversations. In Business View, they work with business tools and relationship records. Butler helps orient people within the supported Ask Intros experience.",
          "Available assistant actions depend on the member's account, permissions and enabled services. Public demonstrations can show illustrative activity, which should not be confused with real member data or successful live automation."
        ]
      },
      {
        "heading": "Human consent stays at the center",
        "paragraphs": [
          "An AI generated idea can help draft a question or highlight context worth reviewing. It should not silently send a message, disclose a private note or certify a professional relationship.",
          "Review important actions, verify supporting records and ask each person before arranging an introduction. The reason for using an assistant is to make the next human decision clearer."
        ]
      }
    ],
    "questions": [
      {
        "question": "What does Butler do in Ask Intros?",
        "answer": "Butler helps explain the interface, offer practical networking prompts and assist with supported workflows. Capabilities can vary with account permissions and the services active in the deployment."
      },
      {
        "question": "Does Butler automatically introduce me to anyone?",
        "answer": "No. Introductions depend on actual participants, a suitable context and mutual consent. An AI suggestion does not contact or obligate another person."
      },
      {
        "question": "Does Butler know everything about my LinkedIn or other accounts?",
        "answer": "No. External account information is not automatically available. Any connected or imported information depends on the integrations, permissions and records actually provided."
      }
    ]
  },
  {
    "path": "/business-relationship-crm",
    "label": "Relationship CRM",
    "title": "Business Relationship CRM and Pipeline | Ask Intros",
    "heading": "Keep relationships and next steps in the same workspace.",
    "description": "Explore Ask Intros Business View for contact context, company records, opportunities and follow ups linked to your professional network.",
    "summary": "Ask Intros brings relationship activity and business organization closer together. Rather than treating a promising conversation as just another contact, Business View gives members a place to organize relevant people, companies, opportunities and work.",
    "sections": [
      {
        "heading": "From a person to a business opportunity",
        "paragraphs": [
          "A useful CRM record answers who the person is, what has been discussed and what action comes next. Keeping the context near the record can reduce the need to reconstruct a conversation from separate tools.",
          "Ask Intros includes business workspace concepts for contacts, companies and opportunities alongside networking. Which tools and integrations are available depends on account access and the current deployment; the public demo is not proof of live synchronization."
        ]
      },
      {
        "heading": "Do not confuse a lead with a relationship",
        "paragraphs": [
          "A contact may be worth knowing without representing an immediate deal. A mutual introduction may lead to advice, a partnership, a referral or no commercial transaction at all.",
          "Ask Intros frames relationships through Why me, Why them and Why now, so the decision to follow up can reflect relevance and timing rather than a fabricated deal probability."
        ]
      },
      {
        "heading": "Switch views without splitting your work",
        "paragraphs": [
          "Social View and Business View are alternative presentations of the same membership and permitted records, not two separate CRMs. The public social feed is not a place for confidential pipeline notes.",
          "Teams evaluating a CRM should test actual workflow fit, import rules, access boundaries and available integrations before assuming another subscription can be replaced."
        ]
      }
    ],
    "questions": [
      {
        "question": "Is Ask Intros a CRM or a networking platform?",
        "answer": "It combines professional networking with business relationship and opportunity tools. It should not be assumed to replace every capability of a dedicated CRM without evaluating the required workflow."
      },
      {
        "question": "Does switching to Social View publish my pipeline?",
        "answer": "No. The two views change presentation, not sharing permissions. Private business records remain subject to their access controls."
      },
      {
        "question": "Can it guarantee fewer software subscriptions?",
        "answer": "No. Any consolidation depends on the features and integrations a company actually uses. Compare requirements and verify the real deployment before replacing another tool."
      }
    ]
  },
  {
    "path": "/social-business-views",
    "label": "Social and Business views",
    "title": "Social View and Business View in One Platform | Ask Intros",
    "heading": "One network. Two ways to work.",
    "description": "Compare the Social and Business views in Ask Intros. Both use the same membership and permissions, with different presentations for relationships and business operations.",
    "summary": "Ask Intros lets members approach their relationships from two perspectives. Social View emphasizes people, posts and conversations. Business View organizes business context and work. Switching views changes the presentation, not the identity or ownership of your data.",
    "sections": [
      {
        "heading": "Social View: discover the people behind the work",
        "paragraphs": [
          "Social View is oriented around community activity, profiles and conversations. Members can describe a need, explain an offer and decide whether a meaningful introduction makes sense.",
          "The interface can show demonstration activity to explain a workflow. Demo people and posts are illustrative, and must not be counted as real members or confirmed outcomes."
        ]
      },
      {
        "heading": "Business View: organize what happens next",
        "paragraphs": [
          "Business View keeps the focus on contact context, opportunities, tasks and other supported workspace tools. It provides a business oriented presentation of the same account rather than a separate relationship database.",
          "Moving between the two views should not erase an agreed next step, change consent or make notes visible to a different audience. Members still decide what to share."
        ]
      },
      {
        "heading": "Why keep them connected?",
        "paragraphs": [
          "Relationships can begin in a conversation and continue as a project or partnership. Splitting the two stages across disconnected systems makes it harder to remember context and follow through.",
          "Ask Intros is designed to bring those stages closer together. The exact tools available and their production status should be evaluated in the member account rather than inferred from the public demo."
        ]
      }
    ],
    "questions": [
      {
        "question": "Is Social View a separate Ask Intros account?",
        "answer": "No. Social and Business are two presentations of the same Ask Intros account and permitted data."
      },
      {
        "question": "Which view should a founder use?",
        "answer": "Social View is useful for discovering people and conversations. Business View is oriented toward organizing business relationships and next steps. You can choose based on the task."
      },
      {
        "question": "Does changing views change who can see my information?",
        "answer": "No. A presentation toggle does not grant sharing permissions. Private records remain private unless a separate authorized action changes their scope."
      }
    ]
  },
{
  "path": "/warm-introduction-playbook",
  "label": "Introduction playbook",
  "title": "How to Request a Warm Business Introduction | Ask Intros",
  "heading": "How to request a warm business introduction people can actually evaluate.",
  "description": "A practical executive introduction playbook: decide who to approach, explain why the connection matters, ask permission and follow up without wasting attention.",
  "summary": "An introduction is not a contact transfer. It is a request for two people to consider spending time together. Before you ask, show the relevance, explain what each person gains and make declining easy. This guide provides a reusable decision framework and realistic message examples.",
  "sections": [
    {
      "heading": "1. Define the outcome before naming the person",
      "paragraphs": [
        "Start with the problem, not the prestige of a title. A CEO seeking help with a manufacturing bottleneck needs a different conversation from a founder evaluating a channel partnership. Write down one outcome, one constraint and one next action that a useful conversation might support.",
        "Weak request: I want to meet more CEOs. Stronger request: I would value a conversation with an owner who has integrated field sales and service scheduling across multiple locations. I am deciding whether to build or buy the coordination layer. The second request makes fit assessable without promising that anyone will respond."
      ]
    },
    {
      "heading": "2. Answer Why me, Why them, Why now",
      "paragraphs": [
        "Why me: Identify your actual role, relevant experience or stake in the problem. Do not manufacture a connection or imply endorsement. Why them: State what publicly shared expertise or permitted context makes this specific person relevant. Why now: Name the decision, deadline or opportunity that makes a conversation useful at this moment.",
        "These three questions are the Ask Intros decision filter. If the reason to connect is weak or the timing is unclear, research further or wait. A credible reason to decline is more respectful than a rushed request."
      ]
    },
    {
      "heading": "3. Make the introduction safe for the connector",
      "paragraphs": [
        "The person making an introduction is spending some of their own relationship equity. Give them a short message they can review and edit. Explain what the recipient might find relevant and ask whether they are comfortable passing it along. Never assume that access to someone's contact details grants consent to use them.",
        "Keep confidential revenue figures, customer names, medical details and private meeting notes out of an introduction request unless their owners have explicitly authorized disclosure. A public professional profile is not permission to share everything you know."
      ]
    },
    {
      "heading": "4. Use a two-step permission request",
      "paragraphs": [
        "Message to a connector: I am evaluating how growing service businesses connect sales promises to delivery capacity. I saw that your contact has worked on this problem. Would you be comfortable asking whether they are open to a brief conversation? Here is why the topic may be relevant to both of us. No pressure if the timing is wrong.",
        "If the connector agrees, they can send a separate note asking the prospective recipient whether they want the introduction. Only when the recipient also agrees should the connection be made. This is the difference between a warm introduction and quietly copying two strangers on a message."
      ]
    },
    {
      "heading": "5. Give the recipient a useful first message",
      "paragraphs": [
        "After mutual agreement, open with context rather than a pitch deck: Thank you for being open to an introduction. I am working on a specific handoff challenge between sales and operations. I would appreciate 15 minutes to compare how you approached it. I can share the field process that worked for our team in return. Would either Tuesday or Thursday fit?",
        "Do not treat the example as a promise of a meeting, a qualified lead or a specific response rate. Adapt the details to what you genuinely know and can offer. If the other person suggests another format, respect it."
      ]
    },
    {
      "heading": "6. Record only an agreed next step",
      "paragraphs": [
        "If the conversation happens, note the purpose, the information you were invited to keep and any next action both people accepted. An introduction can end with useful advice rather than a commercial opportunity. Avoid inventing a pipeline value or claiming a partnership because two people met.",
        "A simple follow up closes the loop with the connector without revealing private details: Thank you for making the introduction. We spoke and agreed on a next step. I appreciated the connection. If no meeting happened, say so plainly rather than suggesting an outcome."
      ]
    },
    {
      "heading": "7. Use a quick decision checklist",
      "paragraphs": [
        "Before sending: Can I describe the need in one sentence? Can I explain why this person is relevant using information I am permitted to share? Is the timing real? Have I made the ask optional for the connector and recipient? Have I offered an appropriate next step? If any answer is no, improve the request first.",
        "Ask Intros brings relationship context, profiles and the introduction workflow into one workspace. Its relevance suggestions are still suggestions: network availability, permissions and mutual interest determine what happens next. The public demonstration uses illustrative people, not evidence that a particular executive is waiting to meet."
      ]
    }
  ],
  "questions": [
    {
      "question": "What is a warm business introduction?",
      "answer": "A warm business introduction is a connection proposed through an existing relationship or meaningful shared context, with both participants able to accept or decline. It is not just an email with two names copied."
    },
    {
      "question": "What does double opt in mean for an introduction?",
      "answer": "Double opt in means each intended participant agrees to the connection before a private introduction is made. The connector may first ask each side separately."
    },
    {
      "question": "How long should an introduction request be?",
      "answer": "Long enough to state the actual need, relevance, timing and next action, but short enough for the recipient to understand without extra research. There is no universal word count or guaranteed response rate."
    },
    {
      "question": "Should I ask for a meeting before a connector checks interest?",
      "answer": "No. Ask whether the connector is comfortable checking interest first. Only propose meeting details after the prospective recipient agrees to engage."
    },
    {
      "question": "Can Ask Intros guarantee access to CEOs or investors?",
      "answer": "No. Membership does not guarantee a particular person is available, willing to connect or interested in a deal. Both sides choose whether to participate."
    }
  ]
}

]
