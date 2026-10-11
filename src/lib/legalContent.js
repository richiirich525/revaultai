// Legal page copy, shared by App.jsx (LegalPage) and scripts/prerender.js.
// Keeping it here means the crawler-facing static page and the rendered page
// can never drift apart — which for a privacy policy or terms actually matters.

export const LEGAL_CONTENT = {
  terms: {
    title: "Terms of Service",
    updated: "October 2026",
    body: `
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using RevaultAI, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. RevaultAI is operated by RevaultAI LLC.</p>
      <h2>2. Platform Use</h2>
      <p>RevaultAI is a platform for sharing AI-generated creative content. You must be at least 18 years old to create an account or make purchases. You are responsible for all activity under your account.</p>
      <h2>3. Content Submissions</h2>
      <p>By submitting content to RevaultAI, you represent that you own it or hold all rights necessary to share it, and that it does not infringe the copyright, trademark, privacy or publicity rights of anyone else. You grant RevaultAI a non-exclusive license to host, display and promote it on the platform. You retain ownership of your original prompts and creative work.</p>
      <h2>4. Premium Purchases</h2>
      <p>Premium purchases are processed via Stripe. All sales are subject to our Refund Policy. RevaultAI reserves the right to revoke access to content that violates these terms.</p>
      <h2>5. Prohibited Content</h2>
      <p>You may not submit content that is illegal, harmful, deceptive, or violates the rights of others. RevaultAI reserves the right to remove any content and terminate any account at its discretion.</p>
      <h2>6. Copyright and DMCA</h2>
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
      <h2>7. Disclaimers</h2>
      <p>RevaultAI is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the platform.</p>
      <h2>8. Changes to Terms</h2>
      <p>We may update these terms at any time. Continued use of RevaultAI after changes constitutes acceptance of the new terms.</p>
      <h2>9. Contact</h2>
      <p>For questions about these terms, contact us at rich@revaultai.com. For copyright notices, use the agent address in section 6.</p>
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
    updated: "May 2025",
    body: `
      <h2>Digital Content Policy</h2>
      <p>All purchases on RevaultAI are for digital content (AI-generated prompts and creative works). Due to the nature of digital goods, all sales are final once the content has been accessed.</p>
      <h2>Eligible Refunds</h2>
      <p>We will issue a full refund if: the content was not delivered due to a technical error on our end, or the content significantly differs from what was described.</p>
      <h2>How to Request a Refund</h2>
      <p>Contact us at rich@revaultai.com within 7 days of purchase with your order details. We review all requests within 3 business days.</p>
      <h2>Chargebacks</h2>
      <p>Filing a chargeback without contacting us first may result in account suspension. We encourage you to reach out directly — we want to make things right.</p>
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
    updated: "May 2025",
    body: `
      <h2>Nature of Content</h2>
      <p>All content on RevaultAI is generated using artificial intelligence tools including but not limited to Sora, Runway, MidJourney, Kling, and Stable Diffusion. This content is synthetic and does not depict real events, real people, or factual information unless explicitly stated.</p>
      <h2>No Endorsement</h2>
      <p>The presence of AI-generated content on RevaultAI does not constitute endorsement of any particular AI tool, company, or viewpoint.</p>
      <h2>Prompt Ownership</h2>
      <p>Creators retain ownership of their original prompts. The AI-generated outputs may be subject to the terms of the respective AI platforms used to create them.</p>
      <h2>Accuracy and Reliability</h2>
      <p>AI-generated content may contain inaccuracies, artifacts, or unintended outputs. RevaultAI does not guarantee the accuracy or appropriateness of any AI-generated content.</p>
      <h2>Responsible Use</h2>
      <p>Users are expected to use AI tools responsibly and in accordance with each platform's terms of service. Content that depicts real individuals without consent, or that is harmful or deceptive, is prohibited on RevaultAI.</p>
    `
  },
};
