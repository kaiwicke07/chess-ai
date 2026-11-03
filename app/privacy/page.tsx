import type { Metadata } from "next"
import Link from "next/link"

import { LegalPage } from "@/components/layout/LegalPage"
import { site } from "@/lib/site"

export const metadata: Metadata = { title: "Privacy policy" }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          {site.name} is built so that your data stays with you. There are no accounts, no cookies, no analytics and no
          tracking, and the people who run this site never receive your games or your practice history.
        </p>
      }
      sections={[
        {
          heading: "What is stored, and where",
          body: (
            <>
              <p>
                Everything the app keeps is stored <strong>only in your browser</strong>, in its local database
                (IndexedDB), on the device you use:
              </p>
              <ul>
                <li>the usernames you look up and the public games imported for them</li>
                <li>engine analysis of those games, and the puzzles and opening drills made from them</li>
                <li>your practice results and review schedule</li>
              </ul>
              <p>
                This storage is needed for the features you use, so the app doesn&apos;t ask for consent to it. You can
                export, restore or delete it at any time on the <Link href="/about#data">About page</Link>. Clearing
                this site&apos;s data in your browser also removes it.
              </p>
            </>
          ),
        },
        {
          heading: "Requests to other services",
          body: (
            <>
              <p>
                When you enter a username, <strong>your browser</strong> requests that account&apos;s public games
                directly from <a href="https://lichess.org/privacy">Lichess</a> (lichess.org) or{" "}
                <a href="https://www.chess.com/legal/privacy">Chess.com</a> (api.chess.com). Like any website you
                visit, those services receive your IP address and the request, and their own privacy policies apply.
                Nothing else is sent to them.
              </p>
              <p>
                The chess engine, fonts and all other files are served by this site itself; no third-party scripts,
                fonts or trackers are loaded.
              </p>
            </>
          ),
        },
        {
          heading: "Hosting",
          body: (
            <p>
              The site is hosted on <a href="https://vercel.com/legal/privacy-policy">Vercel</a>. As with any host,
              Vercel processes standard request information (such as IP address, browser type and the page requested)
              to deliver the site and keep it secure. This site doesn&apos;t add analytics or logging of its own.
            </p>
          ),
        },
        {
          heading: "What isn't done",
          body: (
            <ul>
              <li>No cookies are set and no advertising or analytics tools are used.</li>
              <li>No personal data is sold, shared or collected on a server.</li>
              <li>No account or email address is ever asked for.</li>
            </ul>
          ),
        },
        {
          heading: "Changes and contact",
          body: (
            <p>
              If this policy changes, the date at the top will change with it. Questions about privacy can be raised
              through the <a href={site.contactUrl}>project&apos;s issue tracker</a>.
            </p>
          ),
        },
      ]}
    />
  )
}
