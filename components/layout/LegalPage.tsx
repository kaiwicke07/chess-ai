import { site } from "@/lib/site"

/**
 * Shared layout for the privacy policy and terms: a readable column of
 * sections. Read mode, set like a printed page: prose held to about 70ch with
 * open leading, each section opened by a heavy ink rule, links in the action
 * color and always underlined (they sit in running text).
 */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string
  intro: React.ReactNode
  sections: { heading: string; body: React.ReactNode }[]
}) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-4">
        <h1 className="page-title">{title}</h1>
        <p className="font-mono text-xs text-muted-foreground">Last updated {site.legalUpdated}</p>
        <div className="max-w-[65ch] text-lg leading-relaxed text-pretty [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
          {intro}
        </div>
      </header>
      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-4 border-t border-border pt-4">
          <h2 className="section-title">{section.heading}</h2>
          <div className="flex max-w-[70ch] flex-col gap-3 leading-relaxed text-pretty [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:decoration-2 [&_li]:ml-5 [&_li]:list-[square] [&_li]:pl-1 [&_li::marker]:text-muted-foreground [&_strong]:font-semibold">
            {section.body}
          </div>
        </section>
      ))}
    </article>
  )
}
