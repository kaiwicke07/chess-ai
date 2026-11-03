import { site } from "@/lib/site"

/** Shared layout for the privacy policy and terms: a readable column of sections. */
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
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">Last updated {site.legalUpdated}</p>
        <div className="text-pretty text-muted-foreground">{intro}</div>
      </header>
      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{section.heading}</h2>
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground">
            {section.body}
          </div>
        </section>
      ))}
    </article>
  )
}
