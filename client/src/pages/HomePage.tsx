import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoneyCompact } from "@/components/price-display";
import { appConfig, routes } from "@/config/app-config";
import hero from "@/content/homepage-hero.json";
import categoriesContent from "@/content/homepage-categories.json";
import featuredContent from "@/content/homepage-featured.json";
import { categoriesApi, productsApi } from "@/api/catalogue";
import { useAsync } from "@/hooks/use-async";
import { FeaturedProductCard } from "@/features/home/FeaturedProductCard";
import { HeroCollage } from "@/features/home/HeroCollage";
import { cn } from "@/lib/utils";
import { sectionAppearance } from "@/lib/section-appearance";

/**
 * The landing page.
 *
 * Each major section owns a small JSON document. The editor can therefore
 * rewrite copy or pick a declared layout without asking a model to rewrite
 * this component. Runtime facts such as the delivery threshold still come
 * from `appConfig`, so they cannot drift from the server's behaviour.
 */
export default function HomePage() {
  const { data: featured, loading } = useAsync(() => productsApi.featured(), []);
  const { data: categories } = useAsync(() => categoriesApi.list(), []);
  const isCompactHero = hero.variant === "compact";
  // The compact layout owns its short geometry. Persisted spacing and heading
  // size describe the full-height layouts, so they must not stretch the band
  // back out; background, colour, alignment and visibility still apply.
  const heroAppearance = sectionAppearance(
    isCompactHero ? { ...hero.appearance, spacing: "py-8", textSize: "text-3xl" } : hero.appearance,
  );
  // The supporting paragraph is section content so a section rewrite can change
  // it. The default content leaves it out on purpose (no build step writes
  // section content, and a fixed default would replace every project's own
  // description), as does content written before 1.1.2. The brand description
  // stands in until an edit writes the field. An assertion rather than an
  // annotation: with no property in common, the annotation fails TS2559.
  const heroCopy = hero as { description?: string };
  const heroDescription = heroCopy.description?.trim() || appConfig.description;
  return (
    <>
      <section data-builder-id="homepage.hero" data-section="homepage.hero" className={cn("border-b", heroAppearance.root)}>
        {isCompactHero ? (
          <div className="container">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="max-w-2xl">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                  {hero.eyebrow}
                </p>
                <h1 className={cn("mt-2 text-2xl leading-tight font-medium tracking-tight text-balance sm:text-3xl", heroAppearance.heading)}>
                  {hero.headline}
                </h1>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <Button asChild className="rounded-sm px-5">
                  <Link to={hero.primaryAction.to}>{hero.primaryAction.label}</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-sm px-5">
                  <Link to={hero.secondaryAction.to}>{hero.secondaryAction.label}</Link>
                </Button>
              </div>
            </div>

            {/* Titles only: the full reassurance text belongs to the taller layouts. */}
            <ul className="text-muted-foreground mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-[13px]">
              {hero.assurances.map((item) => (
                <li key={item.id}>{item.title}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={cn(
            "container grid gap-12 py-14 lg:gap-16 lg:py-24",
            hero.variant === "centered" ? "text-center" : "lg:grid-cols-12",
          )}>
            <div className={cn(
              "lg:self-center",
              hero.variant === "centered" ? "mx-auto max-w-3xl" : hero.variant === "editorial" ? "lg:col-span-7" : "lg:col-span-6",
            )}>
              <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                {hero.eyebrow}
              </p>
  
              <h1 className={cn("mt-5 max-w-xl text-4xl leading-[1.06] font-medium tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]", heroAppearance.heading)}>
                {hero.headline}
              </h1>
  
              <p className="text-muted-foreground mt-6 max-w-md text-lg leading-relaxed">
                {heroDescription}
              </p>
  
              <div className={cn("mt-9 flex flex-wrap gap-3", hero.variant === "centered" && "justify-center")}>
                <Button asChild size="lg" className="rounded-sm px-6">
                  <Link to={hero.primaryAction.to}>{hero.primaryAction.label}</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="rounded-sm px-6">
                  <Link to={hero.secondaryAction.to}>{hero.secondaryAction.label}</Link>
                </Button>
              </div>
  
              {/* Reassurance as a quiet strip rather than a row of icon cards. */}
              <dl className="mt-12 grid gap-x-8 gap-y-5 border-t pt-8 sm:grid-cols-3">
                {hero.assurances.map((item) => (
                  <div key={item.id}>
                    <dt className="text-sm font-medium">{item.title}</dt>
                    <dd className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
                      {item.text.replace("{amount}", formatMoneyCompact(appConfig.freeDeliveryOver))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
  
            <div className={cn(
              hero.variant === "centered" ? "mx-auto w-full max-w-3xl" : hero.variant === "editorial" ? "lg:col-span-5" : "lg:col-span-6",
            )}>
              {loading ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Skeleton className="mt-8 aspect-[4/5] rounded-sm sm:mt-14" />
                  <Skeleton className="aspect-square rounded-sm" />
                </div>
              ) : (
                <HeroCollage products={featured ?? []} />
              )}
            </div>
          </div>
        )}
      </section>

      {categories && categories.length > 0 && (
        <section data-section="homepage.categories" className={cn("container py-16 lg:py-20", sectionAppearance(categoriesContent.appearance).root)}>
          <SectionHeading title={categoriesContent.heading} lead={categoriesContent.lead} headingClassName={sectionAppearance(categoriesContent.appearance).heading} />
          <div className={cn(
            "mt-8 grid gap-px overflow-hidden rounded-sm border sm:grid-cols-2",
            categoriesContent.variant === "list" ? "lg:grid-cols-2" : categoriesContent.variant === "compact" ? "lg:grid-cols-3" : "lg:grid-cols-4",
          )}>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={routes.category(category.slug)}
                className="bg-card hover:bg-secondary group -m-px border p-6 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">{category.name}</h3>
                  <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
                {category.description && (
                  <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                    {category.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section data-section="homepage.featured" className={cn("container pb-20 lg:pb-28", sectionAppearance(featuredContent.appearance).root)}>
        <SectionHeading
          title={featuredContent.heading}
          lead={featuredContent.lead}
          headingClassName={sectionAppearance(featuredContent.appearance).heading}
          action={
            <Button asChild variant="link" className="h-auto p-0">
              <Link to={featuredContent.action.to}>
                {featuredContent.action.label} <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />

        <div className={cn(
          "mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2",
          featuredContent.variant === "list" ? "lg:grid-cols-2" : featuredContent.variant === "spotlight" ? "lg:grid-cols-3" : "lg:grid-cols-4",
        )}>
          {loading
            ? [0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-72 rounded-sm" />)
            : featured?.map((product) => <FeaturedProductCard key={product.id} product={product} />)}
        </div>

        {!loading && featured?.length === 0 && (
          <p className="text-muted-foreground border-t pt-8 text-sm">
            {featuredContent.emptyMessage}
          </p>
        )}
      </section>
    </>
  );
}

/** Left-aligned heading with a hairline rule — the page's one section rhythm. */
function SectionHeading({
  title,
  lead,
  action,
  headingClassName,
}: {
  title: string;
  lead?: string;
  action?: React.ReactNode;
  headingClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      <div>
        <h2 className={cn("text-xl font-medium tracking-tight sm:text-2xl", headingClassName)}>{title}</h2>
        {lead && <p className="text-muted-foreground mt-1.5 text-sm">{lead}</p>}
      </div>
      {action}
    </div>
  );
}
