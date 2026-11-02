import { BONUSES, ENTRY_FEE, PRICE_BY_SEED, ROUNDS } from "@/lib/pool/rules";
import { pct } from "@/lib/format";

export default function RulesPage() {
  return (
    <article className="max-w-3xl space-y-6 leading-relaxed">
      <h1 className="text-2xl font-bold">How the pool works</h1>
      <p>
        This isn’t a bracket contest. You buy <strong>shares</strong> in the teams you think will go far, then root for
        them to win and for everyone else’s teams to lose, because fewer winning shares means a bigger payout per share.
      </p>

      <section>
        <h2 className="text-lg font-semibold">Share prices</h2>
        <p className="mt-1 text-sm text-muted">Set by seed. Buy as many shares of as many teams as you like.</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5 text-sm sm:grid-cols-8">
          {PRICE_BY_SEED.map((price, i) => (
            <div key={i} className="rounded border border-line bg-surface px-2 py-1 text-center tabular">
              <div className="text-xs text-muted">{i + 1} seed</div>
              <div className="font-semibold">${price}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm">
          First Four games count as one team: buy that slot and you own whichever team wins its way into the Round of 64.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Payouts</h2>
        <p className="mt-1">
          The pot is every share purchase added together. Each round gets a slice, split evenly across every share whose
          team won a game that round:
        </p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {ROUNDS.map((r) => (
            <li key={r.round} className="flex justify-between rounded bg-surface px-3 py-1.5">
              <span>{r.name}</span>
              <span className="font-semibold">{pct(r.potPct)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-muted">
          Example: a $2,500 pot puts $625 in the Round of 64. If 100 shares win their game, each earns $6.25.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">${ENTRY_FEE} entry fee and bonuses</h2>
        <p className="mt-1">
          Every entry pays ${ENTRY_FEE}. Those fees fund bonuses for the lowest-seeded team that someone in the pool owns
          shares of. If the lowest seed has no owners, the bonus goes to the next-lowest seed that does. Ties split per share.
        </p>
        <ul className="mt-2 grid gap-1 text-sm">
          {BONUSES.map((b) => (
            <li key={b.round} className="flex justify-between rounded bg-surface px-3 py-1.5">
              <span>{b.name}</span>
              <span className="font-semibold">{pct(b.feePct)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Deadlines and settling up</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Edit your picks any time until tip-off of the first Round of 64 game. First Four games don’t count.</li>
          <li>Everyone’s picks are visible to everyone.</li>
          <li>Each round’s dividends post once every game in that round is final.</li>
          <li>Nothing is collected up front. After the championship, pay or get paid via Venmo or PayPal.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Tips</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Round of 64 shares usually pay only $4–5, so one win only breaks even for 13 seeds and below.</li>
          <li>Reaching the Sweet 16 is usually worth about $20 a share, which is break-even for any team.</li>
          <li>Bonuses can make low seeds worth a look.</li>
          <li>Winners usually have several teams alive past the Sweet 16.</li>
        </ul>
      </section>
    </article>
  );
}
