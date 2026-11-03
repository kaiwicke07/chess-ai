import type { Metadata } from "next"
import Link from "next/link"

import { LegalPage } from "@/components/layout/LegalPage"
import { site } from "@/lib/site"

export const metadata: Metadata = { title: "Terms of use" }

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro={
        <p>
          {site.name} is a free, open-source chess training tool. By using it you agree to these terms. If you
          don&apos;t agree, please don&apos;t use the site.
        </p>
      }
      sections={[
        {
          heading: "Free and open source",
          body: (
            <p>
              The site is free to use. Its source code is available at{" "}
              <a href={site.sourceUrl}>github.com/kaiwicke07/chess-ai</a> under the{" "}
              <a href="https://www.gnu.org/licenses/agpl-3.0.html">GNU Affero General Public License v3.0</a> or
              later. Third-party components keep their own licenses, listed on the{" "}
              <Link href="/about#credits">About page</Link>; the Stockfish chess engine is distributed under the GNU
              GPL v3.0 with its <a href="/stockfish/COPYING.txt">license text</a> and{" "}
              <a href={site.stockfishJsSource}>source</a>.
            </p>
          ),
        },
        {
          heading: "Not affiliated with Lichess or Chess.com",
          body: (
            <p>
              {site.name} is an independent project. It is{" "}
              <strong>not affiliated with, endorsed by or sponsored by Lichess or Chess.com</strong>. It only reads
              public game data through their public APIs. Lichess and Chess.com are trademarks of their respective
              owners, and their names are used here only to say where games come from.
            </p>
          ),
        },
        {
          heading: "Using the site",
          body: (
            <>
              <p>
                Games are fetched from public APIs, so their terms apply too: the{" "}
                <a href="https://lichess.org/terms-of-service">Lichess terms of service</a> and the{" "}
                <a href="https://www.chess.com/legal/user-agreement">Chess.com user agreement</a>. Please don&apos;t use
                the site in a way that overloads or abuses those services, for example by automating large numbers of
                lookups.
              </p>
              <p>
                Any public username can be looked up, just as on Lichess or Chess.com themselves. The results stay in
                your browser and aren&apos;t published anywhere.
              </p>
            </>
          ),
        },
        {
          heading: "Analysis is guidance, not truth",
          body: (
            <p>
              Move judgements, accuracy figures, explanations, puzzles and opening advice come from automated engine
              analysis at a limited depth. They can be wrong, and engine opinions about openings in particular are
              often debatable. Use them as training material, not as a final verdict.
            </p>
          ),
        },
        {
          heading: "Your data",
          body: (
            <p>
              Your data is stored only in your browser (see the <Link href="/privacy">privacy policy</Link>). You are
              responsible for keeping a backup if you want one; it can be lost if you clear your browser&apos;s site
              data, and it can&apos;t be recovered by anyone else.
            </p>
          ),
        },
        {
          heading: "No warranty",
          body: (
            <p>
              The site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind,
              express or implied, including fitness for a particular purpose and availability. To the extent the law
              allows, the people who make and run it aren&apos;t liable for any loss or damage arising from its use,
              including loss of data.
            </p>
          ),
        },
        {
          heading: "Changes and contact",
          body: (
            <p>
              These terms may change; the date at the top shows the latest version. Questions can be raised through the{" "}
              <a href={site.contactUrl}>project&apos;s issue tracker</a>.
            </p>
          ),
        },
      ]}
    />
  )
}
