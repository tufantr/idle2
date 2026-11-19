# Two just-in-time lines for the game

Drafts for the owner's OK (R15, P-097). These are short notices placed where a use of data begins, as the UK children's code
asks (045 §9). They are in the code (`EMAIL_LINE` and `CLAN_WORDS_LINE` in `src/ui/render.js`; a change goes there and here
together, and `test/clarity.test.mjs` checks where they stand). Not legal advice.

They are worded like the leaderboards' own line (`renderLeaderboard`): what is shown or kept, and to whom, in plain words,
with the key thing in bold. "We" is the game's voice, as in the account dialog's "We sent a 6-digit code". Both link a wiki
page, in a new tab, so a half-filled form isn't lost.

## 1. At the email field of sign-up

**Where:** the account dialog's register form, right under the email field (`#auth-email`). It shows only while an account is
being made.

**The line:**

> Your **email** gets a 6-digit code to start playing, another if you forget your password, and a short note if something
> happens to your account. No other player sees it, and we send no news or ads.
> [Rules](https://wiki.fantasyidle.com/rules) · [Privacy](https://wiki.fantasyidle.com/privacy)

**As HTML:**

```html
<p class="muted small just-in-time">Your <b>email</b> gets a 6-digit code to start playing, another if you forget your password, and a short note if something happens to your account. No other player sees it, and we send no news or ads. <a href="https://wiki.fantasyidle.com/rules" target="_blank" rel="noopener">Rules</a> · <a href="https://wiki.fantasyidle.com/privacy" target="_blank" rel="noopener">Privacy</a></p>
```

The Rules link is there because the rules page says that making an account means agreeing to them, and P-124 asks for the
rules at sign-up.

**Checked against:** codes go only for sign-up ('verify') and a new password ('reset'), and no address is ever shown to
another player (`mailCode` in `api/index.js`). The notes are the three others a player can get (`api/mail.js`): the password
was changed (`passwordChangedMail`), someone tried to sign up with the address (`signUpTakenMail`), and what the team did
(`teamNoticeMail`, sent by `api/team.js`). The owner's own alerts go to the owner, never to a player.

## 2. At clan creation

**Where:** the "Start a clan" panel, just above the Create clan button.

**The line:**

> Every signed-in player can read your clan's **name, tag, description and "looking for" line**. They follow the
> [rules](https://wiki.fantasyidle.com/rules), and we read every new clan.

**As HTML:**

```html
<p class="muted small just-in-time">Every signed-in player can read your clan's <b>name, tag, description and "looking for" line</b>. They follow the <a href="https://wiki.fantasyidle.com/rules" target="_blank" rel="noopener">rules</a>, and we read every new clan.</p>
```

**Checked against:** the clan list needs a sign-in and gives every clan's name, tag, description and "looking for" line
(`GET /api/clans`, `store.listClans`); the clan's own header shows the same (`renderClan`).

## Notes

- "We read every new clan" is the promise the rules page makes. If the owner doesn't make it, end the line at "rules".
- The wiki's address is https://wiki.fantasyidle.com (`SITE_URL` in `wiki/build.mjs`). On a local host the links still go
  to the live wiki, which has the pages once the wiki is deployed.
- Clan owners can now change the description and the "looking for" line (R14, P-113). The clan line still holds as written,
  but "we read every new clan" says nothing about those later changes, which don't reach the team by themselves.
