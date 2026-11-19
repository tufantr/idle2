// What a clan's words may hold (src/data/social.js clanWordsOk): no way to reach anyone elsewhere (the research loop's P-125).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clanWordsOk, DISCORD_INVITE } from '../src/data/social.js';

test("plain clan words pass, whatever their punctuation", () => {
    for (const words of ['', 'Casual, EU evenings', 'Anyone past stage 50', 'Stage 1,000+ only!', "We talk on the game's Discord", 'Discord active', 'e.g. daily attacks',
        'Top 10. Be active.', '1.5k stage, x3.5 banner', 'Mon-Fri, 5/7 days', '3 attacks/day', 'a.m. players and p.m. players', 'Rank #1 wanted', 'Join us!', 'Invite only',
        'Türkçe oyuncular, aktif üye arıyoruz.', 'Done. Next!', 'No drama :)', 'Front line: active players', 'Code of honour', 'Have fun, gg', 'Hello. Me too', 'stage 1000 to 2000',
        'Text walls welcome', 'Follow the leader', 'Daily at 20:00 UTC']) {
        assert.equal(clanWordsOk(words), true, words);
    }
});

test("the game's own Discord may be linked", () => {
    assert.equal(clanWordsOk(`Talk with us: ${DISCORD_INVITE}`), true);
    assert.equal(clanWordsOk(DISCORD_INVITE.replace('https://', '')), true);
    assert.equal(clanWordsOk(DISCORD_INVITE.replace(/.$/, c => (c === 'g' ? 'h' : 'g'))), false, 'another invite is not it');
});

test('links, handles, invite codes and contact details are refused, spelled out or spaced out too', () => {
    for (const words of ['https://example.com', 'http://x.y', 'hxxp://evil', 'www.example.com', 'www example', 'example.com', 'EXAMPLE.COM/join', 'discord.gg/abc', 'Discord.com/invite/abc',
        't.me/abc', 'bit.ly/x', 'wa.me/123', 'youtu.be/x', 'discord . gg / abc', 'discord gg abc', 'discord dot gg slash abc', 'example dot com', 'example[.]com', 'example(.)com',
        'example (dot) com', 'example . com', 'example,com', 'ｄｉｓｃｏｒｄ．ｇｇ/abc', 'disc\u200bord.gg/abc', '@someone', 'add @someone now', 'me@mail.com', 'someone#1234',
        'snap: someone', 'Snapchat: someone', 'insta: someone', 'ig=someone', 'tg: someone', 'telegram: someone', 'kik: someone', 'whatsapp: someone', 'discord: someone', 'discord name: someone',
        'mail: someone', 'dm me', 'DM us for an invite', 'pm me', 'message me', 'add me on anything', 'find us on anything', 'contact us at anything', 'invite code x7Fg2k', 'join link in bio', 'code: x7Fg2k',
        'call 0532 123 45 67', '+90 532 123 4567', '5321234567']) {
        assert.equal(clanWordsOk(words), false, words);
    }
});
