import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/trpc";

export const trpc = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: apiUrl,
    }),
  ],
});