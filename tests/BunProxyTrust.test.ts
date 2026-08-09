import { describe, expect, it } from "bun:test";
import { BunKitServer } from "../src/BunKitServer";

type TrustProxy =
  number | string[] | ((ip: string | undefined, hop: number) => boolean);

type ResolveIpInput = {
  remoteAddress?: string;
  forwardedFor?: string;
  realIp?: string;
  trustProxy?: TrustProxy;
};

async function resolveIp(input: ResolveIpInput): Promise<string | undefined> {
  const server = new BunKitServer(0);
  const app = server.getApp() as any;

  if (input.trustProxy !== undefined) {
    app.set("trustProxy", input.trustProxy);
  }

  app.use((req: any, res: any) => res.json({ ip: req.ip }));
  await server.initialize();

  const headers = new Headers();
  if (input.forwardedFor !== undefined) {
    headers.set("x-forwarded-for", input.forwardedFor);
  }
  if (input.realIp !== undefined) {
    headers.set("x-real-ip", input.realIp);
  }

  const response = await app.createFetchHandler()(
    new Request("http://localhost/ip", { headers }),
    {
      requestIP: () =>
        input.remoteAddress === undefined
          ? null
          : { address: input.remoteAddress },
    },
  );
  const body = (await response.json()) as { ip?: string };
  return body.ip;
}

describe("Bun proxy trust", () => {
  it("ignores forwarded headers when the immediate proxy is not trusted", async () => {
    await expect(
      resolveIp({
        remoteAddress: "169.254.1.1",
        forwardedFor: "54.233.45.238",
        trustProxy: ["127.0.0.1/8"],
      }),
    ).resolves.toBe("169.254.1.1");
  });

  it("resolves the client behind one trusted proxy hop", async () => {
    await expect(
      resolveIp({
        remoteAddress: "169.254.1.1",
        forwardedFor: "54.233.45.238",
        trustProxy: 1,
      }),
    ).resolves.toBe("54.233.45.238");
  });

  it("does not accept a spoofed leftmost forwarded address", async () => {
    await expect(
      resolveIp({
        remoteAddress: "169.254.1.1",
        forwardedFor: "52.67.12.206, 203.0.113.50",
        trustProxy: 1,
      }),
    ).resolves.toBe("203.0.113.50");
  });

  it("walks a CIDR-trusted chain until the first untrusted address", async () => {
    await expect(
      resolveIp({
        remoteAddress: "10.0.0.3",
        forwardedFor: "198.51.100.4, 10.0.0.1, 10.0.0.2",
        trustProxy: ["10.0.0.0/8"],
      }),
    ).resolves.toBe("198.51.100.4");
  });

  it("passes the hop index to custom trust functions", async () => {
    await expect(
      resolveIp({
        remoteAddress: "169.254.1.1",
        forwardedFor: "52.67.12.206, 203.0.113.50",
        trustProxy: (_ip, hop) => hop < 1,
      }),
    ).resolves.toBe("203.0.113.50");
  });

  it("normalizes IPv4-mapped IPv6 proxy addresses", async () => {
    await expect(
      resolveIp({ remoteAddress: "::ffff:127.0.0.1" }),
    ).resolves.toBe("127.0.0.1");

    await expect(
      resolveIp({
        remoteAddress: "::ffff:127.0.0.1",
        forwardedFor: "54.233.45.238",
        trustProxy: ["127.0.0.0/8"],
      }),
    ).resolves.toBe("54.233.45.238");
  });

  it("supports IPv6 proxy CIDRs", async () => {
    await expect(
      resolveIp({
        remoteAddress: "2001:db8::2",
        forwardedFor: "2001:4860:4860::8888",
        trustProxy: ["2001:db8::/32"],
      }),
    ).resolves.toBe("2001:4860:4860::8888");
  });

  it("fails closed when the forwarded chain is malformed", async () => {
    await expect(
      resolveIp({
        remoteAddress: "169.254.1.1",
        forwardedFor: "52.67.12.206, not-an-ip",
        trustProxy: 1,
      }),
    ).resolves.toBe("169.254.1.1");
  });

  it("uses x-real-ip only through a trusted proxy", async () => {
    await expect(
      resolveIp({
        remoteAddress: "203.0.113.10",
        realIp: "52.67.12.206",
        trustProxy: ["127.0.0.0/8"],
      }),
    ).resolves.toBe("203.0.113.10");

    await expect(
      resolveIp({
        remoteAddress: "127.0.0.1",
        realIp: "198.51.100.7",
        trustProxy: 1,
      }),
    ).resolves.toBe("198.51.100.7");
  });

  it("rejects invalid trusted proxy hop counts", async () => {
    await expect(
      resolveIp({ remoteAddress: "127.0.0.1", trustProxy: -1 }),
    ).rejects.toThrow("Invalid trustProxy hop count");
  });
});
