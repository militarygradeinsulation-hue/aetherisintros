## Source-grounded web contact enrichment (CRM People)

From **CRM → People**, open a contact and select **Look up missing details**.
Alternatively open **Find missing details on web** to research up to five uploaded
contacts at a time. The lookup is opt-in, requires login, and runs on the server
against the member's own saved CRM record. No third-party people-search service
is needed; it reuses the existing bounded public web search. Availability depends
on actual public indexing and the search providers' response. The UI never
pretends unverified or absent data was found.

The public search query contains ONLY the saved full name and company or location.
Saved email addresses, phone numbers, and private notes do not leave the account.
The tool rejects namesakes, irrelevant sources, nonpublic URLs and LinkedIn scraping.
It only proposes emails, phones and titles that are explicitly published near
the same person's name and employer/location. Each suggestion includes a public
source link, a quoted excerpt, and the check timestamp. Personal email domains,
invented email naming schemes, and inferred direct phone numbers are not accepted.
The optional AI gateway assists extraction but has no authority to invent data:
its proposals must pass exact quote and identity grounding checks. A conservative
regex extractor also works if AI is unavailable.

Every suggestion starts in a **preview** with a checkbox. The member unchecks
anything unwanted before pressing Save; no writes happen on lookup alone. The
accept action re-authenticates, checks owner permissions and last-write version,
rechecks that each field is still empty, writes only selected values, and appends
source URLs to the CRM notes so the decision is traceable. Completed fields are
never overwritten. Uploads and original source columns remain intact.

Private Library also exposes the same review control when its backend is
installed and the member has editing rights. It uses the original
\`update_private_library_record\` RPC and never publishes contacts to the network.
The current Lovable production database did not contain the private-library
baseline at the time of implementation; this control will remain unavailable
there until that unrelated schema recovery is completed.

The batch queue is intentionally bounded (five per click, 20 authenticated
searches per user per fifteen minutes). No background scraping or automatic
mass writes occur. Review links and values before contacting anyone: a published
address is not proof of consent to outreach and DNC restrictions still apply.
