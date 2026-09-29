// In-memory implementation of api/store.js for the API tests. Same functions, same return shapes,
// and the same unique-constraint errors (code 23505) as Postgres, so routes can be tested without a
// database. tools/api-postgres-check.cjs runs the real SQL against a real Postgres.

function createMemoryStore() {
    const db = { users: [], clans: [], members: [], bosses: [], attacks: [], rewards: [], snapshots: [] };
    let seq = { users: 0, clans: 0, attacks: 0, rewards: 0 };
    const unique = () => { const err = new Error('duplicate key value violates unique constraint'); err.code = '23505'; return err; };

    const store = {
        db,
        async ensureSchema() {},

        async createUser(username, hash) {
            if (db.users.some(u => u.username === username)) throw unique();
            const row = { id: ++seq.users, username, password_hash: hash, game_state: null, last_saved: 0, flags: '[]', optIn: false };
            db.users.push(row);
            return row.id;
        },
        async findUserByName(username) {
            const u = db.users.find(x => x.username === username);
            return u ? { id: u.id, username: u.username, password_hash: u.password_hash } : null;
        },
        async getSave(userId) {
            const u = db.users.find(x => x.id === userId);
            return u ? { state: u.game_state, lastSaved: u.last_saved, flags: u.flags, optIn: u.optIn } : null;
        },
        async putSave(userId, stateJson, savedAt, flagsJson) {
            const u = db.users.find(x => x.id === userId);
            if (u) Object.assign(u, { game_state: stateJson, last_saved: savedAt, flags: flagsJson });
        },
        async setOptIn(userId, optIn) {
            const u = db.users.find(x => x.id === userId);
            if (u) u.optIn = !!optIn;
        },
        async optedInSaves() {
            return db.users.filter(u => u.optIn && u.game_state).map(u => ({ userId: u.id, username: u.username, state: u.game_state, flags: u.flags }));
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
            db.attacks = db.attacks.filter(a => a.clanId !== clanId);
            db.clans = db.clans.filter(c => c.id !== clanId);
        },
        async membershipOf(userId) {
            const m = db.members.find(x => x.userId === userId);
            return m ? { clanId: m.clanId, joinedAt: m.joinedAt } : null;
        },
        async addMember(clanId, userId, now) {
            if (db.members.some(m => m.userId === userId)) throw unique();
            db.members.push({ userId, clanId, joinedAt: now });
        },
        async removeMember(userId) {
            db.members = db.members.filter(m => m.userId !== userId);
        },
        async clanMembers(clanId) {
            return db.members.filter(m => m.clanId === clanId)
                .sort((a, b) => a.joinedAt - b.joinedAt || a.userId - b.userId)
                .map(m => {
                    const u = db.users.find(x => x.id === m.userId);
                    return { userId: u.id, username: u.username, state: u.game_state, flags: u.flags, joinedAt: m.joinedAt };
                });
        },

        async getBoss(clanId, week) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week);
            return b ? { ...b } : null;
        },
        async createBoss(clanId, week, maxHp) {
            if (!db.bosses.some(x => x.clanId === clanId && x.week === week)) {
                db.bosses.push({ clanId, week, maxHp, hp: maxHp, killedAt: 0, lastHitUser: null, settled: false });
            }
            return store.getBoss(clanId, week);
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
        async markSettled(clanId, week) {
            const b = db.bosses.find(x => x.clanId === clanId && x.week === week);
            if (b) b.settled = true;
        },
        async recordAttack({ clanId, userId, week, day, slot, damage, now }) {
            if (db.attacks.some(a => a.userId === userId && a.day === day && a.slot === slot)) throw unique();
            db.attacks.push({ id: ++seq.attacks, clanId, userId, week, day, slot, damage, at: now });
        },
        async attacksToday(userId, day) {
            return db.attacks.filter(a => a.userId === userId && a.day === day).length;
        },
        async weeklyDamage(clanId, week) {
            const byUser = new Map();
            for (const a of db.attacks.filter(x => x.clanId === clanId && x.week === week)) {
                const row = byUser.get(a.userId) || { userId: a.userId, username: db.users.find(u => u.id === a.userId).username, damage: 0, attacks: 0 };
                row.damage += a.damage;
                row.attacks += 1;
                byUser.set(a.userId, row);
            }
            return [...byUser.values()].sort((a, b) => b.damage - a.damage);
        },

        async addReward(userId, kind, payloadJson, now) {
            db.rewards.push({ id: ++seq.rewards, userId, kind, payload: payloadJson, createdAt: now, claimedAt: 0 });
        },
        async unclaimedRewards(userId) {
            return db.rewards.filter(r => r.userId === userId && !r.claimedAt).map(r => ({ id: r.id, kind: r.kind, payload: r.payload, createdAt: r.createdAt }));
        },
        async claimRewards(userId, ids, now) {
            const claimed = [];
            for (const id of ids) {
                const r = db.rewards.find(x => x.id === id && x.userId === userId && !x.claimedAt);
                if (r) { r.claimedAt = now; claimed.push({ id: r.id, kind: r.kind, payload: r.payload }); }
            }
            return claimed;
        }
    };
    return store;
}

module.exports = { createMemoryStore };
