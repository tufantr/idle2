// In-memory implementation of api/store.js for the API tests. Same functions, same return shapes,
// and the same unique-constraint errors (code 23505) as Postgres, so routes can be tested without a
// database. With API_TEST_DATABASE_URL set, test/api.test.cjs runs the real SQL against Postgres instead.

function createMemoryStore() {
    const db = { users: [], clans: [], members: [], bosses: [], shares: [], attacks: [], rewards: [], snapshots: [], auth: new Map(), charges: new Map(), codes: [] };
    let seq = { users: 0, clans: 0, attacks: 0, rewards: 0, codes: 0 };
    const unique = (constraint = null) => { const err = new Error('duplicate key value violates unique constraint'); err.code = '23505'; err.constraint = constraint; return err; };

    const store = {
        db,
        async ensureSchema() {},
        async ping() {},

        async createUser(username, hash, email = null) {
            if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) throw unique('users_username_lower');
            if (email && db.users.some(u => (u.email || '').toLowerCase() === email.toLowerCase())) throw unique('users_email_lower');
            const row = { id: ++seq.users, username, password_hash: hash, email, email_verified_at: 0, game_state: null, last_saved: 0, flags: '[]', optIn: false, metrics: null };
            db.users.push(row);
            return row.id;
        },
        async findUserByName(username) {
            const same = db.users.filter(x => x.username.toLowerCase() === username.toLowerCase())
                .sort((a, b) => (b.username === username) - (a.username === username) || a.id - b.id);
            const u = same[0];
            return u ? { id: u.id, username: u.username, password_hash: u.password_hash, email: u.email || null, emailVerifiedAt: u.email_verified_at || 0 } : null;
        },
        async findUserByEmail(email) {
            const u = db.users.find(x => (x.email || '').toLowerCase() === String(email).toLowerCase());
            return u ? { id: u.id, username: u.username, password_hash: u.password_hash, email: u.email || null, emailVerifiedAt: u.email_verified_at || 0 } : null;
        },
        async setEmailVerified(userId, now) { const u = db.users.find(x => x.id === userId); if (u) u.email_verified_at = now; },
        async setPassword(userId, hash) { const u = db.users.find(x => x.id === userId); if (u) u.password_hash = hash; },
        async putEmailCode(userId, purpose, codeHash, expiresAt, now) {
            db.codes = db.codes.filter(c => !(c.userId === userId && c.purpose === purpose));
            db.codes.push({ id: ++seq.codes, userId, purpose, codeHash, expiresAt, attempts: 0, createdAt: now });
        },
        async getEmailCode(userId, purpose) {
            const c = db.codes.filter(x => x.userId === userId && x.purpose === purpose).sort((a, b) => b.id - a.id)[0];
            return c ? { id: c.id, codeHash: c.codeHash, expiresAt: c.expiresAt, attempts: c.attempts, createdAt: c.createdAt } : null;
        },
        async bumpEmailCodeAttempts(id) { const c = db.codes.find(x => x.id === id); if (!c) return Infinity; c.attempts += 1; return c.attempts; },
        async expireEmailCode(id) { const c = db.codes.find(x => x.id === id); if (c) c.expiresAt = 0; },
        async deleteEmailCodes(userId, purpose) { db.codes = db.codes.filter(c => !(c.userId === userId && c.purpose === purpose)); },
        async userNameOf(userId) {
            return db.users.find(x => x.id === userId)?.username ?? null;
        },
        async getSave(userId) {
            const u = db.users.find(x => x.id === userId);
            return u ? { state: u.game_state, lastSaved: u.last_saved, flags: u.flags, optIn: u.optIn, metrics: u.metrics, verifiedAt: u.email_verified_at || 0 } : null;
        },
        async putSave(userId, stateJson, savedAt, flagsJson, metricsJson, base = null) {
            const u = db.users.find(x => x.id === userId);
            if (!u || (base !== null && (u.last_saved || 0) !== base)) return false;
            Object.assign(u, { game_state: stateJson, last_saved: savedAt, flags: flagsJson, metrics: metricsJson });
            return true;
        },
        async setOptIn(userId, optIn) {
            const u = db.users.find(x => x.id === userId);
            if (u) u.optIn = !!optIn;
        },
        async leaderboardRows(week) {
            return db.users.filter(u => u.optIn && u.metrics).map(u => ({
                userId: u.id, username: u.username, flags: u.flags, metrics: u.metrics,
                weekMetrics: db.snapshots.find(sn => sn.userId === u.id && sn.week === week)?.metrics || null
            }));
        },

        async getSnapshot(userId, week) {
            return db.snapshots.find(s => s.userId === userId && s.week === week)?.metrics || null;
        },
        async putSnapshotIfMissing(userId, week, metricsJson) {
            if (!db.snapshots.some(s => s.userId === userId && s.week === week)) db.snapshots.push({ userId, week, metrics: metricsJson });
        },

        async listClans(search, limit) {
            const q = (search || '').toLowerCase();
            return db.clans
                .filter(c => c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q))
                .map(c => ({ id: c.id, name: c.name, tag: c.tag, description: c.description, lookingFor: c.lookingFor, members: db.members.filter(m => m.clanId === c.id).length }))
                .sort((a, b) => b.members - a.members || a.id - b.id)
                .slice(0, limit);
        },
        async createClan({ name, tag, description, lookingFor, ownerId, now }) {
            if (db.clans.some(c => c.name === name)) throw unique();
            const clan = { id: ++seq.clans, name, tag, description, lookingFor, ownerId, createdAt: now };
            db.clans.push(clan);
            return clan.id;
        },
        async getClan(clanId) {
            const c = db.clans.find(x => x.id === clanId);
            return c ? { ...c } : null;
        },
        async setClanOwner(clanId, ownerId) {
            const c = db.clans.find(x => x.id === clanId);
            if (c) c.ownerId = ownerId;
        },
        async deleteClan(clanId) {
            db.bosses = db.bosses.filter(b => b.clanId !== clanId);
            db.shares = db.shares.filter(s => s.clanId !== clanId);
            db.clans = db.clans.filter(c => c.id !== clanId);   // the attacks stay: they count a player's three a day
        },
        async membershipOf(userId) {
            const m = db.members.find(x => x.userId === userId);
            return m ? { clanId: m.clanId, joinedAt: m.joinedAt } : null;
        },
        async addMember(clanId, userId, now, maxMembers) {
            if (db.members.some(m => m.userId === userId)) throw unique('clan_members_pkey');
            const taken = new Set(db.members.filter(m => m.clanId === clanId).map(m => m.slot));
            if (taken.size >= maxMembers) return false;
            let slot = 1;
            while (taken.has(slot)) slot++;
            db.members.push({ userId, clanId, joinedAt: now, slot });
            return true;
        },
        async removeMember(userId) {
            db.members = db.members.filter(m => m.userId !== userId);
        },
        async clanMembers(clanId) {
            return db.members.filter(m => m.clanId === clanId)
                .sort((a, b) => a.joinedAt - b.joinedAt || a.userId - b.userId)
                .map(m => {
                    const u = db.users.find(x => x.id === m.userId);
                    return { userId: u.id, username: u.username, metrics: u.metrics, flags: u.flags, lastSaved: u.last_saved, joinedAt: m.joinedAt };
                });
        },

        async getBoss(clanId, week) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week);
            return b ? { ...b } : null;
        },
        async createBoss(clanId, week, maxHp, shares = [], unit = 0, day = 0) {
            if (!db.bosses.some(x => x.clanId === clanId && x.week === week)) {
                db.bosses.push({ clanId, week, level: 1, maxHp, hp: maxHp, killedAt: 0, lastHitUser: null, settled: false, killPaid: false, unit, unitDay: day });
                for (const s of shares) db.shares.push({ clanId, week, userId: s.userId, share: s.share });
            }
            return store.getBoss(clanId, week);
        },
        async bossShares(clanId, week) {
            return db.shares.filter(s => s.clanId === clanId && s.week === week).map(s => ({ userId: s.userId, share: s.share }));
        },
        async resizeBoss(clanId, week, maxHp) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week && x.hp > 0);
            if (b) { b.hp = Math.max(1, b.hp + (maxHp - b.maxHp)); b.maxHp = maxHp; }
        },
        async nextLevel(clanId, week, level, killedAt, maxHp) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week && x.level === level && x.killedAt === killedAt && x.killPaid);
            if (!b) return false;
            Object.assign(b, { level: level + 1, maxHp, hp: maxHp, killedAt: 0, lastHitUser: null, killPaid: false });
            return true;
        },
        async markKillPaid(clanId, week) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week);
            if (b) b.killPaid = true;
        },
        async takeAttempt(key, now, windowMs) {
            const r = db.auth.get(key);
            const next = r && now - r.since < windowMs ? { count: r.count + 1, since: r.since } : { count: 1, since: now };
            db.auth.set(key, next);
            return next.count;
        },
        async refundAttempt(key) {
            const r = db.auth.get(key);
            if (r) r.count = Math.max(0, r.count - 1);
        },
        async authFailures(key, now, windowMs) {
            const r = db.auth.get(key);
            return r && now - r.since < windowMs ? r.count : 0;
        },
        async noteAuthFailure(key, now, windowMs) {
            const r = db.auth.get(key);
            db.auth.set(key, r && now - r.since < windowMs ? { count: r.count + 1, since: r.since } : { count: 1, since: now });
        },
        async clearAuthFailures(key) { db.auth.delete(key); },
        async setBossUnit(clanId, week, unit, day = 0) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week);
            if (!b) return;
            if (b.unit > 0) for (const a of db.attacks.filter(x => x.clanId === clanId && x.week === week && (x.dealt === null || x.dealt === undefined))) a.dealt = a.damage / 1000 * b.unit;
            Object.assign(b, { unit, unitDay: day });
        },
        async convertBoss(clanId, week, unit, maxHp, hp, factor) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week && !(x.unit > 0));
            if (!b) return false;
            Object.assign(b, { unit, maxHp, hp });
            for (const a of db.attacks.filter(x => x.clanId === clanId && x.week === week)) a.damage = Math.max(1, Math.round(a.damage * factor));
            return true;
        },
        async damageBoss(clanId, week, damage) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week && x.hp > 0);
            if (!b) return null;
            b.hp = Math.max(0, b.hp - damage);
            return { ...b };
        },
        async markBossKilled(clanId, week, userId, now) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week && x.killedAt === 0 && x.hp === 0);
            if (!b) return false;
            b.killedAt = now;
            b.lastHitUser = userId;
            return true;
        },
        async unsettledBosses(clanId, beforeWeek) {
            return db.bosses.filter(b => b.clanId === clanId && b.week < beforeWeek && !b.settled).map(b => ({ ...b }));
        },
        async claimSettlement(clanId, week) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week && !x.settled);
            if (!b) return false;
            b.settled = true;
            return true;
        },
        async levelFighters(clanId, week, level) {
            return [...new Set(db.attacks.filter(a => a.clanId === clanId && a.week === week && (a.level || 1) === level).map(a => a.userId))];
        },
        async recordAttack({ clanId, userId, week, day, damage, dealt = null, now, fightAt = null, level = 1 }) {
            if (fightAt !== null && db.attacks.some(a => a.userId === userId && a.fightAt === fightAt)) throw unique('clan_attacks_fight');
            const slot = Math.max(0, ...db.attacks.filter(a => a.userId === userId && a.day === day).map(a => a.slot)) + 1;
            db.attacks.push({ id: ++seq.attacks, clanId, userId, week, day, slot, damage, dealt, at: now, fightAt, level });
            return slot;
        },
        async attackByFight(userId, fightAt) {
            const a = db.attacks.find(x => x.userId === userId && x.fightAt === fightAt);
            return a ? { clanId: a.clanId, week: a.week, damage: a.damage, dealt: a.dealt ?? null, at: a.at } : null;
        },
        async deleteAttack(userId, day, slot) {
            db.attacks = db.attacks.filter(a => !(a.userId === userId && a.day === day && a.slot === slot));
        },
        async attacksToday(userId, day) {
            return db.attacks.filter(a => a.userId === userId && a.day === day).length;
        },
        async chargesNow(userId, day, perDay, bank) {
            const row = db.charges.get(userId);
            return row ? Math.min(bank, row.charges + perDay * Math.max(0, day - row.day)) : perDay;
        },
        async spendCharge(userId, day, perDay, bank) {
            const row = db.charges.get(userId) || { charges: perDay, day };
            const waiting = Math.min(bank, row.charges + perDay * Math.max(0, day - row.day));
            if (waiting <= 0) return null;
            db.charges.set(userId, { charges: waiting - 1, day: Math.max(row.day, day) });
            return waiting - 1;
        },
        async refundCharge(userId, bank) {
            const row = db.charges.get(userId);
            if (row) row.charges = Math.min(bank, row.charges + 1);
        },
        async weeklyDamage(clanId, week) {
            const byUser = new Map();
            for (const a of db.attacks.filter(x => x.clanId === clanId && x.week === week)) {
                const row = byUser.get(a.userId) || { userId: a.userId, username: db.users.find(u => u.id === a.userId).username, damage: 0, attacks: 0, dealt: 0, undealt: 0 };
                row.damage += a.damage;
                row.attacks += 1;
                if (a.dealt === null || a.dealt === undefined) row.undealt += a.damage;
                else row.dealt += a.dealt;
                byUser.set(a.userId, row);
            }
            return [...byUser.values()].sort((a, b) => b.damage - a.damage);
        },

        async addReward(userId, kind, payloadJson, now, dedupe = null) {
            if (dedupe && db.rewards.some(r => r.dedupe === dedupe)) return;
            db.rewards.push({ id: ++seq.rewards, userId, kind, payload: payloadJson, createdAt: now, claimedAt: 0, dedupe });
        },
        async unclaimedRewards(userId) {
            return db.rewards.filter(r => r.userId === userId && !r.claimedAt && r.kind !== 'gift').map(r => ({ id: r.id, kind: r.kind, payload: r.payload, createdAt: r.createdAt }));
        },
        async claimRewards(userId, ids, now) {
            const claimed = [];
            for (const id of ids) {
                const r = db.rewards.find(x => x.id === id && x.userId === userId && !x.claimedAt && x.kind !== 'gift');
                if (r) { r.claimedAt = now; claimed.push({ id: r.id, kind: r.kind, payload: r.payload }); }
            }
            return claimed;
        },
        async unclaimedGiftCount(userId) {
            return db.rewards.filter(r => r.userId === userId && r.kind === 'gift' && !r.claimedAt).length;
        },
        async claimGifts(userId, now) {
            const waiting = db.rewards.filter(r => r.userId === userId && r.kind === 'gift' && !r.claimedAt);
            for (const r of waiting) r.claimedAt = now;
            return waiting.map(r => ({ id: r.id, kind: r.kind, payload: r.payload }));
        }
    };
    return store;
}

module.exports = { createMemoryStore };
