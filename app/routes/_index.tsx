import { ChevronRightIcon } from "@heroicons/react/24/solid";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { getClientIPAddress } from "remix-utils/get-client-ip-address";
import { db } from "~/db/index.server";
import { votes } from "~/db/schema";

export async function loader({ request }: LoaderFunctionArgs) {
  const data = await db.query.portfolios.findMany({
    with: {
      votes: true,
    },
  });

  return { data };
}

export async function action({ request }: ActionFunctionArgs) {
  let ip = getClientIPAddress(request.headers) ?? "IP";
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
  const data = loaderData.data;

  return (
    <div className="p-4">
      <div className="mb-20">
        <h1 className="bg-clip-text text-4xl font-bold mb-2 font-serif text-center">
          GemFolio
        </h1>
        {/* <h4 className="text-2xl text-gray-400">
        Where Creativity Meets Showcase: Explore the Finest Portfolios Online!
      </h4> */}
      </div>

      <div className="grid grid-cols-4 gap-5">
        {data.map((d, i) => (
          <div className="relative w-full overflow-hidden rounded-lg" key={i}>
            <Link to={d.url} target="_blank">
              <div className="">
                <div className="h-72 w-full relative">
                  <img
                    src={d.image}
                    alt="img"
                    className="rounded-lg absolute h-full w-full"
                  />
                  <div className="absolute z-10 bg-black/10 w-full h-20"></div>
                </div>
              </div>
            </Link>
            <div className="flex justify-between items-center">
              <p className="font-medium text-neutral-700 ">{d.name}</p>
              <Form method="POST">
                <input
                  type="text"
                  hidden
                  readOnly
                  name="portfolioId"
                  value={d.id}
                />
                <button
                  type="submit"
                  className={`flex gap-2 items-center text-rose-700 font-semibold`}
                >
                  <ChevronRightIcon
                    height={15}
                    width={15}
                    className="stroke-rose-700 stroke-2 -rotate-90"
                  />
                  {d.votes.length}
                </button>
              </Form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
