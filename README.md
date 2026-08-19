# Website

Framer code component for the Skillpath course catalog section.

## SkillpathCourses.tsx

Fetches courses from the backend and renders them as a searchable, sortable grid. Built as a Framer code component, so `heading` and `accentColor` are editable from the Framer canvas via property controls.

### What it does

Pulls course data and the visitor's country code from the API on load. If the country lookup fails, the courses still show up (with prices marked unavailable and a retry button) instead of the whole thing breaking. Users can search by name/category and sort by price.

Handles the usual states: loading skeletons, fetch errors, empty catalog, no search results.

### API

- `GET /assignment/course-data` - array of courses (name, code, description, category, type, price in paise/cents, refundable flag)
- `GET /assignment/country-code` - `{ country_code: "IN" | "US" }`, used to decide whether to show INR or USD pricing

Base URL is set in `API_BASE_URL` at the top of the file.

### Note

Since this imports from `"framer"`, it only runs inside a Framer project - not as a plain React app. If you want to test it standalone, drop the framer import and the `addPropertyControls` call and just pass `heading`/`accentColor` as normal props.
