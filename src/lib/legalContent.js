// Legal page copy, shared by App.jsx (LegalPage) and scripts/prerender.js.
// Keeping it here means the crawler-facing static page and the rendered page
// can never drift apart — which for a privacy policy or terms actually matters.

export const LEGAL_CONTENT = {
  terms: {
    title: "Terms of Service",
    updated: "October 2026",
    body: `
      <h2>1. Who we are, and what these terms cover</h2>
      <p>RevaultAI is operated by RevaultAI LLC, a limited liability company with a principal place of business at 10800 S Main St, Apt 210, Los Angeles, CA 90061. In these terms, &ldquo;RevaultAI&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean RevaultAI LLC, and &ldquo;you&rdquo; means the person using the platform.</p>
      <p>These terms are a binding agreement covering your use of revaultai.com and everything on it. By creating an account or using the platform, you agree to them. If you do not agree, do not use RevaultAI. Our <a href="/privacy" style="color: var(--accent);">Privacy Policy</a>, <a href="/refunds" style="color: var(--accent);">Refund Policy</a>, <a href="/ai-disclaimer" style="color: var(--accent);">AI Content Disclaimer</a> and <a href="/dmca" style="color: var(--accent);">DMCA Policy</a> form part of these terms.</p>

      <h2>2. Eligibility</h2>
      <p>You must be at least 18 years old to create an account, generate anything, or make a purchase. By using RevaultAI you confirm that you are 18 or older and able to enter into this agreement. If you are using the platform for a company, you confirm you have authority to bind it.</p>

      <h2>3. Your account</h2>
      <p>You are responsible for your credentials and for everything done under your account. Use an email address you control, keep your password private, and tell us at <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a> if you think someone else has access. We may decline to create, or may close, an account we reasonably believe is being used to break these terms or the law.</p>

      <h2>4. Credits and payment</h2>
      <p>Generation on RevaultAI is paid for with credits. Credits are a prepaid balance that lets you run generation jobs. They are not currency, carry no cash value, earn no interest, and cannot be transferred between accounts.</p>
      <p>Payments are processed by Stripe. We never see or store your full card number. Prices are in U.S. dollars and exclude any tax we are required to collect.</p>
      <p>Credits are spent when a job is submitted to the model provider that runs it. Because we are charged at that moment, a job that completes has consumed its credits whether or not you like the result. Our <a href="/refunds" style="color: var(--accent);">Refund Policy</a> sets out the cases where credits come back anyway, the most important being a job that fails on our side or the provider&rsquo;s.</p>
      <p>We may change prices or the credit cost of a generation. A change applies to purchases made after it takes effect and never retroactively revalues credits you have already bought.</p>

      <h2>5. Acceptable use</h2>
      <p>You keep whatever rights you already hold in material you upload, and you are responsible for holding them in the first place. Do not upload anything you do not have permission to use.</p>
      <p>You may not use RevaultAI to:</p>
      <p>
        &mdash; generate or publish sexual content involving minors, or content that sexualizes a real person without their consent;<br>
        &mdash; create a likeness of a real person in order to deceive, or present synthetic footage of a real person as something they actually did or said;<br>
        &mdash; infringe anyone&rsquo;s copyright, trademark, publicity or privacy rights;<br>
        &mdash; generate content promoting violence, terrorism or illegal activity;<br>
        &mdash; scrape, mirror, resell or redistribute the gallery or any other part of the platform without our written permission;<br>
        &mdash; work around credit metering, rate limits or any other technical restriction;<br>
        &mdash; probe, scan or attack our infrastructure or that of the providers we route to.
      </p>
      <p>You must also follow the usage policies of the model providers your jobs run on. Those are listed in our <a href="/privacy" style="color: var(--accent);">Privacy Policy</a> and they apply to your use of them through us.</p>

      <h2>6. Your work, and the gallery</h2>
      <p>You own, or hold whatever rights the relevant provider&rsquo;s terms grant you in, the output of your own generation jobs, subject to those terms and to the limits of copyright law as it applies to AI-generated material. Our <a href="/ai-disclaimer" style="color: var(--accent);">AI Content Disclaimer</a> explains why that last point is not straightforward.</p>
      <p>If you submit a film to the gallery, you grant RevaultAI a non-exclusive, worldwide, royalty-free license to host, stream, transcode, thumbnail, display and promote that film on the platform and in our marketing for the platform. You keep ownership. You can ask us to take a film down at any time by emailing <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a>, and we will remove it from the gallery within a reasonable period; cached copies and promotional material already distributed may persist longer.</p>
      <p>Being able to submit does not entitle you to be published. RevaultAI is curated, and we may decline, unpublish or reorder anything consistent with these terms.</p>
      <p>The platform itself &mdash; the software, the design, the name and logo, and the arrangement of the gallery &mdash; belongs to RevaultAI LLC. These terms give you no license to it beyond using the platform as intended.</p>

      <h2>7. Creator earnings and payouts</h2>
      <p>Every film on RevaultAI streams free. Selling is optional. If you mark a film as premium, viewers gain the option to buy a full-quality download, and the following applies.</p>
      <p>You set your own price. You keep <strong>80&#37; of net revenue</strong> on every sale, where net means the sale amount after payment-processing fees charged by Stripe; RevaultAI retains the remaining 20&#37;. Tips, commission and licensing arrangements made through the Support, Hire Me and licensing links on your profile go directly between you and the viewer, and we take nothing from those.</p>
      <p>You are an independent seller, not our employee, partner or agent. You are responsible for your own taxes, and we may be required to collect tax information from you and to report payments to tax authorities.</p>
      <p>We pay creators their share of completed sales to the payment details they give us. RevaultAI is new and payout volume is still small, so we currently arrange the method and timing with each creator directly and confirm it in writing after a first sale. If we move to a fixed payout schedule we will give creators at least 30 days&rsquo; notice.</p>
      <p>If a buyer charges back, or if we refund a sale under our <a href="/refunds" style="color: var(--accent);">Refund Policy</a>, the corresponding amount is deducted from your balance or from future payments. We may hold a payment while we investigate a credible claim that what you sold infringes someone&rsquo;s rights or breaks these terms, and reverse it if the claim holds up.</p>

      <h2>8. Copyright and DMCA</h2>
      <p>RevaultAI responds to notices of claimed copyright infringement under the Digital Millennium Copyright Act and terminates the accounts of repeat infringers. RevaultAI LLC has registered a designated copyright agent with the United States Copyright Office:</p>
      <p>
        Richard Garland, DMCA Agent<br>
        RevaultAI LLC<br>
        10800 S Main St, Apt 210<br>
        Los Angeles, CA 90061, United States<br>
        Phone: (213) 864-3926<br>
        Email: <a href="mailto:dmca@revaultai.com" style="color: var(--accent);">dmca@revaultai.com</a>
      </p>
      <p>The full requirements for a takedown notice and for a counter-notice are set out in our <a href="/dmca" style="color: var(--accent);">DMCA Policy</a>. Notices sent to any address other than the one above may not reach the agent and may not be effective.</p>

      <h2>9. Services we depend on</h2>
      <p>RevaultAI is a layer over services we do not control: generation model providers, video hosting, payment processing and email delivery. When one of them is down, slow, changes a model, raises its prices or changes its terms, that affects what we can offer. We will do what we reasonably can, and we do not guarantee the continued availability of any specific model or feature.</p>

      <h2>10. Changes to the platform</h2>
      <p>We are a small, actively developed product. We add, change and remove features, and we may discontinue a feature, a model, or the whole platform. If we discontinue RevaultAI entirely we will give you reasonable notice and refund unused credits as described in our <a href="/refunds" style="color: var(--accent);">Refund Policy</a>.</p>

      <h2>11. Suspension and termination</h2>
      <p>You can stop using RevaultAI at any time and ask us to delete your account by emailing <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a>. Our <a href="/privacy" style="color: var(--accent);">Privacy Policy</a> explains what happens to your data.</p>
      <p>We may suspend or close your account if you break these terms, if we are required to by law, or if your use creates a security or legal risk to us or to other people using the platform. Except where immediate action is needed &mdash; fraud, a credible legal threat, an active security problem, or content that has to come down at once &mdash; we will tell you what the problem is and give you a reasonable chance to respond first.</p>
      <p>If we close your account for breaking these terms we may keep unused credits. If we close it for any other reason, or you close it yourself in good standing, we will refund unused credits under our Refund Policy. Sections 6 (as to licenses already granted), 7 (as to amounts already owed), 12, 13, 14, 15 and 17 survive termination.</p>

      <h2>12. Disclaimers</h2>
      <p>RevaultAI is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent permitted by law we disclaim all warranties, express or implied, including implied warranties of merchantability, fitness for a particular purpose, title and non-infringement.</p>
      <p>We do not warrant that the platform will be uninterrupted, secure or error-free; that generation output will be accurate, original, usable for your purpose or free of third-party rights; or that any particular model will remain available. Some jurisdictions do not allow certain warranties to be excluded, so parts of this section may not apply to you.</p>

      <h2>13. Limitation of liability</h2>
      <p>To the fullest extent permitted by law, neither we nor our officers, members, employees or suppliers are liable for indirect, incidental, special, consequential, exemplary or punitive damages, or for lost profits, lost revenue, lost data or loss of goodwill, even if we were told such damages were possible.</p>
      <p>Our total liability to you for all claims relating to the platform is limited to the greater of the amount you paid us in the twelve months before the event giving rise to the claim, or one hundred U.S. dollars. These limits apply regardless of the legal theory and even if a limited remedy fails of its essential purpose. Some jurisdictions do not allow some of these limitations, so parts of this section may not apply to you.</p>

      <h2>14. Indemnity</h2>
      <p>You agree to indemnify, defend and hold harmless RevaultAI LLC and its officers, members and employees from any claim, demand, loss, liability or expense, including reasonable attorneys&rsquo; fees, arising out of material you upload or generate, content you submit to the gallery or sell as a creator, your breach of these terms, or your violation of any law or of anyone&rsquo;s rights.</p>

      <h2>15. Governing law and disputes</h2>
      <p>These terms are governed by the laws of the State of California, without regard to its conflict-of-laws rules.</p>
      <p>Before filing anything, email <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a> describing the dispute and what you want, and we will try to resolve it within 30 days. Most problems end here.</p>
      <p>If we cannot resolve it, you and RevaultAI LLC agree to the exclusive jurisdiction of the state and federal courts located in Los Angeles County, California, and each of us consents to venue there. Either of us may still bring a qualifying individual claim in small-claims court, and either of us may ask a court for an injunction to stop infringement or misuse of intellectual property or confidential information.</p>

      <h2>16. Changes to these terms</h2>
      <p>We may update these terms. When a change is material we will update the date at the top of this page and, if you have an account, tell you by email or in the app before it takes effect. Using RevaultAI after a change takes effect means you accept the updated terms. If you do not, stop using the platform and ask for a refund of unused credits.</p>

      <h2>17. General</h2>
      <p>These terms, with the policies they incorporate, are the entire agreement between you and RevaultAI LLC about the platform. If any provision is unenforceable it is limited or removed to the minimum extent necessary and the rest stays in force. Our failure to enforce a provision is not a waiver of it. You may not assign these terms without our consent; we may assign them to a successor in a merger, acquisition or sale of assets. Nothing here creates a partnership, joint venture, employment or agency relationship. Notices to you may go to the email address on your account.</p>

      <h2>18. Contact</h2>
      <p>Questions about these terms: <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a>. Copyright notices must go to the agent address in section 8.</p>
    `
  },
  privacy: {
    title: "Privacy Policy",
    updated: "October 2026",
    body: `
      <h2>1. Who We Are</h2>
      <p>RevaultAI is operated by RevaultAI LLC, Los Angeles, California. This policy explains what we collect, why, who we share it with, and how to get rid of it. If anything here is unclear, write to rich@revaultai.com and ask.</p>
      <h2>2. What We Collect</h2>
      <p><strong>Account information.</strong> Your email address, and a password that is hashed before it is stored. We never see your password in readable form.</p>
      <p><strong>Profile information.</strong> Your display name, handle, bio, avatar and any links you choose to add. All of this is public by design, because it appears on your creator page.</p>
      <p><strong>Submissions.</strong> The films, images and production notes you submit, along with the title, credits and model information you supply.</p>
      <p><strong>Creation inputs.</strong> When you use the creation tools, we process what you give them: prompts, scene text, reference images, blocking and camera settings, and photographs you upload to generate a set.</p>
      <p><strong>Purchase and credit records.</strong> What you bought or sold, when, and for how much. Card details are handled entirely by Stripe and never reach our servers.</p>
      <p><strong>Usage events.</strong> A small number of explicitly recorded product events, such as a sign-up, a submission, a purchase or a generation. We do not use automatic click or scroll capture, we do not record pageviews, and visitors who are not signed in are not given a profile.</p>
      <p><strong>Server logs.</strong> Standard request logs kept by our hosting provider, including IP address, user agent and timestamps. These are used for security, abuse prevention and debugging.</p>
      <h2>3. What We Do With It</h2>
      <p>We use your information to run the platform: to sign you in, show your work, review submissions, run the creation tools, process payments and payouts, send the notifications you would expect, and diagnose problems. We also use aggregate usage data to decide what to build next.</p>
      <h2>4. What We Do Not Do</h2>
      <ul>
        <li>We do not sell your personal data, and we never have.</li>
        <li>We do not run advertising on RevaultAI and we do not use advertising or cross-site tracking cookies.</li>
        <li>We do not train AI models. RevaultAI builds no models of its own and does not submit your films, prompts or images to anyone for training purposes.</li>
        <li>We do not share your email address with other users. Creator contact happens through the platform or through links you publish yourself.</li>
      </ul>
      <h2>5. AI Processing</h2>
      <p>The creation tools work by sending your inputs to third-party AI providers on your behalf. This is the part of the platform where your content leaves our systems, so it is worth being specific about it.</p>
      <ul>
        <li><strong>fal.ai</strong> runs the video and image models. Your prompts, reference images and generation settings are sent there and the output is returned to us.</li>
        <li><strong>Anthropic</strong> powers the text tools, including scene breakdown, prompt building, shot direction and continuity checks. Your scene text and prompts are sent there.</li>
        <li><strong>World Labs</strong> generates 3D sets. Photographs or descriptions you supply for a set are passed straight through to World Labs and are not stored by RevaultAI.</li>
      </ul>
      <p>Each of these providers handles data under its own terms and privacy policy, and their handling of it is outside our control. If you do not want a particular image, photograph or piece of writing processed by a third party, do not put it into the creation tools.</p>
      <h2>6. Third-Party Services</h2>
      <p>RevaultAI relies on the following providers. Each has its own privacy policy.</p>
      <ul>
        <li><strong>Supabase</strong> — database and authentication</li>
        <li><strong>Cloudflare R2</strong> — file and video storage</li>
        <li><strong>Mux</strong> — video processing and streaming</li>
        <li><strong>Stripe</strong> — payments and creator payouts</li>
        <li><strong>Resend</strong> — transactional email</li>
        <li><strong>PostHog</strong> — product analytics</li>
        <li><strong>Vercel</strong> — hosting and server logs</li>
        <li><strong>fal.ai, Anthropic and World Labs</strong> — AI processing, as described in section 5</li>
      </ul>
      <h2>7. Payments</h2>
      <p>All payments are processed by Stripe. RevaultAI never receives or stores your card number, expiry date or security code. We keep a record of the transaction itself: what was bought, when, and the amount. Creator payouts are also handled through Stripe, which collects the tax and identity information it is legally required to collect before paying anyone.</p>
      <h2>8. Cookies and Local Storage</h2>
      <p>We use cookies and browser local storage to keep you signed in and to remember interface preferences. We use no advertising cookies and no cross-site trackers. Analytics are limited to the explicit product events described in section 2. Clearing your browser storage will sign you out but will not delete your account.</p>
      <h2>9. How Long We Keep Things</h2>
      <p>Your account data is kept until you delete your account. Published films remain in the gallery until you remove them or delete your account. Transaction records are kept as long as we are required to keep them for tax and accounting purposes, even after an account is closed. Server logs are kept on a short rolling window by our hosting provider.</p>
      <h2>10. Deleting Your Account</h2>
      <p>You can delete your account yourself from your settings page. Doing so removes your profile, your submissions, your follows, your purchase history, your stored video and image files, and your login. It cannot be undone.</p>
      <p>There is one exception. If you have published premium work that someone has already paid for, automatic deletion is blocked, because buyers keep permanent access to what they bought. Write to rich@revaultai.com and we will work through it with you.</p>
      <h2>11. Your Rights</h2>
      <p>Wherever you live, you can ask us to show you what we hold about you, correct it, or delete it. Write to rich@revaultai.com and we will respond within thirty days. If you are in California, the EEA or the United Kingdom, you have additional statutory rights, including the right to a portable copy of your data and the right to complain to a supervisory authority. We will honor a valid request regardless of where you are.</p>
      <h2>12. Age</h2>
      <p>RevaultAI is for adults. You must be at least 18 to create an account, submit work or make a purchase. We do not knowingly collect information from anyone under 18, and we delete any account we discover belongs to a minor.</p>
      <h2>13. Security</h2>
      <p>Accounts are protected by hashed credentials and all traffic is encrypted in transit. Uploaded files are held in private storage and served only through short-lived signed links, so a file URL cannot be shared or guessed into permanent access. Administrative keys are held on the server and are never exposed to the browser. No system is perfectly secure, and we do not claim otherwise.</p>
      <h2>14. Where Your Data Is Held</h2>
      <p>RevaultAI operates from the United States, and our providers may store or process data in the United States and in other countries. By using the platform you understand that your information will be handled in the United States.</p>
      <h2>15. Changes</h2>
      <p>We will update this policy as the platform changes. The date at the top always reflects the current version. If a change materially affects how we handle your information, we will tell you by email.</p>
      <h2>16. Contact</h2>
      <p>For privacy questions, data requests or deletion help, write to rich@revaultai.com. For copyright notices, use the registered agent address in our <a href="/dmca" style="color: var(--accent);">DMCA Policy</a>.</p>
    `
  },
  refunds: {
    title: "Refund Policy",
    updated: "October 2026",
    body: `
      <h2>The short version</h2>
      <p>If a generation fails, the credits come back. If you bought credits by mistake and have not spent any, email us within 7 days and we will refund the purchase. If a generation ran and you simply do not like the result, we cannot refund it, because the cost was already incurred on our side.</p>

      <h2>Why generation credits work this way</h2>
      <p>When you submit a generation job we immediately pay a model provider to run it. That money is gone whether the output is brilliant or useless. This is why credits spent on a completed job are not refundable &mdash; not as a matter of preference, but because there is nothing left to return. Nothing in this policy limits any right you have under California or other applicable consumer law.</p>

      <h2>Credits we return automatically</h2>
      <p>Credits go back to your balance, without you asking, when a job fails with an error on our side or the provider&rsquo;s, when a job is submitted but never returns output, or when a bug charges you twice for the same job. If an automatic return has not appeared within 24 hours, email <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a> with roughly when you ran the job and we will correct it by hand.</p>

      <h2>Purchases we refund to your card</h2>
      <p>Email <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a> and we will refund the purchase price to your original payment method if you bought credits within the last 7 days and have not spent any of them, if you were charged twice for the same credit pack, if you were charged after closing your account, or if we discontinue the platform or close your account for a reason other than you breaking our <a href="/terms" style="color: var(--accent);">Terms of Service</a> while you still hold unused credits. Partially used purchases may be refunded pro rata for the unused portion at our discretion within that same 7-day window.</p>
      <p>Card refunds are issued through Stripe and usually reach your statement within 5 to 10 business days, depending on your bank.</p>

      <h2>What we do not refund</h2>
      <p>Credits spent on a job that completed, including one whose output you consider poor, off-prompt or unusable. Credits spent on a job canceled after it had already been submitted to the provider. Credit purchases older than 7 days where credits have been spent. Accounts closed for breaking our Terms of Service. Dissatisfaction with a provider&rsquo;s output limits, watermarks or policy refusals, which we do not control.</p>

      <h2>Films bought from a creator</h2>
      <p>If you bought a premium film and it is materially not what was described, or it does not play at all, email <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a> within 7 days of purchase with your order details. If we agree, we refund you and deduct the amount from the creator&rsquo;s balance. A refund never exceeds the price you paid.</p>

      <h2>Chargebacks</h2>
      <p>If you dispute a charge with your bank instead of contacting us, we may suspend your account while the dispute is open. We would rather hear from you first &mdash; most of what people charge back is something we would simply have refunded.</p>

      <h2>How to reach us</h2>
      <p>Email <a href="mailto:rich@revaultai.com" style="color: var(--accent);">rich@revaultai.com</a> from the address on your account and, if it concerns a specific job or order, tell us roughly when it happened. We aim to reply within two business days.</p>
    `
  },
  dmca: {
    title: "DMCA Policy",
    updated: "October 2026",
    body: `
      <h2>Copyright Policy</h2>
      <p>RevaultAI respects intellectual property rights and expects the same of everyone who uses the platform. We respond to valid takedown notices under the Digital Millennium Copyright Act (17 U.S.C. &sect; 512) and we terminate the accounts of repeat infringers.</p>
      <h2>Designated Copyright Agent</h2>
      <p>RevaultAI LLC, operating as RevaultAI and revaultai.com, has designated the following agent to receive notifications of claimed infringement. This designation is registered with the United States Copyright Office.</p>
      <p>
        Richard Garland, DMCA Agent<br>
        RevaultAI LLC<br>
        10800 S Main St, Apt 210<br>
        Los Angeles, CA 90061<br>
        United States<br>
        Phone: (213) 864-3926<br>
        Email: <a href="mailto:dmca@revaultai.com" style="color: var(--accent);">dmca@revaultai.com</a>
      </p>
      <p>Email is the fastest route and the method we recommend. Please use this address for copyright notices only. General support, account and purchase questions go to rich@revaultai.com and are answered faster there.</p>
      <h2>Filing a Takedown Notice</h2>
      <p>If you believe material on RevaultAI infringes a copyright you own or are authorized to act for, send a written notice to the agent above containing all six of the following elements. A notice missing any of them may not be effective, and we may ask you to resubmit it.</p>
      <ul>
        <li>Your physical or electronic signature.</li>
        <li>Identification of the copyrighted work you claim has been infringed. If a single notice covers multiple works, include a representative list of them.</li>
        <li>Identification of the material you claim is infringing, with enough detail for us to find it. The full URL of the film, image or page is best.</li>
        <li>Your name, mailing address, telephone number and email address.</li>
        <li>A statement that you have a good faith belief the use of the material is not authorized by the copyright owner, its agent, or the law.</li>
        <li>A statement that the information in the notice is accurate, and, under penalty of perjury, that you are the copyright owner or authorized to act on the owner's behalf.</li>
      </ul>
      <p>Knowingly making a material misrepresentation in a takedown notice can make you liable for damages, including costs and attorney's fees, under 17 U.S.C. &sect; 512(f). If you are unsure whether a use is infringing, consider seeking legal advice before filing.</p>
      <h2>What Happens Next</h2>
      <p>We review every notice we receive. If it is complete and appears valid, we remove or disable access to the material, usually within one business day, and we notify the creator who posted it, including a copy of your notice. We keep a record of every notice and of the action taken on it.</p>
      <h2>Filing a Counter-Notice</h2>
      <p>If your work was removed and you believe that was a mistake or a misidentification, you may send a counter-notice to the agent above. It must include all of the following.</p>
      <ul>
        <li>Your physical or electronic signature.</li>
        <li>Identification of the material that was removed and the location where it appeared before it was removed.</li>
        <li>A statement, under penalty of perjury, that you have a good faith belief the material was removed as a result of mistake or misidentification.</li>
        <li>Your name, mailing address and telephone number.</li>
        <li>A statement that you consent to the jurisdiction of the Federal District Court for the judicial district in which your address is located, or, if your address is outside the United States, for any judicial district in which RevaultAI may be found, and that you will accept service of process from the person who filed the original notice or from their agent.</li>
      </ul>
      <p>We forward valid counter-notices to the person who filed the original takedown notice. If they do not tell us within ten to fourteen business days that they have filed an action seeking a court order against you, we may restore the material. A knowing material misrepresentation in a counter-notice carries the same liability under 17 U.S.C. &sect; 512(f).</p>
      <h2>Repeat Infringers</h2>
      <p>RevaultAI maintains a repeat infringer policy. Every takedown notice is recorded against the account that posted the material. An account that accumulates repeated valid notices is terminated, its films are removed from the gallery, and the account holder is barred from creating a new one. We may also terminate an account on a single notice where the infringement is flagrant.</p>
      <h2>A Note on AI-Generated Work</h2>
      <p>Every film on RevaultAI is AI-generated, which does not place it outside copyright law. Submitting work that reproduces someone else's footage, score, screenplay, characters or likeness, or a model output built to imitate a specific protected work closely enough to substitute for it, violates our <a href="/terms" style="color: var(--accent);">Terms of Service</a> whether or not a notice is ever filed. If you are not certain you hold the rights to what you made, do not publish it here.</p>
    `
  },
  "ai-disclaimer": {
    title: "AI Content Disclaimer",
    updated: "October 2026",
    body: `
      <h2>Everything here is AI-generated</h2>
      <p>RevaultAI is a gallery of films made with generative AI. Every film was produced, in whole or in substantial part, by AI models. None of it is documentary footage and none of it is a record of something that happened. If something resembles a real event, a real place or a real person, treat it as fiction unless the creator says otherwise.</p>

      <h2>The models we run</h2>
      <p>Generation happens on third-party models reached through fal.ai &mdash; currently Google Veo 3.1 and Kling for video, ByteDance Seedream and Nano Banana for images &mdash; plus World Labs Marble for generated sets, and Anthropic&rsquo;s Claude models for the writing and planning tools. This list changes as models ship and as we add or drop providers. Our planning tools can also write prompts aimed at models we do not run, such as Runway, Wan, Hailuo and Seedance, which you would run elsewhere. The full list of processors is in our <a href="/privacy" style="color: var(--accent);">Privacy Policy</a>.</p>

      <h2>We do not control what the models produce</h2>
      <p>We pass your prompt to a provider and return what comes back. We cannot guarantee that output will be accurate, original, consistent with your prompt, free of artifacts, or free of resemblance to existing work or to real people. Models can and do produce content that is wrong, strange, or unintentionally similar to something that already exists. The same prompt may give different output on different runs, and providers change their models without notice, which changes what the same prompt produces.</p>

      <h2>Ownership and copyright are unsettled</h2>
      <p>Copyright in purely AI-generated material is unsettled in the United States and elsewhere. The U.S. Copyright Office has taken the position that material generated without sufficient human authorship is not registrable. What that means for any particular film depends on how much human direction, editing and arrangement went into it.</p>
      <p>We make no representation about whether you own, or can register copyright in, the output of a generation job. Your rights in output are also governed by the terms of the provider that produced it. If ownership matters for your use &mdash; commercial release, licensing, festival submission &mdash; get advice specific to your situation.</p>

      <h2>Likeness, names and real people</h2>
      <p>Do not use RevaultAI to create a recognizable likeness of a real person without their consent, and do not present AI-generated footage of a real person as something they actually did or said. Rights of publicity and privacy apply to synthetic media, and in California they are enforced. Our <a href="/terms" style="color: var(--accent);">Terms of Service</a> prohibit this and we remove content that breaks the rule.</p>

      <h2>No endorsement</h2>
      <p>A model being available on RevaultAI is not an endorsement of that model, the company behind it, or anything made with it. Curation reflects our judgment about films, not about tools.</p>

      <h2>Content advisories</h2>
      <p>Films in the gallery are curated but may contain unsettling imagery, stylized violence or mature themes. Where a creator has flagged content we surface that flag. Curation is human judgment, not certification.</p>

      <h2>If something here infringes your work</h2>
      <p>We respond to copyright complaints under the DMCA. Our <a href="/dmca" style="color: var(--accent);">DMCA Policy</a> explains how to send a notice, names our designated agent, and describes the counter-notice process.</p>

      <h2>Disclosure when you publish elsewhere</h2>
      <p>If you publish a film made here to a platform that requires AI-disclosure labeling &mdash; several major ones now do &mdash; applying that label is your responsibility. We do not apply it for you and we do not embed provenance metadata in downloads at this time.</p>
    `
  },
};
