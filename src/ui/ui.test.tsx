import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlan } from "@/core/plan";
import { sampleDay } from "@/core/sample";
import { DEFAULT_PROFILE, type Profile } from "@/core/types";
import { loadProfile, saveProfile } from "@/store/local";
import * as api from "./api";
import { Home } from "./landing/Home";
import { ActionList } from "./plan/ActionList";
import { AirNow } from "./plan/AirNow";
import { Assistant } from "./plan/Assistant";
import { Outcome } from "./plan/Outcome";
import { PlanApp } from "./plan/PlanApp";
import { ProfileForm } from "./plan/ProfileForm";
import { Footer } from "./shell/Footer";
import { Header } from "./shell/Header";
import { SkipLink } from "./shell/SkipLink";

const plan = buildPlan(DEFAULT_PROFILE, sampleDay("2026-11-17", 220));
const communityPlan = buildPlan(
  {
    ...DEFAULT_PROFILE,
    audience: "community",
    households: 80,
    commute: { mode: "car", km: 10, daysPerWeek: 5 },
  },
  sampleDay("2026-11-17", 220),
);

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Home", () => {
  it("explains the product and links to the plan", async () => {
    vi.spyOn(api, "fetchPlan").mockResolvedValue({ plan });
    render(<Home />);
    expect(await screen.findByRole("heading", { name: /AQI [0-9]+/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build my plan" })).toHaveAttribute("href", "/plan");
    const steps = screen.getByRole("heading", { name: "How it works" }).parentElement;
    expect(within(steps as HTMLElement).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Your day in eight bands" })).toBeInTheDocument();
  });

  it("follows the saved language", () => {
    vi.spyOn(api, "fetchPlan").mockResolvedValue({ plan });
    saveProfile({ ...DEFAULT_PROFILE, language: "hi" });
    render(<Home />);
    expect(screen.getByRole("link", { name: "मेरा प्लान बनाएँ" })).toBeInTheDocument();
  });
});

describe("shell", () => {
  it("switches language from the header and remembers it", async () => {
    render(<Header />);
    await userEvent.click(screen.getByRole("button", { name: /switch language to hindi/i }));
    expect(loadProfile().language).toBe("hi");
    expect(document.documentElement.lang).toBe("hi");
  });

  it("renders the disclaimer, data credit and skip link", () => {
    render(
      <>
        <SkipLink />
        <Footer />
      </>,
    );
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main",
    );
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
    expect(screen.getByText(/Open-Meteo/)).toBeInTheDocument();
  });
});

describe("ProfileForm", () => {
  const setup = (profile: Profile = DEFAULT_PROFILE) => {
    const onSubmit = vi.fn();
    render(<ProfileForm profile={profile} onSubmit={onSubmit} />);
    return onSubmit;
  };

  it("submits the edited household", async () => {
    const onSubmit = setup();
    await userEvent.selectOptions(screen.getByLabelText("Area"), "dwarka");
    await userEvent.selectOptions(screen.getByLabelText("Air purifier"), "good");
    await userEvent.click(screen.getByLabelText("Asthma"));
    await userEvent.click(screen.getByLabelText(/hood or exhaust/));
    await userEvent.click(screen.getByLabelText("Someone exercises outdoors"));
    await userEvent.click(screen.getByRole("button", { name: "Update my plan" }));
    const sent = onSubmit.mock.calls[0]![0] as Profile;
    expect(sent.locality).toBe("dwarka");
    expect(sent.home).toMatchObject({ purifier: "good", rangeHood: true });
    expect(sent.conditions).toEqual(["asthma"]);
    expect(sent.lifestyle.outdoorExercise).toBe(false);
  });

  it("clamps numbers and blocks an empty household", async () => {
    const onSubmit = setup();
    const adults = screen.getByLabelText("Adults", { exact: true });
    await userEvent.clear(adults);
    await userEvent.type(adults, "99");
    expect(adults).toHaveValue(12);
    for (const label of ["Children under 5", "Children 5 to 17", "Adults", "Adults 60 and over"]) {
      const input = screen.getByLabelText(label, { exact: true });
      await userEvent.clear(input);
    }
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update my plan" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows community and commute fields only when they apply", async () => {
    setup();
    expect(screen.queryByLabelText("Households in the community")).toBeNull();
    await userEvent.click(screen.getByLabelText("A housing society or community"));
    expect(screen.getByLabelText("Households in the community")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Usual way of travelling"), "wfh");
    expect(screen.queryByLabelText("Distance each way (km)")).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Usual way of travelling"), "metro");
    expect(screen.getByLabelText("Days a week")).toHaveValue(5);
    await userEvent.type(screen.getByLabelText("Distance each way (km)"), "5");
    await userEvent.selectOptions(screen.getByLabelText("School run"), "school_bus");
    await userEvent.selectOptions(screen.getByLabelText("Cooking fuel"), "induction");
    await userEvent.selectOptions(screen.getByLabelText("Size of the rooms you share"), "large");
  });
});

describe("results", () => {
  it("AirNow shows the AQI, the category in words, and the hourly table", async () => {
    render(<AirNow plan={plan} />);
    expect(screen.getByRole("heading", { name: "Air in Anand Vihar today" })).toBeInTheDocument();
    expect(screen.getAllByText(/Very poor|Poor|Severe/).length).toBeGreaterThan(0);
    expect(screen.getByRole("img")).toHaveAccessibleName(/Cleanest daytime hour/);
    await userEvent.click(screen.getByText("Hourly values"));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(25);
    expect(screen.getByText(/typical winter day/i)).toBeInTheDocument();
  });

  it("AirNow marks live data", () => {
    render(<AirNow plan={{ ...plan, source: "live" }} />);
    expect(screen.getByText("Live model data")).toBeInTheDocument();
  });

  it("Outcome compares before and after for each person", () => {
    render(<Outcome plan={plan} />);
    expect(screen.getAllByText(/% less smog inhaled/)).toHaveLength(plan.outcomes.length);
    expect(screen.getByText("Someone at home most of the day")).toBeInTheDocument();
  });

  it("ActionList groups actions and shows impact and cost", () => {
    render(
      <ActionList actions={communityPlan.actions} narrative={null} model={null} pending={false} />,
    );
    expect(screen.getByRole("heading", { name: "For the community" })).toBeInTheDocument();
    expect(screen.getAllByText(/less PM2\.5 breathed/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getByText(/built from tested rules/i)).toBeInTheDocument();
  });

  it("ActionList puts the model's priorities first and shows its reasons", () => {
    const last = plan.actions[plan.actions.length - 1]!;
    render(
      <ActionList
        actions={plan.actions}
        narrative={{
          headline: "Today in short",
          summary: "Be careful.",
          priorities: [{ id: last.id, reason: "because" }],
        }}
        model="mock"
        pending={false}
      />,
    );
    expect(screen.getByText("Today in short")).toBeInTheDocument();
    expect(screen.getByText(/Why this fits you: because/)).toBeInTheDocument();
    expect(screen.getByText("Written by mock")).toBeInTheDocument();
  });

  it("ActionList says the summary is being written while it waits", () => {
    render(<ActionList actions={plan.actions} narrative={null} model={null} pending />);
    expect(screen.getByRole("status")).toHaveTextContent(/Writing your personal summary/);
  });
});

describe("Assistant", () => {
  it("shows a proposed change and applies it only on approval", async () => {
    vi.spyOn(api, "sendChat").mockResolvedValue({
      reply: "A purifier would help.",
      changes: [
        { change: { op: "set_purifier", level: "good" }, text: "Use a good HEPA purifier at home" },
      ],
    });
    const onChange = vi.fn();
    render(<Assistant profile={DEFAULT_PROFILE} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Your question"), "purifier?");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("A purifier would help.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Apply and recompute" }));
    expect(onChange.mock.calls[0]![0].home.purifier).toBe("good");
    expect(screen.queryByText("Suggested change:")).toBeNull();
  });

  it("lets the person dismiss a proposal", async () => {
    vi.spyOn(api, "sendChat").mockResolvedValue({
      reply: "Try this.",
      changes: [{ change: { op: "set_range_hood", value: true }, text: "Run the hood" }],
    });
    const onChange = vi.fn();
    render(<Assistant profile={DEFAULT_PROFILE} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Your question"), "cooking");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    await userEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(screen.queryByText("Run the hood")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("explains plainly when the assistant is unavailable", async () => {
    vi.spyOn(api, "sendChat").mockRejectedValue(new Error("down"));
    render(<Assistant profile={DEFAULT_PROFILE} onChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Your question"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't available/);
  });

  it("ignores an empty question", async () => {
    const send = vi.spyOn(api, "sendChat");
    render(<Assistant profile={DEFAULT_PROFILE} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("PlanApp", () => {
  it("shows the plan at once and the AI summary when it arrives", async () => {
    vi.spyOn(api, "fetchPlan").mockResolvedValue({ plan });
    let resolve: (v: api.NarrateResponse) => void = () => {};
    vi.spyOn(api, "fetchNarrative").mockReturnValue(new Promise((r) => (resolve = r)));
    render(<PlanApp />);
    expect(screen.getByText("Reading today's air…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /Air in/ })).toBeInTheDocument();
    expect(screen.getByText(/Writing your personal summary/)).toBeInTheDocument();
    await act(async () =>
      resolve({
        ai: "mock",
        narrative: { headline: "Hello today", summary: "Short.", priorities: [] },
      }),
    );
    expect(await screen.findByText("Hello today")).toBeInTheDocument();
  });

  it("offers a retry when the plan cannot be built", async () => {
    const fetchPlan = vi
      .spyOn(api, "fetchPlan")
      .mockRejectedValueOnce(new Error("Server said no"))
      .mockResolvedValue({ plan });
    vi.spyOn(api, "fetchNarrative").mockResolvedValue({ ai: null, narrative: null });
    render(<PlanApp />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server said no");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Air in/ })).toBeInTheDocument(),
    );
    expect(fetchPlan).toHaveBeenCalledTimes(2);
  });

  it("recomputes and remembers the household when the form is submitted", async () => {
    const fetchPlan = vi.spyOn(api, "fetchPlan").mockResolvedValue({ plan, notice: "Typical day" });
    vi.spyOn(api, "fetchNarrative").mockResolvedValue({ ai: null, narrative: null });
    render(<PlanApp />);
    expect(await screen.findByText("Typical day")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit your household" }));
    await userEvent.selectOptions(screen.getByLabelText("Area"), "saket");
    await userEvent.click(screen.getByRole("button", { name: "Update my plan" }));
    await waitFor(() => expect(loadProfile().locality).toBe("saket"));
    await waitFor(() => expect(fetchPlan.mock.calls.length).toBeGreaterThan(1));
  });
  it("shows the day as eight bands, a right-now strip and the proof", async () => {
    vi.spyOn(api, "fetchPlan").mockResolvedValue({ plan });
    vi.spyOn(api, "fetchNarrative").mockResolvedValue({ ai: null, narrative: null });
    render(<PlanApp />);
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/AQI [0-9]+/);
    const bands = screen.getByRole("heading", { name: "Your day in eight bands" }).parentElement;
    expect(within(bands as HTMLElement).getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByRole("heading", { name: "Right now" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What your choices change" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
  });

  it("walks a first-time visitor through three quick questions", async () => {
    vi.spyOn(api, "fetchPlan").mockResolvedValue({ plan });
    vi.spyOn(api, "fetchNarrative").mockResolvedValue({ ai: null, narrative: null });
    render(<PlanApp />);
    await screen.findByRole("heading", { name: "Set up in three steps" });
    await userEvent.selectOptions(screen.getByLabelText("Where do you live?"), "saket");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByLabelText("Adults only"));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByLabelText("Metro or bus"));
    await userEvent.click(screen.getByRole("button", { name: "Make my plan" }));
    const saved = loadProfile();
    expect(saved.locality).toBe("saket");
    expect(saved.members).toEqual({ infants: 0, children: 0, adults: 2, seniors: 0 });
    expect(saved.commute.mode).toBe("metro");
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Set up in three steps" })).toBeNull(),
    );
  });

  it("lets a visitor skip the setup and keep the example", async () => {
    vi.spyOn(api, "fetchPlan").mockResolvedValue({ plan });
    vi.spyOn(api, "fetchNarrative").mockResolvedValue({ ai: null, narrative: null });
    render(<PlanApp />);
    await userEvent.click(await screen.findByRole("button", { name: "Skip and use the example" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Set up in three steps" })).toBeNull(),
    );
    expect(await screen.findByText(/example household/)).toBeInTheDocument();
  });
});
