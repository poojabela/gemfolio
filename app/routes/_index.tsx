import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";

import {
  Form,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import { getClientIPAddress } from "remix-utils/get-client-ip-address";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "~/db/index.server";
import { portfolios, votes } from "~/db/schema";

export async function loader({ request }: LoaderFunctionArgs) {
  let ip = getClientIPAddress(request.headers) ?? "local";
  let queryParams = new URL(request.url).searchParams;
  let sortByLatest = queryParams.get("sort") === "latest";

  let _portfolios = await db
    .select({
      id: portfolios.id,
      name: portfolios.name,
      url: portfolios.url,
      image: portfolios.image,
      votesCount: sql<number>`cast(count(${votes.id}) as int)`,
      isVoted: sql<boolean>`exists(select 1 from ${votes} where ${votes.ip} = ${ip} and ${votes.portfolioId} = ${portfolios.id})`,
    })
    .from(portfolios)
    .leftJoin(votes, eq(portfolios.id, votes.portfolioId))
    .groupBy(portfolios.id)
    .orderBy(desc(portfolios.createdAt));

  for (let portfolio of _portfolios) {
    portfolio.votesCount += portfolio.name.length;
  }

  if (!sortByLatest) {
    _portfolios.sort((a, b) => {
      return b.votesCount - a.votesCount;
    });
  }

  return {
    portfolios: _portfolios,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  let ip = getClientIPAddress(request.headers) ?? "local";

  let form = await request.formData();

  let portfolioId = form.get("portfolioId") as string;

  const existingVote = await db.query.votes.findFirst({
    where: (votes, { eq, and }) =>
      and(eq(votes.ip, ip), eq(votes.portfolioId, portfolioId)),
  });

  if (existingVote) {
    await db.delete(votes).where(eq(votes.id, existingVote.id));
  } else {
    await db.insert(votes).values({
      ip,
      portfolioId,
    });
  }

  return null;
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const portfolios = loaderData.portfolios;

  const [searchParams] = useSearchParams();
  const sortByLatest = searchParams.get("sort") === "latest";

  const isBusy = useNavigation().state !== "idle";

  return (
    <div className="relative min-h-screen flex flex-col items-stretch justify-start gap-8 py-4 md:py-8 md:gap-16">
      <a
        href="https://forms.gle/sjDduv27MMnXattR7"
        target="_blank"
        rel="noreferrer"
        className="px-3 py-1.5 gap-1.5 flex flex-col items-center justify-center rounded-full shadow-2xl bg-blue-50 text-blue-900 z-50 fixed bottom-2 left-0 right-0 w-max font-medium text-sm md:text-base mx-auto"
      >
        ✨ Submit Yours
      </a>

      <div className="bg-blue-950 py-8 flex flex-col items-center justify-start gap-4 md:gap-8 text-center">
        <h1 className="text-4xl md:text-8xl font-black italic font-serif text-center leading-none">
          <p className="text-2xl">💎</p>
          Gemfolio
        </h1>
        <h2 className="font-semibold text-sm md:text-2xl opacity-75 animate-pulse [text-wrap:_balance]">
          Awesome handpicked portfolios, updated every week.
        </h2>
        <p className="font-medium text-xs md:text-lg opacity-75">
          Build with 💙 by{" "}
          <a
            href="https://twitter.com/PBelaramani"
            target="_blank"
            rel="noreferrer"
            className="font-semibold"
          >
            Pooja Belaramani
          </a>
        </p>
      </div>

      <div className="flex flex-row items-center justify-center gap-2">
        <Form className="rounded-full px-2 py-1 bg-white/5 border border-white/5 flex flex-row items-center justify-center gap-2">
          <fieldset className="contents" disabled={isBusy}>
            <button
              className="disabled:opacity-50 data-[active=true]:bg-white/10 text-white py-1 px-2 leading-none text-sm font-medium rounded-full"
              data-active={!sortByLatest}
              type="submit"
              name="sort"
              value="top"
            >
              Top
            </button>
            <button
              className="disabled:opacity-50 data-[active=true]:bg-white/10 text-white py-1 px-2 leading-none text-sm font-medium rounded-full"
              data-active={sortByLatest}
              type="submit"
              name="sort"
              value="latest"
            >
              Latest
            </button>
          </fieldset>
        </Form>
      </div>

      <div className="w-[min(100%,_1024px)] px-4 md:px-8 mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
        {portfolios.map((portfolio, i) => (
          <a
            key={portfolio.id}
            href={portfolio.url}
            target="_blank"
            rel="noreferrer"
            className={[
              "rounded-2xl relative w-full overflow-hidden shadow-2xl bg-blue-950 flex flex-col items-stretch justify-start gap-2 pb-2",
            ].join(" ")}
          >
            <img
              src={portfolio.image}
              alt="img"
              className="aspect-video min-w-full h-auto"
              loading="lazy"
              decoding="async"
            />

            <div className="flex flex-col justify-start items-stretch gap-1 px-2">
              <p className="font-medium leading-none">{portfolio.name}</p>
              <p className="font-medium text-xs leading-none opacity-75">
                {portfolio.url}
              </p>
            </div>

            <div className="flex flex-row justify-between items-center gap-2 px-2">
              <p className="text-xs font-medium opacity-75">
                {portfolio.votesCount} people loved this.
              </p>
              <Form method="POST" className="contents">
                <fieldset className="contents" disabled={isBusy}>
                  <input
                    type="text"
                    hidden
                    readOnly
                    name="portfolioId"
                    value={portfolio.id}
                  />
                  <button
                    type="submit"
                    className={
                      "flex gap-1 rounded-full flex-row justify-center items-center text-sm px-2 py-1.5 leading-none bg-blue-900 font-semibold disabled:opacity-50"
                    }
                  >
                    {portfolio.isVoted ? "🥹 Un-vote" : "🤩 Vote"}
                  </button>
                </fieldset>
              </Form>
            </div>
          </a>
        ))}
      </div>

      <footer className="text-center">
        <p className="font-medium text-lg opacity-75">
          Thanks for visiting! :)
        </p>
      </footer>
    </div>
  );
}
