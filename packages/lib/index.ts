declare const Deno: any;

export const readEnv = (env: string): string | undefined => {
  if (typeof process !== "undefined") {
    return process.env?.[env]?.trim() ?? undefined;
  }
  if (typeof Deno !== "undefined") {
    return Deno.env?.get?.(env)?.trim();
  }
  return undefined;
};
