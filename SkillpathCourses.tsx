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

type SkillpathCoursesProps = {
    heading: string
    accentColor: string
}

function formatPrice(course: Course, country: CountryCode | null) {
    if (country === "IN") {
        // The API sends paise, so divide by 100 before formatting rupees.
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
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
    const [sortBy, setSortBy] = React.useState<"default" | "low" | "high">(
        "default"
    )
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

        const priceKey = country === "IN" ? "pricePaise" : "priceUsdCents"
        return [...matching].sort((a, b) =>
            sortBy === "low" ? a[priceKey] - b[priceKey] : b[priceKey] - a[priceKey]
        )
    }, [courses, country, query, sortBy])

    const retry = () => setReloadKey((value) => value + 1)

    return (
        <section style={styles.section} aria-label="Courses">
            <style>{css}</style>
            <div style={styles.header}>
                <div>
                    <p style={{ ...styles.eyebrow, color: accentColor }}>Explore Skillpath</p>
                    <h2 style={styles.heading}>{heading}</h2>
                </div>
                {state === "ready" && courses.length > 0 && (
                    <div className="skillpath-controls">
                        <input
                            aria-label="Search courses"
                            placeholder="Search courses"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <select
                            aria-label="Sort courses by price"
                            value={sortBy}
                            onChange={(event) =>
                                setSortBy(event.target.value as "default" | "low" | "high")
                            }
                        >
                            <option value="default">Sort: Featured</option>
                            <option value="low">Price: Low to high</option>
                            <option value="high">Price: High to low</option>
                        </select>
                    </div>
                )}
            </div>

            {countryError && (
                <div className="skillpath-notice" role="status">
                    Courses are available, but prices could not be loaded. Please try again.
                    <button onClick={retry}>Retry</button>
                </div>
            )}

            {state === "loading" && (
                <div className="skillpath-grid" aria-label="Loading courses">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div className="skillpath-card skillpath-skeleton" key={index}>
                            <span />
                            <strong />
                            <i />
                            <i />
                            <b />
                        </div>
                    ))}
                </div>
            )}

            {state === "error" && (
                <div className="skillpath-state">
                    <h3>We couldn’t load the courses.</h3>
                    <p>The course service is having a moment. Try again in a few seconds.</p>
                    <button style={{ background: accentColor }} onClick={retry}>Retry courses</button>
                </div>
            )}

            {state === "ready" && courses.length === 0 && (
                <div className="skillpath-state">
                    <h3>No courses are available right now.</h3>
                    <p>Please check back shortly.</p>
                    <button style={{ background: accentColor }} onClick={retry}>Refresh</button>
                </div>
            )}

            {state === "ready" && courses.length > 0 && visibleCourses.length === 0 && (
                <div className="skillpath-state">
                    <h3>No courses match “{query}”.</h3>
                    <button style={{ background: accentColor }} onClick={() => setQuery("")}>Clear search</button>
                </div>
            )}

            {state === "ready" && visibleCourses.length > 0 && (
                <div className="skillpath-grid">
                    {visibleCourses.map((course) => (
                        <article className="skillpath-card" key={course.courseCode}>
                            <div className="skillpath-card-top">
                                <span className="skillpath-category" style={{ color: accentColor }}>
                                    {course.mainCategory}
                                </span>
                                {course.refundable && <span className="skillpath-badge">Refundable</span>}
                            </div>
                            <h3>{course.courseName}</h3>
                            <p className="skillpath-description">{course.description}</p>
                            <div className="skillpath-card-footer">
                                <span className="skillpath-type">{course.courseType}</span>
                                <strong>{formatPrice(course, country)}</strong>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    )
}

addPropertyControls(SkillpathCourses, {
    heading: { type: ControlType.String, title: "Heading", defaultValue: "Find your next skill" },
    accentColor: { type: ControlType.Color, title: "Accent", defaultValue: "#7C3AED" },
})

const styles: Record<string, React.CSSProperties> = {
    section: { fontFamily: "Inter, sans-serif", color: "#17151F", maxWidth: 1200, margin: "0 auto", padding: "80px 24px" },
    header: { display: "flex", alignItems: "end", justifyContent: "space-between", gap: 24, marginBottom: 28 },
    eyebrow: { fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" },
    heading: { fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.05, letterSpacing: "-0.05em", margin: 0 },
}

const css = `
    .skillpath-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
    .skillpath-card { min-height:238px; padding:24px; border:1px solid #e7e4ed; border-radius:18px; background:#fff; box-sizing:border-box; display:flex; flex-direction:column; box-shadow:0 2px 8px rgba(32,22,56,.03); }
    .skillpath-card-top,.skillpath-card-footer,.skillpath-controls { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .skillpath-category { font-size:13px; font-weight:700; }.skillpath-badge { font-size:12px; background:#ecfdf3; color:#167148; padding:5px 8px; border-radius:99px; font-weight:700; }
    .skillpath-card h3 { font-size:21px; line-height:1.2; letter-spacing:-.03em; margin:22px 0 10px; }.skillpath-description { font-size:14px; color:#625e6d; line-height:1.55; margin:0; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
    .skillpath-card-footer { margin-top:auto; padding-top:22px; }.skillpath-type { color:#625e6d; font-size:13px; }.skillpath-card-footer strong { font-size:20px; letter-spacing:-.02em; }
    .skillpath-controls input,.skillpath-controls select { font:inherit; font-size:14px; padding:11px 12px; border:1px solid #d8d3e0; border-radius:10px; background:#fff; color:#282330; }.skillpath-controls input { width:150px; }
    .skillpath-notice { margin:0 0 18px; padding:12px 14px; border-radius:10px; background:#fff8e8; color:#704e00; font-size:14px; }.skillpath-notice button { color:inherit; text-decoration:underline; padding:0; margin-left:8px; background:none; }
    .skillpath-state { text-align:center; padding:64px 20px; border:1px dashed #d8d3e0; border-radius:18px; }.skillpath-state h3 { margin:0 0 8px; font-size:22px; }.skillpath-state p { color:#625e6d; margin:0 0 20px; }.skillpath-state button { color:#fff; border:0; border-radius:10px; padding:11px 16px; font:inherit; font-weight:700; cursor:pointer; }
    .skillpath-skeleton { gap:16px; }.skillpath-skeleton span,.skillpath-skeleton strong,.skillpath-skeleton i,.skillpath-skeleton b { display:block; border-radius:8px; background:linear-gradient(90deg,#f0edf4 25%,#faf9fb 45%,#f0edf4 65%); background-size:300% 100%; animation:skillpath-shimmer 1.3s infinite; }.skillpath-skeleton span { width:35%; height:14px; }.skillpath-skeleton strong { width:70%; height:28px; margin-top:12px; }.skillpath-skeleton i { height:12px; }.skillpath-skeleton b { width:40%; height:20px; margin-top:auto; }
    @keyframes skillpath-shimmer { to { background-position:-300% 0; } }
    @media (max-width: 900px) { .skillpath-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .skillpath-header { align-items:flex-start; } }
    @media (max-width: 600px) { .skillpath-grid { grid-template-columns:1fr; } .skillpath-controls { width:100%; }.skillpath-controls input,.skillpath-controls select { flex:1; min-width:0; }.skillpath-card { min-height:220px; } }
`
