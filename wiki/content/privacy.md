---
path: /privacy
keywords: privacy, privacy policy, privacy notice, personal data, data, your data, email, password, username, save, ip address, internet address, cookies, local storage, backups, logs, retention, delete account, delete my account, gdpr, kvkk, children, cloudflare, resend, racknerd, google, google drive
---
This page says what Fantasy Idle keeps about you, and why. The short version comes first, and the full notice is below it. The game is run by the Fantasy Idle developer team ("we"): ask us anything about it at {{link(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL)}}.

## In short

### What we keep, and why

- Your **username**, and your **password** in a scrambled form that nobody can read back: so you can sign in.
- Your **email**: to send you a code when you sign up or forget your password, and a short note when something happens to your account: your password changed, someone tried to sign up with your address, or we acted on your clan, username or account. No other player sees it, and we send no news or ads.
- Your **game**: your hero and everything in your save, so you can play it on any device.
- Your **clan**: which clan you are in, and the words of a clan you start. Every signed-in player can read clan names and words. Your clan's members see how many days ago you last played.
- The **leaderboards**, only if you join them: your username and your numbers.
- **Sign-in counters**: how many tries came from your internet address, to stop password guessing.
- **What we changed**: if we clear a clan's words, rename a clan or a player, or close an account, a note of what we did and why.

### For how long

- Your account, email and game: until you delete your account. We don't delete accounts that go quiet. A sign-up never confirmed goes after 30 days.
- Sign-in counters and unused email codes: a day or two.
- Clan fights and the boards' weekly numbers: about two weeks.
- Hall gifts: while the clan stands.
- Backups of all of it: 14 days on our server, and up to a year as encrypted copies on our Google Drive. A few encrypted copies we keep as an archive, with no end date yet.

### Who helps us run the game

- **RackNerd** rents us the server the game runs on.
- **Cloudflare** stands in front of the site: every visit passes through it, to keep the site fast and safe.
- **Resend** sends the game's emails: your codes and notes.
- **Google** holds our encrypted backups, on Google Drive.
- We don't sell your data, show ads or follow you around the web.

### Where it is kept

- On our server in the United States, in encrypted backups on Google Drive and on our own computer, and in your own browser: your game's copy and your settings.

### What you can do

- **See it:** email us, and we send you a copy.
- **Change it:** set a new password with "Forgot your password?" when you sign in. To change your email or username, email us.
- **Delete it:** **Settings → Delete my account**, with your password. It goes at once; copies in backups go only as those backups do ([[/privacy#your-rights|below]]). You can leave the leaderboards, or your clan, at any time.
- **Complain:** tell us, or a data protection authority (below).

## The full notice

The same, in full: [[/privacy#who-we-are|who we are]] · [[/privacy#what-our-server-keeps|what our server keeps]] · [[/privacy#kept-outside-the-database|outside the database]] · [[/privacy#kept-in-your-browser|in your browser]] · [[/privacy#who-helps-us-and-where-your-data-goes|who helps us]] · [[/privacy#why-we-may-use-it|why]] · [[/privacy#the-check-on-saves|the check on saves]] · [[/privacy#your-rights|your rights]] · [[/privacy#children|children]] · [[/privacy#keeping-it-safe|keeping it safe]] · [[/privacy#changes-to-this-page|changes]].

### Who we are

The Fantasy Idle developer team runs the game at fantasyidle.com and this wiki, and decides what is kept and why. Reach us at {{link(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL)}}. We read and answer in English.

### What our server keeps

| What | Why | How long | Who else sees it |
| --- | --- | --- | --- |
| Your username | To sign in, and to show you in your clan and on the boards | Until you delete your account | Your clan's members; every signed-in player, if you join the boards |
| Your password | To sign in. We keep only a bcrypt hash of it: nobody can read the password back | Until you delete your account; a new password replaces it | No one |
| Your email, and when you confirmed it | The codes at sign-up and for a new password, short notes about your account, and one account per email | Until you delete your account | No one. Resend handles it to send each mail |
| An account whose email was never confirmed | Waiting for its first code | Deleted after 30 days, if it has no save and no clan | No one |
| Email codes | To check the code you type. Kept only as a keyed hash, and good for 15 minutes | Deleted when used, or when a new one is sent; one left unused goes in the next night's cleanup | No one |
| Your save: your whole game, with the name you gave your hero, your settings and when you played | Your game on any device. It goes up every minute while the game is open | One copy, replaced at each upload, until you delete your account | No one sees the save itself, or your hero's name |
| Numbers worked out from your save (best stage, total level, Titans, dungeon clears, your attack), and the highest of each so far | The boards, the clan fights and the check on saves | With your account | Your clan's members; the boards, if you join them |
| When your game last saved | To show your clan who still plays, and to pass on a clan whose owner has been away 30 days | With your save | Your clan's members, in whole days only ("Seen 3 days ago") |
| Flags: the reason for each and when | To keep the boards and clan fights fair (below) | Each one acts for 30 days, and the night's cleanup then deletes it. Your latest stays, with your account | No one. The game tells you, in Settings and on a clan fight's card |
| The review list: a number of yours that grew faster than the check allows, from what to what, and when | For a person on our team to look at. Nothing happens to your account by itself (below) | No end date yet, with your account | No one. It comes to our team by mail each week, under your username |
| Your clan: which one, and when you joined | The clan's boss, ranking and hall | While you are in it | Your clan's members |
| Clan words: name, tag, description, "looking for" line and banner | Clans | Until the clan closes, when its last member leaves. Each finished week's ranking keeps the names and tags of its clans, with no end date | Every signed-in player |
| Your clan attacks and Endless Hydra fights: how much and when | The week's boss and ranking | About two weeks: the night's cleanup deletes them once that week's ranking is stored, or after five weeks if it never was | Your clan's members: the week's damage, by username |
| Your hall gifts: what, how much and when | The hall | While the clan stands, even after you leave it. Once it has closed, gifts older than about two weeks become totals with no name on them, but for your latest and any your game has yet to count | Your clan's members: the hall's builders and the latest gifts, by username |
| Clan rewards, and gifts from us | To pay each one once | Until you delete your account | No one |
| The boards: whether you joined, and a copy of your numbers as each week begins | The "This week" boards | Your choice, until you change it; the weekly copies go after about two weeks | Every signed-in player sees your username and numbers while you are on the boards |
| Sign-in counters: tries counted by internet address (IP address), by account and by the username typed, each over 15 minutes to a day | To stop password guessing, and floods of accounts and mail | The night's cleanup deletes each one once it is a day old. Signing in with the right password clears one sooner | No one |
| Our team's log: what we changed and why (a clan's words, name or tag, a username, an account closed), with the words before and after | To put things back after an appeal, and to show what we did | No end date yet. An entry about your username goes when you delete your account; the note that we closed an account stays | No one |

**The night's cleanup.** Every night at 04:30 UTC a program on our server deletes what the game no longer needs: sign-in counters a day old, email codes past their time, sign-ups never confirmed after 30 days, flags past their 30 days (but your latest), the boards' weekly copies and clan fights older than this week and last, and old gifts to clans that have closed.

The game doesn't ask your age, and our server doesn't record your country or where you are. If you came by a listing's link, we count one more account for that listing: a number, with no name on it.

### Kept outside the database

- **Backups.** Every night at 03:30 UTC a copy of the whole database is made on the same server, readable only by the database's own system account, and kept for 14 days. An encrypted copy then goes to our Google Drive, which keeps the last 30 nights and the first copy of each month for a year. We also keep backups of the whole project on the same Drive, with encrypted copies of the database in them, and an encrypted copy of the database on our own computer. Those have no end date yet.
- **A test copy.** To try changes before they reach you, we run a private copy of the site on the same server, behind a private link, with a copy of the database from a night's backup. It sends no mail, and it is replaced when we refresh it.
- **The web server's log.** Each visit to the game or this wiki is logged with your internet address, the time, the page and your browser's name. The log is cleared after about two weeks.
- **The game server's own log** holds error messages and each night's cleanup counts, not a record of each visit. It is kept for 30 days.
- **Cloudflare** carries everything between your browser and our server, so it handles your internet address and what your browser sends and receives. Mail to our address passes through it too. Cloudflare's own privacy policy covers what it keeps.
- **Resend** gets your email address, your username (each mail greets you by name) and the mail's words, the code or the note, for each mail it sends, and keeps a log of each mail for 30 days. It also carries the weekly review list to our team, with the usernames on it.
- **Mail you send us** reaches our team's mailbox, with your address and what you wrote, and stays there as long as we need it to answer you and to keep a record of what we decided.

### Kept in your browser

- The game keeps, in your browser's storage: a copy of your game and a few backups (every 10 minutes, when the game loads, before a prestige or an Ascension, before a hard reset, and a guest's game put aside when an account signs in); your sign-in, good for 30 days; which save on our server this device saw last; small settings, such as the tab you were on, your text size and the battery saver; and the tag of a listing's link, if you came by one.
- Logging out takes your sign-in and your game's copy off this browser. Clearing this site's data in your browser removes all of it. Some browsers clear a site's storage by themselves: Safari does after seven days without a visit.
- The game and this wiki set no cookies, and run no analytics, ads or trackers. Cloudflare may set a cookie it needs to tell people from bots.
- Everything the game and this wiki load, fonts included, comes from fantasyidle.com.
- If you turn on the playtest log in Settings, its timeline (what happened in your game, and when the game was in view) is part of your save, so it goes to our server with it.

### Who helps us, and where your data goes

- **RackNerd**, our server host: the server with the database, the backups and the logs is rented from RackNerd, and stands in the United States.
- **Cloudflare**: its network stands in front of fantasyidle.com and this wiki (the site's addresses, HTTPS and protection), with servers around the world.
- **Resend**: sends the game's mail, from its servers in Ireland. It is a US company, and may handle the data in the United States.
- **Google**: our encrypted backups are kept on Google Drive.
- **Other players** see only what the table above says.
- **The authorities**, only where the law makes us tell them: to report child sexual abuse, for example.
- We sell nothing about you, and share it with no one else. If you live outside the United States, your data goes there; where the law asks for safeguards for that, we rely on the data processing terms of RackNerd, Cloudflare and Resend. What goes to Google Drive is encrypted before it leaves our server.
- The game's Discord is Discord's own service, under Discord's privacy policy. There we see only what you post, as any member does.

### Why we may use it

- **To give you the game you signed up for:** your account, email, save, clan and clan fights.
- **Your choice:** the leaderboards. Join or leave them at any time.
- **To keep the game safe and fair:** the sign-in counters, the backups, the logs, the check on saves and our team's log.
- **When the law requires it:** reports of illegal content.

### The check on saves

A program on our server checks the numbers in every save. If a save holds numbers no save can reach, the account is flagged: for 30 days its clan attacks are capped, its Endless Hydra fights don't count in the ranking, and it is left off the boards. A number that only grew faster than the game allows is never flagged by the program: it goes on a list for a person on our team, who may flag the account after a look. A person looks again if you ask: see [[/rules#flags|Flags]]. The check reads numbers, never what you write.

### Your rights

- You can ask us for a copy of your data, to correct it, to delete it, to limit how we use it or to object to it (to the check on saves, too), and for your save as a file. Email us, and we answer within a month.
- **Delete my account** is in Settings, and asks for your password. It deletes, at once and for good: your username, email, password and game; the numbers worked out from your save, your flags and your place on the review list; your place in your clan and on the boards; your clan attacks, Endless Hydra fights and hall gifts; your codes, rewards, weekly copies and sign-in counters by name; and our team's notes about your username. This browser forgets the account and its copy of the game, and your other devices are signed out the next time they reach us. Your username and email can then be used for a new account.
- **What stays with your clan,** with no name on it: the hall's work, the boss's lost health, and your deepest fight at the Endless Hydra this week or last (not if your account was flagged). If you lead the clan it passes to the member who has been in it longest and played this past week, or else to the longest-serving; if you were its last member it closes. The clan's place in each week's ranking keeps its own name and tag.
- **Backups already made don't change.** Your account leaves them as they expire: after 14 days on our server, 30 days in the nightly copies on Google Drive, and up to a year in the monthly ones. The archive copies have no end date yet, and the test copy keeps it until we next refresh it.
- **Hard reset,** also in Settings, starts your game over (on our server too) but keeps your account.
- You can complain to a data protection authority: in the UK the Information Commissioner's Office, in the EU the authority of your country, in Turkey the Personal Data Protection Authority (KVKK). We'd like the chance to put things right first.

### Children

We don't ask anyone's age. Instead, the game works the same careful way for everyone: we keep only what the game needs, no other player sees your email or your hero's name, the leaderboards are off until you join them, and there is no chat, no private messages, no ads and no tracking. Parents can write to us about a child's account.

### Keeping it safe

Passwords and email codes are kept only as hashes. The site works only over HTTPS, and our server answers the web only through Cloudflare. Our server's backups can be read only by the database's own account, and the copies that leave it are encrypted first. If your data is ever exposed, we will tell you, and the authorities, as the law requires.

### Changes to this page

When we change what we keep or why, we update this page and say so on the Discord. Last changed: 19 November 2026.
