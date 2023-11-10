import { Form, Link, useActionData } from "@remix-run/react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import {
  unstable_parseMultipartFormData,
  type ActionFunctionArgs,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
} from "@remix-run/node";
import { db } from "~/db/index.server";
import { portfolios } from "~/db/schema";
import { supabase } from "../../supabase";
import { useGlobalSubmittingState } from "remix-utils/use-global-navigation-state";
import { type MutableRefObject, useEffect, useRef } from "react";

async function uploadToSupabase(
  fileData: AsyncIterable<Uint8Array>,
  fileName: string,
  contentType: string,
) {
  const dataStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of fileData) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  const { data, error } = await supabase.storage
    .from("images")
    .upload(
      `${Date.now()}-${Math.random().toString(32).slice(2)}-${fileName}`,
      dataStream,
      {
        contentType,
      },
    );

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = await supabase.storage.from("images").getPublicUrl(data.path);

  return publicUrl;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await unstable_parseMultipartFormData(
    request,
    unstable_composeUploadHandlers(
      async ({ name, contentType, data, filename }) => {
        if (name !== "img" || !filename) {
          return undefined;
        }

        console.log({
          filename,
          data,
        });

        // Upload the file to Supabase
        const key = await uploadToSupabase(data, filename, contentType);
        return key;
      },
      unstable_createMemoryUploadHandler(),
    ),
  );

  let name = formData.get("name") as string;
  let image = formData.get("img") as Blob | string;
  let url = formData.get("url") as string;
  let email = formData.get("email") as string;

  function isValidUrl(url: string) {
    const urlPattern =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;
    return urlPattern.test(url);
  }

  function isValidEmail(email: string) {
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailPattern.test(email);
  }

  if (!email) {
    return {
      error: "Email is required!",
    };
  } else if (!isValidEmail(email)) {
    return {
      error: "Invalid email!",
    };
  }

  if (name.trim() === "") {
    return {
      error: "Name is required!",
    };
  }

  if (url.trim() === "") {
    return {
      error: "URL is required!",
    };
  } else if (!isValidUrl(url)) {
    return {
      error: "Invalid URL!",
    };
  }

  if (typeof image !== "string") {
    return {
      error: "Image is required!",
    };
  }

  await db.insert(portfolios).values({
    email,
    name,
    url,
    image,
  });

  return null;
};

const Submit = () => {
  const busy = useGlobalSubmittingState().includes("submitting");
  const formRef = useRef() as MutableRefObject<HTMLFormElement>;
  const actionData = useActionData<typeof action>();

  useEffect(() => {
    if (!busy && !actionData?.error) {
      formRef.current.reset();
    }
  }, [busy]);

  return (
    <div className="p-6">
      <Link
        to={"/"}
        className="text-black/50 bg-black/5 rounded-full px-4 py-2 text-md font-semibold flex items-center gap-2 w-max"
      >
        <ArrowLeftIcon height={20} width={20} className="stroke-2" />
        Back
      </Link>
      <div className="max-w-2xl mx-auto mt-14">
        <h3 className="text-2xl font-bold mb-10 text-center">
          Submit Portfolio
        </h3>
        <Form encType="multipart/form-data" method="POST" ref={formRef}>
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-black/5 rounded-md focus:outline-none px-4 py-2 mb-6"
            name="email"
            autoComplete="off"
          />
          <input
            type="text"
            placeholder="Name"
            className="w-full bg-black/5 rounded-md focus:outline-none px-4 py-2 mb-6"
            name="name"
            autoComplete="off"
          />
          <input
            type="url"
            placeholder="Portfolio URL..."
            className="w-full bg-black/5 rounded-md focus:outline-none px-4 py-2 mb-6"
            name="url"
            autoComplete="off"
          />
          <label
            htmlFor="image"
            className="bg-black/5 text-md font-medium px-4 py-2 rounded-md cursor-pointer text-black/30"
          >
            Select Logo
            <input type="file" hidden accept="image/*" id="image" name="img" />
          </label>
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-md font-medium text-lg mt-20 disabled:opacity-50"
            disabled={busy}
          >
            Next
          </button>
        </Form>
      </div>
    </div>
  );
};

export default Submit;
