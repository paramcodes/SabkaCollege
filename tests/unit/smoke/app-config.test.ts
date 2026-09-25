import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

describe("project scripts", () => {
  it("exposes the required quality commands", () => {
    expect(packageJson.scripts).toMatchObject({
      build: expect.any(String),
      lint: expect.any(String),
      typecheck: expect.any(String),
      test: expect.any(String),
    });
  });
});
