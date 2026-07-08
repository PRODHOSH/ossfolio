import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// If variables are missing (like during a CI build), export a dummy mock object 
// to prevent crashing. At runtime in production, it will use the real Upstash instance.
export const redis = url && token 
  ? new Redis({ url, token }) 
  : ({
      get: async () => null,
      set: async () => "OK",
    } as unknown as Redis);