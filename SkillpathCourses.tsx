import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

const API_BASE_URL = "https://syncsphere-hiv6.onrender.com"

type Course = {
    courseName: string
    courseCode: string
    description: string
    mainCategory: string
    courseType: string
    pricePaise: number
    priceUsdCents: number
    refundable: boolean
}

type CountryCode = "IN" | "US"

type LoadState = "loading" | "error" | "ready"

type SortBy = "default" | "low" | "high"

type SkillpathCoursesProps = {
    heading: string
    accentColor: string
}

const DEFAULT_INTRO =
    "Practical, expert-led courses built for the work you want to do next."

// Each category gets its own hue so the grid reads as a colourful set rather
// than one repeated card. Unknown categories fall back to the brand accent.
const CATEGORY_HUES: Record<string, [string, string]> = {
    "Content Creation": ["#F0407F", "#FF7A4D"],
    "Social Media": ["#3B6BF5", "#26A5F5"],
    Audio: ["#0FA3A3", "#39C98A"],
    Business: ["#7A45F0", "#B34DF0"],
    Productivity: ["#E0761A", "#F2B23C"],
    Marketing: ["#D33A6A", "#F2646E"],
    "Video Editing": ["#2C7CE8", "#5FD0E8"],
}

function huesFor(category: string): [string, string] {
    return CATEGORY_HUES[category] ?? ["#5B3DF5", "#8B6BFF"]
}

function formatPrice(course: Course, country: CountryCode | null) {
    if (country === "IN") {
        // The API sends paise, so divide by 100 before formatting rupees.
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(course.pricePaise / 100)
    }

    if (country === "US") {
        // The API sends cents, so divide by 100 before formatting dollars.
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(course.priceUsdCents / 100)
    }

    return "Price unavailable"
}

export default function SkillpathCourses({
    heading,
    accentColor,
}: SkillpathCoursesProps) {
    const [courses, setCourses] = React.useState<Course[]>([])
    const [country, setCountry] = React.useState<CountryCode | null>(null)
    const [state, setState] = React.useState<LoadState>("loading")
    const [countryError, setCountryError] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [sortBy, setSortBy] = React.useState<SortBy>("default")
    const [reloadKey, setReloadKey] = React.useState(0)

    React.useEffect(() => {
        const controller = new AbortController()

        async function loadCourses() {
            setState("loading")
            setCountryError(false)

            const [coursesResult, countryResult] = await Promise.allSettled([
                fetch(`${API_BASE_URL}/assignment/course-data`, {
                    method: "GET",
                    signal: controller.signal,
                }).then(async (response) => {
                    if (!response.ok) throw new Error("Could not load courses")
                    const data = await response.json()
                    if (!Array.isArray(data)) throw new Error("Invalid course data")
                    return data as Course[]
                }),
                fetch(`${API_BASE_URL}/assignment/country-code`, {
                    method: "GET",
                    signal: controller.signal,
                }).then(async (response) => {
                    if (!response.ok) throw new Error("Could not load country")
                    const data = await response.json()
                    if (data.country_code !== "IN" && data.country_code !== "US") {
                        throw new Error("Invalid country data")
                    }
                    return data.country_code as CountryCode
                }),
            ])

            if (controller.signal.aborted) return

            // Courses are essential. Country is not: show useful cards without guessing currency.
            if (coursesResult.status === "rejected") {
                setState("error")
                return
            }

            setCourses(coursesResult.value)
            if (countryResult.status === "fulfilled") {
                setCountry(countryResult.value)
            } else {
                setCountry(null)
                setCountryError(true)
            }
            setState("ready")
        }

        loadCourses()
        return () => controller.abort()
    }, [reloadKey])

    const visibleCourses = React.useMemo(() => {
        const matching = courses.filter((course) =>
            `${course.courseName} ${course.mainCategory}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())
        )

        if (sortBy === "default") return matching

        // Sort by whichever currency is on screen so the order matches the prices shown.
        const priceKey = country === "IN" ? "pricePaise" : "priceUsdCents"
        return [...matching].sort((a, b) =>
            sortBy === "low" ? a[priceKey] - b[priceKey] : b[priceKey] - a[priceKey]
        )
    }, [courses, country, query, sortBy])

    const retry = () => setReloadKey((value) => value + 1)

    const scrollToCourses = () => {
        document
            .getElementById("skillpath-courses-grid")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    // A cheap credibility signal in the hero: the entry price across the catalogue.
    const lowestPrice = React.useMemo(() => {
        if (!courses.length || !country) return null
        const key = country === "IN" ? "pricePaise" : "priceUsdCents"
        const cheapest = courses.reduce((low, c) => (c[key] < low[key] ? c : low))
        return formatPrice(cheapest, country)
    }, [courses, country])

    // Announced to screen readers so filtering has an audible result, not just a visual one.
    const resultSummary =
        state !== "ready"
            ? ""
            : `${visibleCourses.length} ${
                  visibleCourses.length === 1 ? "course" : "courses"
              }${query.trim() ? ` matching ${query.trim()}` : ""}`

    return (
        <section
            className="skillpath"
            style={{ "--skillpath-accent": accentColor } as React.CSSProperties}
            aria-labelledby="skillpath-heading"
        >
            <style>{css}</style>

            <div className="skillpath-hero">
                <div className="skillpath-hero-glow" aria-hidden="true" />
                <div className="skillpath-hero-grain" aria-hidden="true" />
                <div className="skillpath-hero-inner">
                    <p className="skillpath-eyebrow">
                        <span className="skillpath-dot" aria-hidden="true" />
                        Explore Skillpath
                    </p>
                    <h2 id="skillpath-heading">{heading}</h2>
                    <p className="skillpath-intro">{DEFAULT_INTRO}</p>
                    <button
                        type="button"
                        className="skillpath-hero-button"
                        onClick={scrollToCourses}
                    >
                        Browse courses
                        <span aria-hidden="true">→</span>
                    </button>

                    {state === "ready" && courses.length > 0 && (
                        <div className="skillpath-stats">
                            <span>
                                <strong>{courses.length}</strong> courses
                            </span>
                            <i aria-hidden="true" />
                            <span>
                                {lowestPrice ? (
                                    <>
                                        from <strong>{lowestPrice}</strong>
                                    </>
                                ) : (
                                    "All levels"
                                )}
                            </span>
                            <i aria-hidden="true" />
                            <span>Lifetime access</span>
                        </div>
                    )}
                </div>
            </div>

            {state === "ready" && courses.length > 0 && (
                <div className="skillpath-toolbar">
                    <p className="skillpath-toolbar-label">
                        {visibleCourses.length}{" "}
                        {visibleCourses.length === 1 ? "course" : "courses"}
                        {query.trim() ? ` for “${query.trim()}”` : ""}
                    </p>
                    <div className="skillpath-toolbar-fields">
                    <div className="skillpath-field">
                        <svg
                            className="skillpath-search-icon"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <circle
                                cx="9"
                                cy="9"
                                r="5.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            />
                            <path
                                d="M13.2 13.2 17 17"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>
                        <input
                            type="search"
                            aria-label="Search courses"
                            placeholder="Search courses"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </div>
                    <div className="skillpath-field skillpath-field-select">
                        <select
                            aria-label="Sort courses by price"
                            value={sortBy}
                            onChange={(event) =>
                                setSortBy(event.target.value as SortBy)
                            }
                        >
                            <option value="default">Featured</option>
                            <option value="low">Price: low to high</option>
                            <option value="high">Price: high to low</option>
                        </select>
                        <svg
                            className="skillpath-chevron"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path
                                d="m6 8 4 4 4-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    </div>
                </div>
            )}

            <p className="skillpath-sr-only" role="status" aria-live="polite">
                {resultSummary}
            </p>

            {countryError && (
                <div className="skillpath-notice" role="status">
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                        <path
                            d="M10 6.5v4.2M10 13.6v.2"
                            stroke="currentColor"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                        />
                        <circle
                            cx="10"
                            cy="10"
                            r="7.4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                        />
                    </svg>
                    <span>
                        Courses loaded, but pricing for your region is unavailable
                        right now.
                    </span>
                    <button type="button" onClick={retry}>
                        Retry
                    </button>
                </div>
            )}

            {state === "loading" && (
                <div className="skillpath-grid" id="skillpath-courses-grid">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div
                            className="skillpath-card skillpath-skeleton"
                            key={index}
                            aria-hidden="true"
                        >
                            <span className="sk-line sk-eyebrow" />
                            <span className="sk-line sk-title" />
                            <span className="sk-line sk-title sk-title-short" />
                            <span className="sk-line sk-text" />
                            <span className="sk-line sk-text sk-text-short" />
                            <span className="sk-foot">
                                <span className="sk-line sk-type" />
                                <span className="sk-line sk-price" />
                            </span>
                        </div>
                    ))}
                    <p className="skillpath-sr-only">Loading courses</p>
                </div>
            )}

            {state === "error" && (
                <div className="skillpath-state">
                    <div className="skillpath-state-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path
                                d="M12 8v5M12 16.2v.2"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                            <circle
                                cx="12"
                                cy="12"
                                r="9"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                            />
                        </svg>
                    </div>
                    <h3>We couldn&rsquo;t load the courses</h3>
                    <p>
                        The course service didn&rsquo;t respond. It&rsquo;s usually
                        back within a few seconds.
                    </p>
                    <button
                        type="button"
                        className="skillpath-button"
                        onClick={retry}
                    >
                        Try again
                    </button>
                </div>
            )}

            {state === "ready" && courses.length === 0 && (
                <div className="skillpath-state">
                    <h3>No courses available yet</h3>
                    <p>New courses are added regularly. Please check back soon.</p>
                    <button
                        type="button"
                        className="skillpath-button"
                        onClick={retry}
                    >
                        Refresh
                    </button>
                </div>
            )}

            {state === "ready" &&
                courses.length > 0 &&
                visibleCourses.length === 0 && (
                    <div className="skillpath-state">
                        <h3>No courses match &ldquo;{query.trim()}&rdquo;</h3>
                        <p>Try a different word, or browse everything on offer.</p>
                        <button
                            type="button"
                            className="skillpath-button"
                            onClick={() => setQuery("")}
                        >
                            Clear search
                        </button>
                    </div>
                )}

            {state === "ready" && visibleCourses.length > 0 && (
                <ul className="skillpath-grid" id="skillpath-courses-grid">
                    {visibleCourses.map((course) => {
                        const [from, to] = huesFor(course.mainCategory)
                        return (
                        <li
                            className="skillpath-card"
                            key={course.courseCode}
                            style={{ "--c-from": from, "--c-to": to } as React.CSSProperties}
                        >
                            <span className="skillpath-card-rail" aria-hidden="true" />
                            <div className="skillpath-card-top">
                                <span className="skillpath-category">
                                    {course.mainCategory}
                                </span>
                                {course.refundable && (
                                    <span className="skillpath-badge">
                                        <svg viewBox="0 0 16 16" aria-hidden="true">
                                            <path
                                                d="m3.6 8.4 2.9 2.9 5.9-6"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        Refundable
                                    </span>
                                )}
                            </div>
                            <h3>{course.courseName}</h3>
                            <p className="skillpath-description">
                                {course.description}
                            </p>
                            <div className="skillpath-card-footer">
                                <span className="skillpath-type">
                                    {course.courseType}
                                </span>
                                <strong className="skillpath-price">
                                    {formatPrice(course, country)}
                                </strong>
                            </div>
                        </li>
                        )
                    })}
                </ul>
            )}
            <footer className="skillpath-footer">
                <nav aria-label="Skillpath footer">
                    <a href="#skillpath-courses-grid">Courses</a>
                    <a href="#skillpath-support">Support</a>
                    <a href="#skillpath-privacy">Privacy</a>
                </nav>
                <span>© {new Date().getFullYear()} Skillpath. All rights reserved.</span>
            </footer>
        </section>
    )
}

addPropertyControls(SkillpathCourses, {
    heading: {
        type: ControlType.String,
        title: "Heading",
        defaultValue: "Find your next skill",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#5B3DF5",
    },
})

const css = `
.skillpath {
    --sp-ink: #14121C;
    --sp-body: #57536B;
    --sp-muted: #7A7690;
    --sp-line: #E7E4EE;
    --sp-surface: #FFFFFF;
    --sp-radius: 20px;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: var(--sp-ink);
    max-width: 1180px;
    margin: 0 auto;
    padding: clamp(20px, 3vw, 36px);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
}

.skillpath *, .skillpath *::before, .skillpath *::after { box-sizing: border-box; }

.skillpath-sr-only {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ---------- hero ---------- */
.skillpath-hero {
    position: relative;
    overflow: hidden;
    border-radius: 26px;
    padding: clamp(34px, 4.4vw, 56px) clamp(26px, 4vw, 52px);
    margin-bottom: clamp(20px, 3vw, 30px);
    background:
        radial-gradient(120% 150% at 8% 0%, #6E3DF6 0%, transparent 55%),
        radial-gradient(110% 140% at 96% 8%, #C13BC6 0%, transparent 52%),
        linear-gradient(126deg, #3A1E9E 0%, #24136B 46%, #150C40 100%);
    color: #fff;
    isolation: isolate;
}
.skillpath-hero-glow {
    position: absolute; z-index: 0;
    width: 480px; height: 480px; right: -130px; top: -230px;
    background: radial-gradient(circle, rgba(255,138,205,.5), transparent 62%);
    filter: blur(14px);
    pointer-events: none;
}
/* Subtle texture stops the large gradient from banding on wide screens. */
.skillpath-hero-grain {
    position: absolute; inset: 0; z-index: 0; opacity: .3;
    background-image: radial-gradient(rgba(255,255,255,.16) .6px, transparent .6px);
    background-size: 4px 4px;
    -webkit-mask-image: linear-gradient(160deg, #000, transparent 72%);
    mask-image: linear-gradient(160deg, #000, transparent 72%);
    pointer-events: none;
}
.skillpath-hero-inner { position: relative; z-index: 1; max-width: 40ch; }
.skillpath-eyebrow {
    display: inline-flex; align-items: center; gap: 9px;
    margin: 0 0 18px; padding: 7px 14px 7px 11px;
    border-radius: 999px;
    background: rgba(255,255,255,.13);
    border: 1px solid rgba(255,255,255,.2);
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
    font-size: 11.5px; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: #F3EDFF;
}
.skillpath-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #6EF2C0;
    box-shadow: 0 0 0 4px rgba(110,242,192,.22);
}
.skillpath h2 {
    margin: 0;
    font-size: clamp(38px, 5.6vw, 68px);
    line-height: 1.02;
    letter-spacing: -0.045em;
    font-weight: 650;
    text-wrap: balance;
}
.skillpath-intro {
    margin: 18px 0 0;
    font-size: clamp(15.5px, 1.35vw, 18px);
    line-height: 1.58;
    color: rgba(255,255,255,.78);
    text-wrap: pretty;
}
.skillpath-stats {
    display: flex; align-items: center; flex-wrap: wrap; gap: 12px;
    margin-top: 28px;
    font-size: 14px; color: rgba(255,255,255,.72);
}
.skillpath-stats strong { color: #fff; font-weight: 650; }
.skillpath-stats i {
    width: 4px; height: 4px; border-radius: 50%;
    background: rgba(255,255,255,.32);
}
.skillpath-hero-button {
    display: inline-flex; align-items: center; gap: 10px;
    margin-top: 26px; padding: 13px 18px;
    border: 1px solid rgba(255,255,255,.32); border-radius: 11px;
    color: #29146F; background: #fff; cursor: pointer;
    font: inherit; font-size: 14.5px; font-weight: 700;
    transition: transform .16s ease, background .16s ease;
}
.skillpath-hero-button:hover { transform: translateY(-1px); background: #F5F0FF; }
.skillpath-hero-button:focus-visible {
    outline: 2px solid #fff; outline-offset: 3px;
}
.skillpath-hero-button span { font-size: 18px; line-height: .8; }

/* ---------- toolbar ---------- */
.skillpath-toolbar {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-bottom: 16px;
}
.skillpath-toolbar-label {
    font-size: 14px; font-weight: 600; color: var(--sp-body);
}
.skillpath-toolbar-fields { display: flex; gap: 10px; }
.skillpath-field { position: relative; display: flex; align-items: center; }
.skillpath-field input, .skillpath-field select {
    font: inherit; font-size: 14px;
    color: var(--sp-ink);
    background: var(--sp-surface);
    border: 1px solid var(--sp-line);
    border-radius: 12px;
    padding: 11px 14px 11px 38px;
    height: 46px;
    outline: none;
    box-shadow: 0 1px 2px rgba(20,18,28,.04);
    transition: border-color .18s ease, box-shadow .18s ease;
}
.skillpath-field select {
    padding: 11px 36px 11px 15px;
    appearance: none; -webkit-appearance: none;
    cursor: pointer; font-weight: 500;
}
.skillpath-field input { width: 210px; }
.skillpath-field input::placeholder { color: var(--sp-muted); }
.skillpath-field input:focus-visible, .skillpath-field select:focus-visible {
    border-color: var(--skillpath-accent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--skillpath-accent) 18%, transparent);
}
.skillpath-field input:hover, .skillpath-field select:hover { border-color: #D3CDDF; }
.skillpath-search-icon, .skillpath-chevron {
    position: absolute; width: 17px; height: 17px;
    color: var(--sp-muted); pointer-events: none;
}
.skillpath-search-icon { left: 13px; }
.skillpath-chevron { right: 12px; }

/* ---------- notice ---------- */
.skillpath-notice {
    display: flex; align-items: center; gap: 10px;
    margin: 0 0 18px; padding: 14px 16px;
    border: 1px solid #F3E1BC;
    background: linear-gradient(180deg, #FFFCF4, #FEF7E9);
    border-radius: 14px;
    color: #7A5806;
    font-size: 14.5px; line-height: 1.45;
}
.skillpath-notice svg { width: 18px; height: 18px; flex-shrink: 0; }
.skillpath-notice span { flex: 1; }
.skillpath-notice button {
    font: inherit; font-weight: 600; font-size: 14px;
    color: #7A5806; background: #fff;
    border: 1px solid #E2CB98; border-radius: 9px;
    padding: 7px 13px; cursor: pointer; flex-shrink: 0;
    transition: background .16s ease;
}
.skillpath-notice button:hover { background: #FBF3E2; }
.skillpath-notice button:focus-visible { outline: 2px solid #7A5806; outline-offset: 2px; }

/* ---------- grid + cards ---------- */
.skillpath-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    list-style: none; margin: 0; padding: 0;
}
.skillpath-card {
    position: relative; overflow: hidden;
    display: flex; flex-direction: column;
    min-height: 264px;
    padding: 26px 24px 24px;
    background: var(--sp-surface);
    border: 1px solid var(--sp-line);
    border-radius: var(--sp-radius);
    box-shadow: 0 1px 2px rgba(20,18,28,.04);
    transition: transform .24s cubic-bezier(.22,.7,.3,1),
                box-shadow .24s ease, border-color .24s ease;
}
/* Colour rail keyed to the course category. */
.skillpath-card-rail {
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, var(--c-from), var(--c-to));
}
/* A faint wash of the same hue so the whole card reads as coloured. */
.skillpath-card::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(170deg,
        color-mix(in srgb, var(--c-from) 9%, transparent), transparent 46%);
}
.skillpath-card > * { position: relative; z-index: 1; }
.skillpath-card:hover {
    transform: translateY(-5px);
    border-color: color-mix(in srgb, var(--c-from) 34%, var(--sp-line));
    box-shadow: 0 20px 40px -16px color-mix(in srgb, var(--c-from) 40%, transparent),
                0 4px 10px -4px rgba(20,18,28,.08);
}
.skillpath-card-top {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    min-height: 24px; /* keeps titles aligned whether or not a badge is present */
}
.skillpath-category {
    font-size: 11.5px; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    background: linear-gradient(96deg, var(--c-from), var(--c-to));
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
}
.skillpath-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11.5px; font-weight: 600;
    color: #0F6145; background: #E9FAF2;
    border: 1px solid #C3EBD9;
    padding: 4px 9px 4px 7px; border-radius: 99px;
    white-space: nowrap;
}
.skillpath-badge svg { width: 12px; height: 12px; }
.skillpath-card h3 {
    margin: 20px 0 10px;
    font-size: 21px; font-weight: 600;
    line-height: 1.2; letter-spacing: -0.025em;
    text-wrap: balance;
}
.skillpath-description {
    margin: 0;
    font-size: 14.5px; line-height: 1.56;
    color: var(--sp-body);
    display: -webkit-box; -webkit-box-orient: vertical;
    -webkit-line-clamp: 2; overflow: hidden;
}
.skillpath-card-footer {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-top: auto; padding-top: 20px;
    border-top: 1px solid #F0EDF4;
}
.skillpath-description + .skillpath-card-footer { margin-top: 22px; }
.skillpath-type {
    font-size: 12px; font-weight: 600; color: var(--sp-body);
    background: #F5F3F9; border-radius: 7px; padding: 5px 10px;
}
.skillpath-price {
    font-size: 22px; font-weight: 700; letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    background: linear-gradient(96deg, var(--c-from), var(--c-to));
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* ---------- footer ---------- */
.skillpath-footer {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    margin-top: clamp(36px, 5vw, 58px); padding-top: 20px;
    border-top: 1px solid var(--sp-line); color: var(--sp-muted);
    font-size: 13px;
}
.skillpath-footer nav { display: flex; flex-wrap: wrap; gap: 18px; }
.skillpath-footer a {
    color: inherit; text-decoration: none; font-weight: 600;
}
.skillpath-footer a:hover { color: var(--skillpath-accent); }
.skillpath-footer a:focus-visible {
    outline: 2px solid var(--skillpath-accent); outline-offset: 3px; border-radius: 2px;
}

/* ---------- empty / error states ---------- */
.skillpath-state {
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
    padding: clamp(44px, 6vw, 60px) 24px;
    border: 1px solid var(--sp-line);
    border-radius: var(--sp-radius);
    background: linear-gradient(180deg, #fff, #FAF9FC);
}
.skillpath-state-icon {
    display: grid; place-items: center;
    width: 48px; height: 48px; margin-bottom: 18px;
    border-radius: 50%;
    background: #FCEDEC; color: #B4443C;
}
.skillpath-state-icon svg { width: 24px; height: 24px; }
.skillpath-state h3 {
    margin: 0 0 8px;
    font-size: 22px; font-weight: 600; letter-spacing: -0.022em;
}
.skillpath-state p {
    margin: 0 0 22px; max-width: 42ch;
    color: var(--sp-body); font-size: 15px; line-height: 1.55;
}
.skillpath-button {
    font: inherit; font-size: 14.5px; font-weight: 600;
    color: #fff;
    background: linear-gradient(96deg, #6E3DF6, #A93BD8);
    border: 0; border-radius: 11px;
    padding: 13px 22px; cursor: pointer;
    box-shadow: 0 8px 18px -8px rgba(110,61,246,.7);
    transition: filter .16s ease, transform .16s ease;
}
.skillpath-button:hover { filter: brightness(1.08); }
.skillpath-button:active { transform: translateY(1px); }
.skillpath-button:focus-visible {
    outline: 2px solid var(--skillpath-accent); outline-offset: 3px;
}

/* ---------- skeleton ---------- */
.skillpath-skeleton { gap: 0; pointer-events: none; }
.sk-line {
    display: block; border-radius: 6px;
    background: linear-gradient(90deg, #F1EFF5 25%, #F8F7FA 45%, #F1EFF5 65%);
    background-size: 300% 100%;
    animation: skillpath-shimmer 1.4s ease-in-out infinite;
}
.sk-eyebrow { width: 38%; height: 11px; }
.sk-title { height: 17px; margin-top: 22px; }
.sk-title-short { width: 55%; margin-top: 9px; }
.sk-text { height: 11px; margin-top: 16px; }
.sk-text-short { width: 72%; margin-top: 8px; }
.sk-foot {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: auto; padding-top: 20px; border-top: 1px solid #F4F2F7;
}
.sk-type { width: 68px; height: 12px; }
.sk-price { width: 58px; height: 17px; }
@keyframes skillpath-shimmer { to { background-position: -300% 0; } }

/* ---------- responsive ---------- */
@media (max-width: 940px) {
    .skillpath-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .skillpath-toolbar-fields { flex: 1; justify-content: flex-end; }
    .skillpath-toolbar-fields .skillpath-field:first-child { flex: 1; max-width: 320px; }
    .skillpath-field input { width: 100%; }
}
@media (max-width: 620px) {
    .skillpath-hero { border-radius: 22px; }
    .skillpath-grid { grid-template-columns: 1fr; }
    .skillpath-card { min-height: 0; }
    .skillpath-footer { flex-direction: column; align-items: flex-start; }
    .skillpath-toolbar { flex-direction: column; align-items: stretch; }
    .skillpath-toolbar-fields { flex-direction: column; }
    .skillpath-field select { width: 100%; }
    .skillpath-notice { flex-wrap: wrap; }
}

/* ---------- motion / contrast preferences ---------- */
@media (prefers-reduced-motion: reduce) {
    .skillpath *, .skillpath *::before, .skillpath *::after {
        animation-duration: .001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .001ms !important;
    }
    .skillpath-card:hover { transform: none; }
}
@media (prefers-contrast: more) {
    .skillpath { --sp-body: #38344A; --sp-muted: #47435A; --sp-line: #B9B4C6; }
}
`
