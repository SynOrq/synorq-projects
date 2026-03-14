import test from "node:test";
import assert from "node:assert/strict";
import {
  createSavedProjectsView,
  normalizeSavedProjectsView,
  resolveProjectFilters,
} from "../src/lib/projects-saved-view.ts";

test("createSavedProjectsView derives a stable saved preset", () => {
  const preset = createSavedProjectsView({
    health: "risk",
    status: "ALL",
    view: "table",
    q: null,
  });

  assert.deepEqual(preset, {
    label: "Riskte olanlar",
    q: null,
    status: "ALL",
    health: "risk",
    view: "table",
  });
});

test("normalizeSavedProjectsView validates saved project preferences", () => {
  assert.equal(normalizeSavedProjectsView({ status: "ACTIVE", health: "risk", view: "cards" }).data?.status, "ACTIVE");
  assert.equal(normalizeSavedProjectsView({ status: "invalid", health: "risk", view: "cards" }).error, "Kaydedilen proje durumu gecersiz.");
});

test("resolveProjectFilters falls back to saved preset when query is empty", () => {
  const filters = resolveProjectFilters(
    {},
    {
      label: "Riskte olanlar",
      q: null,
      status: "ALL",
      health: "risk",
      view: "table",
    }
  );

  assert.deepEqual(filters, {
    q: "",
    status: "ALL",
    health: "risk",
    view: "table",
  });
});

test("resolveProjectFilters ignores invalid query filters and keeps saved preset", () => {
  const filters = resolveProjectFilters(
    { status: "invalid", health: "broken", view: "cards" },
    {
      label: "Riskte olanlar",
      q: null,
      status: "ALL",
      health: "risk",
      view: "table",
    }
  );

  assert.deepEqual(filters, {
    q: "",
    status: "ALL",
    health: "risk",
    view: "cards",
  });
});
