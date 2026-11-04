# Sprout design direction

## Purpose
A presentation-led, interactive frontend concept for financial literacy for teens aged 15–17. NGO-funded rewards, virtual jars, and adult-approved withdrawals. This is not a connected financial application.

## Visual direction
Soft neo-brutalism: oversized geometric typography, pastel paper surfaces, dark outlines, offset shadows, tactile controls, and a cursor character named Clicky. Grail (https://grail-app.com/) informs cinematic card composition and the scrolling narrative, not copied assets or content.

Hero: big left-aligned thesis with an illustrated goal card stack to the right. Sections progress through earning, allocation, growth, mentorship, accountability, and a closing invitation. Alternating wide editorial sections avoid a repetitive card-grid layout. The four jars are the one deliberate four-card comparison.

## Runtime tokens
Canonical values live in client/src/styles.css under @layer base, :root. Components consume these CSS variables. No generated adapter or additional theme system.

| Role | Token | Value |
| --- | --- | --- |
| Text and outlines | --ink | #1b2922 |
| Paper | --paper | #faf9f4 |
| Main surface | --mint | #d9efdf |
| Save | --green | #a8cfb4 |
| Spend and guide | --purple | #c1aff0 |
| Give | --peach | #f3b4a2 |
| Invest and mentor section | --yellow | #f9ca6b |
| Secondary text | --muted | #56645b |

Display: locally bundled Space Grotesk, weights 500 and 700. Body: locally bundled DM Sans, 400/500/700. Occasional Georgia italic provides a human contrast without another network font.

## Motion and access
Native smooth anchor scrolling, IntersectionObserver reveals, floating hero cards, moving ticker, jar fill transitions, pressed buttons, and pointer click rings. No scroll hijacking. Motion toggle and OS reduced-motion preference stop decorative animation. Content remains reachable by keyboard. Native ranges support arrow keys. Custom pointer is limited to interactive elements and fine-pointer devices.

Clicky provides a non-modal 75-second guided tour with captions, opt-in browser speech, pause/resume, previous/next, replay, Escape close, and focus return. The tour pauses in hidden tabs. Seven chapters total 75 seconds of active playback; pausing extends wall-clock duration. Speech is optional and device-dependent; captions define the timing. No microphone access.

## Truthfulness
Sample balances are illustrative, allocation is client-local, mentor answers are prepared, payments are simulated, and blockchain is a planned audit feature. No live verification or anti-fraud guarantee is implied. No fabricated users, testimonials, impact numbers, or partner endorsements.

## Responsive behavior
Wide split hero and editorial sections collapse at 640px. Jar grid becomes two columns. Mobile navigation expands in-page below the header. Guide stays within the visual viewport. Standard document scrolling remains the only primary scroll owner.
