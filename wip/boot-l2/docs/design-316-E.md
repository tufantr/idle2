
**A tab the player never left** (`docs/research_notes/research-loop/040-long-session-and-clocks.md` §1: Chrome paused a hidden
tab for half an hour, and its late tick opened "Welcome back, away 33m" in a tab nobody had left). A gap that began while
the page was hidden (a background tab the browser paused, a phone in another app or locked) opens no dialog unseen.
Once the page is in view, a gap under an hour is one line in a toast ("37m in the background: 354 monsters, 2 prestiges"),
the background tab's equivalent of the cards it would have shown had it kept ticking; from an hour on it is the
welcome-back, and from a day it carries the strip as a closed tab's does (`gapTelling` in `src/systems/reentry.js`). A gap
in a page in view as it began (the machine slept with the game in front) shows the welcome-back as before.
