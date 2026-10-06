import { accountReviewScenario, maskEmail, maskPhone, sortActiveRentals } from "../accountModel";

describe("account model", () => {
  it("masks each approved email local-part length without changing its domain", () => {
    expect(maskEmail("a@example.com")).toBe("*@example.com");
    expect(maskEmail("ab@example.com")).toBe("a*@example.com");
    expect(maskEmail("mai@example.com")).toBe("m***i@example.com");
    expect(maskEmail("not-an-email")).toBe("*");
    expect(maskEmail("a@")).toBe("*");
  });

  it("shows only the last three phone digits", () => {
    expect(maskPhone("0901 234 567")).toBe("******567");
    expect(maskPhone("12")).toBe("******12");
    expect(maskPhone("abc")).toBe("");
  });

  it("sorts active rentals by signedAt then contractId, never expiry", () => {
    expect(sortActiveRentals([
      { contractId: "z", room: "", property: "", expiresAt: "2026-01-01", signedAt: "2024-06-01" },
      { contractId: "b", room: "", property: "", expiresAt: "2027-01-01", signedAt: "2024-04-01" },
      { contractId: "a", room: "", property: "", expiresAt: "2023-01-01", signedAt: "2024-04-01" },
    ]).map(({ contractId }) => contractId)).toEqual(["a", "b", "z"]);
  });

  it("reads only approved review scenarios", () => {
    const priorEnabled = process.env.EXPO_PUBLIC_ACCOUNT_REVIEW;
    const priorHomeEnabled = process.env.EXPO_PUBLIC_HOME_REVIEW;
    const priorScenario = process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO;
    const priorLocation = globalThis.location;
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW = "false";
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = "zero";
    expect(accountReviewScenario()).toBe("zero");
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW = "true";
    Object.defineProperty(globalThis, "location", { configurable: true, value: { search: "?account=multiple" } });
    expect(accountReviewScenario()).toBe("multiple");
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW = "false";
    process.env.EXPO_PUBLIC_HOME_REVIEW = "true";
    expect(accountReviewScenario()).toBe("multiple");
    Object.defineProperty(globalThis, "location", { configurable: true, value: { search: "?account=unknown" } });
    expect(accountReviewScenario()).toBe("one");
    Object.defineProperty(globalThis, "location", { configurable: true, value: { search: "" } });
    expect(accountReviewScenario()).toBe("one");
    Object.defineProperty(globalThis, "location", { configurable: true, value: undefined });
    expect(accountReviewScenario()).toBeUndefined();
    Object.defineProperty(globalThis, "location", { configurable: true, value: priorLocation });
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW = priorEnabled;
    process.env.EXPO_PUBLIC_HOME_REVIEW = priorHomeEnabled;
    process.env.EXPO_PUBLIC_ACCOUNT_REVIEW_SCENARIO = priorScenario;
  });
});
