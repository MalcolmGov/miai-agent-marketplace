import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { signSession, readConsumerSession, signLoginState, readLoginState, SESSION_COOKIE, LOGIN_STATE_COOKIE } from "../src/lib/consumer-session.ts";
import { signBusinessSession, readBusinessSession, signBusinessLoginState, readBusinessLoginState, BUSINESS_SESSION_COOKIE, BUSINESS_LOGIN_STATE_COOKIE } from "../src/lib/business-session.ts";

const secret = "session-boundary-test-secret-0123456789";
const saved = process.env.MIAI_SESSION_SECRET;
before(() => { process.env.MIAI_SESSION_SECRET = secret; });
after(() => { if (saved === undefined) delete process.env.MIAI_SESSION_SECRET; else process.env.MIAI_SESSION_SECRET = saved; });
const req = (name, token) => new Request("https://app.test/api/rent", { headers: { cookie: `${name}=${token}` } });
const identity = { sub: "uninvited-consumer", email: "outsider@example.test" };
const state = { state: "s", nonce: "n", verifier: "v", returnTo: "/me" };

test("consumer tokens cannot become business sessions, or vice versa", async () => {
  const consumer = await signSession(identity);
  const business = await signBusinessSession(identity);
  assert.equal(await readBusinessSession(req(BUSINESS_SESSION_COOKIE, consumer)), null);
  assert.equal(await readConsumerSession(req(SESSION_COOKIE, business)), null);
  assert.equal((await readConsumerSession(req(SESSION_COOKIE, consumer))).sub, identity.sub);
  assert.equal((await readBusinessSession(req(BUSINESS_SESSION_COOKIE, business))).sub, identity.sub);
});

test("login state is bound to its own surface and cannot be used as a session", async () => {
  const consumer = await signLoginState(state);
  const business = await signBusinessLoginState(state);
  assert.equal(await readBusinessLoginState(req(BUSINESS_LOGIN_STATE_COOKIE, consumer)), null);
  assert.equal(await readLoginState(req(LOGIN_STATE_COOKIE, business)), null);
  assert.equal(await readBusinessSession(req(BUSINESS_SESSION_COOKIE, business)), null);
  assert.equal(await readConsumerSession(req(SESSION_COOKIE, consumer)), null);
  assert.deepEqual(await readLoginState(req(LOGIN_STATE_COOKIE, consumer)), state);
  assert.deepEqual(await readBusinessLoginState(req(BUSINESS_LOGIN_STATE_COOKIE, business)), state);
});

test("legacy unscoped tokens, expired sessions and missing expiry are rejected", async () => {
  const key = new TextEncoder().encode(secret);
  const legacy = await new SignJWT({ email: identity.email }).setSubject(identity.sub).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(key);
  assert.equal(await readConsumerSession(req(SESSION_COOKIE, legacy)), null);
  assert.equal(await readBusinessSession(req(BUSINESS_SESSION_COOKIE, legacy)), null);
  const expired = await new SignJWT({}).setSubject(identity.sub).setAudience("miai:business:session").setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(1).sign(key);
  assert.equal(await readBusinessSession(req(BUSINESS_SESSION_COOKIE, expired)), null);
  const immortal = await new SignJWT({}).setSubject(identity.sub).setAudience("miai:business:session").setProtectedHeader({ alg: "HS256" }).setIssuedAt().sign(key);
  assert.equal(await readBusinessSession(req(BUSINESS_SESSION_COOKIE, immortal)), null);
});

test("malformed percent-encoded cookies fail closed rather than throwing", async () => {
  for (const [read, name] of [[readConsumerSession, SESSION_COOKIE], [readBusinessSession, BUSINESS_SESSION_COOKIE], [readLoginState, LOGIN_STATE_COOKIE], [readBusinessLoginState, BUSINESS_LOGIN_STATE_COOKIE]]) {
    assert.equal(await read(req(name, "%E0%A4%A")), null);
  }
});
