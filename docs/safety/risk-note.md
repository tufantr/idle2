# Online safety risk note

A draft for the owner's OK. **This is not legal advice:** P-048's lawyer checks it ([lawyer-questions.md](lawyer-questions.md)).

It is the written record the UK's Online Safety Act asks a user-to-user service to keep: the illegal content risk
assessment (s.9), the children's access assessment (s.35–36), and the measures taken (s.23). It is kept with the code so
that it changes when the game does. It follows 038 §4, "A minimum plan for one person", with 045 and 046.

| | |
|---|---|
| Service | Fantasy Idle: the game at fantasyidle.com and its API. The wiki at wiki.fantasyidle.com has no user content |
| Provider | The Fantasy Idle developer team |
| Named person (ICU A2, PCU A2) | The Fantasy Idle developer team (§6) |
| Written | 12 November 2026, against the code at 004babc |
| Next review | November 2027, or before any change in §10, whichever comes first |
| Ofcom's regulation checker | §9, filled in by the owner |

## 1. Is the game in scope?

- **A user-to-user service: very likely.** Clan names, tags, descriptions and "looking for" lines are written by one player
  and read by others (s.3), and no exemption in Sch. 1 fits (038 §1). Ofcom's gaming guidance (14 October 2025) counts what
  players make and share in a game, and leaves out what the studio publishes and offline play (046).
- **Regulated: unclear.** That needs UK links (s.4(5)–(6)). The server keeps no countries; the game is in English, with no
  UK price, domain or marketing (038 §1). This note acts as if the game is in scope.
- **When.** If the game has been in scope since clans went live (about 11 October 2026), the first illegal content risk
  assessment and the children's access assessment are due about mid-January 2027 (Sch. 3 para 3). This note is meant to be
  both, and §5 is the children's risk assessment that follows from §4.

## 2. What players can write, and who reads it

| What | Limits (the code) | Who reads it |
|---|---|---|
| Username | 3–24 letters, digits, _ or - (`api/index.js:19`) | Their clan's members; every signed-in player on the boards, which are opt-in |
| Clan name | 3–32 letters, digits, spaces, ' _ or - (`api/index.js:489`) | Every signed-in player: the clan list and the ranking |
| Clan tag | 2–5 letters or digits (`api/index.js:490`) | The same |
| Clan description | Up to 200 characters of any text, with control characters and `<` `>` taken out (`api/index.js:500, 832`) | Every signed-in player: the clan list and the clan's header |
| "Looking for" line | Up to 100 characters, cleaned the same way | The same |
| The hero's name | Kept in the save | The player only: it is never sent to anyone else |

- **Not in the game:** chat, private messages, images, uploads, avatars, written profiles, friend lists, voice,
  livestreams, matchmaking, and links that open (an address typed into clan words shows as plain text). Players meet only in
  clans: anyone may join a clan that has room, its owner may remove a member, and anyone may leave.
- **Clan words are fixed** when the clan is made. Only the team can change them, today by editing the database.
- **Size:** 45 accounts, five clans and about 15 players active in a week, in November 2026 (027, 030).
- **Off the game:** the game's Discord server, linked from the Clan tab, Settings and the wiki, is Discord's own service
  under Discord's rules. The team moderates it there.
- **Ofcom's risk factors** (its risk profiles, as the team reads them): a gaming service, likely used by children, with user
  groups (clans), short posted text and pseudonymous usernames (an email is needed, not a real name). None of the factors
  tied to messaging, images, livestreams, recommender feeds, hyperlinks or payments is present.

## 3. The illegal content risk assessment

Each kind is rated low, medium or high, as Ofcom's guidance asks. **Every kind is low**, for the same five reasons, and the
table gives what applies beyond them:

- **(a)** The only text other players meet is a clan name of up to 32 characters, a tag of up to 5, a description of up to
  200, a "looking for" line of up to 100, and usernames.
- **(b)** No chat, private messages, images, uploads, links that open or matchmaking.
- **(c)** Five clans, and the team reads every new clan's words.
- **(d)** The team can clear any clan's words and close any account.
- **(e)** The rules page bans each kind and says how to report it.

| # | Kind of illegal harm | Risk | Why, beyond (a)–(e) |
|---|---|---|---|
| 1 | Terrorism | Low | Clan words could praise or name a proscribed group, but there is nothing to share or recruit with beyond them |
| 2a | Child sexual exploitation and abuse: grooming | Low | No way to message a player in the game. What is left is clan words that invite players elsewhere, which the rules ban (contact details, handles, links). Ofcom's gaming guidance counts grooming among games' raised risks, through voice and text chat (046); P-125 would refuse links and handles outright |
| 2b | Child sexual exploitation and abuse: abuse material | Low | No images or uploads; an address typed as text doesn't open |
| 3 | Hate | Low | Names and words could hold slurs: banned, read and cleared |
| 4 | Harassment, stalking, threats and abuse | Low | Clan words could name a player. There are no messages, usernames show only inside a clan and on the opt-in boards, an owner can remove a member, and anyone can leave |
| 5 | Controlling or coercive behaviour | Low | No private contact in the game |
| 6 | Intimate image abuse | Low | No images |
| 7 | Extreme pornography | Low | No images |
| 8 | Sexual exploitation of adults | Low | Text could advertise it: sexual content and ads are banned |
| 9 | Human trafficking | Low | No route but short text; ads are banned |
| 10 | Unlawful immigration | Low | The same |
| 11 | Fraud and financial offences | Low | Nothing is sold or traded in the game; a clan line could point to a scam, and ads and links are banned |
| 12 | Proceeds of crime | Low | No money moves in the game |
| 13 | Drugs and psychoactive substances | Low | Text could offer them: banned |
| 14 | Firearms, knives and other weapons | Low | The same |
| 15 | Encouraging or assisting suicide | Low | Text could: banned, read, and cleared at once |
| 16 | Foreign interference | Low | Five clans and short text reach almost no one |
| 17 | Animal cruelty | Low | No images or video |
| 18 | Encouraging or assisting serious self-harm (new, §8) | Low | As suicide |
| 19 | Cyberflashing (new, §8) | Low | No images, and no way to send anything to one person |
| 20 | Other illegal content | Low | The five reasons alone |

So the game is neither large (over 7 million UK users a month) nor multi-risk (medium or high in two or more kinds), and the
14 baseline measures of §6 apply (038 §1).

## 4. The children's access assessment (s.35–37)

- **Can children use the game?** Yes. Nothing checks ages, and only age verification or estimation could show that
  children can't use it (s.35, 038 §1).
- **Do, or would, many children use it?** Unknown: the game keeps no ages or countries. A free fantasy game with pixel
  monsters and a Discord can be expected to draw players under 18 (the team's judgement).
- **Result: likely to be accessed by children,** and treated so. The children's risk assessment (§5) and the children's
  code's measures (§6) follow. (A service that skips this assessment is treated as likely accessed anyway: s.37(4), 038 §1.)

## 5. The children's risk assessment

The Act's twelve kinds of content harmful to children: four of primary priority (s.61) and eight of priority (s.62).
**Every kind is low,** for reasons (a)–(e) above, and the rules ban each one, so no age checks are needed: Ofcom's children's
code recommends them where such content is the service's purpose, is allowed, can't be taken down, or is pushed by a feed
(PCU B2–B7, 038 §1).

| # | Kind of content harmful to children | Risk | Why, beyond (a)–(e) |
|---|---|---|---|
| 1 | Pornography (primary priority) | Low | Text only, and sexual content is banned |
| 2 | Encouraging, promoting or instructing suicide (primary priority) | Low | Banned, read, and cleared at once |
| 3 | The same for self-harm (primary priority) | Low | The same |
| 4 | The same for eating disorders (primary priority) | Low | The same |
| 5 | Abuse targeting race, religion, sex, sexual orientation, disability or gender reassignment | Low | Slurs and hate are banned |
| 6 | Inciting hatred against people for those characteristics | Low | The same |
| 7 | Bullying | Low | Clan words could mock a player: banned. A player can leave a clan, and an owner can remove a member |
| 8 | Encouraging, promoting or instructing serious violence against a person | Low | Threats and violence are banned |
| 9 | Realistic depictions of serious violence or injury to a person | Low | No images, and gory descriptions are banned; the game's own fights are the provider's content, outside the Act |
| 10 | Realistic depictions of serious violence to animals or fictional creatures | Low | The same; the game's monsters are its own content |
| 11 | Dangerous stunts and challenges | Low | Banned ("dangerous challenges") |
| 12 | Encouraging the use of harmful substances | Low | Banned ("drugs") |
| | Other content harmful to children (Ofcom gives body stigma and depression as examples) | Low | The five reasons alone |

**What makes children use the game more** (s.11(6)(f), 038 §1). The game's reward clocks, from the code:

| Clock | What it does |
|---|---|
| The daily crate | One every 20 hours, and up to 3 wait (`src/systems/daily.js:12-13`) |
| Clan attacks | 3 a day at midnight UTC, and up to 6 wait (`src/data/social.js`, `CLAN_ATTACKS_PER_DAY`, `CLAN_ATTACK_BANK`) |
| The Titan | One try an hour, and up to 3 wait (`src/data/dungeons.js:249, 260`) |
| The week's Trial | One Trial a week; beating your best stage in it wins a laurel (`src/data/trials.js:97-103`) |
| The Endless Hydra | 2 fights each, from Saturday 00:00 to Monday 00:00 UTC (`src/data/social.js`, `ENDLESS`) |
| Weekend events | Friday 00:00 to Monday 00:00 UTC, every weekend (`src/data/events.js:17-18`) |
| Offline progress | Up to 24 hours replayed on return, more with perks (`src/core/modifiers.js:62`) |

No clock sends a notification: the game can't reach a player who has closed it. While it is open, its tab's title shows a ★
when a crate waits or a plot or dungeon is ready (`src/ui/render.js:319-325`), and it plays sounds (Settings can turn the
mini-game chime off). Nothing is sold, and there are no ads. The banks soften a missed window, and missing one takes nothing
away but what it would have paid. **Rated low.** The EU's proposals would reach such clocks later (the KIDS Act's
art. 15(1)(a), the Digital Fairness Act's art. 17(1)(c): 038 §3, P-115).

## 6. The measures, and how each is met

The 14 measures of Ofcom's illegal content code for a service that is neither large nor multi-risk (038 §1). A service
likely to be accessed by children adds the same shape from the children's code: PCU A2, C1–C2, D1–D2, D7 and the appeal
measures, G1 and G3, each met as the line of the same letter below.

| Measure | What it asks | How Fantasy Idle meets it | Status |
|---|---|---|---|
| ICU A2 | A named person accountable for the illegal content, reporting and complaints duties | The Fantasy Idle developer team. The codes speak of one individual: if the lawyer confirms that, the team names that person in its own records, not here (lawyer question 3) | Named here |
| ICU C1 | A way to review suspected illegal content | A person on the team reads every new clan and every report; nothing is scanned by a program | Met |
| ICU C2 | Swift takedown | The team clears or renames a clan's words, or closes an account, as soon as it knows. Today that is an edit to the database; P-113's route for the team would make it one step, with a log | Met by hand; P-113 planned |
| ICU D1 | Complaints can be made, by users and by people who aren't | contact@fantasyidle.com and the Discord; no account needed (the rules page) | When the address works |
| ICU D2 | Complaints easy to find and to make | The rules page on the wiki, in its footer and its Reference menu, and linked at sign-up and at clan creation (the just-in-time lines); the address in Settings beside the Discord (P-110) | When placed |
| ICU D7 | Action on complaints about suspected illegal content | Read by a person, taken down if illegal, answered with the decision | Met |
| ICU D9 | Appeals decided (a service neither large nor multi-risk) | A reply to the team's email is an appeal: the team looks again and answers | Met |
| ICU D10 | Action after an appeal | What was wrongly taken down or changed is put back | Met |
| ICU D11 | Complaints about proactive technology | None is used on what players write; such a complaint is answered as any other | Met |
| ICU D12 | Action on every other complaint | Answered by a person, with the decision | Met |
| ICU D13 | Manifestly unfounded complaints may be set aside | The rules page says so | Met |
| ICU G1 | Terms say how users are protected, what proactive technology is used, and how complaints are handled | The rules page: the rules, "no program scans what players write", reports and appeals | When published |
| ICU G3 | Terms clear and easy to reach | Plain words for a 13-year-old, on the wiki, linked from the game | When published |
| ICU H1 | Removing accounts of proscribed organisations | Terrorism is banned under "anything against the law"; such an account is closed | Met by hand |

**Records (s.23).** This note is the record of the assessments and the measures. A log of each report, edit and removal
(the date, what, why and the reply) is kept by the team privately, not in this repository, since it names players and the
people who report.

## 7. Reports to the National Crime Agency (s.66)

Since 7 April 2026, a regulated user-to-user service must report child sexual exploitation and abuse content it detects to
the National Crime Agency (038 §1, 046). The game hosts no images, so such content could only be text: a clan's words or a
name pointing to abuse material, or soliciting a child. If the team finds it:

1. Don't copy, forward or keep the material itself.
2. Clear it from view at once (the clan's words or the name), and close the account.
3. Write down what was found, where, when, and the account it came from.
4. Report it to the National Crime Agency in the way the regulations set, and keep the record as they say.

## 8. The new priority offences (autumn 2026)

Encouraging or assisting serious self-harm, and cyberflashing, were finalised in June 2026 and are due in autumn 2026,
subject to Parliament (046). Both are rated in §3 (rows 18 and 19): low, since text that encourages self-harm is banned and
read, and the game has no images and no way to send anything to one person. When they come into force, this note is
checked again (§10). The same goes for Ofcom's Additional Safety Measures statement, due in autumn 2026 for every service
(046).

## 9. Ofcom's regulation checker

[Ofcom's regulation checker](https://www.ofcom.org.uk/os-toolkit/regulation-checker/regulation-checker) takes about ten
minutes, and asks about the service's UK links, its kind and what users can meet (046). It is for the provider to fill in.

| | |
|---|---|
| Filled in on | (the owner) |
| By | (the owner) |
| The answers given | (the owner) |
| Its indicative result | (the owner) |

## 10. Reviews

- **Every year**, in November.
- **Before any change that lets players write more, or meet more:** chat, a feed, clan owners editing their words (P-113),
  links in clan words, profiles, uploads, private messages, or a build in another store. The Act asks for this before a
  significant change (s.9(4)).
- **When the law or Ofcom's codes change:** the new offences (§8), the Additional Safety Measures statement, and the UK's
  ban on social media for under-16s, whose regulations are due by the end of 2026 (046).
- **After any serious incident.**

Sources: 038 (the Act, the codes as laid, IFTAS and Bristows), 045 §9 (the ICO's children's code), 046 (Ofcom's own pages,
read in a real browser on 12 November 2026), and the code at 004babc.
