import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProfilePayload, normalizeUrl, normalizeWorkspacePayload } from "../src/lib/settings.ts";

test("normalizeUrl accepts relative and http urls", () => {
  assert.equal(normalizeUrl("/assets/logo.png"), "/assets/logo.png");
  assert.equal(normalizeUrl("https://cdn.synorq.com/logo.png"), "https://cdn.synorq.com/logo.png");
});

test("normalizeUrl rejects unsupported protocols", () => {
  assert.equal(normalizeUrl("ftp://cdn.synorq.com/logo.png"), undefined);
  assert.equal(normalizeUrl("notaurl"), undefined);
});

test("normalizeWorkspacePayload returns sanitized values", () => {
  const result = normalizeWorkspacePayload(
    {
      name: "  Synorq Ops  ",
      description: "  Delivery control workspace  ",
      logoUrl: "https://cdn.synorq.com/workspace.png",
    },
    {
      description: null,
      logoUrl: null,
    }
  );

  assert.deepEqual(result, {
    data: {
      name: "Synorq Ops",
      description: "Delivery control workspace",
      logoUrl: "https://cdn.synorq.com/workspace.png",
    },
  });
});

test("normalizeWorkspacePayload surfaces validation errors", () => {
  assert.deepEqual(
    normalizeWorkspacePayload(
      { name: "   ", logoUrl: "https://cdn.synorq.com/workspace.png" },
      { description: null, logoUrl: null }
    ),
    { error: "Workspace adı zorunludur." }
  );

  assert.deepEqual(
    normalizeWorkspacePayload(
      { name: "Synorq", logoUrl: "ftp://cdn.synorq.com/workspace.png" },
      { description: null, logoUrl: null }
    ),
    { error: "Logo URL gecersiz." }
  );
});

test("normalizeProfilePayload validates name and image", () => {
  assert.deepEqual(normalizeProfilePayload({ name: " Tarik ", image: "/avatars/tarik.png" }), {
    data: {
      name: "Tarik",
      image: "/avatars/tarik.png",
    },
  });

  assert.deepEqual(normalizeProfilePayload({ name: "", image: null }), {
    error: "Ad alanı zorunludur.",
  });

  assert.deepEqual(normalizeProfilePayload({ name: "Tarik", image: "ftp://avatar" }), {
    error: "Avatar URL gecersiz.",
  });
});
