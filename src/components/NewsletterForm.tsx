'use client';

import Link from 'next/link';

// Point this form at your email provider (Buttondown, Mailchimp, ConvertKit…).
export function NewsletterForm() {
  return (
    <form className="newsletter-form" action="#" method="post" onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label htmlFor="nl-email">Email address</label>
        <input id="nl-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </div>
      <button type="submit" className="btn btn-primary">
        Subscribe
      </button>
      <p className="fine">
        We only use your email for the newsletter. See our <Link href="/privacy">Privacy policy</Link>.
      </p>
    </form>
  );
}
