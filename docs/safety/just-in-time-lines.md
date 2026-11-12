# Two just-in-time lines for the game

Drafts for the owner's OK (R15, P-097). These are short notices placed where a use of data begins, as the UK children's code
asks (045 §9). They are not in the code yet: the coordinator places them. Not legal advice.

They are worded like the leaderboards' own line (`src/ui/render.js:2704`): what is shown or kept, and to whom, in plain words,
with the key thing in bold. "We" is the game's voice, as in the account dialog's "We sent a 6-digit code". Both link a wiki
page from this branch, in a new tab, so a half-filled form isn't lost.

## 1. At the email field of sign-up

**Where:** the account dialog's register form, right under the email field (`#auth-email`, `src/ui/render.js:2971`). It shows
only while an account is being made.

**The line:**

> Your **email** gets a 6-digit code to start playing, and another if you forget your password. No other player sees it, and
> we send it nothing else. [Privacy](https://wiki.fantasyidle.com/privacy)

**As HTML:**

```html
<p class="muted small">Your <b>email</b> gets a 6-digit code to start playing, and another if you forget your password. No other player sees it, and we send it nothing else. <a href="https://wiki.fantasyidle.com/privacy" target="_blank" rel="noopener">Privacy</a></p>
```

**Checked against:** codes go only for sign-up ('verify') and a new password ('reset'), and no address is ever shown to
another player (`api/index.js:161-196`); a code is the only mail the game sends (`api/mail.js`).

## 2. At clan creation

**Where:** the "Start a clan" panel, just above the Create clan button (`src/ui/render.js:2418`).

**The line:**

> Every signed-in player can read your clan's **name, tag, description and "looking for" line**. They follow the
> [rules](https://wiki.fantasyidle.com/rules), and we read every new clan.

**As HTML:**

```html
<p class="muted small">Every signed-in player can read your clan's <b>name, tag, description and "looking for" line</b>. They follow the <a href="https://wiki.fantasyidle.com/rules" target="_blank" rel="noopener">rules</a>, and we read every new clan.</p>
```

**Checked against:** the clan list needs a sign-in and gives every clan's name, tag, description and "looking for" line
(`api/index.js:798-803`, `api/store.js:356-366`); the clan's own header shows the same (`src/ui/render.js:2433`).

## Notes

- "We read every new clan" is the promise the rules page makes. If the owner doesn't make it, end the line at "rules".
- The wiki's address is https://wiki.fantasyidle.com (`SITE_URL` in `wiki/build.mjs`). On a local host the links still go
  to the live wiki, which has the pages once the wiki is deployed.
- If clan owners can later edit their words (P-113), the clan line still holds as written.
